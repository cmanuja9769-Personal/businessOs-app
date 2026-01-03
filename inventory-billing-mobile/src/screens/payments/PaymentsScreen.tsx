import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import Card from '@components/ui/Card';
import Loading from '@components/ui/Loading';
import EmptyState from '@components/ui/EmptyState';
import { spacing, fontSize } from '@theme/spacing';
import { supabase } from '@lib/supabase';
import { formatCurrency, formatDate } from '@lib/utils';

interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  invoices?: {
    invoice_number: string;
    customers?: {
      name: string;
    };
  };
}

export default function PaymentsScreen() {
  const { colors } = useTheme();
  const { organizationId } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, [organizationId]);

  const fetchPayments = async () => {
    try {
      console.log('[PAYMENTS] Fetching payments for org:', organizationId);
      if (!organizationId) {
        console.warn('[PAYMENTS] No organizationId available');
        setPayments([]);
        return;
      }

      // Query invoices first, then get related payments
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('id, invoice_number, customer_id, customers(name)')
        .eq('organization_id', organizationId);

      if (invoicesError) throw invoicesError;
      if (!invoicesData || invoicesData.length === 0) {
        setPayments([]);
        return;
      }

      const invoiceIds = invoicesData.map(inv => inv.id);

      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .in('invoice_id', invoiceIds)
        .order('payment_date', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Enrich payments with invoice data
      const enrichedPayments = (data || []).map(payment => {
        const invoice = invoicesData.find(inv => inv.id === payment.invoice_id);
        return {
          ...payment,
          invoices: invoice ? {
            invoice_number: invoice.invoice_number,
            customers: invoice.customers,
          } : null,
        };
      });

      console.log('[PAYMENTS] Query result:', { count: enrichedPayments?.length, error: null });

      setPayments(enrichedPayments || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      Alert.alert('Error', 'Failed to fetch payments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayments();
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return '💵';
      case 'card':
        return '💳';
      case 'upi':
        return '📱';
      case 'bank_transfer':
        return '🏦';
      case 'cheque':
        return '📝';
      default:
        return '💰';
    }
  };

  const renderItem = ({ item }: { item: Payment }) => (
    <Card style={styles.paymentCard}>
      <View style={styles.paymentHeader}>
        <View style={styles.paymentInfo}>
          <Text style={[styles.paymentAmount, { color: colors.text }]}>
            {formatCurrency(item.amount)}
          </Text>
          <Text style={[styles.paymentDate, { color: colors.textSecondary }]}>
            {formatDate(item.payment_date)}
          </Text>
        </View>
        <Text style={styles.methodIcon}>
          {getPaymentMethodIcon(item.payment_method)}
        </Text>
      </View>
      
      {item.invoices && (
        <View style={styles.paymentDetails}>
          <Text style={[styles.invoiceNumber, { color: colors.textSecondary }]}>
            Invoice: {item.invoices.invoice_number}
          </Text>
          {item.invoices.customers && (
            <Text style={[styles.customerName, { color: colors.textSecondary }]}>
              Customer: {item.invoices.customers.name}
            </Text>
          )}
        </View>
      )}

      {item.reference_number && (
        <Text style={[styles.reference, { color: colors.textSecondary }]}>
          Ref: {item.reference_number}
        </Text>
      )}

      <View style={[styles.methodBadge, { backgroundColor: colors.primary + '20' }]}>
        <Text style={[styles.methodText, { color: colors.primary }]}>
          {item.payment_method.replace('_', ' ').toUpperCase()}
        </Text>
      </View>
    </Card>
  );

  if (loading) {
    return <Loading fullScreen />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={payments}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="card-outline"
            title="No payments found"
            description="Payments will appear here once invoices are paid"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: spacing.md,
  },
  paymentCard: {
    marginBottom: spacing.md,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentAmount: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    marginBottom: spacing.xs / 2,
  },
  paymentDate: {
    fontSize: fontSize.sm,
  },
  methodIcon: {
    fontSize: 32,
  },
  paymentDetails: {
    marginBottom: spacing.sm,
  },
  invoiceNumber: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs / 2,
  },
  customerName: {
    fontSize: fontSize.sm,
  },
  reference: {
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
  },
  methodBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 12,
  },
  methodText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
});
