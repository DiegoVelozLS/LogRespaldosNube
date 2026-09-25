-- Al eliminar una programación, los registros del reporte se conservan.
-- Se guarda el nombre del respaldo antes de soltar la relación.

ALTER TABLE public.backup_logs
  ADD COLUMN IF NOT EXISTS schedule_name TEXT;

UPDATE public.backup_logs AS log
SET schedule_name = schedule.name
FROM public.backup_schedules AS schedule
WHERE log.schedule_id = schedule.id
  AND (log.schedule_name IS NULL OR log.schedule_name = '');

ALTER TABLE public.backup_logs
  ALTER COLUMN schedule_id DROP NOT NULL;

ALTER TABLE public.backup_logs
  DROP CONSTRAINT IF EXISTS backup_logs_schedule_id_fkey;

ALTER TABLE public.backup_logs
  ADD CONSTRAINT backup_logs_schedule_id_fkey
  FOREIGN KEY (schedule_id) REFERENCES public.backup_schedules(id)
  ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.keep_backup_log_schedule_name()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.backup_logs
  SET schedule_name = OLD.name
  WHERE schedule_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS backup_schedules_keep_log_name ON public.backup_schedules;

CREATE TRIGGER backup_schedules_keep_log_name
  BEFORE DELETE ON public.backup_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.keep_backup_log_schedule_name();
