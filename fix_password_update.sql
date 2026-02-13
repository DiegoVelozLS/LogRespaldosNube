-- ================================================================
-- SCRIPT PARA ACTUALIZAR CONTRASEÑAS (ADMIN ONLY)
-- Ejecuta este script en el Editor SQL de Supabase
-- ================================================================

-- 1. Habilitar extensión pgcrypto (necesaria para hashear passwords)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Función RPC para actualizar contraseña de otro usuario
-- Esta función:
--   a) Verifica si quien la llama es ADMIN
--   b) Actualiza el campo encrypted_password en auth.users
--   c) Actualiza el timestamp updated_at

CREATE OR REPLACE FUNCTION public.admin_update_password(target_user_id UUID, new_password TEXT)
RETURNS VOID AS $$
BEGIN
  -- Verificar si el usuario que ejecuta la función es ADMIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'ADMIN'
  ) THEN
    RAISE EXCEPTION 'Access denied. Only Admins can change other users passwords.';
  END IF;

  -- Actualizar la contraseña en auth.users
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = NOW()
  WHERE id = target_user_id;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
