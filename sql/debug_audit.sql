-- Script para diagnosticar por qué no se guarda la auditoría
-- Al ejecutar esto, cualquier fallo en la inserción arrojará un error visible en tu pantalla
BEGIN;

-- Nos aseguramos que la tabla de errores exista por si queremos revisar luego
CREATE TABLE IF NOT EXISTS public.debug_audit_errors (
    id serial primary key,
    action_type text,
    error_msg text,
    created_at timestamptz default now()
);

GRANT ALL ON public.debug_audit_errors TO authenticated;

-- Modificamos la función para que NO oculte el error, sino que lo muestre
CREATE OR REPLACE FUNCTION public.log_sql_vault_action(
    p_credential_id uuid,
    p_company_name text,
    p_action text,
    p_metadata jsonb default '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id uuid;
BEGIN
    SELECT id INTO v_actor_id FROM public.users WHERE id = auth.uid();

    -- Intentamos insertar
    INSERT INTO public.sql_credentials_audit_logs (
        credential_id,
        client_id,
        company_name,
        actor_user_id,
        action,
        metadata
    )
    VALUES (
        p_credential_id,
        null,
        p_company_name,
        v_actor_id,
        p_action,
        coalesce(p_metadata, '{}'::jsonb)
    );

EXCEPTION WHEN OTHERS THEN
    -- Si falla, guardamos el error en nuestra tabla de debug
    INSERT INTO public.debug_audit_errors (action_type, error_msg) VALUES (p_action, SQLERRM);
    -- Y FORZAMOS el error hacia el frontend para que lo puedas ver
    RAISE EXCEPTION 'ERROR_DE_AUDITORIA: %', SQLERRM;
END;
$$;

COMMIT;
