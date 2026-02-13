-- ================================================================
-- SCRIPT PARA AGREGAR NUEVO TIPO DE RESPALDO
-- Ejecuta este script en el Editor SQL de Supabase
-- ================================================================

-- 1. Eliminar la restricción actual
ALTER TABLE public.backup_schedules 
DROP CONSTRAINT IF EXISTS backup_schedules_type_check;

-- 2. Agregar la nueva restricción con DELETE_BACKUP
ALTER TABLE public.backup_schedules 
ADD CONSTRAINT backup_schedules_type_check 
CHECK (type IN ('DATABASE', 'FTP', 'EXTERNAL_DISK', 'CLOUD', 'DELETE_BACKUP'));
