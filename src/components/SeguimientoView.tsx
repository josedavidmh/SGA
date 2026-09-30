import React from 'react';
import { 
  FileSpreadsheet, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Download, 
  Filter, 
  UserCheck, 
  ArrowUpDown,
  Edit2,
  Calendar,
  Sparkles,
  Info,
  BarChart3,
  ListFilter,
  Users,
  BookOpen,
  Layers,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Search,
  Check,
  XCircle,
  Award,
  BookCheck,
  UserPlus,
  FileText,
  FileDown,
  X
} from 'lucide-react';
import { 
  Ficha, 
  ActividadSeguimiento, 
  EstadoActividad, 
  User, 
  Instructor, 
  Competencia, 
  ResultadoAprendizaje,
  RegistroHorasEjecutadas,
  BloqueHorario,
  ReporteJuiciosFicha,
  RapSeguimiento,
  RegistroArchivoSeguimiento,
  EstadoRap
} from '../types';
import { InstructorSearchSelect } from './InstructorSearchSelect';
import { ListaFichasConBuscador } from './ListaFichasConBuscador';
import {
  exportarResultadosSeguimientoExcel,
  exportarResultadosSeguimientoPDF,
  exportarMatrizActividadesExcel,
  exportarMatrizActividadesPDF,
  FilaMatrizActividad,
  FilaResultadoSeguimiento
} from '../services/reporteResultadosSeguimientoService';
import { useSeguimientoCurricular } from '../hooks/useSeguimientoCurricular';

interface SeguimientoProps {
  currentUser: User;
  ficha: Ficha | null;
  allFichas?: Ficha[];
  actividades: ActividadSeguimiento[];
  instructores: Instructor[];
  competencias?: Competencia[];
  raps?: ResultadoAprendizaje[];
  registrosHorasEjecutadas?: RegistroHorasEjecutadas[];
  horarios?: BloqueHorario[];
  reportesJuicios?: Record<string, ReporteJuiciosFicha>;
  rapsSeguimiento?: RapSeguimiento[];
  /** Planeación pedagógica cargada (fases, actividades de proyecto y de aprendizaje por RAP). */
  registrosArchivoSeguimiento?: RegistroArchivoSeguimiento[];
  onUpdateEstado: (actividadId: string, nuevoEstado: EstadoActividad) => void;
  onUpdateActividad?: (actividad: ActividadSeguimiento) => void;
  onActualizarRapSeguimiento?: (item: RapSeguimiento) => void;
  onSelectFicha?: (ficha: Ficha) => void;
  onNavigateToHorarios?: () => void;
}

export const SeguimientoView: React.FC<SeguimientoProps> = ({
  currentUser,
  ficha,
  allFichas = [],
  actividades,
  instructores,
  competencias = [],
  raps = [],
  registrosHorasEjecutadas = [],
  horarios = [],
  reportesJuicios = {},
  rapsSeguimiento = [],
  registrosArchivoSeguimiento = [],
  onUpdateEstado,
  onActualizarRapSeguimiento,
  onSelectFicha,
  onNavigateToHorarios
}) => {
  // Pestañas internas: Comparativo con RAPs expandibles | Matriz de Actividades GPFI-F-134
  const [subTab, setSubTab] = React.useState<'COMPARATIVO' | 'ACTIVIDADES'>('COMPARATIVO');

  // Filtros de la tabla Comparativa & RAPs
  const [filtroTexto, setFiltroTexto] = React.useState<string>('');
  const [filtroTipoComp, setFiltroTipoComp] = React.useState<string>('TODAS');
  const [filtroSemaforo, setFiltroSemaforo] = React.useState<'TODAS' | 'OK' | 'ALERTA' | 'AVANZADO'>('TODAS');
  const [filtroEstadoRap, setFiltroEstadoRap] = React.useState<string>('TODOS');
  const [expandedComps, setExpandedComps] = React.useState<Record<string, boolean>>({});
  // Historial de instructores anteriores por RAP (reemplazos / fin de
  // contrato) — colapsado por defecto para no saturar la fila.
  const [historialAbierto, setHistorialAbierto] = React.useState<Record<string, boolean>>({});

  // Filtros para Actividades
  const [filtroFase, setFiltroFase] = React.useState<string>('TODAS');

  // Toda la lógica de negocio (comparativo planeado vs. ejecutado, resolución de RAPs,
  // estadísticas) vive en este hook — ver src/hooks/useSeguimientoCurricular.ts.
  const {
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
    getRapsDeCompetencia,
    getRapSeguimientoData,
    handleCambiarInstructorRap,
    handleCambiarEstadoRap,
    statsRaps
  } = useSeguimientoCurricular({
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
  });

  // Feedback visible de guardado (Nielsen #1: visibilidad del estado del sistema).
  // Antes los cambios de instructor/estado se guardaban en silencio (optimista +
  // fire-and-forget); ahora el usuario recibe confirmación inmediata en pantalla.
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

  // Envuelven los handlers del hook para confirmar visualmente cada guardado.
  const manejarCambioInstructor = (compCodigo: string, compDenom: string, rap: ResultadoAprendizaje, instructorId: string) => {
    handleCambiarInstructorRap(compCodigo, compDenom, rap, instructorId);
    mostrarToast(instructorId ? 'Instructor asignado al RAP' : 'Instructor removido del RAP');
  };

  const manejarCambioEstadoRap = (compCodigo: string, compDenom: string, rap: ResultadoAprendizaje, nuevoEstado: EstadoRap) => {
    handleCambiarEstadoRap(compCodigo, compDenom, rap, nuevoEstado);
    mostrarToast('Estado del RAP actualizado');
  };


  // MATRIZ DE ACTIVIDADES: se arma con la PLANEACIÓN PEDAGÓGICA cargada para
  // el programa de la ficha (fase → actividad de proyecto → competencia/RAP →
  // actividad de aprendizaje). El instructor y el estado salen del
  // seguimiento del RAP, así la matriz y el comparativo nunca se contradicen.
  const filasMatriz = React.useMemo(() => {
    if (!ficha) return [];
    const numFase = (f: string) => { const m = (f || '').match(/(\d+)/); return m ? Number(m[1]) : 99; };
    return registrosArchivoSeguimiento
      .filter(r => r.programaCodigo === ficha.programaCodigo)
      .map((r, idx) => {
        const rapLike = { codigoRap: r.rapCodigo, denominacion: r.rapDenominacion, competenciaCodigo: r.competenciaCodigo } as ResultadoAprendizaje;
        const data = getRapSeguimientoData(r.competenciaCodigo, r.competenciaDenominacion, rapLike);
        return { registro: r, rap: rapLike, idx, estado: data.estado as EstadoRap, instructorNombre: data.instructorNombre || '' };
      })
      .sort((a, b) => numFase(a.registro.fase) - numFase(b.registro.fase) || a.idx - b.idx);
  }, [ficha, registrosArchivoSeguimiento, getRapSeguimientoData]);

  // Las fases se toman tal cual de la planeación (p.ej. las 4: Análisis,
  // Planeación, Ejecución y Evaluación), en su orden.
  const fasesPlaneacion = React.useMemo(() => {
    const vistas: string[] = [];
    filasMatriz.forEach(f => { const fase = (f.registro.fase || 'Sin fase').trim(); if (!vistas.includes(fase)) vistas.push(fase); });
    return vistas;
  }, [filasMatriz]);

  const filasMatrizFiltradas = filtroFase === 'TODAS'
    ? filasMatriz
    : filasMatriz.filter(f => (f.registro.fase || 'Sin fase').trim() === filtroFase);

  // Agrupación visual: filas SEGUIDAS con la misma fase + actividad de
  // proyecto se unen en una sola celda, y dentro de ellas, las filas
  // seguidas de la misma competencia también (rowSpan). 0 = la celda la
  // cubre una fila de arriba.
  const spansMatriz = (() => {
    const n = filasMatrizFiltradas.length;
    const proyecto = new Array(n).fill(0);
    const competencia = new Array(n).fill(0);
    const actividad = new Array(n).fill(0);
    const claveProyecto = (i: number) => `${filasMatrizFiltradas[i].registro.fase}||${filasMatrizFiltradas[i].registro.actividadProyecto}`;
    const claveComp = (i: number) => `${claveProyecto(i)}||${filasMatrizFiltradas[i].registro.competenciaCodigo}`;
    for (let i = 0; i < n; ) {
      let j = i + 1;
      while (j < n && claveProyecto(j) === claveProyecto(i)) j++;
      proyecto[i] = j - i;
      i = j;
    }
    for (let i = 0; i < n; ) {
      let j = i + 1;
      while (j < n && claveComp(j) === claveComp(i)) j++;
      competencia[i] = j - i;
      i = j;
    }
    // Actividad de aprendizaje: misma competencia y mismo texto, en filas seguidas.
    const claveAct = (i: number) => `${claveComp(i)}||${(filasMatrizFiltradas[i].registro.actividadAprendizaje || '').trim()}`;
    for (let i = 0; i < n; ) {
      let j = i + 1;
      while (j < n && claveAct(j) === claveAct(i)) j++;
      actividad[i] = j - i;
      i = j;
    }
    return { proyecto, competencia, actividad };
  })();

  // Si la fase elegida ya no existe (cambio de ficha/programa), vuelve a "Todas".
  React.useEffect(() => {
    if (filtroFase !== 'TODAS' && !fasesPlaneacion.includes(filtroFase)) setFiltroFase('TODAS');
  }, [fasesPlaneacion, filtroFase]);

  const SIGUIENTE_ESTADO: Record<string, EstadoRap> = { PENDIENTE: 'EN_EJECUCION', EN_EJECUCION: 'CALIFICADO', CALIFICADO: 'PENDIENTE', SIN_CALIFICAR: 'CALIFICADO' };

  // Prioridad de atención: lo que necesita acción (Alerta) primero, luego OK, luego
  // Avanzada — aplica el efecto Von Restorff llevando lo urgente al inicio de la tabla
  // en lugar de dejarlo mezclado en el orden original.
  const PRIORIDAD_SEMAFORO: Record<string, number> = { ALERTA_PROGRAMAR: 0, OK: 1, AVANZADO: 2 };

  // Filtrar comparativo según selección de usuario
  const comparativoFiltrado = React.useMemo(() => {
    return comparativoLista
      .filter(item => {
        if (filtroTipoComp !== 'TODAS' && item.tipo !== filtroTipoComp) return false;
        if (filtroSemaforo === 'OK' && item.estadoSemaforo !== 'OK') return false;
        // 'ALERTA' ahora filtra solo el estado que de verdad requiere seguir programando
        // (< 70%). AVANZADO (> 80%, ya ejecutada de más) ya no cuenta como alerta.
        if (filtroSemaforo === 'ALERTA' && item.estadoSemaforo !== 'ALERTA_PROGRAMAR') return false;
        if (filtroSemaforo === 'AVANZADO' && item.estadoSemaforo !== 'AVANZADO') return false;

        if (filtroTexto) {
          const txt = filtroTexto.toLowerCase();
          const matchComp = item.competenciaCodigo.toLowerCase().includes(txt) ||
                            item.competenciaDenominacion.toLowerCase().includes(txt);
          const matchInst = item.instructoresNombres.some(i => i.toLowerCase().includes(txt));
          const rapsDeComp = rapsPrograma.filter(r => r.competenciaCodigo === item.competenciaCodigo);
          const matchRap = rapsDeComp.some(r => r.codigoRap.toLowerCase().includes(txt) || r.denominacion.toLowerCase().includes(txt));
          if (!matchComp && !matchInst && !matchRap) return false;
        }

        return true;
      })
      .sort((a, b) => (PRIORIDAD_SEMAFORO[a.estadoSemaforo] ?? 1) - (PRIORIDAD_SEMAFORO[b.estadoSemaforo] ?? 1));
  }, [comparativoLista, filtroTipoComp, filtroSemaforo, filtroTexto, rapsPrograma]);

  // Expandir / Contraer acordeones
  const toggleExpandComp = (cod: string) => {
    setExpandedComps(prev => ({ ...prev, [cod]: !prev[cod] }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    comparativoLista.forEach(c => { all[c.competenciaCodigo] = true; });
    setExpandedComps(all);
  };

  const collapseAll = () => {
    const none: Record<string, boolean> = {};
    comparativoLista.forEach(c => { none[c.competenciaCodigo] = false; });
    setExpandedComps(none);
  };

  const todosExpandidos = comparativoLista.length > 0 && comparativoLista.every(c => expandedComps[c.competenciaCodigo]);

  const ETIQUETA_ESTADO_RAP_UI: Record<string, string> = { PENDIENTE: 'PENDIENTE', EN_EJECUCION: 'EN EJECUCIÓN', CALIFICADO: 'EVALUADO', SIN_CALIFICAR: 'SIN EVALUAR' };

  // Filtros activos en pantalla, en palabras (se muestran en la vista y se
  // imprimen en el encabezado del reporte exportado).
  const ETIQUETA_SEMAFORO_FILTRO: Record<string, string> = { OK: 'OK (70%-80%)', ALERTA: 'Alerta (<70%)', AVANZADO: 'Avanzada (>80%)' };
  const ETIQUETA_ESTADO_FILTRO: Record<string, string> = { PENDIENTE: 'Pendientes', EN_EJECUCION: 'En ejecución', CALIFICADO: 'Evaluados', SIN_CALIFICAR: 'Sin evaluar' };
  const filtrosActivos = React.useMemo(() => {
    const f: { clave: string; texto: string; quitar: () => void }[] = [];
    if (filtroTexto.trim()) f.push({ clave: 'texto', texto: `Búsqueda: "${filtroTexto.trim()}"`, quitar: () => setFiltroTexto('') });
    if (filtroSemaforo !== 'TODAS') f.push({ clave: 'semaforo', texto: `Semáforo: ${ETIQUETA_SEMAFORO_FILTRO[filtroSemaforo] || filtroSemaforo}`, quitar: () => setFiltroSemaforo('TODAS') });
    if (filtroTipoComp !== 'TODAS') f.push({ clave: 'tipo', texto: `Tipo: ${filtroTipoComp}`, quitar: () => setFiltroTipoComp('TODAS') });
    if (filtroEstadoRap !== 'TODOS') f.push({ clave: 'estado', texto: `Estado RAP: ${ETIQUETA_ESTADO_FILTRO[filtroEstadoRap] || filtroEstadoRap}`, quitar: () => setFiltroEstadoRap('TODOS') });
    return f;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroTexto, filtroSemaforo, filtroTipoComp, filtroEstadoRap]);

  const limpiarFiltros = () => {
    setFiltroTexto('');
    setFiltroSemaforo('TODAS');
    setFiltroTipoComp('TODAS');
    setFiltroEstadoRap('TODOS');
  };

  // Filas planas Competencia+RAP para el reporte de "Resultados de Seguimiento"
  // (PDF/Excel). Refleja EXACTAMENTE lo que se ve en pantalla: las competencias
  // que pasan los filtros (búsqueda, semáforo, tipo) y, dentro de cada una, los
  // RAPs del estado filtrado. Sin filtros, sale el reporte completo de la ficha.
  const filasResultadoExport = React.useMemo<FilaResultadoSeguimiento[]>(() => {
    const filas: FilaResultadoSeguimiento[] = [];
    const txt = filtroTexto.trim().toLowerCase();
    comparativoFiltrado.forEach(comp => {
      const compRaps = getRapsDeCompetencia(comp.competenciaCodigo, comp.competenciaDenominacion);
      // Si la búsqueda coincide con la competencia o su instructor, van todos
      // sus RAPs; si solo coincide con algunos RAPs, van solo esos.
      const coincideComp = !txt ||
        comp.competenciaCodigo.toLowerCase().includes(txt) ||
        comp.competenciaDenominacion.toLowerCase().includes(txt) ||
        comp.instructoresNombres.some(i => i.toLowerCase().includes(txt));
      compRaps.forEach(rap => {
        if (!coincideComp && !(rap.codigoRap.toLowerCase().includes(txt) || rap.denominacion.toLowerCase().includes(txt))) return;
        const data = getRapSeguimientoData(comp.competenciaCodigo, comp.competenciaDenominacion, rap);
        if (filtroEstadoRap !== 'TODOS' && data.estado !== filtroEstadoRap) return;
        filas.push({
          competenciaCodigo: comp.competenciaCodigo,
          competenciaDenominacion: comp.competenciaDenominacion,
          competenciaTipo: comp.tipo,
          horasPlaneadasCompetencia: comp.horasTotalesPlaneadas,
          horasEjecutadasCompetencia: comp.horasEjecutadas,
          porcentajeEjecucionCompetencia: comp.porcentajeEjecucion,
          estadoSemaforoCompetencia: comp.estadoSemaforo,
          rapCodigo: rap.codigoRap,
          rapDenominacion: rap.denominacion,
          instructorNombre: data.instructorNombre || '',
          estadoRap: data.estado
        });
      });
    });
    return filas;
  }, [comparativoFiltrado, filtroTexto, filtroEstadoRap, getRapsDeCompetencia, getRapSeguimientoData]);

  // Menú desplegable de exportación de resultados (Hick's Law: un solo punto de
  // entrada "Exportar Resultados" con dos opciones, en vez de sumar más botones
  // sueltos junto al de la plantilla).
  const [menuExportAbierto, setMenuExportAbierto] = React.useState(false);
  const menuExportRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menuExportAbierto) return;
    const handleClickFuera = (e: MouseEvent) => {
      if (menuExportRef.current && !menuExportRef.current.contains(e.target as Node)) {
        setMenuExportAbierto(false);
      }
    };
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, [menuExportAbierto]);

  // La exportación corresponde a la pestaña en la que está el usuario:
  // Comparativo → resultados por competencia/RAP; Matriz → matriz de
  // actividades (con la fase filtrada).
  const filtrosMatriz = filtroFase === 'TODAS' ? [] : [`Fase: ${filtroFase}`];
  const filasMatrizExport: FilaMatrizActividad[] = filasMatrizFiltradas.map(({ registro: r, estado, instructorNombre }) => ({
    fase: r.fase,
    actividadProyecto: r.actividadProyecto,
    competenciaCodigo: r.competenciaCodigo,
    competenciaDenominacion: r.competenciaDenominacion,
    rapCodigo: r.rapCodigo,
    rapDenominacion: r.rapDenominacion,
    actividadAprendizaje: r.actividadAprendizaje,
    horasDirectas: r.horasTrabajoDirecto,
    horasIndependientes: r.horasTrabajoIndependiente,
    instructorNombre,
    estadoRap: estado
  }));

  const manejarExportarResultadosExcel = () => {
    if (!ficha) return;
    if (subTab === 'ACTIVIDADES') {
      exportarMatrizActividadesExcel(ficha, filasMatrizExport, filtrosMatriz);
      setMenuExportAbierto(false);
      mostrarToast(`Matriz de actividades exportada en Excel (${filasMatrizExport.length} actividades)`);
      return;
    }
    exportarResultadosSeguimientoExcel(ficha, filasResultadoExport, filtrosActivos.map(f => f.texto));
    setMenuExportAbierto(false);
    mostrarToast(filtrosActivos.length > 0 ? `Reporte filtrado exportado en Excel (${filasResultadoExport.length} RAPs)` : 'Reporte de resultados exportado en Excel');
  };

  const manejarExportarResultadosPDF = () => {
    if (!ficha) return;
    if (subTab === 'ACTIVIDADES') {
      exportarMatrizActividadesPDF(ficha, filasMatrizExport, filtrosMatriz);
      setMenuExportAbierto(false);
      mostrarToast(`Matriz de actividades exportada en PDF (${filasMatrizExport.length} actividades)`);
      return;
    }
    exportarResultadosSeguimientoPDF(ficha, filasResultadoExport, filtrosActivos.map(f => f.texto));
    setMenuExportAbierto(false);
    mostrarToast(filtrosActivos.length > 0 ? `Reporte filtrado exportado en PDF (${filasResultadoExport.length} RAPs)` : 'Reporte de resultados exportado en PDF');
  };

  if (!ficha) {
    return (
      <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xs text-center max-w-2xl mx-auto mt-8 space-y-5 animate-in fade-in duration-200">
        <div className="w-14 h-14 bg-emerald-50 text-[#0D631B] rounded-2xl flex items-center justify-center mx-auto">
          <FileSpreadsheet className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">No hay ficha seleccionada</h2>
          <p className="text-xs text-slate-500 leading-relaxed mt-1">
            Para consultar el comparativo de horas planeadas vs ejecutadas y el seguimiento detallado de RAPs con sus instructores asignados, selecciona una ficha de formación.
          </p>
        </div>

        {allFichas && allFichas.length > 0 && onSelectFicha && (
          <ListaFichasConBuscador fichas={allFichas} onSelect={onSelectFicha} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Encabezado Principal */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span className="px-2 py-0.5 rounded bg-[#E8F5E9] text-[#2E7D32]">Formación Titulada</span>
            <span>•</span>
            <span>Seguimiento Curricular & Horas</span>
            <span>•</span>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">
              Semáforo Institucional 70% - 80%
            </span>
          </div>
          <h1 className="text-2xl font-black text-[#111C2D] tracking-tight mt-1">
            Seguimiento: Planeado vs Ejecutado & RAPs
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Ficha <strong>{ficha.numero_ficha} — {ficha.programaNombre}</strong> ({ficha.modalidad})
          </p>
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center space-x-3">
          {onNavigateToHorarios && (
            <button
              onClick={onNavigateToHorarios}
              className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all"
            >
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>Programar en Horarios</span>
            </button>
          )}

          <button
            id="btn-export-seguimiento"
            onClick={() => {
              // Plantilla GPFI-F-134: la matriz COMPLETA de la planeación (todas las fases).
              if (filasMatriz.length === 0) {
                mostrarToast('No hay planeación pedagógica cargada para este programa', 'error');
                return;
              }
              exportarMatrizActividadesExcel(ficha, filasMatriz.map(({ registro: r, estado, instructorNombre }) => ({
                fase: r.fase, actividadProyecto: r.actividadProyecto,
                competenciaCodigo: r.competenciaCodigo, competenciaDenominacion: r.competenciaDenominacion,
                rapCodigo: r.rapCodigo, rapDenominacion: r.rapDenominacion,
                actividadAprendizaje: r.actividadAprendizaje,
                horasDirectas: r.horasTrabajoDirecto, horasIndependientes: r.horasTrabajoIndependiente,
                instructorNombre, estadoRap: estado
              })), []);
            }}
            className="flex items-center space-x-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Exportar Plantilla .xlsx</span>
          </button>

          <div className="relative" ref={menuExportRef}>
            <button
              id="btn-export-resultados"
              onClick={() => setMenuExportAbierto(prev => !prev)}
              className="flex items-center space-x-2 bg-[#0D631B] hover:bg-[#0a4d15] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <FileDown className="w-4 h-4" />
              <span>Exportar Resultados</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${menuExportAbierto ? 'rotate-180' : ''}`} />
            </button>

            {menuExportAbierto && (
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-30 animate-in fade-in duration-150">
                <div className="px-3.5 py-2.5 border-b border-slate-100">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    {subTab === 'ACTIVIDADES' ? 'Matriz de Actividades' : 'Resultados de Seguimiento'}
                  </p>
                  {subTab === 'ACTIVIDADES' ? (
                    <p className={`text-[10px] mt-0.5 ${filtrosMatriz.length > 0 ? 'font-bold text-[#0D631B]' : 'text-slate-400'}`}>
                      {filtrosMatriz.length > 0
                        ? `Se exporta lo filtrado: ${filtroFase} (${filasMatrizExport.length} actividades)`
                        : `Todas las fases (${filasMatrizExport.length} actividades)`}
                    </p>
                  ) : filtrosActivos.length > 0 ? (
                    <div className="mt-1.5 space-y-1">
                      <p className="text-[10px] font-bold text-[#0D631B]">Se exporta lo filtrado ({filasResultadoExport.length} RAPs):</p>
                      <div className="flex flex-wrap gap-1">
                        {filtrosActivos.map(f => (
                          <span key={f.clave} className="px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[10px] font-semibold text-[#0D631B]">{f.texto}</span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 mt-0.5">Sin filtros: reporte completo ({filasResultadoExport.length} RAPs)</p>
                  )}
                </div>
                <button
                  onClick={manejarExportarResultadosExcel}
                  className="w-full flex items-center space-x-2.5 px-3.5 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-[#0D631B] transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Formato Excel (.xlsx)</span>
                </button>
                <button
                  onClick={manejarExportarResultadosPDF}
                  className="w-full flex items-center space-x-2.5 px-3.5 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-700 transition-colors border-t border-slate-100"
                >
                  <FileText className="w-4 h-4 text-red-500" />
                  <span>Formato PDF (.pdf)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Switcher de Sub-Pestañas: Comparativo Planeado vs Ejecutado con RAPs | Matriz de Actividades */}
      <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-2xl w-fit flex-wrap gap-y-1">
        <button
          id="tab-comparativo"
          onClick={() => setSubTab('COMPARATIVO')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            subTab === 'COMPARATIVO'
              ? 'bg-white text-[#111C2D] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-[#0D631B]" />
          <span>Comparativo por Competencia & RAPs ({comparativoLista.length})</span>
          {countAlerta > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
              {countAlerta} en alerta
            </span>
          )}
        </button>

        <button
          id="tab-actividades"
          onClick={() => setSubTab('ACTIVIDADES')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            subTab === 'ACTIVIDADES'
              ? 'bg-white text-[#111C2D] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4 text-[#005A8C]" />
          <span>Matriz de Actividades GPFI-F-134 ({filasMatriz.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* VISTA 1: COMPARATIVO PLANEADO VS EJECUTADO CON RAPS EXPANDIBLES (SOLICITUD) */}
      {/* ========================================================================= */}
      {subTab === 'COMPARATIVO' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Bento Cards con Métricas Clave */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Horas Trabajo Directo */}
            <div className="p-4 bg-white rounded-2xl border border-blue-200/80 shadow-xs flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                  Horas Trabajo Directo
                </div>
                <div className="text-2xl font-black text-blue-900 mt-0.5">
                  {totalHorasDirectas} <span className="text-xs font-bold text-slate-500">hrs</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Formación guiada en aula / taller
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
            </div>

            {/* 2. Horas Trabajo Autónomo */}
            <div className="p-4 bg-white rounded-2xl border border-purple-200/80 shadow-xs flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                  Horas Trabajo Autónomo
                </div>
                <div className="text-2xl font-black text-purple-900 mt-0.5">
                  {totalHorasAutonomo} <span className="text-xs font-bold text-slate-500">hrs</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Autoaprendizaje y proyectos LMS
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0">
                <BookOpen className="w-6 h-6" />
              </div>
            </div>

            {/* 3. Horas Ejecutadas */}
            <div className="p-4 bg-white rounded-2xl border border-emerald-200/80 shadow-xs flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold text-[#2E7D32] uppercase tracking-wider">
                  Horas Ejecutadas
                </div>
                <div className="text-2xl font-black text-[#0D631B] mt-0.5">
                  {totalHorasEjecutadas} <span className="text-xs font-bold text-slate-500">hrs</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Reportadas por instructores
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#E8F5E9] text-[#0D631B] border border-[#C8E6C9] flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            {/* 4. Estado de Semáforo Global (70% - 80% OK) */}
            <div className={`p-4 rounded-2xl border shadow-xs flex items-center justify-between ${
              porcentajeGlobal >= 70 && porcentajeGlobal <= 80
                ? 'bg-emerald-50/70 border-emerald-300'
                : 'bg-amber-50/70 border-amber-300'
            }`}>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  Cumplimiento Global
                </div>
                <div className="flex items-baseline space-x-2 mt-0.5">
                  <span className={`text-2xl font-black ${
                    porcentajeGlobal >= 70 && porcentajeGlobal <= 80 ? 'text-[#0D631B]' : 'text-amber-800'
                  }`}>
                    {porcentajeGlobal}%
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    de {totalHorasPlaneadas}h
                  </span>
                </div>
                <div className="text-[11px] font-medium mt-0.5">
                  {porcentajeGlobal >= 70 && porcentajeGlobal <= 80 ? (
                    <span className="text-[#0D631B] font-bold flex items-center space-x-1">
                      <span>✓ Rango Óptimo (70% - 80%)</span>
                    </span>
                  ) : (
                    <span className="text-amber-800 font-bold flex items-center space-x-1">
                      <span>⚠ Tratar de seguirla programando</span>
                    </span>
                  )}
                </div>
              </div>

              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                porcentajeGlobal >= 70 && porcentajeGlobal <= 80
                  ? 'bg-[#E8F5E9] text-[#0D631B] border border-[#C8E6C9]'
                  : 'bg-amber-100 text-amber-700 border border-amber-300'
              }`}>
                {porcentajeGlobal >= 70 && porcentajeGlobal <= 80 ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <AlertTriangle className="w-6 h-6" />
                )}
              </div>
            </div>
          </div>

          {/* Resumen de RAPs — funciona también como leyenda única de colores/estados
              (evitando repetirla dentro de cada competencia expandida) Y como
              filtro rápido: clic en una pastilla muestra solo los RAPs en ese
              estado, en todas las competencias, expandiéndolas automáticamente
              sin tocar el expandir/contraer manual del usuario. */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center flex-wrap gap-2.5">
            <span className="text-xs font-bold text-slate-600">
              Estado RAPs ({statsRaps.total} totales):
            </span>
            <button
              type="button"
              onClick={() => setFiltroEstadoRap(prev => prev === 'PENDIENTE' ? 'TODOS' : 'PENDIENTE')}
              className={`px-2.5 py-1 rounded-lg border font-bold text-xs shadow-2xs transition-all ${
                filtroEstadoRap === 'PENDIENTE'
                  ? 'bg-slate-700 border-slate-700 text-white ring-2 ring-slate-300'
                  : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400'
              }`}
              title="Filtrar: mostrar solo RAPs Pendientes"
            >
              ⚪ {statsRaps.pendientes} Pendientes
            </button>
            <button
              type="button"
              onClick={() => setFiltroEstadoRap(prev => prev === 'EN_EJECUCION' ? 'TODOS' : 'EN_EJECUCION')}
              className={`px-2.5 py-1 rounded-lg border font-bold text-xs shadow-2xs transition-all ${
                filtroEstadoRap === 'EN_EJECUCION'
                  ? 'bg-orange-600 border-orange-600 text-white ring-2 ring-orange-200'
                  : 'bg-orange-100 border-orange-300 text-orange-900 hover:border-orange-500'
              }`}
              title="Filtrar: mostrar solo RAPs En Ejecución"
            >
              🟠 {statsRaps.enEjecucion} En Ejecución
            </button>
            <button
              type="button"
              onClick={() => setFiltroEstadoRap(prev => prev === 'CALIFICADO' ? 'TODOS' : 'CALIFICADO')}
              className={`px-2.5 py-1 rounded-lg border font-bold text-xs shadow-2xs transition-all ${
                filtroEstadoRap === 'CALIFICADO'
                  ? 'bg-emerald-600 border-emerald-600 text-white ring-2 ring-emerald-200'
                  : 'bg-emerald-100 border-emerald-300 text-emerald-900 hover:border-emerald-500'
              }`}
              title="Filtrar: mostrar solo RAPs Evaluados"
            >
              🟢 {statsRaps.calificadas} Evaluados
            </button>
            <button
              type="button"
              onClick={() => setFiltroEstadoRap(prev => prev === 'SIN_CALIFICAR' ? 'TODOS' : 'SIN_CALIFICAR')}
              className={`px-2.5 py-1 rounded-lg border font-bold text-xs shadow-2xs transition-all ${
                filtroEstadoRap === 'SIN_CALIFICAR'
                  ? 'bg-rose-600 border-rose-600 text-white ring-2 ring-rose-200'
                  : 'bg-rose-100 border-rose-300 text-rose-900 hover:border-rose-500'
              }`}
              title="Filtrar: mostrar solo RAPs Sin Evaluar"
            >
              🔴 {statsRaps.sinCalificar} Sin Evaluar
            </button>

            {/* Reiniciar filtro: vuelve a mostrar todo tal como estaba, sin
                filtro de estado aplicado (no toca lo que el usuario haya
                expandido/contraído manualmente). */}
            {filtroEstadoRap !== 'TODOS' && (
              <button
                type="button"
                onClick={() => setFiltroEstadoRap('TODOS')}
                className="ml-auto px-2.5 py-1 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-400 font-bold text-xs transition-colors flex items-center space-x-1"
                title="Quitar el filtro de estado y volver a ver todos los RAPs"
              >
                <X className="w-3 h-3" />
                <span>Reiniciar Filtro</span>
              </button>
            )}
          </div>

          {/* Tabla Comparativa con RAPs Expandibles */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-[#111C2D]">
                  Comparativo Detallado por Competencia & Instructor
                </h2>
              </div>

              {/* Filtros y Botones de Expandir / Contraer */}
              <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                {/* Buscador */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={filtroTexto}
                    onChange={e => setFiltroTexto(e.target.value)}
                    placeholder="Buscar competencia o RAP..."
                    className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-[#0D631B] transition-all w-48"
                  />
                </div>

                {/* Filtro Semáforo */}
                <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
                  <button
                    onClick={() => setFiltroSemaforo('TODAS')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      filtroSemaforo === 'TODAS' ? 'bg-white text-[#111C2D] font-bold shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Todas ({comparativoLista.length})
                  </button>
                  <button
                    onClick={() => setFiltroSemaforo('OK')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      filtroSemaforo === 'OK' ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    OK 70-80% ({countOk})
                  </button>
                  <button
                    onClick={() => setFiltroSemaforo('ALERTA')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      filtroSemaforo === 'ALERTA' ? 'bg-amber-500 text-white font-bold shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Amarillo Alerta ({countAlerta})
                  </button>
                  <button
                    onClick={() => setFiltroSemaforo('AVANZADO')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      filtroSemaforo === 'AVANZADO' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-500'
                    }`}
                    title="Más del 80% ejecutado: avanzada o culminada, no requiere más programación"
                  >
                    Avanzada +80% ({countAvanzado})
                  </button>
                </div>

                {/* Filtro Tipo */}
                <select
                  value={filtroTipoComp}
                  onChange={(e) => setFiltroTipoComp(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none"
                >
                  <option value="TODAS">Todos los tipos</option>
                  <option value="Técnica">Técnicas</option>
                  <option value="Transversal">Transversales</option>
                  <option value="Bilingüismo">Bilingüismo</option>
                </select>

                {/* Un solo botón que alterna según el estado actual (Ley de Hick: menos
                    opciones visibles para la misma acción de expandir/contraer todo). */}
                <button
                  onClick={todosExpandidos ? collapseAll : expandAll}
                  className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                  title={todosExpandidos ? 'Contraer todas las competencias' : 'Expandir todas las competencias'}
                >
                  {todosExpandidos ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  <span>{todosExpandidos ? 'Contraer Todo' : 'Expandir Todo'}</span>
                </button>
              </div>
            </div>

            {/* Lo que se está filtrando ahora (y que saldrá en el reporte exportado) */}
            {filtrosActivos.length > 0 && (
              <div className="px-4 py-2.5 border-b border-slate-100 bg-emerald-50/50 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="font-bold text-[#0D631B]">Mostrando:</span>
                {filtrosActivos.map(f => (
                  <span key={f.clave} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-white border border-emerald-200 text-[#0D631B] font-semibold">
                    {f.texto}
                    <button
                      type="button"
                      onClick={f.quitar}
                      className="w-4 h-4 rounded-full flex items-center justify-center text-emerald-600 hover:bg-emerald-100"
                      title="Quitar este filtro"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <span className="text-slate-500">
                  · {comparativoFiltrado.length} de {comparativoLista.length} competencias · {filasResultadoExport.length} RAPs
                </span>
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="ml-auto text-[11px] font-bold text-slate-500 hover:text-slate-800 underline underline-offset-2"
                >
                  Quitar todos
                </button>
              </div>
            )}

            {/* Tabla Principal */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[850px]">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider bg-slate-50/60">
                    <th className="py-3 px-3">Competencia (NCL & Denominación)</th>
                    <th className="py-3 px-3">Instructor(es) Responsables</th>
                    <th className="py-3 px-3 text-center">Horas Planeadas</th>
                    <th className="py-3 px-3 text-center">H. Ejecutadas</th>
                    <th className="py-3 px-3 text-right">Cumplimiento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {comparativoFiltrado.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No se encontraron competencias con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    comparativoFiltrado.map(item => {
                      const rapsDeComp = getRapsDeCompetencia(item.competenciaCodigo, item.competenciaDenominacion);

                      // Filtro rápido por estado (pastillas de "Estado RAPs" arriba):
                      // solo se listan los RAPs en ese estado; si ninguno de esta
                      // competencia coincide, la competencia entera no se muestra.
                      const rapsFiltrados = filtroEstadoRap === 'TODOS'
                        ? rapsDeComp
                        : rapsDeComp.filter(rap => getRapSeguimientoData(item.competenciaCodigo, item.competenciaDenominacion, rap).estado === filtroEstadoRap);

                      if (filtroEstadoRap !== 'TODOS' && rapsFiltrados.length === 0) return null;

                      // Con un filtro activo, la competencia se expande automáticamente
                      // para mostrar sus RAPs filtrados, sin alterar el expandir/contraer
                      // manual guardado en expandedComps (se restaura tal cual al reiniciar el filtro).
                      const expandidoManual = !!expandedComps[item.competenciaCodigo];
                      const isExpanded = filtroEstadoRap !== 'TODOS' ? true : expandidoManual;
                      const isOk = item.estadoSemaforo === 'OK';
                      const isAvanzado = item.estadoSemaforo === 'AVANZADO';

                      return (
                        <React.Fragment key={item.competenciaCodigo}>
                          {/* Fila Principal de la Competencia */}
                          <tr
                            onClick={() => { if (filtroEstadoRap === 'TODOS') toggleExpandComp(item.competenciaCodigo); }}
                            className={`transition-colors select-none ${filtroEstadoRap === 'TODOS' ? 'cursor-pointer' : ''} ${
                              isExpanded ? 'bg-slate-50/90 font-medium' : 'hover:bg-slate-50/60'
                            }`}
                          >
                            {/* Competencia con Toggle Icon */}
                            <td className="py-3.5 px-3 align-top max-w-sm">
                              <div className="flex items-start space-x-2">
                                <div className="mt-0.5 p-1 rounded-md bg-white border border-slate-200 text-slate-600 shadow-2xs shrink-0">
                                  {isExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5 text-slate-700" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5 text-slate-700" />
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                                    <span className="font-mono font-bold text-xs text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                                      {item.competenciaCodigo}
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                                      item.tipo === 'Técnica' 
                                        ? 'bg-blue-100 text-blue-800' 
                                        : item.tipo === 'Bilingüismo'
                                        ? 'bg-purple-100 text-purple-800'
                                        : 'bg-emerald-100 text-emerald-800'
                                    }`}>
                                      {item.tipo}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      ({rapsDeComp.length} RAPs)
                                    </span>
                                  </div>
                                  <div className="font-semibold text-slate-900 text-xs mt-1 leading-snug">
                                    {item.competenciaDenominacion}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Instructor(es) */}
                            <td className="py-3.5 px-3 align-top whitespace-nowrap">
                              {item.instructoresNombres.length > 0 ? (
                                <div className="space-y-1">
                                  {item.instructoresNombres.map((inst, i) => (
                                    <div key={i} className="flex items-center space-x-1.5 text-xs font-medium text-slate-700">
                                      <div className="w-5 h-5 rounded-full bg-[#0D631B] text-white flex items-center justify-center font-bold text-[9px]">
                                        {inst[0] || 'I'}
                                      </div>
                                      <span className="truncate max-w-[140px]">{inst}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">
                                  Sin reporte de horas
                                </span>
                              )}
                            </td>

                            {/* Horas Planeadas — Directo/Autónomo/Total en una sola celda compacta
                                (antes eran 3 columnas separadas repitiendo el mismo dato agregado). */}
                            <td className="py-3.5 px-3 align-top text-center">
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-md font-black">
                                  {item.horasTotalesPlaneadas}h
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {item.horasTrabajoDirecto}h directo · {item.horasTrabajoAutonomo}h autónomo
                                </span>
                              </div>
                            </td>

                            {/* Horas Ejecutadas */}
                            <td className="py-3.5 px-3 align-top text-center font-black">
                              <span className={`px-2.5 py-1 rounded-md ${
                                isOk
                                  ? 'bg-[#E8F5E9] text-[#0D631B] border border-[#C8E6C9]'
                                  : isAvanzado
                                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                  : 'bg-amber-100 text-amber-900 border border-amber-300'
                              }`}>
                                {item.horasEjecutadas}h
                              </span>
                            </td>

                            {/* Cumplimiento — % + barra + insignia de semáforo + acceso a RAPs, unificados
                                en una sola celda (antes eran dos columnas que repetían el mismo estado). */}
                            <td className="py-3.5 px-3 align-top text-right whitespace-nowrap">
                              <div className="flex flex-col items-end gap-1.5">
                                <div className="flex items-center space-x-2">
                                  <span className={`font-black text-xs ${
                                    isOk ? 'text-[#0D631B]' : isAvanzado ? 'text-blue-700' : 'text-amber-800'
                                  }`}>
                                    {item.porcentajeEjecucion}%
                                  </span>
                                  <div className="w-14 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${
                                        isOk ? 'bg-[#2E7D32]' : isAvanzado ? 'bg-blue-500' : 'bg-amber-500'
                                      }`}
                                      style={{ width: `${Math.min(item.porcentajeEjecucion, 100)}%` }}
                                    />
                                  </div>
                                </div>

                                {isOk ? (
                                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>OK</span>
                                  </span>
                                ) : isAvanzado ? (
                                  <span
                                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-50 text-blue-800 border border-blue-200"
                                    title="Más del 80% de las horas planeadas ya fueron ejecutadas. Competencia avanzada o culminada."
                                  >
                                    <CheckCircle2 className="w-3 h-3 text-blue-600" />
                                    <span>Avanzada</span>
                                  </span>
                                ) : (
                                  <span
                                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300"
                                    title="Menos del 70% de las horas planeadas ejecutadas. Se recomienda continuar programando en horarios."
                                  >
                                    <AlertTriangle className="w-3 h-3 text-amber-700" />
                                    <span>Alerta</span>
                                  </span>
                                )}

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (filtroEstadoRap === 'TODOS') toggleExpandComp(item.competenciaCodigo);
                                  }}
                                  className={`inline-flex items-center space-x-1 text-[11px] font-bold text-[#0D631B] ${filtroEstadoRap === 'TODOS' ? 'hover:text-[#083e11]' : 'cursor-default'}`}
                                >
                                  <span>{isExpanded ? '▲ Ocultar RAPs' : `▼ Ver ${rapsDeComp.length} RAPs`}</span>
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* ================================================================= */}
                          {/* FILA EXPANDIDA: RESULTADOS DE APRENDIZAJE (RAPS) DE LA COMPETENCIA */}
                          {/* ================================================================= */}
                          {isExpanded && (
                            <tr className="bg-slate-50/80 border-t border-b border-slate-200">
                              <td colSpan={5} className="p-3.5 sm:p-5">
                                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3.5">
                                  <div className="border-b border-slate-100 pb-3">
                                    <div className="flex items-center space-x-2">
                                      <Award className="w-4 h-4 text-[#0D631B]" />
                                      <span className="font-black text-slate-900 text-xs">
                                        Resultados de Aprendizaje (RAPs) de la Competencia {item.competenciaCodigo}
                                      </span>
                                      {filtroEstadoRap !== 'TODOS' && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                          Filtrado: {rapsFiltrados.length} de {rapsDeComp.length}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Subtabla de RAPs */}
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead>
                                        <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                                          <th className="py-2 px-2 w-28">Código RAP</th>
                                          <th className="py-2 px-2">Denominación del Resultado de Aprendizaje</th>
                                          <th className="py-2 px-2 text-center w-20">Horas</th>
                                          <th className="py-2 px-2 w-64">Instructor Asignado</th>
                                          <th className="py-2 px-2 text-right w-44">Estado Curricular</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {rapsFiltrados.map((rap, rIdx) => {
                                          const rapData = getRapSeguimientoData(item.competenciaCodigo, item.competenciaDenominacion, rap);

                                          return (
                                            <tr key={rap.codigoRap || rIdx} className="hover:bg-slate-50/70 transition-colors">
                                              {/* Código RAP */}
                                              <td className="py-2.5 px-2 align-top font-mono font-bold text-slate-800">
                                                <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block text-[11px]">
                                                  {rap.codigoRap}
                                                </span>
                                              </td>

                                              {/* Denominación */}
                                              <td className="py-2.5 px-2 align-top">
                                                <div className="font-semibold text-slate-900 text-xs leading-snug">
                                                  {rap.denominacion}
                                                </div>
                                              </td>

                                              {/* Horas */}
                                              <td className="py-2.5 px-2 align-top text-center">
                                                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-bold text-[10px] border border-blue-100">
                                                  {rap.horasTrabajoDirecto ? `${rap.horasTrabajoDirecto}h` : rap.duracionHoras ? `${rap.duracionHoras}h` : `${Math.round(item.horasTrabajoDirecto / rapsDeComp.length)}h`}
                                                </span>
                                              </td>

                                              {/* Instructor Asignado (Editable, con buscador).
                                                  onChange está ligado a ESTE rap/competencia
                                                  específico (closure de item + rap de esta fila) —
                                                  cada selector solo puede afectar su propio registro. */}
                                              <td className="py-2.5 px-2 align-top">
                                                <div className="space-y-1">
                                                  <InstructorSearchSelect
                                                    instructores={instructores}
                                                    selectedId={rapData.instructorId}
                                                    customLabel={
                                                      rapData.instructorNombre && !instructores.some(i => i.id === rapData.instructorId)
                                                        ? `${rapData.instructorNombre} (SofiaPlus Juicios)`
                                                        : undefined
                                                    }
                                                    onChange={(instructorId) => manejarCambioInstructor(item.competenciaCodigo, item.competenciaDenominacion, rap, instructorId)}
                                                  />

                                                  {/* Origen de Asignación */}
                                                  {rapData.fuente && (
                                                    <div className="flex items-center space-x-1 text-[10px]">
                                                      {rapData.fuente === 'HORARIO' && rapData.vacante && (
                                                        <span className="text-amber-700 font-bold">
                                                          ⏳ Programado en Horario — Vacante (falta instructor)
                                                        </span>
                                                      )}
                                                      {rapData.fuente === 'HORARIO' && !rapData.vacante && !rapData.firmeDesde && (
                                                        <span className="text-orange-600 font-medium">
                                                          📅 Asignado desde Horario
                                                        </span>
                                                      )}
                                                      {rapData.fuente === 'HORARIO' && !rapData.vacante && rapData.firmeDesde && (
                                                        <span
                                                          className="text-sky-700 font-medium"
                                                          title="Si el instructor se quita del horario antes de esta fecha, se toma como prueba y no queda en el historial."
                                                        >
                                                          🕓 Provisional — queda en firme el {new Date(rapData.firmeDesde).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                      )}
                                                      {rapData.fuente === 'JUICIOS' && (
                                                        <span className="text-emerald-700 font-medium">
                                                          📋 Sincronizado desde Juicios SofiaPlus
                                                        </span>
                                                      )}
                                                      {rapData.fuente === 'MANUAL' && (
                                                        <span className="text-slate-500 font-medium">
                                                          ✍ Editado Manualmente
                                                        </span>
                                                      )}
                                                    </div>
                                                  )}

                                                  {/* Historial de instructores anteriores en este RAP: nunca se
                                                      borra al reemplazar o vaciar — solo se cierra con fecha. */}
                                                  {rapData.historialInstructores && rapData.historialInstructores.length > 0 && (() => {
                                                    const histKey = `${item.competenciaCodigo}-${rap.codigoRap}`;
                                                    const abierto = !!historialAbierto[histKey];
                                                    return (
                                                      <div className="pt-0.5">
                                                        <button
                                                          type="button"
                                                          onClick={() => setHistorialAbierto(prev => ({ ...prev, [histKey]: !prev[histKey] }))}
                                                          className="text-[10px] text-slate-400 hover:text-slate-600 font-medium underline decoration-dotted"
                                                        >
                                                          🕘 {rapData.historialInstructores!.length} instructor(es) anterior(es) {abierto ? '▲' : '▼'}
                                                        </button>
                                                        {abierto && (
                                                          <ul className="mt-1 space-y-0.5 text-[10px] text-slate-500 border-l-2 border-slate-200 pl-2">
                                                            {rapData.historialInstructores!.map((h, hi) => (
                                                              <li key={hi}>
                                                                <span className="font-semibold text-slate-600">{h.instructorNombre}</span>
                                                                {h.trimestre ? ` — ${h.trimestre}` : ''} — hasta {new Date(h.fechaFin).toLocaleDateString('es-CO')}
                                                                {h.motivo === 'REEMPLAZO' && ' (reemplazado)'}
                                                                {h.motivo === 'VACANTE_HORARIO' && ' (espacio quedó vacante)'}
                                                                {h.motivo === 'FIN_HORARIO' && ' (bloque liberado)'}
                                                                {h.motivo === 'MANUAL' && ' (cambio manual)'}
                                                              </li>
                                                            ))}
                                                          </ul>
                                                        )}
                                                      </div>
                                                    );
                                                  })()}
                                                </div>
                                              </td>

                                              {/* Estado Curricular del RAP (Editable con los 4 colores requeridos) */}
                                              <td className="py-2.5 px-2 align-top text-right">
                                                <select
                                                  value={rapData.estado}
                                                  onChange={e => manejarCambioEstadoRap(item.competenciaCodigo, item.competenciaDenominacion, rap, e.target.value as EstadoRap)}
                                                  className={`text-xs font-black py-1.5 px-2.5 rounded-xl border shadow-xs transition-all cursor-pointer focus:outline-none ${
                                                    rapData.estado === 'CALIFICADO'
                                                      ? 'bg-emerald-100 text-emerald-900 border-emerald-400 hover:bg-emerald-200/80'
                                                      : rapData.estado === 'EN_EJECUCION'
                                                      ? 'bg-orange-100 text-orange-900 border-orange-400 hover:bg-orange-200/80'
                                                      : rapData.estado === 'SIN_CALIFICAR'
                                                      ? 'bg-rose-100 text-rose-900 border-rose-400 hover:bg-rose-200/80'
                                                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                                  }`}
                                                >
                                                  <option value="PENDIENTE">⚪ PENDIENTE</option>
                                                  <option value="EN_EJECUCION">🟠 EN EJECUCIÓN</option>
                                                  <option value="CALIFICADO">🟢 EVALUADO</option>
                                                  <option value="SIN_CALIFICAR">🔴 SIN EVALUAR</option>
                                                </select>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* Desglose de Horas Ejecutadas por Instructor si existen reportes */}
                                  {item.registrosDetalle.length > 0 && (
                                    <div className="pt-2 border-t border-slate-100">
                                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">
                                        Desglose de Horas Ejecutadas Reportadas por Instructor:
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                        {item.registrosDetalle.map((reg, rIdx) => (
                                          <div key={rIdx} className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-start justify-between">
                                            <div>
                                              <div className="font-bold text-slate-900">{reg.instructorNombre}</div>
                                              <div className="text-[11px] text-slate-500">
                                                Periodo: {reg.periodo || 'Trimestre Actual'} {reg.fichaNumero ? `• Ficha ${reg.fichaNumero}` : ''}
                                              </div>
                                            </div>
                                            <span className="font-black text-[#0D631B] text-xs shrink-0 bg-white px-2 py-0.5 rounded border border-emerald-200">
                                              {reg.horasEjecutadas} hrs
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: MATRIZ DE ACTIVIDADES Y JUICIOS EVALUATIVOS (GPFI-F-134)          */}
      {/* ========================================================================= */}
      {subTab === 'ACTIVIDADES' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Matriz Curricular y Actividades (desde la planeación pedagógica) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-black text-[#111C2D]">
                    Matriz Curricular y Ejecución de Horas
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                    {ficha.programaCodigo} - Ficha {ficha.numero_ficha}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Actividades tomadas de la planeación pedagógica. El instructor y el estado son los del RAP en Seguimiento; al cambiar el estado aquí cambia para todo el RAP.
                </p>
              </div>

              {/* Filtro por Fase (las fases de la planeación cargada) */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium flex-wrap">
                <button
                  onClick={() => setFiltroFase('TODAS')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    filtroFase === 'TODAS' ? 'bg-white text-[#111C2D] font-bold shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Todas ({filasMatriz.length})
                </button>
                {fasesPlaneacion.map(fase => (
                  <button
                    key={fase}
                    onClick={() => setFiltroFase(fase)}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      filtroFase === fase ? 'bg-white text-[#111C2D] font-bold shadow-xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {fase} ({filasMatriz.filter(f => (f.registro.fase || 'Sin fase').trim() === fase).length})
                  </button>
                ))}
              </div>
            </div>

            {/* Tabla de Actividades Curriculares */}
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-left text-xs border-collapse min-w-[1200px]">
                <colgroup>
                  <col className="w-[16%]" />
                  <col className="w-[15%]" />
                  <col className="w-[16%]" />
                  <col className="w-[22%]" />
                  <col className="w-[8%]" />
                  <col className="w-[12%]" />
                  <col className="w-[11%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider bg-slate-50/60">
                    <th className="py-3 px-3">Fase & Actividad de Proyecto</th>
                    <th className="py-3 px-3">Competencia</th>
                    <th className="py-3 px-3">Resultado de Aprendizaje</th>
                    <th className="py-3 px-3">Actividad de Aprendizaje</th>
                    <th className="py-3 px-3 text-center">Horas</th>
                    <th className="py-3 px-3">Instructor Responsable</th>
                    <th className="py-3 px-3 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filasMatriz.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        No hay planeación pedagógica cargada para el programa {ficha.programaCodigo}. Cárgala en Ingesta (Archivo de Seguimiento) para ver aquí sus actividades.
                      </td>
                    </tr>
                  ) : filasMatrizFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">No hay actividades en esta fase.</td>
                    </tr>
                  ) : filasMatrizFiltradas.map(({ registro: r, rap, estado, instructorNombre }, idxFila) => (
                    <tr key={r.id} className="hover:bg-[#F8F9FA] transition-colors">
                      {spansMatriz.proyecto[idxFila] > 0 && (
                        <td rowSpan={spansMatriz.proyecto[idxFila]} className="py-3.5 px-3 align-top break-words bg-slate-50/50 border-r border-slate-100">
                          <div className="font-bold text-[10px] text-[#6F43C0] uppercase flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#6F43C0] shrink-0"></span>
                            <span>{r.fase}</span>
                          </div>
                          <div className="text-[11px] font-semibold text-slate-700 mt-1 leading-snug">{r.actividadProyecto || '—'}</div>
                        </td>
                      )}

                      {spansMatriz.competencia[idxFila] > 0 && (
                        <td rowSpan={spansMatriz.competencia[idxFila]} className="py-3.5 px-3 align-top break-words border-r border-slate-100">
                          <div className="font-bold text-[#111C2D]">{r.competenciaCodigo}</div>
                          <div className="text-[11px] text-slate-500 leading-snug">{r.competenciaDenominacion}</div>
                          {spansMatriz.competencia[idxFila] > 1 && (
                            <div className="mt-1 text-[10px] font-semibold text-slate-400">{spansMatriz.competencia[idxFila]} resultados</div>
                          )}
                        </td>
                      )}

                      <td className="py-3.5 px-3 align-top break-words">
                        <span className="px-1.5 py-0.5 rounded font-black text-[10px] bg-slate-100 text-slate-700">{r.rapCodigo}</span>
                        <div className="text-[11px] text-slate-600 leading-snug mt-1">{r.rapDenominacion}</div>
                      </td>

                      {spansMatriz.actividad[idxFila] > 0 && (
                        <td rowSpan={spansMatriz.actividad[idxFila]} className="py-3.5 px-3 align-top break-words border-r border-slate-100">
                          <div className="text-xs text-[#111C2D] leading-snug">{r.actividadAprendizaje || '—'}</div>
                          {spansMatriz.actividad[idxFila] > 1 && (
                            <div className="mt-1 text-[10px] font-semibold text-slate-400">Aplica a {spansMatriz.actividad[idxFila]} resultados</div>
                          )}
                        </td>
                      )}

                      <td className="py-3.5 px-3 align-top text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-bold text-[11px] whitespace-nowrap">
                            {r.horasTrabajoDirecto}h directo
                          </span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium text-[10px] whitespace-nowrap">
                            {r.horasTrabajoIndependiente}h indep.
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 align-top break-words">
                        {instructorNombre ? (
                          <div className="flex items-start gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#0D631B] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                              {instructorNombre.trim()[0] || 'I'}
                            </div>
                            <div className="font-bold text-[#111C2D] text-[11px] leading-snug">{instructorNombre}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Sin asignar</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 align-top text-right">
                        <button
                          type="button"
                          onClick={() => manejarCambioEstadoRap(r.competenciaCodigo, r.competenciaDenominacion, rap, SIGUIENTE_ESTADO[estado] || 'EN_EJECUCION')}
                          className={`px-2.5 py-1.5 rounded-full text-[11px] font-bold transition-all inline-flex items-center gap-1 shadow-xs whitespace-nowrap ${
                            estado === 'CALIFICADO'
                              ? 'bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] hover:bg-[#d4f2d6]'
                              : estado === 'EN_EJECUCION'
                              ? 'bg-[#E1F5FE] text-[#005A8C] border border-[#B3E5FC] hover:bg-[#cbeeff]'
                              : estado === 'SIN_CALIFICAR'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                              : 'bg-[#FFF8E1] text-[#C67C00] border border-[#FFE082] hover:bg-[#fff2c8]'
                          }`}
                          title="Clic para cambiar: PENDIENTE → EN EJECUCIÓN → EVALUADO (aplica a todo el RAP)"
                        >
                          <span>{ETIQUETA_ESTADO_RAP_UI[estado] || estado}</span>
                          <ArrowUpDown className="w-3 h-3 opacity-60" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación visual de guardado (visibilidad del estado del sistema) */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 flex items-center space-x-2 px-4 py-3 rounded-xl shadow-lg text-xs font-bold text-white animate-in fade-in slide-in-from-bottom-2 duration-200 ${
            toast.tipo === 'ok' ? 'bg-[#0D631B]' : 'bg-rose-600'
          }`}
        >
          {toast.tipo === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{toast.mensaje}</span>
        </div>
      )}
    </div>
  );
};
