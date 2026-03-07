import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@lib/supabase';
import { NetworkService } from '@services/network';

interface Item {
  id: string;
  name: string;
  item_code?: string;
  sku?: string;
  current_stock: number;
  min_stock: number;
  sale_price?: number;
  selling_price?: number;
  purchase_price?: number;
  category?: string;
  hsn_code?: string;
  unit?: string;
  gst_rate?: number;
  organization_id?: string;
  barcode?: string;
  description?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

type SearchStatus = 'idle' | 'loading' | 'success' | 'error';

interface UseItemSearchReturn {
  items: Item[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  status: SearchStatus;
  error: string | null;
  isOffline: boolean;
  hasMore: boolean;
  totalCount: number;
  isLoadingMore: boolean;
  loadMore: () => void;
  refresh: () => void;
  isRefreshing: boolean;
}

const PAGE_SIZE = 50;
const DEBOUNCE_MS = 300;

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}

function classifyFetchError(err: unknown): { isNetwork: boolean; message: string } {
  const message = err instanceof Error ? err.message : '';
  const isNetwork = /network|fetch|Failed to fetch/i.test(message);
  return { isNetwork, message: message || 'Failed to load items' };
}

function buildItemSearchFilter(query: string): string | null {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const searchTerm = `%${trimmed}%`;
  return `name.ilike.${searchTerm},item_code.ilike.${searchTerm},barcode_no.ilike.${searchTerm},category.ilike.${searchTerm}`;
}

export function useItemSearch(
  organizationId: string | null,
  orderBy: string = 'name',
  ascending: boolean = true,
): UseItemSearchReturn {
  const [items, setItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(0);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentQueryRef = useRef('');
  const totalCountRef = useRef(0);

  const updateFetchLoadingState = useCallback((isFirstPage: boolean, isRefresh: boolean) => {
    if (isFirstPage && !isRefresh) {
      setStatus('loading');
    }
    if (!isFirstPage) {
      setIsLoadingMore(true);
    }
  }, []);

  const applyFetchResults = useCallback((fetchedItems: Item[], countResult: { count: number | null } | null, isFirstPage: boolean) => {
    if (!isFirstPage) {
      setItems((prev) => [...prev, ...fetchedItems]);
      return;
    }
    setItems(fetchedItems);
    const count = countResult?.count ?? null;
    if (count !== null) {
      setTotalCount(count);
      totalCountRef.current = count;
    }
  }, []);

  const handleFetchError = useCallback((err: unknown) => {
    if (isAbortError(err)) return;
    const { isNetwork, message } = classifyFetchError(err);
    if (isNetwork) {
      setIsOffline(true);
      setError('Network error. Please check your connection and try again.');
    } else {
      setError(message);
    }
    setStatus('error');
  }, []);

  const fetchItems = useCallback(
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

      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      const isFirstPage = pageNum === 0;
      updateFetchLoadingState(isFirstPage, isRefresh);

      try {
        const from = pageNum * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let countQuery = supabase
          .from('items')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .is('deleted_at', null);

        let dataQuery = supabase
          .from('items')
          .select('*')
          .eq('organization_id', organizationId)
          .is('deleted_at', null)
          .order(orderBy, { ascending })
          .range(from, to);

        const orFilter = buildItemSearchFilter(query);
        if (orFilter) {
          countQuery = countQuery.or(orFilter);
          dataQuery = dataQuery.or(orFilter);
        }

        const [countResult, dataResult] = await Promise.all([
          isFirstPage ? countQuery : Promise.resolve({ count: totalCountRef.current, error: null }),
          dataQuery,
        ]);

        if (currentQueryRef.current !== query) return;
        if (dataResult.error) throw dataResult.error;

        const fetchedItems = (dataResult.data || []) as Item[];
        applyFetchResults(fetchedItems, countResult as { count: number | null }, isFirstPage);
        setHasMore(fetchedItems.length === PAGE_SIZE);
        setPage(pageNum);
        setStatus('success');
        setError(null);
      } catch (err: unknown) {
        handleFetchError(err);
      } finally {
        setIsLoadingMore(false);
        setIsRefreshing(false);
      }
    },
    [organizationId, orderBy, ascending, updateFetchLoadingState, applyFetchResults, handleFetchError]
  );

  useEffect(() => {
    currentQueryRef.current = searchQuery;

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!searchQuery.trim()) {
      fetchItems('', 0);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      fetchItems(searchQuery, 0);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery, fetchItems]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || status === 'loading') return;
    fetchItems(searchQuery, page + 1);
  }, [hasMore, isLoadingMore, status, searchQuery, page, fetchItems]);

  const refresh = useCallback(() => {
    setIsRefreshing(true);
    setPage(0);
    fetchItems(searchQuery, 0, true);
  }, [searchQuery, fetchItems]);

  useEffect(() => {
    const unsubscribe = NetworkService.subscribeToNetworkChanges((connected) => {
      setIsOffline(!connected);
      if (connected && status === 'error') {
        fetchItems(searchQuery, 0);
      }
    });
    return () => unsubscribe();
  }, [searchQuery, status, fetchItems]);

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
