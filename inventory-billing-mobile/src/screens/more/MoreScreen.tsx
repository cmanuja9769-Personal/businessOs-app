import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MoreStackNavigationProp } from '@navigation/types';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import { useToast } from '@contexts/ToastContext';
import { supabase } from '@lib/supabase';
import { formatCurrency } from '@lib/utils';
import { lightTap, warningFeedback } from '@lib/haptics';

const PAD = 16;

interface MenuItem {
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly title: string;
  readonly screen: string;
  readonly color: string;
}

interface QuickStat {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const TRANSACTION_ITEMS: readonly MenuItem[] = [
  { icon: 'people-outline', title: 'Customers', screen: 'Customers', color: '#4F46E5' },
  { icon: 'briefcase-outline', title: 'Suppliers', screen: 'Suppliers', color: '#7C3AED' },
  { icon: 'cart-outline', title: 'Purchases', screen: 'Purchases', color: '#059669' },
  { icon: 'cash-outline', title: 'Payments', screen: 'Payments', color: '#0369A1' },
  { icon: 'document-text-outline', title: 'E-Waybills', screen: 'Ewaybills', color: '#D97706' },
  { icon: 'flash-outline', title: 'E-Invoice', screen: 'EInvoice', color: '#7C3AED' },
] as const;

const INVENTORY_ITEMS: readonly MenuItem[] = [
  { icon: 'cube-outline', title: 'Godowns', screen: 'Godowns', color: '#B45309' },
  { icon: 'swap-horizontal-outline', title: 'Stock Transfers', screen: 'StockTransfer', color: '#059669' },
  { icon: 'time-outline', title: 'Stock Movements', screen: 'StockMovements', color: '#0284C7' },
  { icon: 'barcode-outline', title: 'Barcode Generator', screen: 'BarcodeGenerator', color: '#7C3AED' },
] as const;

const FINANCE_ITEMS: readonly MenuItem[] = [
  { icon: 'stats-chart-outline', title: 'Reports', screen: 'Reports', color: '#4F46E5' },
  { icon: 'calculator-outline', title: 'Accounting', screen: 'Accounting', color: '#7C3AED' },
  { icon: 'book-outline', title: 'Journal Entries', screen: 'JournalEntries', color: '#0369A1' },
  { icon: 'receipt-outline', title: 'Trial Balance', screen: 'TrialBalance', color: '#059669' },
] as const;

const SETTINGS_ITEMS: readonly MenuItem[] = [
  { icon: 'business-outline', title: 'Organization', screen: 'Organization', color: '#475569' },
  { icon: 'people-circle-outline', title: 'Team Members', screen: 'Users', color: '#4338CA' },
  { icon: 'person-outline', title: 'Profile', screen: 'Profile', color: '#0284C7' },
  { icon: 'settings-outline', title: 'Settings', screen: 'Settings', color: '#64748B' },
] as const;

export default function MoreScreen() {
  const navigation = useNavigation<MoreStackNavigationProp>();
  const { colors, shadows, isDark } = useTheme();
  const { signOut, user, organizationId } = useAuth();
  const toast = useToast();
  const [quickStats, setQuickStats] = useState<QuickStat[]>([]);

  useEffect(() => {
    let cancelled = false;

    const fetchQuickStats = async () => {
      if (!organizationId) return;
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [invoicesResult, itemsResult, customersResult] = await Promise.all([
          supabase
            .from('invoices')
            .select('total')
            .eq('organization_id', organizationId)
            .is('deleted_at', null)
            .gte('created_at', today.toISOString()),
          supabase
            .from('items')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
            .is('deleted_at', null),
          supabase
            .from('customers')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
            .is('deleted_at', null),
        ]);

        if (cancelled) return;

        const todaysSale = (invoicesResult.data || []).reduce(
          (sum: number, inv: { total?: number }) => sum + (inv.total || 0),
          0
        );

        setQuickStats([
          { label: "Today's Sales", value: formatCurrency(todaysSale), icon: 'trending-up-outline', color: '#059669' },
          { label: 'Total Items', value: String(itemsResult.count || 0), icon: 'cube-outline', color: '#7C3AED' },
          { label: 'Customers', value: String(customersResult.count || 0), icon: 'people-outline', color: '#0284C7' },
        ]);
      } catch {
        if (!cancelled) setQuickStats([]);
      }
    };

    fetchQuickStats();
    return () => { cancelled = true; };
  }, [organizationId]);

  const navigateTo = useCallback((screen: string) => {
    lightTap();
    (navigation as { navigate: (screen: string) => void }).navigate(screen);
  }, [navigation]);

  const renderMenuItem = (item: MenuItem, isLast: boolean) => (
    <TouchableOpacity
      key={item.screen}
      onPress={() => navigateTo(item.screen)}
      activeOpacity={0.6}
      style={styles.menuRow}
    >
      <View style={[styles.menuIcon, { backgroundColor: item.color + '14' }]}>
        <Ionicons name={item.icon} size={18} color={item.color} />
      </View>
      <Text style={[styles.menuTitle, { color: colors.text }]}>{item.title}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      {!isLast && <View style={[styles.menuSeparator, { backgroundColor: colors.border }]} />}
    </TouchableOpacity>
  );

  const renderSection = (title: string, items: readonly MenuItem[]) => (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.card, ...shadows.sm }]}>
        {items.map((item, i) => renderMenuItem(item, i === items.length - 1))}
      </View>
    </View>
  );

  const handleSignOut = useCallback(() => {
    warningFeedback();
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              toast.success('Signed out successfully');
            } catch {
              toast.error('Failed to sign out');
            }
          },
        },
      ]
    );
  }, [signOut, toast]);

  const userInitial = (user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'U').toUpperCase();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.7}
            style={styles.headerProfile}
          >
            <LinearGradient
              colors={isDark ? ['#6366F1', '#4F46E5'] : ['#4F46E5', '#6366F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarText}>{userInitial}</Text>
            </LinearGradient>
            <View style={styles.headerTextBlock}>
              <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
              </Text>
              <Text style={[styles.headerEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                {user?.email || 'Manage your business'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {quickStats.length > 0 && (
          <View style={styles.statsRow}>
            {quickStats.map((stat) => (
              <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.card, ...shadows.sm }]}>
                <View style={[styles.statIconBg, { backgroundColor: stat.color + '14' }]}>
                  <Ionicons name={stat.icon} size={16} color={stat.color} />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{stat.label}</Text>
              </View>
            ))}
          </View>
        )}

        {renderSection('Transactions', TRANSACTION_ITEMS)}
        {renderSection('Inventory', INVENTORY_ITEMS)}
        {renderSection('Finance & Reports', FINANCE_ITEMS)}
        {renderSection('Settings', SETTINGS_ITEMS)}

        <View style={styles.section}>
          <View style={[styles.sectionCard, { backgroundColor: colors.card, ...shadows.sm }]}>
            <TouchableOpacity
              onPress={handleSignOut}
              activeOpacity={0.6}
              style={styles.menuRow}
            >
              <View style={[styles.menuIcon, { backgroundColor: colors.error + '14' }]}>
                <Ionicons name="log-out-outline" size={18} color={colors.error} />
              </View>
              <Text style={[styles.menuTitle, { color: colors.error }]}>Sign Out</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.error + '60'} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.version, { color: colors.textTertiary }]}>
          Version 1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 20 : 60,
    paddingHorizontal: PAD,
    paddingBottom: 12,
  },
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerTextBlock: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  headerEmail: {
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: PAD,
    gap: 10,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  statIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: PAD,
    marginTop: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  sectionCard: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  menuSeparator: {
    position: 'absolute',
    bottom: 0,
    left: 60,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  version: {
    textAlign: 'center',
    fontSize: 11,
    marginTop: 24,
    marginBottom: 20,
  },
});
