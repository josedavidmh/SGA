import React from 'react';
import { FileSpreadsheet, FileText, UserRound, AlertCircle } from 'lucide-react';
import { BloqueHorario, Ficha, Instructor, RegionalCentro, User } from '../types';
import { claveNombrePersona } from '../lib/nombresInstructor';
import {
  calcularMisHoras,
  instructoresDeUsuario,
  exportarMisHorasExcel,
  exportarMisHorasPDF
} from '../services/misHorasService';

interface Props {
  currentUser: User;
  horarios: BloqueHorario[];
  /** TODAS las fichas (no solo las visibles del usuario): sus bloques pueden estar en fichas de otros líderes. */
  fichas: Ficha[];
  instructores: Instructor[];
  centro?: RegionalCentro;
}

const ABREV: Record<string, string> = { Lunes: 'Lun', Martes: 'Mar', 'Miércoles': 'Mié', Jueves: 'Jue', Viernes: 'Vie', 'Sábado': 'Sáb' };

export const ReporteMisHoras: React.FC<Props> = ({ currentUser, horarios, fichas, instructores, centro }) => {
  const esInstructor = currentUser.rol === 'INSTRUCTOR_LIDER';
  const propios = React.useMemo(() => instructoresDeUsuario(currentUser, instructores), [currentUser, instructores]);

  // Coordinación/administración pueden consultar a cualquier instructor;
  // un instructor solo ve lo suyo.
  const [elegidoId, setElegidoId] = React.useState('');
  const planta = React.useMemo(
    () => [...instructores].sort((a, b) => (a.nombreCompleto || '').localeCompare(b.nombreCompleto || '')),
    [instructores]
  );

  const registros = React.useMemo(() => {
    if (esInstructor || !elegidoId) return propios;
    const el = instructores.find(i => i.id === elegidoId);
    if (!el) return propios;
    const k = claveNombrePersona(el.nombreCompleto || `${el.nombres} ${el.apellidos}`);
    return instructores.filter(i => i.id === el.id || claveNombrePersona(i.nombreCompleto || `${i.nombres} ${i.apellidos}`) === k);
  }, [esInstructor, elegidoId, propios, instructores]);

  const nombre = registros[0]?.nombreCompleto || currentUser.nombre_completo;
  const datos = React.useMemo(() => calcularMisHoras(horarios, fichas, registros, nombre), [horarios, fichas, registros, nombre]);
  const [abierto, setAbierto] = React.useState<string>('');
  const activo = abierto && datos.trimestres.some(t => t.trimestre === abierto) ? abierto : datos.trimestres[0]?.trimestre || '';
  const maxTotal = Math.max(1, ...datos.trimestres.map(t => t.total));
  const detalle = datos.trimestres.find(t => t.trimestre === activo);

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-[#111C2D] flex items-center space-x-2">
            <UserRound className="w-4 h-4 text-[#0D631B]" />
            <span>Mis Horas por Trimestre</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Horas por semana que {esInstructor ? 'tienes' : 'tiene el instructor'} programadas en cada trimestre.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!esInstructor && (
            <select
              value={elegidoId}
              onChange={(e) => setElegidoId(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-200 max-w-xs"
            >
              <option value="">{propios.length > 0 ? 'Mis horas' : 'Elige un instructor…'}</option>
              {planta.map(i => <option key={i.id} value={i.id}>{i.nombreCompleto}</option>)}
            </select>
          )}
          <button
            type="button"
            disabled={datos.trimestres.length === 0}
            onClick={() => exportarMisHorasExcel(datos, centro)}
            className="flex items-center space-x-1.5 bg-[#0D631B] hover:bg-[#0a4d15] disabled:opacity-40 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel</span>
          </button>
          <button
            type="button"
            disabled={datos.trimestres.length === 0}
            onClick={() => exportarMisHorasPDF(datos, centro)}
            className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all"
          >
            <FileText className="w-4 h-4 text-red-500" />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {registros.length === 0 && (
        <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50 text-xs text-amber-800 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {esInstructor
              ? `No encontramos un instructor en la planta con tu correo (${currentUser.correo}) ni con tu nombre (${currentUser.nombre_completo}). Pide a coordinación que el correo o el nombre de tu usuario coincida con el del instructor.`
              : 'Elige un instructor para ver sus horas.'}
          </span>
        </div>
      )}

      {registros.length > 0 && datos.trimestres.length === 0 && (
        <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
          {nombre} aún no tiene bloques de horario programados.
        </div>
      )}

      {datos.trimestres.length > 0 && (
        <>
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 text-xs font-black text-[#111C2D]">{nombre}</div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[760px]">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider bg-slate-50/80">
                    <th className="py-2.5 px-3">Trimestre</th>
                    {datos.dias.map(d => <th key={d} className="py-2.5 px-2 text-center">{ABREV[d]}</th>)}
                    <th className="py-2.5 px-2 text-center">Mañana</th>
                    <th className="py-2.5 px-2 text-center">Tarde</th>
                    <th className="py-2.5 px-3 w-44">Total h/sem</th>
                    <th className="py-2.5 px-3">Fichas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {datos.trimestres.map(t => (
                    <tr
                      key={t.trimestre}
                      onClick={() => setAbierto(t.trimestre)}
                      className={`cursor-pointer hover:bg-slate-50/60 ${t.trimestre === activo ? 'bg-emerald-50/50' : ''}`}
                    >
                      <td className="py-2.5 px-3 font-black text-[#111C2D]">{t.trimestre}</td>
                      {datos.dias.map(d => (
                        <td key={d} className={`py-2.5 px-2 text-center ${t.porDia[d] ? 'font-bold text-slate-700' : 'text-slate-300'}`}>{t.porDia[d] || '·'}</td>
                      ))}
                      <td className="py-2.5 px-2 text-center text-slate-600">{t.manana}</td>
                      <td className="py-2.5 px-2 text-center text-slate-600">{t.tarde + t.noche}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#0D631B] rounded-full" style={{ width: `${(t.total / maxTotal) * 100}%` }} />
                          </div>
                          <span className="font-black text-[#0D631B] w-8 text-right">{t.total}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{t.fichas.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {detalle && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-black text-[#111C2D]">Detalle del trimestre {detalle.trimestre}</span>
                <span className="text-[11px] font-bold text-[#0D631B]">{detalle.total} h por semana · {detalle.bloques.length} bloque(s)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[760px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider bg-slate-50/80">
                      <th className="py-2.5 px-3">Día</th>
                      <th className="py-2.5 px-3">Franja</th>
                      <th className="py-2.5 px-3">Ficha</th>
                      <th className="py-2.5 px-3">Competencia</th>
                      <th className="py-2.5 px-3">RAPs</th>
                      <th className="py-2.5 px-3">Ambiente</th>
                      <th className="py-2.5 px-3 text-center">Horas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detalle.bloques.map((b, i) => (
                      <tr key={i} className="hover:bg-slate-50/60">
                        <td className="py-2 px-3 font-bold text-slate-700">{b.dia}</td>
                        <td className="py-2 px-3 text-slate-600 whitespace-nowrap">{b.franja}</td>
                        <td className="py-2 px-3 font-bold text-[#111C2D]">{b.ficha}</td>
                        <td className="py-2 px-3 text-slate-600">{b.competencia}</td>
                        <td className="py-2 px-3 text-slate-500">{b.raps}</td>
                        <td className="py-2 px-3 text-slate-500">{b.ambiente}</td>
                        <td className="py-2 px-3 text-center font-black text-[#0D631B]">{b.horas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
