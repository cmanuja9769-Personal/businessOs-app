import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import { useToast } from '@contexts/ToastContext';
import { useSettingsStore } from '@store/settingsStore';
import { syncOfflineData, downloadDataForOffline, isOnline } from '../../services/sync';
import Card from '@components/ui/Card';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { spacing, fontSize, borderRadius } from '@theme/spacing';
import { lightTap, mediumTap, successFeedback, errorFeedback, warningFeedback } from '@lib/haptics';

type SyncStatus = 'idle' | 'syncing' | 'downloading' | 'done' | 'error';

export default function SettingsScreen() {
  const { colors, colorScheme, toggleColorScheme, isDark } = useTheme();
  const { user, organizationId, signOut } = useAuth();
  const { settings, updateSettings } = useSettingsStore();
  const toast = useToast();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncMessage, setSyncMessage] = useState('');

  const handleSync = useCallback(async () => {
    if (!organizationId) {
      errorFeedback();
      toast.error('No organization linked');
      return;
    }

    const online = await isOnline();
    if (!online) {
      warningFeedback();
      toast.warning('Please connect to the internet to sync');
      return;
    }

    mediumTap();
    setSyncStatus('syncing');
    setSyncMessage('Uploading local changes...');
    try {
      const uploadResult = await syncOfflineData(organizationId);
      setSyncMessage(`Uploaded ${uploadResult.synced} records`);

      setSyncStatus('downloading');
      setSyncMessage('Downloading latest data...');
      const downloadResult = await downloadDataForOffline(organizationId);
      setSyncMessage(`Downloaded ${downloadResult.downloaded} records`);

      setSyncStatus('done');
      successFeedback();
      toast.success(`Synced ${uploadResult.synced} up, ${downloadResult.downloaded} down`);
      setTimeout(() => setSyncStatus('idle'), 2500);
    } catch {
      setSyncStatus('error');
      setSyncMessage('Sync failed');
      errorFeedback();
      toast.error('Sync failed. Please try again.');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  }, [organizationId, toast]);

  const handleSignOut = useCallback(() => {
    warningFeedback();
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? Unsynced data may be lost.',
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
              errorFeedback();
              toast.error('Failed to sign out');
            }
          },
        },
      ],
    );
  }, [signOut, toast]);

  const getSyncIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (syncStatus) {
      case 'syncing':
      case 'downloading':
        return 'sync';
      case 'done':
        return 'checkmark-circle';
      case 'error':
        return 'alert-circle';
      default:
        return 'cloud-upload-outline';
    }
  };

  const getSyncColor = () => {
    switch (syncStatus) {
      case 'done':
        return colors.success;
      case 'error':
        return colors.error;
      default:
        return colors.primary;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Settings" compact />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {user && (
          <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>
                {(user.email || 'U')[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.text }]}>
                {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
              </Text>
              <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
                {user.email}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            DATA & SYNC
          </Text>
          <Card>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={handleSync}
              disabled={syncStatus === 'syncing' || syncStatus === 'downloading'}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                {syncStatus === 'syncing' || syncStatus === 'downloading' ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name={getSyncIcon()} size={20} color={getSyncColor()} />
                )}
                <View>
                  <Text style={[styles.settingText, { color: colors.text }]}>
                    Sync Now
                  </Text>
                  {syncMessage ? (
                    <Text style={[styles.settingHint, { color: getSyncColor() }]}>
                      {syncMessage}
                    </Text>
                  ) : (
                    <Text style={[styles.settingHint, { color: colors.textSecondary }]}>
                      Upload local changes & download updates
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            APPEARANCE
          </Text>
          <Card>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons
                  name={isDark ? 'moon' : 'sunny'}
                  size={20}
                  color={isDark ? '#a78bfa' : '#f59e0b'}
                />
                <Text style={[styles.settingText, { color: colors.text }]}>
                  Dark Mode
                </Text>
              </View>
              <Switch
                value={colorScheme === 'dark'}
                onValueChange={() => { lightTap(); toggleColorScheme(); }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#ffffff"
              />
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            PREFERENCES
          </Text>
          <Card>
            <View style={[styles.settingItem, styles.settingItemBorder, { borderBottomColor: colors.border }]}>
              <View style={styles.settingLeft}>
                <Ionicons name="notifications-outline" size={20} color={colors.text} />
                <Text style={[styles.settingText, { color: colors.text }]}>
                  Notifications
                </Text>
              </View>
              <Switch
                value={settings.enableNotifications}
                onValueChange={(v) => { lightTap(); updateSettings({ enableNotifications: v }); }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#ffffff"
              />
            </View>
            <View style={[styles.settingItem, styles.settingItemBorder, { borderBottomColor: colors.border }]}>
              <View style={styles.settingLeft}>
                <Ionicons name="finger-print-outline" size={20} color={colors.text} />
                <Text style={[styles.settingText, { color: colors.text }]}>
                  Biometric Lock
                </Text>
              </View>
              <Switch
                value={settings.enableBiometric}
                onValueChange={(v) => { lightTap(); updateSettings({ enableBiometric: v }); }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#ffffff"
              />
            </View>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="cash-outline" size={20} color={colors.text} />
                <View>
                  <Text style={[styles.settingText, { color: colors.text }]}>
                    Currency
                  </Text>
                  <Text style={[styles.settingHint, { color: colors.textSecondary }]}>
                    {settings.currency}
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            ACCOUNT
          </Text>
          <Card>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={handleSignOut}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="log-out-outline" size={20} color={colors.error} />
                <Text style={[styles.settingText, { color: colors.error }]}>
                  Sign Out
                </Text>
              </View>
            </TouchableOpacity>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            ABOUT
          </Text>
          <Card>
            <View style={[styles.settingItem, styles.settingItemBorder, { borderBottomColor: colors.border }]}>
              <Text style={[styles.settingText, { color: colors.text }]}>
                Version
              </Text>
              <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                1.0.0
              </Text>
            </View>
            <View style={styles.settingItem}>
              <Text style={[styles.settingText, { color: colors.text }]}>
                Organization
              </Text>
              <Text style={[styles.settingValue, { color: colors.textSecondary }]} numberOfLines={1}>
                {organizationId ? organizationId.slice(0, 8) + '...' : 'None'}
              </Text>
            </View>
          </Card>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 20,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  profileEmail: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    minHeight: 52,
  },
  settingItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 14,
  },
  settingText: {
    fontSize: fontSize.md,
  },
  settingHint: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  settingValue: {
    fontSize: fontSize.md,
  },
});
