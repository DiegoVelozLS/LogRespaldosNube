-- =====================================================
-- RBAC SETUP: Roles y Permisos Dinámicos
-- =====================================================

-- 1. Crear tabla de ROLES
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Crear tabla de PERMISOS por rol
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_key TEXT NOT NULL,
    PRIMARY KEY (role_id, permission_key)
);

-- 3. Modificar tabla public.users para incluir role_id
-- Primero añadimos la columna como anulable
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id);

-- 4. Insertar roles iniciales
INSERT INTO public.roles (name, description) VALUES 
('ADMIN', 'Administrador con acceso total'),
('TECH', 'Técnico operativo'),
('SUPERVISOR', 'Supervisor de reportes')
ON CONFLICT (name) DO NOTHING;

-- 5. Asignar permisos iniciales a cada rol
-- ADMIN: Todo
DO $$
DECLARE 
    admin_id UUID;
    tech_id UUID;
    supervisor_id UUID;
    features TEXT[] := ARRAY['dashboard', 'calendar', 'register', 'clients', 'reports', 'admin'];
    f TEXT;
BEGIN
    SELECT id INTO admin_id FROM public.roles WHERE name = 'ADMIN';
    SELECT id INTO tech_id FROM public.roles WHERE name = 'TECH';
    SELECT id INTO supervisor_id FROM public.roles WHERE name = 'SUPERVISOR';

    -- Permisos ADMIN
    FOREACH f IN ARRAY features LOOP
        INSERT INTO public.role_permissions (role_id, permission_key)
        VALUES (admin_id, f) ON CONFLICT DO NOTHING;
    END LOOP;

    -- Permisos TECH
    FOREACH f IN ARRAY ARRAY['dashboard', 'calendar', 'register', 'clients', 'reports'] LOOP
        INSERT INTO public.role_permissions (role_id, permission_key)
        VALUES (tech_id, f) ON CONFLICT DO NOTHING;
    END LOOP;

    -- Permisos SUPERVISOR
    FOREACH f IN ARRAY ARRAY['dashboard', 'clients', 'reports'] LOOP
        INSERT INTO public.role_permissions (role_id, permission_key)
        VALUES (supervisor_id, f) ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

-- 6. Migrar usuarios existentes
UPDATE public.users u
SET role_id = r.id
FROM public.roles r
WHERE u.role = r.name AND u.role_id IS NULL;

-- 7. Actualizar función handle_new_user para que asigne role_id automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role_id UUID;
BEGIN
  -- Buscar el ID del rol TECH por defecto o el que venga en metadata
  SELECT id INTO default_role_id FROM public.roles WHERE name = COALESCE(new.raw_user_meta_data->>'role', 'TECH');
  
  INSERT INTO public.users (id, email, name, last_name, role, role_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', 'Usuario'),
    COALESCE(new.raw_user_meta_data->>'last_name', 'Nuevo'),
    COALESCE(new.raw_user_meta_data->>'role', 'TECH'),
    default_role_id
  )
  ON CONFLICT (id) DO UPDATE SET
    role_id = EXCLUDED.role_id,
    role = EXCLUDED.role;
    
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Seguridad (RLS)
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Política para que cualquier usuario autenticado pueda ver roles y permisos
DROP POLICY IF EXISTS "Permitir lectura de roles a usuarios autenticados" ON public.roles;
CREATE POLICY "Permitir lectura de roles a usuarios autenticados"
ON public.roles FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Permitir lectura de permisos a usuarios autenticados" ON public.role_permissions;
CREATE POLICY "Permitir lectura de permisos a usuarios autenticados"
ON public.role_permissions FOR SELECT
TO authenticated
USING (true);

-- Política para que solo ADMIN pueda gestionar roles (Insert, Update, Delete)
DROP POLICY IF EXISTS "Permitir gestión total de roles a Admins" ON public.roles;
CREATE POLICY "Permitir gestión total de roles a Admins"
ON public.roles FOR ALL
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

DROP POLICY IF EXISTS "Permitir gestión total de permisos a Admins" ON public.role_permissions;
CREATE POLICY "Permitir gestión total de permisos a Admins"
ON public.role_permissions FOR ALL
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
