import React from 'react';

interface FavoriteStarProps {
  isFavorite: boolean;
  onClick: (e: React.MouseEvent) => void;
  className?: string;
  title?: string;
}

/**
 * Componente Estrella para marcar favoritos
 * - Vacía cuando no es favorito
 * - Amarilla cuando es favorito
 */
export const FavoriteStar: React.FC<FavoriteStarProps> = ({
  isFavorite,
  onClick,
  className = 'w-5 h-5',
  title = isFavorite ? 'Eliminar de favoritos' : 'Agregar a favoritos',
}) => {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      aria-label={title}
    >
      <svg
        className={`${className} transition-all ${
          isFavorite
            ? 'fill-yellow-400 text-yellow-400 drop-shadow-md'
            : 'fill-none stroke-gray-400 hover:stroke-gray-600'
        }`}
        viewBox="0 0 24 24"
        strokeWidth={isFavorite ? 0 : 1.5}
        stroke="currentColor"
      >
        <path
          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
};
