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
import { MoreStackNavigationProp } from '@navigation/types';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import Card from '@components/ui/Card';
import Loading from '@components/ui/Loading';
import EmptyState from '@components/ui/EmptyState';
import { spacing, fontSize } from '@theme/spacing';
import { supabase } from '@lib/supabase';
import { formatCurrency } from '@lib/utils';
import { lightTap } from '@lib/haptics';

interface JournalEntry {
  id: string;
  entry_number: string;
  date: string;
  description: string;
  status: string;
  total_debit: number;
  total_credit: number;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#F59E0B',
  posted: '#10B981',
  reversed: '#EF4444',
};

const FILTER_OPTIONS = ['All', 'Draft', 'Posted', 'Reversed'] as const;

export default function JournalEntriesScreen() {
  const navigation = useNavigation<MoreStackNavigationProp>();
  const { colors, shadows, isDark } = useTheme();
  const { organizationId } = useAuth();

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const fetchEntries = useCallback(async () => {
    if (!organizationId) return;
    try {
      let query = supabase
        .from('journal_entries')
        .select('id, entry_number, date, description, status, total_debit, total_credit, created_at')
        .eq('organization_id', organizationId)
        .order('date', { ascending: false })
        .limit(100);

      if (statusFilter !== 'All') {
        query = query.eq('status', statusFilter.toLowerCase());
      }

      const { data, error } = await query;
      if (error) throw error;
      setEntries((data as JournalEntry[]) || []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [organizationId, statusFilter]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const renderItem = ({ item }: { item: JournalEntry }) => {
    const statusColor = STATUS_COLORS[item.status] || colors.textSecondary;
    return (
      <TouchableOpacity
        onPress={() => {
          lightTap();
          navigation.navigate('JournalEntryDetail', { entryId: item.id });
        }}
      >
        <Card style={{ marginBottom: spacing.sm }}>
          <View style={styles.entryHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.entryNumber, { color: colors.primary }]}>{item.entry_number}</Text>
              <Text style={[styles.entryDate, { color: colors.textSecondary }]}>
                {new Date(item.date).toLocaleDateString()}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{item.status.toUpperCase()}</Text>
            </View>
          </View>
          {item.description ? (
            <Text style={[styles.entryDesc, { color: colors.textSecondary }]} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
          <View style={styles.entryFooter}>
            <View style={styles.debitCredit}>
              <Text style={[styles.dcLabel, { color: colors.textSecondary }]}>Debit</Text>
              <Text style={[styles.dcValue, { color: colors.text }]}>{formatCurrency(item.total_debit)}</Text>
            </View>
            <View style={styles.debitCredit}>
              <Text style={[styles.dcLabel, { color: colors.textSecondary }]}>Credit</Text>
              <Text style={[styles.dcValue, { color: colors.text }]}>{formatCurrency(item.total_credit)}</Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) return <Loading fullScreen />;

  const postedCount = entries.filter((entry) => entry.status === 'posted').length;
  const draftCount = entries.filter((entry) => entry.status === 'draft').length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: colors.card, ...shadows.sm }]}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextBlock}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Journal Entries</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Review drafts, posted entries, and balances</Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{entries.length}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Entries</Text>
        </Card>
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: '#10B981' }]}>{postedCount}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Posted</Text>
        </Card>
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>{draftCount}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Drafts</Text>
        </Card>
      </View>

      <View style={styles.topBar}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTER_OPTIONS as unknown as string[]}
          keyExtractor={(item) => item}
          contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm }}
          renderItem={({ item: filter }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                {
                  backgroundColor: statusFilter === filter ? colors.primary : colors.card,
                  borderColor: statusFilter === filter ? colors.primary : colors.border,
                },
              ]}
              onPress={() => { lightTap(); setStatusFilter(filter); }}
            >
              <Text style={{ color: statusFilter === filter ? '#fff' : colors.text, fontSize: fontSize.sm, fontWeight: '500' }}>
                {filter}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={entries}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, entries.length === 0 && { flexGrow: 1 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchEntries(); }} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="journal-outline"
            title="No journal entries"
            description="Journal entries created from the web app will appear here"
          />
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, ...shadows.md }]}
        onPress={() => {
          lightTap();
          navigation.navigate('CreateJournalEntry');
        }}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>
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
  topBar: {
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
    paddingBottom: 80,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  entryNumber: {
    fontSize: fontSize.md,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  entryDate: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  entryDesc: {
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
  },
  entryFooter: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  debitCredit: {
    gap: 2,
  },
  dcLabel: {
    fontSize: fontSize.xs,
  },
  dcValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.md,
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
