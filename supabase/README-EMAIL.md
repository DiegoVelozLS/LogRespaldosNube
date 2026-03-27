# Notificaciones de Correo con Resend

Para que la funcionalidad de notificaciones por correo funcione, debes configurar tu cuenta de **Resend** y desplegar la **Edge Function** en Supabase.

## 1. Configurar Variables de Entorno (Secrets)

Ya has configurado la clave de API (`RESEND_API_KEY`). Si necesitas cambiar la URL de la intranet para los botones del correo, ejecuta:

```bash
npx supabase secrets set INTRANET_URL="https://tu-intranet.web.app"
```

## 2. Desplegar la Función (Terminal de VS Code)

Para subir el código de la función a Supabase, ejecuta este comando en tu terminal de Visual Studio Code:

```bash
npx supabase functions deploy send-announcement-email
```

> [!IMPORTANT]
> - **Remitente**: Por defecto, los correos se envían desde `onboarding@resend.dev`.
> - **Dominio Propio**: Si quieres enviar desde tu propio correo (ej: `avisos@listosoft.com`), debes verificar tu dominio en el panel de Resend y luego actualizar el archivo `index.ts` de la función.
> - **Límite**: El plan gratuito de Resend permite enviar **3,000 correos al mes**.

## 3. Estructura de Archivos
- `supabase/functions/send-announcement-email/index.ts`: Lógica de envío con Resend.
- `services/announcementService.ts`: Lógica para disparar el correo al guardar un anuncio.
- `components/AnnouncementModal.tsx`: Interfaz de usuario para elegir los destinatarios.
