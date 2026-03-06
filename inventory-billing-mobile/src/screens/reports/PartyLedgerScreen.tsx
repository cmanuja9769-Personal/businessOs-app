import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format, endOfMonth } from 'date-fns';
import { MoreStackNavigationProp } from '@navigation/types';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import { supabase } from '@lib/supabase';
import { formatCurrency } from '@lib/utils';
import { exportToMobileCSV, exportToMobilePDF } from '@lib/mobile-export';
import { themeColors } from '@theme/designSystem';
import FilterBottomSheet, { type FilterConfig } from '@components/ui/FilterBottomSheet';
import EmptyState from '@components/ui/EmptyState';

const ISO_DATE = 'yyyy-MM-dd';
const DISPLAY_DATE = 'dd MMM yyyy';
const SHORT_DATE = 'dd/MM/yyyy';

interface Party {
  id: string;
  name: string;
  type: 'customer' | 'supplier';
  phone?: string;
  gst_number?: string;
  opening_balance?: number;
}

interface LedgerEntry {
  date: string;
  type: string;
  documentNo: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

type PartyTypeFilter = 'all' | 'customer' | 'supplier';

function buildOpeningEntry(balance: number, dateFrom: string): LedgerEntry | null {
  if (balance === 0) return null;
  return {
    date: dateFrom,
    type: 'Opening',
    documentNo: '-',
    description: 'Opening Balance B/F',
    debit: balance > 0 ? balance : 0,
    credit: balance < 0 ? Math.abs(balance) : 0,
    balance,
  };
}

function getTypeChipLabel(t: PartyTypeFilter): string {
  if (t === 'all') return 'All';
  if (t === 'customer') return 'Customers';
  return 'Suppliers';
}

function getDefaultFilters(): FilterConfig {
  const now = new Date();
  const fyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    dateFrom: format(new Date(fyStart, 3, 1), ISO_DATE),
    dateTo: format(endOfMonth(now), ISO_DATE),
  };
}

function PartyPickerView({
  colors,
  partyTypeFilter,
  setPartyTypeFilter,
  partyLoading,
  filteredParties,
  renderPartyItem,
  onBack,
}: {
  readonly colors: typeof themeColors.light;
  readonly partyTypeFilter: PartyTypeFilter;
  readonly setPartyTypeFilter: (t: PartyTypeFilter) => void;
  readonly partyLoading: boolean;
  readonly filteredParties: Party[];
  readonly renderPartyItem: (info: { item: Party }) => React.JSX.Element;
  readonly onBack: () => void;
}) {
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#7C3AED', '#6D28D9']} style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Party</Text>
        <View style={styles.headerButton} />
      </LinearGradient>

      <View style={styles.typeFilterRow}>
        {(['all', 'customer', 'supplier'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[
              styles.typeChip,
              {
                backgroundColor: partyTypeFilter === t ? colors.primary : 'transparent',
                borderColor: colors.primary,
              },
            ]}
            onPress={() => setPartyTypeFilter(t)}
          >
            <Text
              style={[
                styles.typeChipText,
                { color: partyTypeFilter === t ? '#fff' : colors.primary },
              ]}
            >
              {getTypeChipLabel(t)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {partyLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={filteredParties}
          keyExtractor={(p) => p.id}
          renderItem={renderPartyItem}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="No parties found"
              description="Add customers or suppliers first"
            />
          }
          contentContainerStyle={styles.partyList}
        />
      )}
    </View>
  );
}

export default function PartyLedgerScreen() {
  const navigation = useNavigation<MoreStackNavigationProp>();
  const { colors, shadows } = useTheme();
  const { organizationId } = useAuth();

  const [parties, setParties] = useState<Party[]>([]);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [partyLoading, setPartyLoading] = useState(true);
  const [filters, setFilters] = useState<FilterConfig>(getDefaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [showPartyPicker, setShowPartyPicker] = useState(false);
  const [partyTypeFilter, setPartyTypeFilter] = useState<PartyTypeFilter>('all');
  const [exportingCSV, setExportingCSV] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) return;
    const load = async () => {
      setPartyLoading(true);
      try {
        const [custRes, suppRes] = await Promise.all([
          supabase
            .from('customers')
            .select('id, name, phone, gst_number, opening_balance')
            .eq('organization_id', organizationId)
            .is('deleted_at', null)
            .order('name'),
          supabase
            .from('suppliers')
            .select('id, name, phone, gst_number, opening_balance')
            .eq('organization_id', organizationId)
            .is('deleted_at', null)
            .order('name'),
        ]);
        const custs: Party[] = (custRes.data ?? []).map((c) => ({ ...c, type: 'customer' as const }));
        const supps: Party[] = (suppRes.data ?? []).map((s) => ({ ...s, type: 'supplier' as const }));
        setParties([...custs, ...supps]);
      } catch {
        Alert.alert('Error', 'Failed to load parties');
      } finally {
        setPartyLoading(false);
      }
    };
    load();
  }, [organizationId]);

  const filteredParties = useMemo(
    () => parties.filter((p) => partyTypeFilter === 'all' || p.type === partyTypeFilter),
    [parties, partyTypeFilter],
  );

  const fetchLedger = useCallback(async () => {
    if (!selectedParty || !organizationId) return;
    setLoading(true);
    setFetchError(null);

    try {
      const ledgerEntries: LedgerEntry[] = [];
      const openingBalance = selectedParty.opening_balance ?? 0;
      const openingEntry = buildOpeningEntry(openingBalance, filters.dateFrom);
      if (openingEntry) ledgerEntries.push(openingEntry);

      const apiEntries = await fetchLedgerFromSupabase(
        selectedParty,
        organizationId,
        filters.dateFrom,
        filters.dateTo,
      );

      let runningBalance = openingBalance;
      for (const row of apiEntries) {
        runningBalance += row.debit - row.credit;
        ledgerEntries.push({ ...row, balance: runningBalance });
      }

      setEntries(ledgerEntries);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch ledger';
      setFetchError(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedParty, organizationId, filters.dateFrom, filters.dateTo]);

  useEffect(() => {
    if (selectedParty) fetchLedger();
  }, [selectedParty, fetchLedger]);

  const totalDebit = useMemo(() => entries.reduce((sum, e) => sum + e.debit, 0), [entries]);
  const totalCredit = useMemo(() => entries.reduce((sum, e) => sum + e.credit, 0), [entries]);
  const closingBalance = entries.length > 0 ? entries[entries.length - 1].balance : 0;

  const handleExportCSV = useCallback(async () => {
    if (!selectedParty || entries.length === 0) return;
    setExportingCSV(true);
    try {
      await exportToMobileCSV(
        `party-ledger-${selectedParty.name}`,
        [
          { key: 'date', header: 'Date', format: (v) => format(new Date(String(v)), SHORT_DATE) },
          { key: 'documentNo', header: 'Document No' },
          { key: 'description', header: 'Description' },
          { key: 'debit', header: 'Debit', format: (v) => (Number(v) > 0 ? Number(v).toFixed(2) : '') },
          { key: 'credit', header: 'Credit', format: (v) => (Number(v) > 0 ? Number(v).toFixed(2) : '') },
          { key: 'balance', header: 'Balance', format: (v) => Number(v).toFixed(2) },
        ],
        entries as unknown as Record<string, unknown>[],
        `Party Ledger: ${selectedParty.name}`,
        `Period: ${filters.dateFrom} to ${filters.dateTo}`,
      );
    } catch (error) {
      Alert.alert('Export Failed', error instanceof Error ? error.message : 'Could not export CSV');
    } finally {
      setExportingCSV(false);
    }
  }, [selectedParty, entries, filters]);

  const handleExportPDF = useCallback(async () => {
    if (!selectedParty || entries.length === 0) return;
    setExportingPDF(true);
    try {
      const pdfData = entries.map((e) => ({
        date: format(new Date(e.date), SHORT_DATE),
        documentNo: e.documentNo,
        description: e.description,
        debit: e.debit > 0 ? formatCurrency(e.debit) : '-',
        credit: e.credit > 0 ? formatCurrency(e.credit) : '-',
        balance: `${formatCurrency(Math.abs(e.balance))} ${e.balance >= 0 ? 'Dr' : 'Cr'}`,
      }));

      await exportToMobilePDF(
        `party-ledger-${selectedParty.name}`,
        `Party Ledger: ${selectedParty.name}`,
        [
          { key: 'date', header: 'Date' },
          { key: 'documentNo', header: 'Document No' },
          { key: 'description', header: 'Description' },
          { key: 'debit', header: 'Debit' },
          { key: 'credit', header: 'Credit' },
          { key: 'balance', header: 'Balance' },
        ],
        pdfData as unknown as Record<string, unknown>[],
        `${selectedParty.type === 'customer' ? 'Customer' : 'Supplier'} | ${selectedParty.gst_number || 'No GSTIN'} | ${format(new Date(filters.dateFrom), DISPLAY_DATE)} — ${format(new Date(filters.dateTo), DISPLAY_DATE)}`,
        {
          date: '',
          documentNo: '',
          description: 'Totals',
          debit: formatCurrency(totalDebit),
          credit: formatCurrency(totalCredit),
          balance: `${formatCurrency(Math.abs(closingBalance))} ${closingBalance >= 0 ? 'Dr' : 'Cr'}`,
        },
      );
    } catch (error) {
      Alert.alert('Export Failed', error instanceof Error ? error.message : 'Could not export PDF');
    } finally {
      setExportingPDF(false);
    }
  }, [selectedParty, entries, totalDebit, totalCredit, closingBalance, filters]);

  const renderPartyItem = ({ item }: { item: Party }) => (
    <TouchableOpacity
      style={[styles.partyItem, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      onPress={() => {
        setSelectedParty(item);
        setShowPartyPicker(false);
      }}
    >
      <View
        style={[
          styles.partyBadge,
          { backgroundColor: item.type === 'customer' ? '#10B981' : '#6366F1' },
        ]}
      >
        <Text style={styles.partyBadgeText}>{item.type === 'customer' ? 'C' : 'S'}</Text>
      </View>
      <View style={styles.partyInfo}>
        <Text style={[styles.partyName, { color: colors.text }]}>{item.name}</Text>
        {item.gst_number ? (
          <Text style={[styles.partyGst, { color: colors.textSecondary }]}>{item.gst_number}</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  const renderLedgerEntry = ({ item }: { item: LedgerEntry }) => {
    const isOpening = item.type === 'Opening';
    const balanceColor = item.balance >= 0 ? '#10B981' : '#EF4444';

    return (
      <View
        style={[
          styles.entryCard,
          {
            backgroundColor: isOpening ? `${colors.primary}10` : colors.card,
            ...shadows.sm,
          },
        ]}
      >
        <View style={styles.entryHeader}>
          <View style={styles.entryLeft}>
            <Text style={[styles.entryType, { color: colors.primary }]}>{item.type}</Text>
            <Text style={[styles.entryDate, { color: colors.textSecondary }]}>
              {format(new Date(item.date), DISPLAY_DATE)}
            </Text>
          </View>
          <Text style={[styles.entryBalance, { color: balanceColor }]}>
            {formatCurrency(Math.abs(item.balance))}
            <Text style={styles.balanceSuffix}> {item.balance >= 0 ? 'Dr' : 'Cr'}</Text>
          </Text>
        </View>

        <Text style={[styles.entryDocNo, { color: colors.text }]} numberOfLines={1}>
          {item.documentNo}
        </Text>
        <Text style={[styles.entryDesc, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.description}
        </Text>

        <View style={styles.entryAmounts}>
          {item.debit > 0 && (
            <View style={[styles.amountTag, { backgroundColor: '#10B98115' }]}>
              <Text style={[styles.amountLabel, { color: '#10B981' }]}>Debit</Text>
              <Text style={[styles.amountValue, { color: '#10B981' }]}>
                {formatCurrency(item.debit)}
              </Text>
            </View>
          )}
          {item.credit > 0 && (
            <View style={[styles.amountTag, { backgroundColor: '#EF444415' }]}>
              <Text style={[styles.amountLabel, { color: '#EF4444' }]}>Credit</Text>
              <Text style={[styles.amountValue, { color: '#EF4444' }]}>
                {formatCurrency(item.credit)}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderSummary = () => {
    if (!selectedParty || entries.length === 0) return null;
    return (
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, ...shadows.sm }]}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Debit</Text>
              <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                {formatCurrency(totalDebit)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Credit</Text>
              <Text style={[styles.summaryValue, { color: '#EF4444' }]}>
                {formatCurrency(totalCredit)}
              </Text>
            </View>
          </View>
          <View style={[styles.closingRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.closingLabel, { color: colors.text }]}>Closing Balance</Text>
            <View style={styles.closingRight}>
              <Text
                style={[
                  styles.closingValue,
                  { color: closingBalance >= 0 ? '#10B981' : '#EF4444' },
                ]}
              >
                {formatCurrency(Math.abs(closingBalance))}
              </Text>
              <Text style={[styles.closingTag, { color: colors.textSecondary }]}>
                {closingBalance >= 0 ? 'Receivable' : 'Payable'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderLedgerContent = () => {
    if (!selectedParty) {
      return (
        <EmptyState
          icon="book-outline"
          title="Select a party"
          description="Choose a customer or supplier to view their ledger"
        />
      );
    }
    if (loading) {
      return <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />;
    }
    if (fetchError) {
      return (
        <EmptyState
          icon="alert-circle-outline"
          title="Failed to load"
          description={fetchError}
          actionText="Retry"
          onAction={() => { fetchLedger(); }}
        />
      );
    }
    return (
      <FlatList
        data={entries}
        keyExtractor={(item, idx) => `${item.date}-${item.documentNo}-${idx}`}
        renderItem={renderLedgerEntry}
        ListHeaderComponent={renderSummary}
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="No transactions"
            description="No transactions found for the selected period"
          />
        }
        contentContainerStyle={styles.ledgerList}
        showsVerticalScrollIndicator={false}
        initialNumToRender={20}
        maxToRenderPerBatch={15}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
      />
    );
  };

  const handlePickerBack = useCallback(() => {
    if (selectedParty) {
      setShowPartyPicker(false);
    } else {
      navigation.goBack();
    }
  }, [selectedParty, navigation]);

  if (showPartyPicker) {
    return (
      <PartyPickerView
        colors={colors}
        partyTypeFilter={partyTypeFilter}
        setPartyTypeFilter={setPartyTypeFilter}
        partyLoading={partyLoading}
        filteredParties={filteredParties}
        renderPartyItem={renderPartyItem}
        onBack={handlePickerBack}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#7C3AED', '#6D28D9']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Party Ledger</Text>
          {selectedParty && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {selectedParty.name}
            </Text>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setShowFilters(true)} style={styles.headerIcon}>
            <Ionicons name="filter-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.partySelector, { backgroundColor: colors.card, borderColor: colors.border, ...shadows.sm }]}
          onPress={() => setShowPartyPicker(true)}
        >
          {selectedParty ? (
            <>
              <View
                style={[
                  styles.miniPartyBadge,
                  { backgroundColor: selectedParty.type === 'customer' ? '#10B981' : '#6366F1' },
                ]}
              >
                <Text style={styles.miniPartyBadgeText}>
                  {selectedParty.type === 'customer' ? 'C' : 'S'}
                </Text>
              </View>
              <Text style={[styles.partySelectorText, { color: colors.text }]} numberOfLines={1}>
                {selectedParty.name}
              </Text>
            </>
          ) : (
            <Text style={[styles.partySelectorText, { color: colors.textSecondary }]}>
              Choose a party...
            </Text>
          )}
          <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.exportButtons}>
          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: colors.card, ...shadows.sm }]}
            onPress={handleExportPDF}
            disabled={exportingPDF || !selectedParty || entries.length === 0}
          >
            {exportingPDF ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="document-text-outline" size={18} color={colors.primary} />
            )}
            <Text style={[styles.exportLabel, { color: colors.primary }]}>PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: colors.card, ...shadows.sm }]}
            onPress={handleExportCSV}
            disabled={exportingCSV || !selectedParty || entries.length === 0}
          >
            {exportingCSV ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="download-outline" size={18} color={colors.primary} />
            )}
            <Text style={[styles.exportLabel, { color: colors.primary }]}>CSV</Text>
          </TouchableOpacity>
        </View>
      </View>

      {renderLedgerContent()}

      <FilterBottomSheet
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={setFilters}
        initialFilters={filters}
        title="Ledger Filters"
      />
    </View>
  );
}

async function fetchCustomerLedger(
  partyId: string,
  organizationId: string,
  dateFrom: string,
  dateTo: string,
): Promise<LedgerEntry[]> {
  const entries: LedgerEntry[] = [];
  const [invoicesRes, paymentsRes] = await Promise.all([
    supabase
      .from('invoices')
      .select('invoice_number, invoice_date, total, document_type, status')
      .eq('customer_id', partyId)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .gte('invoice_date', dateFrom)
      .lte('invoice_date', dateTo)
      .neq('status', 'cancelled')
      .order('invoice_date', { ascending: true }),
    supabase
      .from('payments')
      .select('payment_date, amount, payment_method, reference_number, invoices!inner(customer_id)')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .gte('payment_date', dateFrom)
      .lte('payment_date', dateTo),
  ]);

  for (const inv of invoicesRes.data ?? []) {
    const isCreditNote = inv.document_type === 'credit_note';
    entries.push({
      date: inv.invoice_date,
      type: isCreditNote ? 'Credit Note' : 'Tax Invoice',
      documentNo: inv.invoice_number,
      description: isCreditNote ? 'Sales Return / Credit Note' : 'Sales Invoice',
      debit: isCreditNote ? 0 : Number(inv.total),
      credit: isCreditNote ? Number(inv.total) : 0,
      balance: 0,
    });
  }

  const customerPayments = (paymentsRes.data ?? []).filter((p: Record<string, unknown>) => {
    const inv = p.invoices as Record<string, unknown> | null;
    return inv?.customer_id === partyId;
  });
  for (const pay of customerPayments) {
    const p = pay as Record<string, unknown>;
    entries.push({
      date: String(p.payment_date),
      type: 'Payment Receipt',
      documentNo: String(p.reference_number ?? 'Payment'),
      description: `Payment Received — ${p.payment_method ?? 'Cash'}`,
      debit: 0,
      credit: Number(p.amount),
      balance: 0,
    });
  }

  return entries;
}

async function fetchSupplierLedger(
  partyId: string,
  organizationId: string,
  dateFrom: string,
  dateTo: string,
): Promise<LedgerEntry[]> {
  const entries: LedgerEntry[] = [];
  const [purchasesRes, paymentsRes] = await Promise.all([
    supabase
      .from('purchases')
      .select('purchase_number, purchase_date, total')
      .eq('supplier_id', partyId)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .gte('purchase_date', dateFrom)
      .lte('purchase_date', dateTo)
      .order('purchase_date', { ascending: true }),
    supabase
      .from('payments')
      .select('payment_date, amount, payment_method, reference_number, purchases!inner(supplier_id)')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .gte('payment_date', dateFrom)
      .lte('payment_date', dateTo),
  ]);

  for (const pur of purchasesRes.data ?? []) {
    entries.push({
      date: pur.purchase_date,
      type: 'Purchase Invoice',
      documentNo: pur.purchase_number,
      description: 'Purchase Invoice',
      debit: 0,
      credit: Number(pur.total),
      balance: 0,
    });
  }

  const supplierPayments = (paymentsRes.data ?? []).filter((p: Record<string, unknown>) => {
    const pur = p.purchases as Record<string, unknown> | null;
    return pur?.supplier_id === partyId;
  });
  for (const pay of supplierPayments) {
    const p = pay as Record<string, unknown>;
    entries.push({
      date: String(p.payment_date),
      type: 'Payment Made',
      documentNo: String(p.reference_number ?? 'Payment'),
      description: `Payment Made — ${p.payment_method ?? 'Cash'}`,
      debit: Number(p.amount),
      credit: 0,
      balance: 0,
    });
  }

  return entries;
}

async function fetchLedgerFromSupabase(
  party: Party,
  organizationId: string,
  dateFrom: string,
  dateTo: string,
): Promise<LedgerEntry[]> {
  const entries = party.type === 'customer'
    ? await fetchCustomerLedger(party.id, organizationId, dateFrom, dateTo)
    : await fetchSupplierLedger(party.id, organizationId, dateFrom, dateTo);

  entries.sort((a, b) => a.date.localeCompare(b.date) || a.documentNo.localeCompare(b.documentNo));
  return entries;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: { width: 40, alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  partySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  miniPartyBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniPartyBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  partySelectorText: { flex: 1, fontSize: 14, fontWeight: '500' },
  exportButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  exportLabel: { fontSize: 13, fontWeight: '600' },
  loader: { flex: 1, justifyContent: 'center' },
  summaryContainer: { marginBottom: 12 },
  summaryCard: { borderRadius: 12, padding: 16 },
  summaryRow: { flexDirection: 'row', marginBottom: 12 },
  summaryItem: { flex: 1 },
  summaryLabel: { fontSize: 12, marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: '700' },
  closingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  closingLabel: { fontSize: 14, fontWeight: '600' },
  closingRight: { alignItems: 'flex-end' },
  closingValue: { fontSize: 20, fontWeight: '700' },
  closingTag: { fontSize: 11, marginTop: 2 },
  ledgerList: { padding: 16, paddingTop: 0 },
  entryCard: { borderRadius: 12, padding: 14, marginBottom: 10 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  entryLeft: {},
  entryType: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  entryDate: { fontSize: 11, marginTop: 2 },
  entryBalance: { fontSize: 15, fontWeight: '700' },
  balanceSuffix: { fontSize: 10, fontWeight: '500' },
  entryDocNo: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  entryDesc: { fontSize: 12, marginBottom: 8 },
  entryAmounts: { flexDirection: 'row', gap: 8 },
  amountTag: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  amountLabel: { fontSize: 11, fontWeight: '600' },
  amountValue: { fontSize: 13, fontWeight: '700' },
  typeFilterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  typeChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  typeChipText: { fontSize: 13, fontWeight: '500' },
  partyList: { paddingBottom: 20 },
  partyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  partyBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partyBadgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  partyInfo: { flex: 1 },
  partyName: { fontSize: 15, fontWeight: '500' },
  partyGst: { fontSize: 12, marginTop: 2 },
});
