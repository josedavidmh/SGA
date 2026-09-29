import React from 'react';
import { FileBarChart2, Users, MapPin, FileSpreadsheet, FileText, AlertTriangle } from 'lucide-react';
import { User, Instructor, BloqueHorario, Ficha } from '../types';
import { ReportesInstructoresView } from './ReportesInstructoresView';
import {
  calcularUsoAmbientesPorFichaTrimestre,
  obtenerTrimestresDisponibles,
  exportarUsoAmbientesExcel,
  exportarUsoAmbientesPDF
} from '../services/ambientesReporteService';

interface ReportesViewProps {
  currentUser: User;
  instructores: Instructor[];
  horarios: BloqueHorario[];
  allFichas: Ficha[];
}

type SubTabReportes = 'INSTRUCTOR' | 'AMBIENTES';

// Sección única que agrupa todos los reportes del sistema (antes vivían
// sueltos: "Horarios por Instructor" era su propia entrada de menú). Cada
// reporte queda como una pestaña interna aquí para que crecer la lista de
// reportes no siga inflando el menú lateral.
export const ReportesView: React.FC<ReportesViewProps> = (props) => {
  const [subTab, setSubTab] = React.useState<SubTabReportes>('INSTRUCTOR');

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
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs w-fit">
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
          <span>Ambientes por Ficha</span>
        </button>
      </div>

      {subTab === 'INSTRUCTOR' && (
        <ReportesInstructoresView
          currentUser={props.currentUser}
          instructores={props.instructores}
          horarios={props.horarios}
          allFichas={props.allFichas}
        />
      )}

      {subTab === 'AMBIENTES' && (
        <ReporteAmbientesPorFicha horarios={props.horarios} allFichas={props.allFichas} />
      )}
    </div>
  );
};

// =====================================================================
// Reporte: Ambientes por Ficha, por Trimestre
// =====================================================================

interface ReporteAmbientesPorFichaProps {
  horarios: BloqueHorario[];
  allFichas: Ficha[];
}

const ReporteAmbientesPorFicha: React.FC<ReporteAmbientesPorFichaProps> = ({ horarios, allFichas }) => {
  const trimestresDisponibles = React.useMemo(() => obtenerTrimestresDisponibles(horarios), [horarios]);
  const [trimestreFiltro, setTrimestreFiltro] = React.useState<string>('TODOS');

  const items = React.useMemo(
    () => calcularUsoAmbientesPorFichaTrimestre(allFichas, horarios),
    [allFichas, horarios]
  );

  const itemsFiltrados = React.useMemo(
    () => (trimestreFiltro === 'TODOS' ? items : items.filter(i => i.trimestre === trimestreFiltro)),
    [items, trimestreFiltro]
  );

  const ambientesDistintos = React.useMemo(
    () => new Set(itemsFiltrados.flatMap(i => i.ambientes)).size,
    [itemsFiltrados]
  );

  // Ficha que usó más de un ambiente dentro del MISMO trimestre — normalmente
  // no debería pasar (el ambiente es fijo por ficha) y suele indicar un
  // cambio de ambiente a mitad de trimestre o un bloque mal cargado.
  const fichasConMultiplesAmbientes = React.useMemo(
    () => itemsFiltrados.filter(i => i.ambientes.length > 1),
    [itemsFiltrados]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-[#111C2D]">Uso de Ambientes por Ficha</h2>
          <p className="text-xs text-slate-500 font-medium">
            Qué ambiente ocupó cada ficha en cada trimestre, a partir de lo realmente programado en Horarios.
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
            onClick={() => exportarUsoAmbientesExcel(items, trimestreFiltro)}
            className="flex items-center space-x-1.5 bg-[#0D631B] hover:bg-[#0a4d15] text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel</span>
          </button>
          <button
            type="button"
            onClick={() => exportarUsoAmbientesPDF(items, trimestreFiltro)}
            className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all"
          >
            <FileText className="w-4 h-4 text-red-500" />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Fichas en el Reporte</div>
          <div className="text-xl font-black text-[#111C2D]">{itemsFiltrados.length}</div>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ambientes Distintos Usados</div>
          <div className="text-xl font-black text-[#0D631B]">{ambientesDistintos}</div>
        </div>
        <div className={`p-4 rounded-2xl border shadow-xs ${fichasConMultiplesAmbientes.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200/80'}`}>
          <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${fichasConMultiplesAmbientes.length > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
            Fichas con Más de un Ambiente / Trimestre
          </div>
          <div className={`text-xl font-black ${fichasConMultiplesAmbientes.length > 0 ? 'text-amber-700' : 'text-[#111C2D]'}`}>
            {fichasConMultiplesAmbientes.length}
          </div>
        </div>
      </div>

      {fichasConMultiplesAmbientes.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Estas fichas quedaron con bloques guardados en más de un ambiente dentro del mismo trimestre. Puede ser un cambio real de salón a mitad de trimestre, o un bloque cargado antes de corregir el ambiente de la ficha — vale la pena revisarlas.
          </p>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider bg-slate-50/80">
                <th className="py-2.5 px-3">Trimestre</th>
                <th className="py-2.5 px-3">Ficha</th>
                <th className="py-2.5 px-3">Programa</th>
                <th className="py-2.5 px-3">Ambiente(s)</th>
                <th className="py-2.5 px-3 text-center">Bloques</th>
                <th className="py-2.5 px-3 text-center">Horas/sem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itemsFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No hay bloques de horario programados para este filtro.
                  </td>
                </tr>
              ) : (
                itemsFiltrados.map(item => (
                  <tr key={`${item.trimestre}_${item.fichaId}`} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{item.trimestre}</td>
                    <td className="py-2.5 px-3 font-bold text-[#111C2D]">{item.fichaNumero}</td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">{item.programaNombre}</td>
                    <td className="py-2.5 px-3">
                      {item.ambientes.length > 1 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          {item.ambientes.join(' / ')}
                        </span>
                      ) : (
                        <span className="text-slate-700 font-medium">{item.ambientes[0]}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-700">{item.totalBloques}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-[#0D631B]">{item.totalHoras}h</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
