-- =====================================================================
-- INSTRUCTORES: CORREO Y DOCUMENTO OPCIONALES / SIN CHOQUES
-- =====================================================================
-- Seguro de correr varias veces.
-- Los instructores detectados desde Juicios (p. ej. Yeidis) no traen
-- documento y su correo se genera solo; si el correo se repetía o el
-- documento era obligatorio, el INSERT fallaba y el instructor quedaba
-- únicamente en el navegador del administrador.
-- =====================================================================
ALTER TABLE public.instructores ALTER COLUMN documento DROP NOT NULL;
ALTER TABLE public.instructores ALTER COLUMN email DROP NOT NULL;

-- Verificación
SELECT COUNT(*) AS instructores, COUNT(documento) AS con_documento, COUNT(email) AS con_email FROM public.instructores;
