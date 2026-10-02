import React from 'react';
import {
  DatabaseBackup, Download, Upload, ShieldAlert, FileJson, FileCode2, Database, Loader2,
  CheckCircle2, AlertTriangle, RefreshCw, KeyRound, ServerCog
} from 'lucide-react';
import { User } from '../types';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import {
  Respaldo,
  exportarRespaldo,
  resumenDeRespaldo,
  totalFilas,
  generarSql,
  generarArchivoSqlite,
  esquemaSupabaseSql,
  leerArchivoRespaldo,
  restaurarRespaldo,
  crearClienteDestino,
  limpiarDatosLocales,
  descargarArchivo,
  marcaDeTiempo,
  ResultadoRestauracion
} from '../services/respaldoService';

interface Props {
  currentUser: User;
}

const FRASE = 'REEMPLAZAR';

export const RespaldoView: React.FC<Props> = ({ currentUser }) => {
  if (currentUser.rol !== 'ADMINISTRADOR') {
    return (
      <div className="p-8 text-center text-sm text-slate-500 bg-white rounded-2xl border border-slate-200">
        Solo el Administrador puede crear o restaurar respaldos.
      </div>
    );
  }
  return <RespaldoContenido currentUser={currentUser} />;
};

const RespaldoContenido: React.FC<Props> = ({ currentUser }) => {

  // ---------------- Crear respaldo ----------------
  const [respaldo, setRespaldo] = React.useState<Respaldo | null>(null);
  const [leyendo, setLeyendo] = React.useState(false);
  const [progresoLectura, setProgresoLectura] = React.useState('');
  const [errorLectura, setErrorLectura] = React.useState('');
  const [generando, setGenerando] = React.useState('');

  const leerDatos = async () => {
    setLeyendo(true);
    setErrorLectura('');
    setRespaldo(null);
    try {
      const r = await exportarRespaldo(undefined, (m) => setProgresoLectura(m));
      setRespaldo(r);
    } catch (e: any) {
      setErrorLectura(e?.message || 'No se pudo leer la base de datos.');
    } finally {
      setLeyendo(false);
      setProgresoLectura('');
    }
  };

  const sello = () => marcaDeTiempo();
  const bajarJson = (r: Respaldo, prefijo = 'respaldo_sena') =>
    descargarArchivo(JSON.stringify(r, null, 2), `${prefijo}_${sello()}.json`, 'application/json');

  const bajar = async (formato: 'json' | 'postgres' | 'mysql' | 'sqlite' | 'sqlite-archivo') => {
    if (!respaldo) return;
    setGenerando(formato);
    try {
      if (formato === 'json') bajarJson(respaldo);
      else if (formato === 'postgres') descargarArchivo(generarSql(respaldo, 'postgres'), `respaldo_sena_postgresql_${sello()}.sql`, 'text/plain;charset=utf-8');
      else if (formato === 'mysql') descargarArchivo(generarSql(respaldo, 'mysql'), `respaldo_sena_mysql_${sello()}.sql`, 'text/plain;charset=utf-8');
      else if (formato === 'sqlite') descargarArchivo(generarSql(respaldo, 'sqlite'), `respaldo_sena_sqlite_${sello()}.sql`, 'text/plain;charset=utf-8');
      else {
        const bytes = await generarArchivoSqlite(respaldo);
        descargarArchivo(bytes as unknown as BlobPart, `respaldo_sena_${sello()}.sqlite`, 'application/vnd.sqlite3');
      }
    } catch (e: any) {
      alert(`No se pudo generar el archivo: ${e?.message || e}`);
    } finally {
      setGenerando('');
    }
  };

  const bajarEsquema = () => {
    try {
      descargarArchivo(esquemaSupabaseSql(), `esquema_supabase_completo.sql`, 'text/plain;charset=utf-8');
    } catch (e: any) {
      alert(`No se pudo generar el esquema: ${e?.message || e}`);
    }
  };

  // ---------------- Restaurar ----------------
  const [archivo, setArchivo] = React.useState<Respaldo | null>(null);
  const [nombreArchivo, setNombreArchivo] = React.useState('');
  const [errorArchivo, setErrorArchivo] = React.useState('');
  const [destino, setDestino] = React.useState<'ACTUAL' | 'OTRA'>('ACTUAL');
  const [urlDestino, setUrlDestino] = React.useState('');
  const [claveDestino, setClaveDestino] = React.useState('');
  const [respaldoSeguridad, setRespaldoSeguridad] = React.useState(true);
  const [confirmacion, setConfirmacion] = React.useState('');
  const [entiendoAcceso, setEntiendoAcceso] = React.useState(false);
  const [restaurando, setRestaurando] = React.useState(false);
  const [progreso, setProgreso] = React.useState({ mensaje: '', pct: 0 });
  const [resultado, setResultado] = React.useState<ResultadoRestauracion | null>(null);

  const elegirArchivo = async (f: File | undefined) => {
    setResultado(null);
    setErrorArchivo('');
    setArchivo(null);
    if (!f) return;
    try {
      setArchivo(await leerArchivoRespaldo(f));
      setNombreArchivo(f.name);
    } catch (e: any) {
      setErrorArchivo(e?.message || 'No se pudo leer el archivo.');
    }
  };

  // Si el respaldo no trae al administrador actual, restaurar en ESTA cuenta lo dejaría sin acceso.
  const correoActual = (currentUser.correo || '').trim().toLowerCase();
  const adminEnRespaldo = !!archivo?.tablas.usuarios?.some(u => String(u.correo || '').trim().toLowerCase() === correoActual && u.activo !== false);
  const sinAcceso = destino === 'ACTUAL' && !!archivo && !adminEnRespaldo;
  const mismaCuentaUrl = destino === 'OTRA' && !!urlDestino && urlDestino.includes('supabase.co') && !!archivo?.origen &&
    urlDestino.replace(/^https?:\/\//, '').split('.')[0] === archivo.origen.replace(/^https?:\/\//, '').split('.')[0];

  const puedeRestaurar =
    !!archivo && !restaurando && confirmacion.trim().toUpperCase() === FRASE &&
    (destino === 'ACTUAL' ? isSupabaseConfigured : !!urlDestino.trim() && claveDestino.trim().length > 20) &&
    (!sinAcceso || entiendoAcceso);

  const restaurar = async () => {
    if (!archivo) return;
    setRestaurando(true);
    setResultado(null);
    setProgreso({ mensaje: 'Preparando…', pct: 0 });
    try {
      const cliente = destino === 'OTRA' ? crearClienteDestino(urlDestino, claveDestino) : undefined;
      if (respaldoSeguridad) {
        setProgreso({ mensaje: 'Descargando un respaldo de seguridad de lo que hay ahora…', pct: 1 });
        const actual = await exportarRespaldo(cliente);
        if (Object.keys(actual.tablas).length > 0) bajarJson(actual, 'respaldo_seguridad_antes_de_restaurar');
      }
      const r = await restaurarRespaldo(archivo, { cliente, otraCuenta: destino === 'OTRA' }, (mensaje, pct) => setProgreso({ mensaje, pct }));
      setResultado(r);
    } catch (e: any) {
      setResultado({ ok: false, sinCambios: true, mensaje: e?.message || 'Error inesperado al restaurar.', tablas: [], advertencias: [] });
    } finally {
      setRestaurando(false);
    }
  };

  const reiniciar = () => {
    // Los datos de este navegador se vuelven a leer de Supabase; se pide iniciar sesión de nuevo.
    limpiarDatosLocales();
    try { localStorage.removeItem('sena_session_user_id'); } catch { /* sin storage */ }
    window.location.reload();
  };

  const resumen = respaldo ? resumenDeRespaldo(respaldo) : [];
  const resumenArchivo = archivo ? resumenDeRespaldo(archivo) : [];

  const botonFormato = (id: Parameters<typeof bajar>[0], icono: React.ReactNode, titulo: string, detalle: string) => (
    <button
      type="button"
      disabled={!!generando}
      onClick={() => bajar(id)}
      className="flex items-start gap-3 text-left p-3.5 rounded-xl border border-slate-200 bg-white hover:border-[#0D631B] hover:bg-emerald-50/40 disabled:opacity-50 transition-all"
    >
      <div className="mt-0.5 text-[#0D631B]">{generando === id ? <Loader2 className="w-5 h-5 animate-spin" /> : icono}</div>
      <div>
        <div className="text-xs font-black text-[#111C2D]">{titulo}</div>
        <div className="text-[11px] text-slate-500 leading-snug">{detalle}</div>
      </div>
    </button>
  );

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <div>
        <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-black">Administración</span>
          <span>•</span>
          <span>Copias de seguridad de todos los datos</span>
        </div>
        <h1 className="text-2xl font-black text-[#111C2D] tracking-tight mt-1 flex items-center space-x-2.5">
          <DatabaseBackup className="w-6 h-6 text-blue-700" />
          <span>Respaldo y Restauración</span>
        </h1>
      </div>

      <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50 text-xs text-amber-900 flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          El respaldo incluye a los usuarios y el <strong>hash de sus claves</strong>. Guárdalo en un lugar seguro y no lo compartas.
          Restaurar <strong>reemplaza</strong> los datos del destino por los del respaldo.
        </span>
      </div>

      {/* ---------- 1. CREAR ---------- */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-black text-[#111C2D] flex items-center gap-2"><Download className="w-4 h-4 text-[#0D631B]" /> 1. Crear respaldo</h2>
            <p className="text-xs text-slate-500">Lee todas las tablas de Supabase y te deja descargarlas en el formato que necesites.</p>
          </div>
          <button
            type="button"
            onClick={leerDatos}
            disabled={leyendo || !isSupabaseConfigured}
            className="flex items-center gap-2 bg-[#0D631B] hover:bg-[#0a4d15] disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm"
          >
            {leyendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span>{respaldo ? 'Volver a leer los datos' : 'Leer datos de Supabase'}</span>
          </button>
        </div>
        {!isSupabaseConfigured && <p className="text-xs text-red-600">Supabase no está configurado en este entorno.</p>}
        {leyendo && <p className="text-xs text-slate-500">{progresoLectura}</p>}
        {errorLectura && <p className="text-xs text-red-600">{errorLectura}</p>}

        {respaldo && (
          <>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                    <th className="py-2 px-3 text-left">Tabla</th>
                    <th className="py-2 px-3 text-right">Filas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resumen.map(t => (
                    <tr key={t.tabla}>
                      <td className="py-1.5 px-3 text-slate-700">{t.etiqueta} <span className="text-slate-400">({t.tabla})</span></td>
                      <td className="py-1.5 px-3 text-right font-bold">
                        {t.omitida ? <span className="text-amber-600 font-semibold" title={t.omitida}>omitida</span> : t.filas}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-black">
                    <td className="py-2 px-3">Total</td>
                    <td className="py-2 px-3 text-right text-[#0D631B]">{totalFilas(respaldo)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {resumen.some(t => t.omitida) && (
              <p className="text-[11px] text-amber-700 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                Las tablas "omitidas" no existen en esta base o no se pudieron leer (pasa con aprendices y juicios si nunca se usaron). El resto del respaldo es válido.
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {botonFormato('json', <FileJson className="w-5 h-5" />, 'JSON completo', 'Para restaurar en esta app (en esta cuenta de Supabase o en otra).')}
              {botonFormato('sqlite-archivo', <Database className="w-5 h-5" />, 'Archivo SQLite (.sqlite)', 'Una base de datos lista para abrir con DB Browser for SQLite, DBeaver, Python, etc.')}
              {botonFormato('sqlite', <FileCode2 className="w-5 h-5" />, 'Script SQL para SQLite', 'Crea las tablas y carga los datos en una base SQLite que tú crees.')}
              {botonFormato('mysql', <FileCode2 className="w-5 h-5" />, 'Script SQL para MySQL / MariaDB', 'CREATE TABLE + INSERT con sintaxis de MySQL (utf8mb4).')}
              {botonFormato('postgres', <FileCode2 className="w-5 h-5" />, 'Script SQL para PostgreSQL / Supabase', 'Crea las tablas si no existen y carga los datos; sirve para un PostgreSQL local o el SQL Editor de Supabase.')}
            </div>
          </>
        )}
      </section>

      {/* ---------- 2. RESTAURAR ---------- */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
        <div>
          <h2 className="text-sm font-black text-[#111C2D] flex items-center gap-2"><Upload className="w-4 h-4 text-[#0D631B]" /> 2. Restaurar desde un respaldo (.json)</h2>
          <p className="text-xs text-slate-500">Reemplaza los datos del destino por los del archivo. Los scripts SQL se cargan directamente en tu base (MySQL, PostgreSQL o SQLite) con su propio cliente.</p>
        </div>

        <label className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-slate-300 rounded-xl py-6 px-4 text-xs text-slate-500 cursor-pointer hover:border-[#0D631B] hover:bg-emerald-50/30">
          <Upload className="w-5 h-5 text-slate-400" />
          <span className="font-bold text-slate-700">{nombreArchivo || 'Elegir el archivo de respaldo (.json)'}</span>
          <input type="file" accept=".json,application/json" className="hidden" onChange={(e) => elegirArchivo(e.target.files?.[0])} />
        </label>
        {errorArchivo && <p className="text-xs text-red-600">{errorArchivo}</p>}

        {archivo && (
          <div className="space-y-4">
            <div className="text-xs text-slate-600 bg-slate-50 rounded-xl p-3.5 border border-slate-200">
              <div><strong>Generado:</strong> {new Date(archivo.generado).toLocaleString('es-CO')}</div>
              <div><strong>Origen:</strong> {archivo.origen}</div>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5">
                {resumenArchivo.filter(t => t.filas > 0).map(t => <span key={t.tabla}>{t.etiqueta}: <strong>{t.filas}</strong></span>)}
              </div>
              <div className="mt-1.5 font-bold text-[#0D631B]">{totalFilas(archivo)} filas en total</div>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Destino</div>
              <label className="flex items-start gap-2 text-xs cursor-pointer">
                <input type="radio" className="mt-0.5" checked={destino === 'ACTUAL'} onChange={() => setDestino('ACTUAL')} />
                <span><strong>Esta cuenta de Supabase</strong> (la que usa la app ahora)</span>
              </label>
              <label className="flex items-start gap-2 text-xs cursor-pointer">
                <input type="radio" className="mt-0.5" checked={destino === 'OTRA'} onChange={() => setDestino('OTRA')} />
                <span><strong>Otra cuenta de Supabase</strong> (proyecto nuevo con el esquema ya creado)</span>
              </label>
              {destino === 'OTRA' && (
                <div className="ml-6 space-y-2.5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    <input
                      value={urlDestino}
                      onChange={(e) => setUrlDestino(e.target.value)}
                      placeholder="URL del proyecto (https://xxxx.supabase.co)"
                      className="border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-[#0D631B]"
                    />
                    <div className="relative">
                      <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={claveDestino}
                        onChange={(e) => setClaveDestino(e.target.value)}
                        placeholder="Clave anon (o service_role)"
                        className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs outline-none focus:border-[#0D631B]"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 flex items-start gap-1.5">
                    <ServerCog className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      Primero crea las tablas en el proyecto nuevo:{' '}
                      <button type="button" onClick={bajarEsquema} className="font-bold text-[#0D631B] underline">descargar esquema de Supabase</button>
                      {' '}y ejecútalo en su SQL Editor. La clave solo se usa en este navegador y no se guarda.
                    </span>
                  </p>
                  {mismaCuentaUrl && (
                    <p className="text-[11px] text-amber-700">Esa URL parece ser la misma cuenta de donde salió el respaldo.</p>
                  )}
                </div>
              )}
            </div>

            <label className="flex items-start gap-2 text-xs cursor-pointer">
              <input type="checkbox" className="mt-0.5" checked={respaldoSeguridad} onChange={(e) => setRespaldoSeguridad(e.target.checked)} />
              <span>Descargar un <strong>respaldo de seguridad</strong> de lo que hay ahora en el destino antes de reemplazarlo (recomendado).</span>
            </label>

            {sinAcceso && (
              <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-xs text-red-800 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Este respaldo <strong>no incluye tu usuario ({currentUser.correo})</strong>. Si lo restauras en esta cuenta, perderás el acceso con este correo.
                  </span>
                </div>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" className="mt-0.5" checked={entiendoAcceso} onChange={(e) => setEntiendoAcceso(e.target.checked)} />
                  <span>Entiendo y quiero continuar.</span>
                </label>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="text-xs text-slate-600">Para confirmar, escribe <strong>{FRASE}</strong>:</div>
              <input
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
                placeholder={FRASE}
                className="w-full sm:w-64 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-red-400"
              />
            </div>

            <button
              type="button"
              onClick={restaurar}
              disabled={!puedeRestaurar}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm"
            >
              {restaurando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span>Restaurar y reemplazar los datos del destino</span>
            </button>

            {restaurando && (
              <div className="space-y-1.5">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#0D631B] transition-all" style={{ width: `${progreso.pct}%` }} />
                </div>
                <p className="text-[11px] text-slate-500">{progreso.mensaje}</p>
              </div>
            )}
          </div>
        )}

        {resultado && (
          <div className={`p-4 rounded-xl border text-xs space-y-3 ${resultado.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-800'}`}>
            <div className="flex items-start gap-2 font-bold">
              {resultado.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span>{resultado.mensaje}</span>
            </div>
            {resultado.sinCambios && <div>No se modificó ningún dato.</div>}
            {resultado.advertencias.map((a, i) => <div key={i} className="text-amber-800">⚠ {a}</div>)}
            {resultado.tablas.length > 0 && (
              <div className="overflow-x-auto bg-white rounded-lg border border-slate-200 text-slate-700">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                      <th className="py-1.5 px-3 text-left">Tabla</th>
                      <th className="py-1.5 px-3 text-right">Cargadas</th>
                      <th className="py-1.5 px-3 text-left">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resultado.tablas.filter(t => t.esperadas > 0 || t.errores.length > 0).map(t => (
                      <tr key={t.tabla}>
                        <td className="py-1.5 px-3">{t.etiqueta}</td>
                        <td className={`py-1.5 px-3 text-right font-bold ${t.insertadas < t.esperadas ? 'text-red-600' : ''}`}>{t.insertadas}/{t.esperadas}</td>
                        <td className="py-1.5 px-3 text-red-600">{t.errores.join(' · ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!resultado.sinCambios && destino === 'ACTUAL' && (
              <div className="space-y-2">
                <div className="text-slate-700">Para ver los datos restaurados hay que recargar la aplicación. Se borrará la copia local de este navegador (se vuelve a leer de Supabase) y tendrás que iniciar sesión de nuevo.</div>
                <button type="button" onClick={reiniciar} className="flex items-center gap-2 bg-[#0D631B] hover:bg-[#0a4d15] text-white px-4 py-2 rounded-xl text-xs font-bold">
                  <RefreshCw className="w-4 h-4" />
                  <span>Recargar la aplicación</span>
                </button>
              </div>
            )}
            {!resultado.sinCambios && destino === 'OTRA' && (
              <div className="text-slate-700">
                Para usar la nueva cuenta, cambia en la configuración de la aplicación <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> por los del nuevo proyecto y vuelve a publicarla.
              </div>
            )}
          </div>
        )}
      </section>

      {/* ---------- 3. AYUDA ---------- */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3">
        <h2 className="text-sm font-black text-[#111C2D]">3. ¿Cómo cargo un respaldo en…?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="font-black text-[#111C2D]">Otra cuenta de Supabase</div>
            <ol className="list-decimal ml-4 space-y-0.5">
              <li>Crea el proyecto nuevo en Supabase.</li>
              <li>Descarga el esquema (arriba) y ejecútalo en su SQL Editor.</li>
              <li>Restaura aquí el .json eligiendo "Otra cuenta de Supabase".</li>
            </ol>
            <button type="button" onClick={bajarEsquema} className="mt-1.5 inline-flex items-center gap-1.5 text-[#0D631B] font-bold underline">
              <Download className="w-3.5 h-3.5" /> Descargar esquema de Supabase
            </button>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="font-black text-[#111C2D]">PostgreSQL local</div>
            <p><code>psql -U usuario -d basedatos -f respaldo_sena_postgresql_….sql</code></p>
            <div className="font-black text-[#111C2D] pt-1.5">MySQL / MariaDB</div>
            <p><code>mysql -u usuario -p basedatos &lt; respaldo_sena_mysql_….sql</code></p>
            <div className="font-black text-[#111C2D] pt-1.5">SQLite</div>
            <p>Abre el archivo <code>.sqlite</code> directamente, o: <code>sqlite3 nueva.db &lt; respaldo_sena_sqlite_….sql</code></p>
          </div>
        </div>
        <p className="text-[11px] text-slate-500">
          Los scripts SQL crean las tablas con tipos inferidos de los datos y llaves primarias; no incluyen las restricciones únicas ni las llaves foráneas de Supabase (para eso usa el esquema de Supabase).
          Los datos que solo existen en el navegador de alguien y nunca se subieron a Supabase no entran al respaldo.
        </p>
      </section>
    </div>
  );
};
