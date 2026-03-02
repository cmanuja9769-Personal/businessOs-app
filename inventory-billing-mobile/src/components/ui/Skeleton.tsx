import React, { useEffect, useRef, memo } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface SkeletonProps {
  readonly width?: number | string;
  readonly height?: number;
  readonly borderRadius?: number;
  readonly style?: ViewStyle;
}

export const Skeleton = memo(function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const { colors, isDark } = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const bg = isDark ? '#334155' : '#e2e8f0';

  return (
    <Animated.View
      style={[
        { width: width as number, height, borderRadius, backgroundColor: bg, opacity },
        style,
      ]}
    />
  );
});

export const SkeletonCard = memo(function SkeletonCard() {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Skeleton width={120} height={14} />
        <Skeleton width={60} height={24} borderRadius={12} />
      </View>
      <View style={styles.cardBody}>
        <Skeleton width="70%" height={12} />
        <View style={styles.cardMetrics}>
          <Skeleton width="30%" height={12} />
          <Skeleton width="30%" height={12} />
          <Skeleton width="30%" height={12} />
        </View>
      </View>
    </View>
  );
});

export const SkeletonList = memo(function SkeletonList({
  count = 5,
}: { readonly count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
});

export const SkeletonDashboard = memo(function SkeletonDashboard() {
  return (
    <View style={styles.dashboard}>
      <View style={styles.statsRow}>
        <Skeleton width="48%" height={80} borderRadius={12} />
        <Skeleton width="48%" height={80} borderRadius={12} />
      </View>
      <View style={styles.statsRow}>
        <Skeleton width="48%" height={80} borderRadius={12} />
        <Skeleton width="48%" height={80} borderRadius={12} />
      </View>
      <Skeleton width="100%" height={160} borderRadius={12} style={{ marginTop: 16 }} />
      <Skeleton width="40%" height={20} style={{ marginTop: 24 }} />
      <SkeletonList count={3} />
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardBody: {
    gap: 8,
  },
  cardMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  list: {
    gap: 0,
  },
  dashboard: {
    padding: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
});
