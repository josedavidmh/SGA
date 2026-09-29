import React from 'react';
import { 
  GraduationCap, 
  Search, 
  Plus, 
  Edit3, 
  Layers, 
  Clock, 
  Building2, 
  CheckCircle2, 
  AlertCircle,
  Hash,
  BookOpen,
  Filter,
  Users,
  Trash2
} from 'lucide-react';
import { ProgramaFormacion, Ficha, User } from '../types';

interface ProgramasViewProps {
  currentUser: User;
  programas: ProgramaFormacion[];
  fichas: Ficha[];
  onOpenEditarPrograma: (programa: ProgramaFormacion) => void;
  onOpenCrearPrograma: () => void;
  onVerCompetencias?: (programaCodigo: string) => void;
  onEliminarPrograma?: (programaId: string) => void;
}

export const ProgramasView: React.FC<ProgramasViewProps> = ({
  currentUser,
  programas,
  fichas,
  onOpenEditarPrograma,
  onOpenCrearPrograma,
  onVerCompetencias,
  onEliminarPrograma
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterNivel, setFilterNivel] = React.useState<string>('TODOS');
  const [filterEstado, setFilterEstado] = React.useState<string>('TODOS');

  // Filtrado de programas
  const programasFiltrados = programas.filter(prog => {
    const matchesSearch = 
      prog.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prog.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prog.redConocimiento.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesNivel = filterNivel === 'TODOS' || prog.nivelFormacion === filterNivel;
    const matchesEstado = filterEstado === 'TODOS' || prog.estado === filterEstado;

    return matchesSearch && matchesNivel && matchesEstado;
  });

  // Estadísticas rápidas
  const totalProgramas = programas.length;
  const tecnologos = programas.filter(p => p.nivelFormacion === 'Tecnólogo').length;
  const tecnicos = programas.filter(p => p.nivelFormacion === 'Técnico').length;
  const totalFichasAsignadas = fichas.length;

  const canEdit = currentUser.rol === 'COORDINADOR' || currentUser.rol === 'ADMINISTRADOR' || currentUser.rol === 'AUXILIAR';

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Encabezado */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800">Dirección de Formación Profesional</span>
            <span>•</span>
            <span>Catálogo Curricular</span>
          </div>
          <h1 className="text-2xl font-black text-[#111C2D] tracking-tight mt-1">
            Programas de Formación y Diseño Curricular
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Gestión de códigos, versiones, intensidades horarias (F001-008-25) y actualización en cascada de fichas.
          </p>
        </div>

        {canEdit && (
          <button
            id="btn-crear-nuevo-programa"
            onClick={onOpenCrearPrograma}
            className="flex items-center space-x-2 bg-[#0D631B] hover:bg-[#0a4d15] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-[#0D631B]/20 transition-all self-start lg:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Nuevo Programa</span>
          </button>
        )}
      </div>

      {/* Tarjetas Métricas Bento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Programas</span>
            <div className="text-2xl font-black text-[#111C2D] mt-1">{totalProgramas}</div>
            <div className="text-[11px] text-emerald-700 font-bold mt-0.5">Catálogo Activo</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0D631B] flex items-center justify-center">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nivel Tecnólogo</span>
            <div className="text-2xl font-black text-[#111C2D] mt-1">{tecnologos}</div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">24 Meses (Lectiva + Productiva)</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nivel Técnico / Aux.</span>
            <div className="text-2xl font-black text-[#111C2D] mt-1">{tecnicos}</div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">Formación Práctica Ocupacional</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Fichas en Formación</span>
            <div className="text-2xl font-black text-[#111C2D] mt-1">{totalFichasAsignadas}</div>
            <div className="text-[11px] text-emerald-700 font-bold mt-0.5">Cohortes Registradas</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Barra de Filtro y Búsqueda */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-buscar-programa"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código, denominación o red..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#111C2D] focus:outline-none focus:border-[#0D631B] focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center space-x-2.5 w-full md:w-auto">
          <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Nivel:</span>
          </div>
          <select
            id="select-filtro-nivel"
            value={filterNivel}
            onChange={(e) => setFilterNivel(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#111C2D] font-medium focus:outline-none focus:border-[#0D631B]"
          >
            <option value="TODOS">Todos los Niveles</option>
            <option value="Tecnólogo">Tecnólogos</option>
            <option value="Técnico">Técnicos</option>
            <option value="Auxiliar">Auxiliares</option>
          </select>

          <select
            id="select-filtro-estado"
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#111C2D] font-medium focus:outline-none focus:border-[#0D631B]"
          >
            <option value="TODOS">Todos los Estados</option>
            <option value="ACTIVO">Activos</option>
            <option value="EN_REVISION">En Revisión</option>
            <option value="INACTIVO">Inactivos</option>
          </select>
        </div>
      </div>

      {/* Grid de Programas de Formación */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
        {programasFiltrados.map((prog) => {
          const fichasDelPrograma = fichas.filter(f => f.programaCodigo === prog.codigo);
          const totalAprendices = fichasDelPrograma.reduce((acc, curr) => acc + (curr.aprendicesActivos || 0), 0);

          return (
            <div 
              key={prog.id}
              id={`card-programa-${prog.codigo}`}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
            >
              {/* Encabezado de la Tarjeta */}
              <div className="p-5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-mono text-xs font-black text-slate-800 border border-slate-200">
                      Cód. {prog.codigo}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      v{prog.version}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      prog.nivelFormacion === 'Tecnólogo'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : prog.nivelFormacion === 'Técnico'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {prog.nivelFormacion}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      prog.estado === 'ACTIVO'
                        ? 'bg-emerald-100 text-emerald-800'
                        : prog.estado === 'EN_REVISION'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {prog.estado}
                    </span>
                  </div>
                </div>

                {/* Denominación del Programa */}
                <div>
                  <h3 className="font-bold text-[#111C2D] text-sm leading-snug group-hover:text-[#0D631B] transition-colors">
                    {prog.nombre}
                  </h3>
                  <div className="flex items-center space-x-1 text-[11px] text-slate-500 font-medium mt-1">
                    <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{prog.redConocimiento}</span>
                  </div>
                </div>

                {/* Distribución de Carga Horaria */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Lectiva</span>
                    <span className="font-mono font-bold text-[#111C2D]">{prog.duracionLectivaHoras}h</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Productiva</span>
                    <span className="font-mono font-bold text-[#111C2D]">{prog.duracionProductivaHoras}h</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Total</span>
                    <span className="font-mono font-black text-[#0D631B]">{prog.duracionTotalHoras}h</span>
                  </div>
                </div>

                {/* Fichas Asociadas */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                    <span className="flex items-center space-x-1">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      <span>Fichas Vinculadas ({fichasDelPrograma.length})</span>
                    </span>
                    <span>{totalAprendices} aprendices</span>
                  </div>

                  {fichasDelPrograma.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                      {fichasDelPrograma.map(f => (
                        <span 
                          key={f.id}
                          className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-mono text-[11px] font-bold border border-emerald-200"
                        >
                          Ficha {f.numero_ficha}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic">
                      Sin fichas activas asignadas actualmente.
                    </div>
                  )}
                </div>
              </div>

              {/* Pie de Acción: Botón Editar Programa y Ver Competencias & RAPs */}
              <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                {onVerCompetencias ? (
                  <button
                    id={`btn-ver-competencias-${prog.codigo}`}
                    onClick={() => onVerCompetencias(prog.codigo)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#0D631B] font-bold text-xs border border-emerald-200 shadow-xs transition-all"
                    title="Ver competencias y RAPs asociados según planeación pedagógica"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Ver Competencias & RAPs</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-500 font-medium">
                    {fichasDelPrograma.length} cohortes actualizables
                  </span>
                )}

                <div className="flex items-center space-x-1.5">
                  {canEdit && (
                    <button
                      id={`btn-editar-programa-${prog.codigo}`}
                      onClick={() => onOpenEditarPrograma(prog)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 font-bold text-xs border border-slate-200 shadow-xs transition-all"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Editar</span>
                    </button>
                  )}

                  {canEdit && onEliminarPrograma && (
                    <button
                      id={`btn-eliminar-programa-${prog.codigo}`}
                      onClick={() => onEliminarPrograma(prog.id)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 font-bold text-xs border border-red-200/80 shadow-xs transition-all"
                      title="Eliminar este programa de formación"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {programasFiltrados.length === 0 && (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <GraduationCap className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-700 text-sm">No se encontraron programas curriculares</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Prueba ajustando el término de búsqueda o registra un nuevo programa de formación en el centro.
          </p>
          {canEdit && (
            <button
              onClick={onOpenCrearPrograma}
              className="px-4 py-2 rounded-xl bg-[#0D631B] text-white text-xs font-bold inline-flex items-center space-x-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Programa</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
