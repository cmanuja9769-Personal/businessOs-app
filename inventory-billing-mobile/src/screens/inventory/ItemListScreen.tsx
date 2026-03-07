import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { InventoryStackNavigationProp } from '@navigation/types';
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
import { useItemSearch } from '@hooks/useItemSearch';
import { formatCurrency } from '@lib/utils';
import { commonColors } from '@theme/colors';
import { lightTap } from '@lib/haptics';
import AnimatedListItem from '@components/ui/AnimatedListItem';

interface Item {
  id: string;
  name: string;
  item_code?: string;
  sku?: string;
  current_stock: number;
  min_stock: number;
  sale_price?: number;
  selling_price?: number;
  category?: string;
}

const STOCK_GRADIENTS: Record<string, [string, string]> = {
  'Out of Stock': ['#DC2626', '#EF4444'],
  'Low Stock': ['#D97706', '#F59E0B'],
  'Medium': ['#0369A1', '#0EA5E9'],
  'In Stock': ['#059669', '#10B981'],
};

const ITEM_SORT_OPTIONS: SortOption[] = [
  { key: 'name', label: 'Name' },
  { key: 'current_stock', label: 'Stock' },
  { key: 'sale_price', label: 'Price' },
  { key: 'updated_at', label: 'Recent' },
];

export default function ItemListScreen() {
  const navigation = useNavigation<InventoryStackNavigationProp>();
  const { colors } = useTheme();
  const { organizationId } = useAuth();
  const [sortKey, setSortKey] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);

  const {
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
  } = useItemSearch(organizationId, sortKey, sortAsc);

  useFocusRefresh(refresh);

  const visibleCount = items.length;
  const lowStockCount = items.filter((item) => {
    const currentStock = item.current_stock ?? 0;
    const minStock = item.min_stock ?? 0;
    return currentStock > 0 && currentStock <= minStock;
  }).length;

  const getStockStatus = (currentStock: number, minStock: number) => {
    if (currentStock === 0) return { color: commonColors.stockOut, text: 'Out of Stock' };
    if (currentStock <= minStock) return { color: commonColors.stockLow, text: 'Low Stock' };
    if (currentStock <= minStock * 2) return { color: commonColors.stockMedium, text: 'Medium' };
    return { color: commonColors.stockHigh, text: 'In Stock' };
  };

  const handleEndReached = useCallback(() => {
    if (hasMore && !isLoadingMore && status !== 'loading') {
      loadMore();
    }
  }, [hasMore, isLoadingMore, status, loadMore]);

  const renderItem = useCallback(({ item, index }: { item: Item; index: number }) => {
    const currentStock = item.current_stock ?? 0;
    const minStock = item.min_stock ?? 0;
    const stockStatus = getStockStatus(currentStock, minStock);
    const gradient = STOCK_GRADIENTS[stockStatus.text] || STOCK_GRADIENTS['In Stock'];

    return (
      <AnimatedListItem index={index}>
        <Card
          onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}
          style={styles.itemCard}
        >
          <View style={styles.itemRow}>
            <LinearGradient
              colors={gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.stockIcon}
            >
              <Ionicons name="cube" size={18} color="#fff" />
            </LinearGradient>

            <View style={styles.itemInfo}>
              <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={[styles.itemCode, { color: colors.textTertiary }]}>
                {item.item_code || item.category || 'N/A'}
              </Text>
            </View>

            <View style={styles.itemRight}>
              <Text style={[styles.itemPrice, { color: colors.text }]}>
                {formatCurrency(item.sale_price || item.selling_price || 0)}
              </Text>
              <View style={[styles.stockBadge, { backgroundColor: `${stockStatus.color}15` }]}>
                <View style={[styles.stockDot, { backgroundColor: stockStatus.color }]} />
                <Text style={[styles.stockBadgeText, { color: stockStatus.color }]}>{currentStock}</Text>
              </View>
            </View>
          </View>
        </Card>
      </AnimatedListItem>
    );
  }, [colors, navigation]);

  const renderListFooter = useCallback(() => (
    <ListFooterLoader isLoading={isLoadingMore} hasMore={hasMore} itemCount={items.length} totalCount={totalCount} />
  ), [isLoadingMore, hasMore, items.length, totalCount]);

  const renderEmptyState = useCallback(() => {
    if (status === 'loading') return null;
    if (status === 'error' && error) {
      return <EmptyState icon="alert-circle-outline" title="Something went wrong" description={error} actionText="Try Again" onAction={refresh} />;
    }
    return (
      <EmptyState
        icon="cube-outline"
        title={searchQuery ? 'No items found' : 'No items yet'}
        description={searchQuery ? `No items matching "${searchQuery}"` : 'Add your first item to get started'}
        actionText={!searchQuery ? 'Add Item' : undefined}
        onAction={!searchQuery ? () => navigation.navigate('AddItem', {}) : undefined}
      />
    );
  }, [status, error, searchQuery, refresh, navigation]);

  if (status === 'loading' && items.length === 0 && !searchQuery) {
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
      {isOffline && <OfflineBanner onRetry={refresh} />}

      <View style={styles.searchContainer}>
        <Input
          placeholder="Search items by name, code, barcode..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="search"
          containerStyle={styles.searchInput}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {status === 'loading' && items.length > 0 && (
          <View style={styles.searchIndicator}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
      </View>

      <View style={styles.overviewContainer}>
        <Card style={styles.overviewCard}>
          <View style={styles.overviewStat}>
            <Text style={[styles.overviewValue, { color: colors.text }]}>{totalCount}</Text>
            <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>Total Items</Text>
          </View>
          <View style={[styles.overviewDivider, { backgroundColor: colors.border }]} />
          <View style={styles.overviewStat}>
            <Text style={[styles.overviewValue, { color: colors.text }]}>{visibleCount}</Text>
            <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>
              {searchQuery ? 'Showing Results' : 'Visible Now'}
            </Text>
          </View>
          <View style={[styles.overviewDivider, { backgroundColor: colors.border }]} />
          <View style={styles.overviewStat}>
            <Text style={[styles.overviewValue, { color: lowStockCount > 0 ? commonColors.stockLow : colors.text }]}>{lowStockCount}</Text>
            <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>Low Stock</Text>
          </View>
        </Card>
      </View>

      <SortSelector
        options={ITEM_SORT_OPTIONS}
        activeKey={sortKey}
        ascending={sortAsc}
        onSort={(key, asc) => { setSortKey(key); setSortAsc(asc); }}
      />

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, items.length === 0 && styles.listContentEmpty]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refresh} colors={[colors.primary]} tintColor={colors.primary} />
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
        onPress={() => { lightTap(); navigation.navigate('AddItem', {}); }}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchContainer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4, position: 'relative' },
  searchInput: { marginBottom: 0 },
  searchIndicator: { position: 'absolute', right: 32, top: 24 },
  overviewContainer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  overviewCard: { padding: 14, flexDirection: 'row', alignItems: 'center' },
  overviewStat: { flex: 1, alignItems: 'center' },
  overviewValue: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  overviewLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
  overviewDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginHorizontal: 6 },
  listContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 100 },
  listContentEmpty: { flexGrow: 1 },
  itemCard: { padding: 14 },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  stockIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600', marginBottom: 3, letterSpacing: -0.2, lineHeight: 20 },
  itemCode: { fontSize: 12 },
  itemRight: { alignItems: 'flex-end', marginLeft: 8 },
  itemPrice: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  stockBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, gap: 4 },
  stockDot: { width: 6, height: 6, borderRadius: 3 },
  stockBadgeText: { fontSize: 12, fontWeight: '600' },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
});
