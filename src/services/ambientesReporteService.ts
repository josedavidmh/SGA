import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Ficha, BloqueHorario, AmbienteAprendizaje, RegionalCentro } from '../types';
import {
  PALETA, PDF, MARGEN_PDF, nuevoLibro, descargarLibro, bandaTituloExcel, encabezadoTablaExcel, celdaDatoExcel,
  filaTotalExcel, notaPieExcel, configurarHojaExcel, marcoExterior, textoCentro, fechaGeneracion,
  bandaTituloPdf, temaTablaPdf, pieDePaginasPdf
} from '../lib/estiloReporte';
import { ambienteEfectivo, esAmbienteGenerico, normalizarAmbiente, jornadaDeFranja, ocupaAmbiente, fichaVencida, rangosSeSolapan, ORDEN_JORNADA } from '../lib/ambientes';

const COLOR_ENCABEZADO: [number, number, number] = [13, 99, 27];

export interface UsoAmbienteFichaTrimestre {
  trimestre: string;
  fichaId: string;
  fichaNumero: string;
  programaNombre: string;
  /** Uno o más si la ficha usó distintos ambientes dentro del mismo trimestre (posible alerta). */
  ambientes: string[];
  totalBloques: number;
  totalHoras: number;
}

/**
 * Agrupa los bloques de horario por Trimestre + Ficha para el reporte
 * institucional de uso de ambientes.
 *
 * Importante: siempre prioriza el ambientePrincipal ACTUAL de la ficha
 * sobre lo que haya quedado guardado en cada bloque (b.ambiente). Si el
 * ambiente de la ficha se corrige o se reasigna después de haber creado
 * los bloques de horario, el reporte debe reflejar ese cambio de
 * inmediato — no una foto histórica del ambiente que tenía el bloque al
 * crearse. Solo se usa b.ambiente como respaldo cuando la ficha ya no
 * existe o no tiene ambiente asignado.
 */
export function calcularUsoAmbientesPorFichaTrimestre(
  fichas: Ficha[],
  bloques: BloqueHorario[]
): UsoAmbienteFichaTrimestre[] {
  const fichasPorId: Record<string, Ficha> = {};
  fichas.forEach(f => { fichasPorId[f.id] = f; });

  interface Acumulador extends UsoAmbienteFichaTrimestre {
    ambientesSet: Set<string>;
  }
  const mapa = new Map<string, Acumulador>();

  bloques.forEach(b => {
    if (!b.trimestre || !b.fichaId) return;
    const key = `${b.trimestre}__${b.fichaId}`;
    const ficha = fichasPorId[b.fichaId];

    if (!mapa.has(key)) {
      mapa.set(key, {
        trimestre: b.trimestre,
        fichaId: b.fichaId,
        fichaNumero: ficha?.numero_ficha || b.fichaId,
        programaNombre: ficha?.programaNombre || 'Programa no identificado',
        ambientes: [],
        ambientesSet: new Set<string>(),
        totalBloques: 0,
        totalHoras: 0
      });
    }

    const item = mapa.get(key)!;
    const ambiente = (ambienteEfectivo(b, ficha) || 'Sin ambiente asignado').trim();
    item.ambientesSet.add(ambiente);
    item.totalBloques += 1;
    item.totalHoras += b.duracionHoras || 0;
  });

  const resultado: UsoAmbienteFichaTrimestre[] = Array.from(mapa.values()).map(item => ({
    trimestre: item.trimestre,
    fichaId: item.fichaId,
    fichaNumero: item.fichaNumero,
    programaNombre: item.programaNombre,
    ambientes: Array.from(item.ambientesSet).sort(),
    totalBloques: item.totalBloques,
    totalHoras: item.totalHoras
  }));

  // Trimestre más reciente primero; dentro del mismo trimestre, por número de ficha.
  return resultado.sort((a, b) => {
    if (a.trimestre !== b.trimestre) return b.trimestre.localeCompare(a.trimestre);
    return a.fichaNumero.localeCompare(b.fichaNumero);
  });
}

/** Trimestres distintos presentes en los bloques de horario, más recientes primero. */
export function obtenerTrimestresDisponibles(bloques: BloqueHorario[]): string[] {
  const set = new Set<string>();
  bloques.forEach(b => { if (b.trimestre) set.add(b.trimestre); });
  return Array.from(set).sort().reverse();
}

function filtrarPorTrimestre(items: UsoAmbienteFichaTrimestre[], trimestreFiltro: string): UsoAmbienteFichaTrimestre[] {
  return trimestreFiltro === 'TODOS' ? items : items.filter(i => i.trimestre === trimestreFiltro);
}

export function exportarUsoAmbientesExcel(items: UsoAmbienteFichaTrimestre[], trimestreFiltro: string = 'TODOS') {
  const filtrados = filtrarPorTrimestre(items, trimestreFiltro);

  const wsData: (string | number)[][] = [
    ['SISTEMA DE GESTIÓN ACADÉMICA Y CURRICULAR - REPORTE DE AMBIENTES POR FICHA'],
    [trimestreFiltro === 'TODOS' ? 'Todos los trimestres' : `Trimestre: ${trimestreFiltro}`],
    [`FICHAS EN EL REPORTE: ${filtrados.length}`],
    [],
    ['TRIMESTRE', 'FICHA', 'PROGRAMA', 'AMBIENTE(S) USADOS', 'BLOQUES PROGRAMADOS', 'HORAS SEMANALES']
  ];

  if (filtrados.length === 0) {
    wsData.push(['No hay bloques de horario programados para este filtro.']);
  }

  filtrados.forEach(i => {
    wsData.push([
      i.trimestre,
      i.fichaNumero,
      i.programaNombre,
      i.ambientes.join(' / '),
      i.totalBloques,
      i.totalHoras
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 38 }, { wch: 32 }, { wch: 20 }, { wch: 16 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ambientes por Ficha');
  const sufijo = trimestreFiltro === 'TODOS' ? 'Todos' : trimestreFiltro;
  XLSX.writeFile(wb, `Reporte_Ambientes_por_Ficha_${sufijo}.xlsx`);
}

export function exportarUsoAmbientesPDF(items: UsoAmbienteFichaTrimestre[], trimestreFiltro: string = 'TODOS') {
  const filtrados = filtrarPorTrimestre(items, trimestreFiltro);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('SISTEMA DE GESTIÓN ACADÉMICA Y CURRICULAR', 40, 36);
  doc.setFontSize(11);
  doc.text('Reporte de Ambientes por Ficha', 40, 54);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `${trimestreFiltro === 'TODOS' ? 'Todos los trimestres' : `Trimestre: ${trimestreFiltro}`} — ${filtrados.length} ficha(s) en el reporte`,
    40,
    70
  );

  autoTable(doc, {
    startY: 86,
    head: [['Trimestre', 'Ficha', 'Programa', 'Ambiente(s)', 'Bloques', 'Horas/sem']],
    body: filtrados.length > 0
      ? filtrados.map(i => [i.trimestre, i.fichaNumero, i.programaNombre, i.ambientes.join(' / '), String(i.totalBloques), String(i.totalHoras)])
      : [['—', 'No hay bloques de horario programados para este filtro.', '', '', '', '']],
    styles: { fontSize: 8, cellPadding: 5, valign: 'top' },
    headStyles: { fillColor: COLOR_ENCABEZADO, textColor: 255, fontStyle: 'bold' }
  });

  const sufijo = trimestreFiltro === 'TODOS' ? 'Todos' : trimestreFiltro;
  doc.save(`Reporte_Ambientes_por_Ficha_${sufijo}.pdf`);
}

// ===========================================================================
// REPORTE GENERAL: AMBIENTES Y SUS FICHAS
// (ambiente base de cada ficha + excepciones por día/franja programadas)
// ===========================================================================

const ORDEN_DIAS: Record<string, number> = { Lunes: 1, Martes: 2, 'Miércoles': 3, Jueves: 4, Viernes: 5, 'Sábado': 6 };
const ABREV_DIA: Record<string, string> = { Lunes: 'Lun', Martes: 'Mar', 'Miércoles': 'Mié', Jueves: 'Jue', Viernes: 'Vie', 'Sábado': 'Sáb' };

export interface FichaEnAmbiente {
  fichaId: string;
  fichaNumero: string;
  programaNombre: string;
  /** BASE: es su ambiente de siempre. EXCEPCION: va allí solo algunos días/franjas. */
  uso: 'BASE' | 'EXCEPCION';
  /** Días y franjas programados en ese ambiente, p.ej. "Lun 07:00-10:00, Jue (todo el día)". */
  horario: string;
  bloques: number;
  horas: number;
  /** BASE: jornada asignada a la ficha en su ambiente ('' si aún no la tiene).
   *  EXCEPCION: jornadas en las que ocurre lo programado allí. */
  jornada: string;
  /** BASE sin jornada asignada todavía. */
  sinJornada?: boolean;
  /** BASE: otra ficha vigente comparte este ambiente, esta jornada y fechas que se cruzan. */
  duplicada?: boolean;
  /** La etapa lectiva de la ficha ya terminó: libera su ambiente. */
  vencida?: boolean;
  fechaInicio?: string;
  fechaFin?: string;
}

export interface AmbienteConFichas {
  ambiente: string;
  tipo?: string;
  sede?: string;
  capacidad?: number;
  estado?: string;
  fichas: FichaEnAmbiente[];
  horasTotales: number;
  /** Jornadas del ambiente base que aún están libres (Mañana / Tarde / Noche). */
  jornadasLibres: string[];
  /** Cantidad de fichas base en conflicto (misma jornada). */
  conflictos: number;
}

export function calcularAmbientesConFichas(
  fichas: Ficha[],
  bloques: BloqueHorario[],
  catalogo: AmbienteAprendizaje[],
  trimestreFiltro: string = 'TODOS'
): AmbienteConFichas[] {
  const fichaPorId = new Map(fichas.map(f => [f.id, f]));
  const mapa = new Map<string, AmbienteConFichas>();
  const clave = (n: string) => normalizarAmbiente(n);
  const obtener = (nombre: string) => {
    const k = clave(nombre);
    if (!mapa.has(k)) {
      const cat = catalogo.find(a => clave(a.nombre) === k);
      mapa.set(k, {
        ambiente: cat?.nombre || nombre,
        tipo: cat?.tipo, sede: cat?.sede, capacidad: cat?.capacidadAprendices, estado: cat?.estado,
        fichas: [], horasTotales: 0, jornadasLibres: [], conflictos: 0
      });
    }
    return mapa.get(k)!;
  };

  // Todos los ambientes del catálogo aparecen (aunque estén libres).
  catalogo.forEach(a => { if (a.nombre) obtener(a.nombre); });

  // 1) Fichas con ese ambiente como BASE (aunque aún no tengan bloques).
  const acumulado = new Map<string, FichaEnAmbiente & { celdas: string[] }>();
  fichas.forEach(f => {
    if (esAmbienteGenerico(f.ambientePrincipal)) return;
    const k = `${clave(f.ambientePrincipal)}__${f.id}`;
    acumulado.set(k, {
      fichaId: f.id, fichaNumero: f.numero_ficha, programaNombre: f.programaNombre,
      uso: 'BASE', horario: '', bloques: 0, horas: 0, celdas: [],
      jornada: f.jornadaAmbiente || '', sinJornada: !f.jornadaAmbiente
    });
    obtener(f.ambientePrincipal);
  });

  // 1b) Excepciones por día definidas en la ficha (aunque ese día aún no
  //     tenga bloques programados): la ficha aparece en ese ambiente.
  fichas.forEach(f => {
    Object.entries(f.ambientesExcepcion || {}).forEach(([claveDia, amb]) => {
      const [t, dia] = claveDia.split('|');
      if (!amb || esAmbienteGenerico(amb)) return;
      if (trimestreFiltro !== 'TODOS' && t !== trimestreFiltro) return;
      obtener(amb);
      const k = `${clave(amb)}__${f.id}`;
      if (!acumulado.has(k)) {
        acumulado.set(k, {
          fichaId: f.id, fichaNumero: f.numero_ficha, programaNombre: f.programaNombre,
          uso: 'EXCEPCION', horario: '', bloques: 0, horas: 0, celdas: [], jornada: ''
        });
      }
      acumulado.get(k)!.celdas.push(`${dia}|DIA|${t}`);
    });
  });

  // 2) Bloques programados: dónde se dicta realmente cada uno.
  bloques
    .filter(b => trimestreFiltro === 'TODOS' || b.trimestre === trimestreFiltro)
    .forEach(b => {
      const f = fichaPorId.get(b.fichaId);
      const amb = ambienteEfectivo(b, f);
      if (esAmbienteGenerico(amb)) return;
      obtener(amb);
      const k = `${clave(amb)}__${b.fichaId}`;
      if (!acumulado.has(k)) {
        acumulado.set(k, {
          fichaId: b.fichaId, fichaNumero: f?.numero_ficha || b.fichaId, programaNombre: f?.programaNombre || '',
          uso: f && clave(f.ambientePrincipal) === clave(amb) ? 'BASE' : 'EXCEPCION',
          horario: '', bloques: 0, horas: 0, celdas: [], jornada: '',
          sinJornada: f && clave(f.ambientePrincipal) === clave(amb) ? !f.jornadaAmbiente : undefined
        });
        if (f && clave(f.ambientePrincipal) === clave(amb)) acumulado.get(k)!.jornada = f.jornadaAmbiente || '';
      }
      const item = acumulado.get(k)!;
      item.bloques += 1;
      item.horas += b.duracionHoras || 0;
      item.celdas.push(`${b.diaSemana}|${b.franja}|${b.trimestre}`);
    });

  acumulado.forEach((item, k) => {
    const ambKey = k.split('__')[0];
    const destino = mapa.get(ambKey);
    if (!destino) return;
    // Si un día completo está en este ambiente, no se repiten sus franjas.
    const diasCompletos = new Set(item.celdas.filter(c => c.split('|')[1] === 'DIA').map(c => `${c.split('|')[0]}|${c.split('|')[2]}`));
    const celdasUtiles = item.celdas.filter(c => {
      const [d, fr, t] = c.split('|');
      return fr === 'DIA' || !diasCompletos.has(`${d}|${t}`);
    });
    const ordenadas = [...new Set(celdasUtiles)].sort((a, b) => {
      const [da, fa] = a.split('|'); const [db, fb] = b.split('|');
      return (ORDEN_DIAS[da] || 9) - (ORDEN_DIAS[db] || 9) || fa.localeCompare(fb);
    });
    item.horario = ordenadas.length === 0
      ? (item.uso === 'BASE' ? 'Sin bloques programados' : '')
      : ordenadas.map(c => {
          const [d, fr, t] = c.split('|');
          const franjaTxt = fr === 'DIA' ? 'día completo' : fr.replace(/\s/g, '');
          return `${ABREV_DIA[d] || d} ${franjaTxt}${trimestreFiltro === 'TODOS' ? ` (${t})` : ''}`;
        }).join(', ');
    // Jornada de lo programado como excepción: la de sus franjas (o todo el día).
    if (item.uso === 'EXCEPCION') {
      const js = new Set<string>();
      item.celdas.forEach(c => { const fr = c.split('|')[1]; js.add(fr === 'DIA' ? 'Todo el día' : jornadaDeFranja(fr)); });
      item.jornada = js.has('Todo el día') ? 'Todo el día' : [...js].sort((a, b) => (ORDEN_JORNADA[a] ?? 9) - (ORDEN_JORNADA[b] ?? 9)).join(' / ');
    }
    const fichaItem = fichaPorId.get(item.fichaId);
    item.fechaInicio = fichaItem?.fechaInicio;
    item.fechaFin = fichaItem?.fechaFin;
    item.vencida = !!fichaItem && (fichaVencida(fichaItem) || fichaItem.estado === 'CERRADA' || fichaItem.estado === 'POR_CERRAR');
    if (item.vencida) item.sinJornada = false;
    const { celdas: _c, ...limpio } = item;
    destino.fichas.push(limpio);
    destino.horasTotales += item.horas;
  });

  // Conflictos: dos fichas vigentes con el mismo ambiente base en la misma jornada y
  // con etapas lectivas que se cruzan. Las de etapa lectiva vencida liberan el ambiente.
  mapa.forEach(a => {
    const vigentes = a.fichas.filter(f => f.uso === 'BASE' && f.jornada && !f.vencida);
    vigentes.forEach(f => {
      if (vigentes.some(o => o !== f && o.jornada === f.jornada && rangosSeSolapan(o, f))) f.duplicada = true;
    });
    a.conflictos = a.fichas.filter(f => f.duplicada).length;
    const ocupadas = new Set(vigentes.map(f => f.jornada));
    a.jornadasLibres = ['Mañana', 'Tarde', 'Noche'].filter(j => !ocupadas.has(j));
  });

  mapa.forEach(a => a.fichas.sort((x, y) => {
    if (x.uso !== y.uso) return x.uso === 'BASE' ? -1 : 1;
    const jo = (ORDEN_JORNADA[x.jornada] ?? 9) - (ORDEN_JORNADA[y.jornada] ?? 9);
    return jo || x.fichaNumero.localeCompare(y.fichaNumero);
  }));
  return Array.from(mapa.values()).sort((a, b) => a.ambiente.localeCompare(b.ambiente));
}

const alertaFicha = (f: FichaEnAmbiente) =>
  f.duplicada ? 'Ambiente duplicado en la jornada' : f.vencida && f.uso === 'BASE' ? 'Etapa lectiva finalizada' : f.uso === 'BASE' && f.sinJornada ? 'Falta asignar jornada' : '';

const etiquetaTrimestre = (t: string) => (t === 'TODOS' ? 'Todos los trimestres' : `Trimestre ${t}`);

export async function exportarAmbientesConFichasExcel(items: AmbienteConFichas[], trimestreFiltro: string = 'TODOS', centro?: RegionalCentro) {
  const libres = items.filter(i => i.fichas.length === 0).length;
  const alertas = items.reduce((a, i) => a + i.fichas.filter(f => alertaFicha(f)).length, 0);
  const columnas = ['AMBIENTE', 'TIPO', 'SEDE', 'CAPACIDAD', 'FICHA', 'PROGRAMA', 'USO', 'JORNADA', 'DÍAS Y FRANJAS', 'BLOQUES', 'HORAS / SEM', 'ALERTA'];
  const anchos = [28, 14, 16, 11, 12, 38, 12, 14, 52, 10, 11, 28];
  const N = columnas.length;

  const wb = nuevoLibro();
  const ws = wb.addWorksheet('Ambientes y Fichas');
  ws.columns = anchos.map(width => ({ width }));
  const meta = `${[textoCentro(centro), `${items.length} ambiente(s)`, `${items.length - libres} con fichas`, `${libres} libre(s)`, alertas > 0 ? `${alertas} alerta(s)` : 'sin alertas', `Generado el ${fechaGeneracion()}`].filter(Boolean).join('  ·  ')}`;
  const filaEnc = bandaTituloExcel(ws, N, 'Ambientes y sus Fichas', `Asociación de fichas por ambiente de aprendizaje — ${etiquetaTrimestre(trimestreFiltro)}`, meta);
  encabezadoTablaExcel(ws, filaEnc, columnas);

  let fila = filaEnc + 1;
  let totalBloques = 0;
  let totalHoras = 0;
  let totalFichas = 0;
  items.forEach((a, idx) => {
    const relleno = idx % 2 === 0 ? PALETA.blanco : PALETA.zebra;
    const lineas = a.fichas.length === 0 ? [null] : a.fichas;
    const inicio = fila;
    lineas.forEach(f => {
      const valores: (string | number)[] = f
        ? [
            a.ambiente, a.tipo || '', a.sede || '', a.capacidad ?? '',
            f.fichaNumero, f.programaNombre, f.uso === 'BASE' ? 'Base' : 'Excepción', f.jornada || (f.uso === 'BASE' ? 'Sin jornada' : ''),
            f.horario, f.bloques, f.horas, alertaFicha(f)
          ]
        : [a.ambiente, a.tipo || '', a.sede || '', a.capacidad ?? '', '—', 'Libre — sin fichas asociadas', '', '', '', 0, 0, ''];
      valores.forEach((v, c) => {
        const cel = ws.getCell(fila, c + 1);
        cel.value = v as any;
        const centrado = c === 3 || c === 4 || c === 6 || c === 7 || c === 9 || c === 10;
        celdaDatoExcel(cel, { horizontal: centrado ? 'center' : 'left', relleno, negrita: c === 0 || c === 4 });
      });
      // Resaltes: excepción, libre y alertas.
      if (f?.uso === 'EXCEPCION' || (f && f.uso !== 'BASE')) {
        celdaDatoExcel(ws.getCell(fila, 7), { horizontal: 'center', relleno, negrita: true, color: PALETA.morado });
      }
      if (!f) {
        celdaDatoExcel(ws.getCell(fila, 6), { relleno, cursiva: true, color: PALETA.gris });
      }
      const textoAlerta = f ? alertaFicha(f) : '';
      if (textoAlerta) {
        celdaDatoExcel(ws.getCell(fila, 12), { relleno: PALETA.ambar, negrita: true, color: PALETA.ambarTexto });
      }
      ws.getRow(fila).height = f && String(f.horario || '').length > 55 ? 32 : 22;
      if (f) { totalBloques += f.bloques; totalHoras += f.horas; totalFichas += 1; }
      fila++;
    });
    // El ambiente (y sus datos) se combina en una sola celda por grupo de fichas.
    if (fila - 1 > inicio) {
      for (let c = 1; c <= 4; c++) ws.mergeCells(inicio, c, fila - 1, c);
    }
    for (let c = 1; c <= 4; c++) {
      ws.getCell(inicio, c).alignment = { vertical: 'middle', horizontal: c === 1 ? 'left' : 'center', wrapText: true, indent: c === 1 ? 1 : 0 };
    }
  });

  if (items.length === 0) {
    ws.mergeCells(fila, 1, fila, N);
    celdaDatoExcel(ws.getCell(fila, 1), { cursiva: true, color: PALETA.gris, horizontal: 'center' });
    ws.getCell(fila, 1).value = 'No hay ambientes para este filtro.';
    fila++;
  }

  filaTotalExcel(ws, fila, ['TOTAL', '', '', '', `${totalFichas} ficha(s)`, '', '', '', '', totalBloques, totalHoras, alertas > 0 ? `${alertas} alerta(s)` : '']);
  marcoExterior(ws, filaEnc, 1, fila, N);
  notaPieExcel(ws, fila + 2, N, 'Uso "Base": ambiente principal de la ficha. Uso "Excepción": la ficha lo usa solo en días/franjas puntuales. Las alertas indican ambiente duplicado en la jornada, etapa lectiva finalizada o jornada sin asignar.');
  configurarHojaExcel(ws, { filaEncabezado: filaEnc, congelarColumnas: 1 });
  await descargarLibro(wb, `Ambientes_y_Fichas_${trimestreFiltro === 'TODOS' ? 'Todos' : trimestreFiltro}.xlsx`);
}

export function exportarAmbientesConFichasPDF(items: AmbienteConFichas[], trimestreFiltro: string = 'TODOS', centro?: RegionalCentro) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const libres = items.filter(i => i.fichas.length === 0).length;
  const alertas = items.reduce((a, i) => a + i.fichas.filter(f => alertaFicha(f)).length, 0);
  const startY = bandaTituloPdf(
    doc,
    'Ambientes y sus Fichas',
    `Asociación de fichas por ambiente de aprendizaje — ${etiquetaTrimestre(trimestreFiltro)}`,
    `${items.length} ambiente(s)  ·  ${items.length - libres} con fichas  ·  ${libres} libre(s)  ·  ${alertas > 0 ? `${alertas} alerta(s)` : 'sin alertas'}`
  );

  const body: any[][] = [];
  let totalHoras = 0;
  let totalFichas = 0;
  items.forEach((a, idx) => {
    const fondo = idx % 2 === 0 ? [255, 255, 255] : PDF.zebra;
    if (a.fichas.length === 0) {
      body.push([
        { content: a.ambiente, styles: { fontStyle: 'bold', fillColor: fondo } },
        { content: 'Libre — sin fichas asociadas', colSpan: 5, styles: { fontStyle: 'italic', textColor: PDF.gris, fillColor: fondo } }
      ]);
      return;
    }
    a.fichas.forEach((f, i) => {
      totalHoras += f.horas;
      totalFichas += 1;
      const alerta = alertaFicha(f);
      const fila: any[] = [];
      if (i === 0) {
        fila.push({
          content: `${a.ambiente}${a.tipo ? `\n${a.tipo}` : ''}${a.capacidad ? ` · cap. ${a.capacidad}` : ''}`,
          rowSpan: a.fichas.length,
          styles: { fontStyle: 'bold', valign: 'middle', fillColor: fondo }
        });
      }
      fila.push(
        { content: `${f.fichaNumero}\n${f.programaNombre}`, styles: { fillColor: fondo } },
        { content: f.uso === 'BASE' ? 'Base' : 'Excepción', styles: { halign: 'center', fillColor: fondo, ...(f.uso !== 'BASE' ? { textColor: PDF.morado, fontStyle: 'bold' } : {}) } },
        { content: f.jornada || (f.uso === 'BASE' ? 'Sin jornada' : '—'), styles: { halign: 'center', fillColor: fondo } },
        { content: f.horario + (alerta ? `\n⚠ ${alerta}` : ''), styles: { fillColor: alerta ? PDF.ambar : fondo, ...(alerta ? { textColor: PDF.ambarTexto } : {}) } },
        { content: `${f.horas}h`, styles: { halign: 'center', fontStyle: 'bold', fillColor: fondo } }
      );
      body.push(fila);
    });
  });
  if (items.length === 0) body.push([{ content: 'No hay ambientes para este filtro.', colSpan: 6, styles: { halign: 'center', fontStyle: 'italic', textColor: PDF.gris } }]);

  const tema = temaTablaPdf(7.5);
  autoTable(doc, {
    ...tema,
    startY,
    head: [['Ambiente', 'Ficha / Programa', 'Uso', 'Jornada', 'Días y franjas', 'Horas/sem']],
    body,
    foot: [[
      { content: 'TOTAL', styles: { halign: 'left' } },
      { content: `${totalFichas} ficha(s)`, styles: { halign: 'left' } }, '', '', '',
      { content: `${totalHoras}h`, styles: { halign: 'center' } }
    ]],
    showFoot: 'lastPage',
    footStyles: { fillColor: PDF.total, textColor: PDF.pizarra, fontStyle: 'bold', lineColor: PDF.pizarra, lineWidth: { top: 1.4, left: 0.6, right: 0.6, bottom: 0.6 } },
    alternateRowStyles: {},
    tableWidth: doc.internal.pageSize.getWidth() - MARGEN_PDF * 2,
    columnStyles: { 0: { cellWidth: 140 }, 1: { cellWidth: 190 }, 2: { cellWidth: 55 }, 3: { cellWidth: 62 }, 4: { cellWidth: 'auto' }, 5: { cellWidth: 50 } }
  });

  pieDePaginasPdf(doc, centro);
  doc.save(`Ambientes_y_Fichas_${trimestreFiltro === 'TODOS' ? 'Todos' : trimestreFiltro}.pdf`);
}
