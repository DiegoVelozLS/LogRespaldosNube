import { Document, DocumentCategory } from '../types';

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const ROOT_FOLDER_ID = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID;
const DRIVE_CACHE_TTL_MS = 1 * 60 * 1000; // 1 minuto para detectar cambios rápidamente

const getDriveCacheKey = (folderId: string | undefined) => `google_drive_folder_${folderId || ROOT_FOLDER_ID || 'root'}`;

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
    modifiedTime: string;
    description?: string;
    webViewLink?: string;
    parents?: string[];
    shortcutDetails?: {
        targetId: string;
        targetMimeType: string;
    };
}

export const googleDriveService = {
    /**
     * Obtiene el contenido de una carpeta de Google Drive con paginación automática
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
            let allItems: GoogleFile[] = [];
            let nextPageToken: string | undefined;
            let pageCount = 0;

            // Fetch con paginación automática
            do {
                const query = `'${normalizedFolderId}' in parents and trashed = false`;
                const fields = 'files(id, name, mimeType, size, modifiedTime, description, webViewLink, parents, shortcutDetails),nextPageToken';
                
                // Agregamos pageSize=1000 y pageToken para paginación
                const pageToken = nextPageToken ? `&pageToken=${nextPageToken}` : '';
                const url = accessToken 
                    ? `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&pageSize=1000&orderBy=modifiedTime desc&supportsAllDrives=true&includeItemsFromAllDrives=true${pageToken}`
                    : `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&pageSize=1000&orderBy=modifiedTime desc&key=${GOOGLE_API_KEY}&supportsAllDrives=true&includeItemsFromAllDrives=true${pageToken}`;
                
                const headers: HeadersInit = {};
                if (accessToken) {
                    headers['Authorization'] = `Bearer ${accessToken}`;
                    if (pageCount === 0) console.log('GoogleDriveService: Usando Access Token (OAuth)');
                } else {
                    if (pageCount === 0) console.warn('GoogleDriveService: No hay Access Token, operando en modo anónimo');
                }

                if (pageCount === 0) {
                    console.log('GoogleDriveService: Fetching URL:', url.replace(/key=AIza[^&]*/, 'key=AIza...'));
                }

                const response = await fetch(url, { headers });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    const errorMessage = errorData?.error?.message || 'Error desconocido';
                    
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
                const items: GoogleFile[] = data.files || [];
                allItems = allItems.concat(items);
                nextPageToken = data.nextPageToken;
                pageCount++;

                if (pageCount > 1) {
                    console.log(`GoogleDriveService: Página ${pageCount} - ${items.length} items (total: ${allItems.length})`);
                }
            } while (nextPageToken);

            if (pageCount > 1) {
                console.log(`GoogleDriveService: ✅ Completado - ${pageCount} páginas, ${allItems.length} items totales`);
            }

            const result = {
                folders: allItems.filter(item => 
                    item.mimeType === 'application/vnd.google-apps.folder' || 
                    (item.mimeType === 'application/vnd.google-apps.shortcut' && item.shortcutDetails?.targetMimeType === 'application/vnd.google-apps.folder')
                ).map(folder => {
                    if (folder.mimeType === 'application/vnd.google-apps.shortcut' && folder.shortcutDetails) {
                        return { ...folder, id: folder.shortcutDetails.targetId };
                    }
                    return folder;
                }),
                files: allItems.filter(item => 
                    item.mimeType !== 'application/vnd.google-apps.folder' && 
                    !(item.mimeType === 'application/vnd.google-apps.shortcut' && item.shortcutDetails?.targetMimeType === 'application/vnd.google-apps.folder')
                ).map(file => {
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
     * Obtiene el conteo total de documentos de forma recursiva con paginación completa
     */
    async getTotalDocumentCount(accessToken?: string): Promise<number> {
        if (!GOOGLE_API_KEY && !accessToken) return 0;

        try {
            const countRecursive = async (folderId: string, depth: number = 0): Promise<number> => {
                const maxDepth = 5; // Evitar recursión infinita
                if (depth > maxDepth) {
                    console.warn(`GoogleDriveService: Máxima profundidad alcanzada (${maxDepth})`);
                    return 0;
                }

                const { files, folders, error } = await googleDriveService.getFolderContents(folderId, accessToken);
                
                if (error) {
                    console.warn(`GoogleDriveService: Error contando carpeta ${folderId}:`, error);
                    return files?.length || 0;
                }

                let totalCount = files?.length || 0;

                if (folders && folders.length > 0) {
                    console.log(`GoogleDriveService: Contando ${folders.length} subcarpetas a profundidad ${depth}...`);
                    
                    const subfolderCounts = await Promise.allSettled(
                        folders.map(folder => countRecursive(folder.id, depth + 1))
                    );

                    subfolderCounts.forEach(result => {
                        if (result.status === 'fulfilled') {
                            totalCount += result.value;
                        }
                    });
                }

                return totalCount;
            };

            const total = await countRecursive(ROOT_FOLDER_ID || 'root');
            console.log(`GoogleDriveService: ✅ Conteo total completado: ${total} documentos`);
            return total;
        } catch (error) {
            console.error('Error calculating total documents:', error);
            return 0;
        }
    },

    /**
     * Obtiene los documentos más recientes compartidos en la documentación.
     */
    async getRecentDocuments(accessToken?: string, limit: number = 6): Promise<Document[]> {
        if (!GOOGLE_API_KEY && !accessToken) return [];

        try {
            const rootResult = await googleDriveService.getFolderContents(ROOT_FOLDER_ID, accessToken);
            const recentDocuments: Document[] = [];

            const addFiles = (files: GoogleFile[], categoryName: string, categoryId: string) => {
                files.forEach(file => {
                    const extension = file.name.split('.').pop()?.toUpperCase() || 'FILE';
                    recentDocuments.push({
                        id: file.id,
                        categoryId,
                        category: categoryName,
                        name: file.name,
                        description: file.description || '',
                        fileType: extension,
                        fileSize: googleDriveService.formatBytes(parseInt(file.size || '0')),
                        createdAt: file.modifiedTime,
                        fileUrl: file.webViewLink || '#',
                        parentFolderId: file.parents?.[0] || categoryId,
                    });
                });
            };

            addFiles(rootResult.files || [], 'Documentación', 'root');

            if (rootResult.folders && rootResult.folders.length > 0) {
                // Ahora procesa TODAS las carpetas (sin límite de 8), pero solo los primeros resultados se mostrarán
                const folderResults = await Promise.allSettled(
                    rootResult.folders.map(folder => googleDriveService.getFolderContents(folder.id, accessToken))
                );

                folderResults.forEach((result, index) => {
                    if (result.status === 'fulfilled' && result.value.files) {
                        const folder = rootResult.folders[index];
                        addFiles(result.value.files, folder?.name || 'Documentación', folder?.id || 'root');
                    }
                });
            }

            return recentDocuments
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
            const extension = file.name.split('.').pop()?.toUpperCase() || 'FILE';
            return {
                id: file.id,
                categoryId: categoryId,
                category: categoryName,
                name: file.name,
                description: file.description || '',
                fileType: extension,
                fileSize: googleDriveService.formatBytes(parseInt(file.size || '0')),
                createdAt: file.modifiedTime,
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
