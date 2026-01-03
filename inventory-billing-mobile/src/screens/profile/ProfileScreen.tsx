import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@contexts/AuthContext';
import { useTheme } from '@contexts/ThemeContext';
import Card from '@components/ui/Card';
import Button from '@components/ui/Button';
import { spacing, fontSize } from '@theme/spacing';
import { supabase } from '@lib/supabase';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, signOut } = useAuth();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  const initials = user?.email
    ?.split('@')[0]
    .split('')
    .slice(0, 2)
    .map((c) => c.toUpperCase())
    .join('') || 'U';

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            await signOut();
            // Navigation to auth screen is handled by AuthProvider
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to sign out');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Card style={styles.headerCard}>
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>
        <Text style={[styles.email, { color: colors.text }]}>{user?.email}</Text>
        <Text style={[styles.role, { color: colors.textSecondary }]}>
          {user?.user_metadata?.role || 'User'}
        </Text>
      </Card>

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="person-outline" size={20} color={colors.text} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Account Information</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Email Address</Text>
          <Text style={[styles.value, { color: colors.text }]}>{user?.email}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>User ID</Text>
          <Text style={[styles.valueSmall, { color: colors.textSecondary }]} numberOfLines={1}>
            {user?.id}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Account Created</Text>
          <Text style={[styles.value, { color: colors.text }]}>
            {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Last Sign In</Text>
          <Text style={[styles.value, { color: colors.text }]}>
            {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}
          </Text>
        </View>
      </Card>

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.text} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Security</Text>
        </View>

        <TouchableOpacity
          style={[styles.securityItem, { backgroundColor: colors.surface }]}
          onPress={() => Alert.alert('Coming Soon', 'Password change feature will be available soon')}
        >
          <View style={styles.securityInfo}>
            <Text style={[styles.securityTitle, { color: colors.text }]}>Password</Text>
            <Text style={[styles.securityDesc, { color: colors.textSecondary }]}>
              Change your password
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.securityItem, { backgroundColor: colors.surface }]}
          onPress={() => Alert.alert('Coming Soon', 'Two-factor authentication will be available soon')}
        >
          <View style={styles.securityInfo}>
            <Text style={[styles.securityTitle, { color: colors.text }]}>Two-Factor Authentication</Text>
            <Text style={[styles.securityDesc, { color: colors.textSecondary }]}>
              Secure your account with 2FA
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </Card>

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="settings-outline" size={20} color={colors.text} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Preferences</Text>
        </View>

        <TouchableOpacity
          style={[styles.securityItem, { backgroundColor: colors.surface }]}
          onPress={() => navigation.navigate('Settings')}
        >
          <View style={styles.securityInfo}>
            <Text style={[styles.securityTitle, { color: colors.text }]}>App Settings</Text>
            <Text style={[styles.securityDesc, { color: colors.textSecondary }]}>
              Customize your experience
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.securityItem, { backgroundColor: colors.surface }]}
          onPress={() => navigation.navigate('Organization')}
        >
          <View style={styles.securityInfo}>
            <Text style={[styles.securityTitle, { color: colors.text }]}>Organization</Text>
            <Text style={[styles.securityDesc, { color: colors.textSecondary }]}>
              View organization details
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </Card>

      <Button
        title={loading ? 'Signing Out...' : 'Sign Out'}
        onPress={handleSignOut}
        disabled={loading}
        variant="danger"
        style={styles.signOutButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
  },
  headerCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.md,
  },
  avatarContainer: {
    marginBottom: spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: '#ffffff',
  },
  email: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  role: {
    fontSize: fontSize.sm,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  infoRow: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs / 2,
  },
  value: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  valueSmall: {
    fontSize: fontSize.xs,
    fontFamily: 'monospace',
  },
  securityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  securityInfo: {
    flex: 1,
  },
  securityTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  securityDesc: {
    fontSize: fontSize.sm,
  },
  signOutButton: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
});
