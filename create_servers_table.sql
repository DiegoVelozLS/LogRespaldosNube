-- Tabla SERVIDORES
CREATE TABLE public.servers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Permitir lectura para todos los usuarios"
ON public.servers FOR SELECT
USING (true);

CREATE POLICY "Permitir gestión total para administradores"
ON public.servers FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'ADMIN'
    )
);
