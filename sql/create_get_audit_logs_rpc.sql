-- RPC para obtener los registros de auditoría de manera segura
-- Esto asegura que no haya problemas de RLS ni de Joins en el frontend.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_sql_audit_logs()
RETURNS TABLE (
    id uuid,
    credential_id uuid,
    company_name text,
    actor_user_id uuid,
    actor_name text,
    action text,
    created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Validar que solo un ADMIN puede ver esto
    IF NOT public.is_sql_vault_authorized(auth.uid()) THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    -- Verificar que sea explícitamente ADMIN (is_sql_vault_authorized deja pasar TECH/SOPORTE también)
    IF NOT EXISTS (
        SELECT 1 FROM public.users u 
        WHERE u.id = auth.uid() AND u.role = 'ADMIN'
    ) THEN
        RAISE EXCEPTION 'Solo administradores pueden ver la auditoría';
    END IF;

    RETURN QUERY
    SELECT 
        l.id,
        l.credential_id,
        COALESCE(l.company_name, 'Desconocido'),
        l.actor_user_id,
        COALESCE(u.name || ' ' || u.last_name, 'Sistema'),
        l.action,
        l.created_at
    FROM public.sql_credentials_audit_logs l
    LEFT JOIN public.users u ON l.actor_user_id = u.id
    ORDER BY l.created_at DESC
    LIMIT 100;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_sql_audit_logs() TO authenticated;

COMMIT;
