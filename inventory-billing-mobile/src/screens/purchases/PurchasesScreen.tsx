import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MoreStackNavigationProp } from '@navigation/types';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import Loading from '@components/ui/Loading';
import EmptyState from '@components/ui/EmptyState';
import Input from '@components/ui/Input';
import OfflineBanner from '@components/ui/OfflineBanner';
import ListFooterLoader from '@components/ui/ListFooterLoader';
import { supabase } from '@lib/supabase';
import { formatCurrency, formatDate } from '@lib/utils';
import { NetworkService } from '@services/network';

interface Purchase {
  id: string;
  purchase_no: string;
  supplier_name: string;
  date: string;
  total: number;
  paid_amount: number;
  balance: number;
  status: 'paid' | 'unpaid' | 'partial';
}

const PAGE_SIZE = 50;
const DEBOUNCE_MS = 300;

export default function PurchasesScreen() {
  const navigation = useNavigation<MoreStackNavigationProp>();
  const { colors, shadows } = useTheme();
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

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const currentQueryRef = useRef('');
  const totalCountRef = useRef(0);

  const fetchStats = useCallback(async () => {
    if (!organizationId) return;
    try {
      const { data } = await supabase
        .from('purchases')
        .select('total, paid_amount, balance')
        .eq('organization_id', organizationId);

      if (data) {
        setStats({
          total: data.reduce((sum: number, p: any) => sum + (p.total || 0), 0),
          paid: data.reduce((sum: number, p: any) => sum + (p.paid_amount || 0), 0),
          pending: data.reduce((sum: number, p: any) => sum + (p.balance || 0), 0),
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
        .eq('organization_id', organizationId);

      let dataQuery = supabase
        .from('purchases')
        .select('id, purchase_no, supplier_name, date, total, paid_amount, balance, status')
        .eq('organization_id', organizationId)
        .order('date', { ascending: false })
        .range(from, to);

      if (query.trim()) {
        const searchTerm = `%${query.trim()}%`;
        countQuery = countQuery.or(
          `purchase_no.ilike.${searchTerm},supplier_name.ilike.${searchTerm}`
        );
        dataQuery = dataQuery.or(
          `purchase_no.ilike.${searchTerm},supplier_name.ilike.${searchTerm}`
        );
      }

      const [countResult, dataResult] = await Promise.all([
        isFirstPage ? countQuery : Promise.resolve({ count: totalCountRef.current, error: null }),
        dataQuery,
      ]);

      if (currentQueryRef.current !== query) return;
      if (dataResult.error) throw dataResult.error;

      const items = (dataResult.data || []) as Purchase[];

      if (isFirstPage) {
        setPurchases(items);
        if (countResult && 'count' in countResult && countResult.count !== null) {
          setTotalCount(countResult.count);
          totalCountRef.current = countResult.count;
        }
      } else {
        setPurchases((prev) => [...prev, ...items]);
      }

      setHasMore(items.length === PAGE_SIZE);
      setPage(pageNum);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load purchases');
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
  }, [organizationId]);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#10B981';
      case 'unpaid': return '#EF4444';
      case 'partial': return '#F59E0B';
      default: return colors.textSecondary;
    }
  };

  const renderPurchaseItem = useCallback(({ item }: { item: Purchase }) => (
    <TouchableOpacity
      style={[styles.purchaseCard, { backgroundColor: colors.card, ...shadows.sm }]}
      onPress={() => navigation.navigate('PurchaseDetail', { purchaseId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.purchaseHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.purchaseNo, { color: colors.text }]} numberOfLines={1}>
            {item.purchase_no}
          </Text>
          <Text style={[styles.supplierName, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.supplier_name}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      <View style={[styles.purchaseFooter, { borderTopColor: colors.border }]}>
        <Text style={[styles.purchaseDate, { color: colors.textSecondary }]}>{formatDate(item.date)}</Text>
        <Text style={[styles.purchaseAmount, { color: colors.primary }]}>{formatCurrency(item.total)}</Text>
      </View>
    </TouchableOpacity>
  ), [colors, shadows, navigation]);

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
    return <Loading fullScreen text="Loading purchases..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isOffline && <OfflineBanner onRetry={handleRefresh} />}

      <LinearGradient colors={['#4F46E5', '#6366F1']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Purchases</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('CreatePurchase', {})}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: colors.card, ...shadows.sm }]}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(stats.total)}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, ...shadows.sm }]}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Paid</Text>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{formatCurrency(stats.paid)}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, ...shadows.sm }]}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{formatCurrency(stats.pending)}</Text>
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

      <FlatList
        data={purchases}
        renderItem={renderPurchaseItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          purchases.length === 0 && styles.listContentEmpty,
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
  container: { flex: 1 },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 40 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center' },
  addButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  statsContainer: { flexDirection: 'row', padding: 16, gap: 12 },
  statCard: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  statLabel: { fontSize: 12, marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: '700' },
  searchWrapper: { paddingHorizontal: 16, paddingBottom: 8, position: 'relative' },
  searchInput: { marginBottom: 0 },
  searchIndicator: { position: 'absolute', right: 28, top: 12 },
  listContent: { padding: 16, paddingTop: 8 },
  listContentEmpty: { flexGrow: 1 },
  purchaseCard: { borderRadius: 12, padding: 16, marginBottom: 12 },
  purchaseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  purchaseNo: { fontSize: 16, fontWeight: '600' },
  supplierName: { fontSize: 14, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600', color: '#fff' },
  purchaseFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  purchaseDate: { fontSize: 13 },
  purchaseAmount: { fontSize: 18, fontWeight: '700' },
});
