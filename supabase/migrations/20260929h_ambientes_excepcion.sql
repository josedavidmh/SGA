-- Excepciones de ambiente en el horario.
-- Una ficha tiene su ambiente base (fichas.ambiente_principal), pero algún
-- día de la semana puede ir a un ambiente especial:
--   * por día  → fichas.ambientes_excepcion  {"<trimestre>|<día>": "<ambiente>"}
--   * por franja → bloques_horarios.ambiente_especial
-- bloques_horarios.ambiente sigue guardando el ambiente REAL de cada bloque,
-- así el índice uq_ambiente_real_dia_franja impide que dos fichas ocupen el
-- mismo ambiente el mismo día, franja y trimestre.

ALTER TABLE public.fichas
  ADD COLUMN IF NOT EXISTS ambientes_excepcion JSONB;

ALTER TABLE public.bloques_horarios
  ADD COLUMN IF NOT EXISTS ambiente_especial TEXT;

NOTIFY pgrst, 'reload schema';
