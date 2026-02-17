/**
 * AI Muhasebi Design System
 * Professional Turkish Financial Platform - Deep Navy & Teal Theme
 */

export const colors = {
  // Primary - Deep Navy (trustworthy, professional)
  primary: "#1e3a5f",
  primaryDark: "#152d4a",
  primaryLight: "#2a5080",
  primaryLighter: "#e8eef5",
  primaryPastel: "#f0f4f8",
  // Secondary
  secondary: "#64748b",
  // Status colors
  success: "#059669",
  successLight: "#d1fae5",
  successPastel: "#ecfdf5",
  successDark: "#047857",
  successLighter: "#ecfdf5",
  danger: "#dc2626",
  dangerLight: "#fee2e2",
  dangerPastel: "#fef2f2",
  dangerDark: "#b91c1c",
  // Aliases for error → danger (backward compat)
  error: "#dc2626",
  errorLight: "#fee2e2",
  errorLighter: "#fef2f2",
  errorDark: "#b91c1c",
  warning: "#d97706",
  warningLight: "#fef3c7",
  warningPastel: "#fffbeb",
  warningDark: "#b45309",
  // Accent/Info - Teal
  info: "#0d9488",
  infoLight: "#ccfbf1",
  infoPastel: "#f0fdfa",
  // Base colors
  light: "#f8fafc",
  dark: "#0f172a",
  white: "#ffffff",
  gray: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
  },
  border: "#e2e8f0",
  background: "#f8fafc",
  text: {
    primary: "#0f172a",
    secondary: "#475569",
    muted: "#64748b",
    inverse: "#ffffff",
    link: "#1e3a5f",
  },
  // Sidebar - Dark Navy
  sidebar: {
    bg: "#0f2137",
    bgHover: "#1a3352",
    text: "#94a3b8",
    textActive: "#ffffff",
    accentBorder: "#0d9488",
    headerBg: "#0a1929",
    sectionTitle: "#64748b",
  },
  // Gradients
  gradients: {
    primary: "linear-gradient(135deg, #1e3a5f 0%, #152d4a 100%)",
    success: "linear-gradient(135deg, #059669 0%, #047857 100%)",
    danger: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
    subtle: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
    pastelPrimary: "linear-gradient(135deg, #e8eef5 0%, #f0f4f8 100%)",
    pastelSuccess: "linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)",
    pastelDanger: "linear-gradient(135deg, #fef2f2 0%, #fff5f5 100%)",
    pastelWarning: "linear-gradient(135deg, #fffbeb 0%, #fefce8 100%)",
    pastelInfo: "linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%)",
    pastelHero: "linear-gradient(135deg, #e8eef5 0%, #f0fdfa 50%, #f0f4f8 100%)",
  },
};

// Dark theme colors (same shape as colors for type compatibility)
export const darkColors = {
  primary: "#3b82f6",
  primaryDark: "#2563eb",
  primaryLight: "#60a5fa",
  primaryLighter: "#1e3a5f",
  primaryPastel: "#172554",
  secondary: "#94a3b8",
  success: "#34d399",
  successLight: "#064e3b",
  successPastel: "#022c22",
  successDark: "#10b981",
  successLighter: "#064e3b",
  danger: "#f87171",
  dangerLight: "#450a0a",
  dangerPastel: "#300a0a",
  dangerDark: "#ef4444",
  error: "#f87171",
  errorLight: "#450a0a",
  errorLighter: "#300a0a",
  errorDark: "#ef4444",
  warning: "#fbbf24",
  warningLight: "#451a03",
  warningPastel: "#301303",
  warningDark: "#f59e0b",
  info: "#2dd4bf",
  infoLight: "#042f2e",
  infoPastel: "#022322",
  light: "#1e293b",
  dark: "#f8fafc",
  white: "#1e293b",
  gray: {
    50: "#1e293b",
    100: "#1a2332",
    200: "#334155",
    300: "#475569",
    400: "#64748b",
    500: "#94a3b8",
    600: "#cbd5e1",
    700: "#e2e8f0",
    800: "#f1f5f9",
    900: "#f8fafc",
  },
  border: "#334155",
  background: "#0f172a",
  text: {
    primary: "#f1f5f9",
    secondary: "#94a3b8",
    muted: "#64748b",
    inverse: "#0f172a",
    link: "#60a5fa",
  },
  sidebar: {
    bg: "#0a1929",
    bgHover: "#0f2137",
    text: "#94a3b8",
    textActive: "#ffffff",
    accentBorder: "#2dd4bf",
    headerBg: "#071321",
    sectionTitle: "#64748b",
  },
  gradients: {
    primary: "linear-gradient(135deg, #1e3a5f 0%, #0f2137 100%)",
    success: "linear-gradient(135deg, #059669 0%, #047857 100%)",
    danger: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
    subtle: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    pastelPrimary: "linear-gradient(135deg, #172554 0%, #1e293b 100%)",
    pastelSuccess: "linear-gradient(135deg, #064e3b 0%, #022c22 100%)",
    pastelDanger: "linear-gradient(135deg, #450a0a 0%, #300a0a 100%)",
    pastelWarning: "linear-gradient(135deg, #451a03 0%, #301303 100%)",
    pastelInfo: "linear-gradient(135deg, #042f2e 0%, #022322 100%)",
    pastelHero: "linear-gradient(135deg, #172554 0%, #042f2e 50%, #1e293b 100%)",
  },
};

/** Returns the appropriate color set based on theme */
export function getThemeColors(isDark: boolean) {
  return isDark ? darkColors : colors;
}

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px",
  xxl: "48px",
  "3xl": "64px",
};

export const borderRadius = {
  sm: "4px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  "2xl": "20px",
  full: "9999px",
};

export const typography = {
  fontFamily: {
    sans: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'Menlo, Monaco, "Courier New", monospace',
  },
  fontSize: {
    xs: "12px",
    sm: "14px",
    base: "16px",
    lg: "18px",
    xl: "20px",
    "2xl": "24px",
    "3xl": "30px",
    "4xl": "36px",
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const shadows = {
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)",
};

export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
};

export const transitions = {
  fast: "150ms",
  normal: "200ms",
  slow: "300ms",
  slower: "500ms",
};

export const zIndex = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
};
