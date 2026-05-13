BEGIN;

-- 1. Create vault_categories
CREATE TABLE IF NOT EXISTS public.vault_categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    icon text,
    fields_schema jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- 2. Create vault_access_policies
CREATE TABLE IF NOT EXISTS public.vault_access_policies (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    vault_category_id uuid REFERENCES public.vault_categories(id) ON DELETE CASCADE,
    target_type text NOT NULL CHECK (target_type IN ('ROLE', 'USER')),
    target_role text,
    target_user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now()
);

-- 3. Create vault_credentials
CREATE TABLE IF NOT EXISTS public.vault_credentials (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    vault_category_id uuid REFERENCES public.vault_categories(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    username text,
    encrypted_password bytea NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    notes text,
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    updated_at timestamptz DEFAULT now(),
    last_accessed_at timestamptz,
    last_password_rotation_at timestamptz
);

-- 4. Initial Vault Category (Bóveda SQL)
DO $$
DECLARE
    v_category_id uuid;
BEGIN
    -- Check if Bóveda SQL already exists to make script idempotent
    IF NOT EXISTS (SELECT 1 FROM public.vault_categories WHERE name = 'Bóveda SQL') THEN
        INSERT INTO public.vault_categories (name, icon, fields_schema)
        VALUES (
            'Bóveda SQL', 
            'database', 
            '[{"name": "server", "label": "Servidor/Instancia", "required": true}, {"name": "owner_company", "label": "Empresa Dueña", "required": false}]'::jsonb
        ) RETURNING id INTO v_category_id;

        -- Add access policies for TECH and SOPORTE
        INSERT INTO public.vault_access_policies (vault_category_id, target_type, target_role)
        VALUES (v_category_id, 'ROLE', 'TECH');
        
        INSERT INTO public.vault_access_policies (vault_category_id, target_type, target_role)
        VALUES (v_category_id, 'ROLE', 'SOPORTE');
    END IF;
END $$;

-- 5. Migrate Data
DO $$
DECLARE
    v_category_id uuid;
BEGIN
    SELECT id INTO v_category_id FROM public.vault_categories WHERE name = 'Bóveda SQL' LIMIT 1;

    -- Only migrate if client_sql_credentials exists and vault_credentials is empty
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'client_sql_credentials') 
       AND NOT EXISTS (SELECT 1 FROM public.vault_credentials LIMIT 1) THEN
       
        INSERT INTO public.vault_credentials (
            id, vault_category_id, title, username, encrypted_password, metadata, notes, updated_at, last_accessed_at, last_password_rotation_at
        )
        SELECT 
            id,
            v_category_id,
            company_name,
            sql_username,
            encrypted_password,
            jsonb_build_object('server', db_name, 'owner_company', owner_company),
            notes,
            updated_at,
            last_accessed_at,
            last_password_rotation_at
        FROM public.client_sql_credentials;
    END IF;
END $$;

-- 6. Rename Audit Logs Table and Columns
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sql_credentials_audit_logs') THEN
        ALTER TABLE public.sql_credentials_audit_logs RENAME TO vault_audit_logs;
        ALTER TABLE public.vault_audit_logs RENAME COLUMN company_name TO credential_title;
        
        ALTER TABLE public.vault_audit_logs ADD COLUMN vault_category_id uuid REFERENCES public.vault_categories(id) ON DELETE SET NULL;
        
        -- Drop old FK and add new FK
        ALTER TABLE public.vault_audit_logs DROP CONSTRAINT IF EXISTS sql_credentials_audit_logs_credential_id_fkey;
        ALTER TABLE public.vault_audit_logs ADD CONSTRAINT vault_audit_logs_credential_id_fkey FOREIGN KEY (credential_id) REFERENCES public.vault_credentials(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Assign all existing audit logs to the 'Bóveda SQL' category
DO $$
DECLARE
    v_category_id uuid;
BEGIN
    SELECT id INTO v_category_id FROM public.vault_categories WHERE name = 'Bóveda SQL' LIMIT 1;
    UPDATE public.vault_audit_logs SET vault_category_id = v_category_id WHERE vault_category_id IS NULL;
END $$;

-- 7. Update RLS policies
ALTER TABLE public.vault_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vault_categories_select_policy ON public.vault_categories;
CREATE POLICY vault_categories_select_policy ON public.vault_categories FOR SELECT 
USING (public.is_vault_authorized(id, auth.uid()));

ALTER TABLE public.vault_credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vault_credentials_select_policy ON public.vault_credentials;
DROP POLICY IF EXISTS vault_credentials_insert_policy ON public.vault_credentials;
DROP POLICY IF EXISTS vault_credentials_update_policy ON public.vault_credentials;
DROP POLICY IF EXISTS vault_credentials_delete_policy ON public.vault_credentials;
DROP POLICY IF EXISTS vault_credentials_all_policy ON public.vault_credentials;

CREATE POLICY vault_credentials_select_policy ON public.vault_credentials FOR SELECT 
USING (public.is_vault_authorized(vault_category_id, auth.uid()));

CREATE POLICY vault_credentials_insert_policy ON public.vault_credentials FOR INSERT 
WITH CHECK (public.is_vault_authorized(vault_category_id, auth.uid()));

CREATE POLICY vault_credentials_update_policy ON public.vault_credentials FOR UPDATE 
USING (public.is_vault_authorized(vault_category_id, auth.uid()))
WITH CHECK (public.is_vault_authorized(vault_category_id, auth.uid()));

CREATE POLICY vault_credentials_delete_policy ON public.vault_credentials FOR DELETE 
USING (public.is_vault_authorized(vault_category_id, auth.uid()));

ALTER TABLE public.vault_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vault_audit_select_policy ON public.vault_audit_logs;
DROP POLICY IF EXISTS sql_audit_select_policy ON public.vault_audit_logs;
CREATE POLICY vault_audit_select_policy ON public.vault_audit_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'ADMIN')
);


-- 8. Core Access Function
CREATE OR REPLACE FUNCTION public.is_vault_authorized(p_vault_category_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role text;
BEGIN
    -- Check if user is ADMIN (Implicit access)
    SELECT role INTO v_role FROM public.users WHERE id = p_user_id;
    IF v_role = 'ADMIN' THEN
        RETURN true;
    END IF;

    -- Check vault_access_policies
    IF EXISTS (
        SELECT 1 FROM public.vault_access_policies
        WHERE vault_category_id = p_vault_category_id
          AND (
              (target_type = 'ROLE' AND target_role = v_role) OR
              (target_type = 'USER' AND target_user_id = p_user_id)
          )
    ) THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$;


-- 9. Update the Logging Function
CREATE OR REPLACE FUNCTION public.log_vault_action(
    p_action text,
    p_credential_id uuid,
    p_credential_title text,
    p_vault_category_id uuid,
    p_actor_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.vault_audit_logs (
        credential_id, credential_title, vault_category_id, actor_user_id, action
    ) VALUES (
        p_credential_id, p_credential_title, p_vault_category_id, p_actor_user_id, p_action
    );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Failed to insert audit log: %', SQLERRM;
END;
$$;

-- 10. Re-create Upsert Function
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
AS $$
DECLARE
    v_credential_id uuid;
    v_is_update boolean := false;
BEGIN
    IF NOT public.is_vault_authorized(p_vault_category_id, auth.uid()) THEN
        RAISE EXCEPTION 'Not authorized to access this vault category';
    END IF;

    IF p_id IS NOT NULL THEN
        v_is_update := true;
        UPDATE public.vault_credentials
        SET 
            title = p_title,
            username = p_username,
            encrypted_password = CASE 
                WHEN p_password IS NOT NULL AND p_password <> '' THEN 
                     pgp_sym_encrypt(p_password, current_setting('app.encryption_key', true))
                ELSE encrypted_password
            END,
            metadata = p_metadata,
            notes = p_notes,
            updated_at = now()
        WHERE id = p_id AND vault_category_id = p_vault_category_id
        RETURNING id INTO v_credential_id;
        
        IF v_credential_id IS NULL THEN
            RAISE EXCEPTION 'Credential not found or not authorized';
        END IF;

        PERFORM public.log_vault_action(
            'UPDATE_CREDENTIAL', v_credential_id, p_title, p_vault_category_id, auth.uid()
        );
    ELSE
        INSERT INTO public.vault_credentials (
            vault_category_id, title, username, encrypted_password, metadata, notes, created_by
        ) VALUES (
            p_vault_category_id, p_title, p_username,
            pgp_sym_encrypt(p_password, current_setting('app.encryption_key', true)),
            p_metadata, p_notes, auth.uid()
        ) RETURNING id INTO v_credential_id;

        PERFORM public.log_vault_action(
            'CREATE_CREDENTIAL', v_credential_id, p_title, p_vault_category_id, auth.uid()
        );
    END IF;

    RETURN v_credential_id;
END;
$$;


-- 11. Re-create Reveal Function
CREATE OR REPLACE FUNCTION public.reveal_vault_password(p_credential_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_clear_password text;
    v_title text;
    v_vault_category_id uuid;
BEGIN
    SELECT title, vault_category_id, pgp_sym_decrypt(encrypted_password, current_setting('app.encryption_key', true))
    INTO v_title, v_vault_category_id, v_clear_password
    FROM public.vault_credentials
    WHERE id = p_credential_id;

    IF v_clear_password IS NULL THEN
        RAISE EXCEPTION 'Credential not found';
    END IF;

    IF NOT public.is_vault_authorized(v_vault_category_id, auth.uid()) THEN
        RAISE EXCEPTION 'Not authorized to access this vault category';
    END IF;

    PERFORM public.log_vault_action('REVEAL_PASSWORD', p_credential_id, v_title, v_vault_category_id, auth.uid());
    UPDATE public.vault_credentials SET last_accessed_at = now() WHERE id = p_credential_id;

    RETURN v_clear_password;
END;
$$;

-- 12. Re-create Delete Function
CREATE OR REPLACE FUNCTION public.delete_vault_credential(p_credential_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_title text;
    v_vault_category_id uuid;
BEGIN
    SELECT title, vault_category_id INTO v_title, v_vault_category_id
    FROM public.vault_credentials WHERE id = p_credential_id;

    IF v_title IS NULL THEN
        RAISE EXCEPTION 'Credential not found';
    END IF;

    IF NOT public.is_vault_authorized(v_vault_category_id, auth.uid()) THEN
        RAISE EXCEPTION 'Not authorized to access this vault category';
    END IF;

    PERFORM public.log_vault_action('DELETE_CREDENTIAL', p_credential_id, v_title, v_vault_category_id, auth.uid());
    DELETE FROM public.vault_credentials WHERE id = p_credential_id;
END;
$$;

-- 13. Re-create get_vault_audit_logs RPC
CREATE OR REPLACE FUNCTION public.get_vault_audit_logs()
RETURNS TABLE (
    id uuid,
    credential_id uuid,
    credential_title text,
    vault_category_id uuid,
    vault_category_name text,
    actor_user_id uuid,
    actor_name text,
    action text,
    created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'ADMIN') THEN
        RAISE EXCEPTION 'Solo administradores pueden ver la auditoría';
    END IF;

    RETURN QUERY
    SELECT 
        l.id,
        l.credential_id,
        COALESCE(l.credential_title, 'Desconocido'),
        l.vault_category_id,
        c.name as vault_category_name,
        l.actor_user_id,
        COALESCE(u.name || ' ' || u.last_name, 'Sistema'),
        l.action,
        l.created_at
    FROM public.vault_audit_logs l
    LEFT JOIN public.users u ON l.actor_user_id = u.id
    LEFT JOIN public.vault_categories c ON l.vault_category_id = c.id
    ORDER BY l.created_at DESC
    LIMIT 100;
END;
$$;

-- 14. Helper RPC for UI to fetch authorized vaults
CREATE OR REPLACE FUNCTION public.get_authorized_vault_categories()
RETURNS TABLE (
    id uuid,
    name text,
    icon text,
    fields_schema jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT v.id, v.name, v.icon, v.fields_schema
    FROM public.vault_categories v
    WHERE public.is_vault_authorized(v.id, auth.uid())
    ORDER BY v.created_at ASC;
END;
$$;

-- 15. Helper RPC to fetch credentials for a vault
CREATE OR REPLACE FUNCTION public.get_vault_credentials(p_vault_category_id uuid)
RETURNS TABLE (
    id uuid,
    vault_category_id uuid,
    title text,
    username text,
    metadata jsonb,
    notes text,
    updated_at timestamptz,
    last_accessed_at timestamptz,
    last_password_rotation_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT public.is_vault_authorized(p_vault_category_id, auth.uid()) THEN
        RAISE EXCEPTION 'Not authorized to access this vault category';
    END IF;

    RETURN QUERY
    SELECT 
        c.id, c.vault_category_id, c.title, c.username, c.metadata, c.notes, 
        c.updated_at, c.last_accessed_at, c.last_password_rotation_at
    FROM public.vault_credentials c
    WHERE c.vault_category_id = p_vault_category_id
    ORDER BY c.title ASC;
END;
$$;


-- 16. Drop the old objects
DROP TABLE IF EXISTS public.client_sql_credentials CASCADE;

DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT oid::regprocedure AS func_name 
        FROM pg_proc 
        WHERE proname IN (
            'upsert_client_sql_credential', 
            'reveal_client_sql_password', 
            'delete_client_sql_credential', 
            'log_sql_vault_action', 
            'get_sql_audit_logs'
        ) 
        AND pronamespace = 'public'::regnamespace
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_name || ' CASCADE;';
    END LOOP;
END $$;

COMMIT;
