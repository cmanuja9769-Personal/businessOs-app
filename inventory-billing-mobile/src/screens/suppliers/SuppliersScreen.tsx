import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MoreStackNavigationProp } from '@navigation/types';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import Loading from '@components/ui/Loading';
import EmptyState from '@components/ui/EmptyState';
import { supabase } from '@lib/supabase';

interface Supplier {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  gst_number?: string | null;
  address?: string | null;
  gstin?: string | null;
}

export default function SuppliersScreen() {
  const navigation = useNavigation<MoreStackNavigationProp>();
  const { colors, shadows, isDark } = useTheme();
  const { organizationId } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSuppliers();
  }, [organizationId]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = suppliers.filter(
        (supplier) =>
          supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          supplier.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          supplier.phone?.includes(searchQuery)
      );
      setFilteredSuppliers(filtered);
    } else {
      setFilteredSuppliers(suppliers);
    }
  }, [searchQuery, suppliers]);

  const fetchSuppliers = async () => {
    try {
      console.log('[SUPPLIERS] Fetching suppliers for org:', organizationId);
      if (!organizationId) {
        console.warn('[SUPPLIERS] No organizationId available');
        setSuppliers([]);
        setFilteredSuppliers([]);
        return;
      }

      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');

      console.log('[SUPPLIERS] Query result:', { count: data?.length, error });

      if (error) throw error;
      setSuppliers(data || []);
      setFilteredSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      Alert.alert('Error', 'Failed to fetch suppliers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSuppliers();
  }, [organizationId]);

  const confirmDelete = (supplier: Supplier) => {
    if (!organizationId) return;
    Alert.alert(
      'Delete Supplier',
      `Are you sure you want to delete "${supplier.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('suppliers')
                .delete()
                .eq('organization_id', organizationId)
                .eq('id', supplier.id);
              if (error) throw error;
              fetchSuppliers();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to delete supplier');
            }
          },
        },
      ]
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderItem = ({ item, index }: { item: Supplier; index: number }) => {
    const gradientColors: [string, string][] = [
      ['#4F46E5', '#6366F1'],
      ['#059669', '#10B981'],
      ['#D97706', '#F59E0B'],
      ['#0369A1', '#0EA5E9'],
      ['#7C3AED', '#8B5CF6'],
    ];
    const colorIndex = index % gradientColors.length;

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('SupplierDetail', { supplierId: item.id })}
        onLongPress={() =>
          Alert.alert('Supplier', item.name, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'View', onPress: () => navigation.navigate('SupplierDetail', { supplierId: item.id }) },
            { text: 'Edit', onPress: () => navigation.navigate('AddSupplier', { supplierId: item.id }) },
            { text: 'Delete', style: 'destructive', onPress: () => confirmDelete(item) },
          ])
        }
        activeOpacity={0.7}
        style={[styles.supplierCard, { backgroundColor: colors.card, ...shadows.sm }]}
      >
        <View style={styles.supplierRow}>
          <LinearGradient
            colors={gradientColors[colorIndex]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarGradient}
          >
            <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
          </LinearGradient>
          
          <View style={styles.supplierInfo}>
            <Text style={[styles.supplierName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            
            {item.email && (
              <View style={styles.detailRow}>
                <Ionicons name="mail-outline" size={14} color={colors.textTertiary} />
                <Text style={[styles.detailText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.email}
                </Text>
              </View>
            )}
            
            {item.phone && (
              <View style={styles.detailRow}>
                <Ionicons name="call-outline" size={14} color={colors.textTertiary} />
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                  {item.phone}
                </Text>
              </View>
            )}
            
            {(item.gst_number || item.gstin) && (
              <View style={[styles.gstBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.gstText, { color: colors.primary }]}>
                  GSTIN: {item.gst_number || item.gstin}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.chevronContainer}>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <Loading fullScreen />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
        backgroundColor={colors.background}
      />
      
      {/* Search Header */}
      <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, ...shadows.xs }]}>
          <Ionicons name="search" size={20} color={colors.textTertiary} />
          <TextInput
            placeholder="Search suppliers..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Results Count */}
        <Text style={[styles.resultsText, { color: colors.textSecondary }]}>
          {filteredSuppliers.length} supplier{filteredSuppliers.length !== 1 ? 's' : ''}
        </Text>
      </View>
      
      <FlatList
        data={filteredSuppliers}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="business-outline"
            title="No suppliers found"
            description={searchQuery ? 'Try a different search term' : 'Add your first supplier to get started'}
            actionText={!searchQuery ? 'Add Supplier' : undefined}
            onAction={!searchQuery ? () => navigation.navigate('AddSupplier', {}) : undefined}
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab]}
        onPress={() => navigation.navigate('AddSupplier', {})}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#4F46E5', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color="#ffffff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

// Import TextInput
import { TextInput } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    marginLeft: 10,
    marginRight: 10,
    padding: 0,
  },
  resultsText: {
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  supplierCard: {
    borderRadius: 16,
    padding: 16,
  },
  supplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarGradient: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  detailText: {
    fontSize: 13,
    marginLeft: 6,
  },
  gstBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  gstText: {
    fontSize: 11,
    fontWeight: '600',
  },
  chevronContainer: {
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
});
