import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BloqueHorario, DiaSemana, Ficha, Instructor, RegionalCentro, User } from '../types';
import { claveNombrePersona } from '../lib/nombresInstructor';
import { esBloqueVacante } from '../lib/bloques';
import { jornadaDeFranja } from '../lib/ambientes';
import { normalizarNombreTrimestre } from '../lib/calendarioTrimestres';

/**
 * REPORTE "MIS HORAS": las horas semanales que UN instructor tiene programadas
 * en cada trimestre, con el detalle de cada bloque (día, franja, ficha,
 * competencia, ambiente). Pensado para que el instructor con usuario consulte
 * su propia carga sin ver la de los demás.
 */

const ORDEN_DIA: DiaSemana[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const ABREV: Record<string, string> = { Lunes: 'Lun', Martes: 'Mar', 'Miércoles': 'Mié', Jueves: 'Jue', Viernes: 'Vie', 'Sábado': 'Sáb' };

const normal = (t?: string) => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export interface BloqueMisHoras {
  dia: DiaSemana;
  franja: string;
  jornada: string;
  ficha: string;
  programa: string;
  competencia: string;
  raps: string;
  ambiente: string;
  horas: number;
}

export interface TrimestreMisHoras {
  trimestre: string;
  total: number;
  porDia: Record<string, number>;
  manana: number;
  tarde: number;
  noche: number;
  fichas: string[];
  bloques: BloqueMisHoras[];
}

export interface MisHoras {
  /** Nombre con el que aparece el instructor. */
  nombre: string;
  trimestres: TrimestreMisHoras[]; // más reciente primero
  dias: DiaSemana[];
}

/**
 * Registros de la planta que corresponden a esta persona: mismo correo, o el
 * mismo nombre (sin tildes ni títulos como "Ing."). Puede haber más de uno si
 * la persona quedó registrada dos veces.
 */
export function instructoresDeUsuario(user: User, instructores: Instructor[]): Instructor[] {
  const correo = normal(user.correo);
  const clave = claveNombrePersona(user.nombre_completo || '');
  return instructores.filter(i =>
    (correo && normal(i.email) === correo) ||
    (clave && claveNombrePersona(i.nombreCompleto || `${i.nombres} ${i.apellidos}`) === clave)
  );
}

export function trimestresConHorasDe(bloques: BloqueHorario[]): string[] {
  return Array.from(new Set(bloques.map(b => normalizarNombreTrimestre(b.trimestre)).filter(Boolean))).sort().reverse();
}

/** Bloques (no vacantes) que pertenecen a alguno de los registros dados. */
export function bloquesDeInstructor(horarios: BloqueHorario[], registros: Instructor[], nombreExtra?: string): BloqueHorario[] {
  const ids = new Set(registros.map(r => r.id));
  const claves = new Set(registros.map(r => claveNombrePersona(r.nombreCompleto || `${r.nombres} ${r.apellidos}`)).filter(Boolean));
  const claveExtra = nombreExtra ? claveNombrePersona(nombreExtra) : '';
  if (claveExtra) claves.add(claveExtra);
  return horarios.filter(b => {
    if (esBloqueVacante(b)) return false;
    if (b.instructorId && ids.has(b.instructorId)) return true;
    const k = claveNombrePersona(b.instructorNombre || '');
    return !!k && claves.has(k);
  });
}

export function calcularMisHoras(
  horarios: BloqueHorario[], fichas: Ficha[], registros: Instructor[], nombre: string
): MisHoras {
  const propios = bloquesDeInstructor(horarios, registros, nombre);
  const fichaPorId = new Map(fichas.map(f => [f.id, f]));
  const mapa = new Map<string, TrimestreMisHoras & { setFichas: Set<string> }>();

  propios.forEach(b => {
    const t = normalizarNombreTrimestre(b.trimestre);
    if (!t) return;
    if (!mapa.has(t)) mapa.set(t, { trimestre: t, total: 0, porDia: {}, manana: 0, tarde: 0, noche: 0, fichas: [], bloques: [], setFichas: new Set() });
    const item = mapa.get(t)!;
    const h = b.duracionHoras || 0;
    const jornada = jornadaDeFranja(b.franja);
    const f = fichaPorId.get(b.fichaId);
    item.total += h;
    item.porDia[b.diaSemana] = (item.porDia[b.diaSemana] || 0) + h;
    if (jornada === 'Mañana') item.manana += h; else if (jornada === 'Tarde') item.tarde += h; else item.noche += h;
    item.setFichas.add(f?.numero_ficha || b.fichaId);
    item.bloques.push({
      dia: b.diaSemana,
      franja: b.franja,
      jornada,
      ficha: f?.numero_ficha || '—',
      programa: f?.programaNombre || '',
      competencia: `${b.competenciaCodigo}${b.competenciaNombre ? ` · ${b.competenciaNombre}` : ''}`,
      raps: b.esCompetenciaCompleta
        ? 'Competencia completa'
        : (b.rapsAsignados && b.rapsAsignados.length > 0 ? b.rapsAsignados.map(r => r.codigo).join(', ') : b.rapCodigo),
      ambiente: b.ambienteEspecial || b.ambiente || f?.ambientePrincipal || '',
      horas: h
    });
  });

  const trimestres = Array.from(mapa.values())
    .map(({ setFichas, ...t }) => ({
      ...t,
      fichas: Array.from(setFichas).sort(),
      bloques: t.bloques.sort((a, b) => ORDEN_DIA.indexOf(a.dia) - ORDEN_DIA.indexOf(b.dia) || a.franja.localeCompare(b.franja))
    }))
    .sort((a, b) => b.trimestre.localeCompare(a.trimestre));

  const haySabado = trimestres.some(t => (t.porDia['Sábado'] || 0) > 0);
  return { nombre, trimestres, dias: haySabado ? ORDEN_DIA : ORDEN_DIA.slice(0, 5) };
}

// ---------------------------------------------------------------------------
// EXCEL
// ---------------------------------------------------------------------------

const VERDE = 'FF0D631B';
const relleno = (argb: string) => ({ type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb } });

export async function exportarMisHorasExcel(datos: MisHoras, centro?: RegionalCentro) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sistema de Gestión Académica y Curricular';
  const ws = wb.addWorksheet('Mis horas');
  ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  const cols = ['TRIMESTRE', ...datos.dias.map(d => ABREV[d].toUpperCase()), 'MAÑANA', 'TARDE', 'NOCHE', 'TOTAL H/SEM', 'FICHAS'];
  const N = cols.length;
  ws.columns = cols.map((_, i) => ({ width: i === 0 ? 16 : i === N - 1 ? 34 : 11 }));

  ws.mergeCells(1, 1, 1, N);
  const t = ws.getCell(1, 1);
  t.value = 'Mis horas por trimestre';
  t.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  t.fill = relleno(VERDE);
  ws.getRow(1).height = 26;
  ws.mergeCells(2, 1, 2, N);
  ws.getCell(2, 1).value = `Instructor: ${datos.nombre}`;
  ws.getCell(2, 1).font = { bold: true, size: 11 };
  ws.mergeCells(3, 1, 3, N);
  ws.getCell(3, 1).value = `${centro?.centro ? `${centro.centro} · ${centro.regional} — ` : ''}Generado el ${new Date().toLocaleDateString('es-CO')}`;
  ws.getCell(3, 1).font = { size: 9, color: { argb: 'FF64748B' } };

  cols.forEach((tx, i) => {
    const c = ws.getCell(5, i + 1);
    c.value = tx;
    c.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
    c.fill = relleno('FF334155');
    c.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle' };
  });
  let r = 6;
  datos.trimestres.forEach(tr => {
    const vals: (string | number)[] = [tr.trimestre, ...datos.dias.map(d => tr.porDia[d] || 0), tr.manana, tr.tarde, tr.noche, tr.total, tr.fichas.join(', ')];
    vals.forEach((v, i) => {
      const c = ws.getCell(r, i + 1);
      c.value = v as any;
      c.font = { size: 10, bold: i === 0 || i === N - 2 };
      c.alignment = { horizontal: i === 0 || i === N - 1 ? 'left' : 'center' };
      c.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
    });
    r++;
  });

  // Detalle por trimestre
  const wd = wb.addWorksheet('Detalle');
  wd.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  const colsD = ['TRIMESTRE', 'DÍA', 'FRANJA', 'JORNADA', 'FICHA', 'COMPETENCIA', 'RAPs', 'AMBIENTE', 'HORAS'];
  wd.columns = [12, 12, 14, 10, 12, 60, 24, 22, 8].map(width => ({ width }));
  colsD.forEach((tx, i) => {
    const c = wd.getCell(1, i + 1);
    c.value = tx;
    c.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
    c.fill = relleno('FF334155');
  });
  let rd = 2;
  datos.trimestres.forEach(tr => tr.bloques.forEach(b => {
    [tr.trimestre, b.dia, b.franja, b.jornada, b.ficha, b.competencia, b.raps, b.ambiente, b.horas].forEach((v, i) => {
      const c = wd.getCell(rd, i + 1);
      c.value = v as any;
      c.font = { size: 10 };
      c.alignment = { wrapText: i === 5 || i === 6, vertical: 'top' };
    });
    rd++;
  }));
  wd.views = [{ state: 'frozen', ySplit: 1 }];

  const buffer = await wb.xlsx.writeBuffer();
  descargar(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `Mis_Horas_${datos.nombre.replace(/[^\w]+/g, '_')}.xlsx`);
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

export function exportarMisHorasPDF(datos: MisHoras, centro?: RegionalCentro) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('SISTEMA DE GESTIÓN ACADÉMICA Y CURRICULAR', 40, 34);
  doc.setFontSize(11);
  doc.text('Mis horas por trimestre', 40, 52);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Instructor: ${datos.nombre}`, 40, 67);
  doc.setTextColor(100, 116, 139);
  doc.text(`${centro?.centro ? `${centro.centro} · ${centro.regional} — ` : ''}${new Date().toLocaleDateString('es-CO')}`, 40, 80);
  doc.setTextColor(0, 0, 0);

  autoTable(doc, {
    startY: 92,
    head: [['Trimestre', ...datos.dias.map(d => ABREV[d]), 'Mañana', 'Tarde', 'Noche', 'Total h/sem', 'Fichas']],
    body: datos.trimestres.map(tr => [
      tr.trimestre, ...datos.dias.map(d => (tr.porDia[d] ? String(tr.porDia[d]) : '·')),
      String(tr.manana), String(tr.tarde), String(tr.noche), String(tr.total), tr.fichas.join(', ')
    ]),
    styles: { fontSize: 8, cellPadding: 4, halign: 'center' },
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { halign: 'left', fontStyle: 'bold' }, [datos.dias.length + 5]: { halign: 'left' } }
  });

  datos.trimestres.forEach(tr => {
    doc.addPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`Trimestre ${tr.trimestre} — ${tr.total} horas por semana`, 40, 40);
    autoTable(doc, {
      startY: 52,
      head: [['Día', 'Franja', 'Ficha', 'Competencia', 'RAPs', 'Ambiente', 'Horas']],
      body: tr.bloques.map(b => [b.dia, b.franja, b.ficha, b.competencia, b.raps, b.ambiente, String(b.horas)]),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 3: { cellWidth: 260 }, 6: { halign: 'center' } }
    });
  });

  doc.save(`Mis_Horas_${datos.nombre.replace(/[^\w]+/g, '_')}.pdf`);
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
