import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { InvoiceStackNavigationProp } from '@navigation/types';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import { useFocusRefresh } from '@hooks/useFocusRefresh';
import { SkeletonList } from '@components/ui/Skeleton';
import EmptyState from '@components/ui/EmptyState';
import Input from '@components/ui/Input';
import OfflineBanner from '@components/ui/OfflineBanner';
import ListFooterLoader from '@components/ui/ListFooterLoader';
import { supabase } from '@lib/supabase';
import { formatCurrency, formatDate } from '@lib/utils';
import { NetworkService } from '@services/network';
import { lightTap } from '@lib/haptics';
import AnimatedListItem from '@components/ui/AnimatedListItem';

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

const PAGE_SIZE = 50;
const DEBOUNCE_MS = 300;

const buildAndExecuteInvoiceQuery = async (
  organizationId: string,
  docType: DocumentType | 'all',
  query: string,
  pageNum: number,
  totalCountFallback: number
): Promise<{ fetchedItems: Invoice[]; count: number | null }> => {
  const from = pageNum * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const isFirstPage = pageNum === 0;

  let countQuery = supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .is('deleted_at', null);

  let dataQuery = supabase
    .from('invoices')
    .select('id, invoice_number, customer_name, total, status, invoice_date, document_type')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (docType !== 'all') {
    countQuery = countQuery.eq('document_type', docType);
    dataQuery = dataQuery.eq('document_type', docType);
  }

  if (query.trim()) {
    const searchTerm = `%${query.trim()}%`;
    const filter = `invoice_number.ilike.${searchTerm},customer_name.ilike.${searchTerm}`;
    countQuery = countQuery.or(filter);
    dataQuery = dataQuery.or(filter);
  }

  const [countResult, dataResult] = await Promise.all([
    isFirstPage ? countQuery : Promise.resolve({ count: totalCountFallback, error: null }),
    dataQuery,
  ]);

  if (dataResult.error) throw dataResult.error;

  const fetchedItems = (dataResult.data || []) as Invoice[];
  const count = isFirstPage && countResult && 'count' in countResult && countResult.count !== null
    ? countResult.count
    : null;

  return { fetchedItems, count };
};

const extractFetchError = (err: unknown): string =>
  err instanceof Error ? err.message : 'Failed to load invoices';

export default function InvoiceListScreen() {
  const navigation = useNavigation<InvoiceStackNavigationProp>();
  const { colors, shadows, isDark } = useTheme();
  const { organizationId } = useAuth();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedType, setSelectedType] = useState<DocumentType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const currentQueryRef = useRef('');
  const totalCountRef = useRef(0);

  const applyFetchResults = (
    fetchedItems: Invoice[],
    count: number | null,
    isFirstPage: boolean,
    pageNum: number
  ) => {
    if (isFirstPage) {
      setInvoices(fetchedItems);
      if (count !== null) {
        setTotalCount(count);
        totalCountRef.current = count;
      }
    } else {
      setInvoices((prev) => [...prev, ...fetchedItems]);
    }
    setHasMore(fetchedItems.length === PAGE_SIZE);
    setPage(pageNum);
    setError(null);
  };

  const fetchInvoices = useCallback(async (
    query: string,
    docType: DocumentType | 'all',
    pageNum: number,
    isRefresh: boolean = false
  ) => {
    if (!organizationId) {
      setInvoices([]);
      setLoading(false);
      return;
    }

    const isConnected = await NetworkService.checkConnection();
    if (!isConnected) {
      setIsOffline(true);
      setError('You are offline. Please check your internet connection.');
      setLoading(false);
      return;
    }
    setIsOffline(false);

    const isFirstPage = pageNum === 0;
    if (isFirstPage && !isRefresh) setLoading(true);
    if (!isFirstPage) setIsLoadingMore(true);

    try {
      const { fetchedItems, count } = await buildAndExecuteInvoiceQuery(
        organizationId, docType, query, pageNum, totalCountRef.current
      );
      if (currentQueryRef.current !== query) return;
      applyFetchResults(fetchedItems, count, isFirstPage, pageNum);
    } catch (err: unknown) {
      setError(extractFetchError(err));
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
      setIsRefreshing(false);
    }
  }, [organizationId]);

  useFocusRefresh(useCallback(() => {
    fetchInvoices(searchQuery, selectedType, 0, true);
  }, [searchQuery, selectedType, fetchInvoices]));

  useEffect(() => {
    currentQueryRef.current = searchQuery;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!searchQuery.trim()) {
      fetchInvoices('', selectedType, 0);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      fetchInvoices(searchQuery, selectedType, 0);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchQuery, selectedType, fetchInvoices]);

  useEffect(() => {
    if (organizationId) fetchInvoices('', selectedType, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, fetchInvoices]);

  const handleTypeChange = (type: DocumentType | 'all') => {
    setSelectedType(type);
    setPage(0);
  };

  const handleEndReached = useCallback(() => {
    if (hasMore && !isLoadingMore && !loading) {
      fetchInvoices(searchQuery, selectedType, page + 1);
    }
  }, [hasMore, isLoadingMore, loading, searchQuery, selectedType, page, fetchInvoices]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setPage(0);
    fetchInvoices(searchQuery, selectedType, 0, true);
  }, [searchQuery, selectedType, fetchInvoices]);

  useEffect(() => {
    const unsubscribe = NetworkService.subscribeToNetworkChanges((connected) => {
      setIsOffline(!connected);
      if (connected && error) fetchInvoices(searchQuery, selectedType, 0);
    });
    return () => unsubscribe();
  }, [searchQuery, selectedType, error, fetchInvoices]);

  const getStatusStyle = useCallback((status: string) => {
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
  }, [colors, isDark]);

  const renderDocTypeButton = (type: DocumentType | 'all', label: string, icon: keyof typeof Ionicons.glyphMap) => (
    <TouchableOpacity
      key={type}
      onPress={() => handleTypeChange(type)}
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

  const renderInvoiceItem = useCallback(({ item, index }: { item: Invoice; index: number }) => {
    const docType = (item.document_type || 'invoice') as DocumentType;
    const config = DOCUMENT_TYPES[docType] || DOCUMENT_TYPES.invoice;
    const statusStyle = getStatusStyle(item.status);

    return (
      <AnimatedListItem index={index}>
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
      </AnimatedListItem>
    );
  }, [colors, shadows, navigation, getStatusStyle]);

  const renderListFooter = useCallback(() => (
    <ListFooterLoader
      isLoading={isLoadingMore}
      hasMore={hasMore}
      itemCount={invoices.length}
      totalCount={totalCount}
    />
  ), [isLoadingMore, hasMore, invoices.length, totalCount]);

  const renderEmptyState = useCallback(() => {
    if (loading) return null;

    if (error) {
      return (
        <EmptyState
          icon="alert-circle-outline"
          title="Something went wrong"
          description={error}
          actionText="Try Again"
          onAction={handleRefresh}
        />
      );
    }

    const getEmptyDescription = (): string => {
      if (searchQuery) return `No invoices matching "${searchQuery}"`;
      if (selectedType === 'all') return 'Create your first invoice to get started';
      return `No ${DOCUMENT_TYPES[selectedType]?.label.toLowerCase()}s yet`;
    };

    return (
      <EmptyState
        icon="document-outline"
        title="No invoices found"
        description={getEmptyDescription()}
        actionText="Create Invoice"
        onAction={() => navigation.navigate('CreateInvoice', {})}
      />
    );
  }, [loading, error, searchQuery, selectedType, handleRefresh, navigation]);

  if (loading && invoices.length === 0 && !searchQuery) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Invoices</Text>
        </View>
        <View style={{ paddingHorizontal: 20 }}>
          <SkeletonList count={6} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {isOffline && <OfflineBanner onRetry={handleRefresh} />}

      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Invoices</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          {totalCount} {selectedType === 'all' ? 'total' : DOCUMENT_TYPES[selectedType]?.label.toLowerCase() + 's'}
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <Input
          placeholder="Search by invoice number or customer..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="search"
          containerStyle={styles.searchInput}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {loading && invoices.length > 0 && (
          <View style={styles.searchIndicator}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
      </View>

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

      <FlatList
        data={invoices}
        renderItem={renderInvoiceItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          invoices.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderListFooter}
        removeClippedSubviews={true}
        maxToRenderPerBatch={15}
        windowSize={10}
        initialNumToRender={15}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => { lightTap(); navigation.navigate('CreateInvoice', {}); }}
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
    paddingBottom: 8,
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    position: 'relative',
  },
  searchInput: {
    marginBottom: 0,
  },
  searchIndicator: {
    position: 'absolute',
    right: 32,
    top: 12,
  },
  filtersContainer: {
    marginBottom: 8,
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
  listContentEmpty: {
    flexGrow: 1,
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
