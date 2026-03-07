import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import Card from '@components/ui/Card';
import Loading from '@components/ui/Loading';
import EmptyState from '@components/ui/EmptyState';
import { MoreStackNavigationProp } from '@navigation/types';
import { spacing, fontSize } from '@theme/spacing';
import { supabase } from '@lib/supabase';
import { lightTap } from '@lib/haptics';

interface Account {
  id: string;
  name: string;
  code: string;
  type: string;
  parent_id: string | null;
  balance: number;
  is_system: boolean;
}

const ACCOUNT_TYPES = ['All', 'Asset', 'Liability', 'Equity', 'Revenue', 'Expense'] as const;

const TYPE_COLORS: Record<string, string> = {
  Asset: '#10B981',
  Liability: '#EF4444',
  Equity: '#8B5CF6',
  Revenue: '#0EA5E9',
  Expense: '#F59E0B',
};

export default function ChartOfAccountsScreen() {
  const navigation = useNavigation<MoreStackNavigationProp>();
  const { colors, shadows, isDark } = useTheme();
  const { organizationId } = useAuth();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('All');

  const fetchAccounts = useCallback(async () => {
    if (!organizationId) return;
    try {
      let query = supabase
        .from('chart_of_accounts')
        .select('id, name, code, type, parent_id, balance, is_system')
        .eq('organization_id', organizationId)
        .order('code');

      if (selectedType !== 'All') {
        query = query.eq('type', selectedType.toLowerCase());
      }

      const { data, error } = await query;
      if (error) throw error;
      setAccounts((data as Account[]) || []);
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [organizationId, selectedType]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const typeCounts = accounts.reduce<Record<string, number>>((acc, a) => {
    const type = a.type.charAt(0).toUpperCase() + a.type.slice(1);
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const renderItem = ({ item }: { item: Account }) => {
    const typeKey = item.type.charAt(0).toUpperCase() + item.type.slice(1);
    const typeColor = TYPE_COLORS[typeKey] || colors.primary;

    return (
      <Card style={{ marginBottom: spacing.sm }}>
        <View style={styles.accountRow}>
          <View style={[styles.typeIndicator, { backgroundColor: typeColor }]} />
          <View style={{ flex: 1 }}>
            <View style={styles.accountHeader}>
              <Text style={[styles.accountCode, { color: colors.textSecondary }]}>{item.code}</Text>
              {item.is_system ? (
                <View style={[styles.systemBadge, { backgroundColor: `${colors.primary}20` }]}>
                  <Text style={[styles.systemText, { color: colors.primary }]}>System</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.accountName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.accountType, { color: typeColor }]}>{typeKey}</Text>
          </View>
          <Text style={[styles.accountBalance, { color: item.balance >= 0 ? '#10B981' : '#EF4444' }]}>
            {item.balance != null ? `₹${Math.abs(item.balance).toLocaleString('en-IN')}` : '₹0'}
          </Text>
        </View>
      </Card>
    );
  };

  if (loading) return <Loading fullScreen />;

  const systemAccountCount = accounts.filter((account) => account.is_system).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: colors.card, ...shadows.sm }]}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextBlock}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Chart of Accounts</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Browse accounts by type and balance</Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{accounts.length}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Visible</Text>
        </Card>
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{systemAccountCount}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>System</Text>
        </Card>
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{selectedType}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Filter</Text>
        </Card>
      </View>

      <View style={styles.filterRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={ACCOUNT_TYPES as unknown as string[]}
          keyExtractor={(item) => item}
          contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm }}
          renderItem={({ item: type }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                {
                  backgroundColor: selectedType === type ? colors.primary : colors.card,
                  borderColor: selectedType === type ? colors.primary : colors.border,
                },
              ]}
              onPress={() => { lightTap(); setSelectedType(type); }}
            >
              <Text style={{ color: selectedType === type ? '#fff' : colors.text, fontSize: fontSize.sm, fontWeight: '500' }}>
                {type} {type !== 'All' && typeCounts[type] ? `(${typeCounts[type]})` : ''}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={accounts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, accounts.length === 0 && { flexGrow: 1 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAccounts(); }} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="list-outline"
            title="No accounts found"
            description="Chart of accounts will be created when you set up your accounting"
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
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 0) + 16,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerTextBlock: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  summaryValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  filterRow: {
    paddingVertical: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
  },
  listContent: {
    padding: spacing.md,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  typeIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  accountCode: {
    fontSize: fontSize.xs,
    fontFamily: 'monospace',
  },
  systemBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: 4,
  },
  systemText: {
    fontSize: 10,
    fontWeight: '600',
  },
  accountName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginTop: 2,
  },
  accountType: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  accountBalance: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
