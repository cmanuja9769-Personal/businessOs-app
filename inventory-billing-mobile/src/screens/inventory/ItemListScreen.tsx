import React, { useCallback } from 'react';
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
import { InventoryStackNavigationProp } from '@navigation/types';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import Card from '@components/ui/Card';
import Loading from '@components/ui/Loading';
import EmptyState from '@components/ui/EmptyState';
import Input from '@components/ui/Input';
import OfflineBanner from '@components/ui/OfflineBanner';
import ListFooterLoader from '@components/ui/ListFooterLoader';
import { useItemSearch } from '@hooks/useItemSearch';
import { spacing, fontSize } from '@theme/spacing';
import { formatCurrency } from '@lib/utils';
import { commonColors } from '@theme/colors';

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

export default function ItemListScreen() {
  const navigation = useNavigation<InventoryStackNavigationProp>();
  const { colors } = useTheme();
  const { organizationId } = useAuth();

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
  } = useItemSearch(organizationId);

  const getStockStatus = (currentStock: number, minStock: number) => {
    if (currentStock === 0) {
      return { color: commonColors.stockOut, text: 'Out of Stock' };
    } else if (currentStock <= minStock) {
      return { color: commonColors.stockLow, text: 'Low Stock' };
    } else if (currentStock <= minStock * 2) {
      return { color: commonColors.stockMedium, text: 'Medium' };
    }
    return { color: commonColors.stockHigh, text: 'In Stock' };
  };

  const handleEndReached = useCallback(() => {
    if (hasMore && !isLoadingMore && status !== 'loading') {
      loadMore();
    }
  }, [hasMore, isLoadingMore, status, loadMore]);

  const renderItem = useCallback(({ item }: { item: Item }) => {
    const currentStock = item.current_stock ?? 0;
    const minStock = item.min_stock ?? 0;
    const stockStatus = getStockStatus(currentStock, minStock);

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}
        activeOpacity={0.7}
      >
        <Card style={styles.itemCard}>
          <View style={styles.itemHeader}>
            <View style={styles.itemInfo}>
              <Text
                style={[styles.itemName, { color: colors.text }]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {item.name}
              </Text>
              <Text style={[styles.itemSku, { color: colors.textSecondary }]}>
                {item.item_code || item.category || 'N/A'}
              </Text>
            </View>
            <Text style={[styles.itemPrice, { color: colors.text }]}>
              {formatCurrency(item.sale_price || item.selling_price || 0)}
            </Text>
          </View>
          <View style={[styles.itemFooter, { borderTopColor: colors.border }]}>
            <View style={styles.stockInfo}>
              <Text style={[styles.stockText, { color: colors.textSecondary }]}>
                Stock: {currentStock} units
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: `${stockStatus.color}20` },
                ]}
              >
                <Text style={[styles.statusText, { color: stockStatus.color }]}>
                  {stockStatus.text}
                </Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
            />
          </View>
        </Card>
      </TouchableOpacity>
    );
  }, [colors, navigation]);

  const renderListFooter = useCallback(() => {
    return (
      <ListFooterLoader
        isLoading={isLoadingMore}
        hasMore={hasMore}
        itemCount={items.length}
        totalCount={totalCount}
      />
    );
  }, [isLoadingMore, hasMore, items.length, totalCount]);

  const renderEmptyState = useCallback(() => {
    if (status === 'loading') return null;

    if (status === 'error' && error) {
      return (
        <EmptyState
          icon="alert-circle-outline"
          title="Something went wrong"
          description={error}
          actionText="Try Again"
          onAction={refresh}
        />
      );
    }

    return (
      <EmptyState
        icon="cube-outline"
        title={searchQuery ? 'No items found' : 'No items yet'}
        description={
          searchQuery
            ? `No items matching "${searchQuery}"`
            : 'Add your first item to get started'
        }
        actionText={!searchQuery ? 'Add Item' : undefined}
        onAction={!searchQuery ? () => navigation.navigate('AddItem', {}) : undefined}
      />
    );
  }, [status, error, searchQuery, refresh, navigation]);

  if (status === 'loading' && items.length === 0 && !searchQuery) {
    return <Loading fullScreen text="Loading items..." />;
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

      {totalCount > 0 && (
        <View style={styles.countContainer}>
          <Text style={[styles.countText, { color: colors.textTertiary }]}>
            {searchQuery
              ? `${items.length} result${items.length !== 1 ? 's' : ''} found`
              : `${totalCount} item${totalCount !== 1 ? 's' : ''} total`}
          </Text>
        </View>
      )}

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          items.length === 0 && styles.listContentEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
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
        getItemLayout={undefined}
        keyboardShouldPersistTaps="handled"
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('AddItem', {})}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    padding: spacing.md,
    paddingBottom: 0,
    position: 'relative',
  },
  searchInput: {
    marginBottom: 0,
  },
  searchIndicator: {
    position: 'absolute',
    right: spacing.md + 12,
    top: spacing.md + 12,
  },
  countContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 0,
  },
  countText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  listContent: {
    padding: spacing.md,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  itemCard: {
    marginBottom: spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  itemInfo: {
    flex: 1,
    flexShrink: 1,
  },
  itemName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.xs,
    lineHeight: fontSize.md * 1.4,
  },
  itemSku: {
    fontSize: fontSize.sm,
  },
  itemPrice: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    flexShrink: 0,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
    flex: 1,
  },
  stockText: {
    fontSize: fontSize.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
