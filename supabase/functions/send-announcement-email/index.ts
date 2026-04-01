
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Resend } from "https://esm.sh/resend@3.1.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Manejar el preflight de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const INTRANET_URL = Deno.env.get('INTRANET_URL') || 'https://intranet.listosoft.com'

    console.log("--- INICIO DE EJECUCIÓN ---");
    console.log("SUPABASE_URL configurada:", !!SUPABASE_URL);
    console.log("RESEND_API_KEY configurada:", !!RESEND_API_KEY);
    console.log("SERVICE_ROLE configurada:", !!SUPABASE_SERVICE_ROLE_KEY);

    if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      const missing = [];
      if (!RESEND_API_KEY) missing.push("RESEND_API_KEY");
      if (!SUPABASE_URL) missing.push("SUPABASE_URL");
      if (!SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
      
      throw new Error(`MISSING_ENV_VARS: Faltan las siguientes variables: ${missing.join(", ")}. Asegúrate de ejecutarlas con 'supabase secrets set'.`);
    }

    const { announcementId, recipientType, selectedUserIds } = await req.json()
    console.log(`Payload recibido:`, { announcementId, recipientType, count: selectedUserIds?.length })

    const resend = new Resend(RESEND_API_KEY)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1. Obtener anuncio
    const { data: announcement, error: annError } = await supabase
      .from('announcements')
      .select('*')
      .eq('id', announcementId)
      .single()

    if (annError || !announcement) {
      console.error("Error al buscar anuncio:", annError);
      throw new Error(`ANNOUNCEMENT_NOT_FOUND: No se encontró el anuncio con ID ${announcementId}`);
    }

    // 2. Obtener correos
    let emails: string[] = []
    if (recipientType === 'ALL') {
      const { data: users, error: usersError } = await supabase.from('users').select('email')
      if (usersError) {
        console.error("Error al buscar usuarios:", usersError);
        throw usersError;
      }
      emails = users.map(u => u.email).filter(Boolean).map(e => e.trim().toLowerCase())
    } else {
      const { data: users, error: usersError } = await supabase.from('users').select('email').in('id', selectedUserIds)
      if (usersError) {
        console.error("Error al buscar usuarios específicos:", usersError);
        throw usersError;
      }
      emails = users.map(u => u.email).filter(Boolean).map(e => e.trim().toLowerCase())
    }

    // Filtrar duplicados
    emails = [...new Set(emails)]

    if (emails.length === 0) {
      console.log("Lista de correos vacía, nada que enviar.");
      return new Response(JSON.stringify({ success: true, message: 'Nada que enviar: lista de correos vacía.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 3. Preparar correo
    const subject = `📢 ${announcement.title}`
    const creatorName = announcement.created_by_name || 'Sistema'
    const priorityLabel = announcement.priority === 'URGENT' ? '🚨 URGENTE' : 
                          announcement.priority === 'HIGH' ? '⚠️ ALTA' : 'Normal'
    
    // Limpiar HTML para el texto truncado
    const MAX_LENGTH = 300
    let contentText = (announcement.content || '').replace(/<[^>]*>?/gm, '')
    let isTruncated = false
    
    if (contentText.length > MAX_LENGTH) {
      isTruncated = true
      const lastSpace = contentText.substring(0, MAX_LENGTH).lastIndexOf(' ')
      contentText = contentText.substring(0, lastSpace > 0 ? lastSpace : MAX_LENGTH) + '...'
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Intranet Listosoft</h1>
        </div>
        <div style="padding: 30px;">
          <p style="font-size: 16px; margin-bottom: 10px;">Hola,</p>
          <p style="font-size: 16px;"><strong>${creatorName}</strong> ha publicado un anuncio:</p>
          <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 20px; margin: 20px 0;">
            <h2 style="margin: 0 0 10px 0; font-size: 18px; color: #0f172a;">${announcement.title}</h2>
            <span style="font-size: 12px; font-weight: bold; padding: 4px 8px; border-radius: 4px; background: #dbeafe; color: #1e40af;">${priorityLabel}</span>
          </div>
          <div style="font-size: 15px; line-height: 1.6; color: #334155; border-top: 1px solid #f1f5f9; padding-top: 20px; white-space: pre-wrap;">${contentText}</div>
          ${isTruncated ? `
          <p style="font-size: 14px; font-style: italic; color: #64748b; margin-top: 10px; border-top: 1px dashed #e2e8f0; padding-top: 10px;">
            Este mensaje es extenso. Haz clic en el botón de abajo para leer el anuncio completo en la intranet.
          </p>
          ` : ''}
          <div style="text-align: center; margin-top: 30px;">
            <a href="${INTRANET_URL}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Ver en la Intranet</a>
          </div>
        </div>
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
          Este es un correo automático, por favor no respondas.
        </div>
      </div>
    `

    console.log(`Enviando a ${emails.length} destinatarios vía BCC...`)

    const { data: resendData, error: resendError } = await resend.emails.send({
      from: 'Intranet Listosoft <onboarding@resend.dev>',
      to: emails[0],
      bcc: emails.slice(1),
      subject: subject,
      html: html,
    })

    if (resendError) {
      console.error('Error de Resend detectado:', resendError)
      throw new Error(`RESEND_ERROR: ${resendError.name} - ${resendError.message}`);
    }

    console.log("Correo enviado exitosamente:", resendData?.id);
    return new Response(JSON.stringify({ success: true, id: resendData?.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('ERROR CRÍTICO EN FUNCIÓN:', error.message)
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.message.includes("Forbidden") 
        ? "Resend rechazó el envío (Forbidden). Esto suele ser porque el destinatario no está verificado en tu cuenta de Resend (Modo Onboarding) o falta verificar el dominio." 
        : "Error interno al procesar el envío de correos."
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
