BEGIN;

-- Verifica si la tabla antigua sigue existiendo.
SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'client_sql_credentials'
) AS old_table_exists;

-- Conteos actuales del esquema nuevo.
SELECT
    (SELECT COUNT(*) FROM public.vault_categories) AS vault_categories_count,
    (SELECT COUNT(*) FROM public.vault_credentials) AS vault_credentials_count,
    (SELECT COUNT(*) FROM public.vault_access_policies) AS vault_access_policies_count,
    (SELECT COUNT(*) FROM public.vault_audit_logs) AS vault_audit_logs_count;

-- Muestra una muestra de credenciales migradas.
SELECT
    vc.id,
    vc.title,
    vc.username,
    vc.metadata,
    vc.updated_at,
    cat.name AS vault_category_name
FROM public.vault_credentials vc
LEFT JOIN public.vault_categories cat ON cat.id = vc.vault_category_id
ORDER BY vc.updated_at DESC NULLS LAST, vc.title ASC
LIMIT 20;

-- Si la tabla antigua sigue viva, compara conteos.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'client_sql_credentials'
    ) THEN
        RAISE NOTICE 'Comparacion de conteos:';
        RAISE NOTICE 'client_sql_credentials = %', (SELECT COUNT(*) FROM public.client_sql_credentials);
        RAISE NOTICE 'vault_credentials = %', (SELECT COUNT(*) FROM public.vault_credentials);
    ELSE
        RAISE NOTICE 'La tabla antigua public.client_sql_credentials ya no existe.';
    END IF;
END $$;

ROLLBACK;
