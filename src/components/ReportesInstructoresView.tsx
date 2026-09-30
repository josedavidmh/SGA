import React from 'react';
import { Users, Search, FileSpreadsheet, FileText, Calendar, Clock, ChevronDown, ChevronUp, ChevronsDown, ChevronsUp, AlertOctagon } from 'lucide-react';
import { User, Instructor, BloqueHorario, Ficha, DiaSemana, FranjaHorario } from '../types';
import { DIAS, FRANJAS } from './HorariosView';
import { exportarHorariosPorInstructorExcel, exportarHorariosPorInstructorPDF, obtenerBloquesVacantes } from '../services/horariosReporteService';
import { claveNombrePersona } from '../lib/nombresInstructor';

interface ReportesInstructoresViewProps {
  currentUser: User;
  instructores: Instructor[];
  horarios: BloqueHorario[];
  allFichas: Ficha[];
}

interface GrupoInstructor {
  instructorId: string;
  instructorNombre: string;
  bloques: BloqueHorario[];
}

const ORDEN_DIA: Record<DiaSemana, number> = { 'Lunes': 0, 'Martes': 1, 'Miércoles': 2, 'Jueves': 3, 'Viernes': 4, 'Sábado': 5 };
const ORDEN_FRANJA: Record<FranjaHorario, number> = FRANJAS.reduce((acc, f, i) => ({ ...acc, [f.franja]: i }), {} as Record<FranjaHorario, number>);

// Reporte del INSTRUCTOR, no de una ficha: reúne TODOS los bloques asignados a
// cada instructor en TODAS las fichas y programas donde tenga clase — por eso
// vive en el menú lateral como su propia sección, en vez de dentro de
// Horarios (que está acotado a una ficha a la vez).
export const ReportesInstructoresView: React.FC<ReportesInstructoresViewProps> = ({ instructores, horarios, allFichas }) => {
  const [busqueda, setBusqueda] = React.useState('');
  const [expandido, setExpandido] = React.useState<Record<string, boolean>>({});

  const fichasPorId = React.useMemo(() => {
    const mapa: Record<string, Ficha> = {};
    allFichas.forEach(f => { mapa[f.id] = f; });
    return mapa;
  }, [allFichas]);

  const grupos: GrupoInstructor[] = React.useMemo(() => {
    const mapa = new Map<string, GrupoInstructor>();
    // Los bloques VACANTES (programados, sin instructor todavía) no tienen a
    // quién agrupar — se muestran aparte, en "Espacios Vacantes" más abajo.
    // Se agrupa por PERSONA (nombre sin tildes, mayúsculas ni "Ing."), no por
    // id: así un mismo instructor que quedó con dos registros o escrito
    // distinto ("José David…" / "JOSE DAVID…") sale una sola vez.
    horarios.filter(b => b.instructorId).forEach(b => {
      const key = claveNombrePersona(b.instructorNombre || '') || b.instructorId!;
      if (!mapa.has(key)) {
        const enPlanta = instructores.find(i => i.id === b.instructorId);
        mapa.set(key, { instructorId: key, instructorNombre: enPlanta?.nombreCompleto || b.instructorNombre || 'Instructor', bloques: [] });
      }
      mapa.get(key)!.bloques.push(b);
    });
    return Array.from(mapa.values()).sort((a, b) => a.instructorNombre.localeCompare(b.instructorNombre));
  }, [horarios, instructores]);

  const hayFiltro = busqueda.trim().length > 0;
  const gruposFiltrados = React.useMemo(() => {
    const norm = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const txt = norm(busqueda.trim());
    if (!txt) return grupos;
    return grupos.filter(g => norm(g.instructorNombre).includes(txt));
  }, [grupos, busqueda]);

  // Con filtro, todo (resumen y exportación) corresponde SOLO a los
  // instructores filtrados.
  const bloquesFiltrados = React.useMemo(
    () => (hayFiltro ? gruposFiltrados.flatMap(g => g.bloques) : horarios),
    [hayFiltro, gruposFiltrados, horarios]
  );

  // Espacios ya programados (RAP/día/franja/ficha) pero sin instructor —
  // pendientes de cubrir cuando llegue alguien disponible.
  const bloquesVacantes = React.useMemo(() => obtenerBloquesVacantes(horarios), [horarios]);
  const bloquesVacantesOrdenados = React.useMemo(() =>
    [...bloquesVacantes].sort((a, b) =>
      (ORDEN_DIA[a.diaSemana] - ORDEN_DIA[b.diaSemana]) || (ORDEN_FRANJA[a.franja] - ORDEN_FRANJA[b.franja])
    ), [bloquesVacantes]);

  const totalHorasSistema = bloquesFiltrados.reduce((acc, b) => acc + b.duracionHoras, 0);
  const totalFichasConHorario = new Set(bloquesFiltrados.map(b => b.fichaId)).size;

  const toggleExpandido = (key: string) => setExpandido(prev => ({ ...prev, [key]: !prev[key] }));

  // Control global, igual que el colapso del sidebar principal: un solo botón
  // que expande o contrae TODAS las tarjetas de instructor a la vez, en vez
  // de tener que abrir/cerrar cada una por separado.
  const todosExpandidos = gruposFiltrados.length > 0 && gruposFiltrados.every(g => expandido[g.instructorId || g.instructorNombre]);

  const toggleTodos = () => {
    if (todosExpandidos) {
      setExpandido({});
    } else {
      setExpandido(prev => {
        const siguiente = { ...prev };
        gruposFiltrados.forEach(g => { siguiente[g.instructorId || g.instructorNombre] = true; });
        return siguiente;
      });
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Encabezado */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-black">
              Reportes
            </span>
            <span>•</span>
            <span>Todas las fichas y programas</span>
          </div>
          <h1 className="text-2xl font-black text-[#111C2D] tracking-tight mt-1 flex items-center space-x-2.5">
            <Users className="w-6 h-6 text-blue-700" />
            <span>Horarios por Instructor</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            El horario completo de cada instructor en todas sus fichas — sin importar el programa de formación.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportarHorariosPorInstructorExcel(bloquesFiltrados, DIAS, FRANJAS, fichasPorId)}
            className="flex items-center space-x-1.5 bg-[#0D631B] hover:bg-[#0a4d15] text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel</span>
          </button>
          <button
            type="button"
            onClick={() => exportarHorariosPorInstructorPDF(bloquesFiltrados, DIAS, FRANJAS, fichasPorId)}
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
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Instructores con Bloques</div>
          <div className="text-xl font-black text-[#111C2D]">{hayFiltro ? gruposFiltrados.length : grupos.length} <span className="text-xs font-semibold text-slate-400">/ {instructores.length}</span></div>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Fichas con Horario Activo</div>
          <div className="text-xl font-black text-[#111C2D]">{totalFichasConHorario}</div>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Horas Semanales Totales</div>
          <div className="text-xl font-black text-[#0D631B]">{totalHorasSistema}h</div>
        </div>
        <div className={`p-4 rounded-2xl border shadow-xs ${bloquesVacantes.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200/80'}`}>
          <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${bloquesVacantes.length > 0 ? 'text-amber-700' : 'text-slate-400'}`}>Espacios Vacantes</div>
          <div className={`text-xl font-black ${bloquesVacantes.length > 0 ? 'text-amber-700' : 'text-[#111C2D]'}`}>{bloquesVacantes.length}</div>
        </div>
      </div>

      {/* Espacios Vacantes: RAP/competencia ya programado en un horario, pero
          todavía sin instructor — quedan aquí visibles hasta que se cubran. */}
      {bloquesVacantes.length > 0 && !hayFiltro && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-amber-50 border-b border-amber-200 flex items-center space-x-2.5">
            <AlertOctagon className="w-5 h-5 text-amber-700 shrink-0" />
            <div>
              <h2 className="font-black text-sm text-amber-900">Espacios Vacantes — Pendientes de Instructor ({bloquesVacantes.length})</h2>
              <p className="text-[11px] text-amber-700">
                Estos bloques ya están programados (día, franja y RAP reservados) pero necesitan que se les asigne un instructor. Asígnalos desde el módulo de Horarios de cada ficha.
              </p>
            </div>
          </div>
          <div className="divide-y divide-amber-100">
            {bloquesVacantesOrdenados.map(b => {
              const f = fichasPorId[b.fichaId];
              return (
                <div key={b.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-[#111C2D] w-40 shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{b.diaSemana} • {b.franja}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-700 truncate">{b.competenciaNombre || b.rapTitulo}</div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {f ? `Ficha ${f.numero_ficha} — ${f.programaNombre}` : 'Ficha no identificada'} • {f?.ambientePrincipal || b.ambiente}
                    </div>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                    {b.duracionHoras}h
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Buscador + control de expandir/contraer todo */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar instructor por nombre..."
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 shadow-xs focus:outline-none focus:ring-1 focus:ring-[#0D631B]"
          />
        </div>
        {gruposFiltrados.length > 0 && (
          <button
            type="button"
            onClick={toggleTodos}
            title={todosExpandidos ? 'Contraer todas las tarjetas de instructor' : 'Expandir todas las tarjetas de instructor'}
            className="flex items-center justify-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all shrink-0"
          >
            {todosExpandidos ? <ChevronsUp className="w-4 h-4 text-slate-500" /> : <ChevronsDown className="w-4 h-4 text-slate-500" />}
            <span>{todosExpandidos ? 'Contraer Todo' : 'Expandir Todo'}</span>
          </button>
        )}
      </div>

      {/* Lista de instructores con sus bloques */}
      <div className="space-y-3">
        {gruposFiltrados.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
            {grupos.length === 0
              ? 'Todavía no hay bloques asignados en ningún horario.'
              : 'Ningún instructor coincide con la búsqueda.'}
          </div>
        ) : (
          gruposFiltrados.map(g => {
            const totalHoras = g.bloques.reduce((acc, b) => acc + b.duracionHoras, 0);
            const fichasDistintas = Array.from(new Set(g.bloques.map(b => b.fichaId)))
              .map(id => fichasPorId[id])
              .filter((f): f is Ficha => !!f);
            const inst = instructores.find(i => i.id === g.instructorId);
            // Al filtrar (pocos resultados) el horario se muestra abierto de una vez.
            const abierto = !!expandido[g.instructorId || g.instructorNombre] || (hayFiltro && gruposFiltrados.length <= 3);
            const bloquesOrdenados = [...g.bloques].sort((a, b) =>
              (ORDEN_DIA[a.diaSemana] - ORDEN_DIA[b.diaSemana]) || (ORDEN_FRANJA[a.franja] - ORDEN_FRANJA[b.franja])
            );

            return (
              <div key={g.instructorId || g.instructorNombre} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleExpandido(g.instructorId || g.instructorNombre)}
                  className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                      style={{ backgroundColor: inst?.colorAvatar || '#0D631B' }}
                    >
                      {g.instructorNombre.split(' ').slice(0, 2).map(p => p[0]).join('')}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-[#111C2D] truncate">{g.instructorNombre}</div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {inst?.especialidad || 'Sin especialidad registrada'} • {fichasDistintas.length} ficha(s) • {new Set(fichasDistintas.map(f => f.programaCodigo)).size} programa(s)
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right hidden sm:block">
                      <div className="text-[11px] font-bold text-[#0D631B] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {totalHoras}h / semana
                      </div>
                      <div className="text-[10px] text-slate-400">{g.bloques.length} bloques</div>
                    </div>
                    {abierto ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>

                {abierto && (
                  <div className="border-t border-slate-100 divide-y divide-slate-100">
                    {bloquesOrdenados.map(b => {
                      const f = fichasPorId[b.fichaId];
                      return (
                        <div key={b.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-[#111C2D] w-40 shrink-0">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{b.diaSemana} • {b.franja}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-slate-700 truncate">{b.competenciaNombre || b.rapTitulo}</div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {f ? `Ficha ${f.numero_ficha} — ${f.programaNombre}` : 'Ficha no identificada'} • {f?.ambientePrincipal || b.ambiente}
                            </div>
                          </div>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-[#0D631B] shrink-0">
                            {b.duracionHoras}h
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
