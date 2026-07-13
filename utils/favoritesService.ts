// Sistema de favoritos con Supabase como fuente de verdad y localStorage como caché local.
// Máximo 50 favoritos por usuario.

import { supabaseDataService } from '../services/supabaseDataService';

export interface Favorite {
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
   * Lee el caché local (localStorage)
   */
  getFavorites(): Favorite[] {
    if (typeof window === 'undefined') return [];

    try {
      const stored = window.localStorage.getItem(FAVORITES_KEY);
      if (!stored) return [];

      const favorites = JSON.parse(stored) as Favorite[];
      return Array.isArray(favorites) ? favorites : [];
    } catch (error) {
      console.warn('Error reading favorites from localStorage:', error);
      return [];
    }
  },

  /**
   * Escribe el caché local (localStorage) sin emitir evento
   */
  _writeLocalCache(favorites: Favorite[]): void {
    try {
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch (error) {
      console.warn('Error writing favorites to localStorage:', error);
    }
  },

  /**
   * Carga favoritos desde Supabase y actualiza el caché local.
   * Si no hay sesión activa, usa el caché local.
   * Llamar al inicio de la app o al hacer login.
   */
  async syncFromSupabase(): Promise<Favorite[]> {
    try {
      const remoteFavorites = await supabaseDataService.getUserFavorites();
      if (remoteFavorites.length >= 0) {
        favoritesService._writeLocalCache(remoteFavorites);
        favoritesService.emitChange();
        console.log('✅ Favoritos sincronizados desde Supabase:', remoteFavorites.length);
        return remoteFavorites;
      }
    } catch (error) {
      console.warn('No se pudo sincronizar favoritos desde Supabase, usando caché local:', error);
    }
    return favoritesService.getFavorites();
  },

  /**
   * Verifica si un item está en favoritos
   */
  isFavorite(id: string): boolean {
    const favorites = favoritesService.getFavorites();
    return favorites.some(fav => fav.id === id);
  },

  /**
   * Agrega un item a favoritos (localStorage + Supabase)
   */
  async addFavorite(favorite: Omit<Favorite, 'addedAt'>): Promise<boolean> {
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

      // 1. Actualizar caché local inmediatamente (UX optimista)
      const updated = [...favorites, newFavorite];
      favoritesService._writeLocalCache(updated);
      favoritesService.emitChange();

      // 2. Persistir en Supabase en segundo plano
      supabaseDataService.addUserFavorite(favorite).catch(err =>
        console.error('Error persistiendo favorito en Supabase:', err)
      );

      console.log('✅ Agregado a favoritos:', favorite.name);
      return true;
    } catch (error) {
      console.error('Error adding favorite:', error);
      return false;
    }
  },

  /**
   * Elimina un item de favoritos (localStorage + Supabase)
   */
  async removeFavorite(id: string): Promise<boolean> {
    try {
      const favorites = favoritesService.getFavorites();
      const filtered = favorites.filter(fav => fav.id !== id);

      if (filtered.length === favorites.length) {
        return false; // No estaba en favoritos
      }

      // 1. Actualizar caché local inmediatamente
      favoritesService._writeLocalCache(filtered);
      favoritesService.emitChange();

      // 2. Eliminar en Supabase en segundo plano
      supabaseDataService.removeUserFavorite(id).catch(err =>
        console.error('Error eliminando favorito en Supabase:', err)
      );

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
  async toggleFavorite(favorite: Omit<Favorite, 'addedAt'>): Promise<boolean> {
    if (favoritesService.isFavorite(favorite.id)) {
      await favoritesService.removeFavorite(favorite.id);
      return false;
    } else {
      return favoritesService.addFavorite(favorite);
    }
  },

  /**
   * Guarda la lista completa de favoritos (útil para reordenamiento manual por drag & drop).
   * Actualiza el caché local y persiste el nuevo orden en Supabase.
   */
  saveFavorites(favorites: Favorite[]): void {
    try {
      favoritesService._writeLocalCache(favorites);
      favoritesService.emitChange();

      // Persistir el nuevo orden en Supabase
      const orderedIds = favorites.map(f => f.id);
      supabaseDataService.saveUserFavoritesOrder(orderedIds).catch(err =>
        console.error('Error guardando orden de favoritos en Supabase:', err)
      );
    } catch (error) {
      console.error('Error saving favorites list:', error);
    }
  },

  /**
   * Limpia todos los favoritos del caché local (no toca Supabase).
   * Usar solo para logout/reset local.
   */
  clearLocalCache(): void {
    window.localStorage.removeItem(FAVORITES_KEY);
    favoritesService.emitChange();
    console.log('🗑️ Caché local de favoritos eliminado');
  },

  /**
   * Obtiene conteo de favoritos
   */
  getFavoriteCount(): number {
    return favoritesService.getFavorites().length;
  },
};
