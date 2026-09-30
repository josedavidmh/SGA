-- Nuevo tipo de ambiente: "Convencional".
-- La tabla ambientes tenía un CHECK que solo aceptaba los tipos anteriores;
-- se reemplaza por uno que incluye "Convencional".

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.ambientes'::regclass
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%tipo%'
  LOOP
    EXECUTE format('ALTER TABLE public.ambientes DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.ambientes
  ADD CONSTRAINT ambientes_tipo_check
  CHECK (tipo IN ('Ambiente TIC', 'Convencional', 'Laboratorio', 'Taller', 'Auditorio', 'Virtual'));

NOTIFY pgrst, 'reload schema';
