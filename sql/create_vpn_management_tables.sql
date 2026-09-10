-- ================================================================
-- GESTIÓN DE VPN WIREGUARD - SCRIPT DE BASE DE DATOS (SUPABASE)
-- ================================================================
-- Esquema de direccionamiento: 10.0.[Empresa].[PC]
--   X = Número de Empresa (10.0.X.Y)
--   Y = Número de PC/Dispositivo (10.0.X.Y)
--
-- Ejecuta este script completo en el SQL Editor de tu proyecto Supabase.
-- ================================================================

-- 1. TABLA: vpn_companies (Empresas registradas en la VPN)
CREATE TABLE IF NOT EXISTS public.vpn_companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_number INTEGER NOT NULL UNIQUE,          -- Número X de la empresa (ej: 1, 2, 5...)
    name TEXT NOT NULL,                              -- Nombre de la empresa (ej: Listosoft Cia. Ltda.)
    group_name TEXT,                                 -- Grupo empresarial (opcional)
    vpn_number TEXT NOT NULL UNIQUE,                 -- Identificador visible (ej: VPN-1, VPN-005)
    vpn_range TEXT NOT NULL,                         -- Rango visible (ej: 10.0.5.0/24)
    status TEXT NOT NULL DEFAULT 'Activo' 
        CHECK (status IN ('Activo', 'Inactivo', 'Mantenimiento')),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA: vpn_peers (Dispositivos / PCs conectadas a la VPN)
CREATE TABLE IF NOT EXISTS public.vpn_peers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.vpn_companies(id) ON DELETE CASCADE,
    pc_number INTEGER NOT NULL,                      -- Número Y del dispositivo (ej: 1, 2, 3...)
    ip TEXT NOT NULL UNIQUE,                         -- IP asignada completa: 10.0.X.Y
    device_name TEXT NOT NULL,                       -- Nombre del equipo (ej: LAPTOP-JUAN)
    user_name TEXT NOT NULL,                         -- Usuario asignado (ej: jperez)
    public_key TEXT NOT NULL,                        -- Clave pública WireGuard del cliente
    private_key TEXT,                                -- Clave privada WireGuard (para consultar/exportar .conf)
    status TEXT NOT NULL DEFAULT 'Activo' 
        CHECK (status IN ('Activo', 'Inactivo')),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Restricción: No puede haber dos PCs con el mismo número Y en la misma empresa
    CONSTRAINT unique_company_pc_number UNIQUE (company_id, pc_number)
);

-- 3. ÍNDICES para optimizar consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_vpn_companies_number ON public.vpn_companies(company_number);
CREATE INDEX IF NOT EXISTS idx_vpn_peers_company_id ON public.vpn_peers(company_id);
CREATE INDEX IF NOT EXISTS idx_vpn_peers_ip ON public.vpn_peers(ip);

-- 4. TRIGGER: Actualización automática de updated_at
CREATE OR REPLACE FUNCTION update_vpn_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vpn_companies_updated_at ON public.vpn_companies;
CREATE TRIGGER trg_vpn_companies_updated_at
    BEFORE UPDATE ON public.vpn_companies
    FOR EACH ROW
    EXECUTE FUNCTION update_vpn_updated_at();

DROP TRIGGER IF EXISTS trg_vpn_peers_updated_at ON public.vpn_peers;
CREATE TRIGGER trg_vpn_peers_updated_at
    BEFORE UPDATE ON public.vpn_peers
    FOR EACH ROW
    EXECUTE FUNCTION update_vpn_updated_at();

-- 5. SEGURIDAD A NIVEL DE FILAS (ROW LEVEL SECURITY - RLS)
ALTER TABLE public.vpn_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vpn_peers ENABLE ROW LEVEL SECURITY;

-- Políticas para vpn_companies:
-- Lectura: Usuarios autenticados con rol ADMIN, TECH o SOPORTE
DROP POLICY IF EXISTS "vpn_companies_select_policy" ON public.vpn_companies;
CREATE POLICY "vpn_companies_select_policy" ON public.vpn_companies
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('ADMIN', 'TECH', 'SOPORTE')
        )
    );

-- Inserción y actualización: ADMIN, TECH, SOPORTE
DROP POLICY IF EXISTS "vpn_companies_insert_policy" ON public.vpn_companies;
CREATE POLICY "vpn_companies_insert_policy" ON public.vpn_companies
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('ADMIN', 'TECH', 'SOPORTE')
        )
    );

DROP POLICY IF EXISTS "vpn_companies_update_policy" ON public.vpn_companies;
CREATE POLICY "vpn_companies_update_policy" ON public.vpn_companies
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('ADMIN', 'TECH', 'SOPORTE')
        )
    );

-- Eliminación: Solo ADMIN y TECH
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

-- Políticas para vpn_peers:
DROP POLICY IF EXISTS "vpn_peers_select_policy" ON public.vpn_peers;
CREATE POLICY "vpn_peers_select_policy" ON public.vpn_peers
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('ADMIN', 'TECH', 'SOPORTE')
        )
    );

DROP POLICY IF EXISTS "vpn_peers_insert_policy" ON public.vpn_peers;
CREATE POLICY "vpn_peers_insert_policy" ON public.vpn_peers
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('ADMIN', 'TECH', 'SOPORTE')
        )
    );

DROP POLICY IF EXISTS "vpn_peers_update_policy" ON public.vpn_peers;
CREATE POLICY "vpn_peers_update_policy" ON public.vpn_peers
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('ADMIN', 'TECH', 'SOPORTE')
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
-- 6. FUNCIONES ATÓMICAS (RPC) PARA CREACIÓN SEGURA DE EMPRESAS Y PEERS
-- ================================================================

-- Función para registrar una empresa calculando automáticamente X
-- (o permitiendo especificar X si se está registrando una empresa existente)
CREATE OR REPLACE FUNCTION public.create_vpn_company(
    p_name TEXT,
    p_group_name TEXT DEFAULT NULL,
    p_status TEXT DEFAULT 'Activo',
    p_manual_company_number INTEGER DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_company_number INTEGER;
    v_vpn_number TEXT;
    v_vpn_range TEXT;
    v_new_company RECORD;
BEGIN
    -- Si no se envía número manual, se calcula el siguiente: MAX(company_number) + 1
    IF p_manual_company_number IS NOT NULL AND p_manual_company_number > 0 THEN
        v_company_number := p_manual_company_number;
    ELSE
        SELECT COALESCE(MAX(company_number), 0) + 1 
        INTO v_company_number 
        FROM public.vpn_companies;
    END IF;

    -- Validar que no se repita
    IF EXISTS (SELECT 1 FROM public.vpn_companies WHERE company_number = v_company_number) THEN
        RAISE EXCEPTION 'El número de empresa % ya está registrado.', v_company_number;
    END IF;

    v_vpn_number := 'Lsoft-VPN-' || LPAD(v_company_number::TEXT, 2, '0');
    v_vpn_range := '10.0.' || v_company_number || '.0/24';

    INSERT INTO public.vpn_companies (
        company_number,
        name,
        group_name,
        vpn_number,
        vpn_range,
        status,
        created_by
    ) VALUES (
        v_company_number,
        TRIM(p_name),
        NULLIF(TRIM(p_group_name), ''),
        v_vpn_number,
        v_vpn_range,
        p_status,
        auth.uid()
    )
    RETURNING * INTO v_new_company;

    RETURN to_jsonb(v_new_company);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para registrar un peer calculando automáticamente Y e IP (10.0.X.Y)
-- Garantiza atomicidad para evitar colisiones concurrentes de IPs
CREATE OR REPLACE FUNCTION public.create_vpn_peer(
    p_company_id UUID,
    p_device_name TEXT,
    p_user_name TEXT,
    p_public_key TEXT,
    p_manual_pc_number INTEGER DEFAULT NULL,
    p_private_key TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_company RECORD;
    v_pc_number INTEGER;
    v_assigned_ip TEXT;
    v_new_peer RECORD;
BEGIN
    -- Bloqueo a nivel de fila de la empresa para evitar condición de carrera
    SELECT * INTO v_company 
    FROM public.vpn_companies 
    WHERE id = p_company_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Empresa con ID % no encontrada.', p_company_id;
    END IF;

    -- Si no se envía número manual de PC, se calcula el siguiente: MAX(pc_number) + 1
    IF p_manual_pc_number IS NOT NULL AND p_manual_pc_number > 0 THEN
        v_pc_number := p_manual_pc_number;
    ELSE
        SELECT COALESCE(MAX(pc_number), 0) + 1 
        INTO v_pc_number 
        FROM public.vpn_peers 
        WHERE company_id = p_company_id;
    END IF;

    -- Construcción de la IP siguiendo el esquema 10.0.X.Y
    v_assigned_ip := '10.0.' || v_company.company_number || '.' || v_pc_number;

    -- Validar que la IP o número de PC no colisionen
    IF EXISTS (SELECT 1 FROM public.vpn_peers WHERE company_id = p_company_id AND pc_number = v_pc_number) THEN
        RAISE EXCEPTION 'El número de PC % ya existe para esta empresa.', v_pc_number;
    END IF;

    IF EXISTS (SELECT 1 FROM public.vpn_peers WHERE ip = v_assigned_ip) THEN
        RAISE EXCEPTION 'La dirección IP % ya está asignada a otro equipo.', v_assigned_ip;
    END IF;

    INSERT INTO public.vpn_peers (
        company_id,
        pc_number,
        ip,
        device_name,
        user_name,
        public_key,
        private_key,
        status,
        created_by
    ) VALUES (
        p_company_id,
        v_pc_number,
        v_assigned_ip,
        TRIM(p_device_name),
        TRIM(p_user_name),
        TRIM(p_public_key),
        p_private_key,
        'Activo',
        auth.uid()
    )
    RETURNING * INTO v_new_peer;

    RETURN to_jsonb(v_new_peer);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
