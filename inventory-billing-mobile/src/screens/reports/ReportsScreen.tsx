import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MoreStackNavigationProp } from '@navigation/types';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import Card from '@components/ui/Card';
import { supabase } from '@lib/supabase';
import { formatCurrency } from '@lib/utils';

interface ReportCategory {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
  reports: ReportItem[];
}

interface ReportItem {
  key: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const REPORT_CATEGORIES: ReportCategory[] = [
  {
    title: 'Sales & Revenue',
    icon: 'trending-up-outline',
    gradient: ['#10B981', '#059669'],
    reports: [
      { key: 'sales', title: 'Sales Report', description: 'Invoice-wise sales summary', icon: 'receipt-outline' },
      { key: 'party-profit', title: 'Party Profit', description: 'Profit by customer', icon: 'people-outline' },
      { key: 'item-profit', title: 'Item Profit', description: 'Profit by product', icon: 'cube-outline' },
    ],
  },
  {
    title: 'Purchases & Expenses',
    icon: 'cart-outline',
    gradient: ['#6366F1', '#4F46E5'],
    reports: [
      { key: 'purchases', title: 'Purchases Report', description: 'Purchase-wise summary', icon: 'cart-outline' },
      { key: 'expenses', title: 'Expenses Report', description: 'Expense tracking', icon: 'wallet-outline' },
    ],
  },
  {
    title: 'Inventory & Stock',
    icon: 'cube-outline',
    gradient: ['#F59E0B', '#D97706'],
    reports: [
      { key: 'stock-summary', title: 'Stock Summary', description: 'Current stock levels', icon: 'layers-outline' },
      { key: 'stock-detail', title: 'Stock Detail', description: 'Item-wise stock details', icon: 'list-outline' },
      { key: 'low-stock', title: 'Low Stock Alert', description: 'Items below min stock', icon: 'alert-circle-outline' },
    ],
  },
  {
    title: 'Receivables & Payables',
    icon: 'cash-outline',
    gradient: ['#EF4444', '#DC2626'],
    reports: [
      { key: 'outstanding', title: 'Outstanding Report', description: 'Pending payments', icon: 'time-outline' },
      { key: 'party-ledger', title: 'Party Ledger', description: 'Customer/Supplier ledger', icon: 'book-outline' },
    ],
  },
  {
    title: 'GST Reports',
    icon: 'document-text-outline',
    gradient: ['#8B5CF6', '#7C3AED'],
    reports: [
      { key: 'gstr-1', title: 'GSTR-1', description: 'Outward supplies', icon: 'arrow-up-circle-outline' },
      { key: 'gstr-2', title: 'GSTR-2', description: 'Inward supplies', icon: 'arrow-down-circle-outline' },
      { key: 'gstr-3b', title: 'GSTR-3B', description: 'Monthly summary', icon: 'documents-outline' },
    ],
  },
  {
    title: 'Financial Reports',
    icon: 'stats-chart-outline',
    gradient: ['#0EA5E9', '#0284C7'],
    reports: [
      { key: 'profit-loss', title: 'Profit & Loss', description: 'Income statement', icon: 'trending-up-outline' },
      { key: 'day-book', title: 'Day Book', description: 'Daily transactions', icon: 'calendar-outline' },
      { key: 'cash-flow', title: 'Cash Flow', description: 'Cash movement', icon: 'swap-horizontal-outline' },
    ],
  },
];

interface QuickStats {
  totalSales: number;
  totalPurchases: number;
  receivables: number;
  payables: number;
}

export default function ReportsScreen() {
  const navigation = useNavigation<MoreStackNavigationProp>();
  const { colors, isDark } = useTheme();
  const { organizationId } = useAuth();

  const [stats, setStats] = useState<QuickStats>({
    totalSales: 0,
    totalPurchases: 0,
    receivables: 0,
    payables: 0,
  });
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) return;

    const fetchStats = async () => {
      try {
        const [invoicesRes, purchasesRes] = await Promise.all([
          supabase
            .from('invoices')
            .select('total, balance')
            .eq('organization_id', organizationId)
            .is('deleted_at', null),
          supabase
            .from('purchases')
            .select('total, balance')
            .eq('organization_id', organizationId)
            .is('deleted_at', null),
        ]);

        const invoices = invoicesRes.data || [];
        const purchases = purchasesRes.data || [];

        setStats({
          totalSales: invoices.reduce((sum, i) => sum + (i.total || 0), 0),
          totalPurchases: purchases.reduce((sum, p) => sum + (p.total || 0), 0),
          receivables: invoices.reduce((sum, i) => sum + (i.balance || 0), 0),
          payables: purchases.reduce((sum, p) => sum + (p.balance || 0), 0),
        });
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    };

    fetchStats();
  }, [organizationId]);

  const handleReportPress = (reportKey: string) => {
    if (reportKey === 'party-ledger') {
      navigation.navigate('PartyLedger');
      return;
    }
    navigation.navigate('ReportDetail', { reportKey });
  };

  const toggleCategory = (title: string) => {
    setExpandedCategory(expandedCategory === title ? null : title);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.quickStats}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Ionicons name="arrow-up-circle-outline" size={20} color="#10B981" />
            <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>{formatCurrency(stats.totalSales)}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sales</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Ionicons name="arrow-down-circle-outline" size={20} color="#6366F1" />
            <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>{formatCurrency(stats.totalPurchases)}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Purchases</Text>
          </View>
        </View>
        <View style={styles.quickStats}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Ionicons name="time-outline" size={20} color="#F59E0B" />
            <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>{formatCurrency(stats.receivables)}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Receivables</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Ionicons name="wallet-outline" size={20} color="#EF4444" />
            <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>{formatCurrency(stats.payables)}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Payables</Text>
          </View>
        </View>

        {REPORT_CATEGORIES.map(category => (
          <Card key={category.title} style={styles.categoryCard}>
            <TouchableOpacity
              style={styles.categoryHeader}
              onPress={() => toggleCategory(category.title)}
            >
              <LinearGradient colors={category.gradient} style={styles.categoryIcon}>
                <Ionicons name={category.icon} size={18} color="#fff" />
              </LinearGradient>
              <Text style={[styles.categoryTitle, { color: colors.text }]}>{category.title}</Text>
              <Ionicons
                name={expandedCategory === category.title ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {expandedCategory === category.title && (
              <View style={styles.reportsContainer}>
                {category.reports.map(report => (
                  <TouchableOpacity
                    key={report.key}
                    style={[styles.reportItem, { borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}
                    onPress={() => handleReportPress(report.key)}
                  >
                    <View style={[styles.reportIconPill, { backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(79,70,229,0.08)' }]}>
                      <Ionicons name={report.icon} size={18} color={colors.primary} />
                    </View>
                    <View style={styles.reportInfo}>
                      <Text style={[styles.reportTitle, { color: colors.text }]}>{report.title}</Text>
                      <Text style={[styles.reportDesc, { color: colors.textSecondary }]}>{report.description}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Card>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 16 },
  quickStats: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center', gap: 4, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
  statValue: { fontSize: 14, fontWeight: '700' },
  statLabel: { fontSize: 11 },
  categoryCard: { marginBottom: 12 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  categoryIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  categoryTitle: { flex: 1, fontSize: 16, fontWeight: '600', marginLeft: 12 },
  reportsContainer: { paddingHorizontal: 16, paddingBottom: 8 },
  reportItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, gap: 12 },
  reportIconPill: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  reportInfo: { flex: 1 },
  reportTitle: { fontSize: 15, fontWeight: '500' },
  reportDesc: { fontSize: 12, marginTop: 2 },
});
