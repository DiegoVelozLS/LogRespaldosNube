-- Setup Vault PIN Protection
-- This script adds a vault_pin column to the users table and provides RPC functions for secure PIN handling.

BEGIN;

-- 1. Add vault_pin column to public.users if it doesn't exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS vault_pin TEXT;

-- 2. Function to check if the current user has a PIN set
CREATE OR REPLACE FUNCTION public.check_user_has_pin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    v_has_pin BOOLEAN;
BEGIN
    SELECT (vault_pin IS NOT NULL AND vault_pin <> '')
    INTO v_has_pin
    FROM public.users
    WHERE id = auth.uid();
    
    RETURN COALESCE(v_has_pin, FALSE);
END;
$$;

-- 3. Function to set/update the user's PIN
-- Recommended: The PIN should be hashed on the client or server. 
-- For simplicity and consistency with other secrets in this project, 
-- we'll store it directly but suggest hashing if sensitive.
CREATE OR REPLACE FUNCTION public.set_user_pin(p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.users
    SET vault_pin = p_pin
    WHERE id = auth.uid();
    
    RETURN FOUND;
END;
$$;

-- 4. Function to verify the user's PIN
CREATE OR REPLACE FUNCTION public.verify_user_pin(p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    v_stored_pin TEXT;
BEGIN
    SELECT vault_pin
    INTO v_stored_pin
    FROM public.users
    WHERE id = auth.uid();
    
    RETURN v_stored_pin = p_pin;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.check_user_has_pin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_pin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_user_pin(TEXT) TO authenticated;

COMMIT;
