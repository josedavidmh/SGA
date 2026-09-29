/**
 * Generador de identificadores únicos en formato UUID v4.
 *
 * Se centraliza aquí porque varias tablas en Supabase (actividades_seguimiento,
 * raps_seguimiento, fichas, etc.) tienen su columna `id` tipada como UUID.
 * Los ids generados en el cliente con plantillas tipo `rap_seg_${Date.now()}`
 * no son UUIDs válidos y Postgres rechaza el insert/upsert con
 * "invalid input syntax for type uuid". Usar crypto.randomUUID() (con un
 * fallback manual por si el navegador no lo soporta) evita ese problema y
 * de paso elimina el riesgo de colisión de `Date.now()` cuando dos ediciones
 * caen en el mismo milisegundo.
 */
export function generarUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback (navegadores muy antiguos o contexto no seguro sin crypto.randomUUID)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
