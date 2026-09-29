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
import { InstructorSearchSelect } from './InstructorSearchSelect';
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
  const [numeroFicha, setNumeroFicha] = React.useState('');
  const [programaNombre, setProgramaNombre] = React.useState('ADSO: Análisis y Desarrollo de Software');
  const [programaCodigo, setProgramaCodigo] = React.useState('228118');
  const [version, setVersion] = React.useState('1');
  const [nivelFormacion, setNivelFormacion] = React.useState<'Técnico' | 'Tecnólogo' | 'Auxiliar'>('Tecnólogo');
  const [modalidad, setModalidad] = React.useState<'Presencial Diurna' | 'Presencial Nocturna' | 'Mixta / Virtual'>('Presencial Diurna');
  const [ambientePrincipal, setAmbientePrincipal] = React.useState('');
  const [periodoLectivo, setPeriodoLectivo] = React.useState('2026-III');
  const [fechaInicio, setFechaInicio] = React.useState('2026-07-01');
  const [fechaFin, setFechaFin] = React.useState('2027-12-15');
  const [matriculaInicial, setMatriculaInicial] = React.useState(32);

  // El Instructor Líder SIEMPRE se selecciona de la lista de instructores ya
  // registrados (nunca se captura manualmente desde este formulario) — el
  // alta de instructores nuevos vive únicamente en el módulo Instructores.
  const [instructorLiderId, setInstructorLiderId] = React.useState('');

  // Horas Lectivas (incluye trabajo autónomo) y Etapa Productiva
  const [horasDirectas, setHorasDirectas] = React.useState(3120);
  const [horasIndependientes, setHorasIndependientes] = React.useState(864);

  // Sincroniza TODOS los campos del formulario con la ficha real cada vez que el modal
  // se abre (crear o editar). Antes, al estar este componente montado una sola vez para
  // toda la sesión de la app, los useState de arriba solo se inicializaban con la PRIMERA
  // ficha que se editara (o en blanco si aún no se había editado ninguna) — reabrir el
  // modal para editar cualquier OTRA ficha dejaba todos los campos desactualizados o en
  // blanco, incluidos el Número de Ficha y el Ambiente de Formación reportados por el
  // usuario como "se borran" — con el riesgo real de sobrescribir la ficha real con esos
  // valores obsoletos/vacíos al guardar (por ejemplo, vaciando ambientePrincipal, lo que a
  // su vez hacía que los reportes de ambientes cayeran a datos históricos del bloque en
  // lugar del ambiente real vigente de la ficha).
  React.useEffect(() => {
    if (!isOpen) return;
    if (fichaEditar) {
      setNumeroFicha(fichaEditar.numero_ficha || '');
      setProgramaNombre(fichaEditar.programaNombre || 'ADSO: Análisis y Desarrollo de Software');
      setProgramaCodigo(fichaEditar.programaCodigo || '228118');
      setVersion(fichaEditar.version || '1');
      setNivelFormacion(fichaEditar.nivelFormacion || 'Tecnólogo');
      setModalidad(fichaEditar.modalidad || 'Presencial Diurna');
      setAmbientePrincipal(fichaEditar.ambientePrincipal || '');
      setPeriodoLectivo(fichaEditar.periodoLectivo || '2026-III');
      setFechaInicio(fichaEditar.fechaInicio || '2026-07-01');
      setFechaFin(fichaEditar.fechaFin || '2027-12-15');
      setMatriculaInicial(fichaEditar.matriculaInicial || 32);
      const instExiste = instructores.some(i => i.id === fichaEditar.instructorLiderId);
      // Si la ficha no tiene líder válido, queda sin líder (no se asigna uno cualquiera).
      setInstructorLiderId(instExiste ? fichaEditar.instructorLiderId : '');
      setHorasDirectas(fichaEditar.horasDirectasTotales || 3120);
      setHorasIndependientes(fichaEditar.horasIndependientesTotales || 864);
    } else {
      setNumeroFicha('');
      setProgramaNombre('ADSO: Análisis y Desarrollo de Software');
      setProgramaCodigo('228118');
      setVersion('1');
      setNivelFormacion('Tecnólogo');
      setModalidad('Presencial Diurna');
      setAmbientePrincipal('');
      setPeriodoLectivo('2026-III');
      setFechaInicio('2026-07-01');
      setFechaFin('2027-12-15');
      setMatriculaInicial(32);
      setInstructorLiderId('');
      setHorasDirectas(3120);
      setHorasIndependientes(864);
    }
    // Se sincroniza deliberadamente solo con isOpen/fichaEditar: `instructores` se lee
    // dentro para resolver el instructor líder por defecto, pero no debe disparar una
    // resincronización mientras el modal ya está abierto y el usuario está escribiendo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, fichaEditar]);

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
      alert('Por favor ingrese el número de ficha oficial.');
      return;
    }
    if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
      alert('La fecha de finalización no puede ser anterior a la fecha de inicio de la etapa lectiva.');
      return;
    }

    // Sin líder todavía: se guarda vacío (en Supabase queda NULL), no un id inventado.
    let finalInstId = '';
    let finalInstNombre = 'Por asignar';
    let finalInstEmail = '';

    if (instructorLiderId) {
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
                {modoEdicion ? 'Modificar los datos de la ficha existente' : 'Creación manual de cohorte'}
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
              {/* Si la ficha tiene guardado un ambiente que ya no está en la
                  lista (p.ej. el valor de demostración "Ambiente 204 - TIC /
                  Software"), se muestra tal cual para que se vea qué tiene y
                  se pueda cambiar. Antes el selector aparecía en blanco y el
                  valor viejo se volvía a guardar sin que se notara. */}
              {ambientePrincipal && !ambientes.some(a => a.nombre === ambientePrincipal) && (
                <option value={ambientePrincipal}>⚠ {ambientePrincipal} (no registrado — elige otro)</option>
              )}
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

            </div>

            {instructores.length > 0 ? (
              <div className="space-y-1.5">
                {/* Mismo selector con buscador que en Seguimiento */}
                <InstructorSearchSelect
                  instructores={instructores}
                  selectedId={instructorLiderId}
                  onChange={setInstructorLiderId}
                  textoSinInstructor="— Sin instructor líder por ahora —"
                  mostrarCorreo
                  tamano="md"
                />
                <p className="text-[11px] text-slate-500">
                  Este instructor será el responsable directo de esta cohorte académica. Puedes dejarlo sin líder y asignarlo después.
                </p>
              </div>
            ) : (
              // El registro de instructores nuevos NO se hace desde aquí — solo se
              // selecciona entre los ya existentes. Si aún no hay ninguno, se dirige
              // al usuario al módulo Instructores en vez de ofrecer captura manual.
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 font-medium flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Aún no hay instructores registrados. Ve al módulo <strong>Instructores</strong> para
                  registrar uno antes de asignarlo como líder de esta ficha.
                </span>
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
