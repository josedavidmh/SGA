import React from 'react';
import { 
  ShieldCheck, 
  Download, 
  Plus, 
  Calendar, 
  Clock, 
  MapPin, 
  AlertOctagon, 
  Check, 
  X, 
  UserCheck, 
  Lock,
  Filter,
  RefreshCw,
  Sparkles,
  Info,
  BookOpen,
  Award,
  CheckCheck,
  ListChecks,
  ChevronDown,
  Layers,
  Search,
  AlertTriangle,
  Copy,
  ClipboardPaste,
  FileText,
  FileDown,
  FileSpreadsheet,
  Users,
  UserX,
  UserPlus,
  PanelRightClose,
  PanelRightOpen,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  Ficha,
  Instructor,
  BloqueHorario,
  DiaSemana,
  FranjaHorario,
  User,
  Competencia,
  ResultadoAprendizaje,
  RapSeguimiento,
  RegistroHorasEjecutadas,
  ActividadSeguimiento
} from '../types';
import { calcularComparativoCompetencias } from '../services/horasEjecutadasService';
import { dialogo } from './DialogoSistema';
import {
  exportarHorarioFichaExcel,
  exportarHorarioFichaPDF
} from '../services/horariosReporteService';
import { evaluarAfinidadInstructor, EvaluacionAfinidadInstructor } from '../services/instructorRecomendacionService';

interface HorariosProps {
  currentUser: User;
  ficha: Ficha | null;
  allFichas: Ficha[];
  instructores: Instructor[];
  horarios: BloqueHorario[];
  competencias?: Competencia[];
  raps?: ResultadoAprendizaje[];
  rapsSeguimiento?: RapSeguimiento[];
  onGuardarBloque: (bloque: Omit<BloqueHorario, 'id'>) => void;
  onEliminarBloque: (bloqueId: string) => void;
  onQuitarInstructorDeBloque?: (bloqueId: string) => void;
  onAsignarInstructorABloque?: (bloqueId: string, instructor: Instructor) => void;
  /** Horas por competencia cargadas desde SofiaPlus (para avisar si una competencia ya pasó del 100%). */
  registrosHorasEjecutadas?: RegistroHorasEjecutadas[];
  actividades?: ActividadSeguimiento[];
  /** Permiso de edición calculado en App (el instructor líder solo en sus fichas). */
  puedeEditar?: boolean;
  onNavigateToCompetencias?: (programaCodigo?: string) => void;
  onSelectFicha?: (ficha: Ficha) => void;
  onNavigateToReportesInstructores?: () => void;
}

// =====================================================================
// TRIMESTRES: el año lectivo se divide en 4 (formato "AAAA-I".."AAAA-IV").
// El horario de una ficha se programa un trimestre a la vez — cada uno tiene
// su propia grilla semanal (Lunes-Viernes x franjas), así que dos bloques del
// mismo día/franja en trimestres distintos NO son un cruce, son semanas
// distintas del año. Estas utilidades permiten parsear/navegar esos periodos.
// =====================================================================
const ROMANOS_TRIMESTRE = ['I', 'II', 'III', 'IV'] as const;

interface TrimestreParseado { anio: number; indice: number; }

function parsearTrimestre(label: string): TrimestreParseado | null {
  const m = label?.trim().match(/^(\d{4})-([IVX]+)$/i);
  if (!m) return null;
  const idx = ROMANOS_TRIMESTRE.indexOf(m[2].toUpperCase() as any);
  if (idx === -1) return null;
  return { anio: parseInt(m[1], 10), indice: idx };
}

function formatearTrimestre(t: TrimestreParseado): string {
  return `${t.anio}-${ROMANOS_TRIMESTRE[t.indice]}`;
}

function siguienteTrimestre(label: string): string | null {
  const t = parsearTrimestre(label);
  if (!t) return null;
  return t.indice === 3
    ? formatearTrimestre({ anio: t.anio + 1, indice: 0 })
    : formatearTrimestre({ anio: t.anio, indice: t.indice + 1 });
}

function anteriorTrimestre(label: string): string | null {
  const t = parsearTrimestre(label);
  if (!t) return null;
  return t.indice === 0
    ? formatearTrimestre({ anio: t.anio - 1, indice: 3 })
    : formatearTrimestre({ anio: t.anio, indice: t.indice - 1 });
}

/** Compara dos trimestres cronológicamente; los que no siguen el formato van al final, por orden alfabético. */
function compararTrimestres(a: string, b: string): number {
  const pa = parsearTrimestre(a);
  const pb = parsearTrimestre(b);
  if (pa && pb) return (pa.anio * 4 + pa.indice) - (pb.anio * 4 + pb.indice);
  if (pa) return -1;
  if (pb) return 1;
  return a.localeCompare(b);
}

export const DIAS: DiaSemana[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
export const FRANJAS: { franja: FranjaHorario; label: string; sub: string }[] = [
  { franja: '06:00 - 09:00', label: '06:00 - 09:00', sub: 'Mañana B1' },
  { franja: '09:00 - 12:00', label: '09:00 - 12:00', sub: 'Mañana B2' },
  { franja: '13:00 - 16:00', label: '13:00 - 16:00', sub: 'Tarde B1' },
  { franja: '16:00 - 19:00', label: '16:00 - 19:00', sub: 'Tarde B2' },
];

// La vista tiene un retorno temprano ("No hay ficha seleccionada") ANTES de
// varios hooks (useMemo). Al pasar de "sin ficha" a "con ficha", React veía
// más hooks que en el render anterior y lanzaba "Rendered more hooks than
// during the previous render": por eso elegir una ficha desde esa pantalla
// no llevaba al horario. Con una key distinta para cada caso, React monta
// una instancia nueva y el número de hooks siempre es consistente.
export const HorariosView: React.FC<HorariosProps> = (props) => (
  <HorariosViewInterno key={props.ficha ? 'con-ficha' : 'sin-ficha'} {...props} />
);

const HorariosViewInterno: React.FC<HorariosProps> = ({
  currentUser,
  ficha,
  instructores,
  horarios,
  allFichas,
  competencias = [],
  raps = [],
  rapsSeguimiento = [],
  onGuardarBloque,
  onEliminarBloque,
  onQuitarInstructorDeBloque,
  onAsignarInstructorABloque,
  registrosHorasEjecutadas = [],
  actividades = [],
  puedeEditar,
  onNavigateToCompetencias,
  onSelectFicha,
  onNavigateToReportesInstructores
}) => {
  // Pestañas internas: Matriz de asignación | Reportes (Excel/PDF del horario)
  const [horarioSubTab, setHorarioSubTab] = React.useState<'MATRIZ' | 'REPORTES'>('MATRIZ');

  // Trimestre que se está viendo/editando en la Matriz. Por defecto, el
  // trimestre activo de la ficha (ficha.periodoLectivo) — cambia si el
  // usuario navega a un trimestre anterior/posterior, o si cambia de ficha.
  const [trimestreSeleccionado, setTrimestreSeleccionado] = React.useState<string>(ficha?.periodoLectivo || '');
  React.useEffect(() => {
    if (ficha) setTrimestreSeleccionado(ficha.periodoLectivo);
  }, [ficha?.id, ficha?.periodoLectivo]);

  // Estado de edición / selección de celda
  const [selectedDia, setSelectedDia] = React.useState<DiaSemana>('Martes');
  const [selectedFranja, setSelectedFranja] = React.useState<FranjaHorario>('09:00 - 12:00');
  // Contraer el Panel de Asignación Dinámica libera espacio horizontal para
  // trabajar cómodo en el lienzo de la Matriz Semanal (arrastrar/soltar,
  // revisar varios días a la vez), sin perder la selección de día/franja/RAP.
  const [panelAsignacionColapsado, setPanelAsignacionColapsado] = React.useState<boolean>(false);
  const [showCrucesValidationModal, setShowCrucesValidationModal] = React.useState<boolean>(false);
  const [bloqueDetalleModal, setBloqueDetalleModal] = React.useState<BloqueHorario | null>(null);
  // Instructor elegido en el modal de detalle para cubrir un bloque vacante.
  const [instructorParaVacante, setInstructorParaVacante] = React.useState<string>('');

  // Mover (arrastrar y soltar) y Copiar/Pegar bloques en el lienzo — agiliza
  // el armado del horario sin tener que reconstruir cada bloque desde cero.
  const [bloqueArrastrado, setBloqueArrastrado] = React.useState<BloqueHorario | null>(null);
  const [celdaHoverDrag, setCeldaHoverDrag] = React.useState<{ dia: DiaSemana; franja: FranjaHorario } | null>(null);
  const [bloqueCopiado, setBloqueCopiado] = React.useState<BloqueHorario | null>(null);

  // Feedback visible de guardado (Nielsen #1: visibilidad del estado del
  // sistema) para confirmar mover/pegar/asignar sin depender solo del cambio
  // visual en la grilla.
  const [toast, setToast] = React.useState<{ mensaje: string; tipo: 'ok' | 'error' } | null>(null);
  const toastTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const mostrarToast = React.useCallback((mensaje: string, tipo: 'ok' | 'error' = 'ok') => {
    setToast({ mensaje, tipo });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 2600);
  }, []);
  React.useEffect(() => () => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
  }, []);

  // Estados para Recomendación y Advertencia de Perfil de Instructor
  const [filtroTipoInstructores, setFiltroTipoInstructores] = React.useState<'RECOMENDADOS' | 'TODOS'>('RECOMENDADOS');
  const [searchInstructor, setSearchInstructor] = React.useState<string>('');
  const [modalAdvertenciaPerfil, setModalAdvertenciaPerfil] = React.useState<{
    isOpen: boolean;
    instructor: Instructor;
    evaluacion: EvaluacionAfinidadInstructor;
  } | null>(null);

  // Buscar competencias y RAPs para el programa de la ficha
  const competenciasPrograma = React.useMemo(() => {
    if (!ficha) return competencias.filter(c => c.programaCodigo === '228118');
    return competencias.filter(c => c.programaCodigo === ficha.programaCodigo);
  }, [competencias, ficha]);

  const rapsPrograma = React.useMemo(() => {
    if (!ficha) return raps.filter(r => r.programaCodigo === '228118');
    return raps.filter(r => r.programaCodigo === ficha.programaCodigo);
  }, [raps, ficha]);

  // Competencia seleccionada en el panel de asignación
  const [selectedCompetenciaCodigo, setSelectedCompetenciaCodigo] = React.useState<string>(
    competenciasPrograma.length > 0 ? competenciasPrograma[0].codigo : '220501096'
  );

  // Modo de asignación: 'COMPETENCIA_COMPLETA' o 'SELECCION_RAPS'
  const [isCompetenciaCompleta, setIsCompetenciaCompleta] = React.useState<boolean>(false);
  const [selectedRapCodigos, setSelectedRapCodigos] = React.useState<string[]>(['RAP 01', 'RAP 02']);

  // Modo estricto (activado por defecto): oculta del selector las competencias
  // ya calificadas por completo y bloquea el checkbox de cualquier RAP ya
  // calificado individualmente, para no seguir programando instructores sobre
  // trabajo que ya se calificó. Se puede desactivar para casos excepcionales
  // (p.ej. reprogramar una recalificación).
  const [ocultarCalificados, setOcultarCalificados] = React.useState<boolean>(true);

  // Estado curricular de un RAP para ESTA ficha, según rapsSeguimiento (misma
  // llave ficha+competencia+rap que usa el módulo de Seguimiento).
  const getEstadoRap = React.useCallback((competenciaCodigo: string, rapCodigo: string) => {
    if (!ficha) return undefined;
    const seg = rapsSeguimiento.find(s =>
      (s.fichaId === ficha.id || s.fichaNumero === ficha.numero_ficha) &&
      s.competenciaCodigo === competenciaCodigo &&
      s.rapCodigo === rapCodigo
    );
    return seg?.estado;
  }, [ficha, rapsSeguimiento]);

  // Competencias visibles en el selector: en modo estricto, se ocultan las que
  // ya tienen TODOS sus RAPs calificados (no queda nada por programar).
  const competenciasVisibles = React.useMemo(() => {
    if (!ocultarCalificados) return competenciasPrograma;
    return competenciasPrograma.filter(comp => {
      const rapsDeComp = rapsPrograma.filter(r => r.competenciaCodigo === comp.codigo);
      if (rapsDeComp.length === 0) return true;
      const todasCalificadas = rapsDeComp.every(r => getEstadoRap(comp.codigo, r.codigoRap) === 'CALIFICADO');
      return !todasCalificadas;
    });
  }, [competenciasPrograma, rapsPrograma, ocultarCalificados, getEstadoRap]);

  // Actualizar competencia predeterminada si cambia el programa o si la
  // seleccionada actual queda oculta al activar el modo estricto.
  React.useEffect(() => {
    if (competenciasVisibles.length > 0 && !competenciasVisibles.some(c => c.codigo === selectedCompetenciaCodigo)) {
      setSelectedCompetenciaCodigo(competenciasVisibles[0].codigo);
    }
  }, [competenciasVisibles, selectedCompetenciaCodigo]);

  // RAPs pertenecientes a la competencia seleccionada
  const rapsDeCompetenciaActual = React.useMemo(() => {
    const rps = rapsPrograma.filter(r => r.competenciaCodigo === selectedCompetenciaCodigo);
    if (rps.length > 0) return rps;
    return [
      {
        id: `rap_fallback_1`,
        codigoRap: 'RAP 01',
        competenciaCodigo: selectedCompetenciaCodigo,
        denominacion: 'Resultado de aprendizaje técnico 01',
        fase: 'Fase 1: Análisis',
        duracionHoras: 40
      },
      {
        id: `rap_fallback_2`,
        codigoRap: 'RAP 02',
        competenciaCodigo: selectedCompetenciaCodigo,
        denominacion: 'Resultado de aprendizaje técnico 02',
        fase: 'Fase 2: Planeación',
        duracionHoras: 40
      },
      {
        id: `rap_fallback_3`,
        codigoRap: 'RAP 03',
        competenciaCodigo: selectedCompetenciaCodigo,
        denominacion: 'Resultado de aprendizaje técnico 03',
        fase: 'Fase 3: Ejecución',
        duracionHoras: 40
      },
      {
        id: `rap_fallback_4`,
        codigoRap: 'RAP 04',
        competenciaCodigo: selectedCompetenciaCodigo,
        denominacion: 'Resultado de aprendizaje técnico 04',
        fase: 'Fase 4: Evaluación',
        duracionHoras: 40
      }
    ];
  }, [rapsPrograma, selectedCompetenciaCodigo]);

  // En modo estricto, la selección automática (competencia completa / cambio de
  // competencia) nunca debe pre-marcar un RAP ya calificado.
  const excluirCalificados = React.useCallback((rps: ResultadoAprendizaje[], compCodigo: string) => {
    if (!ocultarCalificados) return rps;
    const disponibles = rps.filter(r => getEstadoRap(compCodigo, r.codigoRap) !== 'CALIFICADO');
    return disponibles.length > 0 ? disponibles : rps;
  }, [ocultarCalificados, getEstadoRap]);

  // Cambiar competencia y actualizar selección inicial
  const handleCambiarCompetencia = (codigoComp: string) => {
    setSelectedCompetenciaCodigo(codigoComp);
    const rps = excluirCalificados(rapsPrograma.filter(r => r.competenciaCodigo === codigoComp), codigoComp);
    if (isCompetenciaCompleta) {
      setSelectedRapCodigos(rps.map(r => r.codigoRap));
    } else {
      setSelectedRapCodigos(rps.length > 0 ? [rps[0].codigoRap] : ['RAP 01']);
    }
  };

  // Toggle modo Competencia Completa
  const handleToggleCompetenciaCompleta = () => {
    if (!isCompetenciaCompleta) {
      setIsCompetenciaCompleta(true);
      setSelectedRapCodigos(excluirCalificados(rapsDeCompetenciaActual, selectedCompetenciaCodigo).map(r => r.codigoRap));
    } else {
      setIsCompetenciaCompleta(false);
      const disponibles = excluirCalificados(rapsDeCompetenciaActual, selectedCompetenciaCodigo);
      setSelectedRapCodigos(disponibles.length > 0 ? [disponibles[0].codigoRap] : ['RAP 01']);
    }
  };

  // Toggle un RAP individual
  const handleToggleRap = (rapCodigo: string) => {
    if (isCompetenciaCompleta) {
      setIsCompetenciaCompleta(false);
    }

    setSelectedRapCodigos(prev => {
      if (prev.includes(rapCodigo)) {
        if (prev.length === 1) {
          // No permitir dejar 0 RAPs seleccionados
          return prev;
        }
        return prev.filter(c => c !== rapCodigo);
      } else {
        const next = [...prev, rapCodigo];
        if (next.length === rapsDeCompetenciaActual.length) {
          setIsCompetenciaCompleta(true);
        }
        return next;
      }
    });
  };

  // Seleccionar todos los RAPs de la competencia (excluye calificados en modo estricto)
  const handleSeleccionarTodosRaps = () => {
    setIsCompetenciaCompleta(true);
    setSelectedRapCodigos(excluirCalificados(rapsDeCompetenciaActual, selectedCompetenciaCodigo).map(r => r.codigoRap));
  };

  if (!ficha) {
    return (
      <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xs text-center max-w-2xl mx-auto mt-8 space-y-5 animate-in fade-in duration-200">
        <div className="w-14 h-14 bg-emerald-50 text-[#0D631B] rounded-2xl flex items-center justify-center mx-auto">
          <Calendar className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">No hay ficha seleccionada</h2>
          <p className="text-xs text-slate-500 leading-relaxed mt-1">
            Para visualizar o programar la matriz de horarios y validar anti-cruces, selecciona una ficha de formación.
          </p>
        </div>

        {allFichas && allFichas.length > 0 && onSelectFicha && (
          <div className="pt-2 text-left">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
              Fichas Disponibles por Programa de Formación
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto p-1">
              {allFichas.map(f => (
                <button
                  key={f.id}
                  onClick={() => onSelectFicha(f)}
                  className="p-3 rounded-xl bg-slate-50 hover:bg-[#E8F5E9] hover:border-[#C8E6C9] border border-slate-200 text-left transition-all group"
                >
                  {/* Se muestra PRIMERO el programa */}
                  <div className="text-xs font-bold text-[#111C2D] group-hover:text-[#0D631B] truncate">
                    {f.programaNombre}
                  </div>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-1">
                    <span className="font-mono font-bold text-slate-700 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                      Ficha {f.numero_ficha}
                    </span>
                    <span>•</span>
                    <span>{f.modalidad}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-center">
          <button
            onClick={() => onNavigateToCompetencias?.()}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
          >
            Explorar Catálogo de Programas & RAPs
          </button>
        </div>
      </div>
    );
  }

  // Objeto de la competencia seleccionada
  const compActual = competenciasPrograma.find(c => c.codigo === selectedCompetenciaCodigo) || {
    id: 'c_default',
    codigo: selectedCompetenciaCodigo,
    denominacion: 'Competencia Técnica Curricular',
    horasEstimadas: 160,
    tipo: 'Técnica' as const,
    programaCodigo: ficha.programaCodigo
  };

  // Permiso de edición
  const canEditHorarios = puedeEditar ?? (currentUser.rol === 'COORDINADOR' || currentUser.rol === 'ADMINISTRADOR' || currentUser.rol === 'AUXILIAR');

  // Buscar si la celda actual tiene bloque asignado para esta ficha
  // Solo los bloques del trimestre que se está viendo/editando: cada
  // trimestre tiene su propia semana lectiva, así que un bloque de "Martes
  // 09:00-12:00" en 2026-I y otro en 2026-II NO son la misma franja — son
  // periodos distintos del año y no deben mezclarse en una sola matriz.
  const currentFichaBloques = horarios.filter(h => h.fichaId === ficha.id && h.trimestre === trimestreSeleccionado);

  // Tope institucional de programación por RAP: una vez el RAP ya tiene entre
  // 70% y 100% de sus horas directas programadas en Horarios, no debería
  // seguir recibiendo más bloques (ya está cubierto). Se calcula sumando la
  // duración de todos los bloques existentes que incluyen ese RAP.
  // IMPORTANTE: se exige también competenciaCodigo — el código de RAP (p.ej.
  // "RAP 01") se reinicia en cada competencia, así que sin este filtro se
  // conflacían horas de RAPs de competencias distintas con el mismo número.
  // excluirBloqueId permite restar el aporte de un bloque específico (usado al
  // MOVER un bloque: sus horas no deben contarse dos veces contra sí mismo).
  const calcularHorasProgramadasRap = (compCodigo: string, rapCodigo: string, excluirBloqueId?: string): number => {
    return currentFichaBloques
      .filter(h => h.id !== excluirBloqueId && h.competenciaCodigo === compCodigo && h.rapsAsignados?.some(r => r.codigo === rapCodigo))
      .reduce((acc, h) => acc + h.duracionHoras, 0);
  };

  const calcularPorcentajeProgramadoRap = (compCodigo: string, rap: ResultadoAprendizaje): number => {
    const horasPlaneadas = rap.horasTrabajoDirecto || rap.duracionHoras || 0;
    if (horasPlaneadas <= 0) return 0;
    return Math.round((calcularHorasProgramadasRap(compCodigo, rap.codigoRap) / horasPlaneadas) * 100);
  };

  // Revisa los RAPs indicados (de UNA competencia) y devuelve el primero que ya
  // alcanzó el tope (>=70% de sus horas directas ya programadas), si lo hay.
  // Busca en rapsPrograma (todo el programa) en vez de solo la competencia
  // seleccionada en el panel, para que la validación sea correcta también al
  // mover/pegar un bloque de una competencia distinta a la seleccionada ahí.
  const encontrarRapEnTope = (compCodigo: string, rapCodigos: string[], excluirBloqueId?: string): { rapCodigo: string; horasProgramadas: number; horasPlaneadas: number; porcentaje: number } | null => {
    for (const rapCod of rapCodigos) {
      const rapObj = rapsPrograma.find(r => r.competenciaCodigo === compCodigo && r.codigoRap === rapCod);
      if (!rapObj) continue;
      const horasPlaneadas = rapObj.horasTrabajoDirecto || rapObj.duracionHoras || 0;
      if (horasPlaneadas <= 0) continue; // sin dato de horas planeadas, no se puede validar el tope
      const horasProgramadas = calcularHorasProgramadasRap(compCodigo, rapCod, excluirBloqueId);
      const porcentaje = Math.round((horasProgramadas / horasPlaneadas) * 100);
      if (porcentaje >= 70) {
        return { rapCodigo: rapCod, horasProgramadas, horasPlaneadas, porcentaje };
      }
    }
    return null;
  };
  const bloqueEnCelda = (dia: DiaSemana, franja: FranjaHorario) => {
    return currentFichaBloques.find(h => h.diaSemana === dia && h.franja === franja);
  };

  // Regla Heurística Anti-Cruces (un bloque vacante, sin instructor, nunca
  // puede tener cruce — no hay nadie a quien chocarle el horario todavía).
  const checkInstructorConflicto = (instId: string | undefined, dia: DiaSemana, franja: FranjaHorario) => {
    if (!instId) return { hasConflicto: false, fichaNumero: '', ambiente: '' };
    // Mismo día/franja pero en un TRIMESTRE distinto no es un cruce real — son
    // semanas distintas del año lectivo. Solo cuenta si cae en el mismo trimestre.
    const asignacionExterna = horarios.find(
      h => h.instructorId === instId &&
           h.diaSemana === dia &&
           h.franja === franja &&
           h.fichaId !== ficha.id &&
           h.trimestre === trimestreSeleccionado
    );

    if (asignacionExterna) {
      const fichaConflicto = allFichas.find(f => f.id === asignacionExterna.fichaId);
      return {
        hasConflicto: true,
        fichaNumero: fichaConflicto ? fichaConflicto.numero_ficha : 'Otra ficha',
        // Siempre el ambiente ACTUAL de esa otra ficha — nunca el que quedó
        // guardado en su bloque al crearlo, que puede estar desactualizado.
        ambiente: fichaConflicto?.ambientePrincipal || asignacionExterna.ambiente
      };
    }
    return { hasConflicto: false, fichaNumero: '', ambiente: '' };
  };

  // Códigos de RAP que cubre un bloque (competencia completa o selección de RAPs)
  const obtenerRapCodigosDeBloque = (bloque: BloqueHorario): string[] =>
    bloque.rapsAsignados && bloque.rapsAsignados.length > 0
      ? bloque.rapsAsignados.map(r => r.codigo)
      : [bloque.rapCodigo];

  // Validación compartida por Mover (drag & drop) y Pegar (copiar/pegar) antes
  // de escribir un bloque en una celda destino: cruce de instructor, franja ya
  // ocupada, RAP calificado bajo modo estricto, y tope institucional 70%-100%.
  // En 'MOVER' se excluye el aporte del propio bloque al tope (se reubica, no
  // se duplica); en 'PEGAR' se cuenta completo (sí se duplican horas).
  const validarDestinoParaBloque = (bloque: BloqueHorario, dia: DiaSemana, franja: FranjaHorario, modo: 'MOVER' | 'PEGAR'): string | null => {
    const ocupado = currentFichaBloques.find(h => h.diaSemana === dia && h.franja === franja && h.id !== bloque.id);
    if (ocupado) {
      return `La franja destino (${dia} • ${franja}) ya tiene un bloque asignado. Libera esa franja primero.`;
    }

    const conflicto = checkInstructorConflicto(bloque.instructorId, dia, franja);
    if (conflicto.hasConflicto) {
      return `¡BLOQUEO DE CRUCE PREVENTIVO!\nEl instructor ${bloque.instructorNombre} ya se encuentra asignado el día ${dia} en la franja ${franja} en la Ficha ${conflicto.fichaNumero} (${conflicto.ambiente}).`;
    }

    const rapCodigos = obtenerRapCodigosDeBloque(bloque);

    if (ocultarCalificados) {
      const rapCalificado = rapCodigos.find(cod => getEstadoRap(bloque.competenciaCodigo, cod) === 'CALIFICADO');
      if (rapCalificado) {
        return `${rapCalificado} ya está CALIFICADO y el modo estricto está activo. Desactiva "Bloquear calificados" arriba del selector de competencia si de verdad necesitas hacerlo.`;
      }
    }

    const rapEnTope = encontrarRapEnTope(bloque.competenciaCodigo, rapCodigos, modo === 'MOVER' ? bloque.id : undefined);
    if (rapEnTope) {
      return `No se puede ${modo === 'MOVER' ? 'mover' : 'pegar'} este bloque: ${rapEnTope.rapCodigo} ya tiene ${rapEnTope.horasProgramadas}h de ${rapEnTope.horasPlaneadas}h planeadas (${rapEnTope.porcentaje}%), dentro del rango institucional de cumplimiento (70%-100%).`;
    }

    return null;
  };

  // Mover un bloque existente a otra celda (arrastrar y soltar en el lienzo).
  const moverBloque = (bloque: BloqueHorario, dia: DiaSemana, franja: FranjaHorario) => {
    if (bloque.diaSemana === dia && bloque.franja === franja) return; // soltó en la misma celda

    const error = validarDestinoParaBloque(bloque, dia, franja, 'MOVER');
    if (error) {
      alert(error);
      return;
    }

    const { id: _id, ...datosBloque } = bloque;
    onEliminarBloque(bloque.id);
    onGuardarBloque({ ...datosBloque, diaSemana: dia, franja });
    mostrarToast(`Bloque movido a ${dia} • ${franja}`);
  };

  // Pegar el bloque copiado en una franja libre (duplicarlo con sus mismos
  // datos de competencia/RAPs/instructor, para agilizar el armado del horario
  // cuando se repite la misma asignación varias veces por semana).
  const pegarBloque = async (dia: DiaSemana, franja: FranjaHorario) => {
    if (!bloqueCopiado) return;

    if (bloqueCopiado.diaSemana === dia && bloqueCopiado.franja === franja) {
      alert('Selecciona una franja distinta a la de origen para pegar una copia.');
      return;
    }

    const error = validarDestinoParaBloque(bloqueCopiado, dia, franja, 'PEGAR');
    if (error) {
      alert(error);
      return;
    }

    if (bloqueCopiado.instructorId) {
      await avisarSiCompetenciaSobrepasada(bloqueCopiado.competenciaCodigo, bloqueCopiado.instructorNombre);
    }
    const { id: _id, ...datosBloque } = bloqueCopiado;
    onGuardarBloque({ ...datosBloque, diaSemana: dia, franja });
    mostrarToast(`Bloque pegado en ${dia} • ${franja}`);
  };

  // Calcular horas programadas
  const totalHorasProgramadas = currentFichaBloques.reduce((acc, curr) => acc + curr.duracionHoras, 0);

  // El año del trimestre que se está viendo actualmente (para el selector de
  // año) y, a partir de él, las 4 pastillas de trimestre de ESE año — así
  // "cambiar de año" es elegir el año y ver de una vez sus 4 trimestres,
  // en vez de ir dando clic de a un trimestre a la vez.
  const trimestreSeleccionadoParseado = React.useMemo(
    () => parsearTrimestre(trimestreSeleccionado),
    [trimestreSeleccionado]
  );
  const fichaTrimestreParseado = React.useMemo(
    () => parsearTrimestre(ficha.periodoLectivo),
    [ficha.periodoLectivo]
  );
  const anioSeleccionado = trimestreSeleccionadoParseado?.anio ?? fichaTrimestreParseado?.anio ?? new Date().getFullYear();

  const opcionesTrimestre = React.useMemo(() => {
    return ROMANOS_TRIMESTRE.map(r => `${anioSeleccionado}-${r}`);
  }, [anioSeleccionado]);

  // Años para el selector: un rango razonable alrededor del año actual de la
  // ficha (cubre toda la duración típica del programa hacia adelante y atrás)
  // más cualquier año donde ya exista horario programado para esta ficha.
  const aniosDisponibles = React.useMemo(() => {
    const set = new Set<number>();
    const base = fichaTrimestreParseado?.anio ?? new Date().getFullYear();
    for (let a = base - 1; a <= base + 3; a++) set.add(a);
    horarios.filter(h => h.fichaId === ficha.id && h.trimestre).forEach(h => {
      const p = parsearTrimestre(h.trimestre);
      if (p) set.add(p.anio);
    });
    set.add(anioSeleccionado);
    return Array.from(set).sort((a, b) => a - b);
  }, [fichaTrimestreParseado, ficha.id, horarios, anioSeleccionado]);

  const irATrimestreAnterior = () => {
    const anterior = anteriorTrimestre(trimestreSeleccionado);
    if (anterior) setTrimestreSeleccionado(anterior);
  };
  const irATrimestreSiguiente = () => {
    const siguiente = siguienteTrimestre(trimestreSeleccionado);
    if (siguiente) setTrimestreSeleccionado(siguiente);
  };
  const cambiarAnio = (nuevoAnio: number) => {
    // Conserva el mismo trimestre romano (I, II, III, IV) que se estaba viendo,
    // solo cambia el año — así saltar de año no te bota siempre al trimestre I.
    const romano = trimestreSeleccionadoParseado ? ROMANOS_TRIMESTRE[trimestreSeleccionadoParseado.indice] : 'I';
    setTrimestreSeleccionado(`${nuevoAnio}-${romano}`);
  };
  // Evaluación y recomendación de instructores para la competencia y RAPs seleccionados
  const instructoresEvaluados: EvaluacionAfinidadInstructor[] = React.useMemo(() => {
    return instructores.map(inst => {
      return evaluarAfinidadInstructor(inst, compActual, selectedRapCodigos, rapsDeCompetenciaActual);
    }).sort((a, b) => {
      // Ordenar por score descendente (recomendados primero)
      if (b.score !== a.score) return b.score - a.score;
      // Desempate por horas asignadas ascendente (menos cargado primero)
      return a.instructor.horasSemanalesAsignadas - b.instructor.horasSemanalesAsignadas;
    });
  }, [instructores, compActual, selectedRapCodigos, rapsDeCompetenciaActual]);

  const totalRecomendados = instructoresEvaluados.filter(e => e.esRecomendado).length;

  const instructoresFiltrados = React.useMemo(() => {
    let lista = instructoresEvaluados;

    if (filtroTipoInstructores === 'RECOMENDADOS') {
      const recs = lista.filter(e => e.esRecomendado);
      lista = recs.length > 0 ? recs : lista;
    }

    if (searchInstructor.trim()) {
      const term = searchInstructor.toLowerCase().trim();
      lista = lista.filter(e => 
        e.instructor.nombreCompleto.toLowerCase().includes(term) ||
        (e.instructor.especialidad && e.instructor.especialidad.toLowerCase().includes(term)) ||
        (e.instructor.perfilTecnico && e.instructor.perfilTecnico.toLowerCase().includes(term))
      );
    }

    return lista;
  }, [instructoresEvaluados, filtroTipoInstructores, searchInstructor]);

  // Datos base del bloque (competencia/RAPs/día/franja) comunes a la
  // asignación con instructor y a dejarlo vacante — evita reconstruirlos dos veces.
  const construirDatosBaseBloque = () => {
    const rapsObjetos = rapsDeCompetenciaActual.filter(r => selectedRapCodigos.includes(r.codigoRap));
    const rapCodigoResumen = isCompetenciaCompleta
      ? `Comp. Completa (${rapsDeCompetenciaActual.length} RAPs)`
      : selectedRapCodigos.join(', ');
    const rapTituloResumen = isCompetenciaCompleta
      ? `${compActual.denominacion} (Competencia Completa)`
      : rapsObjetos.map(r => `${r.codigoRap}: ${r.denominacion}`).join(' | ');

    return {
      fichaId: ficha.id,
      diaSemana: selectedDia,
      franja: selectedFranja,
      // El ambiente SIEMPRE es el asignado a la ficha (Espacio Físico / Sede en
      // el encabezado) — nunca uno propio del bloque, así se mantiene
      // sincronizado aunque la ficha lo cambie después de crear el bloque.
      ambiente: ficha.ambientePrincipal,
      rapCodigo: rapCodigoResumen,
      rapTitulo: rapTituloResumen,
      competenciaCodigo: selectedCompetenciaCodigo,
      competenciaNombre: compActual.denominacion,
      rapsAsignados: rapsObjetos.map(r => ({
        codigo: r.codigoRap,
        denominacion: r.denominacion,
        horas: r.duracionHoras
      })),
      esCompetenciaCompleta: isCompetenciaCompleta,
      duracionHoras: 3,
      fechaCorteInicio: '2026-07-01',
      fechaCorteFin: '2026-09-30',
      // El bloque se guarda en el trimestre que se está viendo/editando —
      // normalmente el actual de la ficha, pero puede ser otro si se está
      // pre-programando un trimestre futuro sin haber avanzado la ficha todavía.
      trimestre: trimestreSeleccionado || ficha.periodoLectivo
    };
  };

  // Ejecución formal de la asignación del bloque
  const ejecutarAsignacion = (instructor: Instructor, conAdvertencia: boolean, motivoAdvertencia?: string) => {
    onGuardarBloque({
      ...construirDatosBaseBloque(),
      instructorId: instructor.id,
      instructorNombre: instructor.nombreCompleto,
      advertenciaPerfil: conAdvertencia ? {
        tieneAdvertencia: true,
        motivo: motivoAdvertencia || `El perfil del instructor (${instructor.especialidad || instructor.perfilTecnico}) difiere de la competencia requerida (${compActual.denominacion}). Asignado bajo criterio del usuario.`,
        instructorPerfil: instructor.especialidad || instructor.perfilTecnico,
        competenciaTipo: compActual.tipo,
        competenciaNombre: compActual.denominacion
      } : undefined
    });

    setModalAdvertenciaPerfil(null);
  };

  // Programar el RAP/competencia en la franja SIN instructor todavía —
  // "vacante" — para que el espacio quede reservado y se cubra después con
  // el instructor que llegue, sin tener que rehacer la asignación desde cero.
  const ejecutarAsignacionVacante = () => {
    if (selectedRapCodigos.length === 0) {
      alert('Debe seleccionar al menos un RAP o la competencia completa.');
      return;
    }
    if (ocultarCalificados) {
      const rapCalificado = selectedRapCodigos.find(cod => getEstadoRap(selectedCompetenciaCodigo, cod) === 'CALIFICADO');
      if (rapCalificado) {
        alert(`${rapCalificado} ya está CALIFICADO y el modo estricto está activo. No se puede dejar programado sobre un RAP ya calificado.`);
        return;
      }
    }
    const rapEnTope = encontrarRapEnTope(selectedCompetenciaCodigo, selectedRapCodigos);
    if (rapEnTope) {
      alert(
        `No se puede programar más horas para ${rapEnTope.rapCodigo}.\n\n` +
        `Ya tiene ${rapEnTope.horasProgramadas}h programadas de ${rapEnTope.horasPlaneadas}h planeadas ` +
        `(${rapEnTope.porcentaje}%), dentro del rango institucional de cumplimiento (70%-100%).`
      );
      return;
    }
    onGuardarBloque({
      ...construirDatosBaseBloque(),
      instructorId: undefined,
      instructorNombre: undefined,
      vacante: true
    });
    mostrarToast('Espacio programado como VACANTE — asígnale un instructor cuando esté disponible.');
  };

  // Aviso (no bloqueo): si la competencia ya pasó del 100% de su tiempo —
  // horas ejecutadas (SofiaPlus) contra horas planeadas, el mismo cálculo de
  // Seguimiento — se avisa al asignar instructor, pero se deja continuar.
  const avisarSiCompetenciaSobrepasada = async (compCodigo: string, instructorNombre?: string): Promise<void> => {
    const comp = competenciasPrograma.find(c => c.codigo === compCodigo);
    if (!comp) return;
    const regsFicha = registrosHorasEjecutadas.filter(r => r.fichaNumero === ficha.numero_ficha && r.competenciaCodigo === compCodigo);
    if (regsFicha.length === 0) return;
    const [item] = calcularComparativoCompetencias(
      [comp],
      regsFicha,
      actividades.filter(a => a.fichaId === ficha.id)
    );
    if (!item || item.horasTotalesPlaneadas <= 0 || item.porcentajeEjecucion <= 100) return;
    await dialogo.alerta({
      tipo: 'advertencia',
      titulo: 'Competencia por encima del 100% de su tiempo',
      mensaje: `${comp.codigo} — ${comp.denominacion}`,
      detalles: [
        { etiqueta: 'Horas ejecutadas', valor: `${item.horasEjecutadas} h` },
        { etiqueta: 'Horas planeadas', valor: `${item.horasTotalesPlaneadas} h` },
        ...(instructorNombre ? [{ etiqueta: 'Instructor', valor: instructorNombre }] : [])
      ],
      porcentaje: item.porcentajeEjecucion,
      nota: 'La asignación se realizará de todas formas.',
      textoAceptar: 'Entendido, continuar'
    });
  };

  const confirmarDejarVacante = (instructorNombre?: string) =>
    dialogo.confirmar({
      tipo: 'advertencia',
      titulo: `¿${instructorNombre || 'El instructor'} ya no continúa en este espacio?`,
      mensaje: 'El bloque quedará VACANTE (programado, sin instructor) para reasignarlo después, sin perder el bloque ni el historial.',
      textoAceptar: 'Sí, dejar vacante',
      textoCancelar: 'Cancelar'
    });

  // Manejador que valida cruces y perfil antes de asignar
  const handleIntentarAsignarInstructor = async (evaluacion: EvaluacionAfinidadInstructor) => {
    const instructor = evaluacion.instructor;
    const conflicto = checkInstructorConflicto(instructor.id, selectedDia, selectedFranja);
    if (conflicto.hasConflicto) {
      alert(`¡BLOQUEO DE CRUCE PREVENTIVO!\nEl instructor ${instructor.nombreCompleto} ya se encuentra asignado el día ${selectedDia} en la franja ${selectedFranja} en la Ficha ${conflicto.fichaNumero} (${conflicto.ambiente}). Por favor elija un instructor disponible.`);
      return;
    }

    if (selectedRapCodigos.length === 0) {
      alert('Debe seleccionar al menos un RAP o la competencia completa.');
      return;
    }

    // Tope institucional: si alguno de los RAPs seleccionados ya tiene entre
    // 70% y 100% de sus horas directas programadas en Horarios, se bloquea el
    // nuevo bloque — ya está dentro del rango de cumplimiento y programarlo
    // de más no aporta (y desincroniza el semáforo de Seguimiento).
    // Modo estricto: ningún RAP ya calificado debería recibir más programación.
    if (ocultarCalificados) {
      const rapCalificado = selectedRapCodigos.find(cod => getEstadoRap(selectedCompetenciaCodigo, cod) === 'CALIFICADO');
      if (rapCalificado) {
        alert(
          `${rapCalificado} ya está CALIFICADO y el modo estricto está activo.\n\n` +
          `No se puede programar más horas sobre un RAP ya calificado. Si necesita hacerlo de todas ` +
          `formas (p.ej. una recalificación), desactive el interruptor "Bloquear calificados" arriba del selector de competencia.`
        );
        return;
      }
    }

    const rapEnTope = encontrarRapEnTope(selectedCompetenciaCodigo, selectedRapCodigos);
    if (rapEnTope) {
      alert(
        `No se puede programar más horas para ${rapEnTope.rapCodigo}.\n\n` +
        `Ya tiene ${rapEnTope.horasProgramadas}h programadas de ${rapEnTope.horasPlaneadas}h planeadas ` +
        `(${rapEnTope.porcentaje}%), dentro del rango institucional de cumplimiento (70%-100%).\n\n` +
        `Este RAP no requiere más programación en Horarios. Si de verdad necesita más horas, ` +
        `revíselo primero en el módulo de Seguimiento.`
      );
      return;
    }

    await avisarSiCompetenciaSobrepasada(selectedCompetenciaCodigo, instructor.nombreCompleto);

    // Si el instructor NO tiene el perfil ni historial, mostrar advertencia interactiva pero permitir continuar
    if (evaluacion.requiereAdvertencia) {
      setModalAdvertenciaPerfil({
        isOpen: true,
        instructor,
        evaluacion
      });
      return;
    }

    // Asignación directa si es recomendado o perfil afín
    ejecutarAsignacion(instructor, false);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Encabezado y Filtros */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-black">
              Programación Curricular
            </span>
            <span>•</span>
            <span>Ficha {ficha.numero_ficha} ({ficha.modalidad})</span>
          </div>
          <h1 className="text-2xl font-black text-[#111C2D] tracking-tight mt-1 flex items-center space-x-2.5">
            <Calendar className="w-6 h-6 text-[#0D631B]" />
            <span>Horarios: Ficha {ficha.numero_ficha} — {ficha.programaNombre}</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Asigne a los instructores una competencia completa o múltiples RAPs por bloque de forma dinámica con validación anti-cruces en tiempo real.
          </p>
        </div>

        {/* Acciones Superiores */}
        <div className="flex flex-wrap items-center gap-2.5">
          {onNavigateToCompetencias && (
            <button
              id="btn-ver-raps-programa"
              onClick={() => onNavigateToCompetencias(ficha.programaCodigo)}
              className="flex items-center space-x-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 px-3 py-2 rounded-xl text-xs font-bold transition-colors"
              title="Explorar competencias y RAPs del programa de formación"
            >
              <BookOpen className="w-4 h-4 text-blue-700" />
              <span>Ver RAPs del Programa</span>
            </button>
          )}

          <div className="flex items-center space-x-2 bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] px-3.5 py-2 rounded-xl text-xs font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>MOTOR ANTI-CRUCES ACTIVO</span>
          </div>

          <button
            id="btn-validar-cruces"
            onClick={() => setShowCrucesValidationModal(true)}
            className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold text-[#111C2D] shadow-xs transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-[#005A8C]" />
            <span>Auditar Cruces</span>
          </button>

          <button
            id="btn-ir-reportes"
            onClick={() => setHorarioSubTab(prev => prev === 'REPORTES' ? 'MATRIZ' : 'REPORTES')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all ${
              horarioSubTab === 'REPORTES'
                ? 'bg-[#111C2D] text-white'
                : 'bg-[#0D631B] hover:bg-[#0a4d15] text-white'
            }`}
          >
            <FileDown className="w-4 h-4" />
            <span>{horarioSubTab === 'REPORTES' ? 'Volver a la Matriz' : 'Reportes'}</span>
          </button>
        </div>
      </div>

      {horarioSubTab === 'REPORTES' ? (
        <ReportesHorarioPanel
          ficha={ficha}
          currentFichaBloques={currentFichaBloques}
          onNavigateToReportesInstructores={onNavigateToReportesInstructores}
        />
      ) : (
      <>
      {/* Selectores de Ambiente y Periodo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Espacio Físico / Sede
          </div>
          {/* Solo informativo: se toma de la ficha (tabla `fichas`, columna
              ambiente_principal). Se cambia editando la ficha. */}
          <div className="text-xs font-bold text-[#111C2D] truncate" title={ficha.ambientePrincipal || ''}>
            {ficha.ambientePrincipal || 'Sin ambiente asignado'}
          </div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Periodo Lectivo
          </div>
          <div className="text-xs font-bold text-[#111C2D]">
            {ficha.periodoLectivo}
          </div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Carga Semanal Programada
          </div>
          <div className="text-xs font-black text-[#0D631B]">
            {totalHorasProgramadas} / 40 hrs semanales
          </div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Competencias en Planeación
          </div>
          <div className="text-xs font-bold text-blue-700">
            {competenciasPrograma.length} Competencias • {rapsPrograma.length} RAPs
          </div>
        </div>
      </div>

      {/* Navegación de Trimestre: el año lectivo se programa en 4 trimestres
          (AAAA-I a AAAA-IV) y cada uno tiene su propia matriz semanal. Aquí se
          cambia cuál se está viendo/editando, y se puede avanzar oficialmente
          la ficha al trimestre elegido. */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trimestre</span>
        </div>

        {/* Selector de año: cambiarlo salta directo a ese año conservando el
            mismo trimestre romano, en vez de tener que dar varios clics con
            las flechas para cruzar de un año a otro. */}
        <select
          value={anioSeleccionado}
          onChange={(e) => cambiarAnio(parseInt(e.target.value, 10))}
          title="Cambiar de año"
          className="shrink-0 text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        >
          {aniosDisponibles.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <div className="flex items-center gap-1.5 flex-1 flex-wrap">
          <button
            type="button"
            onClick={irATrimestreAnterior}
            disabled={!anteriorTrimestre(trimestreSeleccionado)}
            title="Trimestre anterior"
            className="p-1.5 rounded-lg text-slate-400 hover:text-[#0D631B] hover:bg-emerald-50 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {opcionesTrimestre.map(t => {
            const esActivo = t === trimestreSeleccionado;
            const esActualFicha = t === ficha.periodoLectivo;
            const tieneBloques = horarios.some(h => h.fichaId === ficha.id && h.trimestre === t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTrimestreSeleccionado(t)}
                title={esActualFicha ? 'Trimestre actual de la ficha' : tieneBloques ? 'Ya tiene horario programado' : 'Sin horario programado todavía'}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                  esActivo
                    ? 'bg-[#0D631B] text-white border-[#0D631B]'
                    : esActualFicha
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:border-emerald-400'
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'
                }`}
              >
                {t}{esActualFicha && !esActivo ? ' •' : ''}
              </button>
            );
          })}

          <button
            type="button"
            onClick={irATrimestreSiguiente}
            disabled={!siguienteTrimestre(trimestreSeleccionado)}
            title="Trimestre siguiente"
            className="p-1.5 rounded-lg text-slate-400 hover:text-[#0D631B] hover:bg-emerald-50 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Grilla Principal: Matriz Semanal a la izquierda y Panel de Asignación a
          la derecha. El panel puede contraerse a una franja angosta para darle
          más espacio horizontal al lienzo del horario. */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Matriz Semanal de Distribución */}
        <div className={`${panelAsignacionColapsado ? 'lg:col-span-11' : 'lg:col-span-7'} bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4 transition-all`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-black text-[#111C2D]">Matriz Semanal de Distribución</h2>
              <p className="text-xs text-slate-500">
                Haz clic en cualquier celda para seleccionar día y franja, o para ver los RAPs asignados.
              </p>
            </div>

            {/* Leyenda de colores */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold">
              <span className="flex items-center space-x-1 text-[#2E7D32]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2E7D32]"></span>
                <span>Asignado</span>
              </span>
              <span className="flex items-center space-x-1 text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                <span>Libre</span>
              </span>
              <span className="flex items-center space-x-1 text-[#BA1A1A]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#BA1A1A]"></span>
                <span>Conflicto</span>
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 -mt-2">
            Arrastra un bloque asignado a otra franja para moverlo, o usa el ícono de copiar para pegarlo en varias franjas.
          </p>

          {/* Indicador de portapapeles: bloque copiado listo para pegar en
              cualquier franja libre (Copiar/Pegar agiliza repetir la misma
              asignación varias veces por semana). */}
          {bloqueCopiado && (
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-900">
              <span className="flex items-center gap-1.5 min-w-0">
                <ClipboardPaste className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  <strong>Copiado:</strong> {bloqueCopiado.competenciaNombre || bloqueCopiado.rapTitulo} — {bloqueCopiado.instructorNombre || 'VACANTE (sin instructor)'} ({bloqueCopiado.duracionHoras}h). Haz clic en "Pegar Bloque" sobre cualquier franja libre.
                </span>
              </span>
              <button
                type="button"
                onClick={() => setBloqueCopiado(null)}
                className="shrink-0 font-bold text-blue-700 hover:text-blue-900 underline"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Grilla de Horarios — día (columnas) y hora (filas) quedan como
              paneles inmovilizados (sticky) al hacer scroll, para no perder
              de vista en qué día/franja se está al recorrer la matriz. */}
          <div className="overflow-auto max-h-[70vh] rounded-xl">
            <table className="w-full border-separate border-spacing-0 text-left min-w-[650px]">
              <thead>
                <tr>
                  <th className="sticky top-0 left-0 z-30 p-2.5 bg-slate-100 rounded-tl-xl text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider w-24">
                    Horario
                  </th>
                  {DIAS.map((d, i) => (
                    <th
                      key={d}
                      className={`sticky top-0 z-20 p-2.5 bg-slate-100 text-center text-[11px] font-bold text-slate-700 ${i === DIAS.length - 1 ? 'rounded-tr-xl' : ''}`}
                    >
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FRANJAS.map(f => (
                  <tr key={f.franja} className="h-32">
                    {/* Celda de Franja — inmovilizada a la izquierda */}
                    <td className="sticky left-0 z-10 p-2 text-center bg-slate-50 border-r border-b border-slate-100">
                      <div className="text-xs font-black text-[#111C2D]">{f.label}</div>
                      <div className="text-[10px] font-medium text-slate-400">{f.sub}</div>
                    </td>

                    {/* Días */}
                    {DIAS.map(d => {
                      const bloque = bloqueEnCelda(d, f.franja);
                      const isSelected = selectedDia === d && selectedFranja === f.franja;

                      // Retroalimentación en vivo mientras se arrastra un bloque: la
                      // celda bajo el cursor se marca en azul (destino válido) o rojo
                      // (ocupada / cruce de instructor / tope / calificado) antes de soltar.
                      const esCeldaHoverDrag = !!bloqueArrastrado && celdaHoverDrag?.dia === d && celdaHoverDrag?.franja === f.franja;
                      const esMismaCeldaOrigen = !!bloqueArrastrado && bloqueArrastrado.diaSemana === d && bloqueArrastrado.franja === f.franja;
                      const dragEsValido = esCeldaHoverDrag && !esMismaCeldaOrigen && bloqueArrastrado
                        ? !validarDestinoParaBloque(bloqueArrastrado, d, f.franja, 'MOVER')
                        : null;

                      return (
                        <td
                          key={d}
                          onClick={() => {
                            setSelectedDia(d);
                            setSelectedFranja(f.franja);
                            if (bloque) {
                              setBloqueDetalleModal(bloque);
                            }
                          }}
                          onDragOver={(e) => {
                            if (!bloqueArrastrado) return;
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            if (celdaHoverDrag?.dia !== d || celdaHoverDrag?.franja !== f.franja) {
                              setCeldaHoverDrag({ dia: d, franja: f.franja });
                            }
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (bloqueArrastrado) moverBloque(bloqueArrastrado, d, f.franja);
                            setBloqueArrastrado(null);
                            setCeldaHoverDrag(null);
                          }}
                          className={`p-1.5 transition-all cursor-pointer border border-slate-100/80 align-top ${
                            isSelected ? 'ring-2 ring-[#0D631B] ring-inset bg-emerald-50/40' : ''
                          } ${dragEsValido === true ? 'ring-2 ring-blue-400 ring-inset bg-blue-50/50' : ''} ${dragEsValido === false ? 'ring-2 ring-red-400 ring-inset bg-red-50/50' : ''}`}
                        >
                          {bloque ? (
                            <div
                              draggable={canEditHorarios}
                              onDragStart={(e) => {
                                if (!canEditHorarios) return;
                                setBloqueArrastrado(bloque);
                                e.dataTransfer.effectAllowed = 'move';
                                e.dataTransfer.setData('text/plain', bloque.id);
                              }}
                              onDragEnd={() => {
                                setBloqueArrastrado(null);
                                setCeldaHoverDrag(null);
                              }}
                              className={`h-full p-2.5 rounded-xl flex flex-col justify-between text-xs hover:shadow-sm transition-shadow ${
                                bloque.instructorId
                                  ? 'bg-[#E8F5E9] border border-[#C8E6C9]'
                                  : 'bg-amber-50 border-2 border-dashed border-amber-300'
                              } ${
                                canEditHorarios ? 'cursor-grab active:cursor-grabbing' : ''
                              } ${bloqueArrastrado?.id === bloque.id ? 'opacity-40' : ''}`}
                              title={canEditHorarios ? 'Arrastra para mover este bloque a otra franja' : undefined}
                            >
                              <div>
                                {/* Badge de Competencia Completa o RAPs múltiples */}
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  {bloque.esCompetenciaCompleta ? (
                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-800 text-white truncate">
                                      ★ COMP. COMPLETA
                                    </span>
                                  ) : (
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded text-white truncate ${bloque.instructorId ? 'bg-[#0D631B]' : 'bg-amber-600'}`}>
                                      {bloque.rapsAsignados && bloque.rapsAsignados.length > 1
                                        ? `${bloque.rapsAsignados.length} RAPs ASIGNADOS`
                                        : bloque.rapCodigo}
                                    </span>
                                  )}
                                  {bloque.instructorId ? (
                                    <Check className="w-3.5 h-3.5 text-[#2E7D32] shrink-0" />
                                  ) : (
                                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  )}
                                </div>

                                <div className="font-bold text-[11px] text-[#111C2D] line-clamp-2 leading-tight">
                                  {bloque.competenciaNombre || bloque.rapTitulo}
                                </div>

                                {/* Pills de los RAPs asignados */}
                                {bloque.rapsAsignados && bloque.rapsAsignados.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {bloque.rapsAsignados.slice(0, 3).map((r, i) => (
                                      <span key={i} className="text-[9px] px-1 py-0.2 rounded bg-white text-emerald-900 border border-emerald-200 font-mono font-bold">
                                        {r.codigo}
                                      </span>
                                    ))}
                                    {bloque.rapsAsignados.length > 3 && (
                                      <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-100 text-emerald-900 font-bold">
                                        +{bloque.rapsAsignados.length - 3}
                                      </span>
                                    )}
                                  </div>
                                )}

                                {bloque.instructorId ? (
                                  <div className="text-[11px] text-slate-700 font-semibold mt-1 truncate">
                                    {bloque.instructorNombre}
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-amber-800 font-black mt-1 truncate flex items-center space-x-1">
                                    <AlertOctagon className="w-3 h-3 shrink-0" />
                                    <span>VACANTE — falta instructor</span>
                                  </div>
                                )}

                                {/* Indicador de Advertencia de Perfil */}
                                {bloque.advertenciaPerfil?.tieneAdvertencia && (
                                  <div
                                    className="mt-1 px-1.5 py-0.5 rounded bg-amber-100/90 border border-amber-300 text-amber-900 font-bold text-[9px] flex items-center space-x-1"
                                    title={bloque.advertenciaPerfil.motivo}
                                  >
                                    <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                                    <span className="truncate">⚠️ Advertencia de Perfil</span>
                                  </div>
                                )}
                              </div>

                              <div className={`flex items-center justify-between mt-2 pt-1 border-t ${bloque.instructorId ? 'border-[#C8E6C9]' : 'border-amber-200'}`}>
                                <span className={`text-[10px] font-black px-1 py-0.2 rounded bg-white ${bloque.instructorId ? 'text-[#0D631B]' : 'text-amber-700'}`}>
                                  {bloque.duracionHoras}h
                                </span>
                                {canEditHorarios && (
                                  <div className="flex items-center space-x-0.5">
                                    {!bloque.instructorId && onAsignarInstructorABloque && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setBloqueDetalleModal(bloque);
                                        }}
                                        className="text-amber-600 hover:text-amber-800 p-0.5 rounded hover:bg-white transition-colors"
                                        title="Asignar Instructor a este espacio vacante"
                                      >
                                        <UserPlus className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    {bloque.instructorId && onQuitarInstructorDeBloque && (
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (await confirmarDejarVacante(bloque.instructorNombre)) {
                                            onQuitarInstructorDeBloque(bloque.id);
                                          }
                                        }}
                                        className="text-slate-400 hover:text-amber-600 p-0.5 rounded hover:bg-white transition-colors"
                                        title="Dejar Vacante (el instructor ya no continúa)"
                                      >
                                        <UserX className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setBloqueCopiado(bloque);
                                        mostrarToast('Bloque copiado — haz clic en "Pegar Bloque" en una franja libre');
                                      }}
                                      className="text-slate-400 hover:text-blue-600 p-0.5 rounded hover:bg-white transition-colors"
                                      title="Copiar Bloque"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onEliminarBloque(bloque.id);
                                      }}
                                      className="text-slate-400 hover:text-red-600 p-0.5 rounded hover:bg-white transition-colors"
                                      title="Liberar Franja"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : bloqueCopiado && canEditHorarios ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                pegarBloque(d, f.franja);
                              }}
                              className="h-full w-full border-2 border-dashed border-blue-300 rounded-xl flex flex-col items-center justify-center p-2 text-blue-500 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50/60 transition-all text-xs"
                              title={`Pegar: ${bloqueCopiado.competenciaNombre || bloqueCopiado.rapTitulo} — ${bloqueCopiado.instructorNombre || 'VACANTE'}`}
                            >
                              <ClipboardPaste className="w-4 h-4 mb-0.5" />
                              <span className="text-[10px] font-bold">Pegar Bloque</span>
                              <span className="text-[9px] text-blue-400 truncate max-w-full px-1">{bloqueCopiado.instructorNombre || 'VACANTE'}</span>
                            </button>
                          ) : (
                            <div className="h-full border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-2 text-slate-400 hover:border-[#2E7D32] hover:text-[#0D631B] hover:bg-slate-50/80 transition-all text-xs">
                              <Plus className="w-4 h-4 mb-0.5" />
                              <span className="text-[10px] font-bold">+ Asignar</span>
                              <span className="text-[9px] text-slate-400">Franja Libre</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel Lateral de Asignación: Competencia Completa o Múltiples RAPs.
            Colapsado se reduce a una franja angosta con un botón para reabrirlo. */}
        {panelAsignacionColapsado ? (
          <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col items-center py-4 gap-3 transition-all">
            <button
              type="button"
              onClick={() => setPanelAsignacionColapsado(false)}
              title="Expandir Panel de Asignación"
              className="p-2 rounded-xl text-slate-400 hover:text-[#0D631B] hover:bg-emerald-50 transition-colors"
            >
              <PanelRightOpen className="w-4 h-4" />
            </button>
            <span
              className="text-[10px] font-bold text-slate-400 uppercase tracking-wider"
              style={{ writingMode: 'vertical-rl' }}
            >
              Panel de Asignación
            </span>
            <span className="text-[9px] font-black px-1.5 py-1 rounded bg-emerald-50 text-emerald-800 text-center leading-tight">
              {selectedDia}<br />{selectedFranja.split(' - ')[0]}
            </span>
          </div>
        ) : (
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-5 transition-all">
          {/* Header del Panel de Asignación */}
          <div className="border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Panel de Asignación Dinámica
              </span>
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-50 text-emerald-800">
                  {selectedDia} • {selectedFranja}
                </span>
                <button
                  type="button"
                  onClick={() => setPanelAsignacionColapsado(true)}
                  title="Contraer panel para tener más espacio en el lienzo del horario"
                  className="p-1 rounded-lg text-slate-400 hover:text-[#0D631B] hover:bg-emerald-50 transition-colors"
                >
                  <PanelRightClose className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <h3 className="text-base font-black text-[#111C2D] mt-1">
              Programar Instructor en Franja
            </h3>
            <p className="text-xs text-slate-500">
              3 Horas Lectivas en {ficha.ambientePrincipal} • Seleccione la competencia y elija asignar la competencia completa o varios RAPs.
            </p>
          </div>

          {/* PASO 1: Selector de Competencia */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#111C2D] flex items-center justify-between">
              <span>1. Seleccionar Competencia del Programa</span>
              <span className="text-[10px] text-slate-400 font-normal">
                {competenciasVisibles.length} disponibles
              </span>
            </label>

            {/* Modo estricto: por defecto oculta competencias 100% calificadas y
                bloquea RAPs ya calificados; se puede apagar para excepciones. */}
            <button
              type="button"
              onClick={() => setOcultarCalificados(prev => !prev)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-[11px] font-bold transition-all ${
                ocultarCalificados
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-300 text-amber-800'
              }`}
              title="Cuando está activo, oculta competencias 100% calificadas y bloquea RAPs ya calificados para que no se les programen más horas."
            >
              <span className="flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Bloquear calificados (competencias y RAPs)</span>
              </span>
              <span className={`px-2 py-0.5 rounded-full ${ocultarCalificados ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}`}>
                {ocultarCalificados ? 'ACTIVO' : 'EXCEPCIÓN: DESACTIVADO'}
              </span>
            </button>

            <CompetenciaSearchSelect
              competencias={competenciasVisibles}
              selectedCodigo={selectedCompetenciaCodigo}
              onChange={handleCambiarCompetencia}
            />

            {/* Datos que NO se repiten ya en el selector de arriba (código,
                tipo y denominación quedan ahí) — solo lo adicional. */}
            <div className="text-[10px] text-slate-400 flex items-center justify-between px-1">
              <span>{rapsDeCompetenciaActual.length} RAPs en esta competencia</span>
              <span>{compActual.horasEstimadas}h estimadas</span>
            </div>
          </div>

          {/* PASO 2: Modo de Asignación (Competencia Completa o Más de un RAP) */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#111C2D]">
                2. Modalidad de Asignación de RAPs
              </label>

              {/* Botón Asignar Competencia Completa con un solo click */}
              <button
                type="button"
                id="btn-toggle-competencia-completa"
                onClick={handleToggleCompetenciaCompleta}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isCompetenciaCompleta
                    ? 'bg-[#0D631B] text-white shadow-xs'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-[#0D631B] border border-emerald-200'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>
                  {isCompetenciaCompleta ? '✓ Competencia Completa' : 'Asignar Competencia Completa'}
                </span>
              </button>
            </div>

            {/* Banner de estado de selección — una sola línea; la explicación
                queda en el title (tooltip) en vez de ocupar espacio fijo. */}
            <div
              className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                isCompetenciaCompleta
                  ? 'bg-[#E8F5E9] border-[#C8E6C9] text-emerald-900'
                  : 'bg-blue-50/70 border-blue-200 text-blue-900'
              }`}
              title={isCompetenciaCompleta
                ? 'El instructor responderá por el logro y juicio evaluativo de todos los RAPs de la norma.'
                : 'Puedes marcar o desmarcar varios RAPs según el plan pedagógico.'}
            >
              <div className="flex items-center space-x-2">
                {isCompetenciaCompleta ? (
                  <CheckCheck className="w-4 h-4 text-[#0D631B] shrink-0" />
                ) : (
                  <ListChecks className="w-4 h-4 text-blue-700 shrink-0" />
                )}
                <span className="font-bold">
                  {isCompetenciaCompleta
                    ? `Competencia Completa (${rapsDeCompetenciaActual.length} RAPs incluidos)`
                    : `${selectedRapCodigos.length} de ${rapsDeCompetenciaActual.length} RAPs seleccionados`}
                </span>
              </div>

              {!isCompetenciaCompleta && (
                <button
                  type="button"
                  onClick={handleSeleccionarTodosRaps}
                  className="text-[10px] font-bold text-blue-800 underline hover:text-blue-950 shrink-0 ml-2"
                >
                  Seleccionar Todos
                </button>
              )}
            </div>

            {/* Lista interactiva de RAPs con checkboxes tipo card */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {rapsDeCompetenciaActual.map((rap) => {
                const isChecked = selectedRapCodigos.includes(rap.codigoRap);
                // Aviso temprano (antes de intentar asignar) de que este RAP ya
                // está dentro o cerca del tope de cumplimiento 70%-100%.
                const porcentajeProgramado = calcularPorcentajeProgramadoRap(selectedCompetenciaCodigo, rap);
                const enTope = porcentajeProgramado >= 70;
                const estadoRap = getEstadoRap(selectedCompetenciaCodigo, rap.codigoRap);
                const esCalificado = estadoRap === 'CALIFICADO';
                // En modo estricto, un RAP ya calificado no se puede ni marcar:
                // no admite más programación de instructor en Horarios.
                const bloqueado = esCalificado && ocultarCalificados;

                return (
                  <div
                    key={rap.id || rap.codigoRap}
                    onClick={() => { if (!bloqueado) handleToggleRap(rap.codigoRap); }}
                    className={`p-2.5 rounded-xl border transition-all flex items-start space-x-2.5 select-none text-xs ${
                      bloqueado
                        ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-70'
                        : isChecked
                        ? 'bg-[#F0F7F1] border-[#0D631B] text-slate-900 cursor-pointer'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer'
                    }`}
                    title={bloqueado ? 'RAP ya calificado — bloqueado por el modo estricto' : undefined}
                  >
                    {bloqueado ? (
                      <Lock className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                    ) : (
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Manejado en onClick del contenedor
                        className="mt-0.5 rounded text-[#0D631B] focus:ring-[#0D631B] w-4 h-4 cursor-pointer shrink-0"
                      />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`font-mono font-bold text-[11px] ${bloqueado ? 'text-slate-400' : 'text-[#0D631B]'}`}>
                          {rap.codigoRap}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {esCalificado && (
                            <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Calificado
                            </span>
                          )}
                          {!esCalificado && enTope && (
                            <span
                              className="text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300"
                              title="Este RAP ya tiene entre 70% y 100% de sus horas directas programadas en Horarios — no admite más bloques."
                            >
                              {porcentajeProgramado}% programado
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-[11px] font-medium leading-snug mt-0.5 line-clamp-2">
                        {rap.denominacion}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PASO 3: Instructores Habilitados con Recomendación Curricular */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex flex-col gap-1.5">
              <span className="font-bold text-[#111C2D] text-xs">
                3. Selección de Instructor por Idoneidad
              </span>

              {/* Pestañas de Filtro: Recomendados vs Todos */}
              <div className="flex items-center space-x-1.5 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFiltroTipoInstructores('RECOMENDADOS')}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-bold transition-all ${
                    filtroTipoInstructores === 'RECOMENDADOS'
                      ? 'bg-white text-[#0D631B] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ★ Recomendados ({totalRecomendados})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroTipoInstructores('TODOS')}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-bold transition-all ${
                    filtroTipoInstructores === 'TODOS'
                      ? 'bg-white text-[#111C2D] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos los Instructores ({instructores.length})
                </button>
              </div>

              {/* Buscador de instructor */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchInstructor}
                  onChange={(e) => setSearchInstructor(e.target.value)}
                  placeholder="Buscar por nombre o especialidad..."
                  className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0D631B]"
                />
              </div>

              {/* Dejar el espacio programado sin instructor todavía: reserva el
                  RAP/día/franja para cubrirlo después, sin perder el bloque. */}
              {canEditHorarios && (
                <button
                  type="button"
                  onClick={ejecutarAsignacionVacante}
                  disabled={selectedRapCodigos.length === 0}
                  title="Reservar esta franja con el RAP/competencia seleccionado, sin instructor por ahora"
                  className="w-full flex items-center justify-center space-x-1.5 py-2 rounded-xl border border-dashed border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold transition-colors disabled:opacity-50"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Dejar Vacante (programar sin instructor por ahora)</span>
                </button>
              )}
            </div>

            {/* Lista interactiva de instructores evaluados */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {instructoresFiltrados.length > 0 ? (
                instructoresFiltrados.map((ev) => {
                  const inst = ev.instructor;
                  const conflicto = checkInstructorConflicto(inst.id, selectedDia, selectedFranja);
                  const isBloqueado = conflicto.hasConflicto;

                  return (
                    <div
                      key={inst.id}
                      className={`p-3 rounded-xl border transition-all text-xs ${
                        isBloqueado
                          ? 'bg-[#FFF5F5] border-[#FFDAD6] opacity-85'
                          : ev.esRecomendado
                          ? 'bg-[#F9FCFA] border-emerald-200 hover:border-[#0D631B] hover:shadow-xs'
                          : 'bg-[#FFFDF7] border-amber-200/80 hover:border-amber-400'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start space-x-2.5 min-w-0">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 mt-0.5"
                            style={{ backgroundColor: inst.colorAvatar || '#0D631B' }}
                          >
                            {inst.nombres[0]}{inst.apellidos[0]}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-[#111C2D] truncate">
                              {inst.nombreCompleto}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {inst.especialidad || inst.perfilTecnico}
                            </div>

                            {/* Badge de Afinidad Curricular */}
                            <div className="mt-1 flex flex-wrap items-center gap-1">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${ev.colorBadge}`}>
                                {ev.etiquetaBadge}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Botón Asignar con validación preventiva de cruces y perfil */}
                        <div className="shrink-0">
                          {isBloqueado ? (
                            <div className="text-right">
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-black bg-[#BA1A1A] text-white">
                                <Lock className="w-3 h-3" />
                                <span>Ocupado</span>
                              </span>
                            </div>
                          ) : (
                            <button
                              id={`btn-asignar-inst-${inst.id}`}
                              onClick={() => handleIntentarAsignarInstructor(ev)}
                              disabled={!canEditHorarios || selectedRapCodigos.length === 0}
                              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold shadow-xs transition-all disabled:opacity-50 flex items-center space-x-1 ${
                                ev.requiereAdvertencia
                                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                  : 'bg-[#0D631B] hover:bg-[#0a4d15] text-white'
                              }`}
                              title={ev.requiereAdvertencia ? 'Asignar con advertencia de idoneidad' : 'Asignar instructor'}
                            >
                              {ev.requiereAdvertencia && <AlertTriangle className="w-3 h-3 shrink-0" />}
                              <span>Asignar</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Información de Detalle o Advertencia */}
                      {ev.detalleJuicios && (
                        <div className="mt-1.5 pt-1.5 border-t border-emerald-100 text-[10px] text-emerald-800 font-medium">
                          ✓ {ev.detalleJuicios}
                        </div>
                      )}

                      {ev.requiereAdvertencia && (
                        <div className="mt-1.5 pt-1.5 border-t border-amber-200/60 text-[10px] text-amber-900 font-medium flex items-center space-x-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>Perfil distinto: se solicitará confirmación al asignar.</span>
                        </div>
                      )}

                      {isBloqueado ? (
                        <div className="mt-2 pt-2 border-t border-red-200/60 text-[10px] text-red-700 font-medium flex items-center space-x-1.5">
                          <AlertOctagon className="w-3.5 h-3.5 shrink-0 text-red-600" />
                          <span>
                            Asignado en <strong>Ficha {conflicto.fichaNumero}</strong> ({conflicto.ambiente})
                          </span>
                        </div>
                      ) : (
                        <div className="mt-2 pt-1 border-t border-slate-200/60 text-[10px] text-slate-500">
                          Horas semanales: {inst.horasSemanalesAsignadas}h / {inst.maxHorasSemanales}h
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No se encontraron instructores con el filtro seleccionado.
                  <button
                    type="button"
                    onClick={() => {
                      setFiltroTipoInstructores('TODOS');
                      setSearchInstructor('');
                    }}
                    className="block mx-auto mt-1 text-[#0D631B] font-bold hover:underline"
                  >
                    Ver todos los instructores
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        )}
      </div>
      </>
      )}

      {/* Modal de Detalle de Bloque Asignado */}
      {bloqueDetalleModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded-md bg-[#0D631B] text-white font-mono text-[10px] font-black">
                    {bloqueDetalleModal.diaSemana} • {bloqueDetalleModal.franja}
                  </span>
                  {bloqueDetalleModal.esCompetenciaCompleta && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      ★ Competencia Completa
                    </span>
                  )}
                </div>
                <h3 className="font-black text-sm text-[#111C2D] mt-1">
                  Detalle del Bloque de Formación
                </h3>
              </div>
              <button
                onClick={() => setBloqueDetalleModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Competencia</span>
                <div className="font-bold text-[#111C2D]">
                  [{bloqueDetalleModal.competenciaCodigo}] {bloqueDetalleModal.competenciaNombre || bloqueDetalleModal.rapTitulo}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">
                  Resultados de Aprendizaje Asignados ({bloqueDetalleModal.rapsAsignados?.length || 1})
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {bloqueDetalleModal.rapsAsignados && bloqueDetalleModal.rapsAsignados.length > 0 ? (
                    bloqueDetalleModal.rapsAsignados.map((r, i) => (
                      <div key={i} className="p-2 bg-emerald-50/50 border border-emerald-200/60 rounded-lg flex items-start space-x-2">
                        <span className="font-mono font-bold text-[10px] text-[#0D631B] shrink-0 mt-0.5">
                          {r.codigo}
                        </span>
                        <span className="text-slate-700 leading-snug">
                          {r.denominacion}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-2 bg-slate-50 rounded-lg text-slate-700">
                      {bloqueDetalleModal.rapCodigo} - {bloqueDetalleModal.rapTitulo}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Instructor</span>
                  {bloqueDetalleModal.instructorId ? (
                    <div className="font-bold text-[#111C2D] mt-0.5">{bloqueDetalleModal.instructorNombre}</div>
                  ) : (
                    <div className="font-black text-amber-700 mt-0.5 flex items-center space-x-1">
                      <AlertOctagon className="w-3.5 h-3.5" />
                      <span>VACANTE</span>
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Ambiente</span>
                  {/* Siempre el ambiente ACTUAL de la ficha — nunca el que quedó
                      guardado en el bloque, para que jamás se desincronicen. */}
                  <div className="font-bold text-[#111C2D] mt-0.5">{ficha.ambientePrincipal}</div>
                </div>
              </div>

              {/* Cubrir un espacio vacante: elegir instructor sin tener que
                  reconstruir el bloque (RAP/día/franja ya quedan reservados). */}
              {!bloqueDetalleModal.instructorId && canEditHorarios && onAsignarInstructorABloque && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                  <span className="text-[10px] font-bold text-amber-800 uppercase block">
                    Asignar instructor a este espacio vacante
                  </span>
                  <InstructorVacanteSearchSelect
                    instructores={instructores}
                    selectedId={instructorParaVacante}
                    onChange={setInstructorParaVacante}
                  />
                  <button
                    type="button"
                    disabled={!instructorParaVacante}
                    onClick={async () => {
                      const inst = instructores.find(i => i.id === instructorParaVacante);
                      if (!inst) return;
                      const conflicto = checkInstructorConflicto(inst.id, bloqueDetalleModal.diaSemana, bloqueDetalleModal.franja);
                      if (conflicto.hasConflicto) {
                        alert(`¡BLOQUEO DE CRUCE PREVENTIVO!\nEl instructor ${inst.nombreCompleto} ya se encuentra asignado el día ${bloqueDetalleModal.diaSemana} en la franja ${bloqueDetalleModal.franja} en la Ficha ${conflicto.fichaNumero} (${conflicto.ambiente}).`);
                        return;
                      }
                      await avisarSiCompetenciaSobrepasada(bloqueDetalleModal.competenciaCodigo, inst.nombreCompleto);
                      onAsignarInstructorABloque(bloqueDetalleModal.id, inst);
                      mostrarToast(`${inst.nombreCompleto} ahora cubre este espacio`);
                      setInstructorParaVacante('');
                      setBloqueDetalleModal(null);
                    }}
                    className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors disabled:opacity-50"
                  >
                    Asignar Instructor
                  </button>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              {canEditHorarios ? (
                <div className="flex items-center space-x-2">
                  {bloqueDetalleModal.instructorId && onQuitarInstructorDeBloque && (
                    <button
                      onClick={async () => {
                        if (await confirmarDejarVacante(bloqueDetalleModal.instructorNombre)) {
                          onQuitarInstructorDeBloque(bloqueDetalleModal.id);
                          setBloqueDetalleModal(null);
                        }
                      }}
                      className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs transition-colors flex items-center space-x-1"
                      title="El instructor ya no continúa: deja el espacio programado como vacante"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>Dejar Vacante</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onEliminarBloque(bloqueDetalleModal.id);
                      setBloqueDetalleModal(null);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs transition-colors flex items-center space-x-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Liberar Bloque</span>
                  </button>
                </div>
              ) : <div></div>}

              <button
                onClick={() => {
                  setInstructorParaVacante('');
                  setBloqueDetalleModal(null);
                }}
                className="px-4 py-2 rounded-xl bg-[#0D631B] text-white font-bold text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Auditoría de Cruces Preventivos */}
      {showCrucesValidationModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center font-black">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-sm text-[#111C2D]">Auditoría Preventiva de Horarios</h3>
                <p className="text-[11px] text-slate-500">Heurística Anti-Cruces de Ambientes e Instructores</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="p-3 rounded-xl bg-[#F8F9FA] border border-slate-200 flex items-center justify-between">
                <span>Ficha Activa Analizada:</span>
                <span className="font-bold text-[#111C2D]">{ficha.numero_ficha}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F8F9FA] border border-slate-200 flex items-center justify-between">
                <span>Total Bloques Programados:</span>
                <span className="font-bold text-[#0D631B]">{currentFichaBloques.length} ({totalHorasProgramadas} horas)</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F8F9FA] border border-slate-200 flex items-center justify-between">
                <span>Cruces de Horario con otras Fichas:</span>
                <span className="font-bold text-emerald-800">0 Colisiones</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F8F9FA] border border-slate-200 flex items-center justify-between">
                <span>Asignaciones de Competencia Completa:</span>
                <span className="font-bold text-blue-800">
                  {currentFichaBloques.filter(b => b.esCompetenciaCompleta).length} Bloques
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowCrucesValidationModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#0D631B] text-white text-xs font-bold shadow-sm"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Confirmación visual de Mover / Pegar / Asignar bloques */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-xs font-bold text-white transition-all animate-in fade-in slide-in-from-bottom-2 duration-200 ${
            toast.tipo === 'ok' ? 'bg-[#0D631B]' : 'bg-red-600'
          }`}
        >
          {toast.mensaje}
        </div>
      )}
    </div>
  );
};

interface ReportesHorarioPanelProps {
  ficha: Ficha;
  currentFichaBloques: BloqueHorario[];
  onNavigateToReportesInstructores?: () => void;
}

// Sección de Reportes del módulo de Horarios: exporta el horario completo de
// ESTA ficha. El desglose por instructor vive aparte (ver
// ReportesInstructoresView, en el menú lateral) porque un instructor puede
// tener bloques en fichas de programas distintos — no tiene sentido acotarlo
// a la ficha que se esté viendo aquí.
const ReportesHorarioPanel: React.FC<ReportesHorarioPanelProps> = ({ ficha, currentFichaBloques, onNavigateToReportesInstructores }) => {
  const totalHoras = currentFichaBloques.reduce((acc, b) => acc + b.duracionHoras, 0);
  const hayBloques = currentFichaBloques.length > 0;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-black text-[#111C2D] flex items-center space-x-2">
          <FileDown className="w-5 h-5 text-[#0D631B]" />
          <span>Sección de Reportes</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Genera el horario de esta ficha en Excel o PDF, para imprimir o compartir.
        </p>
      </div>

      {!hayBloques && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>Esta ficha todavía no tiene bloques asignados en Horarios — los reportes saldrán vacíos.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Reporte: Horario de la Ficha */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0D631B] flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#111C2D]">Horario de la Ficha</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Grilla semanal completa (día × franja) más el detalle de cada bloque asignado.
            </p>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
            <span>Ficha {ficha.numero_ficha}</span>
            <span className="font-bold text-[#0D631B]">{currentFichaBloques.length} bloques • {totalHoras}h</span>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => exportarHorarioFichaExcel(ficha, currentFichaBloques, DIAS, FRANJAS)}
              className="flex-1 flex items-center justify-center space-x-1.5 bg-[#0D631B] hover:bg-[#0a4d15] text-white px-3 py-2 rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel</span>
            </button>
            <button
              type="button"
              onClick={() => exportarHorarioFichaPDF(ficha, currentFichaBloques, DIAS, FRANJAS)}
              className="flex-1 flex items-center justify-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold shadow-xs transition-all"
            >
              <FileText className="w-4 h-4 text-red-500" />
              <span>PDF</span>
            </button>
          </div>
        </div>

        {/* Enlace al reporte por instructor (ahora vive en el menú lateral,
            porque cubre TODAS las fichas y programas del instructor, no solo esta). */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#111C2D]">Horarios por Instructor</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              El horario completo de cada instructor, en todas sus fichas y programas — no solo en esta. Se mudó a su propia sección para reflejar eso.
            </p>
          </div>
          {onNavigateToReportesInstructores ? (
            <button
              type="button"
              onClick={onNavigateToReportesInstructores}
              className="w-full flex items-center justify-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <Users className="w-4 h-4" />
              <span>Ir a Horarios por Instructor</span>
            </button>
          ) : (
            <div className="text-[11px] text-slate-400 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
              Búscalo como "Horarios por Instructor" en el menú lateral.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface CompetenciaOpcion {
  codigo: string;
  denominacion: string;
  tipo: string;
}

interface CompetenciaSearchSelectProps {
  competencias: CompetenciaOpcion[];
  selectedCodigo: string;
  onChange: (codigo: string) => void;
}

// Selector de competencia con buscador (Ley de Hick/Fitts): con programas de
// 19+ competencias, recorrer un <select> nativo uno por uno es lento — este
// combobox permite escribir el código o un fragmento de la denominación y
// filtrar la lista al instante, igual que el buscador de instructores en
// Seguimiento.
const CompetenciaSearchSelect: React.FC<CompetenciaSearchSelectProps> = ({ competencias, selectedCodigo, onChange }) => {
  const [abierto, setAbierto] = React.useState(false);
  const [busqueda, setBusqueda] = React.useState('');
  const contenedorRef = React.useRef<HTMLDivElement>(null);

  const seleccionada = competencias.find(c => c.codigo === selectedCodigo);

  React.useEffect(() => {
    if (!abierto) return;
    const handleClickFuera = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
        setBusqueda('');
      }
    };
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, [abierto]);

  const filtradas = React.useMemo(() => {
    const txt = busqueda.trim().toLowerCase();
    if (!txt) return competencias;
    return competencias.filter(c =>
      c.codigo.toLowerCase().includes(txt) ||
      c.denominacion.toLowerCase().includes(txt) ||
      c.tipo.toLowerCase().includes(txt)
    );
  }, [competencias, busqueda]);

  return (
    <div className="relative" ref={contenedorRef}>
      <button
        type="button"
        onClick={() => setAbierto(prev => !prev)}
        className="w-full flex items-center justify-between space-x-2 bg-[#F8F9FA] border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-[#111C2D] focus:ring-2 focus:ring-[#0D631B] outline-none transition-all text-left"
      >
        <span className="truncate">
          {seleccionada
            ? `[${seleccionada.codigo}] ${seleccionada.tipo} - ${seleccionada.denominacion.slice(0, 65)}...`
            : 'Selecciona una competencia...'}
        </span>
        <Search className="w-3.5 h-3.5 shrink-0 text-slate-400" />
      </button>

      {abierto && (
        <div className="absolute z-20 mt-1 w-full bg-white rounded-xl border border-slate-200 shadow-lg p-1.5 space-y-1">
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por código, tipo o nombre..."
              className="w-full pl-6 pr-2 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#0D631B]"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtradas.length === 0 ? (
              <div className="px-2 py-2 text-[11px] text-slate-400 text-center">Sin resultados</div>
            ) : (
              filtradas.map(comp => (
                <button
                  key={comp.codigo}
                  type="button"
                  onClick={() => { onChange(comp.codigo); setAbierto(false); setBusqueda(''); }}
                  className={`w-full text-left px-2 py-1.5 text-xs rounded-lg hover:bg-[#E8F5E9] ${
                    comp.codigo === selectedCodigo ? 'bg-[#E8F5E9] font-bold text-[#0D631B]' : 'text-slate-700'
                  }`}
                >
                  <span className="font-mono">[{comp.codigo}]</span> {comp.tipo} - {comp.denominacion}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface InstructorVacanteSearchSelectProps {
  instructores: Instructor[];
  selectedId: string;
  onChange: (instructorId: string) => void;
}

// Buscador de instructor para cubrir un espacio vacante (mismo patrón que el
// buscador de competencias de arriba y el de instructores en Seguimiento):
// con muchos instructores registrados, un <select> nativo obliga a recorrer
// la lista completa — aquí se filtra al instante por nombre o especialidad.
const InstructorVacanteSearchSelect: React.FC<InstructorVacanteSearchSelectProps> = ({ instructores, selectedId, onChange }) => {
  const [abierto, setAbierto] = React.useState(false);
  const [busqueda, setBusqueda] = React.useState('');
  const contenedorRef = React.useRef<HTMLDivElement>(null);

  const seleccionado = instructores.find(i => i.id === selectedId);

  React.useEffect(() => {
    if (!abierto) return;
    const handleClickFuera = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
        setBusqueda('');
      }
    };
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, [abierto]);

  const filtrados = React.useMemo(() => {
    const txt = busqueda.trim().toLowerCase();
    if (!txt) return instructores;
    return instructores.filter(i =>
      i.nombreCompleto.toLowerCase().includes(txt) ||
      (i.especialidad && i.especialidad.toLowerCase().includes(txt)) ||
      (i.perfilTecnico && i.perfilTecnico.toLowerCase().includes(txt))
    );
  }, [instructores, busqueda]);

  return (
    <div className="relative" ref={contenedorRef}>
      <button
        type="button"
        onClick={() => setAbierto(prev => !prev)}
        className="w-full flex items-center justify-between space-x-2 bg-white border border-amber-300 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-amber-500 outline-none transition-all text-left"
      >
        <span className="truncate">
          {seleccionado ? seleccionado.nombreCompleto : '-- Selecciona un instructor --'}
        </span>
        <Search className="w-3.5 h-3.5 shrink-0 text-slate-400" />
      </button>

      {abierto && (
        <div className="absolute z-20 mt-1 w-full bg-white rounded-xl border border-slate-200 shadow-lg p-1.5 space-y-1">
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o especialidad..."
              className="w-full pl-6 pr-2 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtrados.length === 0 ? (
              <div className="px-2 py-2 text-[11px] text-slate-400 text-center">Sin resultados</div>
            ) : (
              filtrados.map(inst => (
                <button
                  key={inst.id}
                  type="button"
                  onClick={() => { onChange(inst.id); setAbierto(false); setBusqueda(''); }}
                  className={`w-full text-left px-2 py-1.5 text-xs rounded-lg hover:bg-amber-50 ${
                    inst.id === selectedId ? 'bg-amber-50 font-bold text-amber-800' : 'text-slate-700'
                  }`}
                >
                  <div className="font-semibold">{inst.nombreCompleto}</div>
                  {(inst.especialidad || inst.perfilTecnico) && (
                    <div className="text-[10px] text-slate-400 truncate">{inst.especialidad || inst.perfilTecnico}</div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
