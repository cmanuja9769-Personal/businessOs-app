import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import { supabase } from '@lib/supabase';
import EmptyState from '@components/ui/EmptyState';
import Card from '@components/ui/Card';

interface User {
  id: string;
  user_id: string;
  email: string;
  full_name?: string;
  role: string;
  created_at: string;
}

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  admin: { bg: '#DBEAFE', text: '#1D4ED8' },
  salesperson: { bg: '#D1FAE5', text: '#059669' },
  accountant: { bg: '#F3E8FF', text: '#7C3AED' },
  viewer: { bg: '#F3F4F6', text: '#4B5563' },
};

export default function UsersScreen() {
  const { colors } = useTheme();
  const { organizationId, user: currentUser } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadUsers = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);

    try {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('id, user_id, role, created_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const usersList = (roles || []).map((r: Record<string, unknown>) => ({
        id: String(r.id || ''),
        user_id: String(r.user_id || ''),
        email: String(r.user_id || '').slice(0, 8) + '...',
        role: String(r.role || 'viewer'),
        created_at: String(r.created_at || ''),
      }));

      setUsers(usersList);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const handleChangeRole = (user: User) => {
    const roles = ['admin', 'salesperson', 'accountant', 'viewer'];
    const buttons: { text: string; onPress: () => void }[] = roles.map(role => ({
      text: role.charAt(0).toUpperCase() + role.slice(1),
      onPress: async () => {
        try {
          const { error } = await supabase
            .from('user_roles')
            .update({ role } as Record<string, unknown>)
            .eq('organization_id', organizationId)
            .eq('user_id', user.user_id);

          if (error) throw error;
          loadUsers();
          Alert.alert('Success', 'Role updated successfully');
        } catch (err: unknown) {
          Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update role');
        }
      },
    }));
    Alert.alert(
      'Change Role',
      `Select new role for ${user.full_name || user.email}`,
      [
        ...buttons,
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  };

  const handleRemoveUser = (user: User) => {
    if (user.user_id === currentUser?.id) {
      Alert.alert('Error', 'You cannot remove yourself');
      return;
    }

    Alert.alert(
      'Remove User',
      `Are you sure you want to remove this user from the organization?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('user_roles')
                .delete()
                .eq('organization_id', organizationId)
                .eq('user_id', user.user_id);

              if (error) throw error;
              loadUsers();
              Alert.alert('Success', 'User removed successfully');
            } catch (err: unknown) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to remove user');
            }
          },
        },
      ]
    );
  };

  const renderUser = ({ item: user }: { item: User }) => {
    const roleStyle = ROLE_COLORS[user.role] || ROLE_COLORS.viewer;
    const isCurrentUser = user.user_id === currentUser?.id;

    return (
      <Card
        style={styles.userCard}
        onPress={() => user.role !== 'admin' ? handleChangeRole(user) : undefined}
      >
        <View style={styles.userRow}>
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={user.role === 'admin' ? ['#1D4ED8', '#3B82F6'] : ['#6366F1', '#8B5CF6']}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>
                {user.role.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
          </View>

          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.userId, { color: colors.text }]} numberOfLines={1}>
                {user.email}
              </Text>
              {isCurrentUser && (
                <View style={[styles.youBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.youBadgeText}>You</Text>
                </View>
              )}
            </View>
            <Text style={[styles.userDate, { color: colors.textSecondary }]}>
              Joined {new Date(user.created_at).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.userRight}>
            <View style={[styles.roleBadge, { backgroundColor: roleStyle.bg }]}>
              <Text style={[styles.roleText, { color: roleStyle.text }]}>
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </Text>
            </View>
            {user.role !== 'admin' && !isCurrentUser && (
              <TouchableOpacity onPress={() => handleRemoveUser(user)} style={styles.removeBtn}>
                <Ionicons name="close-circle" size={20} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>{users.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>{users.filter(u => u.role === 'admin').length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Admins</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>{users.filter(u => u.role !== 'admin').length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Others</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.id}
          renderItem={renderUser}
          contentContainerStyle={[styles.listContent, users.length === 0 && styles.listContentEmpty]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="No team members"
              description="Users will appear here once they join the organization"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statsCard: { flexDirection: 'row', marginHorizontal: 16, marginTop: 12, borderRadius: 12, padding: 16, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 4 },
  statDivider: { width: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16 },
  listContentEmpty: { flexGrow: 1 },
  userCard: { marginBottom: 10, padding: 14 },
  userRow: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: {},
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  userInfo: { flex: 1, marginLeft: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userId: { fontSize: 14, fontWeight: '600', fontFamily: 'monospace' },
  userDate: { fontSize: 12, marginTop: 2 },
  youBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 },
  youBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  userRight: { alignItems: 'flex-end', gap: 8 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  roleText: { fontSize: 11, fontWeight: '600' },
  removeBtn: { padding: 4 },
});
