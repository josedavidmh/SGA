import React from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';
import { Instructor } from '../types';

/**
 * Selector de instructor con buscador. Reemplaza el <select> nativo (difícil
 * de escanear con catálogos grandes de instructores — Ley de Hick) por un
 * combobox filtrable por nombre o especialidad. Cada instancia vive dentro de
 * la fila de UN RAP específico: su `onChange` está ligado por closure al
 * `rap`/`competencia` de esa fila exclusivamente, así que seleccionar un
 * instructor aquí solo puede actualizar ese registro, nunca otros.
 */
export interface InstructorSearchSelectProps {
  instructores: Instructor[];
  selectedId?: string;
  /** Etiqueta de solo lectura cuando el instructor viene de Juicios SofiaPlus y no está en el catálogo editable. */
  customLabel?: string;
  onChange: (instructorId: string) => void;
  /** Texto de la opción "sin instructor" (por defecto "-- Sin Instructor Asignado --"). */
  textoSinInstructor?: string;
  /** Muestra también el correo bajo cada nombre (útil para elegir al líder de una ficha). */
  mostrarCorreo?: boolean;
  /** Tamaño del botón: 'sm' (tablas) o 'md' (formularios). */
  tamano?: 'sm' | 'md';
}

export const InstructorSearchSelect: React.FC<InstructorSearchSelectProps> = ({
  instructores, selectedId, customLabel, onChange,
  textoSinInstructor = '-- Sin Instructor Asignado --', mostrarCorreo = false, tamano = 'sm'
}) => {
  const [abierto, setAbierto] = React.useState(false);
  const [busqueda, setBusqueda] = React.useState('');
  const botonRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  // El panel se dibuja en <body> con posición fija (portal). Antes vivía
  // dentro de la tabla, que tiene scroll horizontal (overflow-x-auto): eso
  // recortaba todo lo que quedaba debajo del buscador, así que la lista de
  // instructores existía pero nunca se veía.
  const [posicion, setPosicion] = React.useState<{ top: number; left: number; abreArriba: boolean; ancho: number } | null>(null);

  const ALTO_PANEL = 280;

  const calcularPosicion = React.useCallback(() => {
    const btn = botonRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const abreArriba = window.innerHeight - r.bottom < ALTO_PANEL && r.top > ALTO_PANEL;
    // En formularios el panel toma el ancho del campo; en tablas, 288px.
    const ancho = tamano === 'md' ? Math.max(288, r.width) : 288;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - ancho - 8));
    setPosicion({ top: abreArriba ? r.top - 4 : r.bottom + 4, left, abreArriba, ancho });
  }, [tamano]);

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

  const seleccionado = instructores.find(i => i.id === selectedId);
  const etiquetaActual = seleccionado
    ? `${seleccionado.nombreCompleto}${seleccionado.especialidad ? ` (${seleccionado.especialidad})` : ''}`
    : customLabel || '';

  const filtrados = React.useMemo(() => {
    // Sin tildes ni mayúsculas: "jose" encuentra "JOSÉ" y viceversa.
    const norm = (t?: string) => (t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const txt = norm(busqueda.trim());
    const base = [...instructores].sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto));
    if (!txt) return base;
    return base.filter(i =>
      norm(i.nombreCompleto).includes(txt) ||
      norm(i.especialidad).includes(txt) ||
      norm(i.email).includes(txt)
    );
  }, [instructores, busqueda]);

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
          placeholder={mostrarCorreo ? "Buscar por nombre, especialidad o correo..." : "Buscar por nombre o especialidad..."}
          className="w-full pl-6 pr-2 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#0D631B]"
        />
      </div>
      <div className="max-h-56 overflow-y-auto">
        <button
          type="button"
          onClick={() => { onChange(''); cerrar(); }}
          className="w-full text-left px-2 py-1.5 text-[11px] text-slate-500 rounded-lg hover:bg-slate-50"
        >
          {textoSinInstructor}
        </button>
        {instructores.length === 0 ? (
          <div className="px-2 py-2 text-[11px] text-amber-700 bg-amber-50 rounded-lg">
            No hay instructores registrados. Créalos en el módulo Instructores.
          </div>
        ) : filtrados.length === 0 ? (
          <div className="px-2 py-2 text-[11px] text-slate-400 text-center">Sin resultados para "{busqueda}"</div>
        ) : (
          filtrados.map(inst => (
            <button
              key={inst.id}
              type="button"
              onClick={() => { onChange(inst.id); cerrar(); }}
              className={`w-full text-left px-2 py-1.5 text-xs rounded-lg hover:bg-[#E8F5E9] ${
                inst.id === selectedId ? 'bg-[#E8F5E9] font-bold text-[#0D631B]' : 'text-slate-700'
              }`}
            >
              <span className="block truncate">{inst.nombreCompleto}</span>
              {inst.especialidad && <span className="block text-[10px] text-slate-500 truncate">{inst.especialidad}</span>}
              {mostrarCorreo && inst.email && <span className="block text-[10px] text-slate-400 truncate">{inst.email}</span>}
            </button>
          ))
        )}
        {customLabel && !seleccionado && (
          <div className="px-2 py-1.5 text-[10px] text-slate-400 italic border-t border-slate-100 mt-1 pt-1.5">
            Actual (fuera del catálogo): {customLabel}
          </div>
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
        className={`w-full flex items-center justify-between space-x-1 text-xs font-semibold ${tamano === 'md' ? 'py-2 px-3' : 'py-1.5 px-2.5'} rounded-xl border transition-all text-left ${
          seleccionado
            ? 'bg-emerald-50/60 text-emerald-950 border-emerald-300'
            : 'bg-white text-slate-500 border-slate-300'
        }`}
      >
        <span className="truncate">{etiquetaActual || textoSinInstructor}</span>
        <Search className="w-3 h-3 shrink-0 opacity-60" />
      </button>
      {panel && createPortal(panel, document.body)}
    </div>
  );
};
