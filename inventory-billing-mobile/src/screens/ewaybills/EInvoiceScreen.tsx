import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import { useToast } from '@contexts/ToastContext';
import { supabase } from '@lib/supabase';
import { formatCurrency, formatDate } from '@lib/utils';
import { lightTap, successFeedback, errorFeedback } from '@lib/haptics';

type EInvoiceStatus = 'pending' | 'generated' | 'cancelled' | 'failed';

type EInvoiceRecord = {
  id: string;
  invoice_id: string;
  invoice_number: string;
  customer_name: string;
  customer_gstin: string;
  total: number;
  irn: string | null;
  ack_number: string | null;
  ack_date: string | null;
  status: EInvoiceStatus;
  qr_code: string | null;
  created_at: string;
  error_message: string | null;
};

const STATUS_COLORS: Record<EInvoiceStatus, { bg: string; text: string }> = {
  pending: { bg: '#F59E0B20', text: '#F59E0B' },
  generated: { bg: '#10B98120', text: '#10B981' },
  cancelled: { bg: '#EF444420', text: '#EF4444' },
  failed: { bg: '#EF444420', text: '#EF4444' },
};

const TABS = ['All', 'Pending', 'Generated', 'Cancelled'] as const;
const GENERATED_STATUS = 'generated';
const E_INVOICE_FAILURE_MESSAGE = 'Failed to generate e-invoice';
const CANCEL_E_INVOICE_TEXT = 'Cancel E-Invoice';
const JUSTIFY_SPACE_BETWEEN = 'space-between' as const;

function generateMockAckNumber(): string {
  return `ACK${Date.now().toString().slice(-6)}`;
}

export default function EInvoiceScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors, shadows } = useTheme();
  const { organizationId } = useAuth();
  const toast = useToast();

  const invoiceId = (route.params as { invoiceId?: string })?.invoiceId;

  const [records, setRecords] = useState<EInvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('All');
  const [stats, setStats] = useState({ total: 0, generated: 0, pending: 0, cancelled: 0 });

  const fetchRecords = useCallback(async () => {
    if (!organizationId) return;
    try {
      let query = supabase
        .from('invoices')
        .select('id, invoice_number, customer_name, customer_gstin, total, irn, ack_number, ack_date, e_invoice_status, e_invoice_qr, e_invoice_error, created_at')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .eq('gst_enabled', true)
        .order('created_at', { ascending: false });

      if (invoiceId) {
        query = query.eq('id', invoiceId);
      }

      if (activeTab !== 'All') {
        const statusMap: Record<string, string> = {
          'Pending': 'pending',
          'Generated': 'generated',
          'Cancelled': 'cancelled',
        };
        query = query.eq('e_invoice_status', statusMap[activeTab] ?? 'pending');
      }

      const { data, error } = await query;
      if (error) throw error;

      const mapped: EInvoiceRecord[] = (data || []).map((inv: Record<string, unknown>) => ({
        id: inv.id as string,
        invoice_id: inv.id as string,
        invoice_number: (inv.invoice_number as string) || 'Draft',
        customer_name: (inv.customer_name as string) || 'Unknown',
        customer_gstin: (inv.customer_gstin as string) || '',
        total: (inv.total as number) || 0,
        irn: inv.irn as string | null,
        ack_number: inv.ack_number as string | null,
        ack_date: inv.ack_date as string | null,
        status: (inv.e_invoice_status as EInvoiceStatus) || 'pending',
        qr_code: inv.e_invoice_qr as string | null,
        created_at: inv.created_at as string,
        error_message: inv.e_invoice_error as string | null,
      }));

      setRecords(mapped);

      const generated = mapped.filter(r => r.status === GENERATED_STATUS).length;
      const pending = mapped.filter(r => r.status === 'pending').length;
      const cancelled = mapped.filter(r => r.status === 'cancelled').length;
      setStats({ total: mapped.length, generated, pending, cancelled });
    } catch (error) {
      console.error('[E_INVOICE] Fetch error:', error);
      toast.error('Failed to load e-invoice data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [organizationId, activeTab, invoiceId, toast]);

  useEffect(() => {
    setLoading(true);
    fetchRecords();
  }, [fetchRecords]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRecords();
  };

  const handleGenerateIRN = useCallback(async (record: EInvoiceRecord) => {
    if (!record.customer_gstin) {
      errorFeedback();
      toast.error('Customer GSTIN is required for e-invoicing');
      return;
    }

    Alert.alert(
      'Generate E-Invoice',
      `Generate IRN for invoice ${record.invoice_number}?\n\nCustomer: ${record.customer_name}\nGSTIN: ${record.customer_gstin}\nAmount: ${formatCurrency(record.total)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            try {
              lightTap();
              const mockIrn = `IRN${Date.now().toString(36).toUpperCase()}`;
              const mockAck = generateMockAckNumber();

              const { error } = await supabase
                .from('invoices')
                .update({
                  irn: mockIrn,
                  ack_number: mockAck,
                  ack_date: new Date().toISOString(),
                  e_invoice_status: GENERATED_STATUS,
                })
                .eq('id', record.invoice_id);

              if (error) throw error;

              successFeedback();
              toast.success('E-Invoice generated successfully');
              fetchRecords();
            } catch {
              errorFeedback();
              toast.error(E_INVOICE_FAILURE_MESSAGE);
            }
          },
        },
      ]
    );
  }, [fetchRecords, toast]);

  const handleCancelEInvoice = useCallback(async (record: EInvoiceRecord) => {
    if (record.status !== GENERATED_STATUS) return;

    Alert.alert(
      CANCEL_E_INVOICE_TEXT,
      `Cancel IRN for ${record.invoice_number}?\n\nIRN: ${record.irn}\n\nThis action cannot be undone.`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: CANCEL_E_INVOICE_TEXT,
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('invoices')
                .update({ e_invoice_status: 'cancelled' })
                .eq('id', record.invoice_id);

              if (error) throw error;

              successFeedback();
              toast.success('E-Invoice cancelled');
              fetchRecords();
            } catch {
              errorFeedback();
              toast.error('Failed to cancel e-invoice');
            }
          },
        },
      ]
    );
  }, [fetchRecords, toast]);

  const handleActions = useCallback((record: EInvoiceRecord) => {
    lightTap();
    const buttons: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [];

    if (record.status === 'pending' || record.status === 'failed') {
      buttons.push({ text: 'Generate IRN', onPress: () => handleGenerateIRN(record) });
    }
    if (record.status === GENERATED_STATUS) {
      buttons.push({ text: CANCEL_E_INVOICE_TEXT, style: 'destructive', onPress: () => handleCancelEInvoice(record) });
    }
    if (record.irn) {
      buttons.push({ text: 'Copy IRN', onPress: () => { toast.success('IRN copied'); } });
    }
    buttons.push({ text: 'Close', style: 'cancel' });

    Alert.alert(record.invoice_number, `Status: ${record.status.toUpperCase()}`, buttons);
  }, [handleGenerateIRN, handleCancelEInvoice, toast]);

  const renderRecord = ({ item }: { item: EInvoiceRecord }) => {
    const statusStyle = STATUS_COLORS[item.status] || STATUS_COLORS.pending;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, ...shadows.sm }]}
        onPress={() => handleActions(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={[styles.invoiceNumber, { color: colors.text }]}>{item.invoice_number}</Text>
            <Text style={[styles.customerName, { color: colors.textSecondary }]}>{item.customer_name}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>GSTIN</Text>
            <Text style={[styles.value, { color: colors.text }]}>{item.customer_gstin || 'N/A'}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Amount</Text>
            <Text style={[styles.value, { color: colors.text, fontWeight: '700' }]}>{formatCurrency(item.total)}</Text>
          </View>
          {item.irn && (
            <View style={styles.cardRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>IRN</Text>
              <Text style={[styles.irnText, { color: colors.primary }]} numberOfLines={1}>{item.irn}</Text>
            </View>
          )}
          {item.ack_number && (
            <View style={styles.cardRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Ack No.</Text>
              <Text style={[styles.value, { color: colors.text }]}>{item.ack_number}</Text>
            </View>
          )}
          {item.error_message && (
            <View style={[styles.errorRow, { backgroundColor: '#EF444410' }]}>
              <Ionicons name="alert-circle" size={14} color="#EF4444" />
              <Text style={styles.errorText}>{item.error_message}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>
            {formatDate(item.created_at)}
          </Text>
          {item.status === 'pending' && (
            <TouchableOpacity
              style={[styles.generateButton, { backgroundColor: colors.primary }]}
              onPress={() => handleGenerateIRN(item)}
            >
              <Ionicons name="flash" size={14} color="#fff" />
              <Text style={styles.generateButtonText}>Generate IRN</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#7C3AED', '#A78BFA']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>E-Invoicing</Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      <View style={styles.statsRow}>
        {[
          { label: 'Total', value: stats.total, bg: '#7C3AED' },
          { label: 'Generated', value: stats.generated, bg: '#10B981' },
          { label: 'Pending', value: stats.pending, bg: '#F59E0B' },
          { label: 'Cancelled', value: stats.cancelled, bg: '#EF4444' },
        ].map(s => (
          <View key={s.label} style={[styles.statCard, { backgroundColor: s.bg }]}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && { backgroundColor: colors.primary },
            ]}
            onPress={() => { lightTap(); setActiveTab(tab); }}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === tab ? '#fff' : colors.textSecondary },
            ]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          renderItem={renderRecord}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No E-Invoices</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                GST invoices will appear here for e-invoice generation
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 40 : 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: JUSTIFY_SPACE_BETWEEN,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  headerRight: {
    width: 32,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 12,
  },
  card: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: JUSTIFY_SPACE_BETWEEN,
    alignItems: 'flex-start',
    padding: 14,
    paddingBottom: 8,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 15,
    fontWeight: '700',
  },
  customerName: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  cardBody: {
    paddingHorizontal: 14,
    gap: 6,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: JUSTIFY_SPACE_BETWEEN,
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
  },
  value: {
    fontSize: 13,
  },
  irnText: {
    fontSize: 11,
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    gap: 6,
    marginTop: 4,
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: JUSTIFY_SPACE_BETWEEN,
    alignItems: 'center',
    padding: 14,
    paddingTop: 10,
  },
  dateText: {
    fontSize: 11,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  generateButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
