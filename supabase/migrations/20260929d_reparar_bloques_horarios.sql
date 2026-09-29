-- =====================================================================
-- REPARAR LA PERSISTENCIA DE BLOQUES DE HORARIO (bloques_horarios)
-- =====================================================================
-- Seguro de correr varias veces.
--
-- Causa (verificada contra tu proyecto): la app envía el nombre del
-- instructor en cada bloque (`instructor_nombre`), pero esa columna nunca
-- existió en la tabla. Supabase rechazaba TODOS los bloques con
--   "Could not find the 'instructor_nombre' column of 'bloques_horarios'"
-- y el error quedaba escondido: el bloque se veía en pantalla (vivía solo en
-- el localStorage del navegador, llave `sena_horarios`) pero nunca llegaba
-- a Supabase.
-- =====================================================================

-- 1. Columnas que la app usa (incluye las de la migración 20260929 por si
--    esa parte no se corrió).
ALTER TABLE public.bloques_horarios
  ADD COLUMN IF NOT EXISTS instructor_nombre TEXT,
  ADD COLUMN IF NOT EXISTS vacante BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS competencia_nombre TEXT,
  ADD COLUMN IF NOT EXISTS raps_asignados JSONB,
  ADD COLUMN IF NOT EXISTS es_competencia_completa BOOLEAN DEFAULT FALSE;

-- Bloques "vacantes" (programados sin instructor todavía).
ALTER TABLE public.bloques_horarios ALTER COLUMN instructor_id DROP NOT NULL;

-- Textos que pueden pasar de 50 caracteres (varios RAPs, competencia completa).
ALTER TABLE public.bloques_horarios
  ALTER COLUMN rap_codigo TYPE TEXT,
  ALTER COLUMN competencia_codigo TYPE TEXT,
  ALTER COLUMN trimestre TYPE TEXT,
  ALTER COLUMN ambiente TYPE TEXT;

-- 2. Choque de ambiente: el bloque toma el ambiente de la ficha, y las
--    fichas que no tienen ambiente definido quedan todas con el mismo valor
--    genérico ("Ambiente Principal" o vacío). Con la restricción original,
--    dos fichas así no podían tener clase a la misma hora aunque estén en
--    salones distintos. Se reemplaza por una regla que solo aplica a
--    ambientes reales.
ALTER TABLE public.bloques_horarios DROP CONSTRAINT IF EXISTS uq_ambiente_dia_franja;
DROP INDEX IF EXISTS public.uq_ambiente_real_dia_franja;
CREATE UNIQUE INDEX uq_ambiente_real_dia_franja
  ON public.bloques_horarios (ambiente, dia_semana, franja, trimestre)
  WHERE ambiente IS NOT NULL
    AND btrim(ambiente) <> ''
    AND lower(btrim(ambiente)) NOT IN ('ambiente principal', 'por asignar', 'sin ambiente', 'virtual');

-- 3. Permisos (por si acaso; la política ya existía desde el esquema inicial).
ALTER TABLE public.bloques_horarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo bloques_horarios" ON public.bloques_horarios;
CREATE POLICY "Permitir todo bloques_horarios" ON public.bloques_horarios
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bloques_horarios TO anon, authenticated;

-- Recargar el caché de columnas de la API (para que reconozca instructor_nombre ya).
NOTIFY pgrst, 'reload schema';

-- Verificación
SELECT COUNT(*) AS bloques_en_supabase FROM public.bloques_horarios;
