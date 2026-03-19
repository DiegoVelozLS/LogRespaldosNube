-- ================================================================
-- FIX: REPARAR ACCESO DE GOOGLE PARA NUEVOS USUARIOS @LISTOSOFT.COM
-- Ejecuta este script en el Editor SQL de Supabase
-- ================================================================

-- 1. Actualizar la restricción (CHECK constraint) del rol para permitir 'SOPORTE'
-- Primero intentamos eliminar la restricción si existe con el nombre por defecto
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- Volvemos a crear la restricción incluyendo 'SOPORTE'
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('ADMIN', 'TECH', 'SUPERVISOR', 'SOPORTE'));

-- 2. Modificar el Trigger de creación automática de usuarios
-- Para que el rol por defecto sea 'SOPORTE' y maneje mejor los apellidos vacíos de Google
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, last_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', 'Usuario'),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'SOPORTE')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear política RLS para permitir INSERT de perfiles
-- Esto asegura que si el trigger falla por alguna razón de asincronía,
-- la app ("getOrCreateUserProfile") pueda insertar el usuario manualmente.
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. Verificar políticas creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'users' AND cmd = 'INSERT';
