import { supabase } from './supabaseClient';

export type BackupStage = 'ok' | 'error' | 'pending';

export interface BackupDatabaseResult {
  name: string;
  company?: string;
  backup: BackupStage;
  zip: BackupStage;
  ftp: BackupStage;
  file?: string;
}

export interface BackupRun {
  filename: string;
  server: string;
  date: string;
  startedAt: string;
  durationSeconds: number;
  databaseCount: number;
  successCount: number;
  status: 'success' | 'error';
  databases: BackupDatabaseResult[];
}

async function invoke<T>(body: Record<string, string>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('backup-ftp-logs', { body });
  if (error) {
    let message = error.message || 'No se pudieron leer los logs del FTP.';
    const context = (error as { context?: Response }).context;
    if (context && typeof context.json === 'function') {
      try {
        const payload = await context.json();
        if (payload?.error) message = payload.error;
      } catch {
        // El cuerpo ya no está disponible.
      }
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export const backupFtpLogService = {
  listRuns: () => invoke<{ runs: BackupRun[] }>({ action: 'list' }).then((data) => data.runs || []),
  readLog: (filename: string) => invoke<{ filename: string; content: string }>({ action: 'read', filename }),
};
