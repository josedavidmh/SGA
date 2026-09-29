import React from 'react';
import { generarUuid } from '../lib/id';
import {
  BookOpen,
  Search, 
  UploadCloud, 
  Download, 
  Layers, 
  CheckCircle2, 
  Clock, 
  Award, 
  FileSpreadsheet, 
  Filter, 
  Plus, 
  ChevronDown, 
  ChevronUp,
  ChevronRight, 
  Sparkles, 
  AlertCircle, 
  ShieldAlert,
  CalendarDays, 
  ArrowRight, 
  RefreshCw,
  X,
  FileCheck,
  Building2,
  GraduationCap,
  Trash2,
  AlertTriangle,
  Pencil,
  Save
} from 'lucide-react';
import { 
  ProgramaFormacion, 
  Competencia, 
  ResultadoAprendizaje, 
  Ficha, 
  User,
  BloqueHorario,
  ActividadSeguimiento,
  RegistroHorasEjecutadas,
  RegistroArchivoSeguimiento
} from '../types';
import { 
  parsePlaneacionPedagogicaExcel, 
  procesarPlaneacionPedagogica,
  ResultadoProcesamientoPlaneacion,
  cargarPlaneacionPedagogicaDemo, 
  descargarPlantillaPlaneacionExcel,
  categorizarTipoCompetencia
} from '../services/planeacionPedagogicaService';

interface CompetenciasViewProps {
  currentUser: User;
  programas: ProgramaFormacion[];
  competencias: Competencia[];
  raps: ResultadoAprendizaje[];
  registrosArchivoSeguimiento?: RegistroArchivoSeguimiento[];
  fichas: Ficha[];
  horarios?: BloqueHorario[];
  actividadesSeguimiento?: ActividadSeguimiento[];
  registrosHorasEjecutadas?: RegistroHorasEjecutadas[];
  selectedProgramaCodigo?: string;
  onSelectPrograma?: (codigo: string) => void;
  onActualizarCompetenciasYRaps: (
    nuevasCompetencias: Competencia[], 
    nuevosRaps: ResultadoAprendizaje[],
    registrosSeg?: RegistroArchivoSeguimiento[]
  ) => void;
  onLimpiarEstructura?: () => void;
  onNavigateToHorarios?: (programaCodigo: string) => void;
}

export const CompetenciasView: React.FC<CompetenciasViewProps> = ({
  currentUser,
  programas,
  competencias,
  raps,
  registrosArchivoSeguimiento = [],
  fichas,
  horarios = [],
  actividadesSeguimiento = [],
  registrosHorasEjecutadas = [],
  selectedProgramaCodigo,
  onSelectPrograma,
  onActualizarCompetenciasYRaps,
  onLimpiarEstructura,
  onNavigateToHorarios
}) => {
  // Programa seleccionado actualmente
  const [activeProgCodigo, setActiveProgCodigo] = React.useState<string>(
    selectedProgramaCodigo || (programas.length > 0 ? programas[0].codigo : '228118')
  );

  // Filtros
  const [searchTerm, setSearchTerm] = React.useState<string>('');
  const [filterTipo, setFilterTipo] = React.useState<string>('TODOS');
  const [filterFase, setFilterFase] = React.useState<string>('TODAS');

  // Estado de acordeones de competencias abiertas (set de IDs)
  const [expandedCompIds, setExpandedCompIds] = React.useState<Set<string>>(new Set());

  // Estado de carga de archivo Planeación Pedagógica
  const [isUploading, setIsUploading] = React.useState<boolean>(false);
  const [dragOver, setDragOver] = React.useState<boolean>(false);
  const [uploadNotification, setUploadNotification] = React.useState<{
    tipo: 'success' | 'info' | 'error';
    mensaje: string;
    detalles?: string;
  } | null>(null);

  // Modal para agregar manualmente un RAP
  const [modalNuevoRap, setModalNuevoRap] = React.useState<{
    isOpen: boolean;
    competencia?: Competencia;
  }>({ isOpen: false });

  // Modal de Previsualización y Validación de Sobrescritura de Planeación
  const [modalPrevisualizacion, setModalPrevisualizacion] = React.useState<{
    isOpen: boolean;
    resultado: ResultadoProcesamientoPlaneacion | null;
    filtroResumen: 'TODAS' | 'Técnica' | 'Transversal' | 'Clave';
    expandedComp: string | null;
  }>({
    isOpen: false,
    resultado: null,
    filtroResumen: 'TODAS',
    expandedComp: null
  });

  // Modal de Diagnóstico de Error e Inconsistencias en Archivo Excel
  const [modalErrorCargue, setModalErrorCargue] = React.useState<{
    isOpen: boolean;
    titulo: string;
    mensaje: string;
    advertencias: string[];
    detallesTecnicos?: string;
  } | null>(null);

  const [nuevoRapForm, setNuevoRapForm] = React.useState({
    codigoRap: '',
    denominacion: '',
    fase: 'Fase 1: Análisis',
    duracionHoras: 40
  });

  // Modal para Editar Competencia
  const [modalEditarComp, setModalEditarComp] = React.useState<{
    isOpen: boolean;
    competenciaId: string;
    codigo: string;
    denominacion: string;
    tipo: 'Técnica' | 'Transversal' | 'Clave' | 'Bilingüismo';
    faseSugerida: string;
    horasEstimadas: number;
  }>({
    isOpen: false,
    competenciaId: '',
    codigo: '',
    denominacion: '',
    tipo: 'Técnica',
    faseSugerida: 'Fase 1: Análisis',
    horasEstimadas: 40
  });

  // Modal para Editar RAP y sus Actividades de Aprendizaje
  const [modalEditarRap, setModalEditarRap] = React.useState<{
    isOpen: boolean;
    rapId: string;
    codigoRap: string;
    denominacion: string;
    fase: string;
    horasTrabajoDirecto: number;
    horasTrabajoAutonomo: number;
    actividadesAprendizaje: string[];
    nuevaActividadTexto: string;
  }>({
    isOpen: false,
    rapId: '',
    codigoRap: '',
    denominacion: '',
    fase: 'Fase 1: Análisis',
    horasTrabajoDirecto: 32,
    horasTrabajoAutonomo: 8,
    actividadesAprendizaje: [],
    nuevaActividadTexto: ''
  });

  const handleGuardarEdicionComp = () => {
    if (!modalEditarComp.denominacion.trim()) {
      alert('La denominación de la competencia no puede estar vacía.');
      return;
    }

    const targetComp = competencias.find(c => c.id === modalEditarComp.competenciaId);
    const nuevoCodigo = modalEditarComp.codigo.trim() || targetComp?.codigo || 'COMP-01';

    const compActualizada = competencias.map(c => {
      if (c.id === modalEditarComp.competenciaId) {
        return {
          ...c,
          codigo: nuevoCodigo,
          denominacion: modalEditarComp.denominacion.trim(),
          tipo: modalEditarComp.tipo,
          faseSugerida: modalEditarComp.faseSugerida,
          horasEstimadas: Number(modalEditarComp.horasEstimadas) || 40
        };
      }
      return c;
    });

    let rapsActualizados = raps;
    if (targetComp && targetComp.codigo !== nuevoCodigo) {
      rapsActualizados = raps.map(r => {
        if (r.competenciaCodigo === targetComp.codigo) {
          return {
            ...r,
            competenciaCodigo: nuevoCodigo,
            competenciaDenominacion: modalEditarComp.denominacion.trim()
          };
        }
        return r;
      });
    }

    onActualizarCompetenciasYRaps(compActualizada, rapsActualizados);
    setModalEditarComp(prev => ({ ...prev, isOpen: false }));
    setUploadNotification({
      tipo: 'success',
      mensaje: 'Competencia editada exitosamente.',
      detalles: `Se actualizaron los datos de la competencia "${modalEditarComp.denominacion}".`
    });
  };

  const handleGuardarEdicionRap = () => {
    if (!modalEditarRap.denominacion.trim()) {
      alert('La denominación del RAP no puede estar vacía.');
      return;
    }
    const hd = Number(modalEditarRap.horasTrabajoDirecto) || 0;
    const hi = Number(modalEditarRap.horasTrabajoAutonomo) || 0;
    const durTotal = hd + hi;

    let compCodigoRelacionada = '';
    const rapsActualizados = raps.map(r => {
      if (r.id === modalEditarRap.rapId) {
        compCodigoRelacionada = r.competenciaCodigo;
        return {
          ...r,
          codigoRap: modalEditarRap.codigoRap.trim() || r.codigoRap,
          denominacion: modalEditarRap.denominacion.trim(),
          fase: modalEditarRap.fase,
          horasTrabajoDirecto: hd,
          horasTrabajoAutonomo: hi,
          duracionHoras: durTotal,
          actividadesAprendizaje: modalEditarRap.actividadesAprendizaje
        };
      }
      return r;
    });

    const compActualizadas = competencias.map(c => {
      if (c.codigo === compCodigoRelacionada) {
        const rapsDeEsta = rapsActualizados.filter(r => r.competenciaCodigo === c.codigo);
        const sumDir = rapsDeEsta.reduce((sum, r) => sum + (r.horasTrabajoDirecto || 0), 0);
        const sumInd = rapsDeEsta.reduce((sum, r) => sum + (r.horasTrabajoAutonomo || 0), 0);
        return {
          ...c,
          horasTrabajoDirecto: sumDir,
          horasTrabajoAutonomo: sumInd,
          horasEstimadas: sumDir + sumInd
        };
      }
      return c;
    });

    onActualizarCompetenciasYRaps(compActualizadas, rapsActualizados);
    setModalEditarRap(prev => ({ ...prev, isOpen: false }));
    setUploadNotification({
      tipo: 'success',
      mensaje: 'Resultado de Aprendizaje (RAP) y Actividades actualizados.',
      detalles: `Total: ${durTotal}h (${hd}h directas / ${hi}h indep.) • ${modalEditarRap.actividadesAprendizaje.length} Actividades de Aprendizaje vinculadas.`
    });
  };

  // Programa actual
  const programaActual = programas.find(p => p.codigo === activeProgCodigo) || programas[0];

  // Competencias y RAPs de este programa
  const competenciasDelPrograma = competencias.filter(c => c.programaCodigo === activeProgCodigo);
  const rapsDelPrograma = raps.filter(r => r.programaCodigo === activeProgCodigo);

  // Inicializar acordeón con todas las competencias abiertas por defecto
  React.useEffect(() => {
    if (competenciasDelPrograma.length > 0) {
      setExpandedCompIds(new Set(competenciasDelPrograma.map(c => c.id)));
    }
  }, [activeProgCodigo, competencias.length]);

  const toggleExpand = (compId: string) => {
    setExpandedCompIds(prev => {
      const next = new Set(prev);
      if (next.has(compId)) {
        next.delete(compId);
      } else {
        next.add(compId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedCompIds(new Set(competenciasDelPrograma.map(c => c.id)));
  };

  const collapseAll = () => {
    setExpandedCompIds(new Set());
  };

  // Conteos dinámicos por categoría oficial curricular SENA
  const countTec = competenciasDelPrograma.filter(c => categorizarTipoCompetencia(c.tipo, c.denominacion, c.codigo) === 'Técnica').length;
  const countTrans = competenciasDelPrograma.filter(c => categorizarTipoCompetencia(c.tipo, c.denominacion, c.codigo) === 'Transversal').length;
  const countClave = competenciasDelPrograma.filter(c => categorizarTipoCompetencia(c.tipo, c.denominacion, c.codigo) === 'Clave').length;

  // Filtrar competencias y sus RAPs
  const competenciasFiltradas = competenciasDelPrograma.filter(c => {
    const tipoReal = categorizarTipoCompetencia(c.tipo, c.denominacion, c.codigo);
    const matchesTipo = filterTipo === 'TODOS' || c.tipo === filterTipo || tipoReal === filterTipo;
    
    // Buscar en competencia o en sus RAPs
    const rapsDeComp = rapsDelPrograma.filter(r => r.competenciaCodigo === c.codigo);
    
    const matchesFase = filterFase === 'TODAS' || 
      c.faseSugerida === filterFase || 
      (filterFase === 'Inducción' && (c.faseSugerida?.toLowerCase().includes('induccion') || c.faseSugerida?.toLowerCase().includes('inducción') || c.codigo === '240201530')) ||
      rapsDeComp.some(r => r.fase === filterFase || (filterFase === 'Inducción' && (r.fase?.toLowerCase().includes('induccion') || r.fase?.toLowerCase().includes('inducción'))));

    const term = searchTerm.toLowerCase().trim();
    if (!term) return matchesTipo && matchesFase;

    const matchesComp = 
      c.codigo.toLowerCase().includes(term) || 
      c.denominacion.toLowerCase().includes(term);

    const matchesRaps = rapsDeComp.some(r => 
      r.codigoRap.toLowerCase().includes(term) || 
      r.denominacion.toLowerCase().includes(term)
    );

    return matchesTipo && matchesFase && (matchesComp || matchesRaps);
  });

  // Procesar archivo Excel de Planeación Pedagógica
  const handleProcesarArchivo = async (file: File) => {
    setIsUploading(true);
    setUploadNotification(null);

    try {
      // Procesa el archivo con validación de trabajo previo y traducción NCL
      const resultado = await procesarPlaneacionPedagogica(
        file, 
        activeProgCodigo, 
        competencias,
        {
          rapsExistentes: raps,
          horarios,
          actividadesSeguimiento,
          registrosHorasEjecutadas,
          fichas
        }
      );
      
      if (!resultado.exito) {
        const advertencias = resultado.detalles?.advertencias || [];
        setUploadNotification({
          tipo: 'error',
          mensaje: 'Inconsistencias al procesar el archivo de Planeación Pedagógica.',
          detalles: resultado.mensaje || 'Revise las columnas y filas señaladas en el panel de diagnóstico de errores.'
        });

        setModalErrorCargue({
          isOpen: true,
          titulo: 'Inconsistencias Detectadas en el Archivo Excel',
          mensaje: resultado.mensaje || 'No se pudieron extraer competencias o resultados de aprendizaje válidos de la Etapa Lectiva.',
          advertencias: advertencias.length > 0 ? advertencias : [
            'No se encontraron filas con encabezados de "Competencia" y "Resultado de Aprendizaje (RAP)".',
            'Asegúrese de que el archivo contenga las hojas correspondientes a las Fases del proyecto.',
            'Verifique que no existan celdas vacías en las columnas clave del archivo.'
          ],
          detallesTecnicos: `Programa destino: ${activeProgCodigo} • Hojas/Fases analizadas: ${resultado.detalles?.fasesDetectadas?.join(', ') || 'Hojas del libro'}`
        });
        return;
      }

      // Abrir modal de previsualización para mostrar resumen y validar sobrescritura
      setModalPrevisualizacion({
        isOpen: true,
        resultado,
        filtroResumen: 'TODAS',
        expandedComp: 'TODAS'
      });
    } catch (err: any) {
      setUploadNotification({
        tipo: 'error',
        mensaje: 'Error al procesar el archivo de Planeación Pedagógica.',
        detalles: err.message || 'Verifique que el archivo Excel tenga columnas de Competencias y RAPs válidos.'
      });

      setModalErrorCargue({
        isOpen: true,
        titulo: 'Error al Procesar el Archivo Excel',
        mensaje: err.message || 'Ocurrió un error inesperado al leer la estructura del archivo.',
        advertencias: [
          err.message || 'El archivo no cumple con la estructura esperada de la planeación GPFI.',
          'Asegúrese de que las columnas tengan nombres estándar ("Competencia", "Resultado de Aprendizaje", "Horas", etc.).',
          'Puede descargar la plantilla GPFI de ejemplo (.xlsx) desde el botón superior para contrastar el formato.'
        ],
        detallesTecnicos: `Programa destino: ${activeProgCodigo}`
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmarCargueModal = () => {
    if (!modalPrevisualizacion.resultado) return;
    const resultado = modalPrevisualizacion.resultado;

    if (resultado.validacionSobrescritura?.bloqueado) {
      setUploadNotification({
        tipo: 'error',
        mensaje: 'No se pudo sobrescribir la Planeación Pedagógica.',
        detalles: `Acción bloqueada: ${resultado.validacionSobrescritura.motivosBloqueo.join(' • ')}`
      });
      setModalPrevisualizacion({ isOpen: false, resultado: null, filtroResumen: 'TODAS', expandedComp: null });
      return;
    }

    // Integrar a las colecciones globales reemplazando las competencias de este programa
    const otrasCompetencias = competencias.filter(c => c.programaCodigo && c.programaCodigo !== activeProgCodigo);
    const otrosRaps = raps.filter(r => r.programaCodigo && r.programaCodigo !== activeProgCodigo);

    const actualizadasComp = [...otrasCompetencias, ...resultado.competencias];
    const actualizadosRaps = [...otrosRaps, ...resultado.raps];
    const nuevosRegistros = resultado.registrosSeguimiento || [];

    // Almacenamiento y persistencia en estado y localStorage para futuros cruces de datos
    onActualizarCompetenciasYRaps(actualizadasComp, actualizadosRaps, nuevosRegistros);

    try {
      const stored = localStorage.getItem('sena_archivo_seguimiento_registros');
      const prevRegs: RegistroArchivoSeguimiento[] = stored ? JSON.parse(stored) : [];
      const otrosRegs = prevRegs.filter(r => r.programaCodigo !== activeProgCodigo);
      const consolidados = [...otrosRegs, ...nuevosRegistros];
      localStorage.setItem('sena_archivo_seguimiento_registros', JSON.stringify(consolidados));
    } catch (e) {
      console.error('Error persistiendo registros de seguimiento:', e);
    }

    const resumen = resultado.resumenCargue;
    const totalComp = resultado.competencias.length;
    const totalRaps = resultado.raps.length;
    const tecCount = resumen?.competenciasTecnicas.length || 0;
    const transCount = resumen?.competenciasTransversales.length || 0;
    const claveCount = resumen?.competenciasClave.length || 0;
    const rapsTec = resumen?.rapsTecnicos.length || 0;
    const rapsTrans = resumen?.rapsTransversales.length || 0;
    const rapsClave = resumen?.rapsClave.length || 0;
    const horasTotales = resumen?.horasTotales || resultado.detalles.horasTotales || 0;
    const esSobrescritura = resultado.validacionSobrescritura?.esSobrescritura;

    const homologadas = resultado.detalles.totalHomologadasNCL || 0;
    const msgHomologacion = homologadas > 0 
      ? ` (${homologadas} traducidas a códigos NCL oficiales por coincidir con el ≥90% de palabras de la estructura).` 
      : '';

    const detalleRegistros = ` Se almacenaron ${nuevosRegistros.length} registros granulares en memoria y almacenamiento local para futuros cruces con horarios, horas ejecutadas y juicios evaluativos.`;

    if (esSobrescritura) {
      setUploadNotification({
        tipo: 'success',
        mensaje: `✓ ¡Archivo de Seguimiento SOBREESCRITO EXITOSAMENTE para ${programaActual?.nombre || activeProgCodigo}!`,
        detalles: `Se reemplazó la planeación anterior sin conflictos y se cargaron con éxito ${totalComp} Competencias (${tecCount} técnicas, ${transCount} transversales, ${claveCount} clave) con ${totalRaps} RAPs (${rapsTec} técnicos, ${rapsTrans} transversales, ${rapsClave} clave) y ${horasTotales} horas lectivas${msgHomologacion}.${detalleRegistros}`
      });
    } else {
      setUploadNotification({
        tipo: 'success',
        mensaje: `✓ ¡Archivo de Seguimiento CARGADO Y ALMACENADO para ${programaActual?.nombre || activeProgCodigo}!`,
        detalles: `Se incorporaron al catálogo con éxito ${totalComp} Competencias (${tecCount} técnicas, ${transCount} transversales, ${claveCount} clave) con ${totalRaps} RAPs (${rapsTec} técnicos, ${rapsTrans} transversales, ${rapsClave} clave) y ${horasTotales} horas lectivas${msgHomologacion}.${detalleRegistros}`
      });
    }

    setModalPrevisualizacion({ isOpen: false, resultado: null, filtroResumen: 'TODAS', expandedComp: null });
  };

  // Cargar planeación oficial demo pre-construida
  const handleCargarDemo = () => {
    const demo = cargarPlaneacionPedagogicaDemo(activeProgCodigo);
    const otrasCompetencias = competencias.filter(c => c.programaCodigo !== activeProgCodigo);
    const otrosRaps = raps.filter(r => r.programaCodigo !== activeProgCodigo);

    onActualizarCompetenciasYRaps(
      [...otrasCompetencias, ...demo.competencias],
      [...otrosRaps, ...demo.raps],
      demo.registrosSeguimiento
    );

    setUploadNotification({
      tipo: 'info',
      mensaje: `Planeación Oficial GPFI-F-134 restaurada para ${programaActual?.nombre || activeProgCodigo}.`,
      detalles: `${demo.competencias.length} competencias y ${demo.raps.length} RAPs sincronizados.`
    });
  };

  // Guardar nuevo RAP manual
  const handleGuardarNuevoRap = () => {
    if (!modalNuevoRap.competencia || !nuevoRapForm.codigoRap || !nuevoRapForm.denominacion) {
      alert('Por favor complete el código y la denominación del RAP.');
      return;
    }

    const nuevoRap: ResultadoAprendizaje = {
      // UUID real: resultados_aprendizaje.id es UUID en Supabase — un id con
      // prefijo de texto (como el `rap_...` que se usaba antes) hacía que el
      // upsert lo rechazara por completo, en silencio.
      id: generarUuid(),
      programaCodigo: activeProgCodigo,
      competenciaCodigo: modalNuevoRap.competencia.codigo,
      competenciaDenominacion: modalNuevoRap.competencia.denominacion,
      codigoRap: nuevoRapForm.codigoRap.toUpperCase(),
      denominacion: nuevoRapForm.denominacion,
      fase: nuevoRapForm.fase,
      duracionHoras: Number(nuevoRapForm.duracionHoras) || 40
    };

    onActualizarCompetenciasYRaps(competencias, [...raps, nuevoRap]);
    setModalNuevoRap({ isOpen: false });
    setNuevoRapForm({
      codigoRap: '',
      denominacion: '',
      fase: 'Fase 1: Análisis',
      duracionHoras: 40
    });
  };

  // Fichas asociadas a este programa
  const fichasDelPrograma = fichas.filter(f => f.programaCodigo === activeProgCodigo);

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Encabezado Principal */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-black">
              Diseño Curricular
            </span>
            <span>•</span>
            <span>Archivo de Seguimiento</span>
          </div>
          <h1 className="text-2xl font-black text-[#111C2D] tracking-tight mt-1 flex items-center space-x-2.5">
            <BookOpen className="w-6 h-6 text-[#0D631B]" />
            <span>Catálogo de Competencias y RAPs por Programa</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Inspeccione la estructura pedagógica oficial. Al cargar el Archivo de Seguimiento en Excel se obtienen, totalizan y sincronizan automáticamente las competencias y sus RAPs con sus horas directas e independientes.
          </p>
        </div>

        {/* Acciones Rápidas */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="btn-descargar-plantilla-gpfi"
            onClick={() => descargarPlantillaPlaneacionExcel(
              activeProgCodigo,
              programaActual?.nombre || 'Programa',
              competenciasDelPrograma,
              rapsDelPrograma
            )}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-xs transition-colors"
            title="Descargar plantilla oficial de Archivo de Seguimiento en formato Excel (.xlsx)"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Plantilla Archivo de Seguimiento (.xlsx)</span>
          </button>

          {onLimpiarEstructura && (
            <button
              id="btn-borrar-estructura-competencias"
              onClick={() => {
                if (window.confirm('¿Confirmas que deseas BORRAR la estructura curricular actual y el catálogo de competencias? Esto dejará el sistema limpio para recibir una nueva planeación.')) {
                  onLimpiarEstructura();
                  setUploadNotification({
                    tipo: 'info',
                    mensaje: 'Estructura curricular borrada.',
                    detalles: 'El catálogo ha quedado limpio para recibir tu nueva planeación pedagógica o diseño curricular.'
                  });
                }
              }}
              className="flex items-center space-x-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 transition-colors"
              title="Borrar las competencias y RAPs actuales para carga limpia"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Borrar Estructura</span>
            </button>
          )}

          <button
            id="btn-cargar-demo-gpfi"
            onClick={handleCargarDemo}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold text-[#0D631B] transition-colors"
            title="Carga la planeación curricular predeterminada con 4 RAPs por competencia"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Cargar Planeación Demo</span>
          </button>

          {onNavigateToHorarios && (
            <button
              id="btn-ir-a-horarios"
              onClick={() => onNavigateToHorarios(activeProgCodigo)}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#0D631B] hover:bg-[#0a4d15] text-white rounded-xl text-xs font-bold shadow-md shadow-[#0D631B]/20 transition-all"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Programar en Horarios</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Selector de Programa de Formación (Tabs Visuales) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <GraduationCap className="w-4 h-4 text-slate-500" />
            <span>Seleccione el Programa de Formación a Consultar</span>
          </div>
          <span className="text-[11px] font-bold text-slate-500">
            {programas.length} programas disponibles en el centro
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {programas.map(prog => {
            const isSelected = prog.codigo === activeProgCodigo;
            const compCount = competencias.filter(c => c.programaCodigo === prog.codigo).length;
            const rapCount = raps.filter(r => r.programaCodigo === prog.codigo).length;

            return (
              <button
                key={prog.id}
                id={`tab-prog-${prog.codigo}`}
                onClick={() => {
                  setActiveProgCodigo(prog.codigo);
                  if (onSelectPrograma) onSelectPrograma(prog.codigo);
                }}
                className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#E8F5E9]/60 border-[#0D631B] shadow-xs'
                    : 'bg-slate-50/70 border-slate-200/80 hover:border-slate-300 hover:bg-slate-100/60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isSelected ? 'bg-[#0D631B] text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      Cód. {prog.codigo}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      v{prog.version}
                    </span>
                  </div>
                  <div className="font-bold text-xs text-[#111C2D] leading-tight line-clamp-2">
                    {prog.nombre}
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">{compCount} Competencias</span>
                  <span className="font-black text-[#0D631B]">{rapCount} RAPs</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tarjeta de Resumen del Programa Seleccionado */}
      <div className="bg-gradient-to-r from-[#F0F7F1] via-white to-white rounded-2xl border border-[#C8E6C9] p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#0D631B] text-white font-mono text-[11px] font-black">
                {programaActual.codigo}
              </span>
              <span className="text-xs font-bold text-slate-600">
                {programaActual.nivelFormacion} • Red {programaActual.redConocimiento}
              </span>
            </div>
            <h2 className="text-lg font-black text-[#111C2D]">
              {programaActual.nombre}
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              {programaActual.descripcion}
            </p>
          </div>

          {/* Estadísticas de Métricas Curriculares */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center shrink-0">
            <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Competencias</div>
              <div className="text-xl font-black text-[#111C2D] mt-0.5">{competenciasDelPrograma.length}</div>
              <div className="text-[10px] text-emerald-700 font-bold">Estructuradas</div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total RAPs</div>
              <div className="text-xl font-black text-[#0D631B] mt-0.5">{rapsDelPrograma.length}</div>
              <div className="text-[10px] text-slate-500 font-semibold">Resultados</div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Horas Lectivas</div>
              <div className="text-xl font-black text-blue-800 mt-0.5">{programaActual.duracionLectivaHoras}h</div>
              <div className="text-[10px] text-slate-500 font-semibold">Total Diseño</div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registros Base</div>
              <div className="text-xl font-black text-indigo-700 mt-0.5">
                {(registrosArchivoSeguimiento || []).filter(r => r.programaCodigo === activeProgCodigo).length}
              </div>
              <div className="text-[10px] text-indigo-600 font-semibold">Para Cruce Datos</div>
            </div>
          </div>
        </div>

        {/* Fichas Asociadas al Programa */}
        <div className="mt-4 pt-3 border-t border-slate-200/70 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-slate-500 flex items-center space-x-1">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Fichas activas cursando este programa ({fichasDelPrograma.length}):</span>
          </span>
          {fichasDelPrograma.length > 0 ? (
            fichasDelPrograma.map(f => (
              <span 
                key={f.id}
                className="px-2.5 py-0.5 rounded-lg bg-white text-emerald-800 border border-emerald-200 font-mono font-bold text-[11px]"
              >
                Ficha {f.numero_ficha} ({f.aprendicesActivos} aprendices)
              </span>
            ))
          ) : (
            <span className="text-slate-400 italic text-[11px]">
              No hay cohortes activas registradas para este código actualmente.
            </span>
          )}
        </div>
      </div>

      {/* Zona de Carga de Archivo de Seguimiento (.xlsx) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-black text-sm text-[#111C2D] flex items-center space-x-2">
              <UploadCloud className="w-4 h-4 text-[#0D631B]" />
              <span>Cargar Archivo de Seguimiento en Excel</span>
            </h3>
            <p className="text-xs text-slate-500">
              Arrastra o selecciona el Archivo de Seguimiento curricular para {programaActual.nombre}.
            </p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
            7 Columnas Estándar • Totalización Automática • Motor XLSX
          </span>
        </div>

        {/* Banner de Estructura Institucional */}
        <div className="p-3.5 bg-emerald-50/70 border border-emerald-300 rounded-xl text-emerald-950 text-xs space-y-2">
          <div className="flex items-center space-x-2 font-black text-[#0D631B]">
            <Layers className="w-4 h-4 text-[#0D631B] shrink-0" />
            <span>ESTRUCTURA DE 7 COLUMNAS REQUERIDAS EN EL ARCHIVO:</span>
          </div>

          <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200/60 flex flex-wrap items-center gap-1.5 font-mono text-[10.5px] text-slate-700">
            <span className="px-2 py-1 rounded bg-slate-50 border border-slate-200/80 font-semibold">1. FASE DE PROYECTO FORMATIVO</span>
            <span className="px-2 py-1 rounded bg-slate-50 border border-slate-200/80 font-semibold">2. ACTIVIDAD DE PROYECTO FORMATIVO</span>
            <span className="px-2 py-1 rounded bg-slate-50 border border-slate-200/80 font-semibold">3. COMPETENCIA</span>
            <span className="px-2 py-1 rounded bg-slate-50 border border-slate-200/80 font-semibold">4. RESULTADOS DE APRENDIZAJE</span>
            <span className="px-2 py-1 rounded bg-slate-50 border border-slate-200/80 font-semibold">5. ACTIVIDAD DE APRENDIZAJE</span>
            <span className="px-2 py-1 rounded bg-slate-50 border border-slate-200/80 font-semibold">6. HORAS TRABAJO DIRECTO</span>
            <span className="px-2 py-1 rounded bg-slate-50 border border-slate-200/80 font-semibold">7. HORAS TRABAJO INDEPENDIENTE</span>
          </div>
        </div>

        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleProcesarArchivo(file);
          }}
          className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            dragOver 
              ? 'border-[#0D631B] bg-[#E8F5E9]/50' 
              : 'border-slate-300 bg-slate-50/50 hover:bg-slate-100/60'
          }`}
        >
          <input 
            type="file" 
            accept=".xlsx,.xls,.csv,.txt" 
            className="hidden" 
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleProcesarArchivo(file);
            }} 
          />
          <div className="w-12 h-12 rounded-xl bg-[#E8F5E9] text-[#0D631B] flex items-center justify-center mb-2">
            {isUploading ? (
              <RefreshCw className="w-6 h-6 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-6 h-6" />
            )}
          </div>
          <div className="font-bold text-xs text-[#111C2D]">
            {isUploading ? 'Procesando, asociando jerarquías y totalizando horas...' : 'Arrastra aquí el Archivo de Seguimiento (.xlsx, .xls o .csv)'}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            O haz clic para examinar desde tu equipo • Compatible con Excel (.xlsx, .xls) y Archivos Planos (.csv, .txt)
          </p>
        </label>

        {/* Notificación de carga */}
        {uploadNotification && (
          <div className={`p-4 rounded-xl text-xs flex items-start justify-between border ${
            uploadNotification.tipo === 'success'
              ? 'bg-[#E8F5E9] border-[#C8E6C9] text-emerald-900'
              : uploadNotification.tipo === 'info'
              ? 'bg-blue-50 border-blue-200 text-blue-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}>
            <div className="flex items-start space-x-2.5">
              {uploadNotification.tipo === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-[#0D631B] shrink-0 mt-0.5" />
              ) : uploadNotification.tipo === 'info' ? (
                <Sparkles className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-bold">{uploadNotification.mensaje}</div>
                {uploadNotification.detalles && (
                  <div className="text-[11px] opacity-85 mt-0.5 font-medium">{uploadNotification.detalles}</div>
                )}
                {uploadNotification.tipo === 'error' && modalErrorCargue && (
                  <button
                    type="button"
                    onClick={() => setModalErrorCargue(prev => prev ? { ...prev, isOpen: true } : null)}
                    className="mt-2 inline-flex items-center space-x-1.5 px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-[11px] font-bold transition-colors border border-red-300"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Ver Diagnóstico Detallado de Inconsistencias y Filas</span>
                  </button>
                )}
              </div>
            </div>
            <button 
              onClick={() => setUploadNotification(null)}
              className="text-slate-400 hover:text-slate-600 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Barra de Filtros, Búsqueda y Control de Acordeones */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-buscar-competencia-rap"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código, RAP o palabra clave..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#111C2D] focus:outline-none focus:border-[#0D631B] focus:bg-white transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Pestañas de Filtro por Categoría */}
          <div className="flex items-center space-x-1 p-0.5 bg-slate-100 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setFilterTipo('TODOS')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                filterTipo === 'TODOS'
                  ? 'bg-[#111C2D] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              Todas ({competenciasDelPrograma.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTipo('Técnica')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                filterTipo === 'Técnica'
                  ? 'bg-[#005A8C] text-white shadow-2xs'
                  : 'text-blue-700 hover:bg-blue-50'
              }`}
            >
              Técnicas ({countTec})
            </button>
            <button
              type="button"
              onClick={() => setFilterTipo('Transversal')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                filterTipo === 'Transversal'
                  ? 'bg-[#2E7D32] text-white shadow-2xs'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              Transversales ({countTrans})
            </button>
            <button
              type="button"
              onClick={() => setFilterTipo('Clave')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                filterTipo === 'Clave'
                  ? 'bg-purple-700 text-white shadow-2xs'
                  : 'text-purple-700 hover:bg-purple-50'
              }`}
            >
              Clave ({countClave})
            </button>
          </div>

          {/* Filtro por Fase */}
          <select
            id="select-filtro-fase"
            value={filterFase}
            onChange={(e) => setFilterFase(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#111C2D] font-medium focus:outline-none focus:border-[#0D631B]"
          >
            <option value="TODAS">Todas las fases</option>
            <option value="Inducción">Fase: Inducción</option>
            <option value="Fase 1: Análisis">Fase 1: Análisis</option>
            <option value="Fase 2: Planeación">Fase 2: Planeación</option>
            <option value="Fase 3: Ejecución">Fase 3: Ejecución</option>
            <option value="Fase 4: Evaluación">Fase 4: Evaluación</option>
          </select>

          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block"></div>

          {/* Expandir / Colapsar Todo */}
          <button
            onClick={expandAll}
            className="px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Expandir
          </button>
          <button
            onClick={collapseAll}
            className="px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Colapsar
          </button>
        </div>
      </div>

      {/* Lista de Competencias con sus RAPs (Visualización Tipo Acordeón Estructurado) */}
      <div className="space-y-4">
        {competenciasFiltradas.length > 0 ? (
          competenciasFiltradas.map((comp) => {
            const isExpanded = expandedCompIds.has(comp.id);
            const rapsDeComp = rapsDelPrograma.filter(r => r.competenciaCodigo === comp.codigo);
            const totalHorasRaps = rapsDeComp.reduce((acc, curr) => acc + (curr.duracionHoras || 0), 0);

            return (
              <div
                key={comp.id}
                id={`competencia-card-${comp.codigo}`}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all"
              >
                {/* Cabecera de la Competencia (Clickable para expandir/colapsar) */}
                <div
                  onClick={() => toggleExpand(comp.id)}
                  className="p-5 cursor-pointer hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 select-none"
                >
                  <div className="flex items-start space-x-3.5 min-w-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(comp.id);
                      }}
                      className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 hover:bg-[#0D631B] hover:text-white flex items-center justify-center shrink-0 mt-0.5 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-slate-100 font-mono text-xs font-black text-slate-800 border border-slate-200">
                          Norma / Cód. {comp.codigo}
                        </span>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          comp.tipo === 'Técnica'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : comp.tipo === 'Bilingüismo'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : 'bg-purple-50 text-purple-800 border border-purple-200'
                        }`}>
                          {comp.tipo}
                        </span>

                        {comp.faseSugerida && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                            {comp.faseSugerida}
                          </span>
                        )}
                      </div>

                      <h3 className="font-black text-sm text-[#111C2D] leading-snug">
                        {comp.denominacion}
                      </h3>
                    </div>
                  </div>

                  {/* Resumen de RAPs y Horas en la cabecera */}
                  <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
                    <div className="text-right mr-1">
                      <div className="text-xs font-black text-[#0D631B]">
                        {rapsDeComp.length} Resultados (RAPs)
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        {totalHorasRaps > 0 ? totalHorasRaps : comp.horasEstimadas} horas estimadas
                      </div>
                    </div>

                    <button
                      id={`btn-edit-comp-${comp.codigo}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setModalEditarComp({
                          isOpen: true,
                          competenciaId: comp.id,
                          codigo: comp.codigo,
                          denominacion: comp.denominacion,
                          tipo: comp.tipo as any,
                          faseSugerida: comp.faseSugerida || 'Fase 1: Análisis',
                          horasEstimadas: comp.horasEstimadas || 40
                        });
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 text-[11px] font-bold transition-colors flex items-center space-x-1"
                      title="Editar código, denominación, tipo o fase de esta competencia"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>

                    <button
                      id={`btn-add-rap-comp-${comp.codigo}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setModalNuevoRap({ isOpen: true, competencia: comp });
                        setNuevoRapForm({
                          codigoRap: `RAP 0${rapsDeComp.length + 1}`,
                          denominacion: '',
                          fase: comp.faseSugerida || 'Fase 1: Análisis',
                          duracionHoras: 40
                        });
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-[#0D631B] text-slate-700 hover:text-white text-[11px] font-bold transition-colors flex items-center space-x-1"
                      title="Agregar un nuevo Resultado de Aprendizaje a esta competencia"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ RAP</span>
                    </button>
                  </div>
                </div>

                {/* Lista de Resultados de Aprendizaje (RAPs) hijos de esta competencia */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 border-t border-slate-100 bg-slate-50/40">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                      <span>Resultados de Aprendizaje Vinculados (RAPs)</span>
                      <span>Una competencia puede incluir 4 o más RAPs articulados</span>
                    </div>

                    {rapsDeComp.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {rapsDeComp.map((rap, idx) => (
                          <div
                            key={rap.id}
                            id={`card-rap-${rap.id}`}
                            className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-[#0D631B] transition-all space-y-2 flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <div className="flex items-center space-x-1.5">
                                  <span className="px-2 py-0.5 rounded-md bg-[#0D631B] text-white font-mono text-[11px] font-black">
                                    {rap.codigoRap}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-500">
                                    #{idx + 1}
                                  </span>
                                </div>

                                <div className="flex items-center space-x-1">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                    {rap.fase}
                                  </span>
                                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800" title={`${rap.horasTrabajoDirecto ?? Math.round((rap.duracionHoras || 40) * 0.8)}h directas + ${rap.horasTrabajoAutonomo ?? ((rap.duracionHoras || 40) - Math.round((rap.duracionHoras || 40) * 0.8))}h independientes`}>
                                    {rap.duracionHoras || 40}h
                                  </span>
                                </div>
                              </div>

                              <p className="text-xs text-slate-700 font-medium leading-relaxed">
                                {rap.denominacion}
                              </p>

                              {/* Horas desglosadas por RAP */}
                              <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-medium pt-0.5">
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                                  Directas: <strong>{rap.horasTrabajoDirecto ?? Math.round((rap.duracionHoras || 40) * 0.8)}h</strong>
                                </span>
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                                  Indep.: <strong>{rap.horasTrabajoAutonomo ?? ((rap.duracionHoras || 40) - Math.round((rap.duracionHoras || 40) * 0.8))}h</strong>
                                </span>
                              </div>

                              {/* Actividades de Aprendizaje vinculadas (Informativas) */}
                              {rap.actividadesAprendizaje && rap.actividadesAprendizaje.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    Actividades de Aprendizaje ({rap.actividadesAprendizaje.length}):
                                  </span>
                                  <div className="space-y-1">
                                    {rap.actividadesAprendizaje.map((aa, aaIdx) => (
                                      <div key={aaIdx} className="text-[10.5px] text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200/60 leading-tight">
                                        • {aa}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                              <span>✓ Archivo de Seguimiento</span>
                              <div className="flex items-center space-x-2">
                                <button
                                  id={`btn-edit-rap-${rap.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const hd = rap.horasTrabajoDirecto ?? Math.round((rap.duracionHoras || 40) * 0.8);
                                    const hi = rap.horasTrabajoAutonomo ?? ((rap.duracionHoras || 40) - hd);
                                    setModalEditarRap({
                                      isOpen: true,
                                      rapId: rap.id,
                                      codigoRap: rap.codigoRap,
                                      denominacion: rap.denominacion,
                                      fase: rap.fase || comp.faseSugerida || 'Fase 1: Análisis',
                                      horasTrabajoDirecto: hd,
                                      horasTrabajoAutonomo: hi,
                                      actividadesAprendizaje: [...(rap.actividadesAprendizaje || [])],
                                      nuevaActividadTexto: ''
                                    });
                                  }}
                                  className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-[#0D631B] border border-slate-200 font-bold transition-colors inline-flex items-center space-x-1"
                                  title="Editar RAP y gestionar sus Actividades de Aprendizaje"
                                >
                                  <Pencil className="w-3 h-3 text-[#0D631B]" />
                                  <span>Editar RAP</span>
                                </button>
                                <span className="text-[#0D631B] font-bold">Asignable</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center bg-white rounded-xl border border-dashed border-slate-200 text-slate-400 space-y-2">
                        <Award className="w-6 h-6 text-slate-300 mx-auto" />
                        <div className="text-xs font-semibold text-slate-600">
                          No hay RAPs registrados aún para esta competencia.
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Carga la planeación pedagógica en Excel para sincronizarlos automáticamente o agrega uno manual.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#0D631B] flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">
              {competenciasDelPrograma.length === 0 ? 'Sin competencias registradas para ADSO' : 'No se encontraron competencias con los filtros seleccionados'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {competenciasDelPrograma.length === 0
                ? 'El catálogo de competencias se encuentra completamente limpio. Arrastra o selecciona tu archivo Excel oficial de Planeación Pedagógica (GPFI-F-134) en la zona de carga superior para extraer automáticamente todas las competencias y RAPs.'
                : 'Prueba cambiando los filtros de tipo o fase de aprendizaje.'}
            </p>
          </div>
        )}
      </div>

      {/* Modal para Agregar RAP Manual */}
      {modalNuevoRap.isOpen && modalNuevoRap.competencia && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-sm text-[#111C2D]">
                  Registrar Nuevo Resultado de Aprendizaje (RAP)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Competencia {modalNuevoRap.competencia.codigo} • {modalNuevoRap.competencia.denominacion}
                </p>
              </div>
              <button
                onClick={() => setModalNuevoRap({ isOpen: false })}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Código del RAP (ej. RAP 01, RAP 04)
                </label>
                <input
                  type="text"
                  value={nuevoRapForm.codigoRap}
                  onChange={(e) => setNuevoRapForm({ ...nuevoRapForm, codigoRap: e.target.value })}
                  placeholder="RAP 01"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-[#111C2D] focus:outline-none focus:border-[#0D631B]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Denominación del Resultado de Aprendizaje
                </label>
                <textarea
                  rows={3}
                  value={nuevoRapForm.denominacion}
                  onChange={(e) => setNuevoRapForm({ ...nuevoRapForm, denominacion: e.target.value })}
                  placeholder="Describe la habilidad o conocimiento a alcanzar por el aprendiz..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#111C2D] focus:outline-none focus:border-[#0D631B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Fase del Proyecto
                  </label>
                  <select
                    value={nuevoRapForm.fase}
                    onChange={(e) => setNuevoRapForm({ ...nuevoRapForm, fase: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#111C2D] font-semibold focus:outline-none focus:border-[#0D631B]"
                  >
                    <option value="Fase 1: Análisis">Fase 1: Análisis</option>
                    <option value="Fase 2: Planeación">Fase 2: Planeación</option>
                    <option value="Fase 3: Ejecución">Fase 3: Ejecución</option>
                    <option value="Fase 4: Evaluación">Fase 4: Evaluación</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Horas Estimadas
                  </label>
                  <input
                    type="number"
                    value={nuevoRapForm.duracionHoras}
                    onChange={(e) => setNuevoRapForm({ ...nuevoRapForm, duracionHoras: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#111C2D] focus:outline-none focus:border-[#0D631B]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setModalNuevoRap({ isOpen: false })}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGuardarNuevoRap}
                className="px-4 py-2 rounded-xl bg-[#0D631B] hover:bg-[#0a4d15] text-white text-xs font-bold shadow-sm"
              >
                Guardar RAP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Previsualización y Validación de Sobrescritura de Planeación */}
      {modalPrevisualizacion.isOpen && modalPrevisualizacion.resultado && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-slate-200">
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-[#005A8C] text-[10px] font-bold font-mono">
                    GPFI-F-134
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">•</span>
                  <span className="text-[11px] font-bold text-slate-500">
                    Programa: {programaActual.codigo} - {programaActual.nombre}
                  </span>
                </div>
                <h3 className="font-black text-base text-[#111C2D] mt-0.5 flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-[#005A8C]" />
                  <span>Previsualización de la Planeación Pedagógica</span>
                </h3>
              </div>
              <button
                onClick={() => setModalPrevisualizacion({ isOpen: false, resultado: null, filtroResumen: 'TODAS', expandedComp: null })}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Banner de Validación de Sobrescritura */}
            {modalPrevisualizacion.resultado.validacionSobrescritura && (
              <div>
                {modalPrevisualizacion.resultado.validacionSobrescritura.bloqueado ? (
                  <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 space-y-2">
                    <div className="flex items-start space-x-2.5">
                      <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-black text-xs text-rose-900 uppercase tracking-wide">
                          ⛔ Sobrescritura Bloqueada: No se puede sobreescribir la planeación actual
                        </div>
                        <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                          Esta planeación ya cuenta con trabajo académico registrado en el sistema. Para proteger los horarios y las evaluaciones de los aprendices, <strong>el sistema no permite sobreescribirla directamente</strong>:
                        </p>
                        <ul className="mt-2 space-y-1 text-[11px] text-rose-900 bg-white/70 p-2.5 rounded-lg border border-rose-200">
                          {modalPrevisualizacion.resultado.validacionSobrescritura.motivosBloqueo.map((motivo, idx) => (
                            <li key={idx} className="flex items-start space-x-1.5 font-medium">
                              <span className="text-rose-600 font-bold">•</span>
                              <span>{motivo}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-2 text-[11px] text-rose-700 font-medium">
                          💡 <em>{modalPrevisualizacion.resultado.validacionSobrescritura.sugerencia || 'Para reemplazarla, primero libere los horarios asociados o limpie la estructura desde "Borrar Estructura".'}</em>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : modalPrevisualizacion.resultado.validacionSobrescritura.esSobrescritura ? (
                  <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-300 text-sky-950 space-y-1">
                    <div className="flex items-center space-x-2 font-black text-xs text-sky-900">
                      <RefreshCw className="w-4 h-4 text-sky-600 animate-spin-reverse" />
                      <span>🔄 Sobrescritura Permitida: Se reemplazará la planeación anterior</span>
                    </div>
                    <p className="text-xs text-sky-800 leading-relaxed">
                      Se detectó una planeación existente previa, pero <strong>aún NO se ha trabajado con ella</strong> (0 horarios programados, 0 actividades de seguimiento y 0 horas ejecutadas reportadas). Al confirmar, la estructura anterior se sobreescribirá limpiamente por esta nueva versión sin generar duplicados.
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-1">
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
              const res = modalPrevisualizacion.resultado;
              const resumen = res.resumenCargue;
              const totalComp = res.competencias.length;
              const tecComp = resumen?.competenciasTecnicas.length ?? 0;
              const transComp = resumen?.competenciasTransversales.length ?? 0;
              const claveComp = resumen?.competenciasClave.length ?? 0;

              const totalRaps = res.raps.length;
              const tecRaps = resumen?.rapsTecnicos.length ?? 0;
              const transRaps = resumen?.rapsTransversales.length ?? 0;
              const claveRaps = resumen?.rapsClave.length ?? 0;

              const horasTotales = resumen?.horasTotales ?? res.detalles.horasTotales ?? 0;
              const horasDirectas = resumen?.horasTrabajoDirecto ?? Math.round(horasTotales * 0.8);
              const horasAutonomas = resumen?.horasTrabajoAutonomo ?? (horasTotales - horasDirectas);

              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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

                    {/* Tarjeta Registros Granulares Almacenados */}
                    <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider">Registros Granulares</span>
                        <span className="text-xl font-black text-indigo-700">{res.registrosSeguimiento?.length || 0}</span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-indigo-200/60 text-[10px] text-indigo-700 font-semibold truncate">
                        Almacenamiento para cruces
                      </div>
                    </div>
                  </div>

                  {/* Resumen del Contenido a Cargar */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-[#005A8C]" />
                        <span>Resumen de Competencias y RAPs que se van a Cargar:</span>
                      </div>

                      {/* Filtros por Categoría */}
                      <div className="flex items-center space-x-1 text-[10px] flex-wrap gap-y-1">
                        <button
                          type="button"
                          onClick={() => setModalPrevisualizacion({ ...modalPrevisualizacion, filtroResumen: 'TODAS', expandedComp: 'TODAS' })}
                          className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                            modalPrevisualizacion.filtroResumen === 'TODAS'
                              ? 'bg-[#111C2D] text-white shadow-2xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Todas ({totalComp})
                        </button>
                        <button
                          type="button"
                          onClick={() => setModalPrevisualizacion({ ...modalPrevisualizacion, filtroResumen: 'Técnica', expandedComp: 'TODAS' })}
                          className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                            modalPrevisualizacion.filtroResumen === 'Técnica'
                              ? 'bg-[#005A8C] text-white shadow-2xs'
                              : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
                          }`}
                        >
                          Técnicas ({tecComp})
                        </button>
                        <button
                          type="button"
                          onClick={() => setModalPrevisualizacion({ ...modalPrevisualizacion, filtroResumen: 'Transversal', expandedComp: 'TODAS' })}
                          className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                            modalPrevisualizacion.filtroResumen === 'Transversal'
                              ? 'bg-[#2E7D32] text-white shadow-2xs'
                              : 'bg-white text-[#2E7D32] border border-emerald-200 hover:bg-emerald-50'
                          }`}
                        >
                          Transversales ({transComp})
                        </button>
                        <button
                          type="button"
                          onClick={() => setModalPrevisualizacion({ ...modalPrevisualizacion, filtroResumen: 'Clave', expandedComp: 'TODAS' })}
                          className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                            modalPrevisualizacion.filtroResumen === 'Clave'
                              ? 'bg-purple-700 text-white shadow-2xs'
                              : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-50'
                          }`}
                        >
                          Clave ({claveComp})
                        </button>
                      </div>
                    </div>

                    {/* Lista Desglosada según la pestaña seleccionada */}
                    {(() => {
                      const f = modalPrevisualizacion.filtroResumen;
                      const listaCompetenciasModal: Competencia[] = (() => {
                        if (f === 'Técnica') {
                          return (resumen?.competenciasTecnicas && resumen.competenciasTecnicas.length > 0)
                            ? resumen.competenciasTecnicas
                            : res.competencias.filter(c => categorizarTipoCompetencia(c.tipo, c.denominacion, c.codigo) === 'Técnica');
                        }
                        if (f === 'Transversal') {
                          return (resumen?.competenciasTransversales && resumen.competenciasTransversales.length > 0)
                            ? resumen.competenciasTransversales
                            : res.competencias.filter(c => categorizarTipoCompetencia(c.tipo, c.denominacion, c.codigo) === 'Transversal');
                        }
                        if (f === 'Clave') {
                          return (resumen?.competenciasClave && resumen.competenciasClave.length > 0)
                            ? resumen.competenciasClave
                            : res.competencias.filter(c => categorizarTipoCompetencia(c.tipo, c.denominacion, c.codigo) === 'Clave');
                        }
                        return res.competencias;
                      })();

                      return (
                        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 text-[11px]">
                          <div className="flex items-center justify-between px-1 py-0.5 text-[10px] text-slate-500 font-semibold">
                            <span>
                              Mostrando {listaCompetenciasModal.length} {f === 'TODAS' ? 'competencias' : `competencias (${f})`}:
                            </span>
                            <span className="text-slate-400">Clic para ver / ocultar RAPs</span>
                          </div>

                          {listaCompetenciasModal.length === 0 ? (
                            <div className="p-4 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                              No hay competencias en la categoría seleccionada ({f}).
                            </div>
                          ) : (
                            listaCompetenciasModal.map(comp => {
                              const tipoReal = categorizarTipoCompetencia(comp.tipo, comp.denominacion, comp.codigo);
                              const rapsDeComp = res.raps.filter(r => 
                                r.competenciaCodigo === comp.codigo || 
                                (comp.denominacion && r.competenciaDenominacion && r.competenciaDenominacion.trim().toLowerCase() === comp.denominacion.trim().toLowerCase())
                              );
                              const isExpanded = modalPrevisualizacion.expandedComp === 'TODAS' || modalPrevisualizacion.expandedComp === comp.codigo;

                              return (
                                <div 
                                  key={comp.codigo} 
                                  className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-0.5 flex-1 min-w-0">
                                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                                        <span className="font-mono font-bold text-slate-800 text-[10px] bg-slate-100 px-1.5 py-0.2 rounded">
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
                                      <div className="font-bold text-slate-800 text-[11px] leading-snug">
                                        {comp.denominacion}
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => setModalPrevisualizacion({
                                        ...modalPrevisualizacion,
                                        expandedComp: isExpanded && modalPrevisualizacion.expandedComp !== 'TODAS' ? null : isExpanded && modalPrevisualizacion.expandedComp === 'TODAS' ? null : comp.codigo
                                      })}
                                      className="shrink-0 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center space-x-1 transition-colors"
                                    >
                                      <span>{rapsDeComp.length} RAPs</span>
                                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                    </button>
                                  </div>

                                  {/* Detalle de RAPs de la competencia */}
                                  {isExpanded && (
                                    <div className="mt-2 pt-2 border-t border-slate-100 space-y-1 bg-slate-50/80 p-2.5 rounded-lg">
                                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                                        Resultados de Aprendizaje Vinculados ({rapsDeComp.length}):
                                      </div>
                                      {rapsDeComp.length === 0 ? (
                                        <div className="text-[10px] text-slate-400 italic">No tiene RAPs asociados explícitos.</div>
                                      ) : (
                                        rapsDeComp.map((rap, rIdx) => (
                                          <div key={rIdx} className="flex items-start justify-between text-[10px] py-1 border-b border-slate-200/50 last:border-0">
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

            {/* Homologación NCL al 90% */}
            {modalPrevisualizacion.resultado.detalles.traduccionesNCL && modalPrevisualizacion.resultado.detalles.traduccionesNCL.length > 0 && (
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 space-y-1.5 text-xs">
                <div className="font-bold text-blue-900 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Reporte de Homologación NCL (Regla del 90% de coincidencia de palabras):</span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-mono font-bold">
                    {modalPrevisualizacion.resultado.detalles.totalHomologadasNCL || 0} Homologadas
                  </span>
                </div>
                <div className="space-y-1 max-h-28 overflow-y-auto text-[10px]">
                  {modalPrevisualizacion.resultado.detalles.traduccionesNCL.map((t, idx) => (
                    <div key={idx} className="p-1.5 rounded bg-white border border-slate-200 flex items-center justify-between">
                      <span className="truncate pr-2">
                        <strong>{t.codigoNCL}</strong>: {t.denominacionOficial}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded font-bold shrink-0 ${
                        t.porcentajeCoincidencia >= 90 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {t.porcentajeCoincidencia}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Advertencias e Inconsistencias con Fila Exacta de Excel */}
            {modalPrevisualizacion.resultado.detalles.advertencias && modalPrevisualizacion.resultado.detalles.advertencias.length > 0 && (
              <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-300 space-y-1.5 text-xs">
                <div className="font-bold text-amber-900 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Inconsistencias y Observaciones Detectadas en el Archivo Excel:</span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-200/80 text-amber-900 text-[10px] font-mono font-bold">
                    {modalPrevisualizacion.resultado.detalles.advertencias.length} Alertas
                  </span>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto text-[10px]">
                  {modalPrevisualizacion.resultado.detalles.advertencias.map((adv, idx) => (
                    <div key={idx} className="p-1.5 rounded bg-white/90 border border-amber-200 text-amber-950 font-medium flex items-start space-x-1.5">
                      <span className="text-amber-600 font-bold">•</span>
                      <span className="leading-snug">{adv}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Acciones del Modal */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setModalPrevisualizacion({ isOpen: false, resultado: null, filtroResumen: 'TODAS', expandedComp: null })}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>

              {modalPrevisualizacion.resultado.validacionSobrescritura?.bloqueado ? (
                <button
                  type="button"
                  disabled
                  className="px-5 py-2.5 rounded-xl bg-slate-200 text-slate-500 text-xs font-bold cursor-not-allowed flex items-center space-x-2 border border-slate-300"
                  title="Sobrescritura no permitida debido a trabajo académico existente en la planeación"
                >
                  <ShieldAlert className="w-4 h-4 text-slate-400" />
                  <span>⛔ Sobrescritura Bloqueada (Planeación en Uso)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmarCargueModal}
                  className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition-all flex items-center space-x-2 ${
                    modalPrevisualizacion.resultado.validacionSobrescritura?.esSobrescritura
                      ? 'bg-[#005A8C] hover:bg-[#004266] shadow-[#005A8C]/20'
                      : 'bg-[#0D631B] hover:bg-[#0a4d15] shadow-[#0D631B]/20'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {modalPrevisualizacion.resultado.validacionSobrescritura?.esSobrescritura
                      ? `🔄 Confirmar y Sobreescribir Planeación (${modalPrevisualizacion.resultado.competencias.length} Comp, ${modalPrevisualizacion.resultado.raps.length} RAPs)`
                      : `✓ Confirmar y Cargar Planeación (${modalPrevisualizacion.resultado.competencias.length} Comp, ${modalPrevisualizacion.resultado.raps.length} RAPs)`}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Modal de Diagnóstico de Errores e Inconsistencias */}
      {modalErrorCargue && modalErrorCargue.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-rose-200 max-w-2xl w-full shadow-2xl p-6 space-y-4 max-h-[90vh] flex flex-col">
            {/* Cabecera del Modal de Error */}
            <div className="flex items-start justify-between border-b border-rose-100 pb-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black uppercase tracking-wider flex items-center space-x-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Diagnóstico de Archivo Excel</span>
                  </span>
                  {modalErrorCargue.detallesTecnicos && (
                    <span className="text-[10px] text-slate-500 font-mono">
                      {modalErrorCargue.detallesTecnicos}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-black text-rose-950 flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>{modalErrorCargue.titulo}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalErrorCargue(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mensaje Principal */}
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 font-medium leading-relaxed">
              {modalErrorCargue.mensaje}
            </div>

            {/* Listado de Inconsistencias / Filas con Alerta */}
            <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
              <div className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center justify-between">
                <span>Inconsistencias y Filas Detectadas ({modalErrorCargue.advertencias.length}):</span>
                <span className="text-[10px] font-normal text-slate-500">Revise las filas señaladas en Excel</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 p-3 bg-slate-50 rounded-2xl border border-slate-200 max-h-56 text-xs">
                {modalErrorCargue.advertencias.map((adv, idx) => (
                  <div 
                    key={idx} 
                    className="p-2 bg-white rounded-xl border border-slate-200/80 shadow-2xs flex items-start space-x-2 text-slate-800"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span className="leading-snug text-[11px] font-medium">{adv}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Guía Rápida de Solución */}
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1">
              <div className="font-bold flex items-center space-x-1.5 text-amber-950">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>¿Cómo solucionar y dejar listo el Archivo de Seguimiento?</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-amber-800">
                <li>Asegúrese de incluir las 7 columnas: <strong>FASE DE PROYECTO FORMATIVO, ACTIVIDAD DE PROYECTO FORMATIVO, COMPETENCIA, RESULTADOS DE APRENDIZAJE, ACTIVIDAD DE APRENDIZAJE, HORAS TRABAJO DIRECTO, HORAS TRABAJO INDEPENDIENTE</strong>.</li>
                <li>Recuerde que las horas por actividad de proyecto se <strong>totalizan automáticamente</strong> sumando presenciales e independientes para cada RAP.</li>
                <li>Verifique que no esté incluida la fila ni hoja de la <strong>Etapa Práctica/Productiva</strong> (solo Etapa Lectiva).</li>
              </ul>
            </div>

            {/* Acciones */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => descargarPlantillaPlaneacionExcel(
                  activeProgCodigo,
                  programaActual?.nombre || 'Programa',
                  competenciasDelPrograma,
                  rapsDelPrograma
                )}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Descargar Plantilla Archivo de Seguimiento</span>
              </button>

              <button
                type="button"
                onClick={() => setModalErrorCargue(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Entendido / Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Editar Competencia */}
      {modalEditarComp.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#111C2D]">Editar Competencia</h3>
                  <p className="text-[11px] text-slate-500">Modifique o complete los datos curriculares</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalEditarComp(prev => ({ ...prev, isOpen: false }))}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Código de la Competencia / NCL:</label>
                <input
                  type="text"
                  value={modalEditarComp.codigo}
                  onChange={(e) => setModalEditarComp(prev => ({ ...prev, codigo: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#0D631B] text-xs font-mono font-bold text-slate-800"
                  placeholder="Ej: 220501092"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Denominación Oficial de la Competencia:</label>
                <textarea
                  rows={3}
                  value={modalEditarComp.denominacion}
                  onChange={(e) => setModalEditarComp(prev => ({ ...prev, denominacion: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#0D631B] text-xs text-slate-800 leading-relaxed"
                  placeholder="Ingrese el nombre completo de la norma o competencia"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tipo de Competencia:</label>
                  <select
                    value={modalEditarComp.tipo}
                    onChange={(e) => setModalEditarComp(prev => ({ ...prev, tipo: e.target.value as any }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#0D631B] text-xs font-bold text-slate-800"
                  >
                    <option value="Técnica">Técnica</option>
                    <option value="Transversal">Transversal</option>
                    <option value="Clave">Clave</option>
                    <option value="Bilingüismo">Bilingüismo</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Fase Sugerida:</label>
                  <select
                    value={modalEditarComp.faseSugerida}
                    onChange={(e) => setModalEditarComp(prev => ({ ...prev, faseSugerida: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#0D631B] text-xs font-bold text-slate-800"
                  >
                    <option value="Fase 1: Análisis">Fase 1: Análisis</option>
                    <option value="Fase 2: Planeación">Fase 2: Planeación</option>
                    <option value="Fase 3: Ejecución">Fase 3: Ejecución</option>
                    <option value="Fase 4: Evaluación">Fase 4: Evaluación</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Horas Estimadas:</label>
                <input
                  type="number"
                  min={1}
                  value={modalEditarComp.horasEstimadas}
                  onChange={(e) => setModalEditarComp(prev => ({ ...prev, horasEstimadas: Number(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#0D631B] text-xs font-bold text-slate-800"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setModalEditarComp(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGuardarEdicionComp}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Cambios</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Editar RAP y sus Actividades de Aprendizaje */}
      {modalEditarRap.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 border border-slate-200 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#0D631B] flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#111C2D]">Editar Resultado de Aprendizaje (RAP)</h3>
                  <p className="text-[11px] text-slate-500">Gestione horas y actividades de aprendizaje asociadas</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalEditarRap(prev => ({ ...prev, isOpen: false }))}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Código del RAP:</label>
                  <input
                    type="text"
                    value={modalEditarRap.codigoRap}
                    onChange={(e) => setModalEditarRap(prev => ({ ...prev, codigoRap: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#0D631B] text-xs font-mono font-bold text-slate-800"
                    placeholder="Ej: RAP-01"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Fase:</label>
                  <select
                    value={modalEditarRap.fase}
                    onChange={(e) => setModalEditarRap(prev => ({ ...prev, fase: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#0D631B] text-xs font-bold text-slate-800"
                  >
                    <option value="Fase 1: Análisis">Fase 1: Análisis</option>
                    <option value="Fase 2: Planeación">Fase 2: Planeación</option>
                    <option value="Fase 3: Ejecución">Fase 3: Ejecución</option>
                    <option value="Fase 4: Evaluación">Fase 4: Evaluación</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Denominación del Resultado de Aprendizaje:</label>
                <textarea
                  rows={2}
                  value={modalEditarRap.denominacion}
                  onChange={(e) => setModalEditarRap(prev => ({ ...prev, denominacion: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#0D631B] text-xs text-slate-800 leading-relaxed"
                  placeholder="Ingrese el texto del resultado de aprendizaje"
                />
              </div>

              {/* Horas Directas e Independientes (Totalizadas para el RAP) */}
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-2">
                <span className="font-bold text-emerald-950 block text-[11.5px]">
                  Horas Oficiales del RAP (Totalizadas):
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Horas Trabajo Directo (HD):</label>
                    <input
                      type="number"
                      min={0}
                      value={modalEditarRap.horasTrabajoDirecto}
                      onChange={(e) => setModalEditarRap(prev => ({ ...prev, horasTrabajoDirecto: Number(e.target.value) || 0 }))}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-hidden focus:border-[#0D631B] text-xs font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Horas Trabajo Independiente (HI):</label>
                    <input
                      type="number"
                      min={0}
                      value={modalEditarRap.horasTrabajoAutonomo}
                      onChange={(e) => setModalEditarRap(prev => ({ ...prev, horasTrabajoAutonomo: Number(e.target.value) || 0 }))}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-hidden focus:border-[#0D631B] text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div className="text-[11px] text-emerald-800 font-semibold flex items-center justify-between pt-1 border-t border-emerald-200/60">
                  <span>Duración Total Calculada:</span>
                  <span className="font-black px-2 py-0.5 rounded bg-white border border-emerald-300">
                    {Number(modalEditarRap.horasTrabajoDirecto) + Number(modalEditarRap.horasTrabajoAutonomo)} Horas
                  </span>
                </div>
              </div>

              {/* Actividades de Aprendizaje vinculadas (Informativas) */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 block text-xs">
                    Actividades de Aprendizaje ({modalEditarRap.actividadesAprendizaje.length}):
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">Metadato informativo N:M</span>
                </div>

                {/* Agregar nueva actividad */}
                <div className="flex items-center space-x-1.5">
                  <input
                    type="text"
                    value={modalEditarRap.nuevaActividadTexto}
                    onChange={(e) => setModalEditarRap(prev => ({ ...prev, nuevaActividadTexto: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (modalEditarRap.nuevaActividadTexto.trim()) {
                          setModalEditarRap(prev => ({
                            ...prev,
                            actividadesAprendizaje: [...prev.actividadesAprendizaje, prev.nuevaActividadTexto.trim()],
                            nuevaActividadTexto: ''
                          }));
                        }
                      }
                    }}
                    placeholder="Escriba nueva Actividad de Aprendizaje y presione Agregar..."
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-hidden focus:border-[#0D631B] text-xs text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (modalEditarRap.nuevaActividadTexto.trim()) {
                        setModalEditarRap(prev => ({
                          ...prev,
                          actividadesAprendizaje: [...prev.actividadesAprendizaje, prev.nuevaActividadTexto.trim()],
                          nuevaActividadTexto: ''
                        }));
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#0D631B] border border-emerald-300 text-xs font-bold shrink-0 transition-colors"
                  >
                    + Agregar
                  </button>
                </div>

                {/* Lista de actividades editables */}
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {modalEditarRap.actividadesAprendizaje.length > 0 ? (
                    modalEditarRap.actividadesAprendizaje.map((aa, idx) => (
                      <div key={idx} className="flex items-center space-x-1.5 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 w-5 shrink-0">#{idx + 1}</span>
                        <input
                          type="text"
                          value={aa}
                          onChange={(e) => {
                            const val = e.target.value;
                            setModalEditarRap(prev => ({
                              ...prev,
                              actividadesAprendizaje: prev.actividadesAprendizaje.map((item, i) => i === idx ? val : item)
                            }));
                          }}
                          className="flex-1 bg-transparent border-none text-xs text-slate-700 focus:outline-hidden font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setModalEditarRap(prev => ({
                              ...prev,
                              actividadesAprendizaje: prev.actividadesAprendizaje.filter((_, i) => i !== idx)
                            }));
                          }}
                          className="w-6 h-6 rounded text-rose-500 hover:bg-rose-100 flex items-center justify-center shrink-0 transition-colors"
                          title="Eliminar actividad de aprendizaje"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-[11px] text-slate-400 italic p-2 text-center bg-slate-50 rounded-lg">
                      No hay actividades de aprendizaje vinculadas aún. Puedes agregar una arriba.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setModalEditarRap(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGuardarEdicionRap}
                className="px-5 py-2 rounded-xl bg-[#0D631B] hover:bg-[#0a4d15] text-white text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Cambios del RAP</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
