import React, { useEffect, useState } from 'react';
import { favoritesService } from '../utils/favoritesService';
import { FavoriteStar } from './FavoriteStar';

interface Favorite {
  id: string;
  type: 'document' | 'folder';
  name: string;
  categoryId?: string;
  category?: string;
  description?: string;
  fileUrl?: string;
  addedAt: number;
}

interface FavoritesPanelProps {
  onNavigateToFolder?: (folderId: string, folderName: string) => void;
}

const GripIcon = () => (
  <svg 
    className="w-3 h-4 text-slate-350 hover:text-slate-500 transition-colors mr-1 cursor-grab active:cursor-grabbing shrink-0" 
    fill="currentColor" 
    viewBox="0 0 24 24"
  >
    <circle cx="9" cy="5" r="1.5" />
    <circle cx="9" cy="12" r="1.5" />
    <circle cx="9" cy="19" r="1.5" />
    <circle cx="15" cy="5" r="1.5" />
    <circle cx="15" cy="12" r="1.5" />
    <circle cx="15" cy="19" r="1.5" />
  </svg>
);

export const FavoritesPanel: React.FC<FavoritesPanelProps> = ({ onNavigateToFolder }) => {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedType, setDraggedType] = useState<'folder' | 'document' | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    // Cargar favoritos iniciales
    const loadFavorites = () => {
      const fav = favoritesService.getFavorites();
      setFavorites(fav);
    };
    
    loadFavorites();

    // Escuchar cambios en los favoritos
    const unsubscribe = favoritesService.onFavoritesChange((fav) => {
      setFavorites(fav);
    });

    return unsubscribe;
  }, []);

  const handleRemoveFavorite = async (id: string) => {
    await favoritesService.removeFavorite(id);
    setFavorites(prev => prev.filter(fav => fav.id !== id));
  };

  const handleClickFolder = (folderId: string, folderName: string) => {
    if (onNavigateToFolder) {
      onNavigateToFolder(folderId, folderName);
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number, type: 'folder' | 'document') => {
    setDraggedIndex(index);
    setDraggedType(type);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number, type: 'folder' | 'document') => {
    e.preventDefault();
    if (draggedType === type && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDraggedType(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number, type: 'folder' | 'document') => {
    e.preventDefault();
    setDragOverIndex(null);

    if (draggedIndex === null || draggedType !== type || draggedIndex === targetIndex) {
      return;
    }

    const itemsOfType = favorites.filter(f => f.type === type);
    const reordered = [...itemsOfType];
    const [movedItem] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, movedItem);

    let typeIndex = 0;
    const newFavorites = favorites.map(item => {
      if (item.type === type) {
        return reordered[typeIndex++];
      }
      return item;
    });

    setFavorites(newFavorites);
    favoritesService.saveFavorites(newFavorites);
    
    setDraggedIndex(null);
    setDraggedType(null);
  };

  if (favorites.length === 0) {
    return null; // No mostrar si no hay favoritos
  }

  const folders = favorites.filter(f => f.type === 'folder');
  const documents = favorites.filter(f => f.type === 'document');

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      {/* Header del panel */}
      <div 
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 fill-yellow-400" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Mis Favoritos</h3>
            <p className="text-xs text-slate-500">{favorites.length} elemento{favorites.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>

      {/* Contenido expandible */}
      {isExpanded && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-4">
          {/* Carpetas */}
          {folders.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Carpetas ({folders.length})</p>
              <div className="space-y-1">
                {folders.map((favorite, index) => {
                  const isDragging = draggedIndex === index && draggedType === 'folder';
                  const isDragOver = dragOverIndex === index && draggedType === 'folder';
                  return (
                    <div
                      key={favorite.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index, 'folder')}
                      onDragOver={(e) => handleDragOver(e, index, 'folder')}
                      onDragLeave={handleDragLeave}
                      onDragEnd={handleDragEnd}
                      onDrop={(e) => handleDrop(e, index, 'folder')}
                      className={`flex items-center justify-between p-2 rounded hover:bg-slate-50 group transition-all cursor-pointer ${
                        isDragging ? 'opacity-40 bg-slate-100 scale-95' : ''
                      } ${
                        isDragOver ? 'bg-blue-50/70 border-l-2 border-blue-500 pl-1.5' : ''
                      }`}
                      onClick={() => handleClickFolder(favorite.id, favorite.name)}
                    >
                      <div className="flex items-center gap-1 min-w-0 flex-1">
                        <GripIcon />
                        <span className="text-lg flex-shrink-0">📁</span>
                        <div className="min-w-0">
                          <p className="text-sm text-slate-700 group-hover:text-blue-600 truncate font-medium">
                            {favorite.name}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFavorite(favorite.id);
                        }}
                        className="flex-shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all"
                        title="Eliminar de favoritos"
                      >
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Documentos */}
          {documents.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Documentos ({documents.length})</p>
              <div className="space-y-1">
                {documents.map((favorite, index) => {
                  const isDragging = draggedIndex === index && draggedType === 'document';
                  const isDragOver = dragOverIndex === index && draggedType === 'document';
                  return (
                    <div
                      key={favorite.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index, 'document')}
                      onDragOver={(e) => handleDragOver(e, index, 'document')}
                      onDragLeave={handleDragLeave}
                      onDragEnd={handleDragEnd}
                      onDrop={(e) => handleDrop(e, index, 'document')}
                      className={`flex items-center justify-between p-2 rounded hover:bg-slate-50 group transition-all ${
                        isDragging ? 'opacity-40 bg-slate-100 scale-95' : ''
                      } ${
                        isDragOver ? 'bg-blue-50/70 border-l-2 border-blue-500 pl-1.5' : ''
                      }`}
                    >
                      <a
                        href={favorite.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 min-w-0 flex-1 hover:text-blue-600"
                      >
                        <GripIcon />
                        <span className="text-lg flex-shrink-0">📄</span>
                        <div className="min-w-0">
                          <p className="text-sm text-slate-700 group-hover:text-blue-600 truncate font-medium">
                            {favorite.name}
                          </p>
                          {favorite.category && (
                            <p className="text-xs text-slate-400 truncate">{favorite.category}</p>
                          )}
                        </div>
                      </a>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFavorite(favorite.id);
                        }}
                        className="flex-shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all"
                        title="Eliminar de favoritos"
                      >
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
