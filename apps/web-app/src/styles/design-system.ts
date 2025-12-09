/**
 * Enhanced Design System - Modern UI/UX with improved colors, spacing, and animations
 */

export const colors = {
  primary: "#2563eb",
  primaryDark: "#1d4ed8",
  primaryLight: "#3b82f6",
  primaryLighter: "#dbeafe",
  secondary: "#64748b",
  success: "#10b981",
  successLight: "#d1fae5",
  successDark: "#059669",
  danger: "#ef4444",
  dangerLight: "#fee2e2",
  dangerDark: "#dc2626",
  warning: "#f59e0b",
  warningLight: "#fef3c7",
  info: "#06b6d4",
  infoLight: "#cffafe",
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
  text: {
    primary: "#0f172a",
    secondary: "#475569",
    muted: "#64748b",
    inverse: "#ffffff",
    link: "#2563eb",
  },
  // Gradient colors
  gradients: {
    primary: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    success: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    danger: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    subtle: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
  },
};

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
    sans: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
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

// Animation durations
export const transitions = {
  fast: "150ms",
  normal: "200ms",
  slow: "300ms",
  slower: "500ms",
};

// Z-index scale
export const zIndex = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
};




