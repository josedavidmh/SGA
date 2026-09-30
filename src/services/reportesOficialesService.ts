import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import {
  Ficha,
  RegionalCentro,
  BloqueHorario,
  RapSeguimiento,
  ResultadoAprendizaje
} from '../types';
import { contarOcurrenciasDia } from '../lib/festivosColombia';
import { esBloqueVacante } from '../lib/bloques';

/**
 * Generación de los DOS formatos OFICIALES de SofiaPlus que el líder de
 * ficha debe reportar (reemplazan el antiguo "Informe F001" inventado
 * internamente, que no correspondía a ningún formato real):
 *
 * 1) FORMATO ASOCIACION DE FICHAS (F001-008-25 / Versión 01): un renglón
 *    por cada combinación Competencia + Instructor ya asignada en la ficha.
 * 2) FORMATO EVENTOS / "Reporte de Horas Mensuales" (F001-008-25 / Versión
 *    02): un renglón por cada bloque de horario programado en un
 *    trimestre, con su rango de fechas, RAP(s), competencia, instructor y
 *    horas ejecutadas calculadas.
 *
 * Basado en el estudio directo de 8 archivos reales descargados de
 * SofiaPlus (fichas 3317145, 3115086, 3235106, 3387711, 3490507).
 */

function normalizarTexto(s?: string | null): string {
  return (s || '').toString().trim();
}

/**
 * El trimestre se guarda internamente como "AAAA-ROMANO" (ej: "2026-III"),
 * el mismo formato de `ficha.periodoLectivo`, de `BloqueHorario.trimestre`
 * y del selector de trimestre en la Matriz de Horarios. Este mismo formato
 * es el que se muestra en la app y en el contenido de los reportes
 * exportados, para no tener dos formas distintas de ver el mismo dato.
 */

/**
 * FORMATO ASOCIACION DE FICHAS.
 * Un renglón por cada Competencia con instructor asignado, deduplicado
 * por competencia — una competencia puede tener varios RAPs pero en este
 * formato aparece una sola vez con su instructor.
 *
 * Puede descargarse de dos formas:
 * - TOTAL (sin `filtroTrimestre`): usa el Seguimiento acumulado de toda
 *   la ficha (RapSeguimiento), sin importar en qué trimestre se asignó
 *   cada instructor — es la foto histórica completa.
 * - POR TRIMESTRE (con `filtroTrimestre`): usa únicamente los bloques de
 *   Horario programados en ese trimestre puntual, para reflejar solo las
 *   asociaciones competencia-instructor vigentes en ese periodo.
 */
export function generarFormatoAsociacionFichas(
  ficha: Ficha,
  rapsSeguimientoFicha: RapSeguimiento[],
  filtroTrimestre?: { trimestre: string; bloquesTrimestre: BloqueHorario[] }
) {
  const porCompetencia = new Map<string, { competenciaDenominacion: string; instructorNombre: string }>();

  if (filtroTrimestre) {
    filtroTrimestre.bloquesTrimestre
      .filter(b => !esBloqueVacante(b) && b.instructorNombre)
      .forEach(b => {
        const key = b.competenciaCodigo;
        if (!porCompetencia.has(key)) {
          porCompetencia.set(key, {
            competenciaDenominacion: b.competenciaNombre || b.competenciaCodigo,
            instructorNombre: b.instructorNombre!
          });
        }
      });
  } else {
    rapsSeguimientoFicha
      .filter(s => s.instructorNombre)
      .forEach(s => {
        const key = s.competenciaCodigo;
        if (!porCompetencia.has(key)) {
          porCompetencia.set(key, {
            competenciaDenominacion: s.competenciaDenominacion,
            instructorNombre: s.instructorNombre!
          });
        }
      });
  }

  const filas = Array.from(porCompetencia.values());

  const wsData: (string | number)[][] = [
    [' ', 'ASOCIACION DE FICHAS'],
    [' ', 'F001-008-25 / Version 01'],
    [' ', 'Proceso: Ejecución de la formación'],
    [' ', 'Procedimiento: Desarrollo curricular '],
    [],
    ['Lider:', normalizarTexto(ficha.instructorLiderNombre)],
    ['Alcance:', filtroTrimestre ? `Trimestre ${filtroTrimestre.trimestre}` : 'Total (todos los trimestres)'],
    [],
    [
      ' CODIGO DEL PROGRAMA DE FORMACIÓN',
      'CODIGO DE LA FICHA DE CARACTERIZACIÓN',
      'NOMBRE DEL PROGRAMA DE FORMACIÓN',
      'NOMBRE DE LA COMPETENCIA',
      'NOMBRE DEL INSTRUCTOR'
    ],
    ...filas.map(f => [
      ficha.programaCodigo,
      ficha.numero_ficha,
      ficha.programaNombre,
      f.competenciaDenominacion,
      f.instructorNombre
    ]),
    [],
    ['OBSERVACIONES:']
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 16 }, { wch: 16 }, { wch: 35 }, { wch: 60 }, { wch: 28 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'FICHA NUEVAS');
  const sufijoArchivo = filtroTrimestre ? `_${filtroTrimestre.trimestre}` : '_Total';
  XLSX.writeFile(wb, `FORMATO_ASOCIACION_FICHAS_${ficha.numero_ficha}${sufijoArchivo}.xlsx`);

  return { totalFilas: filas.length };
}

/** Convierte '06:00 - 09:00' en ['06:00', '09:00']. */
function partirFranja(franja: string): [string, string] {
  const partes = franja.split('-').map(p => p.trim());
  return [partes[0] || '', partes[1] || ''];
}

interface InfoEvento {
  actividadProyecto: string;
  resultadoAprendizaje: string;
  descripcionActividad: string;
  /** Un elemento por cada RAP real de la competencia del bloque, para que
   * el llamador pueda ponerlos en filas separadas en vez de en una sola
   * celda concatenada. */
  rapsIndividuales: { resultadoAprendizaje: string; descripcionActividad: string }[];
}

/**
 * Resuelve, para un bloque de horario, el RAP o RAPs reales asociados
 * (según sea un bloque de un solo RAP o de competencia completa) y arma:
 * - el "Nombre del Evento de Formación" (= actividadProyecto de
 *   Planeación Pedagógica — este dato SÍ vive en el sistema por programa,
 *   solo que hasta ahora no se cruzaba con Horarios),
 * - el listado completo de RAPs de la competencia para la columna
 *   "Resultado de Aprendizaje",
 * - la descripción de actividad de aprendizaje asociada.
 */
function resolverInfoEvento(bloque: BloqueHorario, catalogoRaps: ResultadoAprendizaje[]): InfoEvento {
  const codigosRap = bloque.rapsAsignados?.length
    ? bloque.rapsAsignados.map(r => r.codigo)
    : [bloque.rapCodigo].filter(Boolean);

  const rapsDeLaCompetencia = catalogoRaps.filter(
    r => r.competenciaCodigo === bloque.competenciaCodigo
  );
  const rapsDelBloque = rapsDeLaCompetencia.filter(r => codigosRap.includes(r.codigoRap));
  const rapsParaTexto = rapsDelBloque.length > 0 ? rapsDelBloque : rapsDeLaCompetencia;

  const actividadesProyecto = new Set<string>();
  const actividadesAprendizaje = new Set<string>();
  rapsParaTexto.forEach(r => {
    (r.actividadesProyecto || []).forEach(ap => ap && actividadesProyecto.add(ap));
    (r.actividadesAprendizaje || []).forEach(aa => aa && actividadesAprendizaje.add(aa));
  });

  return {
    actividadProyecto: Array.from(actividadesProyecto).join('\n\n'),
    resultadoAprendizaje: rapsParaTexto.map(r => normalizarTexto(r.denominacion)).join('\n\n'),
    descripcionActividad: Array.from(actividadesAprendizaje).join('\n\n'),
    rapsIndividuales: rapsParaTexto.map(r => ({
      resultadoAprendizaje: normalizarTexto(r.denominacion),
      descripcionActividad: (r.actividadesAprendizaje || []).map(normalizarTexto).join('\n\n')
    }))
  };
}

export interface DetalleHorasEvento {
  bloqueId: string;
  diaSemana: string;
  totalOcurrencias: number;
  ocurrenciasHabiles: number;
  festivosExcluidos: string[];
  horasEjecutadas: number;
}

export interface ResultadoReporteEventos {
  totalFilas: number;
  totalHorasEjecutadas: number;
  detalleHoras: DetalleHorasEvento[];
  festivosTotalesExcluidos: number;
}

/**
 * FORMATO EVENTOS ("Reporte de Horas Mensuales"). Una fila por cada RAP
 * asociado a cada bloque de horario del trimestre indicado (si un bloque
 * cubre varios RAPs de una misma competencia, cada RAP queda en su propia
 * fila y las columnas que son del bloque — fechas, horario, evento,
 * instructor, horas, día y competencia — quedan en celdas combinadas
 * abarcando esas filas, igual que en el archivo real de SofiaPlus). Las
 * horas ejecutadas se calculan como (duración del bloque) x (número de
 * veces que ese día de la semana cae, entre la fecha de inicio y fin del
 * bloque, EXCLUYENDO festivos colombianos) — validado contra los reportes
 * reales de SofiaPlus (coincide exactamente, p. ej. 3 horas x 7 lunes
 * hábiles de 8 calendario = 21 horas, igual que el reporte real de la
 * ficha 3317145).
 *
 * El teléfono del instructor líder se deja siempre en blanco: es un dato
 * sensible que este sistema no maneja.
 *
 * Se genera con ExcelJS (no con `xlsx`) porque la edición Community de
 * `xlsx` no escribe estilos de celda — cualquier borde asignado se
 * descarta silenciosamente al guardar. ExcelJS sí soporta bordes y
 * combinación de celdas reales, que es lo que necesita este formato para
 * verse como el documento oficial de SofiaPlus.
 */
export async function generarFormatoEventos(
  ficha: Ficha,
  centro: RegionalCentro,
  bloquesTrimestre: BloqueHorario[],
  catalogoRaps: ResultadoAprendizaje[],
  trimestre: string
): Promise<ResultadoReporteEventos> {
  const hoy = new Date();
  const fechaReporte = hoy.toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' });

  const bloquesOrdenados = [...bloquesTrimestre].sort((a, b) => {
    const orden = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return orden.indexOf(a.diaSemana) - orden.indexOf(b.diaSemana);
  });

  const detalleHoras: DetalleHorasEvento[] = [];
  let totalHorasEjecutadas = 0;
  let festivosTotalesExcluidos = 0;

  // Filas de encabezado fijas antes de la tabla de datos (1-indexado, como
  // usa ExcelJS): 1..4 encabezado institucional, 5 en blanco, 6 títulos de
  // columna, 7 sub-títulos INICIA/FINALIZA. Los datos empiezan en la fila 8.
  const FILA_INICIO_DATOS = 8;
  type Merge = { r1: number; c1: number; r2: number; c2: number };
  const merges: Merge[] = [];
  let filaCursor = FILA_INICIO_DATOS;
  let esPrimerBloqueGlobal = true;

  const filas: (string | number)[][] = [];

  bloquesOrdenados.forEach(bloque => {
    const [horaInicia, horaFinaliza] = partirFranja(bloque.franja);
    const { totalOcurrencias, ocurrenciasHabiles, festivosExcluidos } = contarOcurrenciasDia(
      bloque.diaSemana,
      bloque.fechaCorteInicio,
      bloque.fechaCorteFin
    );
    const horasEjecutadas = ocurrenciasHabiles * (bloque.duracionHoras || 0);
    totalHorasEjecutadas += horasEjecutadas;
    festivosTotalesExcluidos += festivosExcluidos.length;
    detalleHoras.push({
      bloqueId: bloque.id,
      diaSemana: bloque.diaSemana,
      totalOcurrencias,
      ocurrenciasHabiles,
      festivosExcluidos: festivosExcluidos.map(f => f.toLocaleDateString('es-CO')),
      horasEjecutadas
    });

    const info = resolverInfoEvento(bloque, catalogoRaps);
    // Cada RAP de la competencia del bloque va en su propia fila; si por
    // algún motivo no se pudo resolver ningún RAP, se deja una sola fila
    // con el texto consolidado que ya trae `info`.
    const rapsFilas = info.rapsIndividuales.length > 0 ? info.rapsIndividuales : [{
      resultadoAprendizaje: info.resultadoAprendizaje,
      descripcionActividad: info.descripcionActividad
    }];

    const filaInicioGrupo = filaCursor;
    const filaFinGrupo = filaCursor + rapsFilas.length - 1;

    rapsFilas.forEach((r, i) => {
      filas.push([
        esPrimerBloqueGlobal && i === 0 ? (Number(ficha.numero_ficha) || ficha.numero_ficha) : '',
        esPrimerBloqueGlobal && i === 0 ? ficha.programaNombre : '',
        esPrimerBloqueGlobal && i === 0 ? `${ficha.programaCodigo}` : '',
        i === 0 ? bloque.fechaCorteInicio : '',
        i === 0 ? bloque.fechaCorteFin : '',
        i === 0 ? horaInicia : '',
        i === 0 ? horaFinaliza : '',
        i === 0 ? (info.actividadProyecto || '') : '',
        i === 0 ? (bloque.vacante ? 'Por Definir' : normalizarTexto(bloque.instructorNombre)) : '',
        i === 0 ? horasEjecutadas : '',
        i === 0 ? bloque.diaSemana : '',
        r.descripcionActividad,
        r.resultadoAprendizaje,
        i === 0 ? (bloque.competenciaNombre || '') : ''
      ]);
    });

    // Combinar verticalmente, dentro de este grupo de filas (un RAP por
    // fila), las columnas que pertenecen al bloque completo y no a cada
    // RAP individual: fecha evento, horario, evento, instructor, horas,
    // día y competencia (columnas 1-indexadas 4,5,6,7,8,9,10,11,14).
    if (rapsFilas.length > 1) {
      [3, 4, 5, 6, 7, 8, 9, 10, 13].forEach(col => {
        merges.push({ r1: filaInicioGrupo, c1: col + 1, r2: filaFinGrupo, c2: col + 1 });
      });
    }

    filaCursor = filaFinGrupo + 1;
    esPrimerBloqueGlobal = false;
  });

  const filaUltimaDatos = filaCursor - 1;
  const hayDatos = filaUltimaDatos >= FILA_INICIO_DATOS;

  // N° Ficha, Nombre del Programa y Código del Programa son un único dato
  // para TODO el reporte (una ficha por archivo, nunca cambia entre
  // bloques), así que se combinan en una sola celda desde la PRIMERA hasta
  // la ÚLTIMA fila de datos del reporte completo — no solo dentro del
  // primer bloque, que es lo que dejaba el resto de filas sin bordes
  // visibles de continuidad.
  if (hayDatos) {
    [1, 2, 3].forEach(col => {
      merges.push({ r1: FILA_INICIO_DATOS, c1: col, r2: filaUltimaDatos, c2: col });
    });
  }

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('REPORTE DE EVENTOS');

  ws.columns = [
    { width: 14 }, { width: 22 }, { width: 18 }, { width: 12 }, { width: 12 }, { width: 10 }, { width: 10 },
    { width: 35 }, { width: 22 }, { width: 12 }, { width: 12 }, { width: 45 }, { width: 45 }, { width: 45 }
  ];

  ws.addRow([
    ' ', 'REPORTE DE HORAS MENSUALES ', '', 'REGIONAL', centro.regional, '', 'CENTRO DE FORMACION', '',
    centro.centro, '', '', '   FECHA DEL REPORTE Y TRIMESTRE:', fechaReporte, trimestre
  ]);
  ws.addRow([' ', 'F001-008-25 / Version 02']);
  ws.addRow([
    ' ', 'Proceso: Ejecución de la formación', '', 'INSTRUCTOR LIDER DE LA FICHA:', '', '', '',
    normalizarTexto(ficha.instructorLiderNombre), '', '', '', 'TELEFONO CELULAR:', '', ''
  ]);
  ws.addRow([' ', 'Procedimiento: Desarrollo curricular ']);
  ws.addRow([]);
  ws.addRow([
    'N° FICHA  DE CARACTERIZACION', 'NOMBRE PROGRAMA DE FORMACIÓN', 'CÓDIGO PROGRAMA DE FORMACIÓN Y SU VERSIÓN',
    'FECHA DE EVENTO', '', 'HORARIO DE FORMACION', '', 'NOMBRE DEL EVENTO DE FORMACIÓN',
    'INSTRUCTOR A PROGRAMAR', 'HORAS EJECUTADAS ', 'DIAS DE FORMACION',
    'DESCRIPCION DE LA ACTIVIDAD DE APRENDIZAJE \n(ACTIVIDAD DE LA PPPF)', 'RESULTADO DE APRENDIZAJE',
    'NOMBRE DE LA COMPETENCIA'
  ]);
  ws.addRow(['', '', '', 'INICIA', 'FINALIZA', 'INICIA', 'FINALIZA']);
  filas.forEach(fila => ws.addRow(fila));

  // Encabezados de columna en negrita y centrados, con ajuste de texto.
  [ws.getRow(6), ws.getRow(7)].forEach(fila => {
    fila.eachCell({ includeEmpty: true }, cell => {
      cell.font = { bold: true };
      cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
    });
  });

  // Combinar celdas: agrupación por bloque + N° Ficha/Programa/Código
  // abarcando todo el reporte.
  merges.forEach(m => ws.mergeCells(m.r1, m.c1, m.r2, m.c2));

  // Bordes en toda la grilla del reporte, desde los títulos de columna
  // (fila 6) hasta la última fila con datos, en las 14 columnas — esto es
  // lo que la versión gratuita de `xlsx` no podía escribir.
  const bordeDelgado: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FF94A3B8' } },
    left: { style: 'thin', color: { argb: 'FF94A3B8' } },
    bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
    right: { style: 'thin', color: { argb: 'FF94A3B8' } }
  };
  const filaFinalGrilla = Math.max(filaUltimaDatos, 7);
  for (let r = 6; r <= filaFinalGrilla; r++) {
    for (let c = 1; c <= 14; c++) {
      ws.getCell(r, c).border = bordeDelgado;
    }
  }

  // Alineación superior + ajuste de texto en las columnas de datos con
  // contenido largo (evento, instructor, RAP, actividad, competencia) y
  // centrado en las combinadas de ficha/programa/código.
  if (hayDatos) {
    for (let r = FILA_INICIO_DATOS; r <= filaUltimaDatos; r++) {
      [1, 2, 3].forEach(c => {
        ws.getCell(r, c).alignment = { wrapText: true, vertical: 'top', horizontal: 'center' };
      });
      [8, 9, 12, 13, 14].forEach(c => {
        ws.getCell(r, c).alignment = { wrapText: true, vertical: 'top' };
      });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `FORMATO_EVENTOS_${ficha.numero_ficha}.xlsx`;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);

  return { totalFilas: filas.length, totalHorasEjecutadas, detalleHoras, festivosTotalesExcluidos };
}
