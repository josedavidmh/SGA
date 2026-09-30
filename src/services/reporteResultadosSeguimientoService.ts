import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { Ficha } from '../types';

/**
 * Una fila del reporte de resultados de Seguimiento: un Resultado de Aprendizaje
 * (RAP) dentro de su Competencia, con el estado de ejecución/calificación que
 * tiene HOY (PENDIENTE / EN_EJECUCION / CALIFICADO / SIN_CALIFICAR) y el
 * cumplimiento agregado de horas de su competencia (semáforo 70%-80%-100%).
 * Se genera en SeguimientoView.tsx a partir de comparativoLista + getRapsDeCompetencia
 * + getRapSeguimientoData, así que este servicio solo se encarga del formato de
 * salida (Excel / PDF), no del cálculo.
 */
export interface FilaResultadoSeguimiento {
  competenciaCodigo: string;
  competenciaDenominacion: string;
  competenciaTipo: string;
  horasPlaneadasCompetencia: number;
  horasEjecutadasCompetencia: number;
  porcentajeEjecucionCompetencia: number;
  estadoSemaforoCompetencia: 'OK' | 'ALERTA_PROGRAMAR' | 'AVANZADO';
  rapCodigo: string;
  rapDenominacion: string;
  instructorNombre: string;
  estadoRap: 'PENDIENTE' | 'EN_EJECUCION' | 'CALIFICADO' | 'SIN_CALIFICAR';
}

const ETIQUETA_SEMAFORO: Record<string, string> = {
  OK: 'OK (70%-80%)',
  ALERTA_PROGRAMAR: 'Alerta (<70%)',
  AVANZADO: 'Avanzada (>80%)'
};

const ETIQUETA_ESTADO_RAP: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  EN_EJECUCION: 'En Ejecución',
  CALIFICADO: 'Evaluado',
  SIN_CALIFICAR: 'Sin Evaluar'
};

function resumenConteo(filas: FilaResultadoSeguimiento[]) {
  return {
    total: filas.length,
    pendientes: filas.filter(f => f.estadoRap === 'PENDIENTE').length,
    enEjecucion: filas.filter(f => f.estadoRap === 'EN_EJECUCION').length,
    calificados: filas.filter(f => f.estadoRap === 'CALIFICADO').length,
    sinCalificar: filas.filter(f => f.estadoRap === 'SIN_CALIFICAR').length
  };
}

/** Texto de los filtros aplicados en pantalla (vacío = reporte completo). */
function textoFiltros(filtros: string[] = []) {
  return filtros.length > 0 ? `FILTROS APLICADOS: ${filtros.join(' | ')}` : 'FILTROS APLICADOS: ninguno (reporte completo de la ficha)';
}

const sufijoArchivo = (filtros: string[] = []) => (filtros.length > 0 ? '_filtrado' : '');

// Colores del semáforo y de los estados, iguales a los de Seguimiento.
const SEMAFORO_ESTILO: Record<string, { fondo: string; texto: string; rgbFondo: [number, number, number]; rgbTexto: [number, number, number] }> = {
  OK: { fondo: 'FFE8F5E9', texto: 'FF2E7D32', rgbFondo: [232, 245, 233], rgbTexto: [46, 125, 50] },
  ALERTA_PROGRAMAR: { fondo: 'FFFEF3C7', texto: 'FFB45309', rgbFondo: [254, 243, 199], rgbTexto: [180, 83, 9] },
  AVANZADO: { fondo: 'FFDBEAFE', texto: 'FF1D4ED8', rgbFondo: [219, 234, 254], rgbTexto: [29, 78, 216] }
};
const ESTADO_RAP_ESTILO: Record<string, { fondo: string; texto: string; rgbFondo: [number, number, number]; rgbTexto: [number, number, number] }> = {
  CALIFICADO: { fondo: 'FFD1FAE5', texto: 'FF065F46', rgbFondo: [209, 250, 229], rgbTexto: [6, 95, 70] },
  EN_EJECUCION: { fondo: 'FFFFEDD5', texto: 'FFC2410C', rgbFondo: [255, 237, 213], rgbTexto: [194, 65, 12] },
  SIN_CALIFICAR: { fondo: 'FFFFE4E6', texto: 'FFBE123C', rgbFondo: [255, 228, 230], rgbTexto: [190, 18, 60] },
  PENDIENTE: { fondo: 'FFF1F5F9', texto: 'FF475569', rgbFondo: [241, 245, 249], rgbTexto: [71, 85, 105] }
};

/** Cuántas filas seguidas comparten la misma competencia (para combinar celdas). */
function spansPorCompetencia(filas: FilaResultadoSeguimiento[]): number[] {
  const out = new Array(filas.length).fill(0);
  for (let i = 0; i < filas.length; ) {
    let j = i + 1;
    while (j < filas.length && filas[j].competenciaCodigo === filas[i].competenciaCodigo) j++;
    out[i] = j - i;
    i = j;
  }
  return out;
}

function resumenSemaforo(filas: FilaResultadoSeguimiento[]) {
  const porComp = new Map<string, string>();
  filas.forEach(f => porComp.set(f.competenciaCodigo, f.estadoSemaforoCompetencia));
  const v = Array.from(porComp.values());
  return {
    competencias: v.length,
    ok: v.filter(x => x === 'OK').length,
    alerta: v.filter(x => x === 'ALERTA_PROGRAMAR').length,
    avanzado: v.filter(x => x === 'AVANZADO').length
  };
}

/**
 * Excel del Comparativo por Competencia & RAPs, con el mismo estilo de la
 * Matriz de Actividades: competencia combinada sobre sus RAPs, semáforo y
 * estado de cada RAP con los colores de Seguimiento.
 */
export async function exportarResultadosSeguimientoExcel(ficha: Ficha, filas: FilaResultadoSeguimiento[], filtros: string[] = []) {
  const resumen = resumenConteo(filas);
  const sem = resumenSemaforo(filas);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Comparativo Competencias', {
    views: [{ state: 'frozen', ySplit: 7 }],
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  });
  const COLS = [
    { h: 'CÓD. COMPETENCIA', w: 13 }, { h: 'COMPETENCIA', w: 38 }, { h: 'TIPO', w: 12 },
    { h: 'H. PLANEADAS', w: 11 }, { h: 'H. EJECUTADAS', w: 11 }, { h: '% EJECUCIÓN', w: 11 }, { h: 'SEMÁFORO', w: 15 },
    { h: 'CÓD. RAP', w: 10 }, { h: 'RESULTADO DE APRENDIZAJE', w: 50 }, { h: 'INSTRUCTOR', w: 28 }, { h: 'ESTADO DEL RAP', w: 15 }
  ];
  const N = COLS.length;
  COLS.forEach((c, i) => { ws.getColumn(i + 1).width = c.w; });
  const VERDE = 'FF0D631B';
  const borde = { style: 'thin' as const, color: { argb: 'FFCBD5E1' } };
  const bordes = { top: borde, left: borde, bottom: borde, right: borde };
  const titulo = (fila: number, texto: string, opts: { bold?: boolean; size?: number; color?: string } = {}) => {
    ws.mergeCells(fila, 1, fila, N);
    const c = ws.getCell(fila, 1);
    c.value = texto;
    c.font = { bold: opts.bold ?? false, size: opts.size ?? 10, color: { argb: opts.color || 'FF111C2D' } };
    c.alignment = { vertical: 'middle', wrapText: true };
  };
  titulo(1, 'SISTEMA DE GESTIÓN ACADÉMICA Y CURRICULAR — COMPARATIVO POR COMPETENCIA & RAPs', { bold: true, size: 13, color: VERDE });
  titulo(2, `FICHA: ${ficha.numero_ficha} — ${ficha.programaNombre} (${ficha.modalidad || ''})`, { bold: true });
  titulo(3, `CORTE: ${new Date().toLocaleDateString('es-CO')}   |   SEMÁFORO: ${sem.competencias} competencias — ${sem.ok} OK (70%-80%), ${sem.alerta} en alerta (<70%), ${sem.avanzado} avanzadas (>80%)`);
  titulo(4, textoFiltros(filtros), { bold: filtros.length > 0, color: filtros.length > 0 ? VERDE : 'FF64748B' });
  titulo(5, `RAPs: ${resumen.total} | ${resumen.pendientes} pendientes | ${resumen.enEjecucion} en ejecución | ${resumen.calificados} evaluados | ${resumen.sinCalificar} sin evaluar`);

  const FILA_ENC = 7;
  COLS.forEach((c, i) => {
    const cell = ws.getCell(FILA_ENC, i + 1);
    cell.value = c.h;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = bordes;
  });
  ws.getRow(FILA_ENC).height = 30;
  if (filas.length === 0) {
    ws.mergeCells(FILA_ENC + 1, 1, FILA_ENC + 1, N);
    ws.getCell(FILA_ENC + 1, 1).value = 'No hay resultados para este filtro.';
  }

  filas.forEach((f, i) => {
    const r = FILA_ENC + 1 + i;
    const valores = [
      f.competenciaCodigo, f.competenciaDenominacion, f.competenciaTipo,
      f.horasPlaneadasCompetencia, f.horasEjecutadasCompetencia, f.porcentajeEjecucionCompetencia / 100,
      ETIQUETA_SEMAFORO[f.estadoSemaforoCompetencia] || f.estadoSemaforoCompetencia,
      f.rapCodigo, f.rapDenominacion, f.instructorNombre || 'Sin asignar',
      ETIQUETA_ESTADO_RAP[f.estadoRap] || f.estadoRap
    ];
    valores.forEach((v, c) => {
      const cell = ws.getCell(r, c + 1);
      cell.value = v as any;
      cell.font = { size: 9, bold: c === 0 || c === 7 };
      cell.alignment = { vertical: 'top', wrapText: true, horizontal: c >= 3 && c <= 6 ? 'center' : 'left' };
      cell.border = bordes;
    });
    ws.getCell(r, 6).numFmt = '0%';
    const s = SEMAFORO_ESTILO[f.estadoSemaforoCompetencia];
    if (s) {
      [6, 7].forEach(c => {
        const cell = ws.getCell(r, c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: s.fondo } };
        cell.font = { size: 9, bold: true, color: { argb: s.texto } };
      });
    }
    const e = ESTADO_RAP_ESTILO[f.estadoRap];
    const est = ws.getCell(r, N);
    if (e) {
      est.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: e.fondo } };
      est.font = { size: 9, bold: true, color: { argb: e.texto } };
    }
    est.alignment = { vertical: 'top', horizontal: 'center', wrapText: true };
  });

  // La competencia (y su semáforo) se combina sobre sus RAPs seguidos.
  const spans = spansPorCompetencia(filas);
  spans.forEach((n, i) => {
    if (n > 1) for (let c = 1; c <= 7; c++) ws.mergeCells(FILA_ENC + 1 + i, c, FILA_ENC + i + n, c);
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `Resultados_Seguimiento_${ficha.numero_ficha}${sufijoArchivo(filtros)}.xlsx`;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}

/** PDF del Comparativo, semaforizado como en Seguimiento. */
export function exportarResultadosSeguimientoPDF(ficha: Ficha, filas: FilaResultadoSeguimiento[], filtros: string[] = []) {
  const resumen = resumenConteo(filas);
  const sem = resumenSemaforo(filas);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('SISTEMA DE GESTIÓN ACADÉMICA Y CURRICULAR', 40, 36);
  doc.setFontSize(11);
  doc.text('Comparativo por Competencia & RAPs — Semáforo 70%-80%', 40, 54);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Ficha: ${ficha.numero_ficha} — ${ficha.programaNombre} (${ficha.modalidad})   |   Corte: ${new Date().toLocaleDateString('es-CO')}`, 40, 72);

  // Leyenda del semáforo con sus colores
  let x = 40;
  const leyenda: [string, string][] = [
    ['OK', `${sem.ok} OK (70%-80%)`],
    ['ALERTA_PROGRAMAR', `${sem.alerta} Alerta (<70%)`],
    ['AVANZADO', `${sem.avanzado} Avanzada (>80%)`]
  ];
  leyenda.forEach(([k, t]) => {
    const s = SEMAFORO_ESTILO[k];
    const w = doc.getTextWidth(t) + 14;
    doc.setFillColor(...s.rgbFondo);
    doc.roundedRect(x, 80, w, 14, 3, 3, 'F');
    doc.setTextColor(...s.rgbTexto);
    doc.setFont('helvetica', 'bold');
    doc.text(t, x + 7, 90);
    x += w + 8;
  });
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `RAPs: ${resumen.total}  |  ${resumen.pendientes} pendientes  |  ${resumen.enEjecucion} en ejecución  |  ${resumen.calificados} evaluados  |  ${resumen.sinCalificar} sin evaluar`,
    x + 6, 90
  );
  doc.setFont('helvetica', filtros.length > 0 ? 'bold' : 'normal');
  if (filtros.length > 0) doc.setTextColor(13, 99, 27);
  const lineasFiltro = doc.splitTextToSize(textoFiltros(filtros), 760);
  doc.text(lineasFiltro, 40, 110);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  const spans = spansPorCompetencia(filas);
  const body = filas.map((f, i) => {
    const fila: any[] = [];
    if (spans[i] > 0) {
      const s = SEMAFORO_ESTILO[f.estadoSemaforoCompetencia];
      fila.push({ content: `${f.competenciaCodigo}\n${f.competenciaDenominacion}\n(${f.competenciaTipo})`, rowSpan: spans[i] });
      fila.push({ content: `${f.horasEjecutadasCompetencia}h / ${f.horasPlaneadasCompetencia}h`, rowSpan: spans[i], styles: { halign: 'center' } });
      fila.push({
        content: `${f.porcentajeEjecucionCompetencia}%\n${ETIQUETA_SEMAFORO[f.estadoSemaforoCompetencia] || ''}`,
        rowSpan: spans[i],
        styles: s ? { fillColor: s.rgbFondo, textColor: s.rgbTexto, fontStyle: 'bold', halign: 'center' } : {}
      });
    }
    const e = ESTADO_RAP_ESTILO[f.estadoRap];
    fila.push(`${f.rapCodigo}: ${f.rapDenominacion}`);
    fila.push(f.instructorNombre || 'Sin asignar');
    fila.push({
      content: ETIQUETA_ESTADO_RAP[f.estadoRap] || f.estadoRap,
      styles: e ? { fillColor: e.rgbFondo, textColor: e.rgbTexto, fontStyle: 'bold', halign: 'center' } : {}
    });
    return fila;
  });

  autoTable(doc, {
    startY: 120 + (lineasFiltro.length - 1) * 11,
    head: [['Competencia', 'Ejecutadas / Planeadas', 'Semáforo', 'Resultado de Aprendizaje', 'Instructor', 'Estado del RAP']],
    body,
    styles: { fontSize: 7.5, cellPadding: 4, valign: 'top', lineColor: [226, 232, 240], lineWidth: 0.5 },
    headStyles: { fillColor: [13, 99, 27], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 170 },
      1: { cellWidth: 70 },
      2: { cellWidth: 75 },
      3: { cellWidth: 250 },
      4: { cellWidth: 110 },
      5: { cellWidth: 75 }
    }
  });

  doc.save(`Resultados_Seguimiento_${ficha.numero_ficha}${sufijoArchivo(filtros)}.pdf`);
}

// ===========================================================================
// MATRIZ DE ACTIVIDADES (planeación pedagógica + estado del RAP en la ficha)
// ===========================================================================

export interface FilaMatrizActividad {
  fase: string;
  actividadProyecto: string;
  competenciaCodigo: string;
  competenciaDenominacion: string;
  rapCodigo: string;
  rapDenominacion: string;
  actividadAprendizaje: string;
  horasDirectas: number;
  horasIndependientes: number;
  instructorNombre: string;
  estadoRap: 'PENDIENTE' | 'EN_EJECUCION' | 'CALIFICADO' | 'SIN_CALIFICAR';
}

/**
 * Excel de la Matriz de Actividades con el mismo orden y agrupación que en
 * pantalla: celdas combinadas para Fase/Actividad de Proyecto, Competencia y
 * Actividad de Aprendizaje cuando se repiten en filas seguidas; encabezado
 * con color, texto ajustado, bordes, estado con color y totales de horas.
 */
export async function exportarMatrizActividadesExcel(ficha: Ficha, filas: FilaMatrizActividad[], filtros: string[] = []) {
  const resumen = resumenConteo(filas as any);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Matriz Actividades', {
    views: [{ state: 'frozen', ySplit: 7 }],
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  });

  const COLS = [
    { h: 'FASE', w: 16 }, { h: 'ACTIVIDAD DE PROYECTO', w: 30 },
    { h: 'CÓD. COMPETENCIA', w: 13 }, { h: 'COMPETENCIA', w: 34 },
    { h: 'CÓD. RAP', w: 10 }, { h: 'RESULTADO DE APRENDIZAJE', w: 40 },
    { h: 'ACTIVIDAD DE APRENDIZAJE', w: 50 },
    { h: 'H. DIRECTAS', w: 10 }, { h: 'H. INDEP.', w: 10 }, { h: 'H. TOTAL', w: 10 },
    { h: 'INSTRUCTOR', w: 26 }, { h: 'ESTADO', w: 14 }
  ];
  const N = COLS.length;
  COLS.forEach((c, i) => { ws.getColumn(i + 1).width = c.w; });

  const VERDE = 'FF0D631B';
  const borde = { style: 'thin' as const, color: { argb: 'FFCBD5E1' } };
  const bordes = { top: borde, left: borde, bottom: borde, right: borde };

  // Encabezado del reporte
  const titulo = (fila: number, texto: string, opts: { bold?: boolean; size?: number; color?: string } = {}) => {
    ws.mergeCells(fila, 1, fila, N);
    const c = ws.getCell(fila, 1);
    c.value = texto;
    c.font = { bold: opts.bold ?? false, size: opts.size ?? 10, color: { argb: opts.color || 'FF111C2D' } };
    c.alignment = { vertical: 'middle', wrapText: true };
  };
  titulo(1, 'SISTEMA DE GESTIÓN ACADÉMICA Y CURRICULAR — MATRIZ DE ACTIVIDADES (GPFI-F-134)', { bold: true, size: 13, color: VERDE });
  titulo(2, `FICHA: ${ficha.numero_ficha} — ${ficha.programaNombre} (${ficha.modalidad || ''})`, { bold: true });
  titulo(3, `CORTE: ${new Date().toLocaleDateString('es-CO')}`);
  titulo(4, textoFiltros(filtros), { bold: filtros.length > 0, color: filtros.length > 0 ? VERDE : 'FF64748B' });
  titulo(5, `ACTIVIDADES: ${resumen.total} | ${resumen.pendientes} pendientes | ${resumen.enEjecucion} en ejecución | ${resumen.calificados} evaluadas | ${resumen.sinCalificar} sin evaluar`);

  // Encabezado de la tabla (fila 7)
  const FILA_ENC = 7;
  COLS.forEach((c, i) => {
    const cell = ws.getCell(FILA_ENC, i + 1);
    cell.value = c.h;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = bordes;
  });
  ws.getRow(FILA_ENC).height = 30;

  if (filas.length === 0) {
    ws.mergeCells(FILA_ENC + 1, 1, FILA_ENC + 1, N);
    ws.getCell(FILA_ENC + 1, 1).value = 'No hay actividades para este filtro.';
  }

  const COLOR_ESTADO: Record<string, string> = {
    CALIFICADO: 'FFE8F5E9', EN_EJECUCION: 'FFE1F5FE', SIN_CALIFICAR: 'FFFFE4E6', PENDIENTE: 'FFFFF8E1'
  };
  const TEXTO_ESTADO: Record<string, string> = {
    CALIFICADO: 'FF2E7D32', EN_EJECUCION: 'FF005A8C', SIN_CALIFICAR: 'FFBE123C', PENDIENTE: 'FFC67C00'
  };

  filas.forEach((f, i) => {
    const r = FILA_ENC + 1 + i;
    const valores = [
      f.fase, f.actividadProyecto, f.competenciaCodigo, f.competenciaDenominacion, f.rapCodigo, f.rapDenominacion,
      f.actividadAprendizaje, f.horasDirectas, f.horasIndependientes, (f.horasDirectas || 0) + (f.horasIndependientes || 0),
      f.instructorNombre || 'Sin asignar', ETIQUETA_ESTADO_RAP[f.estadoRap] || f.estadoRap
    ];
    valores.forEach((v, c) => {
      const cell = ws.getCell(r, c + 1);
      cell.value = v as any;
      cell.font = { size: 9, bold: c === 0 || c === 2 || c === 4, color: { argb: c === 0 ? 'FF6F43C0' : 'FF111C2D' } };
      cell.alignment = { vertical: 'top', wrapText: true, horizontal: c >= 7 && c <= 9 ? 'center' : 'left' };
      cell.border = bordes;
    });
    const est = ws.getCell(r, N);
    est.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ESTADO[f.estadoRap] || 'FFFFFFFF' } };
    est.font = { size: 9, bold: true, color: { argb: TEXTO_ESTADO[f.estadoRap] || 'FF111C2D' } };
    est.alignment = { vertical: 'top', horizontal: 'center', wrapText: true };
  });

  // Celdas combinadas (mismo criterio que en pantalla: solo filas seguidas).
  const combinar = (clave: (f: FilaMatrizActividad) => string, columnas: number[]) => {
    for (let i = 0; i < filas.length; ) {
      let j = i + 1;
      while (j < filas.length && clave(filas[j]) === clave(filas[i])) j++;
      if (j - i > 1) {
        columnas.forEach(c => ws.mergeCells(FILA_ENC + 1 + i, c, FILA_ENC + j, c));
      }
      i = j;
    }
  };
  const kProyecto = (f: FilaMatrizActividad) => `${f.fase}||${f.actividadProyecto}`;
  const kComp = (f: FilaMatrizActividad) => `${kProyecto(f)}||${f.competenciaCodigo}`;
  const kAct = (f: FilaMatrizActividad) => `${kComp(f)}||${(f.actividadAprendizaje || '').trim()}`;
  combinar(kProyecto, [1, 2]);
  combinar(kComp, [3, 4]);
  combinar(kAct, [7]);

  // Totales
  if (filas.length > 0) {
    const r = FILA_ENC + 1 + filas.length;
    ws.mergeCells(r, 1, r, 7);
    const t = ws.getCell(r, 1);
    t.value = `TOTAL (${filas.length} resultados)`;
    t.font = { bold: true, size: 9 };
    t.alignment = { horizontal: 'right' };
    const totDir = filas.reduce((a, f) => a + (f.horasDirectas || 0), 0);
    const totInd = filas.reduce((a, f) => a + (f.horasIndependientes || 0), 0);
    [totDir, totInd, totDir + totInd].forEach((v, k) => {
      const c = ws.getCell(r, 8 + k);
      c.value = v;
      c.font = { bold: true, size: 9 };
      c.alignment = { horizontal: 'center' };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      c.border = bordes;
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `Matriz_Actividades_${ficha.numero_ficha}${sufijoArchivo(filtros)}.xlsx`;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}

export function exportarMatrizActividadesPDF(ficha: Ficha, filas: FilaMatrizActividad[], filtros: string[] = []) {
  const resumen = resumenConteo(filas as any);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('SISTEMA DE GESTIÓN ACADÉMICA Y CURRICULAR', 40, 36);
  doc.setFontSize(11);
  doc.text('Matriz de Actividades (GPFI-F-134)', 40, 54);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Ficha: ${ficha.numero_ficha} — ${ficha.programaNombre} (${ficha.modalidad})`, 40, 72);
  doc.text(`Corte: ${new Date().toLocaleDateString('es-CO')}`, 40, 86);
  doc.text(
    `Actividades: ${resumen.total}   |   ${resumen.pendientes} pendientes   |   ${resumen.enEjecucion} en ejecución   |   ${resumen.calificados} evaluadas   |   ${resumen.sinCalificar} sin evaluar`,
    40, 100
  );
  doc.setFont('helvetica', filtros.length > 0 ? 'bold' : 'normal');
  if (filtros.length > 0) doc.setTextColor(13, 99, 27);
  const lineasFiltro = doc.splitTextToSize(textoFiltros(filtros), 760);
  doc.text(lineasFiltro, 40, 114);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  autoTable(doc, {
    startY: 122 + (lineasFiltro.length - 1) * 11,
    head: [['Fase / Actividad de Proyecto', 'Competencia', 'Resultado de Aprendizaje', 'Actividad de Aprendizaje', 'Horas', 'Instructor', 'Estado']],
    // Misma agrupación que en pantalla (celdas combinadas en filas seguidas).
    body: (() => {
      const kP = (f: FilaMatrizActividad) => `${f.fase}||${f.actividadProyecto}`;
      const kC = (f: FilaMatrizActividad) => `${kP(f)}||${f.competenciaCodigo}`;
      const kA = (f: FilaMatrizActividad) => `${kC(f)}||${(f.actividadAprendizaje || '').trim()}`;
      const span = (k: (f: FilaMatrizActividad) => string) => {
        const out = new Array(filas.length).fill(0);
        for (let i = 0; i < filas.length; ) {
          let j = i + 1;
          while (j < filas.length && k(filas[j]) === k(filas[i])) j++;
          out[i] = j - i;
          i = j;
        }
        return out;
      };
      const sP = span(kP), sC = span(kC), sA = span(kA);
      return filas.map((f, i) => {
        const fila: any[] = [];
        if (sP[i] > 0) fila.push({ content: `${f.fase}\n${f.actividadProyecto}`, rowSpan: sP[i] });
        if (sC[i] > 0) fila.push({ content: `${f.competenciaCodigo}\n${f.competenciaDenominacion}`, rowSpan: sC[i] });
        fila.push(`${f.rapCodigo}: ${f.rapDenominacion}`);
        if (sA[i] > 0) fila.push({ content: f.actividadAprendizaje, rowSpan: sA[i] });
        fila.push(`${f.horasDirectas}h dir.\n${f.horasIndependientes}h ind.`);
        fila.push(f.instructorNombre || 'Sin Asignar');
        fila.push(ETIQUETA_ESTADO_RAP[f.estadoRap] || f.estadoRap);
        return fila;
      });
    })(),
    styles: { fontSize: 7, cellPadding: 4, valign: 'top' },
    headStyles: { fillColor: [13, 99, 27], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 110 },
      1: { cellWidth: 110 },
      2: { cellWidth: 140 },
      3: { cellWidth: 160 },
      4: { cellWidth: 45 },
      5: { cellWidth: 85 },
      6: { cellWidth: 55 }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 6) {
        const valor = String(data.cell.raw);
        if (valor === 'Evaluado') { data.cell.styles.textColor = [13, 99, 27]; data.cell.styles.fontStyle = 'bold'; }
        else if (valor === 'En Ejecución') { data.cell.styles.textColor = [0, 90, 140]; data.cell.styles.fontStyle = 'bold'; }
        else if (valor === 'Sin Evaluar') { data.cell.styles.textColor = [190, 18, 60]; data.cell.styles.fontStyle = 'bold'; }
      }
    }
  });
  doc.save(`Matriz_Actividades_${ficha.numero_ficha}${sufijoArchivo(filtros)}.pdf`);
}
