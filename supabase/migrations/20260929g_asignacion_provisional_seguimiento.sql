-- Asignaciones "en firme" vs. provisionales en el Seguimiento de RAPs.
-- Cuando se asigna un instructor desde Horarios, durante las primeras 72 h
-- la asignación es provisional: si se quita del horario en ese plazo (prueba
-- o corrección), el RAP vuelve exactamente como estaba, sin dejar rastro.
-- Pasado el plazo queda en firme y quitarlo sí se registra en el historial
-- (reemplazo / vacante / fin de horario).

ALTER TABLE public.raps_seguimiento
  ADD COLUMN IF NOT EXISTS asignacion_provisional JSONB;

NOTIFY pgrst, 'reload schema';
