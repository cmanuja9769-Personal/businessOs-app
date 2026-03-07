import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MoreStackNavigationProp } from '@navigation/types';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import Card from '@components/ui/Card';
import Input from '@components/ui/Input';
import Button from '@components/ui/Button';
import { spacing, fontSize } from '@theme/spacing';
import { supabase } from '@lib/supabase';
import { useToast } from '@contexts/ToastContext';
import { successFeedback, errorFeedback, lightTap } from '@lib/haptics';

interface JournalLine {
  accountName: string;
  accountCode: string;
  debit: string;
  credit: string;
  description: string;
}

const emptyLine = (): JournalLine => ({
  accountName: '',
  accountCode: '',
  debit: '',
  credit: '',
  description: '',
});

export default function CreateJournalEntryScreen() {
  const navigation = useNavigation<MoreStackNavigationProp>();
  const { colors, shadows, isDark } = useTheme();
  const { organizationId } = useAuth();
  const toast = useToast();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<JournalLine[]>([emptyLine(), emptyLine()]);
  const [saving, setSaving] = useState(false);

  const updateLine = useCallback((index: number, field: keyof JournalLine, value: string) => {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  }, []);

  const addLine = () => {
    lightTap();
    setLines((prev) => [...prev, emptyLine()]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) {
      Alert.alert('Minimum Lines', 'A journal entry needs at least 2 lines');
      return;
    }
    lightTap();
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handleSave = async (status: 'draft' | 'posted') => {
    if (!organizationId) return;

    const validLines = lines.filter((l) => l.accountName && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0));
    if (validLines.length < 2) {
      Alert.alert('Validation', 'At least 2 valid line items are required');
      return;
    }
    if (!isBalanced) {
      Alert.alert('Unbalanced', 'Total debits must equal total credits');
      return;
    }

    setSaving(true);
    try {
      const entryNumber = `JE-${Date.now().toString(36).toUpperCase()}`;

      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          organization_id: organizationId,
          entry_number: entryNumber,
          date,
          description: description.trim() || null,
          status,
          total_debit: totalDebit,
          total_credit: totalCredit,
        })
        .select('id')
        .single();

      if (entryError) throw entryError;

      const lineInserts = validLines.map((l) => ({
        journal_entry_id: entry.id,
        account_name: l.accountName.trim(),
        account_code: l.accountCode.trim() || null,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
        description: l.description.trim() || null,
      }));

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(lineInserts);

      if (linesError) throw linesError;

      await successFeedback();
      toast.success(`Journal entry ${status === 'posted' ? 'posted' : 'saved as draft'}`);
      navigation.goBack();
    } catch {
      await errorFeedback();
      toast.error('Failed to create journal entry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: colors.card, ...shadows.sm }]}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTextBlock}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>New Journal Entry</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Create balanced debit and credit lines</Text>
          </View>
        </View>

        <Card style={{ marginBottom: spacing.md }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Entry Details</Text>
          <Input
            label="Date"
            placeholder="YYYY-MM-DD"
            value={date}
            onChangeText={setDate}
          />
          <Input
            label="Description"
            placeholder="Entry description"
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </Card>

        <View style={styles.linesHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Line Items</Text>
          <TouchableOpacity onPress={addLine}>
            <Ionicons name="add-circle" size={28} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {lines.map((line, index) => (
          <Card key={index} style={{ marginBottom: spacing.sm }}>
            <View style={styles.lineHeader}>
              <Text style={[styles.lineNo, { color: colors.textSecondary }]}>Line {index + 1}</Text>
              <TouchableOpacity onPress={() => removeLine(index)}>
                <Ionicons name="close-circle" size={22} color="#EF4444" />
              </TouchableOpacity>
            </View>
            <Input
              label="Account Name *"
              placeholder="Account name"
              value={line.accountName}
              onChangeText={(v) => updateLine(index, 'accountName', v)}
            />
            <Input
              label="Account Code"
              placeholder="e.g. 1000"
              value={line.accountCode}
              onChangeText={(v) => updateLine(index, 'accountCode', v)}
            />
            <View style={styles.row}>
              <Input
                label="Debit"
                placeholder="0.00"
                value={line.debit}
                onChangeText={(v) => updateLine(index, 'debit', v)}
                keyboardType="numeric"
                style={styles.halfInput}
              />
              <Input
                label="Credit"
                placeholder="0.00"
                value={line.credit}
                onChangeText={(v) => updateLine(index, 'credit', v)}
                keyboardType="numeric"
                style={styles.halfInput}
              />
            </View>
          </Card>
        ))}

        <Card style={{ marginTop: spacing.sm, marginBottom: spacing.md }}>
          <View style={styles.totalsRow}>
            <View style={styles.totalCol}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total Debit</Text>
              <Text style={[styles.totalValue, { color: colors.text }]}>₹{totalDebit.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.totalCol}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total Credit</Text>
              <Text style={[styles.totalValue, { color: colors.text }]}>₹{totalCredit.toLocaleString('en-IN')}</Text>
            </View>
            <Ionicons
              name={isBalanced ? 'checkmark-circle' : 'alert-circle'}
              size={24}
              color={isBalanced ? '#10B981' : '#EF4444'}
            />
          </View>
        </Card>

        <View style={styles.actions}>
          <Button
            title={saving ? 'Saving...' : 'Save Draft'}
            variant="outline"
            onPress={() => handleSave('draft')}
            disabled={saving}
            style={styles.actionBtn}
          />
          <Button
            title={saving ? 'Posting...' : 'Post Entry'}
            onPress={() => handleSave('posted')}
            disabled={saving || !isBalanced}
            style={styles.actionBtn}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  header: { paddingTop: Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight || 0) + 8, paddingBottom: spacing.md, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  headerTextBlock: { flex: 1 },
  headerTitle: { fontSize: fontSize.xl, fontWeight: '700' },
  headerSubtitle: { fontSize: fontSize.sm, marginTop: 2 },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', marginBottom: spacing.sm },
  linesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  lineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  lineNo: { fontSize: fontSize.sm, fontWeight: '600' },
  row: { flexDirection: 'row', gap: spacing.md },
  halfInput: { flex: 1 },
  totalsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  totalCol: { flex: 1 },
  totalLabel: { fontSize: fontSize.xs },
  totalValue: { fontSize: fontSize.lg, fontWeight: '700', marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing.md },
  actionBtn: { flex: 1 },
});
