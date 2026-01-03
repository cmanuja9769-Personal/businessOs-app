import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@lib/supabase';
import { ApiResponse } from '@services/api';

export function useQuery<T>(
  table: string,
  filters?: Record<string, any>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase.from(table).select('*');

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
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
  }, [table, JSON.stringify(filters), ...dependencies]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
