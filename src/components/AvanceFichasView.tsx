import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Search,
  Download,
  ArrowRight,
  GraduationCap,
  Filter,
  CheckCircle2,
  FileSpreadsheet,
  Calendar,
  Trash2,
  Award,
  UploadCloud,
  FileCheck,
  Pencil,
  BarChart3
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList
} from 'recharts';
import { Ficha, User, RegionalCentro, BloqueHorario, ActividadSeguimiento, ReporteJuiciosFicha, RapSeguimiento, ResultadoAprendizaje, TrimestreCalendario } from '../types';
import { procesarJuiciosEvaluativosExcel, obtenerReporteDemoJuicios } from '../services/juiciosEvaluativosService';
import { generarFormatoAsociacionFichas, generarFormatoEventos } from '../services/reportesOficialesService';
import { aplicarCalendarioABloques, normalizarNombreTrimestre, buscarTrimestreCalendario } from '../lib/calendarioTrimestres';
import { obtenerTrimestresDisponibles } from '../services/ambientesReporteService';
import { ModalJuiciosEvaluativos } from './ModalJuiciosEvaluativos';
import { totalMatriculados } from '../lib/aprendices';

interface AvanceFichasViewProps {
  currentUser: User;
  fichas: Ficha[];
  selectedFicha: Ficha | null;
  onSelectFicha: (ficha: Ficha) => void;
  onNavigateTab: (tab: string) => void;
  centro: RegionalCentro;
  horarios?: BloqueHorario[];
  actividades?: ActividadSeguimiento[];
  reportesJuicios?: Record<string, ReporteJuiciosFicha>;
  rapsSeguimiento?: RapSeguimiento[];
  raps?: ResultadoAprendizaje[];
  trimestresCalendario?: TrimestreCalendario[];
  onGuardarJuiciosEvaluativos?: (reporte: ReporteJuiciosFicha, fichaObjetivo?: Ficha) => { exito: boolean; mensaje: string } | void;
  onEliminarFicha?: (fichaId: string) => void;
  onOpenCrearFicha?: () => void;
  onEditarFicha?: (ficha: Ficha) => void;
}

export const AvanceFichasView: React.FC<AvanceFichasViewProps> = ({
  currentUser,
  fichas,
  selectedFicha,
  onSelectFicha,
  onNavigateTab,
  centro,
  horarios = [],
  actividades = [],
  reportesJuicios = {},
  rapsSeguimiento = [],
  raps = [],
  trimestresCalendario = [],
  onGuardarJuiciosEvaluativos,
  onEliminarFicha,
  onOpenCrearFicha,
  onEditarFicha
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'TODAS' | 'MIS_FICHAS'>('TODAS');
  const [filtroNivel, setFiltroNivel] = useState<string>('TODOS');
  const [fichaModalDetalle, setFichaModalDetalle] = useState<Ficha | null>(null);
  const [reporteJuiciosModal, setReporteJuiciosModal] = useState<ReporteJuiciosFicha | null>(null);
  const [isUploadingJuicios, setIsUploadingJuicios] = useState(false);
  const fileInputJuiciosRef = React.useRef<HTMLInputElement>(null);
  const [trimestreReporteEventos, setTrimestreReporteEventos] = useState<string>('');
  const [trimestreAsociacion, setTrimestreAsociacion] = useState<string>('');

  const handleUploadJuicios = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingJuicios(true);
    try {
      const res = await procesarJuiciosEvaluativosExcel(file, file.name);
      if (res.exito && res.reporte) {
        const resultado = onGuardarJuiciosEvaluativos ? onGuardarJuiciosEvaluativos(res.reporte, fichaModalDetalle || undefined) : undefined;
        if (resultado && resultado.exito === false) {
          alert(resultado.mensaje);
        } else {
          setReporteJuiciosModal(res.reporte);
        }
      } else {
        alert(res.mensaje || 'Error al procesar el archivo de juicios.');
      }
    } catch (err: any) {
      alert(`Error al leer archivo: ${err?.message}`);
    } finally {
      setIsUploadingJuicios(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleCargarDemoJuicios = async () => {
    setIsUploadingJuicios(true);
    try {
      const rep = await obtenerReporteDemoJuicios('3235106');
      const resultado = onGuardarJuiciosEvaluativos ? onGuardarJuiciosEvaluativos(rep, fichaModalDetalle || undefined) : undefined;
      if (resultado && resultado.exito === false) {
        alert(resultado.mensaje);
      } else {
        setReporteJuiciosModal(rep);
      }
    } catch (err: any) {
      alert(`Error: ${err?.message}`);
    } finally {
      setIsUploadingJuicios(false);
    }
  };

  // Fichas del usuario si es instructor líder
  const misFichas = useMemo(() => {
    return fichas.filter(f => 
      f.instructorLiderId === currentUser.id || 
      f.id === currentUser.fichaAsignadaId || 
      f.instructorLiderEmail === currentUser.correo
    );
  }, [fichas, currentUser]);

  // Filtrado dinámico
  const fichasFiltradas = useMemo(() => {
    return fichas.filter(f => {
      // Filtro pestaña: Todas vs Mis Fichas
      if (filtroTipo === 'MIS_FICHAS') {
        const esMia = f.instructorLiderId === currentUser.id || 
                      f.id === currentUser.fichaAsignadaId || 
                      f.instructorLiderEmail === currentUser.correo;
        if (!esMia) return false;
      }

      // Filtro nivel
      if (filtroNivel !== 'TODOS' && f.nivelFormacion !== filtroNivel) {
        return false;
      }

      // Filtro búsqueda
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const coincideFicha = f.numero_ficha.toLowerCase().includes(term);
        const coincidePrograma = f.programaNombre.toLowerCase().includes(term);
        const coincideLider = (f.instructorLiderNombre || '').toLowerCase().includes(term);
        const coincideModalidad = (f.modalidad || '').toLowerCase().includes(term);
        return coincideFicha || coincidePrograma || coincideLider || coincideModalidad;
      }

      return true;
    });
  }, [fichas, filtroTipo, filtroNivel, searchTerm, currentUser]);

  // Totales por Programa de Formación: agrupa las fichas filtradas por
  // programaCodigo y suma matrícula/activos/deserciones — así el índice de
  // deserción/retención que se ve es el del PROGRAMA completo (todas sus
  // cohortes/fichas acumuladas), no solo el de una ficha suelta. Como cada
  // ficha nueva del programa se suma al total, el índice del programa se
  // actualiza progresivamente a medida que se registran o cierran cohortes.
  interface GrupoPrograma {
    programaCodigo: string;
    programaNombre: string;
    fichas: Ficha[];
    totalMatricula: number;
    totalActivos: number;
    totalCancelados: number;
    totalRetiros: number;
    totalDeserciones: number;
    tasaRetencion: number;
    tasaDesercion: number;
  }

  const gruposPorPrograma = useMemo<GrupoPrograma[]>(() => {
    const mapa = new Map<string, GrupoPrograma>();
    fichasFiltradas.forEach(f => {
      const key = f.programaCodigo || f.programaNombre;
      if (!mapa.has(key)) {
        mapa.set(key, {
          programaCodigo: f.programaCodigo,
          programaNombre: f.programaNombre,
          fichas: [],
          totalMatricula: 0,
          totalActivos: 0,
          totalCancelados: 0,
          totalRetiros: 0,
          totalDeserciones: 0,
          tasaRetencion: 0,
          tasaDesercion: 0
        });
      }
      const g = mapa.get(key)!;
      g.fichas.push(f);
      g.totalMatricula += totalMatriculados(f);
      g.totalActivos += f.aprendicesActivos || 0;
      g.totalCancelados += f.aprendicesCancelados || 0;
      g.totalRetiros += f.aprendicesRetiroVoluntario || 0;
    });

    const grupos = Array.from(mapa.values()).map(g => {
      g.totalDeserciones = g.totalCancelados + g.totalRetiros;
      g.tasaRetencion = g.totalMatricula > 0 ? Math.round((g.totalActivos / g.totalMatricula) * 1000) / 10 : 0;
      g.tasaDesercion = g.totalMatricula > 0 ? Math.round((g.totalDeserciones / g.totalMatricula) * 1000) / 10 : 0;
      // Fichas ordenadas cronológicamente por periodo lectivo, para que el
      // total se lea como algo que se acumula cohorte a cohorte.
      g.fichas = [...g.fichas].sort((a, b) => (a.periodoLectivo || '').localeCompare(b.periodoLectivo || ''));
      return g;
    });

    return grupos.sort((a, b) => a.programaNombre.localeCompare(b.programaNombre));
  }, [fichasFiltradas]);

  // Reporte Gráfico: retención y deserción agregadas por AÑO y por TRIMESTRE
  // (periodoLectivo de cada ficha, mismo formato "AAAA-ROMANO" de Horarios).
  // Cada ficha aporta su matrícula/activos/deserciones al periodo en el que
  // quedó registrada, y la tasa de cada barra es el agregado ponderado por
  // matrícula de todas las fichas de ese periodo — la misma metodología que
  // ya se usa arriba para los Totales por Programa.
  interface PuntoTendencia {
    clave: string;
    matricula: number;
    activos: number;
    deserciones: number;
    tasaRetencion: number;
    tasaDesercion: number;
  }

  const agregarPorClave = (obtenerClave: (f: Ficha) => string): PuntoTendencia[] => {
    const mapa = new Map<string, { matricula: number; activos: number; cancelados: number; retiros: number }>();
    fichasFiltradas.forEach(f => {
      const key = obtenerClave(f) || 'Sin dato';
      if (!mapa.has(key)) mapa.set(key, { matricula: 0, activos: 0, cancelados: 0, retiros: 0 });
      const g = mapa.get(key)!;
      g.matricula += totalMatriculados(f);
      g.activos += f.aprendicesActivos || 0;
      g.cancelados += f.aprendicesCancelados || 0;
      g.retiros += f.aprendicesRetiroVoluntario || 0;
    });
    return Array.from(mapa.entries())
      .map(([clave, g]) => {
        const deserciones = g.cancelados + g.retiros;
        return {
          clave,
          matricula: g.matricula,
          activos: g.activos,
          deserciones,
          tasaRetencion: g.matricula > 0 ? Math.round((g.activos / g.matricula) * 1000) / 10 : 0,
          tasaDesercion: g.matricula > 0 ? Math.round((deserciones / g.matricula) * 1000) / 10 : 0
        };
      })
      .sort((a, b) => a.clave.localeCompare(b.clave));
  };

  const tendenciaPorTrimestre = useMemo(
    () => agregarPorClave(f => normalizarNombreTrimestre(f.periodoLectivo)),
    [fichasFiltradas]
  );

  const tendenciaPorAnio = useMemo(
    () => agregarPorClave(f => normalizarNombreTrimestre(f.periodoLectivo).split('-')[0]),
    [fichasFiltradas]
  );

  // Trimestres con al menos un bloque de horario para la ficha que se está
  // viendo — son los únicos que realmente tienen datos para exportar en el
  // Reporte de Eventos. Si el calendario institucional (Parametrizaciones)
  // tiene ese mismo nombre de trimestre parametrizado, se usa para mostrar
  // su rango oficial de fechas junto al nombre.
  const trimestresDisponiblesParaFicha = (fichaRef: Ficha | null): string[] => {
    if (!fichaRef) return [];
    return obtenerTrimestresDisponibles(horarios.filter(h => h.fichaId === fichaRef.id));
  };

  // Mismo formato que la Matriz de Horarios ("AAAA-ROMANO", ej. "2026-III").
  const etiquetaTrimestre = (nombre: string): string => {
    const cal = trimestresCalendario.find(t => t.nombre === nombre);
    return cal ? `${nombre} (${cal.fechaInicio} a ${cal.fechaFin})` : nombre;
  };

  const handleDescargarAsociacionFichas = (targetFicha: Ficha | null, trimestre: string = '') => {
    const fichaToExport = targetFicha || selectedFicha;
    if (!fichaToExport) {
      alert('Selecciona una ficha para exportar el Formato de Asociación de Fichas.');
      return;
    }

    if (trimestre) {
      const bloquesTrimestre = horarios.filter(h => h.fichaId === fichaToExport.id && h.trimestre === trimestre);
      if (bloquesTrimestre.length === 0) {
        alert(`No hay bloques de horario programados para la ficha ${fichaToExport.numero_ficha} en el trimestre ${trimestre}.`);
        return;
      }
      generarFormatoAsociacionFichas(fichaToExport, [], { trimestre, bloquesTrimestre });
      return;
    }

    const seguimientoFicha = rapsSeguimiento.filter(
      s => s.fichaId === fichaToExport.id || s.fichaNumero === fichaToExport.numero_ficha
    );
    if (seguimientoFicha.filter(s => s.instructorNombre).length === 0) {
      alert('Esta ficha todavía no tiene instructores asignados por competencia en Seguimiento — no hay nada que exportar.');
      return;
    }
    generarFormatoAsociacionFichas(fichaToExport, seguimientoFicha);
  };

  const handleDescargarReporteEventos = (targetFicha: Ficha | null, trimestre: string) => {
    const fichaToExport = targetFicha || selectedFicha;
    if (!fichaToExport) {
      alert('Selecciona una ficha para exportar el Reporte de Eventos.');
      return;
    }
    if (!trimestre) {
      alert('Elige el trimestre que quieres exportar.');
      return;
    }
    const bloquesTrimestre = horarios.filter(h => h.fichaId === fichaToExport.id && h.trimestre === trimestre);
    if (bloquesTrimestre.length === 0) {
      alert(`No hay bloques de horario programados para la ficha ${fichaToExport.numero_ficha} en el trimestre ${trimestre}.`);
      return;
    }
    const catalogoRapsPrograma = raps.filter(r => r.programaCodigo === fichaToExport.programaCodigo);
    generarFormatoEventos(fichaToExport, centro, aplicarCalendarioABloques(bloquesTrimestre, trimestresCalendario), catalogoRapsPrograma, etiquetaTrimestre(trimestre)).then(resultado => {
      if (resultado.festivosTotalesExcluidos > 0) {
        alert(`Reporte generado. Se excluyeron ${resultado.festivosTotalesExcluidos} ocurrencia(s) por caer en día festivo colombiano — no se contaron como horas ejecutadas.`);
      }
    });
  };

  // Aprendices reales de la ficha según el último cargue de Juicios Evaluativos:
  // activos (en formación + condicionados) e inactivos (cancelados, retiro
  // voluntario, aplazados, trasladados...). Sin cargue, se usa la matrícula inicial.
  const totalRealFicha = (f: Ficha) => totalMatriculados(f);
  const inactivosFicha = (f: Ficha) =>
    f.totalAprendicesActual != null
      ? Math.max(0, f.totalAprendicesActual - (f.aprendicesActivos || 0))
      : (f.aprendicesCancelados || 0) + (f.aprendicesRetiroVoluntario || 0) + (f.aprendicesAplazados || 0) + (f.aprendicesTrasladados || 0);
  const detalleInactivos = (f: Ficha) =>
    `Cancelados: ${f.aprendicesCancelados || 0} · Retiro voluntario: ${f.aprendicesRetiroVoluntario || 0} · Aplazados: ${f.aprendicesAplazados || 0} · Trasladados: ${f.aprendicesTrasladados || 0}`;

  const handleVerFicha = (f: Ficha) => {
    onSelectFicha(f);
    setFichaModalDetalle(f);
  };

  const renderGraficoTendencia = (data: PuntoTendencia[]) => {
    if (data.length === 0) {
      return (
        <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/60 rounded-xl border border-slate-100">
          No hay datos suficientes para graficar.
        </div>
      );
    }
    return (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 24, right: 8, left: 0, bottom: 4 }} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis
            dataKey="clave"
            tick={{ fontSize: 11, fontWeight: 700, fill: '#64748B' }}
            axisLine={{ stroke: '#E2E8F0' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fontSize: 11, fill: '#94A3B8' }}
            axisLine={false}
            tickLine={false}
            width={38}
          />
          <Tooltip
            labelFormatter={(label: any) => {
              // Si es un trimestre parametrizado, se muestra su rango oficial de fechas.
              const cal = buscarTrimestreCalendario(trimestresCalendario, String(label));
              return cal ? `${label} (${cal.fechaInicio} a ${cal.fechaFin})` : label;
            }}
            formatter={(value: any, name: any) => [`${value}%`, name]}
            contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12, fontWeight: 600 }}
            cursor={{ fill: '#F8FAFC' }}
          />
          <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} iconType="circle" />
          <Bar dataKey="tasaRetencion" name="Tasa de Retención" fill="#0D631B" radius={[4, 4, 0, 0]} maxBarSize={40}>
            <LabelList dataKey="tasaRetencion" position="top" formatter={(v: any) => `${v}%`} style={{ fontSize: 10, fontWeight: 700, fill: '#0D631B' }} />
          </Bar>
          <Bar dataKey="tasaDesercion" name="Tasa de Deserción" fill="#E74C3C" radius={[4, 4, 0, 0]} maxBarSize={40}>
            <LabelList dataKey="tasaDesercion" position="top" formatter={(v: any) => `${v}%`} style={{ fontSize: 10, fontWeight: 700, fill: '#E74C3C' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Encabezado Superior */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-[#0D631B] uppercase tracking-wider flex items-center space-x-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Módulo de Avance y Monitoreo de Fichas</span>
          </div>
          <h1 className="text-2xl font-black text-[#111C2D] tracking-tight">
            Indicadores por Programa de Formación
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Desglose de matrícula inicial, aprendices activos, tasa de retención y deserción por cohorte.
          </p>
        </div>

        {/* Acciones del Encabezado */}
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="file"
            ref={fileInputJuiciosRef}
            onChange={handleUploadJuicios}
            accept=".xls,.xlsx,.csv"
            className="hidden"
          />

          <button
            onClick={() => fileInputJuiciosRef.current?.click()}
            disabled={isUploadingJuicios}
            className="flex items-center space-x-2 bg-purple-50 hover:bg-purple-100 text-[#6F43C0] border border-purple-200 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
            title="Cargar reporte oficial de Juicios Evaluativos por Ficha (.xls / SofiaPlus)"
          >
            <UploadCloud className="w-4 h-4 text-[#6F43C0]" />
            <span>{isUploadingJuicios ? 'Procesando...' : 'Cargar Juicios Evaluativos (.xls)'}</span>
          </button>



          <div className="flex items-center space-x-1.5 bg-white border border-slate-200 rounded-xl px-1.5 py-1 shadow-xs">
            <select
              value={trimestreAsociacion}
              onChange={e => setTrimestreAsociacion(e.target.value)}
              className="text-xs font-bold text-slate-600 bg-transparent px-1.5 py-1 focus:outline-hidden max-w-32"
              title="Alcance del Formato de Asociación de Fichas"
            >
              <option value="">Total</option>
              {trimestresDisponiblesParaFicha(selectedFicha).map(t => (
                <option key={t} value={t}>{etiquetaTrimestre(t)}</option>
              ))}
            </select>
            <button
              onClick={() => handleDescargarAsociacionFichas(selectedFicha, trimestreAsociacion)}
              className="flex items-center space-x-2 bg-white hover:bg-slate-50 px-2.5 py-1.5 rounded-lg text-xs font-bold text-[#111C2D] transition-colors"
              title="Descargar el Formato oficial de Asociación de Fichas (F001-008-25 / V01) — Total o por trimestre"
            >
              <Download className="w-4 h-4 text-[#005A8C]" />
              <span>Asociación de Fichas</span>
            </button>
          </div>

          <div className="flex items-center space-x-1.5 bg-white border border-slate-200 rounded-xl px-1.5 py-1 shadow-xs">
            <select
              value={trimestreReporteEventos}
              onChange={e => setTrimestreReporteEventos(e.target.value)}
              className="text-xs font-bold text-slate-600 bg-transparent px-1.5 py-1 focus:outline-hidden max-w-40"
              title="Trimestre a exportar en el Reporte de Eventos"
            >
              <option value="">Trimestre...</option>
              {trimestresDisponiblesParaFicha(selectedFicha).map(t => (
                <option key={t} value={t}>{etiquetaTrimestre(t)}</option>
              ))}
            </select>
            <button
              onClick={() => handleDescargarReporteEventos(selectedFicha, trimestreReporteEventos)}
              className="flex items-center space-x-2 bg-white hover:bg-slate-50 px-2.5 py-1.5 rounded-lg text-xs font-bold text-[#111C2D] transition-colors"
              title="Descargar el Formato oficial de Reporte de Eventos (F001-008-25 / V02)"
            >
              <Download className="w-4 h-4 text-[#005A8C]" />
              <span>Reporte de Eventos</span>
            </button>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Selector de Pestaña: Todas vs Mis Fichas */}
        <div className="flex items-center space-x-1.5 p-1 bg-slate-100 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setFiltroTipo('TODAS')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              filtroTipo === 'TODAS'
                ? 'bg-white text-[#0D631B] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todas las Fichas ({fichas.length})
          </button>
          
          {currentUser.rol === 'INSTRUCTOR_LIDER' && (
            <button
              onClick={() => setFiltroTipo('MIS_FICHAS')}
              className={`flex-1 md:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                filtroTipo === 'MIS_FICHAS'
                  ? 'bg-white text-[#0D631B] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mis Fichas Asignadas ({misFichas.length})
            </button>
          )}
        </div>

        {/* Buscador y Filtro por Nivel */}
        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full md:w-auto">
          {/* Campo de Búsqueda */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por programa o ficha..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D631B]/20 focus:border-[#0D631B]"
            />
          </div>

          {/* Filtro por Nivel de Formación */}
          <div className="w-full sm:w-auto flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={filtroNivel}
              onChange={(e) => setFiltroNivel(e.target.value)}
              className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 py-2 px-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D631B]/20 focus:border-[#0D631B]"
            >
              <option value="TODOS">Todos los Niveles</option>
              <option value="Tecnólogo">Tecnólogo</option>
              <option value="Técnico">Técnico</option>
              <option value="Auxiliar">Auxiliar</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla Principal: Indicadores por Programa de Formación (Fiel a la captura del usuario) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base font-bold text-[#111C2D]">
              Indicadores por Programa de Formación
            </h2>
            <p className="text-xs text-slate-500">
              Desglose de matrícula inicial, aprendices activos, tasa de retención y deserción por cohorte.
            </p>
          </div>
          <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl self-start sm:self-auto">
            Programas: {gruposPorPrograma.length} · Fichas: {fichasFiltradas.length}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[720px]">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="pb-3 pr-4">PROGRAMA / FICHA</th>
                <th className="pb-3 px-3">NIVEL / MODALIDAD</th>
                <th className="pb-3 px-3 text-center">MATRÍCULA</th>
                <th className="pb-3 px-3 text-center">ACTIVOS</th>
                <th className="pb-3 px-3 text-center">INACTIVOS</th>
                <th className="pb-3 px-3 text-center">DESERCIONES</th>
                <th className="pb-3 px-3">TASA RETENCIÓN</th>
                <th className="pb-3 px-3">TASA DESERCIÓN</th>
                <th className="pb-3 px-3 text-right">ACCIÓN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {gruposPorPrograma.length > 0 ? (
                gruposPorPrograma.map((grupo) => (
                  <React.Fragment key={grupo.programaCodigo || grupo.programaNombre}>
                    {/* Fila de Total del Programa: suma de todas sus fichas/cohortes —
                        se actualiza progresivamente a medida que se registran o cierran fichas. */}
                    <tr className="bg-slate-50/80 border-y border-slate-200">
                      <td colSpan={9} className="py-2.5 px-3">
                        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1.5">
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Total Programa</span>
                            <span className="font-bold text-slate-900 text-xs">{grupo.programaNombre}</span>
                            <span className="text-[10px] font-bold text-slate-400">
                              ({grupo.fichas.length} {grupo.fichas.length === 1 ? 'ficha' : 'fichas'})
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] font-bold text-slate-600">
                            <span>Matrícula: <span className="text-slate-900">{grupo.totalMatricula}</span></span>
                            <span>Activos: <span className="text-emerald-700">{grupo.totalActivos}</span></span>
                            <span>Deserciones: <span className="text-red-700">{grupo.totalDeserciones}</span></span>
                            <span>
                              Retención:{' '}
                              <span className={
                                grupo.tasaRetencion >= 90 ? 'text-[#0D631B]' : grupo.tasaRetencion >= 80 ? 'text-[#E67E22]' : 'text-[#E74C3C]'
                              }>
                                {grupo.tasaRetencion}%
                              </span>
                            </span>
                            <span>
                              Deserción:{' '}
                              <span className={grupo.tasaDesercion > 8 ? 'text-red-700' : 'text-slate-700'}>
                                {grupo.tasaDesercion}%
                              </span>
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                    {grupo.fichas.map((f) => {
                  const desercionesFicha = (f.aprendicesCancelados || 0) + (f.aprendicesRetiroVoluntario || 0);
                  const retencion = f.tasaRetencion || 0;
                  const desercion = f.tasaDesercion || 0;
                  const esFichaMia = currentUser.rol === 'INSTRUCTOR_LIDER' && (
                    f.instructorLiderId === currentUser.id || 
                    f.id === currentUser.fichaAsignadaId || 
                    f.instructorLiderEmail === currentUser.correo
                  );

                  return (
                    <tr 
                      key={f.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${
                        esFichaMia ? 'bg-emerald-50/30' : ''
                      }`}
                    >
                      {/* Programa y Ficha */}
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 text-xs">
                            {f.programaNombre}
                          </span>
                          {esFichaMia && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                              Mi Ficha
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center space-x-2 mt-0.5 flex-wrap gap-y-1">
                          <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60">
                            Ficha {f.numero_ficha}
                          </span>
                          <span>•</span>
                          <span>Líder: {f.instructorLiderNombre}</span>
                          {reportesJuicios[f.numero_ficha] && (
                            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded-md inline-flex items-center space-x-1">
                              <Award className="w-3 h-3 text-purple-600" />
                              <span>SofiaPlus: {reportesJuicios[f.numero_ficha].porcentajeAprobacionFicha}% aprobados ({reportesJuicios[f.numero_ficha].totalAprendices} apr.)</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Nivel y Modalidad */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-700">{f.nivelFormacion}</div>
                        <div className="text-[11px] text-slate-400">{f.modalidad}</div>
                      </td>

                      {/* Matrícula Inicial */}
                      <td className="py-3.5 px-3 text-center font-bold text-slate-800">
                        {totalMatriculados(f)}
                      </td>

                      {/* Activos */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          {f.aprendicesActivos}
                        </span>
                      </td>

                      {/* Inactivos (cancelados, retiros, aplazados, trasladados) */}
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className="font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200"
                          title={detalleInactivos(f)}
                        >
                          {inactivosFicha(f)}
                        </span>
                      </td>

                      {/* Deserciones */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={`font-bold px-2 py-0.5 rounded-full ${
                          desercionesFicha > 2 
                            ? 'bg-red-50 text-red-700 border border-red-200' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {desercionesFicha}
                        </span>
                      </td>

                      {/* Tasa Retención con Barra de Progreso a color */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-slate-200 h-2 rounded-full overflow-hidden shrink-0">
                            <div 
                              className={`h-full rounded-full ${
                                retencion >= 90 
                                  ? 'bg-[#0D631B]' 
                                  : retencion >= 80 
                                  ? 'bg-[#E67E22]' 
                                  : 'bg-[#E74C3C]'
                              }`}
                              style={{ width: `${Math.min(retencion, 100)}%` }}
                            />
                          </div>
                          <span className="font-bold text-slate-900 text-xs">{retencion}%</span>
                        </div>
                      </td>

                      {/* Tasa Deserción */}
                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          desercion > 8 ? 'bg-red-100 text-red-800 font-black' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {desercion}%
                        </span>
                      </td>

                      {/* Acción: Ver Ficha, Editar y Juicios */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {reportesJuicios[f.numero_ficha] && (
                            <button
                              onClick={() => setReporteJuiciosModal(reportesJuicios[f.numero_ficha])}
                              className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-[#6F43C0] font-bold text-[11px] border border-purple-200 transition-colors inline-flex items-center space-x-1 shadow-2xs"
                              title="Ver reporte oficial de juicios SofiaPlus de esta ficha"
                            >
                              <Award className="w-3 h-3" />
                              <span>Juicios</span>
                            </button>
                          )}
                          {(currentUser.rol === 'ADMINISTRADOR' || currentUser.rol === 'COORDINADOR') && onEditarFicha && (
                            <button
                              onClick={() => onEditarFicha(f)}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#005A8C] font-bold text-[11px] border border-blue-200 transition-colors inline-flex items-center space-x-1 shadow-2xs"
                              title="Editar datos de esta ficha"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Editar</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleVerFicha(f)}
                            className="text-[#0D631B] hover:text-[#0a4d15] font-bold text-xs inline-flex items-center space-x-1 hover:underline"
                            title="Ver opciones y detalles de esta ficha"
                          >
                            <span>Ver Ficha</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                      );
                    })}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#0D631B] flex items-center justify-center mx-auto">
                        <GraduationCap className="w-6 h-6" />
                      </div>
                      <div className="font-bold text-slate-800 text-sm">
                        {fichas.length === 0 ? 'No hay fichas registradas en el sistema' : 'No se encontraron fichas con los filtros aplicados'}
                      </div>
                      <p className="text-xs text-slate-500">
                        {fichas.length === 0
                          ? 'El sistema está completamente limpio. Puedes registrar tus cohortes cuando lo consideres necesario.'
                          : 'Prueba cambiando los términos de búsqueda o los filtros de nivel.'}
                      </p>
                      {fichas.length === 0 && onOpenCrearFicha && (
                        <button
                          onClick={onOpenCrearFicha}
                          className="px-4 py-2 bg-[#0D631B] hover:bg-[#0a4d15] text-white text-xs font-bold rounded-xl shadow-xs transition-colors inline-flex items-center space-x-1.5"
                        >
                          <span>+ Registrar Primera Ficha</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reporte Gráfico: Retención y Deserción por Año y por Trimestre */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex items-center space-x-2.5 mb-5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#0D631B] flex items-center justify-center shrink-0">
            <BarChart3 className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#111C2D]">
              Reporte Gráfico: Retención y Deserción
            </h2>
            <p className="text-xs text-slate-500">
              Tendencia agregada (ponderada por matrícula) de todas las fichas visibles con los filtros actuales.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div>
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2">
              Por Trimestre
            </h3>
            {renderGraficoTendencia(tendenciaPorTrimestre)}
          </div>
          <div>
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2">
              Por Año
            </h3>
            {renderGraficoTendencia(tendenciaPorAnio)}
          </div>
        </div>
      </div>

      {/* Modal / Slide-over Rápido de Opciones al presionar "Ver Ficha" */}
      {fichaModalDetalle && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#0D631B] flex items-center justify-center font-bold">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Ficha {fichaModalDetalle.numero_ficha}
                  </h3>
                  <div className="text-[11px] text-slate-500">
                    {fichaModalDetalle.programaNombre}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setFichaModalDetalle(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Resumen Ficha */}
            <div className="my-5 grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Instructor Líder</div>
                <div className="font-bold text-slate-800 mt-0.5">{fichaModalDetalle.instructorLiderNombre}</div>
                <div className="text-[10px] text-slate-500">{fichaModalDetalle.instructorLiderEmail}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Ambiente y Modalidad</div>
                <div className="font-bold text-slate-800 mt-0.5">{fichaModalDetalle.ambientePrincipal}</div>
                <div className="text-[10px] text-slate-500">{fichaModalDetalle.modalidad}</div>
              </div>
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/60">
                <div className="text-[10px] font-bold text-emerald-800 uppercase">Retención</div>
                <div className="text-lg font-black text-[#0D631B]">{fichaModalDetalle.tasaRetencion}%</div>
                <div className="text-[10px] text-emerald-700 font-medium">
                  {fichaModalDetalle.aprendicesActivos} activos · {inactivosFicha(fichaModalDetalle)} inactivos / {totalRealFicha(fichaModalDetalle)} total
                </div>
              </div>
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60">
                <div className="text-[10px] font-bold text-amber-800 uppercase">Deserción</div>
                <div className="text-lg font-black text-amber-700">{fichaModalDetalle.tasaDesercion}%</div>
                <div className="text-[10px] text-amber-700 font-medium">
                  {(fichaModalDetalle.aprendicesCancelados || 0) + (fichaModalDetalle.aprendicesRetiroVoluntario || 0)} deserciones
                </div>
              </div>
            </div>

            {/* Botones de Navegación Directa */}
            <div className="space-y-2">
              <button
                onClick={() => {
                  onSelectFicha(fichaModalDetalle);
                  setFichaModalDetalle(null);
                  onNavigateTab('horarios');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0D631B] hover:bg-[#0a4d15] text-white font-bold text-xs flex items-center justify-between transition-colors shadow-xs"
              >
                <span className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>Ver Programación de Horarios</span>
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  onSelectFicha(fichaModalDetalle);
                  setFichaModalDetalle(null);
                  onNavigateTab('seguimiento');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#005A8C] border border-blue-200 font-bold text-xs flex items-center justify-between transition-colors"
              >
                <span className="flex items-center space-x-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Ver Seguimiento Curricular (F001)</span>
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {reportesJuicios[fichaModalDetalle.numero_ficha] ? (
                <button
                  onClick={() => {
                    const rep = reportesJuicios[fichaModalDetalle.numero_ficha];
                    setFichaModalDetalle(null);
                    setReporteJuiciosModal(rep);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#6F43C0] border border-purple-200 font-bold text-xs flex items-center justify-between transition-colors shadow-xs"
                >
                  <span className="flex items-center space-x-2">
                    <Award className="w-4 h-4 text-[#6F43C0]" />
                    <span>Ver Juicios Evaluativos SofiaPlus ({reportesJuicios[fichaModalDetalle.numero_ficha].totalRegistros} juicios)</span>
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    setFichaModalDetalle(null);
                    fileInputJuiciosRef.current?.click();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-purple-50/60 hover:bg-purple-100/70 text-[#6F43C0] border border-dashed border-purple-300 font-bold text-xs flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center space-x-2">
                    <UploadCloud className="w-4 h-4 text-[#6F43C0]" />
                    <span>Cargar Reporte de Juicios Evaluativos (.xls)</span>
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {(currentUser.rol === 'ADMINISTRADOR' || currentUser.rol === 'COORDINADOR') && onEditarFicha && (
                <button
                  onClick={() => {
                    const fichaAEditar = fichaModalDetalle;
                    setFichaModalDetalle(null);
                    onEditarFicha(fichaAEditar);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#005A8C] border border-blue-200 font-bold text-xs flex items-center justify-between transition-colors shadow-xs"
                >
                  <span className="flex items-center space-x-2">
                    <Pencil className="w-4 h-4" />
                    <span>Editar Datos de la Ficha</span>
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              <div className="flex items-center space-x-1.5">
                <select
                  value={trimestreAsociacion}
                  onChange={e => setTrimestreAsociacion(e.target.value)}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs focus:outline-hidden"
                  title="Alcance del Formato de Asociación de Fichas"
                >
                  <option value="">Total</option>
                  {trimestresDisponiblesParaFicha(fichaModalDetalle).map(t => (
                    <option key={t} value={t}>{etiquetaTrimestre(t)}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleDescargarAsociacionFichas(fichaModalDetalle, trimestreAsociacion)}
                  className="flex-1 py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center space-x-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Asociación de Fichas</span>
                </button>
              </div>

              <div className="flex items-center space-x-1.5">
                <select
                  value={trimestreReporteEventos}
                  onChange={e => setTrimestreReporteEventos(e.target.value)}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs focus:outline-hidden"
                >
                  <option value="">Trimestre...</option>
                  {trimestresDisponiblesParaFicha(fichaModalDetalle).map(t => (
                    <option key={t} value={t}>{etiquetaTrimestre(t)}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleDescargarReporteEventos(fichaModalDetalle, trimestreReporteEventos)}
                  className="flex-1 py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center space-x-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Reporte de Eventos</span>
                </button>
              </div>

              {(currentUser.rol === 'ADMINISTRADOR' || currentUser.rol === 'COORDINADOR') && onEliminarFicha && (
                <button
                  onClick={() => {
                    const idToDelete = fichaModalDetalle.id;
                    setFichaModalDetalle(null);
                    onEliminarFicha(idToDelete);
                  }}
                  className="w-full py-2 px-4 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs flex items-center justify-center space-x-2 transition-colors border border-red-200"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar Ficha del Sistema</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Reporte Detallado de Juicios Evaluativos SofiaPlus */}
      <ModalJuiciosEvaluativos
        isOpen={!!reporteJuiciosModal}
        onClose={() => setReporteJuiciosModal(null)}
        reporte={reporteJuiciosModal}
        onSincronizarFicha={(rep) => {
          const resultado = onGuardarJuiciosEvaluativos?.(rep, fichaModalDetalle || undefined);
          if (resultado && resultado.exito === false) {
            alert(resultado.mensaje);
          }
        }}
      />
    </div>
  );
};
