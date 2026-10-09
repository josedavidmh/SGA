import React from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';

/**
 * Selector de competencia con buscador (el mismo de Horarios): con programas de
 * 19+ competencias, recorrer un <select> nativo es lento — aquí se escribe el
 * código, el tipo o un fragmento del nombre y la lista se filtra al instante
 * (sin importar tildes ni mayúsculas).
 *
 * La lista se dibuja en <body> con posición fija (portal) para que no la recorten
 * ventanas con scroll ni tablas con overflow.
 */
export interface CompetenciaOpcion {
  codigo: string;
  denominacion: string;
  tipo?: string;
}

export interface CompetenciaSearchSelectProps {
  competencias: CompetenciaOpcion[];
  selectedCodigo: string;
  onChange: (codigo: string) => void;
  /** Texto cuando no hay competencia seleccionada. */
  placeholder?: string;
  /** Si se indica, la lista empieza con esta opción ("Todas…") que limpia la selección (código vacío). */
  opcionTodas?: string;
  /** Texto del buscador interno. */
  placeholderBusqueda?: string;
}

export const CompetenciaSearchSelect: React.FC<CompetenciaSearchSelectProps> = ({
  competencias, selectedCodigo, onChange, placeholder = 'Selecciona una competencia...', opcionTodas, placeholderBusqueda = 'Buscar por código, tipo o nombre...'
}) => {
  const [abierto, setAbierto] = React.useState(false);
  const [busqueda, setBusqueda] = React.useState('');
  const botonRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [posicion, setPosicion] = React.useState<{ top: number; left: number; abreArriba: boolean; ancho: number } | null>(null);

  const ALTO_PANEL = 300;

  const calcularPosicion = React.useCallback(() => {
    const btn = botonRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const abreArriba = window.innerHeight - r.bottom < ALTO_PANEL && r.top > ALTO_PANEL;
    const ancho = Math.max(300, r.width);
    const left = Math.max(8, Math.min(r.left, window.innerWidth - ancho - 8));
    setPosicion({ top: abreArriba ? r.top - 4 : r.bottom + 4, left, abreArriba, ancho });
  }, []);

  const cerrar = React.useCallback(() => {
    setAbierto(false);
    setBusqueda('');
  }, []);

  React.useLayoutEffect(() => {
    if (!abierto) return;
    calcularPosicion();
    const alMoverse = () => calcularPosicion();
    window.addEventListener('scroll', alMoverse, true);
    window.addEventListener('resize', alMoverse);
    const handleClickFuera = (e: MouseEvent) => {
      const t = e.target as Node;
      if (botonRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      cerrar();
    };
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar(); };
    document.addEventListener('mousedown', handleClickFuera);
    document.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('scroll', alMoverse, true);
      window.removeEventListener('resize', alMoverse);
      document.removeEventListener('mousedown', handleClickFuera);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [abierto, calcularPosicion, cerrar]);

  const seleccionada = competencias.find(c => c.codigo === selectedCodigo);

  const filtradas = React.useMemo(() => {
    const norm = (t?: string) => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const txt = norm(busqueda.trim());
    if (!txt) return competencias;
    return competencias.filter(c =>
      norm(c.codigo).includes(txt) || norm(c.denominacion).includes(txt) || norm(c.tipo).includes(txt)
    );
  }, [competencias, busqueda]);

  const panel = abierto && posicion ? (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: posicion.left,
        width: posicion.ancho,
        ...(posicion.abreArriba ? { bottom: window.innerHeight - posicion.top } : { top: posicion.top })
      }}
      className="z-[100] bg-white rounded-xl border border-slate-200 shadow-xl p-1.5 space-y-1"
    >
      <div className="relative">
        <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          autoFocus
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder={placeholderBusqueda}
          className="w-full pl-6 pr-2 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#0D631B]"
        />
      </div>
      <div className="max-h-56 overflow-y-auto">
        {opcionTodas && (
          <button
            type="button"
            onClick={() => { onChange(''); cerrar(); }}
            className={`w-full text-left px-2 py-1.5 text-xs rounded-lg hover:bg-[#E8F5E9] ${selectedCodigo === '' ? 'bg-[#E8F5E9] font-bold text-[#0D631B]' : 'text-slate-500'}`}
          >
            {opcionTodas}
          </button>
        )}
        {filtradas.length === 0 ? (
          <div className="px-2 py-2 text-[11px] text-slate-400 text-center">Sin resultados</div>
        ) : (
          filtradas.map(comp => (
            <button
              key={comp.codigo}
              type="button"
              onClick={() => { onChange(comp.codigo); cerrar(); }}
              className={`w-full text-left px-2 py-1.5 text-xs rounded-lg hover:bg-[#E8F5E9] ${
                comp.codigo === selectedCodigo ? 'bg-[#E8F5E9] font-bold text-[#0D631B]' : 'text-slate-700'
              }`}
            >
              <span className="font-mono">[{comp.codigo}]</span> {comp.tipo ? `${comp.tipo} - ` : ''}{comp.denominacion}
            </button>
          ))
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className="relative">
      <button
        ref={botonRef}
        type="button"
        onClick={() => (abierto ? cerrar() : setAbierto(true))}
        aria-expanded={abierto}
        className="w-full flex items-center justify-between space-x-2 bg-[#F8F9FA] border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-[#111C2D] focus:ring-2 focus:ring-[#0D631B] outline-none transition-all text-left"
      >
        <span className="truncate">
          {seleccionada
            ? `[${seleccionada.codigo}] ${seleccionada.tipo ? `${seleccionada.tipo} - ` : ''}${seleccionada.denominacion.slice(0, 65)}${seleccionada.denominacion.length > 65 ? '...' : ''}`
            : placeholder}
        </span>
        <Search className="w-3.5 h-3.5 shrink-0 text-slate-400" />
      </button>
      {panel && createPortal(panel, document.body)}
    </div>
  );
};
