import React from 'react';
import { AlertTriangle, CheckCircle2, Info, OctagonAlert, X } from 'lucide-react';

/**
 * Cuadro de diálogo propio del sistema (reemplaza al alert()/confirm() del
 * navegador, que muestra "localhost:3000 dice…" y no se puede estilizar).
 *
 * Uso:
 *   await dialogo.alerta({ tipo: 'advertencia', titulo: '…', mensaje: '…' });
 *   const ok = await dialogo.confirmar({ titulo: '…', mensaje: '…' });
 *
 * Además, <DialogoSistemaHost /> reemplaza window.alert para que TODOS los
 * avisos del sistema se vean con este mismo estilo.
 */

export type TipoDialogo = 'info' | 'exito' | 'advertencia' | 'error';

export interface DetalleDialogo {
  etiqueta: string;
  valor: string;
}

export interface OpcionesDialogo {
  tipo?: TipoDialogo;
  titulo: string;
  mensaje?: string;
  /** Filas "etiqueta: valor" que se muestran en una tarjeta destacada */
  detalles?: DetalleDialogo[];
  /** Porcentaje (0-200) para dibujar una barra de progreso, p.ej. ejecución */
  porcentaje?: number;
  /** Texto final en letra pequeña (p.ej. "La asignación se realizará de todas formas") */
  nota?: string;
  textoAceptar?: string;
  textoCancelar?: string;
}

interface DialogoEnCola extends OpcionesDialogo {
  id: number;
  esConfirmacion: boolean;
  resolver: (valor: boolean) => void;
}

type Suscriptor = (cola: DialogoEnCola[]) => void;

let cola: DialogoEnCola[] = [];
let siguienteId = 1;
const suscriptores = new Set<Suscriptor>();
let hostMontado = false;

const notificar = () => suscriptores.forEach(fn => fn([...cola]));

const encolar = (opciones: OpcionesDialogo, esConfirmacion: boolean) =>
  new Promise<boolean>(resolve => {
    if (!hostMontado) {
      // Respaldo si el host aún no está montado
      const texto = [opciones.titulo, opciones.mensaje].filter(Boolean).join('\n\n');
      if (esConfirmacion) resolve(window.confirm(texto));
      else { alertaNativa(texto); resolve(true); }
      return;
    }
    cola.push({ ...opciones, id: siguienteId++, esConfirmacion, resolver: resolve });
    notificar();
  });

const alertaNativa: (msg?: any) => void =
  typeof window !== 'undefined' ? window.alert.bind(window) : () => {};

export const dialogo = {
  alerta: (opciones: OpcionesDialogo) => encolar(opciones, false).then(() => undefined),
  confirmar: (opciones: OpcionesDialogo) => encolar(opciones, true)
};

/** Convierte un texto plano de alert() en un diálogo con tipo y título. */
const desdeTextoPlano = (texto: string): OpcionesDialogo => {
  const limpio = String(texto ?? '').replace(/^[⚠✅❌ℹ️!\s]+/u, '').trim();
  const bajo = limpio.toLowerCase();
  let tipo: TipoDialogo = 'info';
  if (/bloqueo|no se puede|no se pudo|error|fall[oó]|inv[aá]lid|rechaz/.test(bajo)) tipo = 'error';
  else if (/advertencia|atenci[oó]n|sobrepas|debe |cuidado|ya est[aá]|ya tiene|ya existe/.test(bajo)) tipo = 'advertencia';
  else if (/correctamente|exitos|guardad|sincroniz|listo|creado|actualizad/.test(bajo)) tipo = 'exito';

  // Si la primera línea es corta y termina en "!" / ":" / "." se usa como título
  const lineas = limpio.split('\n');
  const primera = lineas[0].trim();
  if (lineas.length > 1 && primera.length <= 90) {
    return { tipo, titulo: primera.replace(/[:]$/, ''), mensaje: lineas.slice(1).join('\n').trim() };
  }
  const tituloPorTipo: Record<TipoDialogo, string> = {
    info: 'Información',
    exito: 'Listo',
    advertencia: 'Atención',
    error: 'No fue posible continuar'
  };
  return { tipo, titulo: tituloPorTipo[tipo], mensaje: limpio };
};

const ESTILOS: Record<TipoDialogo, { icono: React.ReactNode; circulo: string; boton: string; barra: string; franja: string }> = {
  info: {
    icono: <Info className="w-7 h-7" />,
    circulo: 'bg-sky-100 text-sky-600 ring-sky-50',
    boton: 'bg-sky-600 hover:bg-sky-700 focus-visible:ring-sky-300',
    barra: 'bg-sky-500',
    franja: 'from-sky-400 to-sky-600'
  },
  exito: {
    icono: <CheckCircle2 className="w-7 h-7" />,
    circulo: 'bg-emerald-100 text-[#0D631B] ring-emerald-50',
    boton: 'bg-[#0D631B] hover:bg-[#0a4f15] focus-visible:ring-emerald-300',
    barra: 'bg-emerald-500',
    franja: 'from-emerald-400 to-[#0D631B]'
  },
  advertencia: {
    icono: <AlertTriangle className="w-7 h-7" />,
    circulo: 'bg-amber-100 text-amber-600 ring-amber-50',
    boton: 'bg-amber-500 hover:bg-amber-600 focus-visible:ring-amber-300',
    barra: 'bg-amber-500',
    franja: 'from-amber-300 to-orange-500'
  },
  error: {
    icono: <OctagonAlert className="w-7 h-7" />,
    circulo: 'bg-red-100 text-red-600 ring-red-50',
    boton: 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-300',
    barra: 'bg-red-500',
    franja: 'from-red-400 to-red-600'
  }
};

export const DialogoSistemaHost: React.FC = () => {
  const [pendientes, setPendientes] = React.useState<DialogoEnCola[]>([]);
  const botonAceptarRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    hostMontado = true;
    suscriptores.add(setPendientes);
    // Todos los alert() del sistema pasan a usar este diálogo
    const alertaOriginal = window.alert;
    window.alert = (msg?: any) => { void dialogo.alerta(desdeTextoPlano(String(msg ?? ''))); };
    return () => {
      suscriptores.delete(setPendientes);
      window.alert = alertaOriginal;
      hostMontado = false;
    };
  }, []);

  const actual = pendientes[0];

  const cerrar = React.useCallback((valor: boolean) => {
    if (!actual) return;
    cola = cola.filter(d => d.id !== actual.id);
    notificar();
    actual.resolver(valor);
  }, [actual]);

  React.useEffect(() => {
    if (!actual) return;
    botonAceptarRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); cerrar(false); }
      if (e.key === 'Enter') { e.preventDefault(); cerrar(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [actual, cerrar]);

  if (!actual) return null;

  const tipo = actual.tipo || 'info';
  const est = ESTILOS[tipo];
  const pct = actual.porcentaje;

  return (
    <div
      className="dlg-fondo fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !actual.esConfirmacion) cerrar(true); }}
      role="presentation"
    >
      <style>{`
        @keyframes dlgFondo { from { opacity: 0 } to { opacity: 1 } }
        @keyframes dlgCaja { from { opacity: 0; transform: translateY(8px) scale(.94) } to { opacity: 1; transform: none } }
        .dlg-fondo { animation: dlgFondo .15s ease-out }
        .dlg-caja { animation: dlgCaja .22s cubic-bezier(.2,.9,.3,1.2) }
      `}</style>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`dlg-titulo-${actual.id}`}
        className="dlg-caja relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className={`h-1.5 w-full bg-gradient-to-r ${est.franja}`} />

        {!actual.esConfirmacion && (
          <button
            type="button"
            onClick={() => cerrar(true)}
            className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="px-6 pt-6 pb-5 flex flex-col items-center text-center">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ring-8 ${est.circulo}`}>
            {est.icono}
          </div>

          <h3 id={`dlg-titulo-${actual.id}`} className="mt-4 text-lg font-black text-slate-800 leading-snug">
            {actual.titulo}
          </h3>

          {actual.mensaje && (
            <p className="mt-2 text-sm text-slate-600 whitespace-pre-line leading-relaxed">
              {actual.mensaje}
            </p>
          )}

          {(actual.detalles?.length || pct !== undefined) && (
            <div className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-left space-y-2">
              {actual.detalles?.map((d, i) => (
                <div key={i} className="flex items-start justify-between gap-3 text-xs">
                  <span className="font-bold text-slate-500 uppercase tracking-wide shrink-0">{d.etiqueta}</span>
                  <span className="font-semibold text-slate-800 text-right">{d.valor}</span>
                </div>
              ))}
              {pct !== undefined && (
                <div className="pt-1">
                  <div className="flex justify-between text-[11px] font-bold mb-1">
                    <span className="text-slate-500">Ejecución</span>
                    <span className={pct > 100 ? 'text-red-600' : 'text-slate-700'}>{pct}%</span>
                  </div>
                  <div className="relative h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct > 100 ? 'bg-red-500' : est.barra}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {actual.nota && (
            <p className="mt-3 text-xs text-slate-500 italic">{actual.nota}</p>
          )}
        </div>

        <div className={`px-6 pb-6 flex gap-2 ${actual.esConfirmacion ? 'justify-end' : 'justify-center'}`}>
          {actual.esConfirmacion && (
            <button
              type="button"
              onClick={() => cerrar(false)}
              className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              {actual.textoCancelar || 'Cancelar'}
            </button>
          )}
          <button
            ref={botonAceptarRef}
            type="button"
            onClick={() => cerrar(true)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm transition-colors focus:outline-none focus-visible:ring-4 ${est.boton} ${actual.esConfirmacion ? '' : 'min-w-[140px]'}`}
          >
            {actual.textoAceptar || (actual.esConfirmacion ? 'Confirmar' : 'Entendido')}
          </button>
        </div>
      </div>
    </div>
  );
};
