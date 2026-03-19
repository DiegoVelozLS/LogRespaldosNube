-- Crear tabla employees
CREATE TABLE IF NOT EXISTS public.employees (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text, -- Opcional, por si se vincula a una cuenta (auth.users)
  name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  department text NOT NULL,
  position text NOT NULL,
  phone text,
  extension text,
  birthday date,
  hire_date date,
  photo_url text,
  role text DEFAULT 'EMPLOYEE',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Políticas para employees
CREATE POLICY "Empleados visibles para todos los autenticados" ON public.employees
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Empleados insertables por Admin/RRHH" ON public.employees
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() 
      AND (users.role = 'ADMIN' OR users.role = 'RRHH')
    )
  );

CREATE POLICY "Empleados actualizables por Admin/RRHH o el mismo empleado" ON public.employees
  FOR UPDATE USING (
    (user_id = auth.uid()::text) OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() 
      AND (users.role = 'ADMIN' OR users.role = 'RRHH')
    )
  );

CREATE POLICY "Empleados eliminables por Admin/RRHH" ON public.employees
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() 
      AND (users.role = 'ADMIN' OR users.role = 'RRHH')
    )
  );
