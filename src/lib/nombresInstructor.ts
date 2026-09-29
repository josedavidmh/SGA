import { Instructor } from '../types';

/** Títulos que no forman parte del nombre (se ignoran al comparar). */
const TITULOS = new Set(['ING', 'INGENIERO', 'INGENIERA', 'DR', 'DRA', 'LIC', 'MG', 'MSC', 'PHD', 'ESP', 'TEC', 'TECNOL', 'PROF']);

/**
 * Clave para saber si dos nombres son la MISMA persona: sin tildes, sin
 * mayúsculas/minúsculas, sin puntuación y sin títulos ("Ing.", "Dr.", …).
 * "Ing. José David Montesino Hoyos" y "JOSE DAVID MONTESINO HOYOS" dan la
 * misma clave.
 */
export function claveNombrePersona(nombre: string): string {
  return (nombre || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-ZÑ ]/g, ' ')
    .split(/\s+/)
    .filter(w => w && !TITULOS.has(w))
    .join(' ');
}

/**
 * Nombre en el formato estándar del sistema: MAYÚSCULAS y SIN TILDES, igual
 * que SofiaPlus ("JOSE DAVID MONTESINO HOYOS"). La Ñ se conserva.
 */
export function nombreEnMayusculas(nombre: string): string {
  return (nombre || '')
    .replace(/ñ/g, '\u0000').replace(/Ñ/g, '\u0000')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0000/g, 'Ñ')
    .replace(/\s+/g, ' ').trim()
    .toUpperCase();
}

/** Nombres, apellidos y nombre completo del instructor en MAYÚSCULAS y sin títulos. */
export function normalizarNombresInstructor<T extends Pick<Instructor, 'nombres' | 'apellidos' | 'nombreCompleto'>>(inst: T): T {
  const nombres = nombreEnMayusculas(inst.nombres || '');
  const apellidos = nombreEnMayusculas(inst.apellidos || '');
  const quitarTitulo = (t: string) => t.replace(/^(ING|DR|DRA|LIC|MG|MSC|PHD|ESP)\.?\s+/i, '');
  const completo = nombres || apellidos
    ? `${quitarTitulo(nombres)} ${apellidos}`.trim()
    : quitarTitulo(nombreEnMayusculas(inst.nombreCompleto || ''));
  return { ...inst, nombres: quitarTitulo(nombres), apellidos, nombreCompleto: completo };
}

/** ¿El nombre ya está en el formato estándar? */
export function nombresYaNormalizados(inst: Pick<Instructor, 'nombres' | 'apellidos' | 'nombreCompleto'>): boolean {
  const n = normalizarNombresInstructor(inst);
  return n.nombres === (inst.nombres || '') && n.apellidos === (inst.apellidos || '') && n.nombreCompleto === (inst.nombreCompleto || '');
}

export interface ResultadoHomologacion {
  instructores: Instructor[];
  /** id duplicado → id que se conserva */
  reemplazos: Map<string, string>;
  /** Instructores conservados que cambiaron (nombre en mayúsculas y/o fusión de datos). */
  actualizados: Instructor[];
  /** Duplicados que se eliminan (ya fusionados en otro). */
  eliminados: Instructor[];
}

/**
 * Homologa la planta de instructores:
 *  1) Une los registros que son la misma persona (misma clave de nombre).
 *     Se conserva el registro "más completo": el que tiene documento, cuenta
 *     de usuario o más datos vinculados; ante empate, el creado a mano
 *     (el que no venía todo en mayúsculas desde SofiaPlus).
 *  2) Deja todos los nombres en MAYÚSCULAS (formato SofiaPlus) para que un
 *     archivo nuevo siempre los reconozca.
 */
export function homologarInstructores(
  instructores: Instructor[],
  opciones: { correosConCuenta?: Set<string>; referencias?: Map<string, number> } = {}
): ResultadoHomologacion {
  const correos = opciones.correosConCuenta || new Set<string>();
  const refs = opciones.referencias || new Map<string, number>();
  const grupos = new Map<string, Instructor[]>();
  instructores.forEach(i => {
    const clave = claveNombrePersona(i.nombreCompleto || `${i.nombres} ${i.apellidos}`);
    if (!clave) return;
    const g = grupos.get(clave) || [];
    g.push(i);
    grupos.set(clave, g);
  });

  const puntaje = (i: Instructor) =>
    ((i.documento || '').trim() ? 100 : 0) +
    (correos.has((i.email || '').toLowerCase()) ? 60 : 0) +
    (refs.get(i.id) || 0) * 5 +
    (/[a-záéíóúñ]/.test(i.nombreCompleto || '') ? 20 : 0) +
    (/@sena\.edu\.co$/i.test(i.email || '') ? 10 : 0);

  const reemplazos = new Map<string, string>();
  const eliminados: Instructor[] = [];
  const fusionados = new Map<string, Instructor>();

  grupos.forEach(g => {
    if (g.length < 2) return;
    const ordenados = [...g].sort((a, b) => puntaje(b) - puntaje(a));
    const [conservado, ...resto] = ordenados;
    let fusion: Instructor = { ...conservado };
    const union = (a?: string[], b?: string[]) => Array.from(new Set([...(a || []), ...(b || [])]));
    resto.forEach(d => {
      reemplazos.set(d.id, conservado.id);
      eliminados.push(d);
      fusion = {
        ...fusion,
        documento: fusion.documento || d.documento,
        telefono: fusion.telefono || d.telefono,
        competenciasExperiencia: union(fusion.competenciasExperiencia, d.competenciasExperiencia),
        rapsExperiencia: union(fusion.rapsExperiencia, d.rapsExperiencia),
        historialEvaluaciones: [...(fusion.historialEvaluaciones || []), ...(d.historialEvaluaciones || [])],
        totalJuiciosEvaluados: (fusion.totalJuiciosEvaluados || 0) + (d.totalJuiciosEvaluados || 0),
        horasSemanalesAsignadas: (fusion.horasSemanalesAsignadas || 0) + (d.horasSemanalesAsignadas || 0)
      };
    });
    fusionados.set(conservado.id, fusion);
  });

  const actualizados: Instructor[] = [];
  const lista = instructores
    .filter(i => !reemplazos.has(i.id))
    .map(i => {
      const base = fusionados.get(i.id) || i;
      const final = normalizarNombresInstructor(base);
      if (fusionados.has(i.id) || !nombresYaNormalizados(i)) actualizados.push(final);
      return final;
    });

  return { instructores: lista, reemplazos, actualizados, eliminados };
}
