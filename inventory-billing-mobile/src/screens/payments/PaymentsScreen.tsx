import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import Card from '@components/ui/Card';
import { SkeletonList } from '@components/ui/Skeleton';
import EmptyState from '@components/ui/EmptyState';
import Input from '@components/ui/Input';
import OfflineBanner from '@components/ui/OfflineBanner';
import ListFooterLoader from '@components/ui/ListFooterLoader';
import AnimatedListItem from '@components/ui/AnimatedListItem';
import SortSelector, { SortOption } from '@components/ui/SortSelector';
import { spacing, fontSize } from '@theme/spacing';
import { supabase } from '@lib/supabase';
import { formatCurrency, formatDate } from '@lib/utils';
import { NetworkService } from '@services/network';
import { lightTap } from '@lib/haptics';
import { commonColors } from '@theme/colors';
import { useFocusRefresh } from '@hooks/useFocusRefresh';

interface Payment {
  id: string;
  invoice_id: string | null;
  purchase_id: string | null;
  amount: number;
  payment_date: string;
  payment_mode: string;
  reference_no: string | null;
  notes: string | null;
  invoices?: {
    invoice_number: string;
    customer_name: string;
  } | null;
  purchases?: {
    purchase_number: string;
    supplier_name: string;
  } | null;
}

const PAGE_SIZE = 50;
const DEBOUNCE_MS = 300;

const PAYMENT_SORT_OPTIONS: SortOption[] = [
  { key: 'payment_date', label: 'Date' },
  { key: 'amount', label: 'Amount' },
  { key: 'created_at', label: 'Recent' },
];

const METHOD_ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  cash: 'cash-outline',
  card: 'card-outline',
  upi: 'phone-portrait-outline',
  bank_transfer: 'business-outline',
  cheque: 'document-text-outline',
};

const METHOD_COLOR_MAP: Record<string, string> = {
  cash: '#22c55e',
  card: '#6366f1',
  upi: '#f59e0b',
  bank_transfer: '#3b82f6',
  cheque: '#8b5cf6',
};

function getMethodIcon(method: string): keyof typeof Ionicons.glyphMap {
  return METHOD_ICON_MAP[method?.toLowerCase()] ?? 'wallet-outline';
}

function getMethodColor(method: string): string {
  return METHOD_COLOR_MAP[method?.toLowerCase()] ?? '#64748b';
}

function normalizeJoinedField(field: unknown): unknown {
  return Array.isArray(field) ? field[0] : field;
}

function normalizePaymentRows(rows: Record<string, unknown>[]): Payment[] {
  return rows.map((row) => ({
    ...row,
    invoices: normalizeJoinedField(row.invoices),
    purchases: normalizeJoinedField(row.purchases),
  })) as Payment[];
}

function extractPaymentCount(
  result: { count?: number | null; error: unknown } | null
): number | null {
  if (!result || !('count' in result) || result.count === null) return null;
  return result.count ?? null;
}

function applyPaymentPageResults(
  items: Payment[],
  isFirstPage: boolean,
  countResult: { count?: number | null; error: unknown } | null,
  setPayments: (v: Payment[] | ((prev: Payment[]) => Payment[])) => void,
  setTotalCount: (v: number) => void,
  totalCountRef: React.MutableRefObject<number>,
): void {
  if (isFirstPage) {
    setPayments(items);
    const count = extractPaymentCount(countResult);
    if (count !== null) {
      setTotalCount(count);
      totalCountRef.current = count;
    }
    return;
  }
  setPayments((prev) => [...prev, ...items]);
}

function getPaymentErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'Failed to load payments';
}

const TABS = ['All', 'Receivables', 'Payables'] as const;
type PaymentTab = typeof TABS[number];

export default function PaymentsScreen() {
  const { colors } = useTheme();
  const { organizationId } = useAuth();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PaymentTab>('All');
  const [stats, setStats] = useState({ totalReceived: 0, totalPaid: 0, receivableCount: 0, payableCount: 0 });
  const [sortKey, setSortKey] = useState('payment_date');
  const [sortAsc, setSortAsc] = useState(false);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const currentQueryRef = useRef('');
  const totalCountRef = useRef(0);

  const fetchStats = useCallback(async () => {
    if (!organizationId) return;
    try {
      const { data } = await supabase
        .from('payments')
        .select('invoice_id, purchase_id, amount')
        .eq('organization_id', organizationId)
        .is('deleted_at', null);
      if (!data) return;
      let totalReceived = 0;
      let totalPaid = 0;
      let receivableCount = 0;
      let payableCount = 0;
      for (const p of data) {
        if (p.invoice_id) {
          totalReceived += p.amount || 0;
          receivableCount++;
        }
        if (p.purchase_id) {
          totalPaid += p.amount || 0;
          payableCount++;
        }
      }
      setStats({ totalReceived, totalPaid, receivableCount, payableCount });
    } catch {
      /* silent */
    }
  }, [organizationId]);

  const applyTabAndSearchFilters = useCallback((
    countQ: ReturnType<typeof supabase.from>,
    dataQ: ReturnType<typeof supabase.from>,
    query: string,
  ) => {
    let cq = countQ;
    let dq = dataQ;

    if (activeTab === 'Receivables') {
      cq = cq.not('invoice_id', 'is', null);
      dq = dq.not('invoice_id', 'is', null);
    } else if (activeTab === 'Payables') {
      cq = cq.not('purchase_id', 'is', null);
      dq = dq.not('purchase_id', 'is', null);
    }

    if (query.trim()) {
      const searchTerm = `%${query.trim()}%`;
      cq = cq.or(`reference_no.ilike.${searchTerm},payment_mode.ilike.${searchTerm}`);
      dq = dq.or(`reference_no.ilike.${searchTerm},payment_mode.ilike.${searchTerm}`);
    }

    return { countQuery: cq, dataQuery: dq };
  }, [activeTab]);

  const fetchPayments = useCallback(async (
    query: string,
    pageNum: number,
    isRefresh: boolean = false
  ) => {
    if (!organizationId) {
      setPayments([]);
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

      const baseCountQuery = supabase
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .is('deleted_at', null);

      const baseDataQuery = supabase
        .from('payments')
        .select('id, invoice_id, purchase_id, amount, payment_date, payment_mode, reference_no, notes, invoices(invoice_number, customer_name), purchases(purchase_number, supplier_name)')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .order(sortKey, { ascending: sortAsc })
        .range(from, to);

      const { countQuery, dataQuery } = applyTabAndSearchFilters(baseCountQuery, baseDataQuery, query);

      const [countResult, dataResult] = await Promise.all([
        isFirstPage ? countQuery : Promise.resolve({ count: totalCountRef.current, error: null }),
        dataQuery,
      ]);

      if (currentQueryRef.current !== query) return;
      if (dataResult.error) throw dataResult.error;

      const items = normalizePaymentRows(dataResult.data || []);

      applyPaymentPageResults(items, isFirstPage, countResult, setPayments, setTotalCount, totalCountRef);

      setHasMore(items.length === PAGE_SIZE);
      setPage(pageNum);
      setError(null);
    } catch (err: unknown) {
      setError(getPaymentErrorMessage(err));
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
      setIsRefreshing(false);
    }
  }, [organizationId, applyTabAndSearchFilters, sortKey, sortAsc]);

  useEffect(() => {
    currentQueryRef.current = searchQuery;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!searchQuery.trim()) {
      fetchPayments('', 0);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      fetchPayments(searchQuery, 0);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchQuery, fetchPayments]);

  useEffect(() => {
    if (organizationId) {
      fetchPayments('', 0);
      fetchStats();
    }
  }, [organizationId, fetchPayments, fetchStats]);

  useEffect(() => {
    fetchPayments(searchQuery, 0);
  }, [activeTab, fetchPayments, searchQuery]);

  useFocusRefresh(() => {
    fetchPayments(searchQuery, 0);
    fetchStats();
  });

  const handleEndReached = useCallback(() => {
    if (hasMore && !isLoadingMore && !loading) {
      fetchPayments(searchQuery, page + 1);
    }
  }, [hasMore, isLoadingMore, loading, searchQuery, page, fetchPayments]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setPage(0);
    fetchPayments(searchQuery, 0, true);
    fetchStats();
  }, [searchQuery, fetchPayments, fetchStats]);

  useEffect(() => {
    const unsubscribe = NetworkService.subscribeToNetworkChanges((connected) => {
      setIsOffline(!connected);
      if (connected && error) fetchPayments(searchQuery, 0);
    });
    return () => unsubscribe();
  }, [searchQuery, error, fetchPayments]);

  const renderItem = useCallback(({ item, index }: { item: Payment; index: number }) => {
    const methodColor = getMethodColor(item.payment_mode);
    return (
      <AnimatedListItem index={index}>
        <Card style={styles.paymentCard}>
          <View style={styles.paymentHeader}>
            <View style={[styles.methodIconBadge, { backgroundColor: methodColor + '18' }]}>
              <Ionicons name={getMethodIcon(item.payment_mode)} size={22} color={methodColor} />
            </View>
            <View style={styles.paymentInfo}>
              <Text style={[styles.paymentAmount, { color: colors.text }]}>
                {formatCurrency(item.amount)}
              </Text>
              <Text style={[styles.paymentDate, { color: colors.textSecondary }]}>
                {formatDate(item.payment_date)}
              </Text>
            </View>
            <View style={[styles.methodBadge, { backgroundColor: methodColor + '18' }]}>
              <Text style={[styles.methodText, { color: methodColor }]}>
                {(item.payment_mode || '').replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>

          {item.invoices && (
            <View style={styles.paymentDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="receipt-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.detailText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.invoices.invoice_number}
                </Text>
              </View>
              {item.invoices.customer_name && (
                <View style={styles.detailRow}>
                  <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.detailText, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.invoices.customer_name}
                  </Text>
                </View>
              )}
            </View>
          )}

          {item.purchases && (
            <View style={styles.paymentDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="cart-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.detailText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.purchases.purchase_number}
                </Text>
              </View>
              {item.purchases.supplier_name && (
                <View style={styles.detailRow}>
                  <Ionicons name="storefront-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.detailText, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.purchases.supplier_name}
                  </Text>
                </View>
              )}
            </View>
          )}

          {item.reference_no && (
            <View style={styles.detailRow}>
              <Ionicons name="bookmark-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.textSecondary }]} numberOfLines={1}>
                Ref: {item.reference_no}
              </Text>
            </View>
          )}
        </Card>
      </AnimatedListItem>
    );
  }, [colors]);

  const renderListFooter = useCallback(() => (
    <ListFooterLoader
      isLoading={isLoadingMore}
      hasMore={hasMore}
      itemCount={payments.length}
      totalCount={totalCount}
    />
  ), [isLoadingMore, hasMore, payments.length, totalCount]);

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
        icon="card-outline"
        title="No payments found"
        description={searchQuery ? `No payments matching "${searchQuery}"` : 'Payments will appear here once invoices are paid'}
      />
    );
  }, [loading, error, searchQuery, handleRefresh]);

  if (loading && payments.length === 0 && !searchQuery) {
    return <SkeletonList />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isOffline && <OfflineBanner onRetry={handleRefresh} />}

      <View style={styles.statsRow}>
        <Card style={[styles.statCard, { borderLeftColor: commonColors.stockHigh, borderLeftWidth: 3 }]}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Received</Text>
          <Text style={[styles.statValue, { color: commonColors.stockHigh }]}>{formatCurrency(stats.totalReceived)}</Text>
          <Text style={[styles.statCount, { color: colors.textSecondary }]}>{stats.receivableCount} payments</Text>
        </Card>
        <Card style={[styles.statCard, { borderLeftColor: commonColors.stockOut, borderLeftWidth: 3 }]}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Paid Out</Text>
          <Text style={[styles.statValue, { color: commonColors.stockOut }]}>{formatCurrency(stats.totalPaid)}</Text>
          <Text style={[styles.statCount, { color: colors.textSecondary }]}>{stats.payableCount} payments</Text>
        </Card>
      </View>

      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && { backgroundColor: colors.primary },
            ]}
            onPress={() => { lightTap(); setActiveTab(tab); }}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? '#fff' : colors.textSecondary }]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.searchWrapper}>
        <Input
          placeholder="Search by ref number or method..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="search"
          containerStyle={styles.searchInput}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {loading && payments.length > 0 && (
          <View style={styles.searchIndicator}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
      </View>

      <SortSelector
        options={PAYMENT_SORT_OPTIONS}
        activeKey={sortKey}
        ascending={sortAsc}
        onSort={(key, asc) => { setSortKey(key); setSortAsc(asc); }}
      />

      <FlatList
        data={payments}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, payments.length === 0 && styles.listContentEmpty]}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  statCard: {
    flex: 1,
  },
  statLabel: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginTop: 2,
  },
  statCount: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  searchWrapper: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    position: 'relative',
  },
  searchInput: {
    marginBottom: 0,
  },
  searchIndicator: {
    position: 'absolute',
    right: spacing.md + 12,
    top: spacing.sm + 10,
  },
  listContent: {
    padding: spacing.md,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  paymentCard: {
    padding: 14,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.sm,
  },
  methodIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentAmount: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  paymentDate: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  methodBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 10,
  },
  methodText: {
    fontSize: 10,
    fontWeight: '700',
  },
  paymentDetails: {
    gap: 4,
    marginBottom: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: fontSize.sm,
    flex: 1,
  },
});
