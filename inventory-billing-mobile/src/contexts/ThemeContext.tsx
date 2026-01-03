import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { themeColors, shadows, typography, spacing, borderRadius, dimensions, statusColors, palette } from '@theme/designSystem';

type ColorScheme = 'light' | 'dark';

interface ThemeContextType {
  colorScheme: ColorScheme;
  toggleColorScheme: () => void;
  colors: typeof themeColors.light;
  shadows: typeof shadows.light;
  typography: typeof typography;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  dimensions: typeof dimensions;
  statusColors: typeof statusColors;
  palette: typeof palette;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [colorScheme, setColorScheme] = useState<ColorScheme>(
    systemColorScheme === 'dark' ? 'dark' : 'light'
  );

  useEffect(() => {
    // You can load saved theme preference from AsyncStorage here
  }, []);

  const toggleColorScheme = () => {
    setColorScheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const themeValue: ThemeContextType = {
    colorScheme,
    toggleColorScheme,
    colors: themeColors[colorScheme],
    shadows: shadows[colorScheme],
    typography,
    spacing,
    borderRadius,
    dimensions,
    statusColors,
    palette,
    isDark: colorScheme === 'dark',
  };

  return (
    <ThemeContext.Provider value={themeValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
