import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MoreStackNavigationProp } from '@navigation/types';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import { useFocusRefresh } from '@hooks/useFocusRefresh';
import Card from '@components/ui/Card';
import { SkeletonList } from '@components/ui/Skeleton';
import EmptyState from '@components/ui/EmptyState';
import Input from '@components/ui/Input';
import OfflineBanner from '@components/ui/OfflineBanner';
import ListFooterLoader from '@components/ui/ListFooterLoader';
import SortSelector, { SortOption } from '@components/ui/SortSelector';
import { usePaginatedSearch } from '@hooks/usePaginatedSearch';
import { lightTap } from '@lib/haptics';
import AnimatedListItem from '@components/ui/AnimatedListItem';

interface Supplier {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  gst_number?: string | null;
  address?: string | null;
  gstin?: string | null;
}

const AVATAR_GRADIENTS: [string, string][] = [
  ['#4F46E5', '#7C3AED'],
  ['#059669', '#10B981'],
  ['#D97706', '#F59E0B'],
  ['#0369A1', '#0EA5E9'],
  ['#7C3AED', '#A78BFA'],
];

const SUPPLIER_SORT_OPTIONS: SortOption[] = [
  { key: 'name', label: 'Name' },
  { key: 'updated_at', label: 'Recent' },
  { key: 'created_at', label: 'Added' },
];

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function SuppliersScreen() {
  const navigation = useNavigation<MoreStackNavigationProp>();
  const { colors, isDark } = useTheme();
  const { organizationId } = useAuth();
  const [sortKey, setSortKey] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);

  const {
    items: suppliers,
    searchQuery,
    setSearchQuery,
    status,
    error,
    isOffline,
    hasMore,
    totalCount,
    isLoadingMore,
    loadMore,
    refresh,
    isRefreshing,
  } = usePaginatedSearch<Supplier>({
    table: 'suppliers',
    organizationId,
    searchColumns: ['name', 'email', 'phone', 'gst_number'],
    orderBy: sortKey,
    ascending: sortAsc,
  });

  useFocusRefresh(refresh);

  const handleEndReached = useCallback(() => {
    if (hasMore && !isLoadingMore && status !== 'loading') {
      loadMore();
    }
  }, [hasMore, isLoadingMore, status, loadMore]);

  const renderItem = useCallback(({ item, index }: { item: Supplier; index: number }) => {
    const gradient = AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];

    return (
      <AnimatedListItem index={index}>
        <Card
          onPress={() => navigation.navigate('SupplierDetail', { supplierId: item.id })}
          style={styles.supplierCard}
        >
          <View style={styles.supplierRow}>
            <LinearGradient
              colors={gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
            </LinearGradient>

          <View style={styles.supplierInfo}>
            <Text style={[styles.supplierName, { color: colors.text }]} numberOfLines={2}>
              {item.name}
            </Text>

            {item.email && (
              <View style={styles.detailRow}>
                <Ionicons name="mail-outline" size={13} color={colors.textTertiary} />
                <Text style={[styles.detailText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.email}
                </Text>
              </View>
            )}

            {item.phone && (
              <View style={styles.detailRow}>
                <Ionicons name="call-outline" size={13} color={colors.textTertiary} />
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                  {item.phone}
                </Text>
              </View>
            )}

            {(item.gst_number || item.gstin) && (
              <View style={[styles.gstBadge, { backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(79,70,229,0.08)' }]}>
                <Text style={[styles.gstText, { color: colors.primary }]}>
                  GST: {item.gst_number || item.gstin}
                </Text>
              </View>
            )}
          </View>

          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </View>
        </Card>
      </AnimatedListItem>
    );
  }, [colors, isDark, navigation]);

  const renderListFooter = useCallback(() => (
    <ListFooterLoader
      isLoading={isLoadingMore}
      hasMore={hasMore}
      itemCount={suppliers.length}
      totalCount={totalCount}
    />
  ), [isLoadingMore, hasMore, suppliers.length, totalCount]);

  const renderEmptyState = useCallback(() => {
    if (status === 'loading') return null;

    if (status === 'error' && error) {
      return (
        <EmptyState
          icon="alert-circle-outline"
          title="Something went wrong"
          description={error}
          actionText="Try Again"
          onAction={refresh}
        />
      );
    }

    return (
      <EmptyState
        icon="business-outline"
        title={searchQuery ? 'No suppliers found' : 'No suppliers yet'}
        description={searchQuery ? 'Try a different search term' : 'Add your first supplier to get started'}
        actionText={!searchQuery ? 'Add Supplier' : undefined}
        onAction={!searchQuery ? () => navigation.navigate('AddSupplier', {}) : undefined}
      />
    );
  }, [status, error, searchQuery, refresh, navigation]);

  if (status === 'loading' && suppliers.length === 0 && !searchQuery) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <SkeletonList count={6} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isOffline && <OfflineBanner onRetry={refresh} />}

      <View style={styles.searchContainer}>
        <Input
          placeholder="Search suppliers..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="search"
          containerStyle={styles.searchInput}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {status === 'loading' && suppliers.length > 0 && (
          <View style={styles.searchIndicator}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
      </View>

      <View style={styles.overviewContainer}>
        <Card style={styles.overviewCard}>
          <View style={styles.overviewStat}>
            <Text style={[styles.overviewValue, { color: colors.text }]}>{totalCount}</Text>
            <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>Total</Text>
          </View>
          <View style={[styles.overviewDivider, { backgroundColor: colors.border }]} />
          <View style={styles.overviewStat}>
            <Text style={[styles.overviewValue, { color: colors.primary }]}>
              {suppliers.filter((s) => s.gst_number || s.gstin).length}
            </Text>
            <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>With GST</Text>
          </View>
          <View style={[styles.overviewDivider, { backgroundColor: colors.border }]} />
          <View style={styles.overviewStat}>
            <Text style={[styles.overviewValue, { color: colors.text }]}>
              {suppliers.filter((s) => s.phone).length}
            </Text>
            <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>With Phone</Text>
          </View>
        </Card>
      </View>

      <SortSelector
        options={SUPPLIER_SORT_OPTIONS}
        activeKey={sortKey}
        ascending={sortAsc}
        onSort={(key, asc) => { setSortKey(key); setSortAsc(asc); }}
      />

      <FlatList
        data={suppliers}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, suppliers.length === 0 && styles.listContentEmpty]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderListFooter}
        removeClippedSubviews={true}
        maxToRenderPerBatch={15}
        windowSize={10}
        initialNumToRender={15}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => { lightTap(); navigation.navigate('AddSupplier', {}); }}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchContainer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4, position: 'relative' },
  searchInput: { marginBottom: 0 },
  searchIndicator: { position: 'absolute', right: 32, top: 24 },
  overviewContainer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 2 },
  overviewCard: { padding: 14, flexDirection: 'row', alignItems: 'center' },
  overviewStat: { flex: 1, alignItems: 'center' },
  overviewValue: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  overviewLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
  overviewDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginHorizontal: 6 },
  listContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 100 },
  listContentEmpty: { flexGrow: 1 },
  supplierCard: { padding: 14 },
  supplierRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  supplierInfo: { flex: 1 },
  supplierName: { fontSize: 15, fontWeight: '600', marginBottom: 3, letterSpacing: -0.2, lineHeight: 20 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 5 },
  detailText: { fontSize: 13, flex: 1 },
  gstBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 6 },
  gstText: { fontSize: 11, fontWeight: '600' },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
});
