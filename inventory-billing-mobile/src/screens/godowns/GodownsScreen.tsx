import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import Card from '@components/ui/Card';
import Loading from '@components/ui/Loading';
import EmptyState from '@components/ui/EmptyState';
import { spacing, fontSize } from '@theme/spacing';
import { supabase } from '@lib/supabase';

interface Godown {
  id: string;
  name: string;
  code: string | null;
  is_default: boolean;
}

export default function GodownsScreen() {
  const { colors } = useTheme();
  const { organizationId } = useAuth();
  const navigation = useNavigation<any>();
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchGodowns();
  }, [organizationId]);

  const fetchGodowns = async () => {
    try {
      console.log('[GODOWNS] Fetching godowns for org:', organizationId);
      if (!organizationId) {
        console.warn('[GODOWNS] No organizationId available');
        setGodowns([]);
        return;
      }

      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('organization_id', organizationId)
        .order('is_default', { ascending: false })
        .order('name');

      console.log('[GODOWNS] Query result:', { count: data?.length, error });

      if (error) throw error;
      setGodowns(data || []);
    } catch (error) {
      console.error('Error fetching godowns:', error);
      Alert.alert('Error', 'Failed to fetch godowns');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchGodowns();
  };

  const renderItem = ({ item }: { item: Godown }) => (
    <TouchableOpacity onPress={() => navigation.navigate('GodownDetail', { godownId: item.id })}>
      <Card style={styles.godownCard}>
        <View style={styles.godownHeader}>
          <View style={styles.godownInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.godownName, { color: colors.text }]}>
                {item.name}
              </Text>
              {item.is_default && (
                <View style={[styles.defaultBadge, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.defaultText, { color: colors.primary }]}>Default</Text>
                </View>
              )}
            </View>
            <Text style={[styles.godownLocation, { color: colors.textSecondary }]}>
              <Ionicons name="barcode" size={14} /> {item.code || '—'}
            </Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return <Loading fullScreen />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={godowns}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="business-outline"
            title="No godowns found"
            description="Godowns help you manage inventory across multiple locations"
          />
        }
      />
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('AddGodown')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
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
  godownCard: {
    marginBottom: spacing.md,
  },
  godownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  godownInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  godownName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  defaultBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 12,
  },
  defaultText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  godownLocation: {
    fontSize: fontSize.sm,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
