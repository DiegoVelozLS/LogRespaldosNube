-- ================================================================
-- ACTUALIZACIÓN DE POLÍTICAS RLS PARA EMPLEADOS (TECH/SOPORTE)
-- Ejecuta este script en el Editor SQL de Supabase para permitir
-- que los roles TECH y SOPORTE puedan gestionar el directorio.
-- ================================================================

BEGIN;

-- 1. Eliminar las políticas actuales para evitar duplicados/conflictos
DROP POLICY IF EXISTS "employees_insert_admin_rrhh" ON public.employees;
DROP POLICY IF EXISTS "employees_update_admin_rrhh_self" ON public.employees;
DROP POLICY IF EXISTS "employees_delete_admin_rrhh" ON public.employees;
DROP POLICY IF EXISTS "Empleados insertables por Admin/RRHH" ON public.employees;
DROP POLICY IF EXISTS "Empleados actualizables por Admin/RRHH o el mismo empleado" ON public.employees;
DROP POLICY IF EXISTS "Empleados eliminables por Admin/RRHH" ON public.employees;

-- 2. Asegurarse de que RLS esté habilitado
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- 3. Crear políticas actualizadas incluyendo TECH y SOPORTE

-- INSERT: ADMIN, RRHH, TECH o SOPORTE pueden crear empleados
CREATE POLICY "employees_insert_authorized_roles" ON public.employees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() 
      AND users.role IN ('ADMIN', 'RRHH', 'TECH', 'SOPORTE')
    )
  );

-- UPDATE: ADMIN, RRHH, TECH, SOPORTE, o el propio empleado pueden actualizar
CREATE POLICY "employees_update_authorized_roles_self" ON public.employees
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() 
      AND users.role IN ('ADMIN', 'RRHH', 'TECH', 'SOPORTE')
    )
  )
  WITH CHECK (
    user_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() 
      AND users.role IN ('ADMIN', 'RRHH', 'TECH', 'SOPORTE')
    )
  );

-- DELETE: ADMIN, RRHH, TECH o SOPORTE pueden eliminar empleados
CREATE POLICY "employees_delete_authorized_roles" ON public.employees
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() 
      AND users.role IN ('ADMIN', 'RRHH', 'TECH', 'SOPORTE')
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
WHERE tablename = 'employees';
