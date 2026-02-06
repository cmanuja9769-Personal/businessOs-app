import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MoreStackNavigationProp } from '@navigation/types';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import Loading from '@components/ui/Loading';
import EmptyState from '@components/ui/EmptyState';
import { supabase } from '@lib/supabase';
import { formatCurrency, formatDate } from '@lib/utils';

interface Purchase {
  id: string;
  purchase_no: string;
  supplier_name: string;
  date: string;
  total: number;
  paid_amount: number;
  balance: number;
  status: 'paid' | 'unpaid' | 'partial';
}

export default function PurchasesScreen() {
  const navigation = useNavigation<MoreStackNavigationProp>();
  const { colors, shadows } = useTheme();
  const { organizationId } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [search, setSearch] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadPurchases();
    }, [organizationId])
  );

  const loadPurchases = async () => {
    if (!organizationId) return;

    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('id, purchase_no, supplier_name, date, total, paid_amount, balance, status')
        .eq('organization_id', organizationId)
        .order('date', { ascending: false });

      if (error) throw error;
      setPurchases(data || []);
    } catch (error) {
      console.error('Error loading purchases:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPurchases();
  };

  const filteredPurchases = purchases.filter(p =>
    p.purchase_no.toLowerCase().includes(search.toLowerCase()) ||
    p.supplier_name.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#10B981';
      case 'unpaid': return '#EF4444';
      case 'partial': return '#F59E0B';
      default: return colors.textSecondary;
    }
  };

  const totalStats = {
    total: purchases.reduce((sum, p) => sum + p.total, 0),
    paid: purchases.reduce((sum, p) => sum + p.paid_amount, 0),
    pending: purchases.reduce((sum, p) => sum + p.balance, 0),
  };

  if (loading) {
    return <Loading text="Loading purchases..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#4F46E5', '#6366F1']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Purchases</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('CreatePurchase', {})}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: colors.card, ...shadows.sm }]}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(totalStats.total)}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, ...shadows.sm }]}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Paid</Text>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{formatCurrency(totalStats.paid)}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, ...shadows.sm }]}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{formatCurrency(totalStats.pending)}</Text>
        </View>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search purchases..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {filteredPurchases.length === 0 ? (
        <EmptyState
          icon="cart-outline"
          title="No Purchases"
          description={search ? 'No purchases match your search' : 'Create your first purchase to get started'}
          actionText="New Purchase"
          onAction={() => navigation.navigate('CreatePurchase', {})}
        />
      ) : (
        <FlatList
          data={filteredPurchases}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.purchaseCard, { backgroundColor: colors.card, ...shadows.sm }]}
              onPress={() => navigation.navigate('PurchaseDetail', { purchaseId: item.id })}
            >
              <View style={styles.purchaseHeader}>
                <View>
                  <Text style={[styles.purchaseNo, { color: colors.text }]}>{item.purchase_no}</Text>
                  <Text style={[styles.supplierName, { color: colors.textSecondary }]}>{item.supplier_name}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                  <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                </View>
              </View>
              <View style={styles.purchaseFooter}>
                <Text style={[styles.purchaseDate, { color: colors.textSecondary }]}>{formatDate(item.date)}</Text>
                <Text style={[styles.purchaseAmount, { color: colors.primary }]}>{formatCurrency(item.total)}</Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 40 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center' },
  addButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  statsContainer: { flexDirection: 'row', padding: 16, gap: 12 },
  statCard: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  statLabel: { fontSize: 12, marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: '700' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16 },
  listContent: { padding: 16, paddingTop: 8 },
  purchaseCard: { borderRadius: 12, padding: 16, marginBottom: 12 },
  purchaseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  purchaseNo: { fontSize: 16, fontWeight: '600' },
  supplierName: { fontSize: 14, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600', color: '#fff' },
  purchaseFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.1)' },
  purchaseDate: { fontSize: 13 },
  purchaseAmount: { fontSize: 18, fontWeight: '700' },
});
