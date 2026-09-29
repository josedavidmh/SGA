import React from 'react';
import { 
  Sidebar 
} from './components/Sidebar';
import { 
  Header 
} from './components/Header';
import { 
  DashboardView 
} from './components/DashboardView';
import { 
  AvanceFichasView 
} from './components/AvanceFichasView';
import {
  HorariosView
} from './components/HorariosView';
import {
  ReportesView
} from './components/ReportesView';
import { 
  SeguimientoView 
} from './components/SeguimientoView';
import { 
  IngestaView 
} from './components/IngestaView';
import { 
  CierresView 
} from './components/CierresView';
import { 
  AdminView 
} from './components/AdminView';
import { 
  InstructoresView 
} from './components/InstructoresView';
import { 
  ProgramasView 
} from './components/ProgramasView';
import { 
  CompetenciasView 
} from './components/CompetenciasView';
import { 
  ParametrizacionesView 
} from './components/ParametrizacionesView';
import { 
  LoginView 
} from './components/LoginView';
import { 
  ModalCrearFicha 
} from './components/ModalCrearFicha';
import { 
  ModalCrearInstructor 
} from './components/ModalCrearInstructor';
import { 
  ModalEditarPrograma 
} from './components/ModalEditarPrograma';
import { 
  ModalSupabaseGuia 
} from './components/ModalSupabaseGuia';
import { 
  DescargarStandaloneModal 
} from './components/DescargarStandaloneModal';
import {
  fetchFichasFromSupabase,
  insertFichaInSupabase,
  updateFichaInSupabase,
  reasignarInstructorEnSupabase,
  renombrarInstructorEnSupabase,
  deleteFichaFromSupabase,
  fetchInstructoresFromSupabase,
  insertInstructorInSupabase,
  updateInstructorInSupabase,
  deleteInstructorFromSupabase,
  fetchAmbientesFromSupabase,
  insertOrUpdateAmbienteInSupabase,
  deleteAmbienteFromSupabase,
  logSistemaEnSupabase,
  updateProgramaAndFichasInSupabase,
  fetchActividadesSeguimientoFromSupabase,
  upsertActividadSeguimientoInSupabase,
  fetchRapsSeguimientoFromSupabase,
  upsertRapSeguimientoInSupabase,
  fetchCompetenciasFromSupabase,
  bulkUpsertCompetenciasInSupabase,
  deleteCompetenciasByProgramaFromSupabase,
  deleteAllCompetenciasFromSupabase,
  fetchRapsFromSupabase,
  bulkUpsertRapsInSupabase,
  deleteRapsByProgramaFromSupabase,
  deleteAllRapsFromSupabase,
  fetchHorariosFromSupabase,
  insertHorarioInSupabase,
  updateHorarioInSupabase,
  deleteHorarioFromSupabase,
  fetchUsuariosFromSupabase,
  upsertUsuarioInSupabase,
  deleteUsuarioFromSupabase,
  fetchAuditoriaSistemaFromSupabase,
  fetchProgramasFromSupabase,
  upsertProgramaInSupabase,
  deleteProgramaFromSupabase,
  fetchEspecialidadesFromSupabase,
  upsertEspecialidadInSupabase,
  deleteEspecialidadFromSupabase,
  fetchTrimestresFromSupabase,
  upsertTrimestreInSupabase,
  deleteTrimestreFromSupabase,
  fetchArchivoSeguimientoFromSupabase,
  bulkUpsertArchivoSeguimientoInSupabase,
  deleteArchivoSeguimientoByProgramaFromSupabase,
  deleteAllArchivoSeguimientoFromSupabase,
  fetchAuditoriaIngestasFromSupabase,
  insertAuditoriaIngestaInSupabase,
  reemplazarCatalogoProgramasEnSupabase,
  esUuidValido,
  fetchHorasEjecutadasFromSupabase,
  reemplazarHorasFichaEnSupabase
} from './services/supabaseService';
import { 
  caracterizarInstructoresDesdeJuicios,
  caracterizarInstructoresDesdeHoras,
  crearOEnriquecerInstructoresDesdeHoras,
  aplicarPerfilesPorCompetencias
} from './services/instructorRecomendacionService';
import { emparejarJuicioConCatalogo, matchCompetencia } from './services/cruceJuiciosService';
import { 
  generarEspecialidadesDesdeCompetencias 
} from './services/planeacionPedagogicaService';
import { 
  User, 
  UserRole, 
  Ficha, 
  Instructor, 
  ProgramaFormacion,
  ActividadSeguimiento, 
  BloqueHorario, 
  AuditoriaIngesta, 
  AuditoriaSistema,
  EstadoActividad,
  Competencia,
  ResultadoAprendizaje,
  RegistroHorasEjecutadas,
  TotalesHorasSofia,
  ReporteJuiciosFicha,
  EspecialidadTematica,
  AmbienteAprendizaje,
  RegistroArchivoSeguimiento,
  RapSeguimiento,
  EstadoRap,
  HistorialInstructorRap,
  TrimestreCalendario
} from './types';
import { 
  CENTRO_FORMACION_DEFAULT, 
  USUARIOS_INICIALES, 
  FICHAS_INICIALES, 
  INSTRUCTORES_INICIALES, 
  PROGRAMAS_INICIALES,
  ACTIVIDADES_SEGUIMIENTO_INICIALES, 
  BLOQUES_HORARIOS_INICIALES, 
  AUDITORIA_INGESTAS_INICIALES, 
  AUDITORIA_SISTEMA_INICIAL
} from './mockData';
import { generarUuid } from './lib/id';
import { esFichaDelLider, fichasPermitidas, puedeEditarHorarioDeFicha } from './lib/permisos';
import { homologarInstructores } from './lib/nombresInstructor';
import { esProvisionalVigente, restaurarAntesDeProvisional, fotoPrevia } from './lib/firmezaSeguimiento';

export default function App() {
  // Estado de Usuarios Registrados en el Sistema (con persistencia local)
  const [usuarios, setUsuarios] = React.useState<User[]>(() => {
    const saved = localStorage.getItem('sena_usuarios_registrados');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((u: User) => {
            if (u.rol === 'ADMINISTRADOR') {
              return { ...u, avatar: '/assets/alien_azul_admin.svg' };
            }
            return u;
          });
        }
      } catch (e) {
        console.error('Error parsing stored users', e);
      }
    }
    return USUARIOS_INICIALES;
  });

  React.useEffect(() => {
    localStorage.setItem('sena_usuarios_registrados', JSON.stringify(usuarios));
  }, [usuarios]);

  // Estado de Autenticación y Usuario actual
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean>(() => {
    const savedId = localStorage.getItem('sena_session_user_id');
    return !!savedId;
  });

  const [currentUser, setCurrentUser] = React.useState<User>(() => {
    const savedId = localStorage.getItem('sena_session_user_id');
    if (savedId) {
      const userFound = usuarios.find(u => u.id === savedId);
      if (userFound) {
        if (userFound.rol === 'ADMINISTRADOR') {
          return { ...userFound, avatar: '/assets/alien_azul_admin.svg' };
        }
        return userFound;
      }
    }
    const admin = usuarios[0] || USUARIOS_INICIALES[0];
    if (admin.rol === 'ADMINISTRADOR') {
      return { ...admin, avatar: '/assets/alien_azul_admin.svg' };
    }
    return admin;
  });

  // Asegurar que el avatar del administrador siempre esté actualizado al extraterrestre azul
  React.useEffect(() => {
    setUsuarios(prev => prev.map(u => u.rol === 'ADMINISTRADOR' ? { ...u, avatar: '/assets/alien_azul_admin.svg' } : u));
    setCurrentUser(prev => prev.rol === 'ADMINISTRADOR' ? { ...prev, avatar: '/assets/alien_azul_admin.svg' } : prev);
  }, []);

  const [activeTab, setActiveTab] = React.useState<string>('dashboard');

  // Estado del Dominio de Datos
  const [centro] = React.useState(CENTRO_FORMACION_DEFAULT);

  // Fichas reales: inicia completamente vacía (0 fichas) para que el usuario las registre manualmente
  const [fichas, setFichas] = React.useState<Ficha[]>(() => {
    const isReset = localStorage.getItem('sena_reset_zero_fichas_v2');
    if (isReset === 'true') {
      const saved = localStorage.getItem('sena_fichas_reales');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {
          console.error('Error parsing stored fichas', e);
        }
      }
      return [];
    }
    localStorage.setItem('sena_reset_zero_fichas_v2', 'true');
    localStorage.setItem('sena_fichas_reales', JSON.stringify([]));
    return [];
  });

  React.useEffect(() => {
    localStorage.setItem('sena_fichas_reales', JSON.stringify(fichas));
  }, [fichas]);

  // Ficha seleccionada (inicia en null: no se muestra ficha hasta que el usuario la seleccione)
  const [selectedFicha, setSelectedFicha] = React.useState<Ficha | null>(null);

  // Instructores reales (limpios para registro del usuario)
  const [instructores, setInstructores] = React.useState<Instructor[]>(() => {
    const saved = localStorage.getItem('sena_instructores_reales');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((p: any) => !p?.id?.startsWith?.('a0000000-0000-0000-0000-'));
        }
      } catch (e) {
        console.error('Error parsing stored instructores', e);
      }
    }
    return INSTRUCTORES_INICIALES;
  });

  React.useEffect(() => {
    localStorage.setItem('sena_instructores_reales', JSON.stringify(instructores));
  }, [instructores]);

  // Sincronizar selectedFicha únicamente si la ficha seleccionada fue eliminada
  React.useEffect(() => {
    if (selectedFicha && !fichas.some(f => f.id === selectedFicha.id)) {
      setSelectedFicha(null);
    }
  }, [fichas, selectedFicha]);

  // Programas de Formación (dejando exclusivamente el programa ADSO)
  const [programas, setProgramas] = React.useState<ProgramaFormacion[]>(() => {
    const saved = localStorage.getItem('sena_programas_formacion');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const soloAdso = parsed.filter(p => p.codigo === '228118' || p.nombre?.toLowerCase().includes('adso'));
          if (soloAdso.length > 0) return soloAdso;
        }
      } catch (e) {
        console.error('Error parsing stored programas', e);
      }
    }
    return PROGRAMAS_INICIALES;
  });

  React.useEffect(() => {
    localStorage.setItem('sena_programas_formacion', JSON.stringify(programas));
  }, [programas]);

  // Garantizar que la base de fichas, instructores, competencias, planeaciones y juicios inicie 100% limpia para registrar datos reales
  React.useEffect(() => {
    const hasPurged = localStorage.getItem('sena_clean_start_real_data_v5');
    if (!hasPurged) {
      localStorage.setItem('sena_clean_start_real_data_v5', 'true');
      setFichas([]);
      setSelectedFicha(null);
      setInstructores([]);
      setHorarios([]);
      setActividades([]);
      setCompetencias([]);
      setRaps([]);
      setReportesJuicios({});
      setRegistrosHorasEjecutadas([]);
      localStorage.setItem('sena_fichas_reales', JSON.stringify([]));
      localStorage.setItem('sena_instructores_reales', JSON.stringify([]));
      localStorage.setItem('sena_competencias', JSON.stringify([]));
      localStorage.setItem('sena_raps', JSON.stringify([]));
      localStorage.setItem('sena_reportes_juicios', JSON.stringify({}));
      localStorage.setItem('sena_horas_ejecutadas', JSON.stringify([]));
      localStorage.setItem('sena_horarios', JSON.stringify([]));
      localStorage.setItem('sena_actividades', JSON.stringify([]));
    }
    setProgramas(prev => {
      const soloAdso = prev.filter(p => p.codigo === '228118' || p.nombre?.toLowerCase().includes('adso'));
      return soloAdso.length > 0 ? soloAdso : PROGRAMAS_INICIALES;
    });
  }, []);

  // Respaldo local (localStorage) además de Supabase: si Supabase no está configurado,
  // o mientras carga la sincronización inicial, esto evita que el estado de las
  // actividades (PENDIENTE/EN EJECUCION/CALIFICADO) se pierda al recargar la página,
  // que era el comportamiento anterior (no se guardaba en ningún lado).
  const [actividades, setActividades] = React.useState<ActividadSeguimiento[]>(() => {
    const saved = localStorage.getItem('sena_actividades');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Error parsing stored actividades', e);
      }
    }
    return ACTIVIDADES_SEGUIMIENTO_INICIALES;
  });

  React.useEffect(() => {
    localStorage.setItem('sena_actividades', JSON.stringify(actividades));
  }, [actividades]);
  // BUG REAL: 'horarios' se inicializaba SIEMPRE desde BLOQUES_HORARIOS_INICIALES
  // (el arreglo semilla hardcodeado) y nunca se leía ni se escribía en localStorage,
  // así que cada recarga de página / reinicio de 'npm run dev' perdía TODOS los
  // bloques de horario reales creados en la sesión anterior y volvía a mostrar la
  // semilla — exactamente el síntoma reportado ("reinicia todos los datos semilla").
  // El efecto de "clean start" más arriba sí escribía la llave 'sena_horarios',
  // pero nada la volvía a leer al montar. Se corrige con el mismo patrón de
  // respaldo local que ya usan 'actividades' y 'rapsSeguimiento'.
  const [horarios, setHorarios] = React.useState<BloqueHorario[]>(() => {
    const saved = localStorage.getItem('sena_horarios');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Error parsing stored horarios', e);
      }
    }
    return BLOQUES_HORARIOS_INICIALES;
  });

  React.useEffect(() => {
    localStorage.setItem('sena_horarios', JSON.stringify(horarios));
  }, [horarios]);

  const [auditoriaIngestas, setAuditoriaIngestas] = React.useState<AuditoriaIngesta[]>(() => {
    const saved = localStorage.getItem('sena_auditoria_ingestas');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Error parsing stored auditoriaIngestas', e);
      }
    }
    return AUDITORIA_INGESTAS_INICIALES;
  });

  React.useEffect(() => {
    localStorage.setItem('sena_auditoria_ingestas', JSON.stringify(auditoriaIngestas));
  }, [auditoriaIngestas]);

  const [auditoriaSistema, setAuditoriaSistema] = React.useState<AuditoriaSistema[]>(() => {
    const saved = localStorage.getItem('sena_auditoria_sistema');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Error parsing stored auditoriaSistema', e);
      }
    }
    return AUDITORIA_SISTEMA_INICIAL;
  });

  React.useEffect(() => {
    localStorage.setItem('sena_auditoria_sistema', JSON.stringify(auditoriaSistema));
  }, [auditoriaSistema]);

  // Competencias y RAPs (inician vacíos, listos para la carga de Planeación Pedagógica del usuario)
  const [competencias, setCompetencias] = React.useState<Competencia[]>(() => {
    const isReset = localStorage.getItem('sena_reset_zero_competencias_v1');
    if (isReset === 'true') {
      const saved = localStorage.getItem('sena_competencias');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {
          console.error('Error parsing stored competencias', e);
        }
      }
      return [];
    }
    localStorage.setItem('sena_reset_zero_competencias_v1', 'true');
    localStorage.setItem('sena_competencias', JSON.stringify([]));
    return [];
  });

  const [raps, setRaps] = React.useState<ResultadoAprendizaje[]>(() => {
    const isReset = localStorage.getItem('sena_reset_zero_competencias_v1');
    if (isReset === 'true') {
      const saved = localStorage.getItem('sena_raps');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {
          console.error('Error parsing stored raps', e);
        }
      }
      return [];
    }
    localStorage.setItem('sena_raps', JSON.stringify([]));
    return [];
  });

  React.useEffect(() => {
    localStorage.setItem('sena_competencias', JSON.stringify(competencias));
  }, [competencias]);

  React.useEffect(() => {
    localStorage.setItem('sena_raps', JSON.stringify(raps));
  }, [raps]);

  // Registros granulares del Archivo de Seguimiento (para futuros cruces con horarios, horas ejecutadas y juicios)
  const [registrosArchivoSeguimiento, setRegistrosArchivoSeguimiento] = React.useState<RegistroArchivoSeguimiento[]>(() => {
    const saved = localStorage.getItem('sena_archivo_seguimiento_registros');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Error parsing stored archivo de seguimiento registros', e);
      }
    }
    return [];
  });

  React.useEffect(() => {
    localStorage.setItem('sena_archivo_seguimiento_registros', JSON.stringify(registrosArchivoSeguimiento));
  }, [registrosArchivoSeguimiento]);

  // Horas por competencia de cada ficha, del "Reporte de Instructores por
  // Ficha" de SofiaPlus. Se guarda YA emparejado contra el catálogo de
  // competencias (una fila por instructor+competencia) en Supabase
  // (horas_ejecutadas_ficha) y como respaldo en este navegador. Cada cargue
  // reemplaza lo anterior de esa ficha. Antes vivía solo en memoria: al
  // recargar la página las horas desaparecían de Seguimiento.
  const [registrosHorasEjecutadas, setRegistrosHorasEjecutadas] = React.useState<RegistroHorasEjecutadas[]>(() => {
    try {
      const saved = localStorage.getItem('sena_horas_ejecutadas_ficha');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  React.useEffect(() => {
    try { localStorage.setItem('sena_horas_ejecutadas_ficha', JSON.stringify(registrosHorasEjecutadas)); } catch { /* sin espacio */ }
  }, [registrosHorasEjecutadas]);

  // Reportes de Juicios Evaluativos SofiaPlus por Ficha.
  // IMPORTANTE: tampoco se persiste en localStorage por la misma razón — el
  // archivo de Juicios se vuelve a cargar cada vez que se actualiza en
  // SofiaPlus. Lo que sí persiste es lo que esta pasada EXTRAE de él:
  // estados y asignaciones en rapsSeguimiento, y retención/deserción de la
  // ficha. Se conserva en memoria durante la sesión únicamente para mostrar
  // el detalle del último cargue (ver Avance de Fichas).
  const [reportesJuicios, setReportesJuicios] = React.useState<Record<string, ReporteJuiciosFicha>>({});

  // Seguimiento por RAP individual (instructor asignado + estado por ficha)
  const [rapsSeguimiento, setRapsSeguimiento] = React.useState<RapSeguimiento[]>(() => {
    const saved = localStorage.getItem('sena_raps_seguimiento');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Error parsing stored raps seguimiento', e);
      }
    }
    return [];
  });

  React.useEffect(() => {
    localStorage.setItem('sena_raps_seguimiento', JSON.stringify(rapsSeguimiento));
  }, [rapsSeguimiento]);

  // Especialidades Temáticas (Concisa y editable, alimentada desde Planeación Pedagógica)
  const [especialidades, setEspecialidades] = React.useState<EspecialidadTematica[]>(() => {
    const saved = localStorage.getItem('sena_especialidades_tematicas');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Error parsing stored especialidades', e);
      }
    }
    return [
      {
        id: 'esp_prog_soft',
        nombre: 'Programación de Software',
        area: 'Técnica',
        colorTag: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        descripcion: 'Desarrollo backend, frontend, algoritmos y codificación',
        competenciasAsociadasCodigos: ['220501096', '38368', '38376'],
        origen: 'MANUAL',
        estado: 'ACTIVA'
      },
      {
        id: 'esp_bd',
        nombre: 'Bases de Datos',
        area: 'Técnica',
        colorTag: 'bg-violet-100 text-violet-800 border-violet-200',
        descripcion: 'Diseño, modelamiento y administración de bases de datos SQL y NoSQL',
        competenciasAsociadasCodigos: ['220501093', '38362'],
        origen: 'MANUAL',
        estado: 'ACTIVA'
      },
      {
        id: 'esp_ingles',
        nombre: 'Bilingüismo e Inglés',
        area: 'Clave',
        colorTag: 'bg-blue-100 text-blue-800 border-blue-200',
        descripcion: 'Comunicación en idioma inglés laboral y técnico',
        competenciasAsociadasCodigos: ['240202501', '37714'],
        origen: 'MANUAL',
        estado: 'ACTIVA'
      },
      {
        id: 'esp_etica',
        nombre: 'Ética y Convivencia',
        area: 'Transversal',
        colorTag: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        descripcion: 'Cultura de paz, ética y relaciones interpersonales',
        competenciasAsociadasCodigos: ['240201524', '36180'],
        origen: 'MANUAL',
        estado: 'ACTIVA'
      }
    ];
  });

  React.useEffect(() => {
    localStorage.setItem('sena_especialidades_tematicas', JSON.stringify(especialidades));
  }, [especialidades]);

  // Ambientes de Formación Física / Virtual
  const [ambientes, setAmbientes] = React.useState<AmbienteAprendizaje[]>(() => {
    const saved = localStorage.getItem('sena_ambientes_aprendizaje');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Error parsing stored ambientes', e);
      }
    }
    return [];
  });

  React.useEffect(() => {
    localStorage.setItem('sena_ambientes_aprendizaje', JSON.stringify(ambientes));
  }, [ambientes]);

  // Calendario institucional de trimestres (fechas de corte oficiales),
  // usado para elegir/mostrar el rango de un trimestre al descargar el
  // Formato de Eventos, independiente de lo que ya haya cargado en Horarios.
  const [trimestresCalendario, setTrimestresCalendario] = React.useState<TrimestreCalendario[]>(() => {
    const saved = localStorage.getItem('sena_trimestres_calendario');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Error parsing stored trimestres calendario', e);
      }
    }
    return [];
  });

  React.useEffect(() => {
    localStorage.setItem('sena_trimestres_calendario', JSON.stringify(trimestresCalendario));
  }, [trimestresCalendario]);

  const handleGuardarTrimestreCalendario = (t: TrimestreCalendario) => {
    setTrimestresCalendario(prev => {
      const idx = prev.findIndex(x => x.id === t.id);
      if (idx >= 0) {
        const copia = [...prev];
        copia[idx] = t;
        return copia;
      }
      return [...prev, t];
    });
    upsertTrimestreInSupabase(t).catch(err => {
      console.error('Error al guardar el trimestre de calendario en Supabase:', err);
    });
  };

  const handleEliminarTrimestreCalendario = (id: string) => {
    setTrimestresCalendario(prev => prev.filter(t => t.id !== id));
    deleteTrimestreFromSupabase(id).catch(err => {
      console.error('Error al eliminar el trimestre de calendario en Supabase:', err);
    });
  };

  const [selectedProgramaForCompetencias, setSelectedProgramaForCompetencias] = React.useState<string>('228118');

  // Modales de Creación Manual, Edición de Programas y Supabase
  const [isModalFichaOpen, setIsModalFichaOpen] = React.useState<boolean>(false);
  const [fichaParaEditar, setFichaParaEditar] = React.useState<Ficha | null>(null);
  const [isModalInstructorOpen, setIsModalInstructorOpen] = React.useState<boolean>(false);
  const [instructorParaEditar, setInstructorParaEditar] = React.useState<Instructor | null>(null);
  const [isModalProgramaOpen, setIsModalProgramaOpen] = React.useState<boolean>(false);
  const [programaParaEditar, setProgramaParaEditar] = React.useState<ProgramaFormacion | null>(null);
  const [isModalSupabaseOpen, setIsModalSupabaseOpen] = React.useState<boolean>(false);
  const [isModalStandaloneOpen, setIsModalStandaloneOpen] = React.useState<boolean>(false);

  // Estado de Menú Lateral Retráctil (Desktop) y Menú Drawer (Móvil)
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState<boolean>(() => {
    return localStorage.getItem('sena_sidebar_collapsed') === 'true';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState<boolean>(false);

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sena_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Sincronización en vivo desde PostgreSQL / Supabase al cargar la app
  const [isSyncingSupabase, setIsSyncingSupabase] = React.useState<boolean>(false);

  // --- Catálogo curricular (Competencias + RAPs) → Supabase -------------
  // Referencias siempre actualizadas del catálogo local, para que la
  // sincronización inicial (que se define una sola vez) pueda leerlo.
  const competenciasRef = React.useRef<Competencia[]>(competencias);
  const rapsRef = React.useRef<ResultadoAprendizaje[]>(raps);
  const usuariosRef = React.useRef<User[]>(usuarios);
  const instructoresRef = React.useRef<Instructor[]>(instructores);
  React.useEffect(() => { instructoresRef.current = instructores; }, [instructores]);
  const rapsSeguimientoRef = React.useRef<RapSeguimiento[]>(rapsSeguimiento);
  React.useEffect(() => { rapsSeguimientoRef.current = rapsSeguimiento; }, [rapsSeguimiento]);
  const horariosRef = React.useRef<BloqueHorario[]>(horarios);
  React.useEffect(() => { horariosRef.current = horarios; }, [horarios]);
  React.useEffect(() => { competenciasRef.current = competencias; }, [competencias]);
  React.useEffect(() => { rapsRef.current = raps; }, [raps]);
  React.useEffect(() => { usuariosRef.current = usuarios; }, [usuarios]);

  // HOMOLOGACIÓN DE INSTRUCTORES: une los registros que son la misma persona
  // (p.ej. "Ing. José David Montesino Hoyos" creado a mano y "JOSE DAVID
  // MONTESINO HOYOS" detectado en SofiaPlus) y deja todos los nombres en
  // MAYÚSCULAS, como vienen de SofiaPlus, para que no se vuelva a duplicar.
  // Lo del duplicado (bloques, seguimiento, fichas que lidera) pasa al que
  // se conserva, aquí y en Supabase.
  const homologandoRef = React.useRef(false);
  React.useEffect(() => {
    if (isSyncingSupabase || homologandoRef.current) return;
    const referencias = new Map<string, number>();
    const sumar = (id?: string) => { if (id) referencias.set(id, (referencias.get(id) || 0) + 1); };
    horariosRef.current.forEach(h => sumar(h.instructorId));
    rapsSeguimientoRef.current.forEach(r => sumar(r.instructorId));
    const res = homologarInstructores(instructores, {
      correosConCuenta: new Set(usuarios.map(u => u.correo.toLowerCase())),
      referencias
    });
    if (res.actualizados.length === 0 && res.eliminados.length === 0) return;
    homologandoRef.current = true;

    const nombrePorId = new Map<string, string>();
    res.instructores.forEach(i => nombrePorId.set(i.id, i.nombreCompleto));
    const idFinal = (id?: string) => (id && res.reemplazos.get(id)) || id;
    const ajustar = <T extends { instructorId?: string; instructorNombre?: string }>(x: T): T => {
      if (!x.instructorId) return x;
      const id = idFinal(x.instructorId)!;
      const nombre = nombrePorId.get(id);
      if (id === x.instructorId && (!nombre || nombre === x.instructorNombre)) return x;
      return { ...x, instructorId: id, instructorNombre: nombre || x.instructorNombre };
    };
    const ajustarFicha = (f: Ficha): Ficha => {
      if (!f.instructorLiderId) return f;
      const id = idFinal(f.instructorLiderId)!;
      const nombre = nombrePorId.get(id);
      if (id === f.instructorLiderId && (!nombre || nombre === f.instructorLiderNombre)) return f;
      return { ...f, instructorLiderId: id, instructorLiderNombre: nombre || f.instructorLiderNombre };
    };

    setInstructores(res.instructores);
    setHorarios(prev => prev.map(ajustar));
    setRapsSeguimiento(prev => prev.map(ajustar));
    setFichas(prev => prev.map(ajustarFicha));
    setSelectedFicha(prev => (prev ? ajustarFicha(prev) : prev));

    if (res.eliminados.length > 0) {
      registrarLog(
        'HOMOLOGACION_INSTRUCTORES',
        'Gestión de Instructores',
        res.eliminados.map(d => `"${d.nombreCompleto}" unificado con "${nombrePorId.get(res.reemplazos.get(d.id)!)}"`).join(' | ')
      );
    }

    (async () => {
      try {
        // 1) El registro que se conserva, con su nombre en mayúsculas (y
        //    creado en Supabase si solo existía en este navegador).
        for (const inst of res.actualizados) {
          const r = await updateInstructorInSupabase(inst.id, {
            nombres: inst.nombres,
            apellidos: inst.apellidos,
            ...(inst.documento ? { documento: inst.documento } : {}),
            ...(inst.telefono ? { telefono: inst.telefono } : {})
          });
          if (r.success && Array.isArray(r.data) && r.data.length === 0) {
            const ins = await insertInstructorInSupabase(inst);
            if (!ins.success) console.error(`Homologación: no se pudo crear en Supabase a ${inst.nombreCompleto}:`, ins.error);
          } else if (!r.success) {
            console.error(`Homologación: no se pudo actualizar en Supabase a ${inst.nombreCompleto}:`, r.error);
          }
          await renombrarInstructorEnSupabase(inst.id, inst.nombreCompleto);
        }
        // 2) Lo del duplicado pasa al conservado y luego se borra el duplicado.
        for (const dup of res.eliminados) {
          const idCons = res.reemplazos.get(dup.id)!;
          const r = await reasignarInstructorEnSupabase(dup.id, idCons, nombrePorId.get(idCons) || '');
          if (!r.success) {
            console.error(`Homologación: no se pudo reasignar ${dup.nombreCompleto}:`, r.error);
            continue; // no se borra si no se pudo mover lo que tenía
          }
          const d = await deleteInstructorFromSupabase(dup.id);
          if (!d.success) console.error(`Homologación: no se pudo eliminar el duplicado ${dup.nombreCompleto}:`, d.error);
        }
      } finally {
        homologandoRef.current = false;
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instructores, usuarios, isSyncingSupabase]);

  // Las escrituras del catálogo se encadenan (una termina antes de que
  // empiece la siguiente): cada una borra y reinserta por programa, y dos
  // ejecuciones intercaladas podían duplicar o perder filas.
  const catalogoSyncChainRef = React.useRef<Promise<void>>(Promise.resolve());

  const sincronizarCatalogoEnSupabase = (
    programasAfectados: (string | null)[],
    comps: Competencia[],
    rapsLista: ResultadoAprendizaje[],
    mostrarAlertaSiFalla: boolean = true
  ) => {
    catalogoSyncChainRef.current = catalogoSyncChainRef.current
      .then(async () => {
        const res = await reemplazarCatalogoProgramasEnSupabase(programasAfectados, comps, rapsLista);
        if (!res.success) {
          console.error('Error al guardar competencias/RAPs en Supabase:', res.error);
          if (mostrarAlertaSiFalla) {
            alert(
              `Las competencias y RAPs quedaron en este navegador, pero NO se pudieron guardar en Supabase:\n\n${res.error}\n\n` +
              `Si el mensaje menciona una columna, un tipo de dato, una restricción o un permiso, corre en el SQL Editor de Supabase el script 20260929c_reparar_persistencia_competencias_raps.sql y vuelve a intentarlo.`
            );
          }
        } else {
          console.info(`Catálogo guardado en Supabase: ${res.data?.competencias ?? 0} competencias, ${res.data?.raps ?? 0} RAPs.`);
        }
      })
      .catch(err => {
        console.error('Error inesperado al guardar competencias/RAPs en Supabase:', err);
      });
  };

  // Garantiza ids UUID válidos (los datos viejos guardados en este navegador
  // traen ids tipo `comp_...` / `rap_...` que Supabase rechaza).
  const sanearIdsCatalogo = <T extends { id: string }>(lista: T[]): T[] =>
    lista.map(x => (esUuidValido(x.id) ? x : { ...x, id: generarUuid() }));

  const sincronizarDatosDesdeSupabase = React.useCallback(async () => {
    setIsSyncingSupabase(true);
    try {
      // 1. Sincronización de Instructores (primero, para poder resolver el nombre/email
      // del instructor líder de cada ficha al sincronizarlas justo debajo).
      const dbInstructores = await fetchInstructoresFromSupabase();
      if (dbInstructores && dbInstructores.length > 0) {
        setInstructores(prev => {
          const prevLimpio = prev.filter(p => !p.id.startsWith('a0000000-0000-0000-0000-'));
          const merged = [...prevLimpio];
          for (const dbInst of dbInstructores) {
            if (dbInst.id.startsWith('a0000000-0000-0000-0000-')) continue;
            const index = merged.findIndex(
              m => m.id === dbInst.id ||
                   (m.documento && dbInst.documento && String(m.documento).trim() === String(dbInst.documento).trim()) ||
                   (m.email && dbInst.email && m.email.trim().toLowerCase() === dbInst.email.trim().toLowerCase())
            );

            if (index >= 0) {
              merged[index] = {
                ...merged[index],
                ...dbInst,
                id: dbInst.id,
                horasSemanalesAsignadas: merged[index].horasSemanalesAsignadas || dbInst.horasSemanalesAsignadas,
                // nombre_completo en Supabase es una columna generada a partir de
                // nombres+apellidos SIN el prefijo "Ing." que este formulario le
                // agrega localmente — se preserva el nombre local para no perder
                // ese prefijo cada vez que se sincroniza.
                nombreCompleto: merged[index].nombreCompleto || dbInst.nombreCompleto
              };
            } else {
              merged.push(dbInst);
            }
          }
          return merged;
        });
      } else {
        setInstructores(prev => prev.filter(p => !p.id.startsWith('a0000000-0000-0000-0000-')));
      }

      // 1a. Instructores que solo existen en este navegador (p.ej. los
      // detectados desde Juicios): se suben para que el seguimiento que los
      // referencia pueda guardarse en Supabase.
      {
        const enDb = dbInstructores || [];
        const existeEnDb = (i: Instructor) => enDb.some(d =>
          d.id === i.id ||
          (i.email && d.email && d.email.trim().toLowerCase() === i.email.trim().toLowerCase()) ||
          (i.documento && d.documento && String(d.documento).trim() === String(i.documento).trim())
        );
        const soloLocales = instructoresRef.current.filter(i => !i.id.startsWith('a0000000-0000-0000-0000-') && !existeEnDb(i));
        const idsCambiados = new Map<string, string>();
        for (const inst of soloLocales) {
          const idFinal = esUuidValido(inst.id) ? inst.id : generarUuid();
          if (idFinal !== inst.id) idsCambiados.set(inst.id, idFinal);
          const r = await insertInstructorInSupabase({ ...inst, id: idFinal });
          if (!r.success) console.error(`No se pudo subir a Supabase el instructor ${inst.nombreCompleto}:`, r.error);
        }
        if (idsCambiados.size > 0) {
          setInstructores(prev => prev.map(i => idsCambiados.has(i.id) ? { ...i, id: idsCambiados.get(i.id)! } : i));
          setRapsSeguimiento(prev => prev.map(r => r.instructorId && idsCambiados.has(r.instructorId) ? { ...r, instructorId: idsCambiados.get(r.instructorId) } : r));
          rapsSeguimientoRef.current = rapsSeguimientoRef.current.map(r => r.instructorId && idsCambiados.has(r.instructorId) ? { ...r, instructorId: idsCambiados.get(r.instructorId) } : r);
        }
      }

      // 2. Sincronización de Fichas
      // fetchFichasFromSupabase() no conoce el nombre/email del instructor líder (la tabla
      // fichas solo guarda instructor_lider_id), así que se resuelve aquí con dbInstructores.
      const dbFichas = await fetchFichasFromSupabase();
      if (dbFichas && dbFichas.length > 0) {
        const instructorLookup = new Map<string, { nombre: string; email: string }>();
        dbInstructores.forEach(i => instructorLookup.set(i.id, { nombre: i.nombreCompleto, email: i.email }));

        setFichas(prev => {
          const merged = [...prev];
          for (const dbFicha of dbFichas) {
            const index = merged.findIndex(f => f.id === dbFicha.id || f.numero_ficha === dbFicha.numero_ficha);
            const infoLider = dbFicha.instructorLiderId ? instructorLookup.get(dbFicha.instructorLiderId) : undefined;
            const fichaResuelta: Ficha = {
              ...dbFicha,
              instructorLiderNombre: infoLider?.nombre || (index >= 0 ? merged[index].instructorLiderNombre : dbFicha.instructorLiderNombre),
              instructorLiderEmail: infoLider?.email || (index >= 0 ? merged[index].instructorLiderEmail : dbFicha.instructorLiderEmail)
            };
            if (index >= 0) {
              const local = merged[index];
              merged[index] = {
                ...local,
                ...fichaResuelta,
                id: dbFicha.id,
                // Si Supabase no trae estos datos (columna sin crear o vacía),
                // se conserva lo calculado localmente desde Juicios.
                tasaRetencion: fichaResuelta.tasaRetencion ?? local.tasaRetencion,
                tasaDesercion: fichaResuelta.tasaDesercion ?? local.tasaDesercion,
                aprendicesCondicionados: fichaResuelta.aprendicesCondicionados ?? local.aprendicesCondicionados,
                aprendicesTrasladados: fichaResuelta.aprendicesTrasladados ?? local.aprendicesTrasladados,
                progresoCurricular: fichaResuelta.progresoCurricular ?? local.progresoCurricular ?? 0
              };
            } else {
              merged.push({
                ...fichaResuelta,
                tasaRetencion: fichaResuelta.tasaRetencion ?? 100,
                tasaDesercion: fichaResuelta.tasaDesercion ?? 0,
                progresoCurricular: fichaResuelta.progresoCurricular ?? 0
              });
            }
          }
          return merged;
        });
      }

      // 2a. Horas por competencia de cada ficha (Reporte de Instructores por
      // Ficha). Para cada ficha que tenga horas en Supabase, esas mandan.
      {
        const dbHoras = await fetchHorasEjecutadasFromSupabase();
        if (dbHoras.length > 0) {
          const fichasConHoras = new Set(dbHoras.map(h => h.fichaNumero));
          setRegistrosHorasEjecutadas(prev => [
            ...prev.filter(h => !fichasConHoras.has(h.fichaNumero)),
            ...dbHoras
          ]);
        }
      }

      // 3. Sincronización de Ambientes (si existe en Supabase)
      const dbAmbientes = await fetchAmbientesFromSupabase();
      if (dbAmbientes && dbAmbientes.length > 0) {
        setAmbientes(dbAmbientes);
      }

      // 4. Sincronización de Actividades de Seguimiento (Matriz GPFI-F-134)
      const dbActividades = await fetchActividadesSeguimientoFromSupabase();
      if (dbActividades && dbActividades.length > 0) {
        setActividades(prev => {
          const merged = [...prev];
          for (const dbAct of dbActividades) {
            const index = merged.findIndex(a => a.id === dbAct.id);
            if (index >= 0) {
              merged[index] = dbAct;
            } else {
              merged.push(dbAct);
            }
          }
          return merged;
        });
      }

      // 5. Sincronización de Seguimiento por RAP individual (instructor asignado + estado)
      const dbRapsSeguimiento = await fetchRapsSeguimientoFromSupabase();

      // 5a. Seguimiento por RAP que solo existe en este navegador (p.ej. lo
      // calificado desde Juicios mientras Supabase lo rechazaba): se sube.
      {
        const enDb = dbRapsSeguimiento || [];
        const pendientes = rapsSeguimientoRef.current.filter(l => !enDb.some(d =>
          (d.fichaId === l.fichaId || d.fichaNumero === l.fichaNumero) &&
          d.competenciaCodigo === l.competenciaCodigo && d.rapCodigo === l.rapCodigo
        ));
        const fichasEnDb = new Map((dbFichas || []).map(f => [f.numero_ficha, f.id]));
        for (const item of pendientes) {
          // La ficha debe existir en Supabase; se usa su id real.
          const fichaIdDb = fichasEnDb.get(item.fichaNumero) || item.fichaId;
          if (!esUuidValido(fichaIdDb)) continue;
          const r = await upsertRapSeguimientoInSupabase({ ...item, id: esUuidValido(item.id) ? item.id : generarUuid(), fichaId: fichaIdDb });
          if (!r.success) console.error(`No se pudo subir el seguimiento ${item.competenciaCodigo}/${item.rapCodigo}:`, r.error);
        }
      }
      if (dbRapsSeguimiento && dbRapsSeguimiento.length > 0) {
        setRapsSeguimiento(prev => {
          const merged = [...prev];
          for (const dbSeg of dbRapsSeguimiento) {
            const index = merged.findIndex(s => s.id === dbSeg.id || (s.fichaId === dbSeg.fichaId && s.competenciaCodigo === dbSeg.competenciaCodigo && s.rapCodigo === dbSeg.rapCodigo));
            if (index >= 0) {
              merged[index] = dbSeg;
            } else {
              merged.push(dbSeg);
            }
          }
          return merged;
        });
      }

      // 6. Sincronización de Competencias (catálogo curricular)
      const dbCompetencias = await fetchCompetenciasFromSupabase();
      if (dbCompetencias && dbCompetencias.length > 0) {
        setCompetencias(prev => {
          const merged = [...prev];
          for (const dbComp of dbCompetencias) {
            const index = merged.findIndex(c =>
              c.id === dbComp.id ||
              (c.codigo === dbComp.codigo && (c.programaCodigo || '') === (dbComp.programaCodigo || ''))
            );
            if (index >= 0) {
              merged[index] = dbComp;
            } else {
              merged.push(dbComp);
            }
          }
          return merged;
        });
      }

      // 7. Sincronización de Resultados de Aprendizaje (catálogo de RAPs)
      const dbRaps = await fetchRapsFromSupabase();
      if (dbRaps && dbRaps.length > 0) {
        setRaps(prev => {
          const merged = [...prev];
          for (const dbRap of dbRaps) {
            const index = merged.findIndex(r =>
              r.id === dbRap.id ||
              ((r.programaCodigo || '') === (dbRap.programaCodigo || '') &&
               r.competenciaCodigo === dbRap.competenciaCodigo &&
               r.codigoRap === dbRap.codigoRap)
            );
            if (index >= 0) {
              merged[index] = dbRap;
            } else {
              merged.push(dbRap);
            }
          }
          return merged;
        });
      }

      // 7b. Si Supabase todavía no tiene NADA del catálogo pero este
      // navegador sí (lo que pasó hasta ahora: todo se quedaba solo en
      // localStorage porque Supabase lo rechazaba), se sube lo local una vez,
      // sin tener que volver a cargar el Excel.
      if ((dbCompetencias?.length ?? 0) === 0 && (dbRaps?.length ?? 0) === 0) {
        const localComps = sanearIdsCatalogo(competenciasRef.current);
        const localRaps = sanearIdsCatalogo(rapsRef.current);
        if (localComps.length > 0 || localRaps.length > 0) {
          setCompetencias(localComps);
          setRaps(localRaps);
          const progs = Array.from(new Set<string | null>([
            ...localComps.map(c => c.programaCodigo || null),
            ...localRaps.map(r => r.programaCodigo || null)
          ]));
          sincronizarCatalogoEnSupabase(progs, localComps, localRaps);
        }
      }

      // 8. Sincronización de Bloques de Horario (Matriz de Horarios)
      const dbHorarios = await fetchHorariosFromSupabase();

      // 8a. Bloques que existen en este navegador pero no en Supabase (todos
      // los creados mientras Supabase los rechazaba por la columna
      // instructor_nombre): se suben ahora. Si alguno tenía id viejo no-UUID
      // (blq_...), se corrige también en pantalla.
      {
        const idsEnDb = new Set((dbHorarios || []).map(b => b.id));
        const idsCorregidos = new Map<string, string>();
        const locales = horariosRef.current.map(b => {
          if (esUuidValido(b.id)) return b;
          const nuevoId = generarUuid();
          idsCorregidos.set(b.id, nuevoId);
          return { ...b, id: nuevoId };
        });
        if (idsCorregidos.size > 0) {
          setHorarios(prev => prev.map(b => idsCorregidos.has(b.id) ? { ...b, id: idsCorregidos.get(b.id)! } : b));
        }
        const pendientes = locales.filter(b => !idsEnDb.has(b.id));
        let fallidos = 0;
        let primerError = '';
        for (const b of pendientes) {
          const res = await insertHorarioInSupabase(b);
          if (!res.success) {
            fallidos++;
            if (!primerError) primerError = res.error || '';
            console.error(`No se pudo subir a Supabase el bloque ${b.diaSemana} ${b.franja} (${b.rapCodigo}):`, res.error);
          }
        }
        if (fallidos > 0) {
          alert(`${pendientes.length - fallidos} de ${pendientes.length} bloques de horario que estaban solo en este navegador se subieron a Supabase. ${fallidos} no se pudieron subir:\n\n${primerError}`);
        }
      }
      if (dbHorarios && dbHorarios.length > 0) {
        setHorarios(prev => {
          const merged = [...prev];
          for (const dbBloque of dbHorarios) {
            const index = merged.findIndex(h => h.id === dbBloque.id);
            if (index >= 0) {
              merged[index] = dbBloque;
            } else {
              merged.push(dbBloque);
            }
          }
          return merged;
        });
      }

      // 9. Sincronización de Usuarios (cuentas de acceso). Se empareja por
      // correo (no por id: un usuario vinculado a un instructor tiene un id
      // local con formato `usr_<idInstructor>`, no un UUID). La clave NUNCA
      // se trae de Supabase — se preserva la que ya existe localmente.
      const dbUsuarios = await fetchUsuariosFromSupabase();

      // 9a. Usuarios que existen en este navegador pero NO en Supabase (p.ej.
      // la cuenta del instructor creada mientras Supabase rechazaba los
      // inserts por permisos): se suben ahora, con el hash de su clave.
      const correosEnDb = new Set((dbUsuarios || []).map(u => u.correo.toLowerCase()));
      const soloLocales = usuariosRef.current.filter(u => u.correo && !correosEnDb.has(u.correo.toLowerCase()));
      for (const u of soloLocales) {
        const res = await upsertUsuarioInSupabase(u);
        if (!res.success) {
          console.error(`No se pudo subir a Supabase el usuario ${u.correo}:`, res.error);
        }
      }

      if (dbUsuarios && dbUsuarios.length > 0) {
        setUsuarios(prev => {
          const merged = [...prev];
          for (const dbUser of dbUsuarios) {
            const index = merged.findIndex(u => u.correo.toLowerCase() === dbUser.correo.toLowerCase());
            if (index >= 0) {
              merged[index] = { ...dbUser, clave: merged[index].clave, fichaAsignadaId: merged[index].fichaAsignadaId };
            } else {
              merged.push(dbUser);
            }
          }
          return merged;
        });
      }

      // 10. Sincronización de Auditoría de Sistema (visibilidad compartida
      // del historial de acciones entre distintos equipos/navegadores).
      const dbAuditoria = await fetchAuditoriaSistemaFromSupabase();
      if (dbAuditoria && dbAuditoria.length > 0) {
        setAuditoriaSistema(prev => {
          const merged = [...prev];
          for (const dbLog of dbAuditoria) {
            const index = merged.findIndex(a => a.id === dbLog.id);
            if (index >= 0) {
              merged[index] = dbLog;
            } else {
              merged.push(dbLog);
            }
          }
          return merged;
        });
      }

      // 11. Sincronización de Programas de Formación (catálogo)
      const dbProgramas = await fetchProgramasFromSupabase();
      if (dbProgramas && dbProgramas.length > 0) {
        setProgramas(prev => {
          const merged = [...prev];
          for (const dbProg of dbProgramas) {
            const index = merged.findIndex(p => p.id === dbProg.id || p.codigo === dbProg.codigo);
            if (index >= 0) {
              merged[index] = dbProg;
            } else {
              merged.push(dbProg);
            }
          }
          return merged;
        });
      }

      // 12. Sincronización de Especialidades Temáticas
      const dbEspecialidades = await fetchEspecialidadesFromSupabase();
      if (dbEspecialidades && dbEspecialidades.length > 0) {
        setEspecialidades(prev => {
          const merged = [...prev];
          for (const dbEsp of dbEspecialidades) {
            const index = merged.findIndex(e => e.id === dbEsp.id);
            if (index >= 0) {
              merged[index] = dbEsp;
            } else {
              merged.push(dbEsp);
            }
          }
          return merged;
        });
      }

      // 13. Sincronización del Calendario de Trimestres
      const dbTrimestres = await fetchTrimestresFromSupabase();
      if (dbTrimestres && dbTrimestres.length > 0) {
        setTrimestresCalendario(prev => {
          const merged = [...prev];
          for (const dbT of dbTrimestres) {
            const index = merged.findIndex(t => t.id === dbT.id);
            if (index >= 0) {
              merged[index] = dbT;
            } else {
              merged.push(dbT);
            }
          }
          return merged;
        });
      }

      // 14. Sincronización de los registros granulares del Archivo de Seguimiento
      const dbArchivoSeguimiento = await fetchArchivoSeguimientoFromSupabase();
      if (dbArchivoSeguimiento && dbArchivoSeguimiento.length > 0) {
        setRegistrosArchivoSeguimiento(prev => {
          const merged = [...prev];
          for (const dbReg of dbArchivoSeguimiento) {
            const index = merged.findIndex(r => r.id === dbReg.id);
            if (index >= 0) {
              merged[index] = dbReg;
            } else {
              merged.push(dbReg);
            }
          }
          return merged;
        });
      }

      // 15. Sincronización de la Auditoría de Ingestas de Excel
      const dbAuditoriaIngestas = await fetchAuditoriaIngestasFromSupabase();
      if (dbAuditoriaIngestas && dbAuditoriaIngestas.length > 0) {
        setAuditoriaIngestas(prev => {
          const merged = [...prev];
          for (const dbIng of dbAuditoriaIngestas) {
            const index = merged.findIndex(i => i.id === dbIng.id);
            if (index >= 0) {
              merged[index] = dbIng;
            } else {
              merged.push(dbIng);
            }
          }
          return merged;
        });
      }
    } catch (err) {
      console.error('Error al sincronizar datos desde Supabase:', err);
    } finally {
      setIsSyncingSupabase(false);
    }
  }, []);

  React.useEffect(() => {
    sincronizarDatosDesdeSupabase();
  }, [sincronizarDatosDesdeSupabase]);

  // Registro de Auditoría
  const registrarLog = (accion: string, modulo: string, detalles: string) => {
    const nuevoLog: AuditoriaSistema = {
      id: `aud_${Date.now()}`,
      fechaHora: new Date().toISOString().replace('T', ' ').substring(0, 19),
      usuarioId: currentUser.id,
      usuarioNombre: currentUser.nombre_completo,
      rol: currentUser.rol,
      accion,
      modulo,
      ip: '192.168.1.55',
      detalles
    };
    setAuditoriaSistema(prev => [nuevoLog, ...prev]);
    logSistemaEnSupabase(accion, modulo, detalles, currentUser.nombre_completo, currentUser.rol);
  };

  // Manejo de Inicio y Cierre de Sesión
  const handleLoginSuccess = (user: User, claveIngresada: string) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    // Si la validación pasó por el hash de Supabase (este navegador todavía no
    // tenía la clave en texto plano localmente), se cachea aquí para que el
    // próximo inicio de sesión en este mismo navegador sea inmediato.
    if (!user.clave || user.clave !== claveIngresada) {
      setUsuarios(prev => prev.map(u => u.id === user.id ? { ...u, clave: claveIngresada } : u));
    }
    if (user.rol === 'INSTRUCTOR_LIDER') {
      const fichaLider = fichasPermitidas(fichas, user, instructores)[0] || null;
      setSelectedFicha(fichaLider);
    }
    setActiveTab('dashboard');
    registrarLog('INICIO_SESION_EXITOSO', 'Autenticación y Seguridad', `Inicio de sesión exitoso: ${user.nombre_completo} (${user.rol}) - ${user.correo}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('sena_session_user_id');
    setIsAuthenticated(false);
    registrarLog('CIERRE_SESION', 'Autenticación y Seguridad', `Cierre de sesión de ${currentUser.nombre_completo}`);
  };

  // Cambio de Rol (RBAC Switcher)
  const handleSwitchUser = (rol: UserRole) => {
    const user = usuarios.find(u => u.rol === rol);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('sena_session_user_id', user.id);
      if (rol !== 'ADMINISTRADOR' && (activeTab === 'programas' || activeTab === 'competencias' || activeTab === 'admin')) {
        setActiveTab('dashboard');
      }
      if (rol === 'AUXILIAR') {
        if (activeTab === 'cierres' || activeTab === 'admin' || activeTab === 'instructores') {
          setActiveTab('dashboard');
        }
      } else if (rol === 'INSTRUCTOR_LIDER') {
        const fichaLider = fichasPermitidas(fichas, user, instructores)[0] || null;
        setSelectedFicha(fichaLider);
        if (activeTab === 'admin' || activeTab === 'cierres' || activeTab === 'instructores') {
          setActiveTab('dashboard');
        }
      }
      registrarLog('CAMBIO_ROL_RBAC', 'Autenticación', `Inicio de sesión como ${user.nombre_completo} (${user.rol})`);
    }
  };

  // Gestión de Usuarios por el Administrador
  const handleCrearUsuario = (nuevoUser: User) => {
    setUsuarios(prev => [...prev, nuevoUser]);
    // OJO: upsertUsuarioInSupabase() SIEMPRE resuelve la promesa (nunca la
    // rechaza — internamente atrapa cualquier error y lo devuelve como
    // { success: false, error }), así que un .catch() a secas NUNCA se
    // disparaba aquí, ni siquiera cuando Supabase rechazaba el insert. Por
    // eso una falla (RLS, restricción, columna, lo que sea) quedaba
    // completamente invisible — ni un console.error. Ahora sí se revisa
    // res.success explícitamente.
    upsertUsuarioInSupabase(nuevoUser).then(res => {
      if (!res.success) {
        console.error('Error al crear usuario en Supabase:', res.error);
        alert(`El usuario se guardó localmente, pero NO se pudo sincronizar con Supabase (solo quedará en este navegador hasta corregirlo):\n\n${res.error}`);
      }
    }).catch(err => {
      console.error('Error al crear usuario en Supabase:', err);
    });
    registrarLog('CREAR_USUARIO', 'Gestión de Usuarios', `Usuario ${nuevoUser.nombre_completo} (${nuevoUser.rol}) creado.`);
    alert(`¡Usuario ${nuevoUser.nombre_completo} creado con éxito!\nCorreo: ${nuevoUser.correo}\nRol: ${nuevoUser.rol}`);
  };

  const handleEliminarUsuario = (usuarioId: string) => {
    const userTarget = usuarios.find(u => u.id === usuarioId);
    if (!userTarget) return;
    if (confirm(`¿Confirma que desea eliminar la cuenta de ${userTarget.nombre_completo}?`)) {
      setUsuarios(prev => prev.filter(u => u.id !== usuarioId));
      deleteUsuarioFromSupabase(userTarget.correo).then(res => {
        if (!res.success) console.error('Error al eliminar usuario en Supabase:', res.error);
      }).catch(err => {
        console.error('Error al eliminar usuario en Supabase:', err);
      });
      registrarLog('ELIMINAR_USUARIO', 'Gestión de Usuarios', `Usuario ${userTarget.nombre_completo} eliminado.`);
    }
  };

  // El Administrador puede editar la clave de acceso de cualquier usuario del sistema
  const handleEditarClaveUsuario = (usuarioId: string, nuevaClave: string) => {
    const userTarget = usuarios.find(u => u.id === usuarioId);
    if (!userTarget) return;
    setUsuarios(prev => prev.map(u => u.id === usuarioId ? { ...u, clave: nuevaClave } : u));
    // Sube el HASH (no la clave en texto plano) a Supabase, para que la
    // nueva clave también sirva para iniciar sesión desde otro navegador/equipo.
    upsertUsuarioInSupabase({ ...userTarget, clave: nuevaClave }).then(res => {
      if (!res.success) {
        console.error('Error al sincronizar el hash de la nueva clave en Supabase:', res.error);
        alert(`La clave se cambió localmente, pero NO se pudo sincronizar con Supabase:\n\n${res.error}`);
      }
    }).catch(err => {
      console.error('Error al sincronizar el hash de la nueva clave en Supabase:', err);
    });
    registrarLog('EDITAR_CLAVE_USUARIO', 'Gestión de Usuarios', `Clave de acceso de ${userTarget.nombre_completo} actualizada por el administrador.`);
  };

  // El Administrador puede corregir el correo de acceso de cualquier usuario —
  // esto es lo que resuelve el caso típico de "no me deja entrar con el correo
  // que le registré": el correo con el que se creó la cuenta no coincide
  // exactamente (typo, dominio distinto, etc.) con el que la persona usa para
  // iniciar sesión, y antes no había forma de corregirlo sin borrar y volver a
  // crear el usuario.
  const handleEditarCorreoUsuario = (usuarioId: string, nuevoCorreo: string): { exito: boolean; mensaje: string } => {
    const userTarget = usuarios.find(u => u.id === usuarioId);
    if (!userTarget) return { exito: false, mensaje: 'Usuario no encontrado.' };
    const correoNormalizado = nuevoCorreo.trim().toLowerCase();
    if (!correoNormalizado || !correoNormalizado.includes('@')) {
      return { exito: false, mensaje: 'Ingrese un correo electrónico válido.' };
    }
    const yaExiste = usuarios.some(u => u.id !== usuarioId && u.correo.toLowerCase() === correoNormalizado);
    if (yaExiste) {
      return { exito: false, mensaje: 'Ya existe otro usuario registrado con ese correo.' };
    }
    setUsuarios(prev => prev.map(u => u.id === usuarioId ? { ...u, correo: correoNormalizado } : u));
    upsertUsuarioInSupabase({ ...userTarget, correo: correoNormalizado }, userTarget.correo).then(res => {
      if (!res.success) {
        console.error('Error al actualizar correo de usuario en Supabase:', res.error);
        alert(`El correo se cambió localmente, pero NO se pudo sincronizar con Supabase:\n\n${res.error}`);
      }
    }).catch(err => {
      console.error('Error al actualizar correo de usuario en Supabase:', err);
    });
    registrarLog('EDITAR_CORREO_USUARIO', 'Gestión de Usuarios', `Correo de acceso de ${userTarget.nombre_completo} actualizado por el administrador (${userTarget.correo} → ${correoNormalizado}).`);
    return { exito: true, mensaje: 'Correo actualizado.' };
  };

  // Creación Manual de Ficha
  const handleCrearFicha = (nuevaFicha: Ficha) => {
    setFichas(prev => [nuevaFicha, ...prev]);
    setSelectedFicha(nuevaFicha);
    insertFichaInSupabase(nuevaFicha).catch(err => {
      console.error('Error al insertar ficha en Supabase:', err);
    });

    // (Ya no se generan actividades de ejemplo: la Matriz de Actividades se
    // arma con la planeación pedagógica cargada para el programa.)

    registrarLog(
      'CREAR_FICHA_MANUAL',
      'Gestión de Fichas',
      `Ficha ${nuevaFicha.numero_ficha} creada manualmente (${nuevaFicha.programaNombre}). Instructor Líder: ${nuevaFicha.instructorLiderNombre}`
    );

    alert(`¡Ficha ${nuevaFicha.numero_ficha} registrada con éxito!\nHa sido seleccionada como la ficha activa en el sistema.`);
  };

  // =====================================================================
  // GESTIÓN Y EDICIÓN DE INSTRUCTORES
  // =====================================================================

  const handleOpenCrearInstructor = () => {
    setInstructorParaEditar(null);
    setIsModalInstructorOpen(true);
  };

  const handleOpenEditarInstructor = (inst: Instructor) => {
    setInstructorParaEditar(inst);
    setIsModalInstructorOpen(true);
  };

  // Creación y Edición de Instructor
  const handleGuardarInstructor = (instructorActualizado: Instructor, crearCuentaUsuario: boolean = true, claveUsuario: string = 'Sistema2026*') => {
    const esEdicion = instructores.some(i => i.id === instructorActualizado.id);

    if (esEdicion) {
      setInstructores(prev => prev.map(i => i.id === instructorActualizado.id ? instructorActualizado : i));
      updateInstructorInSupabase(instructorActualizado.id, instructorActualizado).catch(err => {
        console.error('Error al actualizar instructor en Supabase:', err);
      });

      // Sincronizar en cascada si cambiaron nombres o correos
      setFichas(prev => prev.map(f => {
        if (f.instructorLiderId === instructorActualizado.id) {
          return {
            ...f,
            instructorLiderNombre: instructorActualizado.nombreCompleto,
            instructorLiderEmail: instructorActualizado.email
          };
        }
        return f;
      }));

      setHorarios(prev => prev.map(h => {
        if (h.instructorId === instructorActualizado.id) {
          return {
            ...h,
            instructorNombre: instructorActualizado.nombreCompleto
          };
        }
        return h;
      }));

      setUsuarios(prev => prev.map(u => {
        if (u.id === `usr_${instructorActualizado.id}` || (instructorParaEditar && u.correo.toLowerCase() === instructorParaEditar.email.toLowerCase())) {
          return {
            ...u,
            correo: instructorActualizado.email.toLowerCase(),
            nombre_completo: instructorActualizado.nombreCompleto,
            cargo: `Instructor Líder - ${instructorActualizado.especialidad}`,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(instructorActualizado.nombreCompleto)}&background=0D631B&color=fff`
          };
        }
        return u;
      }));
      if (instructorParaEditar) {
        upsertUsuarioInSupabase(
          {
            id: `usr_${instructorActualizado.id}`,
            correo: instructorActualizado.email.toLowerCase(),
            nombre_completo: instructorActualizado.nombreCompleto,
            rol: 'INSTRUCTOR_LIDER',
            cargo: `Instructor Líder - ${instructorActualizado.especialidad}`
          },
          instructorParaEditar.email
        ).then(res => {
          if (!res.success) {
            console.error('Error al actualizar usuario vinculado en Supabase:', res.error);
            alert(`El instructor se actualizó, pero la cuenta de usuario vinculada NO se pudo sincronizar con Supabase:\n\n${res.error}`);
          }
        }).catch(err => {
          console.error('Error al actualizar usuario vinculado en Supabase:', err);
        });
      }

      registrarLog(
        'EDICION_INSTRUCTOR',
        'Gestión de Instructores',
        `Instructor ${instructorActualizado.nombreCompleto} (ID: ${instructorActualizado.documento}, ${instructorActualizado.especialidad}) actualizado.`
      );
    } else {
      setInstructores(prev => [instructorActualizado, ...prev]);
      // NOTA: no se vuelve a insertar aquí en Supabase — ModalCrearInstructor
      // ya hace el insert (con manejo de error visible al usuario) ANTES de
      // llamar a este handler. Insertar de nuevo con el mismo id solo
      // generaba un conflicto de llave primaria silencioso en cada creación.

      // Crear cuenta de usuario si se solicitó
      if (crearCuentaUsuario) {
        const nuevoUser: User = {
          id: `usr_${instructorActualizado.id}`,
          correo: instructorActualizado.email.toLowerCase(),
          clave: claveUsuario || 'Sistema2026*',
          nombre_completo: instructorActualizado.nombreCompleto,
          rol: 'INSTRUCTOR_LIDER',
          cargo: `Instructor Líder - ${instructorActualizado.especialidad}`,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(instructorActualizado.nombreCompleto)}&background=0D631B&color=fff`
        };
        setUsuarios(prev => {
          if (!prev.some(u => u.correo.toLowerCase() === nuevoUser.correo.toLowerCase())) {
            return [...prev, nuevoUser];
          }
          return prev;
        });
        upsertUsuarioInSupabase(nuevoUser).then(res => {
          if (!res.success) {
            console.error('Error al crear usuario vinculado en Supabase:', res.error);
            alert(`El instructor se guardó, pero la cuenta de usuario vinculada NO se pudo sincronizar con Supabase (solo quedará en este navegador hasta corregirlo):\n\n${res.error}`);
          }
        }).catch(err => {
          console.error('Error al crear usuario vinculado en Supabase:', err);
        });
      }

      registrarLog(
        'CREAR_INSTRUCTOR_MANUAL',
        'Gestión de Instructores',
        `Instructor ${instructorActualizado.nombreCompleto} (${instructorActualizado.especialidad}) registrado en planta de instructores${crearCuentaUsuario ? ' con usuario de acceso' : ''}.`
      );

      alert(`¡Instructor ${instructorActualizado.nombreCompleto} registrado con éxito!${crearCuentaUsuario ? `\nUsuario de acceso creado: ${instructorActualizado.email}\nClave: ${claveUsuario || 'Sistema2026*'}` : ''}`);
    }
  };

  // Crear la cuenta de usuario de un instructor que todavía no tiene y
  // dejarlo como INSTRUCTOR LÍDER de las fichas elegidas. El vínculo con las
  // fichas se guarda en la ficha (instructor_lider_id), que es lo que viaja a
  // Supabase y lo reconoce desde cualquier equipo.
  const handleCrearCuentaLider = async (
    instructor: Instructor,
    datos: { correo: string; clave: string; fichaIds: string[] }
  ): Promise<{ exito: boolean; mensaje: string }> => {
    const correo = datos.correo.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      return { exito: false, mensaje: 'Escribe un correo válido para la cuenta.' };
    }
    if ((datos.clave || '').length < 6) {
      return { exito: false, mensaje: 'La clave debe tener al menos 6 caracteres.' };
    }
    const yaExiste = usuarios.find(u => u.correo.toLowerCase() === correo);
    if (yaExiste) {
      return { exito: false, mensaje: `Ya existe una cuenta con el correo ${correo} (${yaExiste.nombre_completo}).` };
    }

    const nuevoUser: User = {
      id: `usr_${instructor.id}`,
      correo,
      clave: datos.clave,
      nombre_completo: instructor.nombreCompleto,
      rol: 'INSTRUCTOR_LIDER',
      cargo: `Instructor Líder - ${instructor.especialidad || 'Formación Profesional'}`,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(instructor.nombreCompleto)}&background=0D631B&color=fff`,
      fichaAsignadaId: datos.fichaIds[0]
    };

    const resUsuario = await upsertUsuarioInSupabase(nuevoUser);
    if (!resUsuario.success) {
      return { exito: false, mensaje: `No se pudo crear la cuenta en Supabase:\n\n${resUsuario.error}` };
    }
    setUsuarios(prev => [...prev, nuevoUser]);

    // Si el correo de la cuenta es distinto al que tenía el instructor, se
    // actualiza también en la planta (así el sistema lo enlaza con sus fichas).
    const instructorFinal = correo !== (instructor.email || '').toLowerCase() ? { ...instructor, email: correo } : instructor;
    if (instructorFinal !== instructor) {
      setInstructores(prev => prev.map(i => i.id === instructor.id ? instructorFinal : i));
      const r = await updateInstructorInSupabase(instructor.id, { email: correo });
      if (!r.success) console.error('No se pudo actualizar el correo del instructor en Supabase:', r.error);
    }

    // Fichas que va a liderar
    const erroresFichas: string[] = [];
    for (const fichaId of datos.fichaIds) {
      const cambios = {
        instructorLiderId: instructorFinal.id,
        instructorLiderNombre: instructorFinal.nombreCompleto,
        instructorLiderEmail: correo
      };
      setFichas(prev => prev.map(f => f.id === fichaId ? { ...f, ...cambios } : f));
      setSelectedFicha(prev => prev && prev.id === fichaId ? { ...prev, ...cambios } : prev);
      const r = await updateFichaInSupabase(fichaId, { instructorLiderId: instructorFinal.id });
      if (!r.success) {
        const num = fichas.find(f => f.id === fichaId)?.numero_ficha || fichaId;
        erroresFichas.push(`Ficha ${num}: ${r.error}`);
      }
    }

    const numeros = datos.fichaIds.map(id => fichas.find(f => f.id === id)?.numero_ficha).filter(Boolean).join(', ');
    registrarLog(
      'CUENTA_LIDER_CREADA',
      'Gestión de Instructores',
      `Cuenta de Instructor Líder creada para ${instructorFinal.nombreCompleto} (${correo})${numeros ? ` — fichas: ${numeros}` : ''}.`
    );

    return {
      exito: true,
      mensaje:
        `${instructorFinal.nombreCompleto} ya puede entrar como Instructor Líder.\n\n` +
        `Usuario: ${correo}\nClave: ${datos.clave}` +
        (numeros ? `\nFichas a su cargo: ${numeros}` : '\nTodavía no tiene fichas a su cargo: asígnaselas cuando estén creadas, eligiéndolo como instructor líder de la ficha.') +
        (erroresFichas.length > 0 ? `\n\n⚠ No se pudo guardar en Supabase:\n${erroresFichas.join('\n')}` : '')
    };
  };

  const handleToggleEstadoInstructor = (id: string) => {
    setInstructores(prev => prev.map(i => {
      if (i.id === id) {
        const nuevoEstado = i.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
        updateInstructorInSupabase(id, { estado: nuevoEstado }).catch(err => {
          console.error('Error al actualizar estado en Supabase:', err);
        });
        return { ...i, estado: nuevoEstado };
      }
      return i;
    }));
  };

  const handleEliminarInstructor = (id: string) => {
    const inst = instructores.find(i => i.id === id);
    if (!inst) return;

    // Validación estricta de dependencias relacionales
    const fichasLider = fichas.filter(f => 
      f.instructorLiderId === inst.id || 
      (f.instructorLiderEmail && f.instructorLiderEmail.toLowerCase() === inst.email.toLowerCase()) ||
      (f.instructorLiderNombre && f.instructorLiderNombre.toLowerCase() === inst.nombreCompleto.toLowerCase())
    );
    const bloques = horarios.filter(h => 
      h.instructorId === inst.id || 
      (h.instructorNombre && h.instructorNombre.toLowerCase() === inst.nombreCompleto.toLowerCase())
    );
    const horasReg = registrosHorasEjecutadas.filter(r => 
      (r.instructorDocumento && r.instructorDocumento === inst.documento) ||
      (r.instructorNombre && r.instructorNombre.toLowerCase() === inst.nombreCompleto.toLowerCase())
    );

    if (fichasLider.length > 0 || bloques.length > 0 || horasReg.length > 0) {
      alert(`No se puede eliminar a ${inst.nombreCompleto} porque cuenta con datos vinculados en el sistema.`);
      return;
    }

    setInstructores(prev => prev.filter(i => i.id !== id));
    // Eliminar cuenta de usuario vinculada si existe
    setUsuarios(prev => prev.filter(u => u.correo.toLowerCase() !== inst.email.toLowerCase()));
    deleteUsuarioFromSupabase(inst.email).catch(err => {
      console.error('Error al eliminar usuario vinculado en Supabase:', err);
    });

    // Eliminar permanentemente de Supabase
    deleteInstructorFromSupabase(id).catch(err => {
      console.error('Error al eliminar instructor de Supabase:', err);
    });

    registrarLog(
      'ELIMINAR_INSTRUCTOR',
      'Gestión de Instructores',
      `Instructor ${inst.nombreCompleto} (C.C. ${inst.documento}) eliminado del sistema.`
    );
  };

  // =====================================================================
  // GESTIÓN DE PARAMETRIZACIONES Y TABLAS MAESTRAS
  // =====================================================================

  const handleGuardarEspecialidad = (especialidad: EspecialidadTematica) => {
    setEspecialidades(prev => {
      const exists = prev.some(e => e.id === especialidad.id);
      if (exists) {
        return prev.map(e => e.id === especialidad.id ? especialidad : e);
      }
      return [especialidad, ...prev];
    });
    upsertEspecialidadInSupabase(especialidad).catch(err => {
      console.error('Error al guardar la especialidad temática en Supabase:', err);
    });

    registrarLog(
      'GUARDAR_ESPECIALIDAD_TEMATICA',
      'Parametrizaciones',
      `Especialidad temática "${especialidad.nombre}" (${especialidad.area}) guardada.`
    );
  };

  const handleEliminarEspecialidad = (id: string) => {
    const target = especialidades.find(e => e.id === id);
    setEspecialidades(prev => prev.filter(e => e.id !== id));
    deleteEspecialidadFromSupabase(id).catch(err => {
      console.error('Error al eliminar la especialidad temática en Supabase:', err);
    });
    if (target) {
      registrarLog(
        'ELIMINAR_ESPECIALIDAD_TEMATICA',
        'Parametrizaciones',
        `Especialidad temática "${target.nombre}" eliminada.`
      );
    }
  };

  const handleAutoGenerarEspecialidades = () => {
    if (competencias.length === 0) {
      alert('No hay competencias curriculares cargadas en el sistema.\nCarga primero una planeación pedagógica (GPFI-F-134) en el módulo de Ingesta o Competencias.');
      return;
    }

    const generadas = generarEspecialidadesDesdeCompetencias(competencias, especialidades);
    setEspecialidades(generadas);

    registrarLog(
      'AUTOGENERAR_ESPECIALIDADES_TEMATICAS',
      'Parametrizaciones',
      `Auto-generadas ${generadas.length} especialidades temáticas a partir de ${competencias.length} competencias.`
    );

    alert(`✓ ¡Se estructuraron exitosamente ${generadas.length} especialidades temáticas concisas a partir de las competencias de la planeación pedagógica!`);
  };

  const handleGuardarAmbiente = (ambiente: AmbienteAprendizaje) => {
    setAmbientes(prev => {
      const exists = prev.some(a => a.id === ambiente.id);
      if (exists) {
        return prev.map(a => a.id === ambiente.id ? ambiente : a);
      }
      return [ambiente, ...prev];
    });

    insertOrUpdateAmbienteInSupabase(ambiente).catch(err => {
      console.warn('Persistencia en Supabase no disponible para ambientes:', err);
    });

    registrarLog(
      'GUARDAR_AMBIENTE_FORMACION',
      'Parametrizaciones',
      `Ambiente "${ambiente.nombre}" (${ambiente.tipo}) guardado.`
    );
  };

  const handleEliminarAmbiente = (id: string) => {
    const target = ambientes.find(a => a.id === id);
    setAmbientes(prev => prev.filter(a => a.id !== id));
    deleteAmbienteFromSupabase(id).catch(err => {
      console.warn('Persistencia en Supabase no disponible para ambientes:', err);
    });
    if (target) {
      registrarLog(
        'ELIMINAR_AMBIENTE_FORMACION',
        'Parametrizaciones',
        `Ambiente de formación "${target.nombre}" eliminado.`
      );
    }
  };

  // =====================================================================
  // GESTIÓN Y EDICIÓN DE PROGRAMAS DE FORMACIÓN
  // =====================================================================

  const handleOpenEditarPrograma = (programa: ProgramaFormacion) => {
    setProgramaParaEditar(programa);
    setIsModalProgramaOpen(true);
  };

  const handleOpenCrearPrograma = () => {
    setProgramaParaEditar(null);
    setIsModalProgramaOpen(true);
  };

  const handleOpenEditarProgramaFichaActiva = () => {
    if (!selectedFicha) {
      handleOpenCrearPrograma();
      return;
    }
    const progExistente = programas.find(p => p.codigo === selectedFicha.programaCodigo);
    if (progExistente) {
      setProgramaParaEditar(progExistente);
    } else {
      const nuevoProg: ProgramaFormacion = {
        id: `prog_${selectedFicha.programaCodigo}`,
        codigo: selectedFicha.programaCodigo,
        nombre: selectedFicha.programaNombre,
        version: selectedFicha.version,
        nivelFormacion: selectedFicha.nivelFormacion as any,
        lineaTecnologica: 'Tecnologías de la Información y las Comunicaciones',
        redConocimiento: 'Informática, Diseño y Desarrollo de Software',
        duracionLectivaHoras: selectedFicha.horasDirectasTotales || 3120,
        duracionProductivaHoras: selectedFicha.horasIndependientesTotales || 864,
        duracionTotalHoras: (selectedFicha.horasDirectasTotales || 3120) + (selectedFicha.horasIndependientesTotales || 864),
        estado: 'ACTIVO',
        descripcion: 'Programa de formación integral.'
      };
      setProgramaParaEditar(nuevoProg);
    }
    setIsModalProgramaOpen(true);
  };

  const handleGuardarPrograma = async (programaActualizado: ProgramaFormacion, oldCodigo: string) => {
    // 1. Actualizar el catálogo de programas en memoria
    setProgramas(prev => {
      const exists = prev.some(p => p.id === programaActualizado.id || p.codigo === oldCodigo);
      if (exists) {
        return prev.map(p => (p.id === programaActualizado.id || p.codigo === oldCodigo) ? programaActualizado : p);
      }
      return [programaActualizado, ...prev];
    });

    // 2. Sincronizar en cascada todas las fichas vinculadas al programa
    setFichas(prev => prev.map(f => {
      if (f.programaCodigo === oldCodigo || f.programaCodigo === programaActualizado.codigo) {
        return {
          ...f,
          programaCodigo: programaActualizado.codigo,
          programaNombre: programaActualizado.nombre,
          version: programaActualizado.version,
          nivelFormacion: programaActualizado.nivelFormacion,
          horasDirectasTotales: programaActualizado.duracionLectivaHoras,
          horasIndependientesTotales: programaActualizado.duracionProductivaHoras
        };
      }
      return f;
    }));

    // 3. Actualizar la ficha seleccionada en el estado si coincide
    setSelectedFicha(prev => {
      if (!prev) return null;
      if (prev.programaCodigo === oldCodigo || prev.programaCodigo === programaActualizado.codigo) {
        return {
          ...prev,
          programaCodigo: programaActualizado.codigo,
          programaNombre: programaActualizado.nombre,
          version: programaActualizado.version,
          nivelFormacion: programaActualizado.nivelFormacion,
          horasDirectasTotales: programaActualizado.duracionLectivaHoras,
          horasIndependientesTotales: programaActualizado.duracionProductivaHoras
        };
      }
      return prev;
    });

    // 4. Registro en el libro de auditoría
    registrarLog(
      'EDICION_PROGRAMA_CURRICULAR',
      'Catálogo de Programas',
      `Programa ${programaActualizado.codigo} - ${programaActualizado.nombre} (v${programaActualizado.version}) guardado/actualizado.`
    );

    // 5. Intentar persistencia en Supabase (si está configurado)
    if (oldCodigo) {
      const res = await updateProgramaAndFichasInSupabase(oldCodigo, programaActualizado);
      if (!res.success && res.isRlsError) {
        throw new Error(res.error || 'Row Level Security activo en Supabase');
      }
    }

    // 6. Guardar el catálogo del programa en sí (metadatos como descripción/estado),
    // que antes NO se guardaba en ningún lado de Supabase — solo se denormalizaban
    // algunos campos sueltos dentro de las fichas asociadas.
    upsertProgramaInSupabase(programaActualizado).catch(err => {
      console.error('Error al guardar el programa de formación en Supabase:', err);
    });
  };

  const handleEliminarPrograma = (programaId: string) => {
    const target = programas.find(p => p.id === programaId);
    if (!target) return;
    if (confirm(`¿Confirma que desea eliminar el programa "${target.codigo} - ${target.nombre}" y sus fichas asociadas?`)) {
      setProgramas(prev => prev.filter(p => p.id !== programaId));
      setFichas(prev => prev.filter(f => f.programaCodigo !== target.codigo));
      setCompetencias(prev => prev.filter(c => c.programaCodigo !== target.codigo));
      setRaps(prev => prev.filter(r => r.programaCodigo !== target.codigo));
      deleteCompetenciasByProgramaFromSupabase(target.codigo).catch(err => {
        console.error('Error al eliminar competencias del programa en Supabase:', err);
      });
      deleteRapsByProgramaFromSupabase(target.codigo).catch(err => {
        console.error('Error al eliminar RAPs del programa en Supabase:', err);
      });
      deleteProgramaFromSupabase(target.id).catch(err => {
        console.error('Error al eliminar el programa de formación en Supabase:', err);
      });
      deleteArchivoSeguimientoByProgramaFromSupabase(target.codigo).catch(err => {
        console.error('Error al eliminar registros del archivo de seguimiento en Supabase:', err);
      });
      if (selectedFicha?.programaCodigo === target.codigo) {
        setSelectedFicha(null);
      }
      registrarLog(
        'ELIMINAR_PROGRAMA_CURRICULAR',
        'Catálogo de Programas',
        `Programa ${target.codigo} (${target.nombre}) eliminado por el usuario.`
      );
    }
  };

  const handleEliminarFicha = (fichaId: string) => {
    const target = fichas.find(f => f.id === fichaId);
    if (!target) return;

    // Misma validación estricta de dependencias que ya se usa para Instructores
    // (handleEliminarInstructor): una ficha con información hija (actividades,
    // horarios, seguimiento por RAP, juicios evaluativos u horas ejecutadas
    // reportadas) no debe poder borrarse de un click — se perdería trabajo real
    // sin aviso. Solo procede si la ficha está realmente vacía.
    const actividadesHijas = actividades.filter(a => a.fichaId === fichaId);
    const bloquesHijos = horarios.filter(h => h.fichaId === fichaId);
    const rapsSegHijos = rapsSeguimiento.filter(s => s.fichaId === fichaId);
    const juiciosHijos = reportesJuicios[target.numero_ficha];
    const horasEjecHijas = registrosHorasEjecutadas.filter(r => r.fichaNumero === target.numero_ficha);

    if (actividadesHijas.length > 0 || bloquesHijos.length > 0 || rapsSegHijos.length > 0 || juiciosHijos || horasEjecHijas.length > 0) {
      const detalles: string[] = [];
      if (actividadesHijas.length > 0) detalles.push(`${actividadesHijas.length} actividad(es) de seguimiento`);
      if (bloquesHijos.length > 0) detalles.push(`${bloquesHijos.length} bloque(s) de horario`);
      if (rapsSegHijos.length > 0) detalles.push(`${rapsSegHijos.length} registro(s) de seguimiento por RAP`);
      if (juiciosHijos) detalles.push('juicios evaluativos cargados');
      if (horasEjecHijas.length > 0) detalles.push(`${horasEjecHijas.length} registro(s) de horas ejecutadas`);
      alert(`No se puede eliminar la ficha ${target.numero_ficha} porque tiene información vinculada: ${detalles.join(', ')}. Elimine o migre esos datos primero.`);
      return;
    }

    if (confirm(`¿Confirma que desea eliminar la ficha ${target.numero_ficha} (${target.programaNombre})? No tiene información vinculada.`)) {
      setFichas(prev => prev.filter(f => f.id !== fichaId));
      setHorarios(prev => prev.filter(h => h.fichaId !== fichaId));
      setActividades(prev => prev.filter(a => a.fichaId !== fichaId));
      setRapsSeguimiento(prev => prev.filter(s => s.fichaId !== fichaId));
      // Las filas de actividades_seguimiento, bloques_horarios y raps_seguimiento en
      // Supabase tienen ON DELETE CASCADE hacia fichas, así que basta con borrar la ficha.
      deleteFichaFromSupabase(fichaId).catch(err => {
        console.error('Error al eliminar ficha en Supabase:', err);
      });
      if (selectedFicha?.id === fichaId) {
        setSelectedFicha(null);
      }
      registrarLog(
        'ELIMINAR_FICHA',
        'Gestión de Fichas',
        `Ficha ${target.numero_ficha} (${target.programaNombre}) eliminada del sistema.`
      );
    }
  };

  const handleEditarFicha = (ficha: Ficha) => {
    setFichaParaEditar(ficha);
    setIsModalFichaOpen(true);
  };

  const handleActualizarFicha = (fichaActualizada: Ficha) => {
    setFichas(prev => prev.map(f => f.id === fichaActualizada.id ? fichaActualizada : f));
    if (selectedFicha?.id === fichaActualizada.id) {
      setSelectedFicha(fichaActualizada);
    }
    updateFichaInSupabase(fichaActualizada.id, fichaActualizada).then(res => {
      if (!res.success) {
        console.error('Error al actualizar ficha en Supabase:', res.error);
        alert(`Los cambios de la ficha quedaron en pantalla, pero NO se guardaron en Supabase:\n\n${res.error}`);
      }
    }).catch(err => {
      console.error('Error al actualizar ficha en Supabase:', err);
    });
    setFichaParaEditar(null);
    registrarLog(
      'EDITAR_FICHA',
      'Gestión de Fichas',
      `Ficha ${fichaActualizada.numero_ficha} actualizada (${fichaActualizada.programaNombre}).`
    );
  };

  // Manejo de Competencias y RAPs (Archivo de Seguimiento)
  const handleActualizarCompetenciasYRaps = (
    nuevasComp: Competencia[], 
    nuevosRaps: ResultadoAprendizaje[],
    nuevosRegistrosSeg?: RegistroArchivoSeguimiento[]
  ) => {
    // ids siempre UUID válidos (lo que viene de datos viejos o de cualquier
    // pantalla que todavía genere ids con prefijo de texto se corrige aquí,
    // en el único punto por donde pasa TODO cambio del catálogo).
    const compsSaneadas = sanearIdsCatalogo(nuevasComp);
    const rapsSaneados = sanearIdsCatalogo(nuevosRaps);
    setCompetencias(compsSaneadas);
    setRaps(rapsSaneados);

    // Programas afectados = los que tenían algo antes + los que tienen algo
    // ahora (así también se borra en Supabase lo que se quitó en la app).
    const programasAfectados = Array.from(new Set<string | null>([
      ...competencias.map(c => c.programaCodigo || null),
      ...raps.map(r => r.programaCodigo || null),
      ...compsSaneadas.map(c => c.programaCodigo || null),
      ...rapsSaneados.map(r => r.programaCodigo || null)
    ]));
    sincronizarCatalogoEnSupabase(programasAfectados, compsSaneadas, rapsSaneados);

    if (nuevosRegistrosSeg && nuevosRegistrosSeg.length > 0) {
      const progTarget = nuevosRegistrosSeg[0]?.programaCodigo;
      setRegistrosArchivoSeguimiento(prev => {
        const otros = progTarget ? prev.filter(r => r.programaCodigo !== progTarget) : prev;
        return [...otros, ...nuevosRegistrosSeg];
      });
      // El archivo REEMPLAZA completo lo del programa (igual que en memoria):
      // primero se borra lo anterior de ese programa en Supabase y luego se
      // sube el set nuevo, para no dejar filas huérfanas de un cargue previo.
      (async () => {
        if (progTarget) {
          await deleteArchivoSeguimientoByProgramaFromSupabase(progTarget).catch(err => {
            console.error('Error al limpiar registros previos del archivo de seguimiento en Supabase:', err);
          });
        }
        bulkUpsertArchivoSeguimientoInSupabase(nuevosRegistrosSeg).catch(err => {
          console.error('Error al sincronizar el archivo de seguimiento en Supabase:', err);
        });
      })();
    }

    // Auto-generar y enriquecer especialidades temáticas concisas desde las competencias
    if (compsSaneadas.length > 0) {
      setEspecialidades(prevEsp => {
        const nuevasEsp = generarEspecialidadesDesdeCompetencias(compsSaneadas, prevEsp);
        nuevasEsp.forEach(esp => {
          upsertEspecialidadInSupabase(esp).catch(err => {
            console.error('Error al sincronizar especialidad temática en Supabase:', err);
          });
        });
        return nuevasEsp;
      });
    }

    registrarLog(
      'ARCHIVO_SEGUIMIENTO_ACTUALIZADO',
      'Competencias & Seguimiento',
      `Sincronizadas ${nuevasComp.length} Competencias, ${nuevosRaps.length} RAPs y ${nuevosRegistrosSeg?.length || 0} registros granulares de seguimiento.`
    );
  };

  // Manejo del "Reporte de Instructores por Ficha" de SofiaPlus (horas por
  // instructor y competencia). Reglas:
  //  (1) la ficha del archivo debe coincidir con la ficha seleccionada;
  //  (2) cada fila se empareja por NOMBRE de competencia contra el catálogo
  //      del programa (el archivo no trae códigos; antes se comparaba el
  //      nombre contra el código COMP-xx y nunca coincidía — por eso las
  //      horas no aparecían en Seguimiento);
  //  (3) nunca crea instructores: solo enriquece a los que ya existen;
  //  (4) cada cargue REEMPLAZA las horas previas de esa ficha (el reporte es
  //      acumulado) y se guarda en Supabase (horas_ejecutadas_ficha).
  // Sube a Supabase el perfil recalculado de instructores que YA existían
  // (los nuevos se insertan con su perfil completo en su propio flujo).
  const actualizarPerfilesEnSupabase = (lista: Instructor[]) => {
    if (lista.length === 0) return;
    (async () => {
      for (const inst of lista) {
        const r = await updateInstructorInSupabase(inst.id, { perfilTecnico: inst.perfilTecnico, especialidad: inst.especialidad });
        if (!r.success) console.error(`No se pudo actualizar en Supabase el perfil de ${inst.nombreCompleto}:`, r.error);
      }
    })();
  };

  const handleGuardarHorasEjecutadas = (
    nuevosRegistros: RegistroHorasEjecutadas[],
    totalesSofia?: TotalesHorasSofia
  ): { exito: boolean; mensaje: string } => {
    if (!selectedFicha) {
      return { exito: false, mensaje: 'Selecciona una ficha antes de cargar el Reporte de Instructores por Ficha.' };
    }
    if (currentUser.rol === 'INSTRUCTOR_LIDER' && !esFichaDelLider(selectedFicha, currentUser, instructores)) {
      return { exito: false, mensaje: `La ficha ${selectedFicha.numero_ficha} no está a tu cargo como instructor líder. Solo puedes cargar archivos de tus fichas.` };
    }

    const fichasEnArchivo = Array.from(new Set(nuevosRegistros.map(r => r.fichaNumero).filter((f): f is string => !!f)));
    if (fichasEnArchivo.length === 0) {
      return { exito: false, mensaje: 'No se pudo determinar a qué ficha corresponde este archivo. Verifica que incluya el número de ficha.' };
    }
    if (fichasEnArchivo.some(f => f !== selectedFicha.numero_ficha)) {
      return {
        exito: false,
        mensaje: `El archivo corresponde a la ficha ${fichasEnArchivo.join(', ')}, pero tienes seleccionada la ficha ${selectedFicha.numero_ficha}. Se rechaza el cargue para evitar mezclar datos entre fichas.`
      };
    }

    const catalogo = competencias
      .filter(c => c.programaCodigo === selectedFicha.programaCodigo)
      .map(c => ({ codigo: c.codigo, denominacion: c.denominacion }));
    if (catalogo.length === 0) {
      return {
        exito: false,
        mensaje: 'Esta ficha todavía no tiene competencias cargadas (Planeación Pedagógica). Carga primero ese archivo para el programa.'
      };
    }

    const sinCatalogo = new Set<string>();
    const registrosFicha: RegistroHorasEjecutadas[] = [];
    nuevosRegistros.forEach(r => {
      const texto = r.competenciaDenominacion && !r.competenciaDenominacion.startsWith('Competencia ')
        ? r.competenciaDenominacion
        : r.competenciaCodigo;
      const { competencia } = matchCompetencia(texto || '', catalogo);
      if (!competencia) {
        sinCatalogo.add((texto || '').slice(0, 70));
        return;
      }
      registrosFicha.push({
        ...r,
        id: esUuidValido(r.id) ? r.id : generarUuid(),
        fichaNumero: selectedFicha.numero_ficha,
        competenciaCodigo: competencia.codigo,
        competenciaDenominacion: competencia.denominacion
      });
    });

    if (registrosFicha.length === 0) {
      return {
        exito: false,
        mensaje: 'Ninguna competencia del archivo coincide con el catálogo del programa de esta ficha.' +
          (sinCatalogo.size > 0 ? ` Sin coincidencia: ${Array.from(sinCatalogo).join(' | ')}` : '')
      };
    }

    // Reemplaza (no suma) las horas previas de ESTA ficha
    setRegistrosHorasEjecutadas(prev => [
      ...prev.filter(r => r.fichaNumero !== selectedFicha.numero_ficha),
      ...registrosFicha
    ]);

    const sumArchivo = Math.round(registrosFicha.reduce((acc, r) => acc + r.horasEjecutadas, 0) * 10) / 10;
    // Total ejecutado oficial de SofiaPlus (encabezado del reporte), si viene.
    const horasEjecutadasFicha = Math.round(totalesSofia?.ejecutadas ?? sumArchivo);
    setFichas(prevFichas => prevFichas.map(f => f.id === selectedFicha.id ? { ...f, horasEjecutadas: horasEjecutadasFicha } : f));
    setSelectedFicha(prev => prev && prev.id === selectedFicha.id ? { ...prev, horasEjecutadas: horasEjecutadasFicha } : prev);

    // Instructores: se enriquecen los existentes y se CREAN los que no estén
    // en la planta (igual que en Juicios Evaluativos), sin documento.
    const horasInst = crearOEnriquecerInstructoresDesdeHoras(registrosFicha, instructores);
    // Perfil armado según las competencias que cada instructor orienta
    // (solo para perfiles puestos por el sistema; uno escrito a mano no se toca).
    const perfilesHoras = aplicarPerfilesPorCompetencias(horasInst.instructores);
    const instructoresActualizados = perfilesHoras.instructores;
    const idsNuevosHoras = new Set(horasInst.nuevos.map(n => n.id));
    const instructoresNuevos = instructoresActualizados.filter(i => idsNuevosHoras.has(i.id));
    setInstructores(instructoresActualizados);
    actualizarPerfilesEnSupabase(perfilesHoras.cambiados.filter(i => !idsNuevosHoras.has(i.id)));

    // Guardar en Supabase (primero los instructores nuevos)
    (async () => {
      for (const inst of instructoresNuevos) {
        const r = await insertInstructorInSupabase(inst);
        if (!r.success) console.error(`No se pudo crear en Supabase el instructor ${inst.nombreCompleto}:`, r.error);
      }
      const r1 = await reemplazarHorasFichaEnSupabase(selectedFicha.numero_ficha, registrosFicha);
      const r2 = await updateFichaInSupabase(selectedFicha.id, { horasEjecutadas: horasEjecutadasFicha });
      const errores = [r1, r2].filter(r => !r.success).map(r => r.error);
      if (errores.length > 0) {
        console.error('Error al guardar horas en Supabase:', errores);
        alert(`Las horas quedaron en pantalla, pero NO se guardaron en Supabase:\n\n${errores.join('\n')}\n\nSi el mensaje habla de la tabla horas_ejecutadas_ficha, corre en Supabase el script 20260929f_horas_y_resultados_juicios.sql.`);
      }
    })();

    registrarLog(
      'HORAS_EJECUTADAS_INGESTADAS',
      'Ingesta & Seguimiento',
      `Reporte de Instructores por Ficha ${selectedFicha.numero_ficha}: ${registrosFicha.length} registros en ${new Set(registrosFicha.map(r => r.competenciaCodigo)).size} competencias` +
      (totalesSofia ? ` (SofiaPlus: ${totalesSofia.programadas} h programadas, ${totalesSofia.ejecutadas} h ejecutadas, ${totalesSofia.pendientes} h pendientes).` : '.') +
      (sinCatalogo.size > 0 ? ` Sin coincidencia en el catálogo: ${Array.from(sinCatalogo).join(' | ')}.` : '')
    );

    return {
      exito: true,
      mensaje: `Horas cargadas para la ficha ${selectedFicha.numero_ficha}: ${registrosFicha.length} registros en ${new Set(registrosFicha.map(r => r.competenciaCodigo)).size} competencias` +
        (instructoresNuevos.length > 0 ? `. Se crearon ${instructoresNuevos.length} instructor(es) nuevo(s) en la planta` : '') +
        (totalesSofia ? ` — SofiaPlus reporta ${Math.round(totalesSofia.ejecutadas)} h ejecutadas de ${Math.round(totalesSofia.programadas)} h programadas.` : '.') +
        (sinCatalogo.size > 0 ? ` ⚠ ${sinCatalogo.size} competencia(s) sin coincidencia en el catálogo: ${Array.from(sinCatalogo).join(' | ')}` : '')
    };
  };

  // Manejo de Juicios Evaluativos por Ficha SofiaPlus (.xls). Reglas:
  // (1) la ficha ya debe existir y coincidir con la seleccionada — nunca se
  //     auto-crea una ficha desde este archivo;
  // (2) la ficha ya debe tener competencias/RAPs (Planeación Pedagógica);
  // (3) cada (competencia, RAP) del archivo se empareja contra el catálogo
  //     real por texto (nunca por código — SofiaPlus y Planeación Pedagógica
  //     usan numeraciones distintas); si no hay coincidencia con confianza
  //     suficiente (Etapa Práctica, competencia sin match, o RAP ambiguo),
  //     ese juicio se salta sin tocar Seguimiento;
  // (4) un RAP pasa a CALIFICADO solo si ≥70% de los aprendices EN FORMACIÓN
  //     o CONDICIONADO (activos) tienen juicio APROBADO en ese RAP puntual;
  // (5) el instructor asignado en Seguimiento NUNCA se toca desde aquí —
  //     el "funcionario que evaluó" no es necesariamente quien dicta el RAP;
  // (6) se recalculan retención/deserción de la ficha desde los estados
  //     reales de matrícula de los aprendices de este cargue;
  // (7) no queda persistido el crudo del archivo (solo en memoria de sesión).
  // fichaObjetivo es opcional: cuando el cargue viene de un contexto que ya
  // sabe exactamente para qué ficha es (p. ej. la acción "cargar juicios"
  // sobre una fila puntual en Avance de Fichas), se pasa explícitamente para
  // no depender de cuál sea la ficha seleccionada globalmente en ese momento
  // — de lo contrario, si el usuario tiene otra ficha activa en el resto de
  // la app, el archivo se rechazaría por "no coincidir" aunque sí coincida
  // con la ficha sobre la que realmente se quiso actuar.
  const handleGuardarJuiciosEvaluativos = (reporte: ReporteJuiciosFicha, fichaObjetivo?: Ficha): { exito: boolean; mensaje: string } => {
    const ficha = fichaObjetivo || selectedFicha;
    if (!ficha) {
      return { exito: false, mensaje: 'Selecciona una ficha antes de cargar el reporte de Juicios Evaluativos.' };
    }
    if (currentUser.rol === 'INSTRUCTOR_LIDER' && !esFichaDelLider(ficha, currentUser, instructores)) {
      return { exito: false, mensaje: `La ficha ${ficha.numero_ficha} no está a tu cargo como instructor líder. Solo puedes cargar archivos de tus fichas.` };
    }
    if (reporte.fichaNumero !== ficha.numero_ficha) {
      return {
        exito: false,
        mensaje: `El archivo corresponde a la ficha ${reporte.fichaNumero}, pero se quiere cargar sobre la ficha ${ficha.numero_ficha}. Se rechaza el cargue para evitar mezclar datos entre fichas.`
      };
    }

    const catalogoRapsPrograma = raps.filter(r => r.programaCodigo === ficha.programaCodigo);
    if (catalogoRapsPrograma.length === 0) {
      return {
        exito: false,
        mensaje: 'Esta ficha todavía no tiene competencias ni RAPs cargados (Planeación Pedagógica). Carga primero ese archivo para el programa antes de subir Juicios Evaluativos.'
      };
    }

    // 1) Auto-crear/enriquecer instructores detectados como evaluadores en
    // SofiaPlus (sin documento, sin cuenta de usuario, nunca como líder).
    const resultadoInstructoresBase = caracterizarInstructoresDesdeJuicios(reporte, instructores);
    // Perfil armado según las competencias que cada instructor ha evaluado
    // (solo para perfiles puestos por el sistema; uno escrito a mano no se toca).
    const perfilesJuicios = aplicarPerfilesPorCompetencias(resultadoInstructoresBase.instructores);
    const resultadoInstructores = { ...resultadoInstructoresBase, instructores: perfilesJuicios.instructores };
    setInstructores(resultadoInstructores.instructores);
    const idsPreviosPerfil = new Set(instructores.map(i => i.id));
    actualizarPerfilesEnSupabase(perfilesJuicios.cambiados.filter(i => idsPreviosPerfil.has(i.id)));

    // 2) Emparejar cada (competencia, RAP) del archivo contra el catálogo
    // real y agregar, por RAP real, cuántos aprendices activos fueron
    // evaluados y cuántos de ellos tienen juicio APROBADO.
    interface AgregadoRap {
      aprobadosActivos: number;
      rap: ResultadoAprendizaje;
      /** Quién registró los juicios de este RAP en SofiaPlus (nombre normalizado → nombre y conteo). */
      evaluadores: Map<string, { nombre: string; veces: number }>;
    }
    const normalizarPersona = (t: string) => t.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z ]/g, ' ').replace(/\s+/g, ' ').trim();
    // SofiaPlus: "CC 12495918 - ALFREDO GARCIA MANDON" → "ALFREDO GARCIA MANDON"
    // (el documento del funcionario no se guarda en ningún lado).
    const nombreDeFuncionario = (f?: string) => {
      const t = (f || '').trim();
      if (!t || t === '-' || t.length < 5) return '';
      const partes = t.split('-');
      return (partes.length >= 2 ? partes.slice(1).join('-') : t.replace(/\d/g, '')).trim();
    };
    const agregadoPorRap = new Map<string, AgregadoRap>();
    let contadorEtapaPractica = 0;
    let contadorSinMatch = 0;
    let contadorAmbiguo = 0;

    // IMPORTANTE: el 70% se calcula sobre el TOTAL de aprendices activos de
    // la ficha (EN FORMACION + CONDICIONADO), no solo sobre los que ya
    // tienen una fila de juicio para ese RAP puntual en este archivo. Si se
    // usara como denominador solo "los ya evaluados en este RAP", un RAP
    // podría marcarse CALIFICADO con, por ejemplo, 15 aprobados de 15
    // evaluados aunque todavía falten 10 de los 25 aprendices activos por
    // evaluar — un falso 100% que en realidad es 60% del grupo.
    const totalActivosFicha = reporte.aprendices.filter(
      a => a.estadoMatricula === 'EN FORMACION' || a.estadoMatricula === 'CONDICIONADO'
    ).length;

    reporte.aprendices.forEach(ap => {
      const esActivo = ap.estadoMatricula === 'EN FORMACION' || ap.estadoMatricula === 'CONDICIONADO';
      ap.juicios.forEach(j => {
        const rapTexto = j.rapDenominacion || '';
        if (!rapTexto) return;
        const { rap, motivo } = emparejarJuicioConCatalogo(j.competenciaDenominacion || '', rapTexto, catalogoRapsPrograma);

        if (motivo === 'ETAPA_PRACTICA') { contadorEtapaPractica += 1; return; }
        if (motivo === 'RAP_AMBIGUO') { contadorAmbiguo += 1; return; }
        if (!rap) { contadorSinMatch += 1; return; }
        if (!esActivo) return; // el 70% se calcula solo sobre aprendices activos

        if (!agregadoPorRap.has(rap.id)) {
          agregadoPorRap.set(rap.id, { aprobadosActivos: 0, rap, evaluadores: new Map() });
        }
        const agg = agregadoPorRap.get(rap.id)!;
        const estadoJuicio = (j.estado || '').toUpperCase();
        if (estadoJuicio.includes('APROBADO') && !estadoJuicio.includes('NO APROBADO')) {
          agg.aprobadosActivos += 1;
        }
        const nombreEval = nombreDeFuncionario(j.funcionarioEvaluador);
        if (nombreEval) {
          const k = normalizarPersona(nombreEval);
          const e = agg.evaluadores.get(k) || { nombre: nombreEval, veces: 0 };
          e.veces += 1;
          agg.evaluadores.set(k, e);
        }
      });
    });

    // 3) Solo los RAPs que alcanzan >=70% de aprobación sobre el TOTAL de
    // activos de la ficha pasan a CALIFICADO. Los demás se dejan exactamente
    // como estaban — como si el instructor no hubiese calificado.
    // Instructor que calificó cada RAP según SofiaPlus: el funcionario que más
    // juicios registró en ese RAP. Se busca en la planta de instructores
    // (ignorando "Ing." y tildes). Solo se enlaza el id si el instructor ya
    // existía antes de este cargue (así existe en Supabase); si no, se guarda
    // solo el nombre.
    const idsInstructoresPrevios = new Set(instructores.map(i => i.id));
    const instructoresNuevosDeJuicios = resultadoInstructores.instructores.filter(i => !idsInstructoresPrevios.has(i.id));
    const tokensDe = (t: string) => new Set(normalizarPersona(t).split(' ').filter(w => w.length > 1 && w !== 'ING'));
    const buscarInstructor = (nombre: string): Instructor | undefined => {
      const tn = tokensDe(nombre);
      if (tn.size === 0) return undefined;
      let mejor: Instructor | undefined;
      let mejorPuntaje = 0;
      for (const inst of resultadoInstructores.instructores) {
        const ti = tokensDe(inst.nombreCompleto || `${inst.nombres} ${inst.apellidos}`);
        let comunes = 0;
        tn.forEach(w => { if (ti.has(w)) comunes += 1; });
        const puntaje = comunes / Math.max(tn.size, ti.size);
        if (puntaje > mejorPuntaje) { mejorPuntaje = puntaje; mejor = inst; }
      }
      return mejorPuntaje >= 0.75 ? mejor : undefined;
    };
    const evaluadorPrincipal = (agg: AgregadoRap) => {
      let top: { nombre: string; veces: number } | undefined;
      agg.evaluadores.forEach(e => { if (!top || e.veces > top.veces) top = e; });
      if (!top) return undefined;
      const inst = buscarInstructor(top.nombre);
      return {
        // Se enlaza el instructor encontrado (aunque sea nuevo): abajo se sube
        // primero a Supabase, y si aun así no existe allá, el guardado del
        // seguimiento se hace sin el enlace (ver upsertRapSeguimientoInSupabase).
        instructorId: inst ? inst.id : undefined,
        instructorNombre: inst ? inst.nombreCompleto : top.nombre
      };
    };

    let rapsCalificados = 0;
    const seguimientoParaSupabase: RapSeguimiento[] = [];
    setRapsSeguimiento(prevSeg => {
      const nuevoSeg = [...prevSeg];
      seguimientoParaSupabase.length = 0;
      agregadoPorRap.forEach((agg) => {
        const { aprobadosActivos, rap } = agg;
        if (totalActivosFicha === 0) return;
        const pct = (aprobadosActivos / totalActivosFicha) * 100;
        if (pct < 70) return;

        rapsCalificados += 1;
        const evaluador = evaluadorPrincipal(agg);
        const idx = nuevoSeg.findIndex(s =>
          (s.fichaId === ficha.id || s.fichaNumero === ficha.numero_ficha) &&
          s.competenciaCodigo === rap.competenciaCodigo &&
          s.rapCodigo === rap.codigoRap
        );

        if (idx >= 0) {
          const actual = nuevoSeg[idx];
          // Un instructor puesto a mano o desde Horarios se respeta. Solo se
          // llena con quien calificó en SofiaPlus si el RAP no tenía
          // instructor, o si el que tenía también venía de Juicios.
          const tomarDeJuicios = !!evaluador && (
            (!actual.instructorId && !actual.instructorNombre) || actual.fuenteInstructor === 'JUICIOS'
          );
          nuevoSeg[idx] = {
            ...actual,
            ...(tomarDeJuicios ? {
              instructorId: evaluador!.instructorId,
              instructorNombre: evaluador!.instructorNombre,
              fuenteInstructor: 'JUICIOS' as const
            } : {}),
            estado: 'CALIFICADO',
            fuenteEstado: 'JUICIOS',
            fechaActualizacion: new Date().toISOString()
          };
          seguimientoParaSupabase.push(nuevoSeg[idx]);
        } else {
          nuevoSeg.push({
            ...(evaluador ? {
              instructorId: evaluador.instructorId,
              instructorNombre: evaluador.instructorNombre,
              fuenteInstructor: 'JUICIOS' as const
            } : {}),
            // UUID real: raps_seguimiento.id es UUID en Supabase — un id con
            // prefijo de texto hacía que el upsert lo rechazara por completo.
            id: generarUuid(),
            fichaId: ficha.id,
            fichaNumero: ficha.numero_ficha,
            programaCodigo: ficha.programaCodigo,
            competenciaCodigo: rap.competenciaCodigo,
            competenciaDenominacion: rap.competenciaDenominacion || '',
            rapCodigo: rap.codigoRap,
            rapDenominacion: rap.denominacion,
            estado: 'CALIFICADO',
            fuenteEstado: 'JUICIOS',
            fechaActualizacion: new Date().toISOString()
          });
          seguimientoParaSupabase.push(nuevoSeg[nuevoSeg.length - 1]);
        }
      });
      return nuevoSeg;
    });

    // Antes lo que marcaba Juicios (CALIFICADO) quedaba solo en este
    // navegador. Ahora se sube a Supabase (tabla raps_seguimiento).
    setTimeout(() => {
      (async () => {
        // 1) Primero los instructores detectados en este archivo que no
        //    existían: sin esto, el seguimiento que los referencia no podía
        //    guardarse (llave foránea a `instructores`).
        for (const inst of instructoresNuevosDeJuicios) {
          const r = await insertInstructorInSupabase(inst);
          if (!r.success) console.error(`No se pudo subir a Supabase el instructor ${inst.nombreCompleto}:`, r.error);
        }
        // 2) Luego el seguimiento por RAP.
        let primerError = '';
        let fallidos = 0;
        for (const item of seguimientoParaSupabase) {
          const res = await upsertRapSeguimientoInSupabase(item);
          if (!res.success) {
            fallidos += 1;
            if (!primerError) primerError = res.error || '';
            console.error('Error al guardar seguimiento de RAP (desde Juicios) en Supabase:', res.error);
          }
        }
        if (fallidos > 0) {
          alert(`${fallidos} de ${seguimientoParaSupabase.length} RAPs calificados desde Juicios no se pudieron guardar en Supabase:\n\n${primerError}`);
        }
      })();
    }, 0);

    // 4) Recalcular retención/deserción desde los estados reales de
    // matrícula de este cargue (aplazado, cancelado, retiro voluntario,
    // condicionado, etc.), no desde los agregados que traía el archivo.
    const totalAprendices = reporte.aprendices.length;
    const activosCount = reporte.aprendices.filter(a => a.estadoMatricula === 'EN FORMACION' || a.estadoMatricula === 'CONDICIONADO').length;
    const canceladosCount = reporte.aprendices.filter(a => a.estadoMatricula === 'CANCELADO').length;
    const retiroVolCount = reporte.aprendices.filter(a => a.estadoMatricula === 'RETIRO VOLUNTARIO').length;
    const aplazadosCount = reporte.aprendices.filter(a => a.estadoMatricula === 'APLAZADO').length;
    const condicionadosCount = reporte.aprendices.filter(a => a.estadoMatricula === 'CONDICIONADO').length;
    const trasladadosCount = reporte.aprendices.filter(a => a.estadoMatricula === 'TRASLADADO').length;
    const retencion = totalAprendices > 0 ? Number(((activosCount / totalAprendices) * 100).toFixed(1)) : ficha.tasaRetencion ?? 100;
    const desercion = totalAprendices > 0 ? Number((((canceladosCount + retiroVolCount) / totalAprendices) * 100).toFixed(1)) : ficha.tasaDesercion ?? 0;

    setFichas(prev => prev.map(f => {
      if (f.id !== ficha.id) return f;
      return {
        ...f,
        // matriculaInicial NUNCA se toca desde aquí: es la línea base fija
        // de matrícula con la que se calculan las fórmulas institucionales
        // de cierre (ver CierresView, PRD 3.4). El total de aprendices que
        // trae ESTE cargue de Juicios es el estado actual, no la matrícula
        // inicial de la ficha.
        aprendicesActivos: activosCount,
        aprendicesRetiroVoluntario: retiroVolCount,
        aprendicesCancelados: canceladosCount,
        aprendicesAplazados: aplazadosCount,
        aprendicesCondicionados: condicionadosCount,
        aprendicesTrasladados: trasladadosCount,
        tasaRetencion: retencion,
        tasaDesercion: desercion,
        progresoCurricular: reporte.porcentajeAprobacionFicha
      };
    }));

    // Antes estos indicadores solo quedaban en este navegador (y al abrir la
    // app se reiniciaban a 100% / 0%). Ahora se guardan en Supabase.
    updateFichaInSupabase(ficha.id, {
      aprendicesActivos: activosCount,
      aprendicesRetiroVoluntario: retiroVolCount,
      aprendicesCancelados: canceladosCount,
      aprendicesAplazados: aplazadosCount,
      aprendicesCondicionados: condicionadosCount,
      aprendicesTrasladados: trasladadosCount,
      tasaRetencion: retencion,
      tasaDesercion: desercion,
      progresoCurricular: reporte.porcentajeAprobacionFicha
    }).then(res => {
      if (!res.success) console.error('Error al guardar los indicadores de Juicios de la ficha en Supabase:', res.error);
    });

    // Se conserva en memoria (sesión) solo para el detalle de "último cargue" —
    // no se persiste en localStorage ni se usa como fuente de verdad.
    setReportesJuicios(prev => ({ ...prev, [reporte.fichaNumero]: reporte }));

    const detallesSalto: string[] = [];
    if (contadorEtapaPractica > 0) detallesSalto.push(`${contadorEtapaPractica} de Etapa Práctica (fuera de alcance)`);
    if (contadorSinMatch > 0) detallesSalto.push(`${contadorSinMatch} sin RAP correspondiente en el catálogo`);
    if (contadorAmbiguo > 0) detallesSalto.push(`${contadorAmbiguo} con RAP ambiguo (varios candidatos igual de parecidos)`);

    registrarLog(
      'CARGUE_JUICIOS_EVALUATIVOS',
      'Ingesta de Datos',
      `Reporte oficial de Juicios Evaluativos SofiaPlus cargado para la Ficha ${reporte.fichaNumero}. ${reporte.totalRegistros} juicios, ${reporte.totalAprendices} aprendices, ${rapsCalificados} RAP(s) marcados CALIFICADO (>=70% activos aprobados).` +
      (detallesSalto.length > 0 ? ` Juicios saltados sin tocar Seguimiento: ${detallesSalto.join(', ')}.` : '') +
      (resultadoInstructores.advertenciasHomonimo.length > 0 ? ` Advertencias de posible homónimo: ${resultadoInstructores.advertenciasHomonimo.join(' | ')}` : '')
    );

    return {
      exito: true,
      mensaje: `Juicios Evaluativos procesados para la ficha ${ficha.numero_ficha}: ${rapsCalificados} RAP(s) quedaron CALIFICADO(S) (≥70% de activos aprobados).` +
        (detallesSalto.length > 0 ? ` Se saltaron sin modificar Seguimiento: ${detallesSalto.join(', ')}.` : '') +
        (resultadoInstructores.advertenciasHomonimo.length > 0 ? ` ⚠ Posible(s) homónimo(s): ${resultadoInstructores.advertenciasHomonimo.join(' | ')}` : '')
    };
  };

  // Borrar estructura actual para carga limpia desde cero
  const handleLimpiarEstructura = () => {
    setCompetencias([]);
    setRaps([]);
    setRegistrosArchivoSeguimiento([]);
    localStorage.setItem('sena_competencias', JSON.stringify([]));
    localStorage.setItem('sena_raps', JSON.stringify([]));
    localStorage.setItem('sena_archivo_seguimiento_registros', JSON.stringify([]));
    deleteAllCompetenciasFromSupabase().catch(err => {
      console.error('Error al limpiar competencias en Supabase:', err);
    });
    deleteAllRapsFromSupabase().catch(err => {
      console.error('Error al limpiar RAPs en Supabase:', err);
    });
    deleteAllArchivoSeguimientoFromSupabase().catch(err => {
      console.error('Error al limpiar el archivo de seguimiento en Supabase:', err);
    });
    registrarLog(
      'ESTRUCTURA_LIMPIADA',
      'Competencias & RAPs',
      'Catálogo de competencias, RAPs y registros de seguimiento vaciados por el usuario para una recarga limpia.'
    );
  };

  // Manejo de Horarios

  // Sincroniza el Seguimiento de RAPs con el estado ACTUAL de un bloque de
  // Horario: si el bloque tiene instructor, lo asigna y pasa a EN_EJECUCION;
  // si el bloque quedó "vacante" (programado, sin instructor todavía), el RAP
  // vuelve a PENDIENTE pero SIN perder el historial de quién ya lo cubrió.
  // Se reutiliza al crear un bloque, al asignar un instructor a uno vacante y
  // al dejar vacante uno que ya tenía instructor (fin de contrato/reemplazo).
  const sincronizarSeguimientoDesdeBloque = React.useCallback((bloque: Omit<BloqueHorario, 'id'> | BloqueHorario) => {
    if (!bloque.fichaId) return;
    const fichaTarget = fichas.find(f => f.id === bloque.fichaId);
    const fichaNum = fichaTarget?.numero_ficha || selectedFicha?.numero_ficha || '';
    const progCod = fichaTarget?.programaCodigo || selectedFicha?.programaCodigo || '';

    // Competencia única del bloque: rapsAsignados nunca mezcla RAPs de
    // competencias distintas (BloqueHorario solo tiene un competenciaCodigo).
    const compCodigoBloque = bloque.competenciaCodigo;
    const codigosRapsAfectados = new Set<string>();
    if (bloque.rapsAsignados && bloque.rapsAsignados.length > 0) {
      bloque.rapsAsignados.forEach(r => codigosRapsAfectados.add(r.codigo));
    } else if (bloque.rapCodigo && !bloque.esCompetenciaCompleta) {
      codigosRapsAfectados.add(bloque.rapCodigo);
    } else if (bloque.esCompetenciaCompleta && bloque.competenciaCodigo) {
      raps.filter(r => r.competenciaCodigo === bloque.competenciaCodigo).forEach(r => codigosRapsAfectados.add(r.codigoRap));
    }
    if (codigosRapsAfectados.size === 0) return;

    const itemsParaSupabase: RapSeguimiento[] = [];

    setRapsSeguimiento(prevRapsSeg => {
      const nuevoSeg = [...prevRapsSeg];
      codigosRapsAfectados.forEach(rapCod => {
        const rapObj = raps.find(r => r.codigoRap === rapCod && r.competenciaCodigo === compCodigoBloque);
        const compObj = competencias.find(c => c.codigo === compCodigoBloque);
        // El código de RAP (p.ej. "RAP 01") se reinicia en cada competencia,
        // así que competenciaCodigo es obligatorio en la comparación.
        const idx = nuevoSeg.findIndex(s =>
          (s.fichaId === bloque.fichaId || s.fichaNumero === fichaNum) &&
          s.competenciaCodigo === compCodigoBloque &&
          s.rapCodigo === rapCod
        );
        const registroActual = idx >= 0 ? nuevoSeg[idx] : undefined;
        const mismoInstructor = !!bloque.instructorId && !!registroActual?.instructorNombre &&
          registroActual.instructorNombre === bloque.instructorNombre;

        // Asignación PROVISIONAL (menos de HORAS_PARA_FIRMEZA): si ahora llega
        // otro instructor o el espacio queda vacante, la anterior fue una
        // prueba/corrección — se parte de cómo estaba el RAP ANTES de ella,
        // sin dejarla en el historial.
        const deshacerProvisional = !mismoInstructor && registroActual?.fuenteInstructor === 'HORARIO' && esProvisionalVigente(registroActual);
        const anterior = deshacerProvisional ? restaurarAntesDeProvisional(registroActual!) : registroActual;

        // Si había un instructor EN FIRME distinto cubriendo este RAP y ahora
        // llega otro, o el bloque queda vacante, se cierra su paso en el
        // historial — nunca se borra silenciosamente.
        const huboCambioDeInstructor = !!anterior?.instructorNombre &&
          anterior.instructorNombre !== bloque.instructorNombre;
        let historialActualizado: HistorialInstructorRap[] = huboCambioDeInstructor
          ? [
              ...(anterior?.historialInstructores || []),
              {
                instructorId: anterior!.instructorId,
                instructorNombre: anterior!.instructorNombre!,
                trimestre: bloque.trimestre,
                fechaFin: new Date().toISOString(),
                motivo: bloque.instructorId ? 'REEMPLAZO' : 'VACANTE_HORARIO'
              }
            ]
          : (anterior?.historialInstructores || []);

        // Mover un bloque = liberarlo y volverlo a crear: si el MISMO
        // instructor acaba de salir de este RAP (hace menos de 2 min), no fue
        // un retiro real — se quita esa marca y se conserva su firmeza.
        let esMovimiento = false;
        const ultimo = historialActualizado[historialActualizado.length - 1];
        if (bloque.instructorId && !anterior?.instructorNombre && ultimo &&
            ultimo.instructorNombre === bloque.instructorNombre &&
            (ultimo.motivo === 'FIN_HORARIO' || ultimo.motivo === 'VACANTE_HORARIO') &&
            Date.now() - new Date(ultimo.fechaFin).getTime() < 2 * 60 * 1000) {
          historialActualizado = historialActualizado.slice(0, -1);
          esMovimiento = true;
        }

        // Un bloque vacante nunca debe forzar EN_EJECUCION; si ya estaba
        // CALIFICADO/SIN_CALIFICAR (juicio evaluativo real), eso no se toca.
        const estadoResultante: EstadoRap = bloque.instructorId
          ? (!anterior || anterior.estado === 'PENDIENTE' ? 'EN_EJECUCION' : anterior.estado)
          : (anterior && anterior.estado !== 'PENDIENTE' && anterior.estado !== 'EN_EJECUCION' ? anterior.estado : 'PENDIENTE');

        // Firmeza: un instructor nuevo en el RAP queda provisional durante
        // HORAS_PARA_FIRMEZA; el mismo instructor en otro bloque conserva su
        // condición; un espacio vacante no tiene nada que confirmar.
        const vuelveElQueEstabaEnFirme = deshacerProvisional && !!anterior?.instructorNombre &&
          anterior.instructorNombre === bloque.instructorNombre;
        const asignacionProvisional = !bloque.instructorId || esMovimiento || vuelveElQueEstabaEnFirme
          ? (vuelveElQueEstabaEnFirme ? anterior?.asignacionProvisional : undefined)
          : mismoInstructor
            ? registroActual?.asignacionProvisional
            : {
                desde: new Date().toISOString(),
                // Si se reemplaza una provisional, se recuerda el estado de
                // ANTES de la primera, para poder volver a él.
                previo: deshacerProvisional
                  ? (registroActual!.asignacionProvisional!.previo)
                  : fotoPrevia(registroActual)
              };

        const entradaFinal: RapSeguimiento = {
          id: registroActual?.id || generarUuid(),
          fichaId: bloque.fichaId,
          fichaNumero: fichaNum,
          programaCodigo: progCod,
          competenciaCodigo: compObj?.codigo || compCodigoBloque || '',
          competenciaDenominacion: compObj?.denominacion || bloque.competenciaNombre || anterior?.competenciaDenominacion || '',
          rapCodigo: rapCod,
          rapDenominacion: rapObj?.denominacion || anterior?.rapDenominacion || '',
          instructorId: bloque.instructorId || undefined,
          instructorNombre: bloque.instructorNombre || undefined,
          fuenteInstructor: 'HORARIO',
          fuenteEstado: anterior?.fuenteEstado,
          estado: estadoResultante,
          historialInstructores: historialActualizado,
          asignacionProvisional,
          fechaActualizacion: new Date().toISOString()
        };

        if (idx >= 0) nuevoSeg[idx] = entradaFinal; else nuevoSeg.push(entradaFinal);
        itemsParaSupabase.push(entradaFinal);
      });
      return nuevoSeg;
    });

    // Antes esta sincronización solo quedaba en localStorage — un Coordinador
    // en otro equipo no veía que el RAP pasó a "En Ejecución" al programarlo
    // en Horarios. Se sube también a Supabase, igual que el resto del módulo.
    itemsParaSupabase.forEach(item => {
      upsertRapSeguimientoInSupabase(item).catch(err => {
        console.error('Error al sincronizar seguimiento de RAP (desde Horario) en Supabase:', err);
      });
    });
  }, [fichas, selectedFicha, raps, competencias]);

  const handleGuardarBloque = (nuevoBloque: Omit<BloqueHorario, 'id'>) => {
    const bloque: BloqueHorario = {
      ...nuevoBloque,
      vacante: !nuevoBloque.instructorId,
      // UUID real (no `blq_<timestamp>`): la tabla bloques_horarios en
      // Supabase usa id UUID, y con un id no-UUID el insert fallaba en
      // silencio (atrapado por el .catch() de abajo) — el bloque se
      // guardaba en memoria/localStorage pero nunca llegaba a Supabase.
      id: generarUuid()
    };
    setHorarios(prev => [...prev, bloque]);
    insertHorarioInSupabase(bloque).then(res => {
      if (!res.success) {
        console.error('Error al guardar bloque de horario en Supabase:', res.error);
        alert(`El bloque quedó en pantalla, pero NO se guardó en Supabase:\n\n${res.error}`);
      }
    }).catch(err => {
      console.error('Error al guardar bloque de horario en Supabase:', err);
    });

    // Incrementar horas asignadas al instructor (si el bloque quedó vacante,
    // no hay a quién incrementarle horas todavía).
    if (nuevoBloque.instructorId) {
      setInstructores(prev => prev.map(inst => {
        if (inst.id === nuevoBloque.instructorId) {
          return { ...inst, horasSemanalesAsignadas: inst.horasSemanalesAsignadas + nuevoBloque.duracionHoras };
        }
        return inst;
      }));
    }

    // Sincronizar instructor (o dejar vacante) y estado en el Seguimiento de RAPs
    sincronizarSeguimientoDesdeBloque(bloque);

    const detalleModalidad = nuevoBloque.esCompetenciaCompleta
      ? `[COMPETENCIA COMPLETA: ${nuevoBloque.competenciaCodigo}]`
      : `[${nuevoBloque.rapsAsignados?.length || 1} RAPs: ${nuevoBloque.rapCodigo}]`;

    const numFicha = selectedFicha ? selectedFicha.numero_ficha : 'N/A';
    const quienDetalle = nuevoBloque.instructorId ? nuevoBloque.instructorNombre : 'VACANTE (sin instructor asignado)';
    registrarLog(
      'ASIGNACION_BLOQUE_HORARIO',
      'Programación de Horarios',
      `Asignado ${quienDetalle} ${detalleModalidad} en ${nuevoBloque.diaSemana} (${nuevoBloque.franja}) Ficha ${numFicha}`
    );
  };

  // Quitar SOLO el instructor de un bloque ya programado (p.ej. terminó su
  // contrato o el trimestre lo requiere), dejando el RAP/día/franja/trimestre
  // reservado como "vacante" para que otro instructor lo cubra después — sin
  // perder el espacio en el horario ni borrar que este instructor ya estuvo ahí.
  const handleQuitarInstructorDeBloque = (bloqueId: string) => {
    const bloqueOriginal = horarios.find(b => b.id === bloqueId);
    if (!bloqueOriginal || !bloqueOriginal.instructorId) return;

    if (bloqueOriginal.instructorId) {
      setInstructores(prev => prev.map(inst =>
        inst.id === bloqueOriginal.instructorId
          ? { ...inst, horasSemanalesAsignadas: Math.max(0, inst.horasSemanalesAsignadas - bloqueOriginal.duracionHoras) }
          : inst
      ));
    }

    const bloqueVacante: BloqueHorario = {
      ...bloqueOriginal,
      instructorId: undefined,
      instructorNombre: undefined,
      vacante: true
    };
    setHorarios(prev => prev.map(b => b.id === bloqueId ? bloqueVacante : b));
    sincronizarSeguimientoDesdeBloque(bloqueVacante);
    updateHorarioInSupabase(bloqueVacante).then(res => {
      if (!res.success) {
        console.error('Error al marcar bloque vacante en Supabase:', res.error);
        alert(`El cambio quedó en pantalla, pero NO se guardó en Supabase:\n\n${res.error}`);
      }
    }).catch(err => {
      console.error('Error al marcar bloque vacante en Supabase:', err);
    });

    const numFicha = selectedFicha ? selectedFicha.numero_ficha : 'N/A';
    registrarLog(
      'BLOQUE_MARCADO_VACANTE',
      'Programación de Horarios',
      `${bloqueOriginal.instructorNombre} dejó de cubrir ${bloqueOriginal.rapCodigo} (${bloqueOriginal.diaSemana} ${bloqueOriginal.franja}) en Ficha ${numFicha} — espacio queda vacante para reasignar.`
    );
  };

  // Asignar un instructor a un bloque que estaba vacante (o reemplazar el que
  // tenía), sin tener que recrear el bloque desde cero.
  const handleAsignarInstructorABloque = (bloqueId: string, instructor: Instructor) => {
    const bloqueOriginal = horarios.find(b => b.id === bloqueId);
    if (!bloqueOriginal) return;

    setInstructores(prev => prev.map(inst =>
      inst.id === instructor.id
        ? { ...inst, horasSemanalesAsignadas: inst.horasSemanalesAsignadas + bloqueOriginal.duracionHoras }
        : inst
    ));

    const bloqueActualizado: BloqueHorario = {
      ...bloqueOriginal,
      instructorId: instructor.id,
      instructorNombre: instructor.nombreCompleto,
      vacante: false
    };
    setHorarios(prev => prev.map(b => b.id === bloqueId ? bloqueActualizado : b));
    sincronizarSeguimientoDesdeBloque(bloqueActualizado);
    updateHorarioInSupabase(bloqueActualizado).then(res => {
      if (!res.success) {
        console.error('Error al asignar instructor a bloque en Supabase:', res.error);
        alert(`La asignación quedó en pantalla, pero NO se guardó en Supabase:\n\n${res.error}`);
      }
    }).catch(err => {
      console.error('Error al asignar instructor a bloque en Supabase:', err);
    });

    const numFicha = selectedFicha ? selectedFicha.numero_ficha : 'N/A';
    registrarLog(
      'INSTRUCTOR_ASIGNADO_A_VACANTE',
      'Programación de Horarios',
      `${instructor.nombreCompleto} cubre ahora ${bloqueOriginal.rapCodigo} (${bloqueOriginal.diaSemana} ${bloqueOriginal.franja}) en Ficha ${numFicha}.`
    );
  };

  const handleEliminarBloque = (bloqueId: string) => {
    const bloqueAEliminar = horarios.find(b => b.id === bloqueId);
    if (bloqueAEliminar) {
      setInstructores(prev => prev.map(inst => {
        if (inst.id === bloqueAEliminar.instructorId) {
          return { ...inst, horasSemanalesAsignadas: Math.max(0, inst.horasSemanalesAsignadas - bloqueAEliminar.duracionHoras) };
        }
        return inst;
      }));

      // Revertir en Seguimiento los RAPs que este bloque había asignado: si el
      // instructor/estado de ese RAP sigue viniendo de Horario (no fue
      // sobrescrito manualmente) y ningún OTRO bloque de horario lo sigue
      // cubriendo, se regresa a su estado inicial (sin instructor, PENDIENTE).
      // Antes, liberar un bloque no revertía nada en Seguimiento: el RAP se
      // quedaba marcado "En Ejecución" con el instructor aunque ya no tuviera
      // ninguna clase programada.
      const codigosRapsDelBloque = new Set<string>();
      if (bloqueAEliminar.rapsAsignados && bloqueAEliminar.rapsAsignados.length > 0) {
        bloqueAEliminar.rapsAsignados.forEach(r => codigosRapsDelBloque.add(r.codigo));
      } else if (bloqueAEliminar.rapCodigo && !bloqueAEliminar.esCompetenciaCompleta) {
        codigosRapsDelBloque.add(bloqueAEliminar.rapCodigo);
      } else if (bloqueAEliminar.esCompetenciaCompleta && bloqueAEliminar.competenciaCodigo) {
        raps.filter(r => r.competenciaCodigo === bloqueAEliminar.competenciaCodigo).forEach(r => codigosRapsDelBloque.add(r.codigoRap));
      }

      if (codigosRapsDelBloque.size > 0 && bloqueAEliminar.fichaId) {
        const fichaTarget = fichas.find(f => f.id === bloqueAEliminar.fichaId);
        const fichaNumBloque = fichaTarget?.numero_ficha || '';
        const compCodigoBloque = bloqueAEliminar.competenciaCodigo;
        // Bloques que quedan DESPUÉS de esta eliminación (para saber si algún
        // otro bloque todavía cubre el mismo RAP y por eso no debe revertirse).
        const horariosRestantes = horarios.filter(b => b.id !== bloqueId);
        const itemsRevertidos: RapSeguimiento[] = [];

        setRapsSeguimiento(prevRapsSeg => {
          const nuevoSeg = [...prevRapsSeg];
          codigosRapsDelBloque.forEach(rapCod => {
            const siguemAsignadoEnOtroBloque = horariosRestantes.some(h =>
              h.fichaId === bloqueAEliminar.fichaId && (
                (h.rapsAsignados && h.rapsAsignados.some(r => r.codigo === rapCod)) ||
                h.rapCodigo === rapCod ||
                (h.esCompetenciaCompleta && h.competenciaCodigo === compCodigoBloque)
              )
            );
            if (siguemAsignadoEnOtroBloque) return;

            const idx = nuevoSeg.findIndex(s =>
              (s.fichaId === bloqueAEliminar.fichaId || s.fichaNumero === fichaNumBloque) &&
              s.competenciaCodigo === compCodigoBloque &&
              s.rapCodigo === rapCod
            );

            // Solo se revierte si el seguimiento actual vino de Horario: si el
            // instructor lo cambió manualmente después, esa decisión manual
            // prevalece y no se toca.
            if (idx >= 0 && nuevoSeg[idx].fuenteInstructor === 'HORARIO') {
              // Asignación todavía PROVISIONAL (prueba/corrección): el RAP
              // vuelve exactamente como estaba antes, sin dejar rastro.
              if (esProvisionalVigente(nuevoSeg[idx])) {
                const restaurado = restaurarAntesDeProvisional(nuevoSeg[idx]);
                // Si antes lo cubría OTRO instructor desde Horario, ese
                // tampoco tiene ya bloque: se cierra su paso normalmente.
                if (restaurado.fuenteInstructor === 'HORARIO' && restaurado.instructorNombre) {
                  nuevoSeg[idx] = {
                    ...restaurado,
                    instructorId: undefined,
                    instructorNombre: undefined,
                    fuenteInstructor: undefined,
                    estado: restaurado.estado === 'EN_EJECUCION' ? 'PENDIENTE' : restaurado.estado,
                    historialInstructores: [
                      ...(restaurado.historialInstructores || []),
                      {
                        instructorId: restaurado.instructorId,
                        instructorNombre: restaurado.instructorNombre,
                        trimestre: bloqueAEliminar.trimestre,
                        fechaFin: new Date().toISOString(),
                        motivo: 'FIN_HORARIO' as const
                      }
                    ]
                  };
                } else {
                  nuevoSeg[idx] = restaurado;
                }
                itemsRevertidos.push(nuevoSeg[idx]);
                return;
              }
              // Si el RAP tenía instructor EN FIRME al momento de liberar el
              // bloque, su paso se cierra en el historial en vez de borrarse.
              const previo = nuevoSeg[idx];
              const historialActualizado = previo.instructorNombre
                ? [
                    ...(previo.historialInstructores || []),
                    {
                      instructorId: previo.instructorId,
                      instructorNombre: previo.instructorNombre,
                      trimestre: bloqueAEliminar.trimestre,
                      fechaFin: new Date().toISOString(),
                      motivo: 'FIN_HORARIO' as const
                    }
                  ]
                : (previo.historialInstructores || []);

              nuevoSeg[idx] = {
                ...nuevoSeg[idx],
                instructorId: undefined,
                instructorNombre: undefined,
                fuenteInstructor: undefined,
                estado: 'PENDIENTE',
                fuenteEstado: undefined,
                historialInstructores: historialActualizado,
                asignacionProvisional: undefined,
                fechaActualizacion: new Date().toISOString()
              };
              itemsRevertidos.push(nuevoSeg[idx]);
            }
          });
          return nuevoSeg;
        });

        itemsRevertidos.forEach(item => {
          upsertRapSeguimientoInSupabase(item).catch(err => {
            console.error('Error al revertir seguimiento de RAP en Supabase:', err);
          });
        });
      }
    }

    setHorarios(prev => prev.filter(b => b.id !== bloqueId));
    deleteHorarioFromSupabase(bloqueId).then(res => {
      if (!res.success) console.error('Error al eliminar bloque de horario en Supabase:', res.error);
    }).catch(err => {
      console.error('Error al eliminar bloque de horario en Supabase:', err);
    });
    const numFicha = selectedFicha ? selectedFicha.numero_ficha : 'N/A';
    registrarLog('LIBERACION_BLOQUE_HORARIO', 'Programación de Horarios', `Bloque liberado en Ficha ${numFicha}`);
  };

  // Manejo de Seguimiento de RAPs Individuales
  const handleActualizarRapSeguimiento = (itemActualizado: RapSeguimiento) => {
    // Se resuelve el objeto final antes del setState para poder reutilizarlo tal cual
    // en el upsert a Supabase (antes este cambio solo se guardaba en localStorage,
    // por lo que un Coordinador y un Auxiliar en equipos distintos veían datos
    // distintos del seguimiento por RAP de una misma ficha).
    const itemFinal: RapSeguimiento = {
      ...itemActualizado,
      // Un cambio manual o por Juicios deja el RAP en firme.
      ...(itemActualizado.fuenteInstructor !== 'HORARIO' ? { asignacionProvisional: undefined } : {}),
      fechaActualizacion: new Date().toISOString()
    };

    setRapsSeguimiento(prev => {
      // El código de RAP (p.ej. "RAP 01") se reinicia en cada competencia, así
      // que competenciaCodigo es obligatorio en la comparación — de lo
      // contrario esto pisa el mismo "RAP 01" de otra competencia de la ficha.
      const idx = prev.findIndex(r =>
        (r.fichaId === itemFinal.fichaId || (r.fichaNumero && r.fichaNumero === itemFinal.fichaNumero)) &&
        r.competenciaCodigo === itemFinal.competenciaCodigo &&
        r.rapCodigo === itemFinal.rapCodigo
      );
      if (idx >= 0) {
        const copia = [...prev];
        copia[idx] = { ...copia[idx], ...itemFinal };
        return copia;
      }
      return [...prev, itemFinal];
    });

    upsertRapSeguimientoInSupabase(itemFinal).catch(err => {
      console.error('Error al sincronizar seguimiento de RAP en Supabase:', err);
    });

    registrarLog(
      'ACTUALIZAR_RAP_SEGUIMIENTO',
      'Seguimiento Curricular',
      `RAP ${itemActualizado.rapCodigo} de Ficha ${itemActualizado.fichaNumero || selectedFicha?.numero_ficha} actualizado a estado ${itemActualizado.estado} (Instructor: ${itemActualizado.instructorNombre || 'Sin asignar'})`
    );
  };

  // Manejo de Seguimiento
  const handleUpdateEstado = (actividadId: string, nuevoEstado: EstadoActividad) => {
    // Se captura la actividad ya actualizada para poder sincronizarla con Supabase justo
    // debajo (antes este cambio de estado solo vivía en memoria: se perdía al recargar).
    let actividadActualizada: ActividadSeguimiento | undefined;
    setActividades(prev => prev.map(a => {
      if (a.id === actividadId) {
        actividadActualizada = {
          ...a,
          estado: nuevoEstado,
          fechaUltimaActualizacion: new Date().toLocaleDateString()
        };
        return actividadActualizada;
      }
      return a;
    }));

    if (actividadActualizada) {
      upsertActividadSeguimientoInSupabase(actividadActualizada).catch(err => {
        console.error('Error al sincronizar actividad de seguimiento en Supabase:', err);
      });
    }

    registrarLog(
      'ACTUALIZAR_ESTADO_ACTIVIDAD',
      'Seguimiento Curricular',
      `Actividad ${actividadId} actualizada a estado ${nuevoEstado} por ${currentUser.nombre_completo}`
    );
  };

  // Manejo de Ingesta
  const handleProcesarIngesta = (
    archivoNombre: string, 
    tipo: AuditoriaIngesta['tipoPlantilla'], 
    filas: number
  ) => {
    const nuevaAuditoria: AuditoriaIngesta = {
      id: `ing_${Date.now()}`,
      fechaHora: new Date().toLocaleString(),
      archivoNombre,
      tipoPlantilla: tipo,
      moduloDestino: tipo === 'Estructura de Horarios' ? 'Programación de Horarios' : 'Seguimiento Curricular',
      registrosProcesados: filas,
      operadorNombre: currentUser.nombre_completo,
      operadorRol: currentUser.rol,
      estado: 'Integrado con Éxito',
      detallesForwardFill: Math.min(Math.floor(filas * 0.3), 15)
    };

    setAuditoriaIngestas(prev => [nuevaAuditoria, ...prev]);
    insertAuditoriaIngestaInSupabase(nuevaAuditoria).catch(err => {
      console.error('Error al registrar la ingesta en Supabase:', err);
    });
    registrarLog(
      'INGESTA_EXCEL_EXITOSA',
      'Ingesta de Archivos Excel',
      `Archivo ${archivoNombre} procesado (${filas} filas) por ${currentUser.nombre_completo}`
    );
  };

  const handleLimpiarCola = () => {
    setAuditoriaIngestas([]);
    registrarLog('LIMPIAR_COLA_INGESTA', 'Ingesta de Archivos Excel', 'Cola de importación limpiada');
  };

  // Manejo de Cierre de Ficha
  const handleActualizarBalance = (
    fichaId: string, 
    culminados: number, 
    cancelados: number, 
    aplazados: number, 
    retiros: number
  ) => {
    const matricula = selectedFicha?.matriculaInicial || 35;
    const retencion = Number(((culminados / matricula) * 100).toFixed(1));
    const desercion = Number((((cancelados + retiros) / matricula) * 100).toFixed(1));

    setFichas(prev => prev.map(f => {
      if (f.id === fichaId) {
        return {
          ...f,
          aprendicesCulminados: culminados,
          aprendicesCancelados: cancelados,
          aprendicesAplazados: aplazados,
          aprendicesRetiroVoluntario: retiros,
          tasaRetencion: retencion,
          tasaDesercion: desercion,
          estado: 'CERRADA'
        };
      }
      return f;
    }));

    setSelectedFicha(prev => {
      if (!prev) return null;
      return {
        ...prev,
        aprendicesCulminados: culminados,
        aprendicesCancelados: cancelados,
        aprendicesAplazados: aplazados,
        aprendicesRetiroVoluntario: retiros,
        tasaRetencion: retencion,
        tasaDesercion: desercion,
        estado: 'CERRADA'
      };
    });

    const numFicha = selectedFicha ? selectedFicha.numero_ficha : 'N/A';
    registrarLog(
      'CONSOLIDACION_CIERRE_FICHA', 
      'Cierres e Indicadores', 
      `Cierre formal consolidado para Ficha ${numFicha}. Retención: ${retencion}%, Deserción: ${desercion}%`
    );
  };

  // Funciones de Base de Datos
  const handleSeedDatabase = () => {
    setFichas(FICHAS_INICIALES);
    setSelectedFicha(null);
    setInstructores(INSTRUCTORES_INICIALES);
    setUsuarios(USUARIOS_INICIALES);
    setActividades(ACTIVIDADES_SEGUIMIENTO_INICIALES);
    setHorarios(BLOQUES_HORARIOS_INICIALES);
    setAuditoriaIngestas(AUDITORIA_INGESTAS_INICIALES);
    setAuditoriaSistema(AUDITORIA_SISTEMA_INICIAL);
    localStorage.removeItem('sena_fichas_reales');
    localStorage.removeItem('sena_instructores_reales');
    localStorage.removeItem('sena_usuarios_registrados');
    alert('¡Base de datos restablecida a la configuración limpia para datos reales!');
  };

  const handleLimpiarDatabase = () => {
    if (confirm('¿Desea purgar los datos de prueba y auditoría? (No altera esquemas)')) {
      setAuditoriaIngestas([]);
      setAuditoriaSistema([]);
      alert('¡Registros temporales y colas de auditoría depurados!');
    }
  };

  // Breadcrumbs dinámicos
  const getBreadcrumbs = () => {
    const list = ['Gestión Académica'];
    if (activeTab === 'dashboard') list.push('Panel Principal');
    else if (activeTab === 'avance-fichas') list.push('Avance de Fichas');
    else if (activeTab === 'horarios') list.push('Programación de Horarios');
    else if (activeTab === 'reportes') list.push('Reportes');
    else if (activeTab === 'seguimiento') list.push('Seguimiento Curricular');
    else if (activeTab === 'programas') list.push('Programas de Formación');
    else if (activeTab === 'competencias') list.push('Competencias y RAPs');
    else if (activeTab === 'instructores') list.push('Directorio de Instructores');
    else if (activeTab === 'ingesta') list.push('Ingesta de Archivos Excel');
    else if (activeTab === 'cierres') list.push('Cierres e Indicadores');
    else if (activeTab === 'parametrizaciones') list.push('Parametrizaciones y Tablas');
    else if (activeTab === 'admin') list.push('Auditoría y Mantenimiento');
    return list;
  };

  // Filtrado RBAC para Instructor Líder: solo ve y gestiona sus fichas asignadas
  const fichasVisibles = React.useMemo(
    () => fichasPermitidas(fichas, currentUser, instructores),
    [fichas, currentUser, instructores]
  );

  // El líder nunca debe quedar parado sobre una ficha que no es suya
  // (p.ej. la última que quedó seleccionada en este navegador).
  React.useEffect(() => {
    if (currentUser.rol !== 'INSTRUCTOR_LIDER') return;
    if (selectedFicha && fichasVisibles.some(f => f.id === selectedFicha.id)) return;
    setSelectedFicha(fichasVisibles[0] || null);
  }, [currentUser, fichasVisibles, selectedFicha]);

  if (!isAuthenticated) {
    return (
      <LoginView
        usuariosDisponibles={usuarios}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="flex h-screen bg-[#F9F9FF] font-sans antialiased text-[#111C2D] overflow-hidden">
      {/* Barra Lateral de Navegación con Roles RBAC, Modo Retráctil y Menú Móvil */}
      <Sidebar
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        centro={centro}
        fichas={fichasVisibles}
        selectedFicha={selectedFicha}
        onSelectFicha={setSelectedFicha}
        usersList={usuarios}
        onOpenModalCrearFicha={() => setIsModalFichaOpen(true)}
        onOpenModalCrearInstructor={handleOpenCrearInstructor}
        onOpenModalCrearPrograma={handleOpenCrearPrograma}
        onOpenStandaloneModal={() => setIsModalStandaloneOpen(true)}
        onLogout={handleLogout}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
        isMobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Contenedor Principal Adaptable */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <Header
          currentUser={currentUser}
          centro={centro}
          fichas={fichasVisibles}
          selectedFicha={selectedFicha}
          onSelectFicha={setSelectedFicha}
          breadcrumbs={getBreadcrumbs()}
          unreadAlertsCount={3}
          onOpenAlerts={() => setActiveTab('dashboard')}
          onOpenModalCrearFicha={() => setIsModalFichaOpen(true)}
          onOpenSupabaseModal={() => setIsModalSupabaseOpen(true)}
          onOpenEditarPrograma={handleOpenEditarProgramaFichaActiva}
          onOpenStandaloneModal={() => setIsModalStandaloneOpen(true)}
          onLogout={handleLogout}
          onToggleMobileMenu={() => setMobileMenuOpen(prev => !prev)}
          onToggleSidebarCollapse={toggleSidebarCollapse}
          isSidebarCollapsed={sidebarCollapsed}
        />

        {/* Zona de Trabajo con Scroll y Padding Responsivo */}
        <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 max-w-7xl w-full mx-auto min-w-0">
          {activeTab === 'dashboard' && (
            <DashboardView
              currentUser={currentUser}
              ficha={selectedFicha}
              allFichas={fichasVisibles}
              onNavigateTab={setActiveTab}
              onSelectFicha={setSelectedFicha}
              horarios={horarios}
              actividades={actividades}
              centro={centro}
              rapsSeguimiento={rapsSeguimiento}
              raps={raps}
              trimestresCalendario={trimestresCalendario}
              onOpenModalCrearFicha={() => setIsModalFichaOpen(true)}
              onOpenEditarPrograma={handleOpenEditarProgramaFichaActiva}
            />
          )}

          {activeTab === 'avance-fichas' && (
            <AvanceFichasView
              currentUser={currentUser}
              fichas={fichasVisibles}
              selectedFicha={selectedFicha}
              onSelectFicha={setSelectedFicha}
              onNavigateTab={setActiveTab}
              centro={centro}
              horarios={horarios}
              actividades={actividades}
              reportesJuicios={reportesJuicios}
              rapsSeguimiento={rapsSeguimiento}
              raps={raps}
              trimestresCalendario={trimestresCalendario}
              onGuardarJuiciosEvaluativos={handleGuardarJuiciosEvaluativos}
              onEliminarFicha={handleEliminarFicha}
              onOpenCrearFicha={() => setIsModalFichaOpen(true)}
              onEditarFicha={handleEditarFicha}
            />
          )}

          {activeTab === 'horarios' && (
            <HorariosView
              currentUser={currentUser}
              ficha={selectedFicha}
              allFichas={fichasVisibles}
              instructores={instructores}
              horarios={horarios}
              competencias={competencias}
              raps={raps}
              rapsSeguimiento={rapsSeguimiento}
              onGuardarBloque={handleGuardarBloque}
              onEliminarBloque={handleEliminarBloque}
              onQuitarInstructorDeBloque={handleQuitarInstructorDeBloque}
              onAsignarInstructorABloque={handleAsignarInstructorABloque}
              onNavigateToCompetencias={(progCodigo) => {
                if (progCodigo) setSelectedProgramaForCompetencias(progCodigo);
                setActiveTab('competencias');
              }}
              onSelectFicha={setSelectedFicha}
              onNavigateToReportesInstructores={() => setActiveTab('reportes')}
              registrosHorasEjecutadas={registrosHorasEjecutadas}
              actividades={actividades}
              puedeEditar={puedeEditarHorarioDeFicha(selectedFicha, currentUser, instructores)}
            />
          )}

          {activeTab === 'reportes' && (
            <ReportesView
              currentUser={currentUser}
              instructores={instructores}
              horarios={horarios}
              allFichas={fichasVisibles}
            />
          )}

          {activeTab === 'seguimiento' && (
            <SeguimientoView
              currentUser={currentUser}
              ficha={selectedFicha}
              allFichas={fichasVisibles}
              actividades={actividades}
              instructores={instructores}
              competencias={competencias}
              raps={raps}
              registrosHorasEjecutadas={registrosHorasEjecutadas}
              horarios={horarios}
              reportesJuicios={reportesJuicios}
              rapsSeguimiento={rapsSeguimiento}
              registrosArchivoSeguimiento={registrosArchivoSeguimiento}
              onUpdateEstado={handleUpdateEstado}
              onActualizarRapSeguimiento={handleActualizarRapSeguimiento}
              onSelectFicha={setSelectedFicha}
              onNavigateToHorarios={() => setActiveTab('horarios')}
            />
          )}

          {activeTab === 'programas' && (
            <ProgramasView
              currentUser={currentUser}
              programas={programas}
              fichas={fichasVisibles}
              onOpenEditarPrograma={handleOpenEditarPrograma}
              onOpenCrearPrograma={handleOpenCrearPrograma}
              onVerCompetencias={(progCodigo) => {
                setSelectedProgramaForCompetencias(progCodigo);
                setActiveTab('competencias');
              }}
              onEliminarPrograma={handleEliminarPrograma}
            />
          )}

          {activeTab === 'competencias' && (
            <CompetenciasView
              currentUser={currentUser}
              programas={programas}
              competencias={competencias}
              raps={raps}
              registrosArchivoSeguimiento={registrosArchivoSeguimiento}
              fichas={fichasVisibles}
              horarios={horarios}
              actividadesSeguimiento={actividades}
              registrosHorasEjecutadas={registrosHorasEjecutadas}
              selectedProgramaCodigo={selectedProgramaForCompetencias}
              onSelectPrograma={(cod) => setSelectedProgramaForCompetencias(cod)}
              onActualizarCompetenciasYRaps={handleActualizarCompetenciasYRaps}
              onLimpiarEstructura={handleLimpiarEstructura}
              onNavigateToHorarios={(progCodigo) => {
                const fichaDelProg = fichasVisibles.find(f => f.programaCodigo === progCodigo);
                if (fichaDelProg) {
                  setSelectedFicha(fichaDelProg);
                }
                setActiveTab('horarios');
              }}
            />
          )}

          {activeTab === 'instructores' && (
            <InstructoresView
              currentUser={currentUser}
              instructores={instructores}
              fichas={fichasVisibles}
              horarios={horarios}
              actividades={actividades}
              registrosHorasEjecutadas={registrosHorasEjecutadas}
              onOpenModalCrear={handleOpenCrearInstructor}
              onEditarInstructor={handleOpenEditarInstructor}
              onToggleEstado={handleToggleEstadoInstructor}
              onEliminarInstructor={handleEliminarInstructor}
              onSincronizarSupabase={sincronizarDatosDesdeSupabase}
              isSyncing={isSyncingSupabase}
              usuarios={usuarios}
              todasLasFichas={fichas}
              onCrearCuentaLider={handleCrearCuentaLider}
            />
          )}

          {activeTab === 'ingesta' && (
            <IngestaView
              currentUser={currentUser}
              ficha={selectedFicha}
              programas={programas}
              competenciasExistentes={competencias}
              rapsExistentes={raps}
              horarios={horarios}
              actividadesSeguimiento={actividades}
              registrosHorasEjecutadas={registrosHorasEjecutadas}
              fichas={fichasVisibles}
              auditoriaIngestas={auditoriaIngestas}
              onProcesarIngesta={handleProcesarIngesta}
              onActualizarCompetenciasYRaps={handleActualizarCompetenciasYRaps}
              onGuardarHorasEjecutadas={handleGuardarHorasEjecutadas}
              onGuardarJuiciosEvaluativos={handleGuardarJuiciosEvaluativos}
              onLimpiarEstructura={currentUser.rol === 'INSTRUCTOR_LIDER' ? undefined : handleLimpiarEstructura}
              onLimpiarCola={handleLimpiarCola}
              soloArchivosDeFicha={currentUser.rol === 'INSTRUCTOR_LIDER'}
              onNavigateToCompetencias={(progCodigo) => {
                if (progCodigo) setSelectedProgramaForCompetencias(progCodigo);
                setActiveTab('competencias');
              }}
              onNavigateToSeguimiento={() => setActiveTab('seguimiento')}
            />
          )}

          {activeTab === 'cierres' && (
            <CierresView
              currentUser={currentUser}
              ficha={selectedFicha}
              allFichas={fichasVisibles}
              centro={centro}
              onActualizarBalance={handleActualizarBalance}
            />
          )}

          {activeTab === 'parametrizaciones' && (
            <ParametrizacionesView
              currentUser={currentUser}
              centro={centro}
              competencias={competencias}
              instructores={instructores}
              especialidades={especialidades}
              ambientes={ambientes}
              onGuardarEspecialidad={handleGuardarEspecialidad}
              onEliminarEspecialidad={handleEliminarEspecialidad}
              onAutoGenerarEspecialidades={handleAutoGenerarEspecialidades}
              onGuardarAmbiente={handleGuardarAmbiente}
              onEliminarAmbiente={handleEliminarAmbiente}
              trimestresCalendario={trimestresCalendario}
              onGuardarTrimestreCalendario={handleGuardarTrimestreCalendario}
              onEliminarTrimestreCalendario={handleEliminarTrimestreCalendario}
            />
          )}

          {activeTab === 'admin' && (
            <AdminView
              currentUser={currentUser}
              usersList={usuarios}
              logs={auditoriaSistema}
              centro={centro}
              onSeedDatabase={handleSeedDatabase}
              onLimpiarDatabase={handleLimpiarDatabase}
              onCrearUsuario={handleCrearUsuario}
              onEliminarUsuario={handleEliminarUsuario}
              onEditarClaveUsuario={handleEditarClaveUsuario}
              onEditarCorreoUsuario={handleEditarCorreoUsuario}
            />
          )}
        </main>
      </div>

      {/* Modal de Creación Manual de Ficha */}
      <ModalCrearFicha
        isOpen={isModalFichaOpen}
        onClose={() => { setIsModalFichaOpen(false); setFichaParaEditar(null); }}
        instructores={instructores}
        onCrearFicha={handleCrearFicha}
        onActualizarFicha={handleActualizarFicha}
        onRegistrarInstructor={handleGuardarInstructor}
        programas={programas}
        ambientes={ambientes}
        fichaEditar={fichaParaEditar}
      />

      {/* Modal de Creación y Edición de Instructor */}
      <ModalCrearInstructor
        isOpen={isModalInstructorOpen}
        onClose={() => {
          setIsModalInstructorOpen(false);
          setInstructorParaEditar(null);
        }}
        instructorParaEditar={instructorParaEditar}
        especialidadesDisponibles={especialidades}
        onGuardarInstructor={handleGuardarInstructor}
        instructoresExistentes={instructores}
      />

      {/* Modal de Edición y Creación de Programas de Formación */}
      <ModalEditarPrograma
        isOpen={isModalProgramaOpen}
        onClose={() => setIsModalProgramaOpen(false)}
        programa={programaParaEditar}
        fichas={fichas}
        onGuardarPrograma={handleGuardarPrograma}
      />

      {/* Modal de Guía y Diagnóstico de Supabase */}
      <ModalSupabaseGuia
        isOpen={isModalSupabaseOpen}
        onClose={() => setIsModalSupabaseOpen(false)}
      />

      {/* Modal de Descarga de Versión Standalone para GitHub */}
      <DescargarStandaloneModal
        isOpen={isModalStandaloneOpen}
        onClose={() => setIsModalStandaloneOpen(false)}
      />
    </div>
  );
}
