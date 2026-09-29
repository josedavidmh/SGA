-- =====================================================================
-- HORAS POR COMPETENCIA (Reporte de Instructores por Ficha) E
-- INDICADORES DE JUICIOS EVALUATIVOS EN LA FICHA
-- =====================================================================
-- Seguro de correr varias veces.
--
-- 1. Horas: el "Reporte de Instructores por Ficha" de SofiaPlus solo vivía
--    en la memoria del navegador (se perdía al recargar) y además nunca se
--    emparejaba con las competencias de Seguimiento. Esta tabla guarda las
--    horas ya emparejadas, una fila por instructor + competencia + ficha.
-- 2. Ficha: retención, deserción, condicionados, trasladados y avance
--    curricular (lo calcula Juicios Evaluativos) no tenían columna, así que
--    al abrir la app se reiniciaban a 100% / 0%.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.horas_ejecutadas_ficha (
    id TEXT PRIMARY KEY,
    ficha_numero TEXT NOT NULL,
    competencia_codigo TEXT NOT NULL,
    competencia_denominacion TEXT,
    instructor_nombre TEXT,
    horas_programadas NUMERIC,
    horas_ejecutadas NUMERIC NOT NULL DEFAULT 0,
    fecha_inicio TEXT,
    fecha_fin TEXT,
    periodo TEXT,
    fecha_registro TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_horas_ejecutadas_ficha ON public.horas_ejecutadas_ficha(ficha_numero);

ALTER TABLE public.horas_ejecutadas_ficha ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo horas_ejecutadas_ficha" ON public.horas_ejecutadas_ficha;
CREATE POLICY "Permitir todo horas_ejecutadas_ficha" ON public.horas_ejecutadas_ficha
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.horas_ejecutadas_ficha TO anon, authenticated;

ALTER TABLE public.fichas
  ADD COLUMN IF NOT EXISTS tasa_retencion NUMERIC,
  ADD COLUMN IF NOT EXISTS tasa_desercion NUMERIC,
  ADD COLUMN IF NOT EXISTS aprendices_condicionados INT,
  ADD COLUMN IF NOT EXISTS aprendices_trasladados INT,
  ADD COLUMN IF NOT EXISTS progreso_curricular NUMERIC;
ALTER TABLE public.fichas ALTER COLUMN horas_ejecutadas TYPE NUMERIC USING horas_ejecutadas::numeric;

NOTIFY pgrst, 'reload schema';

SELECT 'horas_ejecutadas_ficha' AS tabla, COUNT(*) AS filas FROM public.horas_ejecutadas_ficha;
