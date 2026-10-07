import React from 'react';
import { Building2, X, Save } from 'lucide-react';
import { RegionalCentro } from '../types';

interface EditarCentroModalProps {
  centro: RegionalCentro;
  onGuardar: (centro: RegionalCentro) => void;
  onCerrar: () => void;
}

/**
 * Edita los datos del centro de formación (nombre, regional, código y sede).
 * Estos datos se muestran en el menú lateral y en el encabezado de los
 * reportes exportados.
 */
export const EditarCentroModal: React.FC<EditarCentroModalProps> = ({ centro, onGuardar, onCerrar }) => {
  const [form, setForm] = React.useState<RegionalCentro>({ ...centro });
  const set = (campo: keyof RegionalCentro, valor: string) => setForm(f => ({ ...f, [campo]: valor }));
  const valido = form.centro.trim().length > 0;

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valido) return;
    onGuardar({ ...centro, centro: form.centro.trim(), regional: form.regional.trim() });
  };

  const campo = (etiqueta: string, clave: keyof RegionalCentro, placeholder: string, obligatorio = false) => (
    <label className="block">
      <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
        {etiqueta}{obligatorio && <span className="text-red-500"> *</span>}
      </span>
      <input
        type="text"
        value={form[clave]}
        onChange={e => set(clave, e.target.value)}
        placeholder={placeholder}
        autoFocus={clave === 'centro'}
        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-[#111C2D] focus:outline-none focus:ring-2 focus:ring-[#0D631B]/30 focus:border-[#0D631B]"
      />
    </label>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50" onMouseDown={e => { if (e.target === e.currentTarget) onCerrar(); }}>
      <form onSubmit={guardar} className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-[#F0F4FA]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0D631B] text-white flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#111C2D]">Centro de formación</h2>
              <p className="text-[11px] text-slate-500">Se guarda en Supabase y se ve igual en todos los equipos.</p>
            </div>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3.5">
          {campo('Nombre del centro', 'centro', 'Ej: Centro de Comercio y Servicios', true)}
          {campo('Regional', 'regional', 'Ej: Regional Córdoba')}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-slate-200 bg-slate-50">
          <button type="button" onClick={onCerrar} className="px-4 py-2 text-sm font-semibold text-slate-600 rounded-lg hover:bg-slate-200/70">
            Cancelar
          </button>
          <button type="submit" disabled={!valido} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white rounded-lg bg-[#0D631B] hover:bg-[#0A4D15] disabled:opacity-50 disabled:cursor-not-allowed">
            <Save className="w-4 h-4" /> Guardar
          </button>
        </div>
      </form>
    </div>
  );
};
