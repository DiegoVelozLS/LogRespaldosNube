// Sistema de favoritos usando localStorage
// Máximo 50 favoritos por usuario

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

const FAVORITES_KEY = 'intranet_favorites';
const MAX_FAVORITES = 50;
const FAVORITES_CHANGE_EVENT = 'favorites-changed';

export const favoritesService = {
  /**
   * Emite un evento cuando los favoritos cambian
   */
  emitChange(): void {
    const event = new CustomEvent(FAVORITES_CHANGE_EVENT, {
      detail: { favorites: favoritesService.getFavorites() }
    });
    window.dispatchEvent(event);
  },

  /**
   * Escucha cambios en los favoritos
   */
  onFavoritesChange(callback: (favorites: Favorite[]) => void): () => void {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent;
      callback(customEvent.detail.favorites);
    };
    
    window.addEventListener(FAVORITES_CHANGE_EVENT, handler);
    
    // Retorna función para desuscribirse
    return () => window.removeEventListener(FAVORITES_CHANGE_EVENT, handler);
  },

  /**
   * Obtiene todos los favoritos del usuario
   */
  getFavorites(): Favorite[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = window.localStorage.getItem(FAVORITES_KEY);
      if (!stored) return [];
      
      const favorites = JSON.parse(stored) as Favorite[];
      return Array.isArray(favorites) ? favorites : [];
    } catch (error) {
      console.warn('Error reading favorites:', error);
      return [];
    }
  },

  /**
   * Verifica si un item está en favoritos
   */
  isFavorite(id: string): boolean {
    const favorites = favoritesService.getFavorites();
    return favorites.some(fav => fav.id === id);
  },

  /**
   * Agrega un item a favoritos
   */
  addFavorite(favorite: Omit<Favorite, 'addedAt'>): boolean {
    try {
      const favorites = favoritesService.getFavorites();

      // Verificar si ya está
      if (favorites.some(fav => fav.id === favorite.id)) {
        return false;
      }

      // Verificar límite
      if (favorites.length >= MAX_FAVORITES) {
        console.warn(`Máximo de ${MAX_FAVORITES} favoritos alcanzado`);
        return false;
      }

      const newFavorite: Favorite = {
        ...favorite,
        addedAt: Date.now(),
      };

      favorites.push(newFavorite);
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      favoritesService.emitChange();
      console.log('✅ Agregado a favoritos:', favorite.name);
      return true;
    } catch (error) {
      console.error('Error adding favorite:', error);
      return false;
    }
  },

  /**
   * Elimina un item de favoritos
   */
  removeFavorite(id: string): boolean {
    try {
      const favorites = favoritesService.getFavorites();
      const filtered = favorites.filter(fav => fav.id !== id);

      if (filtered.length === favorites.length) {
        return false; // No estaba en favoritos
      }

      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));
      favoritesService.emitChange();
      console.log('❌ Eliminado de favoritos:', id);
      return true;
    } catch (error) {
      console.error('Error removing favorite:', error);
      return false;
    }
  },

  /**
   * Toggle: agrega o quita de favoritos
   */
  toggleFavorite(favorite: Omit<Favorite, 'addedAt'>): boolean {
    if (favoritesService.isFavorite(favorite.id)) {
      return favoritesService.removeFavorite(favorite.id);
    } else {
      return favoritesService.addFavorite(favorite);
    }
  },

  /**
   * Limpia todos los favoritos
   */
  clearAllFavorites(): void {
    window.localStorage.removeItem(FAVORITES_KEY);
    favoritesService.emitChange();
    console.log('🗑️ Todos los favoritos eliminados');
  },

  /**
   * Obtiene conteo de favoritos
   */
  getFavoriteCount(): number {
    return favoritesService.getFavorites().length;
  },
};
