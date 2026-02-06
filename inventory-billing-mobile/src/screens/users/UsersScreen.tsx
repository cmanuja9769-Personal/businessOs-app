import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MoreStackNavigationProp } from '@navigation/types';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import { supabase } from '@lib/supabase';

interface User {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  created_at: string;
  last_sign_in_at?: string;
  is_active?: boolean;
}

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  owner: { bg: '#DBEAFE', text: '#1D4ED8' },
  admin: { bg: '#F3E8FF', text: '#7C3AED' },
  manager: { bg: '#D1FAE5', text: '#059669' },
  staff: { bg: '#FEF3C7', text: '#D97706' },
  viewer: { bg: '#F3F4F6', text: '#4B5563' },
};

export default function UsersScreen() {
  const navigation = useNavigation<MoreStackNavigationProp>();
  const { colors, shadows } = useTheme();
  const { organizationId, user: currentUser } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [organizationId]);

  const loadUsers = async () => {
    if (!organizationId) return;
    setLoading(true);

    try {
      const { data: members, error } = await supabase
        .from('organization_members')
        .select('*, profiles(email, full_name)')
        .eq('organization_id', organizationId);

      if (error) throw error;

      const usersList = (members || []).map(m => ({
        id: m.user_id,
        email: m.profiles?.email || 'Unknown',
        full_name: m.profiles?.full_name,
        role: m.role || 'staff',
        created_at: m.created_at,
        is_active: true,
      }));

      setUsers(usersList);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const handleInviteUser = () => {
    Alert.prompt(
      'Invite User',
      'Enter email address to invite:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Invite',
          onPress: async (email) => {
            if (!email || !email.includes('@')) {
              Alert.alert('Error', 'Please enter a valid email address');
              return;
            }
            Alert.alert('Invitation Sent', `An invitation has been sent to ${email}`);
          },
        },
      ],
      'plain-text'
    );
  };

  const handleChangeRole = (user: User) => {
    const roles = ['admin', 'manager', 'staff', 'viewer'];
    Alert.alert(
      'Change Role',
      `Select new role for ${user.full_name || user.email}`,
      [
        ...roles.map(role => ({
          text: role.charAt(0).toUpperCase() + role.slice(1),
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('organization_members')
                .update({ role })
                .eq('organization_id', organizationId)
                .eq('user_id', user.id);

              if (error) throw error;
              loadUsers();
              Alert.alert('Success', 'Role updated successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to update role');
            }
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleRemoveUser = (user: User) => {
    if (user.id === currentUser?.id) {
      Alert.alert('Error', 'You cannot remove yourself');
      return;
    }

    Alert.alert(
      'Remove User',
      `Are you sure you want to remove ${user.full_name || user.email} from the organization?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('organization_members')
                .delete()
                .eq('organization_id', organizationId)
                .eq('user_id', user.id);

              if (error) throw error;
              loadUsers();
              Alert.alert('Success', 'User removed successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to remove user');
            }
          },
        },
      ]
    );
  };

  const renderUser = ({ item: user }: { item: User }) => {
    const roleStyle = ROLE_COLORS[user.role] || ROLE_COLORS.staff;
    const isCurrentUser = user.id === currentUser?.id;

    return (
      <TouchableOpacity
        style={[styles.userCard, { backgroundColor: colors.card, ...shadows.sm }]}
        onPress={() => handleChangeRole(user)}
        disabled={user.role === 'owner'}
      >
        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={user.role === 'owner' ? ['#1D4ED8', '#3B82F6'] : ['#6366F1', '#8B5CF6']}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>
              {(user.full_name || user.email).charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
        </View>

        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
              {user.full_name || user.email.split('@')[0]}
            </Text>
            {isCurrentUser && (
              <View style={[styles.youBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.youBadgeText}>You</Text>
              </View>
            )}
          </View>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]} numberOfLines={1}>
            {user.email}
          </Text>
        </View>

        <View style={styles.userRight}>
          <View style={[styles.roleBadge, { backgroundColor: roleStyle.bg }]}>
            <Text style={[styles.roleText, { color: roleStyle.text }]}>
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </Text>
          </View>
          {user.role !== 'owner' && !isCurrentUser && (
            <TouchableOpacity onPress={() => handleRemoveUser(user)} style={styles.removeBtn}>
              <Ionicons name="close-circle" size={20} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#4F46E5', '#6366F1']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Team Members</Text>
        <TouchableOpacity onPress={handleInviteUser} style={styles.addButton}>
          <Ionicons name="person-add-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <View style={[styles.statsCard, { backgroundColor: colors.primary }]}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{users.length}</Text>
          <Text style={styles.statLabel}>Total Members</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{users.filter(u => u.role === 'admin' || u.role === 'owner').length}</Text>
          <Text style={styles.statLabel}>Admins</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{users.filter(u => u.role === 'staff').length}</Text>
          <Text style={styles.statLabel}>Staff</Text>
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
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No team members yet</Text>
              <TouchableOpacity
                style={[styles.inviteBtn, { backgroundColor: colors.primary }]}
                onPress={handleInviteUser}
              >
                <Ionicons name="person-add-outline" size={18} color="#fff" />
                <Text style={styles.inviteBtnText}>Invite Member</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 40 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center' },
  addButton: { width: 40, alignItems: 'flex-end' },
  statsCard: { flexDirection: 'row', marginHorizontal: 16, marginTop: -10, borderRadius: 12, padding: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: '#fff', fontSize: 22, fontWeight: '700' },
  statLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16 },
  userCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 10 },
  avatarContainer: {},
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  userInfo: { flex: 1, marginLeft: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userName: { fontSize: 15, fontWeight: '600' },
  userEmail: { fontSize: 13, marginTop: 2 },
  youBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 },
  youBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  userRight: { alignItems: 'flex-end', gap: 8 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  roleText: { fontSize: 11, fontWeight: '600' },
  removeBtn: { padding: 4 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, marginTop: 12 },
  inviteBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, gap: 8, marginTop: 16 },
  inviteBtnText: { color: '#fff', fontWeight: '600' },
});
