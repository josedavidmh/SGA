import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BloqueHorario, DiaSemana, Ficha, Instructor, RegionalCentro } from '../types';
import { claveNombrePersona } from '../lib/nombresInstructor';
import { jornadaDeFranja } from '../lib/ambientes';
import { normalizarNombreTrimestre } from '../lib/calendarioTrimestres';

/**
 * REPORTE: HORAS SEMANALES DE CADA INSTRUCTOR POR TRIMESTRE
 *
 * Cada bloque del horario es un espacio que se repite todas las semanas del
 * trimestre, así que la suma de sus horas es la carga semanal del instructor.
 * Se agrupa por persona (mismo nombre sin tildes/títulos = un solo instructor).
 */

const DIAS_BASE: DiaSemana[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const ABREV: Record<string, string> = { Lunes: 'Lun', Martes: 'Mar', 'Miércoles': 'Mié', Jueves: 'Jue', Viernes: 'Vie', 'Sábado': 'Sáb' };

export interface FilaHorasInstructor {
  clave: string;
  nombre: string;
  porDia: Record<string, number>;
  manana: number;
  tarde: number;
  total: number;
  fichas: string[];
  bloques: number;
}

export interface HorasTrimestre {
  trimestre: string;
  dias: DiaSemana[];
  filas: FilaHorasInstructor[];
  /** Horas programadas sin instructor asignado. */
  vacantes: { porDia: Record<string, number>; total: number; bloques: number };
  totalHoras: number;
}

export interface MatrizHoras {
  trimestres: string[];
  filas: { clave: string; nombre: string; porTrimestre: Record<string, number> }[];
  totalesPorTrimestre: Record<string, number>;
}

const trimestreDe = (b: BloqueHorario) => normalizarNombreTrimestre(b.trimestre);

export function trimestresConHorario(horarios: BloqueHorario[]): string[] {
  return Array.from(new Set(horarios.map(trimestreDe).filter(Boolean))).sort().reverse();
}

function nombreInstructor(b: BloqueHorario, instructores: Instructor[]): string {
  const enPlanta = instructores.find(i => i.id === b.instructorId);
  return enPlanta?.nombreCompleto || b.instructorNombre || 'Instructor';
}

export function calcularHorasTrimestre(
  horarios: BloqueHorario[],
  fichas: Ficha[],
  instructores: Instructor[],
  trimestre: string
): HorasTrimestre {
  const fichaPorId = new Map(fichas.map(f => [f.id, f]));
  const bloques = horarios.filter(b => trimestreDe(b) === trimestre);
  const haySabado = bloques.some(b => b.diaSemana === 'Sábado' && (b.duracionHoras || 0) > 0);
  const dias: DiaSemana[] = haySabado ? [...DIAS_BASE, 'Sábado'] : DIAS_BASE;

  const vacio = () => Object.fromEntries(dias.map(d => [d, 0])) as Record<string, number>;
  const mapa = new Map<string, FilaHorasInstructor & { setFichas: Set<string> }>();
  const vacantes = { porDia: vacio(), total: 0, bloques: 0 };

  bloques.forEach(b => {
    const h = b.duracionHoras || 0;
    if (!b.instructorId && !b.instructorNombre) {
      vacantes.porDia[b.diaSemana] = (vacantes.porDia[b.diaSemana] || 0) + h;
      vacantes.total += h;
      vacantes.bloques += 1;
      return;
    }
    const nombre = nombreInstructor(b, instructores);
    const clave = claveNombrePersona(b.instructorNombre || nombre) || b.instructorId || nombre;
    if (!mapa.has(clave)) {
      mapa.set(clave, { clave, nombre, porDia: vacio(), manana: 0, tarde: 0, total: 0, fichas: [], bloques: 0, setFichas: new Set() });
    }
    const fila = mapa.get(clave)!;
    fila.porDia[b.diaSemana] = (fila.porDia[b.diaSemana] || 0) + h;
    if (jornadaDeFranja(b.franja) === 'Mañana') fila.manana += h; else fila.tarde += h;
    fila.total += h;
    fila.bloques += 1;
    const f = fichaPorId.get(b.fichaId);
    fila.setFichas.add(f?.numero_ficha || b.fichaId);
  });

  const filas = Array.from(mapa.values())
    .map(({ setFichas, ...r }) => ({ ...r, fichas: Array.from(setFichas).sort() }))
    .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre));
  return {
    trimestre, dias, filas, vacantes,
    totalHoras: filas.reduce((a, f) => a + f.total, 0) + vacantes.total
  };
}

/** Instructor × trimestre: horas semanales de cada uno en cada trimestre. */
export function calcularMatrizHoras(horarios: BloqueHorario[], instructores: Instructor[]): MatrizHoras {
  const trimestres = trimestresConHorario(horarios).reverse(); // cronológico
  const mapa = new Map<string, { clave: string; nombre: string; porTrimestre: Record<string, number> }>();
  const totales: Record<string, number> = {};
  horarios.forEach(b => {
    if (!b.instructorId && !b.instructorNombre) return;
    const t = trimestreDe(b);
    if (!t) return;
    const nombre = nombreInstructor(b, instructores);
    const clave = claveNombrePersona(b.instructorNombre || nombre) || b.instructorId || nombre;
    if (!mapa.has(clave)) mapa.set(clave, { clave, nombre, porTrimestre: {} });
    const fila = mapa.get(clave)!;
    fila.porTrimestre[t] = (fila.porTrimestre[t] || 0) + (b.duracionHoras || 0);
    totales[t] = (totales[t] || 0) + (b.duracionHoras || 0);
  });
  return {
    trimestres,
    filas: Array.from(mapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    totalesPorTrimestre: totales
  };
}

// ---------------------------------------------------------------------------
// EXCEL
// ---------------------------------------------------------------------------

const VERDE = 'FF0D631B';
const relleno = (argb: string) => ({ type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb } });

export async function exportarHorasInstructorExcel(
  horarios: BloqueHorario[], fichas: Ficha[], instructores: Instructor[], trimestre: string, centro?: RegionalCentro
) {
  const datos = calcularHorasTrimestre(horarios, fichas, instructores, trimestre);
  const matriz = calcularMatrizHoras(horarios, instructores);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sistema de Gestión Académica y Curricular';

  const encabezado = (ws: ExcelJS.Worksheet, n: number, titulo: string, sub: string) => {
    ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
    ws.mergeCells(1, 1, 1, n);
    const t = ws.getCell(1, 1);
    t.value = titulo;
    t.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    t.fill = relleno(VERDE);
    t.alignment = { vertical: 'middle' };
    ws.getRow(1).height = 26;
    ws.mergeCells(2, 1, 2, n);
    ws.getCell(2, 1).value = sub;
    ws.getCell(2, 1).font = { bold: true, size: 11 };
    ws.mergeCells(3, 1, 3, n);
    ws.getCell(3, 1).value = `${centro?.centro ? `${centro.centro} · ${centro.regional} — ` : ''}Generado el ${new Date().toLocaleDateString('es-CO')}`;
    ws.getCell(3, 1).font = { size: 9, color: { argb: 'FF64748B' } };
  };
  const cabeceraTabla = (ws: ExcelJS.Worksheet, fila: number, titulos: string[]) => {
    titulos.forEach((tx, i) => {
      const c = ws.getCell(fila, i + 1);
      c.value = tx;
      c.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
      c.fill = relleno('FF334155');
      c.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle', wrapText: true };
    });
    ws.getRow(fila).height = 24;
  };
  const borde = (c: ExcelJS.Cell) => { c.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } }; };

  // ---- Hoja 1: semana del trimestre
  const cols = ['INSTRUCTOR', ...datos.dias.map(d => ABREV[d].toUpperCase()), 'MAÑANA', 'TARDE', 'TOTAL H/SEM', 'FICHAS'];
  const N = cols.length;
  const ws = wb.addWorksheet(`Horas ${trimestre}`.slice(0, 31));
  ws.columns = cols.map((_, i) => ({ width: i === 0 ? 38 : i === N - 1 ? 30 : 11 }));
  encabezado(ws, N, 'Horas semanales por instructor', `Trimestre ${trimestre} — horas que cada instructor tiene programadas por semana`);
  cabeceraTabla(ws, 5, cols);
  const max = Math.max(1, ...datos.filas.map(f => f.total));
  let r = 6;
  datos.filas.forEach(f => {
    const vals: (string | number)[] = [f.nombre, ...datos.dias.map(d => f.porDia[d] || 0), f.manana, f.tarde, f.total, f.fichas.join(', ')];
    vals.forEach((v, i) => {
      const c = ws.getCell(r, i + 1);
      c.value = v as any;
      c.alignment = { horizontal: i === 0 || i === N - 1 ? 'left' : 'center', vertical: 'middle', wrapText: i === N - 1 };
      c.font = { size: 10, bold: i === N - 2 };
      if (i >= 1 && i <= datos.dias.length && !v) c.font = { size: 10, color: { argb: 'FFCBD5E1' } };
      borde(c);
    });
    // intensidad de la carga en la celda del total
    const inten = Math.round(255 - (f.total / max) * 110);
    const hex = (n: number) => n.toString(16).padStart(2, '0').toUpperCase();
    ws.getCell(r, N - 1).fill = relleno(`FF${hex(inten)}F0${hex(inten)}`);
    r++;
  });
  if (datos.vacantes.total > 0) {
    const vals: (string | number)[] = ['Sin instructor (vacantes)', ...datos.dias.map(d => datos.vacantes.porDia[d] || 0), '', '', datos.vacantes.total, `${datos.vacantes.bloques} bloque(s)`];
    vals.forEach((v, i) => {
      const c = ws.getCell(r, i + 1);
      c.value = v as any;
      c.font = { size: 10, italic: true, color: { argb: 'FFB45309' } };
      c.fill = relleno('FFFEF3C7');
      c.alignment = { horizontal: i === 0 || i === N - 1 ? 'left' : 'center' };
    });
    r++;
  }
  const tot: (string | number)[] = ['TOTAL', ...datos.dias.map(d => datos.filas.reduce((a, f) => a + (f.porDia[d] || 0), 0) + (datos.vacantes.porDia[d] || 0)), datos.filas.reduce((a, f) => a + f.manana, 0), datos.filas.reduce((a, f) => a + f.tarde, 0), datos.totalHoras, ''];
  tot.forEach((v, i) => {
    const c = ws.getCell(r, i + 1);
    c.value = v as any;
    c.font = { bold: true, size: 10 };
    c.fill = relleno('FFE2E8F0');
    c.alignment = { horizontal: i === 0 ? 'left' : 'center' };
  });
  ws.views = [{ state: 'frozen', ySplit: 5, xSplit: 1 }];

  // ---- Hoja 2: comparativo entre trimestres
  const cols2 = ['INSTRUCTOR', ...matriz.trimestres];
  const wm = wb.addWorksheet('Comparativo trimestres');
  wm.columns = cols2.map((_, i) => ({ width: i === 0 ? 38 : 12 }));
  encabezado(wm, Math.max(cols2.length, 3), 'Horas semanales por instructor — comparativo', 'Horas por semana de cada instructor en cada trimestre');
  cabeceraTabla(wm, 5, cols2);
  let r2 = 6;
  matriz.filas.forEach(f => {
    const c0 = wm.getCell(r2, 1);
    c0.value = f.nombre; c0.font = { size: 10 }; borde(c0);
    matriz.trimestres.forEach((t, i) => {
      const c = wm.getCell(r2, i + 2);
      const v = f.porTrimestre[t] || 0;
      c.value = v || '';
      c.alignment = { horizontal: 'center' };
      c.font = { size: 10, bold: !!v };
      borde(c);
    });
    r2++;
  });
  const c0 = wm.getCell(r2, 1);
  c0.value = 'TOTAL'; c0.font = { bold: true }; c0.fill = relleno('FFE2E8F0');
  matriz.trimestres.forEach((t, i) => {
    const c = wm.getCell(r2, i + 2);
    c.value = matriz.totalesPorTrimestre[t] || 0;
    c.font = { bold: true }; c.fill = relleno('FFE2E8F0'); c.alignment = { horizontal: 'center' };
  });
  wm.views = [{ state: 'frozen', ySplit: 5, xSplit: 1 }];

  const buffer = await wb.xlsx.writeBuffer();
  descargar(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `Horas_Instructores_${trimestre}.xlsx`);
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

export function exportarHorasInstructorPDF(
  horarios: BloqueHorario[], fichas: Ficha[], instructores: Instructor[], trimestre: string, centro?: RegionalCentro
) {
  const datos = calcularHorasTrimestre(horarios, fichas, instructores, trimestre);
  const matriz = calcularMatrizHoras(horarios, instructores);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('SISTEMA DE GESTIÓN ACADÉMICA Y CURRICULAR', 40, 34);
  doc.setFontSize(11);
  doc.text('Horas semanales por instructor', 40, 52);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Trimestre ${trimestre} — ${datos.filas.length} instructor(es) · ${datos.totalHoras} horas por semana en total`, 40, 67);
  doc.setTextColor(100, 116, 139);
  doc.text(`${centro?.centro ? `${centro.centro} · ${centro.regional} — ` : ''}${new Date().toLocaleDateString('es-CO')}`, 40, 80);
  doc.setTextColor(0, 0, 0);

  const head = [['Instructor', ...datos.dias.map(d => ABREV[d]), 'Mañana', 'Tarde', 'Total h/sem', 'Fichas']];
  const body: string[][] = datos.filas.map(f => [
    f.nombre, ...datos.dias.map(d => (f.porDia[d] ? String(f.porDia[d]) : '·')), String(f.manana), String(f.tarde), String(f.total), f.fichas.join(', ')
  ]);
  if (datos.vacantes.total > 0) {
    body.push(['Sin instructor (vacantes)', ...datos.dias.map(d => (datos.vacantes.porDia[d] ? String(datos.vacantes.porDia[d]) : '·')), '', '', String(datos.vacantes.total), `${datos.vacantes.bloques} bloque(s)`]);
  }
  const nVac = datos.vacantes.total > 0 ? 1 : 0;
  body.push(['TOTAL', ...datos.dias.map(d => String(datos.filas.reduce((a, f) => a + (f.porDia[d] || 0), 0) + (datos.vacantes.porDia[d] || 0))),
    String(datos.filas.reduce((a, f) => a + f.manana, 0)), String(datos.filas.reduce((a, f) => a + f.tarde, 0)), String(datos.totalHoras), '']);
  const idxTotal = body.length - 1;
  const idxTotalCol = 1 + datos.dias.length + 2;
  const max = Math.max(1, ...datos.filas.map(f => f.total));

  const columnStyles: any = { 0: { cellWidth: 190, halign: 'left' } };
  for (let i = 1; i < head[0].length; i++) columnStyles[i] = { halign: 'center' };
  columnStyles[head[0].length - 1] = { halign: 'left' };

  autoTable(doc, {
    startY: 92,
    head, body,
    styles: { fontSize: 8, cellPadding: 4, valign: 'middle' },
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold', halign: 'center' },
    columnStyles,
    didParseCell: (d) => {
      if (d.section !== 'body') return;
      const i = d.row.index;
      if (i === idxTotal) { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = [226, 232, 240]; return; }
      if (nVac && i === idxTotal - 1) { d.cell.styles.fillColor = [254, 243, 199]; d.cell.styles.textColor = [180, 83, 9]; d.cell.styles.fontStyle = 'italic'; return; }
      if (d.column.index === idxTotalCol) {
        const v = datos.filas[i]?.total || 0;
        const inten = Math.round(255 - (v / max) * 110);
        d.cell.styles.fillColor = [inten, 240, inten];
        d.cell.styles.fontStyle = 'bold';
      }
    }
  });

  // Comparativo entre trimestres
  if (matriz.trimestres.length > 1) {
    doc.addPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Comparativo de horas semanales entre trimestres', 40, 40);
    autoTable(doc, {
      startY: 52,
      head: [['Instructor', ...matriz.trimestres]],
      body: [
        ...matriz.filas.map(f => [f.nombre, ...matriz.trimestres.map(t => (f.porTrimestre[t] ? String(f.porTrimestre[t]) : '·'))]),
        ['TOTAL', ...matriz.trimestres.map(t => String(matriz.totalesPorTrimestre[t] || 0))]
      ],
      styles: { fontSize: 8, cellPadding: 4, halign: 'center' },
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 220, halign: 'left' } },
      didParseCell: (d) => {
        if (d.section === 'body' && d.row.index === matriz.filas.length) {
          d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = [226, 232, 240];
        }
      }
    });
  }

  doc.save(`Horas_Instructores_${trimestre}.pdf`);
}

function descargar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
