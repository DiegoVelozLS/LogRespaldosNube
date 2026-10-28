import { createClient } from '@supabase/supabase-js';

// Handler compatible con Vercel Serverless Functions (Node.js)
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Agent-Key, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Configuración de Supabase no disponible en el servidor.' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Obtener clave del agente desde cabeceras, query o body
  const agentKey = req.headers['x-agent-key'] || req.query?.agent_key || req.body?.agent_key;
  if (!agentKey) {
    return res.status(401).json({ error: 'Cabecera "X-Agent-Key" requerida para autenticar el Agente.' });
  }

  const action = (req.query?.action || req.body?.action || 'pending').toLowerCase();

  try {
    // 1. Ping de liveness
    if (action === 'ping') {
      return res.status(200).json({ status: 'ok', server_time: new Date().toISOString() });
    }

    // 2. Obtener lista de peers pendientes para este servidor
    if (action === 'pending' || req.method === 'GET') {
      const { data, error } = await (supabase as any).rpc('agent_get_pending_peers', {
        p_agent_key: agentKey,
      });

      if (error) {
        return res.status(401).json({ error: error.message || 'Clave de agente inválida.' });
      }

      return res.status(200).json({
        success: true,
        pending_count: Array.isArray(data) ? data.length : 0,
        peers: data || [],
      });
    }

    // 3. Confirmación (ACK) tras ejecutar wg.exe set en el Windows Server
    if (action === 'ack' || req.method === 'POST') {
      const peerId = req.body?.peer_id || req.query?.peer_id;
      const success = req.body?.success !== undefined ? Boolean(req.body.success) : true;
      const errorMessage = req.body?.error || null;

      if (!peerId) {
        return res.status(400).json({ error: 'peer_id es requerido para el ACK.' });
      }

      const { data, error } = await (supabase as any).rpc('agent_ack_peer_sync', {
        p_agent_key: agentKey,
        p_peer_id: peerId,
        p_success: success,
        p_error: errorMessage,
      });

      if (error) {
        return res.status(400).json({ error: error.message || 'Error al procesar ACK.' });
      }

      return res.status(200).json({
        success: true,
        result: data,
      });
    }

    return res.status(400).json({ error: `Acción '${action}' no reconocida.` });
  } catch (err: any) {
    console.error('Error en vpn-agent handler:', err);
    return res.status(500).json({ error: err.message || 'Error interno del servidor.' });
  }
}
