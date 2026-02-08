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

export function useItemSearch(organizationId: string | null): UseItemSearchReturn {
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

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const isFirstPage = pageNum === 0;
      if (isFirstPage && !isRefresh) {
        setStatus('loading');
      }
      if (!isFirstPage) {
        setIsLoadingMore(true);
      }

      try {
        const from = pageNum * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let countQuery = supabase
          .from('items')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId);

        let dataQuery = supabase
          .from('items')
          .select('*')
          .eq('organization_id', organizationId)
          .order('name', { ascending: true })
          .range(from, to);

        if (query.trim()) {
          const searchTerm = `%${query.trim()}%`;
          countQuery = countQuery.or(
            `name.ilike.${searchTerm},item_code.ilike.${searchTerm},barcode.ilike.${searchTerm},category.ilike.${searchTerm}`
          );
          dataQuery = dataQuery.or(
            `name.ilike.${searchTerm},item_code.ilike.${searchTerm},barcode.ilike.${searchTerm},category.ilike.${searchTerm}`
          );
        }

        const [countResult, dataResult] = await Promise.all([
          isFirstPage ? countQuery : Promise.resolve({ count: totalCountRef.current, error: null }),
          dataQuery,
        ]);

        if (currentQueryRef.current !== query) return;

        if (dataResult.error) throw dataResult.error;

        const fetchedItems = (dataResult.data || []) as Item[];

        if (isFirstPage) {
          setItems(fetchedItems);
          if (countResult && 'count' in countResult && countResult.count !== null) {
            setTotalCount(countResult.count);
            totalCountRef.current = countResult.count;
          }
        } else {
          setItems((prev) => [...prev, ...fetchedItems]);
        }

        setHasMore(fetchedItems.length === PAGE_SIZE);
        setPage(pageNum);
        setStatus('success');
        setError(null);
      } catch (err: any) {
        if (err?.name === 'AbortError') return;

        const isNetworkError =
          err?.message?.includes('network') ||
          err?.message?.includes('fetch') ||
          err?.message?.includes('Failed to fetch');

        if (isNetworkError) {
          setIsOffline(true);
          setError('Network error. Please check your connection and try again.');
        } else {
          setError(err?.message || 'Failed to load items');
        }
        setStatus('error');
      } finally {
        setIsLoadingMore(false);
        setIsRefreshing(false);
      }
    },
    [organizationId]
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
