-- =====================================================================
-- SISTEMA DE GESTIÓN ACADÉMICA Y CURRICULAR INTEGRAL SENA (CBC - CESAR)
-- SCRIPT DE INICIALIZACIÓN DDL Y ESQUEMA RELACIONAL PARA SUPABASE (POSTGRESQL)
-- Versión: 2.4 - Cumplimiento TRD / PRD Formato F001-008-25
-- =====================================================================

-- 1. HABILITAR EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TIPOS ENUMERADOS DEL SISTEMA
CREATE TYPE sena_user_role AS ENUM ('ADMINISTRADOR', 'COORDINADOR', 'INSTRUCTOR_LIDER', 'AUXILIAR');
CREATE TYPE sena_nivel_formacion AS ENUM ('Auxiliar', 'Técnico', 'Tecnólogo');
CREATE TYPE sena_modalidad AS ENUM ('Presencial Diurna', 'Presencial Nocturna', 'Mixta / Virtual');
CREATE TYPE sena_estado_ficha AS ENUM ('ACTIVA', 'POR_CERRAR', 'CERRADA');
CREATE TYPE sena_estado_actividad AS ENUM ('PENDIENTE', 'EN EJECUCION', 'CALIFICADO');
CREATE TYPE sena_dia_semana AS ENUM ('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado');
CREATE TYPE sena_franja_horario AS ENUM ('06:00 - 09:00', '09:00 - 12:00', '13:00 - 16:00', '16:00 - 19:00');
CREATE TYPE sena_estado_matricula AS ENUM ('EN FORMACION', 'CONDICIONADO', 'CANCELADO', 'RETIRO VOLUNTARIO', 'CULMINADO', 'APLAZADO');

-- =====================================================================
-- TABLA 1: CENTROS Y SEDES (CENTRO BIOTECNOLÓGICO DEL CARIBE)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.centros_formacion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    regional VARCHAR(100) NOT NULL DEFAULT 'Regional Cesar',
    centro VARCHAR(200) NOT NULL DEFAULT 'Centro Biotecnológico del Caribe',
    codigo_centro VARCHAR(20) NOT NULL DEFAULT '9513',
    sede VARCHAR(150) NOT NULL DEFAULT 'Sede Principal - Kilómetro 7 Vía a la Paz',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- TABLA 2: USUARIOS Y ACCESO (INTEGRACIÓN CON SUPABASE AUTH)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.usuarios (
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- TABLA 3: INSTRUCTORES Y PLANTA DOCENTE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.instructores (
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
    max_horas_semanales INT DEFAULT 32 CHECK (max_horas_semanales > 0 AND max_horas_semanales <= 48),
    estado VARCHAR(20) DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'INACTIVO')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- TABLA 4: FICHAS DE FORMACIÓN (COHORTES)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.fichas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    centro_id UUID REFERENCES public.centros_formacion(id) ON DELETE SET NULL,
    numero_ficha VARCHAR(20) UNIQUE NOT NULL,
    programa_codigo VARCHAR(30) NOT NULL,
    programa_nombre VARCHAR(250) NOT NULL,
    version VARCHAR(10) DEFAULT '1',
    nivel_formacion sena_nivel_formacion NOT NULL DEFAULT 'Tecnólogo',
    instructor_lider_id UUID REFERENCES public.instructores(id) ON DELETE SET NULL,
    modalidad sena_modalidad NOT NULL DEFAULT 'Presencial Diurna',
    ambiente_principal VARCHAR(150) NOT NULL,
    periodo_lectivo VARCHAR(50) NOT NULL, -- Ej: '2026-III'
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    matricula_inicial INT NOT NULL CHECK (matricula_inicial >= 0),
    aprendices_activos INT NOT NULL CHECK (aprendices_activos >= 0),
    aprendices_culminados INT DEFAULT 0 CHECK (aprendices_culminados >= 0),
    aprendices_cancelados INT DEFAULT 0 CHECK (aprendices_cancelados >= 0),
    aprendices_aplazados INT DEFAULT 0 CHECK (aprendices_aplazados >= 0),
    aprendices_retiro_voluntario INT DEFAULT 0 CHECK (aprendices_retiro_voluntario >= 0),
    estado sena_estado_ficha DEFAULT 'ACTIVA',
    horas_directas_totales INT DEFAULT 3120,
    horas_independientes_totales INT DEFAULT 860,
    horas_ejecutadas INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- TABLA 5: COMPETENCIAS FORMATIVAS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.competencias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    denominacion TEXT NOT NULL,
    horas_estimadas INT DEFAULT 160,
    tipo VARCHAR(30) DEFAULT 'Técnica' CHECK (tipo IN ('Técnica', 'Transversal', 'Bilingüismo')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- TABLA 6: RESULTADOS DE APRENDIZAJE (RAP)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.resultados_aprendizaje (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competencia_id UUID REFERENCES public.competencias(id) ON DELETE CASCADE,
    codigo_rap VARCHAR(50) NOT NULL,
    denominacion TEXT NOT NULL,
    fase VARCHAR(50) NOT NULL, -- 'Fase 1: Análisis', 'Fase 2: Planeación', etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- TABLA 7: SEGUIMIENTO CURRICULAR (GPFI-F-134)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.actividades_seguimiento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ficha_id UUID NOT NULL REFERENCES public.fichas(id) ON DELETE CASCADE,
    rap_id UUID REFERENCES public.resultados_aprendizaje(id) ON DELETE SET NULL,
    fase VARCHAR(50) NOT NULL,
    competencia_codigo VARCHAR(50) NOT NULL,
    competencia_denominacion TEXT NOT NULL,
    rap_codigo VARCHAR(50) NOT NULL,
    rap_denominacion TEXT NOT NULL,
    actividad_aprendizaje TEXT NOT NULL,
    evidencia_codigo VARCHAR(100) NOT NULL,
    horas_directas INT NOT NULL DEFAULT 0,
    horas_independientes INT NOT NULL DEFAULT 0,
    instructor_id UUID REFERENCES public.instructores(id) ON DELETE SET NULL,
    estado sena_estado_actividad DEFAULT 'PENDIENTE',
    observaciones TEXT,
    fecha_ultima_actualizacion DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- TABLA 8: PROGRAMACIÓN DE HORARIOS & BLOQUES SEMANALES
-- REGLA ANTI-COLISIÓN: UN INSTRUCTOR NO PUEDE ESTAR EN 2 FICHAS EN MISMO DÍA/FRANJA
-- UN AMBIENTE NO PUEDE ESTAR OCUPADO POR 2 FICHAS EN MISMO DÍA/FRANJA
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.bloques_horarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ficha_id UUID NOT NULL REFERENCES public.fichas(id) ON DELETE CASCADE,
    instructor_id UUID NOT NULL REFERENCES public.instructores(id) ON DELETE RESTRICT,
    dia_semana sena_dia_semana NOT NULL,
    franja sena_franja_horario NOT NULL,
    ambiente VARCHAR(150) NOT NULL,
    rap_codigo VARCHAR(50) NOT NULL,
    rap_titulo TEXT NOT NULL,
    competencia_codigo VARCHAR(50) NOT NULL,
    duracion_horas INT DEFAULT 3 CHECK (duracion_horas > 0),
    trimestre VARCHAR(50) NOT NULL,
    fecha_corte_inicio DATE NOT NULL,
    fecha_corte_fin DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Restricción 1: Un instructor no puede tener 2 clases el mismo día y franja horaria
    CONSTRAINT uq_instructor_dia_franja UNIQUE (instructor_id, dia_semana, franja, trimestre),
    -- Restricción 2: Un ambiente no puede tener 2 clases el mismo día y franja horaria
    CONSTRAINT uq_ambiente_dia_franja UNIQUE (ambiente, dia_semana, franja, trimestre),
    -- Restricción 3: Una misma ficha no puede tener 2 clases a la misma hora
    CONSTRAINT uq_ficha_dia_franja UNIQUE (ficha_id, dia_semana, franja, trimestre)
);

-- =====================================================================
-- TABLA 9: APRENDICES Y MATRÍCULAS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.aprendices (
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

-- =====================================================================
-- TABLA 10: JUICIOS EVALUATIVOS (SOFIAPLUS)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.juicios_evaluativos (
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

-- =====================================================================
-- TABLA 11: AUDITORÍA DE INGESTAS EXCEL
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.auditoria_ingestas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fecha_hora TIMESTAMPTZ DEFAULT NOW(),
    archivo_nombre VARCHAR(255) NOT NULL,
    tipo_plantilla VARCHAR(100) NOT NULL, -- 'Seguimiento Curricular', 'Juicios Evaluativos', etc.
    modulo_destino VARCHAR(100) NOT NULL,
    registros_procesados INT DEFAULT 0,
    detalles_forward_fill INT DEFAULT 0,
    operador_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    operador_nombre VARCHAR(200) NOT NULL,
    operador_rol sena_user_role NOT NULL,
    estado VARCHAR(50) DEFAULT 'Integrado con Éxito',
    detalles_log JSONB
);

-- =====================================================================
-- TABLA 12: AUDITORÍA INTEGRAL DE SEGURIDAD Y ACCIONES
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.auditoria_sistema (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fecha_hora TIMESTAMPTZ DEFAULT NOW(),
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    usuario_nombre VARCHAR(200) NOT NULL,
    rol sena_user_role NOT NULL,
    accion VARCHAR(100) NOT NULL,
    modulo VARCHAR(100) NOT NULL,
    ip_origen VARCHAR(45) DEFAULT '127.0.0.1',
    detalles TEXT
);

-- =====================================================================
-- VISTAS COMPUTADAS PARA INDICADORES Y FÓRMULAS INSTITUCIONALES SENA
-- =====================================================================

-- Vista de Fórmulas Oficiales: Tasa de Retención y Deserción por Ficha
CREATE OR REPLACE VIEW public.v_indicadores_cierre_fichas AS
SELECT 
    f.id AS ficha_id,
    f.numero_ficha,
    f.programa_nombre,
    f.nivel_formacion,
    f.matricula_inicial,
    f.aprendices_activos,
    f.aprendices_culminados,
    f.aprendices_cancelados,
    f.aprendices_aplazados,
    f.aprendices_retiro_voluntario,
    -- Tasa de Retención = (Aprendices Culminados / Matrícula Inicial) * 100
    ROUND(
        CASE 
            WHEN f.matricula_inicial > 0 THEN (f.aprendices_culminados::NUMERIC / f.matricula_inicial::NUMERIC) * 100 
            ELSE 0 
        END, 2
    ) AS tasa_retencion,
    -- Tasa de Deserción = ((Cancelados + Retiros Voluntarios) / Matrícula Inicial) * 100
    ROUND(
        CASE 
            WHEN f.matricula_inicial > 0 THEN ((f.aprendices_cancelados + f.aprendices_retiro_voluntario)::NUMERIC / f.matricula_inicial::NUMERIC) * 100 
            ELSE 0 
        END, 2
    ) AS tasa_desercion,
    f.estado AS estado_ficha
FROM public.fichas f;

-- Vista de Carga Horaria Acumulada por Instructor
CREATE OR REPLACE VIEW public.v_carga_instructores AS
SELECT 
    i.id AS instructor_id,
    i.nombre_completo,
    i.email,
    i.especialidad,
    i.max_horas_semanales,
    COALESCE(SUM(b.duracion_horas), 0) AS horas_asignadas_semanales,
    (i.max_horas_semanales - COALESCE(SUM(b.duracion_horas), 0)) AS horas_disponibles,
    ROUND((COALESCE(SUM(b.duracion_horas), 0)::NUMERIC / NULLIF(i.max_horas_semanales, 0)::NUMERIC) * 100, 1) AS porcentaje_ocupacion
FROM public.instructores i
LEFT JOIN public.bloques_horarios b ON i.id = b.instructor_id
GROUP BY i.id, i.nombre_completo, i.email, i.especialidad, i.max_horas_semanales;

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES PARA CONTROL DE ACCESO
-- =====================================================================
ALTER TABLE public.fichas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actividades_seguimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bloques_horarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aprendices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_ingestas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.centros_formacion ENABLE ROW LEVEL SECURITY;

-- Políticas de Acceso Completo para la Aplicación SENA CBC (Anon y Autenticados)
DROP POLICY IF EXISTS "Permitir todo fichas" ON public.fichas;
CREATE POLICY "Permitir todo fichas" ON public.fichas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo instructores" ON public.instructores;
CREATE POLICY "Permitir todo instructores" ON public.instructores FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo seguimiento" ON public.actividades_seguimiento;
CREATE POLICY "Permitir todo seguimiento" ON public.actividades_seguimiento FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo horarios" ON public.bloques_horarios;
CREATE POLICY "Permitir todo horarios" ON public.bloques_horarios FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo aprendices" ON public.aprendices;
CREATE POLICY "Permitir todo aprendices" ON public.aprendices FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo auditoria_ingestas" ON public.auditoria_ingestas;
CREATE POLICY "Permitir todo auditoria_ingestas" ON public.auditoria_ingestas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo auditoria_sistema" ON public.auditoria_sistema;
CREATE POLICY "Permitir todo auditoria_sistema" ON public.auditoria_sistema FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo centros" ON public.centros_formacion;
CREATE POLICY "Permitir todo centros" ON public.centros_formacion FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

