import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { InvoiceStackNavigationProp } from '@navigation/types';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import Loading from '@components/ui/Loading';
import EmptyState from '@components/ui/EmptyState';
import { supabase } from '@lib/supabase';
import { formatCurrency, formatDate } from '@lib/utils';

// Document types matching web app
type DocumentType = 'invoice' | 'sales_order' | 'quotation' | 'proforma' | 'delivery_challan' | 'credit_note' | 'debit_note';

interface DocumentTypeConfig {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
  prefix: string;
}

const DOCUMENT_TYPES: Record<DocumentType, DocumentTypeConfig> = {
  invoice: { label: 'Invoice', icon: 'receipt-outline', gradient: ['#4F46E5', '#6366F1'], prefix: 'INV' },
  sales_order: { label: 'Sales Order', icon: 'cart-outline', gradient: ['#059669', '#10B981'], prefix: 'SO' },
  quotation: { label: 'Quotation', icon: 'document-text-outline', gradient: ['#D97706', '#F59E0B'], prefix: 'QT' },
  proforma: { label: 'Proforma', icon: 'clipboard-outline', gradient: ['#7C3AED', '#8B5CF6'], prefix: 'PI' },
  delivery_challan: { label: 'Delivery Challan', icon: 'car-outline', gradient: ['#0369A1', '#0EA5E9'], prefix: 'DC' },
  credit_note: { label: 'Credit Note', icon: 'arrow-down-circle-outline', gradient: ['#DC2626', '#EF4444'], prefix: 'CN' },
  debit_note: { label: 'Debit Note', icon: 'arrow-up-circle-outline', gradient: ['#EA580C', '#F97316'], prefix: 'DN' },
};

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  total: number;
  status: string;
  invoice_date: string;
  document_type?: string;
}

export default function InvoiceListScreen() {
  const navigation = useNavigation<InvoiceStackNavigationProp>();
  const { colors, shadows, isDark } = useTheme();
  const { organizationId } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedType, setSelectedType] = useState<DocumentType | 'all'>('all');

  useEffect(() => {
    fetchInvoices();
  }, [organizationId]);

  const fetchInvoices = async () => {
    try {
      if (!organizationId) {
        setInvoices([]);
        return;
      }
      
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInvoices();
  }, [organizationId]);

  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return { bg: colors.successLight, color: colors.success };
      case 'pending':
      case 'unpaid':
        return { bg: colors.warningLight, color: colors.warning };
      case 'draft':
        return { bg: isDark ? colors.surfaceElevated : '#F1F5F9', color: colors.textTertiary };
      case 'overdue':
        return { bg: colors.errorLight, color: colors.error };
      case 'partial':
        return { bg: colors.infoLight, color: colors.info };
      default:
        return { bg: colors.surfaceElevated, color: colors.textSecondary };
    }
  };

  const filteredInvoices = selectedType === 'all' 
    ? invoices 
    : invoices.filter(inv => (inv.document_type || 'invoice') === selectedType);

  const renderDocTypeButton = (type: DocumentType | 'all', label: string, icon: keyof typeof Ionicons.glyphMap) => (
    <TouchableOpacity
      key={type}
      onPress={() => setSelectedType(type)}
      style={[
        styles.filterButton,
        {
          backgroundColor: selectedType === type ? colors.primary : colors.card,
          ...shadows.xs,
        }
      ]}
      activeOpacity={0.7}
    >
      <Ionicons 
        name={icon} 
        size={18} 
        color={selectedType === type ? '#FFFFFF' : colors.textSecondary} 
      />
      <Text style={[
        styles.filterButtonText,
        { color: selectedType === type ? '#FFFFFF' : colors.text }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderInvoiceItem = ({ item, index }: { item: Invoice; index: number }) => {
    const docType = (item.document_type || 'invoice') as DocumentType;
    const config = DOCUMENT_TYPES[docType] || DOCUMENT_TYPES.invoice;
    const statusStyle = getStatusStyle(item.status);

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: item.id })}
        activeOpacity={0.7}
        style={[styles.invoiceCard, { backgroundColor: colors.card, ...shadows.sm }]}
      >
        <View style={styles.invoiceContent}>
          <LinearGradient
            colors={config.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.invoiceIcon}
          >
            <Ionicons name={config.icon} size={20} color="#FFFFFF" />
          </LinearGradient>
          
          <View style={styles.invoiceInfo}>
            <View style={styles.invoiceHeader}>
              <Text style={[styles.invoiceNumber, { color: colors.text }]} numberOfLines={1}>
                {item.invoice_number || `${config.prefix}-${item.id.slice(0, 6)}`}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                <Text style={[styles.statusText, { color: statusStyle.color }]}>
                  {(item.status || 'draft').toUpperCase()}
                </Text>
              </View>
            </View>
            
            <Text style={[styles.customerName, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.customer_name || 'No customer'}
            </Text>
            
            <View style={styles.invoiceFooter}>
              <Text style={[styles.invoiceDate, { color: colors.textTertiary }]}>
                {formatDate(item.invoice_date)}
              </Text>
              <Text style={[styles.invoiceAmount, { color: colors.text }]}>
                {formatCurrency(item.total || 0)}
              </Text>
            </View>
          </View>
          
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <Loading fullScreen />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
        backgroundColor={colors.background}
      />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Invoices</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          {filteredInvoices.length} {selectedType === 'all' ? 'total' : DOCUMENT_TYPES[selectedType]?.label.toLowerCase() + 's'}
        </Text>
      </View>

      {/* Document Type Filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[
            { type: 'all' as const, label: 'All', icon: 'layers-outline' as const },
            { type: 'invoice' as const, label: 'Invoices', icon: 'receipt-outline' as const },
            { type: 'quotation' as const, label: 'Quotes', icon: 'document-text-outline' as const },
            { type: 'sales_order' as const, label: 'Orders', icon: 'cart-outline' as const },
            { type: 'proforma' as const, label: 'Proforma', icon: 'clipboard-outline' as const },
            { type: 'delivery_challan' as const, label: 'Challan', icon: 'car-outline' as const },
            { type: 'credit_note' as const, label: 'CN', icon: 'arrow-down-circle-outline' as const },
          ]}
          keyExtractor={(item) => item.type}
          renderItem={({ item }) => renderDocTypeButton(item.type, item.label, item.icon)}
          contentContainerStyle={styles.filtersList}
        />
      </View>

      {/* Invoice List */}
      <FlatList
        data={filteredInvoices}
        renderItem={renderInvoiceItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="document-outline"
            title="No invoices found"
            description={selectedType === 'all' 
              ? 'Create your first invoice to get started' 
              : `No ${DOCUMENT_TYPES[selectedType]?.label.toLowerCase()}s yet`}
            actionText="Create Invoice"
            onAction={() => navigation.navigate('CreateInvoice', {})}
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateInvoice', {})}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#4F46E5', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color="#ffffff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  filtersContainer: {
    marginBottom: 16,
  },
  filtersList: {
    paddingHorizontal: 20,
    gap: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    marginRight: 10,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  invoiceCard: {
    borderRadius: 16,
    padding: 16,
  },
  invoiceContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  invoiceIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  invoiceInfo: {
    flex: 1,
    marginRight: 8,
  },
  invoiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  invoiceNumber: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  customerName: {
    fontSize: 14,
    marginBottom: 6,
  },
  invoiceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceDate: {
    fontSize: 12,
  },
  invoiceAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
