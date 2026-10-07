import { supabase } from './supabaseClient';
import { BackupDownloadAuditRecord, AuditSummaryStats, User } from '../types';

const LOCAL_STORAGE_AUDIT_KEY = 'backup_download_audit_fallback_v1';
const AZURE_FREE_TIER_GB = 100;
const AZURE_EGRESS_COST_PER_GB = 0.087; // Tarifa estándar de salida en Azure sobre 100 GB

export const backupDownloadAuditService = {
  /**
   * Registra la descarga de un respaldo realizada por un usuario
   */
  async recordDownload(params: {
    file: { name: string; path: string; sizeBytes: number; server?: string };
    user: User;
  }): Promise<BackupDownloadAuditRecord> {
    const newRecord: Partial<BackupDownloadAuditRecord> = {
      user_id: params.user.id,
      user_name: `${params.user.name} ${params.user.lastName}`.trim(),
      user_email: params.user.email,
      user_role: params.user.role,
      filename: params.file.name,
      filepath: params.file.path,
      filesize_bytes: params.file.sizeBytes,
      server_name: params.file.server || extractServerFromName(params.file.name),
      downloaded_at: new Date().toISOString(),
      status: 'completed',
    } as any;

    try {
      const { data, error } = await supabase
        .from('backup_download_audit')
        .insert({
          user_id: newRecord.user_id,
          user_name: newRecord.user_name,
          user_email: newRecord.user_email,
          user_role: newRecord.user_role,
          filename: newRecord.filename,
          filepath: newRecord.filepath,
          filesize_bytes: newRecord.filesize_bytes,
          server_name: newRecord.server_name,
          downloaded_at: newRecord.downloaded_at,
          status: 'completed',
        })
        .select()
        .single();

      if (!error && data) {
        const record = mapRowToRecord(data);
        saveToLocalStorageFallback(record);
        return record;
      }
    } catch (err) {
      console.warn('No se pudo guardar en Supabase, guardando localmente:', err);
    }

    // Guardado de respaldo local
    const fallbackRecord: BackupDownloadAuditRecord = {
      id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: params.user.id,
      userName: `${params.user.name} ${params.user.lastName}`.trim(),
      userEmail: params.user.email,
      userRole: params.user.role,
      filename: params.file.name,
      filepath: params.file.path,
      filesizeBytes: params.file.sizeBytes,
      serverName: params.file.server || extractServerFromName(params.file.name),
      downloadedAt: new Date().toISOString(),
      status: 'completed',
    };

    saveToLocalStorageFallback(fallbackRecord);
    return fallbackRecord;
  },

  /**
   * Obtiene la lista completa de registros de auditoría de descargas
   */
  async getAuditLogs(): Promise<BackupDownloadAuditRecord[]> {
    let remoteRecords: BackupDownloadAuditRecord[] = [];
    try {
      const { data, error } = await supabase
        .from('backup_download_audit')
        .select('*')
        .order('downloaded_at', { ascending: false });

      if (!error && data) {
        remoteRecords = data.map(mapRowToRecord);
      }
    } catch (err) {
      console.warn('Error al leer auditoría de Supabase:', err);
    }

    const localRecords = getFromLocalStorageFallback();
    
    // Fusionar sin duplicados por ID
    const recordMap = new Map<string, BackupDownloadAuditRecord>();
    for (const rec of [...remoteRecords, ...localRecords]) {
      recordMap.set(rec.id, rec);
    }

    return Array.from(recordMap.values()).sort(
      (a, b) => new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime()
    );
  },

  /**
   * Calcula las métricas acumuladas de GBs descargados hoy, en el mes y estimación Azure
   */
  async getSummaryStats(): Promise<AuditSummaryStats> {
    const logs = await this.getAuditLogs();

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let todayDownloadBytes = 0;
    let todayCount = 0;

    let monthDownloadBytes = 0;
    let monthCount = 0;

    const userMap = new Map<string, { name: string; email: string; bytes: number }>();
    const serverMap = new Map<string, { name: string; bytes: number }>();
    const dailyMap = new Map<string, { bytes: number; count: number }>();

    for (const log of logs) {
      const logDate = new Date(log.downloadedAt);
      const dateStr = log.downloadedAt.split('T')[0];

      // Acumular Hoy
      if (dateStr === todayStr) {
        todayDownloadBytes += log.filesizeBytes;
        todayCount++;
      }

      // Acumular Mes Actual
      if (logDate.getFullYear() === currentYear && logDate.getMonth() === currentMonth) {
        monthDownloadBytes += log.filesizeBytes;
        monthCount++;

        // Top Usuarios
        const uKey = log.userEmail || log.userId;
        const currentU = userMap.get(uKey) || { name: log.userName, email: log.userEmail, bytes: 0 };
        currentU.bytes += log.filesizeBytes;
        userMap.set(uKey, currentU);

        // Top Servidores
        const sKey = log.serverName || 'General';
        const currentS = serverMap.get(sKey) || { name: sKey, bytes: 0 };
        currentS.bytes += log.filesizeBytes;
        serverMap.set(sKey, currentS);

        // Tendencia diaria
        const currentD = dailyMap.get(dateStr) || { bytes: 0, count: 0 };
        currentD.bytes += log.filesizeBytes;
        currentD.count++;
        dailyMap.set(dateStr, currentD);
      }
    }

    const monthDownloadGb = monthDownloadBytes / (1024 * 1024 * 1024);
    const monthUsedGbPercentage = Math.min(100, (monthDownloadGb / AZURE_FREE_TIER_GB) * 100);

    const excessGb = Math.max(0, monthDownloadGb - AZURE_FREE_TIER_GB);
    const azureEstimatedCostUsd = excessGb * AZURE_EGRESS_COST_PER_GB;

    const topUser = Array.from(userMap.values()).sort((a, b) => b.bytes - a.bytes)[0];
    const topServer = Array.from(serverMap.values()).sort((a, b) => b.bytes - a.bytes)[0];

    const dailyTrend = Array.from(dailyMap.entries())
      .map(([date, val]) => ({ date, bytes: val.bytes, count: val.count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      todayDownloadBytes,
      todayCount,
      monthDownloadBytes,
      monthCount,
      monthUsedGbPercentage,
      azureEstimatedCostUsd,
      topUser,
      topServer,
      dailyTrend,
    };
  },

  /**
   * Elimina un registro de auditoría específico (por ejemplo si la descarga falló o fue cancelada)
   */
  async deleteAuditLog(id: string): Promise<void> {
    try {
      // 1. Intentar eliminar de Supabase si no es local
      if (!id.startsWith('local-')) {
        const { error } = await supabase
          .from('backup_download_audit')
          .delete()
          .eq('id', id);

        if (error) {
          console.warn('Error al eliminar registro de Supabase:', error.message);
        }
      }
    } catch (err) {
      console.warn('Excepción al eliminar registro de Supabase:', err);
    }

    // 2. Eliminar del almacenamiento local fallback
    deleteFromLocalStorageFallback(id);
  },
};

function mapRowToRecord(row: any): BackupDownloadAuditRecord {
  return {
    id: row.id,
    userId: row.user_id || '',
    userName: row.user_name || 'Desconocido',
    userEmail: row.user_email || '',
    userRole: row.user_role || '',
    filename: row.filename || '',
    filepath: row.filepath || '',
    filesizeBytes: Number(row.filesize_bytes) || 0,
    serverName: row.server_name || extractServerFromName(row.filename || ''),
    downloadedAt: row.downloaded_at || new Date().toISOString(),
    ipAddress: row.ip_address,
    status: row.status || 'completed',
  };
}

function extractServerFromName(filename: string): string {
  const match = filename.match(/^Backup_(.+)_/i);
  return match ? match[1] : 'FTP-Server';
}

function saveToLocalStorageFallback(record: BackupDownloadAuditRecord) {
  try {
    const list = getFromLocalStorageFallback();
    list.unshift(record);
    localStorage.setItem(LOCAL_STORAGE_AUDIT_KEY, JSON.stringify(list.slice(0, 500)));
  } catch (err) {
    console.warn('Error al guardar en localStorage:', err);
  }
}

function deleteFromLocalStorageFallback(id: string) {
  try {
    const list = getFromLocalStorageFallback();
    const updated = list.filter((r) => r.id !== id);
    localStorage.setItem(LOCAL_STORAGE_AUDIT_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Error al eliminar de localStorage:', err);
  }
}

function getFromLocalStorageFallback(): BackupDownloadAuditRecord[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_AUDIT_KEY);
    if (!saved) return [];
    return JSON.parse(saved) as BackupDownloadAuditRecord[];
  } catch {
    return [];
  }
}

