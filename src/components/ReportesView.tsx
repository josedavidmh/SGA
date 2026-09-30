import React from 'react';
import { FileBarChart2, Users, MapPin, FileSpreadsheet, FileText, AlertTriangle, CalendarRange, TrendingUp, Clock, UserRound } from 'lucide-react';
import { ReporteCierresIndicadores } from './ReporteCierresIndicadores';
import { ReporteHorasInstructor } from './ReporteHorasInstructor';
import { ReporteMisHoras } from './ReporteMisHoras';
import { ReporteProgramacionTrimestre } from './ReporteProgramacionTrimestre';
import { User, Instructor, BloqueHorario, Ficha, AmbienteAprendizaje, RegionalCentro } from '../types';
import { ReportesInstructoresView } from './ReportesInstructoresView';
import {
  obtenerTrimestresDisponibles,
  calcularAmbientesConFichas,
  exportarAmbientesConFichasExcel,
  exportarAmbientesConFichasPDF
} from '../services/ambientesReporteService';

interface ReportesViewProps {
  currentUser: User;
  instructores: Instructor[];
  horarios: BloqueHorario[];
  allFichas: Ficha[];
  /** Catálogo de ambientes (Parametrizaciones). */
  ambientes?: AmbienteAprendizaje[];
  centro?: RegionalCentro;
  /** Todas las fichas del sistema (para "Mis horas": sus bloques pueden estar en fichas de otros líderes). */
  todasLasFichas?: Ficha[];
}

type SubTabReportes = 'PROGRAMACION' | 'INSTRUCTOR' | 'AMBIENTES' | 'CIERRES' | 'HORAS' | 'MIS_HORAS';

// Sección única que agrupa todos los reportes del sistema (antes vivían
// sueltos: "Horarios por Instructor" era su propia entrada de menú). Cada
// reporte queda como una pestaña interna aquí para que crecer la lista de
// reportes no siga inflando el menú lateral.
export const ReportesView: React.FC<ReportesViewProps> = (props) => {
  const [subTab, setSubTab] = React.useState<SubTabReportes>(props.currentUser.rol === 'INSTRUCTOR_LIDER' ? 'MIS_HORAS' : 'PROGRAMACION');

  return (
    <div className="space-y-5 pb-12 animate-in fade-in duration-200">
      <div>
        <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-black">Reportes</span>
          <span>•</span>
          <span>Todos los reportes del sistema, en un solo lugar</span>
        </div>
        <h1 className="text-2xl font-black text-[#111C2D] tracking-tight mt-1 flex items-center space-x-2.5">
          <FileBarChart2 className="w-6 h-6 text-blue-700" />
          <span>Centro de Reportes</span>
        </h1>
      </div>

      {/* Selector de reporte */}
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs w-fit flex-wrap">
        <button
          type="button"
          onClick={() => setSubTab('MIS_HORAS')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            subTab === 'MIS_HORAS' ? 'bg-[#0D631B] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <UserRound className="w-4 h-4" />
          <span>Mis Horas</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('PROGRAMACION')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            subTab === 'PROGRAMACION' ? 'bg-[#0D631B] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CalendarRange className="w-4 h-4" />
          <span>Programación por Trimestre</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('INSTRUCTOR')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            subTab === 'INSTRUCTOR' ? 'bg-[#0D631B] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Horarios por Instructor</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('AMBIENTES')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            subTab === 'AMBIENTES' ? 'bg-[#0D631B] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Ambientes y sus Fichas</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('CIERRES')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            subTab === 'CIERRES' ? 'bg-[#0D631B] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Retención y Deserción</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('HORAS')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            subTab === 'HORAS' ? 'bg-[#0D631B] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Horas por Instructor</span>
        </button>
      </div>

      {subTab === 'PROGRAMACION' && (
        <ReporteProgramacionTrimestre horarios={props.horarios} allFichas={props.allFichas} />
      )}

      {subTab === 'INSTRUCTOR' && (
        <ReportesInstructoresView
          currentUser={props.currentUser}
          instructores={props.instructores}
          horarios={props.horarios}
          allFichas={props.allFichas}
        />
      )}

      {subTab === 'MIS_HORAS' && (
        <ReporteMisHoras
          currentUser={props.currentUser}
          horarios={props.horarios}
          fichas={props.todasLasFichas || props.allFichas}
          instructores={props.instructores}
          centro={props.centro}
        />
      )}

      {subTab === 'HORAS' && (
        <ReporteHorasInstructor horarios={props.horarios} allFichas={props.allFichas} instructores={props.instructores} centro={props.centro} />
      )}

      {subTab === 'CIERRES' && (
        <ReporteCierresIndicadores allFichas={props.allFichas} centro={props.centro} alcanceInicial="GLOBAL" alcanceFijo />
      )}

      {subTab === 'AMBIENTES' && (
        <ReporteAmbientesConFichas horarios={props.horarios} allFichas={props.allFichas} ambientes={props.ambientes || []} />
      )}
    </div>
  );
};

// =====================================================================
// Reporte general: cada ambiente con sus fichas (base y excepciones)
// =====================================================================

interface ReporteAmbientesConFichasProps {
  horarios: BloqueHorario[];
  allFichas: Ficha[];
  ambientes: AmbienteAprendizaje[];
}

const ReporteAmbientesConFichas: React.FC<ReporteAmbientesConFichasProps> = ({ horarios, allFichas, ambientes }) => {
  const trimestresDisponibles = React.useMemo(() => obtenerTrimestresDisponibles(horarios), [horarios]);
  const [trimestreFiltro, setTrimestreFiltro] = React.useState<string>(() => trimestresDisponibles[0] || 'TODOS');
  const [busqueda, setBusqueda] = React.useState('');
  const [soloConExcepciones, setSoloConExcepciones] = React.useState(false);
  const [soloConAlertas, setSoloConAlertas] = React.useState(false);

  const items = React.useMemo(
    () => calcularAmbientesConFichas(allFichas, horarios, ambientes, trimestreFiltro),
    [allFichas, horarios, ambientes, trimestreFiltro]
  );

  const itemsFiltrados = React.useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return items.filter(a => {
      if (soloConExcepciones && !a.fichas.some(f => f.uso === 'EXCEPCION')) return false;
      if (soloConAlertas && !a.fichas.some(f => f.duplicada || (f.uso === 'BASE' && f.sinJornada))) return false;
      if (!q) return true;
      return a.ambiente.toLowerCase().includes(q) || a.fichas.some(f => f.fichaNumero.includes(q) || f.programaNombre.toLowerCase().includes(q));
    });
  }, [items, busqueda, soloConExcepciones, soloConAlertas]);

  const libres = items.filter(a => a.fichas.length === 0).length;
  const duplicados = items.reduce((acc, a) => acc + a.conflictos, 0);
  const sinJornada = items.reduce((acc, a) => acc + a.fichas.filter(f => f.uso === 'BASE' && f.sinJornada).length, 0);
  const excepciones = items.reduce((acc, a) => acc + a.fichas.filter(f => f.uso === 'EXCEPCION').length, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-[#111C2D]">Ambientes y sus Fichas</h2>
          <p className="text-xs text-slate-500 font-medium">
            Cada ambiente con las fichas que lo tienen como base y las que van allí por excepción (días o franjas), según lo programado en Horarios.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={trimestreFiltro}
            onChange={(e) => setTrimestreFiltro(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-200"
          >
            <option value="TODOS">Todos los trimestres</option>
            {trimestresDisponibles.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => exportarAmbientesConFichasExcel(itemsFiltrados, trimestreFiltro)}
            className="flex items-center space-x-1.5 bg-[#0D631B] hover:bg-[#0a4d15] text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel</span>
          </button>
          <button
            type="button"
            onClick={() => exportarAmbientesConFichasPDF(itemsFiltrados, trimestreFiltro)}
            className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all"
          >
            <FileText className="w-4 h-4 text-red-500" />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ambientes</div>
          <div className="text-xl font-black text-[#111C2D]">{items.length} <span className="text-xs font-semibold text-slate-400">({libres} libres)</span></div>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Fichas con ambiente base</div>
          <div className="text-xl font-black text-[#0D631B]">{items.reduce((acc, a) => acc + a.fichas.filter(f => f.uso === 'BASE').length, 0)}</div>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Usos por excepción</div>
          <div className="text-xl font-black text-violet-700">{excepciones}</div>
        </div>
        <div className={`p-4 rounded-2xl border shadow-xs ${duplicados > 0 || sinJornada > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200/80'}`}>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Por corregir</div>
          <div className={`text-xl font-black ${duplicados > 0 ? 'text-rose-700' : 'text-slate-700'}`}>{duplicados} <span className="text-xs font-semibold text-slate-500">duplicadas</span></div>
          <div className="text-[10px] font-semibold text-slate-500">{sinJornada} sin jornada asignada</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar ambiente, ficha o programa…"
          className="w-full sm:w-72 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#0D631B]"
        />
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
          <input type="checkbox" checked={soloConExcepciones} onChange={(e) => setSoloConExcepciones(e.target.checked)} className="accent-violet-600" />
          Solo ambientes con excepciones
        </label>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
          <input type="checkbox" checked={soloConAlertas} onChange={(e) => setSoloConAlertas(e.target.checked)} className="accent-rose-600" />
          Solo con duplicados / sin jornada
        </label>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[920px]">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider bg-slate-50/80">
                <th className="py-2.5 px-3 w-56">Ambiente</th>
                <th className="py-2.5 px-3">Ficha</th>
                <th className="py-2.5 px-3">Uso</th>
                <th className="py-2.5 px-3">Jornada</th>
                <th className="py-2.5 px-3">Días y franjas</th>
                <th className="py-2.5 px-3 text-center">Horas/sem</th>
              </tr>
            </thead>
            <tbody>
              {itemsFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    {ambientes.length === 0 && items.length === 0
                      ? 'No hay ambientes registrados. Regístralos en Parametrizaciones → Ambientes.'
                      : 'No hay ambientes para este filtro.'}
                  </td>
                </tr>
              ) : itemsFiltrados.map(a => (
                a.fichas.length === 0 ? (
                  <tr key={a.ambiente} className="border-t border-slate-100">
                    <td className="py-2.5 px-3 align-top">
                      <div className="font-bold text-[#111C2D]">{a.ambiente}</div>
                      <div className="text-[10px] text-slate-400">{[a.tipo, a.sede, a.capacidad ? `${a.capacidad} aprendices` : ''].filter(Boolean).join(' · ')}</div>
                    </td>
                    <td colSpan={5} className="py-2.5 px-3 text-slate-400 italic">Libre — sin fichas asignadas</td>
                  </tr>
                ) : a.fichas.map((f, i) => (
                  <tr key={`${a.ambiente}_${f.fichaId}`} className={i === 0 ? 'border-t border-slate-200' : ''}>
                    {i === 0 && (
                      <td rowSpan={a.fichas.length} className="py-2.5 px-3 align-top bg-slate-50/40">
                        <div className="font-bold text-[#111C2D]">{a.ambiente}</div>
                        <div className="text-[10px] text-slate-400">{[a.tipo, a.sede, a.capacidad ? `${a.capacidad} aprendices` : ''].filter(Boolean).join(' · ')}</div>
                        <div className="text-[10px] font-bold text-[#0D631B] mt-1">{a.fichas.length} ficha(s) · {a.horasTotales}h/sem</div>
                        {a.jornadasLibres.length > 0 && a.jornadasLibres.length < 3 && (
                          <div className="text-[10px] font-semibold text-slate-500 mt-0.5">Libre en: {a.jornadasLibres.join(', ')}</div>
                        )}
                        {a.conflictos > 0 && (
                          <div className="text-[10px] font-bold text-rose-600 mt-0.5">⚠ {a.conflictos} fichas en la misma jornada</div>
                        )}
                      </td>
                    )}
                    <td className="py-2.5 px-3 align-top">
                      <div className="font-bold text-[#111C2D]">{f.fichaNumero}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[220px]" title={f.programaNombre}>{f.programaNombre}</div>
                    </td>
                    <td className="py-2.5 px-3 align-top">
                      {f.uso === 'BASE' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#0D631B] border border-emerald-200">Base</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-50 text-violet-800 border border-violet-200">Excepción</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 align-top">
                      {f.jornada ? (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          f.duplicada ? 'bg-rose-50 text-rose-700 border-rose-300' : 'bg-sky-50 text-sky-800 border-sky-200'
                        }`}>{f.jornada}{f.duplicada ? ' · duplicada' : ''}</span>
                      ) : f.uso === 'BASE' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Sin jornada</span>
                      ) : <span className="text-slate-300">—</span>}
                      {f.vencida && f.uso === 'BASE' && (
                        <div className="text-[10px] font-bold text-slate-400 mt-1" title={`Etapa lectiva hasta ${f.fechaFin || ''}`}>Finalizada o en cierre · libera el ambiente</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 align-top text-slate-600">{f.horario || '—'}</td>
                    <td className="py-2.5 px-3 align-top text-center font-bold text-slate-700">{f.horas}h</td>
                  </tr>
                ))
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
