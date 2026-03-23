-- ================================================================
-- ACTUALIZACIÓN DE PERMISOS RLS PARA ANUNCIOS
-- ================================================================
-- Crea/Edita: Todos los roles (ADMIN, TECH, SOPORTE, RRHH, EMPLOYEE)
-- Elimina: Solo ADMIN
-- ================================================================

BEGIN;

-- 1. Eliminar políticas antiguas para evitar conflictos
DROP POLICY IF EXISTS "Todos pueden ver anuncios" ON public.announcements;
DROP POLICY IF EXISTS "Admin, Tech y Soporte can insert announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admin, Tech y Soporte can update announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins y Techs can delete announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can insert announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can update announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can delete announcements" ON public.announcements;
DROP POLICY IF EXISTS "All users can view announcements" ON public.announcements;

-- 2. Asegurarse de que RLS esté habilitado
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- 3. Crear nuevas políticas

-- SELECT: Todos los usuarios autenticados pueden ver anuncios
CREATE POLICY "announcements_select_authenticated" ON public.announcements
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Todos los roles pueden crear anuncios
-- Usamos una verificación simple de autenticación ya que "todos" incluye a todos los que pueden entrar
CREATE POLICY "announcements_insert_all_roles" ON public.announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid())
  );

-- UPDATE: Todos los roles pueden editar anuncios
CREATE POLICY "announcements_update_all_roles" ON public.announcements
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid())
  );

-- DELETE: Solo ADMIN puede eliminar anuncios
CREATE POLICY "announcements_delete_admin_only" ON public.announcements
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'ADMIN'
    )
  );

COMMIT;

-- Verificación final
SELECT 
    policyname, 
    cmd, 
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'announcements';
