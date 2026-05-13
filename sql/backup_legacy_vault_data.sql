BEGIN;

-- Respaldo no destructivo de la tabla legacy, si todavia existe.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'client_sql_credentials'
    ) THEN
        EXECUTE '
            CREATE TABLE IF NOT EXISTS public.client_sql_credentials_backup AS
            SELECT * FROM public.client_sql_credentials
        ';
    ELSE
        RAISE NOTICE 'La tabla public.client_sql_credentials no existe. No se creo backup legacy.';
    END IF;
END $$;

-- Respaldo de las tablas nuevas para tener punto de recuperacion.
CREATE TABLE IF NOT EXISTS public.vault_categories_backup AS
SELECT * FROM public.vault_categories;

CREATE TABLE IF NOT EXISTS public.vault_access_policies_backup AS
SELECT * FROM public.vault_access_policies;

CREATE TABLE IF NOT EXISTS public.vault_credentials_backup AS
SELECT * FROM public.vault_credentials;

CREATE TABLE IF NOT EXISTS public.vault_audit_logs_backup AS
SELECT * FROM public.vault_audit_logs;

COMMIT;