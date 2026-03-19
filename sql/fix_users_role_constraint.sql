-- ================================================================
-- FIX: PERMITIR EL ROL "SOPORTE" EN LA BASE DE DATOS
-- Ejecuta este script en el Editor SQL de Supabase
-- ================================================================

-- 1. Migrar a 'SOPORTE' cualquier usuario que haya quedado como 'SUPERVISOR'
UPDATE public.users 
SET role = 'SOPORTE' 
WHERE role = 'SUPERVISOR';

-- 2. Buscar y eliminar dinámicamente el constraint de verificación de rol en la tabla users
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%role%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.users DROP CONSTRAINT ' || quote_ident(constraint_name);
    END IF;
END $$;

-- 4. Añadir el nuevo constraint permitiendo 'SOPORTE'
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('ADMIN', 'TECH', 'SOPORTE'));

-- 5. Verificar que se ha aplicado correctamente
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.users'::regclass AND contype = 'c';
