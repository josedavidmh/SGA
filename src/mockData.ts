import { 
  User, 
  RegionalCentro, 
  Ficha, 
  Instructor, 
  ProgramaFormacion,
  ActividadSeguimiento, 
  BloqueHorario, 
  AuditoriaIngesta, 
  AuditoriaSistema,
  AprendizJuicio
} from './types';

export const CENTRO_SENA_DEFAULT: RegionalCentro = {
  regional: 'Regional Cesar',
  centro: 'Centro Biotecnológico del Caribe',
  codigoCentro: '9211',
  sede: 'Sede Principal - Valledupar'
};

export const PROGRAMAS_INICIALES: ProgramaFormacion[] = [
  {
    id: 'prog_adso',
    codigo: '228118',
    nombre: 'ADSO: Análisis y Desarrollo de Software',
    version: '1',
    nivelFormacion: 'Tecnólogo',
    lineaTecnologica: 'Tecnologías de la Información y las Comunicaciones',
    redConocimiento: 'Informática, Diseño y Desarrollo de Software',
    duracionLectivaHoras: 3120,
    duracionProductivaHoras: 864,
    duracionTotalHoras: 3984,
    estado: 'ACTIVO',
    descripcion: 'Formación de tecnólogos capacitados en ciclo de vida del software, bases de datos SQL/NoSQL, arquitectura backend, frontend y cloud computing.'
  }
];

export const USUARIOS_INICIALES: User[] = [
  {
    id: 'usr_admin',
    correo: 'admin@misena.edu.co',
    clave: 'Sena2026*',
    nombre_completo: 'Administrador del Sistema',
    rol: 'ADMINISTRADOR',
    cargo: 'Administrador General del Sistema SENA CBC',
    avatar: '/assets/alien_azul_admin.svg'
  }
];

export const INSTRUCTORES_INICIALES: Instructor[] = [];

export const FICHAS_INICIALES: Ficha[] = [];

export const ACTIVIDADES_SEGUIMIENTO_INICIALES: ActividadSeguimiento[] = [];

export const BLOQUES_HORARIOS_INICIALES: BloqueHorario[] = [];

export const APRENDICES_JUICIOS_INICIALES: AprendizJuicio[] = [];

export const AUDITORIA_INGESTAS_INICIALES: AuditoriaIngesta[] = [];

export const AUDITORIA_SISTEMA_INICIAL: AuditoriaSistema[] = [
  {
    id: 'aud_init_1',
    fechaHora: '2026-09-25 08:00:00',
    usuarioId: 'usr_admin',
    usuarioNombre: 'Administrador del Sistema',
    rol: 'ADMINISTRADOR',
    accion: 'INICIALIZACION_SISTEMA_REAL',
    modulo: 'Mantenimiento del Sistema',
    ip: '192.168.1.1',
    detalles: 'Base de datos lista para datos reales: catálogo de fichas e instructores disponible para registro formal.'
  }
];

