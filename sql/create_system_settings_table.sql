-- Tabla para configuraciones globales del sistema (visibilidad de módulos, flags, etc.)
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 1. Permitir lectura a todos los usuarios autenticados
DROP POLICY IF EXISTS "Permitir lectura de configuraciones a usuarios autenticados" ON public.system_settings;
CREATE POLICY "Permitir lectura de configuraciones a usuarios autenticados"
  ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. Permitir inserción/actualización únicamente a administradores
DROP POLICY IF EXISTS "Permitir modificar configuraciones solo a administradores" ON public.system_settings;
CREATE POLICY "Permitir modificar configuraciones solo a administradores"
  ON public.system_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid()
      AND public.users.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid()
      AND public.users.role = 'ADMIN'
    )
  );

-- Insertar configuraciones iniciales por defecto para los módulos de tareas programadas
INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('module_backups_panel', 'true'::jsonb, 'Visibilidad de la página Panel de respaldos'),
  ('module_backups_register', 'true'::jsonb, 'Visibilidad de la página Registrar respaldos'),
  ('module_backups_reports', 'true'::jsonb, 'Visibilidad de la página Reportes de respaldos')
ON CONFLICT (key) DO NOTHING;
