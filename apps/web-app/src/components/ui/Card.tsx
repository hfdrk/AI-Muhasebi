"use client";

import { colors, spacing, borderRadius, shadows } from "../../styles/design-system";

interface CardProps {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
  style?: React.CSSProperties;
}

export function Card({ children, title, actions, style }: CardProps) {
  return (
    <div
      style={{
        backgroundColor: colors.white,
        borderRadius: borderRadius.md,
        border: `1px solid ${colors.border}`,
        boxShadow: shadows.sm,
        ...style,
      }}
    >
      {(title || actions) && (
        <div
          style={{
            padding: spacing.lg,
            borderBottom: `1px solid ${colors.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {title && <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 600 }}>{title}</h2>}
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div style={{ padding: spacing.lg }}>{children}</div>
    </div>
  );
}




