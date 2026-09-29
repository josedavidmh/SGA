-- =====================================================================
-- REPARAR LA PERSISTENCIA DE COMPETENCIAS Y RESULTADOS DE APRENDIZAJE
-- =====================================================================
-- Es seguro correr este script más de una vez (todo es IF EXISTS /
-- IF NOT EXISTS). Incluye también lo de la migración 20260929 que toca a
-- estas dos tablas, por si esa parte nunca se llegó a correr.
--
-- Qué corrige:
--   1. Columnas que usa la app y que la tabla original no tenía.
--   2. Tipos demasiado estrechos: las horas pueden venir con decimales del
--      Excel (INT las rechazaba) y la fase / códigos pueden pasar de 50
--      caracteres (VARCHAR(50) los rechazaba). Un solo valor fuera de rango
--      hacía fallar el lote completo.
--   3. La restricción CHECK de `tipo` rechazaba cualquier valor distinto
--      de 3 fijos. Se elimina (la app ya controla los valores).
--   4. `codigo` de competencia era único a nivel global; ahora es único
--      por programa (una misma competencia transversal puede estar en
--      varios programas).
--   5. PERMISOS — ESTA ES LA CAUSA PRINCIPAL (verificada contra tu proyecto):
--      tu proyecto de Supabase tiene RLS ACTIVADO en `usuarios`,
--      `competencias` y `resultados_aprendizaje`, pero esas tablas nunca
--      tuvieron una política que permita escribir/leer. Resultado:
--        - todo INSERT falla con "new row violates row-level security
--          policy" (código 42501), y
--        - todo SELECT devuelve vacío, aunque haya filas (por eso la tabla
--          usuarios "no muestra" nada desde la app, ni siquiera el admin).
--      Aquí se crea la misma política abierta que ya tienen fichas e
--      instructores (que por eso sí funcionan), para TODAS las tablas.
-- =====================================================================

-- 1. COMPETENCIAS -----------------------------------------------------
ALTER TABLE public.competencias
  ADD COLUMN IF NOT EXISTS programa_codigo TEXT,
  ADD COLUMN IF NOT EXISTS horas_trabajo_directo NUMERIC,
  ADD COLUMN IF NOT EXISTS horas_trabajo_autonomo NUMERIC,
  ADD COLUMN IF NOT EXISTS horas_ejecutadas NUMERIC,
  ADD COLUMN IF NOT EXISTS fase_sugerida TEXT,
  ADD COLUMN IF NOT EXISTS especialidad_tematica_id TEXT,
  ADD COLUMN IF NOT EXISTS especialidad_tematica_nombre TEXT;

ALTER TABLE public.competencias DROP CONSTRAINT IF EXISTS competencias_tipo_check;

ALTER TABLE public.competencias
  ALTER COLUMN codigo TYPE TEXT,
  ALTER COLUMN tipo TYPE TEXT,
  ALTER COLUMN programa_codigo TYPE TEXT,
  ALTER COLUMN fase_sugerida TYPE TEXT,
  ALTER COLUMN especialidad_tematica_id TYPE TEXT,
  ALTER COLUMN especialidad_tematica_nombre TYPE TEXT,
  ALTER COLUMN horas_estimadas TYPE NUMERIC USING horas_estimadas::numeric,
  ALTER COLUMN horas_trabajo_directo TYPE NUMERIC USING horas_trabajo_directo::numeric,
  ALTER COLUMN horas_trabajo_autonomo TYPE NUMERIC USING horas_trabajo_autonomo::numeric,
  ALTER COLUMN horas_ejecutadas TYPE NUMERIC USING horas_ejecutadas::numeric;

-- Código único POR PROGRAMA (no global). Se limpian duplicados antes por
-- si quedó alguno de intentos anteriores.
DELETE FROM public.competencias a
  USING public.competencias b
  WHERE a.ctid < b.ctid
    AND a.codigo = b.codigo
    AND a.programa_codigo IS NOT DISTINCT FROM b.programa_codigo;

ALTER TABLE public.competencias DROP CONSTRAINT IF EXISTS competencias_codigo_key;
ALTER TABLE public.competencias DROP CONSTRAINT IF EXISTS uq_competencias_programa_codigo;
ALTER TABLE public.competencias
  ADD CONSTRAINT uq_competencias_programa_codigo UNIQUE (programa_codigo, codigo);

CREATE INDEX IF NOT EXISTS idx_competencias_programa ON public.competencias(programa_codigo);

-- 2. RESULTADOS DE APRENDIZAJE ------------------------------------------
ALTER TABLE public.resultados_aprendizaje
  ADD COLUMN IF NOT EXISTS programa_codigo TEXT,
  ADD COLUMN IF NOT EXISTS competencia_codigo TEXT,
  ADD COLUMN IF NOT EXISTS competencia_denominacion TEXT,
  ADD COLUMN IF NOT EXISTS duracion_horas NUMERIC,
  ADD COLUMN IF NOT EXISTS horas_trabajo_directo NUMERIC,
  ADD COLUMN IF NOT EXISTS horas_trabajo_autonomo NUMERIC,
  ADD COLUMN IF NOT EXISTS tipo TEXT,
  ADD COLUMN IF NOT EXISTS actividades_aprendizaje JSONB,
  ADD COLUMN IF NOT EXISTS actividades_proyecto JSONB,
  ADD COLUMN IF NOT EXISTS detalles_actividades JSONB;

ALTER TABLE public.resultados_aprendizaje
  ALTER COLUMN codigo_rap TYPE TEXT,
  ALTER COLUMN fase TYPE TEXT,
  ALTER COLUMN fase DROP NOT NULL,
  ALTER COLUMN programa_codigo TYPE TEXT,
  ALTER COLUMN competencia_codigo TYPE TEXT,
  ALTER COLUMN tipo TYPE TEXT,
  ALTER COLUMN duracion_horas TYPE NUMERIC USING duracion_horas::numeric,
  ALTER COLUMN horas_trabajo_directo TYPE NUMERIC USING horas_trabajo_directo::numeric,
  ALTER COLUMN horas_trabajo_autonomo TYPE NUMERIC USING horas_trabajo_autonomo::numeric;

CREATE INDEX IF NOT EXISTS idx_raps_programa ON public.resultados_aprendizaje(programa_codigo);
CREATE INDEX IF NOT EXISTS idx_raps_competencia_codigo ON public.resultados_aprendizaje(competencia_codigo);

-- 3. PERMISOS (RLS + política abierta + GRANT) --------------------------
-- Mismo criterio que el resto del esquema. Se aplica también a las tablas
-- creadas en migraciones posteriores, por si en tu proyecto de Supabase no
-- quedaron expuestas al rol anon por defecto.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'usuarios', 'competencias', 'resultados_aprendizaje', 'juicios_evaluativos',
    'fichas', 'instructores', 'actividades_seguimiento', 'bloques_horarios',
    'aprendices', 'centros_formacion', 'auditoria_ingestas', 'auditoria_sistema',
    'ambientes', 'raps_seguimiento', 'programas_formacion', 'especialidades_tematicas',
    'trimestres_calendario', 'archivo_seguimiento_registros'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Permitir todo ' || t, t);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)',
        'Permitir todo ' || t, t
      );
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', t);
    END IF;
  END LOOP;
END$$;

-- 4. Cuenta de acceso del instructor José David Montesino (ya existe en
-- `instructores`, pero su usuario nunca pudo entrar a `usuarios` por el
-- problema de permisos de arriba). Clave por defecto: Sistema2026*
-- (si al crearlo le pusiste otra clave, la app la corrige sola al abrirse
-- en el navegador donde lo creaste).
CREATE EXTENSION IF NOT EXISTS pgcrypto;
ALTER TABLE public.usuarios ALTER COLUMN documento DROP NOT NULL;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS clave_hash TEXT;
INSERT INTO public.usuarios (correo, nombre_completo, rol, cargo, clave_hash)
SELECT
  lower(i.email),
  'Ing. ' || i.nombres || ' ' || i.apellidos,
  'INSTRUCTOR_LIDER',
  'Instructor Líder - ' || i.especialidad,
  crypt('Sistema2026*', gen_salt('bf', 10))
FROM public.instructores i
WHERE lower(i.email) = 'jdmontesino@sena.edu.co'
ON CONFLICT (correo) DO NOTHING;

-- Verificación rápida:
SELECT 'usuarios' AS tabla, COUNT(*) AS filas FROM public.usuarios
UNION ALL
SELECT 'competencias', COUNT(*) FROM public.competencias
UNION ALL
SELECT 'resultados_aprendizaje', COUNT(*) FROM public.resultados_aprendizaje;
