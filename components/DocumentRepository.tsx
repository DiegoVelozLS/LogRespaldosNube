import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Document, DocumentCategory } from '../types';
import { googleDriveService } from '../services/googleDriveService';
import { supabaseDataService } from '../services/supabaseDataService';
import { FavoriteStar } from './FavoriteStar';
import { favoritesService } from '../utils/favoritesService';

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

type FileTypeFilter = 'ALL' | 'PDF' | 'EXCEL' | 'DOC' | 'PPT' | 'IMG';
type SortOption = 'recent' | 'name_asc' | 'name_desc' | 'oldest';
type ViewMode = 'grid' | 'list';

interface DocumentRepositoryProps {
  initialCategoryId?: string | null;
  initialCategoryName?: string;
  initialDocumentId?: string;
}

// Función para normalizar texto (ignora tildes y mayúsculas para búsquedas en español)
const normalizeText = (text: string = '') =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const DocumentRepository: React.FC<DocumentRepositoryProps> = ({
  initialCategoryId,
  initialCategoryName,
  initialDocumentId,
}) => {
  // Datos principales
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [subcategories, setSubcategories] = useState<DocumentCategory[]>([]);
  const [rootDocuments, setRootDocuments] = useState<Document[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentCategoryName, setCurrentCategoryName] = useState<string>('');

  // Estados de carga y autenticación
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAllDocs, setIsLoadingAllDocs] = useState(false);
  const [noGoogleToken, setNoGoogleToken] = useState(false);
  const [invalidApiKey, setInvalidApiKey] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [highlightedDocumentId, setHighlightedDocumentId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Estados del Buscador Superior y Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<'all' | 'current'>('all');
  const [typeFilter, setTypeFilter] = useState<FileTypeFilter>('ALL');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Inicialización y navegación
  useEffect(() => {
    const normalizedCategoryId = initialCategoryId && initialCategoryId !== 'root' ? initialCategoryId : null;
    setSelectedCategory(normalizedCategoryId);
    setCurrentCategoryName(initialCategoryName || '');
    setHighlightedDocumentId(initialDocumentId || null);
  }, [initialCategoryId, initialCategoryName, initialDocumentId]);

  // Cargar favoritos al montar
  useEffect(() => {
    const loadFavorites = () => {
      const favs = favoritesService.getFavorites();
      setFavorites(new Set(favs.map((f) => f.id)));
    };

    loadFavorites();

    const unsubscribe = favoritesService.onFavoritesChange((favs) => {
      setFavorites(new Set(favs.map((f) => f.id)));
    });

    return unsubscribe;
  }, []);

  // Limpiar resaltado después de unos segundos
  useEffect(() => {
    if (!highlightedDocumentId) return;

    const timer = window.setTimeout(() => {
      setHighlightedDocumentId(null);
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [highlightedDocumentId]);

  // Atajo de teclado: presionar '/' o 'Ctrl+K' para enfocar el buscador
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === '/' || (e.ctrlKey && e.key.toLowerCase() === 'k')) &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Reconectar a Google Drive
  const handleGoogleReconnect = async () => {
    try {
      setIsReconnecting(true);
      await supabaseDataService.reauthenticateGoogle();
    } catch (error) {
      console.error('Error reconectando Google:', error);
      alert('Error al reconectar con Google Drive. Por favor intente de nuevo.');
      setIsReconnecting(false);
    }
  };

  // Cargar catálogo completo recursivo de documentos (en segundo plano para búsqueda instantánea)
  const loadAllRepositoryDocuments = useCallback(async () => {
    try {
      setIsLoadingAllDocs(true);
      let token = await supabaseDataService.getGoogleToken();
      if (!token) {
        token = await supabaseDataService.refreshGoogleToken();
      }

      const all = await googleDriveService.getAllDocuments(token || undefined);
      setAllDocuments(all);
    } catch (error) {
      console.warn('Error precargando catálogo completo de documentos:', error);
    } finally {
      setIsLoadingAllDocs(false);
    }
  }, []);

  // Cargar categorías y archivos raíz
  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      setNoGoogleToken(false);

      let token = await supabaseDataService.getGoogleToken();
      if (!token) {
        token = await supabaseDataService.refreshGoogleToken();
      }

      const { folders, files, error, status } = await googleDriveService.getFolderContents(
        undefined,
        token || undefined
      );

      if (error && (status === 401 || status === 403)) {
        setNoGoogleToken(true);
        setInvalidApiKey(false);
        setCategories([]);
        setRootDocuments([]);
      } else if (error && status === 400) {
        setInvalidApiKey(true);
        setNoGoogleToken(false);
        setCategories([]);
        setRootDocuments([]);
      } else {
        const { categories: mappedCategories, documents: mappedRootDocs } =
          googleDriveService.mapGoogleItems(folders, files, 'Raíz', 'root');
        setCategories(mappedCategories);
        setRootDocuments(mappedRootDocs);
        setNoGoogleToken(false);
        setInvalidApiKey(false);
      }
    } catch (error) {
      console.error('Failed to load folders:', error);
      setNoGoogleToken(true);
      setRootDocuments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
    // Cargar en background el catálogo completo de todos los archivos y subcarpetas
    loadAllRepositoryDocuments();
  }, [loadInitialData, loadAllRepositoryDocuments]);

  // Cargar documentos al seleccionar una categoría específica
  useEffect(() => {
    if (selectedCategory) {
      const loadCategoryData = async () => {
        try {
          setIsLoading(true);
          setNoGoogleToken(false);

          let token = await supabaseDataService.getGoogleToken();
          if (!token) {
            token = await supabaseDataService.refreshGoogleToken();
          }

          const { files, folders: subfolders, error, status } =
            await googleDriveService.getFolderContents(selectedCategory, token || undefined);

          if (error && (status === 401 || status === 403)) {
            setNoGoogleToken(true);
            setInvalidApiKey(false);
            setDocuments([]);
          } else if (error && status === 400) {
            setInvalidApiKey(true);
            setNoGoogleToken(false);
            setDocuments([]);
          } else {
            const { documents: mappedDocs, categories: mappedSubcategories } =
              googleDriveService.mapGoogleItems(
                subfolders,
                files,
                currentCategoryName,
                selectedCategory
              );
            setDocuments(mappedDocs);
            setSubcategories(mappedSubcategories);
            setNoGoogleToken(false);
            setInvalidApiKey(false);
          }
        } catch (error) {
          console.error('Failed to load documents:', error);
          setNoGoogleToken(true);
        } finally {
          setIsLoading(false);
        }
      };
      loadCategoryData();
    } else {
      setDocuments([]);
      setSubcategories([]);
    }
  }, [selectedCategory, currentCategoryName]);

  // Si el usuario escribe y allDocuments aún no se ha cargado, forzar carga inmediata
  useEffect(() => {
    if ((searchQuery.trim().length > 0 || typeFilter !== 'ALL') && allDocuments.length === 0 && !isLoadingAllDocs) {
      loadAllRepositoryDocuments();
    }
  }, [searchQuery, allDocuments.length, isLoadingAllDocs, loadAllRepositoryDocuments]);

  // Helpers de tipos de archivo
  const getFileIcon = (fileType: string) => {
    const type = (fileType || '').toUpperCase();
    if (['PDF'].includes(type)) return '📄';
    if (['DOC', 'DOCX', 'TXT', 'RTF', 'ODT'].includes(type)) return '📝';
    if (['XLS', 'XLSX', 'CSV', 'ODS'].includes(type)) return '📊';
    if (['PPT', 'PPTX', 'ODP'].includes(type)) return '📉';
    if (['IMG', 'JPG', 'JPEG', 'PNG', 'WEBP', 'SVG', 'GIF'].includes(type)) return '🖼️';
    if (['ZIP', 'RAR', '7Z', 'TAR', 'GZ'].includes(type)) return '📦';
    return '📄';
  };

  const getFileTypeColor = (fileType: string) => {
    const type = (fileType || '').toUpperCase();
    switch (type) {
      case 'PDF':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'DOC':
      case 'DOCX':
      case 'TXT':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'XLS':
      case 'XLSX':
      case 'CSV':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PPT':
      case 'PPTX':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'PNG':
      case 'JPG':
      case 'JPEG':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const matchesTypeFilter = (fileType: string, filter: FileTypeFilter): boolean => {
    if (filter === 'ALL') return true;
    const type = (fileType || '').toUpperCase();
    if (filter === 'PDF') return type === 'PDF';
    if (filter === 'EXCEL') return ['XLS', 'XLSX', 'CSV', 'ODS', 'SPREADSHEET', 'SHEET'].includes(type);
    if (filter === 'DOC') return ['DOC', 'DOCX', 'TXT', 'RTF', 'ODT', 'DOCUMENT'].includes(type);
    if (filter === 'PPT') return ['PPT', 'PPTX', 'ODP', 'PRESENTATION'].includes(type);
    if (filter === 'IMG') return ['IMG', 'JPG', 'JPEG', 'PNG', 'WEBP', 'SVG', 'GIF'].includes(type);
    return true;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Favoritos handlers
  const handleToggleFavoriteDocument = async (e: React.MouseEvent, doc: Document) => {
    e.preventDefault();
    e.stopPropagation();

    const newFavState = await favoritesService.toggleFavorite({
      id: doc.id,
      type: 'document',
      name: doc.name,
      categoryId: doc.categoryId,
      category: doc.category,
      description: doc.description,
      fileUrl: doc.fileUrl,
    });

    setFavorites((prev) => {
      const updated = new Set(prev);
      if (newFavState) updated.add(doc.id);
      else updated.delete(doc.id);
      return updated;
    });
  };

  const handleToggleFavoriteFolder = async (e: React.MouseEvent, folder: DocumentCategory) => {
    e.preventDefault();
    e.stopPropagation();

    const newFavState = await favoritesService.toggleFavorite({
      id: folder.id,
      type: 'folder',
      name: folder.name,
      description: folder.description,
    });

    setFavorites((prev) => {
      const updated = new Set(prev);
      if (newFavState) updated.add(folder.id);
      else updated.delete(folder.id);
      return updated;
    });
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setTypeFilter('ALL');
    setOnlyFavorites(false);
  };

  // ================= FILTRADO Y ORDENAMIENTO =================
  const sortDocuments = useCallback(
    (docs: Document[]) => {
      return [...docs].sort((a, b) => {
        if (sortBy === 'recent') {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        }
        if (sortBy === 'name_asc') {
          return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        }
        if (sortBy === 'name_desc') {
          return b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: 'base' });
        }
        return 0;
      });
    },
    [sortBy]
  );

  const queryNorm = normalizeText(searchQuery);
  const isSearchActive = queryNorm.length > 0;

  // Filtrado de Carpetas
  const activeFolders = selectedCategory ? subcategories : categories;
  const filteredFolders = useMemo(() => {
    // Si hay un filtro específico de tipo (PDF, Excel, Word), ocultar carpetas para ver los archivos de inmediato
    if (typeFilter !== 'ALL') {
      return [];
    }
    return activeFolders.filter((folder) => {
      if (onlyFavorites && !favorites.has(folder.id)) return false;
      if (!isSearchActive) return true;
      return (
        normalizeText(folder.name).includes(queryNorm) ||
        normalizeText(folder.description).includes(queryNorm)
      );
    });
  }, [activeFolders, onlyFavorites, favorites, isSearchActive, queryNorm, typeFilter]);

  // Lista de Documentos a Mostrar:
  // Si hay búsqueda activa y el alcance es 'all' (por defecto), buscamos en ALL_DOCUMENTS (recursivo en todas las subcarpetas)
  // Si no hay búsqueda, o el alcance es 'current', mostramos solo los de la carpeta actual / raíz
  const isFilterActive = isSearchActive || typeFilter !== 'ALL' || onlyFavorites;

  const displayDocuments = useMemo(() => {
    let sourceDocs: Document[] = [];

    if (isFilterActive) {
      if (!selectedCategory || searchScope === 'all') {
        // Al filtrar por tipo (PDF, Excel, Word, etc.) o buscar texto, usar todo el repositorio
        sourceDocs = allDocuments.length > 0 ? allDocuments : selectedCategory ? documents : rootDocuments;
      } else {
        sourceDocs = documents;
      }
    } else {
      // Modo de navegación normal
      sourceDocs = selectedCategory ? documents : rootDocuments;
    }

    const filtered = sourceDocs.filter((doc) => {
      if (onlyFavorites && !favorites.has(doc.id)) return false;
      if (!matchesTypeFilter(doc.fileType, typeFilter)) return false;
      if (!isSearchActive) return true;

      // Buscar en nombre, descripción, nombre de carpeta y ruta completa
      return (
        normalizeText(doc.name).includes(queryNorm) ||
        normalizeText(doc.description).includes(queryNorm) ||
        normalizeText(doc.folderPath).includes(queryNorm) ||
        normalizeText(doc.category).includes(queryNorm) ||
        normalizeText(doc.fileType).includes(queryNorm)
      );
    });

    return sortDocuments(filtered);
  }, [
    isFilterActive,
    isSearchActive,
    searchScope,
    allDocuments,
    selectedCategory,
    documents,
    rootDocuments,
    onlyFavorites,
    favorites,
    typeFilter,
    queryNorm,
    sortDocuments,
  ]);

  const hasActiveFilters =
    isSearchActive || typeFilter !== 'ALL' || onlyFavorites;

  const totalResultsCount = filteredFolders.length + displayDocuments.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ================= BANNERS DE AUTENTICACIÓN GOOGLE DRIVE ================= */}
      {noGoogleToken && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-xl flex items-start justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="font-semibold text-amber-900 text-sm">Google Drive no conectado</h3>
              <p className="text-xs text-amber-800 mt-1">
                Tu token de Google Drive ha expirado. Reconecta para sincronizar y buscar los documentos corporativos.
              </p>
            </div>
          </div>
          <button
            onClick={handleGoogleReconnect}
            disabled={isReconnecting}
            className="flex-shrink-0 px-4 py-2 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
          >
            {isReconnecting ? 'Reconectando...' : 'Reconectar Google'}
          </button>
        </div>
      )}

      {invalidApiKey && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-xl flex items-start gap-4">
          <span className="text-2xl">🔑</span>
          <div>
            <h3 className="font-semibold text-red-900 text-sm">Error de API Key</h3>
            <p className="text-xs text-red-800 mt-1">
              Google indica "API key not valid". Por favor verifica tu configuración de Google Drive API.
            </p>
          </div>
        </div>
      )}

      {/* ================= CABECERA PRINCIPAL (LIMPIA, SIN RECUADRO) ================= */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-light text-slate-900 flex items-center gap-3">
              <span className="text-slate-400">
                <FolderIcon />
              </span>
              <span>
                {isSearchActive
                  ? 'Búsqueda de Documentos'
                  : selectedCategory
                  ? currentCategoryName
                  : 'Documentos Corporativos'}
              </span>
            </h1>
            <p className="text-slate-500 text-xs md:text-sm mt-1 max-w-2xl font-light">
              {isSearchActive
                ? `Buscando coincidencias para "${searchQuery}" en todas las carpetas y subcarpetas.`
                : selectedCategory
                ? `Explorando archivos y subdirectorios en "${currentCategoryName}".`
                : 'Gestión centralizada de recursos y documentación oficial. Seleccione una categoría para explorar los archivos compartidos.'}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => {
                loadInitialData();
                loadAllRepositoryDocuments();
              }}
              title="Sincronizar y refrescar"
              className="p-2 text-slate-400 hover:text-blue-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            >
              <svg
                className={`w-4 h-4 ${isLoading || isLoadingAllDocs ? 'animate-spin text-blue-600' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ================= BUSCADOR PRINCIPAL Y FILTROS (SIN RECUADRO) ================= */}
      <div className="space-y-4">
        {/* Input de Búsqueda */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
            {isLoadingAllDocs && isSearchActive ? (
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </div>

          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar en todo el repositorio (encuentra archivos dentro de carpetas y subcarpetas)..."
            className="w-full pl-11 pr-24 py-3 bg-white hover:bg-slate-50/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:ring-4 focus:ring-blue-500/10 shadow-xs transition-all outline-none"
          />

          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1.5">
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                title="Limpiar búsqueda"
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-200 rounded">
              /
            </kbd>
          </div>
        </div>

        {/* Filtros de Tipo y Controles Rápidos */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Chips de tipo de documento */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                typeFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setTypeFilter(typeFilter === 'PDF' ? 'ALL' : 'PDF')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-1 ${
                typeFilter === 'PDF'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
              }`}
            >
              <span>📄</span> PDFs
            </button>
            <button
              onClick={() => setTypeFilter(typeFilter === 'EXCEL' ? 'ALL' : 'EXCEL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-1 ${
                typeFilter === 'EXCEL'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
              }`}
            >
              <span>📊</span> Excel
            </button>
            <button
              onClick={() => setTypeFilter(typeFilter === 'DOC' ? 'ALL' : 'DOC')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-1 ${
                typeFilter === 'DOC'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-blue-700 hover:bg-blue-50 border border-blue-200'
              }`}
            >
              <span>📝</span> Word
            </button>
            <button
              onClick={() => setTypeFilter(typeFilter === 'PPT' ? 'ALL' : 'PPT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-1 ${
                typeFilter === 'PPT'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-amber-700 hover:bg-amber-50 border border-amber-200'
              }`}
            >
              <span>📉</span> Diapositivas
            </button>
            <button
              onClick={() => setTypeFilter(typeFilter === 'IMG' ? 'ALL' : 'IMG')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-1 ${
                typeFilter === 'IMG'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white text-purple-700 hover:bg-purple-50 border border-purple-200'
              }`}
            >
              <span>🖼️</span> Imágenes
            </button>

            {/* Botón de solo favoritos */}
            <button
              onClick={() => setOnlyFavorites(!onlyFavorites)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                onlyFavorites
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-200'
              }`}
            >
              <span>⭐</span> Solo Favoritos
            </button>
          </div>

          {/* Selector de Alcance, Ordenamiento y Vista */}
          <div className="flex items-center gap-2 shrink-0">
            {selectedCategory && isSearchActive && (
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
                <button
                  onClick={() => setSearchScope('all')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    searchScope === 'all'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Todo el Repositorio
                </button>
                <button
                  onClick={() => setSearchScope('current')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    searchScope === 'current'
                      ? 'bg-white text-slate-800 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Solo esta carpeta
                </button>
              </div>
            )}

            {/* Selector de Orden */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="pl-2.5 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer shadow-xs"
              >
                <option value="recent">Más recientes</option>
                <option value="name_asc">Nombre (A - Z)</option>
                <option value="name_desc">Nombre (Z - A)</option>
                <option value="oldest">Más antiguos</option>
              </select>
              <svg className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Selector de Vista: Grid vs List */}
            <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 shadow-xs">
              <button
                onClick={() => setViewMode('grid')}
                title="Vista en cuadrícula"
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                title="Vista en lista compacta"
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* ================= TRACKING DE DOCUMENTOS Y RUTA DE NAVEGACIÓN (DEBAJO DEL BUSCADOR) ================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 pb-2 border-b border-slate-200">
          {/* Breadcrumb sutil y limpio, más grande, sin casita ni botón volver */}
          <nav className="flex items-center gap-2.5 text-sm font-medium text-slate-400 uppercase tracking-widest flex-wrap">
            <button
              onClick={() => {
                setSelectedCategory(null);
                setCurrentCategoryName('');
                setSearchQuery('');
              }}
              className={`hover:text-blue-600 transition-colors ${
                !selectedCategory && !isSearchActive ? 'text-slate-900 font-bold' : 'text-slate-400'
              }`}
            >
              Repositorio
            </button>

            {selectedCategory && (
              <>
                <svg className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-slate-900 font-bold">{currentCategoryName}</span>
              </>
            )}

            {isSearchActive && (
              <>
                <svg className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-blue-600 font-bold normal-case">
                  Búsqueda: "${searchQuery}"
                </span>
              </>
            )}

            {typeFilter !== 'ALL' && (
              <>
                <svg className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-blue-600 font-bold normal-case">
                  {typeFilter === 'PDF' && 'PDFs'}
                  {typeFilter === 'EXCEL' && 'Excel'}
                  {typeFilter === 'DOC' && 'Word / Docs'}
                  {typeFilter === 'PPT' && 'Diapositivas'}
                  {typeFilter === 'IMG' && 'Imágenes'}
                </span>
              </>
            )}
          </nav>

          {/* Tracking de Estado y Conteo */}
          <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
            {hasActiveFilters ? (
              <>
                <span className="font-semibold text-slate-700">
                  {totalResultsCount} {totalResultsCount === 1 ? 'coincidencia' : 'coincidencias'}
                </span>
                {filteredFolders.length > 0 && (
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-normal">
                    {filteredFolders.length} carpetas
                  </span>
                )}
                {displayDocuments.length > 0 && (
                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-normal">
                    {displayDocuments.length} archivos
                  </span>
                )}
                <button
                  onClick={handleClearFilters}
                  className="text-blue-600 hover:text-blue-800 font-medium hover:underline ml-1"
                >
                  Limpiar filtros
                </button>
              </>
            ) : (
              <span className="text-slate-400 text-xs font-light">
                {selectedCategory
                  ? `${displayDocuments.length} archivos en esta carpeta`
                  : `${allDocuments.length > 0 ? `${allDocuments.length} documentos indexados` : `${rootDocuments.length} archivos en raíz`}`}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* ================= ESTADO DE CARGA PRINCIPAL ================= */}
      {isLoading && categories.length === 0 && documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-2xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4" />
          <p className="text-slate-400 text-sm font-light uppercase tracking-widest">Sincronizando con Google Drive...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* ================= SECCIÓN DE CARPETAS COINCIDENTES ================= */}
          {filteredFolders.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span>Carpetas</span>
                  <span className="text-slate-300 font-normal">({filteredFolders.length})</span>
                </h2>
              </div>

              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredFolders.map((category) => {
                    const colors = CATEGORY_COLORS[category.id] || CATEGORY_COLORS.default;
                    return (
                      <button
                        key={category.id}
                        onClick={() => {
                          setSelectedCategory(category.id);
                          setCurrentCategoryName(category.name);
                          setSearchQuery('');
                        }}
                        className="group relative bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all duration-300 overflow-hidden text-left"
                      >
                        <div className={`absolute top-0 left-0 bottom-0 w-1 ${colors.accent} opacity-0 group-hover:opacity-100 transition-opacity`} />

                        {/* Botón de Favorito */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <FavoriteStar
                            isFavorite={favorites.has(category.id)}
                            onClick={(e) => handleToggleFavoriteFolder(e, category)}
                          />
                        </div>

                        <div className="p-5">
                          <div className="p-3 bg-slate-50 rounded-lg text-slate-400 group-hover:text-blue-600 transition-colors inline-block mb-3">
                            <FolderIcon />
                          </div>
                          <h3 className="text-base font-semibold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors truncate">
                            {category.name}
                          </h3>
                          <p className="text-xs text-slate-500 line-clamp-2 font-light">
                            {category.description || 'Explorar contenido de esta carpeta'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 shadow-xs">
                  {filteredFolders.map((category) => (
                    <div
                      key={category.id}
                      onClick={() => {
                        setSelectedCategory(category.id);
                        setCurrentCategoryName(category.name);
                        setSearchQuery('');
                      }}
                      className="group relative flex items-center justify-between gap-3.5 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                            {category.name}
                          </p>
                          {category.description && (
                            <p className="text-xs text-slate-400 truncate">{category.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded border uppercase tracking-wider bg-slate-100 text-slate-600 border-slate-200">
                          Carpeta
                        </span>

                        <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                          <FavoriteStar
                            isFavorite={favorites.has(category.id)}
                            onClick={(e) => handleToggleFavoriteFolder(e, category)}
                            className="w-4 h-4"
                          />
                        </div>

                        <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= SECCIÓN DE DOCUMENTOS / ARCHIVOS ================= */}
          {(displayDocuments.length > 0 || (isSearchActive && filteredFolders.length === 0)) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span>
                    {isSearchActive
                      ? 'Documentos encontrados en todas las carpetas y subcarpetas'
                      : typeFilter !== 'ALL'
                      ? 'Archivos filtrados por formato en todo el repositorio'
                      : selectedCategory
                      ? 'Archivos en esta categoría'
                      : 'Archivos en raíz'}
                  </span>
                  <span className="text-slate-300 font-normal">({displayDocuments.length})</span>
                </h2>
              </div>

              {displayDocuments.length > 0 ? (
                viewMode === 'grid' ? (
                  /* ================= VISTA EN CUADRÍCULA (GRID) ================= */
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {displayDocuments.map((doc) => (
                      <a
                        key={doc.id}
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`group relative rounded-xl border p-4 hover:border-blue-300 hover:shadow-md transition-all duration-300 flex flex-col justify-between text-left ${
                          highlightedDocumentId === doc.id
                            ? 'border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        {/* Botón de Favorito */}
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <FavoriteStar
                            isFavorite={favorites.has(doc.id)}
                            onClick={(e) => handleToggleFavoriteDocument(e, doc)}
                          />
                        </div>

                        <div>
                          <div className="flex gap-3.5 items-start">
                            <div className="p-3 bg-slate-50 rounded-xl text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shrink-0">
                              <span className="text-2xl">{getFileIcon(doc.fileType)}</span>
                            </div>
                            <div className="flex-1 min-w-0 pr-6">
                              <h3
                                className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors"
                                title={doc.name}
                              >
                                {doc.name}
                              </h3>

                              {/* Ruta de ubicación en subcarpetas */}
                              {(doc.folderPath || (doc.category && doc.category !== 'Raíz')) && (
                                <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                                  <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                  </svg>
                                  <span className="truncate bg-slate-100/90 hover:bg-slate-200/90 text-slate-600 px-1.5 py-0.5 rounded transition-colors" title={`Ubicación: ${doc.folderPath || doc.category}`}>
                                    {doc.folderPath || doc.category}
                                  </span>
                                </div>
                              )}

                              {doc.description ? (
                                <p className="text-xs text-slate-500 line-clamp-2 mt-1.5 font-light leading-relaxed">
                                  {doc.description}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold rounded border uppercase tracking-wider ${getFileTypeColor(
                                doc.fileType
                              )}`}
                            >
                              {doc.fileType}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">{doc.fileSize}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400">{formatDate(doc.createdAt)}</span>
                            <svg className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  /* ================= VISTA EN LISTA (LIST) ================= */
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 shadow-xs">
                    {displayDocuments.map((doc) => (
                      <a
                        key={doc.id}
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`group relative flex items-center gap-3.5 px-4 py-3 hover:bg-slate-50 transition-colors ${
                          highlightedDocumentId === doc.id ? 'bg-blue-50/70 ring-1 ring-blue-300' : ''
                        }`}
                      >
                        <div className="h-9 w-9 rounded-lg bg-slate-50 flex items-center justify-center text-lg shrink-0 group-hover:bg-blue-50 transition-colors">
                          {getFileIcon(doc.fileType)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                              {doc.name}
                            </p>
                            {(doc.folderPath || (doc.category && doc.category !== 'Raíz')) && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-normal truncate max-w-xs">
                                📁 {doc.folderPath || doc.category}
                              </span>
                            )}
                          </div>
                          {doc.description && <p className="text-xs text-slate-400 truncate">{doc.description}</p>}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded border uppercase tracking-wider ${getFileTypeColor(
                              doc.fileType
                            )}`}
                          >
                            {doc.fileType}
                          </span>
                          <span className="hidden md:inline-block text-xs text-slate-400 w-16 text-right">
                            {doc.fileSize}
                          </span>
                          <span className="hidden sm:inline-block text-xs text-slate-400 w-24 text-right">
                            {formatDate(doc.createdAt)}
                          </span>

                          <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                            <FavoriteStar
                              isFavorite={favorites.has(doc.id)}
                              onClick={(e) => handleToggleFavoriteDocument(e, doc)}
                              className="w-4 h-4"
                            />
                          </div>

                          <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </div>
                      </a>
                    ))}
                  </div>
                )
              ) : (
                /* ================= ESTADO SIN RESULTADOS ================= */
                <div className="bg-slate-50 rounded-2xl p-12 text-center border border-dashed border-slate-300">
                  <div className="text-slate-300 mb-3 flex justify-center">
                    <FileIcon />
                  </div>
                  <h3 className="text-slate-900 font-medium mb-1">No se encontraron documentos</h3>
                  <p className="text-slate-500 text-xs md:text-sm font-light max-w-md mx-auto">
                    {isSearchActive
                      ? `No encontramos ningún archivo ni en carpetas ni en subcarpetas que coincida con "${searchQuery}".`
                      : 'No hay documentos en esta sección.'}
                  </p>
                  {hasActiveFilters && (
                    <button
                      onClick={handleClearFilters}
                      className="mt-4 px-4 py-2 bg-white border border-slate-200 text-blue-600 text-xs font-semibold rounded-lg hover:bg-slate-100 transition-colors shadow-xs"
                    >
                      Restablecer filtros y búsqueda
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Información del pie */}
          <div className="text-center pt-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100/80 rounded-full text-xs text-slate-500">
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Conectado a Google Drive Corporativo ({allDocuments.length > 0 ? `${allDocuments.length} documentos indexados` : 'Explorador activo'})
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentRepository;
