import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

export function exportarMatrizActividadesExcel(ficha: Ficha, filas: FilaMatrizActividad[], filtros: string[] = []) {
  const resumen = resumenConteo(filas as any);
  const wsData = [
    ['SISTEMA DE GESTIÓN ACADÉMICA Y CURRICULAR - MATRIZ DE ACTIVIDADES (GPFI-F-134)'],
    [`FICHA: ${ficha.numero_ficha} - ${ficha.programaNombre}`],
    [`CORTE: ${new Date().toLocaleDateString('es-CO')}`],
    [textoFiltros(filtros)],
    [`ACTIVIDADES: ${resumen.total} | ${resumen.pendientes} pendientes | ${resumen.enEjecucion} en ejecución | ${resumen.calificados} evaluadas | ${resumen.sinCalificar} sin evaluar`],
    [],
    ['FASE', 'ACTIVIDAD DE PROYECTO', 'CÓD. COMPETENCIA', 'COMPETENCIA', 'CÓD. RAP', 'RESULTADO DE APRENDIZAJE',
      'ACTIVIDAD DE APRENDIZAJE', 'H. DIRECTAS', 'H. INDEPENDIENTES', 'INSTRUCTOR', 'ESTADO'],
    ...filas.map(f => [
      f.fase, f.actividadProyecto, f.competenciaCodigo, f.competenciaDenominacion, f.rapCodigo, f.rapDenominacion,
      f.actividadAprendizaje, f.horasDirectas, f.horasIndependientes, f.instructorNombre || 'Sin Asignar',
      ETIQUETA_ESTADO_RAP[f.estadoRap] || f.estadoRap
    ])
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [
    { wch: 20 }, { wch: 36 }, { wch: 14 }, { wch: 36 }, { wch: 10 }, { wch: 44 },
    { wch: 60 }, { wch: 11 }, { wch: 13 }, { wch: 28 }, { wch: 14 }
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Matriz Actividades');
  XLSX.writeFile(wb, `Matriz_Actividades_${ficha.numero_ficha}${sufijoArchivo(filtros)}.xlsx`);
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
    head: [['Fase / Actividad de Proyecto', 'Competencia / RAP', 'Actividad de Aprendizaje', 'Horas', 'Instructor', 'Estado']],
    body: filas.map(f => [
      `${f.fase}\n${f.actividadProyecto}`,
      `${f.competenciaCodigo} — ${f.competenciaDenominacion}\n${f.rapCodigo}: ${f.rapDenominacion}`,
      f.actividadAprendizaje,
      `${f.horasDirectas}h dir.\n${f.horasIndependientes}h ind.`,
      f.instructorNombre || 'Sin Asignar',
      ETIQUETA_ESTADO_RAP[f.estadoRap] || f.estadoRap
    ]),
    styles: { fontSize: 7, cellPadding: 4, valign: 'top' },
    headStyles: { fillColor: [13, 99, 27], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 130 },
      1: { cellWidth: 170 },
      2: { cellWidth: 220 },
      3: { cellWidth: 50 },
      4: { cellWidth: 95 },
      5: { cellWidth: 60 }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const valor = String(data.cell.raw);
        if (valor === 'Evaluado') { data.cell.styles.textColor = [13, 99, 27]; data.cell.styles.fontStyle = 'bold'; }
        else if (valor === 'En Ejecución') { data.cell.styles.textColor = [0, 90, 140]; data.cell.styles.fontStyle = 'bold'; }
        else if (valor === 'Sin Evaluar') { data.cell.styles.textColor = [190, 18, 60]; data.cell.styles.fontStyle = 'bold'; }
      }
    }
  });
  doc.save(`Matriz_Actividades_${ficha.numero_ficha}${sufijoArchivo(filtros)}.pdf`);
}
