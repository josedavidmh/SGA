import { Ficha, Instructor, User } from '../types';

const normalizar = (t?: string) =>
  (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * ¿Esta ficha es del instructor líder que inició sesión?
 * Se reconoce por cualquiera de estos vínculos:
 *  - la ficha asignada en su usuario (fichaAsignadaId),
 *  - el líder registrado en la ficha (id o correo),
 *  - el instructor de la planta con su mismo correo (o nombre) que figura
 *    como líder de la ficha.
 */
export function esFichaDelLider(ficha: Ficha | null | undefined, user: User, instructores: Instructor[] = []): boolean {
  if (!ficha || user.rol !== 'INSTRUCTOR_LIDER') return false;
  if (ficha.id === user.fichaAsignadaId) return true;
  if (ficha.instructorLiderId && ficha.instructorLiderId === user.id) return true;
  const correo = normalizar(user.correo);
  if (correo && ficha.instructorLiderEmail && normalizar(ficha.instructorLiderEmail) === correo) return true;
  if (ficha.instructorLiderId) {
    const inst = instructores.find(i => i.id === ficha.instructorLiderId);
    if (inst) {
      if (correo && normalizar(inst.email) === correo) return true;
      if (normalizar(inst.nombreCompleto) && normalizar(inst.nombreCompleto) === normalizar(user.nombre_completo)) return true;
    }
  }
  return false;
}

/** Fichas que el usuario puede ver/gestionar (el líder solo las suyas). */
export function fichasPermitidas(fichas: Ficha[], user: User, instructores: Instructor[] = []): Ficha[] {
  if (user.rol !== 'INSTRUCTOR_LIDER') return fichas;
  return fichas.filter(f => esFichaDelLider(f, user, instructores));
}

/** ¿Puede editar el horario de esta ficha? */
export function puedeEditarHorarioDeFicha(ficha: Ficha | null | undefined, user: User, instructores: Instructor[] = []): boolean {
  if (user.rol === 'ADMINISTRADOR' || user.rol === 'COORDINADOR' || user.rol === 'AUXILIAR') return true;
  return esFichaDelLider(ficha, user, instructores);
}
