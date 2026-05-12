-- Fix ALL SQL Vault Actions to Ensure Audit Logging
-- This script safely redefines upsert, reveal, and delete to guarantee they call the audit log function.
-- It also includes the robust version of the audit log function.

BEGIN;

-- 1. Ensure RLS allows inserts for the audit table
DROP POLICY IF EXISTS sql_audit_insert_policy ON public.sql_credentials_audit_logs;
CREATE POLICY sql_audit_insert_policy ON public.sql_credentials_audit_logs
FOR INSERT TO authenticated
WITH CHECK (true);

GRANT INSERT ON public.sql_credentials_audit_logs TO authenticated;

-- 2. Robust Audit Log Function
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
    RAISE WARNING 'Failed to insert audit log: %', SQLERRM;
END;
$$;

-- 3. REVEAL Function (restoring the audit log)
CREATE OR REPLACE FUNCTION public.reveal_client_sql_password(
    p_credential_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_key text;
    v_password text;
    v_company_name text;
BEGIN
    IF NOT public.is_sql_vault_authorized(auth.uid()) THEN
        RAISE EXCEPTION 'Not authorized for SQL vault';
    END IF;

    v_key := public.require_sql_vault_key();

    SELECT c.company_name,
           extensions.pgp_sym_decrypt(c.encrypted_password, v_key)
    INTO v_company_name, v_password
    FROM public.client_sql_credentials c
    WHERE c.id = p_credential_id;

    IF v_password IS NULL THEN
        RAISE EXCEPTION 'Credential not found';
    END IF;

    UPDATE public.client_sql_credentials
    SET last_accessed_at = now(),
        updated_by = auth.uid()
    WHERE id = p_credential_id;

    -- GUARANTEED LOGGING
    PERFORM public.log_sql_vault_action(
        p_credential_id,
        v_company_name,
        'REVEAL_PASSWORD',
        '{}'::jsonb
    );

    RETURN v_password;
END;
$$;

-- 4. UPSERT Function (restoring the audit log)
CREATE OR REPLACE FUNCTION public.upsert_client_sql_credential(
    p_company_name text,
    p_sql_username text,
    p_database_name text,
    p_plain_password text default null,
    p_notes text default null,
    p_id uuid default null,
    p_owner_company text default null
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target_id uuid;
    v_key text;
    v_encrypted bytea;
BEGIN
    IF NOT public.is_sql_vault_authorized(auth.uid()) THEN
        RAISE EXCEPTION 'Not authorized for SQL vault';
    END IF;

    -- Identify the target record
    IF p_id IS NOT NULL THEN
        SELECT id INTO v_target_id FROM public.client_sql_credentials WHERE id = p_id;
    ELSIF p_company_name IS NOT NULL AND length(trim(p_company_name)) > 0 THEN
        SELECT id INTO v_target_id 
        FROM public.client_sql_credentials 
        WHERE lower(trim(company_name)) = lower(trim(p_company_name))
        LIMIT 1;
    ELSE
        RAISE EXCEPTION 'Either ID or Company Name is required';
    END IF;

    v_key := public.require_sql_vault_key();

    IF p_plain_password IS NOT NULL AND length(trim(p_plain_password)) > 0 THEN
        v_encrypted := extensions.pgp_sym_encrypt(p_plain_password, v_key, 'cipher-algo=aes256');
    END IF;

    IF v_target_id IS NULL THEN
        -- INSERT
        IF v_encrypted IS NULL THEN
            RAISE EXCEPTION 'Password is required when creating a new SQL credential';
        END IF;

        INSERT INTO public.client_sql_credentials (
            company_name, owner_company, sql_username, encrypted_password, db_name, notes, created_by, updated_by, last_password_rotation_at
        ) VALUES (
            trim(p_company_name), trim(p_owner_company), p_sql_username, v_encrypted, p_database_name, p_notes, auth.uid(), auth.uid(), now()
        ) RETURNING id INTO v_target_id;

        -- GUARANTEED LOGGING
        PERFORM public.log_sql_vault_action(
            v_target_id, trim(p_company_name), 'CREATE_CREDENTIAL',
            jsonb_build_object('sql_username', p_sql_username, 'db_name', p_database_name, 'owner_company', p_owner_company)
        );
    ELSE
        -- UPDATE
        UPDATE public.client_sql_credentials
        SET company_name = COALESCE(trim(p_company_name), company_name),
            owner_company = COALESCE(trim(p_owner_company), owner_company),
            sql_username = COALESCE(p_sql_username, sql_username),
            db_name = COALESCE(p_database_name, db_name),
            notes = COALESCE(p_notes, notes),
            encrypted_password = COALESCE(v_encrypted, encrypted_password),
            last_password_rotation_at = CASE WHEN v_encrypted IS NOT NULL THEN now() ELSE last_password_rotation_at END,
            updated_by = auth.uid()
        WHERE id = v_target_id;

        -- GUARANTEED LOGGING
        PERFORM public.log_sql_vault_action(
            v_target_id,
            COALESCE(trim(p_company_name), (SELECT company_name FROM public.client_sql_credentials WHERE id = v_target_id)),
            CASE WHEN v_encrypted IS NULL THEN 'UPDATE_CREDENTIAL' ELSE 'ROTATE_PASSWORD' END,
            jsonb_build_object('sql_username', p_sql_username, 'db_name', p_database_name, 'owner_company', p_owner_company)
        );
    END IF;

    RETURN v_target_id;
END;
$$;

-- 5. DELETE Function (with logging BEFORE delete)
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

    SELECT company_name INTO v_company_name FROM public.client_sql_credentials WHERE id = p_credential_id;

    IF v_company_name IS NULL THEN RETURN FALSE; END IF;

    -- GUARANTEED LOGGING BEFORE DELETE
    PERFORM public.log_sql_vault_action(
        p_credential_id, v_company_name, 'DELETE_CREDENTIAL', '{}'::jsonb
    );

    DELETE FROM public.client_sql_credentials WHERE id = p_credential_id;

    RETURN TRUE;
END;
$$;

COMMIT;
