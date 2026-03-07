import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import { supabase } from '@lib/supabase';
import { fetchWarehousesForOrganization } from '@lib/warehouse-service';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { spacing, fontSize, borderRadius } from '@theme/spacing';
import type { InventoryStackParamList } from '../../navigation/types';

type StockAdjustmentRoute = RouteProp<InventoryStackParamList, 'StockAdjustment'>;

interface Item {
  id: string;
  name: string;
  item_code: string;
  current_stock: number;
  unit: string;
}

interface Warehouse {
  id: string;
  name: string;
  code?: string | null;
  is_default?: boolean;
}

interface RecentAdjustment {
  id: string;
  quantity_change: number;
  movement_type: string;
  notes: string | null;
  created_at: string;
}

type AdjustmentType = 'increase' | 'decrease';

const JUSTIFY_SPACE_BETWEEN = 'space-between' as const;

interface ReasonOption {
  value: string;
  label: string;
  types: AdjustmentType[];
}

const REASONS: ReasonOption[] = [
  { value: 'found', label: 'Found / Recovered', types: ['increase'] },
  { value: 'correction', label: 'Stock Correction', types: ['increase', 'decrease'] },
  { value: 'opening_balance', label: 'Opening Balance', types: ['increase'] },
  { value: 'damage', label: 'Damage / Breakage', types: ['decrease'] },
  { value: 'theft', label: 'Theft / Loss', types: ['decrease'] },
  { value: 'expired', label: 'Expired', types: ['decrease'] },
  { value: 'other', label: 'Other', types: ['increase', 'decrease'] },
];

const getInputBackground = (isDark: boolean, colors: { surface: string }, fallback = '#f8fafc'): string =>
  isDark ? colors.surface : fallback;

const getToggleBg = (
  active: boolean,
  isDark: boolean,
  activeDark: string,
  activeLight: string,
  inactiveSurface: string
): string => {
  if (active) return isDark ? activeDark : activeLight;
  return isDark ? inactiveSurface : '#F9FAFB';
};

const computeNewStock = (currentStock: number, type: AdjustmentType, qty: number): number =>
  currentStock + (type === 'increase' ? qty : -qty);

const computeEntryQuantity = (type: AdjustmentType, qty: number): number =>
  type === 'increase' ? qty : -qty;

const formatAdjustmentNote = (type: AdjustmentType, qty: number, unit: string, reason: string): string =>
  `${type === 'increase' ? '+' : '-'}${qty} ${unit} — ${reason}`;

const formatSuccessMessage = (type: AdjustmentType, qty: number, unit: string): string =>
  `Stock ${type === 'increase' ? 'increased' : 'decreased'} by ${qty} ${unit}`;

const getMovementType = (type: AdjustmentType, reason: string): 'stock_in' | 'adjustment' => {
  if (type === 'increase') return 'stock_in';
  if (reason === 'correction') return 'adjustment';
  return 'adjustment';
};

const getErrorMessage = (err: unknown, fallback: string): string =>
  err instanceof Error ? err.message : fallback;

const KEYBOARD_BEHAVIOR = Platform.OS === 'ios' ? ('padding' as const) : undefined;

const getEntryNotes = (notes: string | null): string => notes || 'Manual adjustment';

const buildToggleStyle = (
  active: boolean,
  isDark: boolean,
  activeColor: string,
  darkBg: string,
  lightBg: string,
  colors: { border: string; textSecondary: string; surface: string },
  icon: 'add-circle-outline' | 'remove-circle-outline',
  label: string,
) => ({
  backgroundColor: getToggleBg(active, isDark, darkBg, lightBg, colors.surface),
  borderColor: active ? activeColor : colors.border,
  textColor: active ? activeColor : colors.textSecondary,
  icon,
  label,
});

const validateAdjustmentFields = (
  item: Item | null,
  warehouseId: string,
  quantity: string,
  reason: string,
  organizationId: string | null,
  userId: string | null,
): string | null => {
  if (!item || !warehouseId || !quantity || !reason || !organizationId || !userId) {
    return 'Please fill all required fields';
  }
  const qty = parseFloat(quantity);
  if (isNaN(qty) || qty <= 0) {
    return 'Quantity must be a positive number';
  }
  return null;
};

const generateAdjustmentNo = (): string => {
  const timestamp = Date.now();
  const seq = String((timestamp % 9999) + 1).padStart(4, '0');
  return `ADJ-${timestamp}-${seq}`;
};

const updateWarehouseStockForAdjustment = async (
  organizationId: string,
  itemId: string,
  warehouseId: string,
  adjustmentType: AdjustmentType,
  quantity: number,
  qtyChange: number,
  warehouseName: string,
  unit: string,
) => {
  const { data: warehouseStock, error: warehouseStockError } = await supabase
    .from('item_warehouse_stock')
    .select('id, quantity')
    .eq('organization_id', organizationId)
    .eq('item_id', itemId)
    .eq('warehouse_id', warehouseId)
    .maybeSingle();

  if (warehouseStockError) throw warehouseStockError;

  const quantityBefore = warehouseStock?.quantity || 0;
  if (adjustmentType === 'decrease' && quantityBefore < quantity) {
    throw new Error(`Insufficient stock in ${warehouseName}. Available: ${quantityBefore} ${unit}`);
  }

  const quantityAfter = quantityBefore + qtyChange;

  if (!warehouseStock?.id) {
    if (adjustmentType === 'decrease') {
      throw new Error(`No stock record found in ${warehouseName}`);
    }

    const { error: warehouseInsertError } = await supabase
      .from('item_warehouse_stock')
      .insert({ organization_id: organizationId, item_id: itemId, warehouse_id: warehouseId, quantity: quantityAfter });
    if (warehouseInsertError) throw warehouseInsertError;
    return quantityAfter;
  }

  const { error: warehouseUpdateError } = await supabase
    .from('item_warehouse_stock')
    .update({ quantity: quantityAfter })
    .eq('id', warehouseStock.id);
  if (warehouseUpdateError) throw warehouseUpdateError;

  return quantityAfter;
};

const buildRecentAdjustmentsQuery = (organizationId: string, itemId?: string) => {
  const query = supabase
    .from('stock_movements')
    .select('id, quantity_change, movement_type, notes, created_at')
    .eq('organization_id', organizationId)
    .eq('reference_type', 'adjustment')
    .order('created_at', { ascending: false })
    .limit(8);

  return itemId ? query.eq('item_id', itemId) : query;
};

const saveAdjustment = async (params: {
  organizationId: string;
  itemId: string;
  warehouseId: string;
  adjustmentType: AdjustmentType;
  quantity: number;
  reason: string;
  notes: string;
  userId: string;
  unit: string;
  warehouseName: string;
}) => {
  const adjustmentNo = generateAdjustmentNo();
  const qtyChange = computeEntryQuantity(params.adjustmentType, params.quantity);

  const quantityAfter = await updateWarehouseStockForAdjustment(
    params.organizationId, params.itemId, params.warehouseId,
    params.adjustmentType, params.quantity, qtyChange,
    params.warehouseName, params.unit,
  );

  const { data: warehouseRows, error: warehouseRowsError } = await supabase
    .from('item_warehouse_stock')
    .select('quantity')
    .eq('organization_id', params.organizationId)
    .eq('item_id', params.itemId);

  if (warehouseRowsError) throw warehouseRowsError;

  const newStock = (warehouseRows || []).reduce((sum, row) => sum + (row.quantity || 0), 0);

  const { error: adjError } = await supabase.from('stock_adjustments').insert({
    organization_id: params.organizationId,
    adjustment_no: adjustmentNo,
    item_id: params.itemId,
    adjustment_type: params.adjustmentType,
    quantity: params.quantity,
    reason: params.reason,
    notes: [params.warehouseName, params.notes.trim()].filter(Boolean).join(' • ') || null,
    adjusted_by: params.userId,
    status: 'approved',
  });
  if (adjError) throw adjError;

  const { error: movError } = await supabase.from('stock_movements').insert({
    organization_id: params.organizationId,
    item_id: params.itemId,
    movement_type: getMovementType(params.adjustmentType, params.reason),
    quantity_before: quantityAfter - qtyChange,
    quantity_change: qtyChange,
    quantity_after: quantityAfter,
    reference_type: 'adjustment',
    reference_no: adjustmentNo,
    notes: `${params.warehouseName} • ${formatAdjustmentNote(params.adjustmentType, params.quantity, params.unit, params.reason)}`,
    created_by: params.userId,
  });
  if (movError) throw movError;

  const { error: stockError } = await supabase
    .from('items')
    .update({ current_stock: newStock })
    .eq('id', params.itemId);
  if (stockError) throw stockError;

  return { newStock, quantityAfter };
};

function ItemPickerSection({
  searchQuery,
  onSearchChange,
  items,
  onSelectItem,
  colors,
  isDark,
}: {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  items: Item[];
  onSelectItem: (item: Item) => void;
  colors: { card: string; border: string; text: string; textSecondary: string; primary: string; surface: string };
  isDark: boolean;
}) {
  const searchBg = getInputBackground(isDark, colors, '#f1f5f9');
  return (
    <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Item</Text>
      <View style={[styles.searchBox, { backgroundColor: searchBg, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search items..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={onSearchChange}
          autoFocus
        />
      </View>
      {items.map((i) => (
        <TouchableOpacity
          key={i.id}
          style={[styles.itemOption, { borderColor: colors.border }]}
          onPress={() => onSelectItem(i)}
          activeOpacity={0.7}
        >
          <View style={styles.itemInfo}>
            <Text style={[styles.itemName, { color: colors.text }]}>{i.name}</Text>
            <Text style={[styles.itemCode, { color: colors.textSecondary }]}>{i.item_code}</Text>
          </View>
          <View style={styles.itemStock}>
            <Text style={[styles.stockText, { color: colors.primary }]}>{i.current_stock} {i.unit}</Text>
          </View>
        </TouchableOpacity>
      ))}
      {searchQuery.length >= 2 && items.length === 0 && (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No items found</Text>
      )}
    </View>
  );
}

function StockPreview({
  item,
  quantity,
  adjustmentType,
  colors,
}: {
  item: Item;
  quantity: string;
  adjustmentType: AdjustmentType;
  colors: { textSecondary: string };
}) {
  const qty = parseFloat(quantity);
  if (!quantity || isNaN(qty)) return null;
  const newStock = computeNewStock(item.current_stock, adjustmentType, qty);
  return (
    <Text style={[styles.previewText, { color: colors.textSecondary }]}>
      New stock: {newStock} {item.unit}
    </Text>
  );
}

function SubmitFooter({
  quantity,
  reason,
  submitting,
  onPress,
  colors,
}: {
  quantity: string;
  reason: string;
  submitting: boolean;
  onPress: () => void;
  colors: { card: string; border: string; primary: string };
}) {
  const isDisabled = !quantity || !reason || submitting;
  const submitBg = isDisabled ? colors.border : colors.primary;
  return (
    <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor: submitBg }]}
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.8}
      >
        {submitting ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
            <Text style={styles.submitText}>Save Adjustment</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function StockAdjustmentScreen() {
  const { colors, isDark } = useTheme();
  const { organizationId, user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute<StockAdjustmentRoute>();

  const [item, setItem] = useState<Item | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showItemPicker, setShowItemPicker] = useState(!route.params?.itemId);
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('increase');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [warehouseStock, setWarehouseStock] = useState<number | null>(null);
  const [recentAdjustments, setRecentAdjustments] = useState<RecentAdjustment[]>([]);
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingItem, setLoadingItem] = useState(!!route.params?.itemId);

  useEffect(() => {
    if (!organizationId) return;

    const loadWarehouses = async () => {
      try {
        const data = await fetchWarehousesForOrganization<Warehouse>(organizationId, {
          select: 'id, name, code, is_default',
        });
        setWarehouses(data);
        if (!selectedWarehouseId) {
          const defaultWarehouse = data.find((warehouse) => warehouse.is_default) || data[0];
          if (defaultWarehouse) {
            setSelectedWarehouseId(defaultWarehouse.id);
          }
        }
      } catch (error) {
        console.error('[STOCK_ADJUSTMENT] Failed to load warehouses:', error);
      }
    };

    loadWarehouses();
  }, [organizationId, selectedWarehouseId]);

  const loadItemById = useCallback(async (id: string) => {
    try {
      setLoadingItem(true);
      const { data, error } = await supabase
        .from('items')
        .select('id, name, item_code, current_stock, unit')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      if (data) {
        setItem(data as Item);
        setShowItemPicker(false);
      }
    } catch {
      Alert.alert('Error', 'Failed to load item');
    } finally {
      setLoadingItem(false);
    }
  }, [organizationId]);

  useEffect(() => {
    if (route.params?.itemId && organizationId) {
      loadItemById(route.params.itemId);
    }
  }, [route.params?.itemId, organizationId, loadItemById]);

  const searchItems = useCallback(async (query: string) => {
    if (!organizationId || query.length < 2) {
      setItems([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('items')
        .select('id, name, item_code, current_stock, unit')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .or(`name.ilike.%${query}%,item_code.ilike.%${query}%`)
        .order('name')
        .limit(20);

      if (error) throw error;
      setItems((data as Item[]) || []);
    } catch {
      setItems([]);
    }
  }, [organizationId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchItems(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchItems]);

  const loadWarehouseStock = useCallback(async () => {
    if (!organizationId || !item?.id || !selectedWarehouseId) {
      setWarehouseStock(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('item_warehouse_stock')
        .select('quantity')
        .eq('organization_id', organizationId)
        .eq('item_id', item.id)
        .eq('warehouse_id', selectedWarehouseId)
        .maybeSingle();

      if (error) throw error;
      setWarehouseStock(data?.quantity ?? 0);
    } catch (error) {
      console.error('[STOCK_ADJUSTMENT] Failed to load warehouse stock:', error);
      setWarehouseStock(null);
    }
  }, [organizationId, item?.id, selectedWarehouseId]);

  const loadRecentAdjustments = useCallback(async () => {
    if (!organizationId) {
      setRecentAdjustments([]);
      return;
    }

    try {
      const { data, error } = await buildRecentAdjustmentsQuery(organizationId, item?.id);
      if (error) throw error;
      setRecentAdjustments((data || []) as RecentAdjustment[]);
    } catch (error) {
      console.error('[STOCK_ADJUSTMENT] Failed to load recent adjustments:', error);
      setRecentAdjustments([]);
    }
  }, [organizationId, item?.id]);

  useEffect(() => {
    loadWarehouseStock();
  }, [loadWarehouseStock]);

  useEffect(() => {
    loadRecentAdjustments();
  }, [loadRecentAdjustments]);

  const filteredReasons = REASONS.filter((r) => r.types.includes(adjustmentType));
  const selectedWarehouse = warehouses.find((warehouse) => warehouse.id === selectedWarehouseId) || null;

  const handleSubmit = async () => {
    const validationError = validateAdjustmentFields(item, selectedWarehouseId, quantity, reason, organizationId, user?.id ?? null);
    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }

    setSubmitting(true);
    try {
      const qty = parseFloat(quantity);
      const result = await saveAdjustment({
        organizationId: organizationId!,
        itemId: item!.id,
        warehouseId: selectedWarehouseId,
        adjustmentType,
        quantity: qty,
        reason,
        notes,
        userId: user!.id,
        unit: item!.unit,
        warehouseName: selectedWarehouse?.name || 'Warehouse',
      });
      setWarehouseStock(result.quantityAfter);
      Alert.alert(
        'Success',
        `${formatSuccessMessage(adjustmentType, qty, item!.unit)} in ${selectedWarehouse?.name || 'warehouse'}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err: unknown) {
      Alert.alert('Error', getErrorMessage(err, 'Failed to save adjustment'));
    } finally {
      setSubmitting(false);
    }
  };

  const selectItem = (selected: Item) => {
    setItem(selected);
    setShowItemPicker(false);
    setSearchQuery('');
    setItems([]);
  };

  if (loadingItem) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Stock Adjustment" compact />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  const isIncrease = adjustmentType === 'increase';
  const increaseStyle = buildToggleStyle(isIncrease, isDark, '#10B981', '#064e3b', '#D1FAE5', colors, 'add-circle-outline', 'Increase Stock');
  const decreaseStyle = buildToggleStyle(!isIncrease, isDark, '#EF4444', '#7f1d1d', '#FEE2E2', colors, 'remove-circle-outline', 'Decrease Stock');
  const inputBg = getInputBackground(isDark, colors, '#F9FAFB');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Stock Adjustment" subtitle={item?.name} compact />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={KEYBOARD_BEHAVIOR}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {showItemPicker ? (
            <ItemPickerSection
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              items={items}
              onSelectItem={selectItem}
              colors={colors}
              isDark={isDark}
            />
          ) : (
            <>
              {item && (
                <TouchableOpacity
                  style={[styles.selectedItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => setShowItemPicker(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.flex}>
                    <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.itemCode, { color: colors.textSecondary }]}>
                      {item.item_code} • Total stock: {item.current_stock} {item.unit}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}

              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Warehouse</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.warehouseRow}>
                  {warehouses.map((warehouse) => (
                    <TouchableOpacity
                      key={warehouse.id}
                      style={[
                        styles.warehouseChip,
                        {
                          backgroundColor: selectedWarehouseId === warehouse.id ? colors.primary : colors.surface,
                          borderColor: selectedWarehouseId === warehouse.id ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setSelectedWarehouseId(warehouse.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="business-outline"
                        size={16}
                        color={selectedWarehouseId === warehouse.id ? '#ffffff' : colors.textSecondary}
                      />
                      <Text style={[styles.warehouseChipText, { color: selectedWarehouseId === warehouse.id ? '#ffffff' : colors.text }]}>
                        {warehouse.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {item && selectedWarehouse && warehouseStock !== null ? (
                  <View style={[styles.stockSummaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View>
                      <Text style={[styles.stockSummaryLabel, { color: colors.textSecondary }]}>Available in {selectedWarehouse.name}</Text>
                      <Text style={[styles.stockSummaryValue, { color: colors.text }]}>{warehouseStock} {item.unit}</Text>
                    </View>
                    <View style={[styles.stockSummaryBadge, { backgroundColor: colors.primaryLight }]}>
                      <Text style={[styles.stockSummaryBadgeText, { color: colors.primary }]}>{selectedWarehouse.code || 'WAREHOUSE'}</Text>
                    </View>
                  </View>
                ) : null}
              </View>

              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Adjustment Type</Text>
                <View style={styles.typeRow}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      { backgroundColor: increaseStyle.backgroundColor, borderColor: increaseStyle.borderColor },
                    ]}
                    onPress={() => { setAdjustmentType('increase'); setReason(''); }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={increaseStyle.icon} size={22} color={increaseStyle.textColor} />
                    <Text style={[styles.typeLabel, { color: increaseStyle.textColor }]}>
                      {increaseStyle.label}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      { backgroundColor: decreaseStyle.backgroundColor, borderColor: decreaseStyle.borderColor },
                    ]}
                    onPress={() => { setAdjustmentType('decrease'); setReason(''); }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={decreaseStyle.icon} size={22} color={decreaseStyle.textColor} />
                    <Text style={[styles.typeLabel, { color: decreaseStyle.textColor }]}>
                      {decreaseStyle.label}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Quantity</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: inputBg }]}
                  placeholder={`Enter quantity (${item?.unit || 'units'})`}
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                  value={quantity}
                  onChangeText={setQuantity}
                />
                {item && (
                  <StockPreview
                    item={{ ...item, current_stock: warehouseStock ?? item.current_stock }}
                    quantity={quantity}
                    adjustmentType={adjustmentType}
                    colors={colors}
                  />
                )}
              </View>

              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Reason</Text>
                <View style={styles.reasonGrid}>
                  {filteredReasons.map((r) => (
                    <TouchableOpacity
                      key={r.value}
                      style={[
                        styles.reasonChip,
                        {
                          backgroundColor: reason === r.value ? colors.primary : colors.surface,
                          borderColor: reason === r.value ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setReason(r.value)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.reasonText,
                          { color: reason === r.value ? '#ffffff' : colors.text },
                        ]}
                      >
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: inputBg }]}
                  placeholder="Add any notes..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  value={notes}
                  onChangeText={setNotes}
                />
              </View>

              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.historyHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Recent Adjustments</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('StockMovements', item ? { itemId: item.id } : undefined)}>
                    <Text style={[styles.historyLink, { color: colors.primary }]}>See movement log</Text>
                  </TouchableOpacity>
                </View>
                {recentAdjustments.length === 0 ? (
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No recent adjustments yet</Text>
                ) : (
                  recentAdjustments.map((entry) => (
                    <View key={entry.id} style={[styles.historyItem, { borderBottomColor: colors.border }]}>
                      <View style={styles.historyLeft}>
                        <Text style={[styles.historyType, { color: colors.text }]}>
                          {entry.movement_type.replace(/_/g, ' ')}
                        </Text>
                        <Text style={[styles.historyNotes, { color: colors.textSecondary }]} numberOfLines={2}>
                          {getEntryNotes(entry.notes)}
                        </Text>
                      </View>
                      <View style={styles.historyRight}>
                        <Text style={[styles.historyQty, { color: entry.quantity_change >= 0 ? colors.success : colors.error }]}>
                          {entry.quantity_change >= 0 ? '+' : ''}{entry.quantity_change}
                        </Text>
                        <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                          {new Date(entry.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </>
          )}
        </ScrollView>

        {!showItemPicker && item && (
          <SubmitFooter
            quantity={quantity}
            reason={reason}
            submitting={submitting}
            onPress={handleSubmit}
            colors={colors}
          />
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: 12,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: borderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
  },
  itemOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: JUSTIFY_SPACE_BETWEEN,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  itemCode: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  itemStock: {
    marginLeft: 12,
  },
  stockText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: fontSize.sm,
  },
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: borderRadius.sm,
    borderWidth: 1.5,
  },
  typeLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 14,
    fontSize: fontSize.md,
  },
  textArea: {
    height: 88,
    paddingTop: 12,
  },
  previewText: {
    fontSize: fontSize.xs,
    marginTop: 8,
    fontStyle: 'italic',
  },
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  warehouseRow: {
    gap: 8,
  },
  warehouseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  warehouseChipText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  stockSummaryCard: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    padding: 12,
    flexDirection: 'row',
    justifyContent: JUSTIFY_SPACE_BETWEEN,
    alignItems: 'center',
  },
  stockSummaryLabel: {
    fontSize: fontSize.xs,
    marginBottom: 4,
  },
  stockSummaryValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  stockSummaryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  stockSummaryBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  reasonText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: JUSTIFY_SPACE_BETWEEN,
    alignItems: 'center',
    marginBottom: 12,
  },
  historyLink: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: JUSTIFY_SPACE_BETWEEN,
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyLeft: {
    flex: 1,
    paddingRight: 12,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyType: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: 2,
  },
  historyNotes: {
    fontSize: fontSize.xs,
  },
  historyQty: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    marginBottom: 2,
  },
  historyDate: {
    fontSize: fontSize.xs,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: borderRadius.md,
  },
  submitText: {
    color: '#ffffff',
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
