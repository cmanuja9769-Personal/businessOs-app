import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MoreStackParamList, MoreStackNavigationProp } from '@navigation/types';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import { supabase } from '@lib/supabase';
import { formatCurrency, formatDate } from '@lib/utils';

type RouteProps = RouteProp<MoreStackParamList, 'ReportDetail'>;

interface ReportConfig {
  title: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const REPORT_CONFIG: Record<string, ReportConfig> = {
  sales: { title: 'Sales Report', color: '#10B981', icon: 'receipt-outline' },
  'party-profit': { title: 'Party Profit', color: '#10B981', icon: 'people-outline' },
  'item-profit': { title: 'Item Profit', color: '#10B981', icon: 'cube-outline' },
  purchases: { title: 'Purchases Report', color: '#6366F1', icon: 'cart-outline' },
  expenses: { title: 'Expenses Report', color: '#6366F1', icon: 'wallet-outline' },
  'stock-summary': { title: 'Stock Summary', color: '#F59E0B', icon: 'layers-outline' },
  'stock-detail': { title: 'Stock Detail', color: '#F59E0B', icon: 'list-outline' },
  'low-stock': { title: 'Low Stock Alert', color: '#F59E0B', icon: 'alert-circle-outline' },
  outstanding: { title: 'Outstanding Report', color: '#EF4444', icon: 'time-outline' },
  'party-ledger': { title: 'Party Ledger', color: '#EF4444', icon: 'book-outline' },
  'gstr-1': { title: 'GSTR-1 Report', color: '#8B5CF6', icon: 'arrow-up-circle-outline' },
  'gstr-2': { title: 'GSTR-2 Report', color: '#8B5CF6', icon: 'arrow-down-circle-outline' },
  'gstr-3b': { title: 'GSTR-3B Summary', color: '#8B5CF6', icon: 'documents-outline' },
  'profit-loss': { title: 'Profit & Loss', color: '#0EA5E9', icon: 'trending-up-outline' },
  'day-book': { title: 'Day Book', color: '#0EA5E9', icon: 'calendar-outline' },
  'cash-flow': { title: 'Cash Flow', color: '#0EA5E9', icon: 'swap-horizontal-outline' },
};

export default function ReportDetailScreen() {
  const navigation = useNavigation<MoreStackNavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors, shadows } = useTheme();
  const { organizationId } = useAuth();

  const { reportKey } = route.params;
  const config = REPORT_CONFIG[reportKey] || { title: 'Report', color: '#6366F1', icon: 'document-outline' };

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});

  useEffect(() => {
    loadReportData();
  }, [reportKey, organizationId]);

  const loadReportData = async () => {
    if (!organizationId) return;
    setLoading(true);

    try {
      switch (reportKey) {
        case 'sales':
          await loadSalesReport();
          break;
        case 'purchases':
          await loadPurchasesReport();
          break;
        case 'stock-summary':
        case 'stock-detail':
          await loadStockReport();
          break;
        case 'low-stock':
          await loadLowStockReport();
          break;
        case 'outstanding':
          await loadOutstandingReport();
          break;
        case 'party-profit':
          await loadPartyProfitReport();
          break;
        case 'gstr-1':
        case 'gstr-2':
        case 'gstr-3b':
          await loadGSTReport();
          break;
        case 'profit-loss':
          await loadProfitLossReport();
          break;
        default:
          setData([]);
      }
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSalesReport = async () => {
    const { data: invoices } = await supabase
      .from('invoices')
      .select('*, customers(name)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(50);

    const total = (invoices || []).reduce((sum, i) => sum + (i.total || 0), 0);
    const paid = (invoices || []).reduce((sum, i) => sum + (i.total - i.balance || 0), 0);

    setData(invoices || []);
    setSummary({ total, paid, pending: total - paid });
  };

  const loadPurchasesReport = async () => {
    const { data: purchases } = await supabase
      .from('purchases')
      .select('*, suppliers(name)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(50);

    const total = (purchases || []).reduce((sum, p) => sum + (p.total || 0), 0);
    const paid = (purchases || []).reduce((sum, p) => sum + (p.total - p.balance || 0), 0);

    setData(purchases || []);
    setSummary({ total, paid, pending: total - paid });
  };

  const loadStockReport = async () => {
    const { data: items } = await supabase
      .from('items')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name');

    const totalValue = (items || []).reduce((sum, i) => sum + ((i.stock || 0) * (i.purchase_price || 0)), 0);
    const totalItems = items?.length || 0;

    setData(items || []);
    setSummary({ totalValue, totalItems });
  };

  const loadLowStockReport = async () => {
    const { data: items } = await supabase
      .from('items')
      .select('*')
      .eq('organization_id', organizationId)
      .lt('stock', 10)
      .order('stock');

    setData(items || []);
    setSummary({ count: items?.length || 0 });
  };

  const loadOutstandingReport = async () => {
    const { data: invoices } = await supabase
      .from('invoices')
      .select('*, customers(name)')
      .eq('organization_id', organizationId)
      .gt('balance', 0)
      .order('balance', { ascending: false });

    const totalReceivable = (invoices || []).reduce((sum, i) => sum + (i.balance || 0), 0);

    setData(invoices || []);
    setSummary({ totalReceivable });
  };

  const loadPartyProfitReport = async () => {
    const { data: customers } = await supabase
      .from('customers')
      .select('id, name')
      .eq('organization_id', organizationId);

    const { data: invoices } = await supabase
      .from('invoices')
      .select('customer_id, total, subtotal')
      .eq('organization_id', organizationId);

    const partyData = (customers || []).map(c => {
      const customerInvoices = (invoices || []).filter(i => i.customer_id === c.id);
      const revenue = customerInvoices.reduce((sum, i) => sum + (i.total || 0), 0);
      return { ...c, revenue, invoiceCount: customerInvoices.length };
    }).filter(c => c.invoiceCount > 0).sort((a, b) => b.revenue - a.revenue);

    setData(partyData);
    setSummary({ totalRevenue: partyData.reduce((sum, p) => sum + p.revenue, 0) });
  };

  const loadGSTReport = async () => {
    const { data: invoices } = await supabase
      .from('invoices')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_gst', true);

    const cgst = (invoices || []).reduce((sum, i) => sum + (i.cgst || 0), 0);
    const sgst = (invoices || []).reduce((sum, i) => sum + (i.sgst || 0), 0);
    const igst = (invoices || []).reduce((sum, i) => sum + (i.igst || 0), 0);

    setData(invoices || []);
    setSummary({ cgst, sgst, igst, total: cgst + sgst + igst });
  };

  const loadProfitLossReport = async () => {
    const { data: invoices } = await supabase
      .from('invoices')
      .select('total, subtotal')
      .eq('organization_id', organizationId);

    const { data: purchases } = await supabase
      .from('purchases')
      .select('total')
      .eq('organization_id', organizationId);

    const revenue = (invoices || []).reduce((sum, i) => sum + (i.total || 0), 0);
    const expense = (purchases || []).reduce((sum, p) => sum + (p.total || 0), 0);

    setData([
      { type: 'Revenue', amount: revenue },
      { type: 'Expenses', amount: expense },
      { type: 'Net Profit', amount: revenue - expense },
    ]);
    setSummary({ revenue, expense, profit: revenue - expense });
  };

  const renderSummaryCard = () => {
    const summaryItems = Object.entries(summary).map(([key, value]) => ({
      label: key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
      value: typeof value === 'number' && key !== 'count' && key !== 'totalItems' 
        ? formatCurrency(value) 
        : value.toString(),
    }));

    return (
      <View style={[styles.summaryCard, { backgroundColor: config.color }]}>
        {summaryItems.map((item, idx) => (
          <View key={idx} style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>{item.label}</Text>
            <Text style={styles.summaryValue}>{item.value}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    if (reportKey === 'sales') {
      return (
        <View style={[styles.listItem, { backgroundColor: colors.card, ...shadows.sm }]}>
          <View style={styles.listItemMain}>
            <Text style={[styles.listItemTitle, { color: colors.text }]}>{item.invoice_number}</Text>
            <Text style={[styles.listItemSub, { color: colors.textSecondary }]}>{item.customers?.name}</Text>
          </View>
          <View style={styles.listItemRight}>
            <Text style={[styles.listItemAmount, { color: colors.text }]}>{formatCurrency(item.total)}</Text>
            <Text style={[styles.listItemDate, { color: colors.textSecondary }]}>{formatDate(item.created_at)}</Text>
          </View>
        </View>
      );
    }

    if (reportKey === 'purchases') {
      return (
        <View style={[styles.listItem, { backgroundColor: colors.card, ...shadows.sm }]}>
          <View style={styles.listItemMain}>
            <Text style={[styles.listItemTitle, { color: colors.text }]}>{item.purchase_number || 'Purchase'}</Text>
            <Text style={[styles.listItemSub, { color: colors.textSecondary }]}>{item.suppliers?.name}</Text>
          </View>
          <View style={styles.listItemRight}>
            <Text style={[styles.listItemAmount, { color: colors.text }]}>{formatCurrency(item.total)}</Text>
            <Text style={[styles.listItemDate, { color: colors.textSecondary }]}>{formatDate(item.created_at)}</Text>
          </View>
        </View>
      );
    }

    if (reportKey === 'stock-summary' || reportKey === 'stock-detail' || reportKey === 'low-stock') {
      const stockValue = (item.stock || 0) * (item.purchase_price || 0);
      const isLow = (item.stock || 0) < 10;
      return (
        <View style={[styles.listItem, { backgroundColor: colors.card, ...shadows.sm }]}>
          <View style={styles.listItemMain}>
            <Text style={[styles.listItemTitle, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.listItemSub, { color: colors.textSecondary }]}>{item.sku || item.hsn_code}</Text>
          </View>
          <View style={styles.listItemRight}>
            <Text style={[styles.listItemAmount, { color: isLow ? '#EF4444' : colors.text }]}>{item.stock} {item.unit}</Text>
            <Text style={[styles.listItemDate, { color: colors.textSecondary }]}>{formatCurrency(stockValue)}</Text>
          </View>
        </View>
      );
    }

    if (reportKey === 'outstanding') {
      return (
        <View style={[styles.listItem, { backgroundColor: colors.card, ...shadows.sm }]}>
          <View style={styles.listItemMain}>
            <Text style={[styles.listItemTitle, { color: colors.text }]}>{item.customers?.name}</Text>
            <Text style={[styles.listItemSub, { color: colors.textSecondary }]}>{item.invoice_number}</Text>
          </View>
          <View style={styles.listItemRight}>
            <Text style={[styles.listItemAmount, { color: '#EF4444' }]}>{formatCurrency(item.balance)}</Text>
            <Text style={[styles.listItemDate, { color: colors.textSecondary }]}>Due: {formatDate(item.due_date)}</Text>
          </View>
        </View>
      );
    }

    if (reportKey === 'party-profit') {
      return (
        <View style={[styles.listItem, { backgroundColor: colors.card, ...shadows.sm }]}>
          <View style={styles.listItemMain}>
            <Text style={[styles.listItemTitle, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.listItemSub, { color: colors.textSecondary }]}>{item.invoiceCount} invoices</Text>
          </View>
          <View style={styles.listItemRight}>
            <Text style={[styles.listItemAmount, { color: '#10B981' }]}>{formatCurrency(item.revenue)}</Text>
          </View>
        </View>
      );
    }

    if (reportKey === 'profit-loss') {
      const isProfit = item.type === 'Net Profit';
      const isPositive = item.amount >= 0;
      return (
        <View style={[styles.listItem, { backgroundColor: colors.card, ...shadows.sm }]}>
          <Text style={[styles.listItemTitle, { color: colors.text, flex: 1 }]}>{item.type}</Text>
          <Text style={[
            styles.listItemAmount, 
            { color: isProfit ? (isPositive ? '#10B981' : '#EF4444') : colors.text, fontWeight: isProfit ? '700' : '600' }
          ]}>
            {formatCurrency(item.amount)}
          </Text>
        </View>
      );
    }

    return (
      <View style={[styles.listItem, { backgroundColor: colors.card, ...shadows.sm }]}>
        <Text style={[styles.listItemTitle, { color: colors.text }]}>{JSON.stringify(item).slice(0, 50)}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[config.color, config.color]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Ionicons name={config.icon} size={22} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>{config.title}</Text>
        </View>
        <View style={styles.headerRight} />
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={config.color} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item, idx) => item.id || idx.toString()}
          renderItem={renderItem}
          ListHeaderComponent={Object.keys(summary).length > 0 ? renderSummaryCard : null}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No data available</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 40 },
  headerContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerRight: { width: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16 },
  summaryCard: { borderRadius: 12, padding: 16, marginBottom: 16, flexDirection: 'row', flexWrap: 'wrap' },
  summaryItem: { width: '50%', paddingVertical: 8 },
  summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  summaryValue: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 4 },
  listItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 10 },
  listItemMain: { flex: 1 },
  listItemTitle: { fontSize: 15, fontWeight: '600' },
  listItemSub: { fontSize: 13, marginTop: 2 },
  listItemRight: { alignItems: 'flex-end' },
  listItemAmount: { fontSize: 15, fontWeight: '600' },
  listItemDate: { fontSize: 12, marginTop: 2 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, marginTop: 12 },
});
