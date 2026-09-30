import { BloqueHorario, TrimestreCalendario } from '../types';

/**
 * El nombre del trimestre en Horarios es "AAAA-ROMANO" (ej. "2026-III"); el
 * calendario de Parametrizaciones usa el mismo formato. Se comparan sin
 * distinguir mayúsculas ni espacios sobrantes.
 */
const clave = (t?: string) => (t || '').trim().toUpperCase();

export function buscarTrimestreCalendario(
  calendario: TrimestreCalendario[] | undefined,
  trimestre: string
): TrimestreCalendario | undefined {
  if (!calendario || !trimestre) return undefined;
  return calendario.find(t => clave(t.nombre) === clave(trimestre));
}

/**
 * Deja el nombre del trimestre en su forma única "AAAA-ROMANO". Algunas fichas
 * traían el periodo con texto extra ("2026-III (Julio - Septiembre)"), lo que
 * hacía ver el mismo trimestre como dos distintos. Si no reconoce el formato,
 * devuelve el texto tal cual (recortado).
 */
export function normalizarNombreTrimestre(nombre?: string): string {
  const texto = (nombre || '').trim();
  const m = texto.toUpperCase().match(/(\d{4})\s*[-–/ ]\s*(IV|I{1,3})\b/);
  return m ? `${m[1]}-${m[2]}` : texto;
}

/**
 * Trimestre al que pertenece una fecha: primero el calendario parametrizado
 * (Parametrizaciones → Trimestres) y, si la fecha no cae en ninguno, el
 * trimestre natural del año. Devuelve '' si no hay fecha válida.
 */
export function trimestreDeFecha(
  calendario: TrimestreCalendario[] | undefined,
  fecha?: string
): string {
  const f = (fecha || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) return '';
  const cal = (calendario || []).find(t => t.fechaInicio && t.fechaFin && t.fechaInicio <= f && f <= t.fechaFin);
  if (cal) return normalizarNombreTrimestre(cal.nombre);
  const mes = parseInt(f.slice(5, 7), 10);
  return `${f.slice(0, 4)}-${['I', 'II', 'III', 'IV'][Math.floor((mes - 1) / 3)]}`;
}

/** Rango por defecto (calendario natural del trimestre) cuando el trimestre no está parametrizado. */
export function rangoPorDefecto(trimestre: string): { inicio: string; fin: string } {
  const m = clave(trimestre).match(/^(\d{4})-([IVX]+)$/);
  const anio = m ? m[1] : String(new Date().getFullYear());
  const idx = m ? ['I', 'II', 'III', 'IV'].indexOf(m[2]) : 0;
  const rangos = [
    ['01-01', '03-31'],
    ['04-01', '06-30'],
    ['07-01', '09-30'],
    ['10-01', '12-31']
  ];
  const [i, f] = rangos[idx >= 0 ? idx : 0];
  return { inicio: `${anio}-${i}`, fin: `${anio}-${f}` };
}

/** Fechas de corte para un trimestre: las del calendario parametrizado o, si no existe, las por defecto. */
export function fechasDeCorteTrimestre(
  calendario: TrimestreCalendario[] | undefined,
  trimestre: string
): { inicio: string; fin: string; parametrizado: boolean } {
  const cal = buscarTrimestreCalendario(calendario, trimestre);
  if (cal && cal.fechaInicio && cal.fechaFin) {
    return { inicio: cal.fechaInicio, fin: cal.fechaFin, parametrizado: true };
  }
  return { ...rangoPorDefecto(trimestre), parametrizado: false };
}

/**
 * Devuelve los bloques con las fechas de corte del calendario parametrizado
 * (si ese trimestre existe allí). Los bloques ya guardados pueden traer
 * fechas viejas; al exportar siempre se usa el calendario vigente.
 */
export function aplicarCalendarioABloques(
  bloques: BloqueHorario[],
  calendario: TrimestreCalendario[] | undefined
): BloqueHorario[] {
  return bloques.map(b => {
    const cal = buscarTrimestreCalendario(calendario, b.trimestre);
    if (!cal || !cal.fechaInicio || !cal.fechaFin) return b;
    return { ...b, fechaCorteInicio: cal.fechaInicio, fechaCorteFin: cal.fechaFin };
  });
}
