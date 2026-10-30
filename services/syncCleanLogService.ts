import { supabase } from './supabaseClient';
import { AzCopySyncRun, LimpiezaRun, LimpiezaCandidateItem, AzCopyFileDetailResult } from '../types';

export interface SyncCleanLogsResult {
  azCopyRuns: AzCopySyncRun[];
  limpiezaRuns: LimpiezaRun[];
}

export const syncCleanLogService = {
  /**
   * Obtiene la lista de sincronizaciones de Azure y limpiezas programadas
   */
  async listLogs(): Promise<SyncCleanLogsResult> {
    const { data, error } = await supabase.functions.invoke('backup-ftp-logs', {
      body: { action: 'sync-clean-logs' },
    });

    if (error) {
      let message = error.message || 'No se pudieron consultar los logs de sincronización y limpieza.';
      const context = (error as { context?: Response }).context;
      if (context && typeof context.json === 'function') {
        try {
          const payload = await context.json();
          if (payload?.error) message = payload.error;
        } catch {
          // ignore
        }
      }
      throw new Error(message);
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return {
      azCopyRuns: Array.isArray(data?.azCopyRuns) ? data.azCopyRuns : [],
      limpiezaRuns: Array.isArray(data?.limpiezaRuns) ? data.limpiezaRuns : [],
    };
  },

  /**
   * Lee el contenido completo de un archivo de log específico
   */
  async readLog(filename: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke('backup-ftp-logs', {
      body: { action: 'read-sync-clean-log', filename },
    });

    if (error) {
      throw new Error(error.message || `No se pudo leer el archivo ${filename}`);
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data?.content || '';
  },

  /**
   * Obtiene el listado de archivos respaldados en Azure para un trabajo de AzCopy
   */
  async getAzCopyFileDetails(jobId: string, filename: string, logPath?: string): Promise<AzCopyFileDetailResult> {
    const { data, error } = await supabase.functions.invoke('backup-ftp-logs', {
      body: { action: 'read-azcopy-files', jobId, filename, logPath },
    });

    if (error) {
      let message = error.message || 'No se pudo obtener el detalle de archivos respaldados.';
      const context = (error as { context?: Response }).context;
      if (context && typeof context.json === 'function') {
        try {
          const payload = await context.json();
          if (payload?.error) message = payload.error;
        } catch {
          // ignore
        }
      }
      throw new Error(message);
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return {
      success: !!data?.success,
      notFound: !!data?.notFound,
      message: data?.message,
      logFile: data?.logFile,
      files: Array.isArray(data?.files) ? data.files : [],
      totalCompleted: Number(data?.totalCompleted || 0),
      totalFailed: Number(data?.totalFailed || 0),
    };
  },

  /**
   * Parsea los archivos candidatos o eliminados desde el texto completo del log de limpieza
   */
  parseLimpiezaDetails(content: string, isDryRun: boolean): LimpiezaCandidateItem[] {
    const items: LimpiezaCandidateItem[] = [];
    const regex = /(?:VISTA PREVIA:\s*borrar[ií]a|BORRADO:|ELIMINADO:)\s*([^\s]+)\s*\(\[(\w+)\]\s*empresa\s*([^\s,\)]+)(?:,\s*fecha\s*([^\)]+))?\)/gi;

    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      const filename = match[1].trim();
      let fileDate = match[4]?.trim() || '';
      if (!fileDate) {
        // Extraer fecha del nombre del archivo si no viene en el mensaje (ej: A001_099291272300124092026100714_PS.TXT)
        const dateMatch = filename.match(/_?(\d{2})(\d{2})(\d{4})(\d{2})(\d{2})(\d{2})_/);
        if (dateMatch) {
          fileDate = `${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]} ${dateMatch[4]}:${dateMatch[5]}:${dateMatch[6]}`;
        }
      }

      items.push({
        filename,
        type: match[2].toUpperCase().trim(),
        company: match[3].trim(),
        fileDate,
        status: isDryRun ? 'candidato' : 'eliminado',
      });
    }

    return items;
  },

  /**
   * Parsea los archivos fuera de formato omitidos
   */
  parseOmittedFiles(content: string): string[] {
    const omitted: string[] = [];
    const regex = /Fuera de formato:\s*([^\r\n]+)/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      omitted.push(match[1].trim());
    }
    return omitted;
  },
};
