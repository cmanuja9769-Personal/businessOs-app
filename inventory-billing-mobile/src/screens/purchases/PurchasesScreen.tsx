import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MoreStackNavigationProp } from '@navigation/types';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import { useFocusRefresh } from '@hooks/useFocusRefresh';
import Card from '@components/ui/Card';
import { SkeletonList } from '@components/ui/Skeleton';
import EmptyState from '@components/ui/EmptyState';
import Input from '@components/ui/Input';
import OfflineBanner from '@components/ui/OfflineBanner';
import ListFooterLoader from '@components/ui/ListFooterLoader';
import SortSelector, { SortOption } from '@components/ui/SortSelector';
import { supabase } from '@lib/supabase';
import { formatCurrency, formatDate } from '@lib/utils';
import { NetworkService } from '@services/network';
import { lightTap } from '@lib/haptics';
import AnimatedListItem from '@components/ui/AnimatedListItem';

interface Purchase {
  id: string;
  purchase_number: string;
  supplier_name: string;
  purchase_date: string;
  total: number;
  paid_amount: number;
  balance: number;
  status: 'paid' | 'unpaid' | 'partial';
}

const PAGE_SIZE = 50;
const DEBOUNCE_MS = 300;

const STATUS_COLORS: Record<string, string> = {
  paid: '#10B981',
  unpaid: '#EF4444',
  partial: '#F59E0B',
};

function getStatusColor(status: string, fallback: string): string {
  return STATUS_COLORS[status] ?? fallback;
}

const PURCHASE_SORT_OPTIONS: SortOption[] = [
  { key: 'purchase_date', label: 'Date' },
  { key: 'total', label: 'Amount' },
  { key: 'supplier_name', label: 'Supplier' },
  { key: 'created_at', label: 'Recent' },
];

function extractPurchaseCount(
  result: { count?: number | null; error: unknown } | null
): number | null {
  if (!result || !('count' in result) || result.count === null) return null;
  return result.count ?? null;
}

function applyPurchasePageResults(
  items: Purchase[],
  isFirstPage: boolean,
  countResult: { count?: number | null; error: unknown } | null,
  setPurchases: (v: Purchase[] | ((prev: Purchase[]) => Purchase[])) => void,
  setTotalCount: (v: number) => void,
  totalCountRef: React.MutableRefObject<number>,
): void {
  if (isFirstPage) {
    setPurchases(items);
    const count = extractPurchaseCount(countResult);
    if (count !== null) {
      setTotalCount(count);
      totalCountRef.current = count;
    }
    return;
  }
  setPurchases((prev) => [...prev, ...items]);
}

function getPurchaseErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'Failed to load purchases';
}

export default function PurchasesScreen() {
  const navigation = useNavigation<MoreStackNavigationProp>();
  const { colors, isDark } = useTheme();
  const { organizationId } = useAuth();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, paid: 0, pending: 0 });
  const [sortKey, setSortKey] = useState('purchase_date');
  const [sortAsc, setSortAsc] = useState(false);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const currentQueryRef = useRef('');
  const totalCountRef = useRef(0);

  const fetchStats = useCallback(async () => {
    if (!organizationId) return;
    try {
      const { data } = await supabase
        .from('purchases')
        .select('total, paid_amount, balance')
        .eq('organization_id', organizationId)
        .is('deleted_at', null);

      if (data) {
        setStats({
          total: data.reduce((sum: number, p: Record<string, number>) => sum + (p.total || 0), 0),
          paid: data.reduce((sum: number, p: Record<string, number>) => sum + (p.paid_amount || 0), 0),
          pending: data.reduce((sum: number, p: Record<string, number>) => sum + (p.balance || 0), 0),
        });
      }
    } catch {}
  }, [organizationId]);

  const fetchPurchases = useCallback(async (
    query: string,
    pageNum: number,
    isRefresh: boolean = false
  ) => {
    if (!organizationId) {
      setPurchases([]);
      setLoading(false);
      return;
    }

    const isConnected = await NetworkService.checkConnection();
    if (!isConnected) {
      setIsOffline(true);
      setError('You are offline. Please check your internet connection.');
      setLoading(false);
      return;
    }
    setIsOffline(false);

    const isFirstPage = pageNum === 0;
    if (isFirstPage && !isRefresh) setLoading(true);
    if (!isFirstPage) setIsLoadingMore(true);

    try {
      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let countQuery = supabase
        .from('purchases')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .is('deleted_at', null);

      let dataQuery = supabase
        .from('purchases')
        .select('id, purchase_number, supplier_name, purchase_date, total, paid_amount, balance, status')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .order(sortKey, { ascending: sortAsc })
        .range(from, to);

      if (query.trim()) {
        const searchTerm = `%${query.trim()}%`;
        countQuery = countQuery.or(
          `purchase_number.ilike.${searchTerm},supplier_name.ilike.${searchTerm}`
        );
        dataQuery = dataQuery.or(
          `purchase_number.ilike.${searchTerm},supplier_name.ilike.${searchTerm}`
        );
      }

      const [countResult, dataResult] = await Promise.all([
        isFirstPage ? countQuery : Promise.resolve({ count: totalCountRef.current, error: null }),
        dataQuery,
      ]);

      if (currentQueryRef.current !== query) return;
      if (dataResult.error) throw dataResult.error;

      const items = (dataResult.data || []) as Purchase[];

      applyPurchasePageResults(items, isFirstPage, countResult, setPurchases, setTotalCount, totalCountRef);

      setHasMore(items.length === PAGE_SIZE);
      setPage(pageNum);
      setError(null);
    } catch (err: unknown) {
      setError(getPurchaseErrorMessage(err));
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
      setIsRefreshing(false);
    }
  }, [organizationId, sortKey, sortAsc]);

  useFocusRefresh(useCallback(() => {
    fetchPurchases(searchQuery, 0, true);
    fetchStats();
  }, [searchQuery, fetchPurchases, fetchStats]));

  useEffect(() => {
    currentQueryRef.current = searchQuery;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!searchQuery.trim()) {
      fetchPurchases('', 0);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      fetchPurchases(searchQuery, 0);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchQuery, fetchPurchases]);

  useEffect(() => {
    if (organizationId) {
      fetchPurchases('', 0);
      fetchStats();
    }
  }, [organizationId, fetchPurchases, fetchStats]);

  const handleEndReached = useCallback(() => {
    if (hasMore && !isLoadingMore && !loading) {
      fetchPurchases(searchQuery, page + 1);
    }
  }, [hasMore, isLoadingMore, loading, searchQuery, page, fetchPurchases]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setPage(0);
    fetchPurchases(searchQuery, 0, true);
    fetchStats();
  }, [searchQuery, fetchPurchases, fetchStats]);

  useEffect(() => {
    const unsubscribe = NetworkService.subscribeToNetworkChanges((connected) => {
      setIsOffline(!connected);
      if (connected && error) fetchPurchases(searchQuery, 0);
    });
    return () => unsubscribe();
  }, [searchQuery, error, fetchPurchases]);

  const renderPurchaseItem = useCallback(({ item, index }: { item: Purchase; index: number }) => (
    <AnimatedListItem index={index}>
      <Card
        onPress={() => navigation.navigate('PurchaseDetail', { purchaseId: item.id })}
        style={styles.purchaseCard}
      >
        <View style={styles.purchaseHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.purchaseNo, { color: colors.text }]} numberOfLines={1}>
              {item.purchase_number}
            </Text>
            <Text style={[styles.supplierName, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.supplier_name}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status, colors.textSecondary) }]}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
        <View style={[styles.purchaseFooter, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
          <Text style={[styles.purchaseDate, { color: colors.textSecondary }]}>{formatDate(item.purchase_date)}</Text>
          <Text style={[styles.purchaseAmount, { color: colors.primary }]}>{formatCurrency(item.total)}</Text>
        </View>
      </Card>
    </AnimatedListItem>
  ), [colors, isDark, navigation]);

  const renderListFooter = useCallback(() => (
    <ListFooterLoader
      isLoading={isLoadingMore}
      hasMore={hasMore}
      itemCount={purchases.length}
      totalCount={totalCount}
    />
  ), [isLoadingMore, hasMore, purchases.length, totalCount]);

  const renderEmptyState = useCallback(() => {
    if (loading) return null;
    if (error) {
      return (
        <EmptyState
          icon="alert-circle-outline"
          title="Something went wrong"
          description={error}
          actionText="Try Again"
          onAction={handleRefresh}
        />
      );
    }
    return (
      <EmptyState
        icon="cart-outline"
        title="No Purchases"
        description={searchQuery ? `No purchases matching "${searchQuery}"` : 'Create your first purchase to get started'}
        actionText="New Purchase"
        onAction={() => navigation.navigate('CreatePurchase', {})}
      />
    );
  }, [loading, error, searchQuery, handleRefresh, navigation]);

  if (loading && purchases.length === 0 && !searchQuery) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <SkeletonList count={6} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isOffline && <OfflineBanner onRetry={handleRefresh} />}

      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Ionicons name="wallet-outline" size={20} color="#6366F1" />
          <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>{formatCurrency(stats.total)}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#10B981" />
          <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>{formatCurrency(stats.paid)}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Paid</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Ionicons name="time-outline" size={20} color="#EF4444" />
          <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>{formatCurrency(stats.pending)}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
        </View>
      </View>

      <View style={styles.searchWrapper}>
        <Input
          placeholder="Search by purchase no or supplier..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="search"
          containerStyle={styles.searchInput}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {loading && purchases.length > 0 && (
          <View style={styles.searchIndicator}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
      </View>

      <SortSelector
        options={PURCHASE_SORT_OPTIONS}
        activeKey={sortKey}
        ascending={sortAsc}
        onSort={(key, asc) => { setSortKey(key); setSortAsc(asc); }}
      />

      <FlatList
        data={purchases}
        renderItem={renderPurchaseItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, purchases.length === 0 && styles.listContentEmpty]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderListFooter}
        removeClippedSubviews={true}
        maxToRenderPerBatch={15}
        windowSize={10}
        initialNumToRender={15}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => { lightTap(); navigation.navigate('CreatePurchase', {}); }}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statsContainer: { flexDirection: 'row', padding: 16, gap: 10 },
  statCard: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center', gap: 4, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
  statValue: { fontSize: 14, fontWeight: '700' },
  statLabel: { fontSize: 11 },
  searchWrapper: { paddingHorizontal: 16, paddingBottom: 8, position: 'relative' },
  searchInput: { marginBottom: 0 },
  searchIndicator: { position: 'absolute', right: 28, top: 12 },
  listContent: { padding: 16, paddingTop: 8, paddingBottom: 100 },
  listContentEmpty: { flexGrow: 1 },
  purchaseCard: { padding: 14 },
  purchaseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  purchaseNo: { fontSize: 15, fontWeight: '600' },
  supplierName: { fontSize: 13, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  purchaseFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  purchaseDate: { fontSize: 12 },
  purchaseAmount: { fontSize: 17, fontWeight: '700' },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
});
