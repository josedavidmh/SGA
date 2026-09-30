import React from 'react';
import { CalendarRange, FileSpreadsheet, FileText } from 'lucide-react';
import { BloqueHorario, Ficha } from '../types';
import { obtenerTrimestresDisponibles } from '../services/ambientesReporteService';
import {
  construirProgramacionConsolidada,
  exportarProgramacionTrimestreExcel,
  exportarProgramacionTrimestrePDF
} from '../services/programacionTrimestreReporteService';

interface Props {
  horarios: BloqueHorario[];
  allFichas: Ficha[];
}

/**
 * Consolidado de programación de instructores por trimestre y programa:
 * por cada ficha, los días en el encabezado, una fila por franja y en cada
 * celda el instructor (con su color) y debajo la competencia y sus RAPs.
 */
export const ReporteProgramacionTrimestre: React.FC<Props> = ({ horarios, allFichas }) => {
  const trimestres = React.useMemo(() => obtenerTrimestresDisponibles(horarios), [horarios]);
  const [trimestre, setTrimestre] = React.useState<string>(() => trimestres[0] || '');
  React.useEffect(() => {
    if (!trimestre && trimestres[0]) setTrimestre(trimestres[0]);
  }, [trimestres, trimestre]);

  const programas = React.useMemo(() => {
    const m = new Map<string, string>();
    allFichas.forEach(f => { if (f.programaCodigo) m.set(f.programaCodigo, f.programaNombre || f.programaCodigo); });
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [allFichas]);
  const [programa, setPrograma] = React.useState<string>('TODOS');
  const [soloConBloques, setSoloConBloques] = React.useState(true);

  const datos = React.useMemo(
    () => construirProgramacionConsolidada(allFichas, horarios, trimestre, programa),
    [allFichas, horarios, trimestre, programa]
  );
  const fichasMostradas = soloConBloques ? datos.fichas.filter(f => f.filas.length > 0) : datos.fichas;
  const [generando, setGenerando] = React.useState(false);

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-[#111C2D] flex items-center gap-2">
            <CalendarRange className="w-4.5 h-4.5 text-[#0D631B]" />
            Programación de Instructores por Trimestre
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Consolidado por ficha: días de la semana, instructor programado en cada franja (con su color) y debajo la competencia y sus RAPs.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={trimestre}
            onChange={(e) => setTrimestre(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-200"
          >
            {trimestres.length === 0 && <option value="">Sin trimestres programados</option>}
            {trimestres.map(t => <option key={t} value={t}>Trimestre {t}</option>)}
          </select>
          <select
            value={programa}
            onChange={(e) => setPrograma(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-200 max-w-[260px]"
          >
            <option value="TODOS">Todos los programas</option>
            {programas.map(([cod, nom]) => <option key={cod} value={cod}>{cod} — {nom}</option>)}
          </select>
          <button
            type="button"
            disabled={!trimestre || generando}
            onClick={async () => { setGenerando(true); try { await exportarProgramacionTrimestreExcel(datos); } finally { setGenerando(false); } }}
            className="flex items-center space-x-1.5 bg-[#0D631B] hover:bg-[#0a4d15] disabled:opacity-50 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel</span>
          </button>
          <button
            type="button"
            disabled={!trimestre}
            onClick={() => exportarProgramacionTrimestrePDF(datos)}
            className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all"
          >
            <FileText className="w-4 h-4 text-red-500" />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fichas con horario</div>
          <div className="text-xl font-black text-[#111C2D]">{datos.fichas.filter(f => f.filas.length > 0).length} <span className="text-xs font-semibold text-slate-400">/ {datos.fichas.length}</span></div>
        </div>
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Instructores</div>
          <div className="text-xl font-black text-[#0D631B]">{datos.instructores.length}</div>
        </div>
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Horas semanales</div>
          <div className="text-xl font-black text-[#111C2D]">{datos.fichas.reduce((a, f) => a + f.horas, 0)}h</div>
        </div>
        <div className={`p-3.5 rounded-2xl border shadow-xs ${datos.vacantes > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200/80'}`}>
          <div className={`text-[10px] font-bold uppercase tracking-wider ${datos.vacantes > 0 ? 'text-rose-700' : 'text-slate-400'}`}>Espacios vacantes</div>
          <div className={`text-xl font-black ${datos.vacantes > 0 ? 'text-rose-700' : 'text-[#111C2D]'}`}>{datos.vacantes}</div>
        </div>
      </div>

      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer w-fit">
        <input type="checkbox" checked={soloConBloques} onChange={(e) => setSoloConBloques(e.target.checked)} className="accent-[#0D631B]" />
        Mostrar solo fichas con horario en este trimestre
      </label>

      {/* Vista previa por ficha */}
      {fichasMostradas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-400">
          {trimestre ? 'No hay bloques programados para este trimestre y programa.' : 'Todavía no hay horarios programados.'}
        </div>
      ) : (
        <div className="space-y-4">
          {fichasMostradas.map(fp => (
            <div key={fp.ficha.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full table-fixed border-collapse text-xs min-w-[900px]">
                  <colgroup>
                    <col className="w-[110px]" />
                    <col className="w-[95px]" />
                    {datos.dias.map(d => <col key={d} />)}
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="p-2 bg-[#0D631B] text-white font-black text-sm text-center border border-slate-300">{fp.ficha.numero_ficha}</th>
                      <th className="p-2 bg-emerald-100 text-[#111C2D] font-bold text-center border border-slate-300">Franja</th>
                      {datos.dias.map(d => (
                        <th key={d} className="p-2 bg-emerald-100 text-[#111C2D] font-bold text-center border border-slate-300">{d}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fp.filas.length === 0 ? (
                      <tr>
                        <td className="p-2 text-center text-[10px] text-slate-500 border border-slate-300">{fp.ficha.programaNombre}</td>
                        <td colSpan={1 + datos.dias.length} className="p-3 text-center text-slate-400 italic border border-slate-300">Sin horario en este trimestre</td>
                      </tr>
                    ) : fp.filas.map((fila, idx) => (
                      <tr key={fila.franja}>
                        {idx === 0 && (
                          <td rowSpan={fp.filas.length} className="p-2 text-center align-middle bg-slate-50 border border-slate-300">
                            <div className="font-black text-[#111C2D]">{fp.ficha.numero_ficha}</div>
                            <div className="text-[10px] text-slate-500 leading-tight mt-0.5">{fp.ficha.programaNombre}</div>
                            <div className="text-[10px] font-bold text-[#0D631B] mt-1">{fp.horas}h/sem</div>
                          </td>
                        )}
                        <td className="p-2 text-center font-bold text-slate-700 bg-slate-50 border border-slate-300">{fila.etiqueta}</td>
                        {datos.dias.map(d => {
                          const lista = fila.celdas[d] || [];
                          if (lista.length === 0) return <td key={d} className="border border-slate-300" />;
                          return (
                            <td key={d} className="p-0 align-middle border border-slate-300" style={{ backgroundColor: lista[0].color.fondo }}>
                              {lista.map((c, i) => (
                                <div key={i} className={`p-2 text-center ${i > 0 ? 'border-t border-dashed border-slate-400' : ''}`} style={{ backgroundColor: c.color.fondo }}>
                                  <div className="font-black text-[11px] leading-tight" style={{ color: c.color.texto }}>{c.instructor}</div>
                                  <div className="text-[10px] text-slate-700 leading-tight mt-0.5">{c.competencia}</div>
                                  <div className="text-[10px] italic text-slate-600 leading-tight mt-0.5">{c.raps}</div>
                                </div>
                              ))}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
