import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Ficha, RegionalCentro } from '../types';
import { totalMatriculados } from '../lib/aprendices';

/**
 * REPORTE DE CIERRES E INDICADORES (retención y deserción)
 *
 *  - PROGRAMA: resumen de un programa y de cada una de sus fichas.
 *  - GLOBAL: todos los programas, con el índice global del centro.
 *
 * Mismas fórmulas que la pantalla de Cierres:
 *   Retención = (culminados, o aprendices en formación si aún no hay culminados) / matriculados × 100
 *   Deserción = (cancelados + retiros voluntarios) / matriculados × 100
 * Los matriculados son el total real del último cargue de Juicios (ver lib/aprendices).
 */

export const META_RETENCION = 80;
export const UMBRAL_DESERCION = 8;

export interface IndicadoresFicha {
  ficha: Ficha;
  matriculados: number;
  enFormacion: number;
  culminados: number;
  cancelados: number;
  retiros: number;
  aplazados: number;
  trasladados: number;
  inactivos: number;
  baseRetencion: number;
  retencion: number;
  desercion: number;
}

export interface TotalesIndicadores {
  fichas: number;
  matriculados: number;
  enFormacion: number;
  culminados: number;
  cancelados: number;
  retiros: number;
  aplazados: number;
  trasladados: number;
  inactivos: number;
  baseRetencion: number;
  retencion: number;
  desercion: number;
}

export interface IndicadoresPrograma extends TotalesIndicadores {
  codigo: string;
  nombre: string;
  detalle: IndicadoresFicha[];
}

const pct = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 1000) / 10 : 0);

export function indicadoresDeFicha(f: Ficha): IndicadoresFicha {
  const matriculados = totalMatriculados(f);
  const enFormacion = f.aprendicesActivos || 0;
  const culminados = f.aprendicesCulminados || 0;
  const cancelados = f.aprendicesCancelados || 0;
  const retiros = f.aprendicesRetiroVoluntario || 0;
  const aplazados = f.aprendicesAplazados || 0;
  const trasladados = f.aprendicesTrasladados || 0;
  const baseRetencion = culminados > 0 ? culminados : enFormacion;
  return {
    ficha: f,
    matriculados, enFormacion, culminados, cancelados, retiros, aplazados, trasladados,
    inactivos: f.totalAprendicesActual != null
      ? Math.max(0, f.totalAprendicesActual - enFormacion)
      : cancelados + retiros + aplazados + trasladados,
    baseRetencion,
    retencion: pct(baseRetencion, matriculados),
    desercion: pct(cancelados + retiros, matriculados)
  };
}

export function totalizar(items: IndicadoresFicha[]): TotalesIndicadores {
  const t = items.reduce((a, i) => ({
    matriculados: a.matriculados + i.matriculados,
    enFormacion: a.enFormacion + i.enFormacion,
    culminados: a.culminados + i.culminados,
    cancelados: a.cancelados + i.cancelados,
    retiros: a.retiros + i.retiros,
    aplazados: a.aplazados + i.aplazados,
    trasladados: a.trasladados + i.trasladados,
    inactivos: a.inactivos + i.inactivos,
    baseRetencion: a.baseRetencion + i.baseRetencion
  }), { matriculados: 0, enFormacion: 0, culminados: 0, cancelados: 0, retiros: 0, aplazados: 0, trasladados: 0, inactivos: 0, baseRetencion: 0 });
  return {
    fichas: items.length,
    ...t,
    retencion: pct(t.baseRetencion, t.matriculados),
    desercion: pct(t.cancelados + t.retiros, t.matriculados)
  };
}

/** Agrupa las fichas por programa (código) con sus totales. */
export function indicadoresPorPrograma(fichas: Ficha[]): IndicadoresPrograma[] {
  const mapa = new Map<string, IndicadoresFicha[]>();
  const nombres = new Map<string, string>();
  fichas.forEach(f => {
    const clave = f.programaCodigo || f.programaNombre;
    if (!mapa.has(clave)) { mapa.set(clave, []); nombres.set(clave, f.programaNombre); }
    mapa.get(clave)!.push(indicadoresDeFicha(f));
  });
  return Array.from(mapa.entries())
    .map(([clave, items]) => ({
      codigo: items[0].ficha.programaCodigo || '',
      nombre: nombres.get(clave) || clave,
      detalle: items.sort((a, b) => a.ficha.numero_ficha.localeCompare(b.ficha.numero_ficha)),
      ...totalizar(items)
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/** Año de la ficha: el de su fecha de inicio (o el de su periodo lectivo). */
export function anioDeFicha(f: Ficha): string {
  const m = (f.fechaInicio || '').match(/^(\d{4})/) || (f.periodoLectivo || '').match(/(\d{4})/);
  return m ? m[1] : 'Sin año';
}

/** Años que tienen fichas, del más reciente al más antiguo. */
export function aniosDisponibles(fichas: Ficha[]): string[] {
  return Array.from(new Set(fichas.map(anioDeFicha))).sort().reverse();
}

export interface IndicadoresAnio extends TotalesIndicadores {
  anio: string;
  detalle: IndicadoresFicha[];
}

function agruparPorAnio(items: IndicadoresFicha[]): IndicadoresAnio[] {
  const mapa = new Map<string, IndicadoresFicha[]>();
  items.forEach(i => {
    const a = anioDeFicha(i.ficha);
    if (!mapa.has(a)) mapa.set(a, []);
    mapa.get(a)!.push(i);
  });
  return Array.from(mapa.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([anio, det]) => ({
      anio,
      detalle: det.sort((x, y) => x.ficha.numero_ficha.localeCompare(y.ficha.numero_ficha)),
      ...totalizar(det)
    }));
}

export type AlcanceCierres = 'PROGRAMA' | 'GLOBAL';

export interface OpcionesReporteCierres {
  alcance: AlcanceCierres;
  fichas: Ficha[];               // todas las fichas visibles
  programaCodigo?: string;       // requerido si alcance = PROGRAMA
  /** Año de las fichas (por su fecha de inicio) o 'TODOS'. */
  anio?: string;
  centro: RegionalCentro;
}

interface Preparado {
  titulo: string;
  subtitulo: string;
  programas: IndicadoresPrograma[];
  global: TotalesIndicadores;
  /** Solo alcance PROGRAMA: las fichas del programa agrupadas por año. */
  porAnio: IndicadoresAnio[];
  /** Se dibujan secciones por año (cuando se piden todos los años). */
  seccionesPorAnio: boolean;
  archivo: string;
}

function preparar(o: OpcionesReporteCierres): Preparado {
  const anio = o.anio && o.anio !== 'TODOS' ? o.anio : 'TODOS';
  let fichas = o.alcance === 'PROGRAMA'
    ? o.fichas.filter(f => (f.programaCodigo || f.programaNombre) === o.programaCodigo)
    : o.fichas;
  if (anio !== 'TODOS') fichas = fichas.filter(f => anioDeFicha(f) === anio);
  const programas = indicadoresPorPrograma(fichas);
  const global = totalizar(programas.flatMap(p => p.detalle));
  const hoy = new Date().toISOString().slice(0, 10);
  const textoAnio = anio === 'TODOS' ? 'todos los años' : `año ${anio}`;
  if (o.alcance === 'PROGRAMA') {
    const nombre = programas[0]?.nombre || 'Programa';
    return {
      titulo: 'Cierres e Indicadores — Resumen del Programa',
      subtitulo: `${nombre}${programas[0]?.codigo ? ` (${programas[0].codigo})` : ''} · ${textoAnio}`,
      programas, global,
      porAnio: agruparPorAnio(programas.flatMap(p => p.detalle)),
      seccionesPorAnio: anio === 'TODOS',
      archivo: `Cierres_${(programas[0]?.codigo || 'programa')}_${anio === 'TODOS' ? 'todos' : anio}_${hoy}`
    };
  }
  return {
    titulo: 'Cierres e Indicadores — Reporte Global por Programa',
    subtitulo: `${programas.length} programa(s) · ${global.fichas} ficha(s) · ${textoAnio}`,
    programas, global, porAnio: [], seccionesPorAnio: false,
    archivo: `Cierres_Global_${anio === 'TODOS' ? 'todos' : anio}_${hoy}`
  };
}

const colorRetencion = (v: number) => (v >= META_RETENCION ? 'FF166534' : 'FFB91C1C');
const rellenoRetencion = (v: number) => (v >= META_RETENCION ? 'FFDCFCE7' : 'FFFEE2E2');
const colorDesercion = (v: number) => (v > UMBRAL_DESERCION ? 'FFB91C1C' : 'FF166534');
const rellenoDesercion = (v: number) => (v > UMBRAL_DESERCION ? 'FFFEE2E2' : 'FFDCFCE7');

const VERDE = 'FF0D631B';

// ---------------------------------------------------------------------------
// EXCEL
// ---------------------------------------------------------------------------

const COLUMNAS = ['FICHA', 'MATRICULADOS', 'EN FORMACIÓN', 'CULMINADOS', 'CANCELADOS', 'RETIROS VOL.', 'APLAZADOS', 'TRASLADADOS', 'INACTIVOS', 'RETENCIÓN', 'DESERCIÓN'];

export async function exportarCierresExcel(o: OpcionesReporteCierres) {
  const p = preparar(o);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sistema de Gestión Académica y Curricular';
  const N = COLUMNAS.length;

  const cabecera = (ws: ExcelJS.Worksheet, titulo: string, sub: string) => {
    ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
    ws.mergeCells(1, 1, 1, N);
    const t = ws.getCell(1, 1);
    t.value = titulo;
    t.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE } };
    t.alignment = { vertical: 'middle', horizontal: 'left' };
    ws.getRow(1).height = 26;
    ws.mergeCells(2, 1, 2, N);
    ws.getCell(2, 1).value = sub;
    ws.getCell(2, 1).font = { bold: true, size: 11 };
    ws.mergeCells(3, 1, 3, N);
    ws.getCell(3, 1).value = `${o.centro.centro} · ${o.centro.regional} — Generado el ${new Date().toLocaleDateString('es-CO')}`;
    ws.getCell(3, 1).font = { size: 9, color: { argb: 'FF64748B' } };
  };

  const encabezadoTabla = (ws: ExcelJS.Worksheet, fila: number, primera: string) => {
    COLUMNAS.forEach((c, i) => {
      const cell = ws.getCell(fila, i + 1);
      cell.value = i === 0 ? primera : c;
      cell.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
      cell.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle', wrapText: true };
    });
    ws.getRow(fila).height = 24;
  };

  const filaDatos = (ws: ExcelJS.Worksheet, fila: number, etiqueta: string, t: TotalesIndicadores | IndicadoresFicha, opts: { negrita?: boolean; fondo?: string } = {}) => {
    const valores = [etiqueta, t.matriculados, t.enFormacion, t.culminados, t.cancelados, t.retiros, t.aplazados, t.trasladados, t.inactivos];
    valores.forEach((v, i) => {
      const c = ws.getCell(fila, i + 1);
      c.value = v as any;
      c.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle', wrapText: i === 0 };
      c.font = { bold: !!opts.negrita, size: 10 };
      if (opts.fondo) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.fondo } };
    });
    const r = ws.getCell(fila, N - 1);
    r.value = t.retencion / 100; r.numFmt = '0.0%';
    r.font = { bold: true, size: 10, color: { argb: colorRetencion(t.retencion) } };
    r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rellenoRetencion(t.retencion) } };
    r.alignment = { horizontal: 'center', vertical: 'middle' };
    const d = ws.getCell(fila, N);
    d.value = t.desercion / 100; d.numFmt = '0.0%';
    d.font = { bold: true, size: 10, color: { argb: colorDesercion(t.desercion) } };
    d.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rellenoDesercion(t.desercion) } };
    d.alignment = { horizontal: 'center', vertical: 'middle' };
    for (let c = 1; c <= N; c++) {
      ws.getCell(fila, c).border = { top: { style: 'thin', color: { argb: 'FFE2E8F0' } }, bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
    }
  };

  const tarjetas = (ws: ExcelJS.Worksheet, fila: number, t: TotalesIndicadores, etiqueta: string) => {
    const items: [string, string | number, string?][] = [
      [`Fichas`, t.fichas],
      [`Matriculados`, t.matriculados],
      [`En formación`, t.enFormacion],
      [`Inactivos`, t.inactivos],
      [`Retención ${etiqueta}`, `${t.retencion}%`, colorRetencion(t.retencion)],
      [`Deserción ${etiqueta}`, `${t.desercion}%`, colorDesercion(t.desercion)]
    ];
    items.forEach(([nombre, valor, color], i) => {
      const col = 1 + i * 2;
      const fin = Math.min(N, col + 1);
      ws.mergeCells(fila, col, fila, fin);
      ws.mergeCells(fila + 1, col, fila + 1, fin);
      const a = ws.getCell(fila, col);
      a.value = nombre; a.font = { size: 8, bold: true, color: { argb: 'FF64748B' } };
      a.alignment = { horizontal: 'center' };
      const b = ws.getCell(fila + 1, col);
      b.value = valor as any; b.font = { size: 14, bold: true, color: { argb: color || 'FF0F172A' } };
      b.alignment = { horizontal: 'center', vertical: 'middle' };
      [a, b].forEach(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }; });
    });
    ws.getRow(fila + 1).height = 24;
  };

  const anchos = [34, 13, 12, 12, 12, 12, 12, 13, 11, 12, 12];
  const nota = (ws: ExcelJS.Worksheet, fila: number) => {
    ws.mergeCells(fila, 1, fila, N);
    const c = ws.getCell(fila, 1);
    c.value = `Retención = (culminados, o en formación si aún no hay culminados) / matriculados. Deserción = (cancelados + retiros voluntarios) / matriculados. Matriculados = total del último cargue de Juicios Evaluativos. Meta de retención: ${META_RETENCION}%.`;
    c.font = { size: 8, italic: true, color: { argb: 'FF64748B' } };
    c.alignment = { wrapText: true, vertical: 'top' };
    ws.getRow(fila).height = 30;
  };

  if (o.alcance === 'PROGRAMA') {
    const ws = wb.addWorksheet('Resumen del Programa');
    ws.columns = anchos.map(w => ({ width: w }));
    cabecera(ws, p.titulo, p.subtitulo);
    tarjetas(ws, 5, p.global, 'del programa');
    encabezadoTabla(ws, 8, 'FICHA');
    let r = 9;
    p.porAnio.forEach(gr => {
      if (p.seccionesPorAnio) {
        ws.mergeCells(r, 1, r, N);
        const h = ws.getCell(r, 1);
        h.value = `Año ${gr.anio} — ${gr.fichas} ficha(s)`;
        h.font = { bold: true, size: 10, color: { argb: 'FF0D631B' } };
        h.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
        r++;
      }
      gr.detalle.forEach(i => {
        filaDatos(ws, r++, `Ficha ${i.ficha.numero_ficha}${i.ficha.instructorLiderNombre && i.ficha.instructorLiderNombre !== 'Por asignar' ? ` · ${i.ficha.instructorLiderNombre}` : ''}`, i);
      });
      if (p.seccionesPorAnio) {
        filaDatos(ws, r++, `Subtotal ${gr.anio}`, gr, { negrita: true, fondo: 'FFF1F5F9' });
        r++;
      }
    });
    filaDatos(ws, r, 'TOTAL DEL PROGRAMA', p.global, { negrita: true, fondo: 'FFE2E8F0' });
    nota(ws, r + 2);
    ws.views = [{ state: 'frozen', ySplit: 8 }];
  } else {
    // Un renglón por programa + índice global
    const ws = wb.addWorksheet('Global por Programa');
    ws.columns = anchos.map(w => ({ width: w }));
    cabecera(ws, p.titulo, p.subtitulo);
    tarjetas(ws, 5, p.global, 'global');
    encabezadoTabla(ws, 8, 'PROGRAMA');
    let r = 9;
    p.programas.forEach(pr => {
      filaDatos(ws, r++, `${pr.nombre}${pr.codigo ? ` (${pr.codigo})` : ''} — ${pr.fichas} ficha(s)`, pr);
    });
    filaDatos(ws, r, 'ÍNDICE GLOBAL', p.global, { negrita: true, fondo: 'FFE2E8F0' });
    nota(ws, r + 2);
    ws.views = [{ state: 'frozen', ySplit: 8 }];

  }

  const buffer = await wb.xlsx.writeBuffer();
  descargar(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${p.archivo}.xlsx`);
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

export function exportarCierresPDF(o: OpcionesReporteCierres) {
  const p = preparar(o);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const ancho = doc.internal.pageSize.getWidth();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('SISTEMA DE GESTIÓN ACADÉMICA Y CURRICULAR', 40, 34);
  doc.setFontSize(11);
  doc.text(p.titulo, 40, 52);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(p.subtitulo, 40, 67);
  doc.setTextColor(100, 116, 139);
  doc.text(`${o.centro.centro} · ${o.centro.regional} — ${new Date().toLocaleDateString('es-CO')}`, 40, 80);
  doc.setTextColor(0, 0, 0);

  // Tarjetas de resumen
  const g = p.global;
  const tarj: [string, string, [number, number, number]?][] = [
    ['Fichas', String(g.fichas)],
    ['Matriculados', String(g.matriculados)],
    ['En formación', String(g.enFormacion)],
    ['Inactivos', String(g.inactivos)],
    [`Retención ${o.alcance === 'GLOBAL' ? 'global' : 'del programa'}`, `${g.retencion}%`, g.retencion >= META_RETENCION ? [22, 101, 52] : [185, 28, 28]],
    [`Deserción ${o.alcance === 'GLOBAL' ? 'global' : 'del programa'}`, `${g.desercion}%`, g.desercion > UMBRAL_DESERCION ? [185, 28, 28] : [22, 101, 52]]
  ];
  const anchoT = (ancho - 80 - 5 * 8) / 6;
  tarj.forEach(([nombre, valor, color], i) => {
    const x = 40 + i * (anchoT + 8);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(x, 92, anchoT, 42, 4, 4, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(nombre.toUpperCase(), x + anchoT / 2, 104, { align: 'center' });
    doc.setFontSize(15);
    const c = color || [15, 23, 42];
    doc.setTextColor(c[0], c[1], c[2]);
    doc.text(valor, x + anchoT / 2, 124, { align: 'center' });
  });
  doc.setTextColor(0, 0, 0);

  const head = [['', 'Matric.', 'En form.', 'Culm.', 'Canc.', 'Retiros', 'Aplaz.', 'Trasl.', 'Inact.', 'Retención', 'Deserción']];
  const fila = (etiqueta: string, t: TotalesIndicadores | IndicadoresFicha) => [
    etiqueta, t.matriculados, t.enFormacion, t.culminados, t.cancelados, t.retiros, t.aplazados, t.trasladados, t.inactivos,
    `${t.retencion}%`, `${t.desercion}%`
  ].map(String);

  const colorCeldas = (data: any) => {
    if (data.section !== 'body') return;
    const txt = String(data.cell.raw);
    if (data.column.index === 9) {
      const v = parseFloat(txt);
      data.cell.styles.fillColor = v >= META_RETENCION ? [220, 252, 231] : [254, 226, 226];
      data.cell.styles.textColor = v >= META_RETENCION ? [22, 101, 52] : [185, 28, 28];
      data.cell.styles.fontStyle = 'bold';
    }
    if (data.column.index === 10) {
      const v = parseFloat(txt);
      data.cell.styles.fillColor = v > UMBRAL_DESERCION ? [254, 226, 226] : [220, 252, 231];
      data.cell.styles.textColor = v > UMBRAL_DESERCION ? [185, 28, 28] : [22, 101, 52];
      data.cell.styles.fontStyle = 'bold';
    }
  };
  const estilos = {
    styles: { fontSize: 8, cellPadding: 4, valign: 'middle' as const },
    headStyles: { fillColor: [51, 65, 85] as [number, number, number], textColor: 255, fontStyle: 'bold' as const, halign: 'center' as const },
    columnStyles: { 0: { cellWidth: 230, halign: 'left' as const } } as any
  };
  for (let i = 1; i <= 10; i++) estilos.columnStyles[i] = { halign: 'center' };

  if (o.alcance === 'PROGRAMA') {
    const body: string[][] = [];
    const marcasAnio = new Set<number>();
    const marcasSub = new Set<number>();
    p.porAnio.forEach(gr => {
      if (p.seccionesPorAnio) {
        marcasAnio.add(body.length);
        body.push([`Año ${gr.anio} — ${gr.fichas} ficha(s)`, '', '', '', '', '', '', '', '', '', '']);
      }
      gr.detalle.forEach(i => body.push(fila(`Ficha ${i.ficha.numero_ficha}`, i)));
      if (p.seccionesPorAnio) {
        marcasSub.add(body.length);
        body.push(fila(`Subtotal ${gr.anio}`, gr));
      }
    });
    const idxTotal = body.length;
    body.push(fila('TOTAL DEL PROGRAMA', g));
    autoTable(doc, {
      startY: 148,
      head: [['Ficha', ...head[0].slice(1)]],
      body,
      ...estilos,
      didParseCell: (d) => {
        if (d.section !== 'body') return;
        if (marcasAnio.has(d.row.index)) {
          d.cell.styles.fillColor = [236, 253, 245];
          d.cell.styles.textColor = [13, 99, 27];
          d.cell.styles.fontStyle = 'bold';
          if (d.column.index === 0) d.cell.colSpan = 11;
          return;
        }
        colorCeldas(d);
        if (marcasSub.has(d.row.index) || d.row.index === idxTotal) {
          d.cell.styles.fontStyle = 'bold';
          if (d.column.index < 9) d.cell.styles.fillColor = d.row.index === idxTotal ? [226, 232, 240] : [241, 245, 249];
        }
      }
    });
  } else {
    const body = [...p.programas.map(pr => fila(`${pr.nombre} — ${pr.fichas} ficha(s)`, pr)), fila('ÍNDICE GLOBAL', g)];
    autoTable(doc, {
      startY: 148,
      head: [['Programa', ...head[0].slice(1)]],
      body,
      ...estilos,
      didParseCell: (d) => {
        colorCeldas(d);
        if (d.section === 'body' && d.row.index === body.length - 1) {
          d.cell.styles.fontStyle = 'bold';
          if (d.column.index < 9) d.cell.styles.fillColor = [226, 232, 240];
        }
      }
    });
  }

  // Nota metodológica al pie de la última página
  const y = (doc as any).lastAutoTable.finalY + 14;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const nota = doc.splitTextToSize(
    `Retención = (culminados, o en formación si aún no hay culminados) / matriculados. Deserción = (cancelados + retiros voluntarios) / matriculados. ` +
    `Matriculados = total del último cargue de Juicios Evaluativos. Meta de retención: ${META_RETENCION}%; deserción sobre ${UMBRAL_DESERCION}% se marca en rojo.`,
    ancho - 80
  );
  doc.text(nota, 40, Math.min(y, doc.internal.pageSize.getHeight() - 40));

  doc.save(`${p.archivo}.pdf`);
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
