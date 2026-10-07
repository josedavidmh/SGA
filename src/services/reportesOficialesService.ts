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
import {
  PALETA, nuevoLibro, descargarLibro, estilarRango, bordeCelda, marcoExterior, celdaDatoExcel,
  encabezadoTablaExcel, configurarHojaExcel, rellenoExcel, fechaGeneracion
} from '../lib/estiloReporte';

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
export async function generarFormatoAsociacionFichas(
  ficha: Ficha,
  rapsSeguimientoFicha: RapSeguimiento[],
  filtroTrimestre?: { trimestre: string; bloquesTrimestre: BloqueHorario[] },
  centro?: RegionalCentro
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
  const N = 5;
  const alcance = filtroTrimestre ? `Trimestre ${filtroTrimestre.trimestre}` : 'Total (todos los trimestres)';

  const wb = nuevoLibro();
  const ws = wb.addWorksheet('FICHA NUEVAS');
  ws.columns = [{ width: 20 }, { width: 22 }, { width: 40 }, { width: 62 }, { width: 34 }];

  // ---- Bloque institucional (filas 1-4): "SENA" a la izquierda y datos del formato a la derecha.
  ws.mergeCells(1, 1, 4, 1);
  ws.getCell(1, 1).value = 'SENA';
  estilarRango(ws, 1, 1, 4, 1, {
    fuente: { bold: true, size: 22, color: { argb: PALETA.blanco } },
    relleno: PALETA.verde,
    alineacion: { horizontal: 'center', vertical: 'middle' },
    borde: PALETA.verdeOscuro
  });
  const lineas: [string, boolean][] = [
    ['ASOCIACION DE FICHAS', true],
    ['F001-008-25 / Version 01', false],
    ['Proceso: Ejecución de la formación', false],
    ['Procedimiento: Desarrollo curricular', false]
  ];
  lineas.forEach(([texto, titulo], i) => {
    const f = i + 1;
    ws.mergeCells(f, 2, f, N);
    ws.getCell(f, 2).value = texto;
    estilarRango(ws, f, 2, f, N, {
      fuente: titulo
        ? { bold: true, size: 15, color: { argb: PALETA.pizarra } }
        : { bold: i === 1, size: 10.5, color: { argb: i === 1 ? PALETA.verde : PALETA.pizarraMedia } },
      relleno: titulo ? PALETA.verdeClaro : PALETA.blanco,
      alineacion: { horizontal: 'left', vertical: 'middle', indent: 1 },
      borde: PALETA.borde
    });
    ws.getRow(f).height = titulo ? 30 : 20;
  });
  marcoExterior(ws, 1, 1, 4, N, PALETA.verdeOscuro);
  ws.getRow(5).height = 10;

  // ---- Ficha de datos generales (filas 6-8): etiqueta + valor, todo bordeado.
  const datos: [string, string][] = [
    ['Líder:', normalizarTexto(ficha.instructorLiderNombre) || '—'],
    ['Alcance:', alcance],
    ['Centro:', centro?.centro ? `${centro.centro}${centro.regional ? ` · ${centro.regional}` : ''}` : '—']
  ];
  datos.forEach(([etiqueta, valor], i) => {
    const f = 6 + i;
    ws.getCell(f, 1).value = etiqueta;
    estilarRango(ws, f, 1, f, 1, {
      fuente: { bold: true, size: 10, color: { argb: PALETA.pizarra } },
      relleno: PALETA.total, alineacion: { horizontal: 'left', vertical: 'middle', indent: 1 }, borde: PALETA.bordeFuerte
    });
    ws.mergeCells(f, 2, f, N);
    ws.getCell(f, 2).value = valor;
    estilarRango(ws, f, 2, f, N, {
      fuente: { size: 10, color: { argb: PALETA.pizarra } },
      relleno: PALETA.blanco, alineacion: { horizontal: 'left', vertical: 'middle', indent: 1 }, borde: PALETA.bordeFuerte
    });
    ws.getRow(f).height = 20;
  });
  marcoExterior(ws, 6, 1, 8, N);
  ws.getRow(9).height = 10;

  // ---- Tabla (encabezado en la fila 10).
  const filaEnc = 10;
  encabezadoTablaExcel(ws, filaEnc, [
    'CODIGO DEL PROGRAMA DE FORMACIÓN',
    'CODIGO DE LA FICHA DE CARACTERIZACIÓN',
    'NOMBRE DEL PROGRAMA DE FORMACIÓN',
    'NOMBRE DE LA COMPETENCIA',
    'NOMBRE DEL INSTRUCTOR'
  ], 36);
  let fila = filaEnc + 1;
  filas.forEach((f, idx) => {
    const fondo = idx % 2 === 0 ? PALETA.blanco : PALETA.zebra;
    const valores: (string | number)[] = [ficha.programaCodigo, Number(ficha.numero_ficha) || ficha.numero_ficha, ficha.programaNombre, f.competenciaDenominacion, f.instructorNombre];
    valores.forEach((v, c) => {
      const cel = ws.getCell(fila, c + 1);
      cel.value = v as any;
      celdaDatoExcel(cel, { horizontal: c < 2 ? 'center' : 'left', vertical: 'middle', relleno: fondo, negrita: c === 1 || c === 4 });
    });
    fila++;
  });
  if (filas.length === 0) {
    ws.mergeCells(fila, 1, fila, N);
    ws.getCell(fila, 1).value = 'No hay competencias con instructor asociado en este alcance.';
    estilarRango(ws, fila, 1, fila, N, {
      fuente: { italic: true, size: 10, color: { argb: PALETA.gris } },
      alineacion: { horizontal: 'center', vertical: 'middle' }, borde: PALETA.borde
    });
    ws.getRow(fila).height = 24;
    fila++;
  }

  // ---- Fila de total.
  ws.mergeCells(fila, 1, fila, 4);
  ws.getCell(fila, 1).value = 'TOTAL DE COMPETENCIAS ASOCIADAS';
  ws.getCell(fila, 5).value = filas.length;
  estilarRango(ws, fila, 1, fila, N, {
    fuente: { bold: true, size: 10, color: { argb: PALETA.pizarra } },
    relleno: PALETA.total, alineacion: { horizontal: 'left', vertical: 'middle', indent: 1 }, borde: PALETA.bordeFuerte
  });
  ws.getCell(fila, 5).alignment = { horizontal: 'center', vertical: 'middle' };
  for (let c = 1; c <= N; c++) {
    const cel = ws.getCell(fila, c);
    cel.border = { ...(cel.border || {}), top: { style: 'medium', color: { argb: PALETA.pizarra } } };
  }
  ws.getRow(fila).height = 22;
  const filaFinTabla = fila;
  fila++;
  ws.getRow(fila).height = 10;
  fila++;

  // ---- Observaciones: recuadro con espacio para escribir.
  ws.getCell(fila, 1).value = 'OBSERVACIONES:';
  estilarRango(ws, fila, 1, fila, 1, {
    fuente: { bold: true, size: 10, color: { argb: PALETA.pizarra } },
    relleno: PALETA.total, alineacion: { horizontal: 'left', vertical: 'top', indent: 1 }, borde: PALETA.bordeFuerte
  });
  ws.mergeCells(fila, 2, fila, N);
  estilarRango(ws, fila, 2, fila, N, { relleno: PALETA.blanco, alineacion: { horizontal: 'left', vertical: 'top', wrapText: true }, borde: PALETA.bordeFuerte });
  ws.getRow(fila).height = 64;
  marcoExterior(ws, fila, 1, fila, N);
  const filaObs = fila;
  fila += 2;

  // Marco exterior de la tabla y nota de generación.
  marcoExterior(ws, filaEnc, 1, filaFinTabla, N);
  ws.mergeCells(filaObs + 2 - 1 + 1, 1, filaObs + 2 - 1 + 1, N);
  const pie = ws.getCell(filaObs + 2, 1);
  pie.value = `Generado el ${fechaGeneracion()}  ·  Ficha ${ficha.numero_ficha}  ·  ${alcance}`;
  pie.font = { size: 8.5, italic: true, color: { argb: PALETA.gris } };
  pie.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  configurarHojaExcel(ws, { filaEncabezado: filaEnc });
  ws.pageSetup = { ...ws.pageSetup, orientation: 'landscape', fitToHeight: 0 };

  const sufijoArchivo = filtroTrimestre ? `_${filtroTrimestre.trimestre}` : '_Total';
  await descargarLibro(wb, `FORMATO_ASOCIACION_FICHAS_${ficha.numero_ficha}${sufijoArchivo}.xlsx`);

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

  const minutosDe = (hora: string) => {
    const [h, m] = hora.split(':');
    return (Number(h) || 0) * 60 + (Number(m) || 0);
  };
  // Orden: día de la semana y, dentro del día, hora de inicio (así los bloques
  // consecutivos de una misma jornada quedan uno al lado del otro).
  const bloquesOrdenados = [...bloquesTrimestre].sort((a, b) => {
    const orden = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return orden.indexOf(a.diaSemana) - orden.indexOf(b.diaSemana)
      || minutosDe(partirFranja(a.franja)[0]) - minutosDe(partirFranja(b.franja)[0]);
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
  const grupoDeFila: number[] = [];
  let grupoActual = -1;

  // Un "evento" es uno o varios bloques consecutivos que se reportan juntos.
  interface EventoUnido {
    bloque: BloqueHorario;
    horaInicia: string;
    horaFinaliza: string;
    horasEjecutadas: number;
    info: InfoEvento;
    bloquesUnidos: number;
  }

  const porBloque: EventoUnido[] = bloquesOrdenados.map(bloque => {
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
    return { bloque, horaInicia, horaFinaliza, horasEjecutadas, info: resolverInfoEvento(bloque, catalogoRaps), bloquesUnidos: 1 };
  });

  // Une los bloques contiguos (el uno termina cuando empieza el otro) del mismo
  // día, con las mismas fechas, el mismo instructor y el mismo contenido
  // (competencia, evento, resultados y actividades): 06:00-09:00 + 09:00-12:00
  // se reporta como 06:00-12:00 y 13:00-16:00 + 16:00-19:00 como 13:00-19:00.
  const claveInstructor = (b: BloqueHorario) => esBloqueVacante(b) ? '__VACANTE__' : normalizarTexto(b.instructorId || b.instructorNombre).toLowerCase();
  const claveContenido = (e: EventoUnido) => [e.bloque.competenciaCodigo, e.info.actividadProyecto, e.info.resultadoAprendizaje, e.info.descripcionActividad].join('|');
  const puedeUnirse = (prev: EventoUnido, sig: EventoUnido) =>
    prev.bloque.diaSemana === sig.bloque.diaSemana
    && prev.bloque.fechaCorteInicio === sig.bloque.fechaCorteInicio
    && prev.bloque.fechaCorteFin === sig.bloque.fechaCorteFin
    && claveInstructor(prev.bloque) === claveInstructor(sig.bloque)
    && claveContenido(prev) === claveContenido(sig)
    && minutosDe(prev.horaFinaliza) === minutosDe(sig.horaInicia);

  const eventos: EventoUnido[] = [];
  porBloque.forEach(ev => {
    const prev = eventos[eventos.length - 1];
    if (prev && puedeUnirse(prev, ev)) {
      prev.horaFinaliza = ev.horaFinaliza;
      prev.horasEjecutadas += ev.horasEjecutadas;
      prev.bloquesUnidos += 1;
    } else {
      eventos.push({ ...ev });
    }
  });

  eventos.forEach(ev => {
    const { bloque, horaInicia, horaFinaliza, horasEjecutadas, info } = ev;
    // Cada RAP de la competencia del bloque va en su propia fila; si por
    // algún motivo no se pudo resolver ningún RAP, se deja una sola fila
    // con el texto consolidado que ya trae `info`.
    const rapsFilas = info.rapsIndividuales.length > 0 ? info.rapsIndividuales : [{
      resultadoAprendizaje: info.resultadoAprendizaje,
      descripcionActividad: info.descripcionActividad
    }];

    grupoActual++;
    const filaInicioGrupo = filaCursor;
    const filaFinGrupo = filaCursor + rapsFilas.length - 1;

    rapsFilas.forEach((r, i) => {
      grupoDeFila.push(grupoActual);
      filas.push([
        esPrimerBloqueGlobal && i === 0 ? (Number(ficha.numero_ficha) || ficha.numero_ficha) : '',
        esPrimerBloqueGlobal && i === 0 ? ficha.programaNombre : '',
        esPrimerBloqueGlobal && i === 0 ? `${ficha.programaCodigo}` : '',
        i === 0 ? bloque.fechaCorteInicio : '',
        i === 0 ? bloque.fechaCorteFin : '',
        i === 0 ? horaInicia : '',
        i === 0 ? horaFinaliza : '',
        i === 0 ? (info.actividadProyecto || '') : '',
        i === 0 ? (esBloqueVacante(bloque) ? 'Por Definir' : normalizarTexto(bloque.instructorNombre)) : '',
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

  const N = 14;
  const workbook = nuevoLibro();
  const ws = workbook.addWorksheet('REPORTE DE EVENTOS');
  ws.columns = [
    { width: 20 }, { width: 24 }, { width: 19 }, { width: 13 }, { width: 13 }, { width: 10 }, { width: 10 },
    { width: 36 }, { width: 24 }, { width: 12 }, { width: 13 }, { width: 46 }, { width: 46 }, { width: 46 }
  ];

  // Utilidades locales: combinar un rango y estilarlo completo.
  const caja = (f1: number, c1: number, f2: number, c2: number, valor: string | number, e: Parameters<typeof estilarRango>[5]) => {
    if (f1 !== f2 || c1 !== c2) ws.mergeCells(f1, c1, f2, c2);
    ws.getCell(f1, c1).value = valor as any;
    estilarRango(ws, f1, c1, f2, c2, e);
  };
  const etiqueta = { fuente: { bold: true, size: 9.5, color: { argb: PALETA.pizarra } }, relleno: PALETA.total, alineacion: { horizontal: 'left' as const, vertical: 'middle' as const, indent: 1, wrapText: true }, borde: PALETA.bordeFuerte };
  const valorBox = { fuente: { size: 10, color: { argb: PALETA.pizarra } }, relleno: PALETA.blanco, alineacion: { horizontal: 'left' as const, vertical: 'middle' as const, indent: 1, wrapText: true }, borde: PALETA.bordeFuerte };

  // ---- Bloque institucional (filas 1-4), todo bordeado.
  caja(1, 1, 4, 1, 'SENA', {
    fuente: { bold: true, size: 22, color: { argb: PALETA.blanco } }, relleno: PALETA.verde,
    alineacion: { horizontal: 'center', vertical: 'middle' }, borde: PALETA.verdeOscuro
  });
  caja(1, 2, 1, 3, 'REPORTE DE HORAS MENSUALES', {
    fuente: { bold: true, size: 13, color: { argb: PALETA.blanco } }, relleno: PALETA.verde,
    alineacion: { horizontal: 'left', vertical: 'middle', indent: 1, wrapText: true }, borde: PALETA.verdeOscuro
  });
  caja(2, 2, 2, 3, 'F001-008-25 / Version 02', {
    fuente: { bold: true, size: 10, color: { argb: PALETA.verde } }, relleno: PALETA.verdeClaro,
    alineacion: { horizontal: 'left', vertical: 'middle', indent: 1 }, borde: PALETA.borde
  });
  caja(3, 2, 3, 3, 'Proceso: Ejecución de la formación', { ...valorBox, fuente: { size: 9.5, color: { argb: PALETA.pizarraMedia } } });
  caja(4, 2, 4, 3, 'Procedimiento: Desarrollo curricular', { ...valorBox, fuente: { size: 9.5, color: { argb: PALETA.pizarraMedia } } });

  // Fila 1: regional, centro, fecha y trimestre.
  caja(1, 4, 1, 4, 'REGIONAL', etiqueta);
  caja(1, 5, 1, 7, centro.regional || '—', valorBox);
  caja(1, 8, 1, 8, 'CENTRO DE FORMACIÓN', etiqueta);
  caja(1, 9, 1, 11, centro.centro || '—', valorBox);
  caja(1, 12, 1, 12, 'FECHA DEL REPORTE Y TRIMESTRE:', etiqueta);
  caja(1, 13, 1, 13, fechaReporte, { ...valorBox, alineacion: { horizontal: 'center', vertical: 'middle' } });
  caja(1, 14, 1, 14, trimestre, { ...valorBox, fuente: { bold: true, size: 10, color: { argb: PALETA.verde } }, alineacion: { horizontal: 'center', vertical: 'middle' } });

  // Fila 2: ficha y programa.
  caja(2, 4, 2, N, `Ficha ${ficha.numero_ficha}  —  ${ficha.programaNombre}`, {
    fuente: { bold: true, size: 10.5, color: { argb: PALETA.pizarra } }, relleno: PALETA.verdeClaro,
    alineacion: { horizontal: 'left', vertical: 'middle', indent: 1 }, borde: PALETA.borde
  });

  // Fila 3: instructor líder y teléfono (se deja en blanco, es un dato sensible).
  caja(3, 4, 3, 7, 'INSTRUCTOR LÍDER DE LA FICHA:', etiqueta);
  caja(3, 8, 3, 11, normalizarTexto(ficha.instructorLiderNombre) || '—', valorBox);
  caja(3, 12, 3, 12, 'TELÉFONO CELULAR:', etiqueta);
  caja(3, 13, 3, N, '', valorBox);

  // Fila 4: nota metodológica.
  caja(4, 4, 4, N, 'Horas ejecutadas = duración del bloque × número de veces que cae ese día entre las fechas del evento, excluyendo festivos de Colombia.', {
    fuente: { italic: true, size: 9, color: { argb: PALETA.gris } }, relleno: PALETA.blanco,
    alineacion: { horizontal: 'left', vertical: 'middle', indent: 1, wrapText: true }, borde: PALETA.borde
  });
  [1, 2, 3, 4].forEach(f => { ws.getRow(f).height = f === 1 ? 32 : 22; });
  marcoExterior(ws, 1, 1, 4, N, PALETA.verdeOscuro);
  ws.getRow(5).height = 10;

  // ---- Encabezado de la tabla (filas 6-7): todos los títulos con borde completo.
  const titulos6 = [
    'N° FICHA DE\nCARACTERIZACIÓN', 'NOMBRE PROGRAMA DE FORMACIÓN', 'CÓDIGO PROGRAMA DE FORMACIÓN Y SU VERSIÓN',
    'FECHA DE EVENTO', '', 'HORARIO DE FORMACIÓN', '', 'NOMBRE DEL EVENTO DE FORMACIÓN',
    'INSTRUCTOR A PROGRAMAR', 'HORAS EJECUTADAS', 'DÍAS DE FORMACIÓN',
    'DESCRIPCIÓN DE LA ACTIVIDAD DE APRENDIZAJE\n(ACTIVIDAD DE LA PPPF)', 'RESULTADO DE APRENDIZAJE',
    'NOMBRE DE LA COMPETENCIA'
  ];
  encabezadoTablaExcel(ws, 6, titulos6, 30);
  encabezadoTablaExcel(ws, 7, ['', '', '', 'INICIA', 'FINALIZA', 'INICIA', 'FINALIZA'], 22);
  // Los títulos que no se subdividen abarcan las filas 6 y 7; fecha y horario abarcan 2 columnas.
  [1, 2, 3, 8, 9, 10, 11, 12, 13, 14].forEach(c => ws.mergeCells(6, c, 7, c));
  ws.mergeCells(6, 4, 6, 5);
  ws.mergeCells(6, 6, 6, 7);
  // Rellena toda la banda del encabezado (las celdas esclavas incluidas) y marca el acento verde inferior.
  for (let c = 1; c <= N; c++) {
    [6, 7].forEach(f => {
      const cel = ws.getCell(f, c);
      cel.fill = rellenoExcel(PALETA.pizarra);
      cel.font = { bold: true, size: 9.5, color: { argb: PALETA.blanco } };
      cel.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cel.border = {
        top: { style: 'thin', color: { argb: PALETA.pizarraMedia } },
        left: { style: 'thin', color: { argb: PALETA.pizarraMedia } },
        right: { style: 'thin', color: { argb: PALETA.pizarraMedia } },
        bottom: f === 7 ? { style: 'medium', color: { argb: PALETA.verde } } : { style: 'thin', color: { argb: PALETA.pizarraMedia } }
      };
    });
  }
  // Sub-títulos INICIA/FINALIZA un tono más suave para jerarquizar.
  [4, 5, 6, 7].forEach(c => { ws.getCell(7, c).fill = rellenoExcel(PALETA.pizarraMedia); });

  // ---- Datos.
  filas.forEach(fila => ws.addRow(fila));
  merges.forEach(m => ws.mergeCells(m.r1, m.c1, m.r2, m.c2));

  const centrada = new Set([1, 2, 3, 4, 5, 6, 7, 10, 11]);
  for (let i = 0; i < filas.length; i++) {
    const r = FILA_INICIO_DATOS + i;
    const fondo = grupoDeFila[i] % 2 === 0 ? PALETA.blanco : PALETA.zebra;
    for (let c = 1; c <= N; c++) {
      const cel = ws.getCell(r, c);
      // El estilo de una celda combinada lo define la última fila escrita: se decide por grupo.
      const primeraDelGrupo = grupoDeFila.indexOf(grupoDeFila[i]);
      const porDefinir = c === 9 && String(filas[primeraDelGrupo][8]) === 'Por Definir';
      cel.fill = rellenoExcel(c <= 3 ? PALETA.blanco : porDefinir ? PALETA.ambar : fondo);
      cel.font = {
        size: 10,
        bold: c === 1 || c === 10 || c === 9,
        color: { argb: porDefinir ? PALETA.ambarTexto : PALETA.pizarra }
      };
      cel.alignment = {
        wrapText: true,
        vertical: centrada.has(c) ? 'middle' : 'top',
        horizontal: centrada.has(c) ? 'center' : 'left',
        indent: centrada.has(c) ? 0 : 1
      };
      bordeCelda(cel, PALETA.bordeFuerte);
    }
  }

  // ---- Fila de totales y marco exterior.
  const filaTotal = Math.max(filaUltimaDatos, 7) + 1;
  caja(filaTotal, 1, filaTotal, 9, `TOTAL: ${filas.length} fila(s) · ${eventos.length} evento(s) de formación`, {
    fuente: { bold: true, size: 10, color: { argb: PALETA.pizarra } }, relleno: PALETA.total,
    alineacion: { horizontal: 'left', vertical: 'middle', indent: 1 }, borde: PALETA.bordeFuerte
  });
  caja(filaTotal, 10, filaTotal, 10, totalHorasEjecutadas, {
    fuente: { bold: true, size: 11, color: { argb: PALETA.verde } }, relleno: PALETA.total,
    alineacion: { horizontal: 'center', vertical: 'middle' }, borde: PALETA.bordeFuerte
  });
  caja(filaTotal, 11, filaTotal, N, `Horas ejecutadas en total${festivosTotalesExcluidos > 0 ? ` · ${festivosTotalesExcluidos} festivo(s) excluido(s) del cálculo` : ''}`, {
    fuente: { italic: true, size: 9.5, color: { argb: PALETA.pizarraMedia } }, relleno: PALETA.total,
    alineacion: { horizontal: 'left', vertical: 'middle', indent: 1 }, borde: PALETA.bordeFuerte
  });
  for (let c = 1; c <= N; c++) {
    const cel = ws.getCell(filaTotal, c);
    cel.border = { ...(cel.border || {}), top: { style: 'medium', color: { argb: PALETA.pizarra } } };
  }
  ws.getRow(filaTotal).height = 24;
  marcoExterior(ws, 6, 1, filaTotal, N);

  ws.mergeCells(filaTotal + 2, 1, filaTotal + 2, N);
  const pie = ws.getCell(filaTotal + 2, 1);
  pie.value = `Generado el ${fechaGeneracion()}  ·  Ficha ${ficha.numero_ficha}  ·  Trimestre ${trimestre}  ·  "Por Definir": evento sin instructor asignado.`;
  pie.font = { size: 8.5, italic: true, color: { argb: PALETA.gris } };
  pie.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  configurarHojaExcel(ws, { filaEncabezado: 7, congelarColumnas: 3 });
  ws.pageSetup = { ...ws.pageSetup, printTitlesRow: '6:7' };

  await descargarLibro(workbook, `FORMATO_EVENTOS_${ficha.numero_ficha}.xlsx`);

  return { totalFilas: filas.length, totalHorasEjecutadas, detalleHoras, festivosTotalesExcluidos };
}
