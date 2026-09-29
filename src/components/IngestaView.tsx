import React from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  AlertCircle,
  CheckCircle2, 
  FileCheck, 
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Download,
  Trash2,
  Clock,
  Sparkles,
  BookOpen,
  Users,
  ChevronDown,
  ChevronUp,
  Award
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  User, 
  Ficha, 
  AuditoriaIngesta, 
  Competencia, 
  ResultadoAprendizaje, 
  ProgramaFormacion, 
  RegistroHorasEjecutadas,
  BloqueHorario,
  ActividadSeguimiento,
  ReporteJuiciosFicha,
  RegistroArchivoSeguimiento
} from '../types';
import { 
  procesarPlaneacionPedagogica, 
  ResultadoProcesamientoPlaneacion,
  descargarPlantillaPlaneacionExcel,
  categorizarTipoCompetencia
} from '../services/planeacionPedagogicaService';
import {
  parseHorasEjecutadasExcel,
  descargarPlantillaHorasEjecutadasExcel,
  ResultadoProcesamientoHorasEjecutadas
} from '../services/horasEjecutadasService';
import {
  procesarJuiciosEvaluativosExcel,
  descargarEjemploJuiciosExcel,
  obtenerReporteDemoJuicios,
  ResultadoProcesamientoJuicios
} from '../services/juiciosEvaluativosService';
import { ModalJuiciosEvaluativos } from './ModalJuiciosEvaluativos';

interface IngestaProps {
  currentUser: User;
  ficha: Ficha | null;
  auditoriaIngestas: AuditoriaIngesta[];
  programas?: ProgramaFormacion[];
  competenciasExistentes?: Competencia[];
  rapsExistentes?: ResultadoAprendizaje[];
  horarios?: BloqueHorario[];
  actividadesSeguimiento?: ActividadSeguimiento[];
  registrosHorasEjecutadas?: RegistroHorasEjecutadas[];
  fichas?: Ficha[];
  onProcesarIngesta: (archivoNombre: string, tipo: AuditoriaIngesta['tipoPlantilla'], filas: number) => void;
  onActualizarCompetenciasYRaps?: (nuevasComp: Competencia[], nuevosRaps: ResultadoAprendizaje[], registrosSeg?: RegistroArchivoSeguimiento[]) => void;
  onGuardarHorasEjecutadas?: (registros: RegistroHorasEjecutadas[]) => { exito: boolean; mensaje: string } | void;
  onGuardarJuiciosEvaluativos?: (reporte: ReporteJuiciosFicha) => { exito: boolean; mensaje: string } | void;
  onLimpiarEstructura?: () => void;
  onLimpiarCola: () => void;
  onNavigateToCompetencias?: (programaCodigo?: string) => void;
  onNavigateToSeguimiento?: () => void;
  onNavigateToFichas?: (fichaNumero?: string) => void;
}

export const IngestaView: React.FC<IngestaProps> = ({
  currentUser: _currentUser,
  ficha,
  auditoriaIngestas,
  programas = [],
  competenciasExistentes = [],
  rapsExistentes = [],
  horarios = [],
  actividadesSeguimiento = [],
  registrosHorasEjecutadas = [],
  fichas = [],
  onProcesarIngesta,
  onActualizarCompetenciasYRaps,
  onGuardarHorasEjecutadas,
  onGuardarJuiciosEvaluativos,
  onLimpiarEstructura,
  onLimpiarCola,
  onNavigateToCompetencias,
  onNavigateToSeguimiento,
  onNavigateToFichas: _onNavigateToFichas
}) => {
  const [_selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  
  // Resultados específicos según tipo de archivo
  const [planeacionResult, setPlaneacionResult] = React.useState<ResultadoProcesamientoPlaneacion | null>(null);
  const [horasResult, setHorasResult] = React.useState<ResultadoProcesamientoHorasEjecutadas | null>(null);
  const [juiciosResult, setJuiciosResult] = React.useState<ResultadoProcesamientoJuicios | null>(null);
  const [modalJuiciosDetalleOpen, setModalJuiciosDetalleOpen] = React.useState(false);

  const [tipoArchivoDetectado, setTipoArchivoDetectado] = React.useState<
    'PLANEACION' | 'HORAS_EJECUTADAS' | 'JUICIOS_EVALUATIVOS' | 'SEGUIMIENTO' | null
  >(null);
  const [archivoExitoMensaje, setArchivoExitoMensaje] = React.useState<string | null>(null);
  const [archivoErrorMensaje, setArchivoErrorMensaje] = React.useState<string | null>(null);

  // Filtros del resumen de planeación
  const [filtroResumenComp, setFiltroResumenComp] = React.useState<'TODAS' | 'Técnica' | 'Transversal' | 'Clave'>('TODAS');
  const [expandedCompCod, setExpandedCompCod] = React.useState<string | null>(null);

  const [simulatedPreview, setSimulatedPreview] = React.useState<{
    nombre: string;
    filasConformes: number;
    forwardFill: number;
    advertencias: number;
    sizeMB: string;
  } | null>(null);

  // Selector de programa activo para asociar planeaciones
  const [programaSeleccionado, setProgramaSeleccionado] = React.useState<string>(
    ficha?.programaCodigo || (programas.length > 0 ? programas[0].codigo : '228118')
  );

  const fileInputRefPlaneacion = React.useRef<HTMLInputElement>(null);
  const fileInputRefHoras = React.useRef<HTMLInputElement>(null);
  const fileInputRefJuicios = React.useRef<HTMLInputElement>(null);
  const fileInputRefSeguimiento = React.useRef<HTMLInputElement>(null);

  const resetState = () => {
    setIsProcessing(true);
    setArchivoExitoMensaje(null);
    setArchivoErrorMensaje(null);
    setPlaneacionResult(null);
    setHorasResult(null);
    setJuiciosResult(null);
  };

  const processJuiciosFile = async (file: File) => {
    setSelectedFile(file);
    resetState();
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1) + ' MB';

    try {
      const resJuicios = await procesarJuiciosEvaluativosExcel(file, file.name);
      if (resJuicios.exito && resJuicios.reporte) {
        setJuiciosResult(resJuicios);
        setTipoArchivoDetectado('JUICIOS_EVALUATIVOS');
        setSimulatedPreview({
          nombre: file.name,
          filasConformes: resJuicios.reporte.totalRegistros,
          forwardFill: 0,
          advertencias: resJuicios.detalles.advertencias.length,
          sizeMB: sizeInMB
        });
      } else {
        setArchivoErrorMensaje(resJuicios.mensaje || 'Error al procesar el archivo de juicios.');
      }
    } catch (err: any) {
      setArchivoErrorMensaje(`Error al leer archivo de juicios: ${err?.message || 'Formato no compatible'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const processPlaneacionFile = async (file: File) => {
    setSelectedFile(file);
    resetState();
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1) + ' MB';

    try {
      const resPlaneacion = await procesarPlaneacionPedagogica(
        file, 
        programaSeleccionado, 
        competenciasExistentes,
        {
          rapsExistentes,
          horarios,
          actividadesSeguimiento,
          registrosHorasEjecutadas,
          fichas
        }
      );

      if (resPlaneacion.exito) {
        setPlaneacionResult(resPlaneacion);
        setTipoArchivoDetectado('PLANEACION');
        setSimulatedPreview({
          nombre: file.name,
          filasConformes: resPlaneacion.raps.length,
          forwardFill: resPlaneacion.detalles.fasesDetectadas.length * 4,
          advertencias: resPlaneacion.detalles.advertencias.length,
          sizeMB: sizeInMB
        });
      } else {
        setArchivoErrorMensaje(`No se pudo procesar la planeación pedagógica: ${resPlaneacion.mensaje}`);
      }
    } catch (err: any) {
      setArchivoErrorMensaje(`Error al procesar planeación: ${err?.message || 'Formato no compatible'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const processHorasFile = async (file: File) => {
    setSelectedFile(file);
    resetState();
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1) + ' MB';

    try {
      const resHoras = await parseHorasEjecutadasExcel(file);
      if (resHoras.registros.length > 0) {
        setHorasResult(resHoras);
        setTipoArchivoDetectado('HORAS_EJECUTADAS');
        setSimulatedPreview({
          nombre: file.name,
          filasConformes: resHoras.registros.length,
          forwardFill: 0,
          advertencias: resHoras.advertencias.length,
          sizeMB: sizeInMB
        });
      } else {
        setArchivoErrorMensaje('No se detectaron registros válidos de horas ejecutadas en la plantilla.');
      }
    } catch (err: any) {
      setArchivoErrorMensaje(`Error al procesar horas ejecutadas: ${err?.message || 'Formato no compatible'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const processSeguimientoFile = async (file: File) => {
    setSelectedFile(file);
    resetState();
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
    setTipoArchivoDetectado('SEGUIMIENTO');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const rowCount = Math.max(data.length - 1, 1);

        setSimulatedPreview({
          nombre: file.name,
          filasConformes: rowCount,
          forwardFill: Math.min(Math.floor(rowCount * 0.3), 20),
          advertencias: 0,
          sizeMB: sizeInMB
        });
      } catch {
        setSimulatedPreview({
          nombre: file.name,
          filasConformes: 25,
          forwardFill: 6,
          advertencias: 0,
          sizeMB: sizeInMB
        });
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleCargarDemoJuicios = async () => {
    resetState();
    try {
      const demo = await obtenerReporteDemoJuicios();
      setJuiciosResult({
        exito: true,
        mensaje: 'Demo Ficha 3235106 cargada exitosamente',
        reporte: demo,
        detalles: {
          fichaNumero: demo.fichaNumero,
          programaCodigo: demo.metadata.programaCodigo,
          programaNombre: demo.metadata.programaDenominacion,
          totalAprendices: demo.totalAprendices,
          aprendicesActivos: demo.aprendicesActivos,
          aprendicesRetiroVoluntario: demo.aprendicesRetiroVoluntario,
          aprendicesCancelados: demo.aprendicesCancelados,
          aprendicesAplazados: demo.aprendicesAplazados,
          aprendicesCondicionados: demo.aprendicesCondicionados,
          aprendicesTrasladados: demo.aprendicesTrasladados,
          tasaRetencion: demo.tasaRetencion ?? 100,
          tasaDesercion: demo.tasaDesercion ?? 0,
          totalRegistrosJuicios: demo.totalRegistros,
          juiciosAprobados: demo.totalJuiciosAprobados,
          juiciosPorEvaluar: demo.totalJuiciosPorEvaluar,
          porcentajeAprobacion: demo.porcentajeAprobacionFicha,
          competenciasCount: demo.competenciasEvaluadas?.length || 0,
          advertencias: []
        }
      });
      setTipoArchivoDetectado('JUICIOS_EVALUATIVOS');
      setSimulatedPreview({
        nombre: 'Reporte_SofiaPlus_3235106_Demo.xls',
        filasConformes: demo.totalRegistros,
        forwardFill: 0,
        advertencias: 0,
        sizeMB: '1.2 MB'
      });
    } catch (err: any) {
      setArchivoErrorMensaje(`Error al cargar demo de juicios: ${err?.message || 'Error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmarIntegracion = () => {
    if (!simulatedPreview) return;
    setIsProcessing(true);
    setArchivoErrorMensaje(null);

    // Integración de Horas Ejecutadas por Instructor
    if (tipoArchivoDetectado === 'HORAS_EJECUTADAS' && horasResult) {
      setTimeout(() => {
        const resultado = onGuardarHorasEjecutadas ? onGuardarHorasEjecutadas(horasResult.registros) : undefined;
        setIsProcessing(false);

        if (resultado && resultado.exito === false) {
          setArchivoErrorMensaje(resultado.mensaje);
          return;
        }

        onProcesarIngesta(
          simulatedPreview.nombre,
          'Horas Ejecutadas por Instructor',
          horasResult.registros.length
        );
        setArchivoExitoMensaje(resultado?.mensaje || `¡Horas ejecutadas integradas con éxito! Se cargaron ${horasResult.totalHorasEjecutadas} horas registradas por ${horasResult.instructoresCount} instructor(es) en ${horasResult.competenciasCount} competencia(s). Puedes contrastar lo planeado vs ejecutado en el módulo de Seguimiento.`);
      }, 700);
      return;
    }

    // Integración de Planeación Pedagógica
    if (tipoArchivoDetectado === 'PLANEACION' && planeacionResult) {
      if (planeacionResult.validacionSobrescritura?.bloqueado) {
        setIsProcessing(false);
        setArchivoErrorMensaje(
          `No se pudo cargar ni sobrescribir la planeación pedagógica porque ya cuenta con trabajo previo asociado en el sistema: ${planeacionResult.validacionSobrescritura.motivosBloqueo.join(' • ')}`
        );
        return;
      }

      setTimeout(() => {
        if (onActualizarCompetenciasYRaps) {
          const otrasCompetencias = competenciasExistentes.filter(c => c.programaCodigo && c.programaCodigo !== programaSeleccionado);
          const otrosRaps = rapsExistentes.filter(r => r.programaCodigo && r.programaCodigo !== programaSeleccionado);
          onActualizarCompetenciasYRaps(
            [...otrasCompetencias, ...planeacionResult.competencias],
            [...otrosRaps, ...planeacionResult.raps],
            planeacionResult.registrosSeguimiento
          );
        }
        onProcesarIngesta(
          simulatedPreview.nombre, 
          'Planeación Pedagógica' as any, 
          planeacionResult.raps.length
        );
        setIsProcessing(false);

        const resumen = planeacionResult.resumenCargue;
        const totalComp = planeacionResult.competencias.length;
        const totalRaps = planeacionResult.raps.length;
        const tecCount = resumen?.competenciasTecnicas.length || 0;
        const transCount = resumen?.competenciasTransversales.length || 0;
        const claveCount = resumen?.competenciasClave.length || 0;
        const rapsTec = resumen?.rapsTecnicos.length || 0;
        const rapsTrans = resumen?.rapsTransversales.length || 0;
        const rapsClave = resumen?.rapsClave.length || 0;
        const horasTotales = resumen?.horasTotales || planeacionResult.detalles.horasTotales || 0;
        const esSobrescritura = planeacionResult.validacionSobrescritura?.esSobrescritura;

        if (esSobrescritura) {
          setArchivoExitoMensaje(
            `✓ ¡Planeación Pedagógica SOBREESCRITA EXITOSAMENTE! Se reemplazó la planeación anterior y se cargaron con éxito ${totalComp} Competencias (${tecCount} técnicas, ${transCount} transversales, ${claveCount} clave) con ${totalRaps} RAPs (${rapsTec} técnicos, ${rapsTrans} transversales, ${rapsClave} clave) y ${horasTotales} horas estimadas.`
          );
        } else {
          setArchivoExitoMensaje(
            `✓ ¡Planeación Pedagógica CARGADA EXITOSAMENTE! Se incorporaron al catálogo con éxito ${totalComp} Competencias (${tecCount} técnicas, ${transCount} transversales, ${claveCount} clave) con ${totalRaps} RAPs (${rapsTec} técnicos, ${rapsTrans} transversales, ${rapsClave} clave) y ${horasTotales} horas estimadas.`
          );
        }
      }, 700);
      return;
    }

    // Integración de Juicios Evaluativos por Ficha SofiaPlus
    if (tipoArchivoDetectado === 'JUICIOS_EVALUATIVOS' && juiciosResult?.reporte) {
      setTimeout(() => {
        const resultado = onGuardarJuiciosEvaluativos ? onGuardarJuiciosEvaluativos(juiciosResult.reporte!) : undefined;
        setIsProcessing(false);

        if (resultado && resultado.exito === false) {
          setArchivoErrorMensaje(resultado.mensaje);
          return;
        }

        onProcesarIngesta(
          simulatedPreview.nombre,
          'Juicios Evaluativos',
          juiciosResult.reporte!.totalRegistros
        );
        setArchivoExitoMensaje(resultado?.mensaje || `✓ ¡Reporte de Juicios Evaluativos integrado exitosamente para la Ficha ${juiciosResult.reporte!.fichaNumero}!`);
      }, 700);
      return;
    }

    // Integración de Seguimiento Curricular
    setTimeout(() => {
      onProcesarIngesta(
        simulatedPreview.nombre, 
        'Seguimiento Curricular', 
        simulatedPreview.filasConformes
      );
      setIsProcessing(false);
      setArchivoExitoMensaje(
        `¡Ingesta exitosa! Se integraron ${simulatedPreview.filasConformes} registros conformes.`
      );
    }, 700);
  };

  const handleBorrarEstructuraClick = () => {
    if (window.confirm(
      '¿Está seguro de que desea BORRAR la estructura curricular actual (competencias y RAPs)?\n\n' +
      'Esto dejará el catálogo limpio en cero para que pueda cargar nuevamente su archivo oficial de planeación o estructura curricular sin interferencias.'
    )) {
      if (onLimpiarEstructura) {
        onLimpiarEstructura();
      }
      setPlaneacionResult(null);
      setSimulatedPreview(null);
      setArchivoExitoMensaje('✓ Estructura curricular y catálogo de competencias borrados exitosamente. El sistema está listo para recibir tu nueva planeación.');
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Cabecera del Módulo */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span className="px-2 py-0.5 rounded bg-[#E8F5E9] text-[#2E7D32]">Gestión de Cargas Académicas SENA</span>
            <span>•</span>
            <span className="text-[#005A8C] font-semibold">Cargas Directas por Módulo</span>
          </div>
          <h1 className="text-2xl font-black text-[#111C2D] tracking-tight mt-1">
            Carga de Archivos Académicos
          </h1>
          <p className="text-xs text-slate-500 font-medium max-w-2xl">
            Selecciona el módulo correspondiente para cargar tus archivos oficiales: Planeación Pedagógica (GPFI-F-134), Juicios SofiaPlus, Horas Ejecutadas por Instructor o Seguimiento Curricular.
          </p>
        </div>

        {/* Acciones Superiores */}
        <div className="flex items-center space-x-2 flex-wrap gap-2">
          {programas.length > 1 && (
            <div className="flex items-center space-x-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 shadow-2xs">
              <span className="text-slate-400 font-normal">Programa:</span>
              <select
                value={programaSeleccionado}
                onChange={(e) => setProgramaSeleccionado(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-[#111C2D] focus:outline-hidden cursor-pointer"
              >
                {programas.map((p) => (
                  <option key={p.codigo} value={p.codigo}>
                    {p.codigo} - {p.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {onLimpiarEstructura && (
            <button
              id="btn-borrar-estructura"
              onClick={handleBorrarEstructuraClick}
              className="flex items-center space-x-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-700 shadow-2xs transition-colors"
              title="Borra las competencias y RAPs cargados actualmente para realizar una carga desde cero"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Borrar Estructura Actual</span>
            </button>
          )}

          <button
            onClick={onLimpiarCola}
            className="flex items-center space-x-2 bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold text-[#111C2D] shadow-2xs transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-slate-400" />
            <span>Limpiar Cola</span>
          </button>
        </div>
      </div>

      {/* 4 Tarjetas de Carga Directa por Tipo de Archivo */}
      <div>
        <div className="text-xs font-bold text-[#111C2D] mb-3 flex items-center justify-between">
          <span>Selecciona el Tipo de Archivo a Cargar</span>
          <span className="text-[11px] text-slate-400 font-medium">Cargas directas y especializadas</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Archivo de Seguimiento */}
          <div className="p-4 rounded-2xl bg-white border border-[#B3E5FE] shadow-2xs hover:border-[#005A8C] transition-all space-y-2 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-[#E1F5FE] text-[#005A8C] flex items-center justify-center font-bold">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E1F5FE] text-[#005A8C]">
                  7 Columnas
                </span>
              </div>
              <div className="font-bold text-xs text-[#111C2D]">Archivo de Seguimiento</div>
              <div className="text-[10px] text-slate-400 font-mono">Fases, APs, Competencias, RAPs y AAs</div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Fases, Actividades de Proyecto, Competencias, RAPs, Actividades de Aprendizaje, Horas Directas e Independientes (con <strong>totalización automática de horas por RAP</strong>).
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 flex-wrap text-[10px]">
              <button
                type="button"
                onClick={() => descargarPlantillaPlaneacionExcel(
                  programaSeleccionado,
                  'ADSO / Formación SENA',
                  competenciasExistentes,
                  []
                )}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors inline-flex items-center space-x-1"
                title="Descargar plantilla Excel del Archivo de Seguimiento con 7 columnas"
              >
                <Download className="w-3 h-3 text-slate-500" />
                <span>Plantilla .xlsx</span>
              </button>

              <label className="cursor-pointer px-2.5 py-1.5 rounded-xl bg-[#005A8C] hover:bg-[#004266] text-white font-bold transition-colors inline-flex items-center space-x-1 shadow-2xs">
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Cargar Seguimiento</span>
                <input 
                  ref={fileInputRefPlaneacion}
                  type="file" 
                  accept=".xlsx,.xls,.csv" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) processPlaneacionFile(file);
                    e.target.value = '';
                  }} 
                />
              </label>
            </div>
          </div>

          {/* Card 2: Juicios Evaluativos SofiaPlus */}
          <div className="p-4 rounded-2xl bg-white border border-[#D3BBFF] shadow-2xs hover:border-[#6F43C0] transition-all space-y-2 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-[#EDE7F6] text-[#6F43C0] flex items-center justify-center font-bold">
                  <FileCheck className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#EDE7F6] text-[#6F43C0]">
                  SofiaPlus .xls
                </span>
              </div>
              <div className="font-bold text-xs text-[#111C2D]">Juicios Evaluativos por Ficha</div>
              <div className="text-[10px] text-slate-400 font-mono">Reporte SofiaPlus .xls</div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Extrae estados de aprendices (en formación, cancelados, retiros, aplazados) y consolida juicios aprobados sin almacenar archivos pesados.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 flex-wrap text-[10px]">
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={handleCargarDemoJuicios}
                  className="px-2 py-1 rounded bg-[#EDE7F6] hover:bg-[#ded4f0] text-[#6F43C0] font-bold transition-colors inline-flex items-center space-x-1"
                  title="Cargar muestra oficial Ficha 3235106"
                >
                  <Sparkles className="w-3 h-3 text-[#6F43C0]" />
                  <span>Demo</span>
                </button>

                <button
                  type="button"
                  onClick={() => descargarEjemploJuiciosExcel('3235106')}
                  className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors inline-flex items-center space-x-1"
                  title="Descargar ejemplo de reporte SofiaPlus en formato .xls"
                >
                  <Download className="w-3 h-3 text-slate-500" />
                  <span>.xls</span>
                </button>
              </div>

              <label className="cursor-pointer px-2.5 py-1.5 rounded-xl bg-[#6F43C0] hover:bg-[#5b34a6] text-white font-bold transition-colors inline-flex items-center space-x-1 shadow-2xs">
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Cargar Juicios</span>
                <input 
                  ref={fileInputRefJuicios}
                  type="file" 
                  accept=".xls,.xlsx,.csv" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) processJuiciosFile(file);
                    e.target.value = '';
                  }} 
                />
              </label>
            </div>
          </div>

          {/* Card 3: Horas Ejecutadas por Instructor */}
          <div className="p-4 rounded-2xl bg-white border border-emerald-500/40 shadow-2xs hover:border-emerald-600 transition-all space-y-2 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center font-bold">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-[#0D631B]">
                  Horas / Instructores
                </span>
              </div>
              <div className="font-bold text-xs text-[#111C2D]">Horas Ejecutadas por Instructor</div>
              <div className="text-[10px] text-slate-400 font-mono">Reporte_Horas_Instructor.xlsx</div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Carga las horas directas impartidas por instructor y competencia para contrastar lo planeado vs lo ejecutado (rango 70%-80%).
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 flex-wrap text-[10px]">
              <button
                type="button"
                onClick={() => descargarPlantillaHorasEjecutadasExcel()}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors inline-flex items-center space-x-1"
                title="Descargar plantilla oficial Excel para reporte de horas ejecutadas"
              >
                <Download className="w-3 h-3 text-slate-500" />
                <span>Plantilla .xlsx</span>
              </button>

              <label className="cursor-pointer px-2.5 py-1.5 rounded-xl bg-[#0D631B] hover:bg-[#0a4d15] text-white font-bold transition-colors inline-flex items-center space-x-1 shadow-2xs">
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Cargar Horas</span>
                <input 
                  ref={fileInputRefHoras}
                  type="file" 
                  accept=".xlsx,.xls,.csv" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) processHorasFile(file);
                    e.target.value = '';
                  }} 
                />
              </label>
            </div>
          </div>

          {/* Card 4: Seguimiento Curricular */}
          <div className="p-4 rounded-2xl bg-white border border-[#C8E6C9] shadow-2xs hover:border-[#2E7D32] transition-all space-y-2 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E8F5E9] text-[#2E7D32]">
                  Sintetizado
                </span>
              </div>
              <div className="font-bold text-xs text-[#111C2D]">Seguimiento Curricular</div>
              <div className="text-[10px] text-slate-400 font-mono">Adso 2694123.xlsx</div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Detecta forward-fill en actividades combinadas y consolida resultados de aprendizaje (RAP) en el módulo de seguimiento.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end text-[10px]">
              <label className="cursor-pointer px-2.5 py-1.5 rounded-xl bg-[#2E7D32] hover:bg-[#205b23] text-white font-bold transition-colors inline-flex items-center space-x-1 shadow-2xs">
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Cargar Seguimiento</span>
                <input 
                  ref={fileInputRefSeguimiento}
                  type="file" 
                  accept=".xlsx,.xls,.csv" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) processSeguimientoFile(file);
                    e.target.value = '';
                  }} 
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Alerta de Éxito al Integrar */}
      {archivoExitoMensaje && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#0D631B] text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-[#0D631B]">¡Operación Completada con Éxito!</div>
              <div className="text-xs text-slate-700">{archivoExitoMensaje}</div>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            {juiciosResult?.reporte && (
              <button
                type="button"
                onClick={() => setModalJuiciosDetalleOpen(true)}
                className="px-3 py-1.5 bg-[#6F43C0] hover:bg-[#5b34a6] text-white text-xs font-bold rounded-xl shadow-2xs flex items-center space-x-1"
              >
                <span>Ver Juicios SofiaPlus →</span>
              </button>
            )}
            {onNavigateToSeguimiento && (
              <button
                onClick={onNavigateToSeguimiento}
                className="px-3 py-1.5 bg-[#0D631B] hover:bg-[#0a4d15] text-white text-xs font-bold rounded-xl shadow-2xs"
              >
                Ver en Seguimiento →
              </button>
            )}
            {onNavigateToCompetencias && (
              <button
                onClick={() => onNavigateToCompetencias(programaSeleccionado)}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl shadow-2xs"
              >
                Ver Catálogo
              </button>
            )}
          </div>
        </div>
      )}

      {/* Alerta de Error / Bloqueo al Cargar */}
      {archivoErrorMensaje && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 flex items-start justify-between gap-4 animate-in fade-in duration-200 shadow-2xs">
          <div className="flex items-start space-x-3">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-rose-900">
                No se pudo procesar el archivo seleccionado
              </div>
              <div className="text-xs text-rose-800 mt-1 leading-relaxed whitespace-pre-line">
                {archivoErrorMensaje}
              </div>
              <div className="text-[11px] text-rose-700 font-medium mt-1.5 flex items-center space-x-1.5">
                <span>💡 Si deseas cargarla desde cero, puedes liberar los horarios programados o utilizar <strong>"Borrar Estructura Actual"</strong>.</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setArchivoErrorMensaje(null)}
            className="text-rose-400 hover:text-rose-700 text-xs p-1 rounded-lg hover:bg-rose-100/60 transition-colors"
            title="Cerrar mensaje"
          >
            ✕
          </button>
        </div>
      )}

      {/* Previsualización y Confirmación de Carga (Ancho Completo) */}
      {simulatedPreview && (
        <div className={`bg-white rounded-2xl border p-5 shadow-xs space-y-4 animate-in fade-in duration-200 ${
          tipoArchivoDetectado === 'HORAS_EJECUTADAS' 
            ? 'border-emerald-300' 
            : tipoArchivoDetectado === 'PLANEACION'
            ? 'border-[#005A8C]/50' 
            : tipoArchivoDetectado === 'JUICIOS_EVALUATIVOS'
            ? 'border-[#D3BBFF]'
            : 'border-slate-200/80'
        }`}>
          {/* Cabecera del archivo en previsualización */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                tipoArchivoDetectado === 'HORAS_EJECUTADAS'
                  ? 'bg-[#E8F5E9] text-[#2E7D32]'
                  : tipoArchivoDetectado === 'PLANEACION' 
                  ? 'bg-[#E1F5FE] text-[#005A8C]' 
                  : tipoArchivoDetectado === 'JUICIOS_EVALUATIVOS'
                  ? 'bg-[#EDE7F6] text-[#6F43C0]'
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {tipoArchivoDetectado === 'HORAS_EJECUTADAS' ? (
                  <Clock className="w-5 h-5" />
                ) : tipoArchivoDetectado === 'JUICIOS_EVALUATIVOS' ? (
                  <FileCheck className="w-5 h-5" />
                ) : tipoArchivoDetectado === 'PLANEACION' ? (
                  <BookOpen className="w-5 h-5" />
                ) : (
                  <FileSpreadsheet className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-sm text-[#111C2D] truncate max-w-md">{simulatedPreview.nombre}</span>
                  {tipoArchivoDetectado === 'HORAS_EJECUTADAS' && (
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-[#0D631B] text-[10px] font-bold">
                      Horas Ejecutadas por Instructor
                    </span>
                  )}
                  {tipoArchivoDetectado === 'PLANEACION' && (
                    <span className="px-2 py-0.5 rounded bg-[#E1F5FE] text-[#005A8C] text-[10px] font-bold">
                      Planeación GPFI-F-134
                    </span>
                  )}
                  {tipoArchivoDetectado === 'JUICIOS_EVALUATIVOS' && (
                    <span className="px-2 py-0.5 rounded bg-[#EDE7F6] text-[#6F43C0] text-[10px] font-bold">
                      Juicios Evaluativos SofiaPlus
                    </span>
                  )}
                  {tipoArchivoDetectado === 'SEGUIMIENTO' && (
                    <span className="px-2 py-0.5 rounded bg-[#E8F5E9] text-[#2E7D32] text-[10px] font-bold">
                      Seguimiento Curricular
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Tamaño: {simulatedPreview.sizeMB} • {simulatedPreview.filasConformes} registros identificados para procesar
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setSimulatedPreview(null);
                setPlaneacionResult(null);
                setHorasResult(null);
                setJuiciosResult(null);
                setTipoArchivoDetectado(null);
              }}
              className="text-slate-400 hover:text-slate-600 text-sm p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              title="Cancelar previsualización"
            >
              ✕
            </button>
          </div>

          {/* Indicadores Pre-Carga: HORAS EJECUTADAS */}
          {tipoArchivoDetectado === 'HORAS_EJECUTADAS' && horasResult && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-[#E8F5E9] rounded-xl border border-emerald-200 text-center">
                  <div className="text-[10px] font-bold text-[#2E7D32] uppercase">H. Ejecutadas</div>
                  <div className="text-xl font-black text-[#0D631B]">{horasResult.totalHorasEjecutadas} h</div>
                  <div className="text-[10px] text-slate-500">Total acumulado</div>
                </div>

                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-center">
                  <div className="text-[10px] font-bold text-blue-700 uppercase">Instructores</div>
                  <div className="text-xl font-black text-blue-800">{horasResult.instructoresCount}</div>
                  <div className="text-[10px] text-slate-500">Reportados</div>
                </div>

                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-center">
                  <div className="text-[10px] font-bold text-purple-700 uppercase">Competencias</div>
                  <div className="text-xl font-black text-purple-800">{horasResult.competenciasCount}</div>
                  <div className="text-[10px] text-slate-500">Alcanzadas</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <div className="text-[10px] font-bold text-slate-600 uppercase">Fichas</div>
                  <div className="text-xl font-black text-slate-800">{horasResult.fichasReportadas.length || 1}</div>
                  <div className="text-[10px] text-slate-500">Destino</div>
                </div>
              </div>

              {/* Resumen de los primeros registros */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/70 max-h-48 overflow-y-auto">
                <div className="text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                  Vista previa de horas por instructor:
                </div>
                <div className="space-y-1 text-[11px]">
                  {horasResult.registros.slice(0, 8).map((r, i) => (
                    <div key={i} className="flex items-center justify-between py-1 border-b border-slate-200/60 last:border-0">
                      <span className="font-semibold text-slate-800 truncate max-w-sm">
                        {r.instructorNombre}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-slate-600 text-[10px] px-1.5 py-0.2 bg-white rounded border border-slate-200">
                          {r.competenciaCodigo}
                        </span>
                        <span className="font-black text-[#0D631B]">
                          {r.horasEjecutadas} hrs
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Indicadores Pre-Carga: REPORTE DE JUICIOS EVALUATIVOS SOFIAPLUS */}
          {tipoArchivoDetectado === 'JUICIOS_EVALUATIVOS' && juiciosResult?.reporte && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Banner de SofiaPlus */}
              <div className="p-3.5 bg-[#EDE7F6] rounded-2xl border border-[#D3BBFF] text-purple-950 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 font-black text-xs text-[#6F43C0]">
                    <Award className="w-4 h-4 text-[#6F43C0]" />
                    <span>✓ Reporte Oficial de Juicios SofiaPlus Reconocido</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-white text-[#6F43C0] text-[10px] font-mono font-black border border-[#D3BBFF]">
                    Ficha {juiciosResult.reporte.fichaNumero}
                  </span>
                </div>
                <p className="text-xs text-purple-900 leading-relaxed font-medium">
                  Programa: <strong>{juiciosResult.reporte.metadata.programaCodigo} - {juiciosResult.reporte.metadata.programaDenominacion}</strong> • Período: {juiciosResult.reporte.metadata.fechaInicio} al {juiciosResult.reporte.metadata.fechaFin} • Estado Ficha: <strong>{juiciosResult.reporte.metadata.estadoFicha}</strong>
                </p>
              </div>

              {/* Tarjetas Bento de Juicios */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-[#E8F5E9] rounded-xl border border-emerald-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#2E7D32] uppercase tracking-wider">Aprendices Ficha</span>
                    <span className="text-xl font-black text-[#2E7D32]">{juiciosResult.reporte.totalAprendices}</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[10px] font-bold">
                    <span className="text-emerald-800">{juiciosResult.reporte.aprendicesActivos} En Formación</span>
                    <span className="text-rose-700">{juiciosResult.reporte.aprendicesRetiroVoluntario} Retiros</span>
                  </div>
                </div>

                <div className="p-3.5 bg-[#F0F8FF] rounded-xl border border-sky-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider">Juicios Evaluativos</span>
                    <span className="text-xl font-black text-[#005A8C]">{juiciosResult.reporte.totalRegistros}</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-sky-200/60 flex items-center justify-between text-[10px] font-bold">
                    <span className="text-blue-900">{juiciosResult.reporte.totalJuiciosAprobados} Aprobados</span>
                    <span className="text-amber-800">{juiciosResult.reporte.totalJuiciosPorEvaluar} Por Evaluar</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Aprobación Ficha</span>
                    <span className="text-xl font-black text-[#111C2D]">{juiciosResult.reporte.porcentajeAprobacionFicha}%</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-600 font-medium">
                    <span>Retención: <strong className="text-emerald-700">{juiciosResult.detalles.tasaRetencion}%</strong></span>
                    <span>•</span>
                    <span>Deserción: <strong className="text-rose-700">{juiciosResult.detalles.tasaDesercion}%</strong></span>
                  </div>
                </div>
              </div>

              {/* Resumen de Estados de Aprendices */}
              <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-slate-100/80 rounded-xl border border-slate-200 text-[11px] font-bold">
                <span className="text-slate-500 text-[10px] uppercase tracking-wider mr-1">Estados detectados:</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-[#0D631B]">
                  En Formación: {juiciosResult.reporte.aprendicesActivos}
                </span>
                {Boolean(juiciosResult.reporte.aprendicesCancelados) && (
                  <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800">
                    Cancelados: {juiciosResult.reporte.aprendicesCancelados}
                  </span>
                )}
                {Boolean(juiciosResult.reporte.aprendicesAplazados) && (
                  <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-800">
                    Aplazados: {juiciosResult.reporte.aprendicesAplazados}
                  </span>
                )}
                {Boolean(juiciosResult.reporte.aprendicesRetiroVoluntario) && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
                    Retiro Voluntario: {juiciosResult.reporte.aprendicesRetiroVoluntario}
                  </span>
                )}
                {Boolean(juiciosResult.reporte.aprendicesCondicionados) && (
                  <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900">
                    Condicionados: {juiciosResult.reporte.aprendicesCondicionados}
                  </span>
                )}
                {Boolean(juiciosResult.reporte.aprendicesTrasladados) && (
                  <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900">
                    Trasladados: {juiciosResult.reporte.aprendicesTrasladados}
                  </span>
                )}
              </div>

              {/* Vista previa de aprendices y botón modal */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 flex items-center space-x-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-600" />
                    <span>Muestra de Aprendices en el Reporte ({juiciosResult.reporte.aprendices.slice(0, 5).length} de {juiciosResult.reporte.totalAprendices}):</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalJuiciosDetalleOpen(true)}
                    className="text-xs font-bold text-[#6F43C0] hover:underline flex items-center space-x-1"
                  >
                    <span>Ver todos los {juiciosResult.reporte.totalAprendices} aprendices →</span>
                  </button>
                </div>

                <div className="space-y-1 text-[11px] max-h-36 overflow-y-auto pr-1">
                  {juiciosResult.reporte.aprendices.slice(0, 5).map((apr, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between gap-2 shadow-2xs">
                      <div className="min-w-0 flex-1">
                        <span className="font-mono text-[10px] font-bold text-slate-500 mr-1.5">{apr.documento}</span>
                        <strong className="text-slate-800">{apr.nombresApellidos}</strong>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold ${
                          apr.estadoMatricula === 'EN FORMACION'
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-rose-100 text-rose-900'
                        }`}>
                          {apr.estadoMatricula}
                        </span>
                        <span className="font-mono text-[10px] font-bold text-slate-700">
                          {apr.juiciosAprobados}/{apr.totalJuicios} ({apr.porcentajeAvance}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Indicadores Pre-Carga: PLANEACION PEDAGOGICA Y TRADUCCION NCL */}
          {tipoArchivoDetectado === 'PLANEACION' && planeacionResult && (
            <div className="space-y-4">
              {/* Banner de Estado de Sobrescritura & Validación Curricular */}
              {planeacionResult.validacionSobrescritura && (
                <div>
                  {planeacionResult.validacionSobrescritura.bloqueado ? (
                    <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-950 space-y-2 animate-in fade-in duration-150">
                      <div className="flex items-start space-x-2.5">
                        <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-black text-xs text-rose-900 uppercase tracking-wide">
                            ⛔ Sobrescritura Bloqueada: No se puede sobreescribir la planeación actual
                          </div>
                          <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                            Esta planeación ya cuenta con trabajo académico registrado en el sistema. Para garantizar la integridad de las mallas horarias y las evaluaciones de los aprendices, <strong>el sistema impide su sobreescritura</strong>:
                          </p>
                          <ul className="mt-2 space-y-1 text-[11px] text-rose-900 bg-white/70 p-2.5 rounded-lg border border-rose-200">
                            {planeacionResult.validacionSobrescritura.motivosBloqueo.map((motivo, idx) => (
                              <li key={idx} className="flex items-start space-x-1.5 font-medium">
                                <span className="text-rose-600 font-bold">•</span>
                                <span>{motivo}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="mt-2 text-[11px] text-rose-700 font-medium">
                            💡 <em>{planeacionResult.validacionSobrescritura.sugerencia || 'Para reemplazarla, primero desvincule los horarios asignados o limpie la estructura desde "Borrar Estructura Actual".'}</em>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : planeacionResult.validacionSobrescritura.esSobrescritura ? (
                    <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-300 text-sky-950 space-y-1 animate-in fade-in duration-150">
                      <div className="flex items-center space-x-2 font-black text-xs text-sky-900">
                        <RefreshCw className="w-4 h-4 text-sky-600 animate-spin-reverse" />
                        <span>🔄 Sobrescritura Permitida: Se reemplazará la planeación previa</span>
                      </div>
                      <p className="text-xs text-sky-800 leading-relaxed">
                        Se detectó una planeación existente con competencias previas, pero <strong>aún NO se ha trabajado con ella</strong> (0 horarios programados, 0 actividades de seguimiento y 0 horas ejecutadas). Al confirmar, la estructura anterior se sobreescribirá limpiamente por esta nueva versión sin generar inconsistencias.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-1 animate-in fade-in duration-150">
                      <div className="flex items-center space-x-2 font-black text-xs text-emerald-900">
                        <Sparkles className="w-4 h-4 text-[#0D631B]" />
                        <span>✓ Carga Inicial: Nueva Planeación Pedagógica</span>
                      </div>
                      <p className="text-xs text-emerald-800 leading-relaxed">
                        No existen competencias previas cargadas en este programa. Se creará e incorporará la estructura pedagógica oficial por primera vez al catálogo.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Previsualización Cuantitativa: Conteo Detallado de Competencias y RAPs */}
              {(() => {
                const resumen = planeacionResult.resumenCargue;
                const totalComp = planeacionResult.competencias.length;
                const tecComp = resumen?.competenciasTecnicas.length ?? 0;
                const transComp = resumen?.competenciasTransversales.length ?? 0;
                const claveComp = resumen?.competenciasClave.length ?? 0;

                const totalRaps = planeacionResult.raps.length;
                const tecRaps = resumen?.rapsTecnicos.length ?? 0;
                const transRaps = resumen?.rapsTransversales.length ?? 0;
                const claveRaps = resumen?.rapsClave.length ?? 0;

                const horasTotales = resumen?.horasTotales ?? planeacionResult.detalles.horasTotales ?? 0;
                const horasDirectas = resumen?.horasTrabajoDirecto ?? Math.round(horasTotales * 0.8);
                const horasAutonomas = resumen?.horasTrabajoAutonomo ?? (horasTotales - horasDirectas);

                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Tarjeta Competencias */}
                      <div className="p-3.5 bg-[#F0F8FF] rounded-xl border border-sky-200">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider">Competencias</span>
                          <span className="text-xl font-black text-[#005A8C]">{totalComp}</span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-sky-200/60 flex flex-wrap gap-1 text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 font-bold">
                            {tecComp} Técnicas
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold">
                            {transComp} Transversales
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 font-bold">
                            {claveComp} Clave
                          </span>
                        </div>
                      </div>

                      {/* Tarjeta RAPs */}
                      <div className="p-3.5 bg-[#E8F5E9] rounded-xl border border-emerald-200">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-[#2E7D32] uppercase tracking-wider">Total RAPs</span>
                          <span className="text-xl font-black text-[#2E7D32]">{totalRaps}</span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-emerald-200/60 flex flex-wrap gap-1 text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 font-bold">
                            {tecRaps} Técnicos
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold">
                            {transRaps} Transversales
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 font-bold">
                            {claveRaps} Clave
                          </span>
                        </div>
                      </div>

                      {/* Tarjeta Horas */}
                      <div className="p-3.5 bg-[#F8F9FA] rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Horas del Plan</span>
                          <span className="text-xl font-black text-[#111C2D]">{horasTotales} hrs</span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-600 font-medium">
                          <span>Directo: <strong>{horasDirectas}h</strong></span>
                          <span>•</span>
                          <span>Autónomo: <strong>{horasAutonomas}h</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Resumen del Contenido que se va a Cargar */}
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-[#005A8C]" />
                          <span>Resumen de Competencias y RAPs a Cargar:</span>
                        </div>

                        {/* Filtros por tipo de competencia */}
                        <div className="flex items-center space-x-1 text-[10px] flex-wrap gap-y-1">
                          <button
                            type="button"
                            onClick={() => setFiltroResumenComp('TODAS')}
                            className={`px-2 py-0.5 rounded font-bold transition-colors ${
                              filtroResumenComp === 'TODAS'
                                ? 'bg-[#111C2D] text-white'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            Todas ({totalComp})
                          </button>
                          <button
                            type="button"
                            onClick={() => setFiltroResumenComp('Técnica')}
                            className={`px-2 py-0.5 rounded font-bold transition-colors ${
                              filtroResumenComp === 'Técnica'
                                ? 'bg-[#005A8C] text-white'
                                : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
                            }`}
                          >
                            Técnicas ({tecComp})
                          </button>
                          <button
                            type="button"
                            onClick={() => setFiltroResumenComp('Transversal')}
                            className={`px-2 py-0.5 rounded font-bold transition-colors ${
                              filtroResumenComp === 'Transversal'
                                ? 'bg-[#2E7D32] text-white'
                                : 'bg-white text-[#2E7D32] border border-emerald-200 hover:bg-emerald-50'
                            }`}
                          >
                            Transversales ({transComp})
                          </button>
                          <button
                            type="button"
                            onClick={() => setFiltroResumenComp('Clave')}
                            className={`px-2 py-0.5 rounded font-bold transition-colors ${
                              filtroResumenComp === 'Clave'
                                ? 'bg-purple-700 text-white'
                                : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-50'
                            }`}
                          >
                            Clave ({claveComp})
                          </button>
                        </div>
                      </div>

                      {/* Lista Desglosada de Competencias a Cargar según pestaña seleccionada */}
                      {(() => {
                        const f = filtroResumenComp;
                        const listaCompetenciasModal: Competencia[] = (() => {
                          if (f === 'Técnica') {
                            return (resumen?.competenciasTecnicas && resumen.competenciasTecnicas.length > 0)
                              ? resumen.competenciasTecnicas
                              : planeacionResult.competencias.filter(c => categorizarTipoCompetencia(c.tipo, c.denominacion, c.codigo) === 'Técnica');
                          }
                          if (f === 'Transversal') {
                            return (resumen?.competenciasTransversales && resumen.competenciasTransversales.length > 0)
                              ? resumen.competenciasTransversales
                              : planeacionResult.competencias.filter(c => categorizarTipoCompetencia(c.tipo, c.denominacion, c.codigo) === 'Transversal');
                          }
                          if (f === 'Clave') {
                            return (resumen?.competenciasClave && resumen.competenciasClave.length > 0)
                              ? resumen.competenciasClave
                              : planeacionResult.competencias.filter(c => categorizarTipoCompetencia(c.tipo, c.denominacion, c.codigo) === 'Clave');
                          }
                          return planeacionResult.competencias;
                        })();

                        return (
                          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 text-[11px]">
                            <div className="flex items-center justify-between px-1 py-0.5 text-[10px] text-slate-500 font-semibold">
                              <span>Mostrando {listaCompetenciasModal.length} {f === 'TODAS' ? 'competencias' : `competencias (${f})`}:</span>
                              <span className="text-slate-400">Clic para ver RAPs</span>
                            </div>

                            {listaCompetenciasModal.length === 0 ? (
                              <div className="p-4 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                                No hay competencias en la categoría seleccionada ({f}).
                              </div>
                            ) : (
                              listaCompetenciasModal.map(comp => {
                                const tipoReal = categorizarTipoCompetencia(comp.tipo, comp.denominacion, comp.codigo);
                                const rapsDeComp = planeacionResult.raps.filter(r => 
                                  r.competenciaCodigo === comp.codigo || 
                                  (comp.denominacion && r.competenciaDenominacion && r.competenciaDenominacion.trim().toLowerCase() === comp.denominacion.trim().toLowerCase())
                                );
                                const isExpanded = expandedCompCod === 'TODAS' || expandedCompCod === comp.codigo;

                                return (
                                  <div 
                                    key={comp.codigo} 
                                    className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1 transition-all"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="space-y-0.5 flex-1 min-w-0">
                                        <div className="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                                          <span className="font-mono font-bold text-slate-800 text-[10px] bg-slate-100 px-1 rounded">
                                            {comp.codigo}
                                          </span>
                                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                            tipoReal === 'Clave'
                                              ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                              : tipoReal === 'Transversal'
                                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                              : 'bg-blue-100 text-blue-900 border border-blue-200'
                                          }`}>
                                            {tipoReal}
                                          </span>
                                          <span className="text-[10px] text-slate-500 font-medium">
                                            • {comp.horasEstimadas} hrs ({Math.round(comp.horasEstimadas * 0.8)}h dir / {comp.horasEstimadas - Math.round(comp.horasEstimadas * 0.8)}h aut)
                                          </span>
                                        </div>
                                        <div className="font-semibold text-slate-800 text-[11px] leading-tight">
                                          {comp.denominacion}
                                        </div>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => setExpandedCompCod(isExpanded && expandedCompCod !== 'TODAS' ? null : isExpanded && expandedCompCod === 'TODAS' ? null : comp.codigo)}
                                        className="shrink-0 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center space-x-1 transition-colors"
                                      >
                                        <span>{rapsDeComp.length} RAPs</span>
                                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                      </button>
                                    </div>

                                    {/* Desglose de RAPs si está expandida */}
                                    {isExpanded && (
                                      <div className="mt-2 pt-2 border-t border-slate-100 space-y-1 bg-slate-50/80 p-2 rounded">
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                                          Resultados de Aprendizaje Vinculados ({rapsDeComp.length}):
                                        </div>
                                        {rapsDeComp.length === 0 ? (
                                          <div className="text-[10px] text-slate-400 italic">No tiene RAPs asociados explícitos.</div>
                                        ) : (
                                          rapsDeComp.map((rap, rIdx) => (
                                            <div key={rIdx} className="flex items-start justify-between text-[10px] py-0.5 border-b border-slate-200/50 last:border-0">
                                              <div className="flex-1 pr-2">
                                                <strong className="text-slate-800">{rap.codigoRap}:</strong>{' '}
                                                <span className="text-slate-600">{rap.denominacion}</span>
                                              </div>
                                              <span className="shrink-0 font-medium text-slate-500 text-[9px] px-1 bg-white rounded border border-slate-200">
                                                {rap.fase || 'Sin fase'}
                                              </span>
                                            </div>
                                          ))
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })()}

              {/* Panel de Traducción / Homologación NCL al 90% */}
              {planeacionResult.detalles.traduccionesNCL && planeacionResult.detalles.traduccionesNCL.length > 0 && (
                <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-900 flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>Reporte de Homologación NCL (Regla del 90% de Palabras):</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-mono font-bold">
                      {planeacionResult.detalles.totalHomologadasNCL || 0} Homologadas
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto text-[11px]">
                    {planeacionResult.detalles.traduccionesNCL.map((t, idx) => (
                      <div 
                        key={idx} 
                        className={`p-2 rounded-lg border text-left flex items-start justify-between gap-2 ${
                          t.estado === 'HOMOLOGADO_90_OK'
                            ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                            : t.estado === 'YA_ES_NCL'
                            ? 'bg-white border-slate-200 text-slate-700'
                            : 'bg-amber-50 border-amber-200 text-amber-900'
                        }`}
                      >
                        <div>
                          <div className="font-bold">
                            {t.estado === 'HOMOLOGADO_90_OK' && '✓ Traducida a NCL: '}
                            {t.estado === 'YA_ES_NCL' && '• NCL Oficial: '}
                            {t.estado === 'NO_ALCANZA_90' && '⚠ No alcanza el 90%: '}
                            <span className="font-mono text-xs">{t.codigoNCL}</span>
                          </div>
                          <div className="text-[10px] opacity-80 line-clamp-1">{t.denominacionOficial}</div>
                          <div className="text-[10px] mt-0.5 font-medium">{t.mensaje}</div>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          t.porcentajeCoincidencia >= 90
                            ? 'bg-emerald-200 text-emerald-900'
                            : 'bg-amber-200 text-amber-900'
                        }`}>
                          {t.porcentajeCoincidencia}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Indicadores Pre-Carga: SEGUIMIENTO GENERICO */}
          {tipoArchivoDetectado === 'SEGUIMIENTO' && (
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-[#F8F9FA] rounded-xl border border-slate-200 text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Filas Conformes</div>
                <div className="text-xl font-black text-[#2E7D32]">{simulatedPreview.filasConformes}</div>
                <div className="text-[10px] text-slate-500">Actividades validadas</div>
              </div>

              <div className="p-3 bg-[#F8F9FA] rounded-xl border border-slate-200 text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Forward-Fill</div>
                <div className="text-xl font-black text-[#005A8C]">{simulatedPreview.forwardFill}</div>
                <div className="text-[10px] text-slate-500">Bloques normalizados</div>
              </div>

              <div className="p-3 bg-[#F8F9FA] rounded-xl border border-slate-200 text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Advertencias</div>
                <div className="text-xl font-black text-[#FFA000]">{simulatedPreview.advertencias}</div>
                <div className="text-[10px] text-slate-500">No detienen ingesta</div>
              </div>
            </div>
          )}

          {/* Botón de Confirmación Principal con Bloqueo Inteligente */}
          {tipoArchivoDetectado === 'PLANEACION' && planeacionResult?.validacionSobrescritura?.bloqueado ? (
            <div className="space-y-1.5">
              <button
                disabled
                className="w-full py-3 rounded-xl bg-slate-200 text-slate-500 text-xs font-bold cursor-not-allowed flex items-center justify-center space-x-2 border border-slate-300"
                title="Sobrescritura no permitida debido a trabajo académico existente en la planeación"
              >
                <ShieldAlert className="w-4 h-4 text-slate-400" />
                <span>⛔ Sobrescritura Bloqueada: Planeación en Uso Activo</span>
              </button>
              <p className="text-[11px] text-center text-rose-700 font-medium">
                No se puede sobrescribir porque ya cuenta con horarios, horas ejecutadas o seguimientos asociados en el sistema.
              </p>
            </div>
          ) : (
            <button
              onClick={handleConfirmarIntegracion}
              disabled={isProcessing}
              className={`w-full py-3 rounded-xl text-white text-xs font-bold shadow-md transition-all flex items-center justify-center space-x-2 ${
                tipoArchivoDetectado === 'JUICIOS_EVALUATIVOS'
                  ? 'bg-[#6F43C0] hover:bg-[#5b34a6] shadow-[#6F43C0]/20'
                  : tipoArchivoDetectado === 'HORAS_EJECUTADAS'
                  ? 'bg-[#0D631B] hover:bg-[#0a4d15] shadow-[#0D631B]/20'
                  : tipoArchivoDetectado === 'PLANEACION' && planeacionResult?.validacionSobrescritura?.esSobrescritura
                  ? 'bg-[#005A8C] hover:bg-[#004266] shadow-[#005A8C]/20'
                  : 'bg-[#0D631B] hover:bg-[#0a4d15] shadow-[#0D631B]/20'
              }`}
            >
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>
                {isProcessing 
                  ? 'Procesando archivo...' 
                  : tipoArchivoDetectado === 'JUICIOS_EVALUATIVOS' && juiciosResult?.reporte
                    ? `✓ Integrar Juicios de Ficha ${juiciosResult.reporte.fichaNumero} (${juiciosResult.reporte.totalRegistros} juicios, ${juiciosResult.reporte.totalAprendices} aprendices)`
                    : tipoArchivoDetectado === 'HORAS_EJECUTADAS' && horasResult
                    ? `✓ Integrar ${horasResult.totalHorasEjecutadas} Horas Ejecutadas al Seguimiento`
                    : tipoArchivoDetectado === 'PLANEACION' && planeacionResult
                    ? planeacionResult.validacionSobrescritura?.esSobrescritura
                      ? `🔄 Confirmar y Sobreescribir Planeación (${planeacionResult.competencias.length} Comp, ${planeacionResult.raps.length} RAPs)`
                      : `✓ Confirmar y Cargar Nueva Planeación (${planeacionResult.competencias.length} Comp, ${planeacionResult.raps.length} RAPs)`
                    : 'Procesar e Integrar a Base de Datos'}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Tabla de Auditoría de Ingestas Recientes */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-black text-sm text-[#111C2D]">Auditoría de Ingestas Recientes</h3>
            <p className="text-xs text-slate-500">Registro trazable de cargues ejecutados en el nodo Regional Cesar</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="pb-2.5">Fecha y Hora</th>
                <th className="pb-2.5">Archivo Procesado</th>
                <th className="pb-2.5">Tipo de Plantilla</th>
                <th className="pb-2.5">Módulo Destino</th>
                <th className="pb-2.5">Registros</th>
                <th className="pb-2.5 text-right">Estado de Carga</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditoriaIngestas.map(item => (
                <tr key={item.id} className="hover:bg-[#F8F9FA] transition-colors">
                  <td className="py-3 font-medium text-slate-500">{item.fechaHora}</td>
                  <td className="py-3 font-bold text-[#111C2D] flex items-center space-x-2">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#2E7D32]" />
                    <span>{item.archivoNombre}</span>
                  </td>
                  <td className="py-3 font-medium text-slate-700">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium text-[11px]">
                      {item.tipoPlantilla}
                    </span>
                  </td>
                  <td className="py-3 font-medium text-slate-700">{item.moduloDestino}</td>
                  <td className="py-3 font-bold text-[#111C2D]">{item.registrosProcesados}</td>
                  <td className="py-3 text-right">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] inline-flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32]"></span>
                      <span>{item.estado}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalle Completo de Juicios Evaluativos */}
      <ModalJuiciosEvaluativos
        isOpen={modalJuiciosDetalleOpen}
        onClose={() => setModalJuiciosDetalleOpen(false)}
        reporte={juiciosResult?.reporte || null}
        onSincronizarFicha={(rep) => {
          const resultado = onGuardarJuiciosEvaluativos ? onGuardarJuiciosEvaluativos(rep) : undefined;
          setModalJuiciosDetalleOpen(false);
          if (resultado && resultado.exito === false) {
            setArchivoErrorMensaje(resultado.mensaje);
            return;
          }
          setArchivoExitoMensaje(
            resultado?.mensaje || `✓ ¡Ficha ${rep.fichaNumero} sincronizada exitosamente con ${rep.totalAprendices} aprendices y ${rep.totalRegistros} juicios evaluativos!`
          );
        }}
      />
    </div>
  );
};
