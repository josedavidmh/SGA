import { ambienteEfectivo } from '../lib/ambientes';
import { claveNombrePersona } from '../lib/nombresInstructor';
import { esBloqueVacante } from '../lib/bloques';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Ficha, BloqueHorario, DiaSemana, FranjaHorario, RegionalCentro } from '../types';
import {
  PALETA, PDF, nuevoLibro, descargarLibro, bandaTituloExcel, encabezadoTablaExcel, celdaDatoExcel,
  filaTotalExcel, notaPieExcel, configurarHojaExcel, marcoExterior, textoCentro, fechaGeneracion,
  bandaTituloPdf, temaTablaPdf, pieDePaginasPdf, rellenoExcel, bordeCelda
} from '../lib/estiloReporte';

/** Definición de una franja horaria tal como la usa la grilla de Horarios. */
export interface FranjaDef {
  franja: FranjaHorario;
  label: string;
  sub: string;
}

function encontrarBloque(bloques: BloqueHorario[], dia: DiaSemana, franja: FranjaHorario): BloqueHorario | undefined {
  return bloques.find(b => b.diaSemana === dia && b.franja === franja);
}

/** Colorea la grilla del PDF: libre (gris), vacante (ámbar) y asignado (verde claro). */
function pintarCeldaGrid(data: any) {
  if (data.section === 'body' && data.column.index > 0) {
    const raw = String(data.cell.raw ?? '');
    if (raw === 'Libre') {
      data.cell.styles.textColor = PDF.gris;
      data.cell.styles.fillColor = PDF.zebra;
      data.cell.styles.halign = 'center';
      data.cell.styles.fontStyle = 'italic';
    } else if (raw.includes('VACANTE')) {
      data.cell.styles.fillColor = PDF.ambar;
    } else {
      data.cell.styles.fillColor = PDF.verdeClaro;
    }
  } else if (data.section === 'body' && data.column.index === 0) {
    data.cell.styles.fontStyle = 'bold';
    data.cell.styles.fillColor = PDF.total;
    data.cell.styles.halign = 'center';
  }
}

const ORDEN_DIA: Record<string, number> = { Lunes: 0, Martes: 1, 'Miércoles': 2, Jueves: 3, Viernes: 4, 'Sábado': 5 };
const ordenarBloques = (bloques: BloqueHorario[]) =>
  [...bloques].sort((a, b) => (ORDEN_DIA[a.diaSemana] ?? 9) - (ORDEN_DIA[b.diaSemana] ?? 9) || a.franja.localeCompare(b.franja));

/** Pinta una celda de la grilla semanal en Excel según tenga bloque, vacante o esté libre. */
function celdaGrillaExcel(cel: any, bloque: BloqueHorario | undefined, texto: string, fondoLibre: string) {
  if (!bloque) {
    cel.value = 'Libre';
    celdaDatoExcel(cel, { horizontal: 'center', relleno: fondoLibre, cursiva: true, color: PALETA.gris });
    return;
  }
  cel.value = texto;
  const vacante = esBloqueVacante(bloque);
  celdaDatoExcel(cel, {
    horizontal: 'left', vertical: 'top', tamano: 9,
    relleno: vacante ? PALETA.ambar : PALETA.verdeClaro,
    color: vacante ? PALETA.ambarTexto : PALETA.pizarra
  });
}

// =====================================================================
// REPORTE 1: HORARIO DE LA FICHA (grilla semanal completa)
// =====================================================================

export async function exportarHorarioFichaExcel(ficha: Ficha, bloques: BloqueHorario[], dias: DiaSemana[], franjas: FranjaDef[], centro?: RegionalCentro) {
  const totalHoras = bloques.reduce((acc, b) => acc + b.duracionHoras, 0);
  const wb = nuevoLibro();

  // ---- Hoja 1: grilla semanal
  const N = 1 + dias.length;
  const ws = wb.addWorksheet('Horario Semanal');
  ws.columns = [{ width: 20 }, ...dias.map(() => ({ width: 36 }))];
  const meta = [textoCentro(centro), `Ambiente: ${ficha.ambientePrincipal || '—'}`, `Periodo: ${ficha.periodoLectivo || '—'}`, `${bloques.length} bloque(s)`, `${totalHoras} h semanales`, `Generado el ${fechaGeneracion()}`].filter(Boolean).join('  ·  ');
  const filaEnc = bandaTituloExcel(ws, N, 'Horario de la Ficha', `Ficha ${ficha.numero_ficha} — ${ficha.programaNombre}`, meta);
  encabezadoTablaExcel(ws, filaEnc, ['HORARIO', ...dias.map(d => d.toUpperCase())]);
  let fila = filaEnc + 1;
  franjas.forEach((f, idx) => {
    const fondo = idx % 2 === 0 ? PALETA.blanco : PALETA.zebra;
    const c0 = ws.getCell(fila, 1);
    c0.value = `${f.label}\n${f.sub}`;
    celdaDatoExcel(c0, { horizontal: 'center', negrita: true, relleno: PALETA.total });
    dias.forEach((d, i) => {
      const b = encontrarBloque(bloques, d, f.franja);
      // El ambiente siempre es el efectivo de la ficha, nunca el guardado en el bloque.
      const texto = b
        ? `${b.competenciaNombre || b.rapTitulo}\n${b.instructorNombre || 'VACANTE — falta instructor'} (${b.duracionHoras}h)\nAmbiente: ${ambienteEfectivo(b, ficha)}`
        : '';
      celdaGrillaExcel(ws.getCell(fila, i + 2), b, texto, fondo);
    });
    ws.getRow(fila).height = 66;
    fila++;
  });
  filaTotalExcel(ws, fila, ['TOTAL SEMANAL', `${bloques.length} bloque(s) programado(s)  ·  ${totalHoras} horas por semana`, ...dias.slice(1).map(() => '')]);
  if (dias.length > 1) ws.mergeCells(fila, 2, fila, N);
  marcoExterior(ws, filaEnc, 1, fila, N);
  notaPieExcel(ws, fila + 2, N, 'Verde: espacio con instructor asignado · Ámbar: espacio vacante (falta instructor) · Gris: franja libre.');
  configurarHojaExcel(ws, { filaEncabezado: filaEnc, congelarColumnas: 1 });

  // ---- Hoja 2: detalle
  const colsD = ['DÍA', 'FRANJA HORARIA', 'AMBIENTE', 'INSTRUCTOR ASIGNADO', 'CÓDIGO RAP', 'ACTIVIDAD / MÓDULO', 'HORAS'];
  const wd = wb.addWorksheet('Detalle');
  wd.columns = [14, 18, 22, 32, 14, 52, 10].map(width => ({ width }));
  const filaEncD = bandaTituloExcel(wd, colsD.length, 'Detalle del Horario', `Ficha ${ficha.numero_ficha} — ${ficha.programaNombre}`, `${bloques.length} bloque(s)  ·  ${totalHoras} h semanales  ·  Generado el ${fechaGeneracion()}`);
  encabezadoTablaExcel(wd, filaEncD, colsD);
  let fd = filaEncD + 1;
  ordenarBloques(bloques).forEach((b, idx) => {
    const fondo = idx % 2 === 0 ? PALETA.blanco : PALETA.zebra;
    const vacante = esBloqueVacante(b);
    [b.diaSemana, b.franja, ambienteEfectivo(b, ficha), b.instructorNombre || 'VACANTE — falta instructor', b.rapCodigo, b.competenciaNombre || b.rapTitulo, b.duracionHoras].forEach((v, c) => {
      const cel = wd.getCell(fd, c + 1);
      cel.value = v as any;
      celdaDatoExcel(cel, {
        horizontal: c === 6 || c === 1 || c === 4 ? 'center' : 'left',
        relleno: vacante && c === 3 ? PALETA.ambar : fondo,
        color: vacante && c === 3 ? PALETA.ambarTexto : PALETA.pizarra,
        negrita: c === 0 || c === 6
      });
    });
    fd++;
  });
  if (bloques.length === 0) {
    wd.mergeCells(fd, 1, fd, colsD.length);
    wd.getCell(fd, 1).value = 'No hay bloques programados.';
    celdaDatoExcel(wd.getCell(fd, 1), { horizontal: 'center', cursiva: true, color: PALETA.gris });
    fd++;
  }
  filaTotalExcel(wd, fd, ['TOTAL', `${bloques.length} bloque(s)`, '', '', '', '', totalHoras]);
  marcoExterior(wd, filaEncD, 1, fd, colsD.length);
  configurarHojaExcel(wd, { filaEncabezado: filaEncD });

  await descargarLibro(wb, `Horario_Ficha_${ficha.numero_ficha}.xlsx`);
}

export function exportarHorarioFichaPDF(ficha: Ficha, bloques: BloqueHorario[], dias: DiaSemana[], franjas: FranjaDef[], centro?: RegionalCentro) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const totalHoras = bloques.reduce((acc, b) => acc + b.duracionHoras, 0);
  const startY = bandaTituloPdf(
    doc,
    'Horario de la Ficha',
    `Ficha ${ficha.numero_ficha} — ${ficha.programaNombre}`,
    [`Ambiente: ${ficha.ambientePrincipal || '—'}`, `Periodo: ${ficha.periodoLectivo || '—'}`, `${bloques.length} bloque(s)`, `${totalHoras} h semanales`].join('  ·  ')
  );

  autoTable(doc, {
    ...temaTablaPdf(7.5),
    startY,
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
    foot: [[{ content: `TOTAL SEMANAL: ${bloques.length} bloque(s) · ${totalHoras} horas por semana`, colSpan: 1 + dias.length, styles: { halign: 'left' } }]],
    footStyles: { fillColor: PDF.total, textColor: PDF.pizarra, fontStyle: 'bold', lineColor: PDF.pizarra, lineWidth: { top: 1.4, left: 0.6, right: 0.6, bottom: 0.6 } },
    alternateRowStyles: {},
    columnStyles: { 0: { cellWidth: 80 } },
    didParseCell: pintarCeldaGrid
  });

  pieDePaginasPdf(doc, centro);
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
  // Por persona (nombre sin tildes ni títulos), no por id: la misma persona
  // con dos registros o escrita distinto sale una sola vez.
  bloques.filter(b => !esBloqueVacante(b)).forEach(b => {
    const key = claveNombrePersona(b.instructorNombre || '') || b.instructorId!;
    if (!mapa.has(key)) {
      mapa.set(key, { instructorId: b.instructorId!, instructorNombre: b.instructorNombre!, bloques: [] });
    }
    mapa.get(key)!.bloques.push(b);
  });
  return Array.from(mapa.values()).sort((a, b) => a.instructorNombre.localeCompare(b.instructorNombre));
}

/** Bloques programados pero sin instructor asignado — espacios pendientes por cubrir. */
export function obtenerBloquesVacantes(bloques: BloqueHorario[]): BloqueHorario[] {
  return bloques.filter(esBloqueVacante);
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
const resumenGrupo = (g: GrupoInstructor) => ({
  bloques: g.bloques.length,
  horas: g.bloques.reduce((acc, b) => acc + b.duracionHoras, 0),
  fichas: new Set(g.bloques.map(b => b.fichaId)).size
});

export async function exportarHorariosPorInstructorExcel(bloques: BloqueHorario[], dias: DiaSemana[], franjas: FranjaDef[], fichasPorId: Record<string, Ficha>, centro?: RegionalCentro) {
  const grupos = agruparPorInstructor(bloques);
  const wb = nuevoLibro();
  const totalHoras = grupos.reduce((a, g) => a + resumenGrupo(g).horas, 0);
  const meta = [textoCentro(centro), `${grupos.length} instructor(es)`, `${totalHoras} h semanales en total`, `Generado el ${fechaGeneracion()}`].filter(Boolean).join('  ·  ');

  // ---- Hoja 1: resumen ejecutivo
  const colsR = ['INSTRUCTOR', 'BLOQUES', 'HORAS / SEM', 'FICHAS / PROGRAMAS'];
  const wr = wb.addWorksheet('Resumen');
  wr.columns = [44, 12, 14, 22].map(width => ({ width }));
  const filaEncR = bandaTituloExcel(wr, colsR.length, 'Horarios por Instructor', 'Resumen de la carga semanal — todas las fichas y programas', meta);
  encabezadoTablaExcel(wr, filaEncR, colsR);
  let fr = filaEncR + 1;
  grupos.forEach((g, idx) => {
    const r = resumenGrupo(g);
    const fondo = idx % 2 === 0 ? PALETA.blanco : PALETA.zebra;
    [g.instructorNombre, r.bloques, r.horas, r.fichas].forEach((v, c) => {
      const cel = wr.getCell(fr, c + 1);
      cel.value = v as any;
      celdaDatoExcel(cel, { horizontal: c === 0 ? 'left' : 'center', relleno: fondo, negrita: c === 0 || c === 2 });
    });
    fr++;
  });
  if (grupos.length === 0) {
    wr.mergeCells(fr, 1, fr, colsR.length);
    wr.getCell(fr, 1).value = 'No hay bloques asignados todavía.';
    celdaDatoExcel(wr.getCell(fr, 1), { horizontal: 'center', cursiva: true, color: PALETA.gris });
    fr++;
  }
  filaTotalExcel(wr, fr, ['TOTAL', grupos.reduce((a, g) => a + g.bloques.length, 0), totalHoras, '']);
  marcoExterior(wr, filaEncR, 1, fr, colsR.length);
  configurarHojaExcel(wr, { filaEncabezado: filaEncR });

  // ---- Hoja 2: grilla semanal de cada instructor
  const N = 1 + dias.length;
  const ws = wb.addWorksheet('Horarios');
  ws.columns = [{ width: 22 }, ...dias.map(() => ({ width: 38 }))];
  let fila = bandaTituloExcel(ws, N, 'Horarios por Instructor', 'Horario semanal de cada instructor — todas las fichas y programas', meta);
  grupos.forEach((g, gi) => {
    if (gi > 0) {
      ws.getRow(fila).addPageBreak();
      fila++; // fila separadora entre instructores
    }
    const r = resumenGrupo(g);
    const inicio = fila;
    ws.mergeCells(fila, 1, fila, N);
    const t = ws.getCell(fila, 1);
    t.value = `INSTRUCTOR: ${g.instructorNombre}      ${r.bloques} bloque(s)  ·  ${r.horas} h semanales  ·  ${r.fichas} ficha(s)`;
    t.font = { bold: true, size: 11, color: { argb: PALETA.blanco } };
    t.fill = rellenoExcel(PALETA.verdeOscuro);
    t.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    bordeCelda(t, PALETA.verdeOscuro);
    ws.getRow(fila).height = 24;
    fila++;
    encabezadoTablaExcel(ws, fila, ['HORARIO', ...dias.map(d => d.toUpperCase())], 24);
    fila++;
    franjas.forEach((f, idx) => {
      const fondo = idx % 2 === 0 ? PALETA.blanco : PALETA.zebra;
      const c0 = ws.getCell(fila, 1);
      c0.value = `${f.label}\n${f.sub}`;
      celdaDatoExcel(c0, { horizontal: 'center', negrita: true, relleno: PALETA.total });
      dias.forEach((d, i) => {
        const b = g.bloques.find(x => x.diaSemana === d && x.franja === f.franja);
        const texto = b
          ? `${etiquetaFicha(fichasPorId, b.fichaId)}\n${b.competenciaNombre || b.rapTitulo} (${b.duracionHoras}h)\n${ambienteEfectivo(b, fichasPorId[b.fichaId])}`
          : '';
        celdaGrillaExcel(ws.getCell(fila, i + 2), b, texto, fondo);
      });
      ws.getRow(fila).height = 66;
      fila++;
    });
    marcoExterior(ws, inicio, 1, fila - 1, N);
  });
  if (grupos.length === 0) {
    ws.mergeCells(fila, 1, fila, N);
    ws.getCell(fila, 1).value = 'No hay bloques asignados todavía.';
    celdaDatoExcel(ws.getCell(fila, 1), { horizontal: 'center', cursiva: true, color: PALETA.gris });
    fila++;
  }
  notaPieExcel(ws, fila + 1, N, 'Cada celda indica la ficha, el programa, la competencia y el ambiente del bloque. "Libre": franja sin clase asignada.');
  configurarHojaExcel(ws);

  await descargarLibro(wb, `Horarios_por_Instructor_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportarHorariosPorInstructorPDF(bloques: BloqueHorario[], dias: DiaSemana[], franjas: FranjaDef[], fichasPorId: Record<string, Ficha>, centro?: RegionalCentro) {
  const grupos = agruparPorInstructor(bloques);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const totalHoras = grupos.reduce((a, g) => a + resumenGrupo(g).horas, 0);

  // Página 1: resumen ejecutivo
  const startY = bandaTituloPdf(
    doc,
    'Horarios por Instructor',
    'Resumen de la carga semanal — todas las fichas y programas',
    `${grupos.length} instructor(es)  ·  ${totalHoras} h semanales en total`
  );
  autoTable(doc, {
    ...temaTablaPdf(9),
    startY,
    head: [['Instructor', 'Bloques', 'Horas / sem', 'Fichas / programas']],
    body: grupos.length > 0
      ? grupos.map(g => { const r = resumenGrupo(g); return [g.instructorNombre, String(r.bloques), String(r.horas), String(r.fichas)]; })
      : [[{ content: 'No hay bloques asignados todavía.', colSpan: 4, styles: { halign: 'center', fontStyle: 'italic', textColor: PDF.gris } }]],
    foot: [['TOTAL', String(grupos.reduce((a, g) => a + g.bloques.length, 0)), String(totalHoras), '']],
    footStyles: { fillColor: PDF.total, textColor: PDF.pizarra, fontStyle: 'bold', halign: 'center', lineColor: PDF.pizarra, lineWidth: { top: 1.4, left: 0.6, right: 0.6, bottom: 0.6 } },
    columnStyles: { 0: { halign: 'left', fontStyle: 'bold' }, 1: { halign: 'center' }, 2: { halign: 'center', fontStyle: 'bold' }, 3: { halign: 'center' } }
  });

  // Una página por instructor
  grupos.forEach(g => {
    doc.addPage();
    const r = resumenGrupo(g);
    const y = bandaTituloPdf(doc, 'Horario Asignado', g.instructorNombre, `${r.bloques} bloque(s)  ·  ${r.horas} h semanales  ·  ${r.fichas} ficha(s)/programa(s)`);
    autoTable(doc, {
      ...temaTablaPdf(7),
      startY: y,
      head: [['Horario', ...dias]],
      body: franjas.map(f => [
        `${f.label}\n${f.sub}`,
        ...dias.map(d => {
          const b = g.bloques.find(x => x.diaSemana === d && x.franja === f.franja);
          const ambienteFicha = (b ? ambienteEfectivo(b, fichasPorId[b.fichaId]) : '');
          return b ? `${etiquetaFicha(fichasPorId, b.fichaId)}\n${b.competenciaNombre || b.rapTitulo}\n${ambienteFicha} (${b.duracionHoras}h)` : 'Libre';
        })
      ]),
      alternateRowStyles: {},
      columnStyles: { 0: { cellWidth: 80 } },
      didParseCell: pintarCeldaGrid
    });
  });

  pieDePaginasPdf(doc, centro);
  doc.save(`Horarios_por_Instructor_${new Date().toISOString().slice(0, 10)}.pdf`);
}
