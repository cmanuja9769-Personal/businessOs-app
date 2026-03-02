import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themeColors, shadows, typography, spacing, borderRadius, dimensions, statusColors, palette } from '@theme/designSystem';

type ColorScheme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'user_theme_preference';

interface ThemeContextType {
  colorScheme: ColorScheme;
  toggleColorScheme: () => void;
  setColorScheme: (scheme: ColorScheme) => void;
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
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(
    systemColorScheme === 'dark' ? 'dark' : 'light'
  );

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark') {
          setColorSchemeState(saved);
        }
      })
      .catch(() => {});
  }, []);

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    setColorSchemeState(scheme);
    AsyncStorage.setItem(THEME_STORAGE_KEY, scheme).catch(() => {});
  }, []);

  const toggleColorScheme = useCallback(() => {
    setColorSchemeState((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const themeValue: ThemeContextType = {
    colorScheme,
    toggleColorScheme,
    setColorScheme,
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
