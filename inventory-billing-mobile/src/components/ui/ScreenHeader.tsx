import React, { ReactNode, memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';

interface ScreenHeaderProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly rightAction?: ReactNode;
  readonly leftAction?: ReactNode;
  readonly compact?: boolean;
}

export const ScreenHeader = memo(function ScreenHeader({
  title,
  subtitle,
  rightAction,
  leftAction,
  compact = false,
}: ScreenHeaderProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + (compact ? 8 : 16),
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.row}>
        {leftAction && <View style={styles.leftAction}>{leftAction}</View>}
        <View style={styles.textContainer}>
          <Text
            style={[
              compact ? styles.titleCompact : styles.title,
              { color: colors.text },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[styles.subtitle, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {rightAction && <View style={styles.rightAction}>{rightAction}</View>}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  titleCompact: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  leftAction: {
    marginRight: 12,
  },
  rightAction: {
    marginLeft: 12,
  },
});
