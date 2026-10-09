import { BloqueHorario, ContenidoRapsBloque, TramoInstructorBloque } from '../types';
import { parsearFechaLocal, fechaISOLocal } from './festivosColombia';

/**
 * CAMBIOS DE INSTRUCTOR CON FECHA DENTRO DE UN MISMO ESPACIO Y TRIMESTRE.
 *
 * Un bloque de Horario (día + franja + trimestre) sigue siendo UNA sola fila,
 * pero puede haber tenido varios instructores a lo largo del trimestre:
 *  - `tramosAnteriores`: quiénes lo cubrieron antes (o períodos vacantes), cada
 *    uno con su fecha de entrada (`desde`) y su último día (`hasta`).
 *  - `instructorDesde`: la fecha desde la que rige el instructor ACTUAL (o la
 *    vacancia actual). Vacío = desde el inicio del corte.
 *
 * Los reportes que dependen de las fechas (Reporte de Eventos / Horas, Formato
 * de Asociación) usan `expandirTramosInstructor` para tratar cada tramo como un
 * bloque independiente con su propio instructor y su propio rango de fechas.
 */

/** Suma (o resta) días a una fecha YYYY-MM-DD, sin desfases de zona horaria. */
export function sumarDiasISO(iso: string, dias: number): string {
  const d = parsearFechaLocal(iso);
  if (!d) return iso;
  d.setDate(d.getDate() + dias);
  return fechaISOLocal(d);
}

/** "2026-11-16" → "16 nov 2026" (para mensajes cortos). */
export function fechaCorta(iso: string): string {
  const d = parsearFechaLocal(iso);
  if (!d) return iso;
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, '');
}

/** "2026-11-16" → "lunes 16 de noviembre de 2026". */
export function fechaLarga(iso: string): string {
  const d = parsearFechaLocal(iso);
  if (!d) return iso;
  return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/** Fecha desde la que rige el instructor (o la vacancia) actual del bloque. */
export function inicioTramoActual(b: BloqueHorario, inicioCorte: string): string {
  const d = b.instructorDesde;
  return d && d > inicioCorte ? d : inicioCorte;
}

/**
 * Valida la fecha de entrada del nuevo instructor. Debe quedar dentro del
 * trimestre y DESPUÉS del inicio del tramo actual (si es igual, el cambio
 * reemplaza el tramo completo y no hace falta fecha).
 */
export function validarFechaCambio(
  b: BloqueHorario,
  desde: string,
  inicioCorte: string,
  finCorte: string
): { valida: boolean; mensaje?: string; reemplazoCompleto: boolean } {
  if (!desde) return { valida: false, mensaje: 'Indica desde qué fecha entra el nuevo instructor.', reemplazoCompleto: false };
  const inicioActual = inicioTramoActual(b, inicioCorte);
  if (desde < inicioActual) {
    return {
      valida: false,
      mensaje: `La fecha no puede ser anterior a ${fechaCorta(inicioActual)}, que es cuando empezó el instructor actual en este espacio.`,
      reemplazoCompleto: false
    };
  }
  if (desde > finCorte) {
    return { valida: false, mensaje: `La fecha queda fuera del trimestre (termina el ${fechaCorta(finCorte)}).`, reemplazoCompleto: false };
  }
  return { valida: true, reemplazoCompleto: desde === inicioActual };
}

/** RAPs que tiene hoy un bloque (para guardarlos como foto cuando cambia de instructor). */
export function contenidoRapsDe(b: BloqueHorario): ContenidoRapsBloque {
  return {
    rapCodigo: b.rapCodigo,
    rapTitulo: b.rapTitulo,
    rapsAsignados: b.rapsAsignados,
    esCompetenciaCompleta: b.esCompetenciaCompleta,
    competenciaCodigo: b.competenciaCodigo,
    competenciaNombre: b.competenciaNombre
  };
}

export interface ParRapCompetencia { competenciaCodigo: string; rapCodigo: string }

/**
 * Pares (competencia, RAP) que cubre un bloque. Los RAPs sin competencia propia
 * son de la competencia del bloque; un bloque de competencia completa se expande
 * con el catálogo. El código de RAP se repite entre competencias, por eso siempre
 * va acompañado de su competencia.
 */
export function paresRapDeBloque(
  b: Pick<BloqueHorario, 'competenciaCodigo' | 'rapCodigo' | 'rapsAsignados' | 'esCompetenciaCompleta'>,
  catalogo: { codigoRap: string; competenciaCodigo: string }[]
): ParRapCompetencia[] {
  if (b.rapsAsignados && b.rapsAsignados.length > 0) {
    return b.rapsAsignados.map(r => ({ competenciaCodigo: r.competenciaCodigo || b.competenciaCodigo, rapCodigo: r.codigo }));
  }
  if (b.rapCodigo && !b.esCompetenciaCompleta) return [{ competenciaCodigo: b.competenciaCodigo, rapCodigo: b.rapCodigo }];
  if (b.esCompetenciaCompleta && b.competenciaCodigo) {
    return catalogo.filter(r => r.competenciaCodigo === b.competenciaCodigo).map(r => ({ competenciaCodigo: r.competenciaCodigo, rapCodigo: r.codigoRap }));
  }
  return [];
}

/**
 * Arma el contenido de RAPs de un bloque a partir de los pares (competencia, RAP)
 * elegidos. Puede mezclar competencias: la principal es la del bloque (o, si no se
 * eligió ninguno de ella, la del primer RAP elegido).
 */
export function construirContenidoRaps(
  bloque: Pick<BloqueHorario, 'competenciaCodigo' | 'competenciaNombre'>,
  competencias: { codigo: string; denominacion: string }[],
  catalogo: { codigoRap: string; competenciaCodigo: string; denominacion: string; duracionHoras?: number }[],
  seleccion: ParRapCompetencia[]
): ContenidoRapsBloque {
  const nombreDe = (cod: string) =>
    cod === bloque.competenciaCodigo
      ? (bloque.competenciaNombre || competencias.find(c => c.codigo === cod)?.denominacion || cod)
      : (competencias.find(c => c.codigo === cod)?.denominacion || cod);
  const comps: string[] = [];
  seleccion.forEach(p => { if (!comps.includes(p.competenciaCodigo)) comps.push(p.competenciaCodigo); });
  const principal = comps.includes(bloque.competenciaCodigo) ? bloque.competenciaCodigo : (comps[0] || bloque.competenciaCodigo);
  const ordenComps = [principal, ...comps.filter(c => c !== principal)];
  const multi = ordenComps.length > 1;

  const entradas = ordenComps.flatMap(comp =>
    catalogo
      .filter(r => r.competenciaCodigo === comp && seleccion.some(p => p.competenciaCodigo === comp && p.rapCodigo === r.codigoRap))
      .map(r => ({
        codigo: r.codigoRap,
        denominacion: r.denominacion,
        horas: r.duracionHoras,
        ...(multi ? { competenciaCodigo: comp, competenciaNombre: nombreDe(comp) } : {})
      }))
  );
  const totalPrincipal = catalogo.filter(r => r.competenciaCodigo === principal).length;
  const completa = !multi && totalPrincipal > 0 && entradas.length === totalPrincipal;
  const etiqueta = (e: { codigo: string; competenciaCodigo?: string }) =>
    e.competenciaCodigo && e.competenciaCodigo !== principal ? `${e.competenciaCodigo}: ${e.codigo}` : e.codigo;

  return {
    rapCodigo: completa ? `Comp. Completa (${totalPrincipal} RAPs)` : entradas.map(etiqueta).join(', '),
    rapTitulo: completa ? `${nombreDe(principal)} (Competencia Completa)` : entradas.map(e => `${e.codigo}: ${e.denominacion}`).join(' | '),
    rapsAsignados: entradas,
    esCompetenciaCompleta: completa,
    competenciaCodigo: principal,
    competenciaNombre: nombreDe(principal)
  };
}

/**
 * Aplica un cambio de instructor con fecha y devuelve el bloque actualizado.
 * `nuevo` undefined = el espacio queda vacante desde esa fecha.
 * Si `desde` coincide con el inicio del tramo actual, el instructor se
 * reemplaza completo (sin dejar un tramo vacío de 0 días).
 */
export function aplicarCambioInstructor(
  b: BloqueHorario,
  nuevo: { id: string; nombre: string } | undefined,
  desde: string,
  inicioCorte: string,
  /** RAPs del nuevo instructor. Sin valor, hereda los mismos del bloque. */
  nuevosRaps?: ContenidoRapsBloque
): BloqueHorario {
  const inicioActual = inicioTramoActual(b, inicioCorte);
  const tramos = [...(b.tramosAnteriores || [])];
  if (desde > inicioActual) {
    tramos.push({
      instructorId: b.instructorId || undefined,
      instructorNombre: b.instructorId ? b.instructorNombre : undefined,
      raps: contenidoRapsDe(b),
      desde: inicioActual,
      hasta: sumarDiasISO(desde, -1)
    });
  }
  return {
    ...b,
    ...(nuevosRaps ? {
      rapCodigo: nuevosRaps.rapCodigo,
      rapTitulo: nuevosRaps.rapTitulo,
      rapsAsignados: nuevosRaps.rapsAsignados,
      esCompetenciaCompleta: nuevosRaps.esCompetenciaCompleta,
      competenciaCodigo: nuevosRaps.competenciaCodigo || b.competenciaCodigo,
      competenciaNombre: nuevosRaps.competenciaNombre || b.competenciaNombre
    } : {}),
    instructorId: nuevo?.id,
    instructorNombre: nuevo?.nombre,
    vacante: !nuevo,
    instructorDesde: desde > inicioCorte ? desde : undefined,
    tramosAnteriores: tramos.length > 0 ? tramos : undefined
  };
}

/**
 * Descompone cada bloque con tramos en bloques virtuales (uno por instructor o
 * período vacante), con sus fechas reales. Los bloques sin tramos pasan igual.
 * Los ids virtuales terminan en `#t<N>`; los del último tramo conservan el id.
 */
export function expandirTramosInstructor(bloques: BloqueHorario[]): BloqueHorario[] {
  const salida: BloqueHorario[] = [];
  bloques.forEach(b => {
    const previos = (b.tramosAnteriores || []).filter(t => t.desde && t.hasta && t.desde <= t.hasta);
    if (previos.length === 0) {
      salida.push(b);
      return;
    }
    previos.forEach((t: TramoInstructorBloque, i) => {
      const ini = t.desde > b.fechaCorteInicio ? t.desde : b.fechaCorteInicio;
      const fin = t.hasta < b.fechaCorteFin ? t.hasta : b.fechaCorteFin;
      if (ini > fin) return; // tramo fuera del rango vigente del trimestre
      salida.push({
        ...b,
        id: `${b.id}#t${i + 1}`,
        instructorId: t.instructorId,
        instructorNombre: t.instructorId ? t.instructorNombre : undefined,
        vacante: !t.instructorId,
        ...(t.raps ? {
          rapCodigo: t.raps.rapCodigo,
          rapTitulo: t.raps.rapTitulo,
          rapsAsignados: t.raps.rapsAsignados,
          esCompetenciaCompleta: t.raps.esCompetenciaCompleta,
          competenciaCodigo: t.raps.competenciaCodigo || b.competenciaCodigo,
          competenciaNombre: t.raps.competenciaNombre || b.competenciaNombre
        } : {}),
        fechaCorteInicio: ini,
        fechaCorteFin: fin,
        tramosAnteriores: undefined,
        instructorDesde: t.desde
      });
    });
    const ultimo = previos[previos.length - 1];
    const inicioActual = b.instructorDesde && b.instructorDesde > b.fechaCorteInicio
      ? b.instructorDesde
      : sumarDiasISO(ultimo.hasta, 1);
    const iniActual = inicioActual > b.fechaCorteInicio ? inicioActual : b.fechaCorteInicio;
    if (iniActual > b.fechaCorteFin) return; // el cambio cae después del fin vigente del trimestre
    salida.push({ ...b, fechaCorteInicio: iniActual, tramosAnteriores: undefined });
  });
  return salida;
}

export interface TramoLinea {
  instructorId?: string;
  instructorNombre?: string;
  desde: string;
  hasta: string;
  raps?: ContenidoRapsBloque;
}

/** Todos los instructores (o vacancias) de un bloque en orden, con sus fechas; el último es el actual. */
export function lineaTiempoInstructores(b: BloqueHorario, inicioCorte: string, finCorte: string): TramoLinea[] {
  const previos = b.tramosAnteriores || [];
  const lista: TramoLinea[] = previos.map(t => ({
    instructorId: t.instructorId,
    instructorNombre: t.instructorId ? t.instructorNombre : undefined,
    desde: t.desde,
    hasta: t.hasta,
    raps: t.raps
  }));
  const inicioActual = b.instructorDesde && b.instructorDesde > inicioCorte
    ? b.instructorDesde
    : previos.length > 0 ? sumarDiasISO(previos[previos.length - 1].hasta, 1) : inicioCorte;
  lista.push({
    instructorId: b.instructorId,
    instructorNombre: b.instructorNombre,
    desde: inicioActual,
    hasta: finCorte,
    raps: contenidoRapsDe(b)
  });
  return lista;
}

/**
 * Lo que se VE hoy en el horario: prevalece el instructor vigente en la fecha de
 * corte (hoy); el nuevo aparece cuando llega su fecha de entrada. Mientras tanto
 * el bloque trae `proximoCambio` para avisar quién entra y desde cuándo.
 */
export function aplicarVigencia(b: BloqueHorario, hoy: string, inicioCorte: string, finCorte: string): BloqueHorario {
  if (!b.tramosAnteriores || b.tramosAnteriores.length === 0) return b;
  const linea = lineaTiempoInstructores(b, inicioCorte, finCorte);
  let idx = 0;
  linea.forEach((t, i) => { if (t.desde <= hoy) idx = i; });
  if (idx === linea.length - 1) return b;
  const t = linea[idx];
  const prox = linea[idx + 1];
  return {
    ...b,
    instructorId: t.instructorId,
    instructorNombre: t.instructorNombre,
    vacante: !t.instructorId,
    ...(t.raps ? {
      rapCodigo: t.raps.rapCodigo,
      rapTitulo: t.raps.rapTitulo,
      rapsAsignados: t.raps.rapsAsignados,
      esCompetenciaCompleta: t.raps.esCompetenciaCompleta,
      competenciaCodigo: t.raps.competenciaCodigo || b.competenciaCodigo,
      competenciaNombre: t.raps.competenciaNombre || b.competenciaNombre
    } : {}),
    instructorDesde: idx > 0 ? t.desde : undefined,
    proximoCambio: { instructorNombre: prox.instructorNombre, vacante: !prox.instructorId, desde: prox.desde }
  };
}
