import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { InventoryStackNavigationProp } from '@navigation/types';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import { useToast } from '@contexts/ToastContext';
import { supabase } from '@lib/supabase';
import { formatDate } from '@lib/utils';
import Input from '@components/ui/Input';
import Button from '@components/ui/Button';
import EmptyState from '@components/ui/EmptyState';
import Card from '@components/ui/Card';
import { successFeedback, errorFeedback, lightTap } from '@lib/haptics';
import { fetchWarehousesForOrganization } from '@lib/warehouse-service';

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface Item {
  id: string;
  name: string;
  item_code: string;
  current_stock: number;
  unit: string;
}

interface TransferRecord {
  id: string;
  item_id: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  quantity: number;
  notes: string | null;
  created_at: string;
  items?: { name: string } | null;
  from_warehouse?: { name: string } | null;
  to_warehouse?: { name: string } | null;
}

type ActiveTab = 'create' | 'history';

export default function StockTransferScreen() {
  const navigation = useNavigation<InventoryStackNavigationProp>();
  const { colors, shadows, isDark } = useTheme();
  const { organizationId } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<ActiveTab>('create');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedItem, setSelectedItem] = useState<string>('');
  const [fromWarehouse, setFromWarehouse] = useState<string>('');
  const [toWarehouse, setToWarehouse] = useState<string>('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [showItemPicker, setShowItemPicker] = useState(false);

  useEffect(() => {
    if (!organizationId) return;
    const load = async () => {
      setLoading(true);
      try {
        const [whRes, itemRes, transferRes] = await Promise.all([
          fetchWarehousesForOrganization<Warehouse>(organizationId, { select: 'id, name, code' }),
          supabase.from('items').select('id, name, item_code, current_stock, unit').eq('organization_id', organizationId).is('deleted_at', null).gt('current_stock', 0).order('name'),
          supabase.from('stock_transfers').select('id, item_id, from_warehouse_id, to_warehouse_id, quantity, notes, created_at, items:item_id(name), from_warehouse:from_warehouse_id(name), to_warehouse:to_warehouse_id(name)').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(50),
        ]);
        setWarehouses(whRes || []);
        setItems(itemRes.data || []);
        setTransfers((transferRes.data || []) as unknown as TransferRecord[]);
      } catch (err) {
        console.error('Load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [organizationId]);

  const filteredItems = items.filter(i =>
    i.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
    (i.item_code || '').toLowerCase().includes(itemSearch.toLowerCase())
  );

  const selectedItemData = items.find(i => i.id === selectedItem);

  const updateWarehouseStock = useCallback(async (
    fromStock: { id: string; quantity: number } | undefined,
    toStock: { id: string; warehouse_id: string; quantity: number } | undefined,
    qty: number,
  ) => {
    if (!fromStock || fromStock.quantity < qty) {
      toast.error('Quantity exceeds available stock in the source warehouse');
      return false;
    }

    const { error: updateFromStockError } = await supabase
      .from('item_warehouse_stock')
      .update({ quantity: fromStock.quantity - qty })
      .eq('id', fromStock.id);
    if (updateFromStockError) throw updateFromStockError;

    if (toStock?.id) {
      const { error: updateToStockError } = await supabase
        .from('item_warehouse_stock')
        .update({ quantity: (toStock.quantity || 0) + qty })
        .eq('id', toStock.id);
      if (updateToStockError) throw updateToStockError;
    } else {
      const { error: insertToStockError } = await supabase
        .from('item_warehouse_stock')
        .insert({
          organization_id: organizationId,
          item_id: selectedItem,
          warehouse_id: toWarehouse,
          quantity: qty,
        });
      if (insertToStockError) throw insertToStockError;
    }
    return true;
  }, [organizationId, selectedItem, toWarehouse, toast]);

  const handleTransfer = useCallback(async () => {
    if (!selectedItem || !fromWarehouse || !toWarehouse || !quantity) {
      toast.error('Please fill all required fields');
      return;
    }
    if (fromWarehouse === toWarehouse) {
      toast.error('Source and destination must be different');
      return;
    }
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Invalid quantity');
      return;
    }

    setSubmitting(true);
    try {
      const { data: warehouseStockRows, error: warehouseStockError } = await supabase
        .from('item_warehouse_stock')
        .select('id, warehouse_id, quantity')
        .eq('organization_id', organizationId)
        .eq('item_id', selectedItem)
        .in('warehouse_id', [fromWarehouse, toWarehouse]);

      if (warehouseStockError) throw warehouseStockError;

      const fromStock = warehouseStockRows?.find((row) => row.warehouse_id === fromWarehouse);
      const toStock = warehouseStockRows?.find((row) => row.warehouse_id === toWarehouse);

      const stockUpdated = await updateWarehouseStock(fromStock, toStock, qty);
      if (!stockUpdated) {
        setSubmitting(false);
        return;
      }

      const { error } = await supabase.from('stock_transfers').insert({
        organization_id: organizationId,
        item_id: selectedItem,
        from_warehouse_id: fromWarehouse,
        to_warehouse_id: toWarehouse,
        quantity: qty,
        notes: notes || null,
      });
      if (error) throw error;

      const fromQtyBefore = fromStock?.quantity || 0;
      const toQtyBefore = toStock?.quantity || 0;

      const movementResults = await Promise.all([
        supabase.from('stock_movements').insert({
          organization_id: organizationId,
          item_id: selectedItem,
          movement_type: 'transfer',
          quantity_before: fromQtyBefore,
          quantity_change: -qty,
          quantity_after: fromQtyBefore - qty,
          reference_type: 'stock_transfer',
          notes: `Transfer to ${warehouses.find(w => w.id === toWarehouse)?.name || 'warehouse'}`,
        }),
        supabase.from('stock_movements').insert({
          organization_id: organizationId,
          item_id: selectedItem,
          movement_type: 'transfer',
          quantity_before: toQtyBefore,
          quantity_change: qty,
          quantity_after: toQtyBefore + qty,
          reference_type: 'stock_transfer',
          notes: `Transfer from ${warehouses.find(w => w.id === fromWarehouse)?.name || 'warehouse'}`,
        }),
      ]);

      const movementError = movementResults.find((result) => result.error)?.error;
      if (movementError) throw movementError;

      successFeedback();
      toast.success(`Transferred ${qty} units successfully`);
      setSelectedItem('');
      setFromWarehouse('');
      setToWarehouse('');
      setQuantity('');
      setNotes('');
      navigation.goBack();
    } catch (err) {
      errorFeedback();
      toast.error('Transfer failed');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }, [selectedItem, fromWarehouse, toWarehouse, quantity, notes, organizationId, warehouses, toast, navigation, updateWarehouseStock]);

  const renderWarehouseSelector = (label: string, value: string, onChange: (v: string) => void, excludeId?: string) => (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {warehouses.filter(w => w.id !== excludeId).map(w => (
          <TouchableOpacity
            key={w.id}
            style={[styles.chip, value === w.id && { backgroundColor: colors.primary }, value !== w.id && { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
            onPress={() => { lightTap(); onChange(w.id); }}
          >
            <Ionicons name="business-outline" size={14} color={value === w.id ? '#fff' : colors.text} />
            <Text style={[styles.chipText, { color: value === w.id ? '#fff' : colors.text }]}>{w.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderCreateTab = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContent}>
      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Select Item *</Text>
        <TouchableOpacity
          style={[styles.selector, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowItemPicker(!showItemPicker)}
        >
          <Ionicons name="cube-outline" size={20} color={colors.primary} />
          <Text style={[styles.selectorText, { color: selectedItemData ? colors.text : colors.textTertiary }]} numberOfLines={1}>
            {selectedItemData ? `${selectedItemData.name} (Stock: ${selectedItemData.current_stock} ${selectedItemData.unit})` : 'Choose an item...'}
          </Text>
          <Ionicons name={showItemPicker ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        {showItemPicker && (
          <View style={[styles.pickerDropdown, { backgroundColor: colors.card, borderColor: colors.border, ...shadows.md }]}>
            <Input placeholder="Search items..." value={itemSearch} onChangeText={setItemSearch} leftIcon="search" containerStyle={styles.pickerSearch} />
            <ScrollView style={styles.pickerList} nestedScrollEnabled>
              {filteredItems.length === 0 ? (
                <Text style={[styles.emptyPicker, { color: colors.textTertiary }]}>No items found</Text>
              ) : (
                filteredItems.map((i) => (
                  <TouchableOpacity
                    key={i.id}
                    style={[styles.pickerItem, selectedItem === i.id && { backgroundColor: colors.primaryLight }]}
                    onPress={() => { setSelectedItem(i.id); setShowItemPicker(false); setItemSearch(''); lightTap(); }}
                  >
                    <View>
                      <Text style={[styles.pickerItemName, { color: colors.text }]}>{i.name}</Text>
                      <Text style={[styles.pickerItemSub, { color: colors.textSecondary }]}>{i.item_code || 'No code'} · {i.current_stock} {i.unit}</Text>
                    </View>
                    {selectedItem === i.id && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        )}
      </View>

      {renderWarehouseSelector('From Warehouse *', fromWarehouse, setFromWarehouse, toWarehouse)}
      {renderWarehouseSelector('To Warehouse *', toWarehouse, setToWarehouse, fromWarehouse)}

      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Quantity *</Text>
        <Input
          placeholder="Enter quantity"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
          leftIcon="swap-horizontal"
        />
        {selectedItemData && quantity && (
          <View style={[styles.preview, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.previewText, { color: colors.primary }]}>
              Available: {selectedItemData.current_stock} {selectedItemData.unit} → After: {selectedItemData.current_stock - (parseInt(quantity, 10) || 0)} {selectedItemData.unit}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Notes (Optional)</Text>
        <Input placeholder="Transfer reason or notes..." value={notes} onChangeText={setNotes} leftIcon="document-text" />
      </View>

      <Button
        title={submitting ? 'Transferring...' : 'Transfer Stock'}
        onPress={handleTransfer}
        disabled={submitting || !selectedItem || !fromWarehouse || !toWarehouse || !quantity}
        style={styles.submitBtn}
      />
    </ScrollView>
  );

  const renderHistoryTab = () => (
    <FlatList
      data={transfers}
      keyExtractor={t => t.id}
      contentContainerStyle={styles.historyContent}
      renderItem={({ item: t }) => {
        const fromName = (t.from_warehouse as unknown as { name: string } | null)?.name || 'Unknown';
        const toName = (t.to_warehouse as unknown as { name: string } | null)?.name || 'Unknown';
        const itemName = (t.items as unknown as { name: string } | null)?.name || 'Unknown Item';
        return (
          <Card style={styles.transferCard}>
            <View style={styles.transferHeader}>
              <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.transferIcon}>
                <Ionicons name="swap-horizontal" size={18} color="#fff" />
              </LinearGradient>
              <View style={styles.transferInfo}>
                <Text style={[styles.transferItem, { color: colors.text }]} numberOfLines={1}>{itemName}</Text>
                <Text style={[styles.transferQty, { color: colors.primary }]}>{t.quantity} units</Text>
              </View>
              <Text style={[styles.transferDate, { color: colors.textTertiary }]}>{formatDate(t.created_at)}</Text>
            </View>
            <View style={[styles.transferRoute, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
              <View style={styles.routePoint}>
                <View style={[styles.routeDot, { backgroundColor: '#EF4444' }]} />
                <Text style={[styles.routeText, { color: colors.textSecondary }]}>{fromName}</Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color={colors.textTertiary} />
              <View style={styles.routePoint}>
                <View style={[styles.routeDot, { backgroundColor: '#10B981' }]} />
                <Text style={[styles.routeText, { color: colors.textSecondary }]}>{toName}</Text>
              </View>
            </View>
            {t.notes && <Text style={[styles.transferNotes, { color: colors.textTertiary }]}>{t.notes}</Text>}
          </Card>
        );
      }}
      ListEmptyComponent={
        loading ? null : (
          <EmptyState icon="swap-horizontal-outline" title="No transfers yet" description="Stock transfers between warehouses will appear here" />
        )
      }
    />
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.tabBar, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
        {(['create', 'history'] as ActiveTab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => { setActiveTab(tab); lightTap(); }}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.textSecondary }]}>
              {tab === 'create' ? 'New Transfer' : 'History'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'create' ? renderCreateTab() : renderHistoryTab()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  tabBar: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabText: { fontSize: 14, fontWeight: '600' },
  formContent: { padding: 20, paddingBottom: 40 },
  fieldGroup: { marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginLeft: 2 },
  selector: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, gap: 10 },
  selectorText: { flex: 1, fontSize: 14 },
  pickerDropdown: { marginTop: 8, borderRadius: 12, borderWidth: 1, maxHeight: 250, overflow: 'hidden' },
  pickerSearch: { marginBottom: 0, paddingHorizontal: 8, paddingTop: 8 },
  pickerList: { maxHeight: 200 },
  pickerItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
  pickerItemName: { fontSize: 14, fontWeight: '500' },
  pickerItemSub: { fontSize: 12, marginTop: 2 },
  emptyPicker: { textAlign: 'center', padding: 20, fontSize: 13 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, gap: 6 },
  chipText: { fontSize: 13, fontWeight: '500' },
  preview: { marginTop: 8, padding: 10, borderRadius: 8 },
  previewText: { fontSize: 12, fontWeight: '500' },
  submitBtn: { marginTop: 12 },
  historyContent: { padding: 16, paddingBottom: 40 },
  transferCard: { marginBottom: 10 },
  transferHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  transferIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  transferInfo: { flex: 1 },
  transferItem: { fontSize: 14, fontWeight: '600' },
  transferQty: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  transferDate: { fontSize: 11 },
  transferRoute: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  routePoint: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  routeDot: { width: 8, height: 8, borderRadius: 4 },
  routeText: { fontSize: 12, fontWeight: '500' },
  transferNotes: { fontSize: 11, marginTop: 8, fontStyle: 'italic' },
});
