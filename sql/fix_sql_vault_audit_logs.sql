-- Fix SQL Vault Audit Logs
-- This script ensures audit logs are robustly saved by addressing RLS, FK constraints, and execution order.

BEGIN;

-- 1. Ensure RLS allows inserts so we don't rely solely on SECURITY DEFINER bypassing RLS
-- (In some Supabase setups, SECURITY DEFINER functions created by non-superusers don't bypass RLS)
DROP POLICY IF EXISTS sql_audit_insert_policy ON public.sql_credentials_audit_logs;
CREATE POLICY sql_audit_insert_policy ON public.sql_credentials_audit_logs
FOR INSERT TO authenticated
WITH CHECK (true);

GRANT INSERT ON public.sql_credentials_audit_logs TO authenticated;

-- 2. Modify log_sql_vault_action to use PLPGSQL for better error handling and FK safety
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
    -- Only assign actor_user_id if the user actually exists in public.users
    -- This prevents Foreign Key constraint violations if the user is not in the table
    SELECT id INTO v_actor_id FROM public.users WHERE id = auth.uid();

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
    -- If it fails, log a warning but DO NOT abort the parent transaction
    -- We want the credentials to save even if the audit log fails momentarily
    RAISE WARNING 'Failed to insert audit log: %', SQLERRM;
END;
$$;

-- 3. Fix delete_client_sql_credential so it logs BEFORE deleting
-- In migrate_sql_vault_independent_company.sql, it was deleting first, causing an FK violation on the audit log insert
CREATE OR REPLACE FUNCTION public.delete_client_sql_credential(
    p_credential_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_company_name text;
BEGIN
    IF NOT public.is_sql_vault_authorized(auth.uid()) THEN
        RAISE EXCEPTION 'Not authorized for SQL vault';
    END IF;

    SELECT company_name INTO v_company_name
    FROM public.client_sql_credentials
    WHERE id = p_credential_id;

    IF v_company_name IS NULL THEN
        RETURN false;
    END IF;

    -- LOG BEFORE DELETE to satisfy the credential_id Foreign Key constraint
    PERFORM public.log_sql_vault_action(
        p_credential_id,
        v_company_name,
        'DELETE_CREDENTIAL',
        '{}'::jsonb
    );

    DELETE FROM public.client_sql_credentials
    WHERE id = p_credential_id;

    RETURN true;
END;
$$;

COMMIT;
