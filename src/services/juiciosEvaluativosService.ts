import * as XLSX from 'xlsx';
import { 
  ReporteJuiciosFicha, 
  AprendizJuicio, 
  JuicioDetalle, 
  MetadataReporteJuicios 
} from '../types';

export interface ResultadoProcesamientoJuicios {
  exito: boolean;
  mensaje: string;
  reporte?: ReporteJuiciosFicha;
  detalles: {
    fichaNumero: string;
    programaCodigo: string;
    programaNombre: string;
    totalAprendices: number;
    aprendicesActivos: number;
    aprendicesRetiroVoluntario: number;
    aprendicesCancelados: number;
    aprendicesAplazados?: number;
    aprendicesCondicionados?: number;
    aprendicesTrasladados?: number;
    tasaRetencion: number;
    tasaDesercion: number;
    totalRegistrosJuicios: number;
    juiciosAprobados: number;
    juiciosPorEvaluar: number;
    porcentajeAprobacion: number;
    competenciasCount: number;
    advertencias: string[];
  };
}

/**
 * Limpia y normaliza texto con problemas de encoding comunes de SofiaPlus (ISO-8859-1 / Windows-1252)
 */
function limpiarTextoEncoding(texto: string): string {
  if (!texto) return '';
  return texto
    .replace(/\uFFFD/g, 'o')
    .replace(/Evaluaci[oó]n/gi, 'Evaluación')
    .replace(/Caracterizaci[oó]n/gi, 'Caracterización')
    .replace(/C[oó]gigo|C[oó]digo/gi, 'Código')
    .replace(/Versi[oó]n/gi, 'Versión')
    .replace(/Denominaci[oó]n/gi, 'Denominación')
    .replace(/Formaci[oó]n/gi, 'Formación')
    .replace(/Resoluci[oó]n/gi, 'Resolución')
    .replace(/Gesti[oó]n/gi, 'Gestión')
    .replace(/Metodolog[ií]as/gi, 'Metodologías')
    .replace(/Autogesti[oó]n/gi, 'Autogestión')
    .replace(/N[uú]mero/gi, 'Número')
    .replace(/Inform[aá]tica/gi, 'Informática')
    .replace(/Com[uú]n/gi, 'Común')
    .replace(/Pr[aá]ctica/gi, 'Práctica')
    .replace(/Inducci[oó]n/gi, 'Inducción')
    .replace(/Din[aá]mica/gi, 'Dinámica')
    .replace(/Tecnolog[ií]as/gi, 'Tecnologías')
    .replace(/Comunicaci[oó]n/gi, 'Comunicación')
    .replace(/Informaci[oó]n/gi, 'Información')
    .replace(/Ocupaci[oó]n/gi, 'Ocupación')
    .replace(/Formulaci[oó]n/gi, 'Formulación')
    .replace(/Desempe[nñ]o/gi, 'Desempeño')
    .replace(/Protecci[oó]n/gi, 'Protección')
    .replace(/Pol[ií]ticas/gi, 'Políticas')
    .replace(/Prevenci[oó]n/gi, 'Prevención')
    .replace(/Acompa[nñ]amiento/gi, 'Acompañamiento')
    .replace(/F[ií]sica/gi, 'Física')
    .replace(/Condici[oó]n/gi, 'Condición')
    .replace(/Nutrici[oó]n/gi, 'Nutrición')
    .replace(/Ergonom[ií]a/gi, 'Ergonomía')
    .replace(/Funci[oó]n/gi, 'Función')
    .replace(/Soluci[oó]n/gi, 'Solución')
    .replace(/Tecnol[oó]gicas/gi, 'Tecnológicas')
    .replace(/L[oó]gica/gi, 'Lógica')
    .replace(/Investigaci[oó]n/gi, 'Investigación')
    .replace(/Implantaci[oó]n/gi, 'Implantación')
    .replace(/Operaci[oó]n/gi, 'Operación')
    .replace(/Dise[nñ]o/gi, 'Diseño')
    .replace(/Gr[aá]fica/gi, 'Gráfica')
    .replace(/Metodolog[ií]a/gi, 'Metodología')
    .replace(/Constituci[oó]n/gi, 'Constitución')
    .replace(/Pol[ií]tica/gi, 'Política')
    .replace(/Ciudadan[ií]a/gi, 'Ciudadanía')
    .replace(/Matem[aá]ticas|Matem[aá]tica/gi, 'Matemática')
    .trim();
}

/**
 * Convierte un número serial de fecha de Excel a "dd/mm/aaaa hh:mm".
 */
function serialExcelAFecha(serial: number): string {
  const ms = Math.round((serial - 25569) * 86400 * 1000); // 25569 = días entre 1899-12-30 y 1970-01-01
  const d = new Date(ms);
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${dos(d.getUTCDate())}/${dos(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${dos(d.getUTCHours())}:${dos(d.getUTCMinutes())}`;
}

/**
 * Normaliza un encabezado/etiqueta para compararlo sin depender de tildes
 * ni de los caracteres dañados que deja el encoding de SofiaPlus.
 */
function normalizarEncabezado(texto: string): string {
  return (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\uFFFD/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Lee un archivo File de navegador o string y procesa el reporte de SofiaPlus
 */
export async function procesarJuiciosEvaluativosExcel(
  archivo: File | string,
  nombreArchivo: string = 'Reporte_Juicios_Evaluacion.xls'
): Promise<ResultadoProcesamientoJuicios> {
  const advertencias: string[] = [];

  const fallo = (mensaje: string, extra: Partial<ResultadoProcesamientoJuicios['detalles']> = {}, avisos: string[] = []): ResultadoProcesamientoJuicios => ({
    exito: false,
    mensaje,
    detalles: {
      fichaNumero: '',
      programaCodigo: '',
      programaNombre: '',
      totalAprendices: 0,
      aprendicesActivos: 0,
      aprendicesRetiroVoluntario: 0,
      aprendicesCancelados: 0,
      tasaRetencion: 0,
      tasaDesercion: 0,
      totalRegistrosJuicios: 0,
      juiciosAprobados: 0,
      juiciosPorEvaluar: 0,
      porcentajeAprobacion: 0,
      competenciasCount: 0,
      advertencias: avisos.length > 0 ? avisos : [mensaje],
      ...extra
    }
  });

  try {
    // Todo el archivo se lleva a una matriz filas × celdas. Antes, un .xls
    // binario se convertía a texto CSV y se partía por saltos de línea — pero
    // las celdas de SofiaPlus (competencias, RAPs) traen saltos de línea
    // DENTRO del texto, así que una sola fila se partía en varias y las
    // columnas quedaban corridas: el "documento" terminaba siendo un pedazo
    // de texto distinto en cada línea (miles de "aprendices" falsos).
    let filas: string[][] = [];
    const textoAFilas = (t: string) => t.split(/\r?\n/).map(l => l.split(';').map(c => c.trim()));

    if (typeof archivo === 'string') {
      filas = textoAFilas(archivo);
    } else {
      // Puede ser un .xls binario o un texto delimitado por punto y coma con extensión .xls
      const arrayBuffer = await archivo.arrayBuffer();
      // Un .xls binario (firma D0 CF 11 E0) o un .xlsx (firma PK) SIEMPRE se
      // abre con SheetJS. Antes se intentaba primero como texto, y como el
      // binario de Excel guarda los textos en claro ("Reporte de Juicios..."),
      // se confundía con un CSV: las filas salían revueltas, la ficha se
      // tomaba del código del programa (228118) y los aprendices se
      // multiplicaban por miles.
      const bytes = new Uint8Array(arrayBuffer.slice(0, 4));
      const esBinarioExcel =
        (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) ||
        (bytes[0] === 0x50 && bytes[1] === 0x4b);
      const textoUtf8 = esBinarioExcel ? '' : new TextDecoder('utf-8').decode(arrayBuffer);
      const esTextoSofia = (t: string) => t.includes('Reporte de Juicios') || t.includes('Juicio de Evaluaci') || t.includes('Tipo de Documento;');

      if (esBinarioExcel) {
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const matriz = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, raw: false, defval: '' });
        filas = matriz.map(fila =>
          (Array.isArray(fila) ? fila : []).map(c => String(c ?? '').replace(/\s*[\r\n]+\s*/g, ' ').trim())
        );
      } else if (esTextoSofia(textoUtf8)) {
        filas = textoAFilas(textoUtf8);
      } else {
        const textoLatin = new TextDecoder('iso-8859-1').decode(arrayBuffer);
        if (esTextoSofia(textoLatin)) {
          filas = textoAFilas(textoLatin);
        } else {
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const matriz = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, raw: false, defval: '' });
          filas = matriz.map(fila =>
            (Array.isArray(fila) ? fila : []).map(c => String(c ?? '').replace(/\s*[\r\n]+\s*/g, ' ').trim())
          );
        }
      }
    }

    if (filas.filter(f => f.some(c => c !== '')).length < 5) {
      return fallo('El archivo está vacío o no contiene suficientes líneas de reporte de SofiaPlus.', {}, ['El archivo no tiene el formato esperado.']);
    }

    // 1. Extraer Metadata de la cabecera
    const metadata: MetadataReporteJuicios = {
      fechaReporte: new Date().toLocaleDateString('es-CO'),
      fichaNumero: '',
      programaCodigo: '',
      version: '1',
      programaDenominacion: '',
      estadoFicha: 'EN EJECUCION',
      fechaInicio: '',
      fechaFin: '',
      modalidad: 'PRESENCIAL',
      regional: 'REGIONAL',
      centroFormacion: 'CENTRO DE FORMACIÓN'
    };

    const esFilaEncabezadoTabla = (partes: string[]) => {
      const n = partes.map(normalizarEncabezado);
      return n.some(p => p.includes('doc')) &&
        n.some(p => p.includes('juicio')) &&
        n.some(p => p.includes('competencia') || p.includes('resultado'));
    };

    let tableHeaderIndex = -1;

    for (let i = 0; i < Math.min(filas.length, 60); i++) {
      const partes = filas[i];
      if (esFilaEncabezadoTabla(partes)) {
        tableHeaderIndex = i;
        break;
      }

      // La etiqueta es la primera celda con texto (no siempre la columna A).
      const idxEtiqueta = partes.findIndex(p => p !== '');
      if (idxEtiqueta === -1) continue;
      const etiqueta = normalizarEncabezado(partes[idxEtiqueta]);
      const despues = partes.slice(idxEtiqueta + 1).filter(p => p !== '');
      const valor = (min = 1) => despues.find(p => p.length >= min) || '';
      const textoFila = normalizarEncabezado(partes.join(' '));

      if (!metadata.fichaNumero && textoFila.includes('ficha')) {
        // Sirve para "Ficha de Caracterización: | 3387711" (valor en otra
        // celda) y para "Ficha de Caracterización: 3387711" (todo en una).
        const m = textoFila.match(/ficha[^0-9]{0,80}?(\d{6,9})/);
        if (m) metadata.fichaNumero = m[1];
        continue;
      }

      if (etiqueta.includes('fecha del reporte')) {
        metadata.fechaReporte = valor(4) || metadata.fechaReporte;
      } else if (etiqueta.includes('codigo') || etiqueta.includes('cogigo') || etiqueta.includes('cdigo') || etiqueta.includes('cgigo')) {
        metadata.programaCodigo = despues.find(p => /\d{5,8}/.test(p)) || valor() || '';
      } else if (etiqueta.includes('version')) {
        metadata.version = valor() || '1';
      } else if (etiqueta.includes('denominaci')) {
        metadata.programaDenominacion = limpiarTextoEncoding(valor(4));
      } else if (etiqueta.includes('estado de la ficha')) {
        metadata.estadoFicha = valor(3) || 'EN EJECUCION';
      } else if (etiqueta.includes('fecha inicio')) {
        metadata.fechaInicio = valor(5);
      } else if (etiqueta.includes('fecha fin')) {
        metadata.fechaFin = valor(5);
      } else if (etiqueta.includes('modalidad')) {
        metadata.modalidad = valor(4) || 'PRESENCIAL';
      } else if (etiqueta.includes('regional')) {
        metadata.regional = limpiarTextoEncoding(valor(3));
      } else if (etiqueta.includes('centro de formaci')) {
        metadata.centroFormacion = limpiarTextoEncoding(valor(4));
      }
    }

    if (tableHeaderIndex === -1) {
      tableHeaderIndex = filas.findIndex(esFilaEncabezadoTabla);
    }

    if (tableHeaderIndex === -1) {
      return fallo(
        'No se encontró la cabecera de datos de aprendices y juicios evaluativos en el archivo.',
        { fichaNumero: metadata.fichaNumero, programaCodigo: metadata.programaCodigo, programaNombre: metadata.programaDenominacion },
        ['Falta la tabla de aprendices con columnas Tipo de Documento, Número de Documento, Competencia y Juicio de Evaluación.']
      );
    }

    // 2. Mapear Índices de Columnas (encabezados normalizados: sin tildes ni
    // caracteres dañados por el encoding de SofiaPlus).
    const headersOriginales = filas[tableHeaderIndex];
    const headers = headersOriginales.map(normalizarEncabezado);
    const buscar = (pred: (h: string) => boolean) => headers.findIndex(h => h !== '' && pred(h));

    let colTipoDoc = buscar(h => h.includes('tipo') && h.includes('doc'));
    // OJO: antes bastaba con que el encabezado dijera "documento", y "Tipo de
    // Documento" (que va antes) también lo dice — se tomaba la columna
    // equivocada. Ahora se excluye explícitamente la del tipo.
    let colNumDoc = buscar(h => h.includes('doc') && !h.includes('tipo'));
    let colNombre = buscar(h => h.startsWith('nombre') && !h.includes('apellido') && !h.includes('programa'));
    let colApellidos = buscar(h => h.includes('apellido'));
    let colEstado = buscar(h => h === 'estado' || (h.startsWith('estado') && !h.includes('ficha') && !h.includes('juicio')));
    let colComp = buscar(h => h.includes('competencia'));
    let colRap = buscar(h => h.includes('resultado') || h === 'rap' || h.startsWith('rap '));
    let colJuicio = buscar(h => h.includes('juicio') && !h.includes('fecha') && !h.includes('funcionario') && !h.includes('registr'));
    let colFechaJuicio = buscar(h => h.includes('fecha'));
    let colFuncionario = buscar(h => h.includes('funcionario') || h.includes('instructor') || h.includes('registr'));
    const colFicha = buscar(h => h.includes('ficha'));

    // Fallbacks posicionales estándar de SofiaPlus si los headers vinieron distorsionados
    if (colTipoDoc === -1) colTipoDoc = 0;
    if (colNumDoc === -1) colNumDoc = 1;
    if (colNombre === -1) colNombre = 2;
    if (colApellidos === -1) colApellidos = 3;
    if (colEstado === -1) colEstado = 4;
    if (colComp === -1) colComp = 5;
    if (colRap === -1) colRap = 6;
    if (colJuicio === -1) colJuicio = 7;
    if (colFechaJuicio === -1) colFechaJuicio = 9;
    if (colFuncionario === -1) colFuncionario = 10;

    const esDocumentoValido = (v: string) => /^[A-Za-z0-9.\-]{4,20}$/.test(v) && /\d/.test(v);

    // Si la tabla trae columna de ficha (reportes de varias fichas), se
    // decide cuál ficha es y se descarta el resto.
    if (colFicha >= 0) {
      const fichasEnDatos = new Map<string, number>();
      for (let r = tableHeaderIndex + 1; r < filas.length; r++) {
        const f = (filas[r][colFicha] || '').match(/\d{6,9}/)?.[0];
        if (f && esDocumentoValido(filas[r][colNumDoc] || '')) fichasEnDatos.set(f, (fichasEnDatos.get(f) || 0) + 1);
      }
      if (!metadata.fichaNumero) {
        if (fichasEnDatos.size === 1) {
          metadata.fichaNumero = Array.from(fichasEnDatos.keys())[0];
        } else if (fichasEnDatos.size > 1) {
          const lista = Array.from(fichasEnDatos.entries()).map(([f, n]) => `${f} (${n} juicios)`).join(', ');
          return fallo(
            `El archivo trae juicios de ${fichasEnDatos.size} fichas distintas: ${lista}. Descarga desde SofiaPlus el reporte de juicios de UNA sola ficha y vuelve a cargarlo.`
          );
        }
      }
    }

    if (!metadata.fichaNumero) {
      return fallo(
        'No se encontró el número de ficha en el encabezado del archivo (la línea "Ficha de Caracterización"). Verifica que sea el Reporte de Juicios de Evaluación descargado de SofiaPlus para una ficha.',
        { programaCodigo: metadata.programaCodigo, programaNombre: metadata.programaDenominacion }
      );
    }

    // 3. Procesar Filas de Aprendices y Juicios
    const aprendicesMap = new Map<string, AprendizJuicio>();
    const competenciasEvaluadasMap = new Map<string, { total: number; aprobados: number; porEvaluar: number }>();
    
    let totalFilasValidas = 0;
    let totalJuiciosAprobados = 0;
    let totalJuiciosPorEvaluar = 0;
    let filasDescartadasOtraFicha = 0;

    for (let r = tableHeaderIndex + 1; r < filas.length; r++) {
      const cols = filas[r];
      if (!cols || cols.every(c => c === '')) continue;

      const numDoc = cols[colNumDoc] || '';
      if (!esDocumentoValido(numDoc)) {
        continue;
      }

      if (colFicha >= 0) {
        const fichaFila = (cols[colFicha] || '').match(/\d{6,9}/)?.[0];
        if (fichaFila && fichaFila !== metadata.fichaNumero) {
          filasDescartadasOtraFicha++;
          continue;
        }
      }

      totalFilasValidas++;

      const tipoDoc = cols[colTipoDoc] || 'CC';
      const nombres = limpiarTextoEncoding(cols[colNombre] || '');
      const apellidos = limpiarTextoEncoding(cols[colApellidos] || '');
      const nombresApellidos = `${nombres} ${apellidos}`.trim();
      const estadoAprendiz = (cols[colEstado] || 'EN FORMACION').toUpperCase().trim();
      const competenciaRaw = limpiarTextoEncoding(cols[colComp] || 'Competencia sin especificar');
      const rapRaw = limpiarTextoEncoding(cols[colRap] || 'RAP sin especificar');
      
      const juicioRaw = (cols[colJuicio] || 'POR EVALUAR').toUpperCase().trim();
      const esAprobado = juicioRaw.includes('APROB') || juicioRaw === 'A';
      const estadoJuicio = esAprobado ? 'APROBADO' : 'POR EVALUAR';

      if (esAprobado) {
        totalJuiciosAprobados++;
      } else {
        totalJuiciosPorEvaluar++;
      }

      // En el .xls de SofiaPlus la fecha viene como número serial de Excel
      // (p.ej. 46095.45278); se convierte a "dd/mm/aaaa hh:mm".
      const fechaCruda = (cols[colFechaJuicio] || '').trim();
      const fechaJuicio = /^\d{5}(\.\d+)?$/.test(fechaCruda) ? serialExcelAFecha(Number(fechaCruda)) : fechaCruda;
      const funcionario = limpiarTextoEncoding(cols[colFuncionario] || '');

      // Extraer código de competencia si viene tipo "38362 - Diseñar la solución..."
      let compCodigo = '';
      const matchComp = competenciaRaw.match(/^(\d+)\s*[-–]\s*(.+)$/);
      if (matchComp) {
        compCodigo = matchComp[1];
      }

      // Extraer código de RAP si viene tipo "593100 - 03 DETERMINAR LAS CARACTERÍSTICAS..."
      let rapCodigo = '';
      const matchRap = rapRaw.match(/^(\d+)\s*[-–]\s*(.+)$/);
      if (matchRap) {
        rapCodigo = matchRap[1];
      }

      // Registro de detalle individual del juicio
      const juicioItem: JuicioDetalle = {
        id: `j_${numDoc}_${r}`,
        competenciaCodigo: compCodigo || undefined,
        competenciaDenominacion: competenciaRaw,
        rapCodigo: rapCodigo || undefined,
        rapDenominacion: rapRaw,
        estado: estadoJuicio,
        fechaEvaluacion: fechaJuicio || undefined,
        funcionarioEvaluador: funcionario && funcionario !== '-' ? funcionario : undefined
      };

      // Agrupar en el aprendiz
      if (!aprendicesMap.has(numDoc)) {
        aprendicesMap.set(numDoc, {
          id: `apr_${numDoc}`,
          fichaNumero: metadata.fichaNumero,
          tipoDocumento: tipoDoc,
          documento: numDoc,
          nombres,
          apellidos,
          nombresApellidos,
          estadoMatricula: estadoAprendiz,
          totalJuicios: 0,
          juiciosAprobados: 0,
          juiciosPorEvaluar: 0,
          porcentajeAvance: 0,
          juicios: []
        });
      }

      const apr = aprendicesMap.get(numDoc)!;
      apr.totalJuicios++;
      if (esAprobado) apr.juiciosAprobados++;
      else apr.juiciosPorEvaluar++;
      apr.juicios.push(juicioItem);

      // Estadísticas por competencia
      const compKey = competenciaRaw;
      if (!competenciasEvaluadasMap.has(compKey)) {
        competenciasEvaluadasMap.set(compKey, { total: 0, aprobados: 0, porEvaluar: 0 });
      }
      const cStat = competenciasEvaluadasMap.get(compKey)!;
      cStat.total++;
      if (esAprobado) cStat.aprobados++;
      else cStat.porEvaluar++;
    }

    // Calcular porcentaje de avance individual por aprendiz
    const aprendicesList: AprendizJuicio[] = Array.from(aprendicesMap.values()).map(a => {
      const pct = a.totalJuicios > 0 ? Math.round((a.juiciosAprobados / a.totalJuicios) * 100) : 0;
      return {
        ...a,
        porcentajeAvance: pct
      };
    });

    // Ordenar aprendices: primero los activos ordenados alfabéticamente
    aprendicesList.sort((a, b) => {
      if (a.estadoMatricula === 'EN FORMACION' && b.estadoMatricula !== 'EN FORMACION') return -1;
      if (a.estadoMatricula !== 'EN FORMACION' && b.estadoMatricula === 'EN FORMACION') return 1;
      return a.nombresApellidos.localeCompare(b.nombresApellidos);
    });

    // Control de cordura: una ficha real tiene decenas de aprendices, no
    // miles. Si salen cientos, el archivo no es de una sola ficha o las
    // columnas se leyeron corridas — mejor rechazar que integrar basura.
    if (aprendicesList.length > 150) {
      return fallo(
        `El archivo se leyó con ${aprendicesList.length} aprendices distintos para la ficha ${metadata.fichaNumero}, lo cual no corresponde a una sola ficha. ` +
        `Columnas detectadas: documento = "${headersOriginales[colNumDoc] || '?'}", competencia = "${headersOriginales[colComp] || '?'}", juicio = "${headersOriginales[colJuicio] || '?'}". ` +
        `Verifica que sea el Reporte de Juicios de Evaluación de UNA ficha descargado de SofiaPlus.`,
        { fichaNumero: metadata.fichaNumero, programaCodigo: metadata.programaCodigo, programaNombre: metadata.programaDenominacion, totalAprendices: aprendicesList.length, totalRegistrosJuicios: totalFilasValidas }
      );
    }
    if (totalFilasValidas === 0) {
      return fallo(
        `No se encontró ningún juicio válido en el archivo de la ficha ${metadata.fichaNumero} (columna de documento detectada: "${headersOriginales[colNumDoc] || '?'}").`,
        { fichaNumero: metadata.fichaNumero }
      );
    }
    if (filasDescartadasOtraFicha > 0) {
      advertencias.push(`Se ignoraron ${filasDescartadasOtraFicha} filas que pertenecían a otras fichas distintas a la ${metadata.fichaNumero}.`);
    }

    // Desglose detallado de estados de matrícula
    const totalAprendices = aprendicesList.length;
    const aprendicesActivos = aprendicesList.filter(a => {
      const e = (a.estadoMatricula || '').toUpperCase();
      return e === 'EN FORMACION' || e === 'EN FORMACIÓN' || e === 'INDUCCION' || e === 'INDUCCIÓN' || (!e.includes('CANCELAD') && !e.includes('RETIRO') && !e.includes('APLAZAD') && !e.includes('TRASLAD'));
    }).length;
    const aprendicesRetiro = aprendicesList.filter(a => (a.estadoMatricula || '').toUpperCase().includes('RETIRO')).length;
    const aprendicesCancelados = aprendicesList.filter(a => (a.estadoMatricula || '').toUpperCase().includes('CANCELAD')).length;
    const aprendicesAplazados = aprendicesList.filter(a => (a.estadoMatricula || '').toUpperCase().includes('APLAZAD')).length;
    const aprendicesCondicionados = aprendicesList.filter(a => (a.estadoMatricula || '').toUpperCase().includes('CONDICIONAD')).length;
    const aprendicesTrasladados = aprendicesList.filter(a => (a.estadoMatricula || '').toUpperCase().includes('TRASLAD')).length;
    const aprendicesPorCertificar = aprendicesList.filter(a => (a.estadoMatricula || '').toUpperCase().includes('CERTIF')).length;

    // Métricas oficiales de Retención y Deserción
    const totalDesercion = aprendicesRetiro + aprendicesCancelados;
    const tasaRetencion = totalAprendices > 0 ? Number(((aprendicesActivos / totalAprendices) * 100).toFixed(1)) : 100;
    const tasaDesercion = totalAprendices > 0 ? Number(((totalDesercion / totalAprendices) * 100).toFixed(1)) : 0;
    const porcentajeAprobacionFicha = totalFilasValidas > 0 ? Math.round((totalJuiciosAprobados / totalFilasValidas) * 100) : 0;

    // Desglose de competencias
    const competenciasEvaluadas = Array.from(competenciasEvaluadasMap.entries()).map(([nombre, stat]) => ({
      nombre,
      totalJuicios: stat.total,
      aprobados: stat.aprobados,
      porEvaluar: stat.porEvaluar,
      porcentaje: stat.total > 0 ? Math.round((stat.aprobados / stat.total) * 100) : 0
    }));

    // Consolidar objeto de reporte (solo datos estructurados necesarios, sin blobs pesados)
    const reporte: ReporteJuiciosFicha = {
      id: `rep_juicios_${metadata.fichaNumero || 'sofia'}_${Date.now()}`,
      fichaNumero: metadata.fichaNumero,
      fechaCargue: new Date().toISOString(),
      archivoNombre: typeof archivo === 'string' ? nombreArchivo : (archivo.name || nombreArchivo),
      metadata,
      totalRegistros: totalFilasValidas,
      totalAprendices,
      aprendicesActivos,
      aprendicesRetiroVoluntario: aprendicesRetiro,
      aprendicesCancelados,
      aprendicesAplazados,
      aprendicesCondicionados,
      aprendicesTrasladados,
      aprendicesPorCertificar,
      tasaRetencion,
      tasaDesercion,
      totalJuiciosAprobados,
      totalJuiciosPorEvaluar,
      porcentajeAprobacionFicha,
      competenciasEvaluadas,
      aprendices: aprendicesList
    };

    return {
      exito: true,
      mensaje: `Reporte de Juicios Evaluativos procesado exitosamente para la Ficha ${reporte.fichaNumero}.`,
      reporte,
      detalles: {
        fichaNumero: reporte.fichaNumero,
        programaCodigo: metadata.programaCodigo,
        programaNombre: metadata.programaDenominacion,
        totalAprendices,
        aprendicesActivos,
        aprendicesRetiroVoluntario: aprendicesRetiro,
        aprendicesCancelados,
        aprendicesAplazados,
        aprendicesCondicionados,
        aprendicesTrasladados,
        tasaRetencion,
        tasaDesercion,
        totalRegistrosJuicios: totalFilasValidas,
        juiciosAprobados: totalJuiciosAprobados,
        juiciosPorEvaluar: totalJuiciosPorEvaluar,
        porcentajeAprobacion: porcentajeAprobacionFicha,
        competenciasCount: competenciasEvaluadas.length,
        advertencias
      }
    };
  } catch (error: any) {
    return {
      exito: false,
      mensaje: `Error al procesar el Reporte de Juicios Evaluativos: ${error?.message || 'Estructura no válida'}`,
      detalles: {
        fichaNumero: '',
        programaCodigo: '',
        programaNombre: '',
        totalAprendices: 0,
        aprendicesActivos: 0,
        aprendicesRetiroVoluntario: 0,
        aprendicesCancelados: 0,
        tasaRetencion: 0,
        tasaDesercion: 0,
        totalRegistrosJuicios: 0,
        juiciosAprobados: 0,
        juiciosPorEvaluar: 0,
        porcentajeAprobacion: 0,
        competenciasCount: 0,
        advertencias: [error?.message || 'Fallo general de lectura']
      }
    };
  }
}

/**
 * Genera y descarga el archivo oficial demo .xls basado exactamente en el reporte SofiaPlus
 * suministrado por el usuario (Ficha 3235106, 26 aprendices, 100+ juicios evaluativos).
 */
export function descargarEjemploJuiciosExcel(fichaNumero: string = '3235106') {
  // Construir contenido con formato exacto de SofiaPlus
  const contenido = `Reporte de Juicios de Evaluación;;;;;;;;;;;;;
Fecha del Reporte:;;25/09/2026;;;;;;;;;;;
Ficha de Caracterización:;;${fichaNumero};;;;;;;;;;;
Código:;;228118;;;;;;;;;;;
Versión:;;1;;;;;;;;;;;
Denominación:;;ANALISIS Y DESARROLLO DE SOFTWARE.;;;;;;;;;;;
Estado de la Ficha de Caracterización:;;EN EJECUCION;;;;;;;;;;;
Fecha Inicio:;;25/07/2025;;;;;;;;;;;
Fecha Fin:;;24/10/2027;;;;;;;;;;;
Modalidad de Formación:;;PRESENCIAL;;;;;;;;;;;
Regional:;;20 - REGIONAL;;;;;;;;;;;
Centro de Formación:;;9114 - CENTRO DE ATENCION INTEGRAL AL CAMPESINO;;;;;;;;;;;
Tipo de Documento;Número de Documento;Nombre;Apellidos;Estado;Competencia;Resultado de Aprendizaje;Juicio de Evaluación;;Fecha y Hora del Juicio Evaluativo;Funcionario que registro el juicio evaluativo;;;
CC;1003003844;ANDREA DEL PILAR;GALINDO CASTRO;RETIRO VOLUNTARIO;2 - RESULTADOS DE APRENDIZAJE ETAPA PRACTICA;590803 - APLICAR EN LA RESOLUCIÓN DE PROBLEMAS REALES DEL SECTOR PRODUCTIVO;POR EVALUAR;;;  -   ;;;
CC;1003003844;ANDREA DEL PILAR;GALINDO CASTRO;RETIRO VOLUNTARIO;36180 - Enrique Low Murtra-Interactuar en el contexto productivo y social;593147 - 02 ESTABLECER RELACIONES DE CRECIMIENTO PERSONAL;APROBADO;;01/10/2025 7.57 a;CC 12495918 - ALFREDO GARCIA MANDON;;;
CC;1003003844;ANDREA DEL PILAR;GALINDO CASTRO;RETIRO VOLUNTARIO;37371 - Utilizar herramientas informáticas;593151 - 02 APLICAR FUNCIONALIDADES DE HERRAMIENTAS TIC;APROBADO;;28/11/2025 10.34 a;CC 9271250 - JULIAN ERNESTO TRESPALACIOS TORRES;;;
CC;1003003844;ANDREA DEL PILAR;GALINDO CASTRO;RETIRO VOLUNTARIO;38392 - Establecer requisitos de la solución de software;593346 - 01 CARACTERIZAR LOS PROCESOS DE LA ORGANIZACIÓN;APROBADO;;20/09/2025 9.53 a;CC 51776671 - LINLEY CATALINA MOSCOTE MORON;;;
CC;1016714029;VICTOR SANTIAGO;DIAZ VEGA;EN FORMACION;2 - RESULTADOS DE APRENDIZAJE ETAPA PRACTICA;590803 - APLICAR EN LA RESOLUCIÓN DE PROBLEMAS REALES DEL SECTOR PRODUCTIVO;POR EVALUAR;;;  -   ;;;
CC;1016714029;VICTOR SANTIAGO;DIAZ VEGA;EN FORMACION;36180 - Enrique Low Murtra-Interactuar en el contexto productivo y social;593147 - 02 ESTABLECER RELACIONES DE CRECIMIENTO PERSONAL;APROBADO;;01/10/2025 7.57 a;CC 12495918 - ALFREDO GARCIA MANDON;;;
CC;1016714029;VICTOR SANTIAGO;DIAZ VEGA;EN FORMACION;37714 - INTERACTUAR EN LENGUA INGLESA DE FORMA ORAL Y ESCRITA;593117 - 01 COMPRENDER INFORMACIÓN EN INGLÉS;APROBADO;;09/10/2025 9.00 a;CC 1047396137 - ADRIAN FABIAN MORILLO MARTELO;;;
CC;1016714029;VICTOR SANTIAGO;DIAZ VEGA;EN FORMACION;37801 - APLICACIÓN DE CONOCIMIENTOS DE CIENCIAS NATURALES - FÍSICA;593162 - 01 IDENTIFICAR LEYES DE LA FÍSICA;APROBADO;;07/07/2026 4.48 a;CC 11428245 - OLIVERIO SANTOS LEON PULIDO;;;
CC;1016714029;VICTOR SANTIAGO;DIAZ VEGA;EN FORMACION;38362 - Diseñar la solución de software de acuerdo con procedimientos;593100 - 03 DETERMINAR CARACTERÍSTICAS DE INTERFAZ;APROBADO;;17/04/2026 17.57 a;CC 12435718 - JOSE DAVID MONTESINO HOYOS;;;
CC;1016714029;VICTOR SANTIAGO;DIAZ VEGA;EN FORMACION;38362 - Diseñar la solución de software de acuerdo con procedimientos;593101 - 02 ESTRUCTURAR EL MODELO DE DATOS;APROBADO;;16/04/2026 10.36 a;CC 77096228 - WALTER ENRIQUE OLIVERA MENESES;;;
CC;1016714029;VICTOR SANTIAGO;DIAZ VEGA;EN FORMACION;38367 - Estructurar propuesta técnica de servicio TI;593060 - 01 DEFINIR ESPECIFICACIONES TÉCNICAS;APROBADO;;16/04/2026 9.43 a;CC 49606707 - KARINA PAOLA MEZA RESTREPO;;;
CC;1016714029;VICTOR SANTIAGO;DIAZ VEGA;EN FORMACION;38368 - DESARROLLAR LA SOLUCIÓN DE SOFTWARE;593106 - 01 PLANEAR ACTIVIDADES DE CONSTRUCCIÓN;APROBADO;;11/06/2026 10.17 a;CC 12435718 - JOSE DAVID MONTESINO HOYOS;;;
CC;1016714029;VICTOR SANTIAGO;DIAZ VEGA;EN FORMACION;38376 - Evaluar requisitos de la solución de software;592376 - 03 DESARROLLAR PROCESOS LÓGICOS CON ALGORITMOS;APROBADO;;16/06/2026 8.43 a;CC 77096228 - WALTER ENRIQUE OLIVERA MENESES;;;
CC;1016714029;VICTOR SANTIAGO;DIAZ VEGA;EN FORMACION;38560 - Razonar cuantitativamente en contextos laborales;593255 - 03 RESOLVER PROBLEMAS MATEMÁTICOS;APROBADO;;11/12/2025 13.26 a;CC 77182530 - FELIX JAVIER VILLERO MAESTRE;;;
CC;1016714029;VICTOR SANTIAGO;DIAZ VEGA;EN FORMACION;38561 - Gestionar procesos de cultura emprendedora;593259 - 02 CARACTERIZAR LA IDEA DE NEGOCIO;APROBADO;;23/07/2026 22.40 a;CC 1067717980 - MALORY LAYN MERCADO TRESPALACIOS;;;
CC;1046397776;JERSON;URIETA GUIRAL;EN FORMACION;36180 - Enrique Low Murtra-Interactuar en el contexto productivo y social;593147 - 02 ESTABLECER RELACIONES DE CRECIMIENTO PERSONAL;APROBADO;;01/10/2025 7.57 a;CC 12495918 - ALFREDO GARCIA MANDON;;;
CC;1046397776;JERSON;URIETA GUIRAL;EN FORMACION;38392 - Establecer requisitos de la solución de software;593346 - 01 CARACTERIZAR LOS PROCESOS DE LA ORGANIZACIÓN;APROBADO;;20/09/2025 9.16 a;CC 51776671 - LINLEY CATALINA MOSCOTE MORON;;;
CC;1062404286;ANDRES DAVID;BARROS HERNANDEZ;EN FORMACION;36182 - Resultado de Aprendizaje de la Inducción;593343 - 01 IDENTIFICAR LA DINÁMICA ORGANIZACIONAL;APROBADO;;05/08/2025 11.53 a;CC 9271250 - JULIAN ERNESTO TRESPALACIOS TORRES;;;
CC;1064110749;ALLAN ADRIAN;CONTRERAS CASTILLO;EN FORMACION;38368 - DESARROLLAR LA SOLUCIÓN DE SOFTWARE;593106 - 01 PLANEAR ACTIVIDADES DE CONSTRUCCIÓN;APROBADO;;11/06/2026 10.17 a;CC 12435718 - JOSE DAVID MONTESINO HOYOS;;;
CC;1065202487;KAROL YULIANA;ARDILA OSORIA;RETIRO VOLUNTARIO;36180 - Enrique Low Murtra-Interactuar en el contexto productivo y social;593147 - 02 ESTABLECER RELACIONES;APROBADO;;01/10/2025 7.57 a;CC 12495918 - ALFREDO GARCIA MANDON;;;
CC;1065203255;DILAN DAVID;RODRIGUEZ OVALLE;EN FORMACION;38362 - Diseñar la solución de software de acuerdo con procedimientos;593100 - 03 DETERMINAR CARACTERÍSTICAS DE INTERFAZ;APROBADO;;17/04/2026 17.57 a;CC 12435718 - JOSE DAVID MONTESINO HOYOS;;;
CC;1065589699;OSNEIDER RAFAEL;FUENTES PADILLA;EN FORMACION;38392 - Establecer requisitos de la solución de software;593345 - 04 VALIDAR EL INFORME DE REQUISITOS;APROBADO;;07/04/2026 11.15 a;CC 49695123 - BEVERLYS ROMERO ZAMBRANO;;;
CC;1065602859;CALET SANTIAGO;CANTILLO ARCIA;EN FORMACION;38367 - Estructurar propuesta técnica de servicio TI;593060 - 01 DEFINIR ESPECIFICACIONES TÉCNICAS;APROBADO;;16/04/2026 9.43 a;CC 49606707 - KARINA PAOLA MEZA RESTREPO;;;
CC;1065613259;JANER MIGUEL;OSORIO CHIQUILLO;EN FORMACION;38376 - Evaluar requisitos de la solución de software;592376 - 03 DESARROLLAR PROCESOS LÓGICOS CON ALGORITMOS;APROBADO;;16/06/2026 8.43 a;CC 77096228 - WALTER ENRIQUE OLIVERA MENESES;;;
CC;1066866077;JUAN DANIEL;LEMUS NIETO;EN FORMACION;38392 - Establecer requisitos de la solución de software;593347 - 03 ESTABLECER LOS REQUISITOS DEL SOFTWARE;APROBADO;;08/12/2025 7.44 a;CC 51776671 - LINLEY CATALINA MOSCOTE MORON;;;
CC;1067596444;DEIBIS ALEJANDRO;VEGA GALEZZO;EN FORMACION;38561 - Gestionar procesos de cultura emprendedora;593259 - 02 CARACTERIZAR LA IDEA DE NEGOCIO;APROBADO;;23/07/2026 22.40 a;CC 1067717980 - MALORY LAYN MERCADO TRESPALACIOS;;;
CC;1067711288;KEVIN DAVID;DIAZ MEJIA;RETIRO VOLUNTARIO;36180 - Enrique Low Murtra-Interactuar en el contexto productivo y social;593147 - 02 ESTABLECER RELACIONES;APROBADO;;01/10/2025 7.57 a;CC 12495918 - ALFREDO GARCIA MANDON;;;
CC;1067716390;YELITZA;HOMES ARMENTA;EN FORMACION;38368 - DESARROLLAR LA SOLUCIÓN DE SOFTWARE;593106 - 01 PLANEAR ACTIVIDADES DE CONSTRUCCIÓN;APROBADO;;11/06/2026 10.17 a;CC 12435718 - JOSE DAVID MONTESINO HOYOS;;;
TI;1067719189;BLEIDYS JHOJANA;MEJIA SANCHEZ;RETIRO VOLUNTARIO;36180 - Enrique Low Murtra-Interactuar en el contexto productivo y social;593147 - 02 ESTABLECER RELACIONES;APROBADO;;01/10/2025 7.57 a;CC 12495918 - ALFREDO GARCIA MANDON;;;
CC;1067811143;HEILIN JOHANA;ITURRIAGO SALGADO;RETIRO VOLUNTARIO;36180 - Enrique Low Murtra-Interactuar en el contexto productivo y social;593147 - 02 ESTABLECER RELACIONES;APROBADO;;01/10/2025 7.57 a;CC 12495918 - ALFREDO GARCIA MANDON;;;
CC;1081000167;LUIS MIGUEL;ARRIETA CERVANTES;EN FORMACION;38362 - Diseñar la solución de software de acuerdo con procedimientos;593100 - 03 DETERMINAR CARACTERÍSTICAS DE INTERFAZ;APROBADO;;17/04/2026 17.57 a;CC 12435718 - JOSE DAVID MONTESINO HOYOS;;;
CC;1081001900;JOSE CARLOS;RODRIGUEZ PERTUZ;EN FORMACION;38362 - Diseñar la solución de software de acuerdo con procedimientos;593101 - 02 ESTRUCTURAR EL MODELO DE DATOS;APROBADO;;16/04/2026 10.36 a;CC 77096228 - WALTER ENRIQUE OLIVERA MENESES;;;
CC;1082492231;MANUEL JOSE;MOLINA FIERRO;EN FORMACION;38367 - Estructurar propuesta técnica de servicio TI;593060 - 01 DEFINIR ESPECIFICACIONES TÉCNICAS;APROBADO;;16/04/2026 9.43 a;CC 49606707 - KARINA PAOLA MEZA RESTREPO;;;
CC;1085227396;JOEL DAVID;ALDANA BERMUDEZ;EN FORMACION;38376 - Evaluar requisitos de la solución de software;592376 - 03 DESARROLLAR PROCESOS LÓGICOS CON ALGORITMOS;APROBADO;;16/06/2026 8.43 a;CC 77096228 - WALTER ENRIQUE OLIVERA MENESES;;;
TI;1097499211;CARLOS MANUEL;PEDRAZA SERRANO;EN FORMACION;38368 - DESARROLLAR LA SOLUCIÓN DE SOFTWARE;593106 - 01 PLANEAR ACTIVIDADES DE CONSTRUCCIÓN;APROBADO;;11/06/2026 10.17 a;CC 12435718 - JOSE DAVID MONTESINO HOYOS;;;
CC;1110476900;JOSE EDWIN;MAHECHA GUZMAN;EN FORMACION;38560 - Razonar cuantitativamente en contextos laborales;593255 - 03 RESOLVER PROBLEMAS MATEMÁTICOS;APROBADO;;11/12/2025 13.26 a;CC 77182530 - FELIX JAVIER VILLERO MAESTRE;;;
CC;1121329261;LUIFRANK;LOPEZ ACOSTA;EN FORMACION;38362 - Diseñar la solución de software de acuerdo con procedimientos;593100 - 03 DETERMINAR CARACTERÍSTICAS DE INTERFAZ;APROBADO;;17/04/2026 17.57 a;CC 12435718 - JOSE DAVID MONTESINO HOYOS;;;
CC;1193045594;LILI ROSA;ROMERO PUENTE;EN FORMACION;38392 - Establecer requisitos de la solución de software;593347 - 03 ESTABLECER LOS REQUISITOS DEL SOFTWARE;APROBADO;;07/04/2026 11.16 a;CC 49695123 - BEVERLYS ROMERO ZAMBRANO;;;
PPT;1258678;YEISON ENRIQUE;CHACIN OCANDO;EN FORMACION;38368 - DESARROLLAR LA SOLUCIÓN DE SOFTWARE;593106 - 01 PLANEAR ACTIVIDADES DE CONSTRUCCIÓN;APROBADO;;11/06/2026 10.17 a;CC 12435718 - JOSE DAVID MONTESINO HOYOS;;;
CC;77172475;IADER;TORRES BARROS;EN FORMACION;38362 - Diseñar la solución de software de acuerdo con procedimientos;593100 - 03 DETERMINAR CARACTERÍSTICAS DE INTERFAZ;APROBADO;;17/04/2026 17.57 a;CC 12435718 - JOSE DAVID MONTESINO HOYOS;;;
`;

  const blob = new Blob([contenido], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Reporte_Juicios_Evaluacion_${fichaNumero}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Retorna el reporte procesado de la muestra oficial SofiaPlus Ficha 3235106 para pruebas inmediatas
 */
export async function obtenerReporteDemoJuicios(fichaNumero: string = '3235106'): Promise<ReporteJuiciosFicha> {
  const res = await procesarJuiciosEvaluativosExcel(
    `Reporte de Juicios de Evaluación;;;;;;;;;;;;;
Fecha del Reporte:;;25/09/2026;;;;;;;;;;;
Ficha de Caracterización:;;${fichaNumero};;;;;;;;;;;
Código:;;228118;;;;;;;;;;;
Versión:;;1;;;;;;;;;;;
Denominación:;;ANALISIS Y DESARROLLO DE SOFTWARE.;;;;;;;;;;;
Estado de la Ficha de Caracterización:;;EN EJECUCION;;;;;;;;;;;
Fecha Inicio:;;25/07/2025;;;;;;;;;;;
Fecha Fin:;;24/10/2027;;;;;;;;;;;
Modalidad de Formación:;;PRESENCIAL;;;;;;;;;;;
Regional:;;20 - REGIONAL;;;;;;;;;;;
Centro de Formación:;;9114 - CENTRO DE ATENCION INTEGRAL AL CAMPESINO;;;;;;;;;;;
Tipo de Documento;Número de Documento;Nombre;Apellidos;Estado;Competencia;Resultado de Aprendizaje;Juicio de Evaluación;;Fecha y Hora del Juicio Evaluativo;Funcionario que registro el juicio evaluativo;;;
CC;1003003844;ANDREA DEL PILAR;GALINDO CASTRO;RETIRO VOLUNTARIO;2 - RESULTADOS DE APRENDIZAJE ETAPA PRACTICA;590803 - APLICAR EN LA RESOLUCIÓN DE PROBLEMAS REALES DEL SECTOR PRODUCTIVO;POR EVALUAR;;;  -   ;;;
CC;1003003844;ANDREA DEL PILAR;GALINDO CASTRO;RETIRO VOLUNTARIO;36180 - Enrique Low Murtra-Interactuar en el contexto productivo y social de acuerdo con principios éticos para la construcción de una cultura de paz;593147 - 02 ESTABLECER RELACIONES DE CRECIMIENTO PERSONAL Y COMUNITARIO A PARTIR DEL BIEN COMÚN COMO APORTE PARA EL DESARROLLO SOCIAL;APROBADO;;01/10/2025 7.57 a;CC 12495918 - ALFREDO GARCIA MANDON;;;
CC;1003003844;ANDREA DEL PILAR;GALINDO CASTRO;RETIRO VOLUNTARIO;36180 - Enrique Low Murtra-Interactuar en el contexto productivo y social de acuerdo con principios éticos para la construcción de una cultura de paz;593148 - 03 PROMOVER EL USO RACIONAL DE LOS RECURSOS NATURALES;APROBADO;;01/10/2025 8.00 a;CC 12495918 - ALFREDO GARCIA MANDON;;;
CC;1003003844;ANDREA DEL PILAR;GALINDO CASTRO;RETIRO VOLUNTARIO;37371 - Utilizar herramientas informáticas de acuerdo con las necesidades de manejo de información;593151 - 02 APLICAR FUNCIONALIDADES DE HERRAMIENTAS Y SERVICIOS TIC;APROBADO;;28/11/2025 10.34 a;CC 9271250 - JULIAN ERNESTO TRESPALACIOS TORRES;;;
CC;1003003844;ANDREA DEL PILAR;GALINDO CASTRO;RETIRO VOLUNTARIO;37371 - Utilizar herramientas informáticas de acuerdo con las necesidades de manejo de información;593154 - 01 ALISTAR HERRAMIENTAS DE TECNOLOGÍAS TIC;APROBADO;;28/11/2025 10.34 a;CC 9271250 - JULIAN ERNESTO TRESPALACIOS TORRES;;;
CC;1003003844;ANDREA DEL PILAR;GALINDO CASTRO;RETIRO VOLUNTARIO;37714 - INTERACTUAR EN LENGUA INGLESA DE FORMA ORAL Y ESCRITA;593117 - 01 COMPRENDER INFORMACIÓN EN INGLÉS;APROBADO;;09/10/2025 9.00 a;CC 1047396137 - ADRIAN FABIAN MORILLO MARTELO;;;
CC;1003003844;ANDREA DEL PILAR;GALINDO CASTRO;RETIRO VOLUNTARIO;37802 - DESARROLLAR PROCESOS DE COMUNICACIÓN EFICACES Y EFECTIVOS;593225 - 01 ANALIZAR LOS COMPONENTES DE LA COMUNICACIÓN;APROBADO;;30/09/2025 11.45 a;CC 12551439 - YOLIS DIAZ ARRIETA;;;
CC;1003003844;ANDREA DEL PILAR;GALINDO CASTRO;RETIRO VOLUNTARIO;38199 - Orientar investigación formativa según referentes técnicos;593236 - 01 ANALIZAR EL CONTEXTO PRODUCTIVO SEGÚN NECESIDADES;APROBADO;;28/11/2025 10.28 a;CC 9271250 - JULIAN ERNESTO TRESPALACIOS TORRES;;;
CC;1003003844;ANDREA DEL PILAR;GALINDO CASTRO;RETIRO VOLUNTARIO;38392 - Establecer requisitos de la solución de software de acuerdo con estándares;593346 - 01 CARACTERIZAR LOS PROCESOS DE LA ORGANIZACIÓN;APROBADO;;20/09/2025 9.53 a;CC 51776671 - LINLEY CATALINA MOSCOTE MORON;;;
CC;1016714029;VICTOR SANTIAGO;DIAZ VEGA;EN FORMACION;2 - RESULTADOS DE APRENDIZAJE ETAPA PRACTICA;590803 - APLICAR EN LA RESOLUCIÓN DE PROBLEMAS REALES DEL SECTOR PRODUCTIVO;POR EVALUAR;;;  -   ;;;
CC;1016714029;VICTOR SANTIAGO;DIAZ VEGA;EN FORMACION;36180 - Enrique Low Murtra-Interactuar en el contexto productivo y social;593147 - 02 ESTABLECER RELACIONES DE CRECIMIENTO PERSONAL;APROBADO;;01/10/2025 7.57 a;CC 12495918 - ALFREDO GARCIA MANDON;;;
CC;1016714029;VICTOR SANTIAGO;DIAZ VEGA;EN FORMACION;37714 - INTERACTUAR EN LENGUA INGLESA DE FORMA ORAL Y ESCRITA;593117 - 01 COMPRENDER INFORMACIÓN EN INGLÉS;APROBADO;;09/10/2025 9.00 a;CC 1047396137 - ADRIAN FABIAN MORILLO MARTELO;;;
CC;1016714029;VICTOR SANTIAGO;DIAZ VEGA;EN FORMACION;37799 - APLICAR PRÁCTICAS DE PROTECCIÓN AMBIENTAL, SST;593158 - 02 IMPLEMENTAR ESTRATEGIAS PARA CONTROL DE IMPACTOS;APROBADO;;08/04/2026 7.53 a;CC 77021216 - JAIME ENRIQUE NUÑEZ CAMACHO;;;
CC;1016714029;VICTOR SANTIAGO;DIAZ VEGA;EN FORMACION;37801 - APLICACIÓN DE CONOCIMIENTOS DE CIENCIAS NATURALES - FÍSICA;593162 - 01 IDENTIFICAR PRINCIPIOS Y LEYES DE LA FÍSICA;APROBADO;;07/07/2026 4.48 a;CC 11428245 - OLIVERIO SANTOS LEON PULIDO;;;
CC;1016714029;VICTOR SANTIAGO;DIAZ VEGA;EN FORMACION;38362 - Diseñar la solución de software de acuerdo con procedimientos;593100 - 03 DETERMINAR CARACTERÍSTICAS TÉCNICAS DE INTERFAZ;APROBADO;;17/04/2026 17.57 a;CC 12435718 - JOSE DAVID MONTESINO HOYOS;;;
CC;1016714029;VICTOR SANTIAGO;DIAZ VEGA;EN FORMACION;38362 - Diseñar la solución de software de acuerdo con procedimientos;593101 - 02 ESTRUCTURAR EL MODELO DE DATOS;APROBADO;;16/04/2026 10.36 a;CC 77096228 - WALTER ENRIQUE OLIVERA MENESES;;;
CC;1016714029;VICTOR SANTIAGO;DIAZ VEGA;EN FORMACION;38367 - Estructurar propuesta técnica de servicio TI;593060 - 01 DEFINIR ESPECIFICACIONES TÉCNICAS;APROBADO;;16/04/2026 9.43 a;CC 49606707 - KARINA PAOLA MEZA RESTREPO;;;
CC;1016714029;VICTOR SANTIAGO;DIAZ VEGA;EN FORMACION;38368 - DESARROLLAR LA SOLUCIÓN DE SOFTWARE;593106 - 01 PLANEAR ACTIVIDADES DE CONSTRUCCIÓN;APROBADO;;11/06/2026 10.17 a;CC 12435718 - JOSE DAVID MONTESINO HOYOS;;;
CC;1016714029;VICTOR SANTIAGO;DIAZ VEGA;EN FORMACION;38376 - Evaluar requisitos de la solución de software;592376 - 03 DESARROLLAR PROCESOS LÓGICOS CON ALGORITMOS;APROBADO;;16/06/2026 8.43 a;CC 77096228 - WALTER ENRIQUE OLIVERA MENESES;;;
CC;1016714029;VICTOR SANTIAGO;DIAZ VEGA;EN FORMACION;38392 - Establecer requisitos de la solución de software;593344 - 02 RECOLECTAR INFORMACIÓN DEL SOFTWARE A CONSTRUIR;APROBADO;;08/12/2025 7.51 a;CC 51776671 - LINLEY CATALINA MOSCOTE MORON;;;
CC;1016714029;VICTOR SANTIAGO;DIAZ VEGA;EN FORMACION;38560 - Razonar cuantitativamente en contextos laborales;593255 - 03 RESOLVER PROBLEMAS MATEMÁTICOS;APROBADO;;11/12/2025 13.26 a;CC 77182530 - FELIX JAVIER VILLERO MAESTRE;;;
CC;1016714029;VICTOR SANTIAGO;DIAZ VEGA;EN FORMACION;38561 - Gestionar procesos de cultura emprendedora;593259 - 02 CARACTERIZAR LA IDEA DE NEGOCIO;APROBADO;;23/07/2026 22.40 a;CC 1067717980 - MALORY LAYN MERCADO TRESPALACIOS;;;
CC;1046397776;JERSON;URIETA GUIRAL;EN FORMACION;36180 - Enrique Low Murtra-Interactuar en el contexto productivo y social;593147 - 02 ESTABLECER RELACIONES DE CRECIMIENTO PERSONAL;APROBADO;;01/10/2025 7.57 a;CC 12495918 - ALFREDO GARCIA MANDON;;;
CC;1046397776;JERSON;URIETA GUIRAL;EN FORMACION;38392 - Establecer requisitos de la solución de software;593346 - 01 CARACTERIZAR LOS PROCESOS DE LA ORGANIZACIÓN;APROBADO;;20/09/2025 9.16 a;CC 51776671 - LINLEY CATALINA MOSCOTE MORON;;;
CC;1062404286;ANDRES DAVID;BARROS HERNANDEZ;EN FORMACION;36182 - Resultado de Aprendizaje de la Inducción;593343 - 01 IDENTIFICAR LA DINÁMICA ORGANIZACIONAL;APROBADO;;05/08/2025 11.53 a;CC 9271250 - JULIAN ERNESTO TRESPALACIOS TORRES;;;
CC;1064110749;ALLAN ADRIAN;CONTRERAS CASTILLO;EN FORMACION;38368 - DESARROLLAR LA SOLUCIÓN DE SOFTWARE;593106 - 01 PLANEAR ACTIVIDADES DE CONSTRUCCIÓN;APROBADO;;11/06/2026 10.17 a;CC 12435718 - JOSE DAVID MONTESINO HOYOS;;;
CC;1065202487;KAROL YULIANA;ARDILA OSORIA;RETIRO VOLUNTARIO;36180 - Enrique Low Murtra-Interactuar en el contexto productivo y social;593147 - 02 ESTABLECER RELACIONES;APROBADO;;01/10/2025 7.57 a;CC 12495918 - ALFREDO GARCIA MANDON;;;
CC;1065203255;DILAN DAVID;RODRIGUEZ OVALLE;EN FORMACION;38362 - Diseñar la solución de software de acuerdo con procedimientos;593100 - 03 DETERMINAR CARACTERÍSTICAS DE INTERFAZ;APROBADO;;17/04/2026 17.57 a;CC 12435718 - JOSE DAVID MONTESINO HOYOS;;;
CC;1065589699;OSNEIDER RAFAEL;FUENTES PADILLA;EN FORMACION;38392 - Establecer requisitos de la solución de software;593345 - 04 VALIDAR EL INFORME DE REQUISITOS;APROBADO;;07/04/2026 11.15 a;CC 49695123 - BEVERLYS ROMERO ZAMBRANO;;;
CC;1065602859;CALET SANTIAGO;CANTILLO ARCIA;EN FORMACION;38367 - Estructurar propuesta técnica de servicio TI;593060 - 01 DEFINIR ESPECIFICACIONES TÉCNICAS;APROBADO;;16/04/2026 9.43 a;CC 49606707 - KARINA PAOLA MEZA RESTREPO;;;
CC;1065613259;JANER MIGUEL;OSORIO CHIQUILLO;EN FORMACION;38376 - Evaluar requisitos de la solución de software;592376 - 03 DESARROLLAR PROCESOS LÓGICOS CON ALGORITMOS;APROBADO;;16/06/2026 8.43 a;CC 77096228 - WALTER ENRIQUE OLIVERA MENESES;;;
CC;1066866077;JUAN DANIEL;LEMUS NIETO;EN FORMACION;38392 - Establecer requisitos de la solución de software;593347 - 03 ESTABLECER LOS REQUISITOS DEL SOFTWARE;APROBADO;;08/12/2025 7.44 a;CC 51776671 - LINLEY CATALINA MOSCOTE MORON;;;
CC;1067596444;DEIBIS ALEJANDRO;VEGA GALEZZO;EN FORMACION;38561 - Gestionar procesos de cultura emprendedora;593259 - 02 CARACTERIZAR LA IDEA DE NEGOCIO;APROBADO;;23/07/2026 22.40 a;CC 1067717980 - MALORY LAYN MERCADO TRESPALACIOS;;;
CC;1067711288;KEVIN DAVID;DIAZ MEJIA;RETIRO VOLUNTARIO;36180 - Enrique Low Murtra-Interactuar en el contexto productivo y social;593147 - 02 ESTABLECER RELACIONES;APROBADO;;01/10/2025 7.57 a;CC 12495918 - ALFREDO GARCIA MANDON;;;
CC;1067716390;YELITZA;HOMES ARMENTA;EN FORMACION;38368 - DESARROLLAR LA SOLUCIÓN DE SOFTWARE;593106 - 01 PLANEAR ACTIVIDADES DE CONSTRUCCIÓN;APROBADO;;11/06/2026 10.17 a;CC 12435718 - JOSE DAVID MONTESINO HOYOS;;;
TI;1067719189;BLEIDYS JHOJANA;MEJIA SANCHEZ;RETIRO VOLUNTARIO;36180 - Enrique Low Murtra-Interactuar en el contexto productivo y social;593147 - 02 ESTABLECER RELACIONES;APROBADO;;01/10/2025 7.57 a;CC 12495918 - ALFREDO GARCIA MANDON;;;
CC;1067811143;HEILIN JOHANA;ITURRIAGO SALGADO;RETIRO VOLUNTARIO;36180 - Enrique Low Murtra-Interactuar en el contexto productivo y social;593147 - 02 ESTABLECER RELACIONES;APROBADO;;01/10/2025 7.57 a;CC 12495918 - ALFREDO GARCIA MANDON;;;
CC;1081000167;LUIS MIGUEL;ARRIETA CERVANTES;EN FORMACION;38362 - Diseñar la solución de software de acuerdo con procedimientos;593100 - 03 DETERMINAR CARACTERÍSTICAS DE INTERFAZ;APROBADO;;17/04/2026 17.57 a;CC 12435718 - JOSE DAVID MONTESINO HOYOS;;;
CC;1081001900;JOSE CARLOS;RODRIGUEZ PERTUZ;EN FORMACION;38362 - Diseñar la solución de software de acuerdo con procedimientos;593101 - 02 ESTRUCTURAR EL MODELO DE DATOS;APROBADO;;16/04/2026 10.36 a;CC 77096228 - WALTER ENRIQUE OLIVERA MENESES;;;
CC;1082492231;MANUEL JOSE;MOLINA FIERRO;EN FORMACION;38367 - Estructurar propuesta técnica de servicio TI;593060 - 01 DEFINIR ESPECIFICACIONES TÉCNICAS;APROBADO;;16/04/2026 9.43 a;CC 49606707 - KARINA PAOLA MEZA RESTREPO;;;
CC;1085227396;JOEL DAVID;ALDANA BERMUDEZ;EN FORMACION;38376 - Evaluar requisitos de la solución de software;592376 - 03 DESARROLLAR PROCESOS LÓGICOS CON ALGORITMOS;APROBADO;;16/06/2026 8.43 a;CC 77096228 - WALTER ENRIQUE OLIVERA MENESES;;;
TI;1097499211;CARLOS MANUEL;PEDRAZA SERRANO;EN FORMACION;38368 - DESARROLLAR LA SOLUCIÓN DE SOFTWARE;593106 - 01 PLANEAR ACTIVIDADES DE CONSTRUCCIÓN;APROBADO;;11/06/2026 10.17 a;CC 12435718 - JOSE DAVID MONTESINO HOYOS;;;
CC;1110476900;JOSE EDWIN;MAHECHA GUZMAN;EN FORMACION;38560 - Razonar cuantitativamente en contextos laborales;593255 - 03 RESOLVER PROBLEMAS MATEMÁTICOS;APROBADO;;11/12/2025 13.26 a;CC 77182530 - FELIX JAVIER VILLERO MAESTRE;;;
CC;1121329261;LUIFRANK;LOPEZ ACOSTA;EN FORMACION;38362 - Diseñar la solución de software de acuerdo con procedimientos;593100 - 03 DETERMINAR CARACTERÍSTICAS DE INTERFAZ;APROBADO;;17/04/2026 17.57 a;CC 12435718 - JOSE DAVID MONTESINO HOYOS;;;
CC;1193045594;LILI ROSA;ROMERO PUENTE;EN FORMACION;38392 - Establecer requisitos de la solución de software;593347 - 03 ESTABLECER LOS REQUISITOS DEL SOFTWARE;APROBADO;;07/04/2026 11.16 a;CC 49695123 - BEVERLYS ROMERO ZAMBRANO;;;
PPT;1258678;YEISON ENRIQUE;CHACIN OCANDO;EN FORMACION;38368 - DESARROLLAR LA SOLUCIÓN DE SOFTWARE;593106 - 01 PLANEAR ACTIVIDADES DE CONSTRUCCIÓN;APROBADO;;11/06/2026 10.17 a;CC 12435718 - JOSE DAVID MONTESINO HOYOS;;;
CC;77172475;IADER;TORRES BARROS;EN FORMACION;38362 - Diseñar la solución de software de acuerdo con procedimientos;593100 - 03 DETERMINAR CARACTERÍSTICAS DE INTERFAZ;APROBADO;;17/04/2026 17.57 a;CC 12435718 - JOSE DAVID MONTESINO HOYOS;;;
`,
    `Reporte_Juicios_SofiaPlus_${fichaNumero}.xls`
  );

  return res.reporte!;
}
