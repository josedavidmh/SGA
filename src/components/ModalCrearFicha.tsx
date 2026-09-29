import React from 'react';
import { 
  X, 
  Plus, 
  Layers, 
  Calendar, 
  User, 
  MapPin, 
  BookOpen, 
  GraduationCap, 
  CheckCircle2,
  Clock,
  Database,
  AlertTriangle,
  Copy,
  Check,
  Loader2,
  Pencil
} from 'lucide-react';
import { Ficha, Instructor, ProgramaFormacion, AmbienteAprendizaje } from '../types';
import { generarUuid } from '../lib/id';
import { insertFichaInSupabase } from '../services/supabaseService';
import { isSupabaseConfigured } from '../lib/supabaseClient';

interface ModalCrearFichaProps {
  isOpen: boolean;
  onClose: () => void;
  instructores: Instructor[];
  onCrearFicha: (nuevaFicha: Ficha) => void;
  onActualizarFicha?: (fichaActualizada: Ficha) => void;
  onRegistrarInstructor?: (instructor: Instructor, crearUsuario?: boolean) => void;
  programas?: ProgramaFormacion[];
  ambientes?: AmbienteAprendizaje[];
  fichaEditar?: Ficha | null;
}

export const ModalCrearFicha: React.FC<ModalCrearFichaProps> = ({
  isOpen,
  onClose,
  instructores,
  onCrearFicha,
  onActualizarFicha,
  onRegistrarInstructor,
  programas = [],
  ambientes = [],
  fichaEditar = null
}) => {
  const modoEdicion = !!fichaEditar;
  const [numeroFicha, setNumeroFicha] = React.useState(fichaEditar?.numero_ficha || '');
  const [programaNombre, setProgramaNombre] = React.useState(fichaEditar?.programaNombre || 'ADSO: Análisis y Desarrollo de Software');
  const [programaCodigo, setProgramaCodigo] = React.useState(fichaEditar?.programaCodigo || '228118');
  const [version, setVersion] = React.useState(fichaEditar?.version || '1');
  const [nivelFormacion, setNivelFormacion] = React.useState<'Técnico' | 'Tecnólogo' | 'Auxiliar'>(fichaEditar?.nivelFormacion || 'Tecnólogo');
  const [modalidad, setModalidad] = React.useState<'Presencial Diurna' | 'Presencial Nocturna' | 'Mixta / Virtual'>(fichaEditar?.modalidad || 'Presencial Diurna');
  const [ambientePrincipal, setAmbientePrincipal] = React.useState(fichaEditar?.ambientePrincipal || '');
  const [periodoLectivo, setPeriodoLectivo] = React.useState(fichaEditar?.periodoLectivo || '2026-III');
  const [fechaInicio, setFechaInicio] = React.useState(fichaEditar?.fechaInicio || '2026-07-01');
  const [fechaFin, setFechaFin] = React.useState(fichaEditar?.fechaFin || '2027-12-15');
  const [matriculaInicial, setMatriculaInicial] = React.useState(fichaEditar?.matriculaInicial || 32);
  
  // Modo de asignación de Instructor Líder
  const instExisteEnLista = fichaEditar ? instructores.some(i => i.id === fichaEditar.instructorLiderId) : false;
  const [modoInstructor, setModoInstructor] = React.useState<'EXISTENTE' | 'NUEVO'>(
    (modoEdicion && instExisteEnLista) ? 'EXISTENTE' : (instructores.length > 0 ? 'EXISTENTE' : 'NUEVO')
  );
  const [instructorLiderId, setInstructorLiderId] = React.useState(
    fichaEditar?.instructorLiderId || instructores[0]?.id || ''
  );
  const [nuevoInstructorNombre, setNuevoInstructorNombre] = React.useState('');
  const [nuevoInstructorEmail, setNuevoInstructorEmail] = React.useState('');
  const [nuevoInstructorDocumento, setNuevoInstructorDocumento] = React.useState('');
  const [nuevoInstructorEspecialidad, setNuevoInstructorEspecialidad] = React.useState('Ingeniería de Software & Arquitectura Cloud');
  const [crearUsuarioAcceso, setCrearUsuarioAcceso] = React.useState(true);

  // Horas Lectivas (incluye trabajo autónomo) y Etapa Productiva
  const [horasDirectas, setHorasDirectas] = React.useState(fichaEditar?.horasDirectasTotales || 3120);
  const [horasIndependientes, setHorasIndependientes] = React.useState(fichaEditar?.horasIndependientesTotales || 864);

  // Estados de Sincronización Supabase
  const [saving, setSaving] = React.useState<boolean>(false);
  const [copiedSql, setCopiedSql] = React.useState<boolean>(false);
  const [supabaseFeedback, setSupabaseFeedback] = React.useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
    sqlTip?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroFicha.trim()) {
      alert('Por favor ingrese el número de ficha oficial SENA.');
      return;
    }
    if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
      alert('La fecha de finalización no puede ser anterior a la fecha de inicio de la etapa lectiva.');
      return;
    }

    let finalInstId = 'inst_por_asignar';
    let finalInstNombre = 'Instructor Por Asignar';
    let finalInstEmail = 'instructor@misena.edu.co';

    if (modoInstructor === 'NUEVO' && nuevoInstructorNombre.trim()) {
      const docClean = nuevoInstructorDocumento.trim() || `cc_${Date.now()}`;
      const emailClean = nuevoInstructorEmail.trim().toLowerCase() || `inst.${nuevoInstructorNombre.toLowerCase().replace(/\s+/g, '.')}@misena.edu.co`;
      const idInst = `inst_${docClean}`;

      const nuevoInst: Instructor = {
        id: idInst,
        documento: nuevoInstructorDocumento.trim() || '100000000',
        nombres: nuevoInstructorNombre.split(' ')[0] || nuevoInstructorNombre,
        apellidos: nuevoInstructorNombre.split(' ').slice(1).join(' ') || '',
        nombreCompleto: nuevoInstructorNombre.trim(),
        email: emailClean,
        telefono: '3100000000',
        perfilTecnico: nuevoInstructorEspecialidad,
        especialidad: nuevoInstructorEspecialidad,
        colorAvatar: 'bg-emerald-600',
        horasSemanalesAsignadas: 0,
        maxHorasSemanales: 32,
        estado: 'ACTIVO'
      };

      if (onRegistrarInstructor) {
        onRegistrarInstructor(nuevoInst, crearUsuarioAcceso);
      }

      finalInstId = nuevoInst.id;
      finalInstNombre = nuevoInst.nombreCompleto;
      finalInstEmail = nuevoInst.email;
    } else if (modoInstructor === 'EXISTENTE' && instructorLiderId) {
      const instLider = instructores.find(i => i.id === instructorLiderId);
      if (instLider) {
        finalInstId = instLider.id;
        finalInstNombre = instLider.nombreCompleto;
        finalInstEmail = instLider.email;
      }
    }

    const fichaBase: Ficha = modoEdicion && fichaEditar ? fichaEditar : {
      // UUID real (no `ficha_<numero>`): las tablas de Supabase referencian fichas.id
      // como UUID, y numero_ficha ya se guarda aparte como identificador visible/de negocio.
      id: generarUuid(),
      numero_ficha: numeroFicha.trim(),
      programaCodigo: '',
      programaNombre: '',
      version: '1',
      nivelFormacion: 'Tecnólogo',
      instructorLiderId: '',
      instructorLiderNombre: '',
      instructorLiderEmail: '',
      modalidad: 'Presencial Diurna',
      ambientePrincipal: '',
      periodoLectivo: '',
      fechaInicio: '',
      fechaFin: '',
      matriculaInicial: 32,
      aprendicesActivos: 32,
      aprendicesCulminados: 0,
      aprendicesCancelados: 0,
      aprendicesAplazados: 0,
      aprendicesRetiroVoluntario: 0,
      aprendicesCondicionados: 0,
      aprendicesTrasladados: 0,
      tasaRetencion: 100,
      tasaDesercion: 0,
      estado: 'ACTIVA',
      progresoCurricular: 0,
      rapsTotales: 38,
      rapsEvaluados: 0,
      horasDirectasTotales: 3120,
      horasIndependientesTotales: 864,
      horasEjecutadas: 0
    };

    const nuevaFicha: Ficha = {
      ...fichaBase,
      numero_ficha: numeroFicha.trim(),
      programaCodigo,
      programaNombre,
      version,
      nivelFormacion,
      instructorLiderId: finalInstId,
      instructorLiderNombre: finalInstNombre,
      instructorLiderEmail: finalInstEmail,
      modalidad,
      ambientePrincipal,
      periodoLectivo,
      fechaInicio,
      fechaFin,
      matriculaInicial: Number(matriculaInicial),
      horasDirectasTotales: Number(horasDirectas),
      horasIndependientesTotales: Number(horasIndependientes)
    };

    setSaving(true);
    setSupabaseFeedback(null);

    // Modo edición: actualizar sin volver a insertar en Supabase
    if (modoEdicion) {
      if (onActualizarFicha) {
        onActualizarFicha(nuevaFicha);
      }
      setSaving(false);
      onClose();
      return;
    }

    if (isSupabaseConfigured) {
      const syncResult = await insertFichaInSupabase(nuevaFicha);
      if (syncResult.success) {
        onCrearFicha(nuevaFicha);
        setSupabaseFeedback({
          type: 'success',
          message: `¡Ficha ${nuevaFicha.numero_ficha} registrada e insertada en PostgreSQL (Supabase) con éxito!`
        });
        setTimeout(() => {
          setSaving(false);
          onClose();
        }, 1200);
        return;
      } else if (syncResult.isRlsError) {
        onCrearFicha(nuevaFicha);
        setSaving(false);
        setSupabaseFeedback({
          type: 'warning',
          message: `Ficha registrada en la vista local, pero Supabase bloqueó la escritura remota debido a las Políticas RLS de PostgreSQL (Código 42501).`,
          sqlTip: `ALTER TABLE public.fichas DISABLE ROW LEVEL SECURITY;`
        });
        return;
      } else {
        onCrearFicha(nuevaFicha);
        setSaving(false);
        setSupabaseFeedback({
          type: 'error',
          message: `Guardada localmente. Aviso de Supabase: ${syncResult.error}`
        });
        return;
      }
    } else {
      onCrearFicha(nuevaFicha);
      setSaving(false);
      onClose();
    }
  };

  const handleCopySql = (sql: string) => {
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
        {/* Cabecera Modal */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
              modoEdicion ? 'bg-blue-50 text-[#005A8C]' : 'bg-[#E8F5E9] text-[#0D631B]'
            }`}>
              {modoEdicion ? <Pencil className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-black text-[#111C2D]">
                {modoEdicion ? `Editar Ficha ${fichaEditar?.numero_ficha}` : 'Registrar Nueva Ficha de Formación'}
              </h2>
              <p className="text-xs text-slate-500">
                {modoEdicion ? 'Modificar los datos de la ficha existente' : 'Creación manual de cohorte en el Centro Biotecnológico del Caribe'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
          {/* Número de Ficha */}
          <div>
            <label className="font-bold text-[#111C2D] block mb-1">
              Número de Ficha (7 dígitos) *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. 2694123"
              value={numeroFicha}
              onChange={(e) => setNumeroFicha(e.target.value)}
              className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-[#111C2D] focus:ring-2 focus:ring-[#0D631B] outline-none"
            />
          </div>

          {/* Nombre del Programa */}
          <div>
            <label className="font-bold text-[#111C2D] block mb-1">
              Denominación del Programa de Formación *
            </label>
            <select
              value={programaCodigo}
              onChange={(e) => {
                const selectedCod = e.target.value;
                setProgramaCodigo(selectedCod);
                const found = programas.find(p => p.codigo === selectedCod);
                if (found) {
                  setProgramaNombre(found.nombre);
                  setVersion(found.version);
                  setNivelFormacion(found.nivelFormacion as any);
                  setHorasDirectas(found.duracionLectivaHoras);
                  setHorasIndependientes(found.duracionProductivaHoras);
                } else if (selectedCod === '228106') {
                  setProgramaNombre('Análisis y Desarrollo de Software');
                  setNivelFormacion('Tecnólogo');
                  setHorasDirectas(3120);
                } else if (selectedCod === '228101') {
                  setProgramaNombre('Producción Multimedia');
                  setNivelFormacion('Tecnólogo');
                  setHorasDirectas(3120);
                } else if (selectedCod === '233104') {
                  setProgramaNombre('Sistemas y Redes de Cómputo');
                  setNivelFormacion('Técnico');
                  setHorasDirectas(1760);
                } else if (selectedCod === '224108') {
                  setProgramaNombre('Biotecnología Vegetal y Agropecuaria');
                  setNivelFormacion('Tecnólogo');
                  setHorasDirectas(3120);
                }
              }}
              className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3 py-2.5 font-semibold text-[#111C2D] focus:ring-2 focus:ring-[#0D631B] outline-none"
            >
              {programas.length > 0 ? (
                programas.map(prog => (
                  <option key={prog.id} value={prog.codigo}>
                    {prog.codigo} - {prog.nombre} ({prog.nivelFormacion}, v{prog.version})
                  </option>
                ))
              ) : (
                <option value="228118">228118 - ADSO: Análisis y Desarrollo de Software</option>
              )}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Nivel de Formación */}
            <div>
              <label className="font-bold text-[#111C2D] block mb-1">Nivel</label>
              <select
                value={nivelFormacion}
                onChange={(e) => setNivelFormacion(e.target.value as any)}
                className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3 py-2 font-medium text-[#111C2D] outline-none"
              >
                <option value="Tecnólogo">Tecnólogo</option>
                <option value="Técnico">Técnico</option>
                <option value="Auxiliar">Auxiliar</option>
              </select>
            </div>

            {/* Modalidad */}
            <div>
              <label className="font-bold text-[#111C2D] block mb-1">Jornada / Modalidad</label>
              <select
                value={modalidad}
                onChange={(e) => setModalidad(e.target.value as any)}
                className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3 py-2 font-medium text-[#111C2D] outline-none"
              >
                <option value="Presencial Diurna">Presencial Diurna</option>
                <option value="Presencial Nocturna">Presencial Nocturna</option>
                <option value="Mixta / Virtual">Mixta / Virtual</option>
              </select>
            </div>

            {/* Periodo Lectivo */}
            <div>
              <label className="font-bold text-[#111C2D] block mb-1">Periodo Lectivo</label>
              <input
                type="text"
                value={periodoLectivo}
                onChange={(e) => setPeriodoLectivo(e.target.value)}
                className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3 py-2 font-semibold text-[#111C2D] outline-none"
              />
            </div>
          </div>

          {/* Fechas de la Ficha: inicio de la etapa lectiva y finalización */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-[#111C2D] block mb-1">Fecha de Inicio (Etapa Lectiva)</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3 py-2 font-medium text-[#111C2D] outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-[#111C2D] block mb-1">Fecha de Finalización</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                min={fechaInicio || undefined}
                className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3 py-2 font-medium text-[#111C2D] outline-none"
              />
              {fechaInicio && fechaFin && fechaFin < fechaInicio && (
                <p className="text-[10px] text-rose-600 mt-1">
                  ⚠ La fecha de finalización no puede ser anterior a la fecha de inicio.
                </p>
              )}
            </div>
          </div>

          {/* Ambiente Principal */}
          <div>
            <label className="font-bold text-[#111C2D] block mb-1">Ambiente de Formación</label>
            <select
              value={ambientePrincipal}
              onChange={(e) => setAmbientePrincipal(e.target.value)}
              className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3 py-2 font-medium text-[#111C2D] outline-none"
            >
              <option value="">-- Seleccionar ambiente --</option>
              {ambientes.length > 0 ? (
                ambientes.map(amb => (
                  <option key={amb.id} value={amb.nombre}>
                    {amb.nombre} ({amb.tipo} · Cap. {amb.capacidadAprendices})
                  </option>
                ))
              ) : (
                <option value="" disabled>No hay ambientes registrados aún</option>
              )}
            </select>
            {ambientes.length === 0 && (
              <p className="text-[10px] text-amber-600 mt-1">
                ⚠ Aún no hay ambientes registrados. Ve a Parametrizaciones &gt; Ambientes de Formación para agregarlos.
              </p>
            )}
          </div>

          {/* Instructor Líder de la Ficha */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="font-bold text-[#111C2D] text-xs flex items-center space-x-1.5">
                <User className="w-4 h-4 text-[#0D631B]" />
                <span>Instructor Líder Asignado a la Ficha</span>
              </label>

              <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-slate-200 text-[11px] font-bold">
                {instructores.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setModoInstructor('EXISTENTE')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      modoInstructor === 'EXISTENTE'
                        ? 'bg-[#0D631B] text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Instructor Existente
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setModoInstructor('NUEVO')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    modoInstructor === 'NUEVO'
                      ? 'bg-[#0D631B] text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  + Asignar Nuevo Líder
                </button>
              </div>
            </div>

            {modoInstructor === 'EXISTENTE' && instructores.length > 0 ? (
              <div>
                <select
                  value={instructorLiderId}
                  onChange={(e) => setInstructorLiderId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-[#111C2D] outline-none focus:border-[#0D631B]"
                >
                  {instructores.map(inst => (
                    <option key={inst.id} value={inst.id}>
                      {inst.nombreCompleto} — {inst.especialidad} ({inst.email})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Este instructor será el responsable directo de esta cohorte académica.
                </p>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Nombre Completo del Instructor Líder *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Ing. Mario Gómez Restrepo"
                      value={nuevoInstructorNombre}
                      onChange={(e) => setNuevoInstructorNombre(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-[#111C2D] outline-none focus:border-[#0D631B]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Correo Electrónico Institucional *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="Ej: mgomez@misena.edu.co"
                      value={nuevoInstructorEmail}
                      onChange={(e) => setNuevoInstructorEmail(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-[#111C2D] outline-none focus:border-[#0D631B]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Documento de Identidad (CC)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: 77189204"
                      value={nuevoInstructorDocumento}
                      onChange={(e) => setNuevoInstructorDocumento(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-[#111C2D] outline-none focus:border-[#0D631B]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Especialidad / Perfil Profesional
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Análisis y Desarrollo de Software"
                      value={nuevoInstructorEspecialidad}
                      onChange={(e) => setNuevoInstructorEspecialidad(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#111C2D] outline-none focus:border-[#0D631B]"
                    />
                  </div>
                </div>

                <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="crear-user-lider"
                      checked={crearUsuarioAcceso}
                      onChange={(e) => setCrearUsuarioAcceso(e.target.checked)}
                      className="w-4 h-4 text-[#0D631B] accent-[#0D631B] rounded"
                    />
                    <label htmlFor="crear-user-lider" className="font-bold text-[#0D631B] cursor-pointer text-[11px]">
                      Crear usuario de acceso para este Instructor Líder (Acceso exclusivo a sus fichas)
                    </label>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Clave: Sena2026*</span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Cupo / Matrícula */}
            <div>
              <label className="font-bold text-[#111C2D] block mb-1">Matrícula Inicial</label>
              <input
                type="number"
                min="1"
                max="60"
                value={matriculaInicial}
                onChange={(e) => setMatriculaInicial(Number(e.target.value))}
                className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3 py-2 font-bold text-[#111C2D] outline-none"
              />
            </div>

            {/* Horas Lectiva Total */}
            <div>
              <label className="font-bold text-[#111C2D] block mb-1">
                Horas Lectivas Totales
                <span className="ml-1 text-[10px] text-slate-400 font-normal">(incluye trabajo autónomo)</span>
              </label>
              <input
                type="number"
                value={horasDirectas}
                onChange={(e) => setHorasDirectas(Number(e.target.value))}
                className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3 py-2 font-bold text-[#0D631B] outline-none"
              />
            </div>

            {/* Horas Etapa Productiva */}
            <div>
              <label className="font-bold text-[#111C2D] block mb-1">
                Horas Etapa Productiva
                <span className="ml-1 text-[10px] text-slate-400 font-normal">(por aparte)</span>
              </label>
              <input
                type="number"
                value={horasIndependientes}
                onChange={(e) => setHorasIndependientes(Number(e.target.value))}
                className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700 outline-none"
              />
            </div>
          </div>

          {/* Feedback de Supabase */}
          {supabaseFeedback && (
            <div className={`p-4 rounded-xl border text-xs leading-relaxed animate-in fade-in duration-150 ${
              supabaseFeedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : supabaseFeedback.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <div className="flex items-start space-x-2.5">
                {supabaseFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-2 flex-1">
                  <p className="font-bold">{supabaseFeedback.message}</p>
                  {supabaseFeedback.sqlTip && (
                    <div className="p-2.5 bg-white/90 rounded-lg border border-amber-300 font-mono text-[11px] space-y-1.5">
                      <div className="flex items-center justify-between text-slate-500 font-sans font-bold">
                        <span>Ejecuta en Supabase SQL Editor para permitir guardado permanente:</span>
                        <button
                          type="button"
                          onClick={() => handleCopySql(supabaseFeedback.sqlTip!)}
                          className="flex items-center space-x-1 text-emerald-700 hover:text-emerald-800 font-bold"
                        >
                          {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedSql ? '¡Copiado!' : 'Copiar SQL'}</span>
                        </button>
                      </div>
                      <code className="text-emerald-800 font-bold block bg-amber-50/50 p-1.5 rounded">
                        {supabaseFeedback.sqlTip}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-xs text-slate-500">
              <Database className="w-3.5 h-3.5 text-[#0D631B]" />
              <span>{isSupabaseConfigured ? 'Sincronización Supabase Cloud Activa' : 'Almacenamiento Local'}</span>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                {supabaseFeedback ? 'Cerrar' : 'Cancelar'}
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`px-5 py-2 rounded-xl text-white font-bold shadow-md flex items-center space-x-2 transition-all disabled:opacity-75 ${
                  modoEdicion
                    ? 'bg-[#005A8C] hover:bg-[#004a75] shadow-[#005A8C]/20'
                    : 'bg-[#0D631B] hover:bg-[#0a4d15] shadow-[#0D631B]/20'
                }`}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : modoEdicion ? (
                  <>
                    <Pencil className="w-4 h-4" />
                    <span>Guardar Cambios</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Registrar Ficha en Sistema</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
