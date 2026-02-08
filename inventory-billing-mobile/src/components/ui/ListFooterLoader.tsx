import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '@contexts/ThemeContext';

interface ListFooterLoaderProps {
  isLoading: boolean;
  hasMore: boolean;
  itemCount: number;
  totalCount: number;
}

export default function ListFooterLoader({
  isLoading,
  hasMore,
  itemCount,
  totalCount,
}: ListFooterLoaderProps) {
  const { colors } = useTheme();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          Loading more items...
        </Text>
      </View>
    );
  }

  if (!hasMore && itemCount > 0) {
    return (
      <View style={styles.container}>
        <Text style={[styles.text, { color: colors.textTertiary }]}>
          Showing all {itemCount} of {totalCount} items
        </Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 8,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
  },
});
