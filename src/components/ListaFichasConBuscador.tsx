import React from 'react';
import { Search } from 'lucide-react';
import { Ficha } from '../types';

/**
 * Lista de fichas para elegir una, con buscador (número, programa, jornada,
 * líder o ambiente). Se usa cuando no hay ficha seleccionada en Horarios y
 * Seguimiento, para que siga siendo cómoda cuando haya muchas fichas.
 */
export const ListaFichasConBuscador: React.FC<{ fichas: Ficha[]; onSelect: (f: Ficha) => void }> = ({ fichas, onSelect }) => {
  const [busqueda, setBusqueda] = React.useState('');
  const filtradas = React.useMemo(() => {
    const norm = (t?: string) => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const q = norm(busqueda.trim());
    const orden = [...fichas].sort((a, b) => a.numero_ficha.localeCompare(b.numero_ficha));
    if (!q) return orden;
    return orden.filter(f => norm(`${f.numero_ficha} ${f.programaNombre} ${f.programaCodigo} ${f.modalidad} ${f.instructorLiderNombre} ${f.ambientePrincipal}`).includes(q));
  }, [fichas, busqueda]);

  return (
    <div className="pt-2 text-left space-y-2">
      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
        Fichas Disponibles por Programa de Formación
      </div>
      {fichas.length > 4 && (
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar ficha, programa, jornada, líder o ambiente…"
            className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#0D631B]"
          />
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto p-1">
        {filtradas.length === 0 ? (
          <div className="sm:col-span-2 p-4 text-center text-xs text-slate-400">Sin resultados para "{busqueda}"</div>
        ) : filtradas.map(f => (
          <button
            key={f.id}
            onClick={() => onSelect(f)}
            className="p-3 rounded-xl bg-slate-50 hover:bg-[#E8F5E9] hover:border-[#C8E6C9] border border-slate-200 text-left transition-all group"
          >
            {/* Se muestra PRIMERO el programa */}
            <div className="text-xs font-bold text-[#111C2D] group-hover:text-[#0D631B] truncate">
              {f.programaNombre}
            </div>
            <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-1">
              <span className="font-mono font-bold text-slate-700 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                Ficha {f.numero_ficha}
              </span>
              <span>•</span>
              <span>{f.modalidad}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
