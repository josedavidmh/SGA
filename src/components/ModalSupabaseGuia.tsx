import React from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Database, 
  Terminal, 
  ShieldCheck, 
  Code, 
  Server, 
  Table, 
  ExternalLink,
  Layers,
  ArrowRight,
  Wifi,
  RefreshCw,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { supabase, isSupabaseConfigured, formattedSupabaseUrl, formattedSupabaseAnonKey } from '../lib/supabaseClient';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModalSupabaseGuia: React.FC<SupabaseModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = React.useState<'ESTADO_CONEXION' | 'PASO_A_PASO' | 'DDL_SCHEMA' | 'SEED_DATA' | 'EJEMPLOS_TABLAS' | 'CONEXION_REACT'>('ESTADO_CONEXION');
  const [copiedSection, setCopiedSection] = React.useState<string | null>(null);

  // Estado de prueba de conexión en vivo
  const [testStatus, setTestStatus] = React.useState<'IDLE' | 'TESTING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [testMessage, setTestMessage] = React.useState<string>('');
  const [testLatency, setTestLatency] = React.useState<number | null>(null);
  const [tableDetails, setTableDetails] = React.useState<{
    centrosCount?: number;
    fichasCount?: number;
    instructoresCount?: number;
    horariosCount?: number;
  } | null>(null);

  const supabaseUrlEnv = formattedSupabaseUrl;
  const supabaseKeyEnv = formattedSupabaseAnonKey;

  const runConnectionTest = async () => {
    setTestStatus('TESTING');
    setTestMessage('Enviando consulta de diagnóstico a PostgreSQL en Supabase...');
    setTableDetails(null);

    try {
      const startTime = performance.now();
      
      // Consultar fichas y centros
      const { data: fichasData, error: fichasErr, count: fichasCount } = await supabase
        .from('fichas')
        .select('id, numero_ficha, programa_nombre, estado', { count: 'exact' })
        .limit(5);

      const { data: instData, error: instErr, count: instCount } = await supabase
        .from('instructores')
        .select('id, nombre_completo, email', { count: 'exact' })
        .limit(5);

      const { data: centrosData, error: centrosErr, count: centrosCount } = await supabase
        .from('centros_formacion')
        .select('id, centro, regional', { count: 'exact' })
        .limit(5);

      const { count: horariosCount, error: horErr } = await supabase
        .from('bloques_horarios')
        .select('*', { count: 'exact', head: true });

      const elapsed = Math.round(performance.now() - startTime);
      setTestLatency(elapsed);

      if (fichasErr && centrosErr && instErr) {
        setTestStatus('ERROR');
        setTestMessage(`Error de respuesta de Supabase: ${fichasErr?.message || centrosErr?.message || 'No se pudieron consultar las tablas'}. Asegúrate de haber corrido el script DDL.`);
      } else {
        setTestStatus('SUCCESS');
        setTableDetails({
          centrosCount: centrosCount ?? centrosData?.length ?? 0,
          fichasCount: fichasCount ?? fichasData?.length ?? 0,
          instructoresCount: instCount ?? instData?.length ?? 0,
          horariosCount: horariosCount ?? 0,
        });
        setTestMessage(`¡Conexión validada exitosamente! Base de datos PostgreSQL en Supabase respondiendo en ${elapsed}ms.`);
      }
    } catch (err: any) {
      setTestStatus('ERROR');
      setTestMessage(`Fallo de conexión o red: ${err?.message || 'Error desconocido'}`);
    }
  };

  React.useEffect(() => {
    if (isOpen && isSupabaseConfigured && testStatus === 'IDLE') {
      runConnectionTest();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (text: string, sectionKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const ddlSql = `-- 1. HABILITAR EXTENSIÓN UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TIPOS ENUMERADOS
CREATE TYPE sena_user_role AS ENUM ('ADMINISTRADOR', 'COORDINADOR', 'INSTRUCTOR_LIDER', 'AUXILIAR');
CREATE TYPE sena_nivel_formacion AS ENUM ('Auxiliar', 'Técnico', 'Tecnólogo');
CREATE TYPE sena_modalidad AS ENUM ('Presencial Diurna', 'Presencial Nocturna', 'Mixta / Virtual');
CREATE TYPE sena_estado_ficha AS ENUM ('ACTIVA', 'POR_CERRAR', 'CERRADA');
CREATE TYPE sena_estado_actividad AS ENUM ('PENDIENTE', 'EN EJECUCION', 'CALIFICADO');
CREATE TYPE sena_dia_semana AS ENUM ('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado');
CREATE TYPE sena_franja_horario AS ENUM ('06:00 - 09:00', '09:00 - 12:00', '13:00 - 16:00', '16:00 - 19:00');

-- 3. TABLA CENTRO DE FORMACIÓN
CREATE TABLE public.centros_formacion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    regional VARCHAR(100) NOT NULL DEFAULT 'Regional',
    centro VARCHAR(200) NOT NULL DEFAULT 'Centro de Formación',
    codigo_centro VARCHAR(20) NOT NULL DEFAULT '0000',
    sede VARCHAR(150) NOT NULL DEFAULT 'Sede Principal',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA INSTRUCTORES
CREATE TABLE public.instructores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    documento VARCHAR(30) UNIQUE NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    nombre_completo VARCHAR(220) GENERATED ALWAYS AS (nombres || ' ' || apellidos) STORED,
    email VARCHAR(150) UNIQUE NOT NULL,
    telefono VARCHAR(30),
    perfil_tecnico TEXT NOT NULL,
    especialidad VARCHAR(150) NOT NULL,
    color_avatar VARCHAR(20) DEFAULT '#0D631B',
    max_horas_semanales INT DEFAULT 32,
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA USUARIOS (INTEGRACIÓN CON SUPABASE AUTH)
CREATE TABLE public.usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    documento VARCHAR(30) UNIQUE NOT NULL,
    correo VARCHAR(150) UNIQUE NOT NULL,
    nombre_completo VARCHAR(200) NOT NULL,
    rol sena_user_role NOT NULL DEFAULT 'AUXILIAR',
    cargo VARCHAR(150) NOT NULL,
    telefono VARCHAR(30),
    avatar_url TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLA FICHAS DE FORMACIÓN
CREATE TABLE public.fichas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    centro_id UUID REFERENCES public.centros_formacion(id),
    numero_ficha VARCHAR(20) UNIQUE NOT NULL,
    programa_codigo VARCHAR(30) NOT NULL,
    programa_nombre VARCHAR(250) NOT NULL,
    version VARCHAR(10) DEFAULT '1',
    nivel_formacion sena_nivel_formacion NOT NULL DEFAULT 'Tecnólogo',
    instructor_lider_id UUID REFERENCES public.instructores(id),
    modalidad sena_modalidad NOT NULL DEFAULT 'Presencial Diurna',
    ambiente_principal VARCHAR(150) NOT NULL,
    periodo_lectivo VARCHAR(50) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    matricula_inicial INT NOT NULL,
    aprendices_activos INT NOT NULL,
    aprendices_culminados INT DEFAULT 0,
    aprendices_cancelados INT DEFAULT 0,
    aprendices_aplazados INT DEFAULT 0,
    aprendices_retiro_voluntario INT DEFAULT 0,
    estado sena_estado_ficha DEFAULT 'ACTIVA',
    horas_directas_totales INT DEFAULT 3120,
    horas_independientes_totales INT DEFAULT 860,
    horas_ejecutadas INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABLA SEGUIMIENTO CURRICULAR (GPFI-F-134)
CREATE TABLE public.actividades_seguimiento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ficha_id UUID NOT NULL REFERENCES public.fichas(id) ON DELETE CASCADE,
    fase VARCHAR(50) NOT NULL,
    competencia_codigo VARCHAR(50) NOT NULL,
    competencia_denominacion TEXT NOT NULL,
    rap_codigo VARCHAR(50) NOT NULL,
    rap_denominacion TEXT NOT NULL,
    actividad_aprendizaje TEXT NOT NULL,
    evidencia_codigo VARCHAR(100) NOT NULL,
    horas_directas INT NOT NULL DEFAULT 0,
    horas_independientes INT NOT NULL DEFAULT 0,
    instructor_id UUID REFERENCES public.instructores(id),
    estado sena_estado_actividad DEFAULT 'PENDIENTE',
    observaciones TEXT,
    fecha_ultima_actualizacion DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABLA PROGRAMACIÓN DE HORARIOS (CON RESTRICCIONES ANTI-COLISIÓN)
CREATE TABLE public.bloques_horarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ficha_id UUID NOT NULL REFERENCES public.fichas(id) ON DELETE CASCADE,
    instructor_id UUID NOT NULL REFERENCES public.instructores(id) ON DELETE RESTRICT,
    dia_semana sena_dia_semana NOT NULL,
    franja sena_franja_horario NOT NULL,
    ambiente VARCHAR(150) NOT NULL,
    rap_codigo VARCHAR(50) NOT NULL,
    rap_titulo TEXT NOT NULL,
    competencia_codigo VARCHAR(50) NOT NULL,
    duracion_horas INT DEFAULT 3,
    trimestre VARCHAR(50) NOT NULL,
    fecha_corte_inicio DATE NOT NULL,
    fecha_corte_fin DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Restricciones Anti-Cruce:
    CONSTRAINT uq_instructor_dia_franja UNIQUE (instructor_id, dia_semana, franja, trimestre),
    CONSTRAINT uq_ambiente_dia_franja UNIQUE (ambiente, dia_semana, franja, trimestre),
    CONSTRAINT uq_ficha_dia_franja UNIQUE (ficha_id, dia_semana, franja, trimestre)
);

-- 8.1. TABLA AMBIENTES DE APRENDIZAJE
CREATE TABLE IF NOT EXISTS public.ambientes (
    id TEXT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    tipo VARCHAR(50) NOT NULL DEFAULT 'Ambiente TIC',
    sede VARCHAR(150) NOT NULL DEFAULT 'Sede Principal',
    capacidad_aprendices INTEGER NOT NULL DEFAULT 30,
    equipamiento TEXT,
    estado VARCHAR(30) NOT NULL DEFAULT 'DISPONIBLE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABLA APRENDICES MATRICULADOS
CREATE TABLE public.aprendices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ficha_id UUID NOT NULL REFERENCES public.fichas(id) ON DELETE CASCADE,
    documento VARCHAR(30) NOT NULL,
    tipo_documento VARCHAR(10) DEFAULT 'CC',
    nombres_apellidos VARCHAR(220) NOT NULL,
    correo VARCHAR(150),
    telefono VARCHAR(30),
    estado_matricula sena_estado_matricula DEFAULT 'EN FORMACION',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_aprendiz_ficha UNIQUE (documento, ficha_id)
);

-- 10. TABLA JUICIOS EVALUATIVOS (SOFIAPLUS)
CREATE TABLE public.juicios_evaluativos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aprendiz_id UUID NOT NULL REFERENCES public.aprendices(id) ON DELETE CASCADE,
    rap_id UUID REFERENCES public.resultados_aprendizaje(id) ON DELETE SET NULL,
    rap_codigo VARCHAR(50) NOT NULL,
    estado_juicio VARCHAR(20) NOT NULL CHECK (estado_juicio IN ('APROBADO', 'POR EVALUAR', 'NO APROBADO')),
    fecha_evaluacion DATE,
    instructor_evaluador_id UUID REFERENCES public.instructores(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_aprendiz_rap UNIQUE (aprendiz_id, rap_codigo)
);

-- 11. TABLA AUDITORÍA DE INGESTAS EXCEL
CREATE TABLE public.auditoria_ingestas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fecha_hora TIMESTAMPTZ DEFAULT NOW(),
    archivo_nombre VARCHAR(255) NOT NULL,
    tipo_plantilla VARCHAR(100) NOT NULL,
    modulo_destino VARCHAR(100) NOT NULL,
    registros_procesados INT DEFAULT 0,
    detalles_forward_fill INT DEFAULT 0,
    operador_nombre VARCHAR(200) NOT NULL,
    operador_rol sena_user_role NOT NULL,
    estado VARCHAR(50) DEFAULT 'Integrado con Éxito'
);

-- 12. TABLA AUDITORÍA INTEGRAL DE SEGURIDAD
CREATE TABLE public.auditoria_sistema (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fecha_hora TIMESTAMPTZ DEFAULT NOW(),
    usuario_nombre VARCHAR(200) NOT NULL,
    rol sena_user_role NOT NULL,
    accion VARCHAR(100) NOT NULL,
    modulo VARCHAR(100) NOT NULL,
    ip_origen VARCHAR(45) DEFAULT '127.0.0.1',
    detalles TEXT
);`;

  const seedSql = `-- =====================================================================
-- DATOS SEMILLA (SEED DATA) DE EJEMPLO
-- =====================================================================

-- 1. CENTRO DE FORMACIÓN
INSERT INTO public.centros_formacion (id, regional, centro, codigo_centro, sede)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'Regional',
    'Centro de Formación',
    '0000',
    'Sede Principal'
) ON CONFLICT (id) DO NOTHING;

-- 2. INSTRUCTORES DE PLANTA
INSERT INTO public.instructores (id, documento, nombres, apellidos, email, telefono, perfil_tecnico, especialidad, color_avatar, max_horas_semanales, estado)
VALUES
(
    'a0000000-0000-0000-0000-000000000001',
    '77189201',
    'Carlos Alberto',
    'Mendoza Romero',
    'carlos.mendoza@correo.edu.co',
    '3157891234',
    'Ingeniero de Sistemas, Especialista en Seguridad Informática',
    'Desarrollo de Software & Cloud',
    '#0D631B',
    32,
    'ACTIVO'
),
(
    'a0000000-0000-0000-0000-000000000002',
    '49782103',
    'Laura Patricia',
    'Gómez Silva',
    'laura.gomez@correo.edu.co',
    '3168902345',
    'Magíster en Gestión de Proyectos de Software, PMP',
    'Metodologías Ágiles & Calidad',
    '#6F43C0',
    32,
    'ACTIVO'
),
(
    'a0000000-0000-0000-0000-000000000003',
    '1065892114',
    'Jorge Eliécer',
    'Vega Castro',
    'jorge.vega@correo.edu.co',
    '3189013456',
    'Ingeniero Electrónico, Administrador Certificado AWS & Azure',
    'Arquitectura Cloud & DevOps',
    '#005A8C',
    32,
    'ACTIVO'
),
(
    'a0000000-0000-0000-0000-000000000004',
    '1065993821',
    'María Alejandra',
    'Pérez Nieto',
    'maria.perez@correo.edu.co',
    '3201234567',
    'Licenciada en Filología e Idiomas, Certificación C1 Cambridge',
    'Bilingüismo & Technical English',
    '#C67C00',
    20,
    'ACTIVO'
) ON CONFLICT (id) DO NOTHING;

-- 3. USUARIOS DEL SISTEMA (ROLES RBAC SEGÚN LA ESPECIFICACIÓN)
INSERT INTO public.usuarios (id, documento, correo, nombre_completo, rol, cargo, avatar_url)
VALUES
(
    'e0000000-0000-0000-0000-000000000001',
    '77100200',
    'coordinacion@correo.edu.co',
    'Ing. Claudia Patricia Restrepo',
    'COORDINADOR',
    'Coordinadora Académica de Formación Titulada',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
),
(
    'e0000000-0000-0000-0000-000000000002',
    '1065778899',
    'auxiliar.operativo@correo.edu.co',
    'Andrés Felipe Cañas',
    'AUXILIAR',
    'Auxiliar Operativo de Gestión Académica',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
),
(
    'e0000000-0000-0000-0000-000000000003',
    '77189201',
    'carlos.mendoza@correo.edu.co',
    'Ing. Carlos Alberto Mendoza',
    'INSTRUCTOR_LIDER',
    'Instructor Líder de Ficha 2694123',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
),
(
    'e0000000-0000-0000-0000-000000000004',
    '12345678',
    'admin.sistema@correo.edu.co',
    'Administrador de Sistema TIC',
    'ADMINISTRADOR',
    'Administrador del Sistema y Mesa de Soporte',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
) ON CONFLICT (id) DO NOTHING;

-- 4. FICHAS DE FORMACIÓN
INSERT INTO public.fichas (
    id, centro_id, numero_ficha, programa_codigo, programa_nombre, version, nivel_formacion, 
    instructor_lider_id, modalidad, ambiente_principal, periodo_lectivo, fecha_inicio, fecha_fin, 
    matricula_inicial, aprendices_activos, aprendices_culminados, aprendices_cancelados, 
    aprendices_aplazados, aprendices_retiro_voluntario, estado, horas_directas_totales, 
    horas_independientes_totales, horas_ejecutadas
) VALUES
(
    'f0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    '2694123',
    '228118',
    'Tecnología en Análisis y Desarrollo de Software',
    '1',
    'Tecnólogo',
    'a0000000-0000-0000-0000-000000000001',
    'Presencial Diurna',
    'Ambiente 204 - TIC / Software',
    '2026-III (Julio - Septiembre)',
    '2026-07-01',
    '2027-12-15',
    35,
    30,
    0,
    3,
    1,
    1,
    'ACTIVA',
    3120,
    860,
    1480
),
(
    'f0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000001',
    '3115086',
    '228101',
    'Tecnología en Gestión de Redes de Datos',
    '2',
    'Tecnólogo',
    'a0000000-0000-0000-0000-000000000003',
    'Presencial Nocturna',
    'Laboratorio Cisco - Bloque C',
    '2026-III',
    '2025-10-01',
    '2026-09-30',
    30,
    27,
    26,
    2,
    1,
    1,
    'POR_CERRAR',
    3120,
    860,
    2980
) ON CONFLICT (id) DO NOTHING;

-- 5. COMPETENCIAS Y RESULTADOS DE APRENDIZAJE (RAP)
INSERT INTO public.competencias (id, codigo, denominacion, horas_estimadas, tipo)
VALUES
(
    'c1000000-0000-0000-0000-000000000001',
    '220501096',
    'Desarrollar la estructura de datos y la lógica del software según requerimientos',
    180,
    'Técnica'
),
(
    'c1000000-0000-0000-0000-000000000002',
    '220501092',
    'Especificar los requisitos del software según estándares y necesidades del cliente',
    160,
    'Técnica'
),
(
    'c1000000-0000-0000-0000-000000000003',
    '240202501',
    'Interactuar en lengua inglesa de forma oral y escrita en contextos laborales',
    120,
    'Bilingüismo'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.resultados_aprendizaje (id, competencia_id, codigo_rap, denominacion, fase)
VALUES
(
    'd1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000001',
    'RAP 03',
    'Construir la base de datos y los servicios web API RESTful con autenticación segura',
    'Fase 3: Ejecución'
),
(
    'd1000000-0000-0000-0000-000000000002',
    'c1000000-0000-0000-0000-000000000002',
    'RAP 01',
    'Elaborar los diagramas de casos de uso y especificación formal de requisitos',
    'Fase 1: Análisis'
),
(
    'd1000000-0000-0000-0000-000000000003',
    'c1000000-0000-0000-0000-000000000003',
    'RAP 05',
    'Comprender vocabulario técnico y documentación de software en inglés',
    'Fase 2: Planeación'
) ON CONFLICT (id) DO NOTHING;

-- 6. SEGUIMIENTO CURRICULAR (ACTIVIDADES)
INSERT INTO public.actividades_seguimiento (
    id, ficha_id, rap_id, fase, competencia_codigo, competencia_denominacion, rap_codigo, 
    rap_denominacion, actividad_aprendizaje, evidencia_codigo, horas_directas, horas_independientes, 
    instructor_id, estado, observaciones
) VALUES
(
    'ac000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000001',
    'Fase 3: Ejecución',
    '220501096',
    'Desarrollar la estructura de datos y lógica del software',
    'RAP 03',
    'Construir la base de datos y API RESTful con JWT',
    'Construcción de arquitectura backend con Node.js, Express y Supabase PostgreSQL',
    'GA4-220501096-AA2-EV01',
    48,
    12,
    'a0000000-0000-0000-0000-000000000001',
    'EN EJECUCION',
    'Aprendices en desarrollo de endpoints autenticados con Row Level Security'
),
(
    'ac000000-0000-0000-0000-000000000002',
    'f0000000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000002',
    'Fase 1: Análisis',
    '220501092',
    'Especificar los requisitos del software',
    'RAP 01',
    'Elaborar casos de uso y diagramas UML',
    'Documento de Especificación de Requisitos de Software bajo estándar IEEE 830',
    'GA1-220501092-AA1-EV01',
    40,
    10,
    'a0000000-0000-0000-0000-000000000002',
    'CALIFICADO',
    'Aprobado 100% en SofiaPlus'
),
(
    'ac000000-0000-0000-0000-000000000003',
    'f0000000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000003',
    'Fase 2: Planeación',
    '240202501',
    'Interactuar en lengua inglesa técnica',
    'RAP 05',
    'Vocabulario técnico y documentación en inglés',
    'Cuestionario técnico y lectura crítica de especificaciones OpenAPI / Swagger',
    'GA3-240202501-AA1-EV02',
    30,
    10,
    'a0000000-0000-0000-0000-000000000004',
    'PENDIENTE',
    'Programado para semana 10'
) ON CONFLICT (id) DO NOTHING;

-- 7. PROGRAMACIÓN DE HORARIOS (CON COMPROBACIÓN DE REGLAS ANTI-CRUCES)
INSERT INTO public.bloques_horarios (
    id, ficha_id, instructor_id, dia_semana, franja, ambiente, rap_codigo, rap_titulo, 
    competencia_codigo, duracion_horas, trimestre, fecha_corte_inicio, fecha_corte_fin
) VALUES
(
    'b1000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Lunes',
    '06:00 - 09:00',
    'Ambiente 204 - TIC / Software',
    'RAP 03',
    'Construcción de API RESTful con JWT',
    '220501096',
    3,
    '2026-III',
    '2026-07-01',
    '2026-09-30'
),
(
    'b1000000-0000-0000-0000-000000000002',
    'f0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    'Martes',
    '09:00 - 12:00',
    'Ambiente 204 - TIC / Software',
    'RAP 01',
    'Requisitos y Diagramas UML',
    '220501092',
    3,
    '2026-III',
    '2026-07-01',
    '2026-09-30'
),
(
    'b1000000-0000-0000-0000-000000000003',
    'f0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000004',
    'Jueves',
    '06:00 - 09:00',
    'Ambiente 204 - TIC / Software',
    'RAP 05',
    'Technical English for Developers',
    '240202501',
    3,
    '2026-III',
    '2026-07-01',
    '2026-09-30'
),
(
    'b1000000-0000-0000-0000-000000000004',
    'f0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'Miércoles',
    '13:00 - 16:00',
    'Laboratorio Cisco - Bloque C',
    'RAP 04',
    'Arquitectura de Servidores y Redes',
    '220501096',
    3,
    '2026-III',
    '2026-07-01',
    '2026-09-30'
) ON CONFLICT (id) DO NOTHING;

-- 8. APRENDICES MATRICULADOS
INSERT INTO public.aprendices (id, ficha_id, documento, tipo_documento, nombres_apellidos, correo, estado_matricula)
VALUES
(
    'b2000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000001',
    '1065892001',
    'CC',
    'Juan David Montero Rangel',
    'jd.montero@correo.edu.co',
    'EN FORMACION'
),
(
    'b2000000-0000-0000-0000-000000000002',
    'f0000000-0000-0000-0000-000000000001',
    '1065892002',
    'CC',
    'Camila Andrea Quintero Soto',
    'ca.quintero@correo.edu.co',
    'EN FORMACION'
) ON CONFLICT (id) DO NOTHING;

-- 9. JUICIOS EVALUATIVOS
INSERT INTO public.juicios_evaluativos (id, aprendiz_id, rap_codigo, estado_juicio, fecha_evaluacion, instructor_evaluador_id)
VALUES
(
    'b3000000-0000-0000-0000-000000000001',
    'b2000000-0000-0000-0000-000000000001',
    'RAP 01',
    'APROBADO',
    '2026-08-15',
    'a0000000-0000-0000-0000-000000000002'
),
(
    'b3000000-0000-0000-0000-000000000002',
    'b2000000-0000-0000-0000-000000000001',
    'RAP 03',
    'POR EVALUAR',
    NULL,
    'a0000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;`;

  const reactCode = `// src/services/supabaseService.ts
import { supabase } from '../lib/supabaseClient';
import { Ficha, Instructor, BloqueHorario, ActividadSeguimiento } from '../types';

// 1. Obtener todas las Fichas
export async function getFichasFromSupabase(): Promise<Ficha[]> {
  const { data, error } = await supabase
    .from('fichas')
    .select('*, instructores(nombre_completo)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// 2. Insertar una nueva Ficha creada manualmente
export async function insertFichaSupabase(ficha: Omit<Ficha, 'id'>) {
  const { data, error } = await supabase
    .from('fichas')
    .insert([{
      numero_ficha: ficha.numero_ficha,
      programa_codigo: ficha.programaCodigo,
      programa_nombre: ficha.programaNombre,
      nivel_formacion: ficha.nivelFormacion,
      instructor_lider_id: ficha.instructorLiderId,
      modalidad: ficha.modalidad,
      ambiente_principal: ficha.ambientePrincipal,
      periodo_lectivo: ficha.periodoLectivo,
      fecha_inicio: ficha.fechaInicio,
      fecha_fin: ficha.fechaFin,
      matricula_inicial: ficha.matriculaInicial,
      aprendices_activos: ficha.aprendicesActivos,
      estado: ficha.estado
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 3. Programar bloque con protección de Anti-Colisión (captura error si hay solape)
export async function insertBloqueHorarioSupabase(bloque: Omit<BloqueHorario, 'id'>) {
  const { data, error } = await supabase
    .from('bloques_horarios')
    .insert([{
      ficha_id: bloque.fichaId,
      instructor_id: bloque.instructorId,
      dia_semana: bloque.diaSemana,
      franja: bloque.franja,
      ambiente: bloque.ambiente,
      rap_codigo: bloque.rapCodigo,
      rap_titulo: bloque.rapTitulo,
      competencia_codigo: bloque.competenciaCodigo,
      duracion_horas: bloque.duracionHoras,
      trimestre: bloque.trimestre,
      fecha_corte_inicio: bloque.fechaCorteInicio,
      fecha_corte_fin: bloque.fechaCorteFin
    }])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Conflicto de Horario detectado: El instructor o el ambiente ya tienen clase asignada en ese día y franja.');
    }
    throw error;
  }
  return data;
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Cabecera del Modal */}
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-[#0D631B]/5 via-white to-emerald-50/20 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#0D631B] text-white flex items-center justify-center shadow-lg shadow-[#0D631B]/20">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#E8F5E9] text-[#0D631B] uppercase tracking-wider">
                  Guía de Base de Datos PostgreSQL
                </span>
                <span className="text-xs font-bold text-slate-400">• Supabase Cloud</span>
              </div>
              <h2 className="text-xl font-black text-[#111C2D] tracking-tight mt-0.5">
                Arquitectura y Despliegue de Base de Datos para Supabase
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas de Navegación */}
        <div className="px-6 border-b border-slate-200 flex items-center space-x-2 bg-slate-50/70 overflow-x-auto text-xs font-bold">
          <button
            id="tab-estado-conexion"
            onClick={() => setActiveTab('ESTADO_CONEXION')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'ESTADO_CONEXION' 
                ? 'border-[#0D631B] text-[#0D631B] bg-white shadow-xs' 
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Wifi className="w-4 h-4" />
            <span>Estado & Diagnóstico en Vivo</span>
            {isSupabaseConfigured && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-1" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('PASO_A_PASO')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'PASO_A_PASO' 
                ? 'border-[#0D631B] text-[#0D631B] bg-white shadow-xs' 
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>1. Paso a Paso</span>
          </button>

          <button
            onClick={() => setActiveTab('DDL_SCHEMA')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'DDL_SCHEMA' 
                ? 'border-[#0D631B] text-[#0D631B] bg-white shadow-xs' 
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>2. Script SQL (DDL)</span>
          </button>

          <button
            onClick={() => setActiveTab('SEED_DATA')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'SEED_DATA' 
                ? 'border-[#0D631B] text-[#0D631B] bg-white shadow-xs' 
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>3. Datos Semilla (Seed)</span>
          </button>

          <button
            onClick={() => setActiveTab('EJEMPLOS_TABLAS')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'EJEMPLOS_TABLAS' 
                ? 'border-[#0D631B] text-[#0D631B] bg-white shadow-xs' 
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>4. Esquema de Tablas</span>
          </button>

          <button
            onClick={() => setActiveTab('CONEXION_REACT')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'CONEXION_REACT' 
                ? 'border-[#0D631B] text-[#0D631B] bg-white shadow-xs' 
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>5. Código React / SDK</span>
          </button>
        </div>

        {/* Contenido según la pestaña */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-sm text-slate-700">
          {/* TAB 0: ESTADO Y DIAGNÓSTICO EN VIVO */}
          {activeTab === 'ESTADO_CONEXION' && (
            <div className="space-y-6">
              {/* Tarjeta Principal de Conectividad */}
              <div className={`p-6 rounded-2xl border ${
                isSupabaseConfigured 
                  ? 'bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 border-emerald-300' 
                  : 'bg-amber-50 border-amber-200'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                      isSupabaseConfigured ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                    }`}>
                      <Wifi className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          isSupabaseConfigured 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isSupabaseConfigured ? 'Variables Detectadas' : 'Variables Pendientes'}
                        </span>
                        {testLatency !== null && (
                          <span className="text-xs font-mono font-bold text-slate-500">
                            Latencia: {testLatency}ms
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-black text-[#111C2D] mt-1">
                        {isSupabaseConfigured 
                          ? 'Instancia de Supabase Vinculada Correctamente' 
                          : 'Configuración de Supabase no detectada'}
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5 font-mono">
                        {supabaseUrlEnv || 'Sin URL asignada'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={runConnectionTest}
                    disabled={testStatus === 'TESTING'}
                    className="flex items-center space-x-2 bg-[#0D631B] hover:bg-[#0a4d15] disabled:bg-slate-400 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all shrink-0"
                  >
                    <RefreshCw className={`w-4 h-4 ${testStatus === 'TESTING' ? 'animate-spin' : ''}`} />
                    <span>{testStatus === 'TESTING' ? 'Probando...' : 'Diagnosticar Conexión Ahora'}</span>
                  </button>
                </div>

                {/* Resultado del Test */}
                {testMessage && (
                  <div className={`mt-5 p-4 rounded-xl text-xs font-medium border flex items-start space-x-3 ${
                    testStatus === 'SUCCESS' 
                      ? 'bg-emerald-100/70 border-emerald-300 text-emerald-900' 
                      : testStatus === 'ERROR' 
                      ? 'bg-red-50 border-red-200 text-red-800' 
                      : 'bg-slate-100 border-slate-200 text-slate-800'
                  }`}>
                    {testStatus === 'SUCCESS' && <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />}
                    {testStatus === 'ERROR' && <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />}
                    {testStatus === 'TESTING' && <RefreshCw className="w-5 h-5 text-slate-500 shrink-0 mt-0.5 animate-spin" />}
                    <div className="flex-1">
                      <p className="font-bold text-sm">{testMessage}</p>
                      {testStatus === 'SUCCESS' && tableDetails && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-emerald-200/80">
                          <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200">
                            <span className="text-[10px] text-slate-500 uppercase font-bold block">Fichas en BD</span>
                            <span className="text-base font-black text-[#0D631B]">{tableDetails.fichasCount}</span>
                          </div>
                          <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200">
                            <span className="text-[10px] text-slate-500 uppercase font-bold block">Instructores</span>
                            <span className="text-base font-black text-[#0D631B]">{tableDetails.instructoresCount}</span>
                          </div>
                          <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200">
                            <span className="text-[10px] text-slate-500 uppercase font-bold block">Centros</span>
                            <span className="text-base font-black text-[#0D631B]">{tableDetails.centrosCount}</span>
                          </div>
                          <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200">
                            <span className="text-[10px] text-slate-500 uppercase font-bold block">Bloques Horarios</span>
                            <span className="text-base font-black text-[#0D631B]">{tableDetails.horariosCount}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Variables de Entorno Detectadas */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <h4 className="font-bold text-[#111C2D] flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-[#0D631B]" />
                  <span>Credenciales del Archivo .env</span>
                </h4>
                <div className="space-y-2">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <span className="font-mono font-bold text-slate-600">VITE_SUPABASE_URL</span>
                    <span className="font-mono text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {supabaseUrlEnv ? supabaseUrlEnv : 'No detectada'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <span className="font-mono font-bold text-slate-600">VITE_SUPABASE_ANON_KEY</span>
                    <span className="font-mono text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {supabaseKeyEnv ? `${supabaseKeyEnv.substring(0, 16)}...${supabaseKeyEnv.substring(supabaseKeyEnv.length - 8)} (Activa)` : 'No detectada'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card de Configuración RLS (Permisos de Inserción y Lectura) */}
              <div className="bg-gradient-to-br from-amber-50/80 via-white to-emerald-50/50 p-5 rounded-2xl border border-amber-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[#111C2D] flex items-center space-x-2 text-sm">
                    <Database className="w-4 h-4 text-amber-600" />
                    <span>Permisos de Escritura en PostgreSQL (Row-Level Security)</span>
                  </h4>
                  <button
                    onClick={() => handleCopy(
`ALTER TABLE public.fichas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructores DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.actividades_seguimiento DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bloques_horarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.centros_formacion DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_ingestas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_sistema DISABLE ROW LEVEL SECURITY;`, 
                      'rls_card'
                    )}
                    className="flex items-center space-x-1 text-xs font-bold bg-white text-slate-700 hover:text-emerald-700 px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs transition-colors"
                  >
                    {copiedSection === 'rls_card' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{copiedSection === 'rls_card' ? '¡Copiado!' : 'Copiar SQL RLS'}</span>
                  </button>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Por defecto en Supabase, PostgreSQL activa <strong>RLS</strong>. Si la aplicación arroja error <strong>42501 (new row violates row-level security policy)</strong> al crear una ficha o instructor, ejecuta este script en el <strong>SQL Editor</strong> de Supabase para autorizar la sincronización en vivo:
                </p>
                <div className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto border border-slate-800 space-y-1">
                  <div>ALTER TABLE public.fichas DISABLE ROW LEVEL SECURITY;</div>
                  <div>ALTER TABLE public.instructores DISABLE ROW LEVEL SECURITY;</div>
                  <div>ALTER TABLE public.actividades_seguimiento DISABLE ROW LEVEL SECURITY;</div>
                  <div>ALTER TABLE public.bloques_horarios DISABLE ROW LEVEL SECURITY;</div>
                  <div>ALTER TABLE public.centros_formacion DISABLE ROW LEVEL SECURITY;</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: PASO A PASO */}
          {activeTab === 'PASO_A_PASO' && (
            <div className="space-y-5">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-900">
                <div className="font-bold flex items-center space-x-2 mb-1">
                  <ShieldCheck className="w-5 h-5 text-[#0D631B]" />
                  <span>Configuración en 5 Minutos para tu Centro de Formación</span>
                </div>
                <p className="text-xs text-emerald-800">
                  Supabase te provee un motor PostgreSQL 15 nativo en la nube con soporte de Row Level Security (RLS), autenticación de usuarios y API RESTful automática sin escribir backend adicional.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-start space-x-4">
                  <div className="w-8 h-8 rounded-full bg-[#0D631B] text-white flex items-center justify-center font-black text-sm shrink-0">
                    1
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-[#111C2D]">Crea tu Proyecto en Supabase</h4>
                    <p className="text-xs text-slate-500">
                      Entra a <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-[#0D631B] underline font-semibold">supabase.com</a>, inicia sesión con GitHub o email y haz clic en <strong>"New Project"</strong>.
                    </p>
                    <div className="text-xs bg-slate-100 p-2 rounded-lg font-mono text-slate-700">
                      Name: gestion-academica | Region: South America (São Paulo) o East US
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-start space-x-4">
                  <div className="w-8 h-8 rounded-full bg-[#0D631B] text-white flex items-center justify-center font-black text-sm shrink-0">
                    2
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-[#111C2D]">Abre el "SQL Editor" en Supabase</h4>
                    <p className="text-xs text-slate-500">
                      En el menú lateral izquierdo de tu consola Supabase, haz clic en el ícono de terminal <strong>"SQL Editor"</strong> y luego en <strong>"+ New Query"</strong>.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-start space-x-4">
                  <div className="w-8 h-8 rounded-full bg-[#0D631B] text-white flex items-center justify-center font-black text-sm shrink-0">
                    3
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-[#111C2D]">Ejecuta el Script DDL (Tablas, Claves y Reglas)</h4>
                      <button
                        onClick={() => handleCopy(ddlSql, 'step3')}
                        className="flex items-center space-x-1 text-xs bg-[#E8F5E9] text-[#0D631B] hover:bg-[#d5ecd7] px-2.5 py-1 rounded-lg font-bold border border-[#C8E6C9] transition-colors"
                      >
                        {copiedSection === 'step3' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedSection === 'step3' ? '¡Copiado!' : 'Copiar DDL'}</span>
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">
                      Pega el contenido de la pestaña <strong>"2. Script SQL Completo (DDL)"</strong> y presiona <strong>RUN</strong>. Se crearán las 10 tablas institucionales, claves foráneas, restricciones anti-colisión de horarios y tipos ENUM.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-start space-x-4">
                  <div className="w-8 h-8 rounded-full bg-[#0D631B] text-white flex items-center justify-center font-black text-sm shrink-0">
                    4
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-[#111C2D]">Ejecuta los Datos Semilla (Seed Inicial)</h4>
                      <button
                        onClick={() => handleCopy(seedSql, 'step4')}
                        className="flex items-center space-x-1 text-xs bg-[#EDE7F6] text-[#6F43C0] hover:bg-[#ded4f0] px-2.5 py-1 rounded-lg font-bold border border-[#D3BBFF] transition-colors"
                      >
                        {copiedSection === 'step4' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedSection === 'step4' ? '¡Copiado!' : 'Copiar Seed'}</span>
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">
                      Pega el script de la pestaña <strong>"3. Datos Semilla"</strong> y presiona <strong>RUN</strong>. Esto insertará la Ficha 2694123 (ADSO), instructores, competencias, RAPs y horarios de prueba.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-start space-x-4">
                  <div className="w-8 h-8 rounded-full bg-[#0D631B] text-white flex items-center justify-center font-black text-sm shrink-0">
                    5
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-[#111C2D]">Copia tus Credenciales en .env</h4>
                    <p className="text-xs text-slate-500">
                      En Supabase ve a <strong>Project Settings → API</strong>. Copia tu <code>Project URL</code> y tu clave pública <code>anon public key</code> y pégalas en tu archivo <code>.env</code> o secrets:
                    </p>
                    <div className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-xs overflow-x-auto">
                      <div>VITE_SUPABASE_URL="https://tu-proyecto.supabase.co"</div>
                      <div>VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR..."</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DDL SQL COMPLETO */}
          {activeTab === 'DDL_SCHEMA' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-[#111C2D]">Script DDL Oficial (PostgreSQL 15+)</h3>
                  <p className="text-xs text-slate-500">Ubicación local en el proyecto: <code>/supabase/migrations/20260917_init_sena_schema.sql</code></p>
                </div>
                <button
                  onClick={() => handleCopy(ddlSql, 'ddl_tab')}
                  className="flex items-center space-x-1.5 bg-[#0D631B] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-[#0a4d15] shadow-xs transition-all"
                >
                  {copiedSection === 'ddl_tab' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedSection === 'ddl_tab' ? '¡Copiado!' : 'Copiar Script DDL'}</span>
                </button>
              </div>

              <div className="relative">
                <pre className="bg-slate-900 text-emerald-400 p-4 rounded-2xl text-xs font-mono overflow-x-auto max-h-[55vh] leading-relaxed border border-slate-800">
                  {ddlSql}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: SEED SQL */}
          {activeTab === 'SEED_DATA' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-[#111C2D]">Datos Semilla Iniciales (Seed Data)</h3>
                  <p className="text-xs text-slate-500">Ubicación local en el proyecto: <code>/supabase/seed.sql</code></p>
                </div>
                <button
                  onClick={() => handleCopy(seedSql, 'seed_tab')}
                  className="flex items-center space-x-1.5 bg-[#0D631B] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-[#0a4d15] shadow-xs transition-all"
                >
                  {copiedSection === 'seed_tab' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedSection === 'seed_tab' ? '¡Copiado!' : 'Copiar Seed Data'}</span>
                </button>
              </div>

              <div className="relative">
                <pre className="bg-slate-900 text-amber-300 p-4 rounded-2xl text-xs font-mono overflow-x-auto max-h-[55vh] leading-relaxed border border-slate-800">
                  {seedSql}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: EJEMPLOS DE TABLAS */}
          {activeTab === 'EJEMPLOS_TABLAS' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-[#111C2D] mb-1">Diccionario de Tablas y Ejemplos de Datos Reales</h3>
                <p className="text-xs text-slate-500">Estructura normalizada y relaciones bajo el estándar del Modelo Pedagógico institucional.</p>
              </div>

              {/* Tabla Fichas */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 font-bold text-xs text-[#111C2D] flex items-center justify-between">
                  <span>1. Tabla: `public.fichas` (Cohortes de Aprendizaje)</span>
                  <span className="text-[11px] font-normal text-slate-500">Clave Primaria: id (UUID)</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">id</th>
                        <th className="p-2.5">numero_ficha</th>
                        <th className="p-2.5">programa_nombre</th>
                        <th className="p-2.5">nivel_formacion</th>
                        <th className="p-2.5">instructor_lider_id</th>
                        <th className="p-2.5">matricula_inicial</th>
                        <th className="p-2.5">aprendices_activos</th>
                        <th className="p-2.5">estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      <tr>
                        <td className="p-2.5 text-slate-400">f000...001</td>
                        <td className="p-2.5 font-bold text-[#0D631B]">2694123</td>
                        <td className="p-2.5 font-sans font-medium">Tecnología en Análisis y Desarrollo de Software</td>
                        <td className="p-2.5">Tecnólogo</td>
                        <td className="p-2.5 text-slate-500">a000...001</td>
                        <td className="p-2.5">35</td>
                        <td className="p-2.5">30</td>
                        <td className="p-2.5"><span className="px-2 py-0.5 rounded bg-emerald-100 text-[#0D631B] font-bold">ACTIVA</span></td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-slate-400">f000...002</td>
                        <td className="p-2.5 font-bold text-[#0D631B]">3115086</td>
                        <td className="p-2.5 font-sans font-medium">Tecnología en Gestión de Redes de Datos</td>
                        <td className="p-2.5">Tecnólogo</td>
                        <td className="p-2.5 text-slate-500">a000...003</td>
                        <td className="p-2.5">30</td>
                        <td className="p-2.5">27</td>
                        <td className="p-2.5"><span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">POR_CERRAR</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tabla Instructores */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 font-bold text-xs text-[#111C2D] flex items-center justify-between">
                  <span>2. Tabla: `public.instructores` (Planta y Disponibilidad)</span>
                  <span className="text-[11px] font-normal text-slate-500">Restricción: max_horas_semanales &lt;= 48</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">documento</th>
                        <th className="p-2.5">nombre_completo</th>
                        <th className="p-2.5">email</th>
                        <th className="p-2.5">especialidad</th>
                        <th className="p-2.5">max_horas_semanales</th>
                        <th className="p-2.5">estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      <tr>
                        <td className="p-2.5">77189201</td>
                        <td className="p-2.5 font-sans font-bold text-[#111C2D]">Carlos Alberto Mendoza Romero</td>
                        <td className="p-2.5 text-slate-500">carlos.mendoza@correo.edu.co</td>
                        <td className="p-2.5 font-sans">Desarrollo de Software & Cloud</td>
                        <td className="p-2.5 font-bold">32 hrs</td>
                        <td className="p-2.5"><span className="px-2 py-0.5 rounded bg-emerald-100 text-[#0D631B] font-bold">ACTIVO</span></td>
                      </tr>
                      <tr>
                        <td className="p-2.5">49782103</td>
                        <td className="p-2.5 font-sans font-bold text-[#111C2D]">Laura Patricia Gómez Silva</td>
                        <td className="p-2.5 text-slate-500">laura.gomez@correo.edu.co</td>
                        <td className="p-2.5 font-sans">Metodologías Ágiles & Calidad</td>
                        <td className="p-2.5 font-bold">32 hrs</td>
                        <td className="p-2.5"><span className="px-2 py-0.5 rounded bg-emerald-100 text-[#0D631B] font-bold">ACTIVO</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tabla Bloques Horarios */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 font-bold text-xs text-[#111C2D] flex items-center justify-between">
                  <span>3. Tabla: `public.bloques_horarios` (Matriz Anti-Colisión)</span>
                  <span className="text-[11px] font-bold text-[#BA1A1A]">Regla: UNIQUE(instructor_id, dia, franja) & UNIQUE(ambiente, dia, franja)</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">dia_semana</th>
                        <th className="p-2.5">franja</th>
                        <th className="p-2.5">ambiente</th>
                        <th className="p-2.5">instructor_id</th>
                        <th className="p-2.5">rap_codigo</th>
                        <th className="p-2.5">duracion_horas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      <tr>
                        <td className="p-2.5 font-bold">Lunes</td>
                        <td className="p-2.5 text-[#005A8C] font-bold">06:00 - 09:00</td>
                        <td className="p-2.5 font-sans">Ambiente 204 - TIC</td>
                        <td className="p-2.5 text-slate-500">a000...001 (Carlos Mendoza)</td>
                        <td className="p-2.5 font-bold text-[#0D631B]">RAP 03</td>
                        <td className="p-2.5 font-bold">3 hrs</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold">Martes</td>
                        <td className="p-2.5 text-[#005A8C] font-bold">09:00 - 12:00</td>
                        <td className="p-2.5 font-sans">Ambiente 204 - TIC</td>
                        <td className="p-2.5 text-slate-500">a000...002 (Laura Gómez)</td>
                        <td className="p-2.5 font-bold text-[#0D631B]">RAP 01</td>
                        <td className="p-2.5 font-bold">3 hrs</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tabla Seguimiento Curricular */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 font-bold text-xs text-[#111C2D] flex items-center justify-between">
                  <span>4. Tabla: `public.actividades_seguimiento` (GPFI-F-134)</span>
                  <span className="text-[11px] font-normal text-slate-500">Horas Directas vs Independientes</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">fase</th>
                        <th className="p-2.5">competencia_codigo</th>
                        <th className="p-2.5">rap_codigo</th>
                        <th className="p-2.5">evidencia_codigo</th>
                        <th className="p-2.5">horas_dir</th>
                        <th className="p-2.5">horas_ind</th>
                        <th className="p-2.5">estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      <tr>
                        <td className="p-2.5 font-sans">Fase 3: Ejecución</td>
                        <td className="p-2.5">220501096</td>
                        <td className="p-2.5 font-bold text-[#0D631B]">RAP 03</td>
                        <td className="p-2.5 text-slate-600">GA4-220501096-AA2-EV01</td>
                        <td className="p-2.5 font-bold">48 hrs</td>
                        <td className="p-2.5">12 hrs</td>
                        <td className="p-2.5"><span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">EN EJECUCION</span></td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-sans">Fase 1: Análisis</td>
                        <td className="p-2.5">220501092</td>
                        <td className="p-2.5 font-bold text-[#0D631B]">RAP 01</td>
                        <td className="p-2.5 text-slate-600">GA1-220501092-AA1-EV01</td>
                        <td className="p-2.5 font-bold">40 hrs</td>
                        <td className="p-2.5">10 hrs</td>
                        <td className="p-2.5"><span className="px-2 py-0.5 rounded bg-emerald-100 text-[#0D631B] font-bold">CALIFICADO</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: INTEGRACIÓN REACT */}
          {activeTab === 'CONEXION_REACT' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-[#111C2D]">Servicio Supabase en TypeScript para la Aplicación</h3>
                  <p className="text-xs text-slate-500">Ya quedó instalado el paquete <code>@supabase/supabase-js</code> y listo el cliente en <code>/src/lib/supabaseClient.ts</code></p>
                </div>
                <button
                  onClick={() => handleCopy(reactCode, 'react_code')}
                  className="flex items-center space-x-1.5 bg-[#0D631B] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-[#0a4d15] shadow-xs transition-all"
                >
                  {copiedSection === 'react_code' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedSection === 'react_code' ? '¡Copiado!' : 'Copiar Código'}</span>
                </button>
              </div>

              <div className="relative">
                <pre className="bg-slate-900 text-sky-300 p-4 rounded-2xl text-xs font-mono overflow-x-auto max-h-[55vh] leading-relaxed border border-slate-800">
                  {reactCode}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer del Modal */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <div className="text-slate-500">
            Archivos creados en tu repositorio: <span className="font-mono font-bold text-slate-700">/supabase/migrations</span> y <span className="font-mono font-bold text-slate-700">/supabase/seed.sql</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#0D631B] text-white font-bold rounded-xl hover:bg-[#0a4d15] shadow-sm transition-all"
          >
            Entendido, Cerrar Guía
          </button>
        </div>
      </div>
    </div>
  );
};
