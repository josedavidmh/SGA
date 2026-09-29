-- =====================================================================
-- COMPLETAR LA MIGRACIÓN A SUPABASE: PROGRAMAS, ESPECIALIDADES TEMÁTICAS,
-- TRIMESTRES DE CALENDARIO, ARCHIVO DE SEGUIMIENTO, AUDITORÍA DE INGESTAS
-- Y HASH DE CONTRASEÑAS DE USUARIOS
-- =====================================================================
-- Contexto: tras la migración anterior (20260929_persistencia_...) seguían
-- viviendo SOLO en localStorage del navegador: el catálogo de Programas de
-- Formación (edición manual de metadatos como descripción/estado — lo que
-- se sincronizaba antes solo eran los campos denormalizados en `fichas`),
-- las Especialidades Temáticas, el Calendario de Trimestres, el detalle
-- granular del Archivo de Seguimiento (Fase-Actividad-Competencia-RAP-Hora),
-- la cola de Auditoría de Ingestas de Excel (la tabla ya existía desde el
-- esquema inicial pero nunca se usaba), y el hash de las contraseñas de
-- usuario (la clave en sí NUNCA se sube en texto plano; ver nota de
-- seguridad al final).
--
-- Nota de diseño: las tablas nuevas de esta migración usan `id TEXT PRIMARY
-- KEY` (no UUID) porque el frontend genera ids con prefijos legibles
-- (`esp_...`, `seg_...`, `prog_...`, `trim_...`) que NO son UUIDs válidos.
-- Ya se encontró este mismo problema dos veces antes en esta app (en
-- bloques_horarios y en usuarios) — usar TEXT aquí evita repetirlo por
-- tercera vez.
-- =====================================================================

-- 1. PROGRAMAS DE FORMACIÓN (catálogo, con sus metadatos propios — hasta
-- ahora solo se sincronizaban campos sueltos denormalizados dentro de
-- `fichas`, nunca el catálogo de programas en sí mismo).
CREATE TABLE IF NOT EXISTS public.programas_formacion (
    id TEXT PRIMARY KEY,
    codigo VARCHAR(30) UNIQUE NOT NULL,
    nombre VARCHAR(250) NOT NULL,
    version VARCHAR(20),
    nivel_formacion VARCHAR(50),
    linea_tecnologica VARCHAR(200),
    red_conocimiento VARCHAR(200),
    duracion_lectiva_horas INT,
    duracion_productiva_horas INT,
    duracion_total_horas INT,
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.programas_formacion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo programas_formacion" ON public.programas_formacion;
CREATE POLICY "Permitir todo programas_formacion" ON public.programas_formacion FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 2. ESPECIALIDADES TEMÁTICAS (parametrización del módulo de Planeación).
CREATE TABLE IF NOT EXISTS public.especialidades_tematicas (
    id TEXT PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    area VARCHAR(30) NOT NULL,
    color_tag VARCHAR(150),
    descripcion TEXT,
    competencias_asociadas_codigos JSONB,
    origen VARCHAR(30) DEFAULT 'MANUAL',
    estado VARCHAR(20) DEFAULT 'ACTIVA',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.especialidades_tematicas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo especialidades_tematicas" ON public.especialidades_tematicas;
CREATE POLICY "Permitir todo especialidades_tematicas" ON public.especialidades_tematicas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 3. CALENDARIO DE TRIMESTRES (fechas de corte institucionales usadas por
-- el Formato de Eventos).
CREATE TABLE IF NOT EXISTS public.trimestres_calendario (
    id TEXT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.trimestres_calendario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo trimestres_calendario" ON public.trimestres_calendario;
CREATE POLICY "Permitir todo trimestres_calendario" ON public.trimestres_calendario FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4. REGISTROS GRANULARES DEL ARCHIVO DE SEGUIMIENTO (Fase - Actividad de
-- Proyecto - Competencia - RAP - Actividad de Aprendizaje - Horas). Puede
-- llegar a tener volumen considerable por programa (se recarga completo por
-- `programa_codigo` cada vez que se vuelve a subir el archivo).
CREATE TABLE IF NOT EXISTS public.archivo_seguimiento_registros (
    id TEXT PRIMARY KEY,
    programa_codigo VARCHAR(30) NOT NULL,
    fase VARCHAR(50),
    actividad_proyecto TEXT,
    competencia_codigo VARCHAR(50),
    competencia_denominacion TEXT,
    rap_codigo VARCHAR(50),
    rap_denominacion TEXT,
    actividad_aprendizaje TEXT,
    horas_trabajo_directo NUMERIC,
    horas_trabajo_independiente NUMERIC,
    horas_totales NUMERIC,
    fecha_registro TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_archivo_seguimiento_programa ON public.archivo_seguimiento_registros(programa_codigo);

ALTER TABLE public.archivo_seguimiento_registros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo archivo_seguimiento_registros" ON public.archivo_seguimiento_registros;
CREATE POLICY "Permitir todo archivo_seguimiento_registros" ON public.archivo_seguimiento_registros FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 5. AUDITORÍA DE INGESTAS: la tabla `auditoria_ingestas` ya existía desde
-- el esquema inicial (20260917) pero jamás se usaba desde el código — cada
-- cargue de Excel solo quedaba registrado en localStorage. No requiere
-- cambios de estructura, solo empieza a usarse desde aquí en adelante.
-- (Sin ALTER: se deja constancia en el comentario para que quede claro por
-- qué esta sección no crea ni modifica nada.)

-- 6. HASH DE CONTRASEÑAS DE USUARIO.
-- La clave en texto plano JAMÁS se sube a Supabase. Lo que se agrega es una
-- columna para guardar su HASH (bcrypt, de una sola vía — no se puede
-- revertir a la clave original ni siquiera con acceso total a la base de
-- datos), para que el login funcione también desde un navegador/equipo
-- distinto al que creó o cambió la clave por última vez.
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS clave_hash TEXT;

-- NOTA DE SEGURIDAD (léase junto con la respuesta en el chat): esta app es
-- una SPA sin servidor propio — el navegador habla directo con Supabase
-- usando la anon key. Guardar un hash bcrypt aquí es una mejora real frente
-- a no guardar nada, pero NO equivale a un sistema de autenticación de
-- verdad del lado del servidor (como Supabase Auth): cualquiera con la anon
-- key puede leer la columna clave_hash (las políticas de este esquema son
-- abiertas, ver notas en migraciones anteriores) y montar un ataque de
-- fuerza bruta/diccionario offline contra los hashes. Para llevar esto al
-- siguiente nivel de seguridad real, el paso recomendado es migrar el login
-- a Supabase Auth (con RLS por rol) en vez de la tabla `usuarios` actual.
