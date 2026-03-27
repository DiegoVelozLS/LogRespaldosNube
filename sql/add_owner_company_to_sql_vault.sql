-- Migration: Add owner_company to SQL Vault and rename 'Instancia' (db_name) to 'Servidor' in UI-context
-- This script adds the field to the table, updates the view, and redefines the upsert function.

BEGIN;

-- 1) Add column to client_sql_credentials
ALTER TABLE public.client_sql_credentials
    ADD COLUMN IF NOT EXISTS owner_company text;

-- 2) Update the view to include the new column
DROP VIEW IF EXISTS public.client_sql_credentials_view;
CREATE VIEW public.client_sql_credentials_view AS
SELECT
    csc.id,
    csc.company_name,
    csc.owner_company, -- New field
    csc.db_name,
    csc.sql_username,
    csc.notes,
    csc.updated_at,
    csc.last_accessed_at,
    csc.last_password_rotation_at
FROM public.client_sql_credentials csc;

-- 3) Update the upsert function to include owner_company
-- We drop the current version from fix_upsert_credential_id.sql to avoid signature conflicts.
DROP FUNCTION IF EXISTS public.upsert_client_sql_credential(text, text, text, text, text, uuid);

CREATE OR REPLACE FUNCTION public.upsert_client_sql_credential(
    p_company_name text,
    p_sql_username text,
    p_database_name text,
    p_plain_password text default null,
    p_notes text default null,
    p_id uuid default null,
    p_owner_company text default null -- New parameter
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
            owner_company,
            sql_username,
            encrypted_password,
            db_name,
            notes,
            created_by,
            updated_by,
            last_password_rotation_at
        ) VALUES (
            trim(p_company_name),
            trim(p_owner_company),
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

-- 4) Grants
GRANT SELECT ON public.client_sql_credentials_view TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_client_sql_credential(text, text, text, text, text, uuid, text) TO authenticated;

COMMIT;
