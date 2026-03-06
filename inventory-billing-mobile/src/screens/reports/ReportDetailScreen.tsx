import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MoreStackParamList, MoreStackNavigationProp } from '@navigation/types';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import { supabase } from '@lib/supabase';
import { formatCurrency, formatDate } from '@lib/utils';
import { exportToMobileCSV, exportToMobilePDF } from '@lib/mobile-export';

type RouteProps = RouteProp<MoreStackParamList, 'ReportDetail'>;

interface ReportConfig {
  title: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const STOCK_SUMMARY = 'stock-summary';
const STOCK_DETAIL = 'stock-detail';
const PARTY_PROFIT = 'party-profit';
const PROFIT_LOSS = 'profit-loss';

const REPORT_CONFIG: Record<string, ReportConfig> = {
  sales: { title: 'Sales Report', color: '#10B981', icon: 'receipt-outline' },
  [PARTY_PROFIT]: { title: 'Party Profit', color: '#10B981', icon: 'people-outline' },
  'item-profit': { title: 'Item Profit', color: '#10B981', icon: 'cube-outline' },
  purchases: { title: 'Purchases Report', color: '#6366F1', icon: 'cart-outline' },
  expenses: { title: 'Expenses Report', color: '#6366F1', icon: 'wallet-outline' },
  [STOCK_SUMMARY]: { title: 'Stock Summary', color: '#F59E0B', icon: 'layers-outline' },
  [STOCK_DETAIL]: { title: 'Stock Detail', color: '#F59E0B', icon: 'list-outline' },
  'low-stock': { title: 'Low Stock Alert', color: '#F59E0B', icon: 'alert-circle-outline' },
  outstanding: { title: 'Outstanding Report', color: '#EF4444', icon: 'time-outline' },
  'party-ledger': { title: 'Party Ledger', color: '#EF4444', icon: 'book-outline' },
  'gstr-1': { title: 'GSTR-1 Report', color: '#8B5CF6', icon: 'arrow-up-circle-outline' },
  'gstr-2': { title: 'GSTR-2 Report', color: '#8B5CF6', icon: 'arrow-down-circle-outline' },
  'gstr-3b': { title: 'GSTR-3B Summary', color: '#8B5CF6', icon: 'documents-outline' },
  [PROFIT_LOSS]: { title: 'Profit & Loss', color: '#0EA5E9', icon: 'trending-up-outline' },
  'day-book': { title: 'Day Book', color: '#0EA5E9', icon: 'calendar-outline' },
  'cash-flow': { title: 'Cash Flow', color: '#0EA5E9', icon: 'swap-horizontal-outline' },
};

const str = (val: unknown): string => String(val ?? '');
const num = (val: unknown): number => Number(val) || 0;
const nested = (val: unknown): Record<string, unknown> | null =>
  typeof val === 'object' && val !== null ? (val as Record<string, unknown>) : null;

export default function ReportDetailScreen() {
  const navigation = useNavigation<MoreStackNavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors, shadows } = useTheme();
  const { organizationId } = useAuth();

  const { reportKey } = route.params;
  const config = REPORT_CONFIG[reportKey] || { title: 'Report', color: '#6366F1', icon: 'document-outline' };

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [exporting, setExporting] = useState(false);

  const getExportColumns = useCallback((): { key: string; header: string; format?: (v: unknown) => string }[] => {
    switch (reportKey) {
      case 'sales':
        return [
          { key: 'invoice_number', header: 'Invoice No' },
          { key: '_customer', header: 'Customer', format: (v) => String(v ?? '') },
          { key: 'total', header: 'Total', format: (v) => Number(v ?? 0).toFixed(2) },
          { key: 'balance', header: 'Balance', format: (v) => Number(v ?? 0).toFixed(2) },
          { key: 'created_at', header: 'Date', format: (v) => v ? formatDate(String(v)) : '' },
        ];
      case 'purchases':
        return [
          { key: 'purchase_number', header: 'Purchase No' },
          { key: '_supplier', header: 'Supplier', format: (v) => String(v ?? '') },
          { key: 'total', header: 'Total', format: (v) => Number(v ?? 0).toFixed(2) },
          { key: 'balance', header: 'Balance', format: (v) => Number(v ?? 0).toFixed(2) },
          { key: 'created_at', header: 'Date', format: (v) => v ? formatDate(String(v)) : '' },
        ];
      case STOCK_SUMMARY:
      case STOCK_DETAIL:
        return [
          { key: 'name', header: 'Item Name' },
          { key: 'item_code', header: 'Item Code' },
          { key: 'current_stock', header: 'Current Stock', format: (v) => String(v ?? 0) },
          { key: 'unit', header: 'Unit' },
          { key: 'purchase_price', header: 'Purchase Price', format: (v) => Number(v ?? 0).toFixed(2) },
          { key: '_value', header: 'Stock Value', format: (v) => Number(v ?? 0).toFixed(2) },
        ];
      case 'low-stock':
        return [
          { key: 'name', header: 'Item Name' },
          { key: 'current_stock', header: 'Stock', format: (v) => String(v ?? 0) },
          { key: 'unit', header: 'Unit' },
        ];
      case 'outstanding':
        return [
          { key: '_customer', header: 'Customer', format: (v) => String(v ?? '') },
          { key: 'invoice_number', header: 'Invoice No' },
          { key: 'balance', header: 'Outstanding', format: (v) => Number(v ?? 0).toFixed(2) },
          { key: 'due_date', header: 'Due Date', format: (v) => v ? formatDate(String(v)) : '' },
        ];
      case PARTY_PROFIT:
        return [
          { key: 'name', header: 'Customer' },
          { key: 'invoiceCount', header: 'Invoices', format: (v) => String(v ?? 0) },
          { key: 'revenue', header: 'Revenue', format: (v) => Number(v ?? 0).toFixed(2) },
        ];
      case PROFIT_LOSS:
        return [
          { key: 'type', header: 'Type' },
          { key: 'amount', header: 'Amount', format: (v) => Number(v ?? 0).toFixed(2) },
        ];
      default:
        return [
          { key: 'name', header: 'Name' },
          { key: 'total', header: 'Total', format: (v) => Number(v ?? 0).toFixed(2) },
        ];
    }
  }, [reportKey]);

  const prepareExportData = useCallback((): Record<string, unknown>[] => {
    return data.map((item) => {
      const row = { ...item };
      const customers = item.customers as Record<string, unknown> | null;
      const suppliers = item.suppliers as Record<string, unknown> | null;
      if (customers) row._customer = customers.name;
      if (suppliers) row._supplier = suppliers.name;
      if (item.current_stock !== undefined && item.purchase_price !== undefined) {
        row._value = Number(item.current_stock ?? 0) * Number(item.purchase_price ?? 0);
      }
      return row;
    });
  }, [data]);

  const handleExportCSV = useCallback(async () => {
    if (data.length === 0) return;
    setExporting(true);
    try {
      const columns = getExportColumns();
      const exportData = prepareExportData();
      await exportToMobileCSV(
        `${reportKey}-report`,
        columns,
        exportData,
        config.title,
      );
    } catch (error) {
      Alert.alert('Export Failed', error instanceof Error ? error.message : 'Could not export');
    } finally {
      setExporting(false);
    }
  }, [data, reportKey, config.title, getExportColumns, prepareExportData]);

  const handleExportPDF = useCallback(async () => {
    if (data.length === 0) return;
    setExporting(true);
    try {
      const columns = getExportColumns();
      const exportData = prepareExportData().map((row) => {
        const formatted: Record<string, unknown> = {};
        for (const col of columns) {
          formatted[col.key] = col.format ? col.format(row[col.key]) : row[col.key];
        }
        return formatted;
      });
      await exportToMobilePDF(
        `${reportKey}-report`,
        config.title,
        columns,
        exportData,
      );
    } catch (error) {
      Alert.alert('Export Failed', error instanceof Error ? error.message : 'Could not export');
    } finally {
      setExporting(false);
    }
  }, [data, reportKey, config.title, getExportColumns, prepareExportData]);

  useEffect(() => {
    const loadSalesReport = async () => {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('*, customers(name)')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
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
        .is('deleted_at', null)
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
        .is('deleted_at', null)
        .order('name');

      const totalValue = (items || []).reduce((sum, i) => sum + ((i.current_stock || 0) * (i.purchase_price || 0)), 0);
      const totalItems = items?.length || 0;

      setData(items || []);
      setSummary({ totalValue, totalItems });
    };

    const loadLowStockReport = async () => {
      const { data: items } = await supabase
        .from('items')
        .select('*')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .lt('current_stock', 10)
        .order('current_stock');

      setData(items || []);
      setSummary({ count: items?.length || 0 });
    };

    const loadOutstandingReport = async () => {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('*, customers(name)')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
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
        .eq('organization_id', organizationId)
        .is('deleted_at', null);

      const { data: invoices } = await supabase
        .from('invoices')
        .select('customer_id, total, subtotal')
        .eq('organization_id', organizationId)
        .is('deleted_at', null);

      const customerRevenueMap = new Map<string, { revenue: number; invoiceCount: number }>();
      for (const inv of (invoices || [])) {
        const entry = customerRevenueMap.get(inv.customer_id) || { revenue: 0, invoiceCount: 0 };
        entry.revenue += inv.total || 0;
        entry.invoiceCount += 1;
        customerRevenueMap.set(inv.customer_id, entry);
      }

      const partyData = (customers || [])
        .filter(c => customerRevenueMap.has(c.id) && customerRevenueMap.get(c.id)!.invoiceCount > 0)
        .map(c => {
          const stats = customerRevenueMap.get(c.id)!;
          return { ...c, revenue: stats.revenue, invoiceCount: stats.invoiceCount };
        })
        .sort((a, b) => b.revenue - a.revenue);

      setData(partyData);
      setSummary({ totalRevenue: partyData.reduce((sum, p) => sum + p.revenue, 0) });
    };

    const loadGSTReport = async () => {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('*')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .eq('gst_enabled', true);

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
        .eq('organization_id', organizationId)
        .is('deleted_at', null);

      const { data: purchases } = await supabase
        .from('purchases')
        .select('total')
        .eq('organization_id', organizationId)
        .is('deleted_at', null);

      const revenue = (invoices || []).reduce((sum, i) => sum + (i.total || 0), 0);
      const expense = (purchases || []).reduce((sum, p) => sum + (p.total || 0), 0);

      setData([
        { type: 'Revenue', amount: revenue },
        { type: 'Expenses', amount: expense },
        { type: 'Net Profit', amount: revenue - expense },
      ]);
      setSummary({ revenue, expense, profit: revenue - expense });
    };

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
          case STOCK_SUMMARY:
          case STOCK_DETAIL:
            await loadStockReport();
            break;
          case 'low-stock':
            await loadLowStockReport();
            break;
          case 'outstanding':
            await loadOutstandingReport();
            break;
          case PARTY_PROFIT:
            await loadPartyProfitReport();
            break;
          case 'gstr-1':
          case 'gstr-2':
          case 'gstr-3b':
            await loadGSTReport();
            break;
          case PROFIT_LOSS:
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
    loadReportData();
  }, [reportKey, organizationId]);

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

  const renderItem = ({ item }: { item: Record<string, unknown> }) => {
    if (reportKey === 'sales') {
      return (
        <View style={[styles.listItem, { backgroundColor: colors.card, ...shadows.sm }]}>
          <View style={styles.listItemMain}>
            <Text style={[styles.listItemTitle, { color: colors.text }]}>{str(item.invoice_number)}</Text>
            <Text style={[styles.listItemSub, { color: colors.textSecondary }]}>{str(nested(item.customers)?.name)}</Text>
          </View>
          <View style={styles.listItemRight}>
            <Text style={[styles.listItemAmount, { color: colors.text }]}>{formatCurrency(num(item.total))}</Text>
            <Text style={[styles.listItemDate, { color: colors.textSecondary }]}>{formatDate(str(item.created_at))}</Text>
          </View>
        </View>
      );
    }

    if (reportKey === 'purchases') {
      return (
        <View style={[styles.listItem, { backgroundColor: colors.card, ...shadows.sm }]}>
          <View style={styles.listItemMain}>
            <Text style={[styles.listItemTitle, { color: colors.text }]}>{str(item.purchase_number) || 'Purchase'}</Text>
            <Text style={[styles.listItemSub, { color: colors.textSecondary }]}>{str(nested(item.suppliers)?.name)}</Text>
          </View>
          <View style={styles.listItemRight}>
            <Text style={[styles.listItemAmount, { color: colors.text }]}>{formatCurrency(num(item.total))}</Text>
            <Text style={[styles.listItemDate, { color: colors.textSecondary }]}>{formatDate(str(item.created_at))}</Text>
          </View>
        </View>
      );
    }

    if (reportKey === STOCK_SUMMARY || reportKey === STOCK_DETAIL || reportKey === 'low-stock') {
      const stockValue = num(item.current_stock) * num(item.purchase_price);
      const isLow = num(item.current_stock) < 10;
      return (
        <View style={[styles.listItem, { backgroundColor: colors.card, ...shadows.sm }]}>
          <View style={styles.listItemMain}>
            <Text style={[styles.listItemTitle, { color: colors.text }]}>{str(item.name)}</Text>
            <Text style={[styles.listItemSub, { color: colors.textSecondary }]}>{str(item.item_code) || str(item.hsn)}</Text>
          </View>
          <View style={styles.listItemRight}>
            <Text style={[styles.listItemAmount, { color: isLow ? '#EF4444' : colors.text }]}>{str(item.current_stock)} {str(item.unit)}</Text>
            <Text style={[styles.listItemDate, { color: colors.textSecondary }]}>{formatCurrency(stockValue)}</Text>
          </View>
        </View>
      );
    }

    if (reportKey === 'outstanding') {
      return (
        <View style={[styles.listItem, { backgroundColor: colors.card, ...shadows.sm }]}>
          <View style={styles.listItemMain}>
            <Text style={[styles.listItemTitle, { color: colors.text }]}>{str(nested(item.customers)?.name)}</Text>
            <Text style={[styles.listItemSub, { color: colors.textSecondary }]}>{str(item.invoice_number)}</Text>
          </View>
          <View style={styles.listItemRight}>
            <Text style={[styles.listItemAmount, { color: '#EF4444' }]}>{formatCurrency(num(item.balance))}</Text>
            <Text style={[styles.listItemDate, { color: colors.textSecondary }]}>Due: {formatDate(str(item.due_date))}</Text>
          </View>
        </View>
      );
    }

    if (reportKey === PARTY_PROFIT) {
      return (
        <View style={[styles.listItem, { backgroundColor: colors.card, ...shadows.sm }]}>
          <View style={styles.listItemMain}>
            <Text style={[styles.listItemTitle, { color: colors.text }]}>{str(item.name)}</Text>
            <Text style={[styles.listItemSub, { color: colors.textSecondary }]}>{num(item.invoiceCount)} invoices</Text>
          </View>
          <View style={styles.listItemRight}>
            <Text style={[styles.listItemAmount, { color: '#10B981' }]}>{formatCurrency(num(item.revenue))}</Text>
          </View>
        </View>
      );
    }

    if (reportKey === PROFIT_LOSS) {
      const isProfit = item.type === 'Net Profit';
      const isPositive = num(item.amount) >= 0;
      const profitColor = () => {
        if (!isProfit) return colors.text;
        if (isPositive) return '#10B981';
        return '#EF4444';
      };
      return (
        <View style={[styles.listItem, { backgroundColor: colors.card, ...shadows.sm }]}>
          <Text style={[styles.listItemTitle, { color: colors.text, flex: 1 }]}>{str(item.type)}</Text>
          <Text style={[
            styles.listItemAmount, 
            { color: profitColor(), fontWeight: isProfit ? '700' : '600' }
          ]}>
            {formatCurrency(num(item.amount))}
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
        <View style={styles.headerActions}>
          {!loading && data.length > 0 && (
            <>
              <TouchableOpacity onPress={handleExportPDF} disabled={exporting} style={styles.headerActionBtn}>
                <Ionicons name="document-text-outline" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleExportCSV} disabled={exporting} style={styles.headerActionBtn}>
                <Ionicons name="download-outline" size={18} color="#fff" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={config.color} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item, idx) => String(item.id ?? idx)}
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
  headerActions: { flexDirection: 'row', alignItems: 'center', width: 60, justifyContent: 'flex-end' },
  headerActionBtn: { padding: 6, marginLeft: 4 },
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
