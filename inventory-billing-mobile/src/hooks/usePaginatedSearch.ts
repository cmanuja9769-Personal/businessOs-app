import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { supabase } from '@lib/supabase';
import { NetworkService } from '@services/network';

type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

interface UsePaginatedSearchOptions {
  table: string;
  organizationId: string | null;
  searchColumns?: string[];
  selectColumns?: string;
  orderBy?: string;
  ascending?: boolean;
  pageSize?: number;
  debounceMs?: number;
  additionalFilters?: Record<string, any>;
}

interface UsePaginatedSearchReturn<T> {
  items: T[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  status: FetchStatus;
  error: string | null;
  isOffline: boolean;
  hasMore: boolean;
  totalCount: number;
  isLoadingMore: boolean;
  loadMore: () => void;
  refresh: () => void;
  isRefreshing: boolean;
}

const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_DEBOUNCE_MS = 300;

export function usePaginatedSearch<T extends { id: string }>(
  options: UsePaginatedSearchOptions
): UsePaginatedSearchReturn<T> {
  const {
    table,
    organizationId,
    searchColumns = [],
    selectColumns = '*',
    orderBy = 'name',
    ascending = true,
    pageSize = DEFAULT_PAGE_SIZE,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    additionalFilters = {},
  } = options;

  const stableSearchColumns = useMemo(
    () => searchColumns,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(searchColumns)]
  );
  const stableAdditionalFilters = useMemo(
    () => additionalFilters,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(additionalFilters)]
  );

  const [items, setItems] = useState<T[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState<FetchStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(0);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const currentQueryRef = useRef('');
  const totalCountRef = useRef(0);

  const fetchData = useCallback(
    async (query: string, pageNum: number, isRefresh: boolean = false) => {
      if (!organizationId) {
        setItems([]);
        setStatus('idle');
        return;
      }

      const isConnected = await NetworkService.checkConnection();
      if (!isConnected) {
        setIsOffline(true);
        setError('You are offline. Please check your internet connection.');
        setStatus('error');
        return;
      }
      setIsOffline(false);

      const isFirstPage = pageNum === 0;
      if (isFirstPage && !isRefresh) {
        setStatus('loading');
      }
      if (!isFirstPage) {
        setIsLoadingMore(true);
      }

      try {
        const from = pageNum * pageSize;
        const to = from + pageSize - 1;

        let countQuery = supabase
          .from(table)
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId);

        let dataQuery = supabase
          .from(table)
          .select(selectColumns)
          .eq('organization_id', organizationId)
          .order(orderBy, { ascending })
          .range(from, to);

        Object.entries(stableAdditionalFilters).forEach(([key, value]) => {
          countQuery = countQuery.eq(key, value);
          dataQuery = dataQuery.eq(key, value);
        });

        if (query.trim() && stableSearchColumns.length > 0) {
          const searchTerm = `%${query.trim()}%`;
          const orFilter = stableSearchColumns
            .map((col) => `${col}.ilike.${searchTerm}`)
            .join(',');
          countQuery = countQuery.or(orFilter);
          dataQuery = dataQuery.or(orFilter);
        }

        const [countResult, dataResult] = await Promise.all([
          isFirstPage ? countQuery : Promise.resolve({ count: totalCountRef.current, error: null }),
          dataQuery,
        ]);

        if (currentQueryRef.current !== query) return;

        if (dataResult.error) throw dataResult.error;

        const fetchedItems = (dataResult.data || []) as unknown as T[];

        if (isFirstPage) {
          setItems(fetchedItems);
          if (countResult && 'count' in countResult && countResult.count !== null) {
            setTotalCount(countResult.count);
            totalCountRef.current = countResult.count;
          }
        } else {
          setItems((prev) => [...prev, ...fetchedItems]);
        }

        setHasMore(fetchedItems.length === pageSize);
        setPage(pageNum);
        setStatus('success');
        setError(null);
      } catch (err: any) {
        const isNetworkError =
          err?.message?.includes('network') ||
          err?.message?.includes('fetch') ||
          err?.message?.includes('Failed to fetch');

        if (isNetworkError) {
          setIsOffline(true);
          setError('Network error. Please check your connection and try again.');
        } else {
          setError(err?.message || `Failed to load ${table}`);
        }
        setStatus('error');
      } finally {
        setIsLoadingMore(false);
        setIsRefreshing(false);
      }
    },
    [organizationId, table, selectColumns, orderBy, ascending, pageSize, stableSearchColumns, stableAdditionalFilters]
  );

  useEffect(() => {
    currentQueryRef.current = searchQuery;

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!searchQuery.trim()) {
      fetchData('', 0);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      fetchData(searchQuery, 0);
    }, debounceMs);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery, fetchData, debounceMs]);

  useEffect(() => {
    if (organizationId) {
      fetchData('', 0);
    }
  }, [organizationId]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || status === 'loading') return;
    fetchData(searchQuery, page + 1);
  }, [hasMore, isLoadingMore, status, searchQuery, page, fetchData]);

  const refresh = useCallback(() => {
    setIsRefreshing(true);
    setPage(0);
    fetchData(searchQuery, 0, true);
  }, [searchQuery, fetchData]);

  useEffect(() => {
    const unsubscribe = NetworkService.subscribeToNetworkChanges((connected) => {
      setIsOffline(!connected);
      if (connected && status === 'error') {
        fetchData(searchQuery, 0);
      }
    });
    return () => unsubscribe();
  }, [searchQuery, status, fetchData]);

  return {
    items,
    searchQuery,
    setSearchQuery,
    status,
    error,
    isOffline,
    hasMore,
    totalCount,
    isLoadingMore,
    loadMore,
    refresh,
    isRefreshing,
  };
}
