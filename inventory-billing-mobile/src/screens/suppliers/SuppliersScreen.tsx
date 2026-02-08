import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MoreStackNavigationProp } from '@navigation/types';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import Loading from '@components/ui/Loading';
import EmptyState from '@components/ui/EmptyState';
import Input from '@components/ui/Input';
import OfflineBanner from '@components/ui/OfflineBanner';
import ListFooterLoader from '@components/ui/ListFooterLoader';
import { usePaginatedSearch } from '@hooks/usePaginatedSearch';
import { supabase } from '@lib/supabase';
import { spacing, fontSize } from '@theme/spacing';

interface Supplier {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  gst_number?: string | null;
  address?: string | null;
  gstin?: string | null;
}

export default function SuppliersScreen() {
  const navigation = useNavigation<MoreStackNavigationProp>();
  const { colors, shadows, isDark } = useTheme();
  const { organizationId } = useAuth();

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
    orderBy: 'name',
    ascending: true,
  });

  const handleEndReached = useCallback(() => {
    if (hasMore && !isLoadingMore && status !== 'loading') {
      loadMore();
    }
  }, [hasMore, isLoadingMore, status, loadMore]);

  const confirmDeleteRef = useRef<(supplier: Supplier) => void>(() => {});

  const confirmDelete = useCallback((supplier: Supplier) => {
    if (!organizationId) return;
    Alert.alert(
      'Delete Supplier',
      `Are you sure you want to delete "${supplier.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error: delError } = await supabase
                .from('suppliers')
                .delete()
                .eq('organization_id', organizationId)
                .eq('id', supplier.id);
              if (delError) throw delError;
              refresh();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to delete supplier');
            }
          },
        },
      ]
    );
  }, [organizationId, refresh]);

  confirmDeleteRef.current = confirmDelete;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderItem = useCallback(({ item, index }: { item: Supplier; index: number }) => {
    const gradientColors: [string, string][] = [
      ['#4F46E5', '#6366F1'],
      ['#059669', '#10B981'],
      ['#D97706', '#F59E0B'],
      ['#0369A1', '#0EA5E9'],
      ['#7C3AED', '#8B5CF6'],
    ];
    const colorIndex = index % gradientColors.length;

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('SupplierDetail', { supplierId: item.id })}
        onLongPress={() =>
          Alert.alert('Supplier', item.name, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'View', onPress: () => navigation.navigate('SupplierDetail', { supplierId: item.id }) },
            { text: 'Edit', onPress: () => navigation.navigate('AddSupplier', { supplierId: item.id }) },
            { text: 'Delete', style: 'destructive', onPress: () => confirmDeleteRef.current(item) },
          ])
        }
        activeOpacity={0.7}
        style={[styles.supplierCard, { backgroundColor: colors.card, ...shadows.sm }]}
      >
        <View style={styles.supplierRow}>
          <LinearGradient
            colors={gradientColors[colorIndex]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarGradient}
          >
            <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
          </LinearGradient>

          <View style={styles.supplierInfo}>
            <Text style={[styles.supplierName, { color: colors.text }]} numberOfLines={2}>
              {item.name}
            </Text>

            {item.email && (
              <View style={styles.detailRow}>
                <Ionicons name="mail-outline" size={14} color={colors.textTertiary} />
                <Text style={[styles.detailText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.email}
                </Text>
              </View>
            )}

            {item.phone && (
              <View style={styles.detailRow}>
                <Ionicons name="call-outline" size={14} color={colors.textTertiary} />
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                  {item.phone}
                </Text>
              </View>
            )}

            {(item.gst_number || item.gstin) && (
              <View style={[styles.gstBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.gstText, { color: colors.primary }]}>
                  GSTIN: {item.gst_number || item.gstin}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.chevronContainer}>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [colors, shadows, navigation]);

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
    return <Loading fullScreen text="Loading suppliers..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {isOffline && <OfflineBanner onRetry={refresh} />}

      <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
        <Input
          placeholder="Search suppliers..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="search"
          containerStyle={styles.searchInputContainer}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {status === 'loading' && suppliers.length > 0 && (
          <View style={styles.searchIndicator}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}

        {totalCount > 0 && (
          <Text style={[styles.resultsText, { color: colors.textSecondary }]}>
            {searchQuery
              ? `${suppliers.length} result${suppliers.length !== 1 ? 's' : ''}`
              : `${totalCount} supplier${totalCount !== 1 ? 's' : ''}`}
          </Text>
        )}
      </View>

      <FlatList
        data={suppliers}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          suppliers.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
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
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddSupplier', {})}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#4F46E5', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color="#ffffff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 12,
    position: 'relative',
  },
  searchInputContainer: {
    marginBottom: 0,
  },
  searchIndicator: {
    position: 'absolute',
    right: 32,
    top: Platform.OS === 'android' ? 24 : 20,
  },
  resultsText: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 8,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  supplierCard: {
    borderRadius: 16,
    padding: 16,
  },
  supplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarGradient: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  detailText: {
    fontSize: 13,
    marginLeft: 6,
  },
  gstBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  gstText: {
    fontSize: 11,
    fontWeight: '600',
  },
  chevronContainer: {
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
});
