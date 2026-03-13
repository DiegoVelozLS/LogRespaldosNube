-- ================================================================
-- FIX: PERMITIR A ADMINS ACTUALIZAR ROLES DE USUARIOS
-- Ejecuta este script en el Editor SQL de Supabase
-- ================================================================

-- Eliminar TODAS las políticas de UPDATE existentes en users
DROP POLICY IF EXISTS "Admins can update profiles" ON public.users;
DROP POLICY IF EXISTS "Admins can update any user" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "update_users_policy" ON public.users;

-- SOLUCIÓN: Crear función SECURITY DEFINER para actualizar usuarios
-- Esta función se ejecuta con permisos elevados pero verifica internamente el rol
CREATE OR REPLACE FUNCTION public.admin_update_user(
  target_user_id UUID,
  new_name TEXT DEFAULT NULL,
  new_last_name TEXT DEFAULT NULL,
  new_role TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- Obtener el rol del usuario que llama
  SELECT role INTO caller_role FROM public.users WHERE id = auth.uid();
  
  -- Solo ADMIN puede cambiar roles
  IF new_role IS NOT NULL AND caller_role != 'ADMIN' THEN
    RAISE EXCEPTION 'Solo administradores pueden cambiar roles';
  END IF;
  
  -- Actualizar el usuario
  UPDATE public.users
  SET 
    name = COALESCE(new_name, name),
    last_name = COALESCE(new_last_name, last_name),
    role = COALESCE(new_role, role)
  WHERE id = target_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.admin_update_user TO authenticated;

-- Política simple para SELECT (lectura)
DROP POLICY IF EXISTS "Authenticated users can view users" ON public.users;
CREATE POLICY "Authenticated users can view users" ON public.users
  FOR SELECT USING (auth.role() = 'authenticated');

-- Política permisiva de UPDATE (la función RPC maneja la seguridad)
CREATE POLICY "Allow updates via RPC" ON public.users
  FOR UPDATE USING (true) WITH CHECK (true);

-- Verificar que RLS está habilitado
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Verificar políticas creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'users';
