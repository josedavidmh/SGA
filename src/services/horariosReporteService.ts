import { ambienteEfectivo } from '../lib/ambientes';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Ficha, BloqueHorario, DiaSemana, FranjaHorario } from '../types';

/** Definición de una franja horaria tal como la usa la grilla de Horarios. */
export interface FranjaDef {
  franja: FranjaHorario;
  label: string;
  sub: string;
}

const COLOR_ENCABEZADO: [number, number, number] = [13, 99, 27];
const COLOR_LIBRE_TEXTO: [number, number, number] = [148, 163, 184];
const COLOR_LIBRE_FONDO: [number, number, number] = [248, 250, 252];
const COLOR_ASIGNADO_FONDO: [number, number, number] = [232, 245, 233];

function encontrarBloque(bloques: BloqueHorario[], dia: DiaSemana, franja: FranjaHorario): BloqueHorario | undefined {
  return bloques.find(b => b.diaSemana === dia && b.franja === franja);
}

function pintarCeldaGrid(data: any) {
  if (data.section === 'body' && data.column.index > 0) {
    if (data.cell.raw === 'Libre') {
      data.cell.styles.textColor = COLOR_LIBRE_TEXTO;
      data.cell.styles.fillColor = COLOR_LIBRE_FONDO;
    } else {
      data.cell.styles.fillColor = COLOR_ASIGNADO_FONDO;
    }
  }
}

// =====================================================================
// REPORTE 1: HORARIO DE LA FICHA (grilla semanal completa)
// =====================================================================

export function exportarHorarioFichaExcel(ficha: Ficha, bloques: BloqueHorario[], dias: DiaSemana[], franjas: FranjaDef[]) {
  const totalHoras = bloques.reduce((acc, b) => acc + b.duracionHoras, 0);

  const wsGridData: (string | number)[][] = [
    ['SISTEMA DE GESTIÓN ACADÉMICA Y CURRICULAR - HORARIO DE FICHA'],
    [`FICHA: ${ficha.numero_ficha} - ${ficha.programaNombre}`],
    [`AMBIENTE: ${ficha.ambientePrincipal} | PERIODO: ${ficha.periodoLectivo}`],
    [`TOTAL BLOQUES: ${bloques.length} | TOTAL HORAS SEMANALES: ${totalHoras}h`],
    [],
    ['HORARIO', ...dias],
    ...franjas.map(f => [
      `${f.label} (${f.sub})`,
      ...dias.map(d => {
        const b = encontrarBloque(bloques, d, f.franja);
        // El ambiente siempre es el de la ficha (Espacio Físico / Sede), nunca
        // el que haya quedado guardado en el bloque — se muestran así aunque
        // el bloque sea de antes de un cambio de ambiente en la ficha.
        return b ? `${b.competenciaNombre || b.rapTitulo} | ${b.instructorNombre || 'VACANTE — falta instructor'} (${b.duracionHoras}h) | ${ambienteEfectivo(b, ficha)}` : '';
      })
    ])
  ];

  const wsGrid = XLSX.utils.aoa_to_sheet(wsGridData);
  wsGrid['!cols'] = [{ wch: 18 }, ...dias.map(() => ({ wch: 34 }))];

  const wsDetalleData = [
    ['DÍA', 'FRANJA HORARIA', 'AMBIENTE', 'INSTRUCTOR ASIGNADO', 'CÓDIGO RAP', 'ACTIVIDAD / MÓDULO', 'HORAS'],
    ...bloques.map(b => [
      b.diaSemana, b.franja, ambienteEfectivo(b, ficha), b.instructorNombre || 'VACANTE — falta instructor', b.rapCodigo, b.competenciaNombre || b.rapTitulo, b.duracionHoras
    ])
  ];
  const wsDetalle = XLSX.utils.aoa_to_sheet(wsDetalleData);
  wsDetalle['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 22 }, { wch: 24 }, { wch: 14 }, { wch: 42 }, { wch: 10 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsGrid, 'Horario Semanal');
  XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle');
  XLSX.writeFile(wb, `Horario_Ficha_${ficha.numero_ficha}.xlsx`);
}

export function exportarHorarioFichaPDF(ficha: Ficha, bloques: BloqueHorario[], dias: DiaSemana[], franjas: FranjaDef[]) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const totalHoras = bloques.reduce((acc, b) => acc + b.duracionHoras, 0);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('SISTEMA DE GESTIÓN ACADÉMICA Y CURRICULAR', 40, 36);
  doc.setFontSize(11);
  doc.text(`Horario de la Ficha ${ficha.numero_ficha}`, 40, 54);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${ficha.programaNombre} — ${ficha.ambientePrincipal} — ${ficha.periodoLectivo}`, 40, 70);
  doc.text(`${bloques.length} bloques asignados — ${totalHoras}h semanales`, 40, 84);

  autoTable(doc, {
    startY: 100,
    head: [['Horario', ...dias]],
    body: franjas.map(f => [
      `${f.label}\n${f.sub}`,
      ...dias.map(d => {
        const b = encontrarBloque(bloques, d, f.franja);
        if (!b) return 'Libre';
        const amb = ambienteEfectivo(b, ficha);
        // Solo se escribe el ambiente cuando es distinto al base (excepción).
        const extra = amb && amb !== ficha.ambientePrincipal ? `\nAmbiente: ${amb}` : '';
        return `${b.competenciaNombre || b.rapTitulo}\n${b.instructorNombre || 'VACANTE — falta instructor'} (${b.duracionHoras}h)${extra}`;
      })
    ]),
    styles: { fontSize: 7.5, cellPadding: 4, valign: 'top' },
    headStyles: { fillColor: COLOR_ENCABEZADO, textColor: 255, fontStyle: 'bold' },
    didParseCell: pintarCeldaGrid
  });

  doc.save(`Horario_Ficha_${ficha.numero_ficha}.pdf`);
}

// =====================================================================
// REPORTE 2: HORARIOS POR INSTRUCTOR (agrupado, dentro de esta ficha)
// =====================================================================

interface GrupoInstructor {
  instructorId: string;
  instructorNombre: string;
  bloques: BloqueHorario[];
}

function agruparPorInstructor(bloques: BloqueHorario[]): GrupoInstructor[] {
  const mapa = new Map<string, GrupoInstructor>();
  // Los bloques VACANTES (sin instructor todavía) no tienen a quién agrupar
  // aquí — se reportan aparte, en la lista de espacios por cubrir.
  bloques.filter(b => b.instructorId).forEach(b => {
    const key = b.instructorId!;
    if (!mapa.has(key)) {
      mapa.set(key, { instructorId: b.instructorId!, instructorNombre: b.instructorNombre!, bloques: [] });
    }
    mapa.get(key)!.bloques.push(b);
  });
  return Array.from(mapa.values()).sort((a, b) => a.instructorNombre.localeCompare(b.instructorNombre));
}

/** Bloques programados pero sin instructor asignado — espacios pendientes por cubrir. */
export function obtenerBloquesVacantes(bloques: BloqueHorario[]): BloqueHorario[] {
  return bloques.filter(b => !b.instructorId);
}

/** Resuelve "Ficha 2694123 (ADSO)" para una fichaId dada, tolerando que no se encuentre. */
function etiquetaFicha(fichasPorId: Record<string, Ficha>, fichaId: string): string {
  const f = fichasPorId[fichaId];
  if (!f) return 'Ficha desconocida';
  return `Ficha ${f.numero_ficha} (${f.programaNombre})`;
}

// Este reporte es del INSTRUCTOR, no de una ficha: agrupa TODOS sus bloques
// asignados en TODAS las fichas y programas en los que tenga clase — por eso
// cada celda debe identificar de qué ficha/programa es ese bloque en concreto.
export function exportarHorariosPorInstructorExcel(bloques: BloqueHorario[], dias: DiaSemana[], franjas: FranjaDef[], fichasPorId: Record<string, Ficha>) {
  const grupos = agruparPorInstructor(bloques);

  const wsData: (string | number)[][] = [
    ['SISTEMA DE GESTIÓN ACADÉMICA Y CURRICULAR - HORARIOS POR INSTRUCTOR'],
    ['Todas las fichas y programas de formación'],
    [`INSTRUCTORES CON BLOQUES ASIGNADOS: ${grupos.length}`],
    []
  ];

  if (grupos.length === 0) {
    wsData.push(['No hay bloques asignados todavía.']);
  }

  grupos.forEach(g => {
    const totalHoras = g.bloques.reduce((acc, b) => acc + b.duracionHoras, 0);
    const totalFichas = new Set(g.bloques.map(b => b.fichaId)).size;
    wsData.push([`INSTRUCTOR: ${g.instructorNombre}`, `${g.bloques.length} bloques`, `${totalHoras}h semanales`, `${totalFichas} ficha(s)`]);
    wsData.push(['HORARIO', ...dias]);
    franjas.forEach(f => {
      wsData.push([
        `${f.label} (${f.sub})`,
        ...dias.map(d => {
          const b = g.bloques.find(x => x.diaSemana === d && x.franja === f.franja);
          const ambienteFicha = (b ? ambienteEfectivo(b, fichasPorId[b.fichaId]) : '');
          return b ? `${etiquetaFicha(fichasPorId, b.fichaId)} | ${b.competenciaNombre || b.rapTitulo} (${b.duracionHoras}h) | ${ambienteFicha}` : '';
        })
      ]);
    });
    wsData.push([]);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 24 }, ...dias.map(() => ({ wch: 36 }))];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Horarios por Instructor');
  XLSX.writeFile(wb, `Horarios_por_Instructor_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportarHorariosPorInstructorPDF(bloques: BloqueHorario[], dias: DiaSemana[], franjas: FranjaDef[], fichasPorId: Record<string, Ficha>) {
  const grupos = agruparPorInstructor(bloques);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  if (grupos.length === 0) {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('SISTEMA DE GESTIÓN ACADÉMICA Y CURRICULAR', 40, 36);
    doc.setFontSize(11);
    doc.text('Horarios por Instructor — Todas las Fichas', 40, 54);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('No hay bloques asignados todavía.', 40, 80);
    doc.save('Horarios_por_Instructor.pdf');
    return;
  }

  grupos.forEach((g, idx) => {
    if (idx > 0) doc.addPage();
    const totalHoras = g.bloques.reduce((acc, b) => acc + b.duracionHoras, 0);
    const totalFichas = new Set(g.bloques.map(b => b.fichaId)).size;

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('SISTEMA DE GESTIÓN ACADÉMICA Y CURRICULAR', 40, 36);
    doc.setFontSize(11);
    doc.text(`Horario Asignado — ${g.instructorNombre}`, 40, 54);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`${g.bloques.length} bloques — ${totalHoras}h semanales — ${totalFichas} ficha(s)/programa(s)`, 40, 70);

    autoTable(doc, {
      startY: 86,
      head: [['Horario', ...dias]],
      body: franjas.map(f => [
        `${f.label}\n${f.sub}`,
        ...dias.map(d => {
          const b = g.bloques.find(x => x.diaSemana === d && x.franja === f.franja);
          const ambienteFicha = (b ? ambienteEfectivo(b, fichasPorId[b.fichaId]) : '');
          return b ? `${etiquetaFicha(fichasPorId, b.fichaId)}\n${b.competenciaNombre || b.rapTitulo}\n${ambienteFicha} (${b.duracionHoras}h)` : 'Libre';
        })
      ]),
      styles: { fontSize: 7, cellPadding: 4, valign: 'top' },
      headStyles: { fillColor: COLOR_ENCABEZADO, textColor: 255, fontStyle: 'bold' },
      didParseCell: pintarCeldaGrid
    });
  });

  doc.save(`Horarios_por_Instructor_${new Date().toISOString().slice(0, 10)}.pdf`);
}
