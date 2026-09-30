import React from 'react';
import { FileSpreadsheet, FileText, Search, Clock } from 'lucide-react';
import { BloqueHorario, Ficha, Instructor, RegionalCentro } from '../types';
import {
  trimestresConHorario,
  calcularHorasTrimestre,
  calcularMatrizHoras,
  exportarHorasInstructorExcel,
  exportarHorasInstructorPDF
} from '../services/horasInstructorService';

interface Props {
  horarios: BloqueHorario[];
  allFichas: Ficha[];
  instructores: Instructor[];
  centro?: RegionalCentro;
}

const ABREV: Record<string, string> = { Lunes: 'Lun', Martes: 'Mar', 'Miércoles': 'Mié', Jueves: 'Jue', Viernes: 'Vie', 'Sábado': 'Sáb' };

export const ReporteHorasInstructor: React.FC<Props> = ({ horarios, allFichas, instructores, centro }) => {
  const trimestres = React.useMemo(() => trimestresConHorario(horarios), [horarios]);
  const [trimestre, setTrimestre] = React.useState<string>('');
  const [busqueda, setBusqueda] = React.useState('');
  const activo = trimestre && trimestres.includes(trimestre) ? trimestre : trimestres[0] || '';

  const datos = React.useMemo(
    () => calcularHorasTrimestre(horarios, allFichas, instructores, activo),
    [horarios, allFichas, instructores, activo]
  );
  const matriz = React.useMemo(() => calcularMatrizHoras(horarios, instructores), [horarios, instructores]);

  const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const filas = datos.filas.filter(f => !busqueda.trim() || norm(f.nombre).includes(norm(busqueda.trim())));
  const max = Math.max(1, ...datos.filas.map(f => f.total));

  if (trimestres.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
        Aún no hay bloques de horario programados. Programa horarios para ver las horas de cada instructor.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-[#111C2D]">Horas por Instructor</h2>
          <p className="text-xs text-slate-500 font-medium">
            Horas que cada instructor tiene programadas por semana en el trimestre, por día y jornada.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={activo}
            onChange={(e) => setTrimestre(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-200"
          >
            {trimestres.map(t => <option key={t} value={t}>Trimestre {t}</option>)}
          </select>
          <button
            type="button"
            onClick={() => exportarHorasInstructorExcel(horarios, allFichas, instructores, activo, centro)}
            className="flex items-center space-x-1.5 bg-[#0D631B] hover:bg-[#0a4d15] text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel</span>
          </button>
          <button
            type="button"
            onClick={() => exportarHorasInstructorPDF(horarios, allFichas, instructores, activo, centro)}
            className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all"
          >
            <FileText className="w-4 h-4 text-red-500" />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Instructores</div>
          <div className="text-xl font-black text-[#111C2D]">{datos.filas.length}</div>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Horas por semana</div>
          <div className="text-xl font-black text-[#0D631B]">{datos.totalHoras - datos.vacantes.total}</div>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Promedio por instructor</div>
          <div className="text-xl font-black text-[#111C2D]">
            {datos.filas.length > 0 ? Math.round(((datos.totalHoras - datos.vacantes.total) / datos.filas.length) * 10) / 10 : 0} h
          </div>
        </div>
        <div className={`p-4 rounded-2xl border shadow-xs ${datos.vacantes.total > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200/80'}`}>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Horas sin instructor</div>
          <div className={`text-xl font-black ${datos.vacantes.total > 0 ? 'text-amber-700' : 'text-slate-700'}`}>{datos.vacantes.total} h</div>
        </div>
      </div>

      <div className="relative w-full sm:w-72">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar instructor…"
          className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:border-[#0D631B]"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[820px]">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider bg-slate-50/80">
                <th className="py-2.5 px-3">Instructor</th>
                {datos.dias.map(d => <th key={d} className="py-2.5 px-2 text-center">{ABREV[d]}</th>)}
                <th className="py-2.5 px-2 text-center">Mañana</th>
                <th className="py-2.5 px-2 text-center">Tarde</th>
                <th className="py-2.5 px-3 w-44">Total h/sem</th>
                <th className="py-2.5 px-3">Fichas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filas.length === 0 ? (
                <tr><td colSpan={datos.dias.length + 5} className="py-8 text-center text-slate-400">No hay instructores para este filtro.</td></tr>
              ) : filas.map(f => (
                <tr key={f.clave} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-3 font-bold text-[#111C2D]">{f.nombre}</td>
                  {datos.dias.map(d => (
                    <td key={d} className={`py-2.5 px-2 text-center ${f.porDia[d] ? 'font-bold text-slate-700' : 'text-slate-300'}`}>{f.porDia[d] || '·'}</td>
                  ))}
                  <td className="py-2.5 px-2 text-center text-slate-600">{f.manana}</td>
                  <td className="py-2.5 px-2 text-center text-slate-600">{f.tarde}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-[#0D631B] w-8 text-right">{f.total}</span>
                      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-[#0D631B]" style={{ width: `${(f.total / max) * 100}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">{f.fichas.join(', ')}</td>
                </tr>
              ))}
              {datos.vacantes.total > 0 && !busqueda.trim() && (
                <tr className="bg-amber-50/60">
                  <td className="py-2.5 px-3 font-bold text-amber-800 italic">Sin instructor (vacantes)</td>
                  {datos.dias.map(d => (
                    <td key={d} className="py-2.5 px-2 text-center text-amber-700">{datos.vacantes.porDia[d] || '·'}</td>
                  ))}
                  <td className="py-2.5 px-2" /><td className="py-2.5 px-2" />
                  <td className="py-2.5 px-3 font-black text-amber-700">{datos.vacantes.total}</td>
                  <td className="py-2.5 px-3 text-amber-700">{datos.vacantes.bloques} bloque(s)</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comparativo entre trimestres */}
      {matriz.trimestres.length > 1 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-black text-[#111C2D]">Comparativo entre trimestres (horas por semana)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 font-bold uppercase text-[10px] tracking-wider bg-slate-50/80">
                  <th className="py-2.5 px-3">Instructor</th>
                  {matriz.trimestres.map(t => <th key={t} className="py-2.5 px-3 text-center">{t}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matriz.filas
                  .filter(f => !busqueda.trim() || norm(f.nombre).includes(norm(busqueda.trim())))
                  .map(f => (
                    <tr key={f.clave}>
                      <td className="py-2 px-3 font-bold text-[#111C2D]">{f.nombre}</td>
                      {matriz.trimestres.map(t => (
                        <td key={t} className={`py-2 px-3 text-center ${f.porTrimestre[t] ? 'font-bold text-slate-700' : 'text-slate-300'}`}>{f.porTrimestre[t] || '·'}</td>
                      ))}
                    </tr>
                  ))}
                <tr className="bg-slate-100 font-black text-slate-800">
                  <td className="py-2 px-3">Total</td>
                  {matriz.trimestres.map(t => <td key={t} className="py-2 px-3 text-center">{matriz.totalesPorTrimestre[t] || 0}</td>)}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
