import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@contexts/ThemeContext';
import { lightTap } from '@lib/haptics';

export interface SortOption {
  readonly key: string;
  readonly label: string;
}

interface SortSelectorProps {
  readonly options: readonly SortOption[];
  readonly activeKey: string;
  readonly ascending: boolean;
  readonly onSort: (key: string, ascending: boolean) => void;
}

export default function SortSelector({ options, activeKey, ascending, onSort }: SortSelectorProps) {
  const { colors } = useTheme();

  const handlePress = (key: string) => {
    lightTap();
    if (key === activeKey) {
      onSort(key, !ascending);
    } else {
      onSort(key, true);
    }
  };

  return (
    <View style={styles.container}>
      <Ionicons name="swap-vertical" size={15} color={colors.textTertiary} style={styles.icon} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {options.map((option) => {
          const isActive = option.key === activeKey;
          return (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.chip,
                isActive
                  ? { backgroundColor: colors.primary }
                  : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
              ]}
              onPress={() => handlePress(option.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, { color: isActive ? '#fff' : colors.textSecondary }]}>
                {option.label}
              </Text>
              {isActive && (
                <Ionicons
                  name={ascending ? 'arrow-up' : 'arrow-down'}
                  size={13}
                  color="#fff"
                />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  icon: {
    marginRight: 8,
  },
  scrollContent: {
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
