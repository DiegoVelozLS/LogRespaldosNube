-- FINAL FIX: Eliminate all references to verification table
-- This script ensures no triggers or functions reference 'sql_vault_daily_verifications'.

BEGIN;

-- 1. Drop the function that likely contains the reference
-- Cascade will remove any triggers using it
DROP FUNCTION IF EXISTS public.is_vault_verified(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.check_vault_verification() CASCADE;

-- 2. Force overwrite of ALL vault functions (Clean versions)
CREATE OR REPLACE FUNCTION public.upsert_client_sql_credential(
    p_company_name text,
    p_sql_username text,
    p_database_name text,
    p_plain_password text default null,
    p_notes text default null
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing_id uuid;
    v_key text;
    v_encrypted bytea;
BEGIN
    IF NOT public.is_sql_vault_authorized(auth.uid()) THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    v_key := public.require_sql_vault_key();

    IF p_plain_password IS NOT NULL AND length(trim(p_plain_password)) > 0 THEN
        v_encrypted := extensions.pgp_sym_encrypt(p_plain_password, v_key, 'cipher-algo=aes256');
    END IF;

    SELECT id INTO v_existing_id FROM public.client_sql_credentials 
    WHERE lower(trim(company_name)) = lower(trim(p_company_name)) LIMIT 1;

    IF v_existing_id IS NULL THEN
        INSERT INTO public.client_sql_credentials (company_name, sql_username, encrypted_password, db_name, notes, created_by, updated_by, last_password_rotation_at)
        VALUES (trim(p_company_name), p_sql_username, v_encrypted, p_database_name, p_notes, auth.uid(), auth.uid(), now())
        RETURNING id INTO v_existing_id;
    ELSE
        UPDATE public.client_sql_credentials
        SET sql_username = p_sql_username, db_name = p_database_name, notes = p_notes,
            encrypted_password = coalesce(v_encrypted, encrypted_password),
            updated_by = auth.uid()
        WHERE id = v_existing_id;
    END IF;

    RETURN v_existing_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reveal_client_sql_password(p_credential_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_key text;
    v_password text;
BEGIN
    IF NOT public.is_sql_vault_authorized(auth.uid()) THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    v_key := public.require_sql_vault_key();
    SELECT extensions.pgp_sym_decrypt(encrypted_password, v_key) INTO v_password
    FROM public.client_sql_credentials WHERE id = p_credential_id;

    RETURN v_password;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_client_sql_credential(p_credential_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_company_name text;
BEGIN
    IF NOT public.is_sql_vault_authorized(auth.uid()) THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    SELECT company_name INTO v_company_name FROM public.client_sql_credentials WHERE id = p_credential_id;

    IF v_company_name IS NULL THEN RETURN FALSE; END IF;

    DELETE FROM public.client_sql_credentials WHERE id = p_credential_id;

    RETURN TRUE;
END;
$$;

COMMIT;
