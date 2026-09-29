import * as XLSX from 'xlsx';
import { Competencia, ActividadSeguimiento, RegistroHorasEjecutadas, TipoCompetencia, RapSeguimiento, TotalesHorasSofia } from '../types';
import { generarUuid } from '../lib/id';

export interface ComparativoCompetenciaItem {
  competenciaCodigo: string;
  competenciaDenominacion: string;
  tipo: TipoCompetencia;
  horasTrabajoDirecto: number;
  horasTrabajoAutonomo: number;
  horasTotalesPlaneadas: number;
  horasEjecutadas: number;
  porcentajeEjecucion: number; // 0 - 100%
  estadoSemaforo: 'OK' | 'ALERTA_PROGRAMAR' | 'AVANZADO';
  instructoresNombres: string[];
  registrosDetalle: RegistroHorasEjecutadas[];
}

export interface ResultadoProcesamientoHorasEjecutadas {
  registros: RegistroHorasEjecutadas[];
  totalHorasEjecutadas: number;
  /** Totales del encabezado del reporte SofiaPlus (horas programadas / ejecutadas / pendientes de la ficha). */
  totalesSofia?: TotalesHorasSofia;
  instructoresCount: number;
  competenciasCount: number;
  fichasReportadas: string[];
  advertencias: string[];
  /**
   * Número de ficha detectado en la metadata del archivo (ej. celda "Código
   * Ficha" del reporte SofiaPlus "Reporte de Instructores por Ficha"), cuando
   * el archivo no trae una columna de ficha repetida por fila. Se usa para
   * validar que el archivo cargado corresponde a la ficha que se quiere
   * actualizar antes de aceptarlo.
   */
  fichaNumeroDetectada?: string;
}

/**
 * Descarga plantilla oficial Excel para el reporte de horas ejecutadas por instructor
 */
export function descargarPlantillaHorasEjecutadasExcel(): void {
  const wsData = [
    ['FORMATO DE REPORTE DE HORAS EJECUTADAS POR INSTRUCTOR Y COMPETENCIA'],
    ['SISTEMA INTEGRADO DE GESTIÓN ACADÉMICA'],
    [],
    [
      'DOCUMENTO_INSTRUCTOR',
      'NOMBRE_INSTRUCTOR',
      'CODIGO_COMPETENCIA',
      'DENOMINACION_COMPETENCIA',
      'NUMERO_FICHA',
      'HORAS_EJECUTADAS',
      'PERIODO_MES',
      'OBSERVACIONES'
    ],
    [
      '77189012',
      'Carlos Ruiz Mendoza',
      '220501092',
      'Establecer los requisitos de la solución de software de acuerdo con estándares y procedimiento técnico',
      '2694123',
      48,
      'Agosto 2026',
      'Ejecución Fase 1 - Análisis de requisitos y diagramación UML'
    ],
    [
      '77189012',
      'Carlos Ruiz Mendoza',
      '220501093',
      'Evaluar requisitos de la solución de software de acuerdo con metodologías y estándares',
      '2694123',
      36,
      'Agosto 2026',
      'Validación de especificaciones de casos de uso'
    ],
    [
      '1065892110',
      'María Elena Gómez',
      '240201500',
      'Promover la interacción idónea consigo mismo, con los demás y con la naturaleza',
      '2694123',
      32,
      'Agosto 2026',
      'Competencia transversal ética y comunicación asertiva'
    ],
    [
      '1065892110',
      'María Elena Gómez',
      '240202501',
      'Interactuar en lengua inglesa de forma oral y escrita',
      '2694123',
      40,
      'Agosto 2026',
      'Bilingüismo técnico orientado a software'
    ]
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws['!cols'] = [
    { wch: 22 }, // Doc
    { wch: 28 }, // Instructor
    { wch: 22 }, // Cod Comp
    { wch: 50 }, // Denom
    { wch: 16 }, // Ficha
    { wch: 18 }, // Horas
    { wch: 18 }, // Periodo
    { wch: 45 }  // Obs
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Horas_Ejecutadas');

  XLSX.writeFile(wb, 'Plantilla_Horas_Ejecutadas_Instructor.xlsx');
}

/**
 * Parsea un archivo Excel o CSV de Horas Ejecutadas por Instructor
 */
export async function parseHorasEjecutadasExcel(file: File): Promise<ResultadoProcesamientoHorasEjecutadas> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('El archivo no contiene hojas de cálculo válidas.');
        }

        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!worksheet) {
          throw new Error('No se pudo acceder al contenido de la hoja de cálculo.');
        }

        const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (!rawRows || rawRows.length < 2) {
          throw new Error('El archivo está vacío o no contiene suficientes registros.');
        }

        // Escanear metadata previa al encabezado por el número de ficha (ej.
        // reporte SofiaPlus "Reporte de Instructores por Ficha", que trae
        // "Código Ficha" como celda suelta arriba, NO como columna repetida
        // por fila). Se usa como respaldo cuando la fila no trae su propia
        // columna de ficha, y para validar que el archivo corresponde a la
        // ficha que se quiere actualizar.
        let fichaNumeroDetectada = '';
        const maxMetaScan = Math.min(rawRows.length, 15);
        for (let i = 0; i < maxMetaScan; i++) {
          const row = rawRows[i] || [];
          for (let c = 0; c < row.length; c++) {
            const cell = String(row[c] || '').trim().toLowerCase();
            if (cell.includes('ficha')) {
              // El valor suele estar en la celda inmediatamente a la derecha
              for (let c2 = c + 1; c2 < row.length; c2++) {
                const val = String(row[c2] || '').trim();
                const soloDigitos = val.replace(/\D/g, '');
                if (soloDigitos.length >= 6) {
                  fichaNumeroDetectada = soloDigitos;
                  break;
                }
              }
            }
            if (fichaNumeroDetectada) break;
          }
          if (fichaNumeroDetectada) break;
        }

        // Totales del encabezado SofiaPlus: "Total de horas programadas /
        // ejecutadas / pendientes". Es el ÚNICO lugar del reporte donde vienen
        // las horas EJECUTADAS; por competencia el archivo solo trae las
        // programadas.
        const totalesSofia: TotalesHorasSofia = { programadas: 0, ejecutadas: 0, pendientes: 0 };
        let hayTotales = false;
        for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
          const row = rawRows[i] || [];
          const etiqueta = String(row[0] || '').trim().toLowerCase();
          const valor = parseFloat(String(row[1] ?? '').replace(',', '.'));
          if (!etiqueta.startsWith('total de horas') || isNaN(valor)) continue;
          hayTotales = true;
          if (etiqueta.includes('programad')) totalesSofia.programadas = valor;
          else if (etiqueta.includes('ejecutad')) totalesSofia.ejecutadas = valor;
          else if (etiqueta.includes('pendiente')) totalesSofia.pendientes = valor;
        }

        // Escanear fila de encabezados
        let headerRowIdx = -1;
        let colFechaFin = -1;
        let colEstadoInst = -1;
        let colDoc = -1;
        let colNombre = -1;
        let colApellido = -1;
        let colCompCodigo = -1;
        let colCompDenom = -1;
        let colFicha = -1;
        let colHoras = -1;
        let colPeriodo = -1;
        let colObs = -1;

        const maxHeaderScan = Math.min(rawRows.length, 25);
        for (let i = 0; i < maxHeaderScan; i++) {
          const row = (rawRows[i] || []).map(cell => String(cell || '').trim().toLowerCase());

          const hasInst = row.some(c => c.includes('instructor') || c.includes('docente') || c.includes('funcionario') || c.includes('documento'));
          const hasComp = row.some(c => c.includes('competencia') || c.includes('norma') || c.includes('código'));
          const hasHoras = row.some(c => c.includes('hora') || c.includes('ejecutad') || c.includes('duraci') || c.includes('tiempo'));

          if ((hasInst && hasHoras) || (hasComp && hasHoras)) {
            headerRowIdx = i;

            // Primera pasada: apellido tiene prioridad sobre la detección
            // genérica de "instructor" (si no, "Apellido Instructor" cae en
            // la misma rama que "Nombre Instructor" y se pierde la columna).
            row.forEach((cell, idx) => {
              if (colApellido === -1 && cell.includes('apellido')) {
                colApellido = idx;
              }
              if (colEstadoInst === -1 && cell.startsWith('estado')) {
                colEstadoInst = idx;
              }
            });

            row.forEach((cell, idx) => {
              if (idx === colApellido || idx === colEstadoInst) return;
              if (colDoc === -1 && (cell.includes('documento') || cell.includes('cédula') || cell.includes('cedula') || cell.includes('dni') || cell.includes('identificacion') || cell.includes('identificación'))) {
                colDoc = idx;
              } else if (colNombre === -1 && (cell.includes('nombre') || cell.includes('instructor') || cell.includes('docente'))) {
                colNombre = idx;
              } else if (colCompCodigo === -1 && ((cell.includes('competencia') && (cell.includes('código') || cell.includes('codigo') || cell.includes('cod'))) || cell.includes('código comp') || cell.includes('codigo comp') || cell.includes('código norma'))) {
                colCompCodigo = idx;
              } else if (colCompDenom === -1 && (cell.includes('denominación') || cell.includes('denominacion') || cell.includes('nombre comp') || (cell.includes('competencia') && !cell.includes('código') && !cell.includes('codigo')))) {
                colCompDenom = idx;
              } else if (colFicha === -1 && (cell.includes('ficha') || cell.includes('cohorte') || cell.includes('grupo'))) {
                colFicha = idx;
              } else if (colHoras === -1 && (cell.includes('ejecutad') || cell.includes('hora') || cell.includes('duración') || cell.includes('duracion'))) {
                colHoras = idx;
              } else if (colFechaFin === -1 && cell.includes('fecha') && cell.includes('fin')) {
                colFechaFin = idx;
              } else if (colPeriodo === -1 && (cell.includes('periodo') || cell.includes('mes') || cell.includes('fecha') || cell.includes('trimestre'))) {
                colPeriodo = idx;
              } else if (colObs === -1 && (cell.includes('obs') || cell.includes('detalle') || cell.includes('nota') || cell.includes('comentario'))) {
                colObs = idx;
              }
            });

            break;
          }
        }

        // Posiciones por defecto si no se detectó encabezado explícito
        if (headerRowIdx === -1) {
          headerRowIdx = 0;
          colDoc = 0;
          colNombre = 1;
          colCompCodigo = 2;
          colCompDenom = 3;
          colFicha = 4;
          colHoras = 5;
          colPeriodo = 6;
          colObs = 7;
        } else {
          if (colCompCodigo === -1 && colCompDenom !== -1) colCompCodigo = colCompDenom;
          if (colNombre === -1 && colDoc !== -1) colNombre = colDoc;
        }

        const registros: RegistroHorasEjecutadas[] = [];
        const advertencias: string[] = [];
        const instructoresSet = new Set<string>();
        const competenciasSet = new Set<string>();
        const fichasSet = new Set<string>();
        let totalHoras = 0;

        for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0) continue;

          const rawDoc = colDoc !== -1 ? String(row[colDoc] || '').trim() : '';
          const rawNombreCol = colNombre !== -1 ? String(row[colNombre] || '').trim() : '';
          const rawApellido = colApellido !== -1 ? String(row[colApellido] || '').trim() : '';
          const rawNombre = [rawNombreCol, rawApellido].filter(Boolean).join(' ').trim();
          const rawComp = colCompCodigo !== -1 ? String(row[colCompCodigo] || '').trim() : '';
          const rawDenom = colCompDenom !== -1 && colCompDenom !== colCompCodigo ? String(row[colCompDenom] || '').trim() : '';
          // Si la fila no trae su propia columna de ficha, se usa la ficha
          // detectada en la metadata del archivo (ver escaneo previo).
          const rawFicha = (colFicha !== -1 ? String(row[colFicha] || '').trim() : '') || fichaNumeroDetectada;
          const rawHoras = colHoras !== -1 ? row[colHoras] : 0;
          const rawPeriodo = colPeriodo !== -1 ? String(row[colPeriodo] || '').trim() : '';
          const rawObs = colObs !== -1 ? String(row[colObs] || '').trim() : '';

          // Saltar filas vacías
          if (!rawComp && !rawNombre && !rawHoras) continue;

          // Extraer horas numéricas
          let horasNum = 0;
          if (typeof rawHoras === 'number') {
            horasNum = rawHoras;
          } else {
            const parsed = parseFloat(String(rawHoras).replace(/[^\d.-]/g, ''));
            horasNum = isNaN(parsed) ? 0 : parsed;
          }

          if (horasNum <= 0) {
            advertencias.push(`Fila ${i + 1}: Horas no numéricas o en cero (${rawHoras}). Se omite.`);
            continue;
          }

          // Normalizar código y denominación de competencia
          let compCod = rawComp;
          let compDenom = rawDenom;

          // Si el código incluye nombre (ej: "220501092 - Establecer requisitos...")
          if (compCod.includes('-') || compCod.includes(':')) {
            const delimiter = compCod.includes('-') ? '-' : ':';
            const parts = compCod.split(delimiter);
            const maybeCod = parts[0].trim().replace(/\D/g, '');
            if (maybeCod.length >= 4) {
              compCod = maybeCod;
              if (!compDenom && parts[1]) compDenom = parts.slice(1).join(delimiter).trim();
            }
          }

          // Si no hay código puro pero hay denominación
          if (!compCod && rawDenom) {
            compCod = rawDenom.slice(0, 30);
          }

          const instructorNom = rawNombre || (rawDoc ? `Doc: ${rawDoc}` : 'Instructor Asignado');

          const rawFechaFin = colFechaFin !== -1 ? String(row[colFechaFin] || '').trim() : '';
          const reg: RegistroHorasEjecutadas = {
            id: generarUuid(),
            instructorNombres: rawNombreCol || undefined,
            instructorApellidos: rawApellido || undefined,
            instructorEstado: colEstadoInst !== -1 ? String(row[colEstadoInst] || '').trim() || undefined : undefined,
            horasProgramadas: horasNum,
            fechaInicio: /\d{1,2}\/\d{1,2}\/\d{4}/.test(rawPeriodo) ? rawPeriodo : undefined,
            fechaFin: rawFechaFin || undefined,
            instructorDocumento: rawDoc,
            instructorNombre: instructorNom,
            competenciaCodigo: compCod,
            competenciaDenominacion: compDenom || `Competencia ${compCod}`,
            fichaNumero: rawFicha,
            horasEjecutadas: horasNum,
            periodo: rawPeriodo || 'Trimestre Actual',
            fechaRegistro: new Date().toISOString(),
            observaciones: rawObs
          };

          registros.push(reg);
          totalHoras += horasNum;
          instructoresSet.add(instructorNom);
          competenciasSet.add(compCod);
          if (rawFicha) fichasSet.add(rawFicha);
        }

        if (registros.length === 0) {
          throw new Error('No se encontraron registros de horas válidos en la plantilla.');
        }

        resolve({
          registros,
          totalHorasEjecutadas: Math.round(totalHoras * 10) / 10,
          totalesSofia: hayTotales ? totalesSofia : undefined,
          instructoresCount: instructoresSet.size,
          competenciasCount: competenciasSet.size,
          fichasReportadas: Array.from(fichasSet),
          advertencias,
          fichaNumeroDetectada: fichaNumeroDetectada || undefined
        });
      } catch (err: any) {
        reject(new Error(err.message || 'Error al procesar el archivo de horas ejecutadas.'));
      }
    };

    reader.onerror = () => reject(new Error('Error de lectura física del archivo.'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Calcula el comparativo detallado entre Planeado vs Ejecutado por Competencia
 * Aplica la regla solicitada:
 * - 70% a 80%: OK (Verde)
 * - Menor a 70%: Alerta Amarilla (Hay que tratar de seguir programándola)
 * - Mayor a 80%: Avanzado / Culminada
 */
export function calcularComparativoCompetencias(
  competencias: Competencia[],
  registrosHoras: RegistroHorasEjecutadas[],
  actividades: ActividadSeguimiento[] = [],
  rapsSeguimiento: RapSeguimiento[] = []
): ComparativoCompetenciaItem[] {
  // Mapa de horas ejecutadas agrupadas por código de competencia
  const horasEjecutadasMap = new Map<string, { totalHoras: number; instructores: Set<string>; registros: RegistroHorasEjecutadas[] }>();

  registrosHoras.forEach(reg => {
    const key = (reg.competenciaCodigo || '').trim().toLowerCase();
    if (!key) return;

    if (!horasEjecutadasMap.has(key)) {
      horasEjecutadasMap.set(key, { totalHoras: 0, instructores: new Set<string>(), registros: [] });
    }
    const item = horasEjecutadasMap.get(key)!;
    item.totalHoras += reg.horasEjecutadas;
    if (reg.instructorNombre) item.instructores.add(reg.instructorNombre);
    item.registros.push(reg);
  });

  // Mapa de actividades de seguimiento (para horas directas e independientes por competencia)
  const actividadesMap = new Map<string, { directas: number; autonomo: number }>();
  actividades.forEach(act => {
    const key = (act.competenciaCodigo || '').trim().toLowerCase();
    if (!actividadesMap.has(key)) {
      actividadesMap.set(key, { directas: 0, autonomo: 0 });
    }
    const item = actividadesMap.get(key)!;
    item.directas += act.horasDirectas || 0;
    item.autonomo += act.horasIndependientes || 0;
  });

  // Mapa de instructores asignados vía Seguimiento por RAP (rapsSeguimiento), para que la
  // fila de la competencia no dependa exclusivamente de que se haya cargado un Excel de
  // horas ejecutadas: si ya hay instructor asignado a algún RAP de la competencia, debe verse
  // reflejado aquí también (antes solo salía de execData.instructores).
  const instructoresPorCompetenciaMap = new Map<string, Set<string>>();
  rapsSeguimiento.forEach(seg => {
    if (!seg.instructorNombre) return;
    const key = (seg.competenciaCodigo || '').trim().toLowerCase();
    if (!key) return;
    if (!instructoresPorCompetenciaMap.has(key)) {
      instructoresPorCompetenciaMap.set(key, new Set<string>());
    }
    instructoresPorCompetenciaMap.get(key)!.add(seg.instructorNombre);
  });

  // Lista consolidada
  const resultado: ComparativoCompetenciaItem[] = [];

  competencias.forEach(comp => {
    const key = (comp.codigo || '').trim().toLowerCase();
    const execData = horasEjecutadasMap.get(key) || { totalHoras: 0, instructores: new Set<string>(), registros: [] };
    const actData = actividadesMap.get(key);
    const instructoresRapsSeg = instructoresPorCompetenciaMap.get(key);

    // Horas de trabajo directo y trabajo autónomo
    let horasDirecto = 0;
    let horasAutonomo = 0;

    if (actData && (actData.directas > 0 || actData.autonomo > 0)) {
      horasDirecto = actData.directas;
      horasAutonomo = actData.autonomo;
    } else if (comp.horasTrabajoDirecto !== undefined && comp.horasTrabajoAutonomo !== undefined) {
      horasDirecto = comp.horasTrabajoDirecto;
      horasAutonomo = comp.horasTrabajoAutonomo;
    } else {
      // Estándar curricular: 80% directo, 20% autónomo sobre horas estimadas
      const totalEstimadas = comp.horasEstimadas || 96;
      horasDirecto = Math.round(totalEstimadas * 0.8);
      horasAutonomo = Math.round(totalEstimadas * 0.2);
    }

    const horasTotalesPlaneadas = horasDirecto + horasAutonomo;
    // IMPORTANTE: nunca usar comp.horasEjecutadas (campo global por
    // programaCodigo, compartido por TODAS las fichas que dictan ese
    // programa) para esta vista. Siempre se deriva de los registros de
    // horas YA FILTRADOS POR FICHA que llegan en registrosHoras — de lo
    // contrario, dos fichas del mismo programa contaminan sus horas
    // ejecutadas entre sí.
    const horasEjecutadas = Math.round(execData.totalHoras * 10) / 10;

    const porcentajeEjecucion = horasTotalesPlaneadas > 0 
      ? Math.round((horasEjecutadas / horasTotalesPlaneadas) * 100) 
      : 0;

    // Regla de semáforo estricta solicitada por el usuario:
    // - Entre 70% y 80% de las horas totales: OK (Verde)
    // - Menos de 70%: Amarillo (Alerta para seguir programándola)
    // - Más de 80%: Avanzado / Culminada (azul) — NO es una alerta para "seguir programando",
    //   es sobre-ejecución/competencia ya cerrada. Antes este caso también caía en
    //   ALERTA_PROGRAMAR, lo cual mostraba el mensaje "Seguir Programando" incluso en
    //   competencias ya al 100%+ de ejecución.
    let estadoSemaforo: 'OK' | 'ALERTA_PROGRAMAR' | 'AVANZADO';
    if (porcentajeEjecucion >= 70 && porcentajeEjecucion <= 80) {
      estadoSemaforo = 'OK';
    } else if (porcentajeEjecucion > 80) {
      estadoSemaforo = 'AVANZADO';
    } else {
      estadoSemaforo = 'ALERTA_PROGRAMAR';
    }

    // Instructores: unión de quienes reportaron horas ejecutadas (Excel) y quienes ya
    // están asignados a algún RAP de la competencia vía Seguimiento (rapsSeguimiento),
    // para que la fila colapsada no diga "Sin reporte de horas" cuando en realidad ya
    // hay instructor(es) asignado(s) en el detalle de RAPs.
    const instructoresSet = new Set<string>(execData.instructores);
    instructoresRapsSeg?.forEach(nombre => instructoresSet.add(nombre));

    resultado.push({
      competenciaCodigo: comp.codigo,
      competenciaDenominacion: comp.denominacion,
      tipo: comp.tipo || 'Técnica',
      horasTrabajoDirecto: horasDirecto,
      horasTrabajoAutonomo: horasAutonomo,
      horasTotalesPlaneadas,
      horasEjecutadas,
      porcentajeEjecucion,
      estadoSemaforo,
      instructoresNombres: Array.from(instructoresSet),
      registrosDetalle: execData.registros
    });
  });

  return resultado;
}
