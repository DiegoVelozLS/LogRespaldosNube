import { supabase } from './supabaseClient';
import { BackupFtpFile, User } from '../types';
import { backupDownloadAuditService } from './backupDownloadAuditService';

export interface FtpDirectoryResult {
  currentPath: string;
  parentPath: string | null;
  items: BackupFtpFile[];
}

export const backupFtpExplorerService = {
  /**
   * Consulta directamente los archivos reales del servidor FTP al ingresar al módulo o carpeta.
   */
  async exploreDirectory(path: string = '/LSOFT'): Promise<FtpDirectoryResult> {
    const cleanPath = normalizeFtpPath(path);

    const { data, error } = await supabase.functions.invoke('backup-ftp-logs', {
      body: { action: 'explore', path: cleanPath },
    });

    if (error) {
      let message = error.message || 'Error al comunicarse con el servidor FTP.';
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

    const rawItems = Array.isArray(data?.items) ? data.items : [];
    const mappedItems = rawItems.map((item: any) => mapFtpItem(item, cleanPath));

    return {
      currentPath: data?.currentPath || cleanPath,
      parentPath: getParentPath(cleanPath),
      items: sortFtpItems(mappedItems),
    };
  },

  /**
   * Descarga un archivo real desde el servidor FTP y registra la auditoría de consumo (GBs).
   */
  async downloadFile(file: BackupFtpFile, currentUser: User): Promise<void> {
    // 1. Registrar auditoría de descarga de GBs
    await backupDownloadAuditService.recordDownload({
      file: {
        name: file.name,
        path: file.path,
        sizeBytes: file.sizeBytes,
        server: 'FTP-Server',
      },
      user: currentUser,
    });

    // 2. Descargar el archivo
    const { data, error } = await supabase.functions.invoke('backup-ftp-logs', {
      body: { action: 'download', path: file.path, filename: file.name },
    });

    if (error) {
      throw new Error(error.message || 'Error al descargar archivo desde el servidor FTP.');
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    if (data?.base64) {
      triggerBase64Download(data.base64, file.name, getMimeType(file.fileType));
      return;
    }

    if (data?.content) {
      triggerTextDownload(data.content, file.name, 'text/plain;charset=utf-8');
      return;
    }

    throw new Error('El servidor FTP no devolvió contenido para este archivo.');
  },
};

export function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function normalizeFtpPath(p: string): string {
  if (!p || p === '.' || p === '') return '/LSOFT';
  let cleaned = p.replace(/\\/g, '/');
  if (!cleaned.startsWith('/')) cleaned = '/' + cleaned;
  while (cleaned.includes('//')) cleaned = cleaned.replace('//', '/');
  if (cleaned.length > 1 && cleaned.endsWith('/')) cleaned = cleaned.slice(0, -1);
  return cleaned;
}

function getParentPath(currentPath: string): string | null {
  if (currentPath === '/LSOFT' || currentPath === '/' || !currentPath) return null;
  const lastSlash = currentPath.lastIndexOf('/');
  if (lastSlash <= 0) return '/LSOFT';
  return currentPath.substring(0, lastSlash) || '/LSOFT';
}

function mapFtpItem(item: any, currentDir: string): BackupFtpFile {
  const isDir = Boolean(item.isDirectory || item.isFolder || item.type === 'dir' || item.type === 'cdir');
  const bytes = isDir ? 0 : Number(item.size || item.sizeBytes || 0);
  const name = String(item.name || '').trim();
  const ext = isDir ? 'CARPETA' : (name.includes('.') ? name.split('.').pop()!.toUpperCase() : 'ARCHIVO');
  const fullPath = `${currentDir}/${name}`.replace(/\/+/g, '/');

  return {
    name,
    path: fullPath,
    sizeBytes: bytes,
    sizeFormatted: isDir ? '–' : formatBytes(bytes),
    modifiedAt: item.modifiedAt || '',
    isFolder: isDir,
    isDirectory: isDir,
    server: 'FTP-Server',
    fileType: ext,
  };
}

function sortFtpItems(items: BackupFtpFile[]): BackupFtpFile[] {
  return items.sort((a, b) => {
    if (a.isFolder && !b.isFolder) return -1;
    if (!a.isFolder && b.isFolder) return 1;
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getMimeType(extension: string): string {
  const ext = extension.toUpperCase();
  switch (ext) {
    case 'ZIP':
    case '7Z':
    case 'RAR':
      return 'application/zip';
    case 'TXT':
    case 'LOG':
    case 'CSV':
      return 'text/plain;charset=utf-8';
    case 'BAK':
    case 'SQL':
      return 'application/octet-stream';
    default:
      return 'application/octet-stream';
  }
}

function triggerBase64Download(base64: string, filename: string, mimeType: string) {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  triggerBlobDownload(blob, filename);
}

function triggerTextDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  triggerBlobDownload(blob, filename);
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
