import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { favoriteApi } from '../services/api.js';
import { useAuth } from './AuthContext.jsx';

const FavoriteContext = createContext(null);

export function useFavorite() {
  const context = useContext(FavoriteContext);

  if (!context) {
    throw new Error('useFavorite must be used within a FavoriteProvider');
  }

  return context;
}

function getProductId(productOrId) {
  if (productOrId && typeof productOrId === 'object') {
    return productOrId.id || productOrId.productId;
  }

  return productOrId;
}

function favoriteFromProduct(product) {
  return {
    productId: getProductId(product),
    product,
    createdAt: new Date().toISOString(),
  };
}

export function FavoriteProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);

  const favoriteIds = useMemo(
    () => new Set(favorites.map((item) => String(item.productId || item.product?.id)).filter(Boolean)),
    [favorites],
  );

  const favoriteProducts = useMemo(
    () => favorites.map((item) => item.product).filter(Boolean),
    [favorites],
  );

  const loadFavorites = useCallback(async () => {
    if (!isAuthenticated) {
      setFavorites([]);
      return [];
    }

    setLoading(true);
    try {
      const nextFavorites = await favoriteApi.getMine();
      setFavorites(nextFavorites);
      return nextFavorites;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadFavorites().catch(() => setFavorites([]));
  }, [loadFavorites]);

  const isFavorite = useCallback(
    (productOrId) => favoriteIds.has(String(getProductId(productOrId))),
    [favoriteIds],
  );

  const toggleFavorite = useCallback(
    async (productOrId) => {
      if (!isAuthenticated) {
        const error = new Error('AUTH_REQUIRED');
        error.code = 'AUTH_REQUIRED';
        throw error;
      }

      const productId = getProductId(productOrId);
      if (!productId) {
        return false;
      }

      const wasFavorite = favoriteIds.has(String(productId));
      const previousFavorites = favorites;

      if (wasFavorite) {
        setFavorites((current) => current.filter((item) => String(item.productId || item.product?.id) !== String(productId)));
      } else {
        setFavorites((current) => [favoriteFromProduct(productOrId), ...current]);
      }

      try {
        if (wasFavorite) {
          await favoriteApi.remove(productId);
          return false;
        }

        const savedFavorite = await favoriteApi.add(productId);
        setFavorites((current) => current.map((item) => (String(item.productId || item.product?.id) === String(productId) ? savedFavorite : item)));
        return true;
      } catch (error) {
        setFavorites(previousFavorites);
        throw error;
      }
    },
    [favoriteIds, favorites, isAuthenticated],
  );

  const value = useMemo(
    () => ({
      favorites,
      favoriteProducts,
      favoriteIds,
      count: favorites.length,
      loading,
      isFavorite,
      loadFavorites,
      toggleFavorite,
    }),
    [favoriteIds, favoriteProducts, favorites, isFavorite, loadFavorites, loading, toggleFavorite],
  );

  return <FavoriteContext.Provider value={value}>{children}</FavoriteContext.Provider>;
}

export default FavoriteContext;
