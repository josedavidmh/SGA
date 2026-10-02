import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabase, formatSupabaseUrl, formattedSupabaseUrl } from '../lib/supabaseClient';

/**
 * RESPALDO Y RESTAURACIÓN
 *
 * El respaldo se lee de Supabase (la fuente de verdad que ven todos los
 * usuarios) y se puede generar en varios formatos:
 *  - JSON completo: el que usa la propia app para restaurar (en esta cuenta o en otra).
 *  - SQL para PostgreSQL / MySQL / SQLite: para cargar los datos en una base local.
 *  - Archivo SQLite (.sqlite): una base de datos lista para abrir.
 *
 * Restaurar SIEMPRE reemplaza: borra los datos de la base destino y carga el respaldo.
 */

export type Fila = Record<string, any>;

export interface TablaRespaldo { nombre: string; etiqueta: string; opcional?: boolean }

/** Orden de carga: las tablas "padre" primero. Al borrar se recorre al revés. */
export const TABLAS_RESPALDO: TablaRespaldo[] = [
  { nombre: 'centros_formacion', etiqueta: 'Centros de formación' },
  { nombre: 'usuarios', etiqueta: 'Usuarios' },
  { nombre: 'programas_formacion', etiqueta: 'Programas de formación' },
  { nombre: 'especialidades_tematicas', etiqueta: 'Especialidades temáticas' },
  { nombre: 'instructores', etiqueta: 'Instructores' },
  { nombre: 'trimestres_calendario', etiqueta: 'Calendario de trimestres' },
  { nombre: 'ambientes', etiqueta: 'Ambientes de aprendizaje' },
  { nombre: 'fichas', etiqueta: 'Fichas' },
  { nombre: 'competencias', etiqueta: 'Competencias' },
  { nombre: 'resultados_aprendizaje', etiqueta: 'RAPs (resultados de aprendizaje)' },
  { nombre: 'aprendices', etiqueta: 'Aprendices', opcional: true },
  { nombre: 'juicios_evaluativos', etiqueta: 'Juicios evaluativos', opcional: true },
  { nombre: 'actividades_seguimiento', etiqueta: 'Actividades de seguimiento' },
  { nombre: 'bloques_horarios', etiqueta: 'Bloques de horario' },
  { nombre: 'raps_seguimiento', etiqueta: 'Seguimiento por RAP' },
  { nombre: 'horas_ejecutadas_ficha', etiqueta: 'Horas ejecutadas por ficha' },
  { nombre: 'archivo_seguimiento_registros', etiqueta: 'Archivo de seguimiento' },
  { nombre: 'auditoria_ingestas', etiqueta: 'Auditoría de ingestas' },
  { nombre: 'auditoria_sistema', etiqueta: 'Auditoría del sistema' }
];

export const FORMATO_RESPALDO = 'sena-gestion-academica-respaldo';
export const VERSION_RESPALDO = 1;

export interface Respaldo {
  formato: string;
  version: number;
  generado: string;
  origen: string;
  tablas: Record<string, Fila[]>;
  /** Tablas que no se pudieron leer (no existen o sin permiso), con el motivo. */
  omitidas: Record<string, string>;
}

export interface ResumenTabla { tabla: string; etiqueta: string; filas: number; omitida?: string }

const PAGINA = 1000;

const esTablaFaltante = (error: { code?: string; message?: string } | null | undefined) =>
  !!error && (
    error.code === '42P01' || error.code === 'PGRST205' || error.code === 'PGRST200' ||
    /does not exist|could not find the table|schema cache/i.test(error.message || '')
  );

// ---------------------------------------------------------------------------
// LECTURA
// ---------------------------------------------------------------------------

export function crearClienteDestino(url: string, key: string): SupabaseClient {
  const u = formatSupabaseUrl(url);
  if (!u) throw new Error('La URL del proyecto de Supabase no es válida.');
  if (!key || key.trim().length < 20) throw new Error('La clave (anon / service_role) no es válida.');
  return createClient(u, key.trim(), { auth: { persistSession: false, autoRefreshToken: false } });
}

async function leerTabla(cliente: SupabaseClient, tabla: string): Promise<{ filas: Fila[]; error?: string; faltante?: boolean }> {
  const filas: Fila[] = [];
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await cliente.from(tabla).select('*').order('id', { ascending: true }).range(desde, desde + PAGINA - 1);
    if (error) return { filas: [], error: error.message, faltante: esTablaFaltante(error) };
    filas.push(...(data || []));
    if (!data || data.length < PAGINA) break;
  }
  return { filas };
}

export async function exportarRespaldo(
  cliente: SupabaseClient = supabase,
  onProgreso?: (mensaje: string, porcentaje: number) => void
): Promise<Respaldo> {
  const respaldo: Respaldo = {
    formato: FORMATO_RESPALDO,
    version: VERSION_RESPALDO,
    generado: new Date().toISOString(),
    origen: formattedSupabaseUrl,
    tablas: {},
    omitidas: {}
  };
  for (let i = 0; i < TABLAS_RESPALDO.length; i++) {
    const t = TABLAS_RESPALDO[i];
    onProgreso?.(`Leyendo ${t.etiqueta}…`, Math.round((i / TABLAS_RESPALDO.length) * 100));
    const r = await leerTabla(cliente, t.nombre);
    if (r.error) {
      // Las opcionales o inexistentes se omiten sin frenar el respaldo.
      respaldo.omitidas[t.nombre] = r.faltante ? 'La tabla no existe en esta base de datos.' : r.error;
      continue;
    }
    respaldo.tablas[t.nombre] = r.filas;
  }
  onProgreso?.('Listo', 100);
  return respaldo;
}

export function resumenDeRespaldo(r: Respaldo): ResumenTabla[] {
  return TABLAS_RESPALDO
    .filter(t => r.tablas[t.nombre] || r.omitidas[t.nombre])
    .map(t => ({
      tabla: t.nombre,
      etiqueta: t.etiqueta,
      filas: r.tablas[t.nombre]?.length || 0,
      omitida: r.omitidas[t.nombre]
    }));
}

export const totalFilas = (r: Respaldo) => Object.values(r.tablas).reduce((a, f) => a + f.length, 0);

export async function leerArchivoRespaldo(archivo: File): Promise<Respaldo> {
  let json: any;
  try {
    json = JSON.parse(await archivo.text());
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }
  if (!json || json.formato !== FORMATO_RESPALDO || typeof json.tablas !== 'object') {
    throw new Error('Este archivo no es un respaldo de este sistema (formato no reconocido). Usa el .json generado en esta sección.');
  }
  if (Number(json.version) > VERSION_RESPALDO) {
    throw new Error('El respaldo fue generado con una versión más nueva del sistema. Actualiza la aplicación antes de restaurarlo.');
  }
  return { omitidas: {}, ...json } as Respaldo;
}

// ---------------------------------------------------------------------------
// ESQUEMA INFERIDO (para los scripts SQL)
// ---------------------------------------------------------------------------

type TipoCol = 'bool' | 'int' | 'big' | 'num' | 'ts' | 'date' | 'json' | 'text';
interface Columna { nombre: string; tipo: TipoCol; maxLen: number; generada?: boolean }
export type Dialecto = 'postgres' | 'mysql' | 'sqlite';

/** Columnas calculadas por la base (no se pueden insertar). */
const GENERADAS: Record<string, Record<string, Record<Dialecto, string>>> = {
  instructores: {
    nombre_completo: {
      postgres: "nombres || ' ' || apellidos",
      mysql: "CONCAT(nombres, ' ', apellidos)",
      sqlite: "nombres || ' ' || apellidos"
    }
  }
};

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const RE_TS = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;

function tipoDeValor(v: any): TipoCol {
  if (typeof v === 'boolean') return 'bool';
  if (typeof v === 'number') {
    if (!Number.isInteger(v)) return 'num';
    return Math.abs(v) > 2147483647 ? 'big' : 'int';
  }
  if (typeof v === 'object') return 'json';
  const s = String(v);
  if (RE_FECHA.test(s)) return 'date';
  if (RE_TS.test(s) && !Number.isNaN(Date.parse(s))) return 'ts';
  return 'text';
}

function fusionarTipos(a: TipoCol | null, b: TipoCol): TipoCol {
  if (!a || a === b) return b;
  const numericos: TipoCol[] = ['int', 'big', 'num'];
  if (numericos.includes(a) && numericos.includes(b)) return a === 'num' || b === 'num' ? 'num' : 'big';
  return 'text';
}

function inferirColumnas(tabla: string, filas: Fila[]): Columna[] {
  const orden: string[] = [];
  const info = new Map<string, { tipo: TipoCol | null; maxLen: number }>();
  for (const f of filas) {
    for (const k of Object.keys(f)) {
      if (!info.has(k)) { info.set(k, { tipo: null, maxLen: 0 }); orden.push(k); }
      const v = f[k];
      if (v === null || v === undefined) continue;
      const c = info.get(k)!;
      c.tipo = fusionarTipos(c.tipo, tipoDeValor(v));
      const len = typeof v === 'object' ? 99999 : String(v).length;
      if (len > c.maxLen) c.maxLen = len;
    }
  }
  const generadas = GENERADAS[tabla] || {};
  Object.keys(generadas).forEach(g => { if (!info.has(g)) { info.set(g, { tipo: 'text', maxLen: 0 }); orden.push(g); } });
  // La columna id primero.
  orden.sort((a, b) => (a === 'id' ? -1 : b === 'id' ? 1 : 0));
  return orden.map(nombre => ({
    nombre,
    tipo: info.get(nombre)!.tipo || 'text',
    maxLen: info.get(nombre)!.maxLen,
    generada: !!generadas[nombre]
  }));
}

const quote = (d: Dialecto, id: string) => (d === 'mysql' ? `\`${id}\`` : `"${id}"`);

function tipoSql(d: Dialecto, c: Columna): string {
  if (c.nombre === 'id') return d === 'mysql' ? 'VARCHAR(64)' : 'TEXT';
  switch (c.tipo) {
    case 'bool': return d === 'postgres' ? 'BOOLEAN' : d === 'mysql' ? 'TINYINT(1)' : 'INTEGER';
    case 'int': return d === 'mysql' ? 'INT' : 'INTEGER';
    case 'big': return d === 'sqlite' ? 'INTEGER' : 'BIGINT';
    case 'num': return d === 'postgres' ? 'DOUBLE PRECISION' : d === 'mysql' ? 'DOUBLE' : 'REAL';
    case 'ts': return d === 'postgres' ? 'TIMESTAMPTZ' : d === 'mysql' ? 'DATETIME(3)' : 'TEXT';
    case 'date': return d === 'sqlite' ? 'TEXT' : 'DATE';
    case 'json': return d === 'postgres' ? 'JSONB' : d === 'mysql' ? 'JSON' : 'TEXT';
    default:
      if (d === 'mysql') return c.maxLen <= 100 ? 'VARCHAR(255)' : c.maxLen <= 20000 ? 'TEXT' : 'LONGTEXT';
      return 'TEXT';
  }
}

function escTexto(d: Dialecto, s: string): string {
  const limpio = s.replace(/\u0000/g, '');
  return d === 'mysql'
    ? limpio.replace(/\\/g, '\\\\').replace(/'/g, "''")
    : limpio.replace(/'/g, "''");
}

function literal(d: Dialecto, v: any, c: Columna): string {
  if (v === null || v === undefined) return 'NULL';
  switch (c.tipo) {
    case 'bool': return d === 'postgres' ? (v ? 'TRUE' : 'FALSE') : (v ? '1' : '0');
    case 'int': case 'big': case 'num':
      if (typeof v === 'number' && Number.isFinite(v)) return String(v);
      return `'${escTexto(d, String(v))}'`;
    case 'json': {
      const txt = escTexto(d, JSON.stringify(v));
      return d === 'postgres' ? `'${txt}'::jsonb` : `'${txt}'`;
    }
    case 'ts':
      if (d === 'mysql') {
        const t = new Date(String(v));
        return Number.isNaN(t.getTime()) ? 'NULL' : `'${t.toISOString().replace('T', ' ').replace('Z', '')}'`;
      }
      return `'${escTexto(d, String(v))}'`;
    default:
      return `'${escTexto(d, typeof v === 'object' ? JSON.stringify(v) : String(v))}'`;
  }
}

// ---------------------------------------------------------------------------
// SCRIPTS SQL
// ---------------------------------------------------------------------------

const NOMBRE_DIALECTO: Record<Dialecto, string> = { postgres: 'PostgreSQL / Supabase', mysql: 'MySQL / MariaDB', sqlite: 'SQLite' };

function cabecera(d: Dialecto, r: Respaldo): string[] {
  return [
    '-- =====================================================================',
    `-- RESPALDO - SISTEMA DE GESTIÓN ACADÉMICA Y CURRICULAR  (${NOMBRE_DIALECTO[d]})`,
    `-- Generado: ${r.generado}`,
    `-- Origen:   ${r.origen}`,
    `-- Filas:    ${totalFilas(r)} en ${Object.keys(r.tablas).length} tablas`,
    '--',
    '-- Este script REEMPLAZA el contenido de las tablas incluidas.',
    '-- Contiene datos de usuarios (incluye el hash de las claves): guárdalo en un lugar seguro.',
    '-- ====================================================================='
  ];
}

export function generarSql(r: Respaldo, d: Dialecto): string {
  const out: string[] = cabecera(d, r);
  const tablas = TABLAS_RESPALDO.filter(t => r.tablas[t.nombre]);
  const conFilas = tablas.filter(t => r.tablas[t.nombre].length > 0);
  const tamLote = d === 'sqlite' ? 50 : 100;

  if (d === 'mysql') {
    out.push('', '-- CREATE DATABASE IF NOT EXISTS sena_gestion CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;', '-- USE sena_gestion;', '',
      'SET NAMES utf8mb4;', 'SET FOREIGN_KEY_CHECKS = 0;', "SET time_zone = '+00:00';");
  } else if (d === 'sqlite') {
    out.push('', 'PRAGMA foreign_keys = OFF;', 'BEGIN TRANSACTION;');
  } else {
    out.push('', 'BEGIN;');
  }

  // 1) Estructura
  const columnasPorTabla = new Map<string, Columna[]>();
  for (const t of conFilas) {
    const cols = inferirColumnas(t.nombre, r.tablas[t.nombre]);
    columnasPorTabla.set(t.nombre, cols);
    const defs = cols.map(c => {
      if (c.generada) {
        const expr = GENERADAS[t.nombre][c.nombre][d];
        return `  ${quote(d, c.nombre)} ${tipoSql(d, c)} GENERATED ALWAYS AS (${expr}) STORED`;
      }
      return `  ${quote(d, c.nombre)} ${tipoSql(d, c)}${c.nombre === 'id' ? ' PRIMARY KEY' : ''}`;
    });
    out.push('');
    if (d === 'postgres') {
      out.push(`CREATE TABLE IF NOT EXISTS public.${quote(d, t.nombre)} (`, defs.join(',\n'), ');');
    } else {
      out.push(`DROP TABLE IF EXISTS ${quote(d, t.nombre)};`, `CREATE TABLE ${quote(d, t.nombre)} (`, defs.join(',\n'), d === 'mysql' ? ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;' : ');');
    }
  }

  // 2) PostgreSQL: se vacían las tablas (en orden inverso) para reemplazar el contenido.
  if (d === 'postgres') {
    out.push('', '-- Reemplazo: se borra el contenido actual (de hijas a padres).');
    for (const t of [...tablas].reverse()) {
      out.push(`DO $$ BEGIN IF to_regclass('public.${t.nombre}') IS NOT NULL THEN DELETE FROM public.${quote(d, t.nombre)}; END IF; END $$;`);
    }
  }

  // 3) Datos
  for (const t of conFilas) {
    const filas = r.tablas[t.nombre];
    const todas = columnasPorTabla.get(t.nombre)!;
    const cols = todas.filter(c => !c.generada);
    const lista = cols.map(c => quote(d, c.nombre)).join(', ');
    out.push('', `-- ${t.etiqueta} (${filas.length})`);
    for (let i = 0; i < filas.length; i += tamLote) {
      const valores = filas.slice(i, i + tamLote)
        .map(f => `(${cols.map(c => literal(d, f[c.nombre], c)).join(', ')})`)
        .join(',\n');
      let sentencia = `INSERT INTO ${d === 'postgres' ? 'public.' : ''}${quote(d, t.nombre)} (${lista}) VALUES\n${valores}`;
      if (d === 'postgres') {
        const sets = cols.filter(c => c.nombre !== 'id').map(c => `${quote(d, c.nombre)} = EXCLUDED.${quote(d, c.nombre)}`).join(', ');
        sentencia += sets ? `\nON CONFLICT ("id") DO UPDATE SET ${sets}` : '\nON CONFLICT ("id") DO NOTHING';
      }
      out.push(sentencia + ';');
    }
  }

  for (const t of tablas) {
    if (r.tablas[t.nombre].length === 0) out.push('', `-- ${t.etiqueta}: sin datos en el respaldo.`);
  }

  out.push('');
  if (d === 'mysql') out.push('SET FOREIGN_KEY_CHECKS = 1;');
  else if (d === 'sqlite') out.push('COMMIT;', 'PRAGMA foreign_keys = ON;');
  else out.push('COMMIT;');
  return out.join('\n') + '\n';
}

/** Crea un archivo SQLite real (.sqlite) con todos los datos. */
export async function generarArchivoSqlite(r: Respaldo): Promise<Uint8Array> {
  const [{ default: initSqlJs }, { default: wasmUrl }] = await Promise.all([
    import('sql.js'),
    import('sql.js/dist/sql-wasm.wasm?url')
  ]);
  const SQL = await initSqlJs({ locateFile: () => wasmUrl });
  const db = new SQL.Database();
  try {
    db.exec(generarSql(r, 'sqlite'));
    return db.export();
  } finally {
    db.close();
  }
}

/** Esquema completo de Supabase (todas las migraciones en orden) para preparar una cuenta nueva. */
export function esquemaSupabaseSql(): string {
  const migraciones = import.meta.glob('../../supabase/migrations/*.sql', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
  const nombres = Object.keys(migraciones).sort((a, b) => a.localeCompare(b));
  const partes = [
    '-- =====================================================================',
    '-- ESQUEMA COMPLETO - SISTEMA DE GESTIÓN ACADÉMICA Y CURRICULAR (Supabase)',
    '-- Para un proyecto de Supabase NUEVO y VACÍO: pégalo completo en el SQL Editor y ejecútalo',
    '-- una sola vez. Después restaura el respaldo .json desde la sección Respaldo y Restauración.',
    '-- Si el proyecto ya tiene el esquema, NO lo ejecutes de nuevo.',
    '-- ====================================================================='
  ];
  for (const n of nombres) {
    partes.push('', `-- >>>>>>>>>> ${n.split('/').pop()}`, migraciones[n].trim());
  }
  return partes.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// RESTAURACIÓN (siempre reemplaza)
// ---------------------------------------------------------------------------

export interface ResultadoTabla { tabla: string; etiqueta: string; esperadas: number; insertadas: number; errores: string[] }
export interface ResultadoRestauracion {
  ok: boolean;
  /** Si es true no se tocó ningún dato (falló una verificación previa). */
  sinCambios: boolean;
  mensaje: string;
  tablas: ResultadoTabla[];
  advertencias: string[];
}

const TAM_LOTE = 200;

/** Verifica que el destino tenga las tablas del respaldo. Devuelve las que faltan. */
export async function verificarDestino(cliente: SupabaseClient, respaldo: Respaldo): Promise<{ faltantes: string[]; error?: string }> {
  const faltantes: string[] = [];
  for (const t of TABLAS_RESPALDO) {
    const filas = respaldo.tablas[t.nombre];
    if (!filas) continue;
    const { error } = await cliente.from(t.nombre).select('id').limit(1);
    if (error) {
      if (esTablaFaltante(error)) { if (filas.length > 0) faltantes.push(t.nombre); continue; }
      return { faltantes, error: `No se pudo leer "${t.nombre}" en el destino: ${error.message}` };
    }
  }
  return { faltantes };
}

async function contarFilas(cliente: SupabaseClient, tabla: string): Promise<number> {
  const { count, error } = await cliente.from(tabla).select('id', { count: 'exact', head: true });
  return error ? -1 : (count ?? 0);
}

function limpiarFila(tabla: string, fila: Fila, ocultas: Set<string>, otraCuenta: boolean): Fila {
  const copia: Fila = { ...fila };
  Object.keys(GENERADAS[tabla] || {}).forEach(g => delete copia[g]);
  ocultas.forEach(c => delete copia[c]);
  // El vínculo con Supabase Auth no existe en otra cuenta.
  if (otraCuenta && tabla === 'usuarios' && 'auth_user_id' in copia) copia.auth_user_id = null;
  return copia;
}

export async function restaurarRespaldo(
  respaldo: Respaldo,
  opciones: { cliente?: SupabaseClient; otraCuenta?: boolean },
  onProgreso?: (mensaje: string, porcentaje: number) => void
): Promise<ResultadoRestauracion> {
  const cliente = opciones.cliente || supabase;
  const otraCuenta = !!opciones.otraCuenta;
  const advertencias: string[] = [];
  const presentes = TABLAS_RESPALDO.filter(t => respaldo.tablas[t.nombre]);

  // 1) Verificaciones previas: no se toca nada si falla algo.
  onProgreso?.('Verificando la base de datos destino…', 2);
  const v = await verificarDestino(cliente, respaldo);
  if (v.error) return { ok: false, sinCambios: true, mensaje: v.error, tablas: [], advertencias };
  if (v.faltantes.length > 0) {
    return {
      ok: false, sinCambios: true, tablas: [], advertencias,
      mensaje: `En la base destino faltan estas tablas: ${v.faltantes.join(', ')}. Ejecuta primero el esquema completo (botón "Descargar esquema de Supabase") en el SQL Editor del destino.`
    };
  }

  // 2) Borrar (de hijas a padres).
  const reversa = [...presentes].reverse();
  for (let i = 0; i < reversa.length; i++) {
    const t = reversa[i];
    onProgreso?.(`Vaciando ${t.etiqueta}…`, 5 + Math.round((i / reversa.length) * 20));
    const { error } = await cliente.from(t.nombre).delete().not('id', 'is', null);
    if (error) {
      if (esTablaFaltante(error)) continue;
      return { ok: false, sinCambios: false, tablas: [], advertencias, mensaje: `No se pudo vaciar "${t.nombre}": ${error.message}. Pudo quedar parcialmente vacía: restaura de nuevo o usa el respaldo de seguridad.` };
    }
    const quedan = await contarFilas(cliente, t.nombre);
    if (quedan > 0) {
      return { ok: false, sinCambios: false, tablas: [], advertencias, mensaje: `No se pudieron borrar todas las filas de "${t.nombre}" (quedaron ${quedan}). Revisa las políticas RLS de Supabase: la clave usada no tiene permiso para borrar.` };
    }
  }

  // 3) Insertar (de padres a hijas).
  const resultados: ResultadoTabla[] = [];
  const columnasIgnoradas = new Map<string, Set<string>>();
  for (let i = 0; i < presentes.length; i++) {
    const t = presentes[i];
    const filas = respaldo.tablas[t.nombre];
    const res: ResultadoTabla = { tabla: t.nombre, etiqueta: t.etiqueta, esperadas: filas.length, insertadas: 0, errores: [] };
    resultados.push(res);
    const ocultas = columnasIgnoradas.get(t.nombre) || new Set<string>();
    columnasIgnoradas.set(t.nombre, ocultas);

    for (let desde = 0; desde < filas.length; desde += TAM_LOTE) {
      onProgreso?.(`Cargando ${t.etiqueta} (${Math.min(desde + TAM_LOTE, filas.length)}/${filas.length})…`, 25 + Math.round(((i + desde / Math.max(filas.length, 1)) / presentes.length) * 70));
      const lote = filas.slice(desde, desde + TAM_LOTE);
      let intentos = 0;
      let enviado = false;
      while (!enviado && intentos < 6) {
        intentos++;
        const { error } = await cliente.from(t.nombre).upsert(lote.map(f => limpiarFila(t.nombre, f, ocultas, otraCuenta)), { onConflict: 'id' });
        if (!error) { res.insertadas += lote.length; enviado = true; break; }
        // Columna que el destino no conoce (esquema más viejo): se omite y se avisa.
        const m = /Could not find the '([^']+)' column/i.exec(error.message || '');
        if (error.code === 'PGRST204' && m) {
          ocultas.add(m[1]);
          advertencias.push(`La tabla "${t.nombre}" del destino no tiene la columna "${m[1]}"; se omitió. Ejecuta el esquema completo para tenerla.`);
          continue;
        }
        // Otro error: se aísla fila por fila para no perder todo el lote.
        for (const f of lote) {
          const r1 = await cliente.from(t.nombre).upsert([limpiarFila(t.nombre, f, ocultas, otraCuenta)], { onConflict: 'id' });
          if (r1.error) {
            if (res.errores.length < 8) res.errores.push(`${String(f.id).slice(0, 36)}: ${r1.error.message}`);
          } else {
            res.insertadas += 1;
          }
        }
        enviado = true;
      }
    }
  }

  // 4) Verificación final
  onProgreso?.('Verificando el resultado…', 97);
  for (const r of resultados) {
    const n = await contarFilas(cliente, r.tabla);
    if (n >= 0 && n !== r.esperadas && r.errores.length === 0) {
      r.errores.push(`El destino tiene ${n} filas y el respaldo ${r.esperadas}.`);
    }
  }
  const conErrores = resultados.filter(r => r.errores.length > 0 || r.insertadas < r.esperadas);
  onProgreso?.('Listo', 100);
  return {
    ok: conErrores.length === 0,
    sinCambios: false,
    mensaje: conErrores.length === 0
      ? 'Restauración completada: la base destino quedó igual al respaldo.'
      : `Restauración terminada con diferencias en ${conErrores.length} tabla(s). Revisa el detalle.`,
    tablas: resultados,
    advertencias: Array.from(new Set(advertencias))
  };
}

/** Borra los datos guardados en este navegador (se vuelven a leer de Supabase al recargar). */
export function limpiarDatosLocales() {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith('sena_') && k !== 'sena_sidebar_collapsed')
      .forEach(k => localStorage.removeItem(k));
  } catch { /* sin storage */ }
}

// ---------------------------------------------------------------------------
// DESCARGAS
// ---------------------------------------------------------------------------

export function descargarArchivo(contenido: BlobPart, nombre: string, tipo: string) {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const marcaDeTiempo = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
};
