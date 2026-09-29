import React from 'react';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Phone, 
  Clock, 
  Briefcase, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle,
  MoreVertical,
  Calendar,
  AlertTriangle,
  Edit2,
  Database,
  RefreshCw,
  Trash2,
  ShieldAlert,
  X,
  Info
} from 'lucide-react';
import { 
  Instructor, 
  User, 
  Ficha, 
  BloqueHorario, 
  ActividadSeguimiento, 
  RegistroHorasEjecutadas 
} from '../types';

interface InstructoresViewProps {
  currentUser: User;
  instructores: Instructor[];
  fichas?: Ficha[];
  horarios?: BloqueHorario[];
  actividades?: ActividadSeguimiento[];
  registrosHorasEjecutadas?: RegistroHorasEjecutadas[];
  onOpenModalCrear: () => void;
  onEditarInstructor?: (instructor: Instructor) => void;
  onToggleEstado: (id: string) => void;
  onEliminarInstructor?: (id: string) => void;
  onSincronizarSupabase?: () => void;
  isSyncing?: boolean;
}

export const InstructoresView: React.FC<InstructoresViewProps> = ({
  currentUser,
  instructores,
  fichas = [],
  horarios = [],
  actividades = [],
  registrosHorasEjecutadas = [],
  onOpenModalCrear,
  onEditarInstructor,
  onToggleEstado,
  onEliminarInstructor,
  onSincronizarSupabase,
  isSyncing = false
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterEspecialidad, setFilterEspecialidad] = React.useState('TODAS');

  // Modal de validación de dependencias al intentar eliminar
  const [modalBloqueoEliminar, setModalBloqueoEliminar] = React.useState<{
    isOpen: boolean;
    instructor: Instructor | null;
    motivos: string[];
  }>({
    isOpen: false,
    instructor: null,
    motivos: []
  });

  const canCreate = currentUser.rol === 'COORDINADOR' || currentUser.rol === 'ADMINISTRADOR';

  // Obtener dependencias activas de un instructor
  const getDependenciasInstructor = (inst: Instructor): string[] => {
    const motivos: string[] = [];

    // 1. ¿Es Instructor Líder de alguna ficha?
    const fichasLider = fichas.filter(f => 
      f.instructorLiderId === inst.id || 
      (f.instructorLiderEmail && f.instructorLiderEmail.toLowerCase() === inst.email.toLowerCase()) ||
      (f.instructorLiderNombre && f.instructorLiderNombre.toLowerCase() === inst.nombreCompleto.toLowerCase())
    );
    if (fichasLider.length > 0) {
      motivos.push(`Asignado como Instructor Líder en ${fichasLider.length} ficha(s): ${fichasLider.map(f => `Ficha ${f.numero_ficha}`).join(', ')}.`);
    }

    // 2. ¿Tiene bloques de horario asignados?
    const bloques = horarios.filter(h => 
      h.instructorId === inst.id || 
      (h.instructorNombre && h.instructorNombre.toLowerCase() === inst.nombreCompleto.toLowerCase())
    );
    if (bloques.length > 0) {
      motivos.push(`Tiene ${bloques.length} bloque(s) de horarios programados en la matriz semanal.`);
    }

    // 3. ¿Tiene actividades de seguimiento o juicios evaluativos asignados?
    const act = actividades.filter(a => a.instructorId === inst.id);
    if (act.length > 0) {
      motivos.push(`Tiene ${act.length} actividad(es) de seguimiento curricular en curso.`);
    }

    // 4. ¿Tiene registros de horas ejecutadas?
    const horasReg = registrosHorasEjecutadas.filter(r => 
      (r.instructorDocumento && r.instructorDocumento === inst.documento) ||
      (r.instructorNombre && r.instructorNombre.toLowerCase() === inst.nombreCompleto.toLowerCase())
    );
    if (horasReg.length > 0) {
      motivos.push(`Registra ${horasReg.length} reporte(s) de horas pedagógicas ejecutadas.`);
    }

    return motivos;
  };

  const handleIntentarEliminar = (inst: Instructor) => {
    if (!onEliminarInstructor) return;

    const dependencias = getDependenciasInstructor(inst);

    if (dependencias.length > 0) {
      // Bloqueo: tiene datos hijo
      setModalBloqueoEliminar({
        isOpen: true,
        instructor: inst,
        motivos: dependencias
      });
    } else {
      // Sin datos hijo: confirmación limpia
      if (confirm(`¿Está seguro de eliminar al instructor ${inst.nombreCompleto}?\n\nEsta acción es irreversible y no afectará ninguna ficha porque el instructor no tiene datos asignados.`)) {
        onEliminarInstructor(inst.id);
      }
    }
  };

  // Depuración masiva de instructores de prueba (solo elimina los que tienen 0 dependencias)
  const instructoresSinDependencias = instructores.filter(inst => getDependenciasInstructor(inst).length === 0);

  const handleDepurarInstructoresSinDatos = () => {
    if (!onEliminarInstructor) return;
    if (instructoresSinDependencias.length === 0) {
      alert('Todos los instructores actuales cuentan con fichas, horarios o actividades asignadas y están protegidos por integridad relacional.');
      return;
    }

    if (confirm(
      `Se encontraron ${instructoresSinDependencias.length} instructor(es) sin datos vinculados (sin fichas, sin horarios y sin horas ejecutadas).\n\n` +
      `¿Desea eliminarlos todos para dejar únicamente la planta real?`
    )) {
      for (const inst of instructoresSinDependencias) {
        onEliminarInstructor(inst.id);
      }
    }
  };

  const filtered = instructores.filter(inst => {
    const term = searchTerm.toLowerCase();
    const matchSearch = (inst.nombreCompleto || '').toLowerCase().includes(term) ||
      (inst.nombres || '').toLowerCase().includes(term) ||
      (inst.apellidos || '').toLowerCase().includes(term) ||
      (inst.documento || '').includes(term) ||
      (inst.email || '').toLowerCase().includes(term) ||
      (inst.perfilTecnico || '').toLowerCase().includes(term);
    
    const matchEsp = filterEspecialidad === 'TODAS' || 
      (inst.especialidad && inst.especialidad.toLowerCase().includes(filterEspecialidad.toLowerCase()));
    return matchSearch && matchEsp;
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Encabezado */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span className="px-2 py-0.5 rounded bg-[#EDE7F6] text-[#6F43C0]">Talento Humano</span>
            <span>•</span>
            <span>Red de Instructores</span>
          </div>
          <h1 className="text-2xl font-black text-[#111C2D] tracking-tight mt-1">
            Directorio y Gestión de Instructores
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Registro manual, control de cargas pedagógicas y eliminación segura de instructores sin datos huérfanos.
          </p>
        </div>

        {/* Acciones del encabezado */}
        <div className="flex items-center space-x-2 flex-wrap gap-2">
          {onEliminarInstructor && instructoresSinDependencias.length > 0 && (
            <button
              id="btn-depurar-instructores-sin-datos"
              onClick={handleDepurarInstructoresSinDatos}
              className="flex items-center space-x-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-2xs transition-all"
              title="Elimina de forma segura los instructores de prueba que no tienen ninguna ficha u horario asignado"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Depurar {instructoresSinDependencias.length} sin datos</span>
            </button>
          )}

          {onSincronizarSupabase && (
            <button
              id="btn-sincronizar-instructores-supabase"
              onClick={onSincronizarSupabase}
              disabled={isSyncing}
              className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-[#005A8C] px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-2xs transition-all disabled:opacity-50"
              title="Consultar y sincronizar datos en vivo desde la base de datos Supabase"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#0D631B]' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Supabase'}</span>
            </button>
          )}

          {canCreate && (
            <button
              id="btn-crear-instructor-manual"
              onClick={onOpenModalCrear}
              className="flex items-center space-x-2 bg-[#0D631B] hover:bg-[#0a4d15] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Nuevo Instructor</span>
            </button>
          )}
        </div>
      </div>

      {/* Regla de Integridad Relacional & Protección de Datos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs text-slate-600 gap-3">
          <div className="flex items-center space-x-2.5">
            <Info className="w-4 h-4 text-[#005A8C] shrink-0" />
            <span>
              <strong>Regla de Eliminación:</strong> Puedes eliminar libremente cualquier instructor que <strong>no tenga datos asociados</strong> (sin fichas, sin horarios y sin horas). Si tiene dependencias, el sistema protegerá su integridad.
            </span>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200 shrink-0 font-mono">
            {instructores.length} Total • {instructoresSinDependencias.length} Eliminables
          </span>
        </div>

        <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 flex items-center text-xs text-emerald-950 gap-2.5">
          <ShieldAlert className="w-4 h-4 text-[#0D631B] shrink-0" />
          <span>
            <strong>Protección de Datos (No Sensibles):</strong> El directorio captura únicamente identificación institucional (C.C. o código, nombres, correo corporativo y especialidad) para fines pedagógicos.
          </span>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, documento, correo o perfil..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#111C2D] focus:outline-none focus:border-[#0D631B] focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterEspecialidad}
            onChange={(e) => setFilterEspecialidad(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-3 py-2 outline-none cursor-pointer"
          >
            <option value="TODAS">Todas las Especialidades</option>
            <option value="Software">Software & Programación</option>
            <option value="Bases de Datos">Bases de Datos</option>
            <option value="Biotecnología">Biotecnología</option>
            <option value="Bilingüismo">Bilingüismo e Inglés</option>
            <option value="Transversal">Transversal / Ética</option>
          </select>
        </div>
      </div>

      {/* Grilla de Instructores */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200/80 shadow-2xs text-center max-w-lg mx-auto space-y-4">
          <div className="w-14 h-14 bg-emerald-50 text-[#0D631B] rounded-2xl flex items-center justify-center mx-auto">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No hay instructores registrados</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            La planta de instructores está lista para ser registrada con datos reales. Puedes agregar el primer instructor con su documento, especialidad y carga horaria semanal.
          </p>
          {canCreate && (
            <div className="pt-2">
              <button
                onClick={onOpenModalCrear}
                className="px-4 py-2.5 bg-[#0D631B] hover:bg-[#0a4d15] text-white text-xs font-bold rounded-xl shadow-2xs transition-colors"
              >
                + Registrar Primer Instructor
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(inst => {
            const dependencias = getDependenciasInstructor(inst);
            const tieneHijos = dependencias.length > 0;
            const porcentajeCarga = Math.round((inst.horasSemanalesAsignadas / inst.maxHorasSemanales) * 100);

            return (
              <div 
                key={inst.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:border-[#2E7D32] transition-all space-y-4 flex flex-col justify-between"
              >
                <div>
                  {/* Cabecera Tarjeta */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-12 h-12 rounded-2xl text-white font-bold flex items-center justify-center text-sm shadow-2xs shrink-0 uppercase"
                        style={{ backgroundColor: inst.colorAvatar || '#0D631B' }}
                      >
                        {(inst.nombres?.[0] || inst.nombreCompleto?.[0] || 'I') + (inst.apellidos?.[0] || '')}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-[#111C2D]">{inst.nombreCompleto}</h3>
                        <p className="text-[11px] text-slate-500 font-medium">{inst.especialidad}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => onToggleEstado(inst.id)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-opacity hover:opacity-80 ${
                          inst.estado === 'ACTIVO' ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-slate-100 text-slate-500'
                        }`}
                        title="Cambiar estado activo/inactivo"
                      >
                        {inst.estado}
                      </button>

                      {onEditarInstructor && (
                        <button
                          type="button"
                          onClick={() => onEditarInstructor(inst)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          title="Editar datos del instructor"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {onEliminarInstructor && (
                        <button
                          type="button"
                          onClick={() => handleIntentarEliminar(inst)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            tieneHijos 
                              ? 'text-slate-300 hover:text-rose-600 hover:bg-rose-50' 
                              : 'text-rose-600 hover:bg-rose-100'
                          }`}
                          title={tieneHijos ? 'Tiene datos asociados (clic para ver dependencias)' : 'Eliminar instructor'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Perfil & Titulación */}
                  <div className="mt-3 p-2.5 bg-slate-50 rounded-xl text-[11px] text-slate-600">
                    <span className="font-semibold text-[#111C2D]">Perfil: </span>
                    {inst.perfilTecnico}
                  </div>

                  {/* Datos de Contacto */}
                  <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{inst.email}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{inst.telefono || 'Sin teléfono registrado'} • C.C. {inst.documento}</span>
                    </div>
                  </div>
                </div>

                {/* Barra de Carga Horaria */}
                <div className="pt-3 border-t border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Carga Pedagógica:</span>
                    <span className="font-bold text-[#111C2D]">{inst.horasSemanalesAsignadas} / {inst.maxHorasSemanales} hrs</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ 
                        width: `${porcentajeCarga}%`,
                        backgroundColor: porcentajeCarga > 90 ? '#FFA000' : '#0D631B' 
                      }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span>{porcentajeCarga}% ocupación</span>
                    <span>{inst.maxHorasSemanales - inst.horasSemanalesAsignadas}h disponibles</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL INFORMATIVO DE BLOQUEO DE ELIMINACIÓN POR DEPENDENCIAS */}
      {modalBloqueoEliminar.isOpen && modalBloqueoEliminar.instructor && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-rose-950">
                    No se puede eliminar al instructor
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {modalBloqueoEliminar.instructor.nombreCompleto} (C.C. {modalBloqueoEliminar.instructor.documento})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalBloqueoEliminar({ isOpen: false, instructor: null, motivos: [] })}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              Por <strong>integridad referencial académica</strong>, el sistema protege a los instructores que cuenten con datos asociados activos. Este instructor tiene los siguientes vínculos registrados:
            </p>

            <ul className="space-y-1.5 p-3 rounded-xl bg-rose-50/80 border border-rose-200 text-xs text-rose-950 font-medium max-h-48 overflow-y-auto">
              {modalBloqueoEliminar.motivos.map((motivo, idx) => (
                <li key={idx} className="flex items-start space-x-2">
                  <span className="text-rose-600 font-bold">•</span>
                  <span>{motivo}</span>
                </li>
              ))}
            </ul>

            <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              💡 <strong>Sugerencia:</strong> Para eliminar a este instructor, primero reasigne sus fichas a otro instructor o libere sus horarios en la malla semanal.
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setModalBloqueoEliminar({ isOpen: false, instructor: null, motivos: [] })}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
