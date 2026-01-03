import React, { useEffect, useMemo, useState } from 'react';
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
import { commonColors } from '@theme/colors';
import { supabase } from '@lib/supabase';
import { formatCurrency, formatDate } from '@lib/utils';
import { CustomerDetailRouteProp } from '@navigation/types';

const { width } = Dimensions.get('window');

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
};

export default function CustomerDetailScreen() {
  const route = useRoute<CustomerDetailRouteProp>();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { organizationId } = useAuth();
  const { customerId } = route.params;

  const [customer, setCustomer] = useState<DbCustomer | null>(null);
  const [invoices, setInvoices] = useState<DbInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices'>('overview');

  const fetchAll = async () => {
    try {
      if (!organizationId) {
        setCustomer(null);
        setInvoices([]);
        return;
      }

      const [customerRes, invoicesRes] = await Promise.all([
        supabase
          .from('customers')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('id', customerId)
          .maybeSingle(),
        supabase
          .from('invoices')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('customer_id', customerId)
          .order('invoice_date', { ascending: false }),
      ]);

      if (customerRes.error) throw customerRes.error;
      if (invoicesRes.error) throw invoicesRes.error;

      setCustomer((customerRes.data as any) ?? null);
      setInvoices((invoicesRes.data as any) ?? []);
    } catch (error) {
      console.error('[CUSTOMER_DETAIL] fetchAll error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAll();
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
  const customerAddress = (customer as any).address ?? customer.billing_address ?? null;
  const customerGstin = (customer as any).gst_number ?? customer.gstin ?? null;

  const TabButton = ({ id, label }: { id: 'overview' | 'invoices', label: string }) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        activeTab === id && { borderBottomColor: colors.primary, borderBottomWidth: 2 }
      ]}
      onPress={() => setActiveTab(id)}
    >
      <Text style={[
        styles.tabLabel,
        { color: activeTab === id ? colors.primary : colors.textDim }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
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
            <Text style={styles.avatarText}>{customer.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={[styles.customerName, { color: colors.text }]}>{customer.name}</Text>
          <View style={styles.contactRow}>
            {customerPhone && (
              <TouchableOpacity onPress={handleCall} style={[styles.contactChip, { backgroundColor: colors.background }]}>
                <Ionicons name="call" size={16} color={colors.primary} />
                <Text style={[styles.contactText, { color: colors.text }]}>{customerPhone}</Text>
              </TouchableOpacity>
            )}
            {customerEmail && (
              <TouchableOpacity onPress={handleEmail} style={[styles.contactChip, { backgroundColor: colors.background }]}>
                <Ionicons name="mail" size={16} color={colors.primary} />
                <Text style={[styles.contactText, { color: colors.text }]}>Email</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.tabs}>
          <TabButton id="overview" label="Overview" />
          <TabButton id="invoices" label={`Invoices (${invoices.length})`} />
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        {activeTab === 'overview' ? (
          <View style={styles.overviewContainer}>
            {/* Stats Cards */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.statLabel, { color: colors.textDim }]}>Total Spent</Text>
                <Text style={[styles.statValue, { color: colors.success }]}>
                  {formatCurrency(summary.totalPaid)}
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.statLabel, { color: colors.textDim }]}>Outstanding</Text>
                <Text style={[styles.statValue, { color: colors.warning }]}>
                  {formatCurrency(summary.totalBalance)}
                </Text>
              </View>
            </View>

            {/* Details Section */}
            <View style={[styles.section, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Details</Text>
              
              <View style={styles.detailItem}>
                <View style={styles.detailIcon}>
                  <Ionicons name="location" size={20} color={colors.textDim} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: colors.textDim }]}>Address</Text>
                  <Text style={[styles.detailText, { color: colors.text }]}>
                    {customerAddress || 'No address provided'}
                  </Text>
                </View>
              </View>

              <View style={styles.detailItem}>
                <View style={styles.detailIcon}>
                  <Ionicons name="document-text" size={20} color={colors.textDim} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: colors.textDim }]}>GSTIN</Text>
                  <Text style={[styles.detailText, { color: colors.text }]}>
                    {customerGstin || 'Not registered'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
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
                  <Text style={[styles.invoiceDate, { color: colors.textDim }]}>
                    {formatDate(inv.invoice_date || inv.created_at || '')}
                  </Text>
                </View>
                <View style={styles.invoiceRight}>
                  <Text style={[styles.invoiceAmount, { color: colors.text }]}>
                    {formatCurrency(inv.total || 0)}
                  </Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: inv.status === 'paid' ? '#10B98120' : inv.status === 'pending' ? '#F59E0B20' : '#EF444420' }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: inv.status === 'paid' ? '#10B981' : inv.status === 'pending' ? '#F59E0B' : '#EF4444' }
                    ]}>
                      {inv.status}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
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
    justifyContent: 'space-between',
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
});
