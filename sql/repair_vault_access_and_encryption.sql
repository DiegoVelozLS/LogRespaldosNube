BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Reutiliza la llave antigua del vault si existe y mantiene compatibilidad
CREATE OR REPLACE FUNCTION public.require_vault_encryption_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_key text;
BEGIN
    v_key := current_setting('app.encryption_key', true);

    IF v_key IS NULL OR length(trim(v_key)) = 0 THEN
        v_key := current_setting('app.settings.sql_vault_key', true);
    END IF;

    IF (v_key IS NULL OR length(trim(v_key)) = 0)
       AND EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = 'sql_vault_config'
       ) THEN
        SELECT svc.encryption_key
        INTO v_key
        FROM public.sql_vault_config svc
        WHERE svc.id = true;
    END IF;

    IF v_key IS NULL OR length(trim(v_key)) = 0 THEN
        RAISE EXCEPTION 'Vault encryption key is not configured';
    END IF;

    RETURN v_key;
END;
$$;

-- 2. Arregla permisos RLS para administracion de mini-bovedas
ALTER TABLE public.vault_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_access_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vault_categories_select_policy ON public.vault_categories;
DROP POLICY IF EXISTS vault_categories_insert_policy ON public.vault_categories;
DROP POLICY IF EXISTS vault_categories_update_policy ON public.vault_categories;
DROP POLICY IF EXISTS vault_categories_delete_policy ON public.vault_categories;

CREATE POLICY vault_categories_select_policy ON public.vault_categories FOR SELECT
USING (public.is_vault_authorized(id, auth.uid()));

CREATE POLICY vault_categories_insert_policy ON public.vault_categories FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid() AND u.role = 'ADMIN'
    )
);

CREATE POLICY vault_categories_update_policy ON public.vault_categories FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid() AND u.role = 'ADMIN'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid() AND u.role = 'ADMIN'
    )
);

CREATE POLICY vault_categories_delete_policy ON public.vault_categories FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid() AND u.role = 'ADMIN'
    )
);

DROP POLICY IF EXISTS vault_access_policies_select_policy ON public.vault_access_policies;
DROP POLICY IF EXISTS vault_access_policies_insert_policy ON public.vault_access_policies;
DROP POLICY IF EXISTS vault_access_policies_update_policy ON public.vault_access_policies;
DROP POLICY IF EXISTS vault_access_policies_delete_policy ON public.vault_access_policies;

CREATE POLICY vault_access_policies_select_policy ON public.vault_access_policies FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid() AND u.role = 'ADMIN'
    )
);

CREATE POLICY vault_access_policies_insert_policy ON public.vault_access_policies FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid() AND u.role = 'ADMIN'
    )
);

CREATE POLICY vault_access_policies_update_policy ON public.vault_access_policies FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid() AND u.role = 'ADMIN'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid() AND u.role = 'ADMIN'
    )
);

CREATE POLICY vault_access_policies_delete_policy ON public.vault_access_policies FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid() AND u.role = 'ADMIN'
    )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vault_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vault_access_policies TO authenticated;

-- 3. Repara el cifrado de las funciones del nuevo gestor
CREATE OR REPLACE FUNCTION public.upsert_vault_credential(
    p_id uuid,
    p_vault_category_id uuid,
    p_title text,
    p_username text,
    p_password text,
    p_metadata jsonb,
    p_notes text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_credential_id uuid;
    v_key text;
BEGIN
    IF NOT public.is_vault_authorized(p_vault_category_id, auth.uid()) THEN
        RAISE EXCEPTION 'Not authorized to access this vault category';
    END IF;

    v_key := public.require_vault_encryption_key();

    IF p_id IS NOT NULL THEN
        UPDATE public.vault_credentials
        SET title = p_title,
            username = p_username,
            encrypted_password = CASE
                WHEN p_password IS NOT NULL AND p_password <> '' THEN
                    extensions.pgp_sym_encrypt(p_password, v_key, 'cipher-algo=aes256')
                ELSE encrypted_password
            END,
            metadata = COALESCE(p_metadata, '{}'::jsonb),
            notes = p_notes,
            updated_at = now()
        WHERE id = p_id
          AND vault_category_id = p_vault_category_id
        RETURNING id INTO v_credential_id;

        IF v_credential_id IS NULL THEN
            RAISE EXCEPTION 'Credential not found or not authorized';
        END IF;

        PERFORM public.log_vault_action(
            'UPDATE_CREDENTIAL', v_credential_id, p_title, p_vault_category_id, auth.uid()
        );
    ELSE
        IF p_password IS NULL OR p_password = '' THEN
            RAISE EXCEPTION 'Password is required when creating a credential';
        END IF;

        INSERT INTO public.vault_credentials (
            vault_category_id, title, username, encrypted_password, metadata, notes, created_by
        ) VALUES (
            p_vault_category_id,
            p_title,
            p_username,
            extensions.pgp_sym_encrypt(p_password, v_key, 'cipher-algo=aes256'),
            COALESCE(p_metadata, '{}'::jsonb),
            p_notes,
            auth.uid()
        ) RETURNING id INTO v_credential_id;

        PERFORM public.log_vault_action(
            'CREATE_CREDENTIAL', v_credential_id, p_title, p_vault_category_id, auth.uid()
        );
    END IF;

    RETURN v_credential_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reveal_vault_password(p_credential_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clear_password text;
    v_title text;
    v_vault_category_id uuid;
    v_key text;
BEGIN
    SELECT c.title, c.vault_category_id
    INTO v_title, v_vault_category_id
    FROM public.vault_credentials c
    WHERE c.id = p_credential_id;

    IF v_title IS NULL THEN
        RAISE EXCEPTION 'Credential not found';
    END IF;

    IF NOT public.is_vault_authorized(v_vault_category_id, auth.uid()) THEN
        RAISE EXCEPTION 'Not authorized to access this vault category';
    END IF;

    v_key := public.require_vault_encryption_key();

    SELECT extensions.pgp_sym_decrypt(c.encrypted_password, v_key)
    INTO v_clear_password
    FROM public.vault_credentials c
    WHERE c.id = p_credential_id;

    PERFORM public.log_vault_action('REVEAL_PASSWORD', p_credential_id, v_title, v_vault_category_id, auth.uid());
    UPDATE public.vault_credentials SET last_accessed_at = now() WHERE id = p_credential_id;

    RETURN v_clear_password;
END;
$$;

GRANT EXECUTE ON FUNCTION public.require_vault_encryption_key() TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_vault_credential(uuid, uuid, text, text, text, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reveal_vault_password(uuid) TO authenticated;

COMMIT;
