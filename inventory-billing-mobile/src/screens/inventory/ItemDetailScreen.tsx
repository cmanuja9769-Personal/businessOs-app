import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ItemDetailRouteProp, InventoryStackNavigationProp } from '@navigation/types';
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
import { useToast } from '@contexts/ToastContext';
import { successFeedback, errorFeedback, lightTap } from '@lib/haptics';

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
  mrp?: number | null;
  quantity_discount_price?: number | null;
  purchase_price?: number | null;
  tax_rate?: number | null;
  cess_rate?: number | null;
  current_stock?: number | null;
  min_stock?: number | null;
  max_stock?: number | null;
  item_location?: string | null;
  location?: string | null;
  rack_info?: string | null;
  barcode_no?: string | null;
  inclusive_of_tax?: boolean | null;
  warehouse_id?: string | null;
  packaging_unit?: string | null;
  qty_per_package?: number | null;
  enable_batch_tracking?: boolean | null;
  enable_serial_tracking?: boolean | null;
};

type StockMovement = {
  id: string;
  movement_type: string;
  quantity_change: number;
  reference_type?: string | null;
  reference_id?: string | null;
  notes?: string | null;
  created_at: string;
};

type BatchRecord = {
  id: string;
  batch_number: string;
  manufacturing_date?: string | null;
  expiry_date?: string | null;
  quantity: number;
  status?: string | null;
};

type SerialRecord = {
  id: string;
  serial_number: string;
  status: string;
  warranty_expiry?: string | null;
};

const STOCK_HISTORY_TAB = 'Stock History' as const;
const TABS = ['Details', STOCK_HISTORY_TAB, 'Batches', 'Serials'] as const;
type TabKey = typeof TABS[number];
const UNITS_FALLBACK = 'units';

type PricingRow = {
  label: string;
  value: string;
  emphasize?: boolean;
};

function getPricingRows(item: DbItem): PricingRow[] {
  const rows: PricingRow[] = [
    { label: 'Purchase Price', value: formatCurrency(item.purchase_price || 0) },
    { label: 'Sale Price', value: formatCurrency(item.sale_price || 0), emphasize: true },
  ];

  if (item.mrp != null && item.mrp > 0) {
    rows.push({ label: 'MRP', value: formatCurrency(item.mrp) });
  }
  if (item.wholesale_price != null && item.wholesale_price > 0) {
    rows.push({ label: 'Wholesale', value: formatCurrency(item.wholesale_price) });
  }
  if (item.quantity_discount_price != null && item.quantity_discount_price > 0) {
    rows.push({ label: 'Qty Discount', value: formatCurrency(item.quantity_discount_price) });
  }

  return rows;
}

function getSerialStatusColor(status: string): string {
  if (status === 'available') return commonColors.stockHigh;
  if (status === 'sold') return commonColors.stockOut;
  return commonColors.stockMedium;
}

export default function ItemDetailScreen() {
  const route = useRoute<ItemDetailRouteProp>();
  const navigation = useNavigation<InventoryStackNavigationProp>();
  const { colors } = useTheme();
  const { organizationId } = useAuth();
  const { itemId } = route.params;

  const [item, setItem] = useState<DbItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('Details');
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [serials, setSerials] = useState<SerialRecord[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const cancelledRef = useRef(false);
  const toast = useToast();

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
        .is('deleted_at', null)
        .maybeSingle();

      if (cancelledRef.current) return;
      if (error) throw error;
      setItem((data as DbItem) ?? null);
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

  const fetchMovements = useCallback(async () => {
    if (!organizationId) return;
    setMovementsLoading(true);
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('id, movement_type, quantity_change, reference_type, reference_id, notes, created_at')
        .eq('item_id', itemId)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setMovements((data as StockMovement[]) || []);
    } catch {
      /* silent */
    } finally {
      setMovementsLoading(false);
    }
  }, [itemId, organizationId]);

  const fetchBatches = useCallback(async () => {
    if (!organizationId) return;
    try {
      const { data, error } = await supabase
        .from('item_batches')
        .select('id, batch_number, manufacturing_date, expiry_date, quantity, status')
        .eq('item_id', itemId)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setBatches((data as BatchRecord[]) || []);
    } catch {
      /* silent */
    }
  }, [itemId, organizationId]);

  const fetchSerials = useCallback(async () => {
    if (!organizationId) return;
    try {
      const { data, error } = await supabase
        .from('item_serials')
        .select('id, serial_number, status, warranty_expiry')
        .eq('item_id', itemId)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSerials((data as SerialRecord[]) || []);
    } catch {
      /* silent */
    }
  }, [itemId, organizationId]);

  useEffect(() => {
    cancelledRef.current = false;
    fetchItem();
    return () => { cancelledRef.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, itemId]);

  useEffect(() => {
    if (activeTab === STOCK_HISTORY_TAB) fetchMovements();
    if (activeTab === 'Batches') fetchBatches();
    if (activeTab === 'Serials') fetchSerials();
  }, [activeTab, fetchMovements, fetchBatches, fetchSerials]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchItem();
    if (activeTab === STOCK_HISTORY_TAB) fetchMovements();
    if (activeTab === 'Batches') fetchBatches();
    if (activeTab === 'Serials') fetchSerials();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item?.name}"? This action can be undone from the web app.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const { error } = await supabase
                .from('items')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', itemId);

              if (error) throw error;

              await successFeedback();
              toast.success('Item deleted');
              navigation.goBack();
            } catch {
              await errorFeedback();
              toast.error('Failed to delete item');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const getStockStatus = (currentStock: number, minStk: number) => {
    if (currentStock === 0) return { color: commonColors.stockOut, text: 'Out of Stock' };
    if (currentStock <= minStk) return { color: commonColors.stockLow, text: 'Low Stock' };
    if (currentStock <= minStk * 2) return { color: commonColors.stockMedium, text: 'Medium' };
    return { color: commonColors.stockHigh, text: 'In Stock' };
  };

  const getMovementColor = (type: string) => {
    if (['stock_in', 'purchase', 'transfer'].includes(type)) return commonColors.stockHigh;
    if (['stock_out', 'sale'].includes(type)) return commonColors.stockOut;
    return commonColors.stockMedium;
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

  const renderStockSection = () => (
    <Card style={{ marginBottom: spacing.md }}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Stock Information</Text>
      <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Current Stock</Text>
        <Text style={[styles.detailValue, { color: colors.text }]}>
            {currentStock} {item.unit || UNITS_FALLBACK}
        </Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Minimum Stock</Text>
        <Text style={[styles.detailValue, { color: colors.text }]}>{minStock} {item.unit || UNITS_FALLBACK}</Text>
      </View>
      {item.max_stock != null && (
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Maximum Stock</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{item.max_stock} {item.unit || UNITS_FALLBACK}</Text>
        </View>
      )}
      {item.packaging_unit ? (
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Packaging</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {item.packaging_unit}{item.qty_per_package ? ` (${item.qty_per_package} per ${item.packaging_unit})` : ''}
          </Text>
        </View>
      ) : null}
      {(item.location || item.rack_info) ? (
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Location</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {[item.location, item.rack_info].filter(Boolean).join(' / ')}
          </Text>
        </View>
      ) : null}
    </Card>
  );

  const renderPricingSection = () => (
    <Card style={{ marginBottom: spacing.md }}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Pricing</Text>
      {getPricingRows(item).map((row) => (
        <View key={row.label} style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{row.label}</Text>
          <Text style={[styles.detailValue, { color: colors.text, fontWeight: row.emphasize ? '600' : '400' }]}>{row.value}</Text>
        </View>
      ))}
      {item.tax_rate != null ? (
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>GST Rate</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {item.tax_rate}%{item.inclusive_of_tax ? ' (Inclusive)' : ''}
          </Text>
        </View>
      ) : null}
      {item.cess_rate != null && item.cess_rate > 0 ? (
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>CESS</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{item.cess_rate}%</Text>
        </View>
      ) : null}
    </Card>
  );

  const renderAdditionalSection = () => (
    <Card style={{ marginBottom: spacing.md }}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Additional Details</Text>
      {item.category ? (
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Category</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{item.category}</Text>
        </View>
      ) : null}
      {item.hsn ? (
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>HSN Code</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{item.hsn}</Text>
        </View>
      ) : null}
      {item.barcode_no ? (
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Barcode</Text>
          <Text style={[styles.detailValue, { color: colors.text, fontFamily: 'monospace' }]}>{item.barcode_no}</Text>
        </View>
      ) : null}
      {item.enable_batch_tracking ? (
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Batch Tracking</Text>
          <Text style={[styles.detailValue, { color: commonColors.stockHigh }]}>Enabled</Text>
        </View>
      ) : null}
      {item.enable_serial_tracking ? (
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Serial Tracking</Text>
          <Text style={[styles.detailValue, { color: commonColors.stockHigh }]}>Enabled</Text>
        </View>
      ) : null}
    </Card>
  );

  const renderDetailsTab = () => (
    <>
      {item.description ? (
        <Card style={{ marginBottom: spacing.md }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{item.description}</Text>
        </Card>
      ) : null}
      {renderStockSection()}
      {renderPricingSection()}
      {renderAdditionalSection()}
    </>
  );

  const renderMovementsTab = () => {
    if (movementsLoading) return <Loading />;
    if (movements.length === 0) {
      return (
        <View style={styles.emptyTab}>
          <Ionicons name="swap-vertical-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTabText, { color: colors.textSecondary }]}>No stock movements recorded</Text>
        </View>
      );
    }
    return (
      <View>
        {movements.map((mv) => {
          const mvColor = getMovementColor(mv.movement_type);
          const isPositive = mv.quantity_change > 0;
          return (
            <Card key={mv.id} style={{ marginBottom: spacing.sm }}>
              <View style={styles.movementRow}>
                <View style={[styles.movementIcon, { backgroundColor: `${mvColor}20` }]}>
                  <Ionicons
                    name={isPositive ? 'arrow-down' : 'arrow-up'}
                    size={16}
                    color={mvColor}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.movementType, { color: colors.text }]}>{mv.movement_type.replace(/_/g, ' ')}</Text>
                  {mv.notes ? <Text style={[styles.movementNote, { color: colors.textSecondary }]}>{mv.notes}</Text> : null}
                  <Text style={[styles.movementDate, { color: colors.textSecondary }]}>
                    {new Date(mv.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={[styles.movementQty, { color: mvColor }]}>
                  {isPositive ? '+' : ''}{mv.quantity_change}
                </Text>
              </View>
            </Card>
          );
        })}
      </View>
    );
  };

  const renderBatchesTab = () => {
    if (batches.length === 0) {
      return (
        <View style={styles.emptyTab}>
          <Ionicons name="layers-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTabText, { color: colors.textSecondary }]}>
            {item.enable_batch_tracking ? 'No batches recorded yet' : 'Batch tracking is not enabled for this item'}
          </Text>
        </View>
      );
    }
    return (
      <View>
        {batches.map((batch) => {
          const isExpired = batch.expiry_date && new Date(batch.expiry_date) < new Date();
          return (
            <Card key={batch.id} style={{ marginBottom: spacing.sm }}>
              <View style={styles.batchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.batchNumber, { color: colors.text }]}>{batch.batch_number}</Text>
                  <View style={styles.batchMeta}>
                    {batch.manufacturing_date ? (
                      <Text style={[styles.batchDate, { color: colors.textSecondary }]}>
                        Mfg: {new Date(batch.manufacturing_date).toLocaleDateString()}
                      </Text>
                    ) : null}
                    {batch.expiry_date ? (
                      <Text style={[styles.batchDate, { color: isExpired ? commonColors.stockOut : colors.textSecondary }]}>
                        Exp: {new Date(batch.expiry_date).toLocaleDateString()}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.batchRight}>
                  <Text style={[styles.batchQty, { color: colors.text }]}>Qty: {batch.quantity}</Text>
                  {isExpired ? (
                    <View style={[styles.batchTag, { backgroundColor: `${commonColors.stockOut}20` }]}>
                      <Text style={{ fontSize: fontSize.xs, color: commonColors.stockOut }}>Expired</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </Card>
          );
        })}
      </View>
    );
  };

  const renderSerialsTab = () => {
    if (serials.length === 0) {
      return (
        <View style={styles.emptyTab}>
          <Ionicons name="barcode-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTabText, { color: colors.textSecondary }]}>
            {item.enable_serial_tracking ? 'No serial numbers recorded yet' : 'Serial tracking is not enabled for this item'}
          </Text>
        </View>
      );
    }
    return (
      <View>
        {serials.map((serial) => {
          const statusColor = getSerialStatusColor(serial.status);
          return (
            <Card key={serial.id} style={{ marginBottom: spacing.sm }}>
              <View style={styles.serialRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.serialNumber, { color: colors.text }]}>{serial.serial_number}</Text>
                  {serial.warranty_expiry ? (
                    <Text style={[styles.serialWarranty, { color: colors.textSecondary }]}>
                      Warranty until: {new Date(serial.warranty_expiry).toLocaleDateString()}
                    </Text>
                  ) : null}
                </View>
                <View style={[styles.serialStatusBadge, { backgroundColor: `${statusColor}20` }]}>
                  <Text style={{ fontSize: fontSize.xs, color: statusColor, fontWeight: '600', textTransform: 'capitalize' }}>
                    {serial.status}
                  </Text>
                </View>
              </View>
            </Card>
          );
        })}
      </View>
    );
  };

  const visibleTabs = TABS.filter((tab) => {
    if (tab === 'Batches' && !item.enable_batch_tracking) return false;
    if (tab === 'Serials' && !item.enable_serial_tracking) return false;
    return true;
  });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
          {item.item_code ? (
            <Text style={[styles.itemSku, { color: colors.textSecondary }]}>Code: {item.item_code}</Text>
          ) : null}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${stockStatus.color}20` }]}>
          <Text style={[styles.statusText, { color: stockStatus.color }]}>{stockStatus.text}</Text>
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
        <Button
          title="Adjust Stock"
          variant="outline"
          size="sm"
          onPress={() => navigation.navigate('StockAdjustment', { itemId: item.id })}
          icon={<Ionicons name="swap-vertical-outline" size={16} color={colors.primary} />}
        />
        <Button
          title={deleting ? 'Deleting...' : 'Delete'}
          variant="outline"
          size="sm"
          onPress={handleDelete}
          disabled={deleting}
          icon={<Ionicons name="trash-outline" size={16} color={commonColors.stockOut} />}
        />
      </View>

      <View style={styles.tabBar}>
        {visibleTabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
            onPress={() => { lightTap(); setActiveTab(tab); }}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.textSecondary }]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'Details' && renderDetailsTab()}
      {activeTab === STOCK_HISTORY_TAB && renderMovementsTab()}
      {activeTab === 'Batches' && renderBatchesTab()}
      {activeTab === 'Serials' && renderSerialsTab()}
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
  tabBar: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
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
  emptyTab: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    gap: spacing.md,
  },
  emptyTabText: {
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  movementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  movementIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  movementType: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  movementNote: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  movementDate: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  movementQty: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  batchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  batchNumber: {
    fontSize: fontSize.md,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  batchMeta: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  batchDate: {
    fontSize: fontSize.xs,
  },
  batchRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  batchQty: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  batchTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  serialRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serialNumber: {
    fontSize: fontSize.md,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  serialWarranty: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  serialStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
});
