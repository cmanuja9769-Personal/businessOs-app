export const SPACING = {
  xs: "0.25rem",
  sm: "0.5rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
  "2xl": "3rem",
  "3xl": "4rem",
} as const

export const FONT_SIZE = {
  xs: "0.75rem",
  sm: "0.875rem",
  base: "1rem",
  lg: "1.125rem",
  xl: "1.25rem",
  "2xl": "1.5rem",
  "3xl": "1.875rem",
  "4xl": "2.25rem",
} as const

export const BREAKPOINTS = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const

export const Z_INDEX = {
  dropdown: 50,
  sticky: 100,
  fixed: 200,
  modalBackdrop: 300,
  modal: 400,
  popover: 500,
  tooltip: 600,
} as const

export const ANIMATION = {
  fast: "150ms",
  normal: "200ms",
  slow: "300ms",
  verySlow: "500ms",
} as const

export const BORDER_RADIUS = {
  sm: "calc(var(--radius) - 4px)",
  md: "calc(var(--radius) - 2px)",
  lg: "var(--radius)",
  xl: "calc(var(--radius) + 4px)",
  full: "9999px",
} as const

export const COLORS = {
  semantic: {
    success: "var(--success)",
    successForeground: "var(--success-foreground)",
    warning: "var(--warning)",
    warningForeground: "var(--warning-foreground)",
    info: "var(--info)",
    infoForeground: "var(--info-foreground)",
    destructive: "var(--destructive)",
    destructiveForeground: "var(--destructive-foreground)",
  },
  ui: {
    primary: "var(--primary)",
    primaryForeground: "var(--primary-foreground)",
    secondary: "var(--secondary)",
    secondaryForeground: "var(--secondary-foreground)",
    muted: "var(--muted)",
    mutedForeground: "var(--muted-foreground)",
    accent: "var(--accent)",
    accentForeground: "var(--accent-foreground)",
  },
  surface: {
    background: "var(--background)",
    foreground: "var(--foreground)",
    card: "var(--card)",
    cardForeground: "var(--card-foreground)",
    popover: "var(--popover)",
    popoverForeground: "var(--popover-foreground)",
  },
  border: {
    default: "var(--border)",
    input: "var(--input)",
    ring: "var(--ring)",
  },
} as const

export const PAGINATION = {
  defaultPageSize: 10,
  pageSizeOptions: [10, 20, 50, 100] as const,
  maxVisiblePages: 5,
} as const

export const STOCK_THRESHOLDS = {
  low: 10,
  warning: 25,
} as const

export const CURRENCY = {
  symbol: "₹",
  code: "INR",
  locale: "en-IN",
} as const

export const DATE_FORMATS = {
  display: "dd MMM yyyy",
  input: "yyyy-MM-dd",
  full: "EEEE, dd MMMM yyyy",
  month: "MMMM yyyy",
  time: "hh:mm a",
  datetime: "dd MMM yyyy, hh:mm a",
} as const
