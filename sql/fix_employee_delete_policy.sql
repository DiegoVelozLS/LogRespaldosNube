-- ================================================================
-- CORRECCIÓN DE POLÍTICAS RLS PARA ELIMINAR EMPLEADOS
-- Ejecuta este script en el Editor SQL de Supabase
-- ================================================================

-- 1. Eliminar TODAS las políticas existentes de employees para evitar conflictos
DROP POLICY IF EXISTS "Empleados visibles para todos los autenticados" ON public.employees;
DROP POLICY IF EXISTS "Empleados insertables por Admin/RRHH" ON public.employees;
DROP POLICY IF EXISTS "Empleados actualizables por Admin/RRHH o el mismo empleado" ON public.employees;
DROP POLICY IF EXISTS "Empleados eliminables por Admin/RRHH" ON public.employees;

-- 2. Asegurarse de que RLS esté habilitado
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- 3. Crear políticas limpias y correctas

-- SELECT: Todos los usuarios autenticados pueden ver empleados
CREATE POLICY "employees_select_authenticated" ON public.employees
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Solo ADMIN o RRHH pueden crear empleados
CREATE POLICY "employees_insert_admin_rrhh" ON public.employees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() 
      AND users.role IN ('ADMIN', 'RRHH')
    )
  );

-- UPDATE: ADMIN, RRHH, o el propio empleado pueden actualizar
CREATE POLICY "employees_update_admin_rrhh_self" ON public.employees
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() 
      AND users.role IN ('ADMIN', 'RRHH')
    )
  )
  WITH CHECK (
    user_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() 
      AND users.role IN ('ADMIN', 'RRHH')
    )
  );

-- DELETE: Solo ADMIN o RRHH pueden eliminar empleados
CREATE POLICY "employees_delete_admin_rrhh" ON public.employees
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() 
      AND users.role IN ('ADMIN', 'RRHH')
    )
  );

-- 4. OPCIONAL: Si el rol RRHH no existe, crearlo
INSERT INTO public.roles (name, description) 
VALUES ('RRHH', 'Recursos Humanos - Gestión de personal')
ON CONFLICT (name) DO NOTHING;

-- 5. Asignar permisos al rol RRHH si existe
DO $$
DECLARE 
    rrhh_id UUID;
BEGIN
    SELECT id INTO rrhh_id FROM public.roles WHERE name = 'RRHH';
    
    IF rrhh_id IS NOT NULL THEN
        INSERT INTO public.role_permissions (role_id, permission_key)
        VALUES 
            (rrhh_id, 'dashboard'),
            (rrhh_id, 'calendar'),
            (rrhh_id, 'employees'),
            (rrhh_id, 'clients')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 6. Verificar que las políticas se crearon correctamente
SELECT 
    policyname, 
    cmd, 
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'employees';
