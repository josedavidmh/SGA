import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import { RegionalCentro } from '../types';

/**
 * ESTILO EJECUTIVO COMPARTIDO PARA REPORTES (Excel y PDF)
 *
 * Banda de título, subtítulo y metadatos; tablas con encabezado oscuro bordeado
 * (acento verde en la línea inferior), cuadrícula fina, marco exterior y
 * pie de página con numeración. Así todos los reportes se ven como un mismo
 * documento institucional.
 */

export const PALETA = {
  verde: 'FF0D631B',
  verdeOscuro: 'FF0A4D15',
  verdeClaro: 'FFE8F5E9',
  pizarra: 'FF1E293B',
  pizarraMedia: 'FF334155',
  gris: 'FF64748B',
  borde: 'FFCBD5E1',
  bordeFuerte: 'FF94A3B8',
  zebra: 'FFF8FAFC',
  total: 'FFE2E8F0',
  ambar: 'FFFEF3C7',
  ambarTexto: 'FFB45309',
  morado: 'FF6D28D9',
  blanco: 'FFFFFFFF'
} as const;

export const NOMBRE_SISTEMA = 'SISTEMA DE GESTIÓN ACADÉMICA Y CURRICULAR';

export const textoCentro = (centro?: RegionalCentro) =>
  centro?.centro ? `${centro.centro}${centro.regional ? ` · ${centro.regional}` : ''}` : '';

export const fechaGeneracion = () =>
  new Date().toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' });

// ---------------------------------------------------------------------------
// EXCEL
// ---------------------------------------------------------------------------

type Grosor = 'thin' | 'medium';
const lado = (style: Grosor, argb: string) => ({ style, color: { argb } });

export const rellenoExcel = (argb: string) => ({ type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb } });

/** Borde fino (o medio) en los cuatro lados de la celda. */
export function bordeCelda(c: ExcelJS.Cell, argb: string = PALETA.borde, grosor: Grosor = 'thin') {
  c.border = { top: lado(grosor, argb), left: lado(grosor, argb), bottom: lado(grosor, argb), right: lado(grosor, argb) };
}

/** Marco exterior (borde medio) alrededor de un rango, respetando los bordes internos. */
export function marcoExterior(ws: ExcelJS.Worksheet, f1: number, c1: number, f2: number, c2: number, argb: string = PALETA.pizarra) {
  for (let f = f1; f <= f2; f++) {
    for (let c = c1; c <= c2; c++) {
      const cel = ws.getCell(f, c);
      const b: Partial<ExcelJS.Borders> = { ...(cel.border || {}) };
      if (f === f1) b.top = lado('medium', argb);
      if (f === f2) b.bottom = lado('medium', argb);
      if (c === c1) b.left = lado('medium', argb);
      if (c === c2) b.right = lado('medium', argb);
      cel.border = b;
    }
  }
}

/**
 * Aplica estilo a TODAS las celdas de un rango (incluidas las "esclavas" de una
 * combinación, que no heredan el estilo del maestro). Sirve para que los bordes
 * y el relleno de celdas combinadas se vean completos.
 */
export function estilarRango(
  ws: ExcelJS.Worksheet, f1: number, c1: number, f2: number, c2: number,
  e: { fuente?: Partial<ExcelJS.Font>; relleno?: string; alineacion?: Partial<ExcelJS.Alignment>; borde?: string; grosor?: Grosor }
) {
  for (let f = f1; f <= f2; f++) {
    for (let c = c1; c <= c2; c++) {
      const cel = ws.getCell(f, c);
      if (e.fuente) cel.font = e.fuente;
      if (e.relleno) cel.fill = rellenoExcel(e.relleno);
      if (e.alineacion) cel.alignment = e.alineacion;
      if (e.borde) bordeCelda(cel, e.borde, e.grosor || 'thin');
    }
  }
}

/** Banda de título (filas 1-3 + espacio). Devuelve la primera fila libre. */
export function bandaTituloExcel(ws: ExcelJS.Worksheet, nCols: number, titulo: string, subtitulo: string, meta: string): number {
  const n = Math.max(nCols, 2);
  ws.mergeCells(1, 1, 1, n);
  const t = ws.getCell(1, 1);
  t.value = `${NOMBRE_SISTEMA}  ·  ${titulo.toUpperCase()}`;
  t.font = { bold: true, size: 14, color: { argb: PALETA.blanco } };
  t.fill = rellenoExcel(PALETA.verde);
  t.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(1).height = 32;

  ws.mergeCells(2, 1, 2, n);
  const s = ws.getCell(2, 1);
  s.value = subtitulo;
  s.font = { bold: true, size: 11, color: { argb: PALETA.pizarra } };
  s.fill = rellenoExcel(PALETA.verdeClaro);
  s.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(2).height = 22;

  ws.mergeCells(3, 1, 3, n);
  const m = ws.getCell(3, 1);
  m.value = meta;
  m.font = { size: 9, italic: true, color: { argb: PALETA.gris } };
  m.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(3).height = 18;

  // Línea de acento bajo la banda.
  for (let c = 1; c <= n; c++) {
    ws.getCell(3, c).border = { bottom: lado('medium', PALETA.verde) };
  }
  ws.getRow(4).height = 8;
  return 5;
}

/** Fila de encabezado de tabla: fondo oscuro, bordes completos y acento verde inferior. */
export function encabezadoTablaExcel(ws: ExcelJS.Worksheet, fila: number, titulos: string[], alto = 28, desdeColumna = 1) {
  titulos.forEach((tx, i) => {
    const c = ws.getCell(fila, desdeColumna + i);
    c.value = tx;
    c.font = { bold: true, size: 9.5, color: { argb: PALETA.blanco } };
    c.fill = rellenoExcel(PALETA.pizarra);
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = {
      top: lado('thin', PALETA.pizarraMedia),
      left: lado('thin', PALETA.pizarraMedia),
      right: lado('thin', PALETA.pizarraMedia),
      bottom: lado('medium', PALETA.verde)
    };
  });
  ws.getRow(fila).height = alto;
}

/** Estilo base de una celda de datos (borde fino, fuente y alineación). */
export function celdaDatoExcel(
  c: ExcelJS.Cell,
  opciones: { horizontal?: 'left' | 'center' | 'right'; vertical?: 'top' | 'middle'; negrita?: boolean; relleno?: string; color?: string; cursiva?: boolean; envolver?: boolean; tamano?: number } = {}
) {
  c.font = { size: opciones.tamano ?? 10, bold: !!opciones.negrita, italic: !!opciones.cursiva, color: { argb: opciones.color || PALETA.pizarra } };
  c.alignment = { horizontal: opciones.horizontal || 'left', vertical: opciones.vertical || 'middle', wrapText: opciones.envolver ?? true, indent: opciones.horizontal === 'left' || !opciones.horizontal ? 1 : 0 };
  if (opciones.relleno) c.fill = rellenoExcel(opciones.relleno);
  bordeCelda(c);
}

/** Fila de totales: fondo gris, texto en negrita y línea superior marcada. */
export function filaTotalExcel(ws: ExcelJS.Worksheet, fila: number, valores: (string | number)[], desdeColumna = 1) {
  valores.forEach((v, i) => {
    const c = ws.getCell(fila, desdeColumna + i);
    c.value = v as any;
    c.font = { bold: true, size: 10, color: { argb: PALETA.pizarra } };
    c.fill = rellenoExcel(PALETA.total);
    c.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle', indent: i === 0 ? 1 : 0 };
    c.border = { top: lado('medium', PALETA.pizarra), left: lado('thin', PALETA.bordeFuerte), right: lado('thin', PALETA.bordeFuerte), bottom: lado('thin', PALETA.bordeFuerte) };
  });
  ws.getRow(fila).height = 22;
}

/** Nota al pie (leyenda / generación). */
export function notaPieExcel(ws: ExcelJS.Worksheet, fila: number, nCols: number, texto: string) {
  ws.mergeCells(fila, 1, fila, Math.max(nCols, 2));
  const c = ws.getCell(fila, 1);
  c.value = texto;
  c.font = { size: 8.5, italic: true, color: { argb: PALETA.gris } };
  c.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true };
}

/** Hoja lista para imprimir: horizontal, ajustada al ancho, sin cuadrícula y con numeración. */
export function configurarHojaExcel(ws: ExcelJS.Worksheet, opciones: { filaEncabezado?: number; congelarColumnas?: number } = {}) {
  ws.pageSetup = {
    orientation: 'landscape',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.6, header: 0.25, footer: 0.3 },
    ...(opciones.filaEncabezado ? { printTitlesRow: `${opciones.filaEncabezado}:${opciones.filaEncabezado}` } : {})
  };
  ws.headerFooter = {
    oddFooter: '&L&8Sistema de Gestión Académica y Curricular&C&8Página &P de &N&R&8&D'
  };
  ws.views = [{
    showGridLines: false,
    ...(opciones.filaEncabezado ? { state: 'frozen' as const, ySplit: opciones.filaEncabezado, xSplit: opciones.congelarColumnas || 0 } : {})
  }];
}

export async function descargarLibro(wb: ExcelJS.Workbook, nombre: string) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function nuevoLibro(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sistema de Gestión Académica y Curricular';
  wb.created = new Date();
  return wb;
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

export const PDF = {
  verde: [13, 99, 27] as [number, number, number],
  verdeOscuro: [10, 77, 21] as [number, number, number],
  verdeClaro: [232, 245, 233] as [number, number, number],
  verdeAcento: [165, 214, 167] as [number, number, number],
  pizarra: [30, 41, 59] as [number, number, number],
  gris: [100, 116, 139] as [number, number, number],
  borde: [203, 213, 225] as [number, number, number],
  zebra: [248, 250, 252] as [number, number, number],
  total: [226, 232, 240] as [number, number, number],
  ambar: [254, 243, 199] as [number, number, number],
  ambarTexto: [180, 83, 9] as [number, number, number],
  morado: [109, 40, 217] as [number, number, number]
};

export const MARGEN_PDF = 40;

/** Banda de título del reporte. Devuelve la posición Y donde puede empezar el contenido. */
export function bandaTituloPdf(doc: jsPDF, titulo: string, subtitulo: string, meta: string): number {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...PDF.verde);
  doc.rect(0, 0, w, 54, 'F');
  doc.setFillColor(...PDF.verdeAcento);
  doc.rect(0, 54, w, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(NOMBRE_SISTEMA, MARGEN_PDF, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(titulo, MARGEN_PDF, 41);

  doc.setTextColor(...PDF.pizarra);
  doc.setFontSize(10.5);
  doc.text(subtitulo, MARGEN_PDF, 77);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF.gris);
  doc.text(meta, MARGEN_PDF, 91);
  doc.setTextColor(0, 0, 0);
  return 102;
}

/** Opciones de autoTable con la cuadrícula y el encabezado ejecutivos. */
export function temaTablaPdf(fontSize = 8): any {
  return {
    theme: 'grid',
    margin: { left: MARGEN_PDF, right: MARGEN_PDF, bottom: 46, top: 40 },
    styles: { fontSize, cellPadding: 5, valign: 'middle', lineColor: PDF.borde, lineWidth: 0.6, textColor: PDF.pizarra, overflow: 'linebreak' },
    headStyles: {
      fillColor: PDF.pizarra, textColor: 255, fontStyle: 'bold', halign: 'center', valign: 'middle',
      lineColor: PDF.verde, lineWidth: { top: 0.6, left: 0.6, right: 0.6, bottom: 2.2 }
    },
    alternateRowStyles: { fillColor: PDF.zebra },
    tableLineColor: PDF.pizarra,
    tableLineWidth: 1
  };
}

/** Pie de página con línea, sistema, fecha y "Página X de N" en todas las hojas. */
export function pieDePaginasPdf(doc: jsPDF, centro?: RegionalCentro) {
  const total = doc.getNumberOfPages();
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const c = textoCentro(centro);
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(...PDF.borde);
    doc.setLineWidth(0.6);
    doc.line(MARGEN_PDF, h - 32, w - MARGEN_PDF, h - 32);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...PDF.gris);
    doc.text(`Sistema de Gestión Académica y Curricular${c ? `  ·  ${c}` : ''}  ·  Generado el ${fechaGeneracion()}`, MARGEN_PDF, h - 20);
    doc.text(`Página ${i} de ${total}`, w - MARGEN_PDF, h - 20, { align: 'right' });
  }
  doc.setTextColor(0, 0, 0);
}
