import { BloqueHorario, DiaSemana, Ficha, FranjaHorario, JornadaAmbiente } from '../types';

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

// ---------------------------------------------------------------------------
// JORNADA DEL AMBIENTE BASE
// Un ambiente puede tener una ficha por jornada (Mañana / Tarde / Noche).
// ---------------------------------------------------------------------------

export const JORNADAS: JornadaAmbiente[] = ['Mañana', 'Tarde', 'Noche'];

export const DETALLE_JORNADA: Record<JornadaAmbiente, string> = {
  'Mañana': 'Mañana (06:00 - 12:00)',
  'Tarde': 'Tarde (13:00 - 19:00)',
  'Noche': 'Noche (después de las 19:00)'
};

export const ORDEN_JORNADA: Record<string, number> = { 'Mañana': 0, 'Tarde': 1, 'Noche': 2 };

/** Jornada a la que pertenece una franja del horario. */
export function jornadaDeFranja(franja: FranjaHorario | string): JornadaAmbiente {
  const hora = parseInt(String(franja).slice(0, 2), 10);
  if (Number.isNaN(hora) || hora < 12) return 'Mañana';
  return hora < 19 ? 'Tarde' : 'Noche';
}

/** Fecha de hoy en formato YYYY-MM-DD (hora local). */
export const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** La etapa lectiva de la ficha ya terminó (si no tiene fecha fin, se asume vigente). */
export const fichaVencida = (f: Pick<Ficha, 'fechaFin'>, hoy: string = hoyISO()) =>
  !!f.fechaFin && f.fechaFin < hoy;

/**
 * ¿Esta ficha ocupa su ambiente hoy? No lo ocupan las cerradas, las de cierre
 * reabierto (POR_CERRAR, en corrección) ni las de etapa lectiva vencida.
 */
export const ocupaAmbiente = (f: Ficha, hoy: string = hoyISO()) =>
  f.estado !== 'CERRADA' && f.estado !== 'POR_CERRAR' && !fichaVencida(f, hoy);

/** ¿Dos etapas lectivas se cruzan en el tiempo? Una fecha vacía se toma como abierta. */
export const rangosSeSolapan = (
  a: { fechaInicio?: string; fechaFin?: string },
  b: { fechaInicio?: string; fechaFin?: string }
) => {
  const ini = (r: { fechaInicio?: string }) => r.fechaInicio || '0000-01-01';
  const fin = (r: { fechaFin?: string }) => r.fechaFin || '9999-12-31';
  return ini(a) <= fin(b) && ini(b) <= fin(a);
};

/**
 * Otra ficha que ya tiene ese mismo ambiente en esa misma jornada durante
 * fechas que se cruzan con las de la ficha que se guarda. Devuelve null si está libre.
 * No cuentan: la propia ficha, las cerradas, las de etapa lectiva ya vencida
 * (el ambiente vuelve a quedar disponible) ni las que no se cruzan en fechas.
 */
export function buscarConflictoAmbienteJornada(
  fichas: Ficha[],
  destino: { fichaId?: string; ambiente: string; jornada?: JornadaAmbiente | ''; fechaInicio?: string; fechaFin?: string }
): Ficha | null {
  if (!destino.jornada || esAmbienteGenerico(destino.ambiente)) return null;
  return (
    fichas.find(f =>
      f.id !== destino.fichaId &&
      ocupaAmbiente(f) &&
      f.jornadaAmbiente === destino.jornada &&
      mismoAmbiente(f.ambientePrincipal, destino.ambiente) &&
      rangosSeSolapan(f, destino)
    ) || null
  );
}
