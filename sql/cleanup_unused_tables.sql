-- CLEANUP: Remove Unused Tables (Crap)
-- Based on current code (35aafc0), these tables are not used and can be removed.

BEGIN;

-- 1. Remove 2FA / Verification crap (This was causing the errors)
DROP TABLE IF EXISTS public.sql_vault_daily_verifications CASCADE;
DROP TABLE IF EXISTS public.sql_vault_otp_challenges CASCADE;
DROP TABLE IF EXISTS public.vault_otps CASCADE; -- From my previous attempt

-- 2. Remove duplicate audit logs if necessary
-- The current code uses 'sql_credentials_audit_logs'
-- 'sql_vault_access_audit_logs' seems to be an old version.
DROP TABLE IF EXISTS public.sql_vault_access_audit_logs CASCADE;

-- 3. Cleanup functions related to removed tables
DROP FUNCTION IF EXISTS public.is_vault_verified(uuid);
DROP FUNCTION IF EXISTS public.request_vault_otp();
DROP FUNCTION IF EXISTS public.verify_vault_otp(text);

COMMIT;
