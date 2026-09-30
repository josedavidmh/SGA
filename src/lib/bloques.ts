import { BloqueHorario } from '../types';

/**
 * Un bloque es VACANTE cuando está programado pero todavía no tiene instructor.
 * Un espacio vacante reserva franja y ambiente, pero NO es un instructor: no
 * suma horas ni carga a nadie, no genera cruces y no aparece como una fila de
 * instructor en los reportes. Criterio único para todo el sistema.
 */
export const esBloqueVacante = (b: Pick<BloqueHorario, 'instructorId' | 'vacante'>): boolean =>
  Boolean(b.vacante) || !b.instructorId;
