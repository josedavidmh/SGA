/**
 * Cálculo de festivos colombianos, sin depender de ningún servicio externo.
 *
 * Colombia tiene 18 festivos al año, en tres grupos:
 * 1) Fijos: nunca se trasladan de día.
 * 2) "Ley Emiliani" (Ley 51 de 1983): si no caen en lunes, se trasladan
 *    SIEMPRE al lunes siguiente.
 * 3) Móviles según la Pascua: Jueves y Viernes Santo (no se trasladan,
 *    siempre caen en jueves/viernes por definición) y Ascensión, Corpus
 *    Christi y Sagrado Corazón (estos sí aplican Ley Emiliani).
 *
 * Se usa para excluir del conteo de "horas ejecutadas" los días en que,
 * aunque el bloque de horario esté programado ese día de la semana, no
 * hubo clase por ser festivo.
 */

function fecha(anio: number, mesIndex0: number, dia: number): Date {
  return new Date(anio, mesIndex0, dia);
}

function siguienteLunes(d: Date): Date {
  const copia = new Date(d);
  const diaSemana = copia.getDay(); // 0=domingo ... 6=sábado
  if (diaSemana === 1) return copia; // ya es lunes
  const diasHastaLunes = (8 - diaSemana) % 7 || 7;
  copia.setDate(copia.getDate() + diasHastaLunes);
  return copia;
}

/** Domingo de Pascua para un año dado (algoritmo de Meeus/Jones/Butcher, calendario gregoriano). */
function domingoDePascua(anio: number): Date {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31); // 3=marzo, 4=abril
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(anio, mes - 1, dia);
}

function sumarDias(d: Date, dias: number): Date {
  const copia = new Date(d);
  copia.setDate(copia.getDate() + dias);
  return copia;
}

function mismaFecha(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Los 18 festivos oficiales de Colombia para un año dado. */
export function festivosColombia(anio: number): Date[] {
  const pascua = domingoDePascua(anio);

  const fijos = [
    fecha(anio, 0, 1),   // Año Nuevo
    fecha(anio, 4, 1),   // Día del Trabajo
    fecha(anio, 6, 20),  // Independencia
    fecha(anio, 7, 7),   // Batalla de Boyacá
    fecha(anio, 11, 8),  // Inmaculada Concepción
    fecha(anio, 11, 25), // Navidad
  ];

  const emiliani = [
    fecha(anio, 0, 6),   // Reyes Magos
    fecha(anio, 2, 19),  // San José
    fecha(anio, 5, 29),  // San Pedro y San Pablo
    fecha(anio, 7, 15),  // Asunción de la Virgen
    fecha(anio, 9, 12),  // Día de la Raza
    fecha(anio, 10, 1),  // Todos los Santos
    fecha(anio, 10, 11), // Independencia de Cartagena
  ].map(siguienteLunes);

  const moviles = [
    sumarDias(pascua, -3), // Jueves Santo
    sumarDias(pascua, -2), // Viernes Santo
    siguienteLunes(sumarDias(pascua, 39)), // Ascensión del Señor
    siguienteLunes(sumarDias(pascua, 60)), // Corpus Christi
    siguienteLunes(sumarDias(pascua, 68)), // Sagrado Corazón de Jesús
  ];

  return [...fijos, ...emiliani, ...moviles];
}

/** true si la fecha dada es festivo en Colombia. */
export function esFestivoColombia(d: Date): boolean {
  const anio = d.getFullYear();
  // Por si el rango cruza fin/inicio de año, se revisan también los festivos
  // del año anterior y siguiente cuando la fecha cae en esos extremos.
  const candidatos = [...festivosColombia(anio - 1), ...festivosColombia(anio), ...festivosColombia(anio + 1)];
  return candidatos.some(f => mismaFecha(f, d));
}

const INDICE_DIA_SEMANA: Record<string, number> = {
  'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6
};

/**
 * Convierte "AAAA-MM-DD" (o "AAAA-MM-DDTHH:mm…") en una fecha LOCAL a medianoche.
 * `new Date("2026-10-02")` se interpreta como UTC y, en Colombia (UTC−5),
 * cae en la tarde del 1 de octubre: se corre un día. Aquí se evita.
 */
export function parsearFechaLocal(texto: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec((texto || '').trim());
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(texto);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Fecha local como "AAAA-MM-DD". */
export function fechaISOLocal(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * Cuenta cuántas veces cae un día de la semana entre dos fechas (ambas
 * incluidas), y cuáles de esas ocurrencias son festivo en Colombia (por lo
 * tanto no hubo clase ese día aunque el bloque estuviera programado).
 *
 * También devuelve la PRIMERA y la ÚLTIMA fecha en que realmente hay clase
 * (ese día de la semana y no festivo): son las fechas reales de inicio y fin
 * del evento, p. ej. un martes dentro de un trimestre que empieza un viernes
 * 2 de octubre inicia el martes 6 de octubre.
 */
export function contarOcurrenciasDia(
  diaSemana: string,
  fechaInicioStr: string,
  fechaFinStr: string
): {
  totalOcurrencias: number;
  ocurrenciasHabiles: number;
  festivosExcluidos: Date[];
  primeraFechaHabil: Date | null;
  ultimaFechaHabil: Date | null;
} {
  const objetivo = INDICE_DIA_SEMANA[diaSemana];
  const inicio = parsearFechaLocal(fechaInicioStr);
  const fin = parsearFechaLocal(fechaFinStr);

  if (objetivo === undefined || !inicio || !fin || inicio > fin) {
    return { totalOcurrencias: 0, ocurrenciasHabiles: 0, festivosExcluidos: [], primeraFechaHabil: null, ultimaFechaHabil: null };
  }

  let totalOcurrencias = 0;
  let ocurrenciasHabiles = 0;
  const festivosExcluidos: Date[] = [];
  let primeraFechaHabil: Date | null = null;
  let ultimaFechaHabil: Date | null = null;

  const cursor = new Date(inicio);
  // Avanzar al primer día que coincida con el día de la semana objetivo
  while (cursor.getDay() !== objetivo && cursor <= fin) {
    cursor.setDate(cursor.getDate() + 1);
  }

  while (cursor <= fin) {
    totalOcurrencias += 1;
    if (esFestivoColombia(cursor)) {
      festivosExcluidos.push(new Date(cursor));
    } else {
      ocurrenciasHabiles += 1;
      if (!primeraFechaHabil) primeraFechaHabil = new Date(cursor);
      ultimaFechaHabil = new Date(cursor);
    }
    cursor.setDate(cursor.getDate() + 7);
  }

  return { totalOcurrencias, ocurrenciasHabiles, festivosExcluidos, primeraFechaHabil, ultimaFechaHabil };
}
