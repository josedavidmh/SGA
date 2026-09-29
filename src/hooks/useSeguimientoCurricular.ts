import React from 'react';
import {
  Ficha,
  ActividadSeguimiento,
  EstadoActividad,
  Instructor,
  Competencia,
  ResultadoAprendizaje,
  RegistroHorasEjecutadas,
  BloqueHorario,
  ReporteJuiciosFicha,
  RapSeguimiento,
  EstadoRap,
  HistorialInstructorRap
} from '../types';
import { calcularComparativoCompetencias, ComparativoCompetenciaItem } from '../services/horasEjecutadasService';
import { generarUuid } from '../lib/id';
import { esProvisionalVigente, fechaFirmeza } from '../lib/firmezaSeguimiento';

export interface RapSeguimientoData {
  estado: EstadoRap;
  instructorNombre?: string;
  instructorId?: string;
  fuente?: 'MANUAL' | 'HORARIO' | 'JUICIOS';
  /** true cuando el RAP quedó programado en Horarios pero aún sin instructor. */
  vacante?: boolean;
  historialInstructores?: HistorialInstructorRap[];
  /** Si la asignación desde Horario aún es provisional: cuándo queda en firme (ISO). */
  firmeDesde?: string;
}

interface UseSeguimientoCurricularParams {
  ficha: Ficha | null;
  actividades: ActividadSeguimiento[];
  instructores: Instructor[];
  competencias: Competencia[];
  raps: ResultadoAprendizaje[];
  registrosHorasEjecutadas: RegistroHorasEjecutadas[];
  horarios: BloqueHorario[];
  reportesJuicios: Record<string, ReporteJuiciosFicha>;
  rapsSeguimiento: RapSeguimiento[];
  onUpdateEstado: (actividadId: string, nuevoEstado: EstadoActividad) => void;
  onActualizarRapSeguimiento?: (item: RapSeguimiento) => void;
}

/**
 * Toda la lógica de negocio del módulo de Seguimiento (comparativo planeado vs.
 * ejecutado por competencia, resolución de RAPs y su estado/instructor asignado,
 * y las estadísticas agregadas) vivía inline dentro de SeguimientoView.tsx, mezclada
 * con el JSX de un componente de más de 1300 líneas. Se extrae aquí para que el
 * componente se limite a presentación, y para que esta lógica se pueda probar o
 * reutilizar de forma aislada. El comportamiento es intencionalmente idéntico al
 * que tenía antes de la extracción.
 */
export function useSeguimientoCurricular({
  ficha,
  actividades,
  instructores,
  competencias,
  raps,
  registrosHorasEjecutadas,
  horarios,
  reportesJuicios,
  rapsSeguimiento,
  onUpdateEstado,
  onActualizarRapSeguimiento
}: UseSeguimientoCurricularParams) {
  // Actividades de la ficha activa (matriz GPFI-F-134)
  const fichaActividades = ficha ? actividades.filter(a => a.fichaId === ficha.id) : [];

  // Competencias asociadas al programa de la ficha
  const competenciasPrograma = React.useMemo(() => {
    if (!ficha) return competencias;
    const filtradas = competencias.filter(c => !c.programaCodigo || c.programaCodigo === ficha.programaCodigo);
    return filtradas.length > 0 ? filtradas : competencias;
  }, [competencias, ficha]);

  // RAPs asociados al programa de la ficha
  const rapsPrograma = React.useMemo(() => {
    if (!ficha) return raps;
    const filtrados = raps.filter(r => !r.programaCodigo || r.programaCodigo === ficha.programaCodigo);
    return filtrados.length > 0 ? filtrados : raps;
  }, [raps, ficha]);

  // Registros de horas ejecutadas asociados a la ficha
  const registrosHorasFicha = React.useMemo(() => {
    if (!ficha) return registrosHorasEjecutadas;
    return registrosHorasEjecutadas.filter(r => !r.fichaNumero || r.fichaNumero === ficha.numero_ficha);
  }, [registrosHorasEjecutadas, ficha]);

  // Seguimiento por RAP SOLO de esta ficha. Antes se pasaba el de todas las
  // fichas y la columna "Instructor(es) responsables" mostraba, en cada
  // ficha, a los instructores que Juicios había registrado en OTRAS fichas.
  const rapsSeguimientoFicha = React.useMemo(() => {
    if (!ficha) return [];
    return rapsSeguimiento.filter(s => s.fichaId === ficha.id || s.fichaNumero === ficha.numero_ficha);
  }, [rapsSeguimiento, ficha]);

  // Comparativo Planeado vs Ejecutado por Competencia (semáforo 70%-80% / avanzado / alerta)
  const comparativoLista: ComparativoCompetenciaItem[] = React.useMemo(() => {
    return calcularComparativoCompetencias(competenciasPrograma, registrosHorasFicha, fichaActividades, rapsSeguimientoFicha);
  }, [competenciasPrograma, registrosHorasFicha, fichaActividades, rapsSeguimientoFicha]);

  // Estadísticas consolidadas del comparativo
  const totalHorasDirectas = comparativoLista.reduce((acc, curr) => acc + curr.horasTrabajoDirecto, 0);
  const totalHorasAutonomo = comparativoLista.reduce((acc, curr) => acc + curr.horasTrabajoAutonomo, 0);
  const totalHorasPlaneadas = totalHorasDirectas + totalHorasAutonomo;
  const totalHorasEjecutadas = comparativoLista.reduce((acc, curr) => acc + curr.horasEjecutadas, 0);
  const porcentajeGlobal = totalHorasPlaneadas > 0
    ? Math.round((totalHorasEjecutadas / totalHorasPlaneadas) * 100)
    : 0;

  const countOk = comparativoLista.filter(c => c.estadoSemaforo === 'OK').length;
  const countAlerta = comparativoLista.filter(c => c.estadoSemaforo === 'ALERTA_PROGRAMAR').length;
  const countAvanzado = comparativoLista.filter(c => c.estadoSemaforo === 'AVANZADO').length;

  // Estadísticas de actividades GPFI-F-134
  const totalCalificadas = fichaActividades.filter(a => a.estado === 'CALIFICADO').length;
  const totalEnEjecucion = fichaActividades.filter(a => a.estado === 'EN EJECUCION').length;
  const totalPendientes = fichaActividades.filter(a => a.estado === 'PENDIENTE').length;

  // Obtener RAPs de una competencia (o derivar de Juicios/Planeación si aún no se han separado)
  const getRapsDeCompetencia = React.useCallback((compCodigo: string, compDenom: string): ResultadoAprendizaje[] => {
    const encontradas = rapsPrograma.filter(r =>
      r.competenciaCodigo === compCodigo ||
      (r.competenciaDenominacion && r.competenciaDenominacion.toLowerCase() === compDenom.toLowerCase())
    );

    if (encontradas.length > 0) return encontradas;

    // Buscar si hay juicios evaluativos cargados con RAPs para esta competencia
    if (ficha && reportesJuicios[ficha.numero_ficha]) {
      const juiciosFicha = reportesJuicios[ficha.numero_ficha];
      if (juiciosFicha?.aprendices) {
        const rapsDesdeJuicios = new Map<string, ResultadoAprendizaje>();
        juiciosFicha.aprendices.forEach(a => {
          a.juicios.forEach(j => {
            if (
              (j.competenciaCodigo && j.competenciaCodigo === compCodigo) ||
              (j.competenciaDenominacion && compDenom.toLowerCase().includes(j.competenciaDenominacion.toLowerCase()))
            ) {
              const rapCod = j.rapCodigo || `${compCodigo}-01`;
              if (!rapsDesdeJuicios.has(rapCod)) {
                rapsDesdeJuicios.set(rapCod, {
                  id: `rap_j_${compCodigo}_${rapCod}`,
                  programaCodigo: ficha.programaCodigo,
                  competenciaCodigo: compCodigo,
                  competenciaDenominacion: compDenom,
                  codigoRap: rapCod,
                  denominacion: j.rapDenominacion || `Resultado de Aprendizaje ${rapCod}`,
                  fase: 'Fase 4: Evaluación',
                  duracionHoras: 0,
                  horasTrabajoDirecto: 0,
                  horasTrabajoAutonomo: 0
                });
              }
            }
          });
        });
        if (rapsDesdeJuicios.size > 0) {
          return Array.from(rapsDesdeJuicios.values());
        }
      }
    }

    // Default: Generar al menos el RAP 01 de la competencia para permitir seguimiento.
    // NOTA: este RAP es "sintético" (no viene de la planeación pedagógica real).
    // Se marca con un id predecible (rap_gen_...) para que, si luego se carga la
    // planeación real, sea fácil distinguirlo de un RAP genuino.
    return [
      {
        id: `rap_gen_${compCodigo}_01`,
        programaCodigo: ficha ? ficha.programaCodigo : '',
        competenciaCodigo: compCodigo,
        competenciaDenominacion: compDenom,
        codigoRap: `${compCodigo}-01`,
        denominacion: `Resultado de Aprendizaje — ${compDenom}`,
        fase: 'Fase 3: Ejecución',
        duracionHoras: 0,
        horasTrabajoDirecto: 0,
        horasTrabajoAutonomo: 0
      }
    ];
  }, [rapsPrograma, ficha, reportesJuicios]);

  // Obtener o inferir el estado y asignación de cada RAP para la ficha
  const getRapSeguimientoData = React.useCallback((compCodigo: string, compDenom: string, rap: ResultadoAprendizaje): RapSeguimientoData => {
    if (!ficha) return { estado: 'PENDIENTE', instructorNombre: undefined, instructorId: undefined, fuente: undefined };

    // 1. Buscar en estado explícito guardado.
    // IMPORTANTE: el código de RAP (p.ej. "RAP 01") se reinicia en cada
    // competencia, así que hay que exigir también competenciaCodigo — de lo
    // contrario "RAP 01" de una competencia se confunde con "RAP 01" de otra.
    const seg = rapsSeguimiento.find(s =>
      (s.fichaId === ficha.id || s.fichaNumero === ficha.numero_ficha) &&
      s.competenciaCodigo === compCodigo &&
      (s.rapCodigo === rap.codigoRap || (rap.denominacion && s.rapDenominacion?.toLowerCase() === rap.denominacion.toLowerCase()))
    );

    if (seg) {
      return {
        estado: seg.estado,
        instructorNombre: seg.instructorNombre,
        instructorId: seg.instructorId,
        fuente: seg.fuenteInstructor || seg.fuenteEstado || 'MANUAL',
        vacante: seg.fuenteInstructor === 'HORARIO' && !seg.instructorId,
        historialInstructores: seg.historialInstructores,
        // Asignación desde Horario que aún no queda en firme
        firmeDesde: seg.fuenteInstructor === 'HORARIO' && seg.instructorId && esProvisionalVigente(seg)
          ? fechaFirmeza(seg)?.toISOString()
          : undefined
      };
    }

    // 2. Si no hay registro explícito, verificar si está asignado en los Horarios de la ficha
    const bloqueHorario = horarios.find(h =>
      h.fichaId === ficha.id && (
        (h.rapsAsignados && h.rapsAsignados.some(r => r.codigo === rap.codigoRap)) ||
        h.rapCodigo === rap.codigoRap ||
        (h.esCompetenciaCompleta && h.competenciaCodigo === compCodigo)
      )
    );

    if (bloqueHorario) {
      // Un bloque "vacante" (RAP programado en el horario pero todavía sin
      // instructor) no cuenta como EN_EJECUCION — nadie lo está dictando aún.
      return bloqueHorario.instructorId
        ? {
            estado: 'EN_EJECUCION',
            instructorNombre: bloqueHorario.instructorNombre,
            instructorId: bloqueHorario.instructorId,
            fuente: 'HORARIO'
          }
        : {
            estado: 'PENDIENTE',
            instructorNombre: undefined,
            instructorId: undefined,
            fuente: 'HORARIO',
            vacante: true
          };
    }

    // 3. Predeterminado: PENDIENTE (blanco) sin instructor
    return {
      estado: 'PENDIENTE',
      instructorNombre: undefined,
      instructorId: undefined,
      fuente: undefined
    };
  }, [ficha, rapsSeguimiento, horarios]);

  // Manejo de cambio de instructor en un RAP individual
  const handleCambiarInstructorRap = React.useCallback((compCodigo: string, compDenom: string, rap: ResultadoAprendizaje, instructorIdSeleccionado: string) => {
    if (!ficha || !onActualizarRapSeguimiento) return;

    const instObj = instructores.find(i => i.id === instructorIdSeleccionado);
    // Clave completa (ficha + competencia + RAP): el código de RAP se reinicia
    // por competencia, así que sin competenciaCodigo esto afectaría también a
    // "RAP 01" de otras competencias de la misma ficha.
    const segExistente = rapsSeguimiento.find(s =>
      (s.fichaId === ficha.id || s.fichaNumero === ficha.numero_ficha) &&
      s.competenciaCodigo === compCodigo &&
      s.rapCodigo === rap.codigoRap
    );

    // Si ya había OTRO instructor cubriendo este RAP, su paso se cierra en el
    // historial en vez de perderse — así queda constancia de que sí estuvo
    // asignado a este RAP en este trimestre aunque hoy lo cubra alguien más.
    const huboCambioDeInstructor = !!segExistente?.instructorNombre &&
      segExistente.instructorNombre !== instObj?.nombreCompleto;
    const historialActualizado: HistorialInstructorRap[] = huboCambioDeInstructor
      ? [
          ...(segExistente?.historialInstructores || []),
          {
            instructorId: segExistente!.instructorId,
            instructorNombre: segExistente!.instructorNombre!,
            trimestre: ficha.periodoLectivo,
            fechaFin: new Date().toISOString(),
            motivo: 'MANUAL'
          }
        ]
      : (segExistente?.historialInstructores || []);

    const nuevoItem: RapSeguimiento = {
      id: segExistente?.id || generarUuid(),
      fichaId: ficha.id,
      fichaNumero: ficha.numero_ficha,
      programaCodigo: ficha.programaCodigo,
      competenciaCodigo: compCodigo,
      competenciaDenominacion: compDenom,
      rapCodigo: rap.codigoRap,
      rapDenominacion: rap.denominacion,
      instructorId: instObj?.id,
      instructorNombre: instObj ? instObj.nombreCompleto : undefined,
      estado: segExistente?.estado || (instObj ? 'EN_EJECUCION' : 'PENDIENTE'),
      fuenteInstructor: 'MANUAL',
      fuenteEstado: segExistente?.fuenteEstado || 'MANUAL',
      fechaActualizacion: new Date().toISOString(),
      historialInstructores: historialActualizado
    };

    onActualizarRapSeguimiento(nuevoItem);
  }, [ficha, instructores, rapsSeguimiento, onActualizarRapSeguimiento]);

  // Manejo de cambio de estado en un RAP individual
  const handleCambiarEstadoRap = React.useCallback((compCodigo: string, compDenom: string, rap: ResultadoAprendizaje, nuevoEstado: EstadoRap) => {
    if (!ficha || !onActualizarRapSeguimiento) return;

    const currentData = getRapSeguimientoData(compCodigo, compDenom, rap);
    const segExistente = rapsSeguimiento.find(s =>
      (s.fichaId === ficha.id || s.fichaNumero === ficha.numero_ficha) &&
      s.competenciaCodigo === compCodigo &&
      s.rapCodigo === rap.codigoRap
    );

    const nuevoItem: RapSeguimiento = {
      id: segExistente?.id || generarUuid(),
      fichaId: ficha.id,
      fichaNumero: ficha.numero_ficha,
      programaCodigo: ficha.programaCodigo,
      competenciaCodigo: compCodigo,
      competenciaDenominacion: compDenom,
      rapCodigo: rap.codigoRap,
      rapDenominacion: rap.denominacion,
      instructorId: segExistente?.instructorId || currentData.instructorId,
      instructorNombre: segExistente?.instructorNombre || currentData.instructorNombre,
      estado: nuevoEstado,
      fuenteInstructor: segExistente?.fuenteInstructor || currentData.fuente || 'MANUAL',
      fuenteEstado: 'MANUAL',
      fechaActualizacion: new Date().toISOString(),
      historialInstructores: segExistente?.historialInstructores || currentData.historialInstructores
    };

    onActualizarRapSeguimiento(nuevoItem);
  }, [ficha, rapsSeguimiento, getRapSeguimientoData, onActualizarRapSeguimiento]);

  // Estadísticas globales de RAPs para la ficha activa
  const statsRaps = React.useMemo(() => {
    let total = 0;
    let pendientes = 0;
    let enEjecucion = 0;
    let calificadas = 0;
    let sinCalificar = 0;

    comparativoLista.forEach(comp => {
      const compRaps = getRapsDeCompetencia(comp.competenciaCodigo, comp.competenciaDenominacion);
      compRaps.forEach(rap => {
        total++;
        const data = getRapSeguimientoData(comp.competenciaCodigo, comp.competenciaDenominacion, rap);
        if (data.estado === 'CALIFICADO') calificadas++;
        else if (data.estado === 'EN_EJECUCION') enEjecucion++;
        else if (data.estado === 'SIN_CALIFICAR') sinCalificar++;
        else pendientes++;
      });
    });

    return { total, pendientes, enEjecucion, calificadas, sinCalificar };
  }, [comparativoLista, getRapsDeCompetencia, getRapSeguimientoData]);

  const handleNextEstadoActividad = React.useCallback((id: string, current: EstadoActividad) => {
    let next: EstadoActividad = 'PENDIENTE';
    if (current === 'PENDIENTE') next = 'EN EJECUCION';
    else if (current === 'EN EJECUCION') next = 'CALIFICADO';
    else if (current === 'CALIFICADO') next = 'PENDIENTE';

    onUpdateEstado(id, next);
  }, [onUpdateEstado]);

  return {
    fichaActividades,
    rapsPrograma,
    comparativoLista,
    totalHorasDirectas,
    totalHorasAutonomo,
    totalHorasPlaneadas,
    totalHorasEjecutadas,
    porcentajeGlobal,
    countOk,
    countAlerta,
    countAvanzado,
    totalCalificadas,
    totalEnEjecucion,
    totalPendientes,
    getRapsDeCompetencia,
    getRapSeguimientoData,
    handleCambiarInstructorRap,
    handleCambiarEstadoRap,
    statsRaps,
    handleNextEstadoActividad
  };
}
