import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MoreStackNavigationProp } from '@navigation/types';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import Card from '@components/ui/Card';
import Loading from '@components/ui/Loading';
import EmptyState from '@components/ui/EmptyState';
import Input from '@components/ui/Input';
import { spacing, fontSize } from '@theme/spacing';
import { supabase } from '@lib/supabase';

interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  // preferred (web)
  gst_number?: string | null;
  address?: string | null;
  // legacy (if present)
  gstin?: string | null;
  billing_address?: string | null;
}

export default function CustomersScreen() {
  const navigation = useNavigation<MoreStackNavigationProp>();
  const { colors } = useTheme();
  const { organizationId } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, [organizationId]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = customers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          customer.phone?.includes(searchQuery)
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customers);
    }
  }, [searchQuery, customers]);

  const fetchCustomers = async () => {
    try {
      console.log('[CUSTOMERS] Fetching customers for org:', organizationId);
      if (!organizationId) {
        console.warn('[CUSTOMERS] No organizationId available');
        setCustomers([]);
        setFilteredCustomers([]);
        return;
      }

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');

      console.log('[CUSTOMERS] Query result:', { count: data?.length, error });

      if (error) throw error;
      setCustomers(data || []);
      setFilteredCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCustomers();
  };

  const renderItem = ({ item }: { item: Customer }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('CustomerDetail', { customerId: item.id })}
    >
      <Card style={styles.customerCard}>
        <View style={styles.customerHeader}>
          <View style={styles.customerInfo}>
            <Text style={[styles.customerName, { color: colors.text }]}>
              {item.name}
            </Text>
            {item.email && (
              <Text style={[styles.customerDetail, { color: colors.textSecondary }]}>
                <Ionicons name="mail" size={14} /> {item.email}
              </Text>
            )}
            {item.phone && (
              <Text style={[styles.customerDetail, { color: colors.textSecondary }]}>
                <Ionicons name="call" size={14} /> {item.phone}
              </Text>
            )}
            {(item.gst_number || item.gstin) && (
              <Text style={[styles.customerDetail, { color: colors.textSecondary }]}>
                GSTIN: {item.gst_number || item.gstin}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </View>
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return <Loading fullScreen />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.searchContainer}>
        <Input
          placeholder="Search customers..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="search"
          containerStyle={styles.searchInput}
        />
      </View>
      <FlatList
        data={filteredCustomers}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="No customers found"
            description={searchQuery ? 'Try a different search term' : 'Add your first customer to get started'}
            actionText={!searchQuery ? 'Add Customer' : undefined}
            onAction={!searchQuery ? () => navigation.navigate('AddCustomer', {}) : undefined}
          />
        }
      />
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('AddCustomer', {})}
      >
        <Ionicons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    padding: spacing.md,
    paddingBottom: 0,
  },
  searchInput: {
    marginBottom: 0,
  },
  listContent: {
    padding: spacing.md,
  },
  customerCard: {
    marginBottom: spacing.md,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  customerDetail: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs / 2,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
