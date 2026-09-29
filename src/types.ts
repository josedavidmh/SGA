export type UserRole = 'ADMINISTRADOR' | 'COORDINADOR' | 'INSTRUCTOR_LIDER' | 'AUXILIAR';

export interface User {
  id: string;
  correo: string;
  clave?: string;
  nombre_completo: string;
  rol: UserRole;
  cargo: string;
  avatar?: string;
  fichaAsignadaId?: string; // Para Instructor Líder
}

export interface RegionalCentro {
  regional: string;
  centro: string;
  codigoCentro: string;
  sede: string;
}

export interface ProgramaFormacion {
  id: string;
  codigo: string;
  nombre: string;
  version: string;
  nivelFormacion: 'Auxiliar' | 'Técnico' | 'Tecnólogo';
  lineaTecnologica: string;
  redConocimiento: string;
  duracionLectivaHoras: number;
  duracionProductivaHoras: number;
  duracionTotalHoras: number;
  estado: 'ACTIVO' | 'EN_REVISION' | 'INACTIVO';
  descripcion?: string;
  fichasAsociadasCount?: number;
}

export interface Ficha {
  id: string;
  numero_ficha: string;
  programaCodigo: string;
  programaNombre: string;
  version: string;
  nivelFormacion: 'Auxiliar' | 'Técnico' | 'Tecnólogo';
  instructorLiderId: string;
  instructorLiderNombre: string;
  instructorLiderEmail: string;
  modalidad: 'Presencial Diurna' | 'Presencial Nocturna' | 'Mixta / Virtual';
  ambientePrincipal: string;
  periodoLectivo: string;
  fechaInicio: string;
  fechaFin: string;
  matriculaInicial: number;
  aprendicesActivos: number;
  aprendicesCulminados?: number;
  aprendicesCancelados?: number;
  aprendicesAplazados?: number;
  aprendicesRetiroVoluntario?: number;
  aprendicesCondicionados?: number;
  aprendicesTrasladados?: number;
  tasaRetencion?: number;
  tasaDesercion?: number;
  estado: 'ACTIVA' | 'POR_CERRAR' | 'CERRADA';
  progresoCurricular: number; // porcentaje 0-100
  rapsTotales: number;
  rapsEvaluados: number;
  horasDirectasTotales: number;
  horasIndependientesTotales: number;
  horasEjecutadas: number;
}

export interface HistorialEvaluacionInstructor {
  competenciaCodigo?: string;
  competenciaDenominacion?: string;
  rapCodigo?: string;
  rapDenominacion?: string;
  totalJuicios: number;
  ultimaFecha?: string;
}

export interface Instructor {
  id: string;
  documento: string;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  email: string;
  perfilTecnico: string;
  especialidad: string;
  colorAvatar: string;
  horasSemanalesAsignadas: number;
  maxHorasSemanales: number;
  telefono?: string;
  estado: 'ACTIVO' | 'INACTIVO';
  competenciasExperiencia?: string[]; // Códigos o nombres de competencias
  rapsExperiencia?: string[]; // Códigos de RAPs
  totalJuiciosEvaluados?: number;
  historialEvaluaciones?: HistorialEvaluacionInstructor[];
}

export type TipoCompetencia = 'Técnica' | 'Transversal' | 'Bilingüismo' | 'Clave' | 'Básica';

export interface EspecialidadTematica {
  id: string;
  nombre: string; // e.g. "Programación de Software", "Bases de Datos", "Inglés", "Ética y Paz", "Matemáticas", "Física", "SST y Ambiental", "Emprendimiento", "Investigación", "Comunicación"
  area: 'Técnica' | 'Transversal' | 'Clave' | 'Básica';
  colorTag: string; // Tailwind styling or hex
  descripcion?: string;
  competenciasAsociadasCodigos: string[]; // Códigos de competencias asignadas
  origen: 'AUTOMATICO_PLANEACION' | 'MANUAL';
  estado: 'ACTIVA' | 'INACTIVA';
}

export interface AmbienteAprendizaje {
  id: string;
  nombre: string;
  codigo: string;
  tipo: 'Ambiente TIC' | 'Laboratorio' | 'Taller' | 'Auditorio' | 'Virtual';
  sede: string;
  capacidadAprendices: number;
  equipamiento?: string;
  estado: 'DISPONIBLE' | 'EN_MANTENIMIENTO' | 'OCUPADO';
}

export interface Competencia {
  id: string;
  programaCodigo: string;
  codigo: string;
  denominacion: string;
  horasEstimadas: number;
  horasTrabajoDirecto?: number;
  horasTrabajoAutonomo?: number;
  horasEjecutadas?: number;
  tipo: TipoCompetencia;
  faseSugerida?: string;
  especialidadTematicaId?: string;
  especialidadTematicaNombre?: string;
}

export interface RegistroHorasEjecutadas {
  id: string;
  instructorDocumento?: string;
  instructorNombre: string;
  competenciaCodigo: string;
  competenciaDenominacion?: string;
  fichaNumero?: string;
  horasEjecutadas: number;
  periodo?: string;
  fechaRegistro?: string;
  observaciones?: string;
}

export interface ResultadoAprendizaje {
  id: string;
  programaCodigo?: string;
  codigoRap: string;
  competenciaCodigo: string;
  competenciaDenominacion?: string;
  denominacion: string;
  fase: 'Fase 1: Análisis' | 'Fase 2: Planeación' | 'Fase 3: Ejecución' | 'Fase 4: Evaluación' | string;
  duracionHoras?: number;
  horasTrabajoDirecto?: number;
  horasTrabajoAutonomo?: number;
  tipo?: TipoCompetencia;
  actividadesAprendizaje?: string[];
  actividadesProyecto?: string[];
  detallesActividades?: {
    actividadAprendizaje: string;
    actividadProyecto?: string;
    horasDirectas?: number;
    horasIndependientes?: number;
  }[];
}

/**
 * Registro granular de cada fila cargada en el Archivo de Seguimiento
 * Almacena la relación Fase - Actividad de Proyecto - Competencia - RAP - Actividad de Aprendizaje - Horas
 * para futuros cruces de información con horarios, juicios evaluativos y horas ejecutadas.
 */
export interface RegistroArchivoSeguimiento {
  id: string;
  programaCodigo: string;
  fase: string;
  actividadProyecto: string;
  competenciaCodigo: string;
  competenciaDenominacion: string;
  rapCodigo: string;
  rapDenominacion: string;
  actividadAprendizaje: string;
  horasTrabajoDirecto: number;
  horasTrabajoIndependiente: number;
  horasTotales: number;
  fechaRegistro?: string;
}

export interface ValidacionSobrescrituraPlaneacion {
  esSobrescritura: boolean;
  puedeSobrescribir: boolean;
  bloqueado: boolean;
  motivosBloqueo: string[];
  detallesTrabajoPrevio: {
    totalHorarios: number;
    totalHorasEjecutadas: number;
    totalSeguimientos: number;
    totalFichasConAvance: number;
  };
  mensaje: string;
  sugerencia?: string;
}

export interface ResumenCarguePlaneacion {
  totalCompetencias: number;
  competenciasTecnicas: Competencia[];
  competenciasTransversales: Competencia[];
  competenciasClave: Competencia[];
  totalRaps: number;
  rapsTecnicos: ResultadoAprendizaje[];
  rapsTransversales: ResultadoAprendizaje[];
  rapsClave: ResultadoAprendizaje[];
  horasTrabajoDirecto: number;
  horasTrabajoAutonomo: number;
  horasTotales: number;
  validacionSobrescritura: ValidacionSobrescrituraPlaneacion;
}

/**
 * Estado individual de un RAP dentro del seguimiento curricular.
 * - PENDIENTE: aún no se ha iniciado (blanco)
 * - EN_EJECUCION: el instructor ya fue programado en horario (naranja)
 * - CALIFICADO: el juicio evaluativo fue aprobado en SofiaPlus (verde)
 * - SIN_CALIFICAR: el juicio evaluativo existe pero NO está aprobado (rojo)
 */
export type EstadoRap = 'PENDIENTE' | 'EN_EJECUCION' | 'CALIFICADO' | 'SIN_CALIFICAR';

/**
 * Registro histórico de un instructor que ya pasó por un RAP/competencia en
 * un trimestre determinado (reemplazo, fin de contrato, o liberado a
 * "vacante" desde Horarios). Al reasignar o vaciar un RAP nunca se borra su
 * paso — se cierra aquí con fechaFin, para poder demostrar que SÍ estuvo
 * cubierto por ese instructor durante ese periodo aunque hoy lo cubra otro.
 */
export interface HistorialInstructorRap {
  instructorId?: string;
  instructorNombre: string;
  trimestre?: string;
  fechaFin: string;
  motivo: 'REEMPLAZO' | 'VACANTE_HORARIO' | 'FIN_HORARIO' | 'MANUAL';
}

/** Registro de seguimiento por RAP individual (por ficha) */
export interface RapSeguimiento {
  id: string;
  fichaId: string;
  fichaNumero: string;
  programaCodigo: string;
  competenciaCodigo: string;
  competenciaDenominacion: string;
  rapCodigo: string;
  rapDenominacion: string;
  instructorId?: string;
  instructorNombre?: string;
  estado: EstadoRap;
  fuenteInstructor?: 'MANUAL' | 'HORARIO' | 'JUICIOS';
  fuenteEstado?: 'MANUAL' | 'JUICIOS';
  fechaActualizacion?: string;
  /** Instructores previos que ya cubrieron este RAP y fueron reemplazados o retirados. */
  historialInstructores?: HistorialInstructorRap[];
}

export type EstadoActividad = 'PENDIENTE' | 'EN EJECUCION' | 'CALIFICADO';

export interface ActividadSeguimiento {
  id: string;
  fichaId: string;
  fase: string;
  competenciaCodigo: string;
  competenciaDenominacion: string;
  rapCodigo: string;
  rapDenominacion: string;
  actividadAprendizaje: string;
  evidenciaCodigo: string;
  horasDirectas: number;
  horasIndependientes: number;
  instructorId: string;
  instructorNombre: string;
  estado: EstadoActividad;
  observaciones?: string;
  fechaUltimaActualizacion?: string;
}

export type FranjaHorario = 
  | '06:00 - 09:00' // Mañana B1
  | '09:00 - 12:00' // Mañana B2
  | '13:00 - 16:00' // Tarde B1
  | '16:00 - 19:00'; // Tarde B2

export type DiaSemana = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado';

export interface AdvertenciaPerfilBloque {
  tieneAdvertencia: boolean;
  motivo: string;
  instructorPerfil?: string;
  competenciaTipo?: string;
  competenciaNombre?: string;
}

export interface BloqueHorario {
  id: string;
  fichaId: string;
  diaSemana: DiaSemana;
  franja: FranjaHorario;
  ambiente: string;
  // Opcionales: un bloque puede quedar programado (RAP/competencia + día +
  // franja) sin instructor todavía — "vacante" — para cubrirlo después sin
  // perder el espacio ya reservado en el horario.
  instructorId?: string;
  instructorNombre?: string;
  /** true cuando el bloque está programado pero sin instructor asignado. */
  vacante?: boolean;
  rapCodigo: string;
  rapTitulo: string;
  competenciaCodigo: string;
  competenciaNombre?: string;
  rapsAsignados?: { codigo: string; denominacion: string; horas?: number }[];
  esCompetenciaCompleta?: boolean;
  duracionHoras: number;
  fechaCorteInicio: string;
  fechaCorteFin: string;
  trimestre: string;
  advertenciaPerfil?: AdvertenciaPerfilBloque;
}

export interface ConflictoHorario {
  instructorId: string;
  instructorNombre: string;
  diaSemana: DiaSemana;
  franja: FranjaHorario;
  fichaOrigenNumero: string;
  fichaConflictoNumero: string;
  ambienteOrigen: string;
  ambienteConflicto: string;
}

export interface JuicioDetalle {
  id: string;
  competenciaCodigo?: string;
  competenciaDenominacion: string;
  rapCodigo?: string;
  rapDenominacion: string;
  estado: 'APROBADO' | 'POR EVALUAR' | 'NO APROBADO' | string;
  fechaEvaluacion?: string;
  funcionarioEvaluador?: string;
  funcionarioRegistro?: string;
}

export interface AprendizJuicio {
  id: string;
  fichaNumero: string;
  tipoDocumento: string;
  documento: string;
  nombres: string;
  apellidos: string;
  nombresApellidos: string;
  estadoMatricula: 'EN FORMACION' | 'CONDICIONADO' | 'CANCELADO' | 'RETIRO VOLUNTARIO' | string;
  totalJuicios: number;
  juiciosAprobados: number;
  juiciosPorEvaluar: number;
  porcentajeAvance: number;
  juicios: JuicioDetalle[];
}

/**
 * Fechas de corte oficiales de un trimestre (parametrización institucional,
 * independiente de la ficha). Sirve para poder elegir un trimestre por
 * nombre al descargar el Reporte de Eventos y mostrar su rango de fechas
 * oficial, sin depender únicamente de lo que ya haya en Horarios.
 */
export interface TrimestreCalendario {
  id: string;
  nombre: string; // ej: "I 2026"
  fechaInicio: string;
  fechaFin: string;
}

export interface MetadataReporteJuicios {
  fechaReporte: string;
  fichaNumero: string;
  programaCodigo: string;
  version: string;
  programaDenominacion: string;
  estadoFicha: string;
  fechaInicio: string;
  fechaFin: string;
  modalidad: string;
  regional: string;
  centroFormacion: string;
}

export interface ReporteJuiciosFicha {
  id: string;
  fichaNumero: string;
  fechaCargue: string;
  archivoNombre: string;
  metadata: MetadataReporteJuicios;
  totalRegistros: number;
  totalAprendices: number;
  aprendicesActivos: number;
  aprendicesRetiroVoluntario: number;
  aprendicesCancelados: number;
  aprendicesAplazados?: number;
  aprendicesCondicionados: number;
  aprendicesTrasladados?: number;
  aprendicesPorCertificar?: number;
  tasaRetencion?: number;
  tasaDesercion?: number;
  totalJuiciosAprobados: number;
  totalJuiciosPorEvaluar: number;
  porcentajeAprobacionFicha: number;
  competenciasEvaluadas: {
    nombre: string;
    totalJuicios: number;
    aprobados: number;
    porEvaluar: number;
    porcentaje: number;
  }[];
  aprendices: AprendizJuicio[];
}

export interface AuditoriaIngesta {
  id: string;
  fechaHora: string;
  archivoNombre: string;
  tipoPlantilla: 'Seguimiento Curricular' | 'Juicios Evaluativos' | 'Planeación Pedagógica' | 'Estructura de Horarios' | 'Horas Ejecutadas por Instructor';
  moduloDestino: string;
  registrosProcesados: number;
  operadorNombre: string;
  operadorRol: UserRole;
  estado: 'Integrado con Éxito' | 'Con Advertencias' | 'Rechazado';
  detallesAdvertencia?: string[];
  detallesForwardFill?: number;
}

export interface AuditoriaSistema {
  id: string;
  fechaHora: string;
  usuarioId: string;
  usuarioNombre: string;
  rol: UserRole;
  accion: string;
  modulo: string;
  ip: string;
  detalles: string;
}
