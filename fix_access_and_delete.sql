-- ================================================================
-- SCRIPT DE CORRECCIÓN DE PERMISOS Y ELIMINACIÓN DE USUARIOS
-- Ejecuta este script en el Editor SQL de Supabase
-- ================================================================

-- 1. SOLUCIÓN: PERMITIR A LOS ADMINS ACTUALIZAR USUARIOS
-- Primero eliminamos la política si ya existe para evitar errores
DROP POLICY IF EXISTS "Admins can update profiles" ON public.users;

-- Creamos la política que permite UPDATE solo a usuarios con rol ADMIN
CREATE POLICY "Admins can update profiles" ON public.users
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- 2. SOLUCIÓN: FUNCIÓN PARA BORRAR USUARIOS COMPLETAMENTE (DE AUTH.USERS)
-- Como auth.users está protegido, necesitamos una función segura (SECURITY DEFINER)
-- que se ejecute con permisos elevados, pero que internamente verifique si quien llama es ADMIN.

CREATE OR REPLACE FUNCTION public.delete_user_completely(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Verificar si el usuario que ejecuta la función es ADMIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'ADMIN'
  ) THEN
    RAISE EXCEPTION 'Access denied. Only Admins can delete users.';
  END IF;

  -- Prevenir que un admin se borre a sí mismo (opcional, pero recomendado)
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot delete your own account via this function.';
  END IF;

  -- Eliminar de auth.users (esto provocará CASCADE a public.users gracias a la FK)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
