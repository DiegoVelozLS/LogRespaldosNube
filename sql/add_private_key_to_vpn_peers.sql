-- ================================================================
-- MIGRACIÓN: ALMACENAR CLAVE PRIVADA DE PEERS EN WIREGUARD
-- Ejecuta este script en el SQL Editor de Supabase
-- ================================================================

-- 1. Agregar columna private_key a la tabla vpn_peers
ALTER TABLE public.vpn_peers 
ADD COLUMN IF NOT EXISTS private_key TEXT;

-- 2. Eliminar firmas anteriores de la función create_vpn_peer para evitar conflictos de sobrecarga
DROP FUNCTION IF EXISTS public.create_vpn_peer(UUID, TEXT, TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.create_vpn_peer(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT);

-- 3. Crear función actualizada con soporte para p_private_key
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
    -- Bloqueo a nivel de fila de la empresa para evitar colisiones
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
