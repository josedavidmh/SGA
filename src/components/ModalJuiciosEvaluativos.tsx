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
  const [activeSubTab, setActiveSubTab] = useState<'APRENDICES' | 'COMPETENCIAS' | 'METADATA'>('APRENDICES');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'EN_FORMACION' | 'CANCELADO' | 'APLAZADO' | 'RETIRO_VOLUNTARIO' | 'CONDICIONADO' | 'TRASLADO'>('TODOS');
  const [filtroAvance, setFiltroAvance] = useState<'TODOS' | 'COMPLETOS' | 'PENDIENTES'>('TODOS');
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [filtroJuicioEstado, setFiltroJuicioEstado] = useState<'TODOS' | 'APROBADO' | 'POR_EVALUAR'>('TODOS');

  if (!isOpen || !reporte) return null;

  // Filtrado de aprendices
  const aprendicesFiltrados = useMemo(() => {
    return reporte.aprendices.filter(a => {
      const est = (a.estadoMatricula || '').toUpperCase();

      // Filtro de estado
      if (filtroEstado === 'EN_FORMACION') {
        if (!est.includes('FORMAC') && !est.includes('INDUCC')) return false;
      } else if (filtroEstado === 'CANCELADO') {
        if (!est.includes('CANCELAD')) return false;
      } else if (filtroEstado === 'APLAZADO') {
        if (!est.includes('APLAZAD')) return false;
      } else if (filtroEstado === 'RETIRO_VOLUNTARIO') {
        if (!est.includes('RETIRO')) return false;
      } else if (filtroEstado === 'CONDICIONADO') {
        if (!est.includes('CONDICIONAD')) return false;
      } else if (filtroEstado === 'TRASLADO') {
        if (!est.includes('TRASLAD')) return false;
      }

      // Filtro de avance
      if (filtroAvance === 'COMPLETOS' && a.porcentajeAvance < 100) return false;
      if (filtroAvance === 'PENDIENTES' && a.porcentajeAvance === 100) return false;

      // Filtro de texto
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const coincideDoc = a.documento.includes(term);
        const coincideNombre = a.nombresApellidos.toLowerCase().includes(term);
        return coincideDoc || coincideNombre;
      }

      return true;
    });
  }, [reporte.aprendices, filtroEstado, filtroAvance, searchTerm]);

  // Exportar a Excel
  const handleExportarExcel = () => {
    const wsData: any[][] = [
      ['SERVICIO NACIONAL DE APRENDIZAJE - SENA'],
      [`REPORTE DE JUICIOS EVALUATIVOS SOFIAPLUS - FICHA ${reporte.fichaNumero}`],
      [`PROGRAMA: ${reporte.metadata.programaCodigo} - ${reporte.metadata.programaDenominacion}`],
      [`FECHA DEL REPORTE: ${reporte.metadata.fechaReporte}`],
      [],
      [
        'TIPO DOC',
        'DOCUMENTO',
        'APRENDIZ',
        'ESTADO MATRICULA',
        'COMPETENCIA',
        'RESULTADO DE APRENDIZAJE',
        'JUICIO EVALUATIVO',
        'FECHA EVALUACIÓN',
        'FUNCIONARIO EVALUADOR'
      ]
    ];

    reporte.aprendices.forEach(apr => {
      apr.juicios.forEach(j => {
        wsData.push([
          apr.tipoDocumento,
          apr.documento,
          apr.nombresApellidos,
          apr.estadoMatricula,
          j.competenciaDenominacion,
          j.rapDenominacion,
          j.estado,
          j.fechaEvaluacion || 'Pendiente',
          j.funcionarioEvaluador || '-'
        ]);
      });
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Juicios Evaluativos');
    XLSX.writeFile(wb, `Juicios_Evaluativos_Ficha_${reporte.fichaNumero}.xlsx`);
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
              title="Descargar consolidado en Excel"
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

        {/* Resumen de Estados de Matrícula Chips */}
        <div className="flex flex-wrap items-center gap-1.5 my-2 shrink-0">
          <button
            onClick={() => setFiltroEstado('TODOS')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
              filtroEstado === 'TODOS' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({reporte.totalAprendices})
          </button>
          <button
            onClick={() => setFiltroEstado('EN_FORMACION')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
              filtroEstado === 'EN_FORMACION' ? 'bg-[#0D631B] text-white' : 'bg-emerald-50 text-[#0D631B] border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            En Formación ({reporte.aprendicesActivos})
          </button>
          {Boolean(reporte.aprendicesCancelados) && (
            <button
              onClick={() => setFiltroEstado('CANCELADO')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                filtroEstado === 'CANCELADO' ? 'bg-rose-700 text-white' : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              Cancelados ({reporte.aprendicesCancelados})
            </button>
          )}
          {Boolean(reporte.aprendicesAplazados) && (
            <button
              onClick={() => setFiltroEstado('APLAZADO')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                filtroEstado === 'APLAZADO' ? 'bg-orange-700 text-white' : 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100'
              }`}
            >
              Aplazados ({reporte.aprendicesAplazados})
            </button>
          )}
          {Boolean(reporte.aprendicesRetiroVoluntario) && (
            <button
              onClick={() => setFiltroEstado('RETIRO_VOLUNTARIO')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                filtroEstado === 'RETIRO_VOLUNTARIO' ? 'bg-amber-700 text-white' : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              Retiro Voluntario ({reporte.aprendicesRetiroVoluntario})
            </button>
          )}
          {Boolean(reporte.aprendicesCondicionados) && (
            <button
              onClick={() => setFiltroEstado('CONDICIONADO')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                filtroEstado === 'CONDICIONADO' ? 'bg-purple-700 text-white' : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
              }`}
            >
              Condicionados ({reporte.aprendicesCondicionados})
            </button>
          )}
          {Boolean(reporte.aprendicesTrasladados) && (
            <button
              onClick={() => setFiltroEstado('TRASLADO')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                filtroEstado === 'TRASLADO' ? 'bg-blue-700 text-white' : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
              }`}
            >
              Trasladados ({reporte.aprendicesTrasladados})
            </button>
          )}
        </div>

        {/* Pestañas Secundarias */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2 shrink-0">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setActiveSubTab('APRENDICES')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'APRENDICES'
                  ? 'bg-[#111C2D] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Aprendices y Calificaciones ({aprendicesFiltrados.length})
            </button>
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
          {activeSubTab === 'APRENDICES' && (
            <div className="space-y-3">
              {/* Barra de Búsqueda y Filtros */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar aprendiz por documento o nombre completo..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#111C2D] font-medium focus:outline-none focus:border-[#0D631B]"
                  />
                </div>

                <div className="flex items-center space-x-1.5 text-xs">
                  <select
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value as any)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                  >
                    <option value="TODOS">Todos los Estados</option>
                    <option value="EN_FORMACION">En Formación ({reporte.aprendicesActivos})</option>
                    {Boolean(reporte.aprendicesCancelados) && (
                      <option value="CANCELADO">Cancelados ({reporte.aprendicesCancelados})</option>
                    )}
                    {Boolean(reporte.aprendicesAplazados) && (
                      <option value="APLAZADO">Aplazados ({reporte.aprendicesAplazados})</option>
                    )}
                    {Boolean(reporte.aprendicesRetiroVoluntario) && (
                      <option value="RETIRO_VOLUNTARIO">Retiro Voluntario ({reporte.aprendicesRetiroVoluntario})</option>
                    )}
                    {Boolean(reporte.aprendicesCondicionados) && (
                      <option value="CONDICIONADO">Condicionados ({reporte.aprendicesCondicionados})</option>
                    )}
                    {Boolean(reporte.aprendicesTrasladados) && (
                      <option value="TRASLADO">Traslados ({reporte.aprendicesTrasladados})</option>
                    )}
                  </select>

                  <select
                    value={filtroJuicioEstado}
                    onChange={(e) => setFiltroJuicioEstado(e.target.value as any)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                  >
                    <option value="TODOS">Todos los Juicios</option>
                    <option value="APROBADO">Solo Aprobados</option>
                    <option value="POR_EVALUAR">Solo Por Evaluar</option>
                  </select>
                </div>
              </div>

              {/* Lista Acordeón de Aprendices */}
              <div className="space-y-2">
                {aprendicesFiltrados.map((apr) => {
                  const isExpanded = expandedDoc === apr.documento;
                  const juiciosMostrar = apr.juicios.filter(j => {
                    if (filtroJuicioEstado === 'APROBADO') return j.estado === 'APROBADO';
                    if (filtroJuicioEstado === 'POR_EVALUAR') return j.estado === 'POR EVALUAR';
                    return true;
                  });

                  return (
                    <div 
                      key={apr.documento}
                      className={`p-3 rounded-2xl border transition-all ${
                        apr.estadoMatricula === 'EN FORMACION'
                          ? 'bg-white border-slate-200/90 shadow-2xs hover:border-slate-300'
                          : 'bg-rose-50/40 border-rose-200/70 text-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start space-x-3 flex-1 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                            apr.estadoMatricula === 'EN FORMACION'
                              ? 'bg-[#E8F5E9] text-[#0D631B]'
                              : 'bg-rose-100 text-rose-700'
                          }`}>
                            {apr.tipoDocumento}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2 flex-wrap gap-y-0.5">
                              <span className="font-mono text-xs font-bold text-slate-800">
                                {apr.documento}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="font-black text-xs text-[#111C2D] truncate">
                                {apr.nombresApellidos}
                              </span>
                              <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold ${
                                apr.estadoMatricula === 'EN FORMACION'
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                  : 'bg-rose-100 text-rose-900 border border-rose-200'
                              }`}>
                                {apr.estadoMatricula}
                              </span>
                            </div>

                            {/* Barra de Avance de RAPs */}
                            <div className="mt-2 flex items-center space-x-3 max-w-md">
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                                <div 
                                  className={`h-full transition-all duration-300 ${
                                    apr.porcentajeAvance >= 80 
                                      ? 'bg-[#0D631B]' 
                                      : apr.porcentajeAvance >= 50 
                                      ? 'bg-blue-600' 
                                      : 'bg-amber-500'
                                  }`}
                                  style={{ width: `${apr.porcentajeAvance}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-bold text-slate-700 shrink-0 font-mono">
                                {apr.juiciosAprobados}/{apr.totalJuicios} ({apr.porcentajeAvance}%)
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Botón Acordeón para ver detalle de juicios */}
                        <button
                          type="button"
                          onClick={() => setExpandedDoc(isExpanded ? null : apr.documento)}
                          className="shrink-0 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center space-x-1.5 transition-colors"
                        >
                          <span>{apr.juicios.length} Juicios</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Acordeón de Juicios del Aprendiz */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 bg-slate-50/70 p-3 rounded-xl animate-in fade-in duration-150">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                            <span>Historial de Juicios Evaluativos en SofiaPlus ({juiciosMostrar.length}):</span>
                            <span className="text-[10px] text-slate-400">Verificado por Instructor</span>
                          </div>

                          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                            {juiciosMostrar.map((j) => (
                              <div 
                                key={j.id} 
                                className={`p-2 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] ${
                                  j.estado === 'APROBADO'
                                    ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                                    : 'bg-white border-slate-200 text-slate-700'
                                }`}
                              >
                                <div className="space-y-0.5 flex-1 min-w-0 pr-2">
                                  <div className="font-bold line-clamp-1">
                                    {j.rapDenominacion}
                                  </div>
                                  <div className="text-[10px] text-slate-500 line-clamp-1">
                                    {j.competenciaDenominacion}
                                  </div>
                                  {j.funcionarioEvaluador && (
                                    <div className="text-[9px] text-slate-600 font-medium">
                                      Evaluador: <strong>{j.funcionarioEvaluador}</strong> {j.fechaEvaluacion && `• ${j.fechaEvaluacion}`}
                                    </div>
                                  )}
                                </div>

                                <div className="shrink-0 flex items-center space-x-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                    j.estado === 'APROBADO'
                                      ? 'bg-[#0D631B] text-white shadow-2xs'
                                      : 'bg-amber-100 text-amber-900 border border-amber-200'
                                  }`}>
                                    {j.estado}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {aprendicesFiltrados.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                    No se encontraron aprendices con los filtros seleccionados.
                  </div>
                )}
              </div>
            </div>
          )}

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
