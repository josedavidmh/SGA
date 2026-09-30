import * as XLSX from 'xlsx';
import { Ficha, BloqueHorario, ActividadSeguimiento, RegionalCentro } from '../types';
import { totalMatriculados } from '../lib/aprendices';

export function generarReporteEventosF001(
  ficha: Ficha,
  centro: RegionalCentro,
  horarios: BloqueHorario[],
  actividades: ActividadSeguimiento[]
) {
  // Generar estructura oficial F001-008-25 / Versión 02
  const wsData = [
    ['FORMATO OFICIAL DE REPORTE DE EVENTOS Y HORAS FORMATIVAS'],
    ['CÓDIGO: F001-008-25', '', '', 'VERSIÓN: 02', '', '', 'FECHA DE EMISIÓN: 2026-09-17'],
    [],
    ['1. INFORMACIÓN INSTITUCIONAL'],
    ['REGIONAL:', centro.regional, '', 'CENTRO DE FORMACIÓN:', centro.centro],
    ['CÓDIGO CENTRO:', centro.codigoCentro, '', 'SEDE:', centro.sede],
    [],
    ['2. CARACTERIZACIÓN DE LA FICHA Y PROGRAMA'],
    ['NÚMERO DE FICHA:', ficha.numero_ficha, '', 'PROGRAMA:', ficha.programaNombre],
    ['CÓDIGO PROGRAMA:', ficha.programaCodigo, '', 'VERSIÓN:', ficha.version],
    ['NIVEL DE FORMACIÓN:', ficha.nivelFormacion, '', 'MODALIDAD:', ficha.modalidad],
    ['INSTRUCTOR LÍDER:', ficha.instructorLiderNombre, '', 'EMAIL LÍDER:', ficha.instructorLiderEmail],
    ['PERIODO LECTIVO:', ficha.periodoLectivo, '', 'FECHAS:', `${ficha.fechaInicio} a ${ficha.fechaFin}`],
    ['ESTADO FICHA:', ficha.estado, '', 'APRENDICES ACTIVOS:', `${ficha.aprendicesActivos} de ${totalMatriculados(ficha)}`],
    [],
    ['3. BALANCE HORARIO EJECUTADO'],
    ['HORAS LECTIVAS TOTALES:', ficha.horasDirectasTotales, '', 'HORAS ETAPA PRODUCTIVA:', ficha.horasIndependientesTotales],
    ['HORAS EJECUTADAS:', ficha.horasEjecutadas, '', 'PROGRESO CURRICULAR:', `${ficha.progresoCurricular}%`],
    [],
    ['4. GRILLA DETALLADA DE EVENTOS Y PROGRAMACIÓN HORARIA'],
    ['DÍA', 'FRANJA HORARIA', 'AMBIENTE', 'INSTRUCTOR ASIGNADO', 'CÓDIGO RAP', 'COMPETENCIA ASOCIADA', 'DURACIÓN (HRS)'],
    ...horarios.map(h => [
      h.diaSemana,
      h.franja,
      h.ambiente,
      h.instructorNombre,
      h.rapCodigo,
      `${h.competenciaCodigo} - ${h.rapTitulo}`,
      h.duracionHoras
    ]),
    [],
    ['5. SEGUIMIENTO DE ACTIVIDADES CURRICULARES ASOCIADAS'],
    ['FASE', 'COMPETENCIA', 'RAP', 'ACTIVIDAD DE APRENDIZAJE', 'HORAS DIR.', 'HORAS IND.', 'INSTRUCTOR RESPONSABLE', 'ESTADO'],
    ...actividades.map(a => [
      a.fase,
      a.competenciaCodigo,
      a.rapCodigo,
      a.actividadAprendizaje,
      a.horasDirectas,
      a.horasIndependientes,
      a.instructorNombre,
      a.estado
    ]),
    [],
    ['CERTIFICACIÓN:'],
    ['El presente reporte ha sido consolidado de manera desasistida y validado conforme al estándar institucional.'],
    ['Firma Instructor Líder: ___________________________', '', '', 'Firma Coordinación Académica: ___________________________']
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Establecer anchos de columna convenientes
  ws['!cols'] = [
    { wch: 18 },
    { wch: 22 },
    { wch: 25 },
    { wch: 28 },
    { wch: 15 },
    { wch: 45 },
    { wch: 15 },
    { wch: 18 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'F001-008-25_Eventos');

  XLSX.writeFile(wb, `Reporte_Eventos_F001-008-25_Ficha_${ficha.numero_ficha}.xlsx`);
}

export function exportarSeguimientoExcel(ficha: Ficha, actividades: ActividadSeguimiento[]) {
  const wsData = [
    ['SISTEMA DE GESTIÓN ACADÉMICA Y CURRICULAR - REPORTE DE SEGUIMIENTO (GPFI-F-134)'],
    [`FICHA: ${ficha.numero_ficha} - ${ficha.programaNombre}`],
    [`INSTRUCTOR LÍDER: ${ficha.instructorLiderNombre} | CORTE: ${new Date().toLocaleDateString()}`],
    [],
    ['FASE', 'CÓD. COMPETENCIA', 'DENOMINACIÓN COMPETENCIA', 'RAP', 'ACTIVIDAD DE APRENDIZAJE', 'EVIDENCIA', 'HORAS DIRECTAS', 'HORAS INDEPENDIENTES', 'INSTRUCTOR RESPONSABLE', 'ESTADO ACTUAL'],
    ...actividades.map(a => [
      a.fase,
      a.competenciaCodigo,
      a.competenciaDenominacion,
      a.rapCodigo,
      a.actividadAprendizaje,
      a.evidenciaCodigo,
      a.horasDirectas,
      a.horasIndependientes,
      a.instructorNombre,
      a.estado
    ])
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [
    { wch: 18 },
    { wch: 18 },
    { wch: 35 },
    { wch: 12 },
    { wch: 45 },
    { wch: 22 },
    { wch: 14 },
    { wch: 14 },
    { wch: 25 },
    { wch: 16 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'SeguimientoCurricular');
  XLSX.writeFile(wb, `Seguimiento_Curricular_${ficha.numero_ficha}.xlsx`);
}

export function exportarHorariosExcel(ficha: Ficha, horarios: BloqueHorario[]) {
  const wsData = [
    ['SISTEMA DE GESTIÓN ACADÉMICA Y CURRICULAR - PROGRAMACIÓN DE HORARIOS'],
    [`FICHA: ${ficha.numero_ficha} - ${ficha.programaNombre}`],
    [`AMBIENTE: ${ficha.ambientePrincipal} | PERIODO: ${ficha.periodoLectivo}`],
    [],
    ['DÍA', 'FRANJA HORARIA', 'AMBIENTE', 'INSTRUCTOR ASIGNADO', 'CÓDIGO RAP', 'ACTIVIDAD / MÓDULO', 'HORAS'],
    ...horarios.map(h => [
      h.diaSemana,
      h.franja,
      h.ambiente,
      h.instructorNombre,
      h.rapCodigo,
      h.rapTitulo,
      h.duracionHoras
    ])
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [
    { wch: 15 },
    { wch: 20 },
    { wch: 25 },
    { wch: 25 },
    { wch: 15 },
    { wch: 40 },
    { wch: 10 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'HorariosSemanal');
  XLSX.writeFile(wb, `Horario_Estructura_${ficha.numero_ficha}.xlsx`);
}
