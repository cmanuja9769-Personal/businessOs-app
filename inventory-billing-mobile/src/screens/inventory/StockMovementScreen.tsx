import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { InventoryStackParamList, InventoryStackNavigationProp } from '@navigation/types';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import { supabase } from '@lib/supabase';
import { formatDate } from '@lib/utils';
import Input from '@components/ui/Input';
import EmptyState from '@components/ui/EmptyState';
import ListFooterLoader from '@components/ui/ListFooterLoader';
import { lightTap } from '@lib/haptics';

type RouteProps = RouteProp<InventoryStackParamList, 'StockMovements'>;

interface StockMovement {
  id: string;
  item_id: string;
  quantity_change: number;
  movement_type: string;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
  items?: { name: string; item_code: string } | null;
}

const MOVEMENT_TYPES: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  stock_in: { label: 'Stock In', color: '#10B981', icon: 'add-circle-outline' },
  stock_out: { label: 'Stock Out', color: '#EF4444', icon: 'remove-circle-outline' },
  adjustment: { label: 'Adjustment', color: '#F59E0B', icon: 'construct-outline' },
  sale: { label: 'Sale', color: '#6366F1', icon: 'receipt-outline' },
  purchase: { label: 'Purchase', color: '#0EA5E9', icon: 'cart-outline' },
  return: { label: 'Return', color: '#8B5CF6', icon: 'return-up-back-outline' },
  transfer: { label: 'Transfer', color: '#10B981', icon: 'swap-horizontal-outline' },
};

const PAGE_SIZE = 50;
const DEBOUNCE_MS = 300;

type FilterType = 'all' | 'stock_in' | 'stock_out' | 'adjustment' | 'sale' | 'purchase' | 'transfer' | 'return';

const FILTER_OPTIONS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'sale', label: 'Sales' },
  { key: 'purchase', label: 'Purchases' },
  { key: 'adjustment', label: 'Adjustments' },
  { key: 'transfer', label: 'Transfers' },
  { key: 'stock_in', label: 'Stock In' },
  { key: 'stock_out', label: 'Stock Out' },
];

export default function StockMovementScreen() {
  const navigation = useNavigation<InventoryStackNavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors, shadows } = useTheme();
  const { organizationId } = useAuth();

  const itemId = route.params?.itemId;

  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const totalCountRef = useRef(0);

  const fetchTotalCount = useCallback(async (filter: FilterType) => {
    let countQuery = supabase.from('stock_movements').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId);
    if (itemId) countQuery = countQuery.eq('item_id', itemId);
    if (filter !== 'all') countQuery = countQuery.eq('movement_type', filter);
    const countRes = await countQuery;
    const count = countRes.count || 0;
    setTotalCount(count);
    totalCountRef.current = count;
  }, [organizationId, itemId]);

  const buildMovementsQuery = useCallback((query: string, filter: FilterType, from: number, to: number) => {
    let dataQuery = supabase
      .from('stock_movements')
      .select('id, item_id, quantity_change, movement_type, reference_type, reference_id, notes, created_at, items:item_id(name, item_code)')
      .eq('organization_id', organizationId!)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (itemId) dataQuery = dataQuery.eq('item_id', itemId);
    if (filter !== 'all') dataQuery = dataQuery.eq('movement_type', filter);
    if (query.trim()) {
      const term = `%${query.trim()}%`;
      dataQuery = dataQuery.or(`notes.ilike.${term},reference_type.ilike.${term}`);
    }
    return dataQuery;
  }, [organizationId, itemId]);

  const fetchMovements = useCallback(async (query: string, filter: FilterType, pageNum: number, isRefresh = false) => {
    if (!organizationId) return;

    const isFirstPage = pageNum === 0;
    if (isFirstPage && !isRefresh) setLoading(true);
    if (!isFirstPage) setIsLoadingMore(true);

    try {
      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await buildMovementsQuery(query, filter, from, to);
      if (error) throw error;

      const items = (data || []) as unknown as StockMovement[];

      if (isFirstPage) {
        setMovements(items);
        await fetchTotalCount(filter);
      } else {
        setMovements(prev => [...prev, ...items]);
      }

      setHasMore(items.length === PAGE_SIZE);
      setPage(pageNum);
    } catch (err) {
      console.error('Error loading movements:', err);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
      setIsRefreshing(false);
    }
  }, [organizationId, buildMovementsQuery, fetchTotalCount]);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      fetchMovements(searchQuery, activeFilter, 0);
    }, DEBOUNCE_MS);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [searchQuery, activeFilter, fetchMovements]);

  const handleEndReached = useCallback(() => {
    if (hasMore && !isLoadingMore && !loading) {
      fetchMovements(searchQuery, activeFilter, page + 1);
    }
  }, [hasMore, isLoadingMore, loading, searchQuery, activeFilter, page, fetchMovements]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchMovements(searchQuery, activeFilter, 0, true);
  }, [searchQuery, activeFilter, fetchMovements]);

  const renderMovement = useCallback(({ item }: { item: StockMovement }) => {
    const typeConfig = MOVEMENT_TYPES[item.movement_type] || MOVEMENT_TYPES.adjustment;
    const itemName = (item.items as unknown as { name: string } | null)?.name || 'Unknown';
    const isPositive = item.quantity_change > 0;

    return (
      <View style={[styles.movementCard, { backgroundColor: colors.card, ...shadows.sm }]}>
        <View style={styles.movementRow}>
          <View style={[styles.typeIcon, { backgroundColor: typeConfig.color + '15' }]}>
            <Ionicons name={typeConfig.icon} size={20} color={typeConfig.color} />
          </View>
          <View style={styles.movementInfo}>
            <Text style={[styles.movementItem, { color: colors.text }]} numberOfLines={1}>{itemName}</Text>
            <View style={styles.movementMeta}>
              <Text style={[styles.typeBadge, { color: typeConfig.color, backgroundColor: typeConfig.color + '10' }]}>
                {typeConfig.label}
              </Text>
            </View>
          </View>
          <View style={styles.movementRight}>
            <Text style={[styles.movementQty, { color: isPositive ? '#10B981' : '#EF4444' }]}>
              {isPositive ? '+' : ''}{item.quantity_change}
            </Text>
            <Text style={[styles.movementDate, { color: colors.textTertiary }]}>{formatDate(item.created_at)}</Text>
          </View>
        </View>
        {item.notes && (
          <Text style={[styles.movementNotes, { color: colors.textTertiary }]} numberOfLines={2}>{item.notes}</Text>
        )}
      </View>
    );
  }, [colors, shadows]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#059669', '#10B981']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Stock Movements</Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      <View style={styles.searchWrapper}>
        <Input placeholder="Search movements..." value={searchQuery} onChangeText={setSearchQuery} leftIcon="search" containerStyle={styles.searchInput} />
      </View>

      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTER_OPTIONS}
          keyExtractor={f => f.key}
          contentContainerStyle={styles.filterScroll}
          renderItem={({ item: f }) => (
            <TouchableOpacity
              style={[styles.filterChip, activeFilter === f.key ? { backgroundColor: colors.primary } : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
              onPress={() => { setActiveFilter(f.key); lightTap(); }}
            >
              <Text style={[styles.filterText, { color: activeFilter === f.key ? '#fff' : colors.textSecondary }]}>{f.label}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading && movements.length === 0 ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={movements}
          renderItem={renderMovement}
          keyExtractor={m => m.id}
          contentContainerStyle={[styles.listContent, movements.length === 0 && styles.listEmpty]}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={<ListFooterLoader isLoading={isLoadingMore} hasMore={hasMore} itemCount={movements.length} totalCount={totalCount} />}
          ListEmptyComponent={<EmptyState icon="pulse-outline" title="No movements found" description="Stock movements will appear here as transactions occur" />}
          removeClippedSubviews
          maxToRenderPerBatch={15}
          windowSize={10}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 40 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center' },
  headerRight: { width: 40 },
  searchWrapper: { paddingHorizontal: 16, paddingTop: 12 },
  searchInput: { marginBottom: 0 },
  filterContainer: { marginTop: 8, marginBottom: 4 },
  filterScroll: { paddingHorizontal: 16, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  filterText: { fontSize: 12, fontWeight: '600' },
  listContent: { padding: 16, paddingBottom: 40 },
  listEmpty: { flexGrow: 1 },
  movementCard: { borderRadius: 12, padding: 14, marginBottom: 10 },
  movementRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  typeIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  movementInfo: { flex: 1 },
  movementItem: { fontSize: 14, fontWeight: '600' },
  movementMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  typeBadge: { fontSize: 10, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  movementRight: { alignItems: 'flex-end' },
  movementQty: { fontSize: 16, fontWeight: '700' },
  movementDate: { fontSize: 10, marginTop: 2 },
  movementNotes: { fontSize: 11, marginTop: 8, fontStyle: 'italic', paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.06)' },
});
