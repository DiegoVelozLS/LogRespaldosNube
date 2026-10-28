-- ================================================================
-- FASE 1: AUTOMATIZACIÓN DE GESTIÓN VPN Y AGENTE WINDOWS SERVER
-- Ejecuta este script en el SQL Editor de Supabase
-- ================================================================

-- 1. CAMPOS EN vpn_servers (Autenticación del Agente Windows Server)
ALTER TABLE public.vpn_servers
ADD COLUMN IF NOT EXISTS agent_key TEXT;

-- Clave por defecto para el Servidor 1 (puedes cambiarla en cualquier momento)
UPDATE public.vpn_servers
SET agent_key = COALESCE(agent_key, 'lsoft_agent_' || encode(gen_random_bytes(16), 'hex'))
WHERE name = 'Servidor 1' OR sort_order = 1;


-- 2. CAMPOS EN vpn_tunnels (Identificador de interfaz y sincronización)
ALTER TABLE public.vpn_tunnels
ADD COLUMN IF NOT EXISTS wg_interface_name TEXT;

ALTER TABLE public.vpn_tunnels
ADD COLUMN IF NOT EXISTS auto_sync_server BOOLEAN DEFAULT false;

-- Configurar Túnel Principal con sincronización activa y nombre de interfaz
UPDATE public.vpn_tunnels
SET wg_interface_name = COALESCE(wg_interface_name, file_prefix, 'Lsoft-VPN'),
    auto_sync_server = true,
    client_allowed_ips = '10.0.0.1/32',
    address_cidr = 32
WHERE name ILIKE '%Principal%' OR sort_order = 1;

-- El Túnel Secundario y Radmin permanecen con auto_sync_server = false (INTACTOS)
UPDATE public.vpn_tunnels
SET auto_sync_server = false
WHERE name NOT ILIKE '%Principal%' AND sort_order != 1;


-- 3. CAMPOS EN vpn_peers (Estado de sincronización y Token de Activación)
ALTER TABLE public.vpn_peers
ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (sync_status IN ('pending', 'synced', 'pending_remove', 'error', 'manual'));

ALTER TABLE public.vpn_peers
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

ALTER TABLE public.vpn_peers
ADD COLUMN IF NOT EXISTS sync_error TEXT;

ALTER TABLE public.vpn_peers
ADD COLUMN IF NOT EXISTS provision_token TEXT UNIQUE;

ALTER TABLE public.vpn_peers
ADD COLUMN IF NOT EXISTS provisioned_at TIMESTAMPTZ;

-- Marcar los peers existentes como 'synced' para no alterar instalaciones previas
UPDATE public.vpn_peers
SET sync_status = 'synced',
    synced_at = COALESCE(synced_at, created_at, NOW())
WHERE sync_status = 'pending';

-- Generar tokens para peers existentes que no tengan uno
UPDATE public.vpn_peers
SET provision_token = 'LSOFT-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT) FROM 1 FOR 4)) || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || ip::TEXT) FROM 5 FOR 4))
WHERE provision_token IS NULL;

-- Índice para búsquedas rápidas del agente y cliente
CREATE INDEX IF NOT EXISTS idx_vpn_peers_sync_status ON public.vpn_peers(sync_status);
CREATE INDEX IF NOT EXISTS idx_vpn_peers_provision_token ON public.vpn_peers(provision_token);


-- 4. FUNCIÓN AUXILIAR: Generar Token de Activación Amigable
CREATE OR REPLACE FUNCTION generate_friendly_vpn_token()
RETURNS TEXT AS $$
DECLARE
    v_token TEXT;
    v_exists BOOLEAN;
BEGIN
    LOOP
        v_token := 'LSOFT-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4)) || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 5 FOR 4));
        SELECT EXISTS (SELECT 1 FROM public.vpn_peers WHERE provision_token = v_token) INTO v_exists;
        IF NOT v_exists THEN
            RETURN v_token;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;


-- 5. ACTUALIZAR create_vpn_peer: Asigna Token y sync_status automático
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
    v_token TEXT;
    v_initial_sync TEXT;
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
        v_initial_sync := 'manual';
    ELSE
        v_assigned_ip := v_tunnel.address_prefix || '.' || v_company.company_number || '.' || v_pc_number;

        IF EXISTS (SELECT 1 FROM public.vpn_peers WHERE ip = v_assigned_ip) THEN
            RAISE EXCEPTION 'La dirección IP % ya está asignada a otro equipo.', v_assigned_ip;
        END IF;

        -- Si el túnel tiene auto_sync_server activado, entra en estado 'pending' para el agente
        IF v_tunnel.auto_sync_server = true THEN
            v_initial_sync := 'pending';
        ELSE
            v_initial_sync := 'manual';
        END IF;
    END IF;

    v_token := generate_friendly_vpn_token();

    INSERT INTO public.vpn_peers (
        company_id, pc_number, ip, device_name, user_name,
        public_key, private_key, notes, status, created_by,
        sync_status, provision_token
    ) VALUES (
        p_company_id, v_pc_number, v_assigned_ip,
        TRIM(p_device_name), TRIM(p_user_name),
        NULLIF(TRIM(COALESCE(p_public_key, '')), ''),
        p_private_key,
        NULLIF(TRIM(COALESCE(p_notes, '')), ''),
        'Activo', auth.uid(),
        v_initial_sync, v_token
    )
    RETURNING * INTO v_new_peer;

    RETURN to_jsonb(v_new_peer);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. RPC: Solicitud de borrado controlada (Eliminación en caliente)
CREATE OR REPLACE FUNCTION public.request_delete_vpn_peer(p_peer_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_peer RECORD;
    v_company RECORD;
    v_tunnel RECORD;
BEGIN
    SELECT * INTO v_peer FROM public.vpn_peers WHERE id = p_peer_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Equipo no encontrado');
    END IF;

    SELECT * INTO v_company FROM public.vpn_companies WHERE id = v_peer.company_id;
    SELECT * INTO v_tunnel FROM public.vpn_tunnels WHERE id = v_company.tunnel_id;

    -- Si el túnel sincroniza automáticamente con el Agente, marcar como pending_remove
    IF v_tunnel IS NOT NULL AND v_tunnel.auto_sync_server = true AND v_peer.public_key IS NOT NULL THEN
        UPDATE public.vpn_peers
        SET sync_status = 'pending_remove'
        WHERE id = p_peer_id;

        RETURN jsonb_build_object('success', true, 'action', 'pending_remove', 'message', 'Marcado para remoción en vivo en el servidor');
    ELSE
        -- Túnel manual o Radmin: eliminar directamente
        DELETE FROM public.vpn_peers WHERE id = p_peer_id;
        RETURN jsonb_build_object('success', true, 'action', 'deleted', 'message', 'Equipo eliminado');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 7. RPC: Regenerar Token de Provisión para un Peer
CREATE OR REPLACE FUNCTION public.regenerate_vpn_provision_token(p_peer_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_new_token TEXT;
    v_updated RECORD;
BEGIN
    v_new_token := generate_friendly_vpn_token();

    UPDATE public.vpn_peers
    SET provision_token = v_new_token,
        provisioned_at = NULL
    WHERE id = p_peer_id
    RETURNING * INTO v_updated;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Equipo no encontrado.';
    END IF;

    RETURN to_jsonb(v_updated);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 8. RPC AGENTE: Obtener peers pendientes para el Windows Server
CREATE OR REPLACE FUNCTION public.agent_get_pending_peers(p_agent_key TEXT)
RETURNS JSONB AS $$
DECLARE
    v_server RECORD;
    v_results JSONB;
BEGIN
    SELECT * INTO v_server FROM public.vpn_servers WHERE agent_key = p_agent_key;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Clave de agente inválida.';
    END IF;

    SELECT jsonb_agg(
        jsonb_build_object(
            'peer_id', p.id,
            'action', CASE WHEN p.sync_status = 'pending_remove' THEN 'remove' ELSE 'set' END,
            'sync_status', p.sync_status,
            'tunnel_id', t.id,
            'tunnel_name', t.name,
            'interface_name', COALESCE(t.wg_interface_name, t.file_prefix, 'Lsoft-VPN'),
            'public_key', p.public_key,
            'ip', p.ip,
            'device_name', p.device_name,
            'user_name', p.user_name,
            'company_name', c.name,
            'company_number', c.company_number,
            'pc_number', p.pc_number
        )
    ) INTO v_results
    FROM public.vpn_peers p
    JOIN public.vpn_companies c ON p.company_id = c.id
    JOIN public.vpn_tunnels t ON c.tunnel_id = t.id
    WHERE t.server_id = v_server.id
      AND t.auto_sync_server = true
      AND p.sync_status IN ('pending', 'pending_remove');

    RETURN COALESCE(v_results, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 9. RPC AGENTE: Confirmación (ACK) de aplicación en el Windows Server
CREATE OR REPLACE FUNCTION public.agent_ack_peer_sync(
    p_agent_key TEXT,
    p_peer_id UUID,
    p_success BOOLEAN,
    p_error TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_server RECORD;
    v_peer RECORD;
BEGIN
    SELECT * INTO v_server FROM public.vpn_servers WHERE agent_key = p_agent_key;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Clave de agente inválida.';
    END IF;

    SELECT * INTO v_peer FROM public.vpn_peers WHERE id = p_peer_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Peer ya no existe');
    END IF;

    IF p_success THEN
        IF v_peer.sync_status = 'pending_remove' THEN
            -- Removido exitosamente de wg.exe y del .conf: borrar de la base de datos
            DELETE FROM public.vpn_peers WHERE id = p_peer_id;
            RETURN jsonb_build_object('success', true, 'action', 'deleted');
        ELSE
            -- Inyectado exitosamente en caliente
            UPDATE public.vpn_peers
            SET sync_status = 'synced',
                synced_at = NOW(),
                sync_error = NULL
            WHERE id = p_peer_id;
            RETURN jsonb_build_object('success', true, 'action', 'synced');
        END IF;
    ELSE
        -- Falló la inyección en el Windows Server
        UPDATE public.vpn_peers
        SET sync_status = 'error',
            sync_error = p_error
        WHERE id = p_peer_id;
        RETURN jsonb_build_object('success', false, 'action', 'error_logged');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 10. RPC CLIENTE: Canjear Token y obtener Configuración .conf
CREATE OR REPLACE FUNCTION public.redeem_vpn_provision_token(p_token TEXT)
RETURNS JSONB AS $$
DECLARE
    v_peer RECORD;
    v_company RECORD;
    v_tunnel RECORD;
    v_client_config TEXT;
    v_file_name TEXT;
    v_endpoint TEXT;
    v_address TEXT;
    v_allowed_ips TEXT;
BEGIN
    SELECT * INTO v_peer
    FROM public.vpn_peers
    WHERE provision_token = TRIM(p_token);

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Token de activación inválido o expirado.';
    END IF;

    IF v_peer.status != 'Activo' THEN
        RAISE EXCEPTION 'Este equipo se encuentra en estado inactivo en la intranet.';
    END IF;

    SELECT * INTO v_company FROM public.vpn_companies WHERE id = v_peer.company_id;
    SELECT * INTO v_tunnel FROM public.vpn_tunnels WHERE id = v_company.tunnel_id;

    IF v_tunnel.kind = 'radmin' THEN
        RAISE EXCEPTION 'Este equipo pertenece a un acceso Radmin y no requiere configuración WireGuard.';
    END IF;

    IF v_peer.private_key IS NULL OR LENGTH(TRIM(v_peer.private_key)) = 0 THEN
        RAISE EXCEPTION 'El equipo no tiene una clave privada registrada. Por favor genérala desde la intranet.';
    END IF;

    -- Si el túnel tiene listenPort, concatenar endpointHost:listenPort
    IF v_tunnel.listen_port IS NOT NULL AND v_tunnel.listen_port > 0 THEN
        v_endpoint := v_tunnel.endpoint_host || ':' || v_tunnel.listen_port;
    ELSE
        v_endpoint := v_tunnel.endpoint_host;
    END IF;

    -- Aislamiento de red: máscara /32 en Address y AllowedIPs
    v_address := v_peer.ip || '/' || COALESCE(v_tunnel.address_cidr, 32);
    v_allowed_ips := COALESCE(v_tunnel.client_allowed_ips, '10.0.0.1/32');

    -- Nombre del archivo de túnel
    v_file_name := COALESCE(v_tunnel.file_prefix, 'Lsoft-VPN') || '-' ||
                   LPAD(v_company.company_number::TEXT, 2, '0') ||
                   CASE WHEN v_peer.pc_number > 1 THEN '-' || LPAD(v_peer.pc_number::TEXT, 2, '0') ELSE '' END ||
                   '.conf';

    -- Construir archivo .conf
    v_client_config := '[Interface]' || E'\n' ||
                       'PrivateKey = ' || v_peer.private_key || E'\n' ||
                       'Address = ' || v_address || E'\n' ||
                       'DNS = ' || COALESCE(v_tunnel.dns, '1.1.1.1') || E'\n\n' ||
                       '[Peer]' || E'\n' ||
                       'PublicKey = ' || v_tunnel.server_public_key || E'\n' ||
                       'AllowedIPs = ' || v_allowed_ips || E'\n' ||
                       'Endpoint = ' || v_endpoint || E'\n' ||
                       'PersistentKeepalive = ' || COALESCE(v_tunnel.persistent_keepalive, 25)::TEXT;

    -- Registrar fecha de provisión
    UPDATE public.vpn_peers
    SET provisioned_at = NOW()
    WHERE id = v_peer.id;

    RETURN jsonb_build_object(
        'success', true,
        'peer_id', v_peer.id,
        'device_name', v_peer.device_name,
        'user_name', v_peer.user_name,
        'ip', v_peer.ip,
        'company_name', v_company.name,
        'file_name', v_file_name,
        'tunnel_name', COALESCE(v_tunnel.wg_interface_name, v_tunnel.file_prefix, 'Lsoft-VPN'),
        'client_config', v_client_config,
        'server_ip', SPLIT_PART(v_allowed_ips, '/', 1)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 11. Refrescar caché de esquema
NOTIFY pgrst, 'reload schema';
