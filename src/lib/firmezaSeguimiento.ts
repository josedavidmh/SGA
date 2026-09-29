import { AsignacionProvisionalRap, RapSeguimiento } from '../types';

/**
 * Plazo (en horas) para que una asignación hecha desde Horarios quede EN FIRME
 * en el Seguimiento. Si el instructor se quita del horario antes de este
 * plazo, se toma como una prueba o corrección y el RAP vuelve exactamente
 * como estaba, sin dejar rastro en el historial.
 */
export const HORAS_PARA_FIRMEZA = 72;

/** Fecha en que la asignación provisional queda en firme (o null si no es provisional). */
export function fechaFirmeza(s?: Pick<RapSeguimiento, 'asignacionProvisional'>): Date | null {
  const desde = s?.asignacionProvisional?.desde;
  if (!desde) return null;
  const t = new Date(desde).getTime();
  if (Number.isNaN(t)) return null;
  return new Date(t + HORAS_PARA_FIRMEZA * 3600 * 1000);
}

/** ¿La asignación del RAP todavía es provisional (dentro del plazo)? */
export function esProvisionalVigente(s?: Pick<RapSeguimiento, 'asignacionProvisional'>): boolean {
  const f = fechaFirmeza(s);
  return !!f && Date.now() < f.getTime();
}

/** Foto del RAP antes de una asignación desde Horarios. */
export function fotoPrevia(s?: RapSeguimiento): AsignacionProvisionalRap['previo'] {
  if (!s) return null;
  return {
    instructorId: s.instructorId,
    instructorNombre: s.instructorNombre,
    fuenteInstructor: s.fuenteInstructor,
    estado: s.estado,
    fuenteEstado: s.fuenteEstado,
    historialInstructores: s.historialInstructores ? [...s.historialInstructores] : []
  };
}

/**
 * Deshace una asignación provisional: deja el RAP como estaba antes de ella.
 * Un estado de juicio real (CALIFICADO / SIN_CALIFICAR…) que haya llegado
 * mientras tanto NO se pierde.
 */
export function restaurarAntesDeProvisional(s: RapSeguimiento): RapSeguimiento {
  const previo = s.asignacionProvisional?.previo || null;
  const estadoDeJuicio = s.estado !== 'PENDIENTE' && s.estado !== 'EN_EJECUCION';
  return {
    ...s,
    instructorId: previo?.instructorId,
    instructorNombre: previo?.instructorNombre,
    fuenteInstructor: previo?.fuenteInstructor,
    estado: estadoDeJuicio ? s.estado : (previo?.estado || 'PENDIENTE'),
    fuenteEstado: estadoDeJuicio ? s.fuenteEstado : previo?.fuenteEstado,
    historialInstructores: previo?.historialInstructores || [],
    asignacionProvisional: undefined,
    fechaActualizacion: new Date().toISOString()
  };
}
