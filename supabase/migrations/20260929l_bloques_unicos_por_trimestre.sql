-- =====================================================================
-- CRUCES DE HORARIO: SOLO DENTRO DEL MISMO TRIMESTRE
-- =====================================================================
-- Seguro de correr varias veces.
--
-- Cada trimestre tiene su propia semana lectiva: un bloque de "Martes
-- 09:00-12:00" en 2026-II y otro igual en 2026-III de la MISMA ficha (o del
-- mismo instructor / ambiente) no chocan. Si la base tiene restricciones
-- únicas antiguas SIN el trimestre, Supabase rechaza el segundo bloque con
--   "La ficha ya tiene otro bloque ese mismo día y franja en ese trimestre".
-- Este script quita esas restricciones y deja las tres reglas, todas
-- incluyendo el trimestre.
-- =====================================================================

DO $$
DECLARE r RECORD;
BEGIN
  -- Restricciones UNIQUE de la tabla (la llave primaria no se toca).
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.bloques_horarios'::regclass AND contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE public.bloques_horarios DROP CONSTRAINT %I', r.conname);
  END LOOP;

  -- Índices únicos sueltos (que no respaldan la llave primaria).
  FOR r IN
    SELECT i.indexname FROM pg_indexes i
    WHERE i.schemaname = 'public' AND i.tablename = 'bloques_horarios'
      AND i.indexdef ILIKE 'CREATE UNIQUE INDEX%'
      AND i.indexname NOT IN (
        SELECT conname FROM pg_constraint WHERE conrelid = 'public.bloques_horarios'::regclass
      )
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS public.%I', r.indexname);
  END LOOP;
END $$;

-- 1. Una ficha no puede tener dos clases a la misma hora EN EL MISMO trimestre.
ALTER TABLE public.bloques_horarios
  ADD CONSTRAINT uq_ficha_dia_franja UNIQUE (ficha_id, dia_semana, franja, trimestre);

-- 2. Un instructor no puede estar en dos clases a la misma hora EN EL MISMO trimestre.
CREATE UNIQUE INDEX uq_instructor_dia_franja
  ON public.bloques_horarios (instructor_id, dia_semana, franja, trimestre)
  WHERE instructor_id IS NOT NULL;

-- 3. Un ambiente real no puede tener dos clases a la misma hora EN EL MISMO trimestre.
CREATE UNIQUE INDEX uq_ambiente_real_dia_franja
  ON public.bloques_horarios (ambiente, dia_semana, franja, trimestre)
  WHERE ambiente IS NOT NULL
    AND btrim(ambiente) <> ''
    AND lower(btrim(ambiente)) NOT IN ('ambiente principal', 'por asignar', 'sin ambiente', 'virtual');

NOTIFY pgrst, 'reload schema';

-- Verificación: debe listar las tres reglas, todas con "trimestre".
SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'bloques_horarios' AND indexdef ILIKE '%UNIQUE%';
