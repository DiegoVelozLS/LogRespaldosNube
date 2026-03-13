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
     * Obtiene el contenido de una carpeta de Google Drive
     */
    async getFolderContents(folderId: string = ROOT_FOLDER_ID): Promise<{ files: GoogleFile[], folders: GoogleFile[] }> {
        if (!GOOGLE_API_KEY) {
            console.warn('Google API Key not found');
            return { files: [], folders: [] };
        }

        try {
            const query = `'${folderId}' in parents and trashed = false`;
            const fields = 'files(id, name, mimeType, size, modifiedTime, description, webViewLink)';
            const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${fields}&key=${GOOGLE_API_KEY}`;
            
            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Google Drive API Error:', response.status, errorData);
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
     * Obtiene el conteo total de documentos en la carpeta raíz y sus subcarpetas inmediatas
     */
    async getTotalDocumentCount(): Promise<number> {
        if (!GOOGLE_API_KEY) return 0;

        try {
            // Usamos la referencia directa al objeto para evitar problemas con 'this'
            const { files, folders } = await googleDriveService.getFolderContents(ROOT_FOLDER_ID);
            let totalCount = files.length;

            // Para cada subcarpeta, sumamos sus archivos (limitado a primer nivel)
            if (folders && folders.length > 0) {
                const results = await Promise.allSettled(
                    folders.slice(0, 10).map(folder => googleDriveService.getFolderContents(folder.id))
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
