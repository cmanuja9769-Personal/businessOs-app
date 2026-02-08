import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import Card from '@components/ui/Card';
import Loading from '@components/ui/Loading';
import EmptyState from '@components/ui/EmptyState';
import Input from '@components/ui/Input';
import OfflineBanner from '@components/ui/OfflineBanner';
import ListFooterLoader from '@components/ui/ListFooterLoader';
import { spacing, fontSize } from '@theme/spacing';
import { supabase } from '@lib/supabase';
import { formatCurrency, formatDate } from '@lib/utils';
import { NetworkService } from '@services/network';

interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  invoices?: {
    invoice_number: string;
    customer_name: string;
  } | null;
}

const PAGE_SIZE = 50;
const DEBOUNCE_MS = 300;

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

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const currentQueryRef = useRef('');
  const totalCountRef = useRef(0);

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

      let countQuery = supabase
        .from('payments')
        .select('id, invoices!inner(organization_id)', { count: 'exact', head: true })
        .eq('invoices.organization_id', organizationId);

      let dataQuery = supabase
        .from('payments')
        .select('id, invoice_id, amount, payment_date, payment_method, reference_number, notes, invoices!inner(invoice_number, customer_name, organization_id)')
        .eq('invoices.organization_id', organizationId)
        .order('payment_date', { ascending: false })
        .range(from, to);

      if (query.trim()) {
        const searchTerm = `%${query.trim()}%`;
        countQuery = countQuery.or(
          `reference_number.ilike.${searchTerm},payment_method.ilike.${searchTerm}`
        );
        dataQuery = dataQuery.or(
          `reference_number.ilike.${searchTerm},payment_method.ilike.${searchTerm}`
        );
      }

      const [countResult, dataResult] = await Promise.all([
        isFirstPage ? countQuery : Promise.resolve({ count: totalCountRef.current, error: null }),
        dataQuery,
      ]);

      if (currentQueryRef.current !== query) return;
      if (dataResult.error) throw dataResult.error;

      const items = (dataResult.data || []).map((row: any) => ({
        ...row,
        invoices: Array.isArray(row.invoices) ? row.invoices[0] : row.invoices,
      })) as Payment[];

      if (isFirstPage) {
        setPayments(items);
        if (countResult && 'count' in countResult && countResult.count !== null) {
          setTotalCount(countResult.count);
          totalCountRef.current = countResult.count;
        }
      } else {
        setPayments((prev) => [...prev, ...items]);
      }

      setHasMore(items.length === PAGE_SIZE);
      setPage(pageNum);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load payments');
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
      setIsRefreshing(false);
    }
  }, [organizationId]);

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
    if (organizationId) fetchPayments('', 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, fetchPayments]);

  const handleEndReached = useCallback(() => {
    if (hasMore && !isLoadingMore && !loading) {
      fetchPayments(searchQuery, page + 1);
    }
  }, [hasMore, isLoadingMore, loading, searchQuery, page, fetchPayments]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setPage(0);
    fetchPayments(searchQuery, 0, true);
  }, [searchQuery, fetchPayments]);

  useEffect(() => {
    const unsubscribe = NetworkService.subscribeToNetworkChanges((connected) => {
      setIsOffline(!connected);
      if (connected && error) fetchPayments(searchQuery, 0);
    });
    return () => unsubscribe();
  }, [searchQuery, error, fetchPayments]);

  const getPaymentMethodIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'cash': return '💵';
      case 'card': return '💳';
      case 'upi': return '📱';
      case 'bank_transfer': return '🏦';
      case 'cheque': return '📝';
      default: return '💰';
    }
  };

  const renderItem = useCallback(({ item }: { item: Payment }) => (
    <Card style={styles.paymentCard}>
      <View style={styles.paymentHeader}>
        <View style={styles.paymentInfo}>
          <Text style={[styles.paymentAmount, { color: colors.text }]}>
            {formatCurrency(item.amount)}
          </Text>
          <Text style={[styles.paymentDate, { color: colors.textSecondary }]}>
            {formatDate(item.payment_date)}
          </Text>
        </View>
        <Text style={styles.methodIcon}>
          {getPaymentMethodIcon(item.payment_method)}
        </Text>
      </View>

      {item.invoices && (
        <View style={styles.paymentDetails}>
          <Text style={[styles.invoiceNumber, { color: colors.textSecondary }]} numberOfLines={1}>
            Invoice: {item.invoices.invoice_number}
          </Text>
          {item.invoices.customer_name && (
            <Text style={[styles.customerName, { color: colors.textSecondary }]} numberOfLines={1}>
              Customer: {item.invoices.customer_name}
            </Text>
          )}
        </View>
      )}

      {item.reference_number && (
        <Text style={[styles.reference, { color: colors.textSecondary }]} numberOfLines={1}>
          Ref: {item.reference_number}
        </Text>
      )}

      <View style={[styles.methodBadge, { backgroundColor: colors.primary + '20' }]}>
        <Text style={[styles.methodText, { color: colors.primary }]}>
          {(item.payment_method || '').replace('_', ' ').toUpperCase()}
        </Text>
      </View>
    </Card>
  ), [colors]);

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
    return <Loading fullScreen text="Loading payments..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isOffline && <OfflineBanner onRetry={handleRefresh} />}

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

      <FlatList
        data={payments}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          payments.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: spacing.md,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentAmount: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    marginBottom: spacing.xs / 2,
  },
  paymentDate: {
    fontSize: fontSize.sm,
  },
  methodIcon: {
    fontSize: 32,
  },
  paymentDetails: {
    marginBottom: spacing.sm,
  },
  invoiceNumber: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs / 2,
  },
  customerName: {
    fontSize: fontSize.sm,
  },
  reference: {
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
  },
  methodBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 12,
  },
  methodText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
});
