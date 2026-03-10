-- ================================================================
-- SCRIPT PARA CREAR LA TABLA DE CONTACTOS DE CLIENTES
-- Ejecuta este script en el Editor SQL de Supabase
-- ================================================================

-- 1. Crear la tabla de contactos
CREATE TABLE IF NOT EXISTS public.client_contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índice para búsquedas por cliente
CREATE INDEX IF NOT EXISTS idx_client_contacts_client_id
    ON public.client_contacts(client_id);

-- 3. Habilitar RLS
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de acceso
-- "Todos los usuarios autenticados pueden ver los contactos"
CREATE POLICY "Auth users can view client contacts" ON public.client_contacts
    FOR SELECT TO authenticated USING (true);

-- "Solo Admins pueden modificar los contactos"
CREATE POLICY "Admins can modify client contacts" ON public.client_contacts
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
    );

-- 5. Trigger para actualizar updated_at
CREATE TRIGGER update_client_contacts_updated_at
    BEFORE UPDATE ON public.client_contacts
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
