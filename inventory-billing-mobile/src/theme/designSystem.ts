/**
 * Design System - Professional, Elegant, Trustworthy
 * 
 * Inspired by: Stripe, Mercury, Cred
 * 
 * Design Principles:
 * 1. Visual Hierarchy - Clear distinction between headings, body, labels
 * 2. Consistent Spacing - 8pt grid system
 * 3. Depth & Elevation - Subtle shadows for card hierarchy
 * 4. Color Psychology - Deep blues for trust, greens for success
 * 5. White Space - Clean, uncluttered layouts
 */

// ============================================
// COLOR PALETTE - Sophisticated & Professional
// ============================================

export const palette = {
  // Primary Brand Colors
  primary: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#6366F1', // Main primary - Indigo
    600: '#4F46E5',
    700: '#4338CA',
    800: '#3730A3',
    900: '#312E81',
  },
  
  // Secondary - Slate (Professional grays)
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
  
  // Success - Emerald
  success: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',
  },
  
  // Warning - Amber
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },
  
  // Error - Rose
  error: {
    50: '#FFF1F2',
    100: '#FFE4E6',
    200: '#FECDD3',
    300: '#FDA4AF',
    400: '#FB7185',
    500: '#F43F5E',
    600: '#E11D48',
    700: '#BE123C',
    800: '#9F1239',
    900: '#881337',
  },
  
  // Info - Sky
  info: {
    50: '#F0F9FF',
    100: '#E0F2FE',
    200: '#BAE6FD',
    300: '#7DD3FC',
    400: '#38BDF8',
    500: '#0EA5E9',
    600: '#0284C7',
    700: '#0369A1',
    800: '#075985',
    900: '#0C4A6E',
  },
  
  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

// ============================================
// THEME COLORS - Light & Dark Modes
// ============================================

export const themeColors = {
  light: {
    // Backgrounds
    background: '#F8FAFC',
    backgroundSecondary: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    
    // Text
    text: '#0F172A',
    textSecondary: '#475569',
    textTertiary: '#94A3B8',
    textMuted: '#CBD5E1',
    textInverse: '#FFFFFF',
    
    // Primary
    primary: '#4F46E5',
    primaryHover: '#4338CA',
    primaryLight: '#EEF2FF',
    primaryMuted: '#C7D2FE',
    
    // Accent (for CTAs)
    accent: '#6366F1',
    accentHover: '#4F46E5',
    
    // Borders
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    borderFocus: '#4F46E5',
    
    // Cards
    card: '#FFFFFF',
    cardHover: '#F8FAFC',
    
    // Status
    success: '#059669',
    successLight: '#ECFDF5',
    successMuted: '#A7F3D0',
    warning: '#D97706',
    warningLight: '#FFFBEB',
    warningMuted: '#FDE68A',
    error: '#E11D48',
    errorLight: '#FFF1F2',
    errorMuted: '#FECDD3',
    info: '#0284C7',
    infoLight: '#F0F9FF',
    infoMuted: '#BAE6FD',
    
    // Overlays
    overlay: 'rgba(15, 23, 42, 0.5)',
    overlayLight: 'rgba(15, 23, 42, 0.1)',
    
    // Gradients
    gradientPrimary: ['#4F46E5', '#6366F1'],
    gradientSuccess: ['#059669', '#10B981'],
    gradientPremium: ['#4F46E5', '#7C3AED'],
  },
  
  dark: {
    // Backgrounds
    background: '#0F172A',
    backgroundSecondary: '#1E293B',
    surface: '#1E293B',
    surfaceElevated: '#334155',
    
    // Text
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    textTertiary: '#64748B',
    textMuted: '#475569',
    textInverse: '#0F172A',
    
    // Primary
    primary: '#6366F1',
    primaryHover: '#818CF8',
    primaryLight: '#312E81',
    primaryMuted: '#4338CA',
    
    // Accent (for CTAs)
    accent: '#818CF8',
    accentHover: '#A5B4FC',
    
    // Borders
    border: '#334155',
    borderLight: '#1E293B',
    borderFocus: '#6366F1',
    
    // Cards
    card: '#1E293B',
    cardHover: '#334155',
    
    // Status
    success: '#34D399',
    successLight: '#064E3B',
    successMuted: '#047857',
    warning: '#FBBF24',
    warningLight: '#78350F',
    warningMuted: '#B45309',
    error: '#FB7185',
    errorLight: '#881337',
    errorMuted: '#BE123C',
    info: '#38BDF8',
    infoLight: '#0C4A6E',
    infoMuted: '#0369A1',
    
    // Overlays
    overlay: 'rgba(0, 0, 0, 0.7)',
    overlayLight: 'rgba(0, 0, 0, 0.3)',
    
    // Gradients
    gradientPrimary: ['#4F46E5', '#6366F1'],
    gradientSuccess: ['#059669', '#10B981'],
    gradientPremium: ['#4F46E5', '#7C3AED'],
  },
};

// ============================================
// TYPOGRAPHY - Modern Sans-Serif
// ============================================

export const typography = {
  // Font Family (uses system fonts for best native feel)
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
  
  // Font Sizes - Following a consistent scale
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  
  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  
  // Font Weights
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  
  // Letter Spacing
  letterSpacing: {
    tighter: -0.5,
    tight: -0.25,
    normal: 0,
    wide: 0.25,
    wider: 0.5,
  },
  
  // Pre-defined text styles
  styles: {
    // Headings
    h1: {
      fontSize: 30,
      fontWeight: '700' as const,
      letterSpacing: -0.5,
      lineHeight: 36,
    },
    h2: {
      fontSize: 24,
      fontWeight: '700' as const,
      letterSpacing: -0.25,
      lineHeight: 32,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600' as const,
      letterSpacing: 0,
      lineHeight: 28,
    },
    h4: {
      fontSize: 18,
      fontWeight: '600' as const,
      letterSpacing: 0,
      lineHeight: 24,
    },
    
    // Body
    bodyLarge: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
    },
    body: {
      fontSize: 15,
      fontWeight: '400' as const,
      lineHeight: 22,
    },
    bodySmall: {
      fontSize: 13,
      fontWeight: '400' as const,
      lineHeight: 20,
    },
    
    // Labels & Captions
    label: {
      fontSize: 13,
      fontWeight: '500' as const,
      letterSpacing: 0.25,
      lineHeight: 18,
    },
    labelSmall: {
      fontSize: 11,
      fontWeight: '500' as const,
      letterSpacing: 0.5,
      lineHeight: 16,
      textTransform: 'uppercase' as const,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
    },
    
    // Numbers & Data
    metric: {
      fontSize: 32,
      fontWeight: '700' as const,
      letterSpacing: -0.5,
      lineHeight: 40,
    },
    metricSmall: {
      fontSize: 24,
      fontWeight: '600' as const,
      letterSpacing: -0.25,
      lineHeight: 32,
    },
  },
};

// ============================================
// SPACING - 8pt Grid System
// ============================================

export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  
  // Semantic aliases
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
};

// ============================================
// BORDER RADIUS - Modern & Approachable
// ============================================

export const borderRadius = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
  
  // Component-specific
  button: 12,
  card: 16,
  modal: 24,
  input: 10,
  tag: 6,
  avatar: 9999,
};

// ============================================
// SHADOWS - Subtle, Premium Elevation
// ============================================

export const shadows = {
  // Light mode shadows
  light: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    xs: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 2,
      elevation: 1,
    },
    sm: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 8,
    },
    xl: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.10,
      shadowRadius: 24,
      elevation: 12,
    },
    // Colored shadows for emphasis
    primary: {
      shadowColor: '#4F46E5',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 8,
    },
    success: {
      shadowColor: '#059669',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
  },
  
  // Dark mode shadows
  dark: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    xs: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 1,
    },
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 8,
    },
    xl: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.4,
      shadowRadius: 24,
      elevation: 12,
    },
    primary: {
      shadowColor: '#6366F1',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 8,
    },
    success: {
      shadowColor: '#34D399',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
  },
};

// ============================================
// ANIMATION - Smooth & Professional
// ============================================

export const animation = {
  // Duration
  duration: {
    instant: 50,
    fast: 150,
    normal: 250,
    slow: 400,
    slower: 600,
  },
  
  // Easing
  easing: {
    linear: 'linear',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

// ============================================
// COMPONENT DIMENSIONS
// ============================================

export const dimensions = {
  // Button heights
  button: {
    sm: 36,
    md: 44,
    lg: 52,
  },
  
  // Input heights
  input: {
    sm: 40,
    md: 48,
    lg: 56,
  },
  
  // Icon sizes
  icon: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 28,
    xl: 32,
    '2xl': 40,
  },
  
  // Avatar sizes
  avatar: {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
    '2xl': 80,
  },
  
  // Touch targets (minimum 44px for accessibility)
  touchTarget: {
    min: 44,
    recommended: 48,
  },
  
  // Bottom tab bar
  tabBar: {
    height: 84,
    iconSize: 24,
  },
  
  // Header
  header: {
    height: 56,
    heightLarge: 96,
  },
};

// ============================================
// STATUS COLORS (for invoices, payments, etc.)
// ============================================

export const statusColors = {
  draft: {
    bg: '#F1F5F9',
    text: '#64748B',
    border: '#E2E8F0',
  },
  pending: {
    bg: '#FEF3C7',
    text: '#B45309',
    border: '#FDE68A',
  },
  sent: {
    bg: '#E0F2FE',
    text: '#0369A1',
    border: '#BAE6FD',
  },
  paid: {
    bg: '#ECFDF5',
    text: '#047857',
    border: '#A7F3D0',
  },
  partiallyPaid: {
    bg: '#EEF2FF',
    text: '#4338CA',
    border: '#C7D2FE',
  },
  overdue: {
    bg: '#FFF1F2',
    text: '#BE123C',
    border: '#FECDD3',
  },
  cancelled: {
    bg: '#F1F5F9',
    text: '#475569',
    border: '#CBD5E1',
  },
};

// ============================================
// Z-INDEX LAYERS
// ============================================

export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  fixed: 300,
  modalBackdrop: 400,
  modal: 500,
  popover: 600,
  tooltip: 700,
  toast: 800,
};

// Export a unified design system object
export const designSystem = {
  palette,
  colors: themeColors,
  typography,
  spacing,
  borderRadius,
  shadows,
  animation,
  dimensions,
  statusColors,
  zIndex,
};

export default designSystem;
