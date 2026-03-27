
import { serve } from "https://deno.land/std@0.131.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Resend } from "https://esm.sh/resend@3.1.0"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const INTRANET_URL = Deno.env.get('INTRANET_URL') || 'https://intranet.listosoft.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { announcementId, recipientType, selectedUserIds } = await req.json()
    console.log(`Payload recibido:`, { announcementId, recipientType, count: selectedUserIds?.length })

    if (!RESEND_API_KEY) {
      throw new Error('API_KEY_MISSING: La variable RESEND_API_KEY no se encontró en los secretos de Supabase.')
    }

    const resend = new Resend(RESEND_API_KEY)
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // 1. Obtener anuncio
    const { data: announcement, error: annError } = await supabase
      .from('announcements')
      .select('*')
      .eq('id', announcementId)
      .single()

    if (annError || !announcement) {
      throw new Error(`ANNOUNCEMENT_NOT_FOUND: No se encontró el anuncio con ID ${announcementId}`)
    }

    // 2. Obtener correos
    let emails: string[] = []
    if (recipientType === 'ALL') {
      const { data: users, error: usersError } = await supabase.from('users').select('email')
      if (usersError) throw usersError
      emails = users.map(u => u.email).filter(Boolean).map(e => e.trim().toLowerCase())
    } else {
      const { data: users, error: usersError } = await supabase.from('users').select('email').in('id', selectedUserIds)
      if (usersError) throw usersError
      emails = users.map(u => u.email).filter(Boolean).map(e => e.trim().toLowerCase())
    }

    // Filtrar duplicados
    emails = [...new Set(emails)]

    if (emails.length === 0) {
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
    const contentText = (announcement.content || '').replace(/<[^>]*>?/gm, '')

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

    // IMPORTANT: In "Onboarding" mode, Resend can only send to your account email.
    // If multiple emails are provided, and you aren't verified, it WILL fail with a 403.
    // We use the first email as 'to' and others as 'bcc'
    const { data: resendData, error: resendError } = await resend.emails.send({
      from: 'Intranet Listosoft <onboarding@resend.dev>',
      to: emails[0], // Usamos el primer correo de la lista como destinatario principal
      bcc: emails.slice(1), // El resto en BCC
      subject: subject,
      html: html,
    })

    if (resendError) {
      console.error('Error de Resend:', resendError)
      throw new Error(`RESEND_ERROR: ${resendError.message}`)
    }

    return new Response(JSON.stringify({ success: true, id: resendData?.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('ERROR:', error.message)
    return new Response(JSON.stringify({ 
      error: error.message,
      details: "Si el error es de Resend 'Forbidden', asegúrate de que el destinatario sea el mismo correo de tu cuenta Resend o verifica tu dominio." 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
