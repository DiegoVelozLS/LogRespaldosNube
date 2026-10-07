-- Tabla para auditoría y contabilización de descargas de respaldos FTP (Azure Egress Control)
CREATE TABLE IF NOT EXISTS public.backup_download_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_role TEXT NOT NULL,
  filename TEXT NOT NULL,
  filepath TEXT NOT NULL,
  filesize_bytes BIGINT NOT NULL DEFAULT 0,
  server_name TEXT,
  downloaded_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  status TEXT DEFAULT 'completed'
);

-- Índices para consultas rápidas por fecha y usuario
CREATE INDEX IF NOT EXISTS idx_backup_download_audit_date ON public.backup_download_audit (downloaded_at);
CREATE INDEX IF NOT EXISTS idx_backup_download_audit_user ON public.backup_download_audit (user_id);
CREATE INDEX IF NOT EXISTS idx_backup_download_audit_filename ON public.backup_download_audit (filename);

-- Políticas RLS (Row Level Security)
ALTER TABLE public.backup_download_audit ENABLE ROW LEVEL SECURITY;

-- Lectura permitida para usuarios autenticados con rol ADMIN, TECH o SOPORTE
CREATE POLICY "Permitir lectura de auditoria a usuarios autorizados"
  ON public.backup_download_audit
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid()
      AND public.users.role IN ('ADMIN', 'TECH', 'SOPORTE')
    )
  );

-- Inserción permitida a cualquier usuario autenticado que realice una descarga
CREATE POLICY "Permitir registrar descargas a usuarios autenticados"
  ON public.backup_download_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
