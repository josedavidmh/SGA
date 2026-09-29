import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Ficha, BloqueHorario } from '../types';

const COLOR_ENCABEZADO: [number, number, number] = [13, 99, 27];

export interface UsoAmbienteFichaTrimestre {
  trimestre: string;
  fichaId: string;
  fichaNumero: string;
  programaNombre: string;
  /** Uno o más si la ficha usó distintos ambientes dentro del mismo trimestre (posible alerta). */
  ambientes: string[];
  totalBloques: number;
  totalHoras: number;
}

/**
 * Agrupa los bloques de horario por Trimestre + Ficha para el reporte
 * institucional de uso de ambientes.
 *
 * Importante: siempre prioriza el ambientePrincipal ACTUAL de la ficha
 * sobre lo que haya quedado guardado en cada bloque (b.ambiente). Si el
 * ambiente de la ficha se corrige o se reasigna después de haber creado
 * los bloques de horario, el reporte debe reflejar ese cambio de
 * inmediato — no una foto histórica del ambiente que tenía el bloque al
 * crearse. Solo se usa b.ambiente como respaldo cuando la ficha ya no
 * existe o no tiene ambiente asignado.
 */
export function calcularUsoAmbientesPorFichaTrimestre(
  fichas: Ficha[],
  bloques: BloqueHorario[]
): UsoAmbienteFichaTrimestre[] {
  const fichasPorId: Record<string, Ficha> = {};
  fichas.forEach(f => { fichasPorId[f.id] = f; });

  interface Acumulador extends UsoAmbienteFichaTrimestre {
    ambientesSet: Set<string>;
  }
  const mapa = new Map<string, Acumulador>();

  bloques.forEach(b => {
    if (!b.trimestre || !b.fichaId) return;
    const key = `${b.trimestre}__${b.fichaId}`;
    const ficha = fichasPorId[b.fichaId];

    if (!mapa.has(key)) {
      mapa.set(key, {
        trimestre: b.trimestre,
        fichaId: b.fichaId,
        fichaNumero: ficha?.numero_ficha || b.fichaId,
        programaNombre: ficha?.programaNombre || 'Programa no identificado',
        ambientes: [],
        ambientesSet: new Set<string>(),
        totalBloques: 0,
        totalHoras: 0
      });
    }

    const item = mapa.get(key)!;
    const ambiente = (ficha?.ambientePrincipal || b.ambiente || 'Sin ambiente asignado').trim();
    item.ambientesSet.add(ambiente);
    item.totalBloques += 1;
    item.totalHoras += b.duracionHoras || 0;
  });

  const resultado: UsoAmbienteFichaTrimestre[] = Array.from(mapa.values()).map(item => ({
    trimestre: item.trimestre,
    fichaId: item.fichaId,
    fichaNumero: item.fichaNumero,
    programaNombre: item.programaNombre,
    ambientes: Array.from(item.ambientesSet).sort(),
    totalBloques: item.totalBloques,
    totalHoras: item.totalHoras
  }));

  // Trimestre más reciente primero; dentro del mismo trimestre, por número de ficha.
  return resultado.sort((a, b) => {
    if (a.trimestre !== b.trimestre) return b.trimestre.localeCompare(a.trimestre);
    return a.fichaNumero.localeCompare(b.fichaNumero);
  });
}

/** Trimestres distintos presentes en los bloques de horario, más recientes primero. */
export function obtenerTrimestresDisponibles(bloques: BloqueHorario[]): string[] {
  const set = new Set<string>();
  bloques.forEach(b => { if (b.trimestre) set.add(b.trimestre); });
  return Array.from(set).sort().reverse();
}

function filtrarPorTrimestre(items: UsoAmbienteFichaTrimestre[], trimestreFiltro: string): UsoAmbienteFichaTrimestre[] {
  return trimestreFiltro === 'TODOS' ? items : items.filter(i => i.trimestre === trimestreFiltro);
}

export function exportarUsoAmbientesExcel(items: UsoAmbienteFichaTrimestre[], trimestreFiltro: string = 'TODOS') {
  const filtrados = filtrarPorTrimestre(items, trimestreFiltro);

  const wsData: (string | number)[][] = [
    ['SISTEMA DE GESTIÓN ACADÉMICA Y CURRICULAR - REPORTE DE AMBIENTES POR FICHA'],
    [trimestreFiltro === 'TODOS' ? 'Todos los trimestres' : `Trimestre: ${trimestreFiltro}`],
    [`FICHAS EN EL REPORTE: ${filtrados.length}`],
    [],
    ['TRIMESTRE', 'FICHA', 'PROGRAMA', 'AMBIENTE(S) USADOS', 'BLOQUES PROGRAMADOS', 'HORAS SEMANALES']
  ];

  if (filtrados.length === 0) {
    wsData.push(['No hay bloques de horario programados para este filtro.']);
  }

  filtrados.forEach(i => {
    wsData.push([
      i.trimestre,
      i.fichaNumero,
      i.programaNombre,
      i.ambientes.join(' / '),
      i.totalBloques,
      i.totalHoras
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 38 }, { wch: 32 }, { wch: 20 }, { wch: 16 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ambientes por Ficha');
  const sufijo = trimestreFiltro === 'TODOS' ? 'Todos' : trimestreFiltro;
  XLSX.writeFile(wb, `Reporte_Ambientes_por_Ficha_${sufijo}.xlsx`);
}

export function exportarUsoAmbientesPDF(items: UsoAmbienteFichaTrimestre[], trimestreFiltro: string = 'TODOS') {
  const filtrados = filtrarPorTrimestre(items, trimestreFiltro);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('SISTEMA DE GESTIÓN ACADÉMICA Y CURRICULAR', 40, 36);
  doc.setFontSize(11);
  doc.text('Reporte de Ambientes por Ficha', 40, 54);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `${trimestreFiltro === 'TODOS' ? 'Todos los trimestres' : `Trimestre: ${trimestreFiltro}`} — ${filtrados.length} ficha(s) en el reporte`,
    40,
    70
  );

  autoTable(doc, {
    startY: 86,
    head: [['Trimestre', 'Ficha', 'Programa', 'Ambiente(s)', 'Bloques', 'Horas/sem']],
    body: filtrados.length > 0
      ? filtrados.map(i => [i.trimestre, i.fichaNumero, i.programaNombre, i.ambientes.join(' / '), String(i.totalBloques), String(i.totalHoras)])
      : [['—', 'No hay bloques de horario programados para este filtro.', '', '', '', '']],
    styles: { fontSize: 8, cellPadding: 5, valign: 'top' },
    headStyles: { fillColor: COLOR_ENCABEZADO, textColor: 255, fontStyle: 'bold' }
  });

  const sufijo = trimestreFiltro === 'TODOS' ? 'Todos' : trimestreFiltro;
  doc.save(`Reporte_Ambientes_por_Ficha_${sufijo}.pdf`);
}
