import { ResultadoAprendizaje } from '../types';

/**
 * Motor de cruce entre lo que trae un Juicio Evaluativo de SofiaPlus
 * (competencia + RAP en texto libre, a veces truncado o parafraseado) y el
 * catálogo real de competencias/RAPs cargado desde Planeación Pedagógica
 * (el "archivo de seguimiento" que sí persiste).
 *
 * Diseño validado manualmente contra un cargue real (ficha 3490507, ADSO):
 * comparar el RAP de Juicios contra TODO el catálogo a la vez produce falsos
 * positivos cuando dos competencias distintas usan vocabulario parecido
 * ("derechos", "trabajo", etc.). La solución es emparejar primero la
 * COMPETENCIA y, solo dentro de sus RAPs, buscar el RAP puntual — y aun así,
 * si ninguno alcanza una confianza clara, no forzar el emparejamiento.
 */

const STOPWORDS = new Set([
  'DE', 'LA', 'EL', 'LOS', 'LAS', 'Y', 'A', 'EN', 'DEL', 'CON', 'PARA',
  'SEGUN', 'SU', 'SUS', 'QUE', 'O', 'AL', 'SE', 'UN', 'UNA', 'SOBRE', 'POR'
]);

function normalizarTexto(s: string): string {
  return s
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokensSignificativos(s: string): Set<string> {
  return new Set(
    normalizarTexto(s)
      .split(' ')
      .filter(w => w.length > 1 && !STOPWORDS.has(w))
  );
}

function similitudJaccard(a: string, b: string): number {
  const ta = tokensSignificativos(a);
  const tb = tokensSignificativos(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let comunes = 0;
  ta.forEach(t => { if (tb.has(t)) comunes += 1; });
  const union = new Set([...ta, ...tb]).size;
  return union === 0 ? 0 : comunes / union;
}

/** SofiaPlus antepone el código y a veces un consecutivo: "593147 - 02  ESTABLECER...". */
function quitarPrefijoCodigo(s: string): string {
  return s.replace(/^\s*\d+\s*[-–]\s*(?:\d+\s+)?/, '').trim();
}

export function esEtapaPractica(textoCompetencia: string): boolean {
  return /etapa\s*pr[aá]ctica/i.test(textoCompetencia);
}

const UMBRAL_MINIMO_COMPETENCIA = 0.4;
const UMBRAL_MINIMO_RAP = 0.35;
const MARGEN_MINIMO_RAP = 0.15;

export interface CatalogoCompetenciaRef {
  codigo: string;
  denominacion: string;
}

/**
 * Empareja el texto de competencia de un Juicio contra el catálogo real de
 * competencias de la ficha (viene de Planeación Pedagógica). Devuelve la
 * denominación EXACTA del catálogo (para poder buscar sus RAPs), o null si
 * no hay una coincidencia con confianza suficiente.
 */
export function matchCompetencia(
  textoJuicio: string,
  catalogo: CatalogoCompetenciaRef[]
): { competencia: CatalogoCompetenciaRef | null; esEtapaPractica: boolean } {
  if (esEtapaPractica(textoJuicio)) {
    return { competencia: null, esEtapaPractica: true };
  }

  const limpio = quitarPrefijoCodigo(textoJuicio);
  const normJuicio = normalizarTexto(limpio);

  // 1. Exacto
  const exacto = catalogo.find(c => normalizarTexto(c.denominacion) === normJuicio);
  if (exacto) return { competencia: exacto, esEtapaPractica: false };

  // 2. Difuso, con umbral mínimo
  let mejor: CatalogoCompetenciaRef | null = null;
  let mejorScore = 0;
  catalogo.forEach(c => {
    const score = similitudJaccard(limpio, c.denominacion);
    if (score > mejorScore) {
      mejorScore = score;
      mejor = c;
    }
  });

  if (mejor && mejorScore >= UMBRAL_MINIMO_COMPETENCIA) {
    return { competencia: mejor, esEtapaPractica: false };
  }
  return { competencia: null, esEtapaPractica: false };
}

/**
 * Dentro de una competencia ya emparejada, busca a cuál RAP real del
 * catálogo corresponde el texto (truncado/parafraseado) del Juicio. Exige
 * una confianza clara: exacto siempre se acepta; una coincidencia difusa
 * solo se acepta si supera un puntaje mínimo Y le saca ventaja clara al
 * segundo candidato — si dos o más RAPs de la misma competencia son
 * igualmente parecidos (caso típico cuando la competencia solo trae una
 * línea genérica en el catálogo para varios RAPs oficiales de SofiaPlus),
 * NO se elige uno al azar: se reporta como sin coincidencia y ese juicio se
 * salta sin tocar Seguimiento.
 */
export function matchRapEnCompetencia(
  textoJuicioRap: string,
  candidatos: ResultadoAprendizaje[]
): { rap: ResultadoAprendizaje | null; confianza: number; ambiguo: boolean } {
  if (candidatos.length === 0) return { rap: null, confianza: 0, ambiguo: false };

  const limpio = quitarPrefijoCodigo(textoJuicioRap);
  const normJuicio = normalizarTexto(limpio);

  const puntuados = candidatos
    .map(rap => {
      const exacto = normalizarTexto(rap.denominacion) === normJuicio;
      const score = exacto ? 1 : similitudJaccard(limpio, rap.denominacion);
      return { rap, score };
    })
    .sort((a, b) => b.score - a.score);

  const top = puntuados[0];
  const segundo = puntuados[1];

  if (top.score >= 0.999) {
    return { rap: top.rap, confianza: top.score, ambiguo: false };
  }

  if (top.score >= UMBRAL_MINIMO_RAP) {
    const margen = segundo ? top.score - segundo.score : 1;
    if (margen >= MARGEN_MINIMO_RAP) {
      return { rap: top.rap, confianza: top.score, ambiguo: false };
    }
    return { rap: null, confianza: top.score, ambiguo: true };
  }

  return { rap: null, confianza: top.score, ambiguo: false };
}

/**
 * Punto de entrada único: dado un (competencia, RAP) tal como viene de un
 * Juicio Evaluativo, y el catálogo completo de RAPs de la ficha/programa
 * (desde Planeación Pedagógica), devuelve el RAP real del catálogo al que
 * corresponde, o null si debe saltarse (Etapa Práctica, competencia sin
 * catálogo, o RAP ambiguo/sin confianza suficiente).
 */
export function emparejarJuicioConCatalogo(
  competenciaTextoJuicio: string,
  rapTextoJuicio: string,
  catalogoRapsPrograma: ResultadoAprendizaje[]
): { rap: ResultadoAprendizaje | null; motivo: 'OK' | 'ETAPA_PRACTICA' | 'COMPETENCIA_SIN_MATCH' | 'RAP_SIN_MATCH' | 'RAP_AMBIGUO' } {
  // Catálogo de competencias únicas presentes en los RAPs de la ficha
  const competenciasMap = new Map<string, CatalogoCompetenciaRef>();
  catalogoRapsPrograma.forEach(r => {
    if (r.competenciaDenominacion && !competenciasMap.has(r.competenciaDenominacion)) {
      competenciasMap.set(r.competenciaDenominacion, {
        codigo: r.competenciaCodigo,
        denominacion: r.competenciaDenominacion
      });
    }
  });

  const { competencia, esEtapaPractica: esPractica } = matchCompetencia(
    competenciaTextoJuicio,
    Array.from(competenciasMap.values())
  );

  if (esPractica) return { rap: null, motivo: 'ETAPA_PRACTICA' };
  if (!competencia) return { rap: null, motivo: 'COMPETENCIA_SIN_MATCH' };

  const candidatos = catalogoRapsPrograma.filter(
    r => r.competenciaDenominacion === competencia.denominacion
  );

  const { rap, ambiguo } = matchRapEnCompetencia(rapTextoJuicio, candidatos);
  if (rap) return { rap, motivo: 'OK' };
  return { rap: null, motivo: ambiguo ? 'RAP_AMBIGUO' : 'RAP_SIN_MATCH' };
}
