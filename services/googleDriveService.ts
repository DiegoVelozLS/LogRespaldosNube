import { Document, DocumentCategory } from '../types';

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const ROOT_FOLDER_ID = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID;

export interface GoogleFile {
    id: string;
    name: string;
    mimeType: string;
    size?: string;
    modifiedTime: string;
    description?: string;
    webViewLink?: string;
}

export const googleDriveService = {
    /**
     * Obtiene el contenido de una carpeta de Google Drive usando API Key o Access Token
     */
    async getFolderContents(folderId: string = ROOT_FOLDER_ID, accessToken?: string): Promise<{ files: GoogleFile[], folders: GoogleFile[] }> {
        // Si no hay API KEY ni Token, no podemos hacer nada
        if (!GOOGLE_API_KEY && !accessToken) {
            console.warn('Google Credentials not found');
            return { files: [], folders: [] };
        }

        try {
            const query = `'${folderId}' in parents and trashed = false`;
            const fields = 'files(id, name, mimeType, size, modifiedTime, description, webViewLink)';
            
            // Si tenemos token, no enviamos la API KEY en la URL
            const url = accessToken 
                ? `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${fields}`
                : `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${fields}&key=${GOOGLE_API_KEY}`;
            
            const headers: HeadersInit = {};
            if (accessToken) {
                headers['Authorization'] = `Bearer ${accessToken}`;
                console.log('GoogleDriveService: Usando Access Token (OAuth)');
            } else {
                console.warn('GoogleDriveService: No hay Access Token, operando en modo anónimo');
            }

            const response = await fetch(url, { headers });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.group('ERROR Google Drive API');
                console.error('Status:', response.status);
                console.error('Mensaje de Google:', errorData?.error?.message || 'Sin mensaje detallado');
                console.error('Objeto completo:', errorData);
                console.groupEnd();
                return { files: [], folders: [] };
            }

            const data = await response.json();
            const allItems: GoogleFile[] = data.files || [];

            return {
                folders: allItems.filter(item => item.mimeType === 'application/vnd.google-apps.folder'),
                files: allItems.filter(item => item.mimeType !== 'application/vnd.google-apps.folder'),
            };
        } catch (error) {
            console.error('Fetch error from Google Drive:', error);
            return { files: [], folders: [] };
        }
    },

    /**
     * Obtiene el conteo total de documentos usando OAuth para mayor seguridad
     */
    async getTotalDocumentCount(accessToken?: string): Promise<number> {
        if (!GOOGLE_API_KEY && !accessToken) return 0;

        try {
            const { files, folders } = await googleDriveService.getFolderContents(ROOT_FOLDER_ID, accessToken);
            let totalCount = files.length;

            if (folders && folders.length > 0) {
                const results = await Promise.allSettled(
                    folders.slice(0, 10).map(folder => googleDriveService.getFolderContents(folder.id, accessToken))
                );

                results.forEach(result => {
                    if (result.status === 'fulfilled') {
                        totalCount += result.value.files.length;
                    }
                });
            }

            return totalCount;
        } catch (error) {
            console.error('Error calculating total documents:', error);
            return 0;
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
