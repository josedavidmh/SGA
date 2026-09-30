import React from 'react';
import { FileSpreadsheet, FileText, TrendingUp, TrendingDown } from 'lucide-react';
import { Ficha, RegionalCentro } from '../types';
import {
  aniosDisponibles,
  indicadoresPorPrograma,
  totalizar,
  exportarCierresExcel,
  exportarCierresPDF,
  anioDeFicha,
  META_RETENCION,
  UMBRAL_DESERCION,
  AlcanceCierres
} from '../services/cierresReporteService';

const CENTRO_POR_DEFECTO: RegionalCentro = { regional: '', centro: '', codigoCentro: '', sede: '' };

interface Props {
  allFichas: Ficha[];
  centro?: RegionalCentro;
  /** Reporte con el que arranca (en Cierres solo se ofrece el global). */
  alcanceInicial?: AlcanceCierres;
  /** Oculta el selector de alcance. */
  alcanceFijo?: boolean;
  /** Programa del reporte (código); si se da junto con `programaFijo`, no se puede cambiar. */
  programaInicial?: string;
  programaFijo?: boolean;
}

/**
 * Reporte de retención y deserción (Excel y PDF): resumen de un programa con
 * sus fichas, o global de todos los programas. Histórico (todos los años) o
 * de un año — las fichas se van acumulando, así que el año es el filtro natural.
 */
export const ReporteCierresIndicadores: React.FC<Props> = ({ allFichas, centro, alcanceInicial = 'PROGRAMA', alcanceFijo = false, programaInicial = '', programaFijo = false }) => {
  const [alcance, setAlcance] = React.useState<AlcanceCierres>(alcanceInicial);
  const [anio, setAnio] = React.useState<string>('TODOS');
  const programas = React.useMemo(() => indicadoresPorPrograma(allFichas), [allFichas]);
  const [programaCodigo, setProgramaCodigo] = React.useState<string>(programaInicial);
  const codigoActivo = (programaFijo ? programaInicial : programaCodigo) || programas[0]?.codigo || programas[0]?.nombre || '';
  const nombrePrograma = programas.find(p => (p.codigo || p.nombre) === codigoActivo)?.nombre || '';

  const anios = React.useMemo(() => {
    const base = alcance === 'PROGRAMA'
      ? allFichas.filter(f => (f.programaCodigo || f.programaNombre) === codigoActivo)
      : allFichas;
    return aniosDisponibles(base);
  }, [allFichas, alcance, codigoActivo]);

  // Si el año elegido ya no existe para ese programa, vuelve a "histórico".
  const anioEfectivo = anio !== 'TODOS' && !anios.includes(anio) ? 'TODOS' : anio;

  const fichasVista = allFichas.filter(f =>
    (alcance === 'GLOBAL' || (f.programaCodigo || f.programaNombre) === codigoActivo) &&
    (anioEfectivo === 'TODOS' || anioDeFicha(f) === anioEfectivo)
  );
  const resumen = totalizar(indicadoresPorPrograma(fichasVista).flatMap(p => p.detalle));

  const opciones = {
    alcance,
    fichas: allFichas,
    programaCodigo: codigoActivo,
    anio: anioEfectivo,
    centro: centro || CENTRO_POR_DEFECTO
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-black text-[#111C2D]">Retención y Deserción</h2>
        <p className="text-xs text-slate-500 font-medium">
          Resumen de un programa con sus fichas, o índice global de todos los programas. Puedes sacarlo histórico o de un año en particular.
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {!alcanceFijo && (
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
            {(['PROGRAMA', 'GLOBAL'] as AlcanceCierres[]).map(a => (
              <button
                key={a}
                type="button"
                onClick={() => setAlcance(a)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${alcance === a ? 'bg-[#0D631B] text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {a === 'PROGRAMA' ? 'Por programa' : 'Global de programas'}
              </button>
            ))}
          </div>
        )}
        {alcance === 'PROGRAMA' && programaFijo && nombrePrograma && (
          <span className="px-3 py-2 rounded-xl bg-slate-100 text-xs font-bold text-slate-700">{nombrePrograma}</span>
        )}
        {alcance === 'PROGRAMA' && !programaFijo && (
          <select
            value={codigoActivo}
            onChange={(e) => setProgramaCodigo(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-200 max-w-xs"
          >
            {programas.map(p => (
              <option key={p.codigo || p.nombre} value={p.codigo || p.nombre}>{p.nombre}{p.codigo ? ` (${p.codigo})` : ''}</option>
            ))}
          </select>
        )}
        <select
          value={anioEfectivo}
          onChange={(e) => setAnio(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-200"
        >
          <option value="TODOS">Histórico (todos los años)</option>
          {anios.map(a => <option key={a} value={a}>Año {a}</option>)}
        </select>
        <button
          type="button"
          disabled={fichasVista.length === 0}
          onClick={() => exportarCierresExcel(opciones)}
          className="flex items-center space-x-1.5 bg-[#0D631B] hover:bg-[#0a4d15] disabled:opacity-40 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Exportar Excel</span>
        </button>
        <button
          type="button"
          disabled={fichasVista.length === 0}
          onClick={() => exportarCierresPDF(opciones)}
          className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all"
        >
          <FileText className="w-4 h-4 text-red-500" />
          <span>Exportar PDF</span>
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Fichas</div>
          <div className="text-xl font-black text-[#111C2D]">{resumen.fichas}</div>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Matriculados</div>
          <div className="text-xl font-black text-[#111C2D]">{resumen.matriculados}</div>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">En formación / Inactivos</div>
          <div className="text-xl font-black text-[#111C2D]">{resumen.enFormacion} <span className="text-xs font-semibold text-slate-400">/ {resumen.inactivos}</span></div>
        </div>
        <div className={`p-4 rounded-2xl border shadow-xs ${resumen.retencion >= META_RETENCION ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Retención</div>
          <div className={`text-xl font-black ${resumen.retencion >= META_RETENCION ? 'text-emerald-700' : 'text-rose-700'}`}>{resumen.retencion}%</div>
        </div>
        <div className={`p-4 rounded-2xl border shadow-xs ${resumen.desercion > UMBRAL_DESERCION ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Deserción</div>
          <div className={`text-xl font-black ${resumen.desercion > UMBRAL_DESERCION ? 'text-rose-700' : 'text-emerald-700'}`}>{resumen.desercion}%</div>
        </div>
      </div>

      {fichasVista.length === 0 && (
        <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
          No hay fichas para este filtro.
        </div>
      )}
    </div>
  );
};
