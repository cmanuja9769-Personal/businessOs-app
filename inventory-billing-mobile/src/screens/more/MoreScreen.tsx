import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MoreStackNavigationProp } from '@navigation/types';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  screen: string;
  color: string;
  gradient?: [string, string];
}

export default function MoreScreen() {
  const navigation = useNavigation<MoreStackNavigationProp>();
  const { colors, shadows, isDark } = useTheme();
  const { signOut, user } = useAuth();

  const menuItems: MenuItem[] = [
    { icon: 'people-outline', title: 'Customers', screen: 'Customers', color: '#4F46E5', gradient: ['#4F46E5', '#6366F1'] },
    { icon: 'briefcase-outline', title: 'Suppliers', screen: 'Suppliers', color: '#7C3AED', gradient: ['#7C3AED', '#8B5CF6'] },
    { icon: 'cart-outline', title: 'Purchases', screen: 'Purchases', color: '#059669', gradient: ['#059669', '#10B981'] },
    { icon: 'document-outline', title: 'E-waybills', screen: 'Ewaybills', color: '#D97706', gradient: ['#D97706', '#F59E0B'] },
    { icon: 'cash-outline', title: 'Payments', screen: 'Payments', color: '#0369A1', gradient: ['#0369A1', '#0EA5E9'] },
    { icon: 'stats-chart-outline', title: 'Reports', screen: 'Reports', color: '#4F46E5', gradient: ['#4F46E5', '#6366F1'] },
    { icon: 'calculator-outline', title: 'Accounting', screen: 'Accounting', color: '#7C3AED', gradient: ['#7C3AED', '#8B5CF6'] },
    { icon: 'cube-outline', title: 'Godowns', screen: 'Godowns', color: '#D97706', gradient: ['#D97706', '#F59E0B'] },
  ];

  const settingsItems: MenuItem[] = [
    { icon: 'person-outline', title: 'Profile', screen: 'Profile', color: '#64748B' },
    { icon: 'business-outline', title: 'Organization', screen: 'Organization', color: '#64748B' },
    { icon: 'people-circle-outline', title: 'Users', screen: 'Users', color: '#64748B' },
    { icon: 'settings-outline', title: 'Settings', screen: 'Settings', color: '#64748B' },
  ];

  const renderMenuItem = (item: MenuItem, index: number, isModule: boolean = true) => (
    <TouchableOpacity
      key={item.title}
      onPress={() => navigation.navigate(item.screen as any)}
      activeOpacity={0.7}
      style={[
        styles.menuItem, 
        { 
          backgroundColor: colors.card,
          ...shadows.xs,
        }
      ]}
    >
      {isModule && item.gradient ? (
        <LinearGradient
          colors={item.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconGradient}
        >
          <Ionicons name={item.icon} size={20} color="#FFFFFF" />
        </LinearGradient>
      ) : (
        <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
          <Ionicons name={item.icon} size={20} color={item.color} />
        </View>
      )}
      <Text style={[styles.menuText, { color: colors.text }]}>
        {item.title}
      </Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </TouchableOpacity>
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>More</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {user?.email || 'Manage your account'}
          </Text>
        </View>

        {/* Modules Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>
            MODULES
          </Text>
          <View style={styles.menuGrid}>
            {menuItems.map((item, index) => renderMenuItem(item, index, true))}
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>
            ACCOUNT
          </Text>
          <View style={styles.menuGrid}>
            {settingsItems.map((item, index) => renderMenuItem(item, index, false))}
          </View>
        </View>

        {/* Sign Out Button */}
        <View style={styles.logoutSection}>
          <TouchableOpacity
            onPress={signOut}
            activeOpacity={0.7}
            style={[
              styles.logoutButton, 
              { 
                backgroundColor: colors.errorLight,
                borderColor: colors.error + '30',
              }
            ]}
          >
            <View style={[styles.iconContainer, { backgroundColor: colors.error + '20' }]}>
              <Ionicons name="log-out-outline" size={20} color={colors.error} />
            </View>
            <Text style={[styles.logoutText, { color: colors.error }]}>
              Sign Out
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>

        {/* App Version */}
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
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  menuGrid: {
    gap: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
  },
  iconGradient: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  logoutSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  logoutText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginBottom: 20,
  },
});
