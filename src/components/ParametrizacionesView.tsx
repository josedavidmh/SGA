import React from 'react';
import { 
  Sliders, 
  Sparkles, 
  Plus, 
  Search, 
  BookOpen, 
  Users, 
  Trash2, 
  Edit3, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Tag, 
  Save, 
  X, 
  Clock, 
  Compass,
  CheckSquare
} from 'lucide-react';
import {
  EspecialidadTematica,
  AmbienteAprendizaje,
  Competencia,
  Instructor,
  User,
  RegionalCentro,
  TrimestreCalendario
} from '../types';

interface ParametrizacionesViewProps {
  currentUser: User;
  centro: RegionalCentro;
  competencias: Competencia[];
  instructores: Instructor[];
  especialidades: EspecialidadTematica[];
  ambientes: AmbienteAprendizaje[];
  onGuardarEspecialidad: (especialidad: EspecialidadTematica) => void;
  onEliminarEspecialidad: (id: string) => void;
  onAutoGenerarEspecialidades: () => void;
  onGuardarAmbiente: (ambiente: AmbienteAprendizaje) => void;
  onEliminarAmbiente: (id: string) => void;
  trimestresCalendario?: TrimestreCalendario[];
  onGuardarTrimestreCalendario?: (t: TrimestreCalendario) => void;
  onEliminarTrimestreCalendario?: (id: string) => void;
}

export const ParametrizacionesView: React.FC<ParametrizacionesViewProps> = ({
  currentUser: _currentUser,
  centro,
  competencias = [],
  instructores = [],
  especialidades = [],
  ambientes = [],
  onGuardarEspecialidad,
  onEliminarEspecialidad,
  onAutoGenerarEspecialidades,
  onGuardarAmbiente,
  onEliminarAmbiente,
  trimestresCalendario = [],
  onGuardarTrimestreCalendario,
  onEliminarTrimestreCalendario
}) => {
  const [activeTab, setActiveTab] = React.useState<'especialidades' | 'ambientes' | 'trimestres'>('especialidades');
  const [formTrimestre, setFormTrimestre] = React.useState({ nombre: '', fechaInicio: '', fechaFin: '' });

  const handleAgregarTrimestre = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTrimestre.nombre.trim() || !formTrimestre.fechaInicio || !formTrimestre.fechaFin) return;
    onGuardarTrimestreCalendario?.({
      id: `trim_${Date.now()}`,
      nombre: formTrimestre.nombre.trim(),
      fechaInicio: formTrimestre.fechaInicio,
      fechaFin: formTrimestre.fechaFin
    });
    setFormTrimestre({ nombre: '', fechaInicio: '', fechaFin: '' });
  };

  // Filtros de Especialidades
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterArea, setFilterArea] = React.useState<'TODAS' | 'Técnica' | 'Transversal' | 'Clave' | 'Básica'>('TODAS');

  // Modal para Crear / Editar Especialidad
  const [modalEspecialidadOpen, setModalEspecialidadOpen] = React.useState(false);
  const [especialidadEditando, setEspecialidadEditando] = React.useState<EspecialidadTematica | null>(null);
  const [formEspecialidad, setFormEspecialidad] = React.useState({
    nombre: '',
    area: 'Técnica' as 'Técnica' | 'Transversal' | 'Clave' | 'Básica',
    descripcion: '',
    colorTag: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    competenciasAsociadasCodigos: [] as string[]
  });

  // Modal para Crear / Editar Ambiente
  const [modalAmbienteOpen, setModalAmbienteOpen] = React.useState(false);
  const [ambienteEditando, setAmbienteEditando] = React.useState<AmbienteAprendizaje | null>(null);
  const [formAmbiente, setFormAmbiente] = React.useState({
    nombre: '',
    codigo: '',
    tipo: 'Ambiente TIC' as 'Ambiente TIC' | 'Laboratorio' | 'Taller' | 'Auditorio' | 'Virtual',
    sede: centro.sede || 'Sede Principal - Valledupar',
    capacidadAprendices: 30,
    equipamiento: '',
    estado: 'DISPONIBLE' as 'DISPONIBLE' | 'EN_MANTENIMIENTO' | 'OCUPADO'
  });

  // Notificación local
  const [mensajeExito, setMensajeExito] = React.useState<string | null>(null);
  const [mensajeError, setMensajeError] = React.useState<string | null>(null);

  // Filtrado de especialidades
  const especialidadesFiltradas = especialidades.filter(esp => {
    const matchSearch = (esp.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (esp.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchArea = filterArea === 'TODAS' || esp.area === filterArea;
    return matchSearch && matchArea;
  });

  // Conteo de instructores asociados por especialidad
  const getInstructoresCount = (espNombre: string) => {
    const n = espNombre.toLowerCase();
    return instructores.filter(inst => {
      const espInst = (inst.especialidad || '').toLowerCase();
      const perfilInst = (inst.perfilTecnico || '').toLowerCase();
      return espInst.includes(n) || n.includes(espInst) || perfilInst.includes(n);
    }).length;
  };

  const handleOpenNuevaEspecialidad = () => {
    setEspecialidadEditando(null);
    setFormEspecialidad({
      nombre: '',
      area: 'Técnica',
      descripcion: '',
      colorTag: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      competenciasAsociadasCodigos: []
    });
    setModalEspecialidadOpen(true);
  };

  const handleOpenEditarEspecialidad = (esp: EspecialidadTematica) => {
    setEspecialidadEditando(esp);
    setFormEspecialidad({
      nombre: esp.nombre,
      area: esp.area,
      descripcion: esp.descripcion || '',
      colorTag: esp.colorTag || 'bg-slate-100 text-slate-800 border-slate-200',
      competenciasAsociadasCodigos: esp.competenciasAsociadasCodigos || []
    });
    setModalEspecialidadOpen(true);
  };

  const handleGuardarEspecialidadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEspecialidad.nombre.trim()) {
      setMensajeError('El nombre de la especialidad temática es obligatorio.');
      return;
    }

    const nueva: EspecialidadTematica = {
      id: especialidadEditando ? especialidadEditando.id : `esp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      nombre: formEspecialidad.nombre.trim(),
      area: formEspecialidad.area,
      descripcion: formEspecialidad.descripcion.trim(),
      colorTag: formEspecialidad.colorTag,
      competenciasAsociadasCodigos: formEspecialidad.competenciasAsociadasCodigos,
      origen: especialidadEditando ? especialidadEditando.origen : 'MANUAL',
      estado: 'ACTIVA'
    };

    onGuardarEspecialidad(nueva);
    setModalEspecialidadOpen(false);
    setMensajeExito(`✓ Especialidad temática "${nueva.nombre}" guardada con éxito.`);
    setTimeout(() => setMensajeExito(null), 4000);
  };

  const handleEliminarEspecialidadClick = (esp: EspecialidadTematica) => {
    const instructoresVinculados = getInstructoresCount(esp.nombre);
    if (instructoresVinculados > 0) {
      if (!confirm(`La especialidad "${esp.nombre}" coincide con el perfil de ${instructoresVinculados} instructor(es). ¿Desea eliminarla de todas formas?`)) {
        return;
      }
    } else {
      if (!confirm(`¿Está seguro de eliminar la especialidad temática "${esp.nombre}"?`)) {
        return;
      }
    }

    onEliminarEspecialidad(esp.id);
    setMensajeExito(`✓ Especialidad temática "${esp.nombre}" eliminada del catálogo.`);
    setTimeout(() => setMensajeExito(null), 4000);
  };

  // Manejo de Ambientes
  const handleOpenNuevoAmbiente = () => {
    setAmbienteEditando(null);
    setFormAmbiente({
      nombre: '',
      codigo: `AMB-${Math.floor(100 + Math.random() * 900)}`,
      tipo: 'Ambiente TIC',
      sede: centro.sede || 'Sede Principal - Valledupar',
      capacidadAprendices: 30,
      equipamiento: '30 Equipos Core i7, Pantalla interactiva, Conexión LAN',
      estado: 'DISPONIBLE'
    });
    setModalAmbienteOpen(true);
  };

  const handleOpenEditarAmbiente = (amb: AmbienteAprendizaje) => {
    setAmbienteEditando(amb);
    setFormAmbiente({
      nombre: amb.nombre,
      codigo: amb.codigo,
      tipo: amb.tipo,
      sede: amb.sede || centro.sede || 'Sede Principal - Valledupar',
      capacidadAprendices: amb.capacidadAprendices || 30,
      equipamiento: amb.equipamiento || '',
      estado: (amb.estado as any) || 'DISPONIBLE'
    });
    setModalAmbienteOpen(true);
  };

  const handleGuardarAmbienteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmbiente.nombre.trim()) {
      setMensajeError('El nombre del ambiente de aprendizaje es obligatorio.');
      return;
    }

    const nuevo: AmbienteAprendizaje = {
      id: ambienteEditando ? ambienteEditando.id : `amb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      nombre: formAmbiente.nombre.trim(),
      codigo: formAmbiente.codigo.trim(),
      tipo: formAmbiente.tipo,
      sede: formAmbiente.sede.trim(),
      capacidadAprendices: Number(formAmbiente.capacidadAprendices) || 30,
      equipamiento: formAmbiente.equipamiento.trim(),
      estado: formAmbiente.estado
    };

    onGuardarAmbiente(nuevo);
    setModalAmbienteOpen(false);
    setMensajeExito(`✓ Ambiente "${nuevo.nombre}" guardado con éxito.`);
    setTimeout(() => setMensajeExito(null), 4000);
  };

  const handleToggleCompetenciaEnForm = (cod: string) => {
    setFormEspecialidad(prev => {
      const exists = prev.competenciasAsociadasCodigos.includes(cod);
      return {
        ...prev,
        competenciasAsociadasCodigos: exists
          ? prev.competenciasAsociadasCodigos.filter(c => c !== cod)
          : [...prev.competenciasAsociadasCodigos, cod]
      };
    });
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Cabecera del Módulo */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span className="px-2 py-0.5 rounded bg-[#EDE7F6] text-[#6F43C0]">Configuración y Estructura</span>
            <span>•</span>
            <span className="text-[#0D631B] font-semibold">Tablas Maestras SENA CBC</span>
          </div>
          <h1 className="text-2xl font-black text-[#111C2D] tracking-tight mt-1 flex items-center space-x-2.5">
            <Sliders className="w-6 h-6 text-[#0D631B]" />
            <span>Parametrizaciones y Tablas Maestras</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium max-w-2xl">
            Administra las especialidades temáticas de instructores, ambientes de formación física/virtual y las reglas de negocio institucionales.
          </p>
        </div>

        {/* Acciones del encabezado */}
        <div className="flex items-center space-x-2 flex-wrap gap-2">
          {activeTab === 'especialidades' && (
            <>
              <button
                type="button"
                onClick={onAutoGenerarEspecialidades}
                className="flex items-center space-x-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-[#6F43C0] px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-2xs transition-colors"
                title="Sincroniza y crea automáticamente especialidades concisas a partir de las competencias de la planeación pedagógica"
              >
                <Sparkles className="w-4 h-4 text-[#6F43C0]" />
                <span>Auto-generar desde Planeación</span>
              </button>

              <button
                type="button"
                onClick={handleOpenNuevaEspecialidad}
                className="flex items-center space-x-2 bg-[#0D631B] hover:bg-[#0a4d15] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>+ Nueva Especialidad</span>
              </button>
            </>
          )}

          {activeTab === 'ambientes' && (
            <button
              type="button"
              onClick={handleOpenNuevoAmbiente}
              className="flex items-center space-x-2 bg-[#005A8C] hover:bg-[#004266] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nuevo Ambiente</span>
            </button>
          )}
        </div>
      </div>

      {/* Notificaciones */}
      {mensajeExito && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900 font-bold animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-[#0D631B]" />
            <span>{mensajeExito}</span>
          </div>
          <button onClick={() => setMensajeExito(null)} className="text-emerald-700 hover:text-emerald-900">✕</button>
        </div>
      )}

      {mensajeError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 flex items-center justify-between text-xs text-rose-900 font-bold animate-in fade-in">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{mensajeError}</span>
          </div>
          <button onClick={() => setMensajeError(null)} className="text-rose-700 hover:text-rose-900">✕</button>
        </div>
      )}

      {/* Pestañas Superiores */}
      <div className="flex items-center space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('especialidades')}
          className={`px-4 py-3 text-xs font-bold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'especialidades'
              ? 'border-[#0D631B] text-[#0D631B] bg-[#E8F5E9]/30'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Especialidades Temáticas</span>
          <span className="px-2 py-0.2 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono">
            {especialidades.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ambientes')}
          className={`px-4 py-3 text-xs font-bold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'ambientes'
              ? 'border-[#005A8C] text-[#005A8C] bg-sky-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Ambientes de Formación</span>
          <span className="px-2 py-0.2 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono">
            {ambientes.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('trimestres')}
          className={`px-4 py-3 text-xs font-bold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'trimestres'
              ? 'border-[#6F43C0] text-[#6F43C0] bg-[#EDE7F6]/30'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Calendario de Trimestres</span>
          <span className="px-2 py-0.2 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono">
            {trimestresCalendario.length}
          </span>
        </button>
      </div>

      {/* CONTENIDO PESTAÑA 1: ESPECIALIDADES TEMÁTICAS */}
      {activeTab === 'especialidades' && (
        <div className="space-y-4">
          {/* Métricas / Bento resumen */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Especialidades</span>
              <div className="text-xl font-black text-[#111C2D] mt-0.5">{especialidades.length}</div>
              <div className="text-[10px] text-[#0D631B] font-semibold">Concisa & estandarizada</div>
            </div>

            <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Área Técnica</span>
              <div className="text-xl font-black text-[#005A8C] mt-0.5">
                {especialidades.filter(e => e.area === 'Técnica').length}
              </div>
              <div className="text-[10px] text-slate-500 font-semibold">Software / BD / Redes</div>
            </div>

            <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Transversales</span>
              <div className="text-xl font-black text-[#2E7D32] mt-0.5">
                {especialidades.filter(e => e.area === 'Transversal').length}
              </div>
              <div className="text-[10px] text-slate-500 font-semibold">Ética / SST / TIC</div>
            </div>

            <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">Claves / Básicas</span>
              <div className="text-xl font-black text-purple-900 mt-0.5">
                {especialidades.filter(e => e.area === 'Clave' || e.area === 'Básica').length}
              </div>
              <div className="text-[10px] text-slate-500 font-semibold">Inglés / Matemáticas / Física</div>
            </div>
          </div>

          {/* Barra de Búsqueda y Filtros de Especialidades */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar especialidad o descripción..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#111C2D] focus:outline-none focus:border-[#0D631B] focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center space-x-1 text-[11px] font-bold flex-wrap gap-y-1 w-full md:w-auto">
              {(['TODAS', 'Técnica', 'Transversal', 'Clave', 'Básica'] as const).map(area => (
                <button
                  key={area}
                  type="button"
                  onClick={() => setFilterArea(area)}
                  className={`px-3 py-1.5 rounded-xl transition-colors ${
                    filterArea === area
                      ? 'bg-[#111C2D] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {area === 'TODAS' ? `Todas (${especialidades.length})` : area}
                </button>
              ))}
            </div>
          </div>

          {/* Grilla de Especialidades Temáticas */}
          {especialidadesFiltradas.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#6F43C0] flex items-center justify-center mx-auto">
                <Tag className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">No hay especialidades temáticas registradas</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Puedes hacer clic en <strong>"Auto-generar desde Planeación"</strong> para inferir automáticamente las especialidades concisas de las competencias cargadas o crear una manualmente.
              </p>
              <div className="pt-2 flex items-center justify-center gap-2">
                <button
                  onClick={onAutoGenerarEspecialidades}
                  className="px-4 py-2 bg-[#6F43C0] hover:bg-[#5b34a6] text-white text-xs font-bold rounded-xl shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 inline mr-1" />
                  Auto-generar Especialidades
                </button>
                <button
                  onClick={handleOpenNuevaEspecialidad}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  + Crear Manual
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {especialidadesFiltradas.map(esp => {
                const compAsociadas = competencias.filter(c => (esp.competenciasAsociadasCodigos || []).includes(c.codigo));
                const instructoresCount = getInstructoresCount(esp.nombre);

                return (
                  <div
                    key={esp.id}
                    className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-[#0D631B] transition-all space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          esp.colorTag || 'bg-slate-100 text-slate-800 border-slate-200'
                        }`}>
                          {esp.nombre}
                        </span>

                        <span className={`px-2 py-0.2 rounded text-[9px] font-bold ${
                          esp.area === 'Técnica'
                            ? 'bg-blue-100 text-blue-900'
                            : esp.area === 'Transversal'
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-purple-100 text-purple-900'
                        }`}>
                          {esp.area}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                        {esp.descripcion || 'Especialidad temática articulada al diseño curricular institucional.'}
                      </p>

                      {/* Competencias asociadas */}
                      <div className="pt-2 border-t border-slate-100 space-y-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                          <span>Competencias Vinculadas:</span>
                          <span className="text-slate-600">{compAsociadas.length}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                          {compAsociadas.length > 0 ? (
                            compAsociadas.map(c => (
                              <span
                                key={c.codigo}
                                title={c.denominacion}
                                className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-semibold"
                              >
                                {c.codigo}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Sin competencias vinculadas</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                      <span className="text-[11px] text-slate-500 font-medium flex items-center space-x-1">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span>{instructoresCount} Instructor(es)</span>
                      </span>

                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditarEspecialidad(esp)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                          title="Editar especialidad"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEliminarEspecialidadClick(esp)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
                          title="Eliminar especialidad"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO PESTAÑA 2: AMBIENTES DE FORMACIÓN */}
      {activeTab === 'ambientes' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ambientes.map(amb => (
              <div
                key={amb.id}
                className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-[#005A8C] transition-all space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#005A8C] border border-blue-200 font-bold text-[10px]">
                      {amb.tipo}
                    </span>
                    <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold ${
                      amb.estado === 'DISPONIBLE'
                        ? 'bg-emerald-100 text-emerald-900'
                        : amb.estado === 'OCUPADO'
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-rose-100 text-rose-900'
                    }`}>
                      {amb.estado}
                    </span>
                  </div>

                  <h3 className="font-black text-sm text-[#111C2D]">{amb.nombre}</h3>
                  <div className="text-[11px] text-slate-500 font-mono">Código: {amb.codigo} • Sede: {amb.sede}</div>
                  <p className="text-xs text-slate-600 leading-relaxed">{amb.equipamiento || 'Dotación estándar de formación'}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center space-x-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Capacidad: {amb.capacidadAprendices} aprendices</span>
                  </span>

                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditarAmbiente(amb)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                      title="Editar ambiente de formación"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`¿Eliminar el ambiente "${amb.nombre}"?`)) {
                          onEliminarAmbiente(amb.id);
                        }
                      }}
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
                      title="Eliminar ambiente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONTENIDO PESTAÑA 3: CALENDARIO DE TRIMESTRES */}
      {activeTab === 'trimestres' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
            Fechas de corte oficiales de cada trimestre, independientes de lo programado en Horarios.
            Sirven para elegir el trimestre por nombre al descargar el Reporte de Eventos de una ficha
            y para mostrar su rango de fechas oficial. El nombre debe escribirse exactamente igual al
            trimestre de Horarios (formato "AAAA-ROMANO", ej: 2026-I, 2026-II, 2026-III, 2026-IV) —
            si no coincide, el reporte igual se genera pero sin la fecha oficial de corte.
          </p>

          <form onSubmit={handleAgregarTrimestre} className="flex flex-wrap items-end gap-3 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Nombre (igual a Horarios: ej. 2026-I)</label>
              <input
                type="text"
                value={formTrimestre.nombre}
                onChange={e => setFormTrimestre(f => ({ ...f, nombre: e.target.value }))}
                placeholder="2026-I"
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium w-32 focus:outline-hidden focus:ring-2 focus:ring-[#6F43C0]/30"
              />
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Fecha inicio</label>
              <input
                type="date"
                value={formTrimestre.fechaInicio}
                onChange={e => setFormTrimestre(f => ({ ...f, fechaInicio: e.target.value }))}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#6F43C0]/30"
              />
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Fecha fin</label>
              <input
                type="date"
                value={formTrimestre.fechaFin}
                onChange={e => setFormTrimestre(f => ({ ...f, fechaFin: e.target.value }))}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#6F43C0]/30"
              />
            </div>
            <button
              type="submit"
              className="flex items-center space-x-2 bg-[#6F43C0] hover:bg-[#5c369f] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar trimestre</span>
            </button>
          </form>

          {trimestresCalendario.length === 0 ? (
            <div className="text-xs text-slate-400 text-center py-8 border border-dashed border-slate-200 rounded-2xl">
              Todavía no hay trimestres parametrizados.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="text-left py-2.5 px-3">Trimestre</th>
                    <th className="text-left py-2.5 px-3">Fecha inicio</th>
                    <th className="text-left py-2.5 px-3">Fecha fin</th>
                    <th className="text-right py-2.5 px-3">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...trimestresCalendario]
                    .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio))
                    .map(t => (
                      <tr key={t.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{t.nombre}</td>
                        <td className="py-2.5 px-3 text-slate-600">{t.fechaInicio}</td>
                        <td className="py-2.5 px-3 text-slate-600">{t.fechaFin}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => onEliminarTrimestreCalendario?.(t.id)}
                            className="text-rose-500 hover:text-rose-700"
                            title="Eliminar trimestre"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL CREAR / EDITAR ESPECIALIDAD TEMÁTICA */}
      {modalEspecialidadOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Tag className="w-5 h-5 text-[#0D631B]" />
                <h3 className="font-black text-sm text-[#111C2D]">
                  {especialidadEditando ? 'Editar Especialidad Temática' : 'Nueva Especialidad Temática'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalEspecialidadOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGuardarEspecialidadSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-[#111C2D] block mb-1">Nombre Conciso de la Especialidad *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Programación de Software, Bases de Datos, Inglés..."
                  value={formEspecialidad.nombre}
                  onChange={(e) => setFormEspecialidad(prev => ({ ...prev, nombre: e.target.value }))}
                  className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3 py-2 font-semibold text-[#111C2D] outline-none focus:border-[#0D631B] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#111C2D] block mb-1">Área de Formación</label>
                  <select
                    value={formEspecialidad.area}
                    onChange={(e) => setFormEspecialidad(prev => ({ ...prev, area: e.target.value as any }))}
                    className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3 py-2 font-medium text-[#111C2D] outline-none"
                  >
                    <option value="Técnica">Técnica</option>
                    <option value="Transversal">Transversal</option>
                    <option value="Clave">Clave</option>
                    <option value="Básica">Básica</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#111C2D] block mb-1">Tema Visual / Color</label>
                  <select
                    value={formEspecialidad.colorTag}
                    onChange={(e) => setFormEspecialidad(prev => ({ ...prev, colorTag: e.target.value }))}
                    className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3 py-2 font-medium text-[#111C2D] outline-none"
                  >
                    <option value="bg-emerald-100 text-emerald-900 border-emerald-300">Verde Esmeralda (Técnico Software)</option>
                    <option value="bg-blue-100 text-blue-900 border-blue-300">Azul Océano (Bilingüismo / Cloud)</option>
                    <option value="bg-purple-100 text-purple-900 border-purple-300">Púrpura (Ciencias / Lógica)</option>
                    <option value="bg-amber-100 text-amber-900 border-amber-300">Ámbar (Comunicación / Ética)</option>
                    <option value="bg-teal-100 text-teal-900 border-teal-300">Teal (SST / Medio Ambiente)</option>
                    <option value="bg-rose-100 text-rose-900 border-rose-300">Rosa / Coral (Requisitos / QA)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#111C2D] block mb-1">Descripción / Alcance</label>
                <textarea
                  rows={2}
                  placeholder="Breve descripción del alcance temático de esta especialidad..."
                  value={formEspecialidad.descripcion}
                  onChange={(e) => setFormEspecialidad(prev => ({ ...prev, descripcion: e.target.value }))}
                  className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3 py-2 font-medium text-[#111C2D] outline-none focus:border-[#0D631B] focus:bg-white"
                />
              </div>

              {/* Selección de Competencias Vinculadas */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="font-bold text-[#111C2D] block flex items-center justify-between">
                  <span>Asociar Competencias Curriculares ({formEspecialidad.competenciasAsociadasCodigos.length} seleccionadas):</span>
                  <span className="text-[10px] text-slate-400 font-normal">Marca las competencias correspondientes</span>
                </label>

                <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50 space-y-1">
                  {competencias.length === 0 ? (
                    <div className="p-3 text-center text-slate-400 text-[11px]">
                      No hay competencias cargadas aún en el sistema.
                    </div>
                  ) : (
                    competencias.map(c => {
                      const isSelected = formEspecialidad.competenciasAsociadasCodigos.includes(c.codigo);
                      return (
                        <div
                          key={c.codigo}
                          onClick={() => handleToggleCompetenciaEnForm(c.codigo)}
                          className={`p-2 rounded-lg cursor-pointer flex items-start space-x-2 transition-colors ${
                            isSelected ? 'bg-emerald-50 border border-emerald-300 text-emerald-950' : 'bg-white hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="mt-0.5 rounded text-[#0D631B] focus:ring-0 cursor-pointer"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="font-mono font-bold text-[10px] mr-1.5">{c.codigo}</span>
                            <span className="text-[11px] leading-tight font-medium">{c.denominacion}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalEspecialidadOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0D631B] hover:bg-[#0a4d15] text-white font-bold shadow-xs flex items-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar Especialidad</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR AMBIENTE */}
      {modalAmbienteOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-[#005A8C]" />
                <h3 className="font-black text-sm text-[#111C2D]">
                  {ambienteEditando ? 'Editar Ambiente' : 'Nuevo Ambiente de Formación'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalAmbienteOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGuardarAmbienteSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#111C2D] block mb-1">Nombre del Ambiente *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Ambiente 204 - TIC / Software"
                  value={formAmbiente.nombre}
                  onChange={(e) => setFormAmbiente(prev => ({ ...prev, nombre: e.target.value }))}
                  className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3 py-2 font-semibold text-[#111C2D] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#111C2D] block mb-1">Código</label>
                  <input
                    type="text"
                    value={formAmbiente.codigo}
                    onChange={(e) => setFormAmbiente(prev => ({ ...prev, codigo: e.target.value }))}
                    className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3 py-2 font-mono text-[#111C2D] outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#111C2D] block mb-1">Capacidad Aprendices</label>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={formAmbiente.capacidadAprendices}
                    onChange={(e) => setFormAmbiente(prev => ({ ...prev, capacidadAprendices: Number(e.target.value) }))}
                    className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3 py-2 font-semibold text-[#111C2D] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#111C2D] block mb-1">Tipo de Ambiente</label>
                  <select
                    value={formAmbiente.tipo}
                    onChange={(e) => setFormAmbiente(prev => ({ ...prev, tipo: e.target.value as any }))}
                    className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3 py-2 font-medium text-[#111C2D] outline-none"
                  >
                    <option value="Ambiente TIC">Ambiente TIC</option>
                    <option value="Laboratorio">Laboratorio</option>
                    <option value="Taller">Taller</option>
                    <option value="Auditorio">Auditorio</option>
                    <option value="Virtual">Virtual</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#111C2D] block mb-1">Estado</label>
                  <select
                    value={formAmbiente.estado}
                    onChange={(e) => setFormAmbiente(prev => ({ ...prev, estado: e.target.value as any }))}
                    className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3 py-2 font-medium text-[#111C2D] outline-none"
                  >
                    <option value="DISPONIBLE">Disponible</option>
                    <option value="OCUPADO">Ocupado</option>
                    <option value="EN_MANTENIMIENTO">En Mantenimiento</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#111C2D] block mb-1">Equipamiento y Recursos</label>
                <input
                  type="text"
                  placeholder="30 PCs Core i7, Pantalla interactiva, etc."
                  value={formAmbiente.equipamiento}
                  onChange={(e) => setFormAmbiente(prev => ({ ...prev, equipamiento: e.target.value }))}
                  className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3 py-2 font-medium text-[#111C2D] outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalAmbienteOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#005A8C] hover:bg-[#004266] text-white font-bold shadow-xs flex items-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar Ambiente</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
