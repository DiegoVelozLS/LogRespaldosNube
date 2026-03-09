-- Actualizar políticas RLS de empleados para permitir UPDATE y DELETE a usuarios ADMIN o RRHH

-- Primero, eliminamos las políticas problemáticas creadas anteriormente (si existen)
DROP POLICY IF EXISTS "Empleados actualizables por Admin/RRHH o el mismo empleado" ON public.employees;
DROP POLICY IF EXISTS "Empleados eliminables por Admin/RRHH" ON public.employees;

-- Recreamos la política de UPDATE
CREATE POLICY "Empleados actualizables por Admin/RRHH o el mismo empleado" ON public.employees
  FOR UPDATE USING (
    (user_id = auth.uid()::text) OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() 
      AND (users.role = 'ADMIN' OR users.role = 'RRHH')
    )
  )
  WITH CHECK (
    (user_id = auth.uid()::text) OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() 
      AND (users.role = 'ADMIN' OR users.role = 'RRHH')
    )
  );

-- Recreamos la política de DELETE (solo ADMIN/RRHH)
CREATE POLICY "Empleados eliminables por Admin/RRHH" ON public.employees
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() 
      AND (users.role = 'ADMIN' OR users.role = 'RRHH')
    )
  );
