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

type AdjustmentType = 'increase' | 'decrease';

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

const computeNewStock = (currentStock: number, type: AdjustmentType, qty: number): number =>
  currentStock + (type === 'increase' ? qty : -qty);

const computeEntryQuantity = (type: AdjustmentType, qty: number): number =>
  type === 'increase' ? qty : -qty;

const formatAdjustmentNote = (type: AdjustmentType, qty: number, unit: string, reason: string): string =>
  `${type === 'increase' ? '+' : '-'}${qty} ${unit} — ${reason}`;

const formatSuccessMessage = (type: AdjustmentType, qty: number, unit: string): string =>
  `Stock ${type === 'increase' ? 'increased' : 'decreased'} by ${qty} ${unit}`;

const getErrorMessage = (err: unknown, fallback: string): string =>
  err instanceof Error ? err.message : fallback;

const validateAdjustmentFields = (
  item: Item | null,
  quantity: string,
  reason: string,
  organizationId: string | null,
  userId: string | null,
): string | null => {
  if (!item || !quantity || !reason || !organizationId || !userId) {
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

const saveAdjustment = async (params: {
  organizationId: string;
  itemId: string;
  adjustmentType: AdjustmentType;
  quantity: number;
  reason: string;
  notes: string;
  userId: string;
  entryQuantity: number;
  unit: string;
  currentStock: number;
}) => {
  const adjustmentNo = generateAdjustmentNo();

  const { error: adjError } = await supabase.from('stock_adjustments').insert({
    organization_id: params.organizationId,
    adjustment_no: adjustmentNo,
    item_id: params.itemId,
    adjustment_type: params.adjustmentType,
    quantity: params.quantity,
    reason: params.reason,
    notes: params.notes.trim() || null,
    adjusted_by: params.userId,
    status: 'approved',
  });
  if (adjError) throw adjError;

  const { error: movError } = await supabase.from('stock_movements').insert({
    organization_id: params.organizationId,
    item_id: params.itemId,
    transaction_type: 'ADJUSTMENT',
    entry_quantity: params.entryQuantity,
    reference_type: 'adjustment',
    reference_no: adjustmentNo,
    notes: formatAdjustmentNote(params.adjustmentType, params.quantity, params.unit, params.reason),
    created_by: params.userId,
  });
  if (movError) throw movError;

  const newStock = params.currentStock + params.entryQuantity;
  const { error: stockError } = await supabase
    .from('items')
    .update({ current_stock: newStock })
    .eq('id', params.itemId);
  if (stockError) throw stockError;
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
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingItem, setLoadingItem] = useState(!!route.params?.itemId);

  useEffect(() => {
    if (route.params?.itemId && organizationId) {
      const loadItem = async (id: string) => {
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
      };
      loadItem(route.params.itemId);
    }
  }, [route.params?.itemId, organizationId]);

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

  const filteredReasons = REASONS.filter((r) => r.types.includes(adjustmentType));

  const handleSubmit = async () => {
    const validationError = validateAdjustmentFields(item, quantity, reason, organizationId, user?.id ?? null);
    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }

    setSubmitting(true);
    try {
      const qty = parseFloat(quantity);
      const entryQuantity = computeEntryQuantity(adjustmentType, qty);
      await saveAdjustment({
        organizationId: organizationId!,
        itemId: item!.id,
        adjustmentType,
        quantity: qty,
        reason,
        notes,
        userId: user!.id,
        entryQuantity,
        unit: item!.unit,
        currentStock: item!.current_stock,
      });
      Alert.alert(
        'Success',
        formatSuccessMessage(adjustmentType, qty, item!.unit),
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Stock Adjustment" subtitle={item?.name} compact />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
                      {item.item_code} • Current stock: {item.current_stock} {item.unit}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}

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
                  <StockPreview item={item} quantity={quantity} adjustmentType={adjustmentType} colors={colors} />
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
    justifyContent: 'space-between',
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
  reasonText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
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
