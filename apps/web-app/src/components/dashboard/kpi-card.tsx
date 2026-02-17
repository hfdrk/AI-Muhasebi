"use client";

import React from "react";
import { colors, spacing, borderRadius, shadows, typography, transitions } from "@/styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";
import { TrendIndicator, TrendDirection } from "./trend-indicator";
import { SparklineChart } from "./sparkline-chart";

// ==================== Types ====================

export interface KPIData {
  value: number | string;
  previousValue?: number;
  target?: number;
  sparklineData?: number[];
  unit?: string;
  prefix?: string;
}

export interface KPICardProps {
  title: string;
  data: KPIData;
  icon?: React.ReactNode;
  color?: "primary" | "success" | "warning" | "danger" | "info";
  trend?: TrendDirection;
  trendValue?: number;
  trendLabel?: string;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  loading?: boolean;
  description?: string;
  footer?: React.ReactNode;
}

// ==================== Color Mappings ====================

const colorMap = {
  primary: {
    bg: colors.primaryLighter,
    accent: colors.primary,
    text: colors.primaryDark,
    gradient: colors.gradients.pastelPrimary,
  },
  success: {
    bg: colors.successLight,
    accent: colors.success,
    text: colors.successDark,
    gradient: colors.gradients.pastelSuccess,
  },
  warning: {
    bg: colors.warningLight,
    accent: colors.warning,
    text: colors.warningDark,
    gradient: colors.gradients.pastelWarning,
  },
  danger: {
    bg: colors.dangerLight,
    accent: colors.danger,
    text: colors.dangerDark,
    gradient: colors.gradients.pastelDanger,
  },
  info: {
    bg: colors.infoLight,
    accent: colors.info,
    text: colors.primaryDark,
    gradient: colors.gradients.pastelInfo,
  },
};

// ==================== KPI Card Component ====================

export function KPICard({
  title,
  data,
  icon,
  color = "primary",
  trend,
  trendValue,
  trendLabel,
  size = "md",
  onClick,
  loading = false,
  description,
  footer,
}: KPICardProps) {
  const { themeColors } = useTheme();
  const colorScheme = colorMap[color];

  const sizeStyles = {
    sm: {
      padding: spacing.md,
      titleSize: typography.fontSize.xs,
      valueSize: typography.fontSize.xl,
      iconSize: "32px",
    },
    md: {
      padding: spacing.lg,
      titleSize: typography.fontSize.sm,
      valueSize: typography.fontSize["2xl"],
      iconSize: "40px",
    },
    lg: {
      padding: spacing.xl,
      titleSize: typography.fontSize.base,
      valueSize: typography.fontSize["3xl"],
      iconSize: "48px",
    },
  };

  const currentSize = sizeStyles[size];

  const formatValue = (val: number | string): string => {
    if (typeof val === "string") return val;
    if (data.prefix) return `${data.prefix}${val.toLocaleString("tr-TR")}`;
    if (data.unit) return `${val.toLocaleString("tr-TR")} ${data.unit}`;
    return val.toLocaleString("tr-TR");
  };

  const cardStyle: React.CSSProperties = {
    background: themeColors.white,
    borderRadius: borderRadius.xl,
    padding: currentSize.padding,
    boxShadow: shadows.sm,
    border: `1px solid ${themeColors.border}`,
    transition: `all ${transitions.normal} ease`,
    cursor: onClick ? "pointer" : "default",
    position: "relative",
    overflow: "hidden",
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: currentSize.titleSize,
    fontWeight: typography.fontWeight.medium,
    color: themeColors.text.secondary,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    margin: 0,
  };

  const iconContainerStyle: React.CSSProperties = {
    width: currentSize.iconSize,
    height: currentSize.iconSize,
    borderRadius: borderRadius.lg,
    background: colorScheme.gradient,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: colorScheme.accent,
    flexShrink: 0,
  };

  const valueStyle: React.CSSProperties = {
    fontSize: currentSize.valueSize,
    fontWeight: typography.fontWeight.bold,
    color: themeColors.text.primary,
    lineHeight: 1.2,
    margin: 0,
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: typography.fontSize.xs,
    color: themeColors.text.muted,
    marginTop: spacing.xs,
  };

  const footerStyle: React.CSSProperties = {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTop: `1px solid ${themeColors.border}`,
  };

  const loadingOverlayStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    background: "rgba(255, 255, 255, 0.8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.xl,
  };

  const calculateProgress = (): number | null => {
    if (!data.target || typeof data.value !== "number") return null;
    return Math.min((data.value / data.target) * 100, 100);
  };

  const progress = calculateProgress();

  return (
    <div
      style={cardStyle}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = shadows.md;
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = shadows.sm;
        }
      }}
    >
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ flex: 1 }}>
          <p style={titleStyle}>{title}</p>
        </div>
        {icon && <div style={iconContainerStyle}>{icon}</div>}
      </div>

      {/* Value */}
      <div style={{ display: "flex", alignItems: "baseline", gap: spacing.sm, flexWrap: "wrap" }}>
        <h3 style={valueStyle}>{formatValue(data.value)}</h3>
        {trend && trendValue !== undefined && (
          <TrendIndicator direction={trend} value={trendValue} label={trendLabel} />
        )}
      </div>

      {/* Description */}
      {description && <p style={descriptionStyle}>{description}</p>}

      {/* Progress bar if target exists */}
      {progress !== null && (
        <div style={{ marginTop: spacing.md }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: spacing.xs,
              fontSize: typography.fontSize.xs,
              color: themeColors.text.muted,
            }}
          >
            <span>Hedefe ilerleme</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <div
            style={{
              height: "6px",
              backgroundColor: themeColors.gray[200],
              borderRadius: borderRadius.full,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                backgroundColor: colorScheme.accent,
                borderRadius: borderRadius.full,
                transition: `width ${transitions.slow} ease`,
              }}
            />
          </div>
        </div>
      )}

      {/* Sparkline */}
      {data.sparklineData && data.sparklineData.length > 0 && (
        <div style={{ marginTop: spacing.md }}>
          <SparklineChart data={data.sparklineData} color={colorScheme.accent} height={40} />
        </div>
      )}

      {/* Footer */}
      {footer && <div style={footerStyle}>{footer}</div>}

      {/* Loading overlay */}
      {loading && (
        <div style={loadingOverlayStyle}>
          <div
            style={{
              width: "24px",
              height: "24px",
              border: `3px solid ${themeColors.gray[200]}`,
              borderTopColor: colorScheme.accent,
              borderRadius: borderRadius.full,
              animation: "spin 1s linear infinite",
            }}
          />
        </div>
      )}
    </div>
  );
}

// ==================== KPI Card Grid ====================

interface KPICardGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  gap?: "sm" | "md" | "lg";
}

export function KPICardGrid({ children, columns = 4, gap = "md" }: KPICardGridProps) {
  const gapMap = {
    sm: spacing.sm,
    md: spacing.md,
    lg: spacing.lg,
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: gapMap[gap],
      }}
    >
      {children}
      <style>{`
        @media (max-width: 1024px) {
          div[style*="grid-template-columns: repeat(${columns}"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 640px) {
          div[style*="grid-template-columns: repeat(${columns}"] {
            grid-template-columns: 1fr !important;
          }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
