/**
 * Convierte textos escritos en MAYÚSCULA SOSTENIDA a formato oración
 * (primera letra de cada oración en mayúscula, el resto en minúscula),
 * respetando siglas y nombres propios conocidos.
 *
 * Los textos que ya vienen bien escritos (mayúsculas y minúsculas mezcladas)
 * se devuelven tal cual, así nunca se dañan nombres propios ya correctos.
 */

/** Siglas y nombres propios que deben conservar su escritura. Se pueden ampliar. */
const ESCRITURA_ESPECIAL: string[] = [
  // Siglas
  'SENA', 'TIC', 'TICs', 'TI', 'API', 'APIs', 'SQL', 'NoSQL', 'UML', 'HTML', 'CSS', 'JSON', 'XML', 'HTTP', 'HTTPS',
  'URL', 'UI', 'UX', 'IDE', 'IDEs', 'BD', 'MVC', 'CRUD', 'REST', 'RESTful', 'SOAP', 'JWT', 'SDK', 'ORM', 'DOM',
  'ISO', 'IEEE', 'PPPF', 'RAP', 'ADSO', 'CI/CD', 'TCP/IP', 'PHP', 'SSL', 'TLS', 'VPN', 'LAN', 'WAN', 'IP', 'USB',
  'GPS', 'PDF', 'ERP', 'CRM', 'QA', 'TDD', 'BDD', 'POO', 'DevOps', 'Scrum', 'Kanban', 'XP',
  // Tecnologías y nombres propios
  'JavaScript', 'TypeScript', 'Java', 'Python', 'React', 'Angular', 'Vue', 'Node.js', 'Git', 'GitHub', 'GitLab',
  'Android', 'iOS', 'Docker', 'MySQL', 'PostgreSQL', 'MongoDB', 'SQLite', 'Linux', 'Windows', 'Excel', 'Word',
  'PowerPoint', 'Office', 'Google', 'Microsoft', 'Oracle', 'Firebase', 'Supabase', 'Laravel', 'Django', 'Spring',
  'Colombia', 'Colombiano', 'Colombiana', 'Europa', 'Europeo', 'Wi-Fi'
];

const MAPA_ESPECIAL = new Map(ESCRITURA_ESPECIAL.map(t => [t.toLowerCase(), t]));
// Números romanos frecuentes (se evitan I, V y X sueltas por confundirse con otras palabras).
const ROMANOS = new Set(['ii', 'iii', 'iv', 'vi', 'vii', 'viii', 'ix']);

const LETRAS = /\p{L}/gu;
const MAYUSCULAS = /\p{Lu}/gu;

/** true si el texto está (casi todo) en mayúsculas. */
export function estaEnMayusculaSostenida(texto: string): boolean {
  const letras = (texto.match(LETRAS) || []).length;
  if (letras < 4) return false;
  const mayus = (texto.match(MAYUSCULAS) || []).length;
  return mayus / letras >= 0.8;
}

export function aFormatoOracion(texto?: string | null): string {
  const original = texto ?? '';
  if (!original || !estaEnMayusculaSostenida(original)) return original;

  // 1) Todo a minúscula y se restauran siglas / nombres propios palabra por palabra.
  let resultado = original.toLowerCase().replace(/[\p{L}\p{N}][\p{L}\p{N}./+-]*[\p{L}\p{N}]|[\p{L}\p{N}]/gu, palabra => {
    const especial = MAPA_ESPECIAL.get(palabra);
    if (especial) return especial;
    if (ROMANOS.has(palabra)) return palabra.toUpperCase();
    return palabra;
  });

  // 2) Mayúscula inicial al comenzar el texto, cada línea y después de . ! ? :
  resultado = resultado.replace(/(^|[.!?]\s+|\n+\s*)(\p{Ll})/gu, (_m, previo: string, letra: string) => previo + letra.toUpperCase());
  return resultado;
}
