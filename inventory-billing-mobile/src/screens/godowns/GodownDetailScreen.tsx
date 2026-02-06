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
  FlatList,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MoreStackParamList, MoreStackNavigationProp } from '@navigation/types';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import { supabase } from '@lib/supabase';
import { formatCurrency } from '@lib/utils';

type RouteProps = RouteProp<MoreStackParamList, 'GodownDetail'>;

interface Godown {
  id: string;
  name: string;
  code: string | null;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  is_default: boolean;
  created_at: string;
}

interface StockItem {
  id: string;
  item_id: string;
  item_name: string;
  sku?: string;
  quantity: number;
  unit: string;
  value: number;
}

interface Stats {
  totalItems: number;
  totalQuantity: number;
  totalValue: number;
  lowStock: number;
}

export default function GodownDetailScreen() {
  const navigation = useNavigation<MoreStackNavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors, shadows } = useTheme();
  const { organizationId } = useAuth();

  const { godownId } = route.params;

  const [godown, setGodown] = useState<Godown | null>(null);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [stats, setStats] = useState<Stats>({ totalItems: 0, totalQuantity: 0, totalValue: 0, lowStock: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGodownData();
  }, [godownId]);

  const loadGodownData = async () => {
    if (!godownId || !organizationId) return;
    setLoading(true);

    try {
      const { data: godownData, error: godownError } = await supabase
        .from('warehouses')
        .select('*')
        .eq('id', godownId)
        .single();

      if (godownError) throw godownError;
      setGodown(godownData);

      const { data: stockData, error: stockError } = await supabase
        .from('item_warehouse_stock')
        .select('*, items(name, sku, unit, purchase_price)')
        .eq('warehouse_id', godownId);

      if (stockError) throw stockError;

      const formattedStock = (stockData || []).map(s => ({
        id: s.id,
        item_id: s.item_id,
        item_name: s.items?.name || 'Unknown Item',
        sku: s.items?.sku,
        quantity: s.quantity || 0,
        unit: s.items?.unit || 'pcs',
        value: (s.quantity || 0) * (s.items?.purchase_price || 0),
      }));

      setStock(formattedStock);

      const lowStockCount = formattedStock.filter(s => s.quantity < 10).length;

      setStats({
        totalItems: formattedStock.length,
        totalQuantity: formattedStock.reduce((sum, s) => sum + s.quantity, 0),
        totalValue: formattedStock.reduce((sum, s) => sum + s.value, 0),
        lowStock: lowStockCount,
      });
    } catch (error) {
      console.error('Error loading godown:', error);
      Alert.alert('Error', 'Failed to load godown details');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigation.navigate('AddGodown', { godownId });
  };

  const handleSetDefault = async () => {
    if (godown?.is_default) {
      Alert.alert('Info', 'This is already the default godown');
      return;
    }

    Alert.alert(
      'Set as Default',
      'Make this the default godown for new stock?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              await supabase
                .from('warehouses')
                .update({ is_default: false })
                .eq('organization_id', organizationId);

              const { error } = await supabase
                .from('warehouses')
                .update({ is_default: true })
                .eq('id', godownId);

              if (error) throw error;
              loadGodownData();
              Alert.alert('Success', 'Default godown updated');
            } catch (error) {
              Alert.alert('Error', 'Failed to update default godown');
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    if (godown?.is_default) {
      Alert.alert('Cannot Delete', 'You cannot delete the default godown');
      return;
    }

    if (stock.length > 0) {
      Alert.alert('Cannot Delete', 'Please transfer or remove all stock before deleting this godown');
      return;
    }

    Alert.alert(
      'Delete Godown',
      'Are you sure you want to delete this godown?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('warehouses').delete().eq('id', godownId);
              if (error) throw error;
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete godown');
            }
          },
        },
      ]
    );
  };

  const renderStockItem = ({ item }: { item: StockItem }) => {
    const isLow = item.quantity < 10;

    return (
      <View style={[styles.stockItem, { backgroundColor: colors.card, ...shadows.sm }]}>
        <View style={styles.stockInfo}>
          <Text style={[styles.stockName, { color: colors.text }]} numberOfLines={1}>{item.item_name}</Text>
          {item.sku && <Text style={[styles.stockSku, { color: colors.textSecondary }]}>{item.sku}</Text>}
        </View>
        <View style={styles.stockRight}>
          <Text style={[styles.stockQty, { color: isLow ? '#EF4444' : colors.text }]}>
            {item.quantity} {item.unit}
          </Text>
          <Text style={[styles.stockValue, { color: colors.textSecondary }]}>{formatCurrency(item.value)}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!godown) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Godown not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Godown Details</Text>
        <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
          <Ionicons name="create-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.profileCard, { backgroundColor: colors.card, ...shadows.md }]}>
          <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.iconWrapper}>
            <Ionicons name="business-outline" size={32} color="#fff" />
          </LinearGradient>
          <Text style={[styles.godownName, { color: colors.text }]}>{godown.name}</Text>
          {godown.code && <Text style={[styles.godownCode, { color: colors.textSecondary }]}>Code: {godown.code}</Text>}
          {godown.is_default && (
            <View style={[styles.defaultBadge, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="checkmark-circle" size={14} color="#059669" />
              <Text style={styles.defaultText}>Default Godown</Text>
            </View>
          )}
        </View>

        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: '#6366F1' }]}>
            <Text style={styles.statValue}>{stats.totalItems}</Text>
            <Text style={styles.statLabel}>Items</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#10B981' }]}>
            <Text style={styles.statValue}>{stats.totalQuantity}</Text>
            <Text style={styles.statLabel}>Quantity</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#0EA5E9' }]}>
            <Text style={styles.statValue}>{formatCurrency(stats.totalValue)}</Text>
            <Text style={styles.statLabel}>Value</Text>
          </View>
        </View>

        {godown.address && (
          <View style={[styles.sectionCard, { backgroundColor: colors.card, ...shadows.sm }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.addressText, { color: colors.text }]}>
                {[godown.address, godown.city, godown.state, godown.pincode].filter(Boolean).join(', ')}
              </Text>
            </View>
          </View>
        )}

        <View style={[styles.sectionCard, { backgroundColor: colors.card, ...shadows.sm }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Stock Items</Text>
            {stats.lowStock > 0 && (
              <View style={styles.lowStockBadge}>
                <Text style={styles.lowStockText}>{stats.lowStock} Low Stock</Text>
              </View>
            )}
          </View>

          {stock.length === 0 ? (
            <View style={styles.emptyStock}>
              <Ionicons name="cube-outline" size={36} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No stock in this godown</Text>
            </View>
          ) : (
            stock.map(item => (
              <View key={item.id}>
                {renderStockItem({ item })}
              </View>
            ))
          )}
        </View>

        <View style={styles.actionButtons}>
          {!godown.is_default && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              onPress={handleSetDefault}
            >
              <Ionicons name="star-outline" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Set as Default</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#EF4444' }]}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>Delete Godown</Text>
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
  iconWrapper: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginTop: -50, borderWidth: 4, borderColor: '#fff' },
  godownName: { fontSize: 22, fontWeight: '700', marginTop: 12 },
  godownCode: { fontSize: 14, marginTop: 4 },
  defaultBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 12 },
  defaultText: { color: '#059669', fontSize: 12, fontWeight: '600' },
  statsContainer: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  statCard: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  statValue: { color: '#fff', fontSize: 16, fontWeight: '700' },
  statLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 4 },
  sectionCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: 12, padding: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  addressText: { flex: 1, fontSize: 14, lineHeight: 20 },
  lowStockBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  lowStockText: { color: '#DC2626', fontSize: 11, fontWeight: '500' },
  stockItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, marginBottom: 8 },
  stockInfo: { flex: 1 },
  stockName: { fontSize: 14, fontWeight: '500' },
  stockSku: { fontSize: 12, marginTop: 2 },
  stockRight: { alignItems: 'flex-end' },
  stockQty: { fontSize: 14, fontWeight: '600' },
  stockValue: { fontSize: 12, marginTop: 2 },
  emptyStock: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { fontSize: 14, marginTop: 10 },
  actionButtons: { padding: 16, paddingTop: 0, gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
