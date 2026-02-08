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
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { InvoiceStackNavigationProp } from '@navigation/types';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import Loading from '@components/ui/Loading';
import { useUnsavedChanges } from '@hooks/useUnsavedChanges';
import { supabase } from '@lib/supabase';
import { calculateInvoiceTotals, IInvoiceItem } from '@lib/invoice-calculations';
import { formatCurrency, generateInvoiceNumber } from '@lib/utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type DocumentType = 'invoice' | 'sales_order' | 'quotation' | 'proforma' | 'delivery_challan' | 'credit_note' | 'debit_note';

interface DocumentTypeConfig {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
  description: string;
}

const DOCUMENT_TYPES: Record<DocumentType, DocumentTypeConfig> = {
  invoice: { label: 'Invoice', icon: 'receipt-outline', gradient: ['#4F46E5', '#6366F1'], description: 'Standard tax invoice' },
  sales_order: { label: 'Sales Order', icon: 'cart-outline', gradient: ['#059669', '#10B981'], description: 'Confirm customer order' },
  quotation: { label: 'Quotation', icon: 'document-text-outline', gradient: ['#D97706', '#F59E0B'], description: 'Price estimate for customer' },
  proforma: { label: 'Proforma', icon: 'clipboard-outline', gradient: ['#7C3AED', '#8B5CF6'], description: 'Preliminary invoice' },
  delivery_challan: { label: 'Delivery Challan', icon: 'car-outline', gradient: ['#0369A1', '#0EA5E9'], description: 'Goods delivery document' },
  credit_note: { label: 'Credit Note', icon: 'arrow-down-circle-outline', gradient: ['#DC2626', '#EF4444'], description: 'Refund or credit' },
  debit_note: { label: 'Debit Note', icon: 'arrow-up-circle-outline', gradient: ['#EA580C', '#F97316'], description: 'Additional charge' },
};

interface Customer {
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
  sale_price?: number;
  wholesale_price?: number;
  quantity_price?: number;
  purchase_price?: number;
  tax_rate?: number;
  hsn?: string;
  barcode_no?: string;
  current_stock?: number;
  per_carton_quantity?: number;
}

const STEPS = [
  { key: 'type', label: 'Type', icon: 'document-outline' },
  { key: 'customer', label: 'Customer', icon: 'person-outline' },
  { key: 'items', label: 'Items', icon: 'cube-outline' },
  { key: 'review', label: 'Review', icon: 'checkmark-circle-outline' },
];

type PricingMode = 'sale' | 'wholesale' | 'quantity';
type BillingMode = 'gst' | 'non-gst';
type PackingType = 'loose' | 'carton';

export default function CreateInvoiceScreen() {
  const navigation = useNavigation<InvoiceStackNavigationProp>();
  const route = useRoute();
  const { colors, shadows, isDark } = useTheme();
  const { organizationId } = useAuth();

  const invoiceId = (route.params as any)?.invoiceId as string | undefined;
  const isEditing = !!invoiceId;
  const preselectedCustomerId = (route.params as any)?.customerId as string | undefined;

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
  const [terms, setTerms] = useState('Payment due within 30 days');
  const [existingInvoiceNumber, setExistingInvoiceNumber] = useState<string | null>(null);

  const docConfig = DOCUMENT_TYPES[documentType];

  // Track unsaved changes - true if user has selected a customer or added items
  // But false if we've just saved successfully (to avoid prompt after save)
  const hasUnsavedChanges = useMemo(() => {
    if (savedSuccessfully) return false;
    return selectedCustomer !== null || invoiceItems.length > 0 || notes.length > 0;
  }, [selectedCustomer, invoiceItems, notes, savedSuccessfully]);

  // Warn user when navigating away with unsaved changes
  useUnsavedChanges({
    hasUnsavedChanges: hasUnsavedChanges, // savedSuccessfully already handled in memo
    title: 'Discard Invoice?',
    message: `You have unsaved changes to this ${docConfig.label.toLowerCase()}. Are you sure you want to discard them?`,
    confirmText: 'Discard',
    cancelText: 'Keep Editing',
  });

  const normalizeItems = (raw: any): IInvoiceItem[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as IInvoiceItem[];
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as IInvoiceItem[]) : [];
      } catch {
        return [];
      }
    }
    if (typeof raw === 'object' && Array.isArray(raw.items)) return raw.items as IInvoiceItem[];
    return [];
  };

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
    fetchCustomers();
    fetchItems();
  }, [organizationId]);

  // Handle packing type changes with quantity caching
  useEffect(() => {
    if (invoiceItems.length === 0) return;

    const updatedItems = invoiceItems.map((invoiceItem) => {
      if (!invoiceItem.itemId) return invoiceItem;

      const selectedItem = availableItems.find((i) => i.id === invoiceItem.itemId);
      if (!selectedItem) return invoiceItem;

      let newQuantity = invoiceItem.quantity;

      if (packingType === 'carton') {
        // Switching to carton mode - cache loose quantity and convert to cartons
        const perCartonQty = Math.floor(selectedItem.per_carton_quantity || 1);
        
        // Save current loose quantity to cache (as integer)
        setLooseQuantityCache(prev => ({
          ...prev,
          [invoiceItem.itemId]: Math.floor(invoiceItem.quantity)
        }));

        // Convert to cartons (use per carton quantity)
        newQuantity = perCartonQty;
      } else {
        // Switching to loose mode - restore cached quantity if available
        if (looseQuantityCache[invoiceItem.itemId]) {
          newQuantity = looseQuantityCache[invoiceItem.itemId];
        }
      }

      return {
        ...invoiceItem,
        quantity: newQuantity,
        amount: newQuantity * invoiceItem.rate,
      };
    });

    setInvoiceItems(updatedItems);
  }, [packingType]); // Only re-run when packing type changes

  useEffect(() => {
    const title = isEditing 
      ? `Edit ${DOCUMENT_TYPES[documentType].label}`
      : `New ${DOCUMENT_TYPES[documentType].label}`;
    navigation.setOptions({ title });
  }, [navigation, isEditing, documentType]);

  useEffect(() => {
    if (!isEditing) return;
    if (!organizationId) return;
    fetchInvoiceForEdit();
  }, [isEditing, organizationId, invoiceId]);

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

      setDocumentType((data as any).document_type || 'invoice');
      setExistingInvoiceNumber((data as any).invoice_number ?? null);
      setInvoiceDate((data as any).invoice_date ?? new Date().toISOString().split('T')[0]);
      setNotes((data as any).notes ?? '');
      setTerms((data as any).terms ?? '');
      
      // Set pricing and billing modes
      setPricingMode((data as any).pricing_mode || 'sale');
      setBillingMode((data as any).billing_mode || ((data as any).gst_enabled === false ? 'non-gst' : 'gst'));

      const customerFromInvoice: Customer | null = (data as any).customer_id
        ? {
            id: (data as any).customer_id,
            name: (data as any).customer_name ?? 'Customer',
            email: (data as any).customer_email ?? undefined,
            gstin: (data as any).customer_gstin ?? undefined,
            phone: (data as any).customer_phone ?? undefined,
          }
        : null;

      if (customerFromInvoice) {
        setSelectedCustomer(customerFromInvoice);
      }

      // Try to fetch items from invoice_items table first (web app structure)
      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId);

      if (!itemsError && itemsData && itemsData.length > 0) {
        // Map invoice_items table columns to our IInvoiceItem interface
        const mappedItems: IInvoiceItem[] = itemsData.map((item: any) => ({
          itemId: item.item_id,
          itemName: item.item_name,
          quantity: item.quantity,
          unit: item.unit || 'pcs',
          rate: item.rate,
          amount: item.amount,
          gstRate: item.gst_rate || 0,
          cessRate: item.cess_rate || 0,
          discount: item.discount || 0,
          hsnCode: item.hsn || '',
        }));
        setInvoiceItems(mappedItems);
      } else {
        // Fallback to JSON items column
        const items = normalizeItems((data as any).items);
        setInvoiceItems(items);
      }
      
      setStep(2); // Go to items step when editing
    } catch (error: any) {
      console.error('[CREATE_INVOICE] fetchInvoiceForEdit error:', error);
      Alert.alert('Error', error.message || 'Failed to load invoice');
      navigation.goBack();
    } finally {
      setInitialLoading(false);
    }
  };

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
      console.log('[ITEMS] Fetching items for org:', organizationId);
      
      // First, get the total count
      const { count, error: countError } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      if (countError) {
        console.error('[ITEMS] Count error:', countError);
        return;
      }

      console.log('[ITEMS] Total items:', count);

      if (!count || count === 0) {
        setAvailableItems([]);
        return;
      }

      // Fetch all items in batches (Supabase default limit is 1000)
      const PAGE_SIZE = 1000;
      const totalPages = Math.ceil(count / PAGE_SIZE);
      const allItems: Item[] = [];

      for (let page = 0; page < totalPages; page++) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        console.log('[ITEMS] Fetching batch', page + 1, 'of', totalPages, `(${from}-${to})`);

        const { data, error } = await supabase
          .from('items')
          .select('*')
          .eq('organization_id', organizationId)
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

      console.log('[ITEMS] Loaded', allItems.length, 'total items');
      // Log first item structure for debugging
      if (allItems.length > 0) {
        console.log('[ITEMS] Sample item keys:', Object.keys(allItems[0]));
        console.log('[ITEMS] Sample item:', JSON.stringify(allItems[0], null, 2));
      }
      setAvailableItems(allItems);
    } catch (error) {
      console.error('[ITEMS] Fetch error:', error);
    }
  };

  // Get price based on pricing mode
  const getItemPrice = (item: Item): number => {
    switch (pricingMode) {
      case 'wholesale':
        return item.wholesale_price ?? item.sale_price ?? 0;
      case 'quantity':
        return item.quantity_price ?? item.sale_price ?? 0;
      default:
        return item.sale_price ?? 0;
    }
  };

  const addItem = (item: Item) => {
    // Use price based on selected pricing mode
    const price = getItemPrice(item);
    const gstRate = billingMode === 'gst' ? (item.tax_rate ?? 0) : 0;
    const hsnCode = item.hsn;
    
    console.log('[ITEMS] Adding item:', item.name, 'price:', price, 'mode:', pricingMode, 'packingType:', packingType);
    
    const existingIndex = invoiceItems.findIndex(i => i.itemId === item.id);
    
    if (existingIndex >= 0) {
      const updated = [...invoiceItems];
      
      // Determine increment based on packing type (always integer)
      const increment = packingType === 'carton' 
        ? Math.floor(item.per_carton_quantity || 1)
        : 1;
      
      updated[existingIndex].quantity += increment;
      updated[existingIndex].amount = updated[existingIndex].quantity * updated[existingIndex].rate;
      
      // Update cache if in loose mode
      if (packingType === 'loose') {
        setLooseQuantityCache(prev => ({
          ...prev,
          [item.id]: updated[existingIndex].quantity
        }));
      }
      
      setInvoiceItems(updated);
    } else {
      // Determine initial quantity based on packing type (always integer)
      const initialQuantity = packingType === 'carton' 
        ? Math.floor(item.per_carton_quantity || 1)
        : 1;
      
      // Cache initial loose quantity
      if (packingType === 'loose') {
        setLooseQuantityCache(prev => ({
          ...prev,
          [item.id]: initialQuantity
        }));
      }
      
      const newItem: IInvoiceItem = {
        itemId: item.id,
        itemName: item.name,
        quantity: initialQuantity,
        unit: 'pcs',
        rate: price,
        gstRate: gstRate,
        cessRate: 0,
        discount: 0,
        amount: price * initialQuantity,
        hsnCode: hsnCode,
      };
      setInvoiceItems([...invoiceItems, newItem]);
    }
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

    setLoading(true);

    try {
      const totals = calculateInvoiceTotals(invoiceItems, billingMode, false);
      
      // Generate proper invoice number based on document type
      const generateProperInvoiceNumber = async () => {
        if (existingInvoiceNumber) return existingInvoiceNumber;
        
        const year = new Date().getFullYear();
        const prefixMap: Record<string, string> = {
          invoice: 'INV',
          sales_order: 'SO',
          quotation: 'QUO',
          proforma: 'PRO',
          delivery_challan: 'DC',
          credit_note: 'CN',
          debit_note: 'DN',
        };
        
        const prefix = prefixMap[documentType] || 'INV';
        
        // Get count of invoices with this prefix and year
        const { count } = await supabase
          .from('invoices')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .like('invoice_number', `${prefix}/${year}/%`);
        
        return `${prefix}/${year}/${((count || 0) + 1).toString().padStart(4, '0')}`;
      };

      // Only include columns that exist in the database schema
      const baseInvoiceData = {
        organization_id: organizationId,
        document_type: documentType,
        pricing_mode: pricingMode,
        billing_mode: billingMode,
        gst_enabled: billingMode === 'gst',
        customer_id: selectedCustomer.id,
        customer_name: selectedCustomer.name,
        customer_phone: selectedCustomer.phone || null,
        customer_address: selectedCustomer.address || null,
        customer_gstin: selectedCustomer.gstin || null,
        customer_email: selectedCustomer.email || null,
        invoice_date: invoiceDate,
        subtotal: totals.subtotal,
        cgst: billingMode === 'gst' ? totals.cgst : 0,
        sgst: billingMode === 'gst' ? totals.sgst : 0,
        igst: billingMode === 'gst' ? totals.igst : 0,
        discount: totals.discount,
        total: totals.total,
        paid_amount: 0,
        balance: totals.total,
        status: 'unpaid',
        notes: notes || null,
      };

      if (isEditing && invoiceId) {
        const invoice_number = await generateProperInvoiceNumber();
        const { error } = await supabase
          .from('invoices')
          .update({ ...baseInvoiceData, invoice_number })
          .eq('organization_id', organizationId)
          .eq('id', invoiceId);

        if (error) throw error;

        // Delete old items and insert new ones
        await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', invoiceId);

        if (invoiceItems.length > 0) {
          const itemsToInsert = invoiceItems.map((item) => ({
            invoice_id: invoiceId,
            item_id: item.itemId || null,
            item_name: item.itemName || 'Item',
            hsn: item.hsnCode || null,
            quantity: item.quantity || 1,
            unit: item.unit || 'pcs',
            rate: item.rate || 0,
            discount: item.discount || 0,
            discount_type: 'percentage',
            gst_rate: item.gstRate || 0,
            amount: (item.quantity || 1) * (item.rate || 0),
          }));

          await supabase
            .from('invoice_items')
            .insert(itemsToInsert);
        }

        setSavedSuccessfully(true);
        Alert.alert('Success', `${docConfig.label} updated!`, [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        const invoice_number = await generateProperInvoiceNumber();
        const { data: newInvoice, error } = await supabase
          .from('invoices')
          .insert({ ...baseInvoiceData, invoice_number })
          .select()
          .single();

        if (error) throw error;

        // Save items to invoice_items table
        if (newInvoice && invoiceItems.length > 0) {
          const itemsToInsert = invoiceItems.map((item) => ({
            invoice_id: newInvoice.id,
            item_id: item.itemId || null,
            item_name: item.itemName || 'Item',
            hsn: item.hsnCode || null,
            quantity: item.quantity || 1,
            unit: item.unit || 'pcs',
            rate: item.rate || 0,
            discount: item.discount || 0,
            discount_type: 'percentage',
            gst_rate: item.gstRate || 0,
            amount: (item.quantity || 1) * (item.rate || 0),
          }));

          const { error: itemsError } = await supabase
            .from('invoice_items')
            .insert(itemsToInsert);

          if (itemsError) {
            console.error('Failed to save invoice items:', itemsError);
          }
        }

        setSavedSuccessfully(true);
        Alert.alert('Success', `${docConfig.label} created!`, [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const goToNextStep = () => {
    if (step === 1 && !selectedCustomer) {
      Alert.alert('Required', 'Please select a customer');
      return;
    }
    if (step === 2 && invoiceItems.length === 0) {
      Alert.alert('Required', 'Please add at least one item');
      return;
    }
    
    animateStep('forward');
    setTimeout(() => setStep(step + 1), 200);
  };

  const goToPrevStep = () => {
    // In edit mode, don't go below step 1 (document type is locked)
    const minStep = isEditing ? 1 : 0;
    if (step <= minStep) return;
    animateStep('back');
    setTimeout(() => setStep(step - 1), 200);
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

  const renderDocumentTypeStep = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        What are you creating?
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Select the type of document
      </Text>
      
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
                isSelected && { borderWidth: 2, borderColor: config.gradient[0] }
              ]}
              onPress={() => setDocumentType(type)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={config.gradient}
                style={styles.docTypeIconContainer}
              >
                <Ionicons name={config.icon} size={24} color="#FFFFFF" />
              </LinearGradient>
              <Text style={[styles.docTypeLabel, { color: colors.text }]}>
                {config.label}
              </Text>
              <Text style={[styles.docTypeDesc, { color: colors.textTertiary }]} numberOfLines={2}>
                {config.description}
              </Text>
              {isSelected && (
                <View style={[styles.selectedIndicator, { backgroundColor: config.gradient[0] }]}>
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );

  const renderCustomerStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Select Customer
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Who is this {docConfig.label.toLowerCase()} for?
      </Text>
      
      {/* Search Input */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card, ...shadows.sm }]}>
        <Ionicons name="search" size={20} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search customers..."
          placeholderTextColor={colors.textTertiary}
          value={searchCustomer}
          onChangeText={setSearchCustomer}
        />
        {searchCustomer.length > 0 && (
          <TouchableOpacity onPress={() => setSearchCustomer('')}>
            <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Selected Customer */}
      {selectedCustomer && (
        <View style={[styles.selectedCustomerCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
          <View style={styles.selectedCustomerInfo}>
            <LinearGradient colors={docConfig.gradient} style={styles.customerAvatar}>
              <Text style={styles.customerAvatarText}>
                {selectedCustomer.name.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
            <View style={styles.customerDetails}>
              <Text style={[styles.customerName, { color: colors.text }]}>
                {selectedCustomer.name}
              </Text>
              {selectedCustomer.email && (
                <Text style={[styles.customerEmail, { color: colors.textSecondary }]}>
                  {selectedCustomer.email}
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity 
            style={[styles.changeButton, { backgroundColor: colors.primary }]}
            onPress={() => setSelectedCustomer(null)}
          >
            <Text style={styles.changeButtonText}>Change</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Customer List */}
      {!selectedCustomer && (
        <ScrollView style={styles.customerList} showsVerticalScrollIndicator={false}>
          {filteredCustomers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                No customers found
              </Text>
            </View>
          ) : (
            filteredCustomers.map((customer) => (
              <TouchableOpacity
                key={customer.id}
                style={[styles.customerCard, { backgroundColor: colors.card, ...shadows.sm }]}
                onPress={() => setSelectedCustomer(customer)}
                activeOpacity={0.7}
              >
                <View style={[styles.customerAvatarSmall, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.customerAvatarTextSmall, { color: colors.primary }]}>
                    {customer.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.customerInfo}>
                  <Text style={[styles.customerNameList, { color: colors.text }]}>
                    {customer.name}
                  </Text>
                  {customer.email && (
                    <Text style={[styles.customerEmailList, { color: colors.textSecondary }]}>
                      {customer.email}
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );

  const renderItemCard = ({ item }: { item: Item }) => {
    const existingItem = invoiceItems.find(i => i.itemId === item.id);
    const price = getItemPrice(item);
    const gstRate = billingMode === 'gst' ? (item.tax_rate ?? 0) : 0;
    const hsnCode = item.hsn;
    
    return (
      <TouchableOpacity
        style={[
          styles.itemCard,
          { backgroundColor: colors.card, ...shadows.sm },
          existingItem && { borderLeftWidth: 3, borderLeftColor: colors.primary }
        ]}
        onPress={() => addItem(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemCardContent}>
          <View style={styles.itemCardInfo}>
            <Text style={[styles.itemCardName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.itemCardMeta, { color: colors.textSecondary }]}>
              {item.item_code && `${item.item_code} • `}
              {billingMode === 'gst' ? `GST ${gstRate}%` : 'No GST'}
              {hsnCode && ` • HSN ${hsnCode}`}
            </Text>
          </View>
          <View style={styles.itemCardRight}>
            <Text style={[styles.itemCardPrice, { color: colors.text }]}>
              {formatCurrency(price)}
            </Text>
            {existingItem && (
              <View style={[styles.itemQtyBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.itemQtyBadgeText}>×{existingItem.quantity}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={[styles.addButton, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="add" size={18} color={colors.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderItemsListHeader = () => (
    <View>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Add Items
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Select products or services ({availableItems.length} available)
      </Text>

      {/* Pricing Mode Section */}
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

      {/* Billing Mode Section */}
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

      {/* Packing Type Section */}
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
      
      {/* Barcode Scanner Input */}
      <View style={[styles.barcodeContainer, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
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
          <Text style={styles.barcodeButtonText}>Add</Text>
        </TouchableOpacity>
      </View>
      
      {/* Selected Items Summary */}
      {invoiceItems.length > 0 && (
        <View style={[styles.selectedItemsSummary, { backgroundColor: colors.primaryLight }]}>
          <View style={styles.summaryInfo}>
            <Text style={[styles.summaryCount, { color: colors.primary }]}>
              {invoiceItems.length} item{invoiceItems.length > 1 ? 's' : ''} selected
            </Text>
            <Text style={[styles.summaryTotal, { color: colors.primary }]}>
              {formatCurrency(totals?.total || 0)}
            </Text>
          </View>
        </View>
      )}
      
      {/* Search Input */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card, ...shadows.sm }]}>
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
      
      {/* Selected Items List */}
      {invoiceItems.length > 0 && (
        <View style={[styles.selectedItemsContainer, { backgroundColor: colors.card, ...shadows.sm }]}>
          <Text style={[styles.selectedItemsTitle, { color: colors.text }]}>
            Selected Items
          </Text>
          {invoiceItems.map((item, index) => (
            <View 
              key={index} 
              style={[
                styles.selectedItemRow,
                index < invoiceItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }
              ]}
            >
              <View style={styles.selectedItemInfo}>
                <Text style={[styles.selectedItemName, { color: colors.text }]} numberOfLines={1}>
                  {item.itemName}
                </Text>
                <Text style={[styles.selectedItemRate, { color: colors.textSecondary }]}>
                  {formatCurrency(item.rate)} × {item.quantity}
                </Text>
              </View>
              <View style={styles.qtyControls}>
                <TouchableOpacity
                  style={[styles.qtyButton, { backgroundColor: colors.errorLight }]}
                  onPress={() => {
                    const step = packingType === 'carton' 
                      ? Math.floor(availableItems.find(i => i.id === item.itemId)?.per_carton_quantity || 1)
                      : 1;
                    updateItemQuantity(index, item.quantity - step);
                  }}
                >
                  <Ionicons name="remove" size={16} color={colors.error} />
                </TouchableOpacity>
                <Text style={[styles.qtyText, { color: colors.text }]}>{item.quantity}</Text>
                <TouchableOpacity
                  style={[styles.qtyButton, { backgroundColor: colors.successLight }]}
                  onPress={() => {
                    const step = packingType === 'carton' 
                      ? Math.floor(availableItems.find(i => i.id === item.itemId)?.per_carton_quantity || 1)
                      : 1;
                    updateItemQuantity(index, item.quantity + step);
                  }}
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
      )}
      
      {/* Available Items Header */}
      <Text style={[styles.availableItemsTitle, { color: colors.text }]}>
        Available Items ({filteredItems.length})
      </Text>
    </View>
  );

  const renderItemsStep = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Add Items
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Select products or services for your {docConfig.label.toLowerCase()}
      </Text>

      {/* Pricing Mode Section */}
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

      {/* Billing Mode Section */}
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

      {/* Packing Type Section */}
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

      {/* Add Items Button */}
      <TouchableOpacity
        style={[styles.addItemsButton, { backgroundColor: colors.primary, ...shadows.md }]}
        onPress={() => setShowItemsModal(true)}
      >
        <Ionicons name="add-circle-outline" size={24} color="#FFFFFF" />
        <Text style={styles.addItemsButtonText}>
          {invoiceItems.length > 0 ? 'Add More Items' : 'Add Items'}
        </Text>
        <View style={styles.addItemsButtonBadge}>
          <Text style={styles.addItemsButtonBadgeText}>{availableItems.length}</Text>
        </View>
      </TouchableOpacity>

      {/* Selected Items Summary */}
      {invoiceItems.length > 0 && (
        <View style={[styles.selectedItemsSummaryCard, { backgroundColor: colors.primaryLight }]}>
          <View style={styles.summaryCardHeader}>
            <View style={styles.summaryCardLeft}>
              <Ionicons name="cube-outline" size={20} color={colors.primary} />
              <Text style={[styles.summaryCardTitle, { color: colors.primary }]}>
                {invoiceItems.length} item{invoiceItems.length > 1 ? 's' : ''} selected
              </Text>
            </View>
            <Text style={[styles.summaryCardTotal, { color: colors.primary }]}>
              {formatCurrency(totals?.total || 0)}
            </Text>
          </View>
        </View>
      )}

      {/* Selected Items List */}
      {invoiceItems.length > 0 && (
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
                  onPress={() => {
                    const step = packingType === 'carton' 
                      ? Math.floor(availableItems.find(i => i.id === item.itemId)?.per_carton_quantity || 1)
                      : 1;
                    updateItemQuantity(index, item.quantity - step);
                  }}
                >
                  <Ionicons name="remove" size={16} color={colors.error} />
                </TouchableOpacity>
                <Text style={[styles.qtyText, { color: colors.text }]}>{item.quantity}</Text>
                <TouchableOpacity
                  style={[styles.qtyButton, { backgroundColor: colors.successLight }]}
                  onPress={() => {
                    const step = packingType === 'carton' 
                      ? Math.floor(availableItems.find(i => i.id === item.itemId)?.per_carton_quantity || 1)
                      : 1;
                    updateItemQuantity(index, item.quantity + step);
                  }}
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
      )}

      {/* Empty State */}
      {invoiceItems.length === 0 && (
        <View style={[styles.emptyItemsState, { backgroundColor: colors.card, ...shadows.sm }]}>
          <View style={[styles.emptyItemsIconContainer, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="cube-outline" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.emptyItemsTitle, { color: colors.text }]}>No items added yet</Text>
          <Text style={[styles.emptyItemsText, { color: colors.textSecondary }]}>
            Tap "Add Items" above to select products or services
          </Text>
        </View>
      )}

      {/* Items Selection Modal */}
      <Modal
        visible={showItemsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowItemsModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Modal Header */}
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

          {/* Barcode Scanner */}
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

          {/* Search */}
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

          {/* Selected Count Badge */}
          {invoiceItems.length > 0 && (
            <View style={[styles.modalSelectedBadge, { backgroundColor: colors.successLight }]}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={[styles.modalSelectedBadgeText, { color: colors.success }]}>
                {invoiceItems.length} item{invoiceItems.length > 1 ? 's' : ''} selected • {formatCurrency(totals?.total || 0)}
              </Text>
            </View>
          )}

          {/* Items List */}
          <FlatList
            data={filteredItems}
            renderItem={renderItemCard}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <View style={styles.modalEmptyState}>
                <Ionicons name="cube-outline" size={48} color={colors.textTertiary} />
                <Text style={[styles.modalEmptyStateText, { color: colors.textSecondary }]}>
                  {availableItems.length === 0 
                    ? 'No items in inventory. Add items from the web app first.'
                    : 'No items match your search'
                  }
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
    </ScrollView>
  );

  const getPricingModeLabel = () => {
    switch (pricingMode) {
      case 'wholesale': return 'Wholesale Price';
      case 'quantity': return 'Quantity Price (Bulk)';
      default: return 'Sale Price (MRP)';
    }
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
            {getPricingModeLabel()}
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
          // In edit mode, skip the Type step (index 0)
          if (isEditing && index === 0) return null;
          
          const isActive = index === step;
          const isCompleted = index < step;
          // In edit mode, don't allow going back to step 0
          const minStep = isEditing ? 1 : 0;
          
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
                  <Ionicons name={s.icon as any} size={12} color={isActive ? '#FFFFFF' : colors.textTertiary} />
                )}
              </View>
              <Text style={[
                styles.progressLabel,
                { color: isActive ? colors.primary : isCompleted ? colors.success : colors.textTertiary }
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
          {step === 0 && renderDocumentTypeStep()}
          {step === 1 && renderCustomerStep()}
          {step === 2 && renderItemsStep()}
          {step === 3 && renderReviewStep()}
        </Animated.View>
      </KeyboardAvoidingView>
      
      {/* Footer Navigation */}
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border, ...shadows.lg }]}>
        {/* In edit mode, don't show back button on step 1 since type is locked */}
        {step > (isEditing ? 1 : 0) && (
          <TouchableOpacity 
            style={[styles.backBtn, { borderColor: colors.border }]}
            onPress={goToPrevStep}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
            <Text style={[styles.backBtnText, { color: colors.text }]}>Back</Text>
          </TouchableOpacity>
        )}
        
        {step < 3 ? (
          <TouchableOpacity 
            style={[styles.nextBtn, { backgroundColor: colors.primary }]}
            onPress={goToNextStep}
          >
            <Text style={styles.nextBtnText}>
              {step === 0 ? 'Continue' : step === 1 && selectedCustomer ? 'Next' : step === 2 ? 'Review' : 'Next'}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
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
                <Text style={styles.createBtnText}>
                  {isEditing ? 'Update' : 'Create'} {docConfig.label}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    justifyContent: 'space-between',
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
    justifyContent: 'space-between',
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
    justifyContent: 'space-between',
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
    justifyContent: 'space-between',
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
    justifyContent: 'space-between',
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
    justifyContent: 'space-between',
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
    justifyContent: 'space-between',
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
