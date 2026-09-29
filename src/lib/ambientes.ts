import { BloqueHorario, DiaSemana, Ficha, FranjaHorario } from '../types';

/**
 * AMBIENTES DE UNA FICHA EN EL HORARIO
 *
 * - Ambiente BASE: `ficha.ambientePrincipal` (el de siempre).
 * - Excepción POR DÍA: `ficha.ambientesExcepcion["<trimestre>|<día>"]` — ese
 *   día de la semana, en ese trimestre, la ficha va a otro ambiente.
 * - Excepción POR FRANJA: `bloque.ambienteEspecial` — solo ese bloque.
 *
 * El ambiente efectivo de un bloque es el más específico que exista. Además
 * se guarda en `bloque.ambiente` para que Supabase pueda impedir que dos
 * fichas ocupen el mismo ambiente a la misma hora.
 */

export const claveExcepcionDia = (trimestre: string, dia: DiaSemana | string) => `${trimestre}|${dia}`;

/** Nombres que no son un salón real (no generan choque entre fichas). */
const GENERICOS = new Set(['', 'ambiente principal', 'por asignar', 'sin ambiente', 'virtual', 'sin ambiente asignado']);

export const normalizarAmbiente = (nombre?: string) =>
  (nombre || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

export const esAmbienteGenerico = (nombre?: string) => GENERICOS.has(normalizarAmbiente(nombre));

export const mismoAmbiente = (a?: string, b?: string) =>
  !esAmbienteGenerico(a) && !esAmbienteGenerico(b) && normalizarAmbiente(a) === normalizarAmbiente(b);

/** Ambiente de la ficha para un día de un trimestre (excepción del día o el base). */
export function ambienteDelDia(ficha: Ficha | null | undefined, trimestre: string, dia: DiaSemana | string): string {
  if (!ficha) return '';
  return ficha.ambientesExcepcion?.[claveExcepcionDia(trimestre, dia)] || ficha.ambientePrincipal || '';
}

/** ¿Ese día tiene excepción de ambiente? */
export function excepcionDelDia(ficha: Ficha | null | undefined, trimestre: string, dia: DiaSemana | string): string | undefined {
  return ficha?.ambientesExcepcion?.[claveExcepcionDia(trimestre, dia)] || undefined;
}

/** Ambiente real donde se dicta un bloque. */
export function ambienteEfectivo(bloque: BloqueHorario, ficha?: Ficha | null): string {
  if (bloque.ambienteEspecial) return bloque.ambienteEspecial;
  if (ficha) return ambienteDelDia(ficha, bloque.trimestre, bloque.diaSemana);
  return bloque.ambiente || '';
}

/** Tipo de uso del ambiente en ese bloque, para mostrarlo y reportarlo. */
export function origenAmbiente(bloque: BloqueHorario, ficha?: Ficha | null): 'BASE' | 'EXCEPCION_DIA' | 'EXCEPCION_FRANJA' {
  if (bloque.ambienteEspecial) return 'EXCEPCION_FRANJA';
  if (ficha && excepcionDelDia(ficha, bloque.trimestre, bloque.diaSemana)) return 'EXCEPCION_DIA';
  return 'BASE';
}

export interface ChoqueAmbiente {
  bloque: BloqueHorario;
  fichaNumero: string;
  ambiente: string;
}

/**
 * Busca si OTRA ficha ya ocupa ese ambiente ese día/franja/trimestre.
 * `fichas` debe incluir todas las fichas conocidas para calcular bien el
 * ambiente de cada bloque; si una ficha no está, se usa el guardado en el bloque.
 */
export function buscarChoqueAmbiente(
  horarios: BloqueHorario[],
  fichas: Ficha[],
  destino: { fichaId: string; trimestre: string; dia: DiaSemana; franja: FranjaHorario; ambiente: string; excluirIds?: string[] }
): ChoqueAmbiente | null {
  if (esAmbienteGenerico(destino.ambiente)) return null;
  const fichaPorId = new Map(fichas.map(f => [f.id, f]));
  for (const h of horarios) {
    if (h.fichaId === destino.fichaId) continue;
    if (destino.excluirIds?.includes(h.id)) continue;
    if (h.trimestre !== destino.trimestre || h.diaSemana !== destino.dia || h.franja !== destino.franja) continue;
    const f = fichaPorId.get(h.fichaId);
    const amb = ambienteEfectivo(h, f);
    if (mismoAmbiente(amb, destino.ambiente)) {
      return { bloque: h, fichaNumero: f?.numero_ficha || 'otra ficha', ambiente: amb };
    }
  }
  return null;
}
