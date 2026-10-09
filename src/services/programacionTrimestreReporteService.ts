import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BloqueHorario, DiaSemana, Ficha, FranjaHorario } from '../types';
import { claveNombrePersona } from '../lib/nombresInstructor';
import { esBloqueVacante } from '../lib/bloques';
import { aplicarVigencia, fechaCorta, lineaTiempoInstructores } from '../lib/tramosInstructor';
import { fechaISOLocal } from '../lib/festivosColombia';

/**
 * REPORTE CONSOLIDADO: PROGRAMACIÓN DE INSTRUCTORES POR TRIMESTRE Y PROGRAMA
 *
 * Una tabla por ficha: días de la semana en el encabezado, una fila por
 * franja programada y, en cada celda, el instructor (con su color propio,
 * el mismo en todo el reporte) y debajo la competencia y sus RAPs.
 */

const DIAS_BASE: DiaSemana[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const FRANJAS: { franja: FranjaHorario; etiqueta: string }[] = [
  { franja: '06:00 - 09:00', etiqueta: '06:00 - 09:00' },
  { franja: '09:00 - 12:00', etiqueta: '09:00 - 12:00' },
  { franja: '13:00 - 16:00', etiqueta: '13:00 - 16:00' },
  { franja: '16:00 - 19:00', etiqueta: '16:00 - 19:00' }
];

/** Colores bien distinguibles entre sí (fondo claro + texto oscuro del mismo tono). */
const PALETA: { fondo: string; texto: string }[] = [
  { fondo: '#FECACA', texto: '#991B1B' }, // rojo
  { fondo: '#FDE68A', texto: '#92400E' }, // ámbar
  { fondo: '#E9D5FF', texto: '#6B21A8' }, // morado
  { fondo: '#BBF7D0', texto: '#166534' }, // verde
  { fondo: '#A5F3FC', texto: '#155E75' }, // cian
  { fondo: '#FBCFE8', texto: '#9D174D' }, // rosado
  { fondo: '#BFDBFE', texto: '#1E40AF' }, // azul
  { fondo: '#FED7AA', texto: '#9A3412' }, // naranja
  { fondo: '#D9F99D', texto: '#3F6212' }, // lima
  { fondo: '#C7D2FE', texto: '#3730A3' }, // índigo
  { fondo: '#99F6E4', texto: '#115E59' }, // aguamarina
  { fondo: '#F5D0FE', texto: '#86198F' }, // fucsia
  { fondo: '#E7E5E4', texto: '#44403C' }, // piedra
  { fondo: '#FEF08A', texto: '#854D0E' }, // amarillo
  { fondo: '#CBD5E1', texto: '#1E293B' }, // pizarra
  { fondo: '#FDBA74', texto: '#7C2D12' }  // naranja fuerte
];
export const COLOR_VACANTE = { fondo: '#F1F5F9', texto: '#B91C1C' };

export interface ColorInstructor { fondo: string; texto: string }

export interface CeldaProgramacion {
  bloque: BloqueHorario;
  vacante: boolean;
  instructor: string;
  color: ColorInstructor;
  /** "COMP-02 · Establecer requisitos…" */
  competencia: string;
  /** "RAP-02, RAP-03" o "Competencia completa" */
  raps: string;
  /** Si el instructor va a cambiar después de la fecha de corte: quién entra y desde cuándo. */
  proximo?: { nombre: string; desde: string };
}

export interface FilaFranja {
  franja: FranjaHorario;
  etiqueta: string;
  celdas: Partial<Record<DiaSemana, CeldaProgramacion[]>>;
}

export interface FichaProgramada {
  ficha: Ficha;
  filas: FilaFranja[];
  horas: number;
}

export interface InstructorLeyenda {
  clave: string;
  nombre: string;
  color: ColorInstructor;
  bloques: number;
  horas: number;
  fichas: string[];
}

export interface ProgramacionConsolidada {
  trimestre: string;
  programaNombre: string;
  /** Fecha (YYYY-MM-DD) con la que se determinó el instructor vigente de cada espacio. */
  fechaCorte: string;
  dias: DiaSemana[];
  fichas: FichaProgramada[];
  instructores: InstructorLeyenda[];
  vacantes: number;
}

const abreviar = (t: string, max: number) => (t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t);

export function construirProgramacionConsolidada(
  fichas: Ficha[],
  bloques: BloqueHorario[],
  trimestre: string,
  programaCodigo: string, // 'TODOS' o código del programa
  /** Número de ficha para ver solo esa ficha ('' = todas). */
  numeroFicha: string = '',
  /** Fecha de corte: en cada espacio se ve el instructor vigente ese día (por defecto hoy). */
  fechaCorte: string = fechaISOLocal(new Date())
): ProgramacionConsolidada {
  const fichasPrograma = fichas.filter(f => programaCodigo === 'TODOS' || f.programaCodigo === programaCodigo);
  const fichasSel = fichasPrograma
    .filter(f => !numeroFicha || f.numero_ficha === numeroFicha)
    .sort((a, b) => (a.programaNombre || '').localeCompare(b.programaNombre || '') || a.numero_ficha.localeCompare(b.numero_ficha));
  const idsFichas = new Set(fichasSel.map(f => f.id));
  const idsFichasPrograma = new Set(fichasPrograma.map(f => f.id));
  const bloquesGuardados = bloques.filter(b => b.trimestre === trimestre && idsFichas.has(b.fichaId));
  // Los colores salen de todo el programa (no solo de la ficha filtrada) para que cada instructor conserve su color.
  const bloquesParaColor = bloques.filter(b => b.trimestre === trimestre && idsFichasPrograma.has(b.fichaId));
  // Lo que se ve en cada espacio es el instructor vigente en la fecha de corte; el que entra
  // después se muestra debajo con su fecha (`proximoCambio`).
  const bloquesSel = bloquesGuardados.map(b => aplicarVigencia(b, fechaCorte, b.fechaCorteInicio, b.fechaCorteFin));

  // Colores: un color fijo por instructor (orden alfabético), el mismo en todo el reporte
  // (incluye a los instructores que entran después de la fecha de corte).
  const nombres = new Map<string, string>();
  bloquesParaColor.forEach(b => {
    lineaTiempoInstructores(b, b.fechaCorteInicio, b.fechaCorteFin).forEach(t => {
      if (!t.instructorId && !t.instructorNombre) return;
      const k = claveNombrePersona(t.instructorNombre || t.instructorId || '');
      if (k && !nombres.has(k)) nombres.set(k, t.instructorNombre || 'Instructor');
    });
  });
  const claves = Array.from(nombres.keys()).sort((a, b) => a.localeCompare(b));
  const colorPorClave = new Map<string, ColorInstructor>();
  claves.forEach((k, i) => colorPorClave.set(k, PALETA[i % PALETA.length]));

  const dias: DiaSemana[] = bloquesSel.some(b => b.diaSemana === 'Sábado') ? [...DIAS_BASE, 'Sábado'] : [...DIAS_BASE];

  const leyenda = new Map<string, InstructorLeyenda>();
  let vacantes = 0;

  const fichasProgramadas: FichaProgramada[] = fichasSel.map(ficha => {
    const propios = bloquesSel.filter(b => b.fichaId === ficha.id);
    const filas: FilaFranja[] = [];
    FRANJAS.forEach(fr => {
      const enFranja = propios.filter(b => b.franja === fr.franja);
      if (enFranja.length === 0) return;
      const celdas: FilaFranja['celdas'] = {};
      enFranja.forEach(b => {
        const vacante = esBloqueVacante(b);
        const clave = vacante ? '' : claveNombrePersona(b.instructorNombre || b.instructorId || '');
        const color = vacante ? COLOR_VACANTE : (colorPorClave.get(clave) || PALETA[0]);
        const competencia = `${b.competenciaCodigo}${b.competenciaNombre ? ` · ${abreviar(b.competenciaNombre, 60)}` : ''}`;
        const raps = b.esCompetenciaCompleta
          ? 'Competencia completa'
          : (b.rapsAsignados && b.rapsAsignados.length > 0 ? b.rapsAsignados.map(r => r.codigo).join(', ') : b.rapCodigo);
        const celda: CeldaProgramacion = {
          bloque: b, vacante,
          instructor: vacante ? 'VACANTE — por asignar' : (b.instructorNombre || 'Instructor'),
          color, competencia, raps,
          proximo: b.proximoCambio
            ? { nombre: b.proximoCambio.vacante ? 'Vacante' : (b.proximoCambio.instructorNombre || 'Instructor'), desde: fechaCorta(b.proximoCambio.desde) }
            : undefined
        };
        (celdas[b.diaSemana] = celdas[b.diaSemana] || []).push(celda);
        if (vacante) { vacantes += 1; return; }
        const item = leyenda.get(clave) || { clave, nombre: nombres.get(clave) || celda.instructor, color, bloques: 0, horas: 0, fichas: [] };
        item.bloques += 1;
        item.horas += b.duracionHoras || 0;
        if (!item.fichas.includes(ficha.numero_ficha)) item.fichas.push(ficha.numero_ficha);
        leyenda.set(clave, item);
      });
      filas.push({ franja: fr.franja, etiqueta: fr.etiqueta, celdas });
    });
    return { ficha, filas, horas: propios.reduce((a, b) => a + (b.duracionHoras || 0), 0) };
  });

  const programaNombre = programaCodigo === 'TODOS'
    ? 'Todos los programas'
    : (fichasSel[0]?.programaNombre || programaCodigo);

  return {
    trimestre,
    programaNombre,
    fechaCorte,
    dias,
    fichas: fichasProgramadas,
    instructores: Array.from(leyenda.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    vacantes
  };
}

const argb = (hex: string) => `FF${hex.replace('#', '').toUpperCase()}`;
const rgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
const nombreArchivo = (p: ProgramacionConsolidada, ext: string) =>
  `Programacion_Instructores_${p.trimestre}_${p.programaNombre.replace(/[^A-Za-z0-9]+/g, '_').slice(0, 40)}.${ext}`;

const textoProximo = (c: CeldaProgramacion) => (c.proximo ? `→ ${abreviar(c.proximo.nombre, 28)}\ndesde ${c.proximo.desde}` : '');
const textoCelda = (c: CeldaProgramacion) => `${c.instructor}\n${c.competencia}\n${c.raps}${c.proximo ? `\n${textoProximo(c)}` : ''}`;

// ---------------------------------------------------------------------------
// EXCEL
// ---------------------------------------------------------------------------
export async function exportarProgramacionTrimestreExcel(p: ProgramacionConsolidada) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`Programación ${p.trimestre}`, {
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  });
  const N = 2 + p.dias.length;
  ws.getColumn(1).width = 12;
  ws.getColumn(2).width = 14;
  p.dias.forEach((_, i) => { ws.getColumn(3 + i).width = 30; });

  const VERDE = 'FF0D631B';
  const borde = { style: 'thin' as const, color: { argb: 'FF94A3B8' } };
  const bordes = { top: borde, left: borde, bottom: borde, right: borde };

  let r = 1;
  const titulo = (texto: string, size = 10, bold = false, color = 'FF111C2D') => {
    ws.mergeCells(r, 1, r, N);
    const c = ws.getCell(r, 1);
    c.value = texto;
    c.font = { size, bold, color: { argb: color } };
    r += 1;
  };
  titulo('SISTEMA DE GESTIÓN ACADÉMICA Y CURRICULAR — PROGRAMACIÓN DE INSTRUCTORES', 13, true, VERDE);
  titulo(`TRIMESTRE: ${p.trimestre}   |   PROGRAMA: ${p.programaNombre}   |   INSTRUCTOR VIGENTE AL: ${fechaCorta(p.fechaCorte)}`, 10, true);
  titulo(`Fichas: ${p.fichas.length} | Instructores: ${p.instructores.length} | Espacios vacantes: ${p.vacantes} | Generado: ${new Date().toLocaleString('es-CO')}`);
  r += 1;

  const fichasConBloques = p.fichas.filter(f => f.filas.length > 0);
  if (fichasConBloques.length === 0) {
    titulo('No hay bloques programados para este trimestre y programa.');
  }

  fichasConBloques.forEach(fp => {
    // Encabezado de la ficha: número | Franja | días
    const enc = [`${fp.ficha.numero_ficha}`, 'FRANJA', ...p.dias.map(d => d.toUpperCase())];
    enc.forEach((v, i) => {
      const c = ws.getCell(r, i + 1);
      c.value = v;
      c.font = { bold: true, size: 10, color: { argb: i === 0 ? 'FFFFFFFF' : 'FF111C2D' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i === 0 ? VERDE : 'FFD1FAE5' } };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.border = bordes;
    });
    ws.getRow(r).height = 20;
    r += 1;

    const inicio = r;
    fp.filas.forEach(fila => {
      const cF = ws.getCell(r, 1);
      cF.value = `${fp.ficha.numero_ficha}\n${fp.ficha.programaNombre}`;
      cF.font = { bold: true, size: 9 };
      cF.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cF.border = bordes;
      const cFr = ws.getCell(r, 2);
      cFr.value = fila.etiqueta;
      cFr.font = { bold: true, size: 9 };
      cFr.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cFr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      cFr.border = bordes;
      let lineasMax = 3;
      p.dias.forEach((d, i) => {
        const cel = ws.getCell(r, 3 + i);
        const lista = fila.celdas[d] || [];
        cel.border = bordes;
        cel.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        if (lista.length === 0) return;
        const principal = lista[0];
        // Texto enriquecido: instructor en negrita y color; debajo competencia y RAPs.
        cel.value = {
          richText: lista.flatMap((c, idx) => [
            ...(idx > 0 ? [{ text: '\n— — —\n', font: { size: 8, color: { argb: 'FF64748B' } } }] : []),
            { text: `${c.instructor}\n`, font: { bold: true, size: 10, color: { argb: argb(c.color.texto) } } },
            { text: `${c.competencia}\n`, font: { size: 8, color: { argb: 'FF1E293B' } } },
            { text: c.raps, font: { size: 8, italic: true, color: { argb: 'FF334155' } } },
            ...(c.proximo ? [{ text: `\n${textoProximo(c)}`, font: { size: 8, bold: true, color: { argb: 'FF075985' } } }] : [])
          ])
        };
        cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(principal.color.fondo) } };
        lineasMax = Math.max(lineasMax, lista.reduce((a, c) => a + (c.proximo ? 7 : 5), 0));
      });
      ws.getRow(r).height = Math.min(160, 15 * lineasMax);
      r += 1;
    });
    if (r - 1 > inicio) ws.mergeCells(inicio, 1, r - 1, 1);
    r += 1; // espacio entre fichas
  });

  // Leyenda de instructores (con su color)
  if (p.instructores.length > 0) {
    ws.mergeCells(r, 1, r, N);
    const t = ws.getCell(r, 1);
    t.value = 'INSTRUCTORES (color de identificación)';
    t.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE } };
    r += 1;
    p.instructores.forEach(ins => {
      ws.mergeCells(r, 1, r, 3);
      const c = ws.getCell(r, 1);
      c.value = ins.nombre;
      c.font = { bold: true, size: 9, color: { argb: argb(ins.color.texto) } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(ins.color.fondo) } };
      c.border = bordes;
      const d = ws.getCell(r, 4);
      d.value = `${ins.bloques} bloque(s) · ${ins.horas} h/sem · Fichas: ${ins.fichas.join(', ')}`;
      d.font = { size: 9 };
      ws.mergeCells(r, 4, r, N);
      r += 1;
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo(p, 'xlsx');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------
export function exportarProgramacionTrimestrePDF(p: ProgramacionConsolidada) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const ancho = doc.internal.pageSize.getWidth();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(13, 99, 27);
  doc.text('Programación de Instructores', 40, 36);
  doc.setTextColor(17, 28, 45);
  doc.setFontSize(10);
  doc.text(`Trimestre ${p.trimestre}  —  ${p.programaNombre}  —  Instructor vigente al ${fechaCorta(p.fechaCorte)}`, 40, 52);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Fichas: ${p.fichas.length}  |  Instructores: ${p.instructores.length}  |  Espacios vacantes: ${p.vacantes}  |  Generado: ${new Date().toLocaleString('es-CO')}`, 40, 66);
  doc.setTextColor(0, 0, 0);

  let y = 78;
  const fichasConBloques = p.fichas.filter(f => f.filas.length > 0);
  if (fichasConBloques.length === 0) {
    doc.text('No hay bloques programados para este trimestre y programa.', 40, y + 10);
  }

  const anchoDia = (ancho - 80 - 60 - 70) / p.dias.length;

  fichasConBloques.forEach(fp => {
    const body = fp.filas.map((fila, idx) => {
      const celdas: any[] = [];
      if (idx === 0) {
        celdas.push({
          content: `${fp.ficha.numero_ficha}\n${fp.ficha.programaNombre}`,
          rowSpan: fp.filas.length,
          styles: { fontStyle: 'bold', halign: 'center', valign: 'middle', fillColor: [248, 250, 252], fontSize: 7.5 }
        });
      }
      celdas.push({ content: fila.etiqueta, styles: { fontStyle: 'bold', halign: 'center', valign: 'middle', fillColor: [248, 250, 252] } });
      p.dias.forEach(d => {
        const lista = fila.celdas[d] || [];
        if (lista.length === 0) { celdas.push(''); return; }
        const c0 = lista[0];
        celdas.push({
          content: lista.map(textoCelda).join('\n— — —\n'),
          styles: { fillColor: rgb(c0.color.fondo), textColor: rgb(c0.color.texto), halign: 'center', valign: 'middle' },
          _celdas: lista
        });
      });
      return celdas;
    });

    autoTable(doc, {
      startY: y,
      head: [[fp.ficha.numero_ficha, 'Franja', ...p.dias]],
      body,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 3, lineColor: [148, 163, 184], lineWidth: 0.5, overflow: 'linebreak' },
      headStyles: { fillColor: [209, 250, 229], textColor: [17, 28, 45], fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 70 },
        ...Object.fromEntries(p.dias.map((_, i) => [i + 2, { cellWidth: anchoDia }]))
      },
      didParseCell: (data: any) => {
        if (data.section === 'head' && data.column.index === 0) {
          data.cell.styles.fillColor = [13, 99, 27];
          data.cell.styles.textColor = [255, 255, 255];
        }
      },
      margin: { left: 40, right: 40 }
    });
    y = (doc as any).lastAutoTable.finalY + 14;
  });

  // Leyenda de colores
  if (p.instructores.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Instructor (color de identificación)', 'Bloques', 'Horas/sem', 'Fichas']],
      body: p.instructores.map(i => [
        { content: i.nombre, styles: { fillColor: rgb(i.color.fondo), textColor: rgb(i.color.texto), fontStyle: 'bold' } },
        { content: String(i.bloques), styles: { halign: 'center' } },
        { content: `${i.horas}h`, styles: { halign: 'center' } },
        i.fichas.join(', ')
      ]),
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 3, lineColor: [203, 213, 225], lineWidth: 0.5 },
      headStyles: { fillColor: [13, 99, 27], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 220 }, 1: { cellWidth: 60 }, 2: { cellWidth: 70 } },
      margin: { left: 40, right: 40 }
    });
  }

  doc.save(nombreArchivo(p, 'pdf'));
}
