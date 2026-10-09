import React from 'react';
import { CalendarDays, UserPlus, UserX, ArrowRight, AlertTriangle } from 'lucide-react';
import { BloqueHorario, Competencia, EstadoRap, Instructor, ResultadoAprendizaje } from '../types';
import { InstructorSearchSelect } from './InstructorSearchSelect';
import { CompetenciaSearchSelect } from './CompetenciaSearchSelect';
import { contarOcurrenciasDia, fechaISOLocal } from '../lib/festivosColombia';
import { paresRapDeBloque, ParRapCompetencia, fechaCorta, fechaLarga, inicioTramoActual, sumarDiasISO, validarFechaCambio } from '../lib/tramosInstructor';

/**
 * Panel para cambiar al instructor de un espacio del horario CON FECHA.
 *
 * Caso típico: un instructor termina su proceso el 16 de noviembre y otro lo
 * reemplaza desde el 17 en ese mismo espacio. El panel pregunta desde qué
 * fecha entra el nuevo, valida que quede dentro del trimestre y muestra —antes
 * de confirmar— hasta cuándo queda el instructor saliente, desde cuándo entra
 * el nuevo y cuántas clases / horas le corresponden a cada uno.
 *
 * Variantes:
 *  - 'reemplazar': el espacio ya tiene instructor. Puede entrar otro o quedar
 *    vacante (todavía no hay reemplazo) desde esa fecha.
 *  - 'asignar': el espacio está vacante; la fecha propuesta es el inicio de la
 *    vacancia (todo el período). Si entra después, lo anterior queda "Por definir".
 */
export interface PanelCambioInstructorProps {
  bloque: BloqueHorario;
  inicioCorte: string;
  finCorte: string;
  instructores: Instructor[];
  variante: 'reemplazar' | 'asignar';
  /** Abre directamente en "dejar vacante" (solo variante 'reemplazar'). */
  iniciarVacante?: boolean;
  /** Competencias y RAPs del programa, para elegir cuáles cubre el nuevo instructor (de esta u otras competencias). */
  competenciasPrograma?: Competencia[];
  rapsPrograma?: ResultadoAprendizaje[];
  /** Estado de seguimiento de un RAP en esta ficha (para marcar los ya calificados). */
  estadoRap?: (competenciaCodigo: string, codigoRap: string) => EstadoRap | undefined;
  /**
   * Recibe el instructor elegido (null = dejar vacante), la fecha de entrada y los
   * RAPs elegidos como pares competencia + RAP (null = hereda los mismos del bloque, sin cambios).
   * Devuelve false para mantener el panel abierto.
   */
  onConfirmar: (instructor: Instructor | null, desde: string, raps: ParRapCompetencia[] | null) => Promise<boolean | void> | boolean | void;
  onCancelar?: () => void;
}

const horasYClases = (dia: string, desde: string, hasta: string, duracion: number) => {
  const r = contarOcurrenciasDia(dia, desde, hasta);
  return { clases: r.ocurrenciasHabiles, horas: r.ocurrenciasHabiles * (duracion || 0), primera: r.primeraFechaHabil, ultima: r.ultimaFechaHabil };
};

export const PanelCambioInstructor: React.FC<PanelCambioInstructorProps> = ({
  bloque, inicioCorte, finCorte, instructores, variante, iniciarVacante = false, competenciasPrograma = [], rapsPrograma = [], estadoRap, onConfirmar, onCancelar
}) => {
  const inicioActual = inicioTramoActual(bloque, inicioCorte);
  const hoy = fechaISOLocal(new Date());
  // Para reemplazar se propone hoy (lo más común: el cambio acaba de pasar o está por pasar),
  // ajustado al rango válido; para asignar a una vacante, el inicio de la vacancia.
  const fechaInicial = React.useMemo(() => {
    if (variante === 'asignar') return inicioActual;
    if (hoy <= inicioActual) return sumarDiasISO(inicioActual, 1) <= finCorte ? sumarDiasISO(inicioActual, 1) : finCorte;
    return hoy > finCorte ? finCorte : hoy;
  }, [variante, inicioActual, finCorte, hoy]);

  const [instructorId, setInstructorId] = React.useState('');
  const [dejarVacante, setDejarVacante] = React.useState(iniciarVacante);
  const [desde, setDesde] = React.useState(fechaInicial);
  const [guardando, setGuardando] = React.useState(false);

  // RAPs del nuevo instructor: por defecto HEREDA los del bloque; también se pueden
  // elegir otros, incluso de OTRAS competencias del programa.
  const clave = (comp: string, rap: string) => `${comp}||${rap}`;
  const paresActuales = React.useMemo(() => paresRapDeBloque(bloque, rapsPrograma), [bloque, rapsPrograma]);
  const clavesActuales = React.useMemo(() => paresActuales.map(p => clave(p.competenciaCodigo, p.rapCodigo)), [paresActuales]);
  const [modoRaps, setModoRaps] = React.useState<'heredar' | 'elegir'>('heredar');
  const [rapsSel, setRapsSel] = React.useState<string[]>(clavesActuales);
  // Competencias adicionales a la del bloque que se muestran en la lista (las que ya traen RAPs o las que se agreguen).
  const compsExtraIniciales = React.useMemo(
    () => Array.from(new Set(paresActuales.map(p => p.competenciaCodigo))).filter(c => c !== bloque.competenciaCodigo),
    [paresActuales, bloque.competenciaCodigo]
  );
  const [compsExtra, setCompsExtra] = React.useState<string[]>(compsExtraIniciales);
  const gruposVisibles = [bloque.competenciaCodigo, ...compsExtra];
  const hayCatalogo = rapsPrograma.some(r => r.competenciaCodigo === bloque.competenciaCodigo);
  const mismosRaps = rapsSel.length === clavesActuales.length && rapsSel.every(c => clavesActuales.includes(c));
  const alternarRap = (k: string) => setRapsSel(prev => prev.includes(k) ? prev.filter(c => c !== k) : [...prev, k]);
  const nombreCompetencia = (cod: string) =>
    cod === bloque.competenciaCodigo ? (bloque.competenciaNombre || competenciasPrograma.find(c => c.codigo === cod)?.denominacion || cod)
      : (competenciasPrograma.find(c => c.codigo === cod)?.denominacion || cod);
  const etiquetaPar = (p: ParRapCompetencia) => p.competenciaCodigo === bloque.competenciaCodigo ? p.rapCodigo : `[${p.competenciaCodigo}] ${p.rapCodigo}`;
  const competenciasDisponibles = competenciasPrograma.filter(c => !gruposVisibles.includes(c.codigo) && rapsPrograma.some(r => r.competenciaCodigo === c.codigo));
  const quitarCompetencia = (cod: string) => {
    setCompsExtra(prev => prev.filter(c => c !== cod));
    setRapsSel(prev => prev.filter(k => !k.startsWith(`${cod}||`)));
  };
  const restaurarMismos = () => { setRapsSel(clavesActuales); setCompsExtra(compsExtraIniciales); };

  const nuevo = instructores.find(i => i.id === instructorId) || null;
  const validacion = validarFechaCambio(bloque, desde, inicioCorte, finCorte);
  const hayInstructorActual = Boolean(bloque.instructorId);
  const completo = validacion.valida && validacion.reemplazoCompleto;
  const rapsValidos = dejarVacante || modoRaps === 'heredar' || rapsSel.length > 0;
  const puedeConfirmar = validacion.valida && rapsValidos && (dejarVacante || (!!nuevo && nuevo.id !== bloque.instructorId)) && !guardando;

  const saliente = hayInstructorActual && validacion.valida && desde > inicioActual
    ? horasYClases(bloque.diaSemana, inicioActual, sumarDiasISO(desde, -1), bloque.duracionHoras)
    : null;
  const entrante = validacion.valida ? horasYClases(bloque.diaSemana, desde, finCorte, bloque.duracionHoras) : null;

  const confirmar = async () => {
    if (!puedeConfirmar) return;
    setGuardando(true);
    try {
      await onConfirmar(
        dejarVacante ? null : nuevo,
        desde,
        !dejarVacante && hayCatalogo && modoRaps === 'elegir' && !mismosRaps
          ? rapsSel.map(k => { const [competenciaCodigo, rapCodigo] = k.split('||'); return { competenciaCodigo, rapCodigo }; })
          : null
      );
    } finally {
      setGuardando(false);
    }
  };

  const textoBoton = dejarVacante
    ? `Dejar vacante${completo ? '' : ` desde el ${fechaCorta(desde)}`}`
    : variante === 'asignar'
      ? `Asignar${completo ? '' : ` desde el ${fechaCorta(desde)}`}`
      : `Confirmar reemplazo${completo ? ' (todo el período)' : ` desde el ${fechaCorta(desde)}`}`;

  return (
    <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-sky-900 uppercase flex items-center space-x-1">
          {variante === 'asignar' ? <UserPlus className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
          <span>{variante === 'asignar' ? 'Asignar instructor a este espacio vacante' : 'Reemplazar instructor'}</span>
        </span>
        {onCancelar && (
          <button type="button" onClick={onCancelar} className="text-[10px] font-bold text-sky-700 hover:text-sky-900">
            Cancelar
          </button>
        )}
      </div>

      {variante === 'reemplazar' && (
        <div className="grid grid-cols-2 gap-1 p-0.5 bg-white rounded-lg border border-sky-200 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setDejarVacante(false)}
            className={`py-1.5 rounded-md transition-colors ${!dejarVacante ? 'bg-sky-600 text-white' : 'text-slate-500 hover:bg-sky-50'}`}
          >
            Entra otro instructor
          </button>
          <button
            type="button"
            onClick={() => setDejarVacante(true)}
            className={`py-1.5 rounded-md transition-colors ${dejarVacante ? 'bg-amber-600 text-white' : 'text-slate-500 hover:bg-sky-50'}`}
          >
            Aún no hay reemplazo
          </button>
        </div>
      )}

      {!dejarVacante && (
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">
            {variante === 'asignar' ? 'Instructor' : 'Nuevo instructor'}
          </span>
          <InstructorSearchSelect
            instructores={instructores.filter(i => i.id !== bloque.instructorId)}
            selectedId={instructorId}
            onChange={setInstructorId}
            textoSinInstructor="-- Selecciona un instructor --"
            tamano="md"
          />
        </div>
      )}

      <div className="space-y-1">
        <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center space-x-1">
          <CalendarDays className="w-3 h-3" />
          <span>
            {dejarVacante
              ? '¿Desde qué fecha queda vacante?'
              : variante === 'asignar'
                ? '¿Desde qué fecha entra?'
                : '¿Desde qué fecha entra el nuevo instructor?'}
          </span>
        </span>
        <div className="flex items-center space-x-2">
          <input
            type="date"
            value={desde}
            min={inicioActual}
            max={finCorte}
            onChange={e => setDesde(e.target.value)}
            className="flex-1 bg-white border border-sky-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-sky-500 outline-none"
          />
          {variante === 'reemplazar' && hoy > inicioActual && hoy <= finCorte && desde !== hoy && (
            <button type="button" onClick={() => setDesde(hoy)} className="px-2 py-1.5 rounded-lg bg-white border border-sky-200 text-[11px] font-bold text-sky-800 hover:bg-sky-100">
              Hoy
            </button>
          )}
          <button
            type="button"
            onClick={() => setDesde(inicioActual)}
            className="px-2 py-1.5 rounded-lg bg-white border border-sky-200 text-[11px] font-bold text-sky-800 hover:bg-sky-100"
            title={`Todo el período, desde el ${fechaCorta(inicioActual)}`}
          >
            Todo el período
          </button>
        </div>
        {validacion.valida ? (
          <span className="block text-[10px] text-slate-500 first-letter:uppercase">
            {fechaLarga(desde)}
            {entrante?.primera && !completo && ` · primera clase de ${bloque.diaSemana}: ${fechaCorta(fechaISOLocal(entrante.primera))}`}
          </span>
        ) : (
          <span className="flex items-start space-x-1 text-[10px] font-semibold text-red-600">
            <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
            <span>{validacion.mensaje}</span>
          </span>
        )}
      </div>

      {!dejarVacante && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">RAPs del nuevo instructor</span>
          {hayCatalogo ? (
            <>
              <div className="grid grid-cols-2 gap-1 p-0.5 bg-white rounded-lg border border-sky-200 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => { setModoRaps('heredar'); restaurarMismos(); }}
                  className={`py-1.5 rounded-md transition-colors ${modoRaps === 'heredar' ? 'bg-sky-600 text-white' : 'text-slate-500 hover:bg-sky-50'}`}
                >
                  Hereda los mismos
                </button>
                <button
                  type="button"
                  onClick={() => setModoRaps('elegir')}
                  className={`py-1.5 rounded-md transition-colors ${modoRaps === 'elegir' ? 'bg-sky-600 text-white' : 'text-slate-500 hover:bg-sky-50'}`}
                >
                  Elegir otros RAPs
                </button>
              </div>
              {modoRaps === 'heredar' ? (
                <div className="text-[10px] text-slate-600 bg-white/70 border border-sky-100 rounded-lg px-2.5 py-1.5">
                  Continúa con: <span className="font-bold text-sky-900">{paresActuales.map(etiquetaPar).join(', ') || '—'}</span>
                  {bloque.esCompetenciaCompleta ? ' (competencia completa)' : ''}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold px-0.5">
                    <span className="text-slate-500">{rapsSel.length} RAP(s) seleccionados</span>
                    <span className="space-x-2">
                      <button type="button" onClick={restaurarMismos} className="text-sky-700 hover:underline">Los mismos</button>
                      <button type="button" onClick={() => setRapsSel(gruposVisibles.flatMap(c => rapsPrograma.filter(r => r.competenciaCodigo === c).map(r => clave(c, r.codigoRap))))} className="text-sky-700 hover:underline">Todos</button>
                      <button type="button" onClick={() => setRapsSel([])} className="text-sky-700 hover:underline">Ninguno</button>
                    </span>
                  </div>
                  {gruposVisibles.map(comp => (
                    <div key={comp} className="bg-white border border-sky-100 rounded-lg overflow-hidden">
                      <div className="flex items-start justify-between gap-2 px-2.5 py-1.5 bg-sky-50 border-b border-sky-100">
                        <span className="text-[10px] leading-snug">
                          <span className="font-mono font-bold text-sky-900">[{comp}]</span>{' '}
                          <span className="text-slate-700 font-semibold">{nombreCompetencia(comp)}</span>
                          {comp === bloque.competenciaCodigo && <span className="ml-1 text-[9px] font-bold text-sky-700">(la de este espacio)</span>}
                        </span>
                        {comp !== bloque.competenciaCodigo && (
                          <button type="button" onClick={() => quitarCompetencia(comp)} className="text-[10px] font-bold text-red-600 hover:underline shrink-0">Quitar</button>
                        )}
                      </div>
                      <div className="max-h-40 overflow-y-auto divide-y divide-slate-100">
                        {rapsPrograma.filter(r => r.competenciaCodigo === comp).map(r => {
                          const k = clave(comp, r.codigoRap);
                          const marcado = rapsSel.includes(k);
                          const eraDelSaliente = clavesActuales.includes(k);
                          const estado = estadoRap ? estadoRap(comp, r.codigoRap) : undefined;
                          return (
                            <label key={k} className={`flex items-start space-x-2 px-2.5 py-1.5 cursor-pointer hover:bg-sky-50 ${marcado ? 'bg-sky-50/60' : ''}`}>
                              <input type="checkbox" checked={marcado} onChange={() => alternarRap(k)} className="mt-0.5 accent-sky-600" />
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center flex-wrap gap-1">
                                  <span className="font-mono font-bold text-[10px] text-[#0D631B]">{r.codigoRap}</span>
                                  {eraDelSaliente && <span className="text-[9px] font-bold px-1 rounded bg-slate-100 text-slate-600">del saliente</span>}
                                  {estado === 'CALIFICADO' && <span className="text-[9px] font-bold px-1 rounded bg-emerald-100 text-emerald-700">calificado</span>}
                                </span>
                                <span className="block text-[11px] text-slate-700 leading-snug line-clamp-2">{r.denominacion}</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {competenciasDisponibles.length > 0 && (
                    <CompetenciaSearchSelect
                      competencias={competenciasDisponibles}
                      selectedCodigo=""
                      onChange={cod => { if (cod) setCompsExtra(prev => prev.includes(cod) ? prev : [...prev, cod]); }}
                      placeholder="+ Agregar RAPs de otra competencia…"
                    />
                  )}
                </div>
              )}
              {modoRaps === 'elegir' && rapsSel.length === 0 && (
                <span className="flex items-start space-x-1 text-[10px] font-semibold text-red-600">
                  <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>Selecciona al menos un RAP para el nuevo instructor.</span>
                </span>
              )}
            </>
          ) : (
            <div className="text-[10px] text-slate-600 bg-white/70 border border-sky-100 rounded-lg px-2.5 py-1.5">
              Continúa con: <span className="font-bold text-sky-900">{paresActuales.map(etiquetaPar).join(', ') || bloque.rapCodigo || '—'}</span>
            </div>
          )}
        </div>
      )}

      {validacion.valida && (
        <div className="rounded-lg bg-white border border-sky-200 divide-y divide-slate-100 text-[11px]">
          {hayInstructorActual && (
            <div className="px-2.5 py-1.5 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-bold text-slate-800 truncate">{bloque.instructorNombre}</div>
                <div className="text-slate-500">
                  {saliente
                    ? `Del ${fechaCorta(inicioActual)} al ${fechaCorta(sumarDiasISO(desde, -1))}`
                    : 'Sale del espacio (todo el período)'}
                </div>
              </div>
              {saliente && <div className="text-right text-slate-600 shrink-0">{saliente.clases} clases · <b>{saliente.horas} h</b></div>}
            </div>
          )}
          <div className="px-2.5 py-1.5 flex items-start justify-between gap-2 bg-sky-50/50">
            <div className="min-w-0">
              <div className={`font-bold truncate flex items-center space-x-1 ${dejarVacante ? 'text-amber-700' : 'text-sky-900'}`}>
                <ArrowRight className="w-3 h-3 shrink-0" />
                <span>{dejarVacante ? 'Vacante (Por definir)' : nuevo ? nuevo.nombreCompleto : 'Elige al nuevo instructor'}</span>
              </div>
              <div className="text-slate-500">Del {fechaCorta(desde)} al {fechaCorta(finCorte)}</div>
            </div>
            {entrante && <div className="text-right text-slate-600 shrink-0">{entrante.clases} clases · <b>{entrante.horas} h</b></div>}
          </div>
        </div>
      )}

      <button
        type="button"
        disabled={!puedeConfirmar}
        onClick={confirmar}
        className={`w-full py-2 rounded-lg text-white font-bold text-xs transition-colors disabled:opacity-50 ${dejarVacante ? 'bg-amber-600 hover:bg-amber-700' : 'bg-sky-600 hover:bg-sky-700'}`}
      >
        {guardando ? 'Guardando…' : textoBoton}
      </button>
    </div>
  );
};
