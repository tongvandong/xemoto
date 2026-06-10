import { useCallback, useEffect, useState } from 'react';
import { fetchStores } from '../services/storeService.js';

function useStoreLocations() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStores = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextStores = await fetchStores();
      setStores(nextStores);
    } catch (err) {
      setStores([]);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  return {
    stores,
    loading,
    error,
    reload: loadStores,
  };
}

export default useStoreLocations;
