-- Migración: historial de instructores por RAP (para soportar reemplazos
-- de instructor sin perder el registro de quién ya cubrió cada RAP).
-- Ejecutar en Supabase Dashboard -> SQL Editor -> New query -> Run.

ALTER TABLE public.raps_seguimiento
  ADD COLUMN IF NOT EXISTS historial_instructores jsonb NOT NULL DEFAULT '[]'::jsonb;
