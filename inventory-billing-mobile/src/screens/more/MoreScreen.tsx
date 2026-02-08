import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MoreStackNavigationProp } from '@navigation/types';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import { supabase } from '@lib/supabase';
import { formatCurrency } from '@lib/utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 10;
const HORIZONTAL_PADDING = 20;
const GRID_COLUMNS = 3;
const CARD_SIZE = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

interface ActionCard {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  screen: string;
  gradient: [string, string];
}

interface QuickStat {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  trend?: 'up' | 'down' | 'neutral';
}

export default function MoreScreen() {
  const navigation = useNavigation<MoreStackNavigationProp>();
  const { colors, shadows, isDark } = useTheme();
  const { signOut, user, organizationId } = useAuth();
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
            .gte('created_at', today.toISOString()),
          supabase
            .from('items')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', organizationId),
          supabase
            .from('customers')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', organizationId),
        ]);

        if (cancelled) return;

        const todaysSale = (invoicesResult.data || []).reduce(
          (sum: number, inv: any) => sum + (inv.total || 0),
          0
        );

        setQuickStats([
          {
            label: "Today's Sales",
            value: formatCurrency(todaysSale),
            icon: 'trending-up-outline',
            trend: todaysSale > 0 ? 'up' : 'neutral',
          },
          {
            label: 'Total Items',
            value: String(itemsResult.count || 0),
            icon: 'cube-outline',
            trend: 'neutral',
          },
          {
            label: 'Customers',
            value: String(customersResult.count || 0),
            icon: 'people-outline',
            trend: 'neutral',
          },
        ]);
      } catch {
        if (!cancelled) setQuickStats([]);
      }
    };

    fetchQuickStats();
    return () => { cancelled = true; };
  }, [organizationId]);

  const transactionCards: ActionCard[] = [
    { icon: 'people-outline', title: 'Customers', screen: 'Customers', gradient: ['#4F46E5', '#6366F1'] },
    { icon: 'briefcase-outline', title: 'Suppliers', screen: 'Suppliers', gradient: ['#7C3AED', '#8B5CF6'] },
    { icon: 'cart-outline', title: 'Purchases', screen: 'Purchases', gradient: ['#059669', '#10B981'] },
    { icon: 'cash-outline', title: 'Payments', screen: 'Payments', gradient: ['#0369A1', '#0EA5E9'] },
    { icon: 'document-text-outline', title: 'E-Waybills', screen: 'Ewaybills', gradient: ['#D97706', '#F59E0B'] },
  ];

  const masterDataCards: ActionCard[] = [
    { icon: 'cube-outline', title: 'Godowns', screen: 'Godowns', gradient: ['#B45309', '#D97706'] },
    { icon: 'business-outline', title: 'Organization', screen: 'Organization', gradient: ['#475569', '#64748B'] },
    { icon: 'people-circle-outline', title: 'Users', screen: 'Users', gradient: ['#4338CA', '#6366F1'] },
  ];

  const utilityCards: ActionCard[] = [
    { icon: 'stats-chart-outline', title: 'Reports', screen: 'Reports', gradient: ['#4F46E5', '#818CF8'] },
    { icon: 'calculator-outline', title: 'Accounting', screen: 'Accounting', gradient: ['#7C3AED', '#A78BFA'] },
    { icon: 'person-outline', title: 'Profile', screen: 'Profile', gradient: ['#0284C7', '#38BDF8'] },
    { icon: 'settings-outline', title: 'Settings', screen: 'Settings', gradient: ['#475569', '#94A3B8'] },
  ];

  const renderActionCard = (item: ActionCard, index: number) => (
    <TouchableOpacity
      key={item.title}
      onPress={() => navigation.navigate(item.screen as any)}
      activeOpacity={0.7}
      style={styles.actionCardWrapper}
    >
      <View style={[styles.actionCard, { backgroundColor: colors.card, ...shadows.sm }]}>
        <LinearGradient
          colors={item.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.actionCardIcon}
        >
          <Ionicons name={item.icon} size={22} color="#FFFFFF" />
        </LinearGradient>
        <Text
          style={[styles.actionCardTitle, { color: colors.text }]}
          numberOfLines={1}
        >
          {item.title}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderQuickStats = () => {
    if (quickStats.length === 0) return null;

    return (
      <View style={styles.statsContainer}>
        <LinearGradient
          colors={isDark ? ['#312E81', '#1E293B'] : ['#4F46E5', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.statsCard, shadows.lg]}
        >
          <View style={styles.statsRow}>
            {quickStats.map((stat, index) => (
              <View
                key={stat.label}
                style={[
                  styles.statItem,
                  index < quickStats.length - 1 && styles.statItemBorder,
                ]}
              >
                <View style={styles.statIconRow}>
                  <View style={styles.statIconBg}>
                    <Ionicons name={stat.icon} size={14} color="#FFFFFF" />
                  </View>
                  {stat.trend === 'up' && (
                    <Ionicons name="arrow-up" size={12} color="#34D399" />
                  )}
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>
      </View>
    );
  };

  const renderSectionGrid = (title: string, cards: ActionCard[]) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>
        {title}
      </Text>
      <View style={styles.grid}>
        {cards.map((card, index) => renderActionCard(card, index))}
      </View>
    </View>
  );

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
          <View style={styles.headerTop}>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Business Hub
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                {user?.email || 'Manage your business'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile' as any)}
              activeOpacity={0.7}
              style={[styles.avatarButton, { backgroundColor: colors.primaryLight }]}
            >
              <Ionicons name="person" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {renderQuickStats()}

        {renderSectionGrid('TRANSACTIONS', transactionCards)}
        {renderSectionGrid('MASTER DATA', masterDataCards)}
        {renderSectionGrid('UTILITIES', utilityCards)}

        <View style={styles.logoutSection}>
          <TouchableOpacity
            onPress={signOut}
            activeOpacity={0.7}
            style={[
              styles.logoutButton,
              {
                backgroundColor: colors.errorLight,
                borderColor: colors.error + '30',
              },
            ]}
          >
            <View style={[styles.logoutIconBg, { backgroundColor: colors.error + '20' }]}>
              <Ionicons name="log-out-outline" size={18} color={colors.error} />
            </View>
            <Text style={[styles.logoutText, { color: colors.error }]}>
              Sign Out
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.error} />
          </TouchableOpacity>
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
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 56,
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 16,
    paddingBottom: 8,
  },
  statsCard: {
    borderRadius: 16,
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statItemBorder: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.15)',
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  statIconBg: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  section: {
    paddingTop: 20,
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  actionCardWrapper: {
    width: CARD_SIZE,
  },
  actionCard: {
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: CARD_SIZE,
  },
  actionCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  logoutSection: {
    paddingHorizontal: HORIZONTAL_PADDING,
    marginTop: 28,
    marginBottom: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 52,
  },
  logoutIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoutText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    fontSize: 11,
    marginBottom: 20,
  },
});
