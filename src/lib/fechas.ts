/**
 * Fechas de los reportes de SofiaPlus: llegan como "dd/mm/aaaa" (a veces con
 * hora), como "aaaa-mm-dd" o como número serial de Excel.
 * Devuelven siempre "aaaa-mm-dd", o '' si no se pueden leer.
 */
export function fechaSofiaAISO(valor?: string | number | null): string {
  const t = String(valor ?? '').trim();
  if (!t) return '';
  let y: number, m: number, d: number;
  let r: RegExpMatchArray | null;
  if ((r = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/))) {
    d = +r[1]; m = +r[2]; y = +r[3];
  } else if ((r = t.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/))) {
    y = +r[1]; m = +r[2]; d = +r[3];
  } else if (/^\d{5}(\.\d+)?$/.test(t)) {
    const f = new Date(Math.round((Number(t) - 25569) * 86400 * 1000));
    y = f.getUTCFullYear(); m = f.getUTCMonth() + 1; d = f.getUTCDate();
  } else {
    return '';
  }
  const fecha = new Date(Date.UTC(y, m - 1, d));
  if (fecha.getUTCFullYear() !== y || fecha.getUTCMonth() !== m - 1 || fecha.getUTCDate() !== d) return '';
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Resta meses a una fecha "aaaa-mm-dd" (si el día no existe en el mes destino, usa el último día). */
export function restarMeses(iso: string, meses: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const total = y * 12 + (m - 1) - meses;
  const ny = Math.floor(total / 12);
  const nm = total % 12;
  const ultimo = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return `${String(ny).padStart(4, '0')}-${String(nm + 1).padStart(2, '0')}-${String(Math.min(d, ultimo)).padStart(2, '0')}`;
}
