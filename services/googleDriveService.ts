import { Document, DocumentCategory } from '../types';

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const ROOT_FOLDER_ID = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID;
const DRIVE_CACHE_TTL_MS = 5 * 60 * 1000;

// Límites del recorrido del árbol de carpetas para no disparar cientos de peticiones.
const DRIVE_PAGE_SIZE = 1000;
const DRIVE_MAX_PAGES = 5;
const DRIVE_MAX_DEPTH = 6;
const DRIVE_MAX_FOLDERS = 150;

// 0 = sin límite de fecha: se listan los últimos creados sin importar cuándo.
const RECENT_DOCUMENT_WINDOW_DAYS = 0;

// La versión del caché se sube al cambiar los campos pedidos a Drive para
// invalidar entradas antiguas que no traen createdTime.
const getDriveCacheKey = (folderId: string | undefined) => `google_drive_folder_v3_${folderId || ROOT_FOLDER_ID || 'root'}`;

const getDriveCacheEntry = <T,>(key: string): T | null => {
    if (typeof window === 'undefined') return null;

    try {
        const item = window.sessionStorage.getItem(key);
        if (!item) return null;

        const parsed = JSON.parse(item);
        if (!parsed || typeof parsed.timestamp !== 'number') return null;

        if (Date.now() - parsed.timestamp > DRIVE_CACHE_TTL_MS) {
            window.sessionStorage.removeItem(key);
            return null;
        }

        return parsed.value as T;
    } catch (error) {
        console.warn('Drive cache read error:', error);
        return null;
    }
};

const setDriveCacheEntry = (key: string, value: unknown) => {
    if (typeof window === 'undefined') return;

    try {
        window.sessionStorage.setItem(key, JSON.stringify({
            timestamp: Date.now(),
            value,
        }));
    } catch (error) {
        console.warn('Drive cache write error:', error);
    }
};

export interface GoogleFile {
    id: string;
    name: string;
    mimeType: string;
    size?: string;
    createdTime?: string;
    modifiedTime: string;
    description?: string;
    webViewLink?: string;
    parents?: string[];
    shortcutDetails?: {
        targetId: string;
        targetMimeType: string;
    };
}

interface WalkedFile {
    file: GoogleFile;
    categoryId: string;
    categoryName: string;
    folderPath?: string;
}

/**
 * Recorre el árbol de carpetas a partir de la raíz y devuelve todos los archivos
 * encontrados, sin duplicados. Limitado por DRIVE_MAX_DEPTH y DRIVE_MAX_FOLDERS.
 */
/**
 * Resuelve el tipo de archivo normalizado según mimeType o extensión
 */
export const resolveGoogleFileType = (file: GoogleFile): string => {
    const mime = (file.shortcutDetails?.targetMimeType || file.mimeType || '').toLowerCase();

    if (mime.includes('pdf')) return 'PDF';
    if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('sheet') || mime.includes('csv')) return 'XLS';
    if (mime.includes('presentation') || mime.includes('powerpoint')) return 'PPT';
    if (mime.includes('document') || mime.includes('word') || mime.includes('wordprocessingml') || mime.includes('text/plain')) return 'DOC';
    if (mime.startsWith('image/')) return 'IMG';
    if (mime.startsWith('video/')) return 'VIDEO';
    if (mime.startsWith('audio/')) return 'AUDIO';
    if (mime.includes('zip') || mime.includes('rar') || mime.includes('tar') || mime.includes('compressed')) return 'ZIP';

    const ext = file.name && file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() || '' : '';
    if (ext === 'pdf') return 'PDF';
    if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return 'XLS';
    if (['doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) return 'DOC';
    if (['ppt', 'pptx', 'odp'].includes(ext)) return 'PPT';
    if (['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes(ext)) return 'IMG';
    if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) return 'VIDEO';
    if (['zip', 'rar', '7z'].includes(ext)) return 'ZIP';

    return 'DOC';
};

const walkDriveTree = async (rootFolderId: string, accessToken?: string): Promise<WalkedFile[]> => {
    const collected: WalkedFile[] = [];
    const seenFiles = new Set<string>();
    const seenFolders = new Set<string>([rootFolderId]);
    let foldersScanned = 0;

    let currentLevel: Array<{ id: string; name: string; path: string }> = [{ id: rootFolderId, name: 'Raíz', path: '' }];

    for (let depth = 0; depth <= DRIVE_MAX_DEPTH && currentLevel.length > 0; depth++) {
        const results = await Promise.allSettled(
            currentLevel.map(folder => googleDriveService.getFolderContents(folder.id, accessToken))
        );

        const nextLevel: Array<{ id: string; name: string; path: string }> = [];

        results.forEach((result, index) => {
            if (result.status !== 'fulfilled') return;

            const parent = currentLevel[index];
            const isRoot = parent.id === rootFolderId;
            const currentPath = parent.path ? `${parent.path} > ${parent.name}` : parent.name;

            (result.value.files || []).forEach(file => {
                if (seenFiles.has(file.id)) return;
                seenFiles.add(file.id);
                collected.push({
                    file,
                    categoryId: isRoot ? 'root' : parent.id,
                    categoryName: parent.name,
                    folderPath: currentPath,
                });
            });

            (result.value.folders || []).forEach(folder => {
                if (seenFolders.has(folder.id) || foldersScanned >= DRIVE_MAX_FOLDERS) return;
                seenFolders.add(folder.id);
                foldersScanned++;
                nextLevel.push({ id: folder.id, name: folder.name, path: currentPath });
            });
        });

        currentLevel = nextLevel;
    }

    return collected;
};

export const googleDriveService = {
    /**
     * Obtiene el contenido de una carpeta de Google Drive usando API Key o Access Token
     */
    async getFolderContents(folderId: string = ROOT_FOLDER_ID, accessToken?: string): Promise<{ files: GoogleFile[], folders: GoogleFile[], error?: string, status?: number }> {
        const normalizedFolderId = folderId || ROOT_FOLDER_ID || 'root';
        const cacheKey = getDriveCacheKey(normalizedFolderId);
        const cached = getDriveCacheEntry<{ files: GoogleFile[], folders: GoogleFile[], error?: string, status?: number }>(cacheKey);

        if (cached) {
            return cached;
        }

        // Si no hay API KEY ni Token, no podemos hacer nada
        if (!GOOGLE_API_KEY && !accessToken) {
            console.warn('Google Credentials not found');
            return { files: [], folders: [], error: 'Google Credentials not found' };
        }

        try {
            const query = `'${normalizedFolderId}' in parents and trashed = false`;
            const fields = 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, description, webViewLink, parents, shortcutDetails)';

            const headers: HeadersInit = {};
            if (accessToken) {
                headers['Authorization'] = `Bearer ${accessToken}`;
                console.log('GoogleDriveService: Usando Access Token (OAuth)');
            } else {
                console.warn('GoogleDriveService: No hay Access Token, operando en modo anónimo');
            }

            const allItems: GoogleFile[] = [];
            let pageToken: string | undefined;
            let page = 0;

            do {
                const params = new URLSearchParams({
                    q: query,
                    fields,
                    orderBy: 'modifiedTime desc',
                    pageSize: String(DRIVE_PAGE_SIZE),
                    supportsAllDrives: 'true',
                    includeItemsFromAllDrives: 'true',
                });

                // Si tenemos token, no enviamos la API KEY en la URL
                if (!accessToken) params.set('key', GOOGLE_API_KEY);
                if (pageToken) params.set('pageToken', pageToken);

                const url = `https://www.googleapis.com/drive/v3/files?${params.toString()}`;
                console.log('GoogleDriveService: Fetching URL:', url.replace(/key=AIza[^&]*/, 'key=AIza...'));

                const response = await fetch(url, { headers });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    const errorMessage = errorData?.error?.message || 'Error desconocido';

                    // Detectar si es problema de autenticación
                    if (response.status === 401) {
                        console.group('❌ ERROR de Autenticación Google Drive');
                        console.error('El token de acceso ha expirado o no es válido');
                        console.error('Mensaje:', errorMessage);
                        console.groupEnd();
                    } else if (response.status === 403) {
                        console.group('❌ ERROR de Autorización Google Drive');
                        console.error('No tienes permiso para acceder a esta carpeta');
                        console.error('Mensaje:', errorMessage);
                        console.groupEnd();
                    } else {
                        console.group('⚠️ ERROR Google Drive API');
                        console.error('Status:', response.status);
                        console.error('Mensaje:', errorMessage);
                        console.error('Objeto completo (ERROR):', errorData);
                        console.groupEnd();
                    }

                    return { files: [], folders: [], error: errorMessage, status: response.status };
                }

                const data = await response.json();
                allItems.push(...((data.files || []) as GoogleFile[]));
                pageToken = data.nextPageToken;
                page++;
            } while (pageToken && page < DRIVE_MAX_PAGES);

            const result = {
                folders: allItems.filter(item => 
                    item.mimeType === 'application/vnd.google-apps.folder' || 
                    (item.mimeType === 'application/vnd.google-apps.shortcut' && item.shortcutDetails?.targetMimeType === 'application/vnd.google-apps.folder')
                ).map(folder => {
                    // Si es un acceso directo a carpeta, usamos el targetId como su id para navegar correctamente
                    if (folder.mimeType === 'application/vnd.google-apps.shortcut' && folder.shortcutDetails) {
                        return { ...folder, id: folder.shortcutDetails.targetId };
                    }
                    return folder;
                }),
                files: allItems.filter(item => 
                    item.mimeType !== 'application/vnd.google-apps.folder' && 
                    !(item.mimeType === 'application/vnd.google-apps.shortcut' && item.shortcutDetails?.targetMimeType === 'application/vnd.google-apps.folder')
                ).map(file => {
                    // Si es un acceso directo a archivo, podemos usar el targetId si es necesario, 
                    // pero mantenemos la info original para el enlace
                    if (file.mimeType === 'application/vnd.google-apps.shortcut' && file.shortcutDetails) {
                        return { ...file, id: file.shortcutDetails.targetId };
                    }
                    return file;
                }),
            };

            setDriveCacheEntry(cacheKey, result);
            return result;
        } catch (error) {
            console.error('❌ Fetch error from Google Drive:', error);
            return { files: [], folders: [], error: (error as any)?.message || 'Fetch error' };
        }
    },

    /**
     * Obtiene el conteo total de documentos usando OAuth para mayor seguridad
     */
    /**
     * Busca archivos por nombre en Google Drive directamente
     */
    /**
     * Obtiene todos los documentos recorriendo todo el árbol de carpetas de Drive (recursivo).
     * Usa caché de sessionStorage para responder al instante en búsquedas.
     */
    async getAllDocuments(accessToken?: string): Promise<Document[]> {
        const cacheKey = `google_drive_all_documents_v5_${ROOT_FOLDER_ID || 'root'}`;
        const cached = getDriveCacheEntry<Document[]>(cacheKey);
        if (cached && cached.length > 0) {
            return cached;
        }

        try {
            const walkedFiles = await walkDriveTree(ROOT_FOLDER_ID, accessToken);
            const documents: Document[] = walkedFiles.map(({ file, categoryId, categoryName, folderPath }) => {
                const extension = resolveGoogleFileType(file);
                return {
                    id: file.id,
                    categoryId,
                    category: categoryName,
                    name: file.name,
                    description: file.description || '',
                    fileType: extension,
                    fileSize: googleDriveService.formatBytes(parseInt(file.size || '0')),
                    createdAt: file.createdTime || file.modifiedTime,
                    fileUrl: file.webViewLink || '#',
                    parentFolderId: file.parents?.[0] || categoryId,
                    folderPath: folderPath || categoryName,
                };
            });

            if (documents.length > 0) {
                setDriveCacheEntry(cacheKey, documents);
            }
            return documents;
        } catch (error) {
            console.error('Error al obtener todos los documentos:', error);
            return [];
        }
    },

    /**
     * Busca archivos en cualquier carpeta o subcarpeta de Google Drive
     */
    async searchFiles(searchTerm: string, accessToken?: string): Promise<{ files: Document[], error?: string }> {
        if (!searchTerm || !searchTerm.trim()) return { files: [] };

        try {
            const allDocs = await googleDriveService.getAllDocuments(accessToken);
            const term = searchTerm.trim().toLowerCase();

            const matched = allDocs.filter(doc => 
                doc.name.toLowerCase().includes(term) ||
                (doc.description && doc.description.toLowerCase().includes(term)) ||
                (doc.folderPath && doc.folderPath.toLowerCase().includes(term)) ||
                (doc.category && doc.category.toLowerCase().includes(term)) ||
                (doc.fileType && doc.fileType.toLowerCase().includes(term))
            );

            return { files: matched };
        } catch (error: any) {
            console.error('Error buscando archivos en Drive:', error);
            return { files: [], error: error?.message || 'Error en búsqueda' };
        }
    },

    async getTotalDocumentCount(accessToken?: string): Promise<number> {
        if (!GOOGLE_API_KEY && !accessToken) return 0;

        try {
            const files = await walkDriveTree(ROOT_FOLDER_ID, accessToken);
            return files.length;
        } catch (error) {
            console.error('Error calculating total documents:', error);
            return 0;
        }
    },

    /**
     * Obtiene los últimos documentos creados en la documentación.
     * Se basa en la fecha de creación (no en la de modificación), por lo que un
     * documento antiguo que se editó hoy no aparece como novedad.
     */
    async getRecentDocuments(accessToken?: string, limit: number = 6, windowDays: number = RECENT_DOCUMENT_WINDOW_DAYS): Promise<Document[]> {
        if (!GOOGLE_API_KEY && !accessToken) return [];

        try {
            const walkedFiles = await walkDriveTree(ROOT_FOLDER_ID, accessToken);
            const cutoff = windowDays > 0 ? Date.now() - windowDays * 24 * 60 * 60 * 1000 : null;

            return walkedFiles
                .map(({ file, categoryId, categoryName }) => {
                    const extension = resolveGoogleFileType(file);
                    return {
                        id: file.id,
                        categoryId,
                        category: categoryName,
                        name: file.name,
                        description: file.description || '',
                        fileType: extension,
                        fileSize: googleDriveService.formatBytes(parseInt(file.size || '0')),
                        createdAt: file.createdTime || file.modifiedTime,
                        fileUrl: file.webViewLink || '#',
                        parentFolderId: file.parents?.[0] || categoryId,
                    } as Document;
                })
                .filter(doc => {
                    const createdAt = new Date(doc.createdAt).getTime();
                    if (Number.isNaN(createdAt)) return false;
                    return cutoff === null || createdAt >= cutoff;
                })
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, limit);
        } catch (error) {
            console.error('Error loading recent documents:', error);
            return [];
        }
    },

    /**
     * Mapea los datos de Google Drive al formato de la Intranet
     */
    mapGoogleItems(folders: GoogleFile[], files: GoogleFile[], categoryName: string, categoryId: string): { categories: DocumentCategory[], documents: Document[] } {
        const categories: DocumentCategory[] = (folders || []).map(folder => ({
            id: folder.id,
            name: folder.name,
            description: folder.description || `Carpeta de ${folder.name}`,
            icon: '📁',
        }));

        const documents: Document[] = (files || []).map(file => {
            const extension = resolveGoogleFileType(file);
            return {
                id: file.id,
                categoryId: categoryId,
                category: categoryName,
                name: file.name,
                description: file.description || '',
                fileType: extension,
                fileSize: googleDriveService.formatBytes(parseInt(file.size || '0')),
                createdAt: file.createdTime || file.modifiedTime,
                fileUrl: file.webViewLink || '#',
            };
        });

        return { categories, documents };
    },

    formatBytes(bytes: number, decimals: number = 2): string {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
};
