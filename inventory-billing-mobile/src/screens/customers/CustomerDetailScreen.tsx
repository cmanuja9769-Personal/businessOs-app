import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Linking,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import Loading from '@components/ui/Loading';
import { spacing, fontSize, borderRadius } from '@theme/spacing';
import { supabase } from '@lib/supabase';
import { formatCurrency, formatDate } from '@lib/utils';
import { CustomerDetailRouteProp } from '@navigation/types';
import { lightTap } from '@lib/haptics';

const { width: _screenWidth } = Dimensions.get('window');
const JUSTIFY_SPACE_BETWEEN = 'space-between';

type DbCustomer = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  gst_number?: string | null;
  created_at?: string;
  gstin?: string | null;
  billing_address?: string | null;
};

type DbInvoice = {
  id: string;
  invoice_number?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  total?: number | null;
  paid_amount?: number | null;
  balance?: number | null;
  status?: string | null;
  items?: unknown;
  created_at?: string | null;
};

type AgingData = {
  current: number;
  days30: number;
  days60: number;
  days90: number;
  over90: number;
};

function getInvoiceBalance(invoice: DbInvoice): number {
  if (invoice.balance !== null && invoice.balance !== undefined) {
    return Number(invoice.balance);
  }

  return Number(invoice.total || 0) - Number(invoice.paid_amount || 0);
}

function getInvoiceDueDate(invoice: DbInvoice): Date {
  if (invoice.due_date) return new Date(invoice.due_date);
  return new Date(invoice.invoice_date || invoice.created_at || '');
}

function getAgingBucket(daysDiff: number): keyof AgingData {
  if (daysDiff <= 0) return 'current';
  if (daysDiff <= 30) return 'days30';
  if (daysDiff <= 60) return 'days60';
  if (daysDiff <= 90) return 'days90';
  return 'over90';
}

function calculateAgingData(invoices: DbInvoice[]): AgingData {
  const now = new Date();
  const aging: AgingData = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };

  for (const invoice of invoices) {
    const balance = getInvoiceBalance(invoice);
    if (balance <= 0) continue;

    const daysDiff = Math.floor((now.getTime() - getInvoiceDueDate(invoice).getTime()) / (1000 * 60 * 60 * 24));
    aging[getAgingBucket(daysDiff)] += balance;
  }

  return aging;
}

async function fetchCustomerDetailData(organizationId: string, customerId: string) {
  return Promise.all([
    supabase
      .from('customers')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('id', customerId)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase
      .from('invoices')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('customer_id', customerId)
      .is('deleted_at', null)
      .order('invoice_date', { ascending: false }),
    supabase
      .from('payments')
      .select('id, amount, payment_date, payment_mode, reference_number')
      .eq('organization_id', organizationId)
      .eq('customer_id', customerId)
      .is('deleted_at', null)
      .order('payment_date', { ascending: false }),
  ]);
}

function getStatusBg(status: string): string {
  if (status === 'paid') return '#10B98120';
  if (status === 'pending') return '#F59E0B20';
  return '#EF444420';
}

function getStatusColor(status: string): string {
  if (status === 'paid') return '#10B981';
  if (status === 'pending') return '#F59E0B';
  return '#EF4444';
}

export default function CustomerDetailScreen() {
  const route = useRoute<CustomerDetailRouteProp>();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { organizationId } = useAuth();
  const { customerId } = route.params;

  const [customer, setCustomer] = useState<DbCustomer | null>(null);
  const [invoices, setInvoices] = useState<DbInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'aging' | 'payments'>('overview');
  const [payments, setPayments] = useState<{ id: string; amount: number; payment_date: string; payment_mode: string; reference_number?: string }[]>([]);
  const [agingData, setAgingData] = useState<AgingData>({ current: 0, days30: 0, days60: 0, days90: 0, over90: 0 });

  const cancelledRef = useRef(false);

  const fetchAll = async () => {
    try {
      if (!organizationId) {
        setCustomer(null);
        setInvoices([]);
        return;
      }

      const [customerRes, invoicesRes, paymentsRes] = await fetchCustomerDetailData(organizationId, customerId);

      if (cancelledRef.current) return;

      if (customerRes.error) throw customerRes.error;
      if (invoicesRes.error) throw invoicesRes.error;

      setCustomer((customerRes.data as DbCustomer) ?? null);
      const invoiceRows = (invoicesRes.data as DbInvoice[]) ?? [];
      setInvoices(invoiceRows);
      setPayments((paymentsRes.data || []) as { id: string; amount: number; payment_date: string; payment_mode: string; reference_number?: string }[]);
      setAgingData(calculateAgingData(invoiceRows));
    } catch (error) {
      console.error('[CUSTOMER_DETAIL] fetchAll error:', error);
    } finally {
      if (!cancelledRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    cancelledRef.current = false;
    fetchAll();
    return () => { cancelledRef.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, customerId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  const summary = useMemo(() => {
    const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0);
    const totalBalance = invoices.reduce((sum, inv) => {
      const total = Number(inv.total || 0);
      const paid = Number(inv.paid_amount || 0);
      const balance = inv.balance === null || inv.balance === undefined ? total - paid : Number(inv.balance || 0);
      return sum + balance;
    }, 0);

    return {
      totalInvoiced,
      totalPaid,
      totalBalance,
      invoicesCount: invoices.length,
    };
  }, [invoices]);

  const handleCall = () => {
    if (customer?.phone) {
      Linking.openURL(`tel:${customer.phone}`);
    }
  };

  const handleEmail = () => {
    if (customer?.email) {
      Linking.openURL(`mailto:${customer.email}`);
    }
  };

  if (loading) return <Loading fullScreen />;

  if (!customer) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Customer not found</Text>
      </View>
    );
  }

  const customerPhone = customer.phone ?? null;
  const customerEmail = customer.email ?? null;
  const customerAddress = (customer as DbCustomer & { address?: string }).address ?? customer.billing_address ?? null;
  const customerGstin = (customer as DbCustomer & { gst_number?: string }).gst_number ?? customer.gstin ?? null;

  const TabButton = ({ id, label }: { id: 'overview' | 'invoices' | 'aging' | 'payments', label: string }) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        activeTab === id && { borderBottomColor: colors.primary, borderBottomWidth: 2 }
      ]}
      onPress={() => { lightTap(); setActiveTab(id); }}
    >
      <Text style={[
        styles.tabLabel,
        { color: activeTab === id ? colors.primary : colors.textMuted }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderOverviewTab = () => (
    <View style={styles.overviewContainer}>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Spent</Text>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {formatCurrency(summary.totalPaid)}
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Outstanding</Text>
          <Text style={[styles.statValue, { color: colors.warning }]}>
            {formatCurrency(summary.totalBalance)}
          </Text>
        </View>
      </View>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Invoices</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{summary.invoicesCount}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Invoiced</Text>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {formatCurrency(summary.totalInvoiced)}
          </Text>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Details</Text>

        <View style={styles.detailItem}>
          <View style={styles.detailIcon}>
            <Ionicons name="location" size={20} color={colors.textMuted} />
          </View>
          <View style={styles.detailContent}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Address</Text>
            <Text style={[styles.detailText, { color: colors.text }]}>
              {customerAddress || 'No address provided'}
            </Text>
          </View>
        </View>

        <View style={styles.detailItem}>
          <View style={styles.detailIcon}>
            <Ionicons name="document-text" size={20} color={colors.textMuted} />
          </View>
          <View style={styles.detailContent}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>GSTIN</Text>
            <Text style={[styles.detailText, { color: colors.text }]}>
              {customerGstin || 'Not registered'}
            </Text>
          </View>
        </View>

        {customer.created_at && (
          <View style={styles.detailItem}>
            <View style={styles.detailIcon}>
              <Ionicons name="calendar" size={20} color={colors.textMuted} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Customer Since</Text>
              <Text style={[styles.detailText, { color: colors.text }]}>
                {formatDate(customer.created_at)}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  const renderAgingTab = () => (
    <View style={styles.agingContainer}>
      <View style={[styles.agingCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Receivables Aging</Text>
        {[
          { label: 'Current (Not Due)', value: agingData.current, color: '#10B981' },
          { label: '1-30 Days', value: agingData.days30, color: '#F59E0B' },
          { label: '31-60 Days', value: agingData.days60, color: '#F97316' },
          { label: '61-90 Days', value: agingData.days90, color: '#EF4444' },
          { label: '90+ Days', value: agingData.over90, color: '#DC2626' },
        ].map(bucket => (
          <View key={bucket.label} style={styles.agingRow}>
            <View style={styles.agingLabelRow}>
              <View style={[styles.agingDot, { backgroundColor: bucket.color }]} />
              <Text style={[styles.agingLabel, { color: colors.text }]}>{bucket.label}</Text>
            </View>
            <Text style={[styles.agingValue, { color: bucket.value > 0 ? bucket.color : colors.textSecondary }]}>
              {formatCurrency(bucket.value)}
            </Text>
          </View>
        ))}
        <View style={[styles.agingTotalRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.agingTotalLabel, { color: colors.text }]}>Total Outstanding</Text>
          <Text style={[styles.agingTotalValue, { color: colors.warning }]}>
            {formatCurrency(agingData.current + agingData.days30 + agingData.days60 + agingData.days90 + agingData.over90)}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderPaymentsTab = () => (
    <View style={styles.invoicesContainer}>
      {payments.length === 0 ? (
        <View style={styles.emptyPayments}>
          <Ionicons name="cash-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyPaymentsText, { color: colors.textMuted }]}>No payments recorded</Text>
        </View>
      ) : (
        payments.map((pmt) => (
          <View key={pmt.id} style={[styles.invoiceItem, { backgroundColor: colors.card }]}>
            <View style={styles.invoiceLeft}>
              <Text style={[styles.invoiceNumber, { color: colors.text }]}>
                {formatCurrency(pmt.amount)}
              </Text>
              <Text style={[styles.invoiceDate, { color: colors.textMuted }]}>
                {formatDate(pmt.payment_date)}
              </Text>
            </View>
            <View style={styles.invoiceRight}>
              <View style={[styles.statusBadge, { backgroundColor: '#10B98120' }]}>
                <Text style={[styles.statusText, { color: '#10B981' }]}>
                  {pmt.payment_mode || 'cash'}
                </Text>
              </View>
              {pmt.reference_number && (
                <Text style={[styles.invoiceDate, { color: colors.textMuted }]}>Ref: {pmt.reference_number}</Text>
              )}
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderInvoicesTab = () => (
    <View style={styles.invoicesContainer}>
      <TouchableOpacity
        style={[styles.createButton, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('InvoicesTab', {
          screen: 'CreateInvoice',
          params: { customerId: customer.id },
        })}
      >
        <Ionicons name="add" size={24} color="#FFF" />
        <Text style={styles.createButtonText}>Create New Invoice</Text>
      </TouchableOpacity>

      {invoices.map((inv) => (
        <TouchableOpacity
          key={inv.id}
          style={[styles.invoiceItem, { backgroundColor: colors.card }]}
          onPress={() => navigation.navigate('InvoicesTab', {
            screen: 'InvoiceDetail',
            params: { invoiceId: inv.id },
          })}
        >
          <View style={styles.invoiceLeft}>
            <Text style={[styles.invoiceNumber, { color: colors.text }]}>
              {inv.invoice_number || 'Draft'}
            </Text>
            <Text style={[styles.invoiceDate, { color: colors.textMuted }]}>
              {formatDate(inv.invoice_date || inv.created_at || '')}
            </Text>
          </View>
          <View style={styles.invoiceRight}>
            <Text style={[styles.invoiceAmount, { color: colors.text }]}>
              {formatCurrency(inv.total || 0)}
            </Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: getStatusBg(inv.status ?? '') }
            ]}>
              <Text style={[
                styles.statusText,
                { color: getStatusColor(inv.status ?? '') }
              ]}>
                {inv.status}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderActiveTab = () => {
    if (activeTab === 'overview') return renderOverviewTab();
    if (activeTab === 'aging') return renderAgingTab();
    if (activeTab === 'payments') return renderPaymentsTab();
    return renderInvoicesTab();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.editButton, { backgroundColor: colors.primary + '10' }]}
            onPress={() => navigation.navigate('AddCustomer', { customerId: customer.id })}
          >
            <Text style={[styles.editText, { color: colors.primary }]}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profileSection}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>
              {customer.name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
          <Text style={[styles.customerName, { color: colors.text }]}>{customer.name}</Text>
          <View style={styles.contactRow}>
            {customerPhone && (
              <TouchableOpacity style={[styles.contactChip, { backgroundColor: colors.success + '15' }]} onPress={handleCall}>
                <Ionicons name="call" size={16} color={colors.success} />
                <Text style={[styles.contactText, { color: colors.success }]}>{customerPhone}</Text>
              </TouchableOpacity>
            )}
            {customerEmail && (
              <TouchableOpacity style={[styles.contactChip, { backgroundColor: colors.primary + '15' }]} onPress={handleEmail}>
                <Ionicons name="mail" size={16} color={colors.primary} />
                <Text style={[styles.contactText, { color: colors.primary }]}>{customerEmail}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.tabs}>
          <TabButton id="overview" label="Overview" />
          <TabButton id="invoices" label="Invoices" />
          <TabButton id="aging" label="Aging" />
          <TabButton id="payments" label="Payments" />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {renderActiveTab()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 40 : 60,
    paddingBottom: 0,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  backButton: {
    padding: spacing.xs,
  },
  editButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  editText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFF',
  },
  customerName: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  contactRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  contactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  contactText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  content: {
    padding: spacing.lg,
  },
  overviewContainer: {
    gap: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statLabel: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  section: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  detailIcon: {
    width: 32,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: fontSize.xs,
    marginBottom: 2,
  },
  detailText: {
    fontSize: fontSize.md,
  },
  invoicesContainer: {
    gap: spacing.md,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  createButtonText: {
    color: '#FFF',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  invoiceItem: {
    flexDirection: 'row',
    justifyContent: JUSTIFY_SPACE_BETWEEN,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  invoiceLeft: {
    gap: 4,
  },
  invoiceNumber: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  invoiceDate: {
    fontSize: fontSize.sm,
  },
  invoiceRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  invoiceAmount: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  agingContainer: {
    gap: spacing.md,
  },
  agingCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  agingRow: {
    flexDirection: 'row',
    justifyContent: JUSTIFY_SPACE_BETWEEN,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  agingLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  agingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  agingLabel: {
    fontSize: fontSize.md,
  },
  agingValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  agingTotalRow: {
    flexDirection: 'row',
    justifyContent: JUSTIFY_SPACE_BETWEEN,
    alignItems: 'center',
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 1,
  },
  agingTotalLabel: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  agingTotalValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  emptyPayments: {
    alignItems: 'center',
    paddingTop: 40,
    gap: spacing.sm,
  },
  emptyPaymentsText: {
    fontSize: fontSize.md,
  },
});
