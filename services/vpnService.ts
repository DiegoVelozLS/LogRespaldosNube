import { supabase } from './supabaseClient';

export interface VpnPeer {
  id: string;
  companyId: string;
  pcNumber: number;
  ip: string;
  deviceName: string;
  userName: string;
  publicKey: string;
  privateKey?: string;
  status: 'Activo' | 'Inactivo';
  createdAt: string;
}

export interface VpnCompany {
  id: string;
  companyNumber: number;
  name: string;
  groupName: string;
  vpnNumber: string;
  vpnRange: string;
  status: 'Activo' | 'Inactivo' | 'Mantenimiento';
  pcCount: number;
  peers?: VpnPeer[];
  createdAt: string;
}

export interface GeneratedPeerResult {
  peer: VpnPeer;
  privateKey: string;
  publicKey: string;
  clientConfig: string;
  serverConfig: string;
}

// Parámetros oficiales del servidor WireGuard corporativo
export const WG_SERVER_CONFIG = {
  ENDPOINT: '20.242.117.143:51820',
  PUBLIC_KEY: 'p9YbHVGQh5r7RsoW2zc9iAGGSkCavdbpidlpEVFzY24=',
  ALLOWED_IPS: '10.0.0.1/32',
  DNS: '1.1.1.1',
  PERSISTENT_KEEPALIVE: 25,
};

// ================================================================
// ALGORITMO CRIPTOGRÁFICO CURVE25519 (RFC 7748)
// Montgomery Ladder puro para cálculo de clave pública WireGuard
// ================================================================
const P = (1n << 255n) - 19n;
const A24 = 121665n;

function mod(n: bigint): bigint {
  return ((n % P) + P) % P;
}

function inv(n: bigint): bigint {
  let res = 1n;
  let base = n;
  let exp = P - 2n;
  while (exp > 0n) {
    if (exp % 2n === 1n) res = mod(res * base);
    base = mod(base * base);
    exp /= 2n;
  }
  return res;
}

function x25519(scalarBytes: Uint8Array, uBytes: Uint8Array): Uint8Array {
  const k = Array.from(scalarBytes);
  // WireGuard clamping
  k[0] &= 248;
  k[31] &= 127;
  k[31] |= 64;

  let u = 0n;
  for (let i = 0; i < 32; i++) {
    u |= BigInt(uBytes[i]) << BigInt(8 * i);
  }

  const x1 = u;
  let x2 = 1n;
  let z2 = 0n;
  let x3 = u;
  let z3 = 1n;
  let swap = 0;

  for (let t = 254; t >= 0; t--) {
    const k_t = (k[Math.floor(t / 8)] >> (t % 8)) & 1;
    swap ^= k_t;
    if (swap) {
      const tx = x2; x2 = x3; x3 = tx;
      const tz = z2; z2 = z3; z3 = tz;
    }
    swap = k_t;

    const A = mod(x2 + z2);
    const AA = mod(A * A);
    const B = mod(x2 - z2);
    const BB = mod(B * B);
    const E = mod(AA - BB);
    const C = mod(x3 + z3);
    const D = mod(x3 - z3);
    const DA = mod(D * A);
    const CB = mod(C * B);

    x3 = mod((DA + CB) ** 2n);
    z3 = mod(x1 * ((DA - CB) ** 2n));
    x2 = mod(AA * BB);
    z2 = mod(E * (AA + mod(A24 * E)));
  }

  if (swap) {
    const tx = x2; x2 = x3; x3 = tx;
    const tz = z2; z2 = z3; z3 = tz;
  }

  const res = mod(x2 * inv(z2));
  const out = new Uint8Array(32);
  let tmp = res;
  for (let i = 0; i < 32; i++) {
    out[i] = Number(tmp & 0xffn);
    tmp >>= 8n;
  }
  return out;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Genera un par de claves WireGuard (Curve25519) criptográficamente seguro
 */
export function generateWireguardKeyPair(): { privateKey: string; publicKey: string } {
  const privBytes = new Uint8Array(32);
  crypto.getRandomValues(privBytes);
  // Clamping WireGuard
  privBytes[0] &= 248;
  privBytes[31] &= 127;
  privBytes[31] |= 64;

  const basepoint = new Uint8Array(32);
  basepoint[0] = 9;

  const pubBytes = x25519(privBytes, basepoint);

  return {
    privateKey: uint8ArrayToBase64(privBytes),
    publicKey: uint8ArrayToBase64(pubBytes),
  };
}

/**
 * Genera el archivo de configuración para el cliente WireGuard (.conf)
 * Esquema: 10.0.[Empresa].[PC]/16
 */
export function buildClientConfig(
  privateKey: string,
  companyNumber: number,
  pcNumber: number
): string {
  return `[Interface]
PrivateKey = ${privateKey}
Address = 10.0.${companyNumber}.${pcNumber}/16
DNS = ${WG_SERVER_CONFIG.DNS}

[Peer]
PublicKey = ${WG_SERVER_CONFIG.PUBLIC_KEY}
AllowedIPs = ${WG_SERVER_CONFIG.ALLOWED_IPS}
Endpoint = ${WG_SERVER_CONFIG.ENDPOINT}
PersistentKeepalive = ${WG_SERVER_CONFIG.PERSISTENT_KEEPALIVE}`;
}

/**
 * Genera el bloque que el administrador copia y pega en el servidor WireGuard
 */
export function buildServerPeerConfig(
  deviceName: string,
  userName: string,
  publicKey: string,
  companyNumber: number,
  pcNumber: number
): string {
  return `[Peer]
# ${deviceName} - ${userName}
PublicKey = ${publicKey}
AllowedIPs = 10.0.${companyNumber}.${pcNumber}/32`;
}

// ================================================================
// SERVICIO DE BASE DE DATOS (SUPABASE)
// ================================================================
export const vpnService = {
  /**
   * Obtiene la lista de empresas registradas con su conteo de equipos
   */
  getCompanies: async (): Promise<VpnCompany[]> => {
    try {
      const { data: companies, error: compError } = await (supabase as any)
        .from('vpn_companies')
        .select('*')
        .order('company_number', { ascending: true });

      if (compError) throw compError;
      if (!companies) return [];

      // Obtener conteo de peers por empresa
      const { data: peers, error: peersError } = await (supabase as any)
        .from('vpn_peers')
        .select('id, company_id');

      if (peersError) {
        console.warn('Error fetching peer counts:', peersError);
      }

      const peerCountMap: Record<string, number> = {};
      if (peers) {
        peers.forEach((p: any) => {
          peerCountMap[p.company_id] = (peerCountMap[p.company_id] || 0) + 1;
        });
      }

      return companies.map((c: any) => ({
        id: c.id,
        companyNumber: c.company_number,
        name: c.name,
        groupName: c.group_name || '',
        vpnNumber: c.vpn_number,
        vpnRange: c.vpn_range,
        status: c.status,
        pcCount: peerCountMap[c.id] || 0,
        createdAt: c.created_at ? c.created_at.split('T')[0] : '',
      }));
    } catch (error) {
      console.error('Error fetching VPN companies:', error);
      throw error;
    }
  },

  /**
   * Obtiene los datos detallados de una empresa y todos sus peers
   */
  getCompanyWithPeers: async (companyId: string): Promise<{ company: VpnCompany; peers: VpnPeer[] } | null> => {
    try {
      const { data: comp, error: compError } = await (supabase as any)
        .from('vpn_companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (compError) throw compError;
      if (!comp) return null;

      const { data: peers, error: peersError } = await (supabase as any)
        .from('vpn_peers')
        .select('*')
        .eq('company_id', companyId)
        .order('pc_number', { ascending: true });

      if (peersError) throw peersError;

      const formattedPeers: VpnPeer[] = (peers || []).map((p: any) => ({
        id: p.id,
        companyId: p.company_id,
        pcNumber: p.pc_number,
        ip: p.ip,
        deviceName: p.device_name,
        userName: p.user_name,
        publicKey: p.public_key,
        privateKey: p.private_key || '',
        status: p.status,
        createdAt: p.created_at ? p.created_at.split('T')[0] : '',
      }));

      const formattedCompany: VpnCompany = {
        id: comp.id,
        companyNumber: comp.company_number,
        name: comp.name,
        groupName: comp.group_name || '',
        vpnNumber: comp.vpn_number,
        vpnRange: comp.vpn_range,
        status: comp.status,
        pcCount: formattedPeers.length,
        peers: formattedPeers,
        createdAt: comp.created_at ? comp.created_at.split('T')[0] : '',
      };

      return { company: formattedCompany, peers: formattedPeers };
    } catch (error) {
      console.error('Error fetching company details with peers:', error);
      throw error;
    }
  },

  /**
   * Registra una nueva empresa asignándole automáticamente su número X
   * (o respetando un número manual si se especifica)
   */
  createCompany: async (params: {
    name: string;
    groupName?: string;
    status?: 'Activo' | 'Inactivo';
    manualCompanyNumber?: number;
  }): Promise<VpnCompany> => {
    try {
      // 1. Intentar llamar a la función RPC atómica
      const { data, error } = await (supabase as any).rpc('create_vpn_company', {
        p_name: params.name,
        p_group_name: params.groupName || null,
        p_status: params.status || 'Activo',
        p_manual_company_number: params.manualCompanyNumber || null,
      });

      if (!error && data) {
        return {
          id: data.id,
          companyNumber: data.company_number,
          name: data.name,
          groupName: data.group_name || '',
          vpnNumber: data.vpn_number,
          vpnRange: data.vpn_range,
          status: data.status,
          pcCount: 0,
          createdAt: data.created_at ? data.created_at.split('T')[0] : '',
        };
      }

      // Si la función RPC falló o no existe, hacer fallback con inserción directa
      console.warn('RPC create_vpn_company no disponible, ejecutando inserción directa:', error);

      let nextNum = params.manualCompanyNumber;
      if (!nextNum || nextNum <= 0) {
        const { data: maxComp } = await (supabase as any)
          .from('vpn_companies')
          .select('company_number')
          .order('company_number', { ascending: false })
          .limit(1);

        nextNum = (maxComp && maxComp[0]?.company_number ? maxComp[0].company_number : 0) + 1;
      }

      const vpnNumber = `Lsoft-VPN-${String(nextNum).padStart(2, '0')}`;
      const vpnRange = `10.0.${nextNum}.0/24`;

      const { data: inserted, error: insertError } = await (supabase as any)
        .from('vpn_companies')
        .insert({
          company_number: nextNum,
          name: params.name.trim(),
          group_name: params.groupName?.trim() || null,
          vpn_number: vpnNumber,
          vpn_range: vpnRange,
          status: params.status || 'Activo',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return {
        id: inserted.id,
        companyNumber: inserted.company_number,
        name: inserted.name,
        groupName: inserted.group_name || '',
        vpnNumber: inserted.vpn_number,
        vpnRange: inserted.vpn_range,
        status: inserted.status,
        pcCount: 0,
        createdAt: inserted.created_at ? inserted.created_at.split('T')[0] : '',
      };
    } catch (error) {
      console.error('Error creating VPN company:', error);
      throw error;
    }
  },

  /**
   * Actualiza los datos editables de una empresa.
   * El número de empresa (X) no se modifica porque cambiaría el rango
   * y las IPs ya desplegadas en los equipos.
   */
  updateCompany: async (params: {
    id: string;
    name: string;
    groupName?: string;
    status: 'Activo' | 'Inactivo' | 'Mantenimiento';
  }): Promise<VpnCompany> => {
    try {
      const { data, error } = await (supabase as any)
        .from('vpn_companies')
        .update({
          name: params.name.trim(),
          group_name: params.groupName?.trim() || null,
          status: params.status,
        })
        .eq('id', params.id)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        companyNumber: data.company_number,
        name: data.name,
        groupName: data.group_name || '',
        vpnNumber: data.vpn_number,
        vpnRange: data.vpn_range,
        status: data.status,
        pcCount: 0,
        createdAt: data.created_at ? data.created_at.split('T')[0] : '',
      };
    } catch (error) {
      console.error('Error updating VPN company:', error);
      throw error;
    }
  },

  /**
   * Crea un nuevo equipo (peer):
   * 1. Genera criptográficamente el par de claves (Curve25519)
   * 2. Asigna la IP 10.0.X.Y (Y = siguiente número de PC)
   * 3. Registra en Supabase
   * 4. Retorna el túnel cliente completo y el bloque para el servidor
   */
  createPeer: async (params: {
    companyId: string;
    companyNumber: number;
    deviceName: string;
    userName: string;
    manualPcNumber?: number;
  }): Promise<GeneratedPeerResult> => {
    try {
      // 1. Generar claves del cliente
      const { privateKey, publicKey } = generateWireguardKeyPair();

      // 2. Intentar llamar al RPC atómico con soporte de p_private_key
      const { data, error } = await (supabase as any).rpc('create_vpn_peer', {
        p_company_id: params.companyId,
        p_device_name: params.deviceName,
        p_user_name: params.userName,
        p_public_key: publicKey,
        p_manual_pc_number: params.manualPcNumber || null,
        p_private_key: privateKey,
      });

      let savedPeer: any = data;

      // Fallback si RPC no está disponible o falla
      if (error || !savedPeer) {
        console.warn('RPC create_vpn_peer con clave privada no disponible o falló:', error);

        let nextPc = params.manualPcNumber;
        if (!nextPc || nextPc <= 0) {
          const { data: maxPeer } = await (supabase as any)
            .from('vpn_peers')
            .select('pc_number')
            .eq('company_id', params.companyId)
            .order('pc_number', { ascending: false })
            .limit(1);

          nextPc = (maxPeer && maxPeer[0]?.pc_number ? maxPeer[0].pc_number : 0) + 1;
        }

        const assignedIp = `10.0.${params.companyNumber}.${nextPc}`;

        // Intentar guardar con private_key
        let insertRes = await (supabase as any)
          .from('vpn_peers')
          .insert({
            company_id: params.companyId,
            pc_number: nextPc,
            ip: assignedIp,
            device_name: params.deviceName.trim(),
            user_name: params.userName.trim(),
            public_key: publicKey,
            private_key: privateKey,
            status: 'Activo',
          })
          .select()
          .single();

        // Si falló por no existir la columna private_key, intentar sin ella
        if (insertRes.error) {
          console.warn('Fallo al guardar con private_key, intentando sin columna:', insertRes.error);
          insertRes = await (supabase as any)
            .from('vpn_peers')
            .insert({
              company_id: params.companyId,
              pc_number: nextPc,
              ip: assignedIp,
              device_name: params.deviceName.trim(),
              user_name: params.userName.trim(),
              public_key: publicKey,
              status: 'Activo',
            })
            .select()
            .single();

          if (insertRes.error) throw insertRes.error;
        }

        savedPeer = insertRes.data;
      }

      const formattedPeer: VpnPeer = {
        id: savedPeer.id,
        companyId: savedPeer.company_id,
        pcNumber: savedPeer.pc_number,
        ip: savedPeer.ip,
        deviceName: savedPeer.device_name,
        userName: savedPeer.user_name,
        publicKey: savedPeer.public_key,
        privateKey: savedPeer.private_key || privateKey,
        status: savedPeer.status,
        createdAt: savedPeer.created_at ? savedPeer.created_at.split('T')[0] : '',
      };

      const clientConfig = buildClientConfig(privateKey, params.companyNumber, formattedPeer.pcNumber);
      const serverConfig = buildServerPeerConfig(
        formattedPeer.deviceName,
        formattedPeer.userName,
        publicKey,
        params.companyNumber,
        formattedPeer.pcNumber
      );

      return {
        peer: formattedPeer,
        privateKey,
        publicKey,
        clientConfig,
        serverConfig,
      };
    } catch (error) {
      console.error('Error creating VPN peer:', error);
      throw error;
    }
  },

  /**
   * Elimina un equipo (peer)
   */
  deletePeer: async (peerId: string): Promise<void> => {
    try {
      const { error } = await (supabase as any)
        .from('vpn_peers')
        .delete()
        .eq('id', peerId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting VPN peer:', error);
      throw error;
    }
  },

  /**
   * Elimina una empresa y todos sus peers asociados
   */
  deleteCompany: async (companyId: string): Promise<void> => {
    try {
      const { error } = await (supabase as any)
        .from('vpn_companies')
        .delete()
        .eq('id', companyId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting VPN company:', error);
      throw error;
    }
  },

  /**
   * Genera el archivo .conf para un peer específico
   */
  getPeerClientConfig: (peer: VpnPeer, companyNumber: number): string => {
    const privKey = peer.privateKey && peer.privateKey.trim().length > 0
      ? peer.privateKey
      : '(Clave privada no almacenada - generar o colocar la del dispositivo)';
    return buildClientConfig(privKey, companyNumber, peer.pcNumber);
  },

  /**
   * Genera el bloque [Peer] para el servidor WireGuard
   */
  getPeerServerConfig: (peer: VpnPeer, companyNumber: number): string => {
    return buildServerPeerConfig(
      peer.deviceName,
      peer.userName,
      peer.publicKey,
      companyNumber,
      peer.pcNumber
    );
  },
};
