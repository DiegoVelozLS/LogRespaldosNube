-- ================================================================
-- SCRIPT PARA CREAR LA TABLA DE CLIENTES (DIRECTORIO)
-- Ejecuta este script en el Editor SQL de Supabase
-- ================================================================

-- 1. Crear la tabla de clientes
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_name TEXT NOT NULL,
    client_ruc TEXT NOT NULL,
    owner_company TEXT NOT NULL,
    owner_ruc TEXT NOT NULL,
    db_name TEXT NOT NULL,
    server TEXT NOT NULL,
    group_code TEXT NOT NULL,
    subscription_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de acceso
-- "Todos los usuarios autenticados pueden ver el directorio"
CREATE POLICY "Auth users can view clients" ON public.clients
    FOR SELECT TO authenticated USING (true);

-- "Solo Admins pueden modificar el directorio"
CREATE POLICY "Admins can modify clients" ON public.clients
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
    );

-- 4. Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
