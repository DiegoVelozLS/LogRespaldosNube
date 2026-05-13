-- Fix the broken RLS policies in vault tables
BEGIN;

-- 1. Drop all broken policies
DROP POLICY IF EXISTS vault_categories_select_policy ON public.vault_categories;
DROP POLICY IF EXISTS vault_credentials_select_policy ON public.vault_credentials;
DROP POLICY IF EXISTS vault_credentials_insert_policy ON public.vault_credentials;
DROP POLICY IF EXISTS vault_credentials_update_policy ON public.vault_credentials;
DROP POLICY IF EXISTS vault_credentials_delete_policy ON public.vault_credentials;
DROP POLICY IF EXISTS vault_credentials_all_policy ON public.vault_credentials;

-- 2. Recreate vault_categories policies (with authorization check)
CREATE POLICY vault_categories_select_policy ON public.vault_categories FOR SELECT 
USING (public.is_vault_authorized(id, auth.uid()));

-- 3. Recreate vault_credentials policies (with proper authorization checks)
CREATE POLICY vault_credentials_select_policy ON public.vault_credentials FOR SELECT 
USING (public.is_vault_authorized(vault_category_id, auth.uid()));

CREATE POLICY vault_credentials_insert_policy ON public.vault_credentials FOR INSERT 
WITH CHECK (public.is_vault_authorized(vault_category_id, auth.uid()));

CREATE POLICY vault_credentials_update_policy ON public.vault_credentials FOR UPDATE 
USING (public.is_vault_authorized(vault_category_id, auth.uid()))
WITH CHECK (public.is_vault_authorized(vault_category_id, auth.uid()));

CREATE POLICY vault_credentials_delete_policy ON public.vault_credentials FOR DELETE 
USING (public.is_vault_authorized(vault_category_id, auth.uid()));

-- 4. Verify data exists
SELECT 
    (SELECT COUNT(*) FROM public.vault_categories) as total_categories,
    (SELECT COUNT(*) FROM public.vault_credentials) as total_credentials,
    (SELECT COUNT(*) FROM public.vault_access_policies) as total_access_policies;

COMMIT;
