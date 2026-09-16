-- ================================================================
-- MIGRACIÓN: TÚNELES VPN (MULTI-TÚNEL)
-- Ejecuta este script en el SQL Editor de Supabase
-- ================================================================
-- Cada túnel tiene su propio endpoint, clave pública y prefijo de
-- direccionamiento. El esquema de IP pasa a ser:
--     [prefijo].[Empresa].[PC]      ej: 10.0.5.1  /  10.1.5.1
-- ================================================================

-- 1. TABLA: vpn_tunnels
CREATE TABLE IF NOT EXISTS public.vpn_tunnels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,                              -- Nombre visible (ej: Túnel Principal)
    kind TEXT NOT NULL DEFAULT 'wireguard'
        CHECK (kind IN ('wireguard', 'radmin')),     -- Tipo de acceso remoto
    endpoint_host TEXT,                              -- IP pública o dominio del servidor
    listen_port INTEGER,                             -- Puerto de escucha (ej: 51820)
    server_public_key TEXT,                          -- Clave pública del servidor WireGuard
    dns TEXT DEFAULT '1.1.1.1',                      -- DNS para el cliente
    client_allowed_ips TEXT,                         -- AllowedIPs del lado cliente
    address_prefix TEXT,                             -- Primeros dos octetos (ej: 10.0 / 10.1)
    address_cidr INTEGER DEFAULT 16,                 -- Máscara del Address del cliente
    persistent_keepalive INTEGER DEFAULT 25,
    file_prefix TEXT DEFAULT 'Lsoft-VPN',            -- Prefijo del archivo .conf descargado
    sort_order INTEGER DEFAULT 0,                    -- Orden de las pestañas
    status TEXT NOT NULL DEFAULT 'Activo'
        CHECK (status IN ('Activo', 'Inactivo', 'Mantenimiento')),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Vincular empresas a un túnel
ALTER TABLE public.vpn_companies
ADD COLUMN IF NOT EXISTS tunnel_id UUID REFERENCES public.vpn_tunnels(id) ON DELETE RESTRICT;

-- 3. Columnas de vpn_peers
-- private_key viene de la migración anterior; se repite aquí para que este
-- script funcione aunque aquella no se haya ejecutado.
ALTER TABLE public.vpn_peers
ADD COLUMN IF NOT EXISTS private_key TEXT;

-- notes se usa en los túneles tipo Radmin (ficha informativa)
ALTER TABLE public.vpn_peers
ADD COLUMN IF NOT EXISTS notes TEXT;

-- En Radmin no hay claves ni IP de WireGuard: esas columnas pasan a ser opcionales
ALTER TABLE public.vpn_peers ALTER COLUMN public_key DROP NOT NULL;
ALTER TABLE public.vpn_peers ALTER COLUMN ip DROP NOT NULL;

-- 4. SEMILLA: los tres túneles actuales
INSERT INTO public.vpn_tunnels (
    name, kind, endpoint_host, listen_port, server_public_key,
    dns, client_allowed_ips, address_prefix, address_cidr,
    persistent_keepalive, file_prefix, sort_order
)
SELECT
    'Túnel Principal', 'wireguard', '20.242.117.143', 51820,
    'p9YbHVGQh5r7RsoW2zc9iAGGSkCavdbpidlpEVFzY24=',
    '1.1.1.1', '10.0.0.1/32', '10.0', 16, 25, 'Lsoft-VPN', 1
WHERE NOT EXISTS (SELECT 1 FROM public.vpn_tunnels WHERE name = 'Túnel Principal');

INSERT INTO public.vpn_tunnels (
    name, kind, endpoint_host, listen_port, server_public_key,
    dns, client_allowed_ips, address_prefix, address_cidr,
    persistent_keepalive, file_prefix, sort_order
)
SELECT
    'Túnel Secundario', 'wireguard', '20.242.117.143', 51821,
    'H2N+c+6tPnsGnKGkOenNKk+Z3kbZu25hHjUoqZJDFws=',
    '1.1.1.1', '10.1.0.1/16', '10.1', 16, 25, 'Lsoft-VPN-T2', 2
WHERE NOT EXISTS (SELECT 1 FROM public.vpn_tunnels WHERE name = 'Túnel Secundario');

INSERT INTO public.vpn_tunnels (name, kind, file_prefix, sort_order)
SELECT 'Radmin', 'radmin', 'Radmin', 3
WHERE NOT EXISTS (SELECT 1 FROM public.vpn_tunnels WHERE name = 'Radmin');

-- 5. Asignar las empresas ya existentes al túnel principal
UPDATE public.vpn_companies
SET tunnel_id = (SELECT id FROM public.vpn_tunnels WHERE name = 'Túnel Principal' LIMIT 1)
WHERE tunnel_id IS NULL;

-- 6. El número de empresa (X) ahora es único POR TÚNEL, no a nivel global
ALTER TABLE public.vpn_companies DROP CONSTRAINT IF EXISTS vpn_companies_company_number_key;
ALTER TABLE public.vpn_companies DROP CONSTRAINT IF EXISTS vpn_companies_vpn_number_key;
ALTER TABLE public.vpn_companies DROP CONSTRAINT IF EXISTS unique_tunnel_company_number;
ALTER TABLE public.vpn_companies
    ADD CONSTRAINT unique_tunnel_company_number UNIQUE (tunnel_id, company_number);

CREATE INDEX IF NOT EXISTS idx_vpn_companies_tunnel ON public.vpn_companies(tunnel_id);

-- 7. TRIGGER de updated_at para la nueva tabla
DROP TRIGGER IF EXISTS trg_vpn_tunnels_updated_at ON public.vpn_tunnels;
CREATE TRIGGER trg_vpn_tunnels_updated_at
    BEFORE UPDATE ON public.vpn_tunnels
    FOR EACH ROW
    EXECUTE FUNCTION update_vpn_updated_at();

-- 8. SEGURIDAD (RLS) para vpn_tunnels
ALTER TABLE public.vpn_tunnels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vpn_tunnels_select_policy" ON public.vpn_tunnels;
CREATE POLICY "vpn_tunnels_select_policy" ON public.vpn_tunnels
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('ADMIN', 'TECH', 'SOPORTE')
        )
    );

-- Crear, editar y eliminar túneles es exclusivo del administrador
DROP POLICY IF EXISTS "vpn_tunnels_insert_policy" ON public.vpn_tunnels;
CREATE POLICY "vpn_tunnels_insert_policy" ON public.vpn_tunnels
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role = 'ADMIN'
        )
    );

DROP POLICY IF EXISTS "vpn_tunnels_update_policy" ON public.vpn_tunnels;
CREATE POLICY "vpn_tunnels_update_policy" ON public.vpn_tunnels
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role = 'ADMIN'
        )
    );

DROP POLICY IF EXISTS "vpn_tunnels_delete_policy" ON public.vpn_tunnels;
CREATE POLICY "vpn_tunnels_delete_policy" ON public.vpn_tunnels
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role = 'ADMIN'
        )
    );

-- 9. Confirmar que ADMIN y TECH pueden eliminar empresas y equipos
DROP POLICY IF EXISTS "vpn_companies_delete_policy" ON public.vpn_companies;
CREATE POLICY "vpn_companies_delete_policy" ON public.vpn_companies
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('ADMIN', 'TECH')
        )
    );

DROP POLICY IF EXISTS "vpn_peers_delete_policy" ON public.vpn_peers;
CREATE POLICY "vpn_peers_delete_policy" ON public.vpn_peers
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('ADMIN', 'TECH')
        )
    );

-- ================================================================
-- 10. FUNCIONES RPC ACTUALIZADAS
-- ================================================================

-- Crear empresa dentro de un túnel específico
DROP FUNCTION IF EXISTS public.create_vpn_company(TEXT, TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.create_vpn_company(TEXT, TEXT, TEXT, INTEGER, UUID);

CREATE OR REPLACE FUNCTION public.create_vpn_company(
    p_name TEXT,
    p_group_name TEXT DEFAULT NULL,
    p_status TEXT DEFAULT 'Activo',
    p_manual_company_number INTEGER DEFAULT NULL,
    p_tunnel_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_tunnel RECORD;
    v_company_number INTEGER;
    v_vpn_number TEXT;
    v_vpn_range TEXT;
    v_new_company RECORD;
BEGIN
    -- Si no se envía túnel, usar el principal (menor sort_order)
    IF p_tunnel_id IS NULL THEN
        SELECT * INTO v_tunnel FROM public.vpn_tunnels ORDER BY sort_order, created_at LIMIT 1;
    ELSE
        SELECT * INTO v_tunnel FROM public.vpn_tunnels WHERE id = p_tunnel_id FOR UPDATE;
    END IF;

    IF v_tunnel IS NULL THEN
        RAISE EXCEPTION 'No existe el túnel indicado.';
    END IF;

    -- El número de empresa se calcula dentro del túnel
    IF p_manual_company_number IS NOT NULL AND p_manual_company_number > 0 THEN
        v_company_number := p_manual_company_number;
    ELSE
        SELECT COALESCE(MAX(company_number), 0) + 1
        INTO v_company_number
        FROM public.vpn_companies
        WHERE tunnel_id = v_tunnel.id;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.vpn_companies
        WHERE tunnel_id = v_tunnel.id AND company_number = v_company_number
    ) THEN
        RAISE EXCEPTION 'El número de empresa % ya está registrado en el túnel %.', v_company_number, v_tunnel.name;
    END IF;

    v_vpn_number := COALESCE(v_tunnel.file_prefix, 'Lsoft-VPN') || '-' || LPAD(v_company_number::TEXT, 2, '0');

    IF v_tunnel.kind = 'radmin' OR v_tunnel.address_prefix IS NULL THEN
        v_vpn_range := 'N/A';
    ELSE
        v_vpn_range := v_tunnel.address_prefix || '.' || v_company_number || '.0/24';
    END IF;

    INSERT INTO public.vpn_companies (
        tunnel_id, company_number, name, group_name,
        vpn_number, vpn_range, status, created_by
    ) VALUES (
        v_tunnel.id, v_company_number, TRIM(p_name), NULLIF(TRIM(p_group_name), ''),
        v_vpn_number, v_vpn_range, p_status, auth.uid()
    )
    RETURNING * INTO v_new_company;

    RETURN to_jsonb(v_new_company);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear equipo calculando la IP según el prefijo del túnel de su empresa
DROP FUNCTION IF EXISTS public.create_vpn_peer(UUID, TEXT, TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.create_vpn_peer(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.create_vpn_peer(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.create_vpn_peer(
    p_company_id UUID,
    p_device_name TEXT,
    p_user_name TEXT,
    p_public_key TEXT DEFAULT NULL,
    p_manual_pc_number INTEGER DEFAULT NULL,
    p_private_key TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_company RECORD;
    v_tunnel RECORD;
    v_pc_number INTEGER;
    v_assigned_ip TEXT;
    v_new_peer RECORD;
BEGIN
    SELECT * INTO v_company
    FROM public.vpn_companies
    WHERE id = p_company_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Empresa con ID % no encontrada.', p_company_id;
    END IF;

    SELECT * INTO v_tunnel FROM public.vpn_tunnels WHERE id = v_company.tunnel_id;

    IF p_manual_pc_number IS NOT NULL AND p_manual_pc_number > 0 THEN
        v_pc_number := p_manual_pc_number;
    ELSE
        SELECT COALESCE(MAX(pc_number), 0) + 1
        INTO v_pc_number
        FROM public.vpn_peers
        WHERE company_id = p_company_id;
    END IF;

    IF EXISTS (SELECT 1 FROM public.vpn_peers WHERE company_id = p_company_id AND pc_number = v_pc_number) THEN
        RAISE EXCEPTION 'El número de PC % ya existe para esta empresa.', v_pc_number;
    END IF;

    -- Radmin no usa direccionamiento WireGuard
    IF v_tunnel IS NULL OR v_tunnel.kind = 'radmin' OR v_tunnel.address_prefix IS NULL THEN
        v_assigned_ip := NULL;
    ELSE
        v_assigned_ip := v_tunnel.address_prefix || '.' || v_company.company_number || '.' || v_pc_number;

        IF EXISTS (SELECT 1 FROM public.vpn_peers WHERE ip = v_assigned_ip) THEN
            RAISE EXCEPTION 'La dirección IP % ya está asignada a otro equipo.', v_assigned_ip;
        END IF;
    END IF;

    INSERT INTO public.vpn_peers (
        company_id, pc_number, ip, device_name, user_name,
        public_key, private_key, notes, status, created_by
    ) VALUES (
        p_company_id, v_pc_number, v_assigned_ip,
        TRIM(p_device_name), TRIM(p_user_name),
        NULLIF(TRIM(COALESCE(p_public_key, '')), ''),
        p_private_key,
        NULLIF(TRIM(COALESCE(p_notes, '')), ''),
        'Activo', auth.uid()
    )
    RETURNING * INTO v_new_peer;

    RETURN to_jsonb(v_new_peer);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 11. REFRESCAR EL CACHÉ DE ESQUEMA DE LA API
-- Sin esto, la API puede seguir reportando "Could not find the
-- 'private_key' column of 'vpn_peers' in the schema cache".
-- ================================================================
NOTIFY pgrst, 'reload schema';

-- ================================================================
-- VERIFICACIÓN: las tres filas deben aparecer con existe = true
-- ================================================================
SELECT 'private_key' AS columna,
       EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'vpn_peers'
               AND column_name = 'private_key') AS existe
UNION ALL
SELECT 'notes',
       EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'vpn_peers'
               AND column_name = 'notes')
UNION ALL
SELECT 'tunnel_id',
       EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'vpn_companies'
               AND column_name = 'tunnel_id')
UNION ALL
SELECT 'create_vpn_peer con p_notes',
       EXISTS (SELECT 1 FROM pg_proc
               WHERE proname = 'create_vpn_peer'
               AND pg_get_function_arguments(oid) LIKE '%p_notes%');
