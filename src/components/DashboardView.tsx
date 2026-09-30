import React from 'react';
import { 
  Users, 
  Calendar, 
  ArrowRight, 
  Download, 
  UploadCloud, 
  PlusCircle, 
  FileSpreadsheet,
  TrendingUp,
  ShieldCheck,
  GraduationCap,
  Clock,
  UserCheck,
  UserMinus,
  CheckCircle2
} from 'lucide-react';
import { Ficha, User, BloqueHorario, ActividadSeguimiento, RegionalCentro, RapSeguimiento, ResultadoAprendizaje, TrimestreCalendario } from '../types';
import { generarFormatoAsociacionFichas, generarFormatoEventos } from '../services/reportesOficialesService';
import { aplicarCalendarioABloques } from '../lib/calendarioTrimestres';
import { obtenerTrimestresDisponibles } from '../services/ambientesReporteService';
import { totalMatriculados } from '../lib/aprendices';

interface DashboardProps {
  currentUser: User;
  ficha: Ficha | null;
  allFichas: Ficha[];
  onNavigateTab: (tab: string) => void;
  onSelectFicha: (ficha: Ficha) => void;
  horarios: BloqueHorario[];
  actividades: ActividadSeguimiento[];
  centro: RegionalCentro;
  rapsSeguimiento?: RapSeguimiento[];
  raps?: ResultadoAprendizaje[];
  trimestresCalendario?: TrimestreCalendario[];
  onOpenModalCrearFicha?: () => void;
  onOpenEditarPrograma?: () => void;
}

export const DashboardView: React.FC<DashboardProps> = ({
  currentUser,
  ficha,
  allFichas,
  onNavigateTab,
  onSelectFicha,
  horarios,
  centro,
  rapsSeguimiento = [],
  raps = [],
  trimestresCalendario = [],
  onOpenModalCrearFicha
}) => {
  const [trimestreLider, setTrimestreLider] = React.useState<string>('');
  const [fichaCoord, setFichaCoord] = React.useState<string>('');
  const [trimestreCoord, setTrimestreCoord] = React.useState<string>('');
  const [asociacionTrimestreLider, setAsociacionTrimestreLider] = React.useState<string>('');
  const [asociacionTrimestreCoord, setAsociacionTrimestreCoord] = React.useState<string>('');

  // Mismo formato que la Matriz de Horarios ("AAAA-ROMANO", ej. "2026-III").
  const etiquetaTrimestre = (nombre: string): string => {
    const cal = trimestresCalendario.find(t => t.nombre === nombre);
    return cal ? `${nombre} (${cal.fechaInicio} a ${cal.fechaFin})` : nombre;
  };

  const handleDescargarAsociacion = (f: Ficha | null, trimestre: string = '') => {
    if (!f) {
      alert('Por favor registre o seleccione una ficha primero.');
      return;
    }

    if (trimestre) {
      const bloquesTrimestre = horarios.filter(h => h.fichaId === f.id && h.trimestre === trimestre);
      if (bloquesTrimestre.length === 0) {
        alert(`No hay bloques de horario programados para la ficha ${f.numero_ficha} en el trimestre ${trimestre}.`);
        return;
      }
      generarFormatoAsociacionFichas(f, [], { trimestre, bloquesTrimestre });
      return;
    }

    const seguimientoFicha = rapsSeguimiento.filter(s => s.fichaId === f.id || s.fichaNumero === f.numero_ficha);
    if (seguimientoFicha.filter(s => s.instructorNombre).length === 0) {
      alert('Esta ficha todavía no tiene instructores asignados por competencia en Seguimiento — no hay nada que exportar.');
      return;
    }
    generarFormatoAsociacionFichas(f, seguimientoFicha);
  };

  const handleDescargarEventos = (f: Ficha | null, trimestre: string) => {
    if (!f) {
      alert('Por favor registre o seleccione una ficha primero.');
      return;
    }
    if (!trimestre) {
      alert('Elige el trimestre que quieres exportar.');
      return;
    }
    const bloquesTrimestre = horarios.filter(h => h.fichaId === f.id && h.trimestre === trimestre);
    if (bloquesTrimestre.length === 0) {
      alert(`No hay bloques de horario programados para la ficha ${f.numero_ficha} en el trimestre ${trimestre}.`);
      return;
    }
    const catalogoRapsPrograma = raps.filter(r => r.programaCodigo === f.programaCodigo);
    generarFormatoEventos(f, centro, aplicarCalendarioABloques(bloquesTrimestre, trimestresCalendario), catalogoRapsPrograma, etiquetaTrimestre(trimestre)).then(resultado => {
      if (resultado.festivosTotalesExcluidos > 0) {
        alert(`Reporte generado. Se excluyeron ${resultado.festivosTotalesExcluidos} ocurrencia(s) por caer en día festivo colombiano.`);
      }
    });
  };

  // =========================================================================
  // VISTA 1: AUXILIAR OPERATIVO (Solo acceso directo a sus opciones principales)
  // =========================================================================
  if (currentUser.rol === 'AUXILIAR') {
    return (
      <div className="space-y-6 pb-12 animate-in fade-in duration-200">
        {/* Encabezado Despejado */}
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Panel Operativo • Auxiliar de Registro
          </div>
          <h1 className="text-2xl font-black text-[#111C2D] tracking-tight">
            Accesos Directos Principales
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Selecciona la herramienta que requieres utilizar para la jornada operativa de hoy.
          </p>
        </div>

        {/* 3 Tarjetas de Acceso Directo Principales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Opción 1: Matriz de Horarios */}
          <div 
            onClick={() => onNavigateTab('horarios')}
            className="group bg-white rounded-3xl p-6 border border-slate-200/90 hover:border-emerald-500 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#0D631B] border border-emerald-200/80 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#111C2D] group-hover:text-[#0D631B] transition-colors">
                Matriz de Horarios
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Gestionar la programación semanal de bloques de clase, asignar ambientes de formación e instructores sin cruces.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-[#0D631B] flex items-center space-x-1">
                <span>Abrir Horarios</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                {allFichas.length} Fichas
              </span>
            </div>
          </div>

          {/* Opción 2: Seguimiento Curricular */}
          <div 
            onClick={() => onNavigateTab('seguimiento')}
            className="group bg-white rounded-3xl p-6 border border-slate-200/90 hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#005A8C] border border-blue-200/80 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#111C2D] group-hover:text-[#005A8C] transition-colors">
                Seguimiento Curricular (F001)
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Consultar novedades operativas, verificar horas ejecutadas y revisar el estado de juicios evaluativos por ficha.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-[#005A8C] flex items-center space-x-1">
                <span>Abrir Seguimiento</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Formato Oficial
              </span>
            </div>
          </div>

          {/* Opción 3: Carga de Plantillas Excel */}
          <div 
            onClick={() => onNavigateTab('ingesta')}
            className="group bg-white rounded-3xl p-6 border border-slate-200/90 hover:border-purple-500 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#6F43C0] border border-purple-200/80 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#111C2D] group-hover:text-[#6F43C0] transition-colors">
                Cargar Plantillas Excel
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Importar archivos oficiales (GPFI-F-134 o matrices de horarios) para actualizar el sistema en lote.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-[#6F43C0] flex items-center space-x-1">
                <span>Subir Archivo</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Importador
              </span>
            </div>
          </div>
        </div>

        {/* Barra de Estado Operativo */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#0D631B] flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900">Estado de la Matriz de Ambientes</div>
              <div className="text-slate-500">0 Cruces o solapamientos detectados en la programación</div>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-slate-400 font-mono text-[11px]">
            <span>{centro.centro}</span>
            <span>•</span>
            <span>{centro.regional}</span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VISTA 2: INSTRUCTOR LÍDER (Solo la información de sus programas)
  // =========================================================================
  if (currentUser.rol === 'INSTRUCTOR_LIDER') {
    // Fichas del instructor
    const fichasInstructor = allFichas.filter(f => 
      f.instructorLiderId === currentUser.id || 
      f.id === currentUser.fichaAsignadaId || 
      f.instructorLiderEmail === currentUser.correo
    );
    const fichaLider = fichasInstructor.length > 0 ? fichasInstructor[0] : ficha;

    if (!fichaLider) {
      return (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-4 max-w-xl mx-auto mt-10">
          <div className="w-12 h-12 bg-emerald-50 text-[#0D631B] rounded-2xl flex items-center justify-center mx-auto">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Aún no tienes una ficha asignada</h2>
          <p className="text-xs text-slate-500">
            El Administrador del Sistema te asignará tu ficha de formación una vez sea registrada en la plataforma.
          </p>
          <button
            onClick={() => onNavigateTab('avance-fichas')}
            className="px-4 py-2 bg-[#0D631B] text-white text-xs font-bold rounded-xl shadow-xs"
          >
            Ver Fichas del Centro
          </button>
        </div>
      );
    }

    // Horarios de su ficha
    const horariosFicha = horarios.filter(h => h.fichaId === fichaLider.id);

    return (
      <div className="space-y-6 pb-12 animate-in fade-in duration-200">
        {/* Encabezado Instructor */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold text-[#0D631B] uppercase tracking-wider">
              Panel de Instructor Líder
            </div>
            <h1 className="text-2xl font-black text-[#111C2D] tracking-tight">
              {fichaLider.programaNombre}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Ficha <strong className="text-slate-900">{fichaLider.numero_ficha}</strong> • Modalidad {fichaLider.modalidad} • {fichaLider.ambientePrincipal}
            </p>
          </div>

          {/* Acciones Rápidas del Líder */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onNavigateTab('avance-fichas')}
              className="flex items-center space-x-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-2 rounded-xl text-xs font-bold text-[#0D631B] shadow-xs transition-colors"
              title="Ver el avance e indicadores de todas las fichas del centro"
            >
              <TrendingUp className="w-4 h-4 text-[#0D631B]" />
              <span>Avance Fichas</span>
            </button>

            <div className="flex items-center space-x-1.5 bg-white border border-slate-200 rounded-xl px-1.5 py-1 shadow-xs">
              <select
                value={asociacionTrimestreLider}
                onChange={e => setAsociacionTrimestreLider(e.target.value)}
                className="text-xs font-bold text-slate-600 bg-transparent px-1.5 py-1 focus:outline-hidden max-w-32"
                title="Alcance del Formato de Asociación de Fichas"
              >
                <option value="">Total</option>
                {obtenerTrimestresDisponibles(horarios.filter(h => h.fichaId === fichaLider.id)).map(t => (
                  <option key={t} value={t}>{etiquetaTrimestre(t)}</option>
                ))}
              </select>
              <button
                onClick={() => handleDescargarAsociacion(fichaLider, asociacionTrimestreLider)}
                className="flex items-center space-x-2 bg-white hover:bg-slate-50 px-2.5 py-1.5 rounded-lg text-xs font-bold text-[#111C2D] transition-colors"
                title="Descargar el Formato oficial de Asociación de Fichas — Total o por trimestre"
              >
                <Download className="w-4 h-4 text-[#005A8C]" />
                <span>Asociación de Fichas</span>
              </button>
            </div>

            <div className="flex items-center space-x-1.5 bg-white border border-slate-200 rounded-xl px-1.5 py-1 shadow-xs">
              <select
                value={trimestreLider}
                onChange={e => setTrimestreLider(e.target.value)}
                className="text-xs font-bold text-slate-600 bg-transparent px-1.5 py-1 focus:outline-hidden max-w-40"
                title="Trimestre a exportar en el Reporte de Eventos"
              >
                <option value="">Trimestre...</option>
                {obtenerTrimestresDisponibles(horarios.filter(h => h.fichaId === fichaLider.id)).map(t => (
                  <option key={t} value={t}>{etiquetaTrimestre(t)}</option>
                ))}
              </select>
              <button
                onClick={() => handleDescargarEventos(fichaLider, trimestreLider)}
                className="flex items-center space-x-2 bg-white hover:bg-slate-50 px-2.5 py-1.5 rounded-lg text-xs font-bold text-[#111C2D] transition-colors"
                title="Descargar el Formato oficial de Reporte de Eventos"
              >
                <Download className="w-4 h-4 text-[#005A8C]" />
                <span>Reporte de Eventos</span>
              </button>
            </div>

            <button
              onClick={() => {
                onSelectFicha(fichaLider);
                onNavigateTab('seguimiento');
              }}
              className="flex items-center space-x-2 bg-[#0D631B] hover:bg-[#0a4d15] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm shadow-[#0D631B]/20 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Evaluar Juicios F001</span>
            </button>
          </div>
        </div>

        {/* Indicadores de SU Programa */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Card 1: Retención de su programa */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                Retención de Ficha
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#0D631B] flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-[#0D631B]">
              {fichaLider.tasaRetencion}%
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              {fichaLider.aprendicesActivos} activos de {totalMatriculados(fichaLider)} matriculados
            </p>
          </div>

          {/* Card 2: Deserción de su programa */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                Deserción Registrada
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <UserMinus className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {fichaLider.aprendicesCancelados || 0}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              Tasa del {fichaLider.tasaDesercion}% en el trimestre
            </p>
          </div>

          {/* Card 3: Avance Curricular */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                Avance Curricular
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#005A8C] flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-[#005A8C]">
              {fichaLider.progresoCurricular}%
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              {fichaLider.rapsEvaluados} de {fichaLider.rapsTotales} RAPs evaluados
            </p>
          </div>

          {/* Card 4: Horas Ejecutadas */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                Horas Ejecutadas
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#6F43C0] flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {fichaLider.horasEjecutadas}h
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              De {fichaLider.horasDirectasTotales} horas lectivas totales
            </p>
          </div>
        </div>

        {/* Sección: Horarios Semanales de la Ficha Asignada */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#111C2D]">
                Programación Semanal de la Ficha {fichaLider.numero_ficha}
              </h3>
              <p className="text-xs text-slate-500">
                Bloques horarios programados para esta cohorte en el periodo {fichaLider.periodoLectivo}
              </p>
            </div>
            <button
              onClick={() => {
                onSelectFicha(fichaLider);
                onNavigateTab('horarios');
              }}
              className="text-xs font-bold text-[#0D631B] hover:text-[#0a4d15] flex items-center space-x-1"
            >
              <span>Ver Matriz Completa</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {horariosFicha.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {horariosFicha.map((bloque) => (
                <div 
                  key={bloque.id} 
                  className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-[#0D631B] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                      {bloque.diaSemana}
                    </span>
                    <span className="font-mono text-[11px] text-slate-600 font-semibold">
                      {bloque.franja}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 line-clamp-1">
                    {bloque.competenciaNombre || 'Competencia Técnica de Formación'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                    {/* Siempre el ambiente ACTUAL de la ficha — nunca el que quedó
                        guardado en el bloque al crearlo, que puede estar desactualizado
                        si el ambiente de la ficha se corrigió después. */}
                    <span className="truncate max-w-[140px]">{fichaLider.ambientePrincipal || bloque.ambiente}</span>
                    <span className="font-medium text-slate-700 truncate">{bloque.instructorNombre}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200/60 text-xs text-slate-500">
              No hay bloques programados directamente para esta ficha en la semana actual.
            </div>
          )}
        </div>

        {/* Acceso a Indicadores de Todas las Fichas (Avance Fichas) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0D631B] flex items-center justify-center shrink-0 border border-emerald-200/60">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">
                Monitoreo de Indicadores y Avance de Fichas
              </div>
              <p className="text-[11px] text-slate-500">
                Consulte el desglose de matrícula, aprendices activos, tasa de retención y deserción de todas las {allFichas.length} fichas del centro.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('avance-fichas')}
            className="self-end sm:self-auto px-4 py-2 rounded-xl bg-[#0D631B] hover:bg-[#0a4d15] text-white text-xs font-bold flex items-center space-x-1.5 transition-colors shrink-0 shadow-xs"
          >
            <span>Ir a Avance Fichas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VISTA 3: COORDINADOR / ADMINISTRADOR
  // (Indicadores de deserción y retención por programas y total, sin sobrecarga)
  // =========================================================================

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Encabezado Estratégico */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Coordinación Académica • {centro.centro}
          </div>
          <h1 className="text-2xl font-black text-[#111C2D] tracking-tight">
            Indicadores de Retención y Deserción
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoreo consolidado de permanencia estudiantil y ejecución por programas de formación.
          </p>
        </div>

        {/* Acciones de Coordinador */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center space-x-1.5 bg-white border border-slate-200 rounded-xl px-1.5 py-1 shadow-xs">
            <select
              value={fichaCoord}
              onChange={e => { setFichaCoord(e.target.value); setTrimestreCoord(''); }}
              className="text-xs font-bold text-slate-600 bg-transparent px-1.5 py-1 focus:outline-hidden max-w-32"
              title="Ficha a exportar"
            >
              <option value="">Ficha...</option>
              {allFichas.map(f => (
                <option key={f.id} value={f.id}>{f.numero_ficha}</option>
              ))}
            </select>
            <select
              value={asociacionTrimestreCoord}
              onChange={e => setAsociacionTrimestreCoord(e.target.value)}
              className="text-xs font-bold text-slate-600 bg-transparent px-1.5 py-1 focus:outline-hidden max-w-28"
              title="Alcance del Formato de Asociación de Fichas"
            >
              <option value="">Total</option>
              {obtenerTrimestresDisponibles(horarios.filter(h => h.fichaId === fichaCoord)).map(t => (
                <option key={t} value={t}>{etiquetaTrimestre(t)}</option>
              ))}
            </select>
            <button
              id="btn-dash-asociacion-coord"
              onClick={() => handleDescargarAsociacion(allFichas.find(f => f.id === fichaCoord) || null, asociacionTrimestreCoord)}
              className="flex items-center space-x-2 bg-white hover:bg-slate-50 px-2.5 py-1.5 rounded-lg text-xs font-bold text-[#111C2D] transition-colors"
              title="Descargar el Formato oficial de Asociación de Fichas — Total o por trimestre"
            >
              <Download className="w-4 h-4 text-[#005A8C]" />
              <span>Asociación de Fichas</span>
            </button>
          </div>

          <div className="flex items-center space-x-1.5 bg-white border border-slate-200 rounded-xl px-1.5 py-1 shadow-xs">
            <select
              value={trimestreCoord}
              onChange={e => setTrimestreCoord(e.target.value)}
              className="text-xs font-bold text-slate-600 bg-transparent px-1.5 py-1 focus:outline-hidden max-w-40"
              title="Trimestre a exportar en el Reporte de Eventos"
            >
              <option value="">Trimestre...</option>
              {obtenerTrimestresDisponibles(horarios.filter(h => h.fichaId === fichaCoord)).map(t => (
                <option key={t} value={t}>{etiquetaTrimestre(t)}</option>
              ))}
            </select>
            <button
              id="btn-dash-f001-coord"
              onClick={() => handleDescargarEventos(allFichas.find(f => f.id === fichaCoord) || null, trimestreCoord)}
              className="flex items-center space-x-2 bg-white hover:bg-slate-50 px-2.5 py-1.5 rounded-lg text-xs font-bold text-[#111C2D] transition-colors"
              title="Descargar el Formato oficial de Reporte de Eventos"
            >
              <Download className="w-4 h-4 text-[#005A8C]" />
              <span>Reporte de Eventos</span>
            </button>
          </div>

          {onOpenModalCrearFicha && (
            <button
              id="btn-dash-crear-ficha-coord"
              onClick={onOpenModalCrearFicha}
              className="flex items-center space-x-2 bg-[#0D631B] hover:bg-[#0a4d15] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm shadow-[#0D631B]/20 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Nueva Ficha</span>
            </button>
          )}
        </div>
      </div>

      {/* Acceso a Indicadores de Todas las Fichas (Avance Fichas) — el desglose completo por programa
          ya vive en ese módulo, así que aquí solo se enlaza para no duplicar la información. */}
      {allFichas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs text-center">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#0D631B] flex items-center justify-center mx-auto">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div className="font-bold text-slate-800 text-sm">No hay fichas registradas actualmente</div>
            <p className="text-xs text-slate-500">
              Has iniciado con la base limpia para trabajar con datos reales. Puedes registrar la primera ficha académica de tu centro de formación.
            </p>
            {onOpenModalCrearFicha && (
              <button
                onClick={onOpenModalCrearFicha}
                className="px-4 py-2 bg-[#0D631B] hover:bg-[#0a4d15] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                + Registrar Primera Ficha
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0D631B] flex items-center justify-center shrink-0 border border-emerald-200/60">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">
                Monitoreo de Indicadores y Avance de Fichas
              </div>
              <p className="text-[11px] text-slate-500">
                Consulte el desglose de matrícula, aprendices activos, tasa de retención y deserción de todas las {allFichas.length} fichas del centro.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('avance-fichas')}
            className="self-end sm:self-auto px-4 py-2 rounded-xl bg-[#0D631B] hover:bg-[#0a4d15] text-white text-xs font-bold flex items-center space-x-1.5 transition-colors shrink-0 shadow-xs"
          >
            <span>Ir a Avance Fichas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
