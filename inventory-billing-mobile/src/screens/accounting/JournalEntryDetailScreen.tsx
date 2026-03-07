import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MoreStackParamList, MoreStackNavigationProp } from '@navigation/types';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import Card from '@components/ui/Card';
import Button from '@components/ui/Button';
import Loading from '@components/ui/Loading';
import { spacing, fontSize } from '@theme/spacing';
import { supabase } from '@lib/supabase';
import { formatCurrency } from '@lib/utils';
import { useToast } from '@contexts/ToastContext';
import { successFeedback, errorFeedback } from '@lib/haptics';

interface JournalLine {
  id: string;
  account_name: string;
  account_code: string;
  debit: number;
  credit: number;
  description: string | null;
}

interface JournalEntryData {
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

export default function JournalEntryDetailScreen() {
  const route = useRoute<RouteProp<MoreStackParamList, 'JournalEntryDetail'>>();
  const navigation = useNavigation<MoreStackNavigationProp>();
  const { colors, shadows, isDark } = useTheme();
  const { organizationId } = useAuth();
  const toast = useToast();
  const { entryId } = route.params;

  const [entry, setEntry] = useState<JournalEntryData | null>(null);
  const [lines, setLines] = useState<JournalLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [posting, setPosting] = useState(false);

  const fetchEntry = async () => {
    if (!organizationId) return;
    try {
      const [entryRes, linesRes] = await Promise.all([
        supabase
          .from('journal_entries')
          .select('*')
          .eq('id', entryId)
          .eq('organization_id', organizationId)
          .maybeSingle(),
        supabase
          .from('journal_entry_lines')
          .select('id, account_name, account_code, debit, credit, description')
          .eq('journal_entry_id', entryId)
          .order('created_at'),
      ]);

      if (entryRes.error) throw entryRes.error;
      setEntry(entryRes.data as JournalEntryData);
      setLines((linesRes.data as JournalLine[]) || []);
    } catch {
      toast.error('Failed to load journal entry');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEntry();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryId, organizationId]);

  const handlePost = () => {
    Alert.alert('Post Entry', 'Once posted, this entry cannot be edited. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Post',
        onPress: async () => {
          setPosting(true);
          try {
            const { error } = await supabase
              .from('journal_entries')
              .update({ status: 'posted' })
              .eq('id', entryId)
              .eq('organization_id', organizationId);
            if (error) throw error;
            await successFeedback();
            toast.success('Entry posted');
            fetchEntry();
          } catch {
            await errorFeedback();
            toast.error('Failed to post entry');
          } finally {
            setPosting(false);
          }
        },
      },
    ]);
  };

  if (loading) return <Loading fullScreen />;
  if (!entry) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="journal-outline" size={64} color={colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Entry not found</Text>
        <Button title="Go Back" onPress={() => navigation.goBack()} style={{ marginTop: spacing.lg }} />
      </View>
    );
  }

  const statusColor = STATUS_COLORS[entry.status] || colors.textSecondary;
  const isBalanced = Math.abs(entry.total_debit - entry.total_credit) < 0.01;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchEntry(); }} />
      }
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: colors.card, ...shadows.sm }]}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextBlock}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Journal Entry</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Entry details, status, and line items</Text>
        </View>
      </View>

      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.entryNumber, { color: colors.primary }]}>{entry.entry_number}</Text>
          <Text style={[styles.entryDate, { color: colors.textSecondary }]}>
            {new Date(entry.date).toLocaleDateString()}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{entry.status.toUpperCase()}</Text>
        </View>
      </View>

      {entry.description ? (
        <Card style={{ marginBottom: spacing.md }}>
          <Text style={[styles.desc, { color: colors.text }]}>{entry.description}</Text>
        </Card>
      ) : null}

      <Card style={{ marginBottom: spacing.md }}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCol}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Debit</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(entry.total_debit)}</Text>
          </View>
          <View style={styles.summaryCol}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Credit</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(entry.total_credit)}</Text>
          </View>
          <View style={[styles.balanceBadge, { backgroundColor: isBalanced ? '#D1FAE520' : '#FEE2E220' }]}>
            <Ionicons name={isBalanced ? 'checkmark-circle' : 'alert-circle'} size={16} color={isBalanced ? '#10B981' : '#EF4444'} />
          </View>
        </View>
      </Card>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Line Items</Text>
      {lines.map((line) => (
        <View key={line.id} style={[styles.lineRow, { borderBottomColor: colors.border, backgroundColor: colors.card, ...shadows.sm }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.lineAccount, { color: colors.text }]}>{line.account_name}</Text>
            <Text style={[styles.lineCode, { color: colors.textSecondary }]}>{line.account_code}</Text>
            {line.description ? <Text style={[styles.lineDesc, { color: colors.textSecondary }]}>{line.description}</Text> : null}
          </View>
          {line.debit > 0 ? (
            <Text style={[styles.lineAmount, { color: '#10B981' }]}>Dr {formatCurrency(line.debit)}</Text>
          ) : (
            <Text style={[styles.lineAmount, { color: '#EF4444' }]}>Cr {formatCurrency(line.credit)}</Text>
          )}
        </View>
      ))}

      {entry.status === 'draft' ? (
        <Button
          title={posting ? 'Posting...' : 'Post Entry'}
          onPress={handlePost}
          disabled={posting || !isBalanced}
          style={{ marginTop: spacing.lg }}
          icon={<Ionicons name="checkmark-circle" size={18} color="#fff" />}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: '600', marginTop: spacing.md },
  topHeader: { paddingTop: Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight || 0) + 8, paddingBottom: spacing.md, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  headerTextBlock: { flex: 1 },
  headerTitle: { fontSize: fontSize.xl, fontWeight: '700' },
  headerSubtitle: { fontSize: fontSize.sm, marginTop: 2 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  entryNumber: { fontSize: fontSize.xxl, fontWeight: '700', fontFamily: 'monospace' },
  entryDate: { fontSize: fontSize.md, marginTop: spacing.xs },
  statusBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 12 },
  statusText: { fontSize: fontSize.sm, fontWeight: '700' },
  desc: { fontSize: fontSize.md, lineHeight: 22 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  summaryCol: { flex: 1 },
  summaryLabel: { fontSize: fontSize.xs },
  summaryValue: { fontSize: fontSize.lg, fontWeight: '700', marginTop: 2 },
  balanceBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', marginBottom: spacing.sm },
  lineRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: spacing.sm, marginBottom: spacing.sm },
  lineAccount: { fontSize: fontSize.md, fontWeight: '600' },
  lineCode: { fontSize: fontSize.xs, fontFamily: 'monospace', marginTop: 2 },
  lineDesc: { fontSize: fontSize.xs, marginTop: 2 },
  lineAmount: { fontSize: fontSize.md, fontWeight: '700' },
});
