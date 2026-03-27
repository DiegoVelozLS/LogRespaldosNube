
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

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY no configurado en los Secretos de Supabase')
    }

    const resend = new Resend(RESEND_API_KEY)

    const supabase = createClient(
      SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Obtener detalles del anuncio
    const { data: announcement, error: annError } = await supabase
      .from('announcements')
      .select('*')
      .eq('id', announcementId)
      .single()

    if (annError || !announcement) {
      throw new Error(`Anuncio no encontrado: ${annError?.message}`)
    }

    // 2. Obtener correos de los destinatarios
    let emails: string[] = []

    if (recipientType === 'ALL') {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('email')
      
      if (usersError) throw usersError
      emails = users.map(u => u.email).filter(Boolean)
    } else {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('email')
        .in('id', selectedUserIds)
      
      if (usersError) throw usersError
      emails = users.map(u => u.email).filter(Boolean)
    }

    if (emails.length === 0) {
      return new Response(JSON.stringify({ message: 'No hay destinatarios con correo válido' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 3. Preparar el correo
    const subject = `Nuevo Anuncio: ${announcement.title}`
    const creatorName = announcement.created_by_name || 'Un usuario'
    const priorityLabel = announcement.priority === 'URGENT' ? '🚨 URGENTE' : 
                          announcement.priority === 'HIGH' ? '⚠️ ALTA' : 'Normal'
    
    // Limpiar contenido HTML para el texto del email si es necesario
    const contentText = announcement.content.replace(/<[^>]*>?/gm, '')

    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
        <div style="text-align: center; margin-bottom: 25px;">
           <h1 style="color: #2563eb; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">Listosoft</h1>
           <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px; text-transform: uppercase; font-weight: 600;">Comunicación Interna</p>
        </div>
        
        <div style="background-color: #f8fafc; padding: 25px; border-radius: 12px; border-left: 4px solid #3b82f6; margin-bottom: 25px;">
          <p style="margin: 0; font-size: 14px; font-weight: 600; color: #3b82f6; text-transform: uppercase; margin-bottom: 8px;">🚀 Nuevo Anuncio</p>
          <h2 style="margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1.2;">${announcement.title}</h2>
          <div style="margin-top: 12px; display: inline-block; padding: 4px 12px; border-radius: 20px; background-color: ${announcement.priority === 'URGENT' ? '#fef2f2' : '#eff6ff'}; border: 1px solid ${announcement.priority === 'URGENT' ? '#fee2e2' : '#dbeafe'};">
            <span style="font-size: 12px; font-weight: 700; color: ${announcement.priority === 'URGENT' ? '#b91c1c' : '#1d4ed8'};">${priorityLabel}</span>
          </div>
        </div>

        <p style="font-size: 16px; color: #334155; line-height: 1.4; margin-bottom: 20px;">
          Hola, <strong>${creatorName}</strong> ha publicado un anuncio que requiere tu atención:
        </p>

        <div style="color: #334155; font-size: 15px; line-height: 1.6; background-color: #ffffff; padding: 20px; border: 1px solid #f1f5f9; border-radius: 12px; margin-bottom: 30px; white-space: pre-wrap;">
${contentText.substring(0, 500)}${contentText.length > 500 ? '...' : ''}
        </div>

        <div style="text-align: center; margin-bottom: 35px;">
          <a href="${INTRANET_URL}" style="background-color: #2563eb; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 12px; font-weight: 700; display: inline-block; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);">
            Ver anuncio completo
          </a>
        </div>

        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-bottom: 25px;" />
        
        <div style="text-align: center;">
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">
            Este es un aviso automático de la Intranet Listosoft.<br>
            Por favor, no respondas directamente a este correo.
          </p>
          <p style="font-size: 12px; color: #cbd5e1; margin-top: 8px;">
            © 2026 Listosoft
          </p>
        </div>
      </div>
    `

    // 4. Enviar vía Resend
    // Nota: Resend requiere al menos un destinatario en 'to'. Usamos el mismo del remitente o uno genérico.
    const { data: resendData, error: resendError } = await resend.emails.send({
      from: 'Intranet Listosoft <onboarding@resend.dev>',
      to: 'onboarding@resend.dev', // Resend requiere un 'to'. BCC ocultará los correos reales.
      bcc: emails,
      subject: subject,
      html: html,
    })

    if (resendError) {
      throw new Error(`Error de Resend: ${resendError.message}`)
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Correos enviados exitosamente', 
      id: resendData?.id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error detallado:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
