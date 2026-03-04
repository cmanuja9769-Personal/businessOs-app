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
  StatusBar,
  FlatList,
  Modal,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { InvoiceStackNavigationProp } from '@navigation/types';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import Loading from '@components/ui/Loading';
import { useUnsavedChanges } from '@hooks/useUnsavedChanges';
import { supabase } from '@lib/supabase';
import { calculateInvoiceTotals, IInvoiceItem } from '@lib/invoice-calculations';
import { formatCurrency } from '@lib/utils';
import {
  DocumentType,
  DOCUMENT_TYPES,
  STEPS,
  PricingMode,
  BillingMode,
  PackingType,
  Customer,
  Item,
  CreateInvoiceRouteParams,
  InvoiceRow,
  InvoiceItemRow,
  getItemPrice as getItemPriceUtil,
  getErrorMessage,
  getPricingModeLabel,
} from './invoice-types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const parseJsonItems = (str: string): IInvoiceItem[] => {
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? (parsed as IInvoiceItem[]) : [];
  } catch {
    return [];
  }
};

const extractNestedItems = (raw: object): IInvoiceItem[] => {
  if (!('items' in raw)) return [];
  const items = (raw as { items?: unknown }).items;
  return Array.isArray(items) ? (items as IInvoiceItem[]) : [];
};

const normalizeItems = (raw: unknown): IInvoiceItem[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as IInvoiceItem[];
  if (typeof raw === 'string') return parseJsonItems(raw);
  if (typeof raw === 'object' && raw !== null) return extractNestedItems(raw);
  return [];
};

const computePackingQuantityForItem = (
  invoiceItem: IInvoiceItem,
  itemMap: Map<string, Item>,
  currentPackingType: PackingType,
  looseCacheMap: Record<string, number>,
  cacheUpdates: Record<string, number>
): IInvoiceItem => {
  if (!invoiceItem.itemId) return invoiceItem;

  const selectedItem = itemMap.get(invoiceItem.itemId);
  if (!selectedItem) return invoiceItem;

  let newQuantity = invoiceItem.quantity;

  if (currentPackingType === 'carton') {
    const perCartonQty = Math.floor(selectedItem.per_carton_quantity || 1);
    cacheUpdates[invoiceItem.itemId] = Math.floor(invoiceItem.quantity);
    newQuantity = perCartonQty;
  } else {
    const cached = looseCacheMap[invoiceItem.itemId];
    if (cached) {
      newQuantity = cached;
    }
  }

  return {
    ...invoiceItem,
    quantity: newQuantity,
    amount: newQuantity * invoiceItem.rate,
  };
};

const getQuantityForPackingType = (item: Item, currentPackingType: PackingType): number =>
  currentPackingType === 'carton' ? Math.floor(item.per_carton_quantity || 1) : 1;

const buildNewInvoiceItem = (
  item: Item,
  quantity: number,
  price: number,
  gstRate: number
): IInvoiceItem => ({
  itemId: item.id,
  itemName: item.name,
  quantity,
  unit: 'pcs',
  rate: price,
  gstRate,
  cessRate: 0,
  discount: 0,
  amount: price * quantity,
  hsnCode: item.hsn,
});

const mapInvoiceRowToCustomer = (invoice: InvoiceRow): Customer | null => {
  if (!invoice.customer_id) return null;
  return {
    id: invoice.customer_id,
    name: invoice.customer_name ?? 'Customer',
    email: invoice.customer_email ?? undefined,
    gstin: invoice.customer_gst ?? undefined,
    phone: invoice.customer_phone ?? undefined,
  };
};

const mapInvoiceItemsFromDb = (itemsData: InvoiceItemRow[]): IInvoiceItem[] =>
  itemsData.map((item) => ({
    itemId: item.item_id || '',
    itemName: item.item_name || 'Item',
    quantity: item.quantity || 1,
    unit: item.unit || 'pcs',
    rate: item.rate || 0,
    amount: item.amount || 0,
    gstRate: item.gst_rate || item.tax_rate || 0,
    cessRate: item.cess_rate || 0,
    discount: item.discount || 0,
    hsnCode: item.hsn || '',
  }));

const resolveBillingMode = (invoice: InvoiceRow): BillingMode => {
  if (invoice.billing_mode) return invoice.billing_mode;
  return invoice.gst_enabled === false ? 'non-gst' : 'gst';
};

const INVOICE_NUMBER_PREFIXES: Record<string, string> = {
  invoice: 'INV',
  sales_order: 'SO',
  quotation: 'QUO',
  proforma: 'PRO',
  delivery_challan: 'DC',
  credit_note: 'CN',
  debit_note: 'DN',
};

const generateInvoiceNumber = async (
  organizationId: string,
  documentType: DocumentType,
  existingNumber: string | null
): Promise<string> => {
  if (existingNumber) return existingNumber;

  const year = new Date().getFullYear();
  const prefix = INVOICE_NUMBER_PREFIXES[documentType] || 'INV';

  const { count } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .like('invoice_number', `${prefix}/${year}/%`);

  return `${prefix}/${year}/${((count || 0) + 1).toString().padStart(4, '0')}`;
};

const buildBaseInvoiceData = (params: {
  organizationId: string;
  documentType: DocumentType;
  pricingMode: PricingMode;
  billingMode: BillingMode;
  customer: Customer;
  invoiceDate: string;
  totals: ReturnType<typeof calculateInvoiceTotals>;
  notes: string;
}): Record<string, unknown> => ({
  organization_id: params.organizationId,
  document_type: params.documentType,
  pricing_mode: params.pricingMode,
  billing_mode: params.billingMode,
  gst_enabled: params.billingMode === 'gst',
  customer_id: params.customer.id,
  customer_name: params.customer.name,
  customer_phone: params.customer.phone || null,
  customer_address: params.customer.address || null,
  customer_gst: params.customer.gstin || null,
  customer_email: params.customer.email || null,
  invoice_date: params.invoiceDate,
  subtotal: params.totals.subtotal,
  cgst: params.billingMode === 'gst' ? params.totals.cgst : 0,
  sgst: params.billingMode === 'gst' ? params.totals.sgst : 0,
  igst: params.billingMode === 'gst' ? params.totals.igst : 0,
  discount: params.totals.discount,
  total: params.totals.total,
  paid_amount: 0,
  balance: params.totals.total,
  status: 'unpaid',
  notes: params.notes || null,
});

const buildItemsPayload = (invoiceId: string, items: IInvoiceItem[]): Record<string, unknown>[] =>
  items.map((item) => ({
    invoice_id: invoiceId,
    item_id: item.itemId || null,
    item_name: item.itemName || 'Item',
    hsn: item.hsnCode || null,
    quantity: item.quantity || 1,
    unit: item.unit || 'pcs',
    rate: item.rate || 0,
    discount: item.discount || 0,
    discount_type: 'percentage',
    tax_rate: item.gstRate || 0,
    amount: (item.quantity || 1) * (item.rate || 0),
  }));

const updateExistingInvoice = async (
  organizationId: string,
  invoiceId: string,
  baseData: ReturnType<typeof buildBaseInvoiceData>,
  invoiceNumber: string,
  items: IInvoiceItem[]
) => {
  const { error } = await supabase
    .from('invoices')
    .update({ ...baseData, invoice_number: invoiceNumber })
    .eq('organization_id', organizationId)
    .eq('id', invoiceId);

  if (error) throw error;

  await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId);

  if (items.length > 0) {
    await supabase.from('invoice_items').insert(buildItemsPayload(invoiceId, items));
  }
};

const createNewInvoice = async (
  baseData: ReturnType<typeof buildBaseInvoiceData>,
  invoiceNumber: string,
  items: IInvoiceItem[]
) => {
  const { data: newInvoice, error } = await supabase
    .from('invoices')
    .insert({ ...baseData, invoice_number: invoiceNumber })
    .select()
    .single();

  if (error) throw error;

  if (newInvoice && items.length > 0) {
    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(buildItemsPayload(newInvoice.id, items));

    if (itemsError) {
      console.error('Failed to save invoice items:', itemsError);
    }
  }
};

function computeHasUnsavedChanges(
  savedSuccessfully: boolean,
  selectedCustomer: Customer | null,
  invoiceItems: IInvoiceItem[],
  notes: string
): boolean {
  if (savedSuccessfully) return false;
  return selectedCustomer !== null || invoiceItems.length > 0 || notes.length > 0;
}

function getProgressLabelColor(
  colors: { primary: string; success: string; textTertiary: string },
  isActive: boolean,
  isCompleted: boolean
): string {
  if (isActive) return colors.primary;
  if (isCompleted) return colors.success;
  return colors.textTertiary;
}

function getNextButtonText(step: number): string {
  if (step === 0) return 'Continue';
  if (step === 2) return 'Review';
  return 'Next';
}

function getStepValidationError(
  step: number,
  hasCustomer: boolean,
  itemCount: number
): string | null {
  if (step === 1 && !hasCustomer) return 'Please select a customer';
  if (step === 2 && itemCount === 0) return 'Please add at least one item';
  return null;
}

export default function CreateInvoiceScreen() {
  const navigation = useNavigation<InvoiceStackNavigationProp>();
  const route = useRoute<RouteProp<Record<string, CreateInvoiceRouteParams | undefined>, string>>();
  const { colors, shadows, isDark } = useTheme();
  const { organizationId } = useAuth();

  const invoiceId = route.params?.invoiceId;
  const isEditing = !!invoiceId;
  const preselectedCustomerId = route.params?.customerId;

  // Animation refs
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // State
  const [step, setStep] = useState(isEditing ? 1 : 0); // 0: Type, 1: Customer, 2: Items, 3: Review
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);
  
  // Document type
  const [documentType, setDocumentType] = useState<DocumentType>('invoice');
  
  // Pricing & Billing mode
  const [pricingMode, setPricingMode] = useState<PricingMode>('sale');
  const [billingMode, setBillingMode] = useState<BillingMode>('gst');
  const [packingType, setPackingType] = useState<PackingType>('loose');
  
  // Quantity cache for packing type switching
  const [looseQuantityCache, setLooseQuantityCache] = useState<Record<string, number>>({});
  
  // Customer selection
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchCustomer, setSearchCustomer] = useState('');
  
  // Items
  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<IInvoiceItem[]>([]);
  const [searchItem, setSearchItem] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showItemsModal, setShowItemsModal] = useState(false);
  
  // Invoice details
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [existingInvoiceNumber, setExistingInvoiceNumber] = useState<string | null>(null);

  const docConfig = DOCUMENT_TYPES[documentType];

  const hasUnsavedChanges = useMemo(
    () => computeHasUnsavedChanges(savedSuccessfully, selectedCustomer, invoiceItems, notes),
    [selectedCustomer, invoiceItems, notes, savedSuccessfully]
  );

  useUnsavedChanges({
    hasUnsavedChanges,
    title: 'Discard Invoice?',
    message: `You have unsaved changes to this ${docConfig.label.toLowerCase()}. Are you sure you want to discard them?`,
    confirmText: 'Discard',
    cancelText: 'Keep Editing',
  });

  const animateStep = useCallback((direction: 'forward' | 'back') => {
    const toValue = direction === 'forward' ? -SCREEN_WIDTH : SCREEN_WIDTH;
    
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      slideAnim.setValue(direction === 'forward' ? SCREEN_WIDTH : -SCREEN_WIDTH);
      
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [slideAnim, fadeAnim]);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        if (!organizationId) {
          setCustomers([]);
          return;
        }
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('organization_id', organizationId)
          .is('deleted_at', null)
          .order('name');

        if (!error && data) {
          setCustomers(data);
        }
      } catch (error) {
        console.error('Error fetching customers:', error);
      }
    };

    const fetchItems = async () => {
      try {
        if (!organizationId) {
          setAvailableItems([]);
          return;
        }
        const { count, error: countError } = await supabase
          .from('items')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .is('deleted_at', null);

        if (countError) {
          console.error('[ITEMS] Count error:', countError);
          return;
        }

        if (!count || count === 0) {
          setAvailableItems([]);
          return;
        }

        const PAGE_SIZE = 1000;
        const totalPages = Math.ceil(count / PAGE_SIZE);
        const allItems: Item[] = [];

        for (let page = 0; page < totalPages; page++) {
          const from = page * PAGE_SIZE;
          const to = from + PAGE_SIZE - 1;

          const { data, error } = await supabase
            .from('items')
            .select('*')
            .eq('organization_id', organizationId)
            .is('deleted_at', null)
            .order('name')
            .range(from, to);

          if (error) {
            console.error('[ITEMS] Batch error:', error);
            break;
          }

          if (data) {
            allItems.push(...data);
          }
        }

        setAvailableItems(allItems);
      } catch (error) {
        console.error('[ITEMS] Fetch error:', error);
      }
    };

    fetchCustomers();
    fetchItems();
  }, [organizationId]);

  const availableItemsRef = useRef(availableItems);
  availableItemsRef.current = availableItems;

  const looseQuantityCacheRef = useRef(looseQuantityCache);
  looseQuantityCacheRef.current = looseQuantityCache;

  useEffect(() => {
    const cacheUpdates: Record<string, number> = {};
    const currentItems = availableItemsRef.current;
    const itemMap = new Map(currentItems.map(i => [i.id, i]));

    setInvoiceItems(prevItems => {
      if (prevItems.length === 0) return prevItems;
      return prevItems.map((invoiceItem) =>
        computePackingQuantityForItem(invoiceItem, itemMap, packingType, looseQuantityCacheRef.current, cacheUpdates)
      );
    });

    if (Object.keys(cacheUpdates).length > 0) {
      setLooseQuantityCache(prev => ({ ...prev, ...cacheUpdates }));
    }
  }, [packingType]);

  useEffect(() => {
    const title = isEditing 
      ? `Edit ${DOCUMENT_TYPES[documentType].label}`
      : `New ${DOCUMENT_TYPES[documentType].label}`;
    navigation.setOptions({ title });
  }, [navigation, isEditing, documentType]);

  useEffect(() => {
    if (!isEditing) return;
    if (!organizationId) return;

    const fetchInvoiceForEdit = async () => {
      try {
        if (!invoiceId) return;
        setInitialLoading(true);

        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('id', invoiceId)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          Alert.alert('Error', 'Invoice not found');
          navigation.goBack();
          return;
        }

        const invoice = data as InvoiceRow;

        setDocumentType(invoice.document_type || 'invoice');
        setExistingInvoiceNumber(invoice.invoice_number ?? null);
        setInvoiceDate(invoice.invoice_date ?? new Date().toISOString().split('T')[0]);
        setNotes(invoice.notes ?? '');
        setPricingMode(invoice.pricing_mode || 'sale');
        setBillingMode(resolveBillingMode(invoice));

        const customerFromInvoice = mapInvoiceRowToCustomer(invoice);
        if (customerFromInvoice) {
          setSelectedCustomer(customerFromInvoice);
        }

        const { data: itemsData, error: itemsError } = await supabase
          .from('invoice_items')
          .select('*')
          .eq('invoice_id', invoiceId);

        const mappedItems = (!itemsError && itemsData?.length)
          ? mapInvoiceItemsFromDb(itemsData as InvoiceItemRow[])
          : normalizeItems(invoice.items);
        setInvoiceItems(mappedItems);
        
        setStep(2);
      } catch (error: unknown) {
        console.error('[CREATE_INVOICE] fetchInvoiceForEdit error:', error);
        Alert.alert('Error', getErrorMessage(error, 'Failed to load invoice'));
        navigation.goBack();
      } finally {
        setInitialLoading(false);
      }
    };

    fetchInvoiceForEdit();
  }, [isEditing, organizationId, invoiceId, navigation]);

  useEffect(() => {
    if (!preselectedCustomerId) return;
    if (isEditing) return;
    if (customers.length === 0) return;
    const found = customers.find((c) => c.id === preselectedCustomerId);
    if (found) {
      setSelectedCustomer(found);
      setStep(2);
    }
  }, [preselectedCustomerId, customers, isEditing]);

  const getItemPrice = (item: Item): number => getItemPriceUtil(item, pricingMode);

  const addItem = (item: Item) => {
    const price = getItemPrice(item);
    const gstRate = billingMode === 'gst' ? (item.tax_rate ?? 0) : 0;
    const quantityStep = getQuantityForPackingType(item, packingType);
    const existingIndex = invoiceItems.findIndex(i => i.itemId === item.id);

    if (existingIndex >= 0) {
      const updated = [...invoiceItems];
      updated[existingIndex].quantity += quantityStep;
      updated[existingIndex].amount = updated[existingIndex].quantity * updated[existingIndex].rate;

      if (packingType === 'loose') {
        setLooseQuantityCache(prev => ({ ...prev, [item.id]: updated[existingIndex].quantity }));
      }
      setInvoiceItems(updated);
      return;
    }

    if (packingType === 'loose') {
      setLooseQuantityCache(prev => ({ ...prev, [item.id]: quantityStep }));
    }
    setInvoiceItems([...invoiceItems, buildNewInvoiceItem(item, quantityStep, price, gstRate)]);
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    // Ensure quantity is always an integer
    const intQuantity = Math.floor(Math.max(0, quantity));
    
    if (intQuantity <= 0) {
      removeItem(index);
      return;
    }
    
    const updated = [...invoiceItems];
    updated[index].quantity = intQuantity;
    updated[index].amount = intQuantity * updated[index].rate;
    
    // Update cache if in loose mode
    if (packingType === 'loose' && updated[index].itemId) {
      setLooseQuantityCache(prev => ({
        ...prev,
        [updated[index].itemId]: intQuantity
      }));
    }
    
    setInvoiceItems(updated);
  };

  const removeItem = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  // Handle barcode scan / item code search
  const handleBarcodeSubmit = () => {
    if (!barcodeInput.trim()) return;
    
    const foundItem = availableItems.find(
      (i) => i.barcode_no === barcodeInput.trim() || i.item_code === barcodeInput.trim()
    );
    
    if (foundItem) {
      addItem(foundItem);
      setBarcodeInput('');
    } else {
      Alert.alert('Not Found', `No item found with code: ${barcodeInput}`);
    }
  };

  const handleSaveInvoice = async () => {
    if (!organizationId) {
      Alert.alert('Error', 'No organization selected.');
      return;
    }
    if (!selectedCustomer) {
      Alert.alert('Error', 'Please select a customer');
      return;
    }
    if (invoiceItems.length === 0) {
      Alert.alert('Error', 'Please add at least one item');
      return;
    }

    const actionLabel = isEditing ? 'updated' : 'created';
    setLoading(true);

    try {
      const totals = calculateInvoiceTotals(invoiceItems, billingMode, false);
      const invoice_number = await generateInvoiceNumber(organizationId, documentType, existingInvoiceNumber);
      const baseData = buildBaseInvoiceData({
        organizationId, documentType, pricingMode, billingMode,
        customer: selectedCustomer, invoiceDate, totals, notes,
      });

      if (isEditing) {
        await updateExistingInvoice(organizationId, invoiceId!, baseData, invoice_number, invoiceItems);
      } else {
        await createNewInvoice(baseData, invoice_number, invoiceItems);
      }

      setSavedSuccessfully(true);
      Alert.alert('Success', `${docConfig.label} ${actionLabel}!`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: unknown) {
      Alert.alert('Error', getErrorMessage(error, 'Failed to save'));
    } finally {
      setLoading(false);
    }
  };

  const minStep = isEditing ? 1 : 0;

  const goToNextStep = () => {
    const validationError = getStepValidationError(step, !!selectedCustomer, invoiceItems.length);
    if (validationError) {
      Alert.alert('Required', validationError);
      return;
    }
    
    animateStep('forward');
    setTimeout(() => setStep(step + 1), 200);
  };

  const goToPrevStep = () => {
    if (step <= minStep) return;
    animateStep('back');
    setTimeout(() => setStep(step - 1), 200);
  };

  const getStepSizeForItem = (itemId?: string) => {
    if (packingType !== 'carton') return 1;
    const perCarton = Math.floor(availableItems.find((item) => item.id === itemId)?.per_carton_quantity || 1);
    return Math.max(1, perCarton);
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchCustomer.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(searchCustomer.toLowerCase())
  );

  const filteredItems = availableItems.filter(i => {
    const searchLower = searchItem.toLowerCase();
    return (
      i.name.toLowerCase().includes(searchLower) ||
      (i.item_code || '').toLowerCase().includes(searchLower) ||
      (i.barcode_no || '').toLowerCase().includes(searchLower) ||
      (i.category || '').toLowerCase().includes(searchLower)
    );
  });

  const totals = invoiceItems.length > 0 
    ? calculateInvoiceTotals(invoiceItems, 'gst', false)
    : null;

  if (initialLoading) {
    return <Loading fullScreen />;
  }

  const renderItemCard = ({ item }: { item: Item }) => {
    const price = getItemPrice(item);
    const existingItem = invoiceItems.find((i) => i.itemId === item.id);
    const isSelected = !!existingItem;

    return (
      <TouchableOpacity
        style={[styles.itemCard, { backgroundColor: colors.card, ...shadows.sm }]}
        onPress={() => addItem(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemCardContent}>
          <View style={styles.itemCardInfo}>
            <Text style={[styles.itemCardName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.itemCardMeta, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.item_code || item.category || 'No code'}
              {item.current_stock != null && ` • Stock: ${item.current_stock}`}
            </Text>
          </View>
          <View style={styles.itemCardRight}>
            <Text style={[styles.itemCardPrice, { color: colors.primary }]}>
              {formatCurrency(price)}
            </Text>
            {isSelected && (
              <View style={[styles.itemQtyBadge, { backgroundColor: colors.success }]}>
                <Text style={styles.itemQtyBadgeText}>
                  Qty: {existingItem.quantity}
                </Text>
              </View>
            )}
          </View>
          <View style={[styles.addButton, { backgroundColor: isSelected ? colors.successLight : colors.primaryLight }]}>
            <Ionicons
              name={isSelected ? 'checkmark' : 'add'}
              size={18}
              color={isSelected ? colors.success : colors.primary}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDocumentTypeStep = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>What are you creating?</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>Select the type of document</Text>

      <View style={styles.docTypeGrid}>
        {(Object.keys(DOCUMENT_TYPES) as DocumentType[]).map((type) => {
          const config = DOCUMENT_TYPES[type];
          const isSelected = documentType === type;

          return (
            <TouchableOpacity
              key={type}
              style={[
                styles.docTypeCard,
                { backgroundColor: colors.card, ...shadows.sm },
                isSelected && { borderWidth: 2, borderColor: config.gradient[0] },
              ]}
              onPress={() => setDocumentType(type)}
              activeOpacity={0.7}
            >
              <LinearGradient colors={config.gradient} style={styles.docTypeIconContainer}>
                <Ionicons name={config.icon} size={24} color="#FFFFFF" />
              </LinearGradient>
              <Text style={[styles.docTypeLabel, { color: colors.text }]}>{config.label}</Text>
              <Text style={[styles.docTypeDesc, { color: colors.textTertiary }]} numberOfLines={2}>
                {config.description}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );

  const renderCustomerStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Select Customer</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>Who is this {docConfig.label.toLowerCase()} for?</Text>

      <View style={[styles.searchContainer, { backgroundColor: colors.card, ...shadows.sm }]}>
        <Ionicons name="search" size={20} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search customers..."
          placeholderTextColor={colors.textTertiary}
          value={searchCustomer}
          onChangeText={setSearchCustomer}
        />
      </View>

      <ScrollView style={styles.customerList} showsVerticalScrollIndicator={false}>
        {filteredCustomers.map((customer) => (
          <TouchableOpacity
            key={customer.id}
            style={[styles.customerCard, { backgroundColor: colors.card, ...shadows.sm }]}
            onPress={() => setSelectedCustomer(customer)}
            activeOpacity={0.7}
          >
            <View style={styles.customerInfo}>
              <Text style={[styles.customerNameList, { color: colors.text }]}>{customer.name}</Text>
              {customer.email && (
                <Text style={[styles.customerEmailList, { color: colors.textSecondary }]}>{customer.email}</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderPricingModeSection = () => (
    <View style={styles.modeSection}>
      <Text style={[styles.modeSectionTitle, { color: colors.text }]}>
        Pricing Mode <Text style={{ color: colors.error }}>*</Text>
      </Text>
      <View style={styles.modeButtonsRow}>
        <TouchableOpacity
          style={[
            styles.modeButton,
            { backgroundColor: colors.card, ...shadows.sm },
            pricingMode === 'sale' && { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primaryLight }
          ]}
          onPress={() => setPricingMode('sale')}
        >
          <Text style={[
            styles.modeButtonText,
            { color: pricingMode === 'sale' ? colors.primary : colors.text }
          ]}>
            Sale Price (MRP)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.modeButton,
            { backgroundColor: colors.card, ...shadows.sm },
            pricingMode === 'wholesale' && { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primaryLight }
          ]}
          onPress={() => setPricingMode('wholesale')}
        >
          <Text style={[
            styles.modeButtonText,
            { color: pricingMode === 'wholesale' ? colors.primary : colors.text }
          ]}>
            Wholesale
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.modeButton,
            { backgroundColor: colors.card, ...shadows.sm },
            pricingMode === 'quantity' && { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primaryLight }
          ]}
          onPress={() => setPricingMode('quantity')}
        >
          <Text style={[
            styles.modeButtonText,
            { color: pricingMode === 'quantity' ? colors.primary : colors.text }
          ]}>
            Bulk/Quantity
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderBillingModeSection = () => (
    <View style={styles.modeSection}>
      <Text style={[styles.modeSectionTitle, { color: colors.text }]}>
        Billing Mode
      </Text>
      <View style={styles.modeButtonsRow}>
        <TouchableOpacity
          style={[
            styles.modeButton,
            styles.modeButtonWide,
            { backgroundColor: colors.card, ...shadows.sm },
            billingMode === 'gst' && { borderWidth: 2, borderColor: colors.success, backgroundColor: colors.successLight }
          ]}
          onPress={() => setBillingMode('gst')}
        >
          <Ionicons 
            name="receipt-outline" 
            size={16} 
            color={billingMode === 'gst' ? colors.success : colors.textSecondary} 
          />
          <Text style={[
            styles.modeButtonText,
            { color: billingMode === 'gst' ? colors.success : colors.text }
          ]}>
            GST Billing
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.modeButton,
            styles.modeButtonWide,
            { backgroundColor: colors.card, ...shadows.sm },
            billingMode === 'non-gst' && { borderWidth: 2, borderColor: colors.warning, backgroundColor: colors.warningLight }
          ]}
          onPress={() => setBillingMode('non-gst')}
        >
          <Ionicons 
            name="document-outline" 
            size={16} 
            color={billingMode === 'non-gst' ? colors.warning : colors.textSecondary} 
          />
          <Text style={[
            styles.modeButtonText,
            { color: billingMode === 'non-gst' ? colors.warning : colors.text }
          ]}>
            Non-GST
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPackingTypeSection = () => (
    <View style={styles.modeSection}>
      <Text style={[styles.modeSectionTitle, { color: colors.text }]}>
        Packing Type <Text style={{ color: colors.error }}>*</Text>
      </Text>
      <View style={styles.modeButtonsRow}>
        <TouchableOpacity
          style={[
            styles.modeButton,
            styles.modeButtonWide,
            { backgroundColor: colors.card, ...shadows.sm },
            packingType === 'loose' && { borderWidth: 2, borderColor: colors.info, backgroundColor: colors.infoLight }
          ]}
          onPress={() => setPackingType('loose')}
        >
          <Ionicons 
            name="cube-outline" 
            size={16} 
            color={packingType === 'loose' ? colors.info : colors.textSecondary} 
          />
          <Text style={[
            styles.modeButtonText,
            { color: packingType === 'loose' ? colors.info : colors.text }
          ]}>
            Loose Quantity
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.modeButton,
            styles.modeButtonWide,
            { backgroundColor: colors.card, ...shadows.sm },
            packingType === 'carton' && { borderWidth: 2, borderColor: colors.info, backgroundColor: colors.infoLight }
          ]}
          onPress={() => setPackingType('carton')}
        >
          <Ionicons 
            name="apps-outline" 
            size={16} 
            color={packingType === 'carton' ? colors.info : colors.textSecondary} 
          />
          <Text style={[
            styles.modeButtonText,
            { color: packingType === 'carton' ? colors.info : colors.text }
          ]}>
            Pack Cartons
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSelectedItemsSection = () => {
    if (invoiceItems.length === 0) {
      return (
        <View style={[styles.emptyItemsState, { backgroundColor: colors.card, ...shadows.sm }]}>
          <View style={[styles.emptyItemsIconContainer, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="cube-outline" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.emptyItemsTitle, { color: colors.text }]}>No items added yet</Text>
          <Text style={[styles.emptyItemsText, { color: colors.textSecondary }]}>
            Tap &quot;Add Items&quot; above to select products or services
          </Text>
        </View>
      );
    }

    const pluralSuffix = invoiceItems.length > 1 ? 's' : '';

    return (
      <>
        <View style={[styles.selectedItemsSummaryCard, { backgroundColor: colors.primaryLight }]}>
          <View style={styles.summaryCardHeader}>
            <View style={styles.summaryCardLeft}>
              <Ionicons name="cube-outline" size={20} color={colors.primary} />
              <Text style={[styles.summaryCardTitle, { color: colors.primary }]}>
                {invoiceItems.length} item{pluralSuffix} selected
              </Text>
            </View>
            <Text style={[styles.summaryCardTotal, { color: colors.primary }]}>
              {formatCurrency(totals?.total || 0)}
            </Text>
          </View>
        </View>
        <View style={[styles.selectedItemsCard, { backgroundColor: colors.card, ...shadows.sm }]}>
          <Text style={[styles.selectedItemsCardTitle, { color: colors.text }]}>
            Selected Items
          </Text>
          {invoiceItems.map((item, index) => (
            <View 
              key={index} 
              style={[
                styles.selectedItemCardRow,
                index < invoiceItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }
              ]}
            >
              <View style={styles.selectedItemCardInfo}>
                <Text style={[styles.selectedItemCardName, { color: colors.text }]} numberOfLines={1}>
                  {item.itemName}
                </Text>
                <Text style={[styles.selectedItemCardRate, { color: colors.textSecondary }]}>
                  {formatCurrency(item.rate)} × {item.quantity}
                </Text>
              </View>
              <View style={styles.qtyControls}>
                <TouchableOpacity
                  style={[styles.qtyButton, { backgroundColor: colors.errorLight }]}
                  onPress={() => updateItemQuantity(index, item.quantity - getStepSizeForItem(item.itemId))}
                >
                  <Ionicons name="remove" size={16} color={colors.error} />
                </TouchableOpacity>
                <Text style={[styles.qtyText, { color: colors.text }]}>{item.quantity}</Text>
                <TouchableOpacity
                  style={[styles.qtyButton, { backgroundColor: colors.successLight }]}
                  onPress={() => updateItemQuantity(index, item.quantity + getStepSizeForItem(item.itemId))}
                >
                  <Ionicons name="add" size={16} color={colors.success} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.itemAmountText, { color: colors.text }]}>
                {formatCurrency(item.amount)}
              </Text>
            </View>
          ))}
        </View>
      </>
    );
  };

  const renderItemsSelectionModal = () => {
    const emptyMessage = availableItems.length === 0
      ? 'No items in inventory. Add items from the web app first.'
      : 'No items match your search';
    const itemsPlural = invoiceItems.length > 1 ? 's' : '';
    const selectedBadgeText = invoiceItems.length > 0
      ? `${invoiceItems.length} item${itemsPlural} selected • ${formatCurrency(totals?.total || 0)}`
      : '';

    return (
      <Modal
        visible={showItemsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowItemsModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <TouchableOpacity 
              onPress={() => setShowItemsModal(false)}
              style={styles.modalCloseBtn}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.modalTitleContainer}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Items</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                {availableItems.length} items available
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => setShowItemsModal(false)}
              style={[styles.modalDoneBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.modalDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.modalBarcodeContainer, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
            <Ionicons name="barcode-outline" size={20} color={colors.primary} />
            <TextInput
              style={[styles.barcodeInput, { color: colors.text }]}
              placeholder="Scan barcode or enter item code..."
              placeholderTextColor={colors.textTertiary}
              value={barcodeInput}
              onChangeText={setBarcodeInput}
              onSubmitEditing={handleBarcodeSubmit}
              returnKeyType="go"
              autoCapitalize="characters"
            />
            <TouchableOpacity 
              style={[styles.barcodeButton, { backgroundColor: colors.primary }]}
              onPress={handleBarcodeSubmit}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={[styles.modalSearchContainer, { backgroundColor: colors.card, ...shadows.sm }]}>
            <Ionicons name="search" size={20} color={colors.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search items..."
              placeholderTextColor={colors.textTertiary}
              value={searchItem}
              onChangeText={setSearchItem}
              returnKeyType="search"
            />
            {searchItem.length > 0 && (
              <TouchableOpacity onPress={() => setSearchItem('')}>
                <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          {selectedBadgeText.length > 0 && (
            <View style={[styles.modalSelectedBadge, { backgroundColor: colors.successLight }]}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={[styles.modalSelectedBadgeText, { color: colors.success }]}>
                {selectedBadgeText}
              </Text>
            </View>
          )}

          <FlatList
            data={filteredItems}
            renderItem={renderItemCard}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <View style={styles.modalEmptyState}>
                <Ionicons name="cube-outline" size={48} color={colors.textTertiary} />
                <Text style={[styles.modalEmptyStateText, { color: colors.textSecondary }]}>
                  {emptyMessage}
                </Text>
              </View>
            }
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={styles.modalItemsList}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          />
        </View>
      </Modal>
    );
  };

  const renderItemsStep = () => {
    const addButtonLabel = invoiceItems.length > 0 ? 'Add More Items' : 'Add Items';

    return (
      <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.stepTitle, { color: colors.text }]}>
          Add Items
        </Text>
        <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
          Select products or services for your {docConfig.label.toLowerCase()}
        </Text>

        {renderPricingModeSection()}
        {renderBillingModeSection()}
        {renderPackingTypeSection()}

        <TouchableOpacity
          style={[styles.addItemsButton, { backgroundColor: colors.primary, ...shadows.md }]}
          onPress={() => setShowItemsModal(true)}
        >
          <Ionicons name="add-circle-outline" size={24} color="#FFFFFF" />
          <Text style={styles.addItemsButtonText}>
            {addButtonLabel}
          </Text>
          <View style={styles.addItemsButtonBadge}>
            <Text style={styles.addItemsButtonBadgeText}>{availableItems.length}</Text>
          </View>
        </TouchableOpacity>

        {renderSelectedItemsSection()}
        {renderItemsSelectionModal()}
      </ScrollView>
    );
  };

  const renderReviewStep = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Review & Create
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Confirm your {docConfig.label.toLowerCase()} details
      </Text>
      
      {/* Document Type Card */}
      <LinearGradient
        colors={docConfig.gradient}
        style={styles.reviewDocTypeCard}
      >
        <View style={styles.reviewDocTypeIcon}>
          <Ionicons name={docConfig.icon} size={24} color={docConfig.gradient[0]} />
        </View>
        <Text style={styles.reviewDocTypeLabel}>{docConfig.label}</Text>
      </LinearGradient>

      {/* Pricing & Billing Mode */}
      <View style={styles.reviewModeRow}>
        <View style={[styles.reviewModeBadge, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="pricetag-outline" size={14} color={colors.primary} />
          <Text style={[styles.reviewModeText, { color: colors.primary }]}>
            {getPricingModeLabel(pricingMode)}
          </Text>
        </View>
        <View style={[styles.reviewModeBadge, { backgroundColor: billingMode === 'gst' ? colors.successLight : colors.warningLight }]}>
          <Ionicons name="receipt-outline" size={14} color={billingMode === 'gst' ? colors.success : colors.warning} />
          <Text style={[styles.reviewModeText, { color: billingMode === 'gst' ? colors.success : colors.warning }]}>
            {billingMode === 'gst' ? 'GST Billing' : 'Non-GST Billing'}
          </Text>
        </View>
      </View>
      
      {/* Customer Card */}
      <View style={[styles.reviewCard, { backgroundColor: colors.card, ...shadows.sm }]}>
        <View style={styles.reviewCardHeader}>
          <Ionicons name="person-outline" size={18} color={colors.primary} />
          <Text style={[styles.reviewCardTitle, { color: colors.text }]}>Customer</Text>
        </View>
        <Text style={[styles.reviewCustomerName, { color: colors.text }]}>
          {selectedCustomer?.name}
        </Text>
        {selectedCustomer?.email && (
          <Text style={[styles.reviewCustomerEmail, { color: colors.textSecondary }]}>
            {selectedCustomer.email}
          </Text>
        )}
        {selectedCustomer?.gstin && (
          <View style={[styles.gstinBadge, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.gstinText, { color: colors.primary }]}>
              GSTIN: {selectedCustomer.gstin}
            </Text>
          </View>
        )}
      </View>
      
      {/* Items Card */}
      <View style={[styles.reviewCard, { backgroundColor: colors.card, ...shadows.sm }]}>
        <View style={styles.reviewCardHeader}>
          <Ionicons name="cube-outline" size={18} color={colors.primary} />
          <Text style={[styles.reviewCardTitle, { color: colors.text }]}>
            Items ({invoiceItems.length})
          </Text>
        </View>
        {invoiceItems.map((item, index) => (
          <View 
            key={index} 
            style={[
              styles.reviewItemRow,
              index < invoiceItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }
            ]}
          >
            <View style={styles.reviewItemInfo}>
              <Text style={[styles.reviewItemName, { color: colors.text }]}>{item.itemName}</Text>
              <Text style={[styles.reviewItemMeta, { color: colors.textSecondary }]}>
                {item.quantity} × {formatCurrency(item.rate)}
              </Text>
            </View>
            <Text style={[styles.reviewItemAmount, { color: colors.text }]}>
              {formatCurrency(item.amount)}
            </Text>
          </View>
        ))}
      </View>
      
      {/* Summary Card */}
      {totals && (
        <View style={[styles.reviewCard, { backgroundColor: colors.card, ...shadows.sm }]}>
          <View style={styles.reviewCardHeader}>
            <Ionicons name="calculator-outline" size={18} color={colors.primary} />
            <Text style={[styles.reviewCardTitle, { color: colors.text }]}>Summary</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Subtotal</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {formatCurrency(totals.subtotal)}
            </Text>
          </View>
          
          {totals.cgst > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>CGST</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {formatCurrency(totals.cgst)}
              </Text>
            </View>
          )}
          
          {totals.sgst > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>SGST</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {formatCurrency(totals.sgst)}
              </Text>
            </View>
          )}
          
          {totals.igst > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>IGST</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {formatCurrency(totals.igst)}
              </Text>
            </View>
          )}
          
          <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>
              {formatCurrency(totals.total)}
            </Text>
          </View>
        </View>
      )}
      
      {/* Notes Input */}
      <View style={[styles.reviewCard, { backgroundColor: colors.card, ...shadows.sm }]}>
        <View style={styles.reviewCardHeader}>
          <Ionicons name="document-text-outline" size={18} color={colors.primary} />
          <Text style={[styles.reviewCardTitle, { color: colors.text }]}>Notes (Optional)</Text>
        </View>
        <TextInput
          style={[styles.notesInput, { color: colors.text, borderColor: colors.border }]}
          placeholder="Add any notes for this invoice..."
          placeholderTextColor={colors.textTertiary}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>
      
      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderCurrentStep = () => {
    switch (step) {
      case 0: return renderDocumentTypeStep();
      case 1: return renderCustomerStep();
      case 2: return renderItemsStep();
      case 3: return renderReviewStep();
      default: return null;
    }
  };

  const renderFooter = () => {
    const showBackButton = step > minStep;
    const isReviewStep = step >= 3;
    const saveLabel = `${isEditing ? 'Update' : 'Create'} ${docConfig.label}`;

    return (
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border, ...shadows.lg }]}>
        {showBackButton && (
          <TouchableOpacity
            style={[styles.backBtn, { borderColor: colors.border }]}
            onPress={goToPrevStep}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
            <Text style={[styles.backBtnText, { color: colors.text }]}>Back</Text>
          </TouchableOpacity>
        )}

        {isReviewStep ? (
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: docConfig.gradient[0] }]}
            onPress={handleSaveInvoice}
            disabled={loading}
          >
            {loading ? (
              <Text style={styles.createBtnText}>Saving...</Text>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.createBtnText}>{saveLabel}</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: colors.primary }]}
            onPress={goToNextStep}
          >
            <Text style={styles.nextBtnText}>{getNextButtonText(step)}</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      
      {/* Header with close button */}
      <View style={[styles.screenHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.screenHeaderBackBtn}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.screenHeaderTitle, { color: colors.text }]}>
          {isEditing ? 'Edit' : 'New'} {docConfig.label}
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.screenHeaderCloseBtn}
        >
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      
      {/* Progress Steps */}
      <View style={[styles.progressContainer, { backgroundColor: colors.card, ...shadows.sm }]}>
        {STEPS.map((s, index) => {
          if (isEditing && index === 0) return null;
          
          const isActive = index === step;
          const isCompleted = index < step;
          
          return (
            <TouchableOpacity
              key={s.key}
              style={styles.progressStep}
              onPress={() => {
                if (index < step && index >= minStep) {
                  animateStep('back');
                  setTimeout(() => setStep(index), 200);
                }
              }}
              disabled={index > step || index < minStep}
            >
              <View style={[
                styles.progressDot,
                isCompleted && { backgroundColor: colors.success },
                isActive && { backgroundColor: colors.primary },
                !isActive && !isCompleted && { backgroundColor: colors.border },
              ]}>
                {isCompleted ? (
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                ) : (
                  <Ionicons name={s.icon} size={12} color={isActive ? '#FFFFFF' : colors.textTertiary} />
                )}
              </View>
              <Text style={[
                styles.progressLabel,
                { color: getProgressLabelColor(colors, isActive, isCompleted) }
              ]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      
      {/* Step Content with Animation */}
      <KeyboardAvoidingView
        style={styles.contentContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View 
          style={[
            styles.animatedContent,
            { 
              transform: [{ translateX: slideAnim }],
              opacity: fadeAnim,
            }
          ]}
        >
          {renderCurrentStep()}
        </Animated.View>
      </KeyboardAvoidingView>
      
      {renderFooter()}
    </View>
  );
}

const SPACE_BETWEEN = 'space-between' as const;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: SPACE_BETWEEN,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  screenHeaderBackBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  screenHeaderCloseBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
  },
  progressStep: {
    alignItems: 'center',
    gap: 6,
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
  },
  animatedContent: {
    flex: 1,
  },
  stepContent: {
    flex: 1,
    padding: 20,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 15,
    marginBottom: 24,
  },
  // Document Type Step
  docTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  docTypeCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    padding: 16,
    borderRadius: 16,
    position: 'relative',
  },
  docTypeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  docTypeLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  docTypeDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Pricing & Billing Mode
  modeSection: {
    marginTop: 24,
    marginBottom: 8,
  },
  modeSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  modeButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  modeButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  modeButtonWide: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Items Step - Mode Indicator
  currentModeIndicator: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  modeIndicatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modeIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Barcode Scanner
  barcodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: 10,
    marginBottom: 16,
  },
  barcodeInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  barcodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  barcodeButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  // Customer Step
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    gap: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  selectedCustomerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: SPACE_BETWEEN,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 16,
  },
  selectedCustomerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  customerDetails: {
    marginLeft: 12,
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  customerEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  changeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  changeButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  customerList: {
    flex: 1,
  },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  customerAvatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerAvatarTextSmall: {
    fontSize: 16,
    fontWeight: '700',
  },
  customerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  customerNameList: {
    fontSize: 15,
    fontWeight: '600',
  },
  customerEmailList: {
    fontSize: 13,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    marginTop: 12,
  },
  // Items Step
  itemsStepContainer: {
    flex: 1,
  },
  itemsHeaderScroll: {
    maxHeight: '45%',
    flexShrink: 0,
    paddingHorizontal: 20,
  },
  itemsListWrapper: {
    flex: 1,
    minHeight: 200,
    paddingHorizontal: 20,
  },
  selectedItemsSummary: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  summaryInfo: {
    flexDirection: 'row',
    justifyContent: SPACE_BETWEEN,
    alignItems: 'center',
  },
  summaryCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryTotal: {
    fontSize: 18,
    fontWeight: '700',
  },
  selectedItemsContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  selectedItemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  selectedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  selectedItemInfo: {
    flex: 1,
  },
  selectedItemName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  selectedItemRate: {
    fontSize: 12,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 12,
  },
  qtyButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 15,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'center',
  },
  itemAmountText: {
    fontSize: 15,
    fontWeight: '700',
    minWidth: 70,
    textAlign: 'right',
  },
  availableItemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  itemsList: {
    flex: 1,
  },
  itemsListContent: {
    paddingBottom: 20,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
  },
  itemCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: SPACE_BETWEEN,
  },
  itemCardInfo: {
    flex: 1,
  },
  itemCardName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemCardMeta: {
    fontSize: 12,
  },
  itemCardRight: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  itemCardPrice: {
    fontSize: 15,
    fontWeight: '700',
  },
  itemQtyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  itemQtyBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Review Step
  reviewDocTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    gap: 12,
  },
  reviewDocTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewDocTypeLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  reviewModeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  reviewModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  reviewModeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  reviewCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  reviewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  reviewCardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  reviewCustomerName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  reviewCustomerEmail: {
    fontSize: 13,
    marginBottom: 8,
  },
  gstinBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  gstinText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reviewItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: SPACE_BETWEEN,
    paddingVertical: 10,
  },
  reviewItemInfo: {
    flex: 1,
  },
  reviewItemName: {
    fontSize: 14,
    fontWeight: '600',
  },
  reviewItemMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  reviewItemAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: SPACE_BETWEEN,
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalRow: {
    borderTopWidth: 2,
    marginTop: 8,
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    minHeight: 80,
  },
  // Footer
  footer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
    gap: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  createBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  // Add Items Button
  addItemsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 24,
    marginBottom: 20,
  },
  addItemsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  addItemsButtonBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  addItemsButtonBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  // Selected Items Summary Card
  selectedItemsSummaryCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: SPACE_BETWEEN,
  },
  summaryCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryCardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  summaryCardTotal: {
    fontSize: 20,
    fontWeight: '700',
  },
  // Selected Items Card
  selectedItemsCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  selectedItemsCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 14,
  },
  selectedItemCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  selectedItemCardInfo: {
    flex: 1,
  },
  selectedItemCardName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  selectedItemCardRate: {
    fontSize: 13,
  },
  // Empty Items State
  emptyItemsState: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyItemsIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyItemsTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyItemsText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Items Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: SPACE_BETWEEN,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitleContainer: {
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  modalDoneBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalBarcodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: 10,
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 14,
    borderRadius: 14,
    gap: 10,
  },
  modalSelectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  modalSelectedBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalItemsList: {
    padding: 16,
    paddingBottom: 32,
  },
  modalEmptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  modalEmptyStateText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
