import React, { useState, useEffect } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MoreStackNavigationProp } from '@navigation/types';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import { supabase } from '@lib/supabase';
import { formatCurrency, formatDate } from '@lib/utils';

interface EWayBill {
  id: string;
  ewb_no: string;
  ewb_date: string;
  valid_upto: string;
  status: 'active' | 'cancelled' | 'expired';
  invoice_id: string;
  invoice_number?: string;
  customer_name?: string;
  vehicle_no?: string;
  distance?: number;
  total_value?: number;
  created_at: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: '#D1FAE5', text: '#059669' },
  cancelled: { bg: '#FEE2E2', text: '#DC2626' },
  expired: { bg: '#FEF3C7', text: '#D97706' },
};

export default function EwaybillsScreen() {
  const navigation = useNavigation<MoreStackNavigationProp>();
  const { colors, shadows } = useTheme();
  const { organizationId } = useAuth();

  const [ewaybills, setEwaybills] = useState<EWayBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, expired: 0 });

  useEffect(() => {
    loadEwaybills();
  }, [organizationId]);

  const loadEwaybills = async () => {
    if (!organizationId) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('ewaybills')
        .select('*, invoices(invoice_number, total, customers(name))')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = (data || []).map(ewb => ({
        ...ewb,
        invoice_number: ewb.invoices?.invoice_number,
        customer_name: ewb.invoices?.customers?.name,
        total_value: ewb.invoices?.total,
      }));

      setEwaybills(formattedData);

      const active = formattedData.filter(e => e.status === 'active').length;
      const expired = formattedData.filter(e => e.status === 'expired').length;

      setStats({ total: formattedData.length, active, expired });
    } catch (error) {
      console.error('Error loading e-waybills:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEwaybills();
    setRefreshing(false);
  };

  const handleGenerateNew = () => {
    Alert.alert(
      'Generate E-Way Bill',
      'E-Way Bill generation requires an invoice. Please go to an invoice and generate the E-Way Bill from there.',
      [{ text: 'OK' }]
    );
  };

  const handleCancelEwaybill = (ewb: EWayBill) => {
    if (ewb.status !== 'active') {
      Alert.alert('Cannot Cancel', 'Only active E-Way Bills can be cancelled.');
      return;
    }

    Alert.alert(
      'Cancel E-Way Bill',
      `Are you sure you want to cancel E-Way Bill ${ewb.ewb_no}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('ewaybills')
                .update({ status: 'cancelled' })
                .eq('id', ewb.id);

              if (error) throw error;
              loadEwaybills();
              Alert.alert('Success', 'E-Way Bill cancelled successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel E-Way Bill');
            }
          },
        },
      ]
    );
  };

  const isExpiringSoon = (validUpto: string) => {
    const diff = new Date(validUpto).getTime() - Date.now();
    return diff > 0 && diff < 24 * 60 * 60 * 1000;
  };

  const renderEwaybill = ({ item: ewb }: { item: EWayBill }) => {
    const statusStyle = STATUS_COLORS[ewb.status] || STATUS_COLORS.active;
    const expiringSoon = ewb.status === 'active' && isExpiringSoon(ewb.valid_upto);

    return (
      <TouchableOpacity
        style={[styles.ewaybillCard, { backgroundColor: colors.card, ...shadows.sm }]}
        onPress={() => handleCancelEwaybill(ewb)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.ewbInfo}>
            <Text style={[styles.ewbNo, { color: colors.text }]}>{ewb.ewb_no}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusText, { color: statusStyle.text }]}>
                {ewb.status.charAt(0).toUpperCase() + ewb.status.slice(1)}
              </Text>
            </View>
          </View>
          {expiringSoon && (
            <View style={[styles.warningBadge]}>
              <Ionicons name="warning" size={14} color="#D97706" />
              <Text style={styles.warningText}>Expiring Soon</Text>
            </View>
          )}
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              {ewb.invoice_number || 'Invoice'}
            </Text>
          </View>
          {ewb.customer_name && (
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.text }]}>{ewb.customer_name}</Text>
            </View>
          )}
          {ewb.vehicle_no && (
            <View style={styles.infoRow}>
              <Ionicons name="car-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.text }]}>{ewb.vehicle_no}</Text>
            </View>
          )}
        </View>

        <View style={[styles.cardFooter, { borderColor: colors.border }]}>
          <View style={styles.dateInfo}>
            <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Generated</Text>
            <Text style={[styles.dateValue, { color: colors.text }]}>{formatDate(ewb.ewb_date)}</Text>
          </View>
          <View style={styles.dateInfo}>
            <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Valid Until</Text>
            <Text style={[
              styles.dateValue, 
              { color: expiringSoon ? '#D97706' : ewb.status === 'expired' ? '#DC2626' : colors.text }
            ]}>
              {formatDate(ewb.valid_upto)}
            </Text>
          </View>
          {ewb.total_value && (
            <View style={styles.dateInfo}>
              <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Value</Text>
              <Text style={[styles.dateValue, { color: colors.primary }]}>{formatCurrency(ewb.total_value)}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#8B5CF6', '#A78BFA']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>E-Way Bills</Text>
        <TouchableOpacity onPress={handleGenerateNew} style={styles.addButton}>
          <Ionicons name="add-circle-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: '#8B5CF6' }]}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#10B981' }]}>
          <Text style={styles.statValue}>{stats.active}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#F59E0B' }]}>
          <Text style={styles.statValue}>{stats.expired}</Text>
          <Text style={styles.statLabel}>Expired</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={ewaybills}
          keyExtractor={item => item.id}
          renderItem={renderEwaybill}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No E-Way Bills</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Generate E-Way Bills from your invoices
              </Text>
            </View>
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
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center' },
  addButton: { width: 40, alignItems: 'flex-end' },
  statsContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  statCard: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  statValue: { color: '#fff', fontSize: 20, fontWeight: '700' },
  statLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16 },
  ewaybillCard: { borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, paddingBottom: 10 },
  ewbInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ewbNo: { fontSize: 16, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },
  warningBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  warningText: { fontSize: 10, color: '#D97706', fontWeight: '500' },
  cardBody: { paddingHorizontal: 14, paddingBottom: 10, gap: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 13 },
  cardFooter: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, padding: 14, paddingTop: 12 },
  dateInfo: { flex: 1 },
  dateLabel: { fontSize: 10 },
  dateValue: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptyText: { fontSize: 14, marginTop: 8, textAlign: 'center' },
});
