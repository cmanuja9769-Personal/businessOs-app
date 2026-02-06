import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MoreStackNavigationProp } from '@navigation/types';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import { supabase } from '@lib/supabase';
import { formatCurrency } from '@lib/utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FinancialData {
  revenue: number;
  expenses: number;
  receivables: number;
  payables: number;
  cashInHand: number;
  bankBalance: number;
  inventory: number;
}

type TabType = 'summary' | 'balance-sheet' | 'profit-loss' | 'cash-flow';

export default function AccountingScreen() {
  const navigation = useNavigation<MoreStackNavigationProp>();
  const { colors, shadows } = useTheme();
  const { organizationId } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FinancialData>({
    revenue: 0,
    expenses: 0,
    receivables: 0,
    payables: 0,
    cashInHand: 0,
    bankBalance: 0,
    inventory: 0,
  });

  useEffect(() => {
    loadFinancialData();
  }, [organizationId]);

  const loadFinancialData = async () => {
    if (!organizationId) return;
    setLoading(true);

    try {
      const [invoicesRes, purchasesRes, itemsRes, paymentsRes] = await Promise.all([
        supabase.from('invoices').select('total, balance').eq('organization_id', organizationId),
        supabase.from('purchases').select('total, balance').eq('organization_id', organizationId),
        supabase.from('items').select('stock, purchase_price').eq('organization_id', organizationId),
        supabase.from('payments').select('amount, payment_method').eq('organization_id', organizationId),
      ]);

      const invoices = invoicesRes.data || [];
      const purchases = purchasesRes.data || [];
      const items = itemsRes.data || [];
      const payments = paymentsRes.data || [];

      const revenue = invoices.reduce((sum, i) => sum + (i.total || 0), 0);
      const expenses = purchases.reduce((sum, p) => sum + (p.total || 0), 0);
      const receivables = invoices.reduce((sum, i) => sum + (i.balance || 0), 0);
      const payables = purchases.reduce((sum, p) => sum + (p.balance || 0), 0);
      const inventory = items.reduce((sum, i) => sum + ((i.stock || 0) * (i.purchase_price || 0)), 0);

      const cashPayments = payments.filter(p => p.payment_method === 'cash').reduce((sum, p) => sum + (p.amount || 0), 0);
      const bankPayments = payments.filter(p => ['bank', 'upi'].includes(p.payment_method)).reduce((sum, p) => sum + (p.amount || 0), 0);

      setData({
        revenue,
        expenses,
        receivables,
        payables,
        cashInHand: cashPayments,
        bankBalance: bankPayments,
        inventory,
      });
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs: { key: TabType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'summary', label: 'Summary', icon: 'pie-chart-outline' },
    { key: 'balance-sheet', label: 'Balance Sheet', icon: 'document-text-outline' },
    { key: 'profit-loss', label: 'P&L', icon: 'trending-up-outline' },
    { key: 'cash-flow', label: 'Cash Flow', icon: 'swap-horizontal-outline' },
  ];

  const netProfit = data.revenue - data.expenses;
  const totalAssets = data.receivables + data.cashInHand + data.bankBalance + data.inventory;
  const totalLiabilities = data.payables;
  const equity = totalAssets - totalLiabilities;

  const renderSummary = () => (
    <View style={styles.section}>
      <View style={styles.metricsGrid}>
        <View style={[styles.metricCard, { backgroundColor: '#10B981' }]}>
          <Ionicons name="arrow-up-circle-outline" size={28} color="#fff" />
          <Text style={styles.metricLabel}>Revenue</Text>
          <Text style={styles.metricValue}>{formatCurrency(data.revenue)}</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: '#EF4444' }]}>
          <Ionicons name="arrow-down-circle-outline" size={28} color="#fff" />
          <Text style={styles.metricLabel}>Expenses</Text>
          <Text style={styles.metricValue}>{formatCurrency(data.expenses)}</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: netProfit >= 0 ? '#0EA5E9' : '#F59E0B' }]}>
          <Ionicons name="trending-up-outline" size={28} color="#fff" />
          <Text style={styles.metricLabel}>Net Profit</Text>
          <Text style={styles.metricValue}>{formatCurrency(netProfit)}</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: '#8B5CF6' }]}>
          <Ionicons name="cube-outline" size={28} color="#fff" />
          <Text style={styles.metricLabel}>Inventory</Text>
          <Text style={styles.metricValue}>{formatCurrency(data.inventory)}</Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, ...shadows.sm }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Quick Ratios</Text>
        <View style={styles.ratioRow}>
          <Text style={[styles.ratioLabel, { color: colors.textSecondary }]}>Profit Margin</Text>
          <Text style={[styles.ratioValue, { color: colors.text }]}>
            {data.revenue > 0 ? ((netProfit / data.revenue) * 100).toFixed(1) : 0}%
          </Text>
        </View>
        <View style={styles.ratioRow}>
          <Text style={[styles.ratioLabel, { color: colors.textSecondary }]}>Current Ratio</Text>
          <Text style={[styles.ratioValue, { color: colors.text }]}>
            {data.payables > 0 ? (totalAssets / data.payables).toFixed(2) : 'N/A'}
          </Text>
        </View>
        <View style={styles.ratioRow}>
          <Text style={[styles.ratioLabel, { color: colors.textSecondary }]}>Debt to Equity</Text>
          <Text style={[styles.ratioValue, { color: colors.text }]}>
            {equity > 0 ? (totalLiabilities / equity).toFixed(2) : 'N/A'}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderBalanceSheet = () => (
    <View style={styles.section}>
      <View style={[styles.card, { backgroundColor: colors.card, ...shadows.sm }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Assets</Text>
        <View style={styles.lineItem}>
          <Text style={[styles.lineLabel, { color: colors.textSecondary }]}>Cash in Hand</Text>
          <Text style={[styles.lineValue, { color: colors.text }]}>{formatCurrency(data.cashInHand)}</Text>
        </View>
        <View style={styles.lineItem}>
          <Text style={[styles.lineLabel, { color: colors.textSecondary }]}>Bank Balance</Text>
          <Text style={[styles.lineValue, { color: colors.text }]}>{formatCurrency(data.bankBalance)}</Text>
        </View>
        <View style={styles.lineItem}>
          <Text style={[styles.lineLabel, { color: colors.textSecondary }]}>Accounts Receivable</Text>
          <Text style={[styles.lineValue, { color: colors.text }]}>{formatCurrency(data.receivables)}</Text>
        </View>
        <View style={styles.lineItem}>
          <Text style={[styles.lineLabel, { color: colors.textSecondary }]}>Inventory</Text>
          <Text style={[styles.lineValue, { color: colors.text }]}>{formatCurrency(data.inventory)}</Text>
        </View>
        <View style={[styles.lineItem, styles.totalRow]}>
          <Text style={[styles.lineLabel, { color: colors.text, fontWeight: '700' }]}>Total Assets</Text>
          <Text style={[styles.lineValue, { color: colors.primary, fontWeight: '700' }]}>{formatCurrency(totalAssets)}</Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, ...shadows.sm }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Liabilities</Text>
        <View style={styles.lineItem}>
          <Text style={[styles.lineLabel, { color: colors.textSecondary }]}>Accounts Payable</Text>
          <Text style={[styles.lineValue, { color: colors.text }]}>{formatCurrency(data.payables)}</Text>
        </View>
        <View style={[styles.lineItem, styles.totalRow]}>
          <Text style={[styles.lineLabel, { color: colors.text, fontWeight: '700' }]}>Total Liabilities</Text>
          <Text style={[styles.lineValue, { color: '#EF4444', fontWeight: '700' }]}>{formatCurrency(totalLiabilities)}</Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, ...shadows.sm }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Equity</Text>
        <View style={[styles.lineItem, styles.totalRow]}>
          <Text style={[styles.lineLabel, { color: colors.text, fontWeight: '700' }]}>Owner's Equity</Text>
          <Text style={[styles.lineValue, { color: '#10B981', fontWeight: '700' }]}>{formatCurrency(equity)}</Text>
        </View>
      </View>
    </View>
  );

  const renderProfitLoss = () => (
    <View style={styles.section}>
      <View style={[styles.card, { backgroundColor: colors.card, ...shadows.sm }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Income Statement</Text>
        
        <View style={styles.lineItem}>
          <Text style={[styles.lineLabel, { color: colors.textSecondary }]}>Sales Revenue</Text>
          <Text style={[styles.lineValue, { color: '#10B981' }]}>{formatCurrency(data.revenue)}</Text>
        </View>
        
        <View style={[styles.lineItem, { marginTop: 16 }]}>
          <Text style={[styles.lineLabel, { color: colors.text, fontWeight: '600' }]}>Cost of Goods Sold</Text>
        </View>
        <View style={styles.lineItem}>
          <Text style={[styles.lineLabel, { color: colors.textSecondary, marginLeft: 16 }]}>Purchases</Text>
          <Text style={[styles.lineValue, { color: '#EF4444' }]}>({formatCurrency(data.expenses)})</Text>
        </View>
        
        <View style={[styles.lineItem, styles.totalRow, { marginTop: 16 }]}>
          <Text style={[styles.lineLabel, { color: colors.text, fontWeight: '700' }]}>Gross Profit</Text>
          <Text style={[styles.lineValue, { color: netProfit >= 0 ? '#10B981' : '#EF4444', fontWeight: '700' }]}>
            {formatCurrency(netProfit)}
          </Text>
        </View>

        <View style={[styles.profitIndicator, { backgroundColor: netProfit >= 0 ? '#D1FAE5' : '#FEE2E2', marginTop: 20 }]}>
          <Ionicons 
            name={netProfit >= 0 ? 'trending-up' : 'trending-down'} 
            size={24} 
            color={netProfit >= 0 ? '#10B981' : '#EF4444'} 
          />
          <Text style={[styles.profitText, { color: netProfit >= 0 ? '#10B981' : '#EF4444' }]}>
            {netProfit >= 0 ? 'Profit' : 'Loss'}: {formatCurrency(Math.abs(netProfit))}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderCashFlow = () => {
    const operatingCashFlow = data.revenue - data.expenses + (data.receivables * -1) + data.payables;
    
    return (
      <View style={styles.section}>
        <View style={[styles.card, { backgroundColor: colors.card, ...shadows.sm }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Operating Activities</Text>
          <View style={styles.lineItem}>
            <Text style={[styles.lineLabel, { color: colors.textSecondary }]}>Net Income</Text>
            <Text style={[styles.lineValue, { color: colors.text }]}>{formatCurrency(netProfit)}</Text>
          </View>
          <View style={styles.lineItem}>
            <Text style={[styles.lineLabel, { color: colors.textSecondary }]}>Change in Receivables</Text>
            <Text style={[styles.lineValue, { color: '#EF4444' }]}>({formatCurrency(data.receivables)})</Text>
          </View>
          <View style={styles.lineItem}>
            <Text style={[styles.lineLabel, { color: colors.textSecondary }]}>Change in Payables</Text>
            <Text style={[styles.lineValue, { color: '#10B981' }]}>{formatCurrency(data.payables)}</Text>
          </View>
          <View style={[styles.lineItem, styles.totalRow]}>
            <Text style={[styles.lineLabel, { color: colors.text, fontWeight: '700' }]}>Operating Cash Flow</Text>
            <Text style={[styles.lineValue, { color: colors.primary, fontWeight: '700' }]}>{formatCurrency(operatingCashFlow)}</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, ...shadows.sm }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Cash Position</Text>
          <View style={styles.lineItem}>
            <Text style={[styles.lineLabel, { color: colors.textSecondary }]}>Cash in Hand</Text>
            <Text style={[styles.lineValue, { color: colors.text }]}>{formatCurrency(data.cashInHand)}</Text>
          </View>
          <View style={styles.lineItem}>
            <Text style={[styles.lineLabel, { color: colors.textSecondary }]}>Bank Balance</Text>
            <Text style={[styles.lineValue, { color: colors.text }]}>{formatCurrency(data.bankBalance)}</Text>
          </View>
          <View style={[styles.lineItem, styles.totalRow]}>
            <Text style={[styles.lineLabel, { color: colors.text, fontWeight: '700' }]}>Total Cash</Text>
            <Text style={[styles.lineValue, { color: '#10B981', fontWeight: '700' }]}>
              {formatCurrency(data.cashInHand + data.bankBalance)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#4F46E5', '#6366F1']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Accounting</Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && { backgroundColor: colors.primary },
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons 
                name={tab.icon} 
                size={16} 
                color={activeTab === tab.key ? '#fff' : colors.textSecondary} 
              />
              <Text style={[
                styles.tabText,
                { color: activeTab === tab.key ? '#fff' : colors.textSecondary },
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'summary' && renderSummary()}
        {activeTab === 'balance-sheet' && renderBalanceSheet()}
        {activeTab === 'profit-loss' && renderProfitLoss()}
        {activeTab === 'cash-flow' && renderCashFlow()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 40 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center' },
  headerRight: { width: 40 },
  tabContainer: { backgroundColor: 'transparent' },
  tabScroll: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 6 },
  tabText: { fontSize: 13, fontWeight: '500' },
  content: { flex: 1 },
  section: { padding: 16 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  metricCard: { width: (SCREEN_WIDTH - 44) / 2, padding: 16, borderRadius: 12 },
  metricLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 8 },
  metricValue: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 4 },
  card: { borderRadius: 12, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  lineItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  lineLabel: { fontSize: 14 },
  lineValue: { fontSize: 14, fontWeight: '500' },
  totalRow: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.1)', marginTop: 8, paddingTop: 12 },
  ratioRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  ratioLabel: { fontSize: 14 },
  ratioValue: { fontSize: 14, fontWeight: '600' },
  profitIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, gap: 10 },
  profitText: { fontSize: 18, fontWeight: '700' },
});
