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

export function exportarResultadosSeguimientoExcel(ficha: Ficha, filas: FilaResultadoSeguimiento[], filtros: string[] = []) {
  const resumen = resumenConteo(filas);

  const wsData = [
    ['SISTEMA DE GESTIÓN ACADÉMICA Y CURRICULAR - RESULTADOS DE SEGUIMIENTO'],
    [`FICHA: ${ficha.numero_ficha} - ${ficha.programaNombre}`],
    [`CORTE: ${new Date().toLocaleDateString('es-CO')}`],
    [textoFiltros(filtros)],
    [`RAPs: ${resumen.total} totales | ${resumen.pendientes} pendientes | ${resumen.enEjecucion} en ejecución | ${resumen.calificados} evaluados | ${resumen.sinCalificar} sin evaluar`],
    [],
    [
      'CÓD. COMPETENCIA', 'DENOMINACIÓN COMPETENCIA', 'TIPO',
      'H. PLANEADAS COMP.', 'H. EJECUTADAS COMP.', '% EJECUCIÓN COMP.', 'SEMÁFORO COMPETENCIA',
      'CÓD. RAP', 'RESULTADO DE APRENDIZAJE', 'INSTRUCTOR ASIGNADO', 'ESTADO DEL RAP'
    ],
    ...filas.map(f => [
      f.competenciaCodigo,
      f.competenciaDenominacion,
      f.competenciaTipo,
      f.horasPlaneadasCompetencia,
      f.horasEjecutadasCompetencia,
      f.porcentajeEjecucionCompetencia,
      ETIQUETA_SEMAFORO[f.estadoSemaforoCompetencia] || f.estadoSemaforoCompetencia,
      f.rapCodigo,
      f.rapDenominacion,
      f.instructorNombre || 'Sin Asignar',
      ETIQUETA_ESTADO_RAP[f.estadoRap] || f.estadoRap
    ])
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [
    { wch: 16 }, { wch: 32 }, { wch: 12 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 18 },
    { wch: 12 }, { wch: 45 }, { wch: 26 }, { wch: 16 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Resultados Seguimiento');
  XLSX.writeFile(wb, `Resultados_Seguimiento_${ficha.numero_ficha}${sufijoArchivo(filtros)}.xlsx`);
}

export function exportarResultadosSeguimientoPDF(ficha: Ficha, filas: FilaResultadoSeguimiento[], filtros: string[] = []) {
  const resumen = resumenConteo(filas);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('SISTEMA DE GESTIÓN ACADÉMICA Y CURRICULAR', 40, 36);
  doc.setFontSize(11);
  doc.text('Resultados de Seguimiento — Competencias y RAPs', 40, 54);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Ficha: ${ficha.numero_ficha} — ${ficha.programaNombre} (${ficha.modalidad})`, 40, 72);
  doc.text(`Corte: ${new Date().toLocaleDateString('es-CO')}`, 40, 86);
  doc.text(
    `RAPs: ${resumen.total} totales   |   ${resumen.pendientes} pendientes   |   ${resumen.enEjecucion} en ejecución   |   ${resumen.calificados} evaluados   |   ${resumen.sinCalificar} sin evaluar`,
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
    head: [[
      'Competencia', 'Tipo', '% Ejec. Comp.', 'Semáforo',
      'RAP', 'Resultado de Aprendizaje', 'Instructor', 'Estado del RAP'
    ]],
    body: filas.map(f => [
      `${f.competenciaCodigo}\n${f.competenciaDenominacion}`,
      f.competenciaTipo,
      `${f.porcentajeEjecucionCompetencia}%`,
      ETIQUETA_SEMAFORO[f.estadoSemaforoCompetencia] || f.estadoSemaforoCompetencia,
      f.rapCodigo,
      f.rapDenominacion,
      f.instructorNombre || 'Sin Asignar',
      ETIQUETA_ESTADO_RAP[f.estadoRap] || f.estadoRap
    ]),
    styles: { fontSize: 7.5, cellPadding: 4, valign: 'top' },
    headStyles: { fillColor: [13, 99, 27], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 130 },
      1: { cellWidth: 55 },
      2: { cellWidth: 55 },
      3: { cellWidth: 70 },
      4: { cellWidth: 45 },
      5: { cellWidth: 190 },
      6: { cellWidth: 80 },
      7: { cellWidth: 65 }
    },
    // Colorea la celda de Estado del RAP según su valor, para que se distinga
    // de un vistazo igual que en la interfaz (verde=calificado, ámbar=en
    // ejecución, gris=pendiente, rojo=sin calificar).
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 7) {
        const valor = String(data.cell.raw);
        if (valor === 'Evaluado') {
          data.cell.styles.textColor = [13, 99, 27];
          data.cell.styles.fontStyle = 'bold';
        } else if (valor === 'En Ejecución') {
          data.cell.styles.textColor = [180, 95, 6];
          data.cell.styles.fontStyle = 'bold';
        } else if (valor === 'Sin Evaluar') {
          data.cell.styles.textColor = [190, 18, 60];
          data.cell.styles.fontStyle = 'bold';
        }
      }
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
