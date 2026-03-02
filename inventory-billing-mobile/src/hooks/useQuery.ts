import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@lib/supabase';

export function useQuery<T>(
  table: string,
  filters?: Record<string, unknown>,
  dependencies: unknown[] = []
) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const filtersKey = JSON.stringify(filters);
  const depsKey = JSON.stringify(dependencies);

  const fetchData = useCallback(async () => {
    const parsedFilters = JSON.parse(filtersKey) as Record<string, unknown> | undefined;
    try {
      setLoading(true);
      let query = supabase.from(table).select('*');

      if (parsedFilters) {
        Object.entries(parsedFilters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      const { data: result, error: queryError } = await query;

      if (queryError) throw queryError;

      setData(result as T[]);
      setError(null);
    } catch (err) {
      setError(err as Error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [table, filtersKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData, depsKey]);

  return { data, loading, error, refetch: fetchData };
}
