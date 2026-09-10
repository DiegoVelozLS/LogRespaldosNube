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

export const FavoritesPanel: React.FC<FavoritesPanelProps> = ({ onNavigateToFolder }) => {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Cargar favoritos iniciales
    const loadFavorites = () => {
      const fav = favoritesService.getFavorites();
      setFavorites(fav.sort((a, b) => b.addedAt - a.addedAt));
    };
    
    loadFavorites();

    // Escuchar cambios en los favoritos
    const unsubscribe = favoritesService.onFavoritesChange((fav) => {
      setFavorites(fav.sort((a, b) => b.addedAt - a.addedAt));
    });

    return unsubscribe;
  }, []);

  const handleRemoveFavorite = (id: string) => {
    favoritesService.removeFavorite(id);
    setFavorites(prev => prev.filter(fav => fav.id !== id));
  };

  const handleClickFolder = (folderId: string, folderName: string) => {
    if (onNavigateToFolder) {
      onNavigateToFolder(folderId, folderName);
    }
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
        <div className="border-t border-slate-100 px-5 py-4 space-y-3">
          {/* Carpetas */}
          {folders.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Carpetas ({folders.length})</p>
              <div className="space-y-1">
                {folders.map(favorite => (
                  <div
                    key={favorite.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-slate-50 group transition-colors cursor-pointer"
                    onClick={() => handleClickFolder(favorite.id, favorite.name)}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
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
                ))}
              </div>
            </div>
          )}

          {/* Documentos */}
          {documents.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Documentos ({documents.length})</p>
              <div className="space-y-1">
                {documents.map(favorite => (
                  <div
                    key={favorite.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-slate-50 group transition-colors"
                  >
                    <a
                      href={favorite.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 min-w-0 flex-1 hover:text-blue-600"
                    >
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
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
