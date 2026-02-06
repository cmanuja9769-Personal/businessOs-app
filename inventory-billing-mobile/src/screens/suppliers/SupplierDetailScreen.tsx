import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MoreStackParamList, MoreStackNavigationProp } from '@navigation/types';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import { supabase } from '@lib/supabase';
import { formatCurrency, formatDate } from '@lib/utils';

type RouteProps = RouteProp<MoreStackParamList, 'SupplierDetail'>;

interface Supplier {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  gst_number?: string | null;
  gstin?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  pan_number?: string | null;
  opening_balance?: number;
  created_at: string;
}

interface Purchase {
  id: string;
  purchase_number: string;
  total: number;
  balance: number;
  status: string;
  created_at: string;
}

interface Stats {
  totalPurchases: number;
  totalAmount: number;
  pendingAmount: number;
  purchaseCount: number;
}

export default function SupplierDetailScreen() {
  const navigation = useNavigation<MoreStackNavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors, shadows } = useTheme();
  const { organizationId } = useAuth();

  const { supplierId } = route.params;

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [stats, setStats] = useState<Stats>({ totalPurchases: 0, totalAmount: 0, pendingAmount: 0, purchaseCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSupplierData();
  }, [supplierId]);

  const loadSupplierData = async () => {
    if (!supplierId || !organizationId) return;
    setLoading(true);

    try {
      const [supplierRes, purchasesRes] = await Promise.all([
        supabase.from('suppliers').select('*').eq('id', supplierId).single(),
        supabase.from('purchases').select('*').eq('supplier_id', supplierId).order('created_at', { ascending: false }).limit(10),
      ]);

      if (supplierRes.error) throw supplierRes.error;
      setSupplier(supplierRes.data);

      const purchaseData = purchasesRes.data || [];
      setPurchases(purchaseData);

      setStats({
        totalPurchases: purchaseData.length,
        totalAmount: purchaseData.reduce((sum, p) => sum + (p.total || 0), 0),
        pendingAmount: purchaseData.reduce((sum, p) => sum + (p.balance || 0), 0),
        purchaseCount: purchaseData.length,
      });
    } catch (error) {
      console.error('Error loading supplier:', error);
      Alert.alert('Error', 'Failed to load supplier details');
    } finally {
      setLoading(false);
    }
  };

  const handleCall = () => {
    if (supplier?.phone) {
      Linking.openURL(`tel:${supplier.phone}`);
    }
  };

  const handleEmail = () => {
    if (supplier?.email) {
      Linking.openURL(`mailto:${supplier.email}`);
    }
  };

  const handleEdit = () => {
    navigation.navigate('AddSupplier', { supplierId });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Supplier',
      'Are you sure you want to delete this supplier? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('suppliers').delete().eq('id', supplierId);
              if (error) throw error;
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete supplier');
            }
          },
        },
      ]
    );
  };

  const handleRecordPayment = () => {
    navigation.navigate('RecordPayment', { purchaseId: purchases[0]?.id });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!supplier) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Supplier not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Supplier Details</Text>
        <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
          <Ionicons name="create-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.profileCard, { backgroundColor: colors.card, ...shadows.md }]}>
          <View style={styles.avatarContainer}>
            <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.avatar}>
              <Text style={styles.avatarText}>{supplier.name.charAt(0).toUpperCase()}</Text>
            </LinearGradient>
          </View>
          <Text style={[styles.supplierName, { color: colors.text }]}>{supplier.name}</Text>
          {supplier.gst_number || supplier.gstin ? (
            <Text style={[styles.gstNumber, { color: colors.primary }]}>GSTIN: {supplier.gst_number || supplier.gstin}</Text>
          ) : null}

          <View style={styles.contactButtons}>
            {supplier.phone && (
              <TouchableOpacity style={[styles.contactBtn, { backgroundColor: '#10B981' }]} onPress={handleCall}>
                <Ionicons name="call-outline" size={20} color="#fff" />
                <Text style={styles.contactBtnText}>Call</Text>
              </TouchableOpacity>
            )}
            {supplier.email && (
              <TouchableOpacity style={[styles.contactBtn, { backgroundColor: '#0EA5E9' }]} onPress={handleEmail}>
                <Ionicons name="mail-outline" size={20} color="#fff" />
                <Text style={styles.contactBtnText}>Email</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: '#6366F1' }]}>
            <Text style={styles.statValue}>{stats.purchaseCount}</Text>
            <Text style={styles.statLabel}>Purchases</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#10B981' }]}>
            <Text style={styles.statValue}>{formatCurrency(stats.totalAmount)}</Text>
            <Text style={styles.statLabel}>Total Value</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#EF4444' }]}>
            <Text style={styles.statValue}>{formatCurrency(stats.pendingAmount)}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.card, ...shadows.sm }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact Information</Text>
          
          {supplier.phone && (
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.text }]}>{supplier.phone}</Text>
            </View>
          )}
          {supplier.email && (
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.text }]}>{supplier.email}</Text>
            </View>
          )}
          {supplier.address && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                {[supplier.address, supplier.city, supplier.state, supplier.pincode].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}
          {supplier.pan_number && (
            <View style={styles.infoRow}>
              <Ionicons name="card-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.text }]}>PAN: {supplier.pan_number}</Text>
            </View>
          )}
        </View>

        {purchases.length > 0 && (
          <View style={[styles.sectionCard, { backgroundColor: colors.card, ...shadows.sm }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Purchases</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Purchases')}>
                <Text style={{ color: colors.primary }}>View All</Text>
              </TouchableOpacity>
            </View>

            {purchases.map(purchase => (
              <TouchableOpacity
                key={purchase.id}
                style={[styles.purchaseItem, { borderColor: colors.border }]}
                onPress={() => navigation.navigate('PurchaseDetail', { purchaseId: purchase.id })}
              >
                <View style={styles.purchaseMain}>
                  <Text style={[styles.purchaseNumber, { color: colors.text }]}>{purchase.purchase_number || 'Purchase'}</Text>
                  <Text style={[styles.purchaseDate, { color: colors.textSecondary }]}>{formatDate(purchase.created_at)}</Text>
                </View>
                <View style={styles.purchaseRight}>
                  <Text style={[styles.purchaseAmount, { color: colors.text }]}>{formatCurrency(purchase.total)}</Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: purchase.balance > 0 ? '#FEF3C7' : '#D1FAE5' }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: purchase.balance > 0 ? '#D97706' : '#059669' }
                    ]}>
                      {purchase.balance > 0 ? 'Pending' : 'Paid'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('CreatePurchase', {})}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>New Purchase</Text>
          </TouchableOpacity>

          {stats.pendingAmount > 0 && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
              onPress={handleRecordPayment}
            >
              <Ionicons name="cash-outline" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Pay Balance</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#EF4444' }]}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 40 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center' },
  editButton: { width: 40, alignItems: 'flex-end' },
  content: { flex: 1 },
  profileCard: { margin: 16, marginTop: -20, borderRadius: 16, padding: 24, alignItems: 'center' },
  avatarContainer: { marginTop: -50 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#fff' },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#fff' },
  supplierName: { fontSize: 22, fontWeight: '700', marginTop: 12 },
  gstNumber: { fontSize: 14, marginTop: 4, fontWeight: '500' },
  contactButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  contactBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, gap: 6 },
  contactBtnText: { color: '#fff', fontWeight: '600' },
  statsContainer: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  statCard: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  statValue: { color: '#fff', fontSize: 16, fontWeight: '700' },
  statLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 4 },
  sectionCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: 12, padding: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  infoText: { flex: 1, fontSize: 14 },
  purchaseItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  purchaseMain: { flex: 1 },
  purchaseNumber: { fontSize: 14, fontWeight: '500' },
  purchaseDate: { fontSize: 12, marginTop: 2 },
  purchaseRight: { alignItems: 'flex-end' },
  purchaseAmount: { fontSize: 14, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 4 },
  statusText: { fontSize: 11, fontWeight: '500' },
  actionButtons: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
