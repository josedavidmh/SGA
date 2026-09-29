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
 * Lee un archivo File de navegador o string y procesa el reporte de SofiaPlus
 */
export async function procesarJuiciosEvaluativosExcel(
  archivo: File | string,
  nombreArchivo: string = 'Reporte_Juicios_Evaluacion.xls'
): Promise<ResultadoProcesamientoJuicios> {
  const advertencias: string[] = [];

  try {
    let lineasTexto: string[] = [];

    if (typeof archivo === 'string') {
      lineasTexto = archivo.split(/\r?\n/);
    } else {
      // Puede ser un archivo .xls binario o un archivo de texto delimitado por punto y coma con extensión .xls
      const arrayBuffer = await archivo.arrayBuffer();
      
      // Intentar primero leer como texto UTF-8 o Latin-1
      const decoder = new TextDecoder('utf-8');
      const textoUtf8 = decoder.decode(arrayBuffer);

      if (textoUtf8.includes('Reporte de Juicios') || textoUtf8.includes('Juicio de Evaluaci') || textoUtf8.includes('Tipo de Documento;')) {
        lineasTexto = textoUtf8.split(/\r?\n/);
      } else {
        // Intentar decodificar como ISO-8859-1
        const latinDecoder = new TextDecoder('iso-8859-1');
        const textoLatin = latinDecoder.decode(arrayBuffer);
        if (textoLatin.includes('Reporte de Juicios') || textoLatin.includes('Juicio de Evaluaci') || textoLatin.includes('Tipo de Documento;')) {
          lineasTexto = textoLatin.split(/\r?\n/);
        } else {
          // Intentar abrir con SheetJS
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const csvContent = XLSX.utils.sheet_to_csv(worksheet, { FS: ';' });
          lineasTexto = csvContent.split(/\r?\n/);
        }
      }
    }

    if (lineasTexto.length < 5) {
      return {
        exito: false,
        mensaje: 'El archivo está vacío o no contiene suficientes líneas de reporte de SofiaPlus.',
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
          advertencias: ['El archivo no tiene el formato esperado.']
        }
      };
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
      regional: 'REGIONAL CESAR',
      centroFormacion: 'CENTRO BIOTECNOLÓGICO DEL CARIBE'
    };

    let tableHeaderIndex = -1;

    for (let i = 0; i < Math.min(lineasTexto.length, 30); i++) {
      const linea = lineasTexto[i];
      const partes = linea.split(';').map(p => p.trim());

      const primeraCol = partes[0]?.toLowerCase() || '';

      if (primeraCol.includes('fecha del reporte')) {
        metadata.fechaReporte = partes.find((p, idx) => idx > 0 && p.length > 3) || metadata.fechaReporte;
      } else if (primeraCol.includes('ficha de caracterizaci')) {
        metadata.fichaNumero = partes.find((p, idx) => idx > 0 && /\d{6,8}/.test(p)) || partes[2] || partes[1] || '';
      } else if (primeraCol.includes('código') || primeraCol.includes('cgigo') || primeraCol.includes('codigo')) {
        metadata.programaCodigo = partes.find((p, idx) => idx > 0 && /\d{5,8}/.test(p)) || partes[2] || partes[1] || '';
      } else if (primeraCol.includes('versión') || primeraCol.includes('version')) {
        metadata.version = partes.find((p, idx) => idx > 0 && p.length > 0) || '1';
      } else if (primeraCol.includes('denominaci')) {
        metadata.programaDenominacion = limpiarTextoEncoding(partes.find((p, idx) => idx > 0 && p.length > 3) || '');
      } else if (primeraCol.includes('estado de la ficha')) {
        metadata.estadoFicha = partes.find((p, idx) => idx > 0 && p.length > 2) || 'EN EJECUCION';
      } else if (primeraCol.includes('fecha inicio')) {
        metadata.fechaInicio = partes.find((p, idx) => idx > 0 && p.length > 4) || '';
      } else if (primeraCol.includes('fecha fin')) {
        metadata.fechaFin = partes.find((p, idx) => idx > 0 && p.length > 4) || '';
      } else if (primeraCol.includes('modalidad')) {
        metadata.modalidad = partes.find((p, idx) => idx > 0 && p.length > 3) || 'PRESENCIAL';
      } else if (primeraCol.includes('regional')) {
        metadata.regional = limpiarTextoEncoding(partes.find((p, idx) => idx > 0 && p.length > 2) || '');
      } else if (primeraCol.includes('centro de formaci')) {
        metadata.centroFormacion = limpiarTextoEncoding(partes.find((p, idx) => idx > 0 && p.length > 3) || '');
      }

      // Detectar la fila de encabezados de la tabla de aprendices
      if (
        partes.some(p => p.toLowerCase().includes('documento')) &&
        partes.some(p => p.toLowerCase().includes('resultado de aprendizaje') || p.toLowerCase().includes('competencia'))
      ) {
        tableHeaderIndex = i;
        break;
      }
    }

    if (tableHeaderIndex === -1) {
      // Intentar buscar "Tipo de Documento" en cualquier fila
      tableHeaderIndex = lineasTexto.findIndex(l => 
        l.toLowerCase().includes('tipo de documento') || 
        (l.toLowerCase().includes('documento') && l.toLowerCase().includes('juicio'))
      );
    }

    if (tableHeaderIndex === -1) {
      return {
        exito: false,
        mensaje: 'No se encontró la cabecera de datos de aprendices y juicios evaluativos en el archivo.',
        detalles: {
          fichaNumero: metadata.fichaNumero,
          programaCodigo: metadata.programaCodigo,
          programaNombre: metadata.programaDenominacion,
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
          advertencias: ['Falta la tabla de aprendices con columnas Tipo de Documento, Competencia y Juicio de Evaluación.']
        }
      };
    }

    // 2. Mapear Índices de Columnas
    const headers = lineasTexto[tableHeaderIndex].split(';').map(h => h.trim().toLowerCase());
    
    let colTipoDoc = headers.findIndex(h => h.includes('tipo de doc') || h === 'tipo documento');
    let colNumDoc = headers.findIndex(h => h.includes('nmero de doc') || h.includes('numero de doc') || h.includes('número de doc') || h.includes('documento'));
    let colNombre = headers.findIndex(h => h === 'nombre' || h.includes('nombres'));
    let colApellidos = headers.findIndex(h => h.includes('apellido'));
    let colEstado = headers.findIndex(h => h === 'estado' || h.includes('estado'));
    let colComp = headers.findIndex(h => h.includes('competencia'));
    let colRap = headers.findIndex(h => h.includes('resultado de aprendizaje') || h.includes('rap'));
    let colJuicio = headers.findIndex(h => h.includes('juicio de evaluaci') || h.includes('juicio'));
    let colFechaJuicio = headers.findIndex(h => h.includes('fecha y hora') || h.includes('fecha'));
    let colFuncionario = headers.findIndex(h => h.includes('funcionario') || h.includes('instructor') || h.includes('registro el juicio'));

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

    // 3. Procesar Filas de Aprendices y Juicios
    const aprendicesMap = new Map<string, AprendizJuicio>();
    const competenciasEvaluadasMap = new Map<string, { total: number; aprobados: number; porEvaluar: number }>();
    
    let totalFilasValidas = 0;
    let totalJuiciosAprobados = 0;
    let totalJuiciosPorEvaluar = 0;

    for (let r = tableHeaderIndex + 1; r < lineasTexto.length; r++) {
      const rawLine = lineasTexto[r];
      if (!rawLine || rawLine.trim() === '') continue;

      const cols = rawLine.split(';').map(c => c.trim());
      const numDoc = cols[colNumDoc];

      if (!numDoc || numDoc.length < 4 || numDoc.toLowerCase().includes('documento')) {
        continue;
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

      const fechaJuicio = cols[colFechaJuicio] || '';
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
      fichaNumero: metadata.fichaNumero || '3235106',
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
Regional:;;20 - REGIONAL CESAR;;;;;;;;;;;
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
Regional:;;20 - REGIONAL CESAR;;;;;;;;;;;
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
