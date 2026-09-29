import * as XLSX from 'xlsx';
import {
  Competencia,
  ResultadoAprendizaje,
  BloqueHorario,
  ActividadSeguimiento,
  RegistroHorasEjecutadas,
  Ficha,
  ValidacionSobrescrituraPlaneacion,
  ResumenCarguePlaneacion,
  RegistroArchivoSeguimiento
} from '../types';
import { generarUuid } from '../lib/id';

/**
 * Colección inicial limpia (0 competencias y 0 RAPs).
 * El usuario cargará su formato oficial de Planeación Pedagógica (GPFI-F-134).
 */
export const COMPETENCIAS_INICIALES: Competencia[] = [];
export const RESULTADOS_APRENDIZAJE_INICIALES: ResultadoAprendizaje[] = [];

/**
 * Banco referencial demostrativo del SENA (utilizado únicamente si el usuario
 * solicita expresamente la demostración o descarga una plantilla de ejemplo).
 */
const COMPETENCIAS_DEMO: Competencia[] = [
  {
    id: 'comp_adso_1',
    programaCodigo: '228118',
    codigo: '220501092',
    denominacion: 'Establecer los requisitos de la solución de software de acuerdo con los estándares y procedimiento técnico',
    horasEstimadas: 160,
    tipo: 'Técnica',
    faseSugerida: 'Fase 1: Análisis'
  },
  {
    id: 'comp_adso_2',
    programaCodigo: '228118',
    codigo: '220501093',
    denominacion: 'Diseñar la estructura de datos a partir de los requisitos de la solución',
    horasEstimadas: 200,
    tipo: 'Técnica',
    faseSugerida: 'Fase 2: Planeación'
  },
  {
    id: 'comp_adso_3',
    programaCodigo: '228118',
    codigo: '220501096',
    denominacion: 'Desarrollar la solución de software de acuerdo con el diseño y metodologías de desarrollo',
    horasEstimadas: 360,
    tipo: 'Técnica',
    faseSugerida: 'Fase 3: Ejecución'
  },
  {
    id: 'comp_adso_4',
    programaCodigo: '228118',
    codigo: '220501097',
    denominacion: 'Verificar los entregables de desarrollo de software con base en estándares de calidad',
    horasEstimadas: 160,
    tipo: 'Técnica',
    faseSugerida: 'Fase 3: Ejecución'
  },
  {
    id: 'comp_adso_5',
    programaCodigo: '228118',
    codigo: '240202501',
    denominacion: 'Interactuar en lengua inglesa de forma oral y escrita en contextos sociales y laborales',
    horasEstimadas: 180,
    tipo: 'Bilingüismo',
    faseSugerida: 'Fase 2: Planeación'
  },
  {
    id: 'comp_adso_6',
    programaCodigo: '228118',
    codigo: '240201524',
    denominacion: 'Desarrollar procesos de comunicación eficaces y asertivos en contextos productivos',
    horasEstimadas: 48,
    tipo: 'Transversal',
    faseSugerida: 'Fase 1: Análisis'
  }
];

const RESULTADOS_APRENDIZAJE_DEMO: ResultadoAprendizaje[] = [
  {
    id: 'rap_adso_1092_1',
    programaCodigo: '228118',
    competenciaCodigo: '220501092',
    competenciaDenominacion: 'Establecer los requisitos de la solución de software',
    codigoRap: 'RAP 01',
    denominacion: 'Caracterizar los procesos de la organización de acuerdo con el alcance de la solución y metodologías ágiles',
    fase: 'Fase 1: Análisis',
    duracionHoras: 40
  },
  {
    id: 'rap_adso_1092_2',
    programaCodigo: '228118',
    competenciaCodigo: '220501092',
    competenciaDenominacion: 'Establecer los requisitos de la solución de software',
    codigoRap: 'RAP 02',
    denominacion: 'Recolectar información del software a construir utilizando técnicas de elicitación y entrevistas de campo',
    fase: 'Fase 1: Análisis',
    duracionHoras: 40
  },
  {
    id: 'rap_adso_1092_3',
    programaCodigo: '228118',
    competenciaCodigo: '220501092',
    competenciaDenominacion: 'Establecer los requisitos de la solución de software',
    codigoRap: 'RAP 03',
    denominacion: 'Elaborar la especificación de requisitos del software según estándares IEEE 830 y diagramas de casos de uso',
    fase: 'Fase 1: Análisis',
    duracionHoras: 40
  },
  {
    id: 'rap_adso_1092_4',
    programaCodigo: '228118',
    competenciaCodigo: '220501092',
    competenciaDenominacion: 'Establecer los requisitos de la solución de software',
    codigoRap: 'RAP 04',
    denominacion: 'Validar los requisitos del software con los interesados aplicando revisiones técnicas y prototipos de baja fidelidad',
    fase: 'Fase 1: Análisis',
    duracionHoras: 40
  },
  {
    id: 'rap_adso_1093_1',
    programaCodigo: '228118',
    competenciaCodigo: '220501093',
    competenciaDenominacion: 'Diseñar la estructura de datos a partir de los requisitos',
    codigoRap: 'RAP 01',
    denominacion: 'Diseñar el modelo conceptual y lógico de base de datos relacional (MER) y no relacional (NoSQL)',
    fase: 'Fase 2: Planeación',
    duracionHoras: 60
  },
  {
    id: 'rap_adso_1093_2',
    programaCodigo: '228118',
    competenciaCodigo: '220501093',
    competenciaDenominacion: 'Diseñar la estructura de datos a partir de los requisitos',
    codigoRap: 'RAP 02',
    denominacion: 'Definir el diccionario de datos, integridad referencial y restricciones de negocio para la persistencia',
    fase: 'Fase 2: Planeación',
    duracionHoras: 60
  },
  {
    id: 'rap_adso_1096_1',
    programaCodigo: '228118',
    competenciaCodigo: '220501096',
    competenciaDenominacion: 'Desarrollar la solución de software',
    codigoRap: 'RAP 01',
    denominacion: 'Construir la interfaz de usuario web y móvil interactiva aplicando principios UX/UI y estándares de accesibilidad',
    fase: 'Fase 3: Ejecución',
    duracionHoras: 120
  },
  {
    id: 'rap_adso_1096_2',
    programaCodigo: '228118',
    competenciaCodigo: '220501096',
    competenciaDenominacion: 'Desarrollar la solución de software',
    codigoRap: 'RAP 02',
    denominacion: 'Desarrollar servicios web RESTful, endpoints backend y lógica de negocio con frameworks modernos',
    fase: 'Fase 3: Ejecución',
    duracionHoras: 120
  }
];

/**
 * Determina con máxima precisión si un registro corresponde EXCLUSIVAMENTE a la Etapa Práctica / Productiva del SENA.
 * Incluye la frase canónica exacta: "APLICAR EN LA RESOLUCIÓN DE PROBLEMAS REALES DEL SECTOR PRODUCTIVO, LOS CONOCIMIENTOS, HABILIDADES Y DESTREZAS PERTINENTES A LAS COMPETENCIAS DEL PROGRAMA DE FORMACIÓN ASUMIENDO ESTRATEGIAS Y METODOLOGÍAS DE AUTOGESTIÓN"
 */
export function esRegistroEtapaPractica(
  fase: string = '',
  compCodigo: string = '',
  compDenom: string = '',
  rapCodigo: string = '',
  rapDenom: string = ''
): boolean {
  const fLower = (fase || '').toLowerCase().trim();
  const cCod = (compCodigo || '').toLowerCase().trim();
  const cDen = (compDenom || '').toLowerCase().trim();
  const rCod = (rapCodigo || '').toLowerCase().trim();
  const rDen = (rapDenom || '').toLowerCase().trim();

  // 1. Protección estricta: NUNCA descartar Inducción, Inglés, Ética o competencias de la Etapa Lectiva
  if (
    fLower.includes('induccion') || fLower.includes('inducción') ||
    cCod === '240201530' || rCod === '240201530' ||
    cDen.includes('induccion') || cDen.includes('inducción') ||
    rDen.includes('induccion') || rDen.includes('inducción') ||
    cCod === '240202501' || cCod === '240201526' || cCod === '240201500' || cCod === '240201524' ||
    cCod === '220501092' || cCod === '220501093' || cCod === '220501094' || cCod === '220501095' ||
    cCod === '220501096' || cCod === '220501097' || cCod === '220501098' ||
    cDen.includes('ingl') || cDen.includes('biling') ||
    cDen.includes('ética') || cDen.includes('etica') || cDen.includes('cultura de paz') ||
    rDen.includes('ingl') || rDen.includes('biling') ||
    rDen.includes('ética') || rDen.includes('etica')
  ) {
    return false;
  }

  // 2. Código SENA canónico de Etapa Productiva / Práctica (999999999 o rotulado como Etapa Practica)
  if (
    cCod === '999999999' || cCod === '999999' || cCod.startsWith('99999') || rCod.startsWith('99999') ||
    cCod === 'etapa practica' || cCod === 'etapa práctica' || cCod === 'etapa productiva'
  ) {
    return true;
  }

  // 3. Coincidencia explícita de Fase / Etapa Productiva
  if (
    fLower === 'etapa productiva' || 
    fLower === 'etapa practica' || 
    fLower === 'etapa práctica' || 
    fLower === 'fase productiva' ||
    fLower === 'fase practica' ||
    fLower === 'fase práctica'
  ) {
    return true;
  }

  // 4. Coincidencia explícita por denominación exacta de Etapa Productiva SENA
  if (
    cDen === 'etapa practica' ||
    cDen === 'etapa práctica' ||
    cDen === 'etapa productiva' ||
    cDen.includes('etapa productiva') || 
    cDen.includes('etapa practica') || 
    cDen.includes('etapa práctica')
  ) {
    return true;
  }

  // 5. Coincidencia en RAP de etapa productiva (Texto exacto oficial SENA)
  if (
    rDen.includes('etapa productiva') || 
    rDen.includes('etapa practica') || 
    rDen.includes('etapa práctica') ||
    (rDen.includes('resolución de problemas reales del sector productivo') || rDen.includes('resolucion de problemas reales del sector productivo')) ||
    (rDen.includes('destrezas pertinentes a las competencias del programa de formación') || rDen.includes('destrezas pertinentes a las competencias del programa de formacion'))
  ) {
    return true;
  }

  return false;
}

/**
 * Normaliza y formatea los códigos de la planeación:
 * Si el código no es puramente numérico (códigos sintéticos, alfanuméricos o generados),
 * se restringe estrictamente a un MÁXIMO DE 10 CARACTERES.
 */
export function normalizarCodigoPlaneacion(codigo: string, prefijoDefault: string = 'COMP', indice: number = 1): string {
  if (!codigo || !codigo.trim()) {
    const num = String(indice).padStart(2, '0');
    return `${prefijoDefault}-${num}`.substring(0, 10);
  }

  const clean = codigo.trim();
  // Si es puramente numérico (ej. código oficial NCL 220501092), se conserva intacto
  if (/^[0-9]+$/.test(clean)) {
    return clean;
  }

  // Si no es numérico, recortar estrictamente a máximo 10 caracteres
  return clean.substring(0, 10).toUpperCase();
}

/**
 * Normaliza un texto para comparación eliminando acentos, caracteres especiales y espacios múltiples
 */
export function normalizarParaComparacion(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calcula similitud de Levenshtein normalizada entre 0 y 1 para agrupar competencias con >=98% de coincidencia
 */
export function calcularSimilitudNombres(str1: string, str2: string): number {
  const s1 = normalizarParaComparacion(str1);
  const s2 = normalizarParaComparacion(str2);
  
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  
  const len1 = s1.length;
  const len2 = s2.length;
  const maxLen = Math.max(len1, len2);
  if (maxLen === 0) return 1.0;

  let prevRow = new Array(len2 + 1);
  let currRow = new Array(len2 + 1);

  for (let j = 0; j <= len2; j++) {
    prevRow[j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    currRow[0] = i;
    const char1 = s1.charCodeAt(i - 1);
    for (let j = 1; j <= len2; j++) {
      const cost = char1 === s2.charCodeAt(j - 1) ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1,
        currRow[j - 1] + 1,
        prevRow[j - 1] + cost
      );
    }
    for (let j = 0; j <= len2; j++) {
      prevRow[j] = currRow[j];
    }
  }

  const distance = prevRow[len2];
  return 1 - (distance / maxLen);
}

/**
 * Parsea un archivo Excel de Planeación Pedagógica del SENA (Formato GPFI-F-134 o matriz curricular).
 * - Identifica automáticamente hojas con planeación
 * - Detecta encabezados simples o combinados (filas 0 a 35)
 * - Extrae códigos de competencias (incluso si vienen combinados con la denominación)
 * - Extrae RAPs con forward-fill para replicar celdas combinadas de Excel
 * - Excluye automáticamente competencias y resultados de la Etapa Práctica/Productiva (solo Etapa Lectiva)
 * - Calcula horas acumuladas por competencia lectiva
 */
export async function parsePlaneacionPedagogicaExcel(
  file: File,
  programaCodigoTarget: string = '228118'
): Promise<{
  competencias: Competencia[];
  raps: ResultadoAprendizaje[];
  registrosSeguimiento: RegistroArchivoSeguimiento[];
  registrosProcesados: number;
  forwardFillCount: number;
  advertencias: string[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        // Soporte completo para Excel (.xlsx, .xls) y archivos planos delimitados (.csv, .txt) con codificación UTF-8
        const workbook = XLSX.read(data, { type: 'array', codepage: 65001, raw: false });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('El archivo no contiene datos o tablas válidas.');
        }

        const advertencias: string[] = [];
        let forwardFillCount = 0;
        let registrosPracticaOmitidos = 0;

        const competenciasMap = new Map<string, Competencia>();
        const rapsMap = new Map<string, ResultadoAprendizaje>();
        const registrosSeguimiento: RegistroArchivoSeguimiento[] = [];
        let rapCounter = 1;

        // Función auxiliar para descartar filas que sean encabezados o títulos descriptivos
        const esFilaEncabezado = (faseStr: string, compCodStr: string, compDenStr: string, rapCodStr: string, rapDenStr: string): boolean => {
          const cc = compCodStr.toLowerCase().trim();
          const cd = compDenStr.toLowerCase().trim();
          const rc = rapCodStr.toLowerCase().trim();
          const rd = rapDenStr.toLowerCase().trim();
          const f = faseStr.toLowerCase().trim();

          if (
            cc === 'código' || cc === 'codigo' || cc === 'código comp' || cc === 'código de la competencia' || cc === 'codigo de la competencia' || cc === 'código ncl' || cc === 'código norma' || cc === 'cod. comp' ||
            cd === 'denominación' || cd === 'denominacion' || cd === 'denominación de la competencia' || cd === 'denominacion de la competencia' || cd === 'nombre de la competencia' || cd === 'competencia a desarrollar' || cd === 'norma de competencia' ||
            rc === 'código rap' || rc === 'codigo rap' || rc === 'cod. rap' || rc === 'no. rap' || rc === 'número rap' || rc === 'numero rap' || rc === 'código resultado' ||
            rd === 'denominación rap' || rd === 'denominacion rap' || rd === 'resultado de aprendizaje' || rd === 'resultados de aprendizaje' || rd === 'descripción del resultado' ||
            f === 'fase' || f === 'fase del proyecto' || f === 'etapa'
          ) {
            return true;
          }

          return false;
        };

        // Identificar todas las hojas candidatas del libro de Excel (por fases o por matriz general)
        const sheetsToProcess: string[] = [];
        for (const name of workbook.SheetNames) {
          const lower = name.toLowerCase();
          // Omitir portadas o firmas sin datos curriculares
          if (lower.includes('portada') || lower.includes('firma') || lower.includes('control') || lower.includes('historial') || lower.includes('instrucciones')) {
            continue;
          }
          sheetsToProcess.push(name);
        }

        // Si todas se filtraron, usar todas las hojas del libro
        if (sheetsToProcess.length === 0) {
          sheetsToProcess.push(...workbook.SheetNames);
        }

        for (const sheetName of sheetsToProcess) {
          const worksheet = workbook.Sheets[sheetName];
          if (!worksheet) continue;

          const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          if (!rawRows || rawRows.length < 2) continue;

          // Buscar columnas del Archivo de Seguimiento (7 columnas principales requeridas):
          // 1. FASE DE PROYECTO FORMATIVO
          // 2. ACTIVIDAD DE PROYECTO FORMATIVO
          // 3. COMPETENCIA
          // 4. RESULTADOS DE APRENDIZAJE
          // 5. ACTIVIDAD DE APRENDIZAJE
          // 6. HORAS TRABAJO DIRECTO
          // 7. HORAS TRABAJO INDEPENDIENTE
          let headerRowIndex = -1;
          let colFase = -1;
          let colActividadProyecto = -1;
          let colCompetencia = -1;
          let colRap = -1;
          let colActividadAprendizaje = -1;
          let colHorasDirecto = -1;
          let colHorasIndependiente = -1;

          const maxHeaderScan = Math.min(rawRows.length, 35);
          for (let i = 0; i < maxHeaderScan; i++) {
            const row1 = (rawRows[i] || []).map(c => String(c || '').trim().toLowerCase());
            const row2 = (rawRows[i + 1] || []).map(c => String(c || '').trim().toLowerCase());
            const combinedRow = row1.map((cell, idx) => `${cell} ${row2[idx] || ''}`.trim());

            const hasFase = combinedRow.some(c => c.includes('fase'));
            const hasComp = combinedRow.some(c => c.includes('competencia') || c.includes('norma') || c.includes('ncl'));
            const hasRap = combinedRow.some(c => (c.includes('resultado') || c.includes('rap')) && !c.includes('actividad'));

            if (hasComp || hasRap || hasFase) {
              headerRowIndex = i;
              combinedRow.forEach((cell, idx) => {
                if (colFase === -1 && cell.includes('fase')) {
                  colFase = idx;
                } else if (colActividadProyecto === -1 && cell.includes('actividad') && (cell.includes('proyecto') || cell.includes('formativ')) && !cell.includes('aprendizaje')) {
                  colActividadProyecto = idx;
                } else if (colCompetencia === -1 && (cell.includes('competencia') || cell.includes('norma') || cell.includes('ncl'))) {
                  colCompetencia = idx;
                } else if (colRap === -1 && (cell.includes('resultado') || cell.includes('rap')) && !cell.includes('actividad')) {
                  colRap = idx;
                } else if (colActividadAprendizaje === -1 && cell.includes('actividad') && cell.includes('aprendizaje')) {
                  colActividadAprendizaje = idx;
                } else if (colHorasDirecto === -1 && (cell.includes('direct') || cell.includes('presencial'))) {
                  colHorasDirecto = idx;
                } else if (colHorasIndependiente === -1 && (cell.includes('independiente') || cell.includes('autónom') || cell.includes('autonom'))) {
                  colHorasIndependiente = idx;
                }
              });
              break;
            }
          }

          // Fallbacks por defecto al estándar oficial de 7 columnas del Archivo de Seguimiento:
          if (colFase === -1) colFase = 0;
          if (colActividadProyecto === -1) colActividadProyecto = 1;
          if (colCompetencia === -1) colCompetencia = 2;
          if (colRap === -1) colRap = 3;
          if (colActividadAprendizaje === -1) colActividadAprendizaje = 4;
          if (colHorasDirecto === -1) colHorasDirecto = 5;
          if (colHorasIndependiente === -1) colHorasIndependiente = 6;

          // REGLA DEL USUARIO: Tomar todos los datos estrictamente desde la segunda fila (r = 1, i.e., fila 2 del Excel)
          const dataStartRow = headerRowIndex !== -1 ? headerRowIndex + 1 : 1;

          // Variables de arrastre por hoja (Forward-Fill para celdas combinadas)
          let lastFase = (sheetName.toLowerCase().includes('induccion') || sheetName.toLowerCase().includes('inducción'))
            ? 'Inducción'
            : sheetName.toLowerCase().includes('fase') ? sheetName : 'Fase 1: Análisis';
          let lastActividadProyecto = '';
          let lastCompCodigo = '';
          let lastCompDenom = '';
          let lastTipo: 'Técnica' | 'Transversal' | 'Clave' | 'Bilingüismo' = 'Técnica';

          for (let r = dataStartRow; r < rawRows.length; r++) {
            const row = rawRows[r];
            if (!row || row.every(c => String(c || '').trim() === '')) continue;

            const rowTextJoined = row.map(c => String(c || '').trim()).join(' ');
            const lowerJoined = rowTextJoined.toLowerCase();
            if (
              lowerJoined.startsWith('total') ||
              lowerJoined.includes('firma') ||
              lowerJoined.includes('elaboró') ||
              lowerJoined.includes('revisó') ||
              lowerJoined.includes('aprobó')
            ) {
              continue;
            }

            const rawFase = String(row[colFase] || '').trim();
            const rawAp = String(row[colActividadProyecto] || '').trim();
            const rawComp = String(row[colCompetencia] || '').trim();
            const rawRap = String(row[colRap] || '').trim();
            const rawAa = String(row[colActividadAprendizaje] || '').trim();
            const rawHdStr = String(row[colHorasDirecto] || '').trim();
            const rawHiStr = String(row[colHorasIndependiente] || '').trim();

            // Solo descartar encabezados repetidos si NO es la primera fila de datos (fila 2 del Excel)
            if (r > dataStartRow) {
              const cleanCompLower = rawComp.toLowerCase().trim();
              const cleanRapLower = rawRap.toLowerCase().trim();
              const cleanFaseLower = rawFase.toLowerCase().trim();

              const esEncabezado = (
                (cleanCompLower === 'competencia' && (cleanRapLower === 'resultados de aprendizaje' || cleanRapLower === 'resultado de aprendizaje')) ||
                cleanFaseLower === 'fase de proyecto formativo' || cleanFaseLower === 'fase del proyecto'
              );

              if (esEncabezado) {
                continue;
              }
            }

            // Detección especial de Inducción en la fila
            const rowTotalText = (rawFase + ' ' + rawAp + ' ' + rawComp + ' ' + rawRap + ' ' + rawAa + ' ' + sheetName).toLowerCase();
            const esFilaInduccion = rowTotalText.includes('induccion') || rowTotalText.includes('inducción') || rowTotalText.includes('240201530') || (r === dataStartRow && !rawFase && !rawComp);

            // 1. Arrastre de Fase de Proyecto
            if (rawFase) {
              const fLower = rawFase.toLowerCase();
              if (fLower.includes('induccion') || fLower.includes('inducción')) lastFase = 'Inducción';
              else if (fLower.includes('análisis') || fLower.includes('analisis')) lastFase = 'Fase 1: Análisis';
              else if (fLower.includes('planeación') || fLower.includes('planeacion')) lastFase = 'Fase 2: Planeación';
              else if (fLower.includes('ejecución') || fLower.includes('ejecucion')) lastFase = 'Fase 3: Ejecución';
              else if (fLower.includes('evaluación') || fLower.includes('evaluacion')) lastFase = 'Fase 4: Evaluación';
              else lastFase = rawFase;
            } else if (esFilaInduccion) {
              lastFase = 'Inducción';
            }

            // 2. Arrastre de Actividad de Proyecto Formativo
            if (rawAp) {
              lastActividadProyecto = rawAp;
            }

            // Si es Inducción y no se ha inicializado la competencia:
            if (esFilaInduccion && (!lastCompCodigo || lastCompCodigo !== '240201530')) {
              lastCompCodigo = '240201530';
              lastCompDenom = rawComp && rawComp.length > 20 ? rawComp : 'Inducción';
              lastTipo = 'Clave';

              if (!competenciasMap.has(lastCompCodigo)) {
                competenciasMap.set(lastCompCodigo, {
                  id: generarUuid(),
                  programaCodigo: programaCodigoTarget,
                  codigo: lastCompCodigo,
                  denominacion: lastCompDenom,
                  horasEstimadas: 0,
                  horasTrabajoDirecto: 0,
                  horasTrabajoAutonomo: 0,
                  tipo: 'Clave',
                  faseSugerida: 'Inducción'
                });
              }
            }

            // 3. Arrastre, agrupación por coincidencia >= 98% y normalización de Competencia
            if (rawComp) {
              let compCod = '';
              let compDen = rawComp;

              // Identificación precisa de Competencia de Inducción
              if (rawComp.toLowerCase().includes('induccion') || rawComp.toLowerCase().includes('inducción')) {
                compCod = '240201530';
                compDen = rawComp.length > 20 ? rawComp : 'Inducción';
              } else {
                // Extraer código si viene combinado (ej: "220501092 - Establecer...", "220501092: ...", "COMP-01")
                const matchCod = rawComp.match(/^(?:competencia\s*[:–-]?\s*)?([0-9]{6,12})\s*[-:–.]?\s*(.*)$/i);
                if (matchCod) {
                  compCod = matchCod[1];
                  compDen = matchCod[2].trim() || rawComp;
                }
              }

              // REGLA: Cargar tal cual viene en el archivo y agrupar por nombres iguales o coincidencia del 98%
              let compExistente: Competencia | undefined;
              const cleanDen = normalizarParaComparacion(compDen);

              for (const comp of competenciasMap.values()) {
                const cleanCompExistente = normalizarParaComparacion(comp.denominacion);
                const sim = calcularSimilitudNombres(compDen, comp.denominacion);

                if (
                  (compCod && comp.codigo === compCod) ||
                  (cleanDen && cleanCompExistente && cleanDen === cleanCompExistente) ||
                  sim >= 0.98
                ) {
                  compExistente = comp;
                  break;
                }
              }

              if (compExistente) {
                lastCompCodigo = compExistente.codigo;
                lastCompDenom = compExistente.denominacion;
                lastTipo = compExistente.tipo as any;
                // Si la fila actual aportó un código oficial numérico y compExistente no lo tenía, actualizarlo
                if (compCod && !/^[0-9]+$/.test(compExistente.codigo)) {
                  compExistente.codigo = compCod;
                  compExistente.id = generarUuid();
                  lastCompCodigo = compCod;
                }
              } else {
                if (!compCod) {
                  if (compDen.toLowerCase().includes('induccion') || compDen.toLowerCase().includes('inducción')) {
                    compCod = '240201530';
                  } else {
                    compCod = normalizarCodigoPlaneacion('', 'COMP', competenciasMap.size + 1);
                  }
                }

                lastCompCodigo = compCod;
                lastCompDenom = compDen || `Competencia ${compCod}`;
                lastTipo = (categorizarTipoCompetencia(undefined, lastCompDenom, lastCompCodigo) as any);

                competenciasMap.set(lastCompCodigo, {
                  id: generarUuid(),
                  programaCodigo: programaCodigoTarget,
                  codigo: lastCompCodigo,
                  denominacion: lastCompDenom,
                  horasEstimadas: 0,
                  horasTrabajoDirecto: 0,
                  horasTrabajoAutonomo: 0,
                  tipo: lastTipo,
                  faseSugerida: lastFase
                });
              }
            } else if (rawRap) {
              forwardFillCount++;
              // Si no vino competencia explícita en la celda pero estamos en Inducción
              if (!lastCompCodigo && (lastFase.toLowerCase().includes('induccion') || lastFase.toLowerCase().includes('inducción') || rawRap.toLowerCase().includes('induccion') || rawRap.toLowerCase().includes('inducción'))) {
                lastCompCodigo = '240201530';
                lastCompDenom = 'Inducción';
                lastTipo = 'Clave';

                if (!competenciasMap.has(lastCompCodigo)) {
                  competenciasMap.set(lastCompCodigo, {
                    id: generarUuid(),
                    programaCodigo: programaCodigoTarget,
                    codigo: lastCompCodigo,
                    denominacion: lastCompDenom,
                    horasEstimadas: 0,
                    horasTrabajoDirecto: 0,
                    horasTrabajoAutonomo: 0,
                    tipo: 'Clave',
                    faseSugerida: 'Inducción'
                  });
                }
              }
            }

            // Validar errores de datos faltantes por fila (para permitir completar o editar más adelante)
            const filaExcel = r + 1;
            if (!rawComp && !lastCompCodigo && (rawRap || rawHdStr || rawHiStr)) {
              advertencias.push(`Fila ${filaExcel}: Falta la COMPETENCIA para el Resultado de Aprendizaje "${rawRap || 'Sin denominación'}".`);
            }
            if (!rawRap && (rawComp || rawHdStr || rawHiStr)) {
              advertencias.push(`Fila ${filaExcel}: Falta la denominación del RESULTADO DE APRENDIZAJE (RAP).`);
            }
            if (rawRap && !rawHdStr && !rawHiStr) {
              advertencias.push(`Fila ${filaExcel}: Faltan las HORAS (Directas / Independientes) para el RAP "${rawRap}". Puede completarlas editando el RAP en el panel.`);
            }
            if (!rawFase && !lastFase) {
              advertencias.push(`Fila ${filaExcel}: Falta la FASE DE PROYECTO FORMATIVO. Se asignó "Fase 1: Análisis" por defecto.`);
            }

            // Filtrar Etapa Práctica/Productiva (999999999)
            if (esRegistroEtapaPractica(lastFase, lastCompCodigo, lastCompDenom, '', rawRap)) {
              registrosPracticaOmitidos++;
              continue;
            }

            if (!lastCompCodigo && !rawComp) continue;
            if (!lastCompCodigo) lastCompCodigo = normalizarCodigoPlaneacion('', 'COMP', competenciasMap.size + 1);
            if (!lastCompDenom) lastCompDenom = `Competencia ${lastCompCodigo}`;

            // 4. Procesar y TOTALIZAR Resultado de Aprendizaje (RAP)
            if (rawRap || esFilaInduccion) {
              let rapDen = rawRap || (rawComp && rawComp.length > 20 ? rawComp : 'Resultado de Aprendizaje de la Inducción');
              let rapCod = '';

              // Extraer código de RAP si viene presente
              const rapMatch = rapDen.match(/^(?:RAP[- ]?([0-9]{1,3})|([0-9]{1,3}))\s*[-:–.]?\s*(.*)$/i);
              if (rapMatch) {
                const num = rapMatch[1] || rapMatch[2];
                rapCod = `RAP-${num.padStart(2, '0')}`;
                rapDen = rapMatch[3].trim() || rapDen;
              } else if (esFilaInduccion || lastFase === 'Inducción' || lastCompCodigo === '240201530') {
                rapCod = 'RAP-IND';
              }

              // Horas de trabajo directo e independiente de esta fila
              let hd = parseFloat(rawHdStr.replace(/[^0-9.]/g, '')) || 0;
              let hi = parseFloat(rawHiStr.replace(/[^0-9.]/g, '')) || 0;

              if (hd === 0 && hi === 0) {
                // Si la columna de horas vino en un formato global o vacía (default 40h = 32h dir / 8h ind, Inducción 48h)
                const fallbackH = parseFloat((row[5] || row[4] || '').toString().replace(/[^0-9.]/g, '')) || 
                  (esFilaInduccion || lastFase === 'Inducción' || lastCompCodigo === '240201530' ? 48 : 40);
                hd = Math.round(fallbackH * 0.8);
                hi = fallbackH - hd;
              }

              // Clave única del RAP por competencia y denominación para TOTALIZAR horas
              const cleanClave = rapDen.toLowerCase().replace(/[^a-záéíóúüñ0-9]/g, ' ').replace(/\s+/g, ' ').trim();
              const rapKey = `${lastCompCodigo}___${cleanClave}`;

              const detalleActividad = {
                actividadAprendizaje: rawAa || 'Actividad de aprendizaje curricular',
                actividadProyecto: lastActividadProyecto || 'Actividad de proyecto formativo',
                horasDirectas: hd,
                horasIndependientes: hi
              };

              if (rapsMap.has(rapKey)) {
                // REGLA: Las horas ya vienen sumadas por Resultado de Aprendizaje en el archivo.
                // La Actividad de Aprendizaje es meramente informativa.
                // Si el RAP ya cuenta con sus horas totales asignadas, no se acumulan/duplican nuevamente por fila.
                const rapExistente = rapsMap.get(rapKey)!;
                if ((rapExistente.horasTrabajoDirecto === 0 && rapExistente.horasTrabajoAutonomo === 0) && (hd > 0 || hi > 0)) {
                  rapExistente.horasTrabajoDirecto = hd;
                  rapExistente.horasTrabajoAutonomo = hi;
                  rapExistente.duracionHoras = hd + hi;
                } else if (hd > 0 || hi > 0) {
                  rapExistente.horasTrabajoDirecto = Math.max(rapExistente.horasTrabajoDirecto || 0, hd);
                  rapExistente.horasTrabajoAutonomo = Math.max(rapExistente.horasTrabajoAutonomo || 0, hi);
                  rapExistente.duracionHoras = rapExistente.horasTrabajoDirecto + rapExistente.horasTrabajoAutonomo;
                }

                // Actividades de Aprendizaje informativas asociadas al RAP (relación N:M)
                if (rawAa && !rapExistente.actividadesAprendizaje?.includes(rawAa)) {
                  rapExistente.actividadesAprendizaje = rapExistente.actividadesAprendizaje || [];
                  rapExistente.actividadesAprendizaje.push(rawAa);
                }
                if (lastActividadProyecto && !rapExistente.actividadesProyecto?.includes(lastActividadProyecto)) {
                  rapExistente.actividadesProyecto = rapExistente.actividadesProyecto || [];
                  rapExistente.actividadesProyecto.push(lastActividadProyecto);
                }
                rapExistente.detallesActividades = rapExistente.detallesActividades || [];
                rapExistente.detallesActividades.push(detalleActividad);
              } else {
                if (!rapCod) {
                  rapCod = `RAP-${String(rapCounter).padStart(2, '0')}`;
                }
                rapCounter++;

                rapsMap.set(rapKey, {
                  id: generarUuid(),
                  programaCodigo: programaCodigoTarget,
                  competenciaCodigo: lastCompCodigo,
                  competenciaDenominacion: lastCompDenom,
                  codigoRap: rapCod,
                  denominacion: rapDen,
                  fase: lastFase,
                  duracionHoras: hd + hi,
                  horasTrabajoDirecto: hd,
                  horasTrabajoAutonomo: hi,
                  tipo: lastTipo,
                  actividadesAprendizaje: rawAa ? [rawAa] : [],
                  actividadesProyecto: lastActividadProyecto ? [lastActividadProyecto] : [],
                  detallesActividades: [detalleActividad]
                });
              }

              // Guardar registro granular del Archivo de Seguimiento para futuros cruces de información
              const rapActual = rapsMap.get(rapKey);
              const rapCodigoEfectivo = rapActual?.codigoRap || rapCod || `RAP-${String(rapCounter).padStart(2, '0')}`;
              registrosSeguimiento.push({
                id: `seg_${programaCodigoTarget}_${lastCompCodigo}_${rapCodigoEfectivo}_${r + 1}`,
                programaCodigo: programaCodigoTarget,
                fase: lastFase,
                actividadProyecto: lastActividadProyecto,
                competenciaCodigo: lastCompCodigo,
                competenciaDenominacion: lastCompDenom,
                rapCodigo: rapCodigoEfectivo,
                rapDenominacion: rapDen,
                actividadAprendizaje: rawAa,
                horasTrabajoDirecto: hd,
                horasTrabajoIndependiente: hi,
                horasTotales: hd + hi,
                fechaRegistro: new Date().toISOString()
              });
            }
          }
        }

        // Filtro de seguridad: excluir Etapa Práctica y TOTALIZAR horas en cada Competencia
        const competenciasLectivas = Array.from(competenciasMap.values())
          .filter(c => !esRegistroEtapaPractica(c.faseSugerida, c.codigo, c.denominacion, '', ''));

        // Deduplicación estricta de competencias para no duplicar datos
        const competenciasDeduplicadas: Competencia[] = [];
        const codigosVistos = new Set<string>();
        const nombresVistos = new Set<string>();
        const codigoRemap = new Map<string, string>();

        competenciasLectivas.forEach(comp => {
          const normNombre = normalizarParaComparacion(comp.denominacion);
          const compExistente = competenciasDeduplicadas.find(cd => 
            cd.codigo === comp.codigo || 
            (normNombre && normalizarParaComparacion(cd.denominacion) === normNombre) ||
            calcularSimilitudNombres(cd.denominacion, comp.denominacion) >= 0.98
          );

          if (compExistente) {
            codigoRemap.set(comp.codigo, compExistente.codigo);
            if (/^[0-9]+$/.test(comp.codigo) && !/^[0-9]+$/.test(compExistente.codigo)) {
              codigoRemap.set(compExistente.codigo, comp.codigo);
              compExistente.codigo = comp.codigo;
              compExistente.id = generarUuid();
            }
          } else {
            codigosVistos.add(comp.codigo);
            if (normNombre) nombresVistos.add(normNombre);
            competenciasDeduplicadas.push(comp);
          }
        });

        // Reasociar RAPs y registros cuyo código de competencia fue deduplicado
        Array.from(rapsMap.values()).forEach(r => {
          if (codigoRemap.has(r.competenciaCodigo)) {
            r.competenciaCodigo = codigoRemap.get(r.competenciaCodigo)!;
          }
        });
        registrosSeguimiento.forEach(reg => {
          if (codigoRemap.has(reg.competenciaCodigo)) {
            reg.competenciaCodigo = codigoRemap.get(reg.competenciaCodigo)!;
          }
        });

        const codigosLectivos = new Set(competenciasDeduplicadas.map(c => c.codigo));
        const rapsLectivos = Array.from(rapsMap.values())
          .filter(r => 
            !esRegistroEtapaPractica(r.fase, r.competenciaCodigo, r.competenciaDenominacion, r.codigoRap, r.denominacion) &&
            codigosLectivos.has(r.competenciaCodigo)
          );

        const registrosSeguimientoLectivos = registrosSeguimiento.filter(reg =>
          codigosLectivos.has(reg.competenciaCodigo) &&
          !esRegistroEtapaPractica(reg.fase, reg.competenciaCodigo, reg.competenciaDenominacion, reg.rapCodigo, reg.rapDenominacion)
        );

        // TOTALIZACIÓN EN COMPETENCIAS Y CATEGORIZACIÓN CONSISTENTE:
        competenciasDeduplicadas.forEach(comp => {
          comp.tipo = categorizarTipoCompetencia(comp.tipo, comp.denominacion, comp.codigo);
          const rapsDeComp = rapsLectivos.filter(r => r.competenciaCodigo === comp.codigo);
          const sumDirecto = rapsDeComp.reduce((sum, r) => sum + (r.horasTrabajoDirecto || 0), 0);
          const sumAutonomo = rapsDeComp.reduce((sum, r) => sum + (r.horasTrabajoAutonomo || 0), 0);
          comp.horasTrabajoDirecto = sumDirecto;
          comp.horasTrabajoAutonomo = sumAutonomo;
          comp.horasEstimadas = sumDirecto + sumAutonomo;
        });

        rapsLectivos.forEach(rap => {
          const compPadre = competenciasDeduplicadas.find(c => c.codigo === rap.competenciaCodigo);
          if (compPadre) {
            rap.tipo = compPadre.tipo;
          }
        });

        if (registrosPracticaOmitidos > 0) {
          advertencias.push(
            `ℹ Se omitieron ${registrosPracticaOmitidos} registros correspondientes a la Etapa Práctica/Productiva (el sistema gestiona exclusivamente la Etapa Lectiva).`
          );
        }

        if (competenciasDeduplicadas.length === 0 || rapsLectivos.length === 0) {
          const hojasRevisadas = sheetsToProcess.join(', ');
          throw new Error(
            `No se pudieron extraer competencias o resultados de aprendizaje válidos de la Etapa Lectiva en las hojas analizadas: [${hojasRevisadas}]. ` +
            `Verifique que el archivo contenga las columnas: FASE DE PROYECTO FORMATIVO, ACTIVIDAD DE PROYECTO FORMATIVO, COMPETENCIA, RESULTADOS DE APRENDIZAJE, ACTIVIDAD DE APRENDIZAJE, HORAS TRABAJO DIRECTO, HORAS TRABAJO INDEPENDIENTE.`
          );
        }

        resolve({
          competencias: competenciasDeduplicadas,
          raps: rapsLectivos,
          registrosSeguimiento: registrosSeguimientoLectivos,
          registrosProcesados: rapsLectivos.length,
          forwardFillCount,
          advertencias
        });
      } catch (err: any) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('Error al leer el Archivo de Seguimiento.'));
    reader.readAsArrayBuffer(file);
  });
}

export interface DetalleTraduccionNCL {
  codigoOriginal: string;
  denominacionOriginal: string;
  codigoNCL: string;
  denominacionOficial: string;
  porcentajeCoincidencia: number;
  palabrasCoincidentes: string[];
  totalPalabrasOficial: number;
  estado: 'HOMOLOGADO_90_OK' | 'NO_ALCANZA_90' | 'YA_ES_NCL';
  mensaje: string;
}

/**
 * Catálogo base oficial de Normas de Competencia Laboral (NCL) del SENA
 * para contrastar y homologar planeaciones pedagógicas.
 */
export const COMPETENCIAS_BASE_NCL: Competencia[] = [
  // Técnicas ADSO / Desarrollo de Software
  {
    id: 'ncl_220501092',
    programaCodigo: '228118',
    codigo: '220501092',
    denominacion: 'Establecer los requisitos de la solución de software de acuerdo con los estándares y procedimiento técnico',
    horasEstimadas: 160,
    tipo: 'Técnica',
    faseSugerida: 'Fase 1: Análisis'
  },
  {
    id: 'ncl_220501093',
    programaCodigo: '228118',
    codigo: '220501093',
    denominacion: 'Diseñar la estructura de datos a partir de los requisitos de la solución',
    horasEstimadas: 200,
    tipo: 'Técnica',
    faseSugerida: 'Fase 2: Planeación'
  },
  {
    id: 'ncl_220501094',
    programaCodigo: '228118',
    codigo: '220501094',
    denominacion: 'Modelar las funciones del software de acuerdo con las especificaciones de diseño',
    horasEstimadas: 160,
    tipo: 'Técnica',
    faseSugerida: 'Fase 2: Planeación'
  },
  {
    id: 'ncl_220501095',
    programaCodigo: '228118',
    codigo: '220501095',
    denominacion: 'Diseñar la arquitectura de software de acuerdo con el patrón y requerimientos del sistema',
    horasEstimadas: 180,
    tipo: 'Técnica',
    faseSugerida: 'Fase 2: Planeación'
  },
  {
    id: 'ncl_220501096',
    programaCodigo: '228118',
    codigo: '220501096',
    denominacion: 'Desarrollar la solución de software de acuerdo con el diseño y metodologías de desarrollo',
    horasEstimadas: 360,
    tipo: 'Técnica',
    faseSugerida: 'Fase 3: Ejecución'
  },
  {
    id: 'ncl_220501097',
    programaCodigo: '228118',
    codigo: '220501097',
    denominacion: 'Verificar los entregables de desarrollo de software con base en estándares de calidad',
    horasEstimadas: 160,
    tipo: 'Técnica',
    faseSugerida: 'Fase 3: Ejecución'
  },
  {
    id: 'ncl_220501098',
    programaCodigo: '228118',
    codigo: '220501098',
    denominacion: 'Implantar la solución de software de acuerdo con los estándares y requerimientos del cliente',
    horasEstimadas: 140,
    tipo: 'Técnica',
    faseSugerida: 'Fase 4: Evaluación'
  },
  // Competencias Claves Institucionales (Comunes a programas tecnológicos)
  {
    id: 'ncl_240201530',
    programaCodigo: '228118',
    codigo: '240201530',
    denominacion: 'Resultado de Aprendizaje de la Inducción',
    horasEstimadas: 48,
    tipo: 'Clave',
    faseSugerida: 'Fase 1: Análisis'
  },
  {
    id: 'ncl_220201501',
    programaCodigo: '228118',
    codigo: '220201501',
    denominacion: 'Aplicación de conocimientos de las ciencias naturales de acuerdo con situaciones del contexto productivo y social',
    horasEstimadas: 48,
    tipo: 'Clave',
    faseSugerida: 'Fase 2: Planeación'
  },
  {
    id: 'ncl_240201064',
    programaCodigo: '228118',
    codigo: '240201064',
    denominacion: 'Orientar investigación formativa y aplicada de acuerdo con las tendencias y requerimientos del contexto productivo y social',
    horasEstimadas: 48,
    tipo: 'Clave',
    faseSugerida: 'Fase 3: Ejecución'
  },
  {
    id: 'ncl_240201528',
    programaCodigo: '228118',
    codigo: '240201528',
    denominacion: 'Razonar cuantitativamente frente a situaciones susceptibles de ser abordadas de manera matemática en contextos laborales, sociales y personales',
    horasEstimadas: 48,
    tipo: 'Clave',
    faseSugerida: 'Fase 2: Planeación'
  },
  {
    id: 'ncl_240202501',
    programaCodigo: '228118',
    codigo: '240202501',
    denominacion: 'Interactuar en lengua inglesa de forma oral y escrita dentro de contextos sociales y laborales según los criterios establecidos por el marco común europeo de referencia para las lenguas',
    horasEstimadas: 180,
    tipo: 'Bilingüismo',
    faseSugerida: 'Fase 2: Planeación'
  },
  // Competencias Transversales Institucionales SENA (Comunes a todos los programas de formación)
  {
    id: 'ncl_240201524',
    programaCodigo: '228118',
    codigo: '240201524',
    denominacion: 'Desarrollar procesos de comunicación eficaces y efectivos, teniendo en cuenta situaciones de orden social, personal y productivo',
    horasEstimadas: 48,
    tipo: 'Transversal',
    faseSugerida: 'Fase 1: Análisis'
  },
  {
    id: 'ncl_220601501',
    programaCodigo: '228118',
    codigo: '220601501',
    denominacion: 'Aplicar prácticas de protección ambiental, seguridad y salud en el trabajo de acuerdo con las políticas organizacionales y la normatividad',
    horasEstimadas: 48,
    tipo: 'Transversal',
    faseSugerida: 'Fase 2: Planeación'
  },
  {
    id: 'ncl_210201501',
    programaCodigo: '228118',
    codigo: '210201501',
    denominacion: 'Ejercer derechos fundamentales del trabajo en el marco de la constitución política y los convenios internacionales',
    horasEstimadas: 48,
    tipo: 'Transversal',
    faseSugerida: 'Fase 4: Evaluación'
  },
  {
    id: 'ncl_240201526',
    programaCodigo: '228118',
    codigo: '240201526',
    denominacion: 'Interactuar en el contexto productivo y social de acuerdo con principios éticos para la construcción de una cultura de paz',
    horasEstimadas: 48,
    tipo: 'Transversal',
    faseSugerida: 'Fase 1: Análisis'
  },
  {
    id: 'ncl_230101507',
    programaCodigo: '228118',
    codigo: '230101507',
    denominacion: 'Generar hábitos saludables de vida mediante la aplicación de programas de actividad física en los contextos productivos y sociales',
    horasEstimadas: 48,
    tipo: 'Transversal',
    faseSugerida: 'Fase 3: Ejecución'
  },
  {
    id: 'ncl_240201529',
    programaCodigo: '228118',
    codigo: '240201529',
    denominacion: 'Gestionar procesos propios de la cultura emprendedora y empresarial de acuerdo con el perfil personal y los requerimientos de los contextos productivo y social',
    horasEstimadas: 48,
    tipo: 'Transversal',
    faseSugerida: 'Fase 4: Evaluación'
  },
  {
    id: 'ncl_220501046',
    programaCodigo: '228118',
    codigo: '220501046',
    denominacion: 'Utilizar herramientas informáticas de acuerdo con necesidades de manejo de información',
    horasEstimadas: 48,
    tipo: 'Transversal',
    faseSugerida: 'Fase 1: Análisis'
  }
];

/**
 * Normaliza y extrae palabras clave eliminando stopwords en español
 */
export function extraerPalabrasClave(texto: string): string[] {
  const stopwords = new Set([
    'de', 'la', 'el', 'los', 'las', 'en', 'y', 'o', 'a', 'con', 'por', 'para',
    'del', 'al', 'que', 'un', 'una', 'unos', 'unas', 'su', 'sus', 'se', 'lo',
    'les', 'sobre', 'entre', 'sin', 'hasta', 'desde', 'hacia', 'mediante',
    'durante', 'segun', 'según', 'como', 'este', 'esta', 'estos', 'estas',
    'norma', 'competencia', 'acuerdo'
  ]);

  const limpio = (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar tildes
    .replace(/[^a-z0-9\s]/g, ' ');

  return limpio
    .split(/\s+/)
    .filter(w => w.length >= 3 && !stopwords.has(w));
}

/**
 * Compara dos cadenas de texto y calcula el porcentaje de coincidencia de palabras clave.
 */
export function calcularCoincidenciaPalabras(
  textoEntrada: string,
  textoOficial: string
): { porcentaje: number; palabrasCoincidentes: string[]; totalPalabrasOficial: number } {
  const palabrasEntrada = new Set(extraerPalabrasClave(textoEntrada));
  const palabrasOficial = extraerPalabrasClave(textoOficial);

  if (palabrasOficial.length === 0) {
    return { porcentaje: 0, palabrasCoincidentes: [], totalPalabrasOficial: 0 };
  }

  const palabrasOficialUnicas = Array.from(new Set(palabrasOficial));
  const coincidentes = palabrasOficialUnicas.filter(p => palabrasEntrada.has(p));
  const porcentaje = Math.round((coincidentes.length / palabrasOficialUnicas.length) * 100);

  return {
    porcentaje,
    palabrasCoincidentes: coincidentes,
    totalPalabrasOficial: palabrasOficialUnicas.length
  };
}

/**
 * Traduce la planeación pedagógica hacia la Estructura Curricular NCL oficial
 * si una competencia no viene con NCL estricto y tiene >= 90% de las palabras de la estructura oficial.
 */
export function traducirPlaneacionConEstructura(
  competencias: Competencia[],
  raps: ResultadoAprendizaje[],
  estructuraExistente: Competencia[] = [],
  umbralRequerido: number = 90,
  registrosSeguimiento: RegistroArchivoSeguimiento[] = []
): {
  competenciasFinales: Competencia[];
  rapsFinales: ResultadoAprendizaje[];
  registrosSeguimientoFinales: RegistroArchivoSeguimiento[];
  detallesTraduccion: DetalleTraduccionNCL[];
  totalHomologadas: number;
  totalAlertas: number;
} {
  // Filtrar exclusivamente Etapa Lectiva (ignorar Etapa Práctica/Productiva)
  const competenciasLectivas = competencias.filter(c => !esRegistroEtapaPractica(c.faseSugerida, c.codigo, c.denominacion, '', ''));
  const rapsLectivos = raps.filter(r => !esRegistroEtapaPractica(r.fase, r.competenciaCodigo, r.competenciaDenominacion, r.codigoRap, r.denominacion));

  // Pool de competencias oficiales: combina la estructura previa + catálogo base oficial NCL SENA
  const poolOficial: Competencia[] = [...estructuraExistente].filter(c => !esRegistroEtapaPractica(c.faseSugerida, c.codigo, c.denominacion, '', ''));
  COMPETENCIAS_BASE_NCL.forEach(base => {
    if (!poolOficial.some(p => p.codigo === base.codigo) && !esRegistroEtapaPractica(base.faseSugerida, base.codigo, base.denominacion, '', '')) {
      poolOficial.push(base);
    }
  });

  const detallesTraduccion: DetalleTraduccionNCL[] = [];
  let totalHomologadas = 0;
  let totalAlertas = 0;

  const codigoMap = new Map<string, { nuevoCodigo: string; nuevaDenom: string }>();

  const competenciasFinales: Competencia[] = competenciasLectivas.map(comp => {
    const esCodigoNCLValido = /^[0-9]{6,10}$/.test(comp.codigo.trim());

    if (esCodigoNCLValido) {
      detallesTraduccion.push({
        codigoOriginal: comp.codigo,
        denominacionOriginal: comp.denominacion,
        codigoNCL: comp.codigo,
        denominacionOficial: comp.denominacion,
        porcentajeCoincidencia: 100,
        palabrasCoincidentes: extraerPalabrasClave(comp.denominacion),
        totalPalabrasOficial: extraerPalabrasClave(comp.denominacion).length,
        estado: 'YA_ES_NCL',
        mensaje: `Código NCL oficial (${comp.codigo}) reconocido directamente.`
      });
      return comp;
    }

    // Reconocimiento semántico directo para transversales, claves y técnicas de ADSO
    const dLower = comp.denominacion.toLowerCase();
    let compOficialDirecta: Competencia | undefined;

    // Técnicas ADSO
    if (dLower.includes('desarrollar la solución') || dLower.includes('desarrollar la solucion') || dLower.includes('codificar') || dLower.includes('construcción del software') || dLower.includes('construccion del software')) {
      compOficialDirecta = poolOficial.find(o => o.codigo === '220501096');
    } else if (dLower.includes('requisito') || dLower.includes('especificación de software') || dLower.includes('especificacion de software')) {
      compOficialDirecta = poolOficial.find(o => o.codigo === '220501092');
    } else if (dLower.includes('estructura de datos') || dLower.includes('base de datos') || dLower.includes('bases de datos')) {
      compOficialDirecta = poolOficial.find(o => o.codigo === '220501093');
    } else if (dLower.includes('modelar las funciones') || dLower.includes('modelado del software')) {
      compOficialDirecta = poolOficial.find(o => o.codigo === '220501094');
    } else if (dLower.includes('arquitectura de software') || dLower.includes('diseñar la arquitectura') || dLower.includes('disenar la arquitectura')) {
      compOficialDirecta = poolOficial.find(o => o.codigo === '220501095');
    } else if (dLower.includes('verificar los entregables') || dLower.includes('pruebas de software') || dLower.includes('calidad del software')) {
      compOficialDirecta = poolOficial.find(o => o.codigo === '220501097');
    } else if (dLower.includes('implantar la solución') || dLower.includes('implantar la solucion') || dLower.includes('despliegue de software')) {
      compOficialDirecta = poolOficial.find(o => o.codigo === '220501098');
    }
    // Claves y Bilingüismo
    else if (dLower.includes('ingl') || dLower.includes('biling') || dLower.includes('english')) {
      compOficialDirecta = poolOficial.find(o => o.codigo === '240202501');
    } else if (dLower.includes('ética') || dLower.includes('etica') || dLower.includes('cultura de paz')) {
      compOficialDirecta = poolOficial.find(o => o.codigo === '240201526' || o.codigo === '240201500');
    } else if (dLower.includes('comunicaci') || dLower.includes('asertiv')) {
      compOficialDirecta = poolOficial.find(o => o.codigo === '240201524');
    } else if (dLower.includes('ambiental') || dLower.includes('seguridad y salud') || dLower.includes('sst')) {
      compOficialDirecta = poolOficial.find(o => o.codigo === '220601501');
    } else if (dLower.includes('derechos fundamentales') || dLower.includes('derecho laboral')) {
      compOficialDirecta = poolOficial.find(o => o.codigo === '210201501');
    } else if (dLower.includes('actividad física') || dLower.includes('actividad fisica') || dLower.includes('hábitos saludables')) {
      compOficialDirecta = poolOficial.find(o => o.codigo === '230101507');
    } else if (dLower.includes('emprend') || dLower.includes('empresarial')) {
      compOficialDirecta = poolOficial.find(o => o.codigo === '240201529');
    } else if (dLower.includes('herramientas informáticas') || dLower.includes('ofimática')) {
      compOficialDirecta = poolOficial.find(o => o.codigo === '220501046');
    } else if (dLower.includes('matemátic') || dLower.includes('matematic') || dLower.includes('razonar cuantitativ')) {
      compOficialDirecta = poolOficial.find(o => o.codigo === '240201528');
    } else if (dLower.includes('ciencias naturales') || (dLower.includes('física') && !dLower.includes('actividad')) || (dLower.includes('fisica') && !dLower.includes('actividad'))) {
      compOficialDirecta = poolOficial.find(o => o.codigo === '220201501');
    } else if (dLower.includes('investigaci')) {
      compOficialDirecta = poolOficial.find(o => o.codigo === '240201064');
    } else if (dLower.includes('inducci')) {
      compOficialDirecta = poolOficial.find(o => o.codigo === '240201530');
    }

    if (compOficialDirecta) {
      totalHomologadas++;
      codigoMap.set(comp.codigo, {
        nuevoCodigo: compOficialDirecta.codigo,
        nuevaDenom: compOficialDirecta.denominacion
      });

      detallesTraduccion.push({
        codigoOriginal: comp.codigo,
        denominacionOriginal: comp.denominacion,
        codigoNCL: compOficialDirecta.codigo,
        denominacionOficial: compOficialDirecta.denominacion,
        porcentajeCoincidencia: 100,
        palabrasCoincidentes: extraerPalabrasClave(comp.denominacion),
        totalPalabrasOficial: extraerPalabrasClave(compOficialDirecta.denominacion).length,
        estado: 'HOMOLOGADO_90_OK',
        mensaje: `Homologada automáticamente por área temático-institucional a la NCL oficial ${compOficialDirecta.codigo}.`
      });

      return {
        ...comp,
        codigo: compOficialDirecta.codigo,
        denominacion: compOficialDirecta.denominacion,
        tipo: compOficialDirecta.tipo || comp.tipo
      };
    }

    // Si NO es NCL (viene con COMP_1, texto o código no numérico), contrastar léxicamente
    let mejorMatch: {
      oficial: Competencia;
      porcentaje: number;
      coincidentes: string[];
      totalPalabras: number;
    } | null = null;

    for (const oficial of poolOficial) {
      const match = calcularCoincidenciaPalabras(comp.denominacion, oficial.denominacion);
      if (!mejorMatch || match.porcentaje > mejorMatch.porcentaje) {
        mejorMatch = {
          oficial,
          porcentaje: match.porcentaje,
          coincidentes: match.palabrasCoincidentes,
          totalPalabras: match.totalPalabrasOficial
        };
      }
    }

    if (mejorMatch && mejorMatch.porcentaje >= umbralRequerido) {
      // Regla del 90%: ¡Acepta el cargue y traduce a NCL oficial!
      totalHomologadas++;
      codigoMap.set(comp.codigo, {
        nuevoCodigo: mejorMatch.oficial.codigo,
        nuevaDenom: mejorMatch.oficial.denominacion
      });

      detallesTraduccion.push({
        codigoOriginal: comp.codigo,
        denominacionOriginal: comp.denominacion,
        codigoNCL: mejorMatch.oficial.codigo,
        denominacionOficial: mejorMatch.oficial.denominacion,
        porcentajeCoincidencia: mejorMatch.porcentaje,
        palabrasCoincidentes: mejorMatch.coincidentes,
        totalPalabrasOficial: mejorMatch.totalPalabras,
        estado: 'HOMOLOGADO_90_OK',
        mensaje: `¡Coincidencia del ${mejorMatch.porcentaje}% de palabras (≥${umbralRequerido}%)! Traducida automáticamente a la NCL oficial ${mejorMatch.oficial.codigo}.`
      });

      return {
        ...comp,
        codigo: mejorMatch.oficial.codigo,
        denominacion: mejorMatch.oficial.denominacion,
        tipo: mejorMatch.oficial.tipo || comp.tipo
      };
    } else {
      totalAlertas++;
      const porcentajeObtenido = mejorMatch?.porcentaje || 0;
      const sugerencia = mejorMatch?.oficial ? `(Más cercana: NCL ${mejorMatch.oficial.codigo} con ${porcentajeObtenido}%)` : '';

      detallesTraduccion.push({
        codigoOriginal: comp.codigo,
        denominacionOriginal: comp.denominacion,
        codigoNCL: comp.codigo,
        denominacionOficial: comp.denominacion,
        porcentajeCoincidencia: porcentajeObtenido,
        palabrasCoincidentes: mejorMatch?.coincidentes || [],
        totalPalabrasOficial: mejorMatch?.totalPalabras || 0,
        estado: 'NO_ALCANZA_90',
        mensaje: `No está en NCL y solo alcanzó ${porcentajeObtenido}% de coincidencia con la estructura oficial (se requiere ≥ 90%). ${sugerencia}`
      });

      return comp;
    }
  });

  // Re-vincular los RAPs al nuevo código NCL si su competencia padre fue traducida
  const rapsFinales: ResultadoAprendizaje[] = rapsLectivos.map(rap => {
    const mapeo = codigoMap.get(rap.competenciaCodigo);
    if (mapeo) {
      return {
        ...rap,
        competenciaCodigo: mapeo.nuevoCodigo,
        competenciaDenominacion: mapeo.nuevaDenom
      };
    }
    return rap;
  });

  // Re-vincular los registros granulares al nuevo código NCL
  const registrosSeguimientoFinales: RegistroArchivoSeguimiento[] = registrosSeguimiento.map(reg => {
    const mapeo = codigoMap.get(reg.competenciaCodigo);
    if (mapeo) {
      return {
        ...reg,
        competenciaCodigo: mapeo.nuevoCodigo,
        competenciaDenominacion: mapeo.nuevaDenom
      };
    }
    return reg;
  });

  return {
    competenciasFinales,
    rapsFinales,
    registrosSeguimientoFinales,
    detallesTraduccion,
    totalHomologadas,
    totalAlertas
  };
}

/**
 * Clasifica una competencia en 'Técnica', 'Transversal' o 'Clave'
 * según la taxonomía y normatividad curricular del SENA.
 */
export function categorizarTipoCompetencia(
  tipo?: string,
  denominacion?: string,
  codigo?: string
): 'Técnica' | 'Transversal' | 'Clave' {
  const t = (tipo || '').toLowerCase();
  const d = (denominacion || '').toLowerCase();
  const c = (codigo || '').toLowerCase();

  // 1. Las 5 Competencias Claves (Tecnólogos): Inducción, Ciencias Naturales/Física, Investigación, Matemáticas, Bilingüismo/Inglés
  if (
    t.includes('clave') || t.includes('básica') || t.includes('basica') || t.includes('biling') ||
    d.includes('inducción') || d.includes('induccion') || c === '240201530' ||
    d.includes('ciencias naturales') || (d.includes('física') && !d.includes('actividad')) || (d.includes('fisica') && !d.includes('actividad')) || c === '220201501' ||
    d.includes('investigación') || d.includes('investigacion') || c === '240201064' ||
    d.includes('razonar cuantitativamente') || d.includes('matemática') || d.includes('matematica') || c === '240201528' ||
    d.includes('inglés') || d.includes('ingles') || d.includes('lengua inglesa') || d.includes('idioma extranjero') || c === '240202501' || c.startsWith('240202')
  ) {
    return 'Clave';
  }

  // 2. Las 7 Competencias Transversales Institucionales: Comunicación, SST/Ambiental, Derechos del Trabajo, Ética/Paz, Actividad Física, Emprendimiento, TIC
  if (
    t.includes('transversal') ||
    d.includes('comunicación') || d.includes('comunicacion') || c === '240201524' ||
    d.includes('ambiental') || d.includes('seguridad y salud') || d.includes('salud ocupacional') || c === '220601501' ||
    d.includes('derechos fundamentales') || c === '210201501' ||
    d.includes('ética') || d.includes('etica') || d.includes('cultura de paz') || d.includes('interacción idónea') || c === '240201526' ||
    d.includes('actividad física') || d.includes('actividad fisica') || d.includes('hábitos saludables') || d.includes('habitos saludables') || c === '230101507' ||
    d.includes('cultura emprendedora') || d.includes('emprendimiento') || d.includes('empresarial') || c === '240201529' ||
    d.includes('herramientas informáticas') || d.includes('manejo de información') || c === '220501046' ||
    c.startsWith('240201')
  ) {
    return 'Transversal';
  }

  return 'Técnica';
}

/**
 * Valida si se puede sobrescribir una planeación pedagógica existente:
 * Solo se permite la sobrescritura SI NO se ha trabajado con ella
 * (es decir, NO hay horarios programados, NO hay seguimientos avanzados ni horas ejecutadas reportadas).
 */
export function validarSobrescrituraPlaneacion(params: {
  programaCodigo?: string;
  competenciasExistentes: Competencia[];
  rapsExistentes?: ResultadoAprendizaje[];
  horarios?: BloqueHorario[];
  actividadesSeguimiento?: ActividadSeguimiento[];
  registrosHorasEjecutadas?: RegistroHorasEjecutadas[];
  fichas?: Ficha[];
}): ValidacionSobrescrituraPlaneacion {
  const {
    programaCodigo,
    competenciasExistentes = [],
    rapsExistentes = [],
    horarios = [],
    actividadesSeguimiento = [],
    registrosHorasEjecutadas = [],
    fichas = []
  } = params;

  // Filtrar competencias del programa objetivo si se especifica
  const compExistentesProg = programaCodigo
    ? competenciasExistentes.filter(c => !c.programaCodigo || c.programaCodigo === programaCodigo)
    : competenciasExistentes;

  // 1. ¿Hay competencias previas? Si no hay, es una carga limpia inicial (no es sobrescritura)
  if (compExistentesProg.length === 0) {
    return {
      esSobrescritura: false,
      puedeSobrescribir: true,
      bloqueado: false,
      motivosBloqueo: [],
      detallesTrabajoPrevio: {
        totalHorarios: 0,
        totalHorasEjecutadas: 0,
        totalSeguimientos: 0,
        totalFichasConAvance: 0
      },
      mensaje: 'Nueva carga inicial: No existen competencias previas en este programa. Se creará la planeación desde cero.'
    };
  }

  const codigosCompExistentes = new Set(compExistentesProg.map(c => c.codigo.trim().toLowerCase()));

  // 2. Si hay competencias existentes, es una SOBRESCRITURA. Verificar si se ha "trabajado con ella":
  const motivosBloqueo: string[] = [];

  // A. Horarios programados en la malla curricular
  const horariosAsociados = horarios.filter(h => {
    if (codigosCompExistentes.has(h.competenciaCodigo.trim().toLowerCase())) return true;
    if (h.rapsAsignados && h.rapsAsignados.some(r => rapsExistentes.some(re => re.codigoRap === r.codigo))) return true;
    return false;
  });

  // B. Registros de horas ejecutadas por instructor
  const horasAsociadas = registrosHorasEjecutadas.filter(r => 
    r.competenciaCodigo && codigosCompExistentes.has(r.competenciaCodigo.trim().toLowerCase())
  );
  const totalHorasEjecutadas = horasAsociadas.reduce((acc, h) => acc + (h.horasEjecutadas || 0), 0);

  // C. Actividades de seguimiento curricular
  const seguimientosAsociados = actividadesSeguimiento.filter(a => 
    codigosCompExistentes.has(a.competenciaCodigo.trim().toLowerCase())
  );
  const seguimientosConAvance = seguimientosAsociados.filter(a => a.estado !== 'PENDIENTE');

  // D. Fichas con progreso curricular
  const fichasConAvance = fichas.filter(f => 
    (!programaCodigo || f.programaCodigo === programaCodigo) && 
    ((f.horasEjecutadas && f.horasEjecutadas > 0) || (f.rapsEvaluados && f.rapsEvaluados > 0))
  );

  if (horariosAsociados.length > 0) {
    motivosBloqueo.push(
      `Tiene ${horariosAsociados.length} bloque(s) de horarios ya programados en la malla curricular con instructores asignados.`
    );
  }

  if (totalHorasEjecutadas > 0 || horasAsociadas.length > 0) {
    motivosBloqueo.push(
      `Tiene ${horasAsociadas.length} registro(s) de horas ejecutadas acumuladas (${totalHorasEjecutadas} hrs) reportadas por instructores.`
    );
  }

  if (seguimientosConAvance.length > 0) {
    motivosBloqueo.push(
      `Tiene ${seguimientosConAvance.length} actividad(es) de seguimiento curricular en estado "EN EJECUCIÓN" o "CALIFICADO".`
    );
  } else if (seguimientosAsociados.length > 0) {
    motivosBloqueo.push(
      `Tiene ${seguimientosAsociados.length} actividad(es) de seguimiento ya vinculadas a fichas de formación.`
    );
  }

  if (fichasConAvance.length > 0) {
    motivosBloqueo.push(
      `Existen ${fichasConAvance.length} ficha(s) activas con RAPs evaluados o avance curricular registrado.`
    );
  }

  const bloqueado = motivosBloqueo.length > 0;

  return {
    esSobrescritura: true,
    puedeSobrescribir: !bloqueado,
    bloqueado,
    motivosBloqueo,
    detallesTrabajoPrevio: {
      totalHorarios: horariosAsociados.length,
      totalHorasEjecutadas,
      totalSeguimientos: seguimientosAsociados.length,
      totalFichasConAvance: fichasConAvance.length
    },
    mensaje: bloqueado
      ? `Bloqueado para sobrescritura: Ya se ha trabajado previamente con esta planeación (${motivosBloqueo.length} evidencias de trabajo activo). No se puede sobrescribir para proteger la integridad académica.`
      : `Sobrescritura permitida: Se detectó una planeación previa con ${compExistentesProg.length} competencias, pero NO se ha trabajado aún con ella (0 horarios programados, 0 registros de seguimiento y 0 horas ejecutadas). Se puede sobrescribir con total seguridad.`,
    sugerencia: bloqueado
      ? 'Para reemplazarla, primero libere los bloques de horarios programados o vacíe la estructura mediante "Borrar Estructura Actual" si desea empezar desde cero.'
      : undefined
  };
}

/**
 * Calcula el desglose estructurado del cargue de planeación pedagógica:
 * Conteo y listas de competencias y RAPs por categoría (Técnicas, Transversales, Clave)
 * y horas de trabajo directo / autónomo.
 */
export function calcularResumenCarguePlaneacion(
  competencias: Competencia[],
  raps: ResultadoAprendizaje[],
  validacionSobrescritura: ValidacionSobrescrituraPlaneacion
): ResumenCarguePlaneacion {
  const competenciasTecnicas: Competencia[] = [];
  const competenciasTransversales: Competencia[] = [];
  const competenciasClave: Competencia[] = [];

  const codigosTecnicos = new Set<string>();
  const codigosTransversales = new Set<string>();
  const codigosClave = new Set<string>();

  competencias.forEach(comp => {
    const cat = categorizarTipoCompetencia(comp.tipo, comp.denominacion, comp.codigo);
    comp.tipo = cat;
    const compCategorizada: Competencia = { ...comp, tipo: cat };

    if (cat === 'Clave') {
      competenciasClave.push(compCategorizada);
      codigosClave.add(comp.codigo);
    } else if (cat === 'Transversal') {
      competenciasTransversales.push(compCategorizada);
      codigosTransversales.add(comp.codigo);
    } else {
      competenciasTecnicas.push(compCategorizada);
      codigosTecnicos.add(comp.codigo);
    }
  });

  const rapsTecnicos: ResultadoAprendizaje[] = [];
  const rapsTransversales: ResultadoAprendizaje[] = [];
  const rapsClave: ResultadoAprendizaje[] = [];

  raps.forEach(rap => {
    if (codigosClave.has(rap.competenciaCodigo)) {
      rapsClave.push({ ...rap, tipo: 'Clave' });
    } else if (codigosTransversales.has(rap.competenciaCodigo)) {
      rapsTransversales.push({ ...rap, tipo: 'Transversal' });
    } else {
      rapsTecnicos.push({ ...rap, tipo: 'Técnica' });
    }
  });

  // Cálculo de horas de trabajo directo y autónomo
  let horasDirectas = 0;
  let horasAutonomas = 0;
  let horasTotales = 0;

  competencias.forEach(c => {
    const dur = c.horasEstimadas || 0;
    horasTotales += dur;
    if (c.horasTrabajoDirecto !== undefined && c.horasTrabajoAutonomo !== undefined) {
      horasDirectas += c.horasTrabajoDirecto;
      horasAutonomas += c.horasTrabajoAutonomo;
    } else {
      const hd = Math.round(dur * 0.8);
      const ha = dur - hd;
      horasDirectas += hd;
      horasAutonomas += ha;
    }
  });

  return {
    totalCompetencias: competencias.length,
    competenciasTecnicas,
    competenciasTransversales,
    competenciasClave,
    totalRaps: raps.length,
    rapsTecnicos,
    rapsTransversales,
    rapsClave,
    horasTrabajoDirecto: horasDirectas,
    horasTrabajoAutonomo: horasAutonomas,
    horasTotales,
    validacionSobrescritura
  };
}

export interface ResultadoProcesamientoPlaneacion {
  exito: boolean;
  mensaje: string;
  competencias: Competencia[];
  raps: ResultadoAprendizaje[];
  registrosSeguimiento: RegistroArchivoSeguimiento[];
  resumenCargue?: ResumenCarguePlaneacion;
  validacionSobrescritura?: ValidacionSobrescrituraPlaneacion;
  detalles: {
    programaCodigo: string;
    programaNombre?: string;
    fasesDetectadas: string[];
    totalCompetencias: number;
    totalRaps: number;
    horasTotales: number;
    totalRegistrosSeguimiento?: number;
    advertencias: string[];
    traduccionesNCL?: DetalleTraduccionNCL[];
    totalHomologadasNCL?: number;
  };
}

export async function procesarPlaneacionPedagogica(
  file: File,
  programaCodigoTarget: string = '228118',
  estructuraCurricularPrevia: Competencia[] = [],
  contextoValidacion?: {
    rapsExistentes?: ResultadoAprendizaje[];
    horarios?: BloqueHorario[];
    actividadesSeguimiento?: ActividadSeguimiento[];
    registrosHorasEjecutadas?: RegistroHorasEjecutadas[];
    fichas?: Ficha[];
  }
): Promise<ResultadoProcesamientoPlaneacion> {
  try {
    const res = await parsePlaneacionPedagogicaExcel(file, programaCodigoTarget);
    
    // REGLA: Cargar las competencias y RAPs TAL CUAL vienen en el archivo original,
    // preservando sus nombres y códigos reales sin duplicar competencias ni datos.
    const competenciasFinales = res.competencias;
    const rapsFinales = res.raps;
    const registrosSeguimientoFinales = res.registrosSeguimiento;
    const fases = Array.from(new Set(rapsFinales.map(r => r.fase).filter(Boolean)));
    const totalHoras = competenciasFinales.reduce((acc, c) => acc + (c.horasEstimadas || 0), 0);

    const advertenciasFinales = [...res.advertencias];

    // Validar sobrescritura si hay contexto de validación
    const validacion = validarSobrescrituraPlaneacion({
      programaCodigo: programaCodigoTarget,
      competenciasExistentes: estructuraCurricularPrevia,
      rapsExistentes: contextoValidacion?.rapsExistentes || [],
      horarios: contextoValidacion?.horarios || [],
      actividadesSeguimiento: contextoValidacion?.actividadesSeguimiento || [],
      registrosHorasEjecutadas: contextoValidacion?.registrosHorasEjecutadas || [],
      fichas: contextoValidacion?.fichas || []
    });

    const resumenCargue = calcularResumenCarguePlaneacion(competenciasFinales, rapsFinales, validacion);

    return {
      exito: true,
      mensaje: `Procesadas exitosamente ${competenciasFinales.length} competencias y ${rapsFinales.length} RAPs del archivo original sin duplicación de datos.`,
      competencias: competenciasFinales,
      raps: rapsFinales,
      registrosSeguimiento: registrosSeguimientoFinales,
      resumenCargue,
      validacionSobrescritura: validacion,
      detalles: {
        programaCodigo: programaCodigoTarget,
        programaNombre: 'Programa Curricular',
        fasesDetectadas: fases,
        totalCompetencias: competenciasFinales.length,
        totalRaps: rapsFinales.length,
        horasTotales: totalHoras,
        totalRegistrosSeguimiento: registrosSeguimientoFinales.length,
        advertencias: advertenciasFinales
      }
    };
  } catch (err: any) {
    const validacionError: ValidacionSobrescrituraPlaneacion = {
      esSobrescritura: estructuraCurricularPrevia.length > 0,
      puedeSobrescribir: false,
      bloqueado: true,
      motivosBloqueo: [err?.message || 'Error en formato del archivo'],
      detallesTrabajoPrevio: {
        totalHorarios: 0,
        totalHorasEjecutadas: 0,
        totalSeguimientos: 0,
        totalFichasConAvance: 0
      },
      mensaje: err?.message || 'Error al procesar el archivo Excel de planeación pedagógica'
    };

    return {
      exito: false,
      mensaje: err?.message || 'Error al procesar el archivo Excel de planeación pedagógica',
      competencias: [],
      raps: [],
      registrosSeguimiento: [],
      validacionSobrescritura: validacionError,
      detalles: {
        programaCodigo: programaCodigoTarget,
        fasesDetectadas: [],
        totalCompetencias: 0,
        totalRaps: 0,
        horasTotales: 0,
        totalRegistrosSeguimiento: 0,
        advertencias: [err?.message || 'Error desconocido']
      }
    };
  }
}

/**
 * Carga planeación pedagógica demostrativa (únicamente bajo solicitud expresa del usuario)
 */
export function cargarPlaneacionPedagogicaDemo(programaCodigo: string): {
  competencias: Competencia[];
  raps: ResultadoAprendizaje[];
  registrosSeguimiento: RegistroArchivoSeguimiento[];
} {
  const compDemo = COMPETENCIAS_DEMO.map(c => ({ ...c, programaCodigo }));
  const rapsDemo = RESULTADOS_APRENDIZAJE_DEMO.map(r => ({
    ...r,
    programaCodigo,
    detallesActividades: [
      {
        actividadAprendizaje: `AA1: Ejecutar actividades de aprendizaje del ${r.codigoRap}`,
        actividadProyecto: 'AP 01: Especificar requerimientos y arquitectura del sistema',
        horasDirectas: Math.round((r.duracionHoras || 40) * 0.8),
        horasIndependientes: (r.duracionHoras || 40) - Math.round((r.duracionHoras || 40) * 0.8)
      }
    ]
  }));

  const registrosDemo: RegistroArchivoSeguimiento[] = rapsDemo.map((r, idx) => ({
    id: `seg_${programaCodigo}_${r.competenciaCodigo}_${r.codigoRap}_${idx + 1}`,
    programaCodigo,
    fase: r.fase,
    actividadProyecto: 'AP 01: Especificar requerimientos y arquitectura del sistema',
    competenciaCodigo: r.competenciaCodigo,
    competenciaDenominacion: r.competenciaDenominacion || '',
    rapCodigo: r.codigoRap,
    rapDenominacion: r.denominacion,
    actividadAprendizaje: `AA1: Ejecutar actividades de aprendizaje del ${r.codigoRap}`,
    horasTrabajoDirecto: Math.round((r.duracionHoras || 40) * 0.8),
    horasTrabajoIndependiente: (r.duracionHoras || 40) - Math.round((r.duracionHoras || 40) * 0.8),
    horasTotales: r.duracionHoras || 40,
    fechaRegistro: new Date().toISOString()
  }));

  return {
    competencias: compDemo,
    raps: rapsDemo,
    registrosSeguimiento: registrosDemo
  };
}

/**
 * Encabezados oficiales requeridos para el Archivo de Seguimiento
 */
export const HEADERS_ARCHIVO_SEGUIMIENTO = [
  'FASE DE PROYECTO FORMATIVO',
  'ACTIVIDAD DE PROYECTO FORMATIVO',
  'COMPETENCIA',
  'RESULTADOS DE APRENDIZAJE',
  'ACTIVIDAD DE APRENDIZAJE',
  'HORAS TRABAJO DIRECTO',
  'HORAS TRABAJO INDEPENDIENTE'
];

/**
 * Genera y descarga la plantilla oficial de Archivo de Seguimiento SENA en Excel (.xlsx)
 * Jerarquía curricular:
 * - Fase -> (N) Actividades de Proyecto
 * - Actividad de Proyecto -> (N) Competencias
 * - Competencia -> (N) Resultados de Aprendizaje
 * - Resultado de Aprendizaje -> (N) Actividades de Aprendizaje
 * Totalización: La suma de horas directas e independientes por filas totaliza las horas del RAP.
 */
export function descargarPlantillaPlaneacionExcel(
  programaCodigo: string = '228118',
  programaNombre: string = 'Análisis y Desarrollo de Software',
  competencias: Competencia[] = [],
  raps: ResultadoAprendizaje[] = []
) {
  const wsData: any[][] = [
    // Fila 1: Encabezados obligatorios
    [...HEADERS_ARCHIVO_SEGUIMIENTO]
  ];

  if (competencias.length > 0 && raps.length > 0) {
    competencias.forEach(c => {
      const rapsDeComp = raps.filter(r => r.competenciaCodigo === c.codigo);
      if (rapsDeComp.length > 0) {
        rapsDeComp.forEach(r => {
          const actProy = (r.actividadesProyecto && r.actividadesProyecto[0]) || 'AP 01: Determinar las especificaciones del sistema';
          const duracion = r.duracionHoras || 40;
          const hd = r.horasTrabajoDirecto ?? Math.round(duracion * 0.8);
          const hi = r.horasTrabajoAutonomo ?? (duracion - hd);

          if (r.actividadesAprendizaje && r.actividadesAprendizaje.length > 0) {
            r.actividadesAprendizaje.forEach((aa) => {
              // Las horas pertenecen al RAP y ya vienen sumadas por RAP
              wsData.push([
                r.fase || c.faseSugerida || 'Fase 1: Análisis',
                actProy,
                `${c.codigo} - ${c.denominacion}`,
                `${r.codigoRap ? r.codigoRap + ' - ' : ''}${r.denominacion}`,
                aa,
                hd,
                hi
              ]);
            });
          } else {
            wsData.push([
              r.fase || c.faseSugerida || 'Fase 1: Análisis',
              actProy,
              `${c.codigo} - ${c.denominacion}`,
              `${r.codigoRap ? r.codigoRap + ' - ' : ''}${r.denominacion}`,
              'AA1: Diseñar y ejecutar las actividades de aprendizaje del RAP',
              hd,
              hi
            ]);
          }
        });
      } else {
        wsData.push([
          c.faseSugerida || 'Fase 1: Análisis',
          'AP 01: Determinar las especificaciones del sistema',
          `${c.codigo} - ${c.denominacion}`,
          'RAP 01 - Resultado de aprendizaje asociado a la competencia',
          'AA1: Actividad de aprendizaje de la competencia',
          Math.round((c.horasEstimadas || 40) * 0.8),
          Math.round((c.horasEstimadas || 40) * 0.2)
        ]);
      }
    });
  } else {
    // Plantilla modelo oficial:
    // - Las horas vienen ya sumadas por Resultado de Aprendizaje.
    // - La Actividad de Aprendizaje es informativa (un RAP puede tener varias AAs, y una AA varios RAPs).
    wsData.push(
      // Ejemplo 1: Mismo RAP con 2 Actividades de Aprendizaje informativas distintas (Las horas 48h directas / 12h indep pertenecen al RAP)
      [
        'Fase 1: Análisis',
        'AP 01: Determinar las especificaciones de requisitos del software y definir el alcance de la solución',
        '220501092 - Establecer los requisitos de la solución de software de acuerdo con los estándares y procedimiento técnico',
        'RAP 01 - Caracterizar los procesos de la organización de acuerdo con el alcance de la solución y metodologías de desarrollo',
        'AA1: Identificar los procesos organizacionales y necesidades del cliente mediante técnicas de recolección de información',
        48,
        12
      ],
      [
        'Fase 1: Análisis',
        'AP 01: Determinar las especificaciones de requisitos del software y definir el alcance de la solución',
        '220501092 - Establecer los requisitos de la solución de software de acuerdo con los estándares y procedimiento técnico',
        'RAP 01 - Caracterizar los procesos de la organización de acuerdo con el alcance de la solución y metodologías de desarrollo',
        'AA2: Elaborar el mapa de procesos y la matriz de trazabilidad de requerimientos',
        48,
        12
      ],
      // Ejemplo 2: Segundo RAP de la misma competencia técnica
      [
        'Fase 1: Análisis',
        'AP 01: Determinar las especificaciones de requisitos del software y definir el alcance de la solución',
        '220501092 - Establecer los requisitos de la solución de software de acuerdo con los estándares y procedimiento técnico',
        'RAP 02 - Estructurar los artefactos de requisitos de la solución de software aplicando historias de usuario y casos de uso',
        'AA3: Redactar las historias de usuario y criterios de aceptación conforme a estándares ágiles',
        40,
        10
      ],
      // Ejemplo 3: Competencia de Bilingüismo (Inglés) donde 2 RAPs comparten una misma Actividad de Aprendizaje transversal
      [
        'Fase 1: Análisis',
        'AP 01: Determinar las especificaciones de requisitos del software y definir el alcance de la solución',
        '240202501 - Interactuar en lengua inglesa de forma oral y escrita dentro de contextos sociales y laborales según los criterios del MCER',
        'RAP 01 - Comprender información básica oral y escrita en inglés sobre situaciones laborales y personales habituales',
        'AA-INGLES: Participar en intercambios comunicativos y extraer información técnica en inglés',
        38,
        10
      ],
      [
        'Fase 1: Análisis',
        'AP 01: Determinar las especificaciones de requisitos del software y definir el alcance de la solución',
        '240202501 - Interactuar en lengua inglesa de forma oral y escrita dentro de contextos sociales y laborales según los criterios del MCER',
        'RAP 02 - Producir textos sencillos y descripciones técnicas laborales en lengua inglesa',
        'AA-INGLES: Participar en intercambios comunicativos y extraer información técnica en inglés',
        38,
        10
      ],
      // Ejemplo 3: Competencia Clave de Bilingüismo (Inglés) en la misma Actividad de Proyecto
      [
        'Fase 1: Análisis',
        'AP 01: Determinar las especificaciones de requisitos del software y definir el alcance de la solución',
        '240202501 - Interactuar en lengua inglesa de forma oral y escrita dentro de contextos sociales y laborales según los criterios del MCER',
        'RAP 01 - Comprender información básica oral y escrita en inglés sobre situaciones laborales y personales habituales',
        'AA1: Participar en intercambios conversacionales cotidianos y extraer información técnica en inglés',
        38,
        10
      ],
      // Ejemplo 4: Fase 2 - Planeación con nueva AP y competencia de Bases de Datos
      [
        'Fase 2: Planeación',
        'AP 02: Diseñar la estructura de datos y los modelos conceptuales del software',
        '220501093 - Diseñar la estructura de datos a partir de los requisitos de la solución',
        'RAP 01 - Construir el modelo conceptual y lógico de base de datos relacional de acuerdo con los requerimientos',
        'AA1: Diseñar los diagramas entidad relación normalizados en tercera forma normal',
        48,
        12
      ],
      // Ejemplo 5: Competencia de Arquitectura de Software
      [
        'Fase 2: Planeación',
        'AP 03: Elaborar los artefactos de diseño y definir la arquitectura tecnológica del aplicativo',
        '220501095 - Diseñar la arquitectura de software de acuerdo con el patrón y requerimientos del sistema',
        'RAP 01 - Elaborar los diagramas de arquitectura de software aplicando notación UML y patrones de diseño',
        'AA1: Construir las vistas de despliegue, componentes y paquetes del software',
        40,
        10
      ],
      // Ejemplo 6: Fase 3 - Ejecución con desarrollo de software
      [
        'Fase 3: Ejecución',
        'AP 04: Desarrollar los módulos del software y aplicar pruebas unitarias integradas',
        '220501096 - Desarrollar la solución de software de acuerdo con el diseño y metodologías de desarrollo',
        'RAP 01 - Desarrollar componentes frontend y backend del sistema empleando frameworks modernos',
        'AA1: Implementar la capa de servicios REST y controladores de lógica de negocio',
        64,
        16
      ],
      [
        'Fase 3: Ejecución',
        'AP 04: Desarrollar los módulos del software y aplicar pruebas unitarias integradas',
        '220501096 - Desarrollar la solución de software de acuerdo con el diseño y metodologías de desarrollo',
        'RAP 02 - Integrar la persistencia de datos mediante ORM y consultas estructuradas',
        'AA1: Configurar la conexión con la base de datos y programar repositorios de entidades',
        48,
        12
      ],
      // Ejemplo 7: Fase 4 - Evaluación
      [
        'Fase 4: Evaluación',
        'AP 05: Validar y poner en marcha la solución de software en ambiente productivo',
        '220501098 - Implantar la solución de software de acuerdo con los estándares y requerimientos del cliente',
        'RAP 01 - Desplegar la solución de software en servidores de producción y verificar su disponibilidad',
        'AA1: Configurar pipelines de despliegue continuo y realizar pruebas de carga',
        40,
        10
      ]
    );
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws['!cols'] = [
    { wch: 22 }, // FASE DE PROYECTO FORMATIVO
    { wch: 45 }, // ACTIVIDAD DE PROYECTO FORMATIVO
    { wch: 55 }, // COMPETENCIA
    { wch: 55 }, // RESULTADOS DE APRENDIZAJE
    { wch: 50 }, // ACTIVIDAD DE APRENDIZAJE
    { wch: 24 }, // HORAS TRABAJO DIRECTO
    { wch: 26 }  // HORAS TRABAJO INDEPENDIENTE
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Archivo de Seguimiento');
  const safeNombre = programaNombre.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 25);
  XLSX.writeFile(wb, `Archivo_de_Seguimiento_${programaCodigo}_${safeNombre}.xlsx`);
}

/**
 * Alias semántico oficial para la descarga de la plantilla
 */
export const descargarPlantillaArchivoSeguimientoExcel = descargarPlantillaPlaneacionExcel;

/**
 * Infiere una especialidad temática concisa a partir de la denominación y tipo de una competencia
 */
export function inferirEspecialidadTematica(
  denominacion: string, 
  tipo: string = 'Técnica'
): { 
  nombre: string; 
  area: 'Técnica' | 'Transversal' | 'Clave' | 'Básica'; 
  colorTag: string;
  descripcion: string;
} {
  const t = (denominacion || '').toLowerCase();

  // Inducción a la Formación Profesional Integral
  if (t.includes('inducci')) {
    return { 
      nombre: 'Inducción Institucional', 
      area: 'Clave', 
      colorTag: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      descripcion: 'Inducción institucional y contextualización a la formación profesional integral'
    };
  }
  // Bilingüismo / Inglés
  if (t.includes('ingl') || t.includes('english') || t.includes('lengua extranjera') || t.includes('biling')) {
    return { 
      nombre: 'Bilingüismo e Inglés', 
      area: 'Clave', 
      colorTag: 'bg-blue-100 text-blue-800 border-blue-200',
      descripcion: 'Competencias de comunicación en idioma inglés laboral y técnico'
    };
  }
  // Matemáticas / Razonamiento Cuantitativo
  if (t.includes('matem') || t.includes('cuantitativ') || t.includes('cálculo') || t.includes('estadístic')) {
    return { 
      nombre: 'Matemáticas y Lógica', 
      area: 'Clave', 
      colorTag: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      descripcion: 'Razonamiento cuantitativo y lógica matemática aplicada'
    };
  }
  // Física / Ciencias Naturales
  if (t.includes('ciencias naturales') || (t.includes('físic') && !t.includes('actividad')) || (t.includes('fisica') && !t.includes('actividad')) || t.includes('laboratorio')) {
    return { 
      nombre: 'Ciencias Naturales y Física', 
      area: 'Clave', 
      colorTag: 'bg-purple-100 text-purple-800 border-purple-200',
      descripcion: 'Aplicación de principios de ciencias naturales y física al contexto productivo'
    };
  }
  // Investigación Formativa / Metodología
  if (t.includes('investiga') || t.includes('formativ') || t.includes('metodolog')) {
    return { 
      nombre: 'Investigación Formativa', 
      area: 'Clave', 
      colorTag: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      descripcion: 'Metodologías de investigación formativa y resolución de problemas aplicados'
    };
  }
  // Ética / Cultura de Paz / Ciudadanía
  if (t.includes('ética') || t.includes('paz') || t.includes('ciudadan') || t.includes('derecho') || t.includes('valores') || t.includes('enrique low')) {
    return { 
      nombre: 'Ética y Convivencia', 
      area: 'Transversal', 
      colorTag: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      descripcion: 'Interacción ética, cultura de paz y derechos fundamentales del trabajo'
    };
  }
  // Comunicación / Asertividad
  if (t.includes('comunicaci') || t.includes('asertiv') || t.includes('oral') || t.includes('escrit')) {
    return { 
      nombre: 'Comunicación Asertiva', 
      area: 'Transversal', 
      colorTag: 'bg-amber-100 text-amber-800 border-amber-200',
      descripcion: 'Procesos de comunicación oral y escrita eficaz en contextos organizacionales'
    };
  }
  // SST / Medio Ambiente / Salud Ocupacional
  if (t.includes('ambiental') || t.includes('sst') || t.includes('seguridad y salud') || t.includes('recursos naturales') || t.includes('ecolog')) {
    return { 
      nombre: 'SST y Medio Ambiente', 
      area: 'Transversal', 
      colorTag: 'bg-teal-100 text-teal-800 border-teal-200',
      descripcion: 'Seguridad y salud en el trabajo, buenas prácticas ambientales y eco-eficiencia'
    };
  }
  // Emprendimiento / Modelo de Negocio
  if (t.includes('emprend') || t.includes('negocio') || t.includes('innovac') || t.includes('empresarial')) {
    return { 
      nombre: 'Emprendimiento', 
      area: 'Transversal', 
      colorTag: 'bg-orange-100 text-orange-800 border-orange-200',
      descripcion: 'Cultura emprendedora, formulación de modelos de negocio e innovación'
    };
  }
  // Actividad Física y Hábitos Saludables
  if (t.includes('físic') && (t.includes('hábitos') || t.includes('salud') || t.includes('deport') || t.includes('motricidad') || t.includes('acondicionamiento'))) {
    return { 
      nombre: 'Actividad Física y Salud', 
      area: 'Transversal', 
      colorTag: 'bg-lime-100 text-lime-800 border-lime-200',
      descripcion: 'Hábitos de vida saludable, acondicionamiento y cultura física'
    };
  }
  // Investigación / Metodología
  if (t.includes('investiga') || t.includes('formativ') || t.includes('metodolog')) {
    return { 
      nombre: 'Investigación Formativa', 
      area: 'Transversal', 
      colorTag: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      descripcion: 'Metodologías de investigación formativa y resolución de problemas técnicos'
    };
  }
  // Herramientas TIC / Informática Básica
  if (t.includes('herramientas informáticas') || t.includes('ofimática') || t.includes('tecnologías tic')) {
    return { 
      nombre: 'Herramientas TIC', 
      area: 'Transversal', 
      colorTag: 'bg-sky-100 text-sky-800 border-sky-200',
      descripcion: 'Manejo de herramientas ofimáticas, aplicaciones cloud y servicios TIC básicos'
    };
  }
  // Bases de Datos
  if (t.includes('datos') || t.includes('bd') || t.includes('sql') || t.includes('modelo relacional') || t.includes('estructura de datos')) {
    return { 
      nombre: 'Bases de Datos', 
      area: 'Técnica', 
      colorTag: 'bg-violet-100 text-violet-800 border-violet-200',
      descripcion: 'Modelamiento, diseño e implementación de bases de datos SQL y NoSQL'
    };
  }
  // Requisitos / Análisis de Software
  if (t.includes('requisito') || t.includes('análisis') || t.includes('especificaci') || t.includes('propuesta técnica')) {
    return { 
      nombre: 'Análisis y Requisitos', 
      area: 'Técnica', 
      colorTag: 'bg-rose-100 text-rose-800 border-rose-200',
      descripcion: 'Ingeniería de requisitos, levantamiento de especificaciones y modelos de negocio'
    };
  }
  // Diseño de Software / UI/UX / Arquitectura
  if (t.includes('diseñ') || t.includes('interfaz') || t.includes('arquitectura') || t.includes('prototipo') || t.includes('ux') || t.includes('ui')) {
    return { 
      nombre: 'Diseño y Arquitectura', 
      area: 'Técnica', 
      colorTag: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
      descripcion: 'Diseño de interfaces, experiencia de usuario (UX/UI) y arquitectura de software'
    };
  }
  // Calidad y Testing / QA
  if (t.includes('prueb') || t.includes('calidad') || t.includes('verific') || t.includes('testing') || t.includes('qa')) {
    return { 
      nombre: 'Calidad y Pruebas (QA)', 
      area: 'Técnica', 
      colorTag: 'bg-pink-100 text-pink-800 border-pink-200',
      descripcion: 'Pruebas de software unitarias, integración, control de calidad y validación'
    };
  }
  // Despliegue / Cloud / Servidores / DevOps
  if (t.includes('desplieg') || t.includes('servidor') || t.includes('cloud') || t.includes('devops') || t.includes('implantac')) {
    return { 
      nombre: 'Despliegue y Cloud', 
      area: 'Técnica', 
      colorTag: 'bg-blue-100 text-blue-900 border-blue-300',
      descripcion: 'Configuración de servidores, pipelines CI/CD y despliegue en la nube'
    };
  }
  // Desarrollo / Programación de Software (General)
  if (t.includes('program') || t.includes('desarroll') || t.includes('software') || t.includes('código') || t.includes('algoritm') || t.includes('constru')) {
    return { 
      nombre: 'Programación de Software', 
      area: 'Técnica', 
      colorTag: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      descripcion: 'Desarrollo de lógica algorítmica, backend, frontend y codificación de software'
    };
  }

  // Fallback
  return { 
    nombre: tipo === 'Transversal' ? 'Formación Transversal' : tipo === 'Clave' ? 'Competencias Clave' : 'Especialidad Técnica', 
    area: (tipo as any) || 'Técnica', 
    colorTag: 'bg-slate-100 text-slate-800 border-slate-200',
    descripcion: 'Área temática del diseño curricular'
  };
}

/**
 * Genera el catálogo consolidado de especialidades temáticas a partir de una lista de competencias
 */
export function generarEspecialidadesDesdeCompetencias(
  competencias: Competencia[],
  especialidadesExistentes: any[] = []
): any[] {
  const mapa = new Map<string, any>();

  // Conservar especialidades existentes previas
  for (const esp of especialidadesExistentes) {
    mapa.set(esp.nombre.toLowerCase().trim(), { ...esp });
  }

  for (const comp of competencias) {
    if (esRegistroEtapaPractica(comp.faseSugerida, comp.codigo, comp.denominacion, '', '')) {
      continue;
    }
    const inf = inferirEspecialidadTematica(comp.denominacion, comp.tipo);
    const key = inf.nombre.toLowerCase().trim();

    if (mapa.has(key)) {
      const existing = mapa.get(key);
      if (!existing.competenciasAsociadasCodigos.includes(comp.codigo)) {
        existing.competenciasAsociadasCodigos.push(comp.codigo);
      }
    } else {
      mapa.set(key, {
        id: `esp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        nombre: inf.nombre,
        area: inf.area,
        colorTag: inf.colorTag,
        descripcion: inf.descripcion,
        competenciasAsociadasCodigos: [comp.codigo],
        origen: 'AUTOMATICO_PLANEACION',
        estado: 'ACTIVA'
      });
    }
  }

  return Array.from(mapa.values());
}
