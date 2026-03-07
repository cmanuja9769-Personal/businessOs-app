import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
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
import { formatCurrency } from '@lib/utils';

interface TrialBalanceRow {
  account_name: string;
  account_code: string;
  account_type: string;
  debit_total: number;
  credit_total: number;
}

const TYPE_COLORS: Record<string, string> = {
  asset: '#10B981',
  liability: '#EF4444',
  equity: '#8B5CF6',
  revenue: '#0EA5E9',
  expense: '#F59E0B',
};

export default function TrialBalanceScreen() {
  const navigation = useNavigation<MoreStackNavigationProp>();
  const { colors, shadows, isDark } = useTheme();
  const { organizationId } = useAuth();

  const [rows, setRows] = useState<TrialBalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTrialBalance = async () => {
    if (!organizationId) return;
    try {
      const { data, error } = await supabase
        .from('trial_balance_view')
        .select('account_name, account_code, account_type, debit_total, credit_total')
        .eq('organization_id', organizationId)
        .order('account_code');

      if (error) throw error;
      setRows((data as TrialBalanceRow[]) || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTrialBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const totalDebits = rows.reduce((s, r) => s + (r.debit_total || 0), 0);
  const totalCredits = rows.reduce((s, r) => s + (r.credit_total || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  if (loading) return <Loading fullScreen />;

  if (rows.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="scale-outline"
          title="No trial balance data"
          description="Trial balance data will appear once accounting entries are posted"
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTrialBalance(); }} />
      }
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: colors.card, ...shadows.sm }]}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextBlock}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Trial Balance</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Verify debits and credits across all accounts</Text>
        </View>
      </View>

      <Card style={[styles.balanceIndicator, { borderLeftColor: isBalanced ? '#10B981' : '#EF4444', borderLeftWidth: 4 }]}>
        <View style={styles.balanceRow}>
          <Text style={[styles.balanceLabel, { color: colors.text }]}>Balance Status</Text>
          <Text style={[styles.balanceStatus, { color: isBalanced ? '#10B981' : '#EF4444' }]}>
            {isBalanced ? 'Balanced' : 'Unbalanced'}
          </Text>
        </View>
        <View style={styles.totalsSummary}>
          <View style={styles.totalCol}>
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total Debits</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>{formatCurrency(totalDebits)}</Text>
          </View>
          <View style={styles.totalCol}>
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total Credits</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>{formatCurrency(totalCredits)}</Text>
          </View>
        </View>
      </Card>

      <View style={[styles.tableHeader, { backgroundColor: colors.card, ...shadows.sm }]}>
        <Text style={[styles.thAccount, { color: colors.textSecondary }]}>Account</Text>
        <Text style={[styles.thAmount, { color: colors.textSecondary }]}>Debit</Text>
        <Text style={[styles.thAmount, { color: colors.textSecondary }]}>Credit</Text>
      </View>

      {rows.map((row) => {
        const typeColor = TYPE_COLORS[row.account_type] || colors.textSecondary;
        return (
          <View key={row.account_code} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
            <View style={styles.tdAccount}>
              <Text style={[styles.accountCode, { color: colors.textSecondary }]}>{row.account_code}</Text>
              <Text style={[styles.accountName, { color: colors.text }]}>{row.account_name}</Text>
              <Text style={[styles.accountType, { color: typeColor }]}>{row.account_type}</Text>
            </View>
            <Text style={[styles.tdAmount, { color: row.debit_total > 0 ? colors.text : colors.textSecondary }]}>
              {row.debit_total > 0 ? formatCurrency(row.debit_total) : '-'}
            </Text>
            <Text style={[styles.tdAmount, { color: row.credit_total > 0 ? colors.text : colors.textSecondary }]}>
              {row.credit_total > 0 ? formatCurrency(row.credit_total) : '-'}
            </Text>
          </View>
        );
      })}

      <View style={[styles.tableFooter, { backgroundColor: colors.card, ...shadows.sm }]}>
        <Text style={[styles.thAccount, { color: colors.text, fontWeight: '700' }]}>Total</Text>
        <Text style={[styles.thAmount, { color: colors.text, fontWeight: '700' }]}>{formatCurrency(totalDebits)}</Text>
        <Text style={[styles.thAmount, { color: colors.text, fontWeight: '700' }]}>{formatCurrency(totalCredits)}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 44 : 0,
    paddingBottom: spacing.md,
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
  balanceIndicator: {
    marginBottom: spacing.md,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  balanceLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  balanceStatus: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  totalsSummary: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  totalCol: {
    flex: 1,
  },
  totalLabel: {
    fontSize: fontSize.xs,
  },
  totalValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginTop: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.sm,
    marginBottom: 4,
  },
  thAccount: {
    flex: 2,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  thAmount: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  tdAccount: {
    flex: 2,
  },
  accountCode: {
    fontSize: 10,
    fontFamily: 'monospace',
  },
  accountName: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  accountType: {
    fontSize: 10,
    textTransform: 'capitalize',
    marginTop: 1,
  },
  tdAmount: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '500',
    textAlign: 'right',
  },
  tableFooter: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: spacing.sm,
    marginTop: 4,
  },
});
