-- Total de aprendices (activos + inactivos) del último cargue de Juicios Evaluativos.
-- Es la base de los reportes de retención y deserción.
ALTER TABLE public.fichas ADD COLUMN IF NOT EXISTS total_aprendices_actual INTEGER;
NOTIFY pgrst, 'reload schema';
