-- =====================================================================
-- SINCRONIZACIÓN DEL MÓDULO DE SEGUIMIENTO CURRICULAR CON SUPABASE
-- =====================================================================
-- Contexto: el módulo de Seguimiento (actividades GPFI-F-134 y el estado
-- por RAP individual con instructor asignado) sólo vivía en localStorage /
-- memoria del navegador. Esto rompía el objetivo de "visibilidad en tiempo
-- real" del PRD: dos usuarios (p.ej. Coordinador y Auxiliar) en dos equipos
-- distintos no veían los mismos datos, y cualquier cambio se perdía al
-- limpiar el navegador.
--
-- Esta migración:
--   1. Agrega la columna instructor_nombre a actividades_seguimiento
--      (la tabla ya existía en el esquema inicial, pero faltaba esta
--      columna denormalizada; el resto de la app ya sigue ese patrón,
--      p.ej. competencia_denominacion / rap_denominacion en la misma tabla).
--   2. Crea la tabla raps_seguimiento, que no existía: es el estado
--      editable por RAP individual (instructor asignado + estado
--      PENDIENTE/EN_EJECUCION/CALIFICADO/SIN_CALIFICAR) que se ve en la
--      pestaña "Comparativo por Competencia & RAPs" del módulo.
-- =====================================================================

-- 1. Columna faltante en actividades_seguimiento
ALTER TABLE public.actividades_seguimiento
  ADD COLUMN IF NOT EXISTS instructor_nombre VARCHAR(220);

-- 2. Enum de estado de RAP (los mismos 4 estados que ya usa el frontend)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sena_estado_rap') THEN
    CREATE TYPE sena_estado_rap AS ENUM ('PENDIENTE', 'EN_EJECUCION', 'CALIFICADO', 'SIN_CALIFICAR');
  END IF;
END$$;

-- 3. Tabla de Seguimiento por RAP individual (instructor asignado + estado, por ficha)
CREATE TABLE IF NOT EXISTS public.raps_seguimiento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ficha_id UUID NOT NULL REFERENCES public.fichas(id) ON DELETE CASCADE,
    ficha_numero VARCHAR(20) NOT NULL,
    programa_codigo VARCHAR(30),
    competencia_codigo VARCHAR(50) NOT NULL,
    competencia_denominacion TEXT,
    rap_codigo VARCHAR(50) NOT NULL,
    rap_denominacion TEXT,
    instructor_id UUID REFERENCES public.instructores(id) ON DELETE SET NULL,
    instructor_nombre VARCHAR(220),
    estado sena_estado_rap NOT NULL DEFAULT 'PENDIENTE',
    -- 'MANUAL' | 'HORARIO' | 'JUICIOS' (de dónde vino el instructor / el estado)
    fuente_instructor VARCHAR(20),
    fuente_estado VARCHAR(20),
    fecha_actualizacion TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Un solo registro de seguimiento por RAP, competencia y ficha.
    -- IMPORTANTE: el código de RAP (p.ej. "RAP 01") se reinicia en cada
    -- competencia — NO es único por ficha. La restricción original solo
    -- incluía (ficha_id, rap_codigo), lo que hacía que "RAP 01" de una
    -- competencia y "RAP 01" de otra compitieran por la MISMA fila: asignar
    -- instructor a un RAP terminaba pisando el de todos los RAPs con el
    -- mismo número en otras competencias de la misma ficha.
    CONSTRAINT uq_raps_seguimiento_ficha_comp_rap UNIQUE (ficha_id, competencia_codigo, rap_codigo)
);

CREATE INDEX IF NOT EXISTS idx_raps_seguimiento_ficha ON public.raps_seguimiento(ficha_id);

ALTER TABLE public.raps_seguimiento ENABLE ROW LEVEL SECURITY;

-- NOTA DE SEGURIDAD: se usa la misma política abierta que el resto de tablas
-- de este esquema (acceso total para anon/authenticated) para no romper la
-- app tal como está montada hoy (sin JWT/roles reales en Supabase Auth).
-- Esto significa que cualquiera con la anon key puede leer/escribir/borrar
-- TODO en la base de datos, incluyendo esta tabla. Vale la pena revisar esto
-- pronto (RLS por rol) antes de usar esta base de datos con datos reales de
-- aprendices en producción.
DROP POLICY IF EXISTS "Permitir todo raps_seguimiento" ON public.raps_seguimiento;
CREATE POLICY "Permitir todo raps_seguimiento" ON public.raps_seguimiento FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
