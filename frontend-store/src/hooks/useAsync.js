import { useCallback, useEffect, useState } from 'react';

export function useAsync(asyncFn, deps = [], { immediate = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const run = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        const result = await asyncFn(...args);
        setData(result);
        return result;
      } catch (err) {
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    deps,
  );

  useEffect(() => {
    if (immediate) {
      run().catch(() => {});
    }
  }, [immediate, run]);

  return { data, loading, error, run, setData };
}
