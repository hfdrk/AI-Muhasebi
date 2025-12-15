"use client";

import { Icon } from "./Icon";
import { Button } from "./Button";
import { colors, spacing, typography, transitions, shadows, borderRadius } from "../../styles/design-system";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "subtle" | "gradient";
}

export function EmptyState({
  icon = "Inbox",
  title,
  description,
  actionLabel,
  onAction,
  size = "md",
  variant = "default",
}: EmptyStateProps) {
  const iconSize = size === "sm" ? 48 : size === "md" ? 64 : 80;
  const titleSize = size === "sm" ? typography.fontSize.lg : size === "md" ? typography.fontSize.xl : typography.fontSize["2xl"];

  const getBackgroundStyle = () => {
    switch (variant) {
      case "gradient":
        return {
          background: `linear-gradient(135deg, ${colors.primaryPastel} 0%, ${colors.infoPastel} 100%)`,
          border: `1px solid ${colors.primaryLighter}`,
        };
      case "subtle":
        return {
          backgroundColor: colors.gray[50],
          border: `1px solid ${colors.border}`,
        };
      default:
        return {
          backgroundColor: "transparent",
        };
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.xxl,
        textAlign: "center",
        minHeight: "300px",
        borderRadius: borderRadius.lg,
        ...getBackgroundStyle(),
        transition: `all ${transitions.normal} ease`,
      }}
    >
      <div
        style={{
          width: iconSize + 32,
          height: iconSize + 32,
          borderRadius: "50%",
          backgroundColor: variant === "gradient" ? colors.white : colors.gray[100],
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: spacing.lg,
          boxShadow: shadows.md,
          animation: "float 3s ease-in-out infinite",
          transition: `all ${transitions.normal} ease`,
        }}
      >
        <Icon 
          name={icon as any} 
          size={iconSize} 
          color={variant === "gradient" ? colors.primary : colors.gray[400]} 
        />
      </div>
      <h3
        style={{
          fontSize: titleSize,
          fontWeight: typography.fontWeight.semibold,
          color: colors.text.primary,
          margin: 0,
          marginBottom: spacing.sm,
          animation: "fadeInUp 0.5s ease",
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
            margin: 0,
            marginBottom: actionLabel ? spacing.lg : 0,
            maxWidth: "500px",
            lineHeight: typography.lineHeight.relaxed,
            animation: "fadeInUp 0.6s ease",
          }}
        >
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <div style={{ animation: "fadeInUp 0.7s ease" }}>
          <Button onClick={onAction} variant="primary">
            {actionLabel}
          </Button>
        </div>
      )}
      <style jsx global>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

