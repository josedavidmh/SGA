-- Jornada en la que una ficha usa su ambiente base (Mañana / Tarde / Noche).
-- Un mismo ambiente solo puede tener una ficha activa por jornada (se valida en la app).
ALTER TABLE public.fichas ADD COLUMN IF NOT EXISTS jornada_ambiente TEXT;
NOTIFY pgrst, 'reload schema';
