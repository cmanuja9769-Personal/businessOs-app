import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import Card from '@components/ui/Card';
import Button from '@components/ui/Button';
import Loading from '@components/ui/Loading';
import { spacing, fontSize } from '@theme/spacing';
import { commonColors } from '@theme/colors';
import { supabase } from '@lib/supabase';
import { formatCurrency } from '@lib/utils';

type DbItem = {
  id: string;
  name: string;
  item_code?: string | null;
  category?: string | null;
  hsn?: string | null;
  description?: string | null;
  unit?: string | null;
  sale_price?: number | null;
  wholesale_price?: number | null;
  quantity_price?: number | null;
  purchase_price?: number | null;
  tax_rate?: number | null;
  current_stock?: number | null;
  min_stock?: number | null;
  max_stock?: number | null;
  item_location?: string | null;
  barcode_no?: string | null;
  inclusive_of_tax?: boolean | null;
  warehouse_id?: string | null;
};

export default function ItemDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { organizationId } = useAuth();
  const { itemId } = route.params;

  const [item, setItem] = useState<DbItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const cancelledRef = useRef(false);

  const fetchItem = async () => {
    try {
      if (!organizationId) {
        setItem(null);
        return;
      }

      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('id', itemId)
        .maybeSingle();

      if (cancelledRef.current) return;
      if (error) throw error;
      setItem((data as any) ?? null);
    } catch (error) {
      console.error('[ITEM_DETAIL] fetchItem error:', error);
      if (!cancelledRef.current) Alert.alert('Error', 'Failed to fetch item details');
    } finally {
      if (!cancelledRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    cancelledRef.current = false;
    fetchItem();
    return () => { cancelledRef.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, itemId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchItem();
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

  if (loading) return <Loading fullScreen />;

  if (!item) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="cube-outline" size={64} color={colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Item not found</Text>
        <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
          This item may have been deleted or you may not have access.
        </Text>
        <Button title="Back to Items" onPress={() => navigation.goBack()} style={{ marginTop: spacing.lg }} />
      </View>
    );
  }

  const currentStock = item.current_stock ?? 0;
  const minStock = item.min_stock ?? 0;
  const stockStatus = getStockStatus(currentStock, minStock);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
          {item.item_code && (
            <Text style={[styles.itemSku, { color: colors.textSecondary }]}>Code: {item.item_code}</Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${stockStatus.color}20` }]}>
          <Text style={[styles.statusText, { color: stockStatus.color }]}>
            {stockStatus.text}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          title="Edit"
          variant="outline"
          size="sm"
          onPress={() => navigation.navigate('AddItem', { itemId: item.id })}
          icon={<Ionicons name="create-outline" size={16} color={colors.primary} />}
        />
      </View>

      {item.description && (
        <Card style={{ marginBottom: spacing.md }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{item.description}</Text>
        </Card>
      )}

      <Card style={{ marginBottom: spacing.md }}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Stock Information</Text>
        
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Current Stock</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {currentStock} {item.unit || 'units'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Minimum Stock</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {minStock} {item.unit || 'units'}
          </Text>
        </View>

        {item.max_stock != null && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Maximum Stock</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {item.max_stock} {item.unit || 'units'}
            </Text>
          </View>
        )}
      </Card>

      <Card style={{ marginBottom: spacing.md }}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Pricing</Text>
        
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Purchase Price</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {formatCurrency(item.purchase_price || 0)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Sale Price</Text>
          <Text style={[styles.detailValue, { color: colors.text, fontWeight: '600' }]}>
            {formatCurrency(item.sale_price || 0)}
          </Text>
        </View>

        {item.wholesale_price != null && item.wholesale_price > 0 && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Wholesale Price</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {formatCurrency(item.wholesale_price)}
            </Text>
          </View>
        )}

        {item.tax_rate != null && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>GST Rate</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {item.tax_rate}%{item.inclusive_of_tax ? ' (Inclusive)' : ''}
            </Text>
          </View>
        )}
      </Card>

      <Card style={{ marginBottom: spacing.md }}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Additional Details</Text>
        
        {item.category && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Category</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{item.category}</Text>
          </View>
        )}

        {item.hsn && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>HSN Code</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{item.hsn}</Text>
          </View>
        )}

        {item.item_location && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Location</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{item.item_location}</Text>
          </View>
        )}

        {item.barcode_no && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Barcode</Text>
            <Text style={[styles.detailValue, { color: colors.text, fontFamily: 'monospace' }]}>
              {item.barcode_no}
            </Text>
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    marginTop: spacing.md,
  },
  emptySub: {
    fontSize: fontSize.md,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  itemName: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
  },
  itemSku: {
    fontSize: fontSize.md,
    marginTop: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  description: {
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  detailLabel: {
    fontSize: fontSize.md,
  },
  detailValue: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
});
