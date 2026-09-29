import { Instructor, Competencia, ResultadoAprendizaje, ReporteJuiciosFicha, RegistroHorasEjecutadas, HistorialEvaluacionInstructor } from '../types';
import { generarUuid } from '../lib/id';

export type NivelAfinidad = 
  | 'ALTA_HISTORIAL_RAP' 
  | 'ALTA_HISTORIAL_COMPETENCIA' 
  | 'MEDIA_PERFIL_AFIN' 
  | 'BAJA_ADVERTENCIA_PERFIL';

export interface EvaluacionAfinidadInstructor {
  instructor: Instructor;
  nivel: NivelAfinidad;
  esRecomendado: boolean;
  requiereAdvertencia: boolean;
  tieneHistorialRap: boolean;
  tieneHistorialCompetencia: boolean;
  tienePerfilAfin: boolean;
  score: number; // 0 - 100 para ordenamiento
  etiquetaBadge: string;
  colorBadge: string;
  detalleJuicios?: string;
  motivoAdvertencia?: string;
}

/**
 * Infiere la especialidad profesional basada en el nombre de la competencia trabajada
 */
function inferirEspecialidadPorCompetencia(competenciaDenom: string): { perfilTecnico: string; especialidad: string } {
  const comp = competenciaDenom.toLowerCase();

  if (comp.includes('software') || comp.includes('requisitos') || comp.includes('diseñar') || comp.includes('desarrollar') || comp.includes('algoritmos') || comp.includes('datos') || comp.includes('ti')) {
    return {
      perfilTecnico: 'Ingeniero de Sistemas / Desarrollador de Software',
      especialidad: 'Ingeniería de Software & Arquitectura TI'
    };
  }
  if (comp.includes('inglés') || comp.includes('inglesa') || comp.includes('biling')) {
    return {
      perfilTecnico: 'Licenciado en Idiomas - Bilingüismo',
      especialidad: 'Bilingüismo & Comunicación en Lengua Inglesa'
    };
  }
  if (comp.includes('matemática') || comp.includes('cuantitativo') || comp.includes('matematica')) {
    return {
      perfilTecnico: 'Licenciado en Matemáticas / Estadística',
      especialidad: 'Razonamiento Cuantitativo & Matemáticas Aplicadas'
    };
  }
  if (comp.includes('física') || comp.includes('fisica') || comp.includes('naturales')) {
    return {
      perfilTecnico: 'Licenciado en Ciencias Naturales / Física',
      especialidad: 'Física Aplicada & Métodos Científicos'
    };
  }
  if (comp.includes('ética') || comp.includes('etica') || comp.includes('low murtra') || comp.includes('paz') || comp.includes('integral')) {
    return {
      perfilTecnico: 'Profesional en Humanidades / Psicología / Trabajo Social',
      especialidad: 'Ética Profesional & Cultura de Paz'
    };
  }
  if (comp.includes('comunicación') || comp.includes('comunicacion') || comp.includes('eficaces')) {
    return {
      perfilTecnico: 'Comunicador Social / Especialista en Comunicación',
      especialidad: 'Procesos de Comunicación Organizacional'
    };
  }
  if (comp.includes('ambiental') || comp.includes('sst') || comp.includes('seguridad y salud') || comp.includes('recursos naturales')) {
    return {
      perfilTecnico: 'Especialista en SST & Gestión Ambiental',
      especialidad: 'Seguridad y Salud en el Trabajo & Medio Ambiente'
    };
  }
  if (comp.includes('emprendedora') || comp.includes('emprendimiento') || comp.includes('negocio')) {
    return {
      perfilTecnico: 'Administrador de Empresas / Economista',
      especialidad: 'Emprendimiento, Modelos de Negocio & Finanzas'
    };
  }
  if (comp.includes('informática') || comp.includes('tic') || comp.includes('digitales')) {
    return {
      perfilTecnico: 'Tecnólogo / Ingeniero de Sistemas TIC',
      especialidad: 'Herramientas Digitales & Tecnologías de la Información'
    };
  }
  if (comp.includes('investigación') || comp.includes('investigacion')) {
    return {
      perfilTecnico: 'Investigador / Magíster en Metodología Científica',
      especialidad: 'Investigación Aplicada & Desarrollo Tecnológico'
    };
  }

  return {
    perfilTecnico: 'Instructor de Formación Profesional Integral',
    especialidad: 'Formación Profesional'
  };
}

const COLORES_AVATAR = [
  '#0D631B', '#005A8C', '#6F43C0', '#B25E00', '#B3261E', '#00796B', '#3E2723', '#283593'
];

function normalizarNombrePersona(s: string): string {
  return s
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Similitud por palabras en común entre dos nombres completos (0 a 1). */
function similitudNombres(a: string, b: string): number {
  const ta = new Set(normalizarNombrePersona(a).split(' ').filter(w => w.length > 1));
  const tb = new Set(normalizarNombrePersona(b).split(' ').filter(w => w.length > 1));
  if (ta.size === 0 || tb.size === 0) return 0;
  let comunes = 0;
  ta.forEach(w => { if (tb.has(w)) comunes += 1; });
  return comunes / new Set([...ta, ...tb]).size;
}

export interface ResultadoCaracterizacionInstructores {
  instructores: Instructor[];
  /** Instructor(es) nuevo(s) cuyo nombre se parece a uno ya existente pero no es idéntico — posible duplicado por mal registro manual, requiere revisión humana. */
  advertenciasHomonimo: string[];
}

/**
 * Caracteriza y actualiza la lista de instructores a partir del reporte oficial de SofiaPlus
 * Extrayendo para cada uno sus competencias, RAPs evaluados y volumen de evaluaciones.
 */
export function caracterizarInstructoresDesdeJuicios(
  reporte: ReporteJuiciosFicha,
  instructoresActuales: Instructor[]
): ResultadoCaracterizacionInstructores {
  const mapaInstructores = new Map<string, {
    nombreCompleto: string;
    evaluaciones: Map<string, HistorialEvaluacionInstructor>;
    competenciasSet: Set<string>;
    rapsSet: Set<string>;
    /** Cuenta de veces que cada denominación de competencia aparece evaluada por este instructor, para inferir su perfil de forma consolidada (no solo con la primera). */
    competenciasDenomCount: Map<string, number>;
    totalJuicios: number;
    ultimaFecha?: string;
  }>();

  // 1. Recorrer todos los juicios de todos los aprendices.
  // Nota: deliberadamente NO se captura ni almacena el número de documento
  // del funcionario evaluador — este sistema no maneja identificación
  // personal. La identificación de instructores (y la detección de
  // homónimos) se hace únicamente por nombre.
  reporte.aprendices.forEach(ap => {
    ap.juicios.forEach(j => {
      const funcionario = (j.funcionarioEvaluador || j.funcionarioRegistro)?.trim();
      if (!funcionario || funcionario === '-' || funcionario.length < 5) return;

      // El formato de SofiaPlus es: "CC 12435718 - JOSE DAVID MONTESINO HOYOS"
      const partes = funcionario.split('-');
      let nombre = '';
      if (partes.length >= 2) {
        nombre = partes.slice(1).join('-').trim();
      } else {
        nombre = funcionario.replace(/\d/g, '').trim();
      }

      if (!nombre) return;
      const key = normalizarNombrePersona(nombre);
      if (!key) return;

      if (!mapaInstructores.has(key)) {
        mapaInstructores.set(key, {
          nombreCompleto: nombre,
          evaluaciones: new Map(),
          competenciasSet: new Set(),
          rapsSet: new Set(),
          competenciasDenomCount: new Map(),
          totalJuicios: 0,
          ultimaFecha: j.fechaEvaluacion
        });
      }

      const instData = mapaInstructores.get(key)!;
      instData.totalJuicios += 1;

      if (j.fechaEvaluacion) {
        instData.ultimaFecha = j.fechaEvaluacion;
      }

      const compCodigo = j.competenciaCodigo || '';
      const compDenom = j.competenciaDenominacion || '';
      const rapCodigo = j.rapCodigo || '';
      const rapDenom = j.rapDenominacion || '';

      if (compCodigo) instData.competenciasSet.add(compCodigo);
      if (compDenom) instData.competenciasSet.add(compDenom);
      if (rapCodigo) instData.rapsSet.add(rapCodigo);
      if (rapDenom) instData.rapsSet.add(rapDenom);
      if (compDenom) {
        instData.competenciasDenomCount.set(compDenom, (instData.competenciasDenomCount.get(compDenom) || 0) + 1);
      }

      // Agrupar por clave única comp+rap
      const evalKey = `${compCodigo}_${rapCodigo}`;
      if (!instData.evaluaciones.has(evalKey)) {
        instData.evaluaciones.set(evalKey, {
          competenciaCodigo: compCodigo,
          competenciaDenominacion: compDenom,
          rapCodigo,
          rapDenominacion: rapDenom,
          totalJuicios: 0,
          ultimaFecha: j.fechaEvaluacion
        });
      }

      const regEval = instData.evaluaciones.get(evalKey)!;
      regEval.totalJuicios += 1;
      if (j.fechaEvaluacion) regEval.ultimaFecha = j.fechaEvaluacion;
    });
  });

  // 2. Fusionar con la lista existente de instructores
  const resultado: Instructor[] = [...instructoresActuales];
  const advertenciasHomonimo: string[] = [];

  mapaInstructores.forEach((data, key) => {
    // Identificación únicamente por nombre (nunca por documento — este
    // sistema no maneja identificación personal). Solo se considera "el
    // mismo instructor" un nombre normalizado IDÉNTICO; un parecido fuerte
    // pero no idéntico se trata como un posible homónimo por mal registro
    // manual y se reporta como advertencia, sin fusionarlo ni bloquearlo.
    const indexExistente = resultado.findIndex(inst => normalizarNombrePersona(inst.nombreCompleto) === key);

    const listaHistorial = Array.from(data.evaluaciones.values());
    const compArray = Array.from(data.competenciasSet);
    const rapsArray = Array.from(data.rapsSet);

    if (indexExistente >= 0) {
      // Instructor existente: enriquecer sus competencias de experiencia y juicios
      const inst = resultado[indexExistente];
      const prevComp = new Set(inst.competenciasExperiencia || []);
      const prevRaps = new Set(inst.rapsExperiencia || []);

      compArray.forEach(c => prevComp.add(c));
      rapsArray.forEach(r => prevRaps.add(r));

      // Combinar historial
      const historialCombinado = [...(inst.historialEvaluaciones || [])];
      listaHistorial.forEach(nuevaEval => {
        const existe = historialCombinado.find(h => h.rapCodigo === nuevaEval.rapCodigo && h.competenciaCodigo === nuevaEval.competenciaCodigo);
        if (existe) {
          existe.totalJuicios += nuevaEval.totalJuicios;
          if (nuevaEval.ultimaFecha) existe.ultimaFecha = nuevaEval.ultimaFecha;
        } else {
          historialCombinado.push(nuevaEval);
        }
      });

      resultado[indexExistente] = {
        ...inst,
        competenciasExperiencia: Array.from(prevComp),
        rapsExperiencia: Array.from(prevRaps),
        totalJuiciosEvaluados: (inst.totalJuiciosEvaluados || 0) + data.totalJuicios,
        historialEvaluaciones: historialCombinado
      };
    } else {
      // Posible homónimo: nombre nuevo pero muy parecido a uno ya
      // existente (típico de un mal registro manual — tildes, orden de
      // apellidos, una inicial de más/menos). No se fusiona automáticamente
      // porque podrían ser dos personas distintas: se crea el registro y se
      // reporta la advertencia para que un humano lo revise.
      const posibleHomonimo = resultado.find(inst => similitudNombres(inst.nombreCompleto, data.nombreCompleto) >= 0.5);
      if (posibleHomonimo) {
        advertenciasHomonimo.push(
          `"${data.nombreCompleto}" (nuevo, detectado en Juicios) se parece a "${posibleHomonimo.nombreCompleto}" ya existente en la planta de instructores. Verifica si es la misma persona con el nombre mal digitado o son dos personas distintas.`
        );
      }

      // Perfil inferido de forma consolidada: se evalúan TODAS las
      // competencias que este instructor calificó (no solo la primera) y se
      // toma el perfil que más veces resultó, para no quedar sesgado por el
      // orden de aparición de los juicios en el archivo.
      const perfilesPorCompetencia = Array.from(data.competenciasDenomCount.entries())
        .sort((a, b) => b[1] - a[1]);
      const conteoPerfiles = new Map<string, { perfilTecnico: string; especialidad: string; votos: number }>();
      perfilesPorCompetencia.forEach(([denom, veces]) => {
        const inferido = inferirEspecialidadPorCompetencia(denom);
        const k = inferido.perfilTecnico;
        const prev = conteoPerfiles.get(k);
        if (prev) {
          prev.votos += veces;
        } else {
          conteoPerfiles.set(k, { ...inferido, votos: veces });
        }
      });
      const perfilGanador = Array.from(conteoPerfiles.values()).sort((a, b) => b.votos - a.votos)[0];
      const { perfilTecnico, especialidad } = perfilGanador || inferirEspecialidadPorCompetencia('');

      const nombresParts = data.nombreCompleto.split(' ');
      const nombres = nombresParts.slice(0, Math.ceil(nombresParts.length / 2)).join(' ');
      const apellidos = nombresParts.slice(Math.ceil(nombresParts.length / 2)).join(' ') || '';

      const colorIndex = resultado.length % COLORES_AVATAR.length;
      const nuevoInstructor: Instructor = {
        // UUID real: instructores.id es UUID en Supabase. NOTA: este
        // instructor auto-detectado desde Juicios NO se sincroniza a
        // Supabase todavía en ningún punto del código (queda solo en
        // memoria/localStorage) — eso es un vacío aparte de la corrección de
        // id, pendiente de resolver (requiere además decidir qué guardar en
        // `documento`, que en Supabase es UNIQUE NOT NULL y aquí siempre
        // llega vacío).
        id: generarUuid(),
        // Sin número de documento: este sistema no maneja identificación
        // personal de los instructores auto-detectados desde Juicios.
        documento: '',
        nombres,
        apellidos,
        nombreCompleto: data.nombreCompleto,
        email: `${nombresParts[0]?.toLowerCase() || 'instructor'}.${apellidos.split(' ')[0]?.toLowerCase() || 'sena'}@correo.edu.co`,
        perfilTecnico,
        especialidad,
        colorAvatar: COLORES_AVATAR[colorIndex],
        horasSemanalesAsignadas: 0,
        maxHorasSemanales: 40,
        estado: 'ACTIVO',
        competenciasExperiencia: compArray,
        rapsExperiencia: rapsArray,
        totalJuiciosEvaluados: data.totalJuicios,
        historialEvaluaciones: listaHistorial
      };

      resultado.push(nuevoInstructor);
    }
  });

  return { instructores: resultado, advertenciasHomonimo };
}

/**
 * Caracteriza instructores cuando se cargan horas ejecutadas
 */
export function caracterizarInstructoresDesdeHoras(
  registros: RegistroHorasEjecutadas[],
  instructoresActuales: Instructor[]
): Instructor[] {
  const resultado = [...instructoresActuales];

  registros.forEach(reg => {
    const doc = reg.instructorDocumento?.trim();
    const nom = reg.instructorNombre?.trim().toLowerCase();
    if (!doc && !nom) return;

    const index = resultado.findIndex(i => 
      (doc && i.documento === doc) || 
      (nom && i.nombreCompleto.toLowerCase().includes(nom))
    );

    if (index >= 0) {
      const inst = resultado[index];
      const prevComp = new Set(inst.competenciasExperiencia || []);
      if (reg.competenciaCodigo) prevComp.add(reg.competenciaCodigo);
      if (reg.competenciaDenominacion) prevComp.add(reg.competenciaDenominacion);

      resultado[index] = {
        ...inst,
        competenciasExperiencia: Array.from(prevComp)
      };
    }
  });

  return resultado;
}

/**
 * Evalúa si el perfil del instructor tiene afinidad profesional con la competencia seleccionada
 */
export function verificarAfinidadPerfil(instructor: Instructor, competencia: Competencia): boolean {
  // Se comparan sin tildes para que "Física"/"fisica" o "Ingeniería"/"ingenieria"
  // coincidan igual, sin importar cómo se haya escrito el perfil del instructor.
  const sinTildes = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const compTexto = sinTildes(`${competencia.codigo} ${competencia.denominacion} ${competencia.tipo}`);
  const instTexto = sinTildes(`${instructor.perfilTecnico || ''} ${instructor.especialidad || ''}`);

  // Perfiles de formación amplia: un ingeniero puede orientar matemáticas,
  // física e investigación; un magíster/doctor puede orientar investigación.
  const esIngeniero = instTexto.includes('ingenier') || /\bing\b/.test(instTexto);
  const tienePosgradoInvestigacion =
    instTexto.includes('maestr') || instTexto.includes('magister') || /\bmsc\b|\bm\.sc\b/.test(instTexto) ||
    instTexto.includes('doctor') || /\bphd\b/.test(instTexto) || instTexto.includes('investig');

  // Investigación (competencia transversal de investigación formativa)
  const esInvestigacion = compTexto.includes('investigacion') || compTexto.includes('240201530');
  if (esInvestigacion) {
    return esIngeniero || tienePosgradoInvestigacion || instTexto.includes('metodolog') || instTexto.includes('cientific');
  }

  // 1. Competencias Técnicas de Software / TI
  const esSoftware = compTexto.includes('software') || 
                     compTexto.includes('desarrollar') || 
                     compTexto.includes('requisitos') || 
                     compTexto.includes('algoritmos') || 
                     compTexto.includes('disenar la solucion') || 
                     compTexto.includes('datos') || 
                     compTexto.includes('interfaz') || 
                     compTexto.includes('220501096') || 
                     compTexto.includes('220501092') || 
                     compTexto.includes('220501093') || 
                     compTexto.includes('220501094') || 
                     compTexto.includes('220501095');

  if (esSoftware) {
    return instTexto.includes('sistemas') || 
           instTexto.includes('software') || 
           instTexto.includes('informatica') || 
           instTexto.includes('programacion') || 
           instTexto.includes('desarrollo') || 
           /\bti\b|\btic\b/.test(instTexto) || 
           instTexto.includes('computacion');
  }

  // 2. Bilingüismo / Inglés
  const esIngles = compTexto.includes('ingles') || 
                   compTexto.includes('inglesa') || 
                   compTexto.includes('biling') || 
                   compTexto.includes('240202501');
  if (esIngles) {
    return instTexto.includes('ingles') || 
           instTexto.includes('idiomas') || 
           instTexto.includes('lenguas') || 
           instTexto.includes('biling') || 
           instTexto.includes('filologia');
  }

  // 3. Matemáticas / Cuantitativo
  const esMatematicas = compTexto.includes('matematica') || 
                        compTexto.includes('cuantitativo') || 
                        compTexto.includes('240201528');
  if (esMatematicas) {
    return instTexto.includes('matematic') || 
           instTexto.includes('estadistic') || 
           instTexto.includes('fisic') || 
           instTexto.includes('ciencias exactas') || 
           instTexto.includes('sistemas') || 
           esIngeniero;
  }

  // 4. Física / Ciencias Naturales
  const esFisica = compTexto.includes('fisica') || 
                   compTexto.includes('naturales') || 
                   compTexto.includes('220201501');
  if (esFisica) {
    return instTexto.includes('fisic') || 
           instTexto.includes('ciencias naturales') || 
           instTexto.includes('quimic') || 
           esIngeniero;
  }

  // 5. Ética / Integralidad / Enrique Low Murtra
  const esEtica = compTexto.includes('etica') || 
                  compTexto.includes('low murtra') || 
                  compTexto.includes('cultura de paz') || 
                  compTexto.includes('240201526');
  if (esEtica) {
    return instTexto.includes('etica') || 
           instTexto.includes('humanidades') || 
           instTexto.includes('psicolog') || 
           instTexto.includes('trabajo social') || 
           instTexto.includes('filosof') || 
           instTexto.includes('social');
  }

  // 6. Comunicación
  const esComunicacion = compTexto.includes('comunicacion') || 
                         compTexto.includes('240201524');
  if (esComunicacion) {
    return instTexto.includes('comunicac') || 
           instTexto.includes('periodismo') || 
           instTexto.includes('lengua') || 
           instTexto.includes('letras') || 
           instTexto.includes('humanidades');
  }

  // 7. Emprendimiento
  const esEmprendimiento = compTexto.includes('emprendedora') || 
                           compTexto.includes('emprendimiento') || 
                           compTexto.includes('negocio') || 
                           compTexto.includes('240201529');
  if (esEmprendimiento) {
    return instTexto.includes('emprendimiento') || 
           instTexto.includes('administrac') || 
           instTexto.includes('gestion') || 
           instTexto.includes('negocios') || 
           instTexto.includes('econom');
  }

  // 8. Ambiental / SST
  const esAmbiental = compTexto.includes('ambiental') || 
                      compTexto.includes('sst') || 
                      compTexto.includes('seguridad y salud') || 
                      compTexto.includes('220601501');
  if (esAmbiental) {
    return instTexto.includes('ambiental') || 
           instTexto.includes('sst') || 
           instTexto.includes('seguridad y salud') || 
           instTexto.includes('ecolog') || 
           instTexto.includes('ocupacional');
  }

  // Si no coincide con ninguna categoría específica, considerar perfil afín si el tipo coincide
  if (competencia.tipo === 'Técnica' && (esIngeniero || instTexto.includes('tecnol') || instTexto.includes('sistemas'))) {
    return true;
  }

  return false;
}

/**
 * Evalúa la afinidad y recomendación de un instructor frente a una competencia y RAPs seleccionados
 */
export function evaluarAfinidadInstructor(
  instructor: Instructor,
  competencia: Competencia,
  rapsSeleccionadosCodigos: string[],
  rapsDisponibles: ResultadoAprendizaje[] = []
): EvaluacionAfinidadInstructor {
  const rapsExp = instructor.rapsExperiencia || [];
  const compExp = instructor.competenciasExperiencia || [];
  const historial = instructor.historialEvaluaciones || [];

  // 1. ¿Tiene historial en alguno de los RAPs seleccionados?
  const rapsCoincidentes: string[] = [];
  let juiciosEnRaps = 0;

  rapsSeleccionadosCodigos.forEach(rCod => {
    // Buscar en RAPs de experiencia o historial
    const enHistorial = historial.filter(h => {
      const hRap = (h.rapCodigo || '').toLowerCase();
      const hRapDenom = (h.rapDenominacion || '').toLowerCase();
      const search = rCod.toLowerCase();
      return hRap.includes(search) || search.includes(hRap) || hRapDenom.includes(search);
    });

    if (enHistorial.length > 0) {
      rapsCoincidentes.push(rCod);
      juiciosEnRaps += enHistorial.reduce((acc, h) => acc + h.totalJuicios, 0);
    } else {
      const matchExp = rapsExp.some(exp => exp.toLowerCase().includes(rCod.toLowerCase()) || rCod.toLowerCase().includes(exp.toLowerCase()));
      if (matchExp) {
        rapsCoincidentes.push(rCod);
      }
    }
  });

  const tieneHistorialRap = rapsCoincidentes.length > 0;

  // 2. ¿Tiene historial en la competencia?
  const tieneHistorialCompetencia = compExp.some(c => 
    c.toLowerCase().includes(competencia.codigo.toLowerCase()) ||
    competencia.codigo.toLowerCase().includes(c.toLowerCase()) ||
    c.toLowerCase().includes(competencia.denominacion.toLowerCase().slice(0, 20))
  );

  // 3. ¿Tiene perfil afín por especialidad / profesión?
  const tienePerfilAfin = verificarAfinidadPerfil(instructor, competencia);

  // 4. Determinar nivel de recomendación, score y badges
  let nivel: NivelAfinidad = 'BAJA_ADVERTENCIA_PERFIL';
  let esRecomendado = false;
  let requiereAdvertencia = false;
  let score = 10;
  let etiquetaBadge = '⚠️ Perfil No Afín';
  let colorBadge = 'bg-amber-50 text-amber-800 border-amber-300';
  let detalleJuicios: string | undefined = undefined;
  let motivoAdvertencia: string | undefined = undefined;

  if (tieneHistorialRap) {
    nivel = 'ALTA_HISTORIAL_RAP';
    esRecomendado = true;
    score = 100 + (juiciosEnRaps > 0 ? Math.min(juiciosEnRaps, 50) : 10);
    etiquetaBadge = juiciosEnRaps > 0 
      ? `★ Recomendado (${juiciosEnRaps} juicios en este RAP)` 
      : '★ Recomendado (Historial en este RAP)';
    colorBadge = 'bg-emerald-50 text-[#0D631B] border-emerald-300';
    detalleJuicios = `Ha calificado ${juiciosEnRaps || 1} veces este Resultado de Aprendizaje en SofiaPlus.`;
  } else if (tieneHistorialCompetencia) {
    nivel = 'ALTA_HISTORIAL_COMPETENCIA';
    esRecomendado = true;
    score = 75;
    etiquetaBadge = '★ Recomendado (Historial en Competencia)';
    colorBadge = 'bg-emerald-50 text-emerald-800 border-emerald-300';
    detalleJuicios = `Registra experiencia previa dictando o evaluando la norma ${competencia.codigo}.`;
  } else if (tienePerfilAfin) {
    nivel = 'MEDIA_PERFIL_AFIN';
    esRecomendado = true;
    score = 50;
    etiquetaBadge = '✓ Perfil Profesional Compatible';
    colorBadge = 'bg-blue-50 text-blue-800 border-blue-300';
    detalleJuicios = `Su profesión/especialidad (${instructor.especialidad}) es idónea para impartir esta competencia (${competencia.tipo}).`;
  } else {
    // Requiere advertencia pedagógica
    nivel = 'BAJA_ADVERTENCIA_PERFIL';
    esRecomendado = false;
    requiereAdvertencia = true;
    score = 10;
    etiquetaBadge = '⚠️ Perfil Distinto al Requerido';
    colorBadge = 'bg-amber-50 text-amber-900 border-amber-300';
    motivoAdvertencia = `El instructor registra especialidad en "${instructor.especialidad || instructor.perfilTecnico}", la cual difiere del perfil curricular requerido para la competencia "${competencia.denominacion}" (Tipo: ${competencia.tipo}). Además, no cuenta con historial de juicios previos en este RAP.`;
  }

  return {
    instructor,
    nivel,
    esRecomendado,
    requiereAdvertencia,
    tieneHistorialRap,
    tieneHistorialCompetencia,
    tienePerfilAfin,
    score,
    etiquetaBadge,
    colorBadge,
    detalleJuicios,
    motivoAdvertencia
  };
}


/**
 * Para el "Reporte de Instructores por Ficha" (horas): empareja cada
 * instructor del archivo con la planta (sin importar "Ing.", tildes ni
 * mayúsculas) y CREA los que no existan — igual que el cargue de Juicios —
 * sin documento (dato personal que no se maneja). También enriquece la
 * experiencia por competencia de todos.
 */
export function crearOEnriquecerInstructoresDesdeHoras(
  registros: RegistroHorasEjecutadas[],
  instructoresActuales: Instructor[]
): { instructores: Instructor[]; nuevos: Instructor[] } {
  const resultado = [...instructoresActuales];
  const nuevos: Instructor[] = [];
  const tokens = (t: string) => new Set(normalizarNombrePersona(t).split(' ').filter(w => w.length > 1 && w !== 'ING'));
  const buscar = (nombre: string): number => {
    const tn = tokens(nombre);
    if (tn.size === 0) return -1;
    let mejor = -1;
    let mejorPuntaje = 0;
    resultado.forEach((inst, idx) => {
      const ti = tokens(inst.nombreCompleto || `${inst.nombres} ${inst.apellidos}`);
      let comunes = 0;
      tn.forEach(w => { if (ti.has(w)) comunes += 1; });
      const puntaje = comunes / Math.max(tn.size, ti.size);
      if (puntaje > mejorPuntaje) { mejorPuntaje = puntaje; mejor = idx; }
    });
    return mejorPuntaje >= 0.75 ? mejor : -1;
  };
  const sinTildes = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
  const correosUsados = new Set(resultado.map(i => (i.email || '').toLowerCase()));

  registros.forEach(reg => {
    const nombre = (reg.instructorNombre || '').trim();
    if (!nombre || nombre.startsWith('Doc:') || nombre === 'Instructor Asignado') return;

    let idx = buscar(nombre);
    if (idx < 0) {
      const nombres = (reg.instructorNombres || nombre.split(' ').slice(0, Math.ceil(nombre.split(' ').length / 2)).join(' ')).trim();
      const apellidos = (reg.instructorApellidos || nombre.split(' ').slice(Math.ceil(nombre.split(' ').length / 2)).join(' ')).trim();
      const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y']);
      const primerApellido = apellidos.split(' ').find(w => !PARTICULAS.has(w.toLowerCase())) || 'sena';
      const base = `${sinTildes(nombres.split(' ')[0] || 'instructor')}.${sinTildes(primerApellido)}`;
      let email = `${base}@correo.edu.co`;
      let n = 2;
      while (correosUsados.has(email)) { email = `${base}${n}@correo.edu.co`; n += 1; }
      correosUsados.add(email);
      const { perfilTecnico, especialidad } = inferirEspecialidadPorCompetencia(reg.competenciaDenominacion || '');
      const inst: Instructor = {
        id: generarUuid(),
        documento: '',
        nombres,
        apellidos,
        nombreCompleto: nombre,
        email,
        telefono: '',
        perfilTecnico,
        especialidad,
        colorAvatar: COLORES_AVATAR[resultado.length % COLORES_AVATAR.length],
        horasSemanalesAsignadas: 0,
        maxHorasSemanales: 40,
        estado: (reg.instructorEstado || '').toLowerCase().startsWith('inactiv') ? 'INACTIVO' : 'ACTIVO',
        competenciasExperiencia: []
      };
      resultado.push(inst);
      nuevos.push(inst);
      idx = resultado.length - 1;
    }

    const inst = resultado[idx];
    const prevComp = new Set(inst.competenciasExperiencia || []);
    if (reg.competenciaCodigo) prevComp.add(reg.competenciaCodigo);
    if (reg.competenciaDenominacion) prevComp.add(reg.competenciaDenominacion);
    resultado[idx] = { ...inst, competenciasExperiencia: Array.from(prevComp) };
  });

  // Los nuevos deben reflejar la experiencia que se les acaba de sumar.
  const nuevosFinales = nuevos.map(n => resultado.find(r => r.id === n.id) || n);
  return { instructores: resultado, nuevos: nuevosFinales };
}
