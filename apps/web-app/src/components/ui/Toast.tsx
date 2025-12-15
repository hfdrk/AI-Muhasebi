"use client";

import { Toaster } from "react-hot-toast";
import { colors, borderRadius, shadows } from "../../styles/design-system";

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: colors.white,
          color: colors.text.primary,
          borderRadius: borderRadius.lg,
          boxShadow: shadows.xl,
          border: `1px solid ${colors.border}`,
          padding: "16px",
          fontSize: "14px",
          fontWeight: 500,
        },
        success: {
          iconTheme: {
            primary: colors.success,
            secondary: colors.white,
          },
          style: {
            borderLeft: `4px solid ${colors.success}`,
          },
        },
        error: {
          iconTheme: {
            primary: colors.danger,
            secondary: colors.white,
          },
          style: {
            borderLeft: `4px solid ${colors.danger}`,
          },
        },
        loading: {
          iconTheme: {
            primary: colors.primary,
            secondary: colors.white,
          },
        },
      }}
    />
  );
}

// Helper functions for easy toast usage
export { toast } from "react-hot-toast";


