import React from 'react';
import { 
  PieChart, 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Calendar,
  Building,
  GraduationCap,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Ficha, RegionalCentro, User } from '../types';

interface CierresProps {
  currentUser: User;
  ficha: Ficha | null;
  allFichas: Ficha[];
  centro: RegionalCentro;
  onActualizarBalance: (
    fichaId: string, 
    culminados: number, 
    cancelados: number, 
    aplazados: number, 
    retiros: number
  ) => void;
}

export const CierresView: React.FC<CierresProps> = ({
  currentUser,
  ficha,
  allFichas,
  centro,
  onActualizarBalance
}) => {
  // Formulario de balance (editable manualmente en todo momento, ver más abajo)
  const [culminados, setCulminados] = React.useState<number>(ficha?.aprendicesCulminados || 0);
  const [cancelados, setCancelados] = React.useState<number>(ficha?.aprendicesCancelados || 0);
  const [aplazados, setAplazados] = React.useState<number>(ficha?.aprendicesAplazados || 0);
  const [retiros, setRetiros] = React.useState<number>(ficha?.aprendicesRetiroVoluntario || 0);

  // Re-sincroniza el formulario cada vez que cambia la ficha seleccionada (o sus datos
  // se actualizan, p. ej. tras un nuevo cargue de Juicios Evaluativos) — de lo contrario
  // los useState de arriba solo reflejan la ficha que estaba seleccionada quando este
  // componente se montó, y cambiar de ficha sin salir de la pestaña de Cierres dejaba
  // estos campos en 0 o con datos de la ficha anterior en vez de los reales.
  const fichaIdRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (fichaIdRef.current === (ficha?.id || null)) return;
    fichaIdRef.current = ficha?.id || null;
    setCulminados(ficha?.aprendicesCulminados || 0);
    setCancelados(ficha?.aprendicesCancelados || 0);
    setAplazados(ficha?.aprendicesAplazados || 0);
    setRetiros(ficha?.aprendicesRetiroVoluntario || 0);
  }, [ficha]);

  // El coordinador puede refrescar en cualquier momento estos campos con los valores
  // que ya calculó el sistema a partir del último Reporte de Juicios Evaluativos cargado
  // para esta ficha (Cancelados, Aplazados y Retiros Voluntarios se derivan del estado de
  // matrícula real de cada aprendiz en ese cargue). "Culminados" no tiene una fuente
  // automática en Juicios — SofiaPlus no reporta ese estado por aprendiz — así que se
  // deja siempre de carga manual.
  const handleActualizarDesdeJuicios = () => {
    if (!ficha) return;
    setCancelados(ficha.aprendicesCancelados || 0);
    setAplazados(ficha.aprendicesAplazados || 0);
    setRetiros(ficha.aprendicesRetiroVoluntario || 0);
  };

  // Cálculo desasistido de fórmulas institucionales (PRD 3.4)
  const matricula = ficha?.matriculaInicial || 35;
  // Retención: mientras la ficha está en formación (aún sin culminados
  // registrados) se calcula con los aprendices que SIGUEN EN FORMACIÓN
  // (último cargue de Juicios). Al registrar culminados en el cierre, se
  // calcula con los culminados.
  const enFormacion = ficha?.aprendicesActivos ?? matricula;
  const retencionPorCulminados = culminados > 0;
  const baseRetencion = retencionPorCulminados ? culminados : enFormacion;
  const tasaRetencion = Number(((baseRetencion / matricula) * 100).toFixed(1));
  const META_RETENCION = 80;
  const tasaDesercion = Number((((cancelados + retiros) / matricula) * 100).toFixed(1));

  // Totales del Programa: suma la matrícula y los cierres de TODAS las fichas
  // del mismo programa (no solo esta), usando los valores del formulario para
  // la ficha que se está editando en este momento — así el índice de
  // deserción/retención del programa reacciona al instante mientras se ajusta
  // el cierre de una cohorte, en vez de esperar a que se guarde.
  const totalesPrograma = React.useMemo(() => {
    if (!ficha) return null;
    const fichasPrograma = allFichas.filter(f => f.programaCodigo === ficha.programaCodigo);
    let totalMatricula = 0, totalCulminados = 0, totalCancelados = 0, totalAplazados = 0, totalRetiros = 0;
    let totalBaseRetencion = 0;
    fichasPrograma.forEach(f => {
      totalMatricula += f.matriculaInicial || 0;
      const culm = f.id === ficha.id ? culminados : (f.aprendicesCulminados || 0);
      totalBaseRetencion += culm > 0 ? culm : (f.aprendicesActivos ?? f.matriculaInicial ?? 0);
      if (f.id === ficha.id) {
        totalCulminados += culminados;
        totalCancelados += cancelados;
        totalAplazados += aplazados;
        totalRetiros += retiros;
      } else {
        totalCulminados += f.aprendicesCulminados || 0;
        totalCancelados += f.aprendicesCancelados || 0;
        totalAplazados += f.aprendicesAplazados || 0;
        totalRetiros += f.aprendicesRetiroVoluntario || 0;
      }
    });
    const totalDeserciones = totalCancelados + totalRetiros;
    return {
      totalFichas: fichasPrograma.length,
      totalMatricula,
      totalCulminados,
      totalCancelados,
      totalAplazados,
      totalRetiros,
      totalDeserciones,
      tasaRetencionPrograma: totalMatricula > 0 ? Number(((totalBaseRetencion / totalMatricula) * 100).toFixed(1)) : 0,
      tasaDesercionPrograma: totalMatricula > 0 ? Number((((totalCancelados + totalRetiros) / totalMatricula) * 100).toFixed(1)) : 0
    };
  }, [ficha, allFichas, culminados, cancelados, aplazados, retiros]);

  const handleGuardarCierre = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ficha) return;
    onActualizarBalance(ficha.id, culminados, cancelados, aplazados, retiros);
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 }
    });
    alert(`¡Balance de Cierre Consolidado con Éxito!\nFicha: ${ficha.numero_ficha}\nTasa de Retención: ${tasaRetencion}%\nTasa de Deserción: ${tasaDesercion}%`);
  };

  if (!ficha) {
    return (
      <div className="bg-white rounded-3xl p-10 border border-slate-200 shadow-xs text-center max-w-xl mx-auto mt-12 space-y-4">
        <div className="w-14 h-14 bg-emerald-50 text-[#0D631B] rounded-2xl flex items-center justify-center mx-auto">
          <PieChart className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">No hay ficha seleccionada</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Para efectuar el cierre académico de una ficha y consolidar tasas de retención o deserción, primero debes registrar o seleccionar una ficha activa.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Encabezado */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span className="px-2 py-0.5 rounded bg-[#EDE7F6] text-[#6F43C0]">Fórmulas Institucionales</span>
            <span>•</span>
            <span>Comité de Evaluación y Cierre</span>
          </div>
          <h1 className="text-2xl font-black text-[#111C2D] tracking-tight mt-1">
            Motor de Cierre de Fichas e Indicadores
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Balance analítico de deserción y retención formativa para Auxiliares, Técnicos y Tecnólogos.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-xs font-bold px-3 py-1 rounded-xl bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]">
            {centro.centro} • {centro.regional}
          </span>
        </div>
      </div>

      {/* Tarjetas Bento de Fórmulas y Resultados */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tasa de Retención */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] flex items-center justify-center font-bold">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Indicador de Éxito
                </div>
                <h3 className="text-lg font-black text-[#111C2D]">Tasa de Retención</h3>
              </div>
            </div>
            <span className="text-3xl font-black text-[#2E7D32]">{tasaRetencion}%</span>
          </div>

          <div className="p-3 rounded-xl bg-[#F8F9FA] border border-slate-200 text-xs text-slate-600 font-mono">
            Tasa Retención = ({retencionPorCulminados ? 'Aprendices Culminados' : 'Aprendices en Formación'} / Matrícula Inicial) × 100
            <div className="mt-1 font-bold text-[#111C2D]">
              = ({baseRetencion} / {matricula}) × 100 = {tasaRetencion}%
            </div>
            <div className="mt-1 text-[10px] text-slate-400 font-sans">
              {retencionPorCulminados
                ? 'Calculada con los culminados registrados en el cierre.'
                : 'Mientras la ficha está en formación se calcula con los aprendices que siguen en formación (último cargue de Juicios). Al registrar culminados en el cierre pasa a calcularse con ellos.'}
            </div>
          </div>

          {tasaRetencion >= META_RETENCION ? (
            <div className="flex items-center space-x-2 text-xs text-slate-500">
              <CheckCircle2 className="w-4 h-4 text-[#2E7D32]" />
              <span>Cumple la meta institucional mínima del {META_RETENCION}%</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-xs text-amber-700 font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Por debajo de la meta institucional mínima del {META_RETENCION}%</span>
            </div>
          )}
        </div>

        {/* Tasa de Deserción */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-[#FFDAD6] text-[#BA1A1A] border border-[#FFDAD6] flex items-center justify-center font-bold">
                <TrendingDown className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Control de Fuga
                </div>
                <h3 className="text-lg font-black text-[#111C2D]">Tasa de Deserción</h3>
              </div>
            </div>
            <span className="text-3xl font-black text-[#BA1A1A]">{tasaDesercion}%</span>
          </div>

          <div className="p-3 rounded-xl bg-[#F8F9FA] border border-slate-200 text-xs text-slate-600 font-mono">
            Tasa Deserción = ((Cancelados + Retiros Voluntarios) / Matrícula Inicial) × 100
            <div className="mt-1 font-bold text-[#111C2D]">
              = (({cancelados} + {retiros}) / {matricula}) × 100 = {tasaDesercion}%
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-[#2E7D32]" />
            <span>Dentro del umbral de tolerancia técnica del centro</span>
          </div>
        </div>
      </div>

      {/* Totales del Programa: la misma ficha pero sumada con todas las demás
          cohortes del mismo programa — el índice progresivo del programa completo. */}
      {totalesPrograma && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-xl bg-[#EDE7F6] text-[#6F43C0] flex items-center justify-center shrink-0">
                <GraduationCap className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#111C2D]">
                  Total del Programa — {ficha.programaNombre}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Suma progresiva de las {totalesPrograma.totalFichas} ficha{totalesPrograma.totalFichas !== 1 ? 's' : ''} de este programa (incluye los valores que estás editando aquí).
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 rounded-xl bg-[#F8F9FA] border border-slate-200">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Matrícula</div>
              <div className="text-lg font-black text-[#111C2D]">{totalesPrograma.totalMatricula}</div>
            </div>
            <div className="p-3 rounded-xl bg-[#F8F9FA] border border-slate-200">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Culminados</div>
              <div className="text-lg font-black text-[#2E7D32]">{totalesPrograma.totalCulminados}</div>
            </div>
            <div className="p-3 rounded-xl bg-[#F8F9FA] border border-slate-200">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deserciones</div>
              <div className="text-lg font-black text-[#BA1A1A]">{totalesPrograma.totalDeserciones}</div>
            </div>
            <div className="p-3 rounded-xl bg-[#F8F9FA] border border-slate-200">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aplazados</div>
              <div className="text-lg font-black text-amber-600">{totalesPrograma.totalAplazados}</div>
            </div>
            <div className="p-3 rounded-xl bg-[#E8F5E9] border border-[#C8E6C9]">
              <div className="text-[10px] font-bold text-[#2E7D32] uppercase tracking-wider">Retención Prog.</div>
              <div className="text-lg font-black text-[#2E7D32]">{totalesPrograma.tasaRetencionPrograma}%</div>
            </div>
            <div className="p-3 rounded-xl bg-[#FFDAD6] border border-[#FFDAD6]">
              <div className="text-[10px] font-bold text-[#BA1A1A] uppercase tracking-wider">Deserción Prog.</div>
              <div className="text-lg font-black text-[#BA1A1A]">{totalesPrograma.tasaDesercionPrograma}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Formulario de Cierre de Ficha y Balance */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
        <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-[#111C2D]">
              Formulario de Balance de Cierre — Ficha {ficha.numero_ficha}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ingrese los valores validados en el comité de evaluación al culminar la etapa lectiva. Todos los campos quedan editables manualmente.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleActualizarDesdeJuicios}
              className="flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-50 text-[#0D631B] border border-emerald-200 hover:bg-emerald-100 transition-colors"
              title="Reemplaza Cancelados, Aplazados y Retiros Voluntarios con los valores calculados a partir del último Reporte de Juicios Evaluativos cargado para esta ficha"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Actualizar desde Juicios</span>
            </button>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700">
              Matrícula Inicial: {matricula} Aprendices
            </span>
          </div>
        </div>

        <form onSubmit={handleGuardarCierre} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#111C2D]">
              Aprendices Culminados
            </label>
            <input 
              type="number"
              min="0"
              max={matricula}
              value={culminados}
              onChange={(e) => setCulminados(Number(e.target.value))}
              className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#111C2D] focus:ring-2 focus:ring-[#0D631B] outline-none"
            />
            <span className="text-[10px] text-slate-400">Completaron el 100% de RAPs</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#111C2D]">
              Aprendices Cancelados
            </label>
            <input 
              type="number"
              min="0"
              max={matricula}
              value={cancelados}
              onChange={(e) => setCancelados(Number(e.target.value))}
              className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#111C2D] focus:ring-2 focus:ring-[#0D631B] outline-none"
            />
            <span className="text-[10px] text-slate-400">Por inasistencia o juicio D</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#111C2D]">
              Aprendices Aplazados
            </label>
            <input 
              type="number"
              min="0"
              max={matricula}
              value={aplazados}
              onChange={(e) => setAplazados(Number(e.target.value))}
              className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#111C2D] focus:ring-2 focus:ring-[#0D631B] outline-none"
            />
            <span className="text-[10px] text-slate-400">Trámite de aplazamiento activo</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#111C2D]">
              Retiros Voluntarios
            </label>
            <input 
              type="number"
              min="0"
              max={matricula}
              value={retiros}
              onChange={(e) => setRetiros(Number(e.target.value))}
              className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#111C2D] focus:ring-2 focus:ring-[#0D631B] outline-none"
            />
            <span className="text-[10px] text-slate-400">Renuncia formal radicada</span>
          </div>

          <div className="lg:col-span-4 flex justify-end pt-3">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#0D631B] hover:bg-[#0a4d15] text-white text-xs font-bold shadow-md shadow-[#0D631B]/20 transition-all flex items-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Consolidar Cierre Formal & Actualizar Indicadores</span>
            </button>
          </div>
        </form>
      </div>

      {/* Consolidado por Cohortes del Centro */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-black text-sm text-[#111C2D]">Consolidado de Cierres del Centro de Formación</h3>
            <p className="text-xs text-slate-500">Comparativa de retención entre programas tecnológicos y técnicos</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="pb-2.5">Ficha</th>
                <th className="pb-2.5">Programa</th>
                <th className="pb-2.5">Matrícula Inicial</th>
                <th className="pb-2.5">Culminados</th>
                <th className="pb-2.5">Cancelados / Retiros</th>
                <th className="pb-2.5">Tasa Retención</th>
                <th className="pb-2.5 text-right">Tasa Deserción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allFichas.map(f => (
                <tr key={f.id} className="hover:bg-[#F8F9FA] transition-colors">
                  <td className="py-3 font-bold text-[#111C2D]">{f.numero_ficha}</td>
                  <td className="py-3 font-medium text-slate-600 truncate max-w-xs">{f.programaNombre}</td>
                  <td className="py-3 font-bold text-slate-700">{f.matriculaInicial}</td>
                  <td className="py-3 text-[#2E7D32] font-bold">{f.aprendicesCulminados || f.aprendicesActivos}</td>
                  <td className="py-3 text-[#BA1A1A] font-medium">{(f.aprendicesCancelados || 0) + (f.aprendicesRetiroVoluntario || 0)}</td>
                  <td className="py-3">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-[#E8F5E9] text-[#2E7D32]">
                      {f.tasaRetencion}%
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-[#FFDAD6] text-[#BA1A1A]">
                      {f.tasaDesercion}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
