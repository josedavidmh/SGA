-- =====================================================================
-- PERSISTENCIA EN SUPABASE DE COMPETENCIAS, RAPs (CATÁLOGO), HORARIOS,
-- AMBIENTES DE APRENDIZAJE Y USUARIOS (CUENTAS DE ACCESO)
-- =====================================================================
-- Contexto: hasta ahora Competencias, el catálogo de RAPs (Resultados de
-- Aprendizaje), los bloques de Horario y los Ambientes de Aprendizaje solo
-- vivían en localStorage del navegador. Eso significa que son datos
-- ligados a UN origen (protocolo+host+puerto) específico: si la app se ve
-- desde una URL distinta (otro puerto, otra IP de red, otro navegador, o
-- después de limpiar datos del sitio), esos datos "desaparecen" — no es
-- que se borren, es que nunca estuvieron en un lugar compartido. Fichas,
-- Instructores, Actividades de Seguimiento y Seguimiento por RAP ya tenían
-- este problema resuelto (ver migraciones anteriores); esta migración
-- cierra la brecha para el resto de módulos.
--
-- Esta migración:
--   1. Amplía `competencias` y `resultados_aprendizaje` con las columnas
--      que ya usa el frontend pero que la tabla original (init schema)
--      no tenía — todas nullable/con default para no romper filas
--      existentes.
--   2. Amplía el `CHECK` de `competencias.tipo` para incluir 'Clave' y
--      'Básica', que ya existen en el tipo TypeScript `TipoCompetencia`
--      pero no estaban permitidos en la base de datos.
--   3. Amplía `bloques_horarios`: permite `instructor_id` NULL (un bloque
--      puede quedar "vacante" — programado pero sin instructor asignado
--      todavía — algo que la app ya soporta en memoria pero que la
--      columna NOT NULL original no dejaba guardar), y agrega las
--      columnas para RAPs múltiples por bloque, competencia completa y
--      el nombre de la competencia.
--   4. Crea la tabla `ambientes` (Ambientes de Aprendizaje): el código ya
--      la consulta en `supabaseService.ts` (`fetchAmbientesFromSupabase`,
--      etc.) desde antes, pero la tabla nunca se había creado en una
--      migración — hasta ahora fallaba en silencio y se quedaba en
--      localStorage puro.
-- =====================================================================

-- 1. COMPETENCIAS: columnas que ya usa el frontend
ALTER TABLE public.competencias
  ADD COLUMN IF NOT EXISTS programa_codigo VARCHAR(30),
  ADD COLUMN IF NOT EXISTS horas_trabajo_directo INT,
  ADD COLUMN IF NOT EXISTS horas_trabajo_autonomo INT,
  ADD COLUMN IF NOT EXISTS horas_ejecutadas INT,
  ADD COLUMN IF NOT EXISTS fase_sugerida VARCHAR(50),
  ADD COLUMN IF NOT EXISTS especialidad_tematica_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS especialidad_tematica_nombre VARCHAR(200);

CREATE INDEX IF NOT EXISTS idx_competencias_programa ON public.competencias(programa_codigo);

-- Ampliar el CHECK de tipo para incluir 'Clave' y 'Básica' (ya existían en
-- el tipo TypeScript TipoCompetencia, pero no en la base de datos).
ALTER TABLE public.competencias DROP CONSTRAINT IF EXISTS competencias_tipo_check;
ALTER TABLE public.competencias
  ADD CONSTRAINT competencias_tipo_check
  CHECK (tipo IN ('Técnica', 'Transversal', 'Bilingüismo', 'Clave', 'Básica'));

-- 2. RESULTADOS DE APRENDIZAJE (catálogo de RAPs): columnas que ya usa el
-- frontend. `competencia_codigo`/`competencia_denominacion` quedan
-- denormalizadas (además del FK `competencia_id` que ya existía) porque
-- así es como el resto del esquema ya maneja este mismo dato en
-- actividades_seguimiento y raps_seguimiento.
ALTER TABLE public.resultados_aprendizaje
  ADD COLUMN IF NOT EXISTS programa_codigo VARCHAR(30),
  ADD COLUMN IF NOT EXISTS competencia_codigo VARCHAR(50),
  ADD COLUMN IF NOT EXISTS competencia_denominacion TEXT,
  ADD COLUMN IF NOT EXISTS duracion_horas INT,
  ADD COLUMN IF NOT EXISTS horas_trabajo_directo INT,
  ADD COLUMN IF NOT EXISTS horas_trabajo_autonomo INT,
  ADD COLUMN IF NOT EXISTS tipo VARCHAR(30),
  ADD COLUMN IF NOT EXISTS actividades_aprendizaje JSONB,
  ADD COLUMN IF NOT EXISTS actividades_proyecto JSONB,
  ADD COLUMN IF NOT EXISTS detalles_actividades JSONB;

CREATE INDEX IF NOT EXISTS idx_raps_programa ON public.resultados_aprendizaje(programa_codigo);
CREATE INDEX IF NOT EXISTS idx_raps_competencia_codigo ON public.resultados_aprendizaje(competencia_codigo);

-- 3. BLOQUES DE HORARIO: permitir bloques "vacantes" (sin instructor) y
-- guardar RAPs múltiples / competencia completa por bloque.
ALTER TABLE public.bloques_horarios
  ALTER COLUMN instructor_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS vacante BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS competencia_nombre VARCHAR(250),
  ADD COLUMN IF NOT EXISTS raps_asignados JSONB,
  ADD COLUMN IF NOT EXISTS es_competencia_completa BOOLEAN DEFAULT FALSE;

-- 4. AMBIENTES DE APRENDIZAJE (la tabla que ya se consulta desde el código
-- pero que nunca se había creado formalmente en una migración).
CREATE TABLE IF NOT EXISTS public.ambientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(150) NOT NULL,
    codigo VARCHAR(50) UNIQUE,
    tipo VARCHAR(30) DEFAULT 'Ambiente TIC' CHECK (tipo IN ('Ambiente TIC', 'Laboratorio', 'Taller', 'Auditorio', 'Virtual')),
    sede VARCHAR(150) DEFAULT 'Sede Principal',
    capacidad_aprendices INT DEFAULT 30 CHECK (capacidad_aprendices > 0),
    equipamiento TEXT,
    estado VARCHAR(20) DEFAULT 'DISPONIBLE' CHECK (estado IN ('DISPONIBLE', 'EN_MANTENIMIENTO', 'OCUPADO')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ambientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo ambientes" ON public.ambientes;
CREATE POLICY "Permitir todo ambientes" ON public.ambientes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- NOTA DE SEGURIDAD (igual que en la migración de raps_seguimiento): estas
-- políticas son abiertas (cualquiera con la anon key puede leer/escribir/
-- borrar todo) para no romper la app tal como está montada hoy, sin
-- JWT/roles reales en Supabase Auth. Vale la pena revisar esto antes de
-- usar la base de datos con datos reales de aprendices en producción.

-- 5. USUARIOS (cuentas de acceso): la columna `documento` se exigía única
-- y obligatoria en el esquema original, pero el formulario de creación de
-- usuarios de esta app nunca pide ese dato (solo correo, nombre, rol y
-- cargo) — con NOT NULL, cada intento de guardar un usuario fallaba en
-- silencio contra Supabase y la cuenta se quedaba SOLO en localStorage de
-- ese navegador. Esto es, muy probablemente, la causa real de "no me está
-- tomando el usuario con el correo que le registré" reportado antes en
-- esta conversación: el usuario se creó bien, pero nunca llegó a
-- Supabase, así que solo existía en el navegador donde se creó.
ALTER TABLE public.usuarios ALTER COLUMN documento DROP NOT NULL;

-- La clave/contraseña NUNCA se guarda en esta tabla (no tiene columna para
-- eso) — es un dato sensible que esta app no maneja del lado del
-- servidor; se sigue guardando solo en localStorage, como hasta ahora.
