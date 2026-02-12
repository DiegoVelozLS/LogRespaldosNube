-- =====================================================
-- SUPABASE CLEAN SETUP (Solo Email/Password)
-- =====================================================

-- 1. LIMPIEZA TOTAL (Borrar tablas anteriores)
DROP TABLE IF EXISTS public.backup_logs CASCADE;
DROP TABLE IF EXISTS public.backup_schedules CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- 2. CREACIÓN DE TABLAS

-- Tabla USERS (Perfiles extendidos)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'TECH' CHECK (role IN ('ADMIN', 'TECH', 'SUPERVISOR')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla BACKUP_SCHEDULES
CREATE TABLE public.backup_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('DATABASE', 'FTP', 'EXTERNAL_DISK', 'CLOUD')),
    frequency TEXT NOT NULL CHECK (frequency IN ('DAILY', 'WEEKLY', 'CUSTOM')),
    days_of_week INTEGER[], -- Array de números 0-6 (0=Domingo)
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla BACKUP_LOGS
CREATE TABLE public.backup_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_id UUID REFERENCES public.backup_schedules(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'COMPLETED', 'WARNING', 'FAILED')),
    notes TEXT,
    date_str TEXT NOT NULL, -- Formato YYYY-MM-DD
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 3. FUNCIÓN AUTOMÁTICA PARA CREAR USUARIOS
-- Esto crea automáticamente el perfil en public.users cuando se registra un usuario en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, last_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', 'Usuario'),
    COALESCE(new.raw_user_meta_data->>'last_name', 'Nuevo'),
    COALESCE(new.raw_user_meta_data->>'role', 'TECH')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que ejecuta la función
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 4. SEGURIDAD (RLS - Row Level Security) - PERMISIVA PARA EVITAR ERRORES DE LOGIN
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para USERS
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- "Admins pueden ver todos los usuarios"
CREATE POLICY "Admins can view all profiles" ON public.users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Políticas para SCHEDULES Y LOGS
-- "Todos los usuarios autenticados pueden ver schedules y logs"
CREATE POLICY "Auth users can view schedules" ON public.backup_schedules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Auth users can view logs" ON public.backup_logs
  FOR SELECT TO authenticated USING (true);

-- "Solo admins y techs pueden crear/editar"
CREATE POLICY "Admins/Techs can modify schedules" ON public.backup_schedules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'TECH'))
  );

CREATE POLICY "Admins/Techs can modify logs" ON public.backup_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'TECH'))
  );


-- 5. DATOS INICIALES (Opcional)
INSERT INTO public.backup_schedules (name, type, frequency, days_of_week, description) VALUES
('Base de Datos PostgreSQL Principal', 'DATABASE', 'DAILY', NULL, 'Volcado crítico diario.'),
('Almacenamiento FTP Legado', 'FTP', 'WEEKLY', ARRAY[1], 'Sincronización semanal.'),
('Respaldo Nube AWS S3', 'CLOUD', 'CUSTOM', ARRAY[1, 3, 5], 'Sincronización crítica.');
