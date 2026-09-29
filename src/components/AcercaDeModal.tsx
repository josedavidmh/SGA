import React from 'react';
import { X, Code2, Sprout, GraduationCap } from 'lucide-react';

interface AcercaDeModalProps {
  onClose: () => void;
}

/**
 * Créditos del sistema. Acceso intencionalmente discreto (ver punto de entrada
 * en LoginView.tsx) — no se expone en la navegación principal.
 */
export const AcercaDeModal: React.FC<AcercaDeModalProps> = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-7 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-[#E8F5E9] text-[#0D631B] flex items-center justify-center mb-4">
          <GraduationCap className="w-7 h-7" />
        </div>

        <h2 className="text-lg font-black text-[#111C2D] tracking-tight">
          Sistema de Gestión Académica y Curricular
        </h2>
        <p className="text-xs text-slate-500 font-medium mt-1 mb-5">
          Herramienta de apoyo para el seguimiento curricular, académico y de
          horarios de instructores en centros de formación.
        </p>

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-9 h-9 rounded-lg bg-[#EDE7F6] text-[#6F43C0] flex items-center justify-center shrink-0">
              <Code2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Autor</div>
              <div className="text-sm font-bold text-slate-800">Jose David Montesino</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-[#0D631B] flex items-center justify-center shrink-0">
              <Sprout className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Semillero de Investigación</div>
              <div className="text-sm font-bold text-slate-800">Semillero Sistemas y Agroambiental</div>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 text-center mt-6">
          Desarrollado de forma independiente. Todos los datos institucionales
          y de aprendices se gestionan de manera local en el navegador del usuario.
        </p>
      </div>
    </div>
  );
};
