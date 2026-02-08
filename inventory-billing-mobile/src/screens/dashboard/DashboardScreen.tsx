import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import Loading from '@components/ui/Loading';
import { supabase } from '@lib/supabase';
import { formatCurrency, formatDate } from '@lib/utils';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48 - 12) / 2;

interface DashboardStats {
  totalInvoices: number;
  pendingInvoices: number;
  totalRevenue: number;
  lowStockItems: number;
  paidInvoices: number;
  totalCustomers: number;
}

interface RecentInvoice {
  id: string;
  invoice_number: string;
  total: number;
  status: string;
  created_at: string;
  customer?: { name: string };
}

// FAB Quick Action Menu Items
const FAB_ACTIONS = [
  { 
    key: 'invoice', 
    label: 'New Invoice', 
    icon: 'receipt-outline' as const, 
    gradient: ['#4F46E5', '#6366F1'],
    route: { tab: 'InvoicesTab', screen: 'CreateInvoice' }
  },
  { 
    key: 'quotation', 
    label: 'New Quotation', 
    icon: 'document-text-outline' as const, 
    gradient: ['#D97706', '#F59E0B'],
    route: { tab: 'InvoicesTab', screen: 'CreateInvoice', params: { documentType: 'quotation' } }
  },
  { 
    key: 'customer', 
    label: 'Add Party', 
    icon: 'person-add-outline' as const, 
    gradient: ['#059669', '#10B981'],
    route: { tab: 'CustomersTab', screen: 'AddCustomer' }
  },
  { 
    key: 'item', 
    label: 'Add Item', 
    icon: 'cube-outline' as const, 
    gradient: ['#0369A1', '#0EA5E9'],
    route: { tab: 'InventoryTab', screen: 'AddItem' }
  },
];

// Floating Action Button Component
function FABMenu({ navigation, colors, shadows, isDark }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const toggleMenu = () => {
    const toValue = isOpen ? 0 : 1;
    
    Animated.parallel([
      Animated.spring(rotateAnim, {
        toValue,
        useNativeDriver: true,
        friction: 5,
        tension: 40,
      }),
      Animated.spring(scaleAnim, {
        toValue,
        useNativeDriver: true,
        friction: 6,
        tension: 50,
      }),
      Animated.timing(opacityAnim, {
        toValue,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    
    setIsOpen(!isOpen);
  };

  const handleAction = (action: typeof FAB_ACTIONS[0]) => {
    toggleMenu();
    setTimeout(() => {
      navigation.navigate(action.route.tab, { 
        screen: action.route.screen,
        params: action.route.params,
      });
    }, 150);
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <TouchableWithoutFeedback onPress={toggleMenu}>
          <Animated.View 
            style={[
              fabStyles.backdrop,
              { opacity: opacityAnim }
            ]} 
          />
        </TouchableWithoutFeedback>
      )}
      
      {/* FAB Actions */}
      <Animated.View 
        style={[
          fabStyles.actionsContainer,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          }
        ]}
        pointerEvents={isOpen ? 'auto' : 'none'}
      >
        {FAB_ACTIONS.map((action, index) => (
          <Animated.View
            key={action.key}
            style={{
              transform: [{
                translateY: scaleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              }],
            }}
          >
            <TouchableOpacity
              style={fabStyles.actionItem}
              onPress={() => handleAction(action)}
              activeOpacity={0.8}
            >
              <View style={[
                fabStyles.actionLabel, 
                { backgroundColor: colors.card, ...shadows.md }
              ]}>
                <Text style={[fabStyles.actionLabelText, { color: colors.text }]}>
                  {action.label}
                </Text>
              </View>
              <LinearGradient
                colors={action.gradient}
                style={fabStyles.actionButton}
              >
                <Ionicons name={action.icon} size={22} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </Animated.View>
      
      {/* Main FAB */}
      <TouchableOpacity
        style={[
          fabStyles.fab,
          { ...shadows.lg }
        ]}
        onPress={toggleMenu}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#4F46E5', '#6366F1']}
          style={fabStyles.fabGradient}
        >
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </Animated.View>
        </LinearGradient>
      </TouchableOpacity>
    </>
  );
}

const fabStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 998,
  },
  actionsContainer: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 999,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  actionLabel: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  actionLabelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    zIndex: 1000,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { colors, shadows, isDark } = useTheme();
  const { user, organizationId, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalInvoices: 0,
    pendingInvoices: 0,
    totalRevenue: 0,
    lowStockItems: 0,
    paidInvoices: 0,
    totalCustomers: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const cancelledRef = useRef(false);
  const fetchDashboardDataRef = useRef<() => Promise<void>>();

  useEffect(() => {
    cancelledRef.current = false;
    fetchDashboardData();
    fetchOrganizationName();
    return () => { cancelledRef.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const fetchOrganizationName = async () => {
    if (!organizationId) return;
    
    try {
      // Try app_organizations first
      let { data, error } = await supabase
        .from('app_organizations')
        .select('name')
        .eq('id', organizationId)
        .single();

      // Fallback to organizations table
      if (error || !data) {
        const result = await supabase
          .from('organizations')
          .select('name')
          .eq('id', organizationId)
          .single();
        data = result.data;
      }

      if (cancelledRef.current) return;

      if (data?.name) {
        setOrganizationName(data.name);
      }
    } catch (e) {
      console.warn('[DASHBOARD] Failed to fetch org name:', e);
    }
  };

  const fetchDashboardData = async () => {
    try {
      if (!organizationId) {
        // Only warn if auth has finished loading (not during initial auth restore)
        if (!authLoading) {
          console.log('[DASHBOARD] No organizationId available, skipping fetch');
        }
        setStats({
          totalInvoices: 0,
          pendingInvoices: 0,
          totalRevenue: 0,
          lowStockItems: 0,
          paidInvoices: 0,
          totalCustomers: 0,
        });
        setRecentInvoices([]);
        setLoading(false);
        return;
      }

      // Fetch invoices for stats and recent list
      const { data: invoices, error: invoiceError } = await supabase
        .from('invoices')
        .select('id, invoice_number, total, status, created_at, customer:customers(name)')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (cancelledRef.current) return;

      if (!invoiceError && invoices) {
        const totalInvoices = invoices.length;
        const pendingInvoices = invoices.filter(
          (inv) => inv.status === 'pending' || inv.status === 'draft'
        ).length;
        const paidInvoices = invoices.filter((inv) => inv.status === 'paid').length;
        const totalRevenue = invoices
          .filter((inv) => inv.status === 'paid')
          .reduce((sum, inv) => sum + (inv.total || 0), 0);

        setStats((prev) => ({
          ...prev,
          totalInvoices,
          pendingInvoices,
          paidInvoices,
          totalRevenue,
        }));
        
        setRecentInvoices(invoices.slice(0, 5).map((inv) => ({
          ...inv,
          customer: Array.isArray(inv.customer) ? inv.customer[0] : inv.customer,
        })) as RecentInvoice[]);
      }

      // Fetch low stock items
      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('id, current_stock, min_stock')
        .eq('organization_id', organizationId);

      if (!itemsError && items) {
        const lowStockItems = items.filter(
          (item) => item.current_stock <= item.min_stock
        ).length;
        setStats((prev) => ({ ...prev, lowStockItems }));
      }

      // Fetch customers count
      const { count: customerCount } = await supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      setStats((prev) => ({ ...prev, totalCustomers: customerCount || 0 }));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      if (!cancelledRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  fetchDashboardDataRef.current = fetchDashboardData;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardDataRef.current?.();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getUserName = () => {
    // Show organization name if available, otherwise fall back to user name
    if (organizationName) return organizationName;
    return user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return colors.success;
      case 'pending': return colors.warning;
      case 'draft': return colors.textTertiary;
      case 'overdue': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'paid': return colors.successLight;
      case 'pending': return colors.warningLight;
      case 'draft': return isDark ? colors.surfaceElevated : '#F1F5F9';
      case 'overdue': return colors.errorLight;
      default: return colors.surfaceElevated;
    }
  };

  // Quick Action Button Component
  const QuickAction = ({ icon, label, onPress, gradientColors }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    gradientColors: [string, string];
  }) => (
    <TouchableOpacity 
      style={styles.quickActionWrapper}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.quickActionGradient}
      >
        <View style={styles.quickActionIconBg}>
          <Ionicons name={icon} size={22} color="#FFFFFF" />
        </View>
      </LinearGradient>
      <Text style={[styles.quickActionLabel, { color: colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );

  // Stat Card Component
  const StatCard = ({ label, value, icon, color, onPress }: {
    label: string;
    value: string | number;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity 
      style={[
        styles.statCard, 
        { 
          backgroundColor: colors.card,
          ...shadows.sm,
          width: CARD_WIDTH,
        }
      ]} 
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={[styles.statIconContainer, { backgroundColor: color + '12' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return <Loading fullScreen />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
        backgroundColor={colors.background}
      />
      
      {/* Header Section */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>
              {getGreeting()},
            </Text>
            <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
              {getUserName()}
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.profileButton, { backgroundColor: colors.primaryLight }]}
          onPress={() => navigation.navigate('MoreTab', { screen: 'Profile' })}
        >
          <Ionicons name="person" size={20} color={colors.primary} />
        </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Revenue Hero Card */}
        <LinearGradient
          colors={isDark ? ['#4338CA', '#6366F1'] : ['#4F46E5', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.revenueCard}
        >
          <View style={styles.revenueContent}>
            <View>
              <View style={styles.revenueLabelRow}>
                <View style={styles.revenueIconBg}>
                  <Ionicons name="wallet-outline" size={16} color="#FFFFFF" />
                </View>
                <Text style={styles.revenueLabel}>Total Revenue</Text>
              </View>
              <Text style={styles.revenueAmount}>{formatCurrency(stats.totalRevenue)}</Text>
              <View style={styles.revenueBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#34D399" />
                <Text style={styles.revenueBadgeText}>{stats.paidInvoices} paid invoices</Text>
              </View>
            </View>
            <View style={styles.revenueGraphic}>
              <View style={styles.revenueGraphicCircle}>
                <Ionicons name="trending-up" size={28} color="rgba(255,255,255,0.9)" />
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Stats Grid */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Overview</Text>
        </View>
        <View style={styles.statsGrid}>
          <StatCard 
            label="Total Invoices" 
            value={stats.totalInvoices} 
            icon="document-text-outline" 
            color="#4F46E5" 
            onPress={() => navigation.navigate('InvoicesTab')}
          />
          <StatCard 
            label="Pending" 
            value={stats.pendingInvoices} 
            icon="time-outline" 
            color="#F59E0B" 
            onPress={() => navigation.navigate('InvoicesTab')}
          />
          <StatCard 
            label="Low Stock" 
            value={stats.lowStockItems} 
            icon="alert-circle-outline" 
            color="#EF4444" 
            onPress={() => navigation.navigate('InventoryTab')}
          />
          <StatCard 
            label="Customers" 
            value={stats.totalCustomers}
            icon="people-outline" 
            color="#10B981" 
            onPress={() => navigation.navigate('CustomersTab')}
          />
        </View>

        {/* Recent Invoices */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Invoices</Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('InvoicesTab')}
            style={styles.seeAllButton}
          >
            <Text style={[styles.seeAllText, { color: colors.primary }]}>See All</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
          
        <View style={styles.recentContainer}>
          {recentInvoices.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.card, ...shadows.xs }]}>
              <View style={[styles.emptyIconContainer, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="document-text-outline" size={32} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No invoices yet</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Create your first invoice to get started
              </Text>
              <TouchableOpacity 
                style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('InvoicesTab', { screen: 'CreateInvoice' })}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.emptyButtonText}>Create Invoice</Text>
              </TouchableOpacity>
            </View>
          ) : (
            recentInvoices.map((invoice, index) => (
              <TouchableOpacity
                key={invoice.id}
                style={[
                  styles.invoiceItem, 
                  { 
                    backgroundColor: colors.card, 
                    ...shadows.xs,
                    marginBottom: index === recentInvoices.length - 1 ? 0 : 10,
                  }
                ]}
                onPress={() => navigation.navigate('InvoicesTab', { screen: 'InvoiceDetail', params: { invoiceId: invoice.id } })}
                activeOpacity={0.7}
              >
                <View style={styles.invoiceLeft}>
                  <View style={[styles.invoiceIcon, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="document-text" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.invoiceInfo}>
                    <Text style={[styles.invoiceCustomer, { color: colors.text }]} numberOfLines={1}>
                      {invoice.customer?.name || 'Unknown Customer'}
                    </Text>
                    <Text style={[styles.invoiceNumber, { color: colors.textSecondary }]}>
                      {invoice.invoice_number} • {formatDate(invoice.created_at)}
                    </Text>
                  </View>
                </View>
                <View style={styles.invoiceRight}>
                  <Text style={[styles.invoiceAmount, { color: colors.text }]}>
                    {formatCurrency(invoice.total || 0)}
                  </Text>
                  <View style={[
                    styles.statusBadge, 
                    { backgroundColor: getStatusBg(invoice.status) }
                  ]}>
                    <Text style={[
                      styles.statusText, 
                      { color: getStatusColor(invoice.status) }
                    ]}>
                      {invoice.status}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Bottom Spacing for FAB */}
        <View style={{ height: 120 }} />
      </ScrollView>
      
      {/* Floating Action Button */}
      <FABMenu 
        navigation={navigation} 
        colors={colors} 
        shadows={shadows}
        isDark={isDark}
      />
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
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingTop: 8,
  },
  
  // Revenue Card
  revenueCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
  },
  revenueContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  revenueLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  revenueIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  revenueLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '500',
  },
  revenueAmount: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1,
    marginBottom: 8,
  },
  revenueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  revenueBadgeText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  revenueGraphic: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  revenueGraphicCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    padding: 16,
    borderRadius: 16,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  
  // Quick Actions
  actionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 14,
  },
  quickActionWrapper: {
    alignItems: 'center',
    width: 80,
  },
  quickActionGradient: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionIconBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Recent Invoices
  recentContainer: {
    paddingHorizontal: 20,
  },
  invoiceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
  },
  invoiceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  invoiceIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceCustomer: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  invoiceNumber: {
    fontSize: 13,
  },
  invoiceRight: {
    alignItems: 'flex-end',
  },
  invoiceAmount: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  
  // Empty State
  emptyState: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
});
