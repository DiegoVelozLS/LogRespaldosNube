-- ================================================================
-- ADMIN RESET DE PIN DE BOVEDA + AUDITORIA
-- Ejecutar en Supabase SQL Editor
-- ================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_reset_user_vault_pin(
  p_target_user_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_actor_name text;
  v_target_name text;
  v_rows_updated integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = v_actor_id
      AND role = 'ADMIN'
  ) THEN
    RAISE EXCEPTION 'Only admins can reset vault pin';
  END IF;

  SELECT trim(coalesce(name, '') || ' ' || coalesce(last_name, ''))
  INTO v_target_name
  FROM public.users
  WHERE id = p_target_user_id;

  IF v_target_name IS NULL THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;

  UPDATE public.users
  SET vault_pin = NULL
  WHERE id = p_target_user_id;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  IF v_rows_updated = 0 THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;

  SELECT trim(coalesce(name, '') || ' ' || coalesce(last_name, ''))
  INTO v_actor_name
  FROM public.users
  WHERE id = v_actor_id;

  INSERT INTO public.vault_audit_logs (
    credential_id,
    credential_title,
    vault_category_id,
    actor_user_id,
    action,
    created_at
  ) VALUES (
    NULL,
    'Reset PIN de ' || coalesce(nullif(v_target_name, ''), p_target_user_id::text) ||
      CASE
        WHEN p_reason IS NOT NULL AND length(trim(p_reason)) > 0 THEN ' | Motivo: ' || trim(p_reason)
        ELSE ''
      END,
    NULL,
    v_actor_id,
    'RESET_USER_PIN',
    now()
  );

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reset_user_vault_pin(uuid, text) TO authenticated;

COMMIT;
