-- =====================================================================
-- INSTRUCTORES DETECTADOS DESDE JUICIOS (SIN DOCUMENTO)
-- =====================================================================
-- Seguro de correr varias veces.
--
-- Al cargar Juicios Evaluativos, la app crea automáticamente a los
-- funcionarios evaluadores que no estaban en la planta de instructores.
-- Por diseño no se guarda su número de documento (dato personal), pero la
-- tabla lo exigía (NOT NULL): esos instructores nunca llegaban a Supabase, y
-- el seguimiento de los RAPs que calificaron tampoco podía guardarse porque
-- apuntaba a un instructor inexistente.
--
-- Con documento opcional, varios instructores sin documento pueden
-- coexistir (la restricción UNIQUE permite varios NULL).
-- =====================================================================
ALTER TABLE public.instructores ALTER COLUMN documento DROP NOT NULL;

-- Verificación
SELECT COUNT(*) AS instructores, COUNT(documento) AS con_documento FROM public.instructores;
