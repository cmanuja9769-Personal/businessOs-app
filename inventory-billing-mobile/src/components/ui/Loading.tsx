import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useTheme } from '@contexts/ThemeContext';

interface LoadingProps {
  size?: 'small' | 'large';
  text?: string;
  fullScreen?: boolean;
}

export default function Loading({ size = 'large', text, fullScreen = false }: LoadingProps) {
  const { colors } = useTheme();

  const containerStyle = fullScreen ? styles.fullScreenContainer : styles.container;

  return (
    <View style={[containerStyle, { backgroundColor: fullScreen ? colors.background : 'transparent' }]}>
      <ActivityIndicator size={size} color={colors.primary} />
      {text && (
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          {text}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    marginTop: 12,
    fontSize: 14,
  },
});
