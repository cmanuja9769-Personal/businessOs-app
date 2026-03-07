import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import { useFocusRefresh } from '@hooks/useFocusRefresh';
import { SkeletonDashboard } from '@components/ui/Skeleton';
import Card from '@components/ui/Card';
import { supabase } from '@lib/supabase';
import { formatCurrency, formatCompactCurrency, formatDate } from '@lib/utils';
import { lightTap, mediumTap } from '@lib/haptics';

const { width } = Dimensions.get('window');
const STAT_CARD_WIDTH = (width - 52) / 2;
const OUT_OF_STOCK_TEXT = 'Out of stock';

type DashboardNavigationParams =
  | [screen: string]
  | [screen: string, params: { screen?: string; params?: Record<string, unknown> }];

interface DashboardNavigator {
  navigate: (...args: DashboardNavigationParams) => void;
  goBack: () => void;
}

interface DashboardStats {
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  totalSalesAmount: number;
  totalOutstanding: number;
  totalPurchases: number;
  totalPurchaseAmount: number;
  totalItems: number;
  lowStockCount: number;
  totalStockValue: number;
  totalCustomers: number;
  totalSuppliers: number;
  todaySales: number;
  todayInvoiceCount: number;
  monthSales: number;
  monthInvoiceCount: number;
}

interface RecentInvoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  total: number;
  status: string;
  created_at: string;
}

interface RecentPurchase {
  id: string;
  purchase_number: string;
  supplier_name: string;
  total: number;
  status: string;
  created_at: string;
}

interface LowStockItem {
  id: string;
  name: string;
  current_stock: number;
  min_stock: number;
  unit: string;
}

const INITIAL_STATS: DashboardStats = {
  totalInvoices: 0,
  paidInvoices: 0,
  pendingInvoices: 0,
  overdueInvoices: 0,
  totalSalesAmount: 0,
  totalOutstanding: 0,
  totalPurchases: 0,
  totalPurchaseAmount: 0,
  totalItems: 0,
  lowStockCount: 0,
  totalStockValue: 0,
  totalCustomers: 0,
  totalSuppliers: 0,
  todaySales: 0,
  todayInvoiceCount: 0,
  monthSales: 0,
  monthInvoiceCount: 0,
};

const FAB_ACTIONS = [
  { key: 'invoice', label: 'New Invoice', icon: 'receipt-outline' as const, tab: 'InvoicesTab', screen: 'CreateInvoice' },
  { key: 'quotation', label: 'New Quotation', icon: 'document-text-outline' as const, tab: 'InvoicesTab', screen: 'CreateInvoice', params: { documentType: 'quotation' } },
  { key: 'customer', label: 'Add Party', icon: 'person-add-outline' as const, tab: 'CustomersTab', screen: 'AddCustomer' },
  { key: 'item', label: 'Add Item', icon: 'cube-outline' as const, tab: 'InventoryTab', screen: 'AddItem' },
] as const;

const QUICK_ACTIONS = [
  { key: 'invoice', label: 'Invoice', icon: 'receipt-outline' as const, color: '#4F46E5', tab: 'InvoicesTab', screen: 'CreateInvoice' },
  { key: 'purchase', label: 'Purchase', icon: 'cart-outline' as const, color: '#059669', tab: 'MoreTab', screen: 'Purchases' },
  { key: 'customer', label: 'Customer', icon: 'people-outline' as const, color: '#7C3AED', tab: 'CustomersTab', screen: 'AddCustomer' },
  { key: 'item', label: 'Item', icon: 'cube-outline' as const, color: '#0369A1', tab: 'InventoryTab', screen: 'AddItem' },
  { key: 'reports', label: 'Reports', icon: 'bar-chart-outline' as const, color: '#D97706', tab: 'MoreTab', screen: 'Reports' },
] as const;

function FABMenu({ navigation, colors, shadows }: {
  readonly navigation: DashboardNavigator;
  readonly colors: ReturnType<typeof useTheme>['colors'];
  readonly shadows: ReturnType<typeof useTheme>['shadows'];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rotateAnim = useMemo(() => new Animated.Value(0), []);
  const scaleAnim = useMemo(() => new Animated.Value(0), []);
  const opacityAnim = useMemo(() => new Animated.Value(0), []);

  const toggleMenu = () => {
    const toValue = isOpen ? 0 : 1;
    mediumTap();
    Animated.parallel([
      Animated.spring(rotateAnim, { toValue, useNativeDriver: true, friction: 5, tension: 40 }),
      Animated.spring(scaleAnim, { toValue, useNativeDriver: true, friction: 6, tension: 50 }),
      Animated.timing(opacityAnim, { toValue, duration: 200, useNativeDriver: true }),
    ]).start();
    setIsOpen(!isOpen);
  };

  const handleAction = (action: typeof FAB_ACTIONS[number]) => {
    toggleMenu();
    lightTap();
    setTimeout(() => {
      navigation.navigate(action.tab, {
        screen: action.screen,
        params: 'params' in action ? action.params : undefined,
      });
    }, 150);
  };

  const rotation = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });

  return (
    <>
      {isOpen && (
        <TouchableWithoutFeedback onPress={toggleMenu}>
          <Animated.View style={[fabStyles.backdrop, { opacity: opacityAnim }]} />
        </TouchableWithoutFeedback>
      )}
      <Animated.View
        style={[fabStyles.actionsContainer, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}
        pointerEvents={isOpen ? 'auto' : 'none'}
      >
        {FAB_ACTIONS.map((action) => (
          <Animated.View key={action.key} style={{ transform: [{ translateY: scaleAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }] }}>
            <TouchableOpacity style={fabStyles.actionItem} onPress={() => handleAction(action)} activeOpacity={0.8}>
              <View style={[fabStyles.actionLabel, { backgroundColor: colors.card, ...shadows.md }]}>
                <Text style={[fabStyles.actionLabelText, { color: colors.text }]}>{action.label}</Text>
              </View>
              <View style={[fabStyles.actionButton, { backgroundColor: colors.primary }]}>
                <Ionicons name={action.icon} size={22} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </Animated.View>
      <TouchableOpacity style={[fabStyles.fab, { backgroundColor: colors.primary, ...shadows.lg }]} onPress={toggleMenu} activeOpacity={0.9}>
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </Animated.View>
      </TouchableOpacity>
    </>
  );
}

const fabStyles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 998 },
  actionsContainer: { position: 'absolute', bottom: 100, right: 20, zIndex: 999 },
  actionItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 12 },
  actionLabel: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, marginRight: 12 },
  actionLabelText: { fontSize: 14, fontWeight: '600' },
  actionButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', bottom: 24, right: 20, zIndex: 1000, width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', elevation: 6 },
});

export default function DashboardScreen() {
  const navigation = useNavigation<DashboardNavigator>();
  const { colors, shadows, isDark } = useTheme();
  const { user, organizationId, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>(INITIAL_STATS);
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [recentPurchases, setRecentPurchases] = useState<RecentPurchase[]>([]);
  const [lowStockItemsList, setLowStockItemsList] = useState<LowStockItem[]>([]);
  const cancelledRef = useRef(false);
  const fetchRef = useRef<() => Promise<void>>();

  useFocusRefresh(useCallback(() => { fetchRef.current?.(); }, []));

  const fetchOrganizationName = useCallback(async () => {
    if (!organizationId) return;
    try {
      const res = await supabase.from('app_organizations').select('name').eq('id', organizationId).single();
      let data = res.data;
      if (res.error || !data) {
        const fallback = await supabase.from('organizations').select('name').eq('id', organizationId).single();
        data = fallback.data;
      }
      if (!cancelledRef.current && data?.name) setOrganizationName(data.name);
    } catch {
      // ignore
    }
  }, [organizationId]);

  const fetchDashboardData = useCallback(async () => {
    if (!organizationId) {
      if (!authLoading) console.warn('[DASHBOARD] No organizationId');
      setStats(INITIAL_STATS);
      setRecentInvoices([]);
      setRecentPurchases([]);
      setLowStockItemsList([]);
      setLoading(false);
      return;
    }

    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];

      const [invoicesRes, purchasesRes, itemsRes, customersRes, suppliersRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('id, invoice_number, customer_name, total, balance, status, invoice_date, created_at')
          .eq('organization_id', organizationId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(500),
        supabase
          .from('purchases')
          .select('id, purchase_number, supplier_name, total, balance, status, purchase_date, created_at')
          .eq('organization_id', organizationId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(500),
        supabase
          .from('items')
          .select('id, name, current_stock, min_stock, unit, sale_price')
          .eq('organization_id', organizationId)
          .is('deleted_at', null),
        supabase
          .from('customers')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .is('deleted_at', null),
        supabase
          .from('suppliers')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .is('deleted_at', null),
      ]);

      if (cancelledRef.current) return;

      const invoices = invoicesRes.data || [];
      const purchases = purchasesRes.data || [];
      const items = itemsRes.data || [];

      const totalInvoices = invoices.length;
      const paidInvoices = invoices.filter(i => i.status === 'paid').length;
      const pendingInvoices = invoices.filter(i => i.status === 'pending' || i.status === 'draft').length;
      const overdueInvoices = invoices.filter(i => i.status === 'overdue').length;
      const totalSalesAmount = invoices.reduce((s, i) => s + (i.total || 0), 0);
      const totalOutstanding = invoices.reduce((s, i) => s + (i.balance || 0), 0);

      const todayInvoices = invoices.filter(i => (i.invoice_date || i.created_at || '').startsWith(todayStr));
      const todaySales = todayInvoices.reduce((s, i) => s + (i.total || 0), 0);
      const monthInvoices = invoices.filter(i => (i.invoice_date || i.created_at || '') >= monthStart);
      const monthSales = monthInvoices.reduce((s, i) => s + (i.total || 0), 0);

      const totalPurchases = purchases.length;
      const totalPurchaseAmount = purchases.reduce((s, p) => s + (p.total || 0), 0);

      const lowStock = items.filter(i => (i.current_stock || 0) <= (i.min_stock || 0));
      const totalStockValue = items.reduce((s, i) => s + ((i.current_stock || 0) * (i.sale_price || 0)), 0);

      setStats({
        totalInvoices,
        paidInvoices,
        pendingInvoices,
        overdueInvoices,
        totalSalesAmount,
        totalOutstanding,
        totalPurchases,
        totalPurchaseAmount,
        totalItems: items.length,
        lowStockCount: lowStock.length,
        totalStockValue,
        totalCustomers: customersRes.count || 0,
        totalSuppliers: suppliersRes.count || 0,
        todaySales,
        todayInvoiceCount: todayInvoices.length,
        monthSales,
        monthInvoiceCount: monthInvoices.length,
      });

      setRecentInvoices(invoices.slice(0, 5).map(i => ({
        id: i.id,
        invoice_number: i.invoice_number,
        customer_name: i.customer_name || 'Unknown',
        total: i.total || 0,
        status: i.status,
        created_at: i.created_at,
      })));

      setRecentPurchases(purchases.slice(0, 5).map(p => ({
        id: p.id,
        purchase_number: p.purchase_number,
        supplier_name: p.supplier_name || 'Unknown',
        total: p.total || 0,
        status: p.status,
        created_at: p.created_at,
      })));

      setLowStockItemsList(lowStock.slice(0, 5).map(i => ({
        id: i.id,
        name: i.name,
        current_stock: i.current_stock || 0,
        min_stock: i.min_stock || 0,
        unit: i.unit || 'pcs',
      })));
    } catch (error) {
      console.error('[DASHBOARD] Error:', error);
    } finally {
      if (!cancelledRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [authLoading, organizationId]);

  const fetchAllData = useCallback(async () => {
    await Promise.all([fetchDashboardData(), fetchOrganizationName()]);
  }, [fetchDashboardData, fetchOrganizationName]);

  useEffect(() => {
    cancelledRef.current = false;
    fetchAllData();
    return () => { cancelledRef.current = true; };
  }, [fetchAllData]);

  fetchRef.current = fetchDashboardData;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRef.current?.();
  }, []);

  const getUserName = () => {
    if (organizationName) return organizationName;
    return user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';
  };

  const nav = navigation;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
        <SkeletonDashboard />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>{getUserName()}</Text>
          </View>
          <TouchableOpacity
            style={[styles.profileButton, { backgroundColor: colors.primaryLight }]}
            onPress={() => nav.navigate('MoreTab', { screen: 'Profile' })}
          >
            <Ionicons name="person" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        contentContainerStyle={styles.scrollContent}
      >
        <Card style={styles.actionsPanel}>
          <Text style={[styles.sectionTitleInCard, { color: colors.text }]}>Quick Actions</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionsRow}>
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.key}
                style={styles.quickAction}
                onPress={() => { lightTap(); nav.navigate(action.tab, { screen: action.screen }); }}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: action.color + '15' }]}>
                  <Ionicons name={action.icon} size={22} color={action.color} />
                </View>
                <Text style={[styles.quickActionLabel, { color: colors.text }]}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Card>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Overview</Text>
        </View>
        <View style={styles.statsGrid}>
          <StatCard icon="calendar-outline" color="#059669" label="Today's Sales" value={formatCompactCurrency(stats.todaySales)} subtitle={`${stats.todayInvoiceCount} invoices`} colors={colors} onPress={() => nav.navigate('InvoicesTab')} />
          <StatCard icon="trending-up-outline" color="#0284C7" label="This Month" value={formatCompactCurrency(stats.monthSales)} subtitle={`${stats.monthInvoiceCount} invoices`} colors={colors} onPress={() => nav.navigate('InvoicesTab')} />
          <StatCard icon="cash-outline" color="#16A34A" label="Total Sales" value={formatCompactCurrency(stats.totalSalesAmount)} subtitle={`${stats.totalInvoices} invoices`} colors={colors} onPress={() => nav.navigate('InvoicesTab')} />
          <StatCard icon="alert-circle-outline" color="#D97706" label="Outstanding" value={formatCompactCurrency(stats.totalOutstanding)} subtitle={`${stats.pendingInvoices} pending`} colors={colors} onPress={() => nav.navigate('InvoicesTab')} />
          <StatCard icon="cart-outline" color="#2563EB" label="Purchases" value={formatCompactCurrency(stats.totalPurchaseAmount)} subtitle={`${stats.totalPurchases} orders`} colors={colors} onPress={() => nav.navigate('MoreTab', { screen: 'Purchases' })} />
          <StatCard icon="cube-outline" color="#7C3AED" label="Inventory" value={`${stats.totalItems} items`} subtitle={`Value: ${formatCompactCurrency(stats.totalStockValue)}`} colors={colors} onPress={() => nav.navigate('InventoryTab')} />
        </View>

        <View style={styles.kpiRow}>
          <MiniKpi icon="checkmark-circle-outline" color="#059669" value={stats.paidInvoices} label="Paid" colors={colors} />
          <MiniKpi icon="time-outline" color="#D97706" value={stats.pendingInvoices} label="Pending" colors={colors} />
          <MiniKpi icon="people-outline" color="#0284C7" value={stats.totalCustomers} label="Customers" colors={colors} />
          <MiniKpi icon="briefcase-outline" color="#7C3AED" value={stats.totalSuppliers} label="Suppliers" colors={colors} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Invoices</Text>
          <TouchableOpacity onPress={() => nav.navigate('InvoicesTab')} style={styles.seeAllButton}>
            <Text style={[styles.seeAllText, { color: colors.primary }]}>See All</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.listSection}>
          {recentInvoices.length === 0 ? (
            <Card style={styles.emptyCard}>
              <View style={[styles.emptyIconBg, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="document-text-outline" size={28} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No invoices yet</Text>
              <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>Create your first invoice to get started</Text>
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                onPress={() => nav.navigate('InvoicesTab', { screen: 'CreateInvoice' })}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.emptyBtnText}>Create Invoice</Text>
              </TouchableOpacity>
            </Card>
          ) : (
            recentInvoices.map((inv) => (
              <Card key={inv.id} style={styles.listItem} onPress={() => nav.navigate('InvoicesTab', { screen: 'InvoiceDetail', params: { invoiceId: inv.id } })}>
                <View style={styles.listItemRow}>
                  <View style={[styles.listItemIcon, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="document-text" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.listItemInfo}>
                    <Text style={[styles.listItemTitle, { color: colors.text }]} numberOfLines={1}>{inv.customer_name}</Text>
                    <Text style={[styles.listItemSub, { color: colors.textSecondary }]}>{inv.invoice_number} · {formatDate(inv.created_at)}</Text>
                  </View>
                  <View style={styles.listItemRight}>
                    <Text style={[styles.listItemAmount, { color: colors.text }]}>{formatCurrency(inv.total)}</Text>
                    <StatusBadge status={inv.status} />
                  </View>
                </View>
              </Card>
            ))
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Purchases</Text>
          <TouchableOpacity onPress={() => nav.navigate('MoreTab', { screen: 'Purchases' })} style={styles.seeAllButton}>
            <Text style={[styles.seeAllText, { color: colors.primary }]}>See All</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.listSection}>
          {recentPurchases.length === 0 ? (
            <Card style={styles.emptyCard}>
              <View style={[styles.emptyIconBg, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="cart-outline" size={28} color="#2563EB" />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No purchases yet</Text>
              <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>Record purchases to track expenses</Text>
            </Card>
          ) : (
            recentPurchases.map((p) => (
              <Card key={p.id} style={styles.listItem} onPress={() => nav.navigate('MoreTab', { screen: 'PurchaseDetail', params: { purchaseId: p.id } })}>
                <View style={styles.listItemRow}>
                  <View style={[styles.listItemIcon, { backgroundColor: '#DBEAFE' }]}>
                    <Ionicons name="cart" size={18} color="#2563EB" />
                  </View>
                  <View style={styles.listItemInfo}>
                    <Text style={[styles.listItemTitle, { color: colors.text }]} numberOfLines={1}>{p.supplier_name}</Text>
                    <Text style={[styles.listItemSub, { color: colors.textSecondary }]}>{p.purchase_number} · {formatDate(p.created_at)}</Text>
                  </View>
                  <View style={styles.listItemRight}>
                    <Text style={[styles.listItemAmount, { color: colors.text }]}>{formatCurrency(p.total)}</Text>
                    <StatusBadge status={p.status} />
                  </View>
                </View>
              </Card>
            ))
          )}
        </View>

        {lowStockItemsList.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Low Stock Alert</Text>
              <View style={[styles.alertBadge, { backgroundColor: '#FEE2E2' }]}>
                <Text style={styles.alertBadgeText}>{stats.lowStockCount}</Text>
              </View>
            </View>
            <View style={styles.listSection}>
              {lowStockItemsList.map((item) => (
                <Card key={item.id} style={styles.listItem} onPress={() => nav.navigate('InventoryTab')}>
                  <View style={styles.listItemRow}>
                    <View style={[styles.listItemIcon, { backgroundColor: '#FEE2E2' }]}>
                      <Ionicons name="alert-circle" size={18} color="#DC2626" />
                    </View>
                    <View style={styles.listItemInfo}>
                      <Text style={[styles.listItemTitle, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                      <Text style={[styles.listItemSub, { color: colors.textSecondary }]}>Min: {item.min_stock} {item.unit}</Text>
                    </View>
                    <View style={styles.listItemRight}>
                      <Text style={[styles.stockValue, { color: item.current_stock === 0 ? '#DC2626' : '#D97706' }]}>
                        {item.current_stock} {item.unit}
                      </Text>
                      {item.current_stock === 0 && (
                        <View style={[styles.statusBadge, { backgroundColor: '#FEE2E2' }]}>
                          <Text style={[styles.statusText, { color: '#DC2626' }]}>{OUT_OF_STOCK_TEXT}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          </>
        )}

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Business Summary</Text>
        </View>
        <Card style={styles.summaryCard}>
          <SummaryRow label="Total Sales" value={formatCurrency(stats.totalSalesAmount)} color="#059669" textSecondary={colors.textSecondary} textColor={colors.text} />
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <SummaryRow label="Total Purchases" value={formatCurrency(stats.totalPurchaseAmount)} color="#2563EB" textSecondary={colors.textSecondary} textColor={colors.text} />
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <SummaryRow label="Outstanding" value={formatCurrency(stats.totalOutstanding)} color="#D97706" textSecondary={colors.textSecondary} textColor={colors.text} />
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <SummaryRow
            label="Net"
            value={formatCurrency(stats.totalSalesAmount - stats.totalPurchaseAmount)}
            color={stats.totalSalesAmount >= stats.totalPurchaseAmount ? '#059669' : '#DC2626'}
            textSecondary={colors.textSecondary}
            textColor={colors.text}
            bold
          />
        </Card>

        <View style={{ height: 120 }} />
      </ScrollView>

      <FABMenu navigation={navigation} colors={colors} shadows={shadows} />
    </View>
  );
}

function StatCard({ icon, color, label, value, subtitle, colors, onPress }: {
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly color: string;
  readonly label: string;
  readonly value: string;
  readonly subtitle: string;
  readonly colors: { card: string; text: string; textSecondary: string };
  readonly onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.statCard, { backgroundColor: colors.card, width: STAT_CARD_WIDTH }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={[styles.statIconBg, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.statSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

function MiniKpi({ icon, color, value, label, colors }: {
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly color: string;
  readonly value: number;
  readonly label: string;
  readonly colors: { card: string; text: string; textSecondary: string };
}) {
  return (
    <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
      <View style={[styles.kpiIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={14} color={color} />
      </View>
      <Text style={[styles.kpiValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function StatusBadge({ status }: { readonly status: string }) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    paid: { bg: '#D1FAE5', text: '#059669' },
    pending: { bg: '#FEF3C7', text: '#D97706' },
    draft: { bg: '#F3F4F6', text: '#6B7280' },
    overdue: { bg: '#FEE2E2', text: '#DC2626' },
    partial: { bg: '#FEF3C7', text: '#D97706' },
    unpaid: { bg: '#FEE2E2', text: '#DC2626' },
  };
  const { bg, text } = colorMap[status] || { bg: '#F3F4F6', text: '#6B7280' };
  return (
    <View style={[styles.statusBadge, { backgroundColor: bg }]}>
      <Text style={[styles.statusText, { color: text }]}>{status}</Text>
    </View>
  );
}

function SummaryRow({ label, value, color, textSecondary, textColor, bold }: {
  readonly label: string;
  readonly value: string;
  readonly color: string;
  readonly textSecondary: string;
  readonly textColor: string;
  readonly bold?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: textSecondary }, bold && { fontWeight: '700', color: textColor }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color }, bold && { fontSize: 16 }]}>{value}</Text>
    </View>
  );
}

const JUSTIFY_SPACE_BETWEEN = 'space-between' as const;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 60,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerContent: { flexDirection: 'row', justifyContent: JUSTIFY_SPACE_BETWEEN, alignItems: 'center' },
  headerTextContainer: { flex: 1, marginRight: 16 },
  userName: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  profileButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingTop: 4 },

  actionsPanel: { marginHorizontal: 16, marginBottom: 20, padding: 16 },
  sectionTitleInCard: { fontSize: 15, fontWeight: '700', marginBottom: 14 },
  actionsRow: { gap: 16 },
  quickAction: { alignItems: 'center', width: 68 },
  quickActionIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  quickActionLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  sectionHeader: { flexDirection: 'row', justifyContent: JUSTIFY_SPACE_BETWEEN, alignItems: 'center', paddingHorizontal: 16, marginBottom: 12, marginTop: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  seeAllButton: { flexDirection: 'row', alignItems: 'center' },
  seeAllText: { fontSize: 13, fontWeight: '600' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  statCard: {
    padding: 14,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  statIconBg: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3, marginBottom: 2 },
  statSubtitle: { fontSize: 11 },

  kpiRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 20 },
  kpiCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    gap: 6,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  kpiIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  kpiValue: { fontSize: 15, fontWeight: '700' },
  kpiLabel: { fontSize: 10, flex: 1 },

  listSection: { paddingHorizontal: 16, marginBottom: 16 },
  listItem: { marginBottom: 8, padding: 12 },
  listItemRow: { flexDirection: 'row', alignItems: 'center' },
  listItemIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  listItemInfo: { flex: 1, marginRight: 8 },
  listItemTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  listItemSub: { fontSize: 12 },
  listItemRight: { alignItems: 'flex-end' },
  listItemAmount: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  stockValue: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  alertBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  alertBadgeText: { fontSize: 12, fontWeight: '700', color: '#DC2626' },

  emptyCard: { padding: 28, alignItems: 'center' },
  emptyIconBg: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  emptyDesc: { fontSize: 13, textAlign: 'center', marginBottom: 16 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, gap: 6 },
  emptyBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  summaryCard: { marginHorizontal: 16, padding: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: JUSTIFY_SPACE_BETWEEN, alignItems: 'center', paddingVertical: 10 },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: '700' },
  summaryDivider: { height: StyleSheet.hairlineWidth },
});
