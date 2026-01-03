import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, TouchableOpacity } from 'react-native';
import { useTheme } from '@contexts/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'elevated' | 'outlined' | 'glass';
  onPress?: () => void;
  disabled?: boolean;
}

export default function Card({ 
  children, 
  style, 
  padding = 'md', 
  variant = 'default',
  onPress,
  disabled = false,
}: CardProps) {
  const { colors, shadows, spacing, borderRadius, isDark } = useTheme();

  const paddingStyles: Record<string, number> = {
    none: 0,
    sm: spacing.sm,
    md: spacing.md,
    lg: spacing.lg,
    xl: spacing.xl,
  };

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: colors.card,
          ...shadows.lg,
        };
      case 'outlined':
        return {
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          ...shadows.none,
        };
      case 'glass':
        return {
          backgroundColor: isDark 
            ? 'rgba(255, 255, 255, 0.05)' 
            : 'rgba(255, 255, 255, 0.8)',
          borderWidth: 1,
          borderColor: isDark 
            ? 'rgba(255, 255, 255, 0.1)' 
            : 'rgba(255, 255, 255, 0.5)',
          ...shadows.sm,
        };
      default:
        return {
          backgroundColor: colors.card,
          ...shadows.sm,
        };
    }
  };

  const cardStyle: ViewStyle = {
    borderRadius: borderRadius.card,
    padding: paddingStyles[padding],
    ...getVariantStyle(),
  };

  if (onPress) {
    return (
      <TouchableOpacity
        style={[cardStyle, style]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[cardStyle, style]}>
      {children}
    </View>
  );
}

// Additional Card variants as separate components
export function MetricCard({ 
  label, 
  value, 
  icon, 
  trend,
  trendLabel,
  onPress,
  color = '#4F46E5',
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  onPress?: () => void;
  color?: string;
}) {
  const { colors, typography, spacing, borderRadius, shadows } = useTheme();

  return (
    <TouchableOpacity 
      style={[
        styles.metricCard, 
        { 
          backgroundColor: colors.card,
          ...shadows.sm,
        }
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={styles.metricHeader}>
        {icon && (
          <View style={[
            styles.metricIconContainer, 
            { backgroundColor: color + '15' }
          ]}>
            {icon}
          </View>
        )}
      </View>
      <View style={styles.metricContent}>
        <View style={[
          styles.metricValueWrapper,
          { backgroundColor: color + '08', borderRadius: borderRadius.md }
        ]}>
          <View 
            style={[styles.metricValueAccent, { backgroundColor: color }]} 
          />
          <View style={styles.metricValueContent}>
            <Text style={[
              styles.metricValue, 
              { color: colors.text }
            ]}>
              {value}
            </Text>
            <Text style={[
              styles.metricLabel, 
              { color: colors.textSecondary }
            ]}>
              {label}
            </Text>
          </View>
        </View>
        {trend && trendLabel && (
          <View style={styles.trendContainer}>
            <Text style={[
              styles.trendText,
              { 
                color: trend === 'up' ? colors.success : 
                       trend === 'down' ? colors.error : 
                       colors.textSecondary 
              }
            ]}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendLabel}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// Text component imported for MetricCard
import { Text } from 'react-native';

const styles = StyleSheet.create({
  metricCard: {
    borderRadius: 16,
    padding: 16,
    minWidth: 150,
  },
  metricHeader: {
    marginBottom: 12,
  },
  metricIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricContent: {
    flex: 1,
  },
  metricValueWrapper: {
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
    paddingVertical: 8,
  },
  metricValueAccent: {
    width: 3,
    borderRadius: 2,
    marginRight: 12,
  },
  metricValueContent: {
    flex: 1,
    paddingRight: 12,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  trendContainer: {
    marginTop: 8,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
