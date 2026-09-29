-- =====================================================================
-- DATOS SEMILLA (SEED DATA) REALES - SENA REGIONAL CESAR
-- Centro Biotecnológico del Caribe (CBC)
-- =====================================================================

-- 1. CENTRO DE FORMACIÓN
INSERT INTO public.centros_formacion (id, regional, centro, codigo_centro, sede)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'Regional Cesar',
    'Centro Biotecnológico del Caribe',
    '9513',
    'Sede Principal - Kilómetro 7 Vía a la Paz, Valledupar'
) ON CONFLICT (id) DO NOTHING;

-- 2. INSTRUCTORES DE PLANTA
INSERT INTO public.instructores (id, documento, nombres, apellidos, email, telefono, perfil_tecnico, especialidad, color_avatar, max_horas_semanales, estado)
VALUES
(
    'a0000000-0000-0000-0000-000000000001',
    '77189201',
    'Carlos Alberto',
    'Mendoza Romero',
    'carlos.mendoza@misena.edu.co',
    '3157891234',
    'Ingeniero de Sistemas, Especialista en Seguridad Informática',
    'Desarrollo de Software & Cloud',
    '#0D631B',
    32,
    'ACTIVO'
),
(
    'a0000000-0000-0000-0000-000000000002',
    '49782103',
    'Laura Patricia',
    'Gómez Silva',
    'laura.gomez@misena.edu.co',
    '3168902345',
    'Magíster en Gestión de Proyectos de Software, PMP',
    'Metodologías Ágiles & Calidad',
    '#6F43C0',
    32,
    'ACTIVO'
),
(
    'a0000000-0000-0000-0000-000000000003',
    '1065892114',
    'Jorge Eliécer',
    'Vega Castro',
    'jorge.vega@misena.edu.co',
    '3189013456',
    'Ingeniero Electrónico, Administrador Certificado AWS & Azure',
    'Arquitectura Cloud & DevOps',
    '#005A8C',
    32,
    'ACTIVO'
),
(
    'a0000000-0000-0000-0000-000000000004',
    '1065993821',
    'María Alejandra',
    'Pérez Nieto',
    'maria.perez@misena.edu.co',
    '3201234567',
    'Licenciada en Filología e Idiomas, Certificación C1 Cambridge',
    'Bilingüismo & Technical English',
    '#C67C00',
    20,
    'ACTIVO'
) ON CONFLICT (id) DO NOTHING;

-- 3. USUARIOS DEL SISTEMA (ROLES RBAC SEGÚN LA ESPECIFICACIÓN)
INSERT INTO public.usuarios (id, documento, correo, nombre_completo, rol, cargo, avatar_url)
VALUES
(
    'e0000000-0000-0000-0000-000000000001',
    '77100200',
    'coordinacion.cbc@sena.edu.co',
    'Ing. Claudia Patricia Restrepo',
    'COORDINADOR',
    'Coordinadora Académica de Formación Titulada',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
),
(
    'e0000000-0000-0000-0000-000000000002',
    '1065778899',
    'auxiliar.operativo@sena.edu.co',
    'Andrés Felipe Cañas',
    'AUXILIAR',
    'Auxiliar Operativo de Gestión Académica',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
),
(
    'e0000000-0000-0000-0000-000000000003',
    '77189201',
    'carlos.mendoza@misena.edu.co',
    'Ing. Carlos Alberto Mendoza',
    'INSTRUCTOR_LIDER',
    'Instructor Líder de Ficha 3317145',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
),
(
    'e0000000-0000-0000-0000-000000000004',
    '12345678',
    'admin.sistema@sena.edu.co',
    'Administrador SENA TIC',
    'ADMINISTRADOR',
    'Administrador del Sistema y Mesa de Soporte',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
) ON CONFLICT (id) DO NOTHING;

-- 4. FICHAS DE FORMACIÓN
INSERT INTO public.fichas (
    id, centro_id, numero_ficha, programa_codigo, programa_nombre, version, nivel_formacion, 
    instructor_lider_id, modalidad, ambiente_principal, periodo_lectivo, fecha_inicio, fecha_fin, 
    matricula_inicial, aprendices_activos, aprendices_culminados, aprendices_cancelados, 
    aprendices_aplazados, aprendices_retiro_voluntario, estado, horas_directas_totales, 
    horas_independientes_totales, horas_ejecutadas
) VALUES
(
    'f0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    '3317145',
    '228118',
    'Tecnología en Análisis y Desarrollo de Software',
    '1',
    'Tecnólogo',
    'a0000000-0000-0000-0000-000000000001', -- Carlos Mendoza
    'Presencial Diurna',
    'Ambiente 204 - TIC / Software CBC',
    '2026-III (Julio - Septiembre)',
    '2026-07-01',
    '2027-12-15',
    35,
    30,
    0,
    3,
    1,
    1,
    'ACTIVA',
    3120,
    860,
    1480
),
(
    'f0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000001',
    '3115086',
    '228101',
    'Tecnología en Gestión de Redes de Datos',
    '2',
    'Tecnólogo',
    'a0000000-0000-0000-0000-000000000003', -- Jorge Vega
    'Presencial Nocturna',
    'Laboratorio Cisco - Bloque C',
    '2026-III',
    '2025-10-01',
    '2026-09-30',
    30,
    27,
    26,
    2,
    1,
    1,
    'POR_CERRAR',
    3120,
    860,
    2980
) ON CONFLICT (id) DO NOTHING;

-- 5. COMPETENCIAS Y RESULTADOS DE APRENDIZAJE (RAP)
INSERT INTO public.competencias (id, codigo, denominacion, horas_estimadas, tipo)
VALUES
(
    'c1000000-0000-0000-0000-000000000001',
    '220501096',
    'Desarrollar la estructura de datos y la lógica del software según requerimientos',
    180,
    'Técnica'
),
(
    'c1000000-0000-0000-0000-000000000002',
    '220501092',
    'Especificar los requisitos del software según estándares y necesidades del cliente',
    160,
    'Técnica'
),
(
    'c1000000-0000-0000-0000-000000000003',
    '240202501',
    'Interactuar en lengua inglesa de forma oral y escrita en contextos laborales',
    120,
    'Bilingüismo'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.resultados_aprendizaje (id, competencia_id, codigo_rap, denominacion, fase)
VALUES
(
    'd1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000001',
    'RAP 03',
    'Construir la base de datos y los servicios web API RESTful con autenticación segura',
    'Fase 3: Ejecución'
),
(
    'd1000000-0000-0000-0000-000000000002',
    'c1000000-0000-0000-0000-000000000002',
    'RAP 01',
    'Elaborar los diagramas de casos de uso y especificación formal de requisitos',
    'Fase 1: Análisis'
),
(
    'd1000000-0000-0000-0000-000000000003',
    'c1000000-0000-0000-0000-000000000003',
    'RAP 05',
    'Comprender vocabulario técnico y documentación de software en inglés',
    'Fase 2: Planeación'
) ON CONFLICT (id) DO NOTHING;

-- 6. SEGUIMIENTO CURRICULAR (ACTIVIDADES)
INSERT INTO public.actividades_seguimiento (
    id, ficha_id, rap_id, fase, competencia_codigo, competencia_denominacion, rap_codigo, 
    rap_denominacion, actividad_aprendizaje, evidencia_codigo, horas_directas, horas_independientes, 
    instructor_id, estado, observaciones
) VALUES
(
    'ac000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000001', -- Ficha 3317145
    'd1000000-0000-0000-0000-000000000001',
    'Fase 3: Ejecución',
    '220501096',
    'Desarrollar la estructura de datos y lógica del software',
    'RAP 03',
    'Construir la base de datos y API RESTful con JWT',
    'Construcción de arquitectura backend con Node.js, Express y Supabase PostgreSQL',
    'GA4-220501096-AA2-EV01',
    48,
    12,
    'a0000000-0000-0000-0000-000000000001', -- Carlos Mendoza
    'EN EJECUCION',
    'Aprendices en desarrollo de endpoints autenticados con Row Level Security'
),
(
    'ac000000-0000-0000-0000-000000000002',
    'f0000000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000002',
    'Fase 1: Análisis',
    '220501092',
    'Especificar los requisitos del software',
    'RAP 01',
    'Elaborar casos de uso y diagramas UML',
    'Documento de Especificación de Requisitos de Software bajo estándar IEEE 830',
    'GA1-220501092-AA1-EV01',
    40,
    10,
    'a0000000-0000-0000-0000-000000000002', -- Laura Gómez
    'CALIFICADO',
    'Aprobado 100% en SofiaPlus'
),
(
    'ac000000-0000-0000-0000-000000000003',
    'f0000000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000003',
    'Fase 2: Planeación',
    '240202501',
    'Interactuar en lengua inglesa técnica',
    'RAP 05',
    'Vocabulario técnico y documentación en inglés',
    'Cuestionario técnico y lectura crítica de especificaciones OpenAPI / Swagger',
    'GA3-240202501-AA1-EV02',
    30,
    10,
    'a0000000-0000-0000-0000-000000000004', -- María Pérez
    'PENDIENTE',
    'Programado para semana 10'
) ON CONFLICT (id) DO NOTHING;

-- 7. PROGRAMACIÓN DE HORARIOS (CON COMPROBACIÓN DE REGLAS ANTI-CRUCES)
INSERT INTO public.bloques_horarios (
    id, ficha_id, instructor_id, dia_semana, franja, ambiente, rap_codigo, rap_titulo, 
    competencia_codigo, duracion_horas, trimestre, fecha_corte_inicio, fecha_corte_fin
) VALUES
(
    'b1000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000001', -- Ficha 3317145
    'a0000000-0000-0000-0000-000000000001', -- Carlos Mendoza
    'Lunes',
    '06:00 - 09:00',
    'Ambiente 204 - TIC / Software CBC',
    'RAP 03',
    'Construcción de API RESTful con JWT',
    '220501096',
    3,
    '2026-III',
    '2026-07-01',
    '2026-09-30'
),
(
    'b1000000-0000-0000-0000-000000000002',
    'f0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002', -- Laura Gómez
    'Martes',
    '09:00 - 12:00',
    'Ambiente 204 - TIC / Software CBC',
    'RAP 01',
    'Requisitos y Diagramas UML',
    '220501092',
    3,
    '2026-III',
    '2026-07-01',
    '2026-09-30'
),
(
    'b1000000-0000-0000-0000-000000000003',
    'f0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000004', -- María Pérez
    'Jueves',
    '06:00 - 09:00',
    'Ambiente 204 - TIC / Software CBC',
    'RAP 05',
    'Technical English for Developers',
    '240202501',
    3,
    '2026-III',
    '2026-07-01',
    '2026-09-30'
),
-- Bloque en Ficha 3115086 para verificar colisión:
(
    'b1000000-0000-0000-0000-000000000004',
    'f0000000-0000-0000-0000-000000000002', -- Ficha 3115086
    'a0000000-0000-0000-0000-000000000001', -- Carlos Mendoza en Miércoles tarde
    'Miércoles',
    '13:00 - 16:00',
    'Laboratorio Cisco - Bloque C',
    'RAP 04',
    'Arquitectura de Servidores y Redes',
    '220501096',
    3,
    '2026-III',
    '2026-07-01',
    '2026-09-30'
) ON CONFLICT (id) DO NOTHING;

-- 8. APRENDICES MATRICULADOS
INSERT INTO public.aprendices (id, ficha_id, documento, tipo_documento, nombres_apellidos, correo, estado_matricula)
VALUES
(
    'b2000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000001',
    '1065892001',
    'CC',
    'Juan David Montero Rangel',
    'jd.montero@misena.edu.co',
    'EN FORMACION'
),
(
    'b2000000-0000-0000-0000-000000000002',
    'f0000000-0000-0000-0000-000000000001',
    '1065892002',
    'CC',
    'Camila Andrea Quintero Soto',
    'ca.quintero@misena.edu.co',
    'EN FORMACION'
) ON CONFLICT (id) DO NOTHING;

-- 9. JUICIOS EVALUATIVOS
INSERT INTO public.juicios_evaluativos (id, aprendiz_id, rap_codigo, estado_juicio, fecha_evaluacion, instructor_evaluador_id)
VALUES
(
    'b3000000-0000-0000-0000-000000000001',
    'b2000000-0000-0000-0000-000000000001',
    'RAP 01',
    'APROBADO',
    '2026-08-15',
    'a0000000-0000-0000-0000-000000000002'
),
(
    'b3000000-0000-0000-0000-000000000002',
    'b2000000-0000-0000-0000-000000000001',
    'RAP 03',
    'POR EVALUAR',
    NULL,
    'a0000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;
