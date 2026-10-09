-- =====================================================================
-- CAMBIO DE INSTRUCTOR CON FECHA (reemplazos a mitad de trimestre)
-- =====================================================================
-- Seguro de correr varias veces.
--
-- Cuando un instructor termina su proceso en una fecha y otro lo reemplaza
-- en el mismo espacio del horario (mismo día, franja y trimestre), el bloque
-- sigue siendo UNA sola fila; estas dos columnas guardan desde cuándo rige el
-- instructor actual y quiénes lo cubrieron antes (con sus fechas), para que
-- el Reporte de Eventos / Horas y el Formato de Asociación separen a cada
-- instructor con sus propias fechas y horas.
-- =====================================================================

ALTER TABLE public.bloques_horarios
  ADD COLUMN IF NOT EXISTS instructor_desde DATE,
  ADD COLUMN IF NOT EXISTS tramos_anteriores JSONB;

COMMENT ON COLUMN public.bloques_horarios.instructor_desde IS
  'Fecha desde la que rige el instructor (o la vacancia) actual del bloque. NULL = desde el inicio del trimestre.';
COMMENT ON COLUMN public.bloques_horarios.tramos_anteriores IS
  'Instructores (o períodos vacantes) anteriores del bloque: [{instructorId, instructorNombre, desde, hasta}].';

NOTIFY pgrst, 'reload schema';

-- Verificación
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'bloques_horarios'
  AND column_name IN ('instructor_desde', 'tramos_anteriores');
