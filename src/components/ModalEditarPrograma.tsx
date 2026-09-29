import React from 'react';
import { 
  X, 
  BookOpen, 
  CheckCircle2, 
  Layers, 
  Hash, 
  GraduationCap, 
  Clock, 
  Sparkles, 
  AlertTriangle, 
  Database, 
  Loader2, 
  Copy, 
  Check,
  Building2,
  FileText
} from 'lucide-react';
import { ProgramaFormacion, Ficha } from '../types';
import { isSupabaseConfigured } from '../lib/supabaseClient';

interface ModalEditarProgramaProps {
  isOpen: boolean;
  onClose: () => void;
  programa: ProgramaFormacion | null;
  fichas: Ficha[];
  onGuardarPrograma: (programaActualizado: ProgramaFormacion, oldCodigo: string) => Promise<void>;
}

export const ModalEditarPrograma: React.FC<ModalEditarProgramaProps> = ({
  isOpen,
  onClose,
  programa,
  fichas,
  onGuardarPrograma
}) => {
  const isEditing = Boolean(programa && programa.id);

  // Estados del formulario
  const [codigo, setCodigo] = React.useState('');
  const [nombre, setNombre] = React.useState('');
  const [version, setVersion] = React.useState('1');
  const [nivelFormacion, setNivelFormacion] = React.useState<'Auxiliar' | 'Técnico' | 'Tecnólogo'>('Tecnólogo');
  const [lineaTecnologica, setLineaTecnologica] = React.useState('');
  const [redConocimiento, setRedConocimiento] = React.useState('');
  const [duracionLectivaHoras, setDuracionLectivaHoras] = React.useState(3120);
  const [duracionProductivaHoras, setDuracionProductivaHoras] = React.useState(864);
  const [estado, setEstado] = React.useState<'ACTIVO' | 'EN_REVISION' | 'INACTIVO'>('ACTIVO');
  const [descripcion, setDescripcion] = React.useState('');

  const [saving, setSaving] = React.useState(false);
  const [copiedSql, setCopiedSql] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
    sqlTip?: string;
  } | null>(null);

  // Inicializar campos cuando cambia el programa seleccionado
  React.useEffect(() => {
    if (programa) {
      setCodigo(programa.codigo || '');
      setNombre(programa.nombre || '');
      setVersion(programa.version || '1');
      setNivelFormacion(programa.nivelFormacion || 'Tecnólogo');
      setLineaTecnologica(programa.lineaTecnologica || 'Tecnologías de la Información y las Comunicaciones');
      setRedConocimiento(programa.redConocimiento || 'Informática, Diseño y Desarrollo de Software');
      setDuracionLectivaHoras(programa.duracionLectivaHoras || 3120);
      setDuracionProductivaHoras(programa.duracionProductivaHoras || 864);
      setEstado(programa.estado || 'ACTIVO');
      setDescripcion(programa.descripcion || '');
    } else {
      // Valores predeterminados para nuevo programa
      setCodigo('');
      setNombre('');
      setVersion('1');
      setNivelFormacion('Tecnólogo');
      setLineaTecnologica('Tecnologías de la Información y las Comunicaciones');
      setRedConocimiento('Informática, Diseño y Desarrollo de Software');
      setDuracionLectivaHoras(3120);
      setDuracionProductivaHoras(864);
      setEstado('ACTIVO');
      setDescripcion('');
    }
    setFeedback(null);
  }, [programa, isOpen]);

  if (!isOpen) return null;

  // Contar cuántas fichas están asociadas a este programa (por código actual o anterior)
  const oldCodigo = programa?.codigo || '';
  const fichasAsociadas = fichas.filter(f => f.programaCodigo === oldCodigo);

  const duracionTotalCalculada = Number(duracionLectivaHoras || 0) + Number(duracionProductivaHoras || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!codigo.trim() || !nombre.trim()) {
      alert('Por favor complete el Código y Nombre del programa de formación.');
      return;
    }

    const programaActualizado: ProgramaFormacion = {
      id: programa?.id || `prog_${Date.now()}`,
      codigo: codigo.trim(),
      nombre: nombre.trim(),
      version: version.trim() || '1',
      nivelFormacion,
      lineaTecnologica: lineaTecnologica.trim(),
      redConocimiento: redConocimiento.trim(),
      duracionLectivaHoras: Number(duracionLectivaHoras),
      duracionProductivaHoras: Number(duracionProductivaHoras),
      duracionTotalHoras: duracionTotalCalculada,
      estado,
      descripcion: descripcion.trim()
    };

    setSaving(true);
    setFeedback(null);

    try {
      await onGuardarPrograma(programaActualizado, oldCodigo);
      setFeedback({
        type: 'success',
        message: `¡Programa "${programaActualizado.nombre}" guardado con éxito! Se sincronizaron las ${fichasAsociadas.length} fichas vinculadas.`
      });
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      const isRls = err?.message?.toLowerCase().includes('row-level security') || err?.code === '42501';
      setFeedback({
        type: isRls ? 'warning' : 'error',
        message: isRls 
          ? 'El programa se actualizó localmente. Supabase requiere deshabilitar RLS para permitir sincronización automática.'
          : (err.message || 'Error al guardar el programa'),
        sqlTip: isRls ? 'ALTER TABLE public.fichas DISABLE ROW LEVEL SECURITY;' : undefined
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCopySql = (sql: string) => {
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in zoom-in-95 duration-150">
        {/* Cabecera del Modal */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-white to-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#0D631B] text-white flex items-center justify-center shadow-md shadow-[#0D631B]/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                  {isEditing ? 'Gestión Curricular SENA' : 'Nuevo Registro Curricular'}
                </span>
                {oldCodigo && (
                  <span className="text-[11px] font-mono text-slate-400">
                    Cód. {oldCodigo}
                  </span>
                )}
              </div>
              <h2 className="text-base font-black text-[#111C2D]">
                {isEditing ? `Editar Programa: ${nombre || 'Sin Título'}` : 'Registrar Nuevo Programa de Formación'}
              </h2>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Banner informativo de fichas impactadas */}
          {isEditing && (
            <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl flex items-start space-x-3 text-xs text-blue-900">
              <Layers className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">
                  Sincronización en cascada activada ({fichasAsociadas.length} fichas asociadas)
                </p>
                <p className="text-blue-700 leading-relaxed">
                  Cualquier ajuste en la denominación, código, versión o nivel actualizará automáticamente todas las fichas vinculadas (ej. Ficha {fichasAsociadas.map(f => f.numero_ficha).slice(0, 3).join(', ') || 'sin fichas'}) en el sistema y en Supabase.
                </p>
              </div>
            </div>
          )}

          {/* Bloque 1: Identificación y Denominación */}
          <div className="space-y-3">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Hash className="w-3.5 h-3.5 text-[#0D631B]" />
              <span>Identificación Oficial del Programa</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Código de Programa *
                </label>
                <input
                  id="input-programa-codigo"
                  type="text"
                  required
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="Ej: 228118"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-[#111C2D] focus:outline-none focus:border-[#0D631B] focus:ring-1 focus:ring-[#0D631B]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Denominación Oficial del Programa *
                </label>
                <input
                  id="input-programa-nombre"
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: ADSO: Análisis y Desarrollo de Software"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-[#111C2D] focus:outline-none focus:border-[#0D631B] focus:ring-1 focus:ring-[#0D631B]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Versión del Programa
                </label>
                <input
                  id="input-programa-version"
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="1"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-[#111C2D] focus:outline-none focus:border-[#0D631B] focus:ring-1 focus:ring-[#0D631B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nivel de Formación
                </label>
                <select
                  id="select-programa-nivel"
                  value={nivelFormacion}
                  onChange={(e) => setNivelFormacion(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-[#111C2D] bg-white focus:outline-none focus:border-[#0D631B] focus:ring-1 focus:ring-[#0D631B]"
                >
                  <option value="Tecnólogo">Tecnólogo (24 Meses)</option>
                  <option value="Técnico">Técnico (12-15 Meses)</option>
                  <option value="Auxiliar">Auxiliar / Operario (6 Meses)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Estado Curricular
                </label>
                <select
                  id="select-programa-estado"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-[#111C2D] bg-white focus:outline-none focus:border-[#0D631B] focus:ring-1 focus:ring-[#0D631B]"
                >
                  <option value="ACTIVO">ACTIVO (En Oferta)</option>
                  <option value="EN_REVISION">EN REVISIÓN / AJUSTE</option>
                  <option value="INACTIVO">INACTIVO / HISTÓRICO</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bloque 2: Red y Línea Tecnológica */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#0D631B]" />
              <span>Línea Tecnológica & Red de Conocimiento</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Red de Conocimiento
                </label>
                <input
                  id="input-programa-red"
                  type="text"
                  value={redConocimiento}
                  onChange={(e) => setRedConocimiento(e.target.value)}
                  placeholder="Ej: Informática, Diseño y Desarrollo de Software"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-[#111C2D] focus:outline-none focus:border-[#0D631B] focus:ring-1 focus:ring-[#0D631B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Línea Tecnológica
                </label>
                <input
                  id="input-programa-linea"
                  type="text"
                  value={lineaTecnologica}
                  onChange={(e) => setLineaTecnologica(e.target.value)}
                  placeholder="Ej: Tecnologías de la Información y las Comunicaciones"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-[#111C2D] focus:outline-none focus:border-[#0D631B] focus:ring-1 focus:ring-[#0D631B]"
                />
              </div>
            </div>
          </div>

          {/* Bloque 3: Cargas Horarias Pedagógicas */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-[#0D631B]" />
              <span>Intensidad Horaria Oficial (Formato F001-008-25)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Horas Etapa Lectiva (h)
                </label>
                <input
                  id="input-programa-horas-lectivas"
                  type="number"
                  min="0"
                  value={duracionLectivaHoras}
                  onChange={(e) => setDuracionLectivaHoras(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-[#111C2D] focus:outline-none focus:border-[#0D631B] focus:ring-1 focus:ring-[#0D631B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Horas Etapa Productiva (h)
                </label>
                <input
                  id="input-programa-horas-productivas"
                  type="number"
                  min="0"
                  value={duracionProductivaHoras}
                  onChange={(e) => setDuracionProductivaHoras(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-[#111C2D] focus:outline-none focus:border-[#0D631B] focus:ring-1 focus:ring-[#0D631B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Total Horas Programa
                </label>
                <div className="px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono font-black text-emerald-800">
                  {duracionTotalCalculada} h
                </div>
              </div>
            </div>
          </div>

          {/* Bloque 4: Justificación o Perfil Curricular */}
          <div className="space-y-1 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Descripción y Alcance del Programa
            </label>
            <textarea
              id="textarea-programa-descripcion"
              rows={2}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Competencias clave, perfil de egreso y objetivos pedagógicos..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-[#111C2D] focus:outline-none focus:border-[#0D631B] focus:ring-1 focus:ring-[#0D631B]"
            />
          </div>

          {/* Feedback de Sincronización */}
          {feedback && (
            <div className={`p-4 rounded-xl border text-xs leading-relaxed animate-in fade-in duration-150 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : feedback.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <div className="flex items-start space-x-2.5">
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-2 flex-1">
                  <p className="font-bold">{feedback.message}</p>
                  {feedback.sqlTip && (
                    <div className="p-2.5 bg-white/90 rounded-lg border border-amber-300 font-mono text-[11px] space-y-1.5">
                      <div className="flex items-center justify-between text-slate-500 font-sans font-bold">
                        <span>Ejecuta en Supabase SQL Editor:</span>
                        <button
                          type="button"
                          onClick={() => handleCopySql(feedback.sqlTip!)}
                          className="flex items-center space-x-1 text-emerald-700 hover:text-emerald-800 font-bold"
                        >
                          {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedSql ? '¡Copiado!' : 'Copiar SQL'}</span>
                        </button>
                      </div>
                      <code className="text-emerald-800 font-bold block bg-amber-50/50 p-1.5 rounded">
                        {feedback.sqlTip}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Acciones de Guardado */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-xs text-slate-500">
              <Database className="w-3.5 h-3.5 text-[#0D631B]" />
              <span>{isSupabaseConfigured ? 'Sincronización PostgreSQL Activa' : 'Persistencia Local'}</span>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                id="btn-guardar-programa"
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-[#0D631B] hover:bg-[#0a4d15] text-white font-bold shadow-md shadow-[#0D631B]/20 flex items-center space-x-2 transition-all disabled:opacity-75"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando Cambios...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isEditing ? 'Guardar Cambios del Programa' : 'Crear Programa de Formación'}</span>
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
