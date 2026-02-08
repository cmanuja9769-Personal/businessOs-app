import React, { useCallback } from 'react';
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
import { MoreStackNavigationProp } from '@navigation/types';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import Card from '@components/ui/Card';
import Loading from '@components/ui/Loading';
import EmptyState from '@components/ui/EmptyState';
import Input from '@components/ui/Input';
import OfflineBanner from '@components/ui/OfflineBanner';
import ListFooterLoader from '@components/ui/ListFooterLoader';
import { usePaginatedSearch } from '@hooks/usePaginatedSearch';
import { spacing, fontSize } from '@theme/spacing';

interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  gst_number?: string | null;
  address?: string | null;
  gstin?: string | null;
  billing_address?: string | null;
}

export default function CustomersScreen() {
  const navigation = useNavigation<MoreStackNavigationProp>();
  const { colors } = useTheme();
  const { organizationId } = useAuth();

  const {
    items: customers,
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
  } = usePaginatedSearch<Customer>({
    table: 'customers',
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

  const renderItem = useCallback(({ item }: { item: Customer }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('CustomerDetail', { customerId: item.id })}
      activeOpacity={0.7}
    >
      <Card style={styles.customerCard}>
        <View style={styles.customerHeader}>
          <View style={styles.customerInfo}>
            <Text
              style={[styles.customerName, { color: colors.text }]}
              numberOfLines={2}
            >
              {item.name}
            </Text>
            {item.email && (
              <Text style={[styles.customerDetail, { color: colors.textSecondary }]}>
                <Ionicons name="mail" size={14} /> {item.email}
              </Text>
            )}
            {item.phone && (
              <Text style={[styles.customerDetail, { color: colors.textSecondary }]}>
                <Ionicons name="call" size={14} /> {item.phone}
              </Text>
            )}
            {(item.gst_number || item.gstin) && (
              <Text style={[styles.customerDetail, { color: colors.textSecondary }]}>
                GSTIN: {item.gst_number || item.gstin}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </View>
      </Card>
    </TouchableOpacity>
  ), [colors, navigation]);

  const renderListFooter = useCallback(() => (
    <ListFooterLoader
      isLoading={isLoadingMore}
      hasMore={hasMore}
      itemCount={customers.length}
      totalCount={totalCount}
    />
  ), [isLoadingMore, hasMore, customers.length, totalCount]);

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
        icon="people-outline"
        title={searchQuery ? 'No customers found' : 'No customers yet'}
        description={searchQuery ? 'Try a different search term' : 'Add your first customer to get started'}
        actionText={!searchQuery ? 'Add Customer' : undefined}
        onAction={!searchQuery ? () => navigation.navigate('AddCustomer', {}) : undefined}
      />
    );
  }, [status, error, searchQuery, refresh, navigation]);

  if (status === 'loading' && customers.length === 0 && !searchQuery) {
    return <Loading fullScreen text="Loading customers..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isOffline && <OfflineBanner onRetry={refresh} />}

      <View style={styles.searchContainer}>
        <Input
          placeholder="Search customers..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="search"
          containerStyle={styles.searchInput}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {status === 'loading' && customers.length > 0 && (
          <View style={styles.searchIndicator}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
      </View>

      {totalCount > 0 && (
        <View style={styles.countContainer}>
          <Text style={[styles.countText, { color: colors.textTertiary }]}>
            {searchQuery
              ? `${customers.length} result${customers.length !== 1 ? 's' : ''}`
              : `${totalCount} customer${totalCount !== 1 ? 's' : ''} total`}
          </Text>
        </View>
      )}

      <FlatList
        data={customers}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          customers.length === 0 && styles.listContentEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
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
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('AddCustomer', {})}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    padding: spacing.md,
    paddingBottom: 0,
    position: 'relative',
  },
  searchInput: {
    marginBottom: 0,
  },
  searchIndicator: {
    position: 'absolute',
    right: spacing.md + 12,
    top: spacing.md + 12,
  },
  countContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  countText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  listContent: {
    padding: spacing.md,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  customerCard: {
    marginBottom: spacing.md,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerInfo: {
    flex: 1,
    flexShrink: 1,
  },
  customerName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.xs,
    lineHeight: fontSize.lg * 1.3,
  },
  customerDetail: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs / 2,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
