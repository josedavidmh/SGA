import React from 'react';
import { 
  X, 
  UserPlus, 
  Mail, 
  FileText, 
  Briefcase, 
  Clock, 
  CheckCircle2,
  Phone,
  Sparkles,
  Database,
  Loader2,
  Edit2,
  ShieldCheck,
  Info
} from 'lucide-react';
import { Instructor, EspecialidadTematica } from '../types';
import { generarUuid } from '../lib/id';
import { insertInstructorInSupabase, updateInstructorInSupabase } from '../services/supabaseService';
import { isSupabaseConfigured } from '../lib/supabaseClient';

interface ModalCrearInstructorProps {
  isOpen: boolean;
  onClose: () => void;
  instructorParaEditar?: Instructor | null;
  especialidadesDisponibles?: EspecialidadTematica[];
  onGuardarInstructor: (instructor: Instructor, crearCuentaUsuario?: boolean, claveUsuario?: string) => void;
}

const AVATAR_COLORS = [
  '#0D631B', // Verde SENA
  '#005A8C', // Azul institucional
  '#6F43C0', // Morado
  '#C67C00', // Ámbar
  '#C2185B', // Magenta
  '#00796B', // Teal
  '#455A64'  // Pizarra
];

const ESPECIALIDADES_BASE_DEFAULT = [
  'Programación de Software',
  'Bases de Datos',
  'Arquitectura de Redes y Ciberseguridad',
  'Biotecnología & Micropropagación',
  'Bilingüismo e Inglés',
  'Ética y Convivencia',
  'Matemáticas y Lógica',
  'SST y Medio Ambiente',
  'Emprendimiento e Innovación',
  'Comunicación Asertiva',
  'Física y Ciencias Aplicadas'
];

export const ModalCrearInstructor: React.FC<ModalCrearInstructorProps> = ({
  isOpen,
  onClose,
  instructorParaEditar = null,
  especialidadesDisponibles = [],
  onGuardarInstructor
}) => {
  const isEditing = !!instructorParaEditar;

  const [documento, setDocumento] = React.useState('');
  const [nombres, setNombres] = React.useState('');
  const [apellidos, setApellidos] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [telefono, setTelefono] = React.useState('');
  const [especialidad, setEspecialidad] = React.useState('Programación de Software');
  const [perfilTecnico, setPerfilTecnico] = React.useState('Ingeniero de Sistemas / Magíster en TI');
  const [maxHorasSemanales, setMaxHorasSemanales] = React.useState(32);
  const [selectedColor, setSelectedColor] = React.useState(AVATAR_COLORS[0]);
  const [estado, setEstado] = React.useState<'ACTIVO' | 'INACTIVO'>('ACTIVO');
  const [crearUsuario, setCrearUsuario] = React.useState(true);
  const [claveUsuario, setClaveUsuario] = React.useState('Sistema2026*');
  const [saving, setSaving] = React.useState(false);

  // Lista consolidada de especialidades temáticas
  const listaEspecialidades = React.useMemo(() => {
    const list = new Set<string>();
    especialidadesDisponibles.forEach(e => {
      if (e.nombre) list.add(e.nombre);
    });
    ESPECIALIDADES_BASE_DEFAULT.forEach(e => list.add(e));
    if (especialidad) list.add(especialidad);
    return Array.from(list);
  }, [especialidadesDisponibles, especialidad]);

  // Cargar datos si estamos editando
  React.useEffect(() => {
    if (instructorParaEditar) {
      setDocumento(instructorParaEditar.documento || '');
      setNombres(instructorParaEditar.nombres || '');
      setApellidos(instructorParaEditar.apellidos || '');
      setEmail(instructorParaEditar.email || '');
      setTelefono(instructorParaEditar.telefono || '');
      setEspecialidad(instructorParaEditar.especialidad || 'Programación de Software');
      setPerfilTecnico(instructorParaEditar.perfilTecnico || '');
      setMaxHorasSemanales(instructorParaEditar.maxHorasSemanales || 32);
      setSelectedColor(instructorParaEditar.colorAvatar || AVATAR_COLORS[0]);
      setEstado(instructorParaEditar.estado || 'ACTIVO');
      setCrearUsuario(false); // ya existe
    } else {
      setDocumento('');
      setNombres('');
      setApellidos('');
      setEmail('');
      setTelefono('');
      setEspecialidad('Programación de Software');
      setPerfilTecnico('Ingeniero de Sistemas / Magíster en TI');
      setMaxHorasSemanales(32);
      setSelectedColor(AVATAR_COLORS[0]);
      setEstado('ACTIVO');
      setCrearUsuario(true);
      setClaveUsuario('Sistema2026*');
    }
  }, [instructorParaEditar, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documento.trim() || !nombres.trim() || !apellidos.trim()) {
      alert('Por favor complete la identificación/documento, nombres y apellidos del instructor.');
      return;
    }

    const emailOficial = email.trim() || `${nombres.toLowerCase().split(' ')[0]}.${apellidos.toLowerCase().split(' ')[0]}@correo.edu.co`;

    const instructorPayload: Instructor = {
      // UUID real: la fila insertada en Supabase usa este mismo id (ver insertInstructorInSupabase),
      // así una Ficha creada en la misma sesión puede referenciarlo como instructor líder sin
      // esperar a una resincronización.
      id: instructorParaEditar ? instructorParaEditar.id : generarUuid(),
      documento: documento.trim(),
      nombres: nombres.trim(),
      apellidos: apellidos.trim(),
      nombreCompleto: `Ing. ${nombres.trim()} ${apellidos.trim()}`,
      email: emailOficial,
      telefono: telefono.trim(),
      perfilTecnico: perfilTecnico.trim() || 'Instructor de Formación Profesional Integral',
      especialidad,
      colorAvatar: selectedColor,
      horasSemanalesAsignadas: instructorParaEditar ? instructorParaEditar.horasSemanalesAsignadas : 0,
      maxHorasSemanales: Number(maxHorasSemanales),
      estado: estado,
      competenciasExperiencia: instructorParaEditar?.competenciasExperiencia,
      rapsExperiencia: instructorParaEditar?.rapsExperiencia,
      totalJuiciosEvaluados: instructorParaEditar?.totalJuiciosEvaluados,
      historialEvaluaciones: instructorParaEditar?.historialEvaluaciones
    };

    setSaving(true);
    let finalInst = instructorPayload;
    let avisoSupabase: string | null = null;
    if (isSupabaseConfigured) {
      if (isEditing) {
        const res = await updateInstructorInSupabase(instructorPayload.id, instructorPayload);
        if (!res.success) {
          console.error('Error al actualizar instructor en Supabase:', res.error);
          avisoSupabase = res.error || 'Error desconocido al sincronizar con Supabase.';
        }
      } else {
        const res = await insertInstructorInSupabase(instructorPayload);
        if (res.success && res.data && res.data[0]) {
          finalInst = {
            ...instructorPayload,
            id: res.data[0].id || instructorPayload.id
          };
        } else if (!res.success) {
          // Antes esto se ignoraba en silencio y el modal mostraba éxito aunque
          // el instructor NUNCA hubiera llegado a Supabase (solo quedaba en
          // localStorage de este navegador). Ahora se avisa explícitamente.
          console.error('Error al insertar instructor en Supabase:', res.error);
          avisoSupabase = res.error || 'Error desconocido al sincronizar con Supabase.';
        }
      }
    }
    setSaving(false);

    onGuardarInstructor(finalInst, isEditing ? false : crearUsuario, claveUsuario);
    if (avisoSupabase) {
      alert(`El instructor se guardó localmente, pero NO se pudo sincronizar con Supabase (solo quedará en este navegador hasta corregirlo):\n\n${avisoSupabase}`);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
        {/* Cabecera */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
              isEditing ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-[#0D631B]'
            }`}>
              {isEditing ? <Edit2 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-black text-[#111C2D]">
                {isEditing ? 'Editar Datos del Instructor' : 'Registrar Nuevo Instructor'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {isEditing 
                  ? 'Modificación de perfil, especialidad temática e identificación'
                  : 'Habilitación de instructores para la red de centros de formación'}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aviso de No Tratamiento de Datos Sensibles (Habeas Data) */}
        <div className="mx-6 mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-start space-x-2.5 text-slate-600 text-[11px] leading-relaxed">
          <ShieldCheck className="w-4 h-4 text-[#0D631B] shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-800">Protección de Datos (No Sensibles):</strong> Se capturan únicamente datos de identificación institucional (Documento/Código, nombres, correo corporativo y especialidad) para fines pedagógicos y asignación de horarios. No se solicitan datos financieros, médicos ni de residencia privada.
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-[#111C2D] block mb-1">
                Identificación / Documento *
              </label>
              <input
                type="text"
                required
                placeholder="C.C. o código institucional"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3 py-2 font-semibold text-[#111C2D] focus:ring-2 focus:ring-[#0D631B] outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-[#111C2D] block mb-1">Nombres *</label>
              <input
                type="text"
                required
                placeholder="Ej. Laura María"
                value={nombres}
                onChange={(e) => setNombres(e.target.value)}
                className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3 py-2 font-semibold text-[#111C2D] focus:ring-2 focus:ring-[#0D631B] outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-[#111C2D] block mb-1">Apellidos *</label>
              <input
                type="text"
                required
                placeholder="Ej. Gómez Silva"
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value)}
                className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3 py-2 font-semibold text-[#111C2D] focus:ring-2 focus:ring-[#0D631B] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-[#111C2D] block mb-1">Correo Institucional (@correo.edu.co)</label>
              <input
                type="email"
                placeholder="laura.gomez@correo.edu.co"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3 py-2 font-medium text-[#111C2D] outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-[#111C2D] block mb-1">Teléfono Institucional / Contacto</label>
              <input
                type="tel"
                placeholder="315 456 7890"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3 py-2 font-medium text-[#111C2D] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-[#111C2D] block mb-1">Especialidad Temática</label>
              <select
                value={especialidad}
                onChange={(e) => setEspecialidad(e.target.value)}
                className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3 py-2 font-medium text-[#111C2D] outline-none"
              >
                {listaEspecialidades.map(esp => (
                  <option key={esp} value={esp}>{esp}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-[#111C2D] block mb-1">Tope Semanal Pedagógico (Horas)</label>
              <input
                type="number"
                min="10"
                max="40"
                value={maxHorasSemanales}
                onChange={(e) => setMaxHorasSemanales(Number(e.target.value))}
                className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3 py-2 font-bold text-[#0D631B] outline-none"
              />
              <span className="text-[10px] text-slate-400">Máx. 32h presenciales recomendadas</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-[#111C2D] block mb-1">Perfil Técnico / Titulación</label>
              <input
                type="text"
                placeholder="Ej. Ing. de Sistemas, Especialista TI"
                value={perfilTecnico}
                onChange={(e) => setPerfilTecnico(e.target.value)}
                className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3 py-2 font-medium text-[#111C2D] outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-[#111C2D] block mb-1">Estado de Habilitación</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as any)}
                className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3 py-2 font-semibold text-[#111C2D] outline-none"
              >
                <option value="ACTIVO">ACTIVO (Disponible para asignaciones)</option>
                <option value="INACTIVO">INACTIVO (En receso / novedad)</option>
              </select>
            </div>
          </div>

          {/* Selector de Color de Avatar */}
          <div>
            <label className="font-bold text-[#111C2D] block mb-1">Color Distintivo de Identificación</label>
            <div className="flex items-center space-x-2 pt-1">
              {AVATAR_COLORS.map(color => (
                <button
                  type="button"
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    selectedColor === color ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Creación Automática de Cuenta de Usuario (Solo si es nuevo) */}
          {!isEditing && (
            <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 space-y-2.5">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={crearUsuario}
                    onChange={(e) => setCrearUsuario(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0D631B] focus:ring-[#0D631B] border-slate-300"
                  />
                  <span className="font-bold text-xs text-slate-800">
                    Crear usuario de acceso al sistema para este instructor
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Rol: Instructor Líder
                </span>
              </label>

              {crearUsuario && (
                <div className="pt-2 border-t border-emerald-200/50 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block mb-1">Correo de Acceso:</span>
                    <div className="font-mono text-[11px] text-slate-700 bg-white px-2.5 py-1.5 rounded-lg border border-emerald-200 truncate">
                      {email.trim() || (nombres.trim() && apellidos.trim() ? `${nombres.toLowerCase().split(' ')[0]}.${apellidos.toLowerCase().split(' ')[0]}@correo.edu.co` : 'instructor@correo.edu.co')}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="clave-inst-user" className="text-[10px] text-slate-500 font-bold block mb-1">
                      Contraseña Inicial:
                    </label>
                    <input
                      id="clave-inst-user"
                      type="text"
                      value={claveUsuario}
                      onChange={(e) => setClaveUsuario(e.target.value)}
                      className="w-full font-mono text-[11px] bg-white px-2.5 py-1.5 rounded-lg border border-emerald-200 focus:border-[#0D631B] outline-none"
                      placeholder="Sistema2026*"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botones de acción */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`px-5 py-2 rounded-xl text-white font-bold shadow-md flex items-center space-x-2 transition-all ${
                isEditing 
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20' 
                  : 'bg-[#0D631B] hover:bg-[#0a4d15] shadow-[#0D631B]/20'
              }`}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>{isEditing ? 'Guardar Cambios del Instructor' : 'Registrar e Habilitar Instructor'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

