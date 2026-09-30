import { Ficha } from '../types';

/**
 * Matriculados reales de una ficha: el total que trajo el último cargue de
 * Juicios Evaluativos (activos + inactivos). Mientras no se haya cargado
 * Juicios, se usa la matrícula inicial registrada en la ficha. Es la base de
 * los reportes y fórmulas de retención y deserción.
 */
export const totalMatriculados = (f: Pick<Ficha, 'totalAprendicesActual' | 'matriculaInicial'>): number =>
  f.totalAprendicesActual != null && f.totalAprendicesActual > 0 ? f.totalAprendicesActual : (f.matriculaInicial || 0);
