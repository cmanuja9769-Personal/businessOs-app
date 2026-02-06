import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Share,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MoreStackNavigationProp } from '@navigation/types';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import Loading from '@components/ui/Loading';
import { supabase } from '@lib/supabase';
import { formatCurrency, formatDate } from '@lib/utils';

interface PurchaseItem {
  itemId: string;
  name: string;
  hsn?: string;
  quantity: number;
  rate: number;
  discount: number;
  discountType: 'percentage' | 'flat';
  taxRate: number;
  amount: number;
}

interface Purchase {
  id: string;
  purchase_no: string;
  supplier_id: string;
  supplier_name: string;
  supplier_phone?: string;
  supplier_address?: string;
  supplier_gst?: string;
  date: string;
  items: PurchaseItem[];
  subtotal: number;
  discount: number;
  discount_type: string;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  paid_amount: number;
  balance: number;
  status: 'paid' | 'unpaid' | 'partial';
  gst_enabled: boolean;
  notes?: string;
  created_at: string;
}

export default function PurchaseDetailScreen() {
  const navigation = useNavigation<MoreStackNavigationProp>();
  const route = useRoute();
  const { colors, shadows } = useTheme();
  const { organizationId } = useAuth();

  const purchaseId = (route.params as any)?.purchaseId as string;

  const [loading, setLoading] = useState(true);
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadPurchase();
  }, [purchaseId]);

  const loadPurchase = async () => {
    if (!purchaseId) return;

    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('id', purchaseId)
        .single();

      if (error) throw error;

      if (data) {
        const items = typeof data.items === 'string' ? JSON.parse(data.items) : data.items;
        setPurchase({ ...data, items: items || [] });
      }
    } catch (error) {
      console.error('Error loading purchase:', error);
      Alert.alert('Error', 'Failed to load purchase details');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigation.navigate('CreatePurchase', { purchaseId });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Purchase',
      'Are you sure you want to delete this purchase? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await supabase.from('purchases').delete().eq('id', purchaseId);
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting purchase:', error);
              Alert.alert('Error', 'Failed to delete purchase');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    if (!purchase) return;

    const itemsList = purchase.items
      .map(item => `${item.name} x${item.quantity} - ${formatCurrency(item.amount)}`)
      .join('\n');

    const message = `
Purchase: ${purchase.purchase_no}
Date: ${formatDate(purchase.date)}
Supplier: ${purchase.supplier_name}

Items:
${itemsList}

Total: ${formatCurrency(purchase.total)}
Status: ${purchase.status.toUpperCase()}
    `.trim();

    await Share.share({ message });
  };

  const handleRecordPayment = () => {
    navigation.navigate('RecordPayment', { invoiceId: purchaseId });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#10B981';
      case 'unpaid': return '#EF4444';
      case 'partial': return '#F59E0B';
      default: return colors.textSecondary;
    }
  };

  if (loading) {
    return <Loading text="Loading purchase..." />;
  }

  if (!purchase) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>Purchase not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#4F46E5', '#6366F1']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{purchase.purchase_no}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(purchase.status) }]}>
            <Text style={styles.statusText}>{purchase.status.toUpperCase()}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
          <Ionicons name="share-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.card, ...shadows.sm }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="business-outline" size={20} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Supplier Details</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.supplierName, { color: colors.text }]}>{purchase.supplier_name}</Text>
            {purchase.supplier_phone && (
              <View style={styles.detailRow}>
                <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>{purchase.supplier_phone}</Text>
              </View>
            )}
            {purchase.supplier_gst && (
              <View style={styles.detailRow}>
                <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>GSTIN: {purchase.supplier_gst}</Text>
              </View>
            )}
            {purchase.supplier_address && (
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>{purchase.supplier_address}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, ...shadows.sm }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Purchase Info</Text>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Date</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{formatDate(purchase.date)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Billing Type</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{purchase.gst_enabled ? 'GST' : 'Non-GST'}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, ...shadows.sm }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="cube-outline" size={20} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Items ({purchase.items.length})</Text>
          </View>
          <View style={styles.cardContent}>
            {purchase.items.map((item, index) => (
              <View 
                key={item.itemId} 
                style={[styles.itemRow, index < purchase.items.length - 1 && styles.itemBorder]}
              >
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
                    {formatCurrency(item.rate)} × {item.quantity}
                    {item.taxRate > 0 && ` (${item.taxRate}% GST)`}
                  </Text>
                </View>
                <Text style={[styles.itemAmount, { color: colors.text }]}>{formatCurrency(item.amount)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, ...shadows.sm }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="calculator-outline" size={20} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Summary</Text>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Subtotal</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(purchase.subtotal)}</Text>
            </View>
            {purchase.gst_enabled && (
              <>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>CGST</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(purchase.cgst)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>SGST</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(purchase.sgst)}</Text>
                </View>
              </>
            )}
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
              <Text style={[styles.totalValue, { color: colors.primary }]}>{formatCurrency(purchase.total)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Paid Amount</Text>
              <Text style={[styles.summaryValue, { color: '#10B981' }]}>{formatCurrency(purchase.paid_amount)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Balance</Text>
              <Text style={[styles.summaryValue, { color: purchase.balance > 0 ? '#EF4444' : colors.text }]}>
                {formatCurrency(purchase.balance)}
              </Text>
            </View>
          </View>
        </View>

        {purchase.notes && (
          <View style={[styles.card, { backgroundColor: colors.card, ...shadows.sm }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="document-text-outline" size={20} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Notes</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={[styles.notesText, { color: colors.textSecondary }]}>{purchase.notes}</Text>
            </View>
          </View>
        )}

        <View style={styles.actions}>
          {purchase.status !== 'paid' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#10B981' }]}
              onPress={handleRecordPayment}
            >
              <Ionicons name="cash-outline" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Record Payment</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={handleEdit}
          >
            <Ionicons name="create-outline" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
            onPress={handleDelete}
            disabled={deleting}
          >
            <Ionicons name="trash-outline" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 40 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 4 },
  statusText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  shareButton: { width: 40, alignItems: 'flex-end' },
  content: { flex: 1, padding: 16 },
  card: { borderRadius: 12, marginBottom: 16, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.1)' },
  cardTitle: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
  cardContent: { padding: 16 },
  supplierName: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  detailText: { fontSize: 14, marginLeft: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '500' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  itemBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.1)' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '500' },
  itemMeta: { fontSize: 13, marginTop: 2 },
  itemAmount: { fontSize: 15, fontWeight: '600' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: '500' },
  totalRow: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.1)', paddingTop: 12, marginTop: 4 },
  totalLabel: { fontSize: 18, fontWeight: '700' },
  totalValue: { fontSize: 20, fontWeight: '700' },
  notesText: { fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 40 },
  actionButton: { flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12 },
  actionButtonText: { color: '#fff', fontSize: 14, fontWeight: '600', marginLeft: 6 },
  errorText: { fontSize: 16, textAlign: 'center', marginTop: 40 },
});
