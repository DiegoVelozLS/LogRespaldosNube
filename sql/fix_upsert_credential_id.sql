-- Fix Upsert Credential ID
-- Redefines the upsert function to support ID-based updates and fix null password issues during edits.

BEGIN;

-- Drop existing functions to avoid signature conflicts
DROP FUNCTION IF EXISTS public.upsert_client_sql_credential(text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.upsert_client_sql_credential(
    p_company_name text,
    p_sql_username text,
    p_database_name text,
    p_plain_password text default null,
    p_notes text default null,
    p_id uuid default null
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

    -- 1. Identify the target record
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

    -- 2. Handle Encryption
    v_key := public.require_sql_vault_key();
    IF p_plain_password IS NOT NULL AND length(trim(p_plain_password)) > 0 THEN
        v_encrypted := extensions.pgp_sym_encrypt(p_plain_password, v_key, 'cipher-algo=aes256');
    END IF;

    -- 3. Insert or Update
    IF v_target_id IS NULL THEN
        -- INSERT (must have password)
        IF v_encrypted IS NULL THEN
            RAISE EXCEPTION 'Password is required when creating a new SQL credential';
        END IF;

        INSERT INTO public.client_sql_credentials (
            company_name,
            sql_username,
            encrypted_password,
            db_name,
            notes,
            created_by,
            updated_by,
            last_password_rotation_at
        ) VALUES (
            trim(p_company_name),
            p_sql_username,
            v_encrypted,
            p_database_name,
            p_notes,
            auth.uid(),
            auth.uid(),
            now()
        )
        RETURNING id INTO v_target_id;

        PERFORM public.log_sql_vault_action(
            v_target_id,
            trim(p_company_name),
            'CREATE_CREDENTIAL',
            jsonb_build_object('sql_username', p_sql_username, 'db_name', p_database_name)
        );
    ELSE
        -- UPDATE
        UPDATE public.client_sql_credentials
        SET company_name = COALESCE(trim(p_company_name), company_name),
            sql_username = COALESCE(p_sql_username, sql_username),
            db_name = COALESCE(p_database_name, db_name),
            notes = COALESCE(p_notes, notes),
            encrypted_password = COALESCE(v_encrypted, encrypted_password),
            last_password_rotation_at = CASE WHEN v_encrypted IS NOT NULL THEN now() ELSE last_password_rotation_at END,
            updated_by = auth.uid()
        WHERE id = v_target_id;

        PERFORM public.log_sql_vault_action(
            v_target_id,
            COALESCE(trim(p_company_name), (SELECT company_name FROM public.client_sql_credentials WHERE id = v_target_id)),
            CASE WHEN v_encrypted IS NULL THEN 'UPDATE_CREDENTIAL' ELSE 'ROTATE_PASSWORD' END,
            jsonb_build_object('sql_username', p_sql_username, 'db_name', p_database_name)
        );
    END IF;

    RETURN v_target_id;
END;
$$;

-- IMPORTANT: Re-grant permissions as dropping function clears them
GRANT EXECUTE ON FUNCTION public.upsert_client_sql_credential(text, text, text, text, text, uuid) TO authenticated;

COMMIT;
