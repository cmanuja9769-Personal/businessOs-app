import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { InventoryStackNavigationProp } from '@navigation/types';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import { supabase } from '@lib/supabase';
import { formatDate } from '@lib/utils';
import EmptyState from '@components/ui/EmptyState';
import Loading from '@components/ui/Loading';

interface BarcodeLog {
  id: string;
  item_name: string;
  barcode_value: string;
  barcode_type: string;
  quantity_printed: number;
  label_size: string;
  created_at: string;
}

export default function BarcodeLogsScreen() {
  const navigation = useNavigation<InventoryStackNavigationProp>();
  const { colors, shadows } = useTheme();
  const { organizationId } = useAuth();

  const [logs, setLogs] = useState<BarcodeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalPrinted, setTotalPrinted] = useState(0);

  const fetchLogs = useCallback(async (isRefresh = false) => {
    if (!organizationId) return;
    if (!isRefresh) setLoading(true);

    try {
      const { data, error } = await supabase
        .from('barcode_logs')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      const items = (data || []) as BarcodeLog[];
      setLogs(items);
      setTotalPrinted(items.reduce((sum, l) => sum + (l.quantity_printed || 0), 0));
    } catch (err) {
      console.error('Error loading barcode logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [organizationId]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLogs(true);
  }, [fetchLogs]);

  if (loading && logs.length === 0) {
    return <Loading fullScreen text="Loading barcode logs..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#7C3AED', '#8B5CF6']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Barcode Logs</Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: '#8B5CF6' }]}>
          <Ionicons name="print-outline" size={20} color="#fff" />
          <Text style={styles.statValue}>{logs.length}</Text>
          <Text style={styles.statLabel}>Print Jobs</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#6366F1' }]}>
          <Ionicons name="barcode-outline" size={20} color="#fff" />
          <Text style={styles.statValue}>{totalPrinted}</Text>
          <Text style={styles.statLabel}>Labels Printed</Text>
        </View>
      </View>

      <FlatList
        data={logs}
        keyExtractor={l => l.id}
        contentContainerStyle={[styles.listContent, logs.length === 0 && styles.listEmpty]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        renderItem={({ item: log }) => (
          <View style={[styles.logCard, { backgroundColor: colors.card, ...shadows.sm }]}>
            <View style={styles.logRow}>
              <View style={[styles.logIcon, { backgroundColor: '#8B5CF620' }]}>
                <Ionicons name="barcode" size={20} color="#8B5CF6" />
              </View>
              <View style={styles.logInfo}>
                <Text style={[styles.logName, { color: colors.text }]} numberOfLines={1}>{log.item_name}</Text>
                <Text style={[styles.logBarcode, { color: colors.textSecondary }]}>{log.barcode_value}</Text>
              </View>
              <View style={styles.logRight}>
                <Text style={[styles.logQty, { color: colors.primary }]}>x{log.quantity_printed}</Text>
                <Text style={[styles.logDate, { color: colors.textTertiary }]}>{formatDate(log.created_at)}</Text>
              </View>
            </View>
            <View style={styles.logTags}>
              <View style={[styles.tag, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.tagText, { color: colors.primary }]}>{log.barcode_type}</Text>
              </View>
              <View style={[styles.tag, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.tagText, { color: colors.primary }]}>{log.label_size}</Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={<EmptyState icon="receipt-outline" title="No barcode logs" description="Barcode print history will appear here" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 40 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center' },
  headerRight: { width: 40 },
  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  statCard: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', gap: 4 },
  statValue: { color: '#fff', fontSize: 20, fontWeight: '700' },
  statLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },
  listContent: { padding: 16, paddingBottom: 40 },
  listEmpty: { flexGrow: 1 },
  logCard: { borderRadius: 12, padding: 14, marginBottom: 10 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logInfo: { flex: 1 },
  logName: { fontSize: 14, fontWeight: '600' },
  logBarcode: { fontSize: 11, marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  logRight: { alignItems: 'flex-end' },
  logQty: { fontSize: 16, fontWeight: '700' },
  logDate: { fontSize: 10, marginTop: 2 },
  logTags: { flexDirection: 'row', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.06)' },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText: { fontSize: 10, fontWeight: '600' },
});
