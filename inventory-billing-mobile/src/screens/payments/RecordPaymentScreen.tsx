import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MoreStackNavigationProp } from '@navigation/types';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import Loading from '@components/ui/Loading';
import { supabase } from '@lib/supabase';
import { formatCurrency } from '@lib/utils';

type PaymentMethod = 'cash' | 'card' | 'upi' | 'bank_transfer' | 'cheque' | 'other';
type PaymentType = 'receivable' | 'payable';

interface PaymentMethodOption {
  value: PaymentMethod;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const PAYMENT_METHODS: PaymentMethodOption[] = [
  { value: 'cash', label: 'Cash', icon: 'cash-outline' },
  { value: 'card', label: 'Card', icon: 'card-outline' },
  { value: 'upi', label: 'UPI', icon: 'phone-portrait-outline' },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: 'business-outline' },
  { value: 'cheque', label: 'Cheque', icon: 'document-text-outline' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  total: number;
  paid_amount: number;
  balance: number;
}

interface Purchase {
  id: string;
  purchase_no: string;
  supplier_name: string;
  total: number;
  paid_amount: number;
  balance: number;
}

export default function RecordPaymentScreen() {
  const navigation = useNavigation<MoreStackNavigationProp>();
  const route = useRoute();
  const { colors, shadows } = useTheme();
  const { organizationId } = useAuth();

  const invoiceId = (route.params as any)?.invoiceId as string | undefined;
  const purchaseId = (route.params as any)?.purchaseId as string | undefined;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paymentType, setPaymentType] = useState<PaymentType>(purchaseId ? 'payable' : 'receivable');
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadData();
  }, [invoiceId, purchaseId]);

  const loadData = async () => {
    try {
      if (invoiceId) {
        const { data, error } = await supabase
          .from('invoices')
          .select('id, invoice_number, customer_name, total, paid_amount, balance')
          .eq('id', invoiceId)
          .single();

        if (data) {
          setInvoice(data);
          setAmount(data.balance.toString());
        }
      } else if (purchaseId) {
        const { data, error } = await supabase
          .from('purchases')
          .select('id, purchase_no, supplier_name, total, paid_amount, balance')
          .eq('id', purchaseId)
          .single();

        if (data) {
          setPurchase(data);
          setAmount(data.balance.toString());
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount');
      return;
    }

    const balance = invoice?.balance || purchase?.balance || 0;
    if (amountValue > balance) {
      Alert.alert('Amount Exceeds Balance', `The payment amount cannot exceed the balance of ${formatCurrency(balance)}`);
      return;
    }

    setSaving(true);
    try {
      const paymentData = {
        organization_id: organizationId,
        invoice_id: invoiceId || null,
        purchase_id: purchaseId || null,
        customer_name: invoice?.customer_name || null,
        supplier_name: purchase?.supplier_name || null,
        type: paymentType,
        payment_date: paymentDate,
        amount: amountValue,
        payment_method: paymentMethod,
        reference_number: referenceNumber || null,
        notes: notes || null,
      };

      const { error: paymentError } = await supabase.from('payments').insert(paymentData);
      if (paymentError) throw paymentError;

      if (invoiceId && invoice) {
        const newPaidAmount = invoice.paid_amount + amountValue;
        const newBalance = invoice.total - newPaidAmount;
        const newStatus = newBalance <= 0 ? 'paid' : newPaidAmount > 0 ? 'partial' : 'unpaid';

        await supabase
          .from('invoices')
          .update({ paid_amount: newPaidAmount, balance: newBalance, status: newStatus })
          .eq('id', invoiceId);
      }

      if (purchaseId && purchase) {
        const newPaidAmount = purchase.paid_amount + amountValue;
        const newBalance = purchase.total - newPaidAmount;
        const newStatus = newBalance <= 0 ? 'paid' : newPaidAmount > 0 ? 'partial' : 'unpaid';

        await supabase
          .from('purchases')
          .update({ paid_amount: newPaidAmount, balance: newBalance, status: newStatus })
          .eq('id', purchaseId);
      }

      Alert.alert('Success', 'Payment recorded successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error saving payment:', error);
      Alert.alert('Error', 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loading text="Loading..." />;
  }

  const displayData = invoice || purchase;
  const displayNumber = invoice?.invoice_number || purchase?.purchase_no;
  const displayName = invoice?.customer_name || purchase?.supplier_name;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient colors={['#10B981', '#059669']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Record Payment</Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {displayData && (
          <View style={[styles.card, { backgroundColor: colors.card, ...shadows.sm }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.docNumber, { color: colors.text }]}>{displayNumber}</Text>
              <Text style={[styles.docName, { color: colors.textSecondary }]}>{displayName}</Text>
            </View>
            <View style={styles.balanceRow}>
              <View>
                <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Total</Text>
                <Text style={[styles.balanceValue, { color: colors.text }]}>{formatCurrency(displayData.total)}</Text>
              </View>
              <View>
                <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Paid</Text>
                <Text style={[styles.balanceValue, { color: '#10B981' }]}>{formatCurrency(displayData.paid_amount)}</Text>
              </View>
              <View>
                <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Balance</Text>
                <Text style={[styles.balanceValue, { color: '#EF4444' }]}>{formatCurrency(displayData.balance)}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.card, ...shadows.sm }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment Amount</Text>
          <View style={[styles.amountInputContainer, { borderColor: colors.border }]}>
            <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>₹</Text>
            <TextInput
              style={[styles.amountInput, { color: colors.text }]}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
          </View>
          {displayData && (
            <TouchableOpacity
              style={[styles.fullAmountButton, { backgroundColor: colors.primary + '20' }]}
              onPress={() => setAmount(displayData.balance.toString())}
            >
              <Text style={[styles.fullAmountText, { color: colors.primary }]}>Pay Full Balance</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, ...shadows.sm }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment Method</Text>
          <View style={styles.methodGrid}>
            {PAYMENT_METHODS.map(method => (
              <TouchableOpacity
                key={method.value}
                style={[
                  styles.methodCard,
                  { borderColor: paymentMethod === method.value ? colors.primary : colors.border },
                  paymentMethod === method.value && { backgroundColor: colors.primary + '10' },
                ]}
                onPress={() => setPaymentMethod(method.value)}
              >
                <Ionicons
                  name={method.icon}
                  size={24}
                  color={paymentMethod === method.value ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.methodLabel,
                    { color: paymentMethod === method.value ? colors.primary : colors.text },
                  ]}
                >
                  {method.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, ...shadows.sm }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Additional Details</Text>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Reference Number</Text>
            <TextInput
              style={[styles.textInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="Transaction ID, Cheque No., etc."
              placeholderTextColor={colors.textSecondary}
              value={referenceNumber}
              onChangeText={setReferenceNumber}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Notes</Text>
            <TextInput
              style={[styles.textInput, styles.notesInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="Add any notes..."
              placeholderTextColor={colors.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: '#10B981' }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <Text style={styles.saveButtonText}>Saving...</Text>
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
              <Text style={styles.saveButtonText}>Record Payment</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 40 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center' },
  headerRight: { width: 40 },
  content: { flex: 1, padding: 16 },
  card: { borderRadius: 12, padding: 16, marginBottom: 16 },
  cardHeader: { marginBottom: 12 },
  docNumber: { fontSize: 18, fontWeight: '700' },
  docName: { fontSize: 14, marginTop: 2 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  balanceLabel: { fontSize: 12, marginBottom: 4 },
  balanceValue: { fontSize: 16, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  amountInputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  currencySymbol: { fontSize: 24, fontWeight: '600', marginRight: 8 },
  amountInput: { flex: 1, fontSize: 28, fontWeight: '700' },
  fullAmountButton: { marginTop: 12, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  fullAmountText: { fontSize: 14, fontWeight: '600' },
  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  methodCard: { width: '30%', aspectRatio: 1, borderWidth: 2, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  methodLabel: { fontSize: 12, marginTop: 6, fontWeight: '500' },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, marginBottom: 6 },
  textInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, marginBottom: 40 },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: '600', marginLeft: 8 },
});
