import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  Animated,
  Dimensions,
  TextInput,
  FlatList,
  Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MoreStackNavigationProp } from '@navigation/types';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import Loading from '@components/ui/Loading';
import { useUnsavedChanges } from '@hooks/useUnsavedChanges';
import { supabase } from '@lib/supabase';
import { formatCurrency } from '@lib/utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Supplier {
  id: string;
  name: string;
  email?: string;
  gstin?: string;
  phone?: string;
  address?: string;
}

interface Item {
  id: string;
  name: string;
  item_code?: string;
  category?: string;
  purchase_price?: number;
  tax_rate?: number;
  hsn?: string;
  barcode_no?: string;
  current_stock?: number;
}

interface PurchaseItem {
  itemId: string;
  name: string;
  hsn?: string;
  quantity: number;
  rate: number;
  discount: number;
  discountType: 'percentage' | 'flat';
  taxRate: number;
  amount: number;
}

type BillingMode = 'gst' | 'non-gst';

const STEPS = [
  { key: 'supplier', label: 'Supplier', icon: 'business-outline' },
  { key: 'items', label: 'Items', icon: 'cube-outline' },
  { key: 'review', label: 'Review', icon: 'checkmark-circle-outline' },
];

export default function CreatePurchaseScreen() {
  const navigation = useNavigation<MoreStackNavigationProp>();
  const route = useRoute();
  const { colors, shadows, isDark } = useTheme();
  const { organizationId } = useAuth();

  const purchaseId = (route.params as any)?.purchaseId as string | undefined;
  const isEditing = !!purchaseId;

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);

  const [billingMode, setBillingMode] = useState<BillingMode>('gst');

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [searchSupplier, setSearchSupplier] = useState('');

  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [searchItem, setSearchItem] = useState('');
  const [showItemsModal, setShowItemsModal] = useState(false);

  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [existingPurchaseNumber, setExistingPurchaseNumber] = useState<string | null>(null);

  const hasUnsavedChanges = useMemo(() => {
    if (savedSuccessfully) return false;
    return selectedSupplier !== null || purchaseItems.length > 0 || notes.length > 0;
  }, [selectedSupplier, purchaseItems, notes, savedSuccessfully]);

  useUnsavedChanges({
    hasUnsavedChanges,
    title: 'Discard Purchase?',
    message: 'You have unsaved changes to this purchase. Are you sure you want to discard them?',
    confirmText: 'Discard',
    cancelText: 'Keep Editing',
  });

  useEffect(() => {
    loadData();
  }, [organizationId]);

  const loadData = async () => {
    if (!organizationId) return;

    try {
      const [suppliersRes, itemsRes] = await Promise.all([
        supabase
          .from('suppliers')
          .select('id, name, email, gstin_no, contact_no, address')
          .eq('organization_id', organizationId)
          .order('name'),
        supabase
          .from('items')
          .select('id, name, item_code, category, purchase_price, gst_rate, hsn_code, barcode_no')
          .eq('organization_id', organizationId)
          .order('name'),
      ]);

      if (suppliersRes.data) {
        setSuppliers(suppliersRes.data.map(s => ({
          id: s.id,
          name: s.name,
          email: s.email,
          gstin: s.gstin_no,
          phone: s.contact_no,
          address: s.address,
        })));
      }

      if (itemsRes.data) {
        setAvailableItems(itemsRes.data.map(i => ({
          id: i.id,
          name: i.name,
          item_code: i.item_code,
          category: i.category,
          purchase_price: i.purchase_price,
          tax_rate: i.gst_rate,
          hsn: i.hsn_code,
          barcode_no: i.barcode_no,
        })));
      }

      if (isEditing) {
        await loadExistingPurchase();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const loadExistingPurchase = async () => {
    if (!purchaseId) return;

    const { data, error } = await supabase
      .from('purchases')
      .select('*')
      .eq('id', purchaseId)
      .single();

    if (data) {
      setExistingPurchaseNumber(data.purchase_no);
      setPurchaseDate(data.date?.split('T')[0] || new Date().toISOString().split('T')[0]);
      setNotes(data.notes || '');
      setBillingMode(data.gst_enabled ? 'gst' : 'non-gst');

      const supplier = suppliers.find(s => s.id === data.supplier_id);
      if (supplier) setSelectedSupplier(supplier);

      if (data.items) {
        const items = typeof data.items === 'string' ? JSON.parse(data.items) : data.items;
        setPurchaseItems(items);
      }
    }
  };

  const animateStep = useCallback((direction: 'forward' | 'back') => {
    const toValue = direction === 'forward' ? -SCREEN_WIDTH : SCREEN_WIDTH;

    Animated.parallel([
      Animated.timing(slideAnim, { toValue, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      slideAnim.setValue(direction === 'forward' ? SCREEN_WIDTH : -SCREEN_WIDTH);
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  }, [slideAnim, fadeAnim]);

  const goNext = () => {
    if (step === 0 && !selectedSupplier) {
      Alert.alert('Select Supplier', 'Please select a supplier to continue');
      return;
    }
    if (step === 1 && purchaseItems.length === 0) {
      Alert.alert('Add Items', 'Please add at least one item to continue');
      return;
    }
    if (step < STEPS.length - 1) {
      animateStep('forward');
      setStep(step + 1);
    }
  };

  const goBack = () => {
    if (step > 0) {
      animateStep('back');
      setStep(step - 1);
    } else {
      navigation.goBack();
    }
  };

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchSupplier.toLowerCase()) ||
    s.phone?.includes(searchSupplier) ||
    s.gstin?.toLowerCase().includes(searchSupplier.toLowerCase())
  );

  const filteredItems = availableItems.filter(i =>
    i.name.toLowerCase().includes(searchItem.toLowerCase()) ||
    i.item_code?.toLowerCase().includes(searchItem.toLowerCase()) ||
    i.barcode_no?.includes(searchItem)
  );

  const addItem = (item: Item) => {
    const existing = purchaseItems.find(pi => pi.itemId === item.id);
    if (existing) {
      setPurchaseItems(purchaseItems.map(pi =>
        pi.itemId === item.id ? { ...pi, quantity: pi.quantity + 1 } : pi
      ));
    } else {
      const rate = item.purchase_price || 0;
      const taxRate = billingMode === 'gst' ? (item.tax_rate || 0) : 0;
      const amount = rate * (1 + taxRate / 100);

      setPurchaseItems([...purchaseItems, {
        itemId: item.id,
        name: item.name,
        hsn: item.hsn,
        quantity: 1,
        rate,
        discount: 0,
        discountType: 'percentage',
        taxRate,
        amount,
      }]);
    }
    setShowItemsModal(false);
    setSearchItem('');
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setPurchaseItems(purchaseItems.filter(pi => pi.itemId !== itemId));
    } else {
      setPurchaseItems(purchaseItems.map(pi => {
        if (pi.itemId === itemId) {
          const baseAmount = pi.rate * quantity;
          const discountAmount = pi.discountType === 'percentage'
            ? baseAmount * (pi.discount / 100)
            : pi.discount;
          const afterDiscount = baseAmount - discountAmount;
          const taxAmount = afterDiscount * (pi.taxRate / 100);
          return { ...pi, quantity, amount: afterDiscount + taxAmount };
        }
        return pi;
      }));
    }
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalTax = 0;

    purchaseItems.forEach(item => {
      const baseAmount = item.rate * item.quantity;
      const discountAmount = item.discountType === 'percentage'
        ? baseAmount * (item.discount / 100)
        : item.discount;
      const afterDiscount = baseAmount - discountAmount;
      const taxAmount = afterDiscount * (item.taxRate / 100);

      subtotal += afterDiscount;
      totalTax += taxAmount;
    });

    return {
      subtotal,
      cgst: totalTax / 2,
      sgst: totalTax / 2,
      total: subtotal + totalTax,
    };
  };

  const totals = calculateTotals();

  const generatePurchaseNumber = async () => {
    const { count } = await supabase
      .from('purchases')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    const nextNum = (count || 0) + 1;
    return `PUR-${nextNum.toString().padStart(5, '0')}`;
  };

  const savePurchase = async (status: 'unpaid' | 'paid') => {
    if (!selectedSupplier || !organizationId) return;

    setLoading(true);
    try {
      const purchaseNo = existingPurchaseNumber || await generatePurchaseNumber();

      const purchaseData = {
        organization_id: organizationId,
        purchase_no: purchaseNo,
        supplier_id: selectedSupplier.id,
        supplier_name: selectedSupplier.name,
        supplier_phone: selectedSupplier.phone,
        supplier_address: selectedSupplier.address,
        supplier_gst: selectedSupplier.gstin,
        date: purchaseDate,
        items: purchaseItems,
        subtotal: totals.subtotal,
        discount: 0,
        discount_type: 'percentage',
        cgst: totals.cgst,
        sgst: totals.sgst,
        igst: 0,
        total: totals.total,
        paid_amount: status === 'paid' ? totals.total : 0,
        balance: status === 'paid' ? 0 : totals.total,
        status,
        gst_enabled: billingMode === 'gst',
        notes,
      };

      if (isEditing) {
        await supabase.from('purchases').update(purchaseData).eq('id', purchaseId);
      } else {
        await supabase.from('purchases').insert(purchaseData);
      }

      setSavedSuccessfully(true);
      Alert.alert('Success', `Purchase ${isEditing ? 'updated' : 'created'} successfully`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error saving purchase:', error);
      Alert.alert('Error', 'Failed to save purchase');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <Loading text="Loading..." />;
  }

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {STEPS.map((s, index) => (
        <React.Fragment key={s.key}>
          <TouchableOpacity
            style={[
              styles.stepDot,
              { backgroundColor: index <= step ? colors.primary : colors.border },
            ]}
            onPress={() => index < step && setStep(index)}
            disabled={index >= step}
          >
            <Ionicons
              name={s.icon as any}
              size={16}
              color={index <= step ? '#fff' : colors.textSecondary}
            />
          </TouchableOpacity>
          {index < STEPS.length - 1 && (
            <View style={[styles.stepLine, { backgroundColor: index < step ? colors.primary : colors.border }]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );

  const renderSupplierStep = () => (
    <Animated.View style={[styles.stepContent, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Select Supplier</Text>

      <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search suppliers..."
          placeholderTextColor={colors.textSecondary}
          value={searchSupplier}
          onChangeText={setSearchSupplier}
        />
      </View>

      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeButton, billingMode === 'gst' && { backgroundColor: colors.primary }]}
          onPress={() => setBillingMode('gst')}
        >
          <Text style={[styles.modeText, { color: billingMode === 'gst' ? '#fff' : colors.text }]}>GST</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, billingMode === 'non-gst' && { backgroundColor: colors.primary }]}
          onPress={() => setBillingMode('non-gst')}
        >
          <Text style={[styles.modeText, { color: billingMode === 'non-gst' ? '#fff' : colors.text }]}>Non-GST</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredSuppliers}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.supplierCard,
              { backgroundColor: colors.card, borderColor: selectedSupplier?.id === item.id ? colors.primary : colors.border },
            ]}
            onPress={() => setSelectedSupplier(item)}
          >
            <View style={styles.supplierInfo}>
              <Text style={[styles.supplierName, { color: colors.text }]}>{item.name}</Text>
              {item.phone && <Text style={[styles.supplierDetail, { color: colors.textSecondary }]}>{item.phone}</Text>}
              {item.gstin && <Text style={[styles.supplierDetail, { color: colors.textSecondary }]}>GSTIN: {item.gstin}</Text>}
            </View>
            {selectedSupplier?.id === item.id && (
              <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
            )}
          </TouchableOpacity>
        )}
        style={styles.list}
        contentContainerStyle={styles.listContent}
      />
    </Animated.View>
  );

  const renderItemsStep = () => (
    <Animated.View style={[styles.stepContent, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
      <View style={styles.itemsHeader}>
        <Text style={[styles.stepTitle, { color: colors.text }]}>Add Items</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowItemsModal(true)}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add Item</Text>
        </TouchableOpacity>
      </View>

      {purchaseItems.length === 0 ? (
        <View style={styles.emptyItems}>
          <Ionicons name="cube-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No items added yet</Text>
        </View>
      ) : (
        <FlatList
          data={purchaseItems}
          keyExtractor={item => item.itemId}
          renderItem={({ item }) => (
            <View style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.itemRate, { color: colors.textSecondary }]}>
                  {formatCurrency(item.rate)} × {item.quantity} = {formatCurrency(item.amount)}
                </Text>
              </View>
              <View style={styles.quantityControls}>
                <TouchableOpacity
                  style={[styles.qtyButton, { backgroundColor: colors.border }]}
                  onPress={() => updateItemQuantity(item.itemId, item.quantity - 1)}
                >
                  <Ionicons name="remove" size={16} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.qtyText, { color: colors.text }]}>{item.quantity}</Text>
                <TouchableOpacity
                  style={[styles.qtyButton, { backgroundColor: colors.primary }]}
                  onPress={() => updateItemQuantity(item.itemId, item.quantity + 1)}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          style={styles.list}
        />
      )}

      <Modal visible={showItemsModal} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Item</Text>
              <TouchableOpacity onPress={() => setShowItemsModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="search" size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search items..."
                placeholderTextColor={colors.textSecondary}
                value={searchItem}
                onChangeText={setSearchItem}
              />
            </View>
            <FlatList
              data={filteredItems}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.selectableItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => addItem(item)}
                >
                  <View>
                    <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.itemCode, { color: colors.textSecondary }]}>{item.item_code}</Text>
                  </View>
                  <Text style={[styles.itemPrice, { color: colors.primary }]}>
                    {formatCurrency(item.purchase_price || 0)}
                  </Text>
                </TouchableOpacity>
              )}
              style={styles.modalList}
            />
          </View>
        </View>
      </Modal>
    </Animated.View>
  );

  const renderReviewStep = () => (
    <Animated.View style={[styles.stepContent, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.stepTitle, { color: colors.text }]}>Review Purchase</Text>

        <View style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Supplier</Text>
          <Text style={[styles.reviewValue, { color: colors.text }]}>{selectedSupplier?.name}</Text>
          {selectedSupplier?.gstin && (
            <Text style={[styles.reviewSubValue, { color: colors.textSecondary }]}>GSTIN: {selectedSupplier.gstin}</Text>
          )}
        </View>

        <View style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Items ({purchaseItems.length})</Text>
          {purchaseItems.map(item => (
            <View key={item.itemId} style={styles.reviewItem}>
              <Text style={[styles.reviewItemName, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.reviewItemAmount, { color: colors.text }]}>
                {item.quantity} × {formatCurrency(item.rate)} = {formatCurrency(item.amount)}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Subtotal</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>{formatCurrency(totals.subtotal)}</Text>
          </View>
          {billingMode === 'gst' && (
            <>
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>CGST</Text>
                <Text style={[styles.totalValue, { color: colors.text }]}>{formatCurrency(totals.cgst)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>SGST</Text>
                <Text style={[styles.totalValue, { color: colors.text }]}>{formatCurrency(totals.sgst)}</Text>
              </View>
            </>
          )}
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={[styles.grandTotalLabel, { color: colors.text }]}>Total</Text>
            <Text style={[styles.grandTotalValue, { color: colors.primary }]}>{formatCurrency(totals.total)}</Text>
          </View>
        </View>

        <View style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Notes</Text>
          <TextInput
            style={[styles.notesInput, { color: colors.text, borderColor: colors.border }]}
            placeholder="Add notes..."
            placeholderTextColor={colors.textSecondary}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => savePurchase('unpaid')}
            disabled={loading}
          >
            <Ionicons name="save-outline" size={20} color={colors.text} />
            <Text style={[styles.actionButtonText, { color: colors.text }]}>Save as Unpaid</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => savePurchase('paid')}
            disabled={loading}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            <Text style={[styles.actionButtonText, { color: '#fff' }]}>Save as Paid</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Animated.View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient colors={['#4F46E5', '#6366F1']} style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{isEditing ? 'Edit Purchase' : 'New Purchase'}</Text>
          <Text style={styles.headerSubtitle}>{STEPS[step].label}</Text>
        </View>
        <View style={styles.headerRight} />
      </LinearGradient>

      {renderStepIndicator()}

      <View style={styles.content}>
        {step === 0 && renderSupplierStep()}
        {step === 1 && renderItemsStep()}
        {step === 2 && renderReviewStep()}
      </View>

      {step < STEPS.length - 1 && (
        <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.footerButton, { backgroundColor: colors.primary }]}
            onPress={goNext}
          >
            <Text style={styles.footerButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <Loading text="Saving..." />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 40 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  headerRight: { width: 40 },
  stepIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  stepDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  stepLine: { width: 40, height: 2 },
  content: { flex: 1 },
  stepContent: { flex: 1, paddingHorizontal: 20 },
  stepTitle: { fontSize: 24, fontWeight: '700', marginBottom: 20 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16 },
  modeToggle: { flexDirection: 'row', marginBottom: 16 },
  modeButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8, marginHorizontal: 4 },
  modeText: { fontSize: 16, fontWeight: '600' },
  list: { flex: 1 },
  listContent: { paddingBottom: 20 },
  supplierCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  supplierInfo: { flex: 1 },
  supplierName: { fontSize: 16, fontWeight: '600' },
  supplierDetail: { fontSize: 14, marginTop: 2 },
  itemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  addButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  addButtonText: { color: '#fff', fontWeight: '600', marginLeft: 4 },
  emptyItems: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 16, marginTop: 12 },
  itemCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '600' },
  itemRate: { fontSize: 14, marginTop: 4 },
  quantityControls: { flexDirection: 'row', alignItems: 'center' },
  qtyButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 16, fontWeight: '600', marginHorizontal: 12 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { height: '80%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalList: { flex: 1 },
  selectableItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  itemCode: { fontSize: 14, marginTop: 2 },
  itemPrice: { fontSize: 16, fontWeight: '600' },
  reviewCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  reviewLabel: { fontSize: 14, marginBottom: 8 },
  reviewValue: { fontSize: 18, fontWeight: '600' },
  reviewSubValue: { fontSize: 14, marginTop: 4 },
  reviewItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.1)' },
  reviewItemName: { fontSize: 14, flex: 1 },
  reviewItemAmount: { fontSize: 14, fontWeight: '500' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  totalLabel: { fontSize: 14 },
  totalValue: { fontSize: 14, fontWeight: '500' },
  grandTotal: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.1)', marginTop: 8, paddingTop: 12 },
  grandTotalLabel: { fontSize: 18, fontWeight: '700' },
  grandTotalValue: { fontSize: 20, fontWeight: '700' },
  notesInput: { borderWidth: 1, borderRadius: 8, padding: 12, minHeight: 80, textAlignVertical: 'top' },
  actionButtons: { flexDirection: 'row', gap: 12, marginTop: 20, marginBottom: 40 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, borderWidth: 1 },
  actionButtonText: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
  footer: { padding: 20, borderTopWidth: 1 },
  footerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12 },
  footerButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', marginRight: 8 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
});
