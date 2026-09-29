import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { Ficha, Instructor, ProgramaFormacion, BloqueHorario, ActividadSeguimiento, AmbienteAprendizaje, EstadoActividad, RapSeguimiento, EstadoRap } from '../types';

export interface SyncResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  isRlsError?: boolean;
}

// =====================================================================
// SERVICIO DE FICHAS (Sincronización con public.fichas en Supabase)
// =====================================================================

export async function fetchFichasFromSupabase(): Promise<Ficha[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('fichas')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error al consultar fichas en Supabase:', error.message);
      return [];
    }

    if (!data || data.length === 0) return [];

    // Mapeo seguro de columnas PostgreSQL (snake_case) a TypeScript (camelCase)
    return data.map((row: any): Ficha => ({
      id: row.id || `ficha_${row.numero_ficha}`,
      numero_ficha: String(row.numero_ficha),
      programaCodigo: row.programa_codigo || '228118',
      programaNombre: row.programa_nombre || 'ADSO: Análisis y Desarrollo de Software',
      version: row.version || '1',
      nivelFormacion: (row.nivel_formacion as any) || 'Tecnólogo',
      instructorLiderId: row.instructor_lider_id || 'inst_01',
      instructorLiderNombre: 'Instructor Asignado',
      instructorLiderEmail: 'instructor@misena.edu.co',
      modalidad: (row.modalidad as any) || 'Presencial Diurna',
      ambientePrincipal: row.ambiente_principal || 'Ambiente Principal',
      periodoLectivo: row.periodo_lectivo || '2026-III',
      fechaInicio: row.fecha_inicio ? String(row.fecha_inicio).split('T')[0] : '2026-07-01',
      fechaFin: row.fecha_fin ? String(row.fecha_fin).split('T')[0] : '2027-12-15',
      matriculaInicial: Number(row.matricula_inicial || 30),
      aprendicesActivos: Number(row.aprendices_activos || row.matricula_inicial || 30),
      aprendicesCulminados: Number(row.aprendices_culminados || 0),
      aprendicesCancelados: Number(row.aprendices_cancelados || 0),
      aprendicesAplazados: Number(row.aprendices_aplazados || 0),
      aprendicesRetiroVoluntario: Number(row.aprendices_retiro_voluntario || 0),
      tasaRetencion: 100,
      tasaDesercion: 0,
      estado: (row.estado as any) || 'ACTIVA',
      progresoCurricular: 0,
      rapsTotales: 38,
      rapsEvaluados: 0,
      horasDirectasTotales: Number(row.horas_directas_totales || 3120),
      horasIndependientesTotales: Number(row.horas_independientes_totales || 864),
      horasEjecutadas: Number(row.horas_ejecutadas || 0)
    }));
  } catch (err: any) {
    console.error('Excepción al sincronizar fichas desde Supabase:', err);
    return [];
  }
}

export async function insertFichaInSupabase(ficha: Ficha): Promise<SyncResult<any>> {
  if (!isSupabaseConfigured) {
    return {
      success: false,
      error: 'Supabase no está configurado en las variables de entorno.'
    };
  }

  try {
    const payload = {
      // Se envía el id generado en el cliente (UUID real, ver src/lib/id.ts) para que
      // la fila en Supabase quede con el MISMO id que el estado local desde el primer
      // momento. Antes no se enviaba y Postgres generaba otro id distinto al local,
      // lo que rompía cualquier update/delete posterior hasta la siguiente sincronización.
      id: ficha.id,
      numero_ficha: ficha.numero_ficha,
      programa_codigo: ficha.programaCodigo,
      programa_nombre: ficha.programaNombre,
      version: ficha.version,
      nivel_formacion: ficha.nivelFormacion,
      instructor_lider_id: ficha.instructorLiderId || null,
      modalidad: ficha.modalidad,
      ambiente_principal: ficha.ambientePrincipal,
      periodo_lectivo: ficha.periodoLectivo,
      fecha_inicio: ficha.fechaInicio,
      fecha_fin: ficha.fechaFin,
      matricula_inicial: ficha.matriculaInicial,
      aprendices_activos: ficha.aprendicesActivos,
      aprendices_culminados: ficha.aprendicesCulminados,
      aprendices_cancelados: ficha.aprendicesCancelados,
      aprendices_aplazados: ficha.aprendicesAplazados,
      aprendices_retiro_voluntario: ficha.aprendicesRetiroVoluntario,
      estado: ficha.estado,
      horas_directas_totales: ficha.horasDirectasTotales,
      horas_independientes_totales: ficha.horasIndependientesTotales,
      horas_ejecutadas: ficha.horasEjecutadas
    };

    const { data, error } = await supabase
      .from('fichas')
      .insert([payload])
      .select();

    if (error) {
      const isRls = error.code === '42501' || error.message?.toLowerCase().includes('row-level security');
      return {
        success: false,
        error: error.message,
        isRlsError: isRls
      };
    }

    return {
      success: true,
      data
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error desconocido de red al contactar Supabase.'
    };
  }
}

export async function updateFichaInSupabase(id: string, ficha: Partial<Ficha>): Promise<SyncResult<any>> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase no configurado' };
  }
  try {
    const payload: any = {};
    if (ficha.numero_ficha !== undefined) payload.numero_ficha = ficha.numero_ficha;
    if (ficha.programaCodigo !== undefined) payload.programa_codigo = ficha.programaCodigo;
    if (ficha.programaNombre !== undefined) payload.programa_nombre = ficha.programaNombre;
    if (ficha.version !== undefined) payload.version = ficha.version;
    if (ficha.nivelFormacion !== undefined) payload.nivel_formacion = ficha.nivelFormacion;
    if (ficha.instructorLiderId !== undefined) payload.instructor_lider_id = ficha.instructorLiderId || null;
    if (ficha.modalidad !== undefined) payload.modalidad = ficha.modalidad;
    if (ficha.ambientePrincipal !== undefined) payload.ambiente_principal = ficha.ambientePrincipal;
    if (ficha.periodoLectivo !== undefined) payload.periodo_lectivo = ficha.periodoLectivo;
    if (ficha.fechaInicio !== undefined) payload.fecha_inicio = ficha.fechaInicio;
    if (ficha.fechaFin !== undefined) payload.fecha_fin = ficha.fechaFin;
    if (ficha.matriculaInicial !== undefined) payload.matricula_inicial = ficha.matriculaInicial;
    if (ficha.aprendicesActivos !== undefined) payload.aprendices_activos = ficha.aprendicesActivos;
    if (ficha.aprendicesCulminados !== undefined) payload.aprendices_culminados = ficha.aprendicesCulminados;
    if (ficha.aprendicesCancelados !== undefined) payload.aprendices_cancelados = ficha.aprendicesCancelados;
    if (ficha.aprendicesAplazados !== undefined) payload.aprendices_aplazados = ficha.aprendicesAplazados;
    if (ficha.aprendicesRetiroVoluntario !== undefined) payload.aprendices_retiro_voluntario = ficha.aprendicesRetiroVoluntario;
    if (ficha.estado !== undefined) payload.estado = ficha.estado;
    if (ficha.horasDirectasTotales !== undefined) payload.horas_directas_totales = ficha.horasDirectasTotales;
    if (ficha.horasIndependientesTotales !== undefined) payload.horas_independientes_totales = ficha.horasIndependientesTotales;
    if (ficha.horasEjecutadas !== undefined) payload.horas_ejecutadas = ficha.horasEjecutadas;

    const { data, error } = await supabase
      .from('fichas')
      .update(payload)
      .eq('id', id)
      .select();

    if (error) {
      const isRls = error.code === '42501' || error.message?.toLowerCase().includes('row-level security');
      return { success: false, error: error.message, isRlsError: isRls };
    }
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteFichaFromSupabase(id: string): Promise<SyncResult<any>> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase no configurado' };
  }
  try {
    // actividades_seguimiento, bloques_horarios, aprendices y raps_seguimiento tienen
    // ON DELETE CASCADE hacia fichas, así que se limpian solos al borrar la ficha.
    const { data, error } = await supabase
      .from('fichas')
      .delete()
      .eq('id', id);

    if (error) {
      const isRls = error.code === '42501' || error.message?.toLowerCase().includes('row-level security');
      return { success: false, error: error.message, isRlsError: isRls };
    }
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// =====================================================================
// SERVICIO DE INSTRUCTORES (Sincronización con public.instructores)
// =====================================================================

export async function fetchInstructoresFromSupabase(): Promise<Instructor[]> {
  if (!isSupabaseConfigured) {
    console.warn('fetchInstructoresFromSupabase: Supabase no configurado.');
    return [];
  }
  try {
    const { data, error } = await supabase
      .from('instructores')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Error al consultar instructores en Supabase:', error.message);
      return [];
    }

    if (!data || data.length === 0) return [];

    return data.map((row: any): Instructor => {
      const nombreCalculado = row.nombre_completo || 
        (row.nombres && row.apellidos ? `${row.nombres} ${row.apellidos}` : (row.nombres || row.apellidos || 'Instructor'));
      
      return {
        id: row.id,
        documento: String(row.documento || ''),
        nombres: row.nombres || '',
        apellidos: row.apellidos || '',
        nombreCompleto: nombreCalculado,
        email: row.email || '',
        telefono: row.telefono || '312 000 0000',
        perfilTecnico: row.perfil_tecnico || 'Instructor Técnico SENA',
        especialidad: row.especialidad || 'Área Técnica',
        colorAvatar: row.color_avatar || '#0D631B',
        horasSemanalesAsignadas: 0,
        maxHorasSemanales: Number(row.max_horas_semanales || 32),
        estado: (row.estado as any) || 'ACTIVO'
      };
    });
  } catch (err: any) {
    console.error('Excepción al consultar instructores en Supabase:', err);
    return [];
  }
}

export async function insertInstructorInSupabase(inst: Instructor): Promise<SyncResult<any>> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase no configurado' };
  }
  try {
    const payload = {
      // Igual que en insertFichaInSupabase: se envía el id (UUID real) generado en el
      // cliente para que no quede desincronizado del id local hasta la próxima sync.
      id: inst.id,
      documento: inst.documento,
      nombres: inst.nombres,
      apellidos: inst.apellidos,
      nombre_completo: inst.nombreCompleto,
      email: inst.email,
      telefono: inst.telefono,
      perfil_tecnico: inst.perfilTecnico,
      especialidad: inst.especialidad,
      color_avatar: inst.colorAvatar,
      max_horas_semanales: inst.maxHorasSemanales,
      estado: inst.estado
    };

    const { data, error } = await supabase
      .from('instructores')
      .insert([payload])
      .select();

    if (error) {
      const isRls = error.code === '42501' || error.message?.toLowerCase().includes('row-level security');
      return {
        success: false,
        error: error.message,
        isRlsError: isRls
      };
    }
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateInstructorInSupabase(id: string, inst: Partial<Instructor>): Promise<SyncResult<any>> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase no configurado' };
  }
  try {
    const payload: any = {};
    if (inst.documento !== undefined) payload.documento = inst.documento;
    if (inst.nombres !== undefined) payload.nombres = inst.nombres;
    if (inst.apellidos !== undefined) payload.apellidos = inst.apellidos;
    if (inst.nombreCompleto !== undefined) payload.nombre_completo = inst.nombreCompleto;
    if (inst.email !== undefined) payload.email = inst.email;
    if (inst.telefono !== undefined) payload.telefono = inst.telefono;
    if (inst.perfilTecnico !== undefined) payload.perfil_tecnico = inst.perfilTecnico;
    if (inst.especialidad !== undefined) payload.especialidad = inst.especialidad;
    if (inst.colorAvatar !== undefined) payload.color_avatar = inst.colorAvatar;
    if (inst.maxHorasSemanales !== undefined) payload.max_horas_semanales = inst.maxHorasSemanales;
    if (inst.estado !== undefined) payload.estado = inst.estado;

    const { data, error } = await supabase
      .from('instructores')
      .update(payload)
      .eq('id', id)
      .select();

    if (error) {
      const isRls = error.code === '42501' || error.message?.toLowerCase().includes('row-level security');
      return {
        success: false,
        error: error.message,
        isRlsError: isRls
      };
    }
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteInstructorFromSupabase(id: string): Promise<SyncResult<any>> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase no configurado' };
  }
  try {
    // Desvincular de fichas como instructor líder si estuviese asignado
    try {
      await supabase
        .from('fichas')
        .update({ instructor_lider_id: null })
        .eq('instructor_lider_id', id);
    } catch (e) {
      console.warn('Advertencia desvinculando instructor de fichas en Supabase:', e);
    }

    // Eliminar bloques_horarios que referencien al instructor
    try {
      await supabase
        .from('bloques_horarios')
        .delete()
        .eq('instructor_id', id);
    } catch (e) {
      console.warn('Advertencia eliminando bloques de horario en Supabase:', e);
    }

    const { data, error } = await supabase
      .from('instructores')
      .delete()
      .eq('id', id);

    if (error) {
      const isRls = error.code === '42501' || error.message?.toLowerCase().includes('row-level security');
      return {
        success: false,
        error: error.message,
        isRlsError: isRls
      };
    }
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// =====================================================================
// SERVICIO DE PROGRAMAS DE FORMACIÓN (Sincronización en cascada con Fichas)
// =====================================================================

export async function updateProgramaAndFichasInSupabase(
  oldCodigo: string, 
  programa: ProgramaFormacion
): Promise<SyncResult<{ fichasActualizadas: number }>> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase no configurado' };
  }

  try {
    // 1. Actualizar las fichas vinculadas a este programa en PostgreSQL
    const { data: fichasActualizadas, error: errorFichas } = await supabase
      .from('fichas')
      .update({
        programa_codigo: programa.codigo,
        programa_nombre: programa.nombre,
        version: programa.version,
        nivel_formacion: programa.nivelFormacion,
        horas_directas_totales: programa.duracionLectivaHoras,
        horas_independientes_totales: programa.duracionProductivaHoras
      })
      .eq('programa_codigo', oldCodigo)
      .select('id, numero_ficha');

    if (errorFichas) {
      const isRls = errorFichas.code === '42501' || errorFichas.message?.toLowerCase().includes('row-level security');
      return {
        success: false,
        error: errorFichas.message,
        isRlsError: isRls
      };
    }

    // 2. Registrar evento de auditoría
    await logSistemaEnSupabase(
      'EDICION_PROGRAMA_FORMACION',
      'Catálogo Curricular',
      `Programa actualizado: ${programa.codigo} - ${programa.nombre} (v${programa.version}, ${programa.nivelFormacion}). Fichas impactadas: ${fichasActualizadas?.length || 0}`,
      'Coordinación Académica'
    );

    return {
      success: true,
      data: { fichasActualizadas: fichasActualizadas ? fichasActualizadas.length : 0 }
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error al sincronizar actualización del programa en Supabase'
    };
  }
}

// =====================================================================
// REGISTRO DE AUDITORÍA EN SUPABASE
// =====================================================================

export async function logSistemaEnSupabase(tipoEvento: string, modulo: string, descripcion: string, usuario: string) {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from('auditoria_sistema').insert([{
      tipo_evento: tipoEvento,
      modulo,
      descripcion,
      usuario,
      ip_origen: '127.0.0.1'
    }]);
  } catch {
    // Registro tolerante a fallos
  }
}

// =====================================================================
// SERVICIO DE AMBIENTES DE APRENDIZAJE (Sincronización con public.ambientes)
// =====================================================================

export async function fetchAmbientesFromSupabase(): Promise<AmbienteAprendizaje[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('ambientes')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) {
      // Si la tabla no ha sido creada en Supabase aún, retorna vacío sin romper
      return [];
    }

    if (!data || data.length === 0) return [];

    return data.map((row: any): AmbienteAprendizaje => ({
      id: String(row.id),
      nombre: row.nombre,
      codigo: row.codigo,
      tipo: row.tipo || 'Ambiente TIC',
      sede: row.sede || 'Sede Principal - Valledupar',
      capacidadAprendices: Number(row.capacidad_aprendices || 30),
      equipamiento: row.equipamiento || '',
      estado: (row.estado as any) || 'DISPONIBLE'
    }));
  } catch {
    return [];
  }
}

export async function insertOrUpdateAmbienteInSupabase(amb: AmbienteAprendizaje): Promise<SyncResult<any>> {
  if (!isSupabaseConfigured) return { success: false, error: 'Supabase no configurado' };
  try {
    const payload = {
      id: amb.id,
      nombre: amb.nombre,
      codigo: amb.codigo,
      tipo: amb.tipo,
      sede: amb.sede,
      capacidad_aprendices: amb.capacidadAprendices,
      equipamiento: amb.equipamiento,
      estado: amb.estado
    };
    const { data, error } = await supabase
      .from('ambientes')
      .upsert([payload])
      .select();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteAmbienteFromSupabase(id: string): Promise<SyncResult<any>> {
  if (!isSupabaseConfigured) return { success: false, error: 'Supabase no configurado' };
  try {
    const { data, error } = await supabase
      .from('ambientes')
      .delete()
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// =====================================================================
// SERVICIO DE SEGUIMIENTO CURRICULAR (Actividades GPFI-F-134)
// =====================================================================
// Antes de esto, `actividades` solo vivía en memoria de React: no se
// guardaba ni en localStorage ni en Supabase, así que cualquier cambio de
// estado (PENDIENTE -> EN EJECUCION -> CALIFICADO) se perdía al recargar.

export async function fetchActividadesSeguimientoFromSupabase(): Promise<ActividadSeguimiento[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('actividades_seguimiento')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Error al consultar actividades de seguimiento en Supabase:', error.message);
      return [];
    }
    if (!data || data.length === 0) return [];

    return data.map((row: any): ActividadSeguimiento => ({
      id: row.id,
      fichaId: row.ficha_id,
      fase: row.fase || '',
      competenciaCodigo: row.competencia_codigo || '',
      competenciaDenominacion: row.competencia_denominacion || '',
      rapCodigo: row.rap_codigo || '',
      rapDenominacion: row.rap_denominacion || '',
      actividadAprendizaje: row.actividad_aprendizaje || '',
      evidenciaCodigo: row.evidencia_codigo || '',
      horasDirectas: Number(row.horas_directas || 0),
      horasIndependientes: Number(row.horas_independientes || 0),
      instructorId: row.instructor_id || '',
      instructorNombre: row.instructor_nombre || '',
      estado: (row.estado as EstadoActividad) || 'PENDIENTE',
      observaciones: row.observaciones || undefined,
      fechaUltimaActualizacion: row.fecha_ultima_actualizacion ? String(row.fecha_ultima_actualizacion) : undefined
    }));
  } catch (err: any) {
    console.error('Excepción al consultar actividades de seguimiento en Supabase:', err);
    return [];
  }
}

export async function upsertActividadSeguimientoInSupabase(act: ActividadSeguimiento): Promise<SyncResult<any>> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase no configurado' };
  }
  try {
    const payload = {
      id: act.id,
      ficha_id: act.fichaId,
      fase: act.fase,
      competencia_codigo: act.competenciaCodigo,
      competencia_denominacion: act.competenciaDenominacion,
      rap_codigo: act.rapCodigo,
      rap_denominacion: act.rapDenominacion,
      actividad_aprendizaje: act.actividadAprendizaje,
      evidencia_codigo: act.evidenciaCodigo,
      horas_directas: act.horasDirectas,
      horas_independientes: act.horasIndependientes,
      instructor_id: act.instructorId || null,
      instructor_nombre: act.instructorNombre || null,
      estado: act.estado,
      observaciones: act.observaciones || null,
      fecha_ultima_actualizacion: new Date().toISOString().split('T')[0]
    };

    const { data, error } = await supabase
      .from('actividades_seguimiento')
      .upsert([payload], { onConflict: 'id' })
      .select();

    if (error) {
      const isRls = error.code === '42501' || error.message?.toLowerCase().includes('row-level security');
      return { success: false, error: error.message, isRlsError: isRls };
    }
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error desconocido de red al contactar Supabase.' };
  }
}

// =====================================================================
// SERVICIO DE SEGUIMIENTO POR RAP INDIVIDUAL (raps_seguimiento)
// =====================================================================
// Estado editable por RAP (instructor asignado + PENDIENTE/EN_EJECUCION/
// CALIFICADO/SIN_CALIFICAR) que se ve al expandir una competencia en la
// pestaña "Comparativo" del módulo de Seguimiento. Antes solo vivía en
// localStorage del navegador (clave `sena_raps_seguimiento`).

export async function fetchRapsSeguimientoFromSupabase(): Promise<RapSeguimiento[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('raps_seguimiento')
      .select('*')
      .order('updated_at', { ascending: true });

    if (error) {
      console.warn('Error al consultar raps_seguimiento en Supabase:', error.message);
      return [];
    }
    if (!data || data.length === 0) return [];

    return data.map((row: any): RapSeguimiento => ({
      id: row.id,
      fichaId: row.ficha_id,
      fichaNumero: row.ficha_numero || '',
      programaCodigo: row.programa_codigo || '',
      competenciaCodigo: row.competencia_codigo || '',
      competenciaDenominacion: row.competencia_denominacion || '',
      rapCodigo: row.rap_codigo || '',
      rapDenominacion: row.rap_denominacion || '',
      instructorId: row.instructor_id || undefined,
      instructorNombre: row.instructor_nombre || undefined,
      estado: (row.estado as EstadoRap) || 'PENDIENTE',
      fuenteInstructor: row.fuente_instructor || undefined,
      fuenteEstado: row.fuente_estado || undefined,
      fechaActualizacion: row.fecha_actualizacion || undefined,
      historialInstructores: Array.isArray(row.historial_instructores) ? row.historial_instructores : undefined
    }));
  } catch (err: any) {
    console.error('Excepción al consultar raps_seguimiento en Supabase:', err);
    return [];
  }
}

export async function upsertRapSeguimientoInSupabase(item: RapSeguimiento): Promise<SyncResult<any>> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase no configurado' };
  }
  try {
    const payload = {
      id: item.id,
      ficha_id: item.fichaId,
      ficha_numero: item.fichaNumero,
      programa_codigo: item.programaCodigo || null,
      competencia_codigo: item.competenciaCodigo,
      competencia_denominacion: item.competenciaDenominacion || null,
      rap_codigo: item.rapCodigo,
      rap_denominacion: item.rapDenominacion || null,
      instructor_id: item.instructorId || null,
      instructor_nombre: item.instructorNombre || null,
      estado: item.estado,
      fuente_instructor: item.fuenteInstructor || null,
      fuente_estado: item.fuenteEstado || null,
      fecha_actualizacion: item.fechaActualizacion || new Date().toISOString(),
      historial_instructores: item.historialInstructores && item.historialInstructores.length > 0 ? item.historialInstructores : []
    };

    // onConflict por (ficha_id, competencia_codigo, rap_codigo): el código de
    // RAP (p.ej. "RAP 01") se reinicia en cada competencia, así que NO es
    // único por ficha por sí solo — usar solo (ficha_id, rap_codigo) hacía que
    // "RAP 01" de una competencia pisara "RAP 01" de otra. Debe coincidir
    // exactamente con la llave que usa el frontend para buscar/actualizar un
    // registro existente (ver rapsSeguimiento.find(...) en App.tsx /
    // useSeguimientoCurricular.ts) y con la restricción UNIQUE de la tabla.
    const { data, error } = await supabase
      .from('raps_seguimiento')
      .upsert([payload], { onConflict: 'ficha_id,competencia_codigo,rap_codigo' })
      .select();

    if (error) {
      const isRls = error.code === '42501' || error.message?.toLowerCase().includes('row-level security');
      return { success: false, error: error.message, isRlsError: isRls };
    }
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error desconocido de red al contactar Supabase.' };
  }
}

