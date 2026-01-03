import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
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
import { spacing, fontSize } from '@theme/spacing';
import { supabase } from '@lib/supabase';
import { formatCurrency } from '@lib/utils';
import { commonColors } from '@theme/colors';

interface Item {
  id: string;
  name: string;
  item_code?: string;
  current_stock: number;
  min_stock: number;
  sale_price?: number;
  category?: string;
}

export default function ItemListScreen() {
  const navigation = useNavigation<InventoryStackNavigationProp>();
  const { colors } = useTheme();
  const { organizationId } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchItems();
  }, [organizationId]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = items.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.sku.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredItems(filtered);
    } else {
      setFilteredItems(items);
    }
  }, [searchQuery, items]);

  const fetchItems = async () => {
    try {
      console.log('[ITEMS] fetchItems called with organizationId:', organizationId);
      if (!organizationId) {
        console.warn('[ITEMS] No organizationId available, skipping fetch');
        setItems([]);
        setFilteredItems([]);
        return;
      }
      console.log('[ITEMS] Querying items for org:', organizationId);
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');

      console.log('[ITEMS] Query result:', { count: data?.length, error });

      if (error) throw error;
      setItems(data || []);
      setFilteredItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchItems();
  };

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

  const renderItem = ({ item }: { item: Item }) => {
    const currentStock = item.current_stock ?? 0;
    const minStock = item.min_stock ?? 0;
    const stockStatus = getStockStatus(currentStock, minStock);
    
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}
      >
        <Card style={styles.itemCard}>
          <View style={styles.itemHeader}>
            <View style={styles.itemInfo}>
              <Text style={[styles.itemName, { color: colors.text }]}>
                {item.name}
              </Text>
              <Text style={[styles.itemSku, { color: colors.textSecondary }]}>
                {item.item_code || item.category || 'N/A'}
              </Text>
            </View>
            <Text style={[styles.itemPrice, { color: colors.text }]}>
              {formatCurrency(item.sale_price || 0)}
            </Text>
          </View>
          <View style={styles.itemFooter}>
            <View style={styles.stockInfo}>
              <Text style={[styles.stockText, { color: colors.textSecondary }]}>
                Stock: {currentStock} units
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: `${stockStatus.color}20` }]}>
                <Text style={[styles.statusText, { color: stockStatus.color }]}>
                  {stockStatus.text}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <Loading fullScreen />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.searchContainer}>
        <Input
          placeholder="Search items by name or SKU..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="search"
          containerStyle={styles.searchInput}
        />
      </View>
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="cube-outline"
            title="No items found"
            description={searchQuery ? 'Try a different search term' : 'Add your first item to get started'}
            actionText={!searchQuery ? 'Add Item' : undefined}
            onAction={!searchQuery ? () => navigation.navigate('AddItem', {}) : undefined}
          />
        }
      />
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('AddItem', {})}
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
  },
  searchInput: {
    marginBottom: 0,
  },
  listContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  itemCard: {
    marginBottom: spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  itemSku: {
    fontSize: fontSize.sm,
  },
  itemPrice: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
