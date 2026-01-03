// Theme Colors
export const colors = {
  light: {
    primary: '#2563eb',
    secondary: '#7c3aed',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#1e293b',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    error: '#ef4444',
    warning: '#f59e0b',
    success: '#10b981',
    info: '#3b82f6',
    card: '#ffffff',
    notification: '#ef4444',
  },
  dark: {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    border: '#334155',
    error: '#f87171',
    warning: '#fbbf24',
    success: '#34d399',
    info: '#60a5fa',
    card: '#1e293b',
    notification: '#f87171',
  },
};

export const commonColors = {
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
  
  // Status colors
  statusDraft: '#94a3b8',
  statusPending: '#f59e0b',
  statusPaid: '#10b981',
  statusPartiallyPaid: '#3b82f6',
  statusCancelled: '#ef4444',
  statusOverdue: '#dc2626',
  
  // Stock status
  stockHigh: '#10b981',
  stockMedium: '#f59e0b',
  stockLow: '#ef4444',
  stockOut: '#dc2626',
};

export type ColorScheme = 'light' | 'dark';
export type ThemeColors = typeof colors.light;
