import bcrypt from 'bcryptjs';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { generarUuid } from '../lib/id';
import { Ficha, Instructor, ProgramaFormacion, BloqueHorario, ActividadSeguimiento, AmbienteAprendizaje, EstadoActividad, RapSeguimiento, EstadoRap, Competencia, ResultadoAprendizaje, User, AuditoriaSistema, EspecialidadTematica, TrimestreCalendario, RegistroArchivoSeguimiento, AuditoriaIngesta, RegistroHorasEjecutadas } from '../types';

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
      instructorLiderEmail: 'instructor@correo.edu.co',
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
      // Estos valores los calcula Juicios Evaluativos. Si la columna no existe
      // (migración 20260929f sin correr) o viene vacía, quedan undefined y la
      // sincronización al abrir conserva el valor local en vez de reiniciarlo
      // a 100% / 0% / 0% como pasaba antes.
      tasaRetencion: row.tasa_retencion != null ? Number(row.tasa_retencion) : undefined,
      tasaDesercion: row.tasa_desercion != null ? Number(row.tasa_desercion) : undefined,
      aprendicesCondicionados: row.aprendices_condicionados != null ? Number(row.aprendices_condicionados) : undefined,
      aprendicesTrasladados: row.aprendices_trasladados != null ? Number(row.aprendices_trasladados) : undefined,
      estado: (row.estado as any) || 'ACTIVA',
      progresoCurricular: row.progreso_curricular != null ? Number(row.progreso_curricular) : (undefined as unknown as number),
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
    // Columnas de 20260929f (resultado de Juicios Evaluativos)
    const COLUMNAS_JUICIOS = ['tasa_retencion', 'tasa_desercion', 'aprendices_condicionados', 'aprendices_trasladados', 'progreso_curricular'];
    if (ficha.tasaRetencion !== undefined) payload.tasa_retencion = ficha.tasaRetencion;
    if (ficha.tasaDesercion !== undefined) payload.tasa_desercion = ficha.tasaDesercion;
    if (ficha.aprendicesCondicionados !== undefined) payload.aprendices_condicionados = ficha.aprendicesCondicionados;
    if (ficha.aprendicesTrasladados !== undefined) payload.aprendices_trasladados = ficha.aprendicesTrasladados;
    if (ficha.progresoCurricular !== undefined) payload.progreso_curricular = ficha.progresoCurricular;

    let { data, error } = await supabase
      .from('fichas')
      .update(payload)
      .eq('id', id)
      .select();

    // Si esas columnas aún no existen, se guarda el resto igual en vez de
    // perder toda la actualización de la ficha.
    if (error && error.code === 'PGRST204') {
      COLUMNAS_JUICIOS.forEach(c => delete payload[c]);
      ({ data, error } = await supabase.from('fichas').update(payload).eq('id', id).select());
    }

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
        telefono: row.telefono || '',
        perfilTecnico: row.perfil_tecnico || 'Instructor Técnico',
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
      // Los instructores detectados desde Juicios no traen documento: se
      // envía null (no "") para que varios sin documento puedan coexistir
      // con la restricción UNIQUE. Requiere 20260929e (documento opcional).
      documento: (inst.documento || '').trim() || null,
      nombres: inst.nombres || inst.nombreCompleto || 'Instructor',
      apellidos: inst.apellidos || '',
      // NO se envía nombre_completo: en la tabla `instructores` es una columna
      // GENERATED ALWAYS AS (nombres || ' ' || apellidos) STORED — Postgres
      // RECHAZA cualquier INSERT/UPDATE que intente escribirla directamente
      // ("cannot insert a non-DEFAULT value into column..."). Esto hacía que
      // CADA creación de instructor fallara al 100% contra Supabase, en
      // silencio (atrapada por el .catch() del llamador) — el instructor
      // quedaba guardado en memoria/localStorage pero nunca llegaba a
      // Supabase. Es el mismo patrón de bug ya encontrado antes en esta app
      // (bloques_horarios con id no-UUID, auditoria_sistema con columnas mal
      // mapeadas): un INSERT que Postgres rechazaba entero, sin que nada se lo
      // dijera al usuario.
      email: inst.email,
      telefono: inst.telefono,
      perfil_tecnico: inst.perfilTecnico || 'Instructor de Formación Profesional Integral',
      especialidad: inst.especialidad || 'Área Técnica',
      color_avatar: (inst.colorAvatar || '#0D631B').slice(0, 20),
      max_horas_semanales: Math.min(48, Math.max(1, Number(inst.maxHorasSemanales) || 32)),
      estado: inst.estado || 'ACTIVO'
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
    // nombre_completo NUNCA se envía: es una columna generada (ver nota en
    // insertInstructorInSupabase) — escribirla hace que Postgres rechace todo el UPDATE.
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

// BUG REAL corregido aquí: este insert usaba columnas (tipo_evento,
// descripcion, usuario) que NO existen en public.auditoria_sistema — la
// tabla real tiene accion/modulo/detalles/usuario_nombre/rol. El insert
// fallaba en el 100% de los casos, pero el try/catch de abajo se lo
// tragaba en silencio ("Registro tolerante a fallos"), así que la
// auditoría de sistema NUNCA llegó a subir a Supabase pese a llamarse en
// cada registrarLog() — se quedaba solo en localStorage de cada navegador.
export async function logSistemaEnSupabase(accion: string, modulo: string, detalles: string, usuarioNombre: string, rol: string = 'COORDINADOR') {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from('auditoria_sistema').insert([{
      accion,
      modulo,
      detalles,
      usuario_nombre: usuarioNombre,
      rol,
      ip_origen: '127.0.0.1'
    }]);
  } catch {
    // Registro tolerante a fallos: la auditoría nunca debe bloquear la acción real del usuario.
  }
}

export async function fetchAuditoriaSistemaFromSupabase(): Promise<AuditoriaSistema[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('auditoria_sistema')
      .select('*')
      .order('fecha_hora', { ascending: false })
      .limit(500);

    if (error) {
      console.warn('Error al consultar auditoria_sistema en Supabase:', error.message);
      return [];
    }
    if (!data || data.length === 0) return [];

    return data.map((row: any): AuditoriaSistema => ({
      id: row.id,
      fechaHora: (row.fecha_hora || '').replace('T', ' ').substring(0, 19),
      usuarioId: row.usuario_id || '',
      usuarioNombre: row.usuario_nombre || '',
      rol: row.rol,
      accion: row.accion,
      modulo: row.modulo,
      ip: row.ip_origen || '127.0.0.1',
      detalles: row.detalles || ''
    }));
  } catch (err: any) {
    console.error('Excepción al consultar auditoria_sistema en Supabase:', err);
    return [];
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
      sede: row.sede || 'Sede Principal',
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
    let { data, error } = await supabase
      .from('raps_seguimiento')
      .upsert([payload], { onConflict: 'ficha_id,competencia_codigo,rap_codigo' })
      .select();

    // Si el instructor asignado todavía no existe en la tabla `instructores`
    // de Supabase (p.ej. un evaluador detectado desde Juicios que solo quedó
    // en este navegador), la llave foránea rechazaba TODO el registro y el
    // seguimiento se perdía. Se guarda igual, con el nombre del instructor
    // pero sin el enlace por id.
    if (error && error.code === '23503' && (error.message || '').includes('instructor')) {
      ({ data, error } = await supabase
        .from('raps_seguimiento')
        .upsert([{ ...payload, instructor_id: null }], { onConflict: 'ficha_id,competencia_codigo,rap_codigo' })
        .select());
    }

    if (error) {
      const isRls = error.code === '42501' || error.message?.toLowerCase().includes('row-level security');
      return { success: false, error: error.message + (error.details ? ` (${error.details})` : ''), isRlsError: isRls };
    }
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error desconocido de red al contactar Supabase.' };
  }
}

// =====================================================================
// SERVICIO DE COMPETENCIAS (Catálogo curricular)
// =====================================================================
// Antes de esto, Competencias solo vivía en localStorage — cargada por
// Ingesta de Excel y visible únicamente en el navegador donde se subió el
// archivo. Se sube también a Supabase para que cualquier equipo vea el
// mismo catálogo, y para que sobreviva a un cambio de puerto/URL o a
// limpiar datos del sitio (el síntoma real que motivó esto: "desaparecen
// las competencias y los RAPs" al ver la app desde otro origen).

export async function fetchCompetenciasFromSupabase(): Promise<Competencia[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('competencias')
      .select('*')
      .order('codigo', { ascending: true });

    if (error) {
      console.warn('Error al consultar competencias en Supabase:', error.message);
      return [];
    }
    if (!data || data.length === 0) return [];

    return data.map((row: any): Competencia => ({
      id: row.id,
      programaCodigo: row.programa_codigo || '',
      codigo: row.codigo,
      denominacion: row.denominacion,
      horasEstimadas: Number(row.horas_estimadas || 0),
      horasTrabajoDirecto: row.horas_trabajo_directo != null ? Number(row.horas_trabajo_directo) : undefined,
      horasTrabajoAutonomo: row.horas_trabajo_autonomo != null ? Number(row.horas_trabajo_autonomo) : undefined,
      horasEjecutadas: row.horas_ejecutadas != null ? Number(row.horas_ejecutadas) : undefined,
      tipo: row.tipo || 'Técnica',
      faseSugerida: row.fase_sugerida || undefined,
      especialidadTematicaId: row.especialidad_tematica_id || undefined,
      especialidadTematicaNombre: row.especialidad_tematica_nombre || undefined
    }));
  } catch (err: any) {
    console.error('Excepción al consultar competencias en Supabase:', err);
    return [];
  }
}

export async function bulkUpsertCompetenciasInSupabase(items: Competencia[]): Promise<SyncResult<any>> {
  if (!isSupabaseConfigured) return { success: false, error: 'Supabase no configurado' };
  if (items.length === 0) return { success: true };
  try {
    const payload = items.map(c => ({
      id: c.id,
      programa_codigo: c.programaCodigo || null,
      codigo: c.codigo,
      denominacion: c.denominacion,
      horas_estimadas: c.horasEstimadas || 0,
      horas_trabajo_directo: c.horasTrabajoDirecto ?? null,
      horas_trabajo_autonomo: c.horasTrabajoAutonomo ?? null,
      horas_ejecutadas: c.horasEjecutadas ?? null,
      tipo: c.tipo,
      fase_sugerida: c.faseSugerida || null,
      especialidad_tematica_id: c.especialidadTematicaId || null,
      especialidad_tematica_nombre: c.especialidadTematicaNombre || null
    }));

    const { data, error } = await supabase
      .from('competencias')
      .upsert(payload, { onConflict: 'id' })
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

export async function deleteCompetenciasByProgramaFromSupabase(programaCodigo: string): Promise<SyncResult<any>> {
  if (!isSupabaseConfigured) return { success: false, error: 'Supabase no configurado' };
  try {
    const { data, error } = await supabase.from('competencias').delete().eq('programa_codigo', programaCodigo);
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteAllCompetenciasFromSupabase(): Promise<SyncResult<any>> {
  if (!isSupabaseConfigured) return { success: false, error: 'Supabase no configurado' };
  try {
    const { data, error } = await supabase.from('competencias').delete().not('id', 'is', null);
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// =====================================================================
// SERVICIO DE RESULTADOS DE APRENDIZAJE (Catálogo de RAPs)
// =====================================================================
// Mismo caso que Competencias: antes solo vivía en localStorage.

export async function fetchRapsFromSupabase(): Promise<ResultadoAprendizaje[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('resultados_aprendizaje')
      .select('*')
      .order('codigo_rap', { ascending: true });

    if (error) {
      console.warn('Error al consultar resultados_aprendizaje en Supabase:', error.message);
      return [];
    }
    if (!data || data.length === 0) return [];

    return data.map((row: any): ResultadoAprendizaje => ({
      id: row.id,
      programaCodigo: row.programa_codigo || undefined,
      codigoRap: row.codigo_rap,
      competenciaCodigo: row.competencia_codigo || '',
      competenciaDenominacion: row.competencia_denominacion || undefined,
      denominacion: row.denominacion,
      fase: row.fase,
      duracionHoras: row.duracion_horas != null ? Number(row.duracion_horas) : undefined,
      horasTrabajoDirecto: row.horas_trabajo_directo != null ? Number(row.horas_trabajo_directo) : undefined,
      horasTrabajoAutonomo: row.horas_trabajo_autonomo != null ? Number(row.horas_trabajo_autonomo) : undefined,
      tipo: row.tipo || undefined,
      actividadesAprendizaje: Array.isArray(row.actividades_aprendizaje) ? row.actividades_aprendizaje : undefined,
      actividadesProyecto: Array.isArray(row.actividades_proyecto) ? row.actividades_proyecto : undefined,
      detallesActividades: Array.isArray(row.detalles_actividades) ? row.detalles_actividades : undefined
    }));
  } catch (err: any) {
    console.error('Excepción al consultar resultados_aprendizaje en Supabase:', err);
    return [];
  }
}

export async function bulkUpsertRapsInSupabase(items: ResultadoAprendizaje[]): Promise<SyncResult<any>> {
  if (!isSupabaseConfigured) return { success: false, error: 'Supabase no configurado' };
  if (items.length === 0) return { success: true };
  try {
    const payload = items.map(r => ({
      id: r.id,
      programa_codigo: r.programaCodigo || null,
      codigo_rap: r.codigoRap,
      competencia_codigo: r.competenciaCodigo,
      competencia_denominacion: r.competenciaDenominacion || null,
      denominacion: r.denominacion,
      fase: r.fase,
      duracion_horas: r.duracionHoras ?? null,
      horas_trabajo_directo: r.horasTrabajoDirecto ?? null,
      horas_trabajo_autonomo: r.horasTrabajoAutonomo ?? null,
      tipo: r.tipo || null,
      actividades_aprendizaje: r.actividadesAprendizaje && r.actividadesAprendizaje.length > 0 ? r.actividadesAprendizaje : null,
      actividades_proyecto: r.actividadesProyecto && r.actividadesProyecto.length > 0 ? r.actividadesProyecto : null,
      detalles_actividades: r.detallesActividades && r.detallesActividades.length > 0 ? r.detallesActividades : null
    }));

    const { data, error } = await supabase
      .from('resultados_aprendizaje')
      .upsert(payload, { onConflict: 'id' })
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

export async function deleteRapsByProgramaFromSupabase(programaCodigo: string): Promise<SyncResult<any>> {
  if (!isSupabaseConfigured) return { success: false, error: 'Supabase no configurado' };
  try {
    const { data, error } = await supabase.from('resultados_aprendizaje').delete().eq('programa_codigo', programaCodigo);
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteAllRapsFromSupabase(): Promise<SyncResult<any>> {
  if (!isSupabaseConfigured) return { success: false, error: 'Supabase no configurado' };
  try {
    const { data, error } = await supabase.from('resultados_aprendizaje').delete().not('id', 'is', null);
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// =====================================================================
// REEMPLAZO DEL CATÁLOGO (COMPETENCIAS + RAPs) POR PROGRAMA
// =====================================================================
// Por qué existe: el bulk upsert por `id` fallaba de varias formas a la vez
//   - ids locales con prefijo de texto (`comp_...`, `rap_...`) en una
//     columna UUID → Postgres rechaza el lote COMPLETO por una sola fila;
//   - cada recarga del Excel genera ids nuevos para las mismas
//     competencias → choque con la restricción única de `codigo`;
//   - quitar una competencia o RAP en la app nunca la borraba en Supabase.
// La app siempre entrega la lista COMPLETA del catálogo, así que lo más
// fiel es: para cada programa afectado, borrar lo que había y volver a
// insertar exactamente lo que hay en la app. Se hace en orden (await) y
// devuelve el primer error real para que la app lo pueda mostrar.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function esUuidValido(id?: string | null): boolean {
  return !!id && UUID_RE.test(id);
}

const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function competenciaAPayload(c: Competencia) {
  return {
    id: esUuidValido(c.id) ? c.id : generarUuid(),
    programa_codigo: c.programaCodigo || null,
    codigo: c.codigo,
    denominacion: c.denominacion || c.codigo,
    horas_estimadas: numOrNull(c.horasEstimadas) ?? 0,
    horas_trabajo_directo: numOrNull(c.horasTrabajoDirecto),
    horas_trabajo_autonomo: numOrNull(c.horasTrabajoAutonomo),
    horas_ejecutadas: numOrNull(c.horasEjecutadas),
    tipo: c.tipo || null,
    fase_sugerida: c.faseSugerida || null,
    especialidad_tematica_id: c.especialidadTematicaId || null,
    especialidad_tematica_nombre: c.especialidadTematicaNombre || null
  };
}

function rapAPayload(r: ResultadoAprendizaje) {
  return {
    id: esUuidValido(r.id) ? r.id : generarUuid(),
    programa_codigo: r.programaCodigo || null,
    codigo_rap: r.codigoRap,
    competencia_codigo: r.competenciaCodigo || null,
    competencia_denominacion: r.competenciaDenominacion || null,
    denominacion: r.denominacion || r.codigoRap,
    fase: r.fase || null,
    duracion_horas: numOrNull(r.duracionHoras),
    horas_trabajo_directo: numOrNull(r.horasTrabajoDirecto),
    horas_trabajo_autonomo: numOrNull(r.horasTrabajoAutonomo),
    tipo: r.tipo || null,
    actividades_aprendizaje: r.actividadesAprendizaje && r.actividadesAprendizaje.length > 0 ? r.actividadesAprendizaje : null,
    actividades_proyecto: r.actividadesProyecto && r.actividadesProyecto.length > 0 ? r.actividadesProyecto : null,
    detalles_actividades: r.detallesActividades && r.detallesActividades.length > 0 ? r.detallesActividades : null
  };
}

async function insertarEnLotes(tabla: string, filas: any[], tamLote = 400): Promise<string | null> {
  for (let i = 0; i < filas.length; i += tamLote) {
    const { error } = await supabase.from(tabla).insert(filas.slice(i, i + tamLote));
    if (error) return `${tabla}: ${error.message}${error.details ? ` (${error.details})` : ''}${error.hint ? ` — ${error.hint}` : ''}`;
  }
  return null;
}

export async function reemplazarCatalogoProgramasEnSupabase(
  programasAfectados: (string | null)[],
  competencias: Competencia[],
  raps: ResultadoAprendizaje[]
): Promise<SyncResult<{ competencias: number; raps: number }>> {
  if (!isSupabaseConfigured) return { success: false, error: 'Supabase no configurado' };
  try {
    const programas = Array.from(new Set(programasAfectados.map(p => p || null)));
    const perteneceAAfectado = (p?: string | null) => programas.includes(p || null);

    // 1. Borrar lo anterior de cada programa afectado (RAPs primero).
    for (const prog of programas) {
      for (const tabla of ['resultados_aprendizaje', 'competencias']) {
        const base = supabase.from(tabla).delete();
        const { error } = prog ? await base.eq('programa_codigo', prog) : await base.is('programa_codigo', null);
        if (error) {
          const isRls = error.code === '42501' || error.message?.toLowerCase().includes('row-level security') || error.message?.toLowerCase().includes('permission denied');
          return { success: false, error: `${tabla} (borrado previo): ${error.message}`, isRlsError: isRls };
        }
      }
    }

    // 2. Insertar exactamente lo que tiene la app para esos programas.
    // Competencias: sin duplicar (programa, código) dentro del mismo lote.
    const vistos = new Set<string>();
    const filasComp = competencias
      .filter(c => perteneceAAfectado(c.programaCodigo))
      .filter(c => {
        const k = `${c.programaCodigo || ''}|${c.codigo}`;
        if (vistos.has(k)) return false;
        vistos.add(k);
        return true;
      })
      .map(competenciaAPayload);
    const filasRaps = raps.filter(r => perteneceAAfectado(r.programaCodigo)).map(rapAPayload);

    const errComp = await insertarEnLotes('competencias', filasComp);
    if (errComp) return { success: false, error: errComp, isRlsError: errComp.toLowerCase().includes('row-level security') || errComp.toLowerCase().includes('permission denied') };

    const errRaps = await insertarEnLotes('resultados_aprendizaje', filasRaps);
    if (errRaps) return { success: false, error: errRaps, isRlsError: errRaps.toLowerCase().includes('row-level security') || errRaps.toLowerCase().includes('permission denied') };

    return { success: true, data: { competencias: filasComp.length, raps: filasRaps.length } };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error desconocido de red al contactar Supabase.' };
  }
}

// =====================================================================
// SERVICIO DE BLOQUES DE HORARIO (Matriz de Horarios)
// =====================================================================
// Mismo caso: antes solo vivía en localStorage — dos personas en equipos
// distintos programando horarios para la misma ficha no se veían entre sí,
// y la Matriz completa "desaparecía" al ver la app desde otra URL/puerto.

export async function fetchHorariosFromSupabase(): Promise<BloqueHorario[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('bloques_horarios')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Error al consultar bloques_horarios en Supabase:', error.message);
      return [];
    }
    if (!data || data.length === 0) return [];

    return data.map((row: any): BloqueHorario => ({
      id: row.id,
      fichaId: row.ficha_id,
      diaSemana: row.dia_semana,
      franja: row.franja,
      ambiente: row.ambiente,
      instructorId: row.instructor_id || undefined,
      instructorNombre: row.instructor_nombre || undefined,
      vacante: Boolean(row.vacante) || !row.instructor_id,
      rapCodigo: row.rap_codigo,
      rapTitulo: row.rap_titulo,
      competenciaCodigo: row.competencia_codigo,
      competenciaNombre: row.competencia_nombre || undefined,
      rapsAsignados: Array.isArray(row.raps_asignados) ? row.raps_asignados : undefined,
      esCompetenciaCompleta: Boolean(row.es_competencia_completa),
      duracionHoras: Number(row.duracion_horas || 0),
      fechaCorteInicio: row.fecha_corte_inicio,
      fechaCorteFin: row.fecha_corte_fin,
      trimestre: row.trimestre
    }));
  } catch (err: any) {
    console.error('Excepción al consultar bloques_horarios en Supabase:', err);
    return [];
  }
}

function bloqueASupabasePayload(bloque: BloqueHorario) {
  // Valores de respaldo para las columnas NOT NULL: un undefined se envía
  // como null y Postgres rechaza el bloque completo.
  return {
    id: bloque.id,
    ficha_id: bloque.fichaId,
    instructor_id: bloque.instructorId || null,
    instructor_nombre: bloque.instructorId ? (bloque.instructorNombre || null) : null,
    dia_semana: bloque.diaSemana,
    franja: bloque.franja,
    ambiente: bloque.ambiente || 'Ambiente Principal',
    rap_codigo: bloque.rapCodigo || '',
    rap_titulo: bloque.rapTitulo || bloque.rapCodigo || '',
    competencia_codigo: bloque.competenciaCodigo || '',
    competencia_nombre: bloque.competenciaNombre || null,
    raps_asignados: bloque.rapsAsignados && bloque.rapsAsignados.length > 0 ? bloque.rapsAsignados : null,
    es_competencia_completa: Boolean(bloque.esCompetenciaCompleta),
    vacante: Boolean(bloque.vacante) || !bloque.instructorId,
    duracion_horas: Math.max(1, Math.round(Number(bloque.duracionHoras) || 3)),
    trimestre: bloque.trimestre || 'Sin trimestre',
    fecha_corte_inicio: bloque.fechaCorteInicio || new Date().toISOString().slice(0, 10),
    fecha_corte_fin: bloque.fechaCorteFin || bloque.fechaCorteInicio || new Date().toISOString().slice(0, 10)
  };
}

/** Traduce los errores de Postgres más comunes de bloques a algo entendible. */
function explicarErrorBloque(error: { code?: string; message?: string; details?: string | null }): string {
  const msg = error.message || '';
  if (error.code === '23505') {
    if (msg.includes('instructor')) return 'El instructor ya tiene otra clase ese mismo día y franja en ese trimestre (en esta u otra ficha).';
    if (msg.includes('ficha')) return 'La ficha ya tiene otro bloque ese mismo día y franja en ese trimestre.';
    if (msg.includes('ambiente')) return 'El ambiente ya está ocupado ese mismo día y franja en ese trimestre por otra ficha.';
    return `Ya existe un bloque que choca con este (${msg}).`;
  }
  if (error.code === '23503') {
    if (msg.includes('ficha')) return 'La ficha de este bloque no existe en Supabase (se creó solo en este navegador). Edita y guarda la ficha para que se suba, y vuelve a intentarlo.';
    if (msg.includes('instructor')) return 'El instructor de este bloque no existe en Supabase (se creó solo en este navegador). Edítalo y guárdalo para que se suba, y vuelve a intentarlo.';
  }
  if (error.code === 'PGRST204') return `${msg}. Corre en Supabase el script 20260929d_reparar_bloques_horarios.sql.`;
  return msg + (error.details ? ` (${error.details})` : '');
}

export async function insertHorarioInSupabase(bloque: BloqueHorario): Promise<SyncResult<any>> {
  if (!isSupabaseConfigured) return { success: false, error: 'Supabase no configurado' };
  try {
    const { data, error } = await supabase
      .from('bloques_horarios')
      .upsert([bloqueASupabasePayload(bloque)], { onConflict: 'id' })
      .select();

    if (error) {
      const isRls = error.code === '42501' || error.message?.toLowerCase().includes('row-level security');
      return { success: false, error: explicarErrorBloque(error), isRlsError: isRls };
    }
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error desconocido de red al contactar Supabase.' };
  }
}

export async function updateHorarioInSupabase(bloque: BloqueHorario): Promise<SyncResult<any>> {
  if (!isSupabaseConfigured) return { success: false, error: 'Supabase no configurado' };
  try {
    const { data, error } = await supabase
      .from('bloques_horarios')
      // upsert en vez de update: si el bloque nunca había llegado a Supabase
      // (por el error de la columna instructor_nombre), se crea ahora.
      .upsert([bloqueASupabasePayload(bloque)], { onConflict: 'id' })
      .select();

    if (error) {
      const isRls = error.code === '42501' || error.message?.toLowerCase().includes('row-level security');
      return { success: false, error: explicarErrorBloque(error), isRlsError: isRls };
    }
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error desconocido de red al contactar Supabase.' };
  }
}

export async function deleteHorarioFromSupabase(id: string): Promise<SyncResult<any>> {
  if (!isSupabaseConfigured) return { success: false, error: 'Supabase no configurado' };
  try {
    const { data, error } = await supabase.from('bloques_horarios').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// =====================================================================
// SERVICIO DE USUARIOS (Cuentas de Acceso)
// =====================================================================
// Antes de esto, los usuarios (login) SOLO vivían en localStorage —
// causa muy probable del "no me está tomando el usuario con el correo
// que le registré" reportado antes en esta conversación: el usuario se
// crea bien en el navegador del Administrador, pero nunca llega a
// Supabase, así que cualquier otro navegador/dispositivo no lo conoce.
// La CLAVE nunca se sincroniza — no hay columna para eso en la tabla
// (es un dato sensible que este sistema no maneja del lado del
// servidor); sigue viviendo solo en localStorage, como hasta ahora.
// El emparejamiento con Supabase se hace por `correo` (UNIQUE en la
// tabla), no por `id`, porque el id local histórico de un usuario
// vinculado a un instructor tiene formato `usr_<idInstructor>` (no es un
// UUID válido) — usar `correo` evita ese problema sin tener que tocar esa
// convención en el resto del código.

export async function fetchUsuariosFromSupabase(): Promise<User[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .order('nombre_completo', { ascending: true });

    if (error) {
      console.warn('Error al consultar usuarios en Supabase:', error.message);
      return [];
    }
    if (!data || data.length === 0) return [];

    return data.map((row: any): User => ({
      id: row.id,
      correo: row.correo,
      nombre_completo: row.nombre_completo,
      rol: row.rol,
      cargo: row.cargo,
      avatar: row.avatar_url || undefined,
      claveHash: row.clave_hash || undefined
      // clave (texto plano): NUNCA viene de Supabase — se preserva la local al fusionar.
    }));
  } catch (err: any) {
    console.error('Excepción al consultar usuarios en Supabase:', err);
    return [];
  }
}

export async function upsertUsuarioInSupabase(usuario: User, correoAnterior?: string): Promise<SyncResult<any>> {
  if (!isSupabaseConfigured) return { success: false, error: 'Supabase no configurado' };
  try {
    const correoNuevo = usuario.correo.trim().toLowerCase();
    const payload: any = {
      correo: correoNuevo,
      nombre_completo: usuario.nombre_completo,
      rol: usuario.rol,
      cargo: usuario.cargo || 'Sin cargo asignado',
      avatar_url: usuario.avatar || null
    };
    // La clave en texto plano (usuario.clave) NUNCA se envía a Supabase. Si
    // viene presente (se está creando el usuario o se le está cambiando la
    // clave), se sube solo su HASH bcrypt — de una sola vía, no reversible —
    // para que el login pueda validarla también desde otro navegador/equipo.
    // Si no viene (p.ej. solo se está corrigiendo el correo), no se toca la
    // columna clave_hash existente.
    if (usuario.clave) {
      payload.clave_hash = bcrypt.hashSync(usuario.clave, 10);
    }

    // Si el correo cambió, se actualiza la fila existente (buscada por el
    // correo ANTERIOR) para no dejar una fila duplicada con el correo viejo.
    if (correoAnterior && correoAnterior.trim().toLowerCase() !== correoNuevo) {
      const { data, error } = await supabase
        .from('usuarios')
        .update(payload)
        .eq('correo', correoAnterior.trim().toLowerCase())
        .select();

      if (error) {
        const isRls = error.code === '42501' || error.message?.toLowerCase().includes('row-level security');
        return { success: false, error: error.message, isRlsError: isRls };
      }
      if (data && data.length > 0) return { success: true, data };
      // No había fila previa con ese correo (p.ej. nunca llegó a subirse) — se inserta.
    }

    const { data, error } = await supabase
      .from('usuarios')
      .upsert([payload], { onConflict: 'correo' })
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

export async function deleteUsuarioFromSupabase(correo: string): Promise<SyncResult<any>> {
  if (!isSupabaseConfigured) return { success: false, error: 'Supabase no configurado' };
  try {
    const { data, error } = await supabase.from('usuarios').delete().eq('correo', correo.trim().toLowerCase());
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// =====================================================================
// SERVICIO DE PROGRAMAS DE FORMACIÓN (catálogo — public.programas_formacion)
// =====================================================================

export async function fetchProgramasFromSupabase(): Promise<ProgramaFormacion[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase.from('programas_formacion').select('*').order('nombre', { ascending: true });
    if (error) {
      console.warn('Error al consultar programas de formación en Supabase:', error.message);
      return [];
    }
    if (!data || data.length === 0) return [];
    return data.map((row: any): ProgramaFormacion => ({
      id: row.id,
      codigo: row.codigo,
      nombre: row.nombre,
      version: row.version || '',
      nivelFormacion: row.nivel_formacion || 'Tecnólogo',
      lineaTecnologica: row.linea_tecnologica || '',
      redConocimiento: row.red_conocimiento || '',
      duracionLectivaHoras: row.duracion_lectiva_horas || 0,
      duracionProductivaHoras: row.duracion_productiva_horas || 0,
      duracionTotalHoras: row.duracion_total_horas || 0,
      estado: row.estado || 'ACTIVO',
      descripcion: row.descripcion || undefined
    }));
  } catch (err: any) {
    console.error('Excepción al consultar programas de formación en Supabase:', err);
    return [];
  }
}

export async function upsertProgramaInSupabase(programa: ProgramaFormacion): Promise<SyncResult<any>> {
  if (!isSupabaseConfigured) return { success: false, error: 'Supabase no configurado' };
  try {
    const payload = {
      id: programa.id,
      codigo: programa.codigo,
      nombre: programa.nombre,
      version: programa.version,
      nivel_formacion: programa.nivelFormacion,
      linea_tecnologica: programa.lineaTecnologica,
      red_conocimiento: programa.redConocimiento,
      duracion_lectiva_horas: programa.duracionLectivaHoras,
      duracion_productiva_horas: programa.duracionProductivaHoras,
      duracion_total_horas: programa.duracionTotalHoras,
      estado: programa.estado,
      descripcion: programa.descripcion || null
    };
    const { data, error } = await supabase.from('programas_formacion').upsert([payload], { onConflict: 'id' }).select();
    if (error) {
      const isRls = error.code === '42501' || error.message?.toLowerCase().includes('row-level security');
      return { success: false, error: error.message, isRlsError: isRls };
    }
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteProgramaFromSupabase(id: string): Promise<SyncResult<any>> {
  if (!isSupabaseConfigured) return { success: false, error: 'Supabase no configurado' };
  try {
    const { data, error } = await supabase.from('programas_formacion').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// =====================================================================
// SERVICIO DE ESPECIALIDADES TEMÁTICAS (public.especialidades_tematicas)
// =====================================================================

export async function fetchEspecialidadesFromSupabase(): Promise<EspecialidadTematica[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase.from('especialidades_tematicas').select('*').order('nombre', { ascending: true });
    if (error) {
      console.warn('Error al consultar especialidades temáticas en Supabase:', error.message);
      return [];
    }
    if (!data || data.length === 0) return [];
    return data.map((row: any): EspecialidadTematica => ({
      id: row.id,
      nombre: row.nombre,
      area: row.area,
      colorTag: row.color_tag || '',
      descripcion: row.descripcion || undefined,
      competenciasAsociadasCodigos: Array.isArray(row.competencias_asociadas_codigos) ? row.competencias_asociadas_codigos : [],
      origen: row.origen || 'MANUAL',
      estado: row.estado || 'ACTIVA'
    }));
  } catch (err: any) {
    console.error('Excepción al consultar especialidades temáticas en Supabase:', err);
    return [];
  }
}

export async function upsertEspecialidadInSupabase(esp: EspecialidadTematica): Promise<SyncResult<any>> {
  if (!isSupabaseConfigured) return { success: false, error: 'Supabase no configurado' };
  try {
    const payload = {
      id: esp.id,
      nombre: esp.nombre,
      area: esp.area,
      color_tag: esp.colorTag,
      descripcion: esp.descripcion || null,
      competencias_asociadas_codigos: esp.competenciasAsociadasCodigos || [],
      origen: esp.origen,
      estado: esp.estado
    };
    const { data, error } = await supabase.from('especialidades_tematicas').upsert([payload], { onConflict: 'id' }).select();
    if (error) {
      const isRls = error.code === '42501' || error.message?.toLowerCase().includes('row-level security');
      return { success: false, error: error.message, isRlsError: isRls };
    }
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteEspecialidadFromSupabase(id: string): Promise<SyncResult<any>> {
  if (!isSupabaseConfigured) return { success: false, error: 'Supabase no configurado' };
  try {
    const { data, error } = await supabase.from('especialidades_tematicas').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// =====================================================================
// SERVICIO DE TRIMESTRES DE CALENDARIO (public.trimestres_calendario)
// =====================================================================

export async function fetchTrimestresFromSupabase(): Promise<TrimestreCalendario[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase.from('trimestres_calendario').select('*').order('fecha_inicio', { ascending: true });
    if (error) {
      console.warn('Error al consultar trimestres de calendario en Supabase:', error.message);
      return [];
    }
    if (!data || data.length === 0) return [];
    return data.map((row: any): TrimestreCalendario => ({
      id: row.id,
      nombre: row.nombre,
      fechaInicio: row.fecha_inicio,
      fechaFin: row.fecha_fin
    }));
  } catch (err: any) {
    console.error('Excepción al consultar trimestres de calendario en Supabase:', err);
    return [];
  }
}

export async function upsertTrimestreInSupabase(t: TrimestreCalendario): Promise<SyncResult<any>> {
  if (!isSupabaseConfigured) return { success: false, error: 'Supabase no configurado' };
  try {
    const payload = {
      id: t.id,
      nombre: t.nombre,
      fecha_inicio: t.fechaInicio,
      fecha_fin: t.fechaFin
    };
    const { data, error } = await supabase.from('trimestres_calendario').upsert([payload], { onConflict: 'id' }).select();
    if (error) {
      const isRls = error.code === '42501' || error.message?.toLowerCase().includes('row-level security');
      return { success: false, error: error.message, isRlsError: isRls };
    }
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteTrimestreFromSupabase(id: string): Promise<SyncResult<any>> {
  if (!isSupabaseConfigured) return { success: false, error: 'Supabase no configurado' };
  try {
    const { data, error } = await supabase.from('trimestres_calendario').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// =====================================================================
// SERVICIO DE ARCHIVO DE SEGUIMIENTO — REGISTROS GRANULARES
// (public.archivo_seguimiento_registros)
// =====================================================================

export async function fetchArchivoSeguimientoFromSupabase(): Promise<RegistroArchivoSeguimiento[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase.from('archivo_seguimiento_registros').select('*');
    if (error) {
      console.warn('Error al consultar el archivo de seguimiento en Supabase:', error.message);
      return [];
    }
    if (!data || data.length === 0) return [];
    return data.map((row: any): RegistroArchivoSeguimiento => ({
      id: row.id,
      programaCodigo: row.programa_codigo,
      fase: row.fase || '',
      actividadProyecto: row.actividad_proyecto || '',
      competenciaCodigo: row.competencia_codigo || '',
      competenciaDenominacion: row.competencia_denominacion || '',
      rapCodigo: row.rap_codigo || '',
      rapDenominacion: row.rap_denominacion || '',
      actividadAprendizaje: row.actividad_aprendizaje || '',
      horasTrabajoDirecto: Number(row.horas_trabajo_directo) || 0,
      horasTrabajoIndependiente: Number(row.horas_trabajo_independiente) || 0,
      horasTotales: Number(row.horas_totales) || 0,
      fechaRegistro: row.fecha_registro || undefined
    }));
  } catch (err: any) {
    console.error('Excepción al consultar el archivo de seguimiento en Supabase:', err);
    return [];
  }
}

export async function bulkUpsertArchivoSeguimientoInSupabase(items: RegistroArchivoSeguimiento[]): Promise<SyncResult<any>> {
  if (!isSupabaseConfigured) return { success: false, error: 'Supabase no configurado' };
  if (!items || items.length === 0) return { success: true };
  try {
    const payload = items.map(r => ({
      id: r.id,
      programa_codigo: r.programaCodigo,
      fase: r.fase,
      actividad_proyecto: r.actividadProyecto,
      competencia_codigo: r.competenciaCodigo,
      competencia_denominacion: r.competenciaDenominacion,
      rap_codigo: r.rapCodigo,
      rap_denominacion: r.rapDenominacion,
      actividad_aprendizaje: r.actividadAprendizaje,
      horas_trabajo_directo: r.horasTrabajoDirecto,
      horas_trabajo_independiente: r.horasTrabajoIndependiente,
      horas_totales: r.horasTotales
    }));
    const { data, error } = await supabase.from('archivo_seguimiento_registros').upsert(payload, { onConflict: 'id' }).select();
    if (error) {
      const isRls = error.code === '42501' || error.message?.toLowerCase().includes('row-level security');
      return { success: false, error: error.message, isRlsError: isRls };
    }
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteArchivoSeguimientoByProgramaFromSupabase(programaCodigo: string): Promise<SyncResult<any>> {
  if (!isSupabaseConfigured) return { success: false, error: 'Supabase no configurado' };
  try {
    const { data, error } = await supabase.from('archivo_seguimiento_registros').delete().eq('programa_codigo', programaCodigo);
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteAllArchivoSeguimientoFromSupabase(): Promise<SyncResult<any>> {
  if (!isSupabaseConfigured) return { success: false, error: 'Supabase no configurado' };
  try {
    const { data, error } = await supabase.from('archivo_seguimiento_registros').delete().not('id', 'is', null);
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// =====================================================================
// SERVICIO DE AUDITORÍA DE INGESTAS (public.auditoria_ingestas — la tabla ya
// existía desde el esquema inicial, pero nunca se usaba desde el código).
// =====================================================================

export async function fetchAuditoriaIngestasFromSupabase(): Promise<AuditoriaIngesta[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('auditoria_ingestas')
      .select('*')
      .order('fecha_hora', { ascending: false })
      .limit(200);
    if (error) {
      console.warn('Error al consultar auditoría de ingestas en Supabase:', error.message);
      return [];
    }
    if (!data || data.length === 0) return [];
    return data.map((row: any): AuditoriaIngesta => ({
      id: row.id,
      fechaHora: row.fecha_hora,
      archivoNombre: row.archivo_nombre,
      tipoPlantilla: row.tipo_plantilla,
      moduloDestino: row.modulo_destino,
      registrosProcesados: row.registros_procesados || 0,
      operadorNombre: row.operador_nombre,
      operadorRol: row.operador_rol,
      estado: row.estado || 'Integrado con Éxito',
      detallesForwardFill: row.detalles_forward_fill || undefined
    }));
  } catch (err: any) {
    console.error('Excepción al consultar auditoría de ingestas en Supabase:', err);
    return [];
  }
}

// Fire-and-forget, igual que logSistemaEnSupabase: el id local (`ing_...`)
// no es un UUID, así que aquí se deja que Supabase genere su propio id — no
// se sincroniza de vuelta al estado local (igual que la auditoría de
// ingesta ya se trataba antes: es un registro de trazabilidad, no un dato
// operativo que se edite después).
export async function insertAuditoriaIngestaInSupabase(a: AuditoriaIngesta): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from('auditoria_ingestas').insert([{
      archivo_nombre: a.archivoNombre,
      tipo_plantilla: a.tipoPlantilla,
      modulo_destino: a.moduloDestino,
      registros_procesados: a.registrosProcesados,
      detalles_forward_fill: a.detallesForwardFill || 0,
      operador_nombre: a.operadorNombre,
      operador_rol: a.operadorRol,
      estado: a.estado
    }]);
  } catch {
    // Registro tolerante a fallos: la auditoría nunca debe bloquear la acción real del usuario.
  }
}



// =====================================================================
// HORAS POR COMPETENCIA DE CADA FICHA (public.horas_ejecutadas_ficha)
// Viene del "Reporte de Instructores por Ficha" de SofiaPlus. Cada cargue
// REEMPLAZA lo anterior de esa ficha (el reporte es acumulado, no suma).
// =====================================================================

export async function fetchHorasEjecutadasFromSupabase(): Promise<RegistroHorasEjecutadas[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase.from('horas_ejecutadas_ficha').select('*');
    if (error) {
      console.warn('Error al consultar horas ejecutadas en Supabase:', error.message);
      return [];
    }
    return (data || []).map((row: any): RegistroHorasEjecutadas => ({
      id: row.id,
      fichaNumero: row.ficha_numero,
      competenciaCodigo: row.competencia_codigo,
      competenciaDenominacion: row.competencia_denominacion || undefined,
      instructorNombre: row.instructor_nombre || '',
      horasEjecutadas: Number(row.horas_ejecutadas) || 0,
      horasProgramadas: row.horas_programadas != null ? Number(row.horas_programadas) : undefined,
      fechaInicio: row.fecha_inicio || undefined,
      fechaFin: row.fecha_fin || undefined,
      periodo: row.periodo || undefined,
      fechaRegistro: row.fecha_registro || undefined
    }));
  } catch (err: any) {
    console.error('Excepción al consultar horas ejecutadas en Supabase:', err);
    return [];
  }
}

export async function reemplazarHorasFichaEnSupabase(fichaNumero: string, registros: RegistroHorasEjecutadas[]): Promise<SyncResult<number>> {
  if (!isSupabaseConfigured) return { success: false, error: 'Supabase no configurado' };
  try {
    const { error: errDel } = await supabase.from('horas_ejecutadas_ficha').delete().eq('ficha_numero', fichaNumero);
    if (errDel) return { success: false, error: `horas_ejecutadas_ficha (borrado previo): ${errDel.message}` };
    if (registros.length === 0) return { success: true, data: 0 };
    const filas = registros.map(r => ({
      id: r.id,
      ficha_numero: fichaNumero,
      competencia_codigo: r.competenciaCodigo,
      competencia_denominacion: r.competenciaDenominacion || null,
      instructor_nombre: r.instructorNombre || null,
      horas_programadas: r.horasProgramadas ?? null,
      horas_ejecutadas: r.horasEjecutadas,
      fecha_inicio: r.fechaInicio || null,
      fecha_fin: r.fechaFin || null,
      periodo: r.periodo || null,
      fecha_registro: r.fechaRegistro || new Date().toISOString()
    }));
    const { error } = await supabase.from('horas_ejecutadas_ficha').insert(filas);
    if (error) return { success: false, error: `horas_ejecutadas_ficha: ${error.message}${error.details ? ` (${error.details})` : ''}` };
    return { success: true, data: filas.length };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
