import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  UserCheck, 
  UserMinus, 
  CheckCircle2, 
  Clock, 
  Download, 
  FileSpreadsheet, 
  Building2, 
  Award, 
  ChevronDown, 
  ChevronUp, 
  TrendingUp, 
  Users,
  Calendar,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { ReporteJuiciosFicha, AprendizJuicio, JuicioDetalle } from '../types';
import * as XLSX from 'xlsx';

interface ModalJuiciosEvaluativosProps {
  isOpen: boolean;
  onClose: () => void;
  reporte: ReporteJuiciosFicha | null;
  onSincronizarFicha?: (reporte: ReporteJuiciosFicha) => void;
}

export const ModalJuiciosEvaluativos: React.FC<ModalJuiciosEvaluativosProps> = ({
  isOpen,
  onClose,
  reporte,
  onSincronizarFicha
}) => {
  // Por manejo de datos personales este modal muestra SOLO totales: no hay
  // listado de aprendices (nombres/documentos) ni búsqueda por aprendiz.
  const [activeSubTab, setActiveSubTab] = useState<'COMPETENCIAS' | 'METADATA'>('COMPETENCIAS');

  if (!isOpen || !reporte) return null;

  // Exportar a Excel: consolidado de totales (sin nombres ni documentos)
  const handleExportarExcel = () => {
    const wsData: any[][] = [
      [`CONSOLIDADO DE JUICIOS EVALUATIVOS SOFIAPLUS - FICHA ${reporte.fichaNumero}`],
      [`PROGRAMA: ${reporte.metadata.programaCodigo} - ${reporte.metadata.programaDenominacion}`],
      [`FECHA DEL REPORTE: ${reporte.metadata.fechaReporte}`],
      [],
      ['TOTALES DE LA FICHA'],
      ['Aprendices', reporte.totalAprendices],
      ['En formación', reporte.aprendicesActivos],
      ['Retiro voluntario', reporte.aprendicesRetiroVoluntario],
      ['Cancelados', reporte.aprendicesCancelados],
      ['Aplazados', reporte.aprendicesAplazados || 0],
      ['Condicionados', reporte.aprendicesCondicionados || 0],
      ['Trasladados', reporte.aprendicesTrasladados || 0],
      ['Juicios registrados', reporte.totalRegistros],
      ['Juicios aprobados', reporte.totalJuiciosAprobados],
      ['Juicios por evaluar', reporte.totalJuiciosPorEvaluar],
      ['% aprobación', `${reporte.porcentajeAprobacionFicha}%`],
      [],
      ['COMPETENCIA', 'TOTAL JUICIOS', 'APROBADOS', 'POR EVALUAR', '% AVANCE']
    ];
    reporte.competenciasEvaluadas.forEach(c => {
      wsData.push([c.nombre, c.totalJuicios, c.aprobados, c.porEvaluar, `${c.porcentaje}%`]);
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 70 }, { wch: 14 }, { wch: 12 }, { wch: 13 }, { wch: 11 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Consolidado');
    XLSX.writeFile(wb, `Consolidado_Juicios_Ficha_${reporte.fichaNumero}.xlsx`);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-5xl w-full p-5 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] border border-slate-200">
        {/* Cabecera del Modal */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4 shrink-0">
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#0D631B] text-xs font-black font-mono">
                Ficha {reporte.fichaNumero}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-bold text-slate-500">
                {reporte.metadata.programaCodigo} - {reporte.metadata.programaDenominacion}
              </span>
              <span className="text-slate-300">•</span>
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 text-[10px] font-bold">
                {reporte.metadata.estadoFicha || 'EN EJECUCION'}
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-black text-[#111C2D] mt-1 flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5 text-[#0D631B]" />
              <span>Reporte de Juicios Evaluativos por Ficha</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cotejo oficial de aprobaciones SofiaPlus, estados de matrícula y avance de resultados de aprendizaje.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportarExcel}
              className="p-2 rounded-xl text-slate-600 hover:text-[#0D631B] hover:bg-slate-100 transition-colors"
              title="Descargar consolidado de totales en Excel"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Resumen de Métricas Bento Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 shrink-0">
          {/* Matrícula y Estados */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aprendices Ficha</div>
            <div className="text-2xl font-black text-[#111C2D] mt-0.5">{reporte.totalAprendices}</div>
            <div className="flex items-center space-x-1.5 mt-1 text-[10px] font-bold">
              <span className="text-[#0D631B]">{reporte.aprendicesActivos} Activos</span>
              <span>•</span>
              <span className="text-rose-600">{reporte.aprendicesRetiroVoluntario} Retiros</span>
            </div>
          </div>

          {/* Retención vs Deserción */}
          <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200">
            <div className="text-[10px] font-bold text-[#0D631B] uppercase tracking-wider">Retención Oficial</div>
            <div className="text-2xl font-black text-[#0D631B] mt-0.5">
              {reporte.totalAprendices > 0 ? ((reporte.aprendicesActivos / reporte.totalAprendices) * 100).toFixed(1) : 0}%
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              Deserción: {reporte.totalAprendices > 0 ? ((reporte.aprendicesRetiroVoluntario / reporte.totalAprendices) * 100).toFixed(1) : 0}%
            </div>
          </div>

          {/* Juicios Evaluados */}
          <div className="p-3 bg-sky-50/70 rounded-2xl border border-sky-200">
            <div className="text-[10px] font-bold text-sky-800 uppercase tracking-wider">Aprobación General</div>
            <div className="text-2xl font-black text-[#005A8C] mt-0.5">{reporte.porcentajeAprobacionFicha}%</div>
            <div className="text-[10px] text-slate-500 mt-1">
              {reporte.totalJuiciosAprobados} de {reporte.totalRegistros} juicios
            </div>
          </div>

          {/* Por Evaluar */}
          <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200">
            <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Por Evaluar</div>
            <div className="text-2xl font-black text-amber-900 mt-0.5">{reporte.totalJuiciosPorEvaluar}</div>
            <div className="text-[10px] text-amber-700 mt-1">
              {reporte.competenciasEvaluadas.length} competencias reportadas
            </div>
          </div>
        </div>

        {/* Resumen de Estados de Matrícula (solo conteos) */}
        <div className="flex flex-wrap items-center gap-1.5 my-2 shrink-0 text-[11px] font-bold">
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">Total ({reporte.totalAprendices})</span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-[#0D631B] border border-emerald-200">En Formación ({reporte.aprendicesActivos})</span>
          {Boolean(reporte.aprendicesCancelados) && (
            <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">Cancelados ({reporte.aprendicesCancelados})</span>
          )}
          {Boolean(reporte.aprendicesAplazados) && (
            <span className="px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 border border-orange-200">Aplazados ({reporte.aprendicesAplazados})</span>
          )}
          {Boolean(reporte.aprendicesRetiroVoluntario) && (
            <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">Retiro Voluntario ({reporte.aprendicesRetiroVoluntario})</span>
          )}
          {Boolean(reporte.aprendicesCondicionados) && (
            <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">Condicionados ({reporte.aprendicesCondicionados})</span>
          )}
          {Boolean(reporte.aprendicesTrasladados) && (
            <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">Trasladados ({reporte.aprendicesTrasladados})</span>
          )}
        </div>

        {/* Pestañas Secundarias */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2 shrink-0">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setActiveSubTab('COMPETENCIAS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'COMPETENCIAS'
                  ? 'bg-[#111C2D] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Desglose por Competencia ({reporte.competenciasEvaluadas.length})
            </button>
            <button
              onClick={() => setActiveSubTab('METADATA')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'METADATA'
                  ? 'bg-[#111C2D] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Datos Ficha SofiaPlus
            </button>
          </div>

          {onSincronizarFicha && (
            <button
              onClick={() => onSincronizarFicha(reporte)}
              className="px-3 py-1.5 bg-[#0D631B] hover:bg-[#0a4d15] text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Sincronizar Ficha</span>
            </button>
          )}
        </div>

        {/* Contenido según pestaña */}
        <div className="flex-1 overflow-y-auto pt-3 pr-1">
          {activeSubTab === 'COMPETENCIAS' && (
            <div className="space-y-2.5">
              <div className="text-xs text-slate-500 font-medium">
                Desglose de avance evaluativo por competencia de formación en la ficha:
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {reporte.competenciasEvaluadas.map((comp, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs text-slate-800 leading-snug">
                          {comp.nombre}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {comp.aprobados} aprobados • {comp.porEvaluar} por evaluar ({comp.totalJuicios} total evaluaciones)
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-base font-black text-[#0D631B]">{comp.porcentaje}%</span>
                        <div className="text-[9px] text-slate-400 font-bold uppercase">Avance</div>
                      </div>
                    </div>

                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                      <div 
                        className="h-full bg-[#0D631B] transition-all duration-300"
                        style={{ width: `${comp.porcentaje}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSubTab === 'METADATA' && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
              <div className="font-bold text-slate-800 text-xs border-b border-slate-200 pb-2">
                Cabecera Oficial Registrada en SofiaPlus:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Ficha de Caracterización</span>
                  <span className="font-bold text-slate-900">{reporte.metadata.fichaNumero}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Programa de Formación</span>
                  <span className="font-bold text-slate-900">{reporte.metadata.programaCodigo} - {reporte.metadata.programaDenominacion}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Estado de la Ficha</span>
                  <span className="font-bold text-emerald-800">{reporte.metadata.estadoFicha}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Modalidad de Formación</span>
                  <span className="font-bold text-slate-900">{reporte.metadata.modalidad}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Período de Ejecución</span>
                  <span className="font-bold text-slate-900">{reporte.metadata.fechaInicio} al {reporte.metadata.fechaFin}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Fecha del Reporte</span>
                  <span className="font-bold text-slate-900">{reporte.metadata.fechaReporte}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Regional</span>
                  <span className="font-bold text-slate-900">{reporte.metadata.regional}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Centro de Formación</span>
                  <span className="font-bold text-slate-900">{reporte.metadata.centroFormacion}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pie del Modal */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400 font-mono">
            Reporte: {reporte.archivoNombre}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
