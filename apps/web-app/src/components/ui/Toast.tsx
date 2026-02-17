"use client";

import { Toaster } from "react-hot-toast";
import { colors, borderRadius, shadows } from "../../styles/design-system";
import { useTheme } from "../../contexts/ThemeContext";

export function ToastProvider() {
  const { themeColors } = useTheme();
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: themeColors.white,
          color: themeColors.text.primary,
          borderRadius: borderRadius.lg,
          boxShadow: shadows.xl,
          border: `1px solid ${themeColors.border}`,
          padding: "16px",
          fontSize: "14px",
          fontWeight: 500,
        },
        success: {
          iconTheme: {
            primary: colors.success,
            secondary: themeColors.white,
          },
          style: {
            borderLeft: `4px solid ${colors.success}`,
          },
        },
        error: {
          iconTheme: {
            primary: colors.danger,
            secondary: themeColors.white,
          },
          style: {
            borderLeft: `4px solid ${colors.danger}`,
          },
        },
        loading: {
          iconTheme: {
            primary: colors.primary,
            secondary: themeColors.white,
          },
        },
      }}
    />
  );
}

// Helper functions for easy toast usage
export { toast } from "react-hot-toast";


