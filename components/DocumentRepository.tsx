import React, { useState, useEffect } from 'react';
import { Document, DocumentCategory } from '../types';
import { googleDriveService } from '../services/googleDriveService';

// Iconos SVG minimalistas
const FolderIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

const FileIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

// Colores más serios y profesionales (Enterprise style)
const CATEGORY_COLORS: Record<string, { bg: string; border: string; icon: string; accent: string }> = {
  'default': { bg: 'bg-slate-50', border: 'border-slate-200', icon: 'text-slate-600', accent: 'bg-blue-600' },
  'dc1': { bg: 'bg-slate-50', border: 'border-slate-200', icon: 'text-slate-600', accent: 'bg-blue-600' },
  'dc2': { bg: 'bg-slate-50', border: 'border-slate-200', icon: 'text-slate-600', accent: 'bg-amber-500' },
  'dc3': { bg: 'bg-slate-50', border: 'border-slate-200', icon: 'text-slate-600', accent: 'bg-emerald-600' },
  'dc4': { bg: 'bg-slate-50', border: 'border-slate-200', icon: 'text-slate-600', accent: 'bg-indigo-600' },
  'dc5': { bg: 'bg-slate-50', border: 'border-slate-200', icon: 'text-slate-600', accent: 'bg-rose-600' },
};

const DocumentRepository: React.FC = () => {
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentCategoryName, setCurrentCategoryName] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Cargar categorías iniciales (Raíz)
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        const { folders } = await googleDriveService.getFolderContents();
        const { categories: mappedCategories } = googleDriveService.mapGoogleItems(folders, [], '', '');
        setCategories(mappedCategories);
      } catch (error) {
        console.error("Failed to load folders:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // Cargar documentos al seleccionar una categoría
  useEffect(() => {
    if (selectedCategory) {
      const loadCategoryData = async () => {
        try {
          setIsLoading(true);
          const { files } = await googleDriveService.getFolderContents(selectedCategory);
          const { documents: mappedDocs } = googleDriveService.mapGoogleItems([], files, currentCategoryName, selectedCategory);
          setDocuments(mappedDocs);
        } catch (error) {
          console.error("Failed to load documents:", error);
        } finally {
          setIsLoading(false);
        }
      };
      loadCategoryData();
    } else {
      setDocuments([]);
    }
  }, [selectedCategory, currentCategoryName]);

  // Documentos filtrados
  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getFileIcon = (fileType: string) => {
    const type = fileType.toUpperCase();
    if (['PDF'].includes(type)) return '📄';
    if (['DOC', 'DOCX'].includes(type)) return '📝';
    if (['XLS', 'XLSX'].includes(type)) return '📊';
    if (['PPT', 'PPTX'].includes(type)) return '📉';
    if (['IMG', 'JPG', 'PNG'].includes(type)) return '🖼️';
    return '📄';
  };

  const getFileTypeColor = (fileType: string) => {
    switch (fileType.toUpperCase()) {
      case 'PDF': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'DOC':
      case 'DOCX': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'XLS':
      case 'XLSX': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  };


  // ========== VISTA DE CARPETAS (sin categoría seleccionada) ==========
  if (!selectedCategory) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Header con estilo más sobrio */}
        <div className="border-b border-slate-200 pb-6">
          <h1 className="text-3xl font-light text-slate-900 flex items-center gap-3">
            <span className="text-slate-400">
              <FolderIcon />
            </span>
            Documentos Corporativos
          </h1>
          <p className="text-slate-500 mt-2 text-sm max-w-2xl">
            Gestión centralizada de recursos y documentación oficial. Seleccione una categoría para explorar los archivos compartidos.
          </p>
        </div>

        {/* Grid de Carpetas Rediseñado */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading && categories.length === 0 ? (
             <div className="col-span-full flex flex-col items-center justify-center py-20 grayscale opacity-50">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mb-4"></div>
               <p className="text-slate-400 text-sm font-light uppercase tracking-widest">Sincronizando con Drive...</p>
             </div>
          ) : categories?.map((category) => {
            const colors = CATEGORY_COLORS[category.id] || CATEGORY_COLORS['default'];

            return (
              <button
                key={category.id}
                onClick={() => {
                  setSelectedCategory(category.id);
                  setCurrentCategoryName(category.name);
                }}
                className="group relative bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-300 overflow-hidden text-left"
              >
                {/* Indicador de acento sutil */}
                <div className={`absolute top-0 left-0 bottom-0 w-1 ${colors.accent} opacity-0 group-hover:opacity-100 transition-opacity`} />

                <div className="p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div className="p-3 bg-slate-50 rounded-lg text-slate-400 group-hover:text-slate-600 transition-colors">
                      <FolderIcon />
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">
                    {category.name}
                  </h3>

                  <p className="text-sm text-slate-500 line-clamp-2 font-light">
                    {category.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>


        {/* Info de documentos totales */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-sm text-slate-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Reflejo de Google Drive activo
          </div>
        </div>
      </div>
    );
  }

  // ========== VISTA DE DOCUMENTOS (categoría seleccionada) ==========
  const colors = CATEGORY_COLORS[selectedCategory] || CATEGORY_COLORS['default'];

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      {/* Breadcrumb y Header */}
      <div className="border-b border-slate-200 pb-6">
        {/* Breadcrumb Sutil */}
        <nav className="flex items-center gap-2 text-xs font-medium text-slate-400 uppercase tracking-widest mb-6">
          <button
            onClick={() => {
              setSelectedCategory(null);
              setSearchTerm('');
            }}
            className="hover:text-blue-600 transition-colors flex items-center gap-1"
          >
            Repositorio
          </button>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-900">{currentCategoryName}</span>
        </nav>

        {/* Título Profesional */}
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-xl bg-white border border-slate-200 shadow-sm text-slate-400`}>
            <FolderIcon />
          </div>
          <div>
            <h1 className="text-2xl font-light text-slate-900 leading-tight">
              {currentCategoryName}
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-light">
              Explorando archivos y subcarpetas
            </p>
          </div>
        </div>
      </div>

      {/* Barra de búsqueda Minimalista */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full max-w-md group">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Filtrar por nombre o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
          />
        </div>
        <div className="text-xs text-slate-400 font-medium uppercase tracking-tighter bg-slate-100 px-3 py-1 rounded-full">
          {filteredDocuments.length} archivos encontrados
        </div>
      </div>

      {/* Lista de documentos Rediseñados */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 grayscale opacity-50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mb-4"></div>
          <p className="text-slate-400 text-sm font-light uppercase tracking-widest">Sincronizando con Drive...</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="bg-slate-50 rounded-2xl p-12 text-center border border-dashed border-slate-300">
          <div className="text-slate-300 mb-4 flex justify-center">
            <FileIcon />
          </div>
          <h3 className="text-slate-900 font-medium mb-1">Sin resultados</h3>
          <p className="text-slate-500 text-sm font-light">
            No se encontraron documentos en esta categoría para el filtro aplicado.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => (
            <a
              key={doc.id}
              href={doc.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:shadow-md transition-all duration-300 flex flex-col justify-between text-left"
            >
              <div className="flex gap-4 items-start">
                <div className="p-3 bg-slate-50 rounded-lg text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shrink-0">
                  <span className="text-xl">{getFileIcon(doc.fileType)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                    {doc.name}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1 font-light leading-relaxed">
                    {doc.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded border uppercase tracking-widest ${getFileTypeColor(doc.fileType)}`}>
                    {doc.fileType}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium uppercase">{doc.fileSize}</span>
                </div>
                <span className="text-[10px] text-slate-400">{formatDate(doc.createdAt)}</span>
              </div>
            </a>
          ))}
        </div>
      )}

    </div>
  );
};

export default DocumentRepository;
