-- ================================================================
-- MIGRACIÓN: SERVIDORES VPN
-- Ejecuta este script en el SQL Editor de Supabase
-- ================================================================
-- Separa la gestión en servidores independientes. Cada túnel
-- pertenece a un solo servidor. Las empresas y los equipos siguen
-- colgando del túnel, así que cada servidor cuenta lo suyo.
-- El esquema de direcciones no cambia.
-- ================================================================

-- 1. TABLA: vpn_servers
CREATE TABLE IF NOT EXISTS public.vpn_servers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    host TEXT,                                       -- IP pública, solo como etiqueta
    sort_order INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Activo'
        CHECK (status IN ('Activo', 'Inactivo', 'Mantenimiento')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Semilla: el servidor que ya está en uso y uno nuevo, vacío
INSERT INTO public.vpn_servers (name, host, sort_order)
SELECT 'Servidor 1', '20.242.117.143', 1
WHERE NOT EXISTS (SELECT 1 FROM public.vpn_servers WHERE name = 'Servidor 1');

INSERT INTO public.vpn_servers (name, host, sort_order)
SELECT 'Servidor 2', NULL, 2
WHERE NOT EXISTS (SELECT 1 FROM public.vpn_servers WHERE name = 'Servidor 2');

-- 3. Cada túnel pertenece a un servidor
ALTER TABLE public.vpn_tunnels
ADD COLUMN IF NOT EXISTS server_id UUID REFERENCES public.vpn_servers(id) ON DELETE RESTRICT;

-- Los túneles que ya existen se quedan en el servidor actual
UPDATE public.vpn_tunnels
SET server_id = (SELECT id FROM public.vpn_servers WHERE name = 'Servidor 1' LIMIT 1)
WHERE server_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_vpn_tunnels_server ON public.vpn_tunnels(server_id);

-- 4. TRIGGER de updated_at
DROP TRIGGER IF EXISTS trg_vpn_servers_updated_at ON public.vpn_servers;
CREATE TRIGGER trg_vpn_servers_updated_at
    BEFORE UPDATE ON public.vpn_servers
    FOR EACH ROW
    EXECUTE FUNCTION update_vpn_updated_at();

-- 5. SEGURIDAD (RLS)
ALTER TABLE public.vpn_servers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vpn_servers_select_policy" ON public.vpn_servers;
CREATE POLICY "vpn_servers_select_policy" ON public.vpn_servers
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('ADMIN', 'TECH', 'SOPORTE')
        )
    );

DROP POLICY IF EXISTS "vpn_servers_insert_policy" ON public.vpn_servers;
CREATE POLICY "vpn_servers_insert_policy" ON public.vpn_servers
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role = 'ADMIN'
        )
    );

DROP POLICY IF EXISTS "vpn_servers_update_policy" ON public.vpn_servers;
CREATE POLICY "vpn_servers_update_policy" ON public.vpn_servers
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role = 'ADMIN'
        )
    );

DROP POLICY IF EXISTS "vpn_servers_delete_policy" ON public.vpn_servers;
CREATE POLICY "vpn_servers_delete_policy" ON public.vpn_servers
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role = 'ADMIN'
        )
    );
