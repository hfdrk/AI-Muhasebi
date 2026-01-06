"use client";

import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { colors, spacing, borderRadius, typography } from "@/styles/design-system";

// ==================== Types ====================

export type TrendDirection = "up" | "down" | "neutral";

interface TrendIndicatorProps {
  direction: TrendDirection;
  value?: number;
  label?: string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  invertColors?: boolean; // For metrics where down is good (e.g., expenses)
}

// ==================== Trend Indicator Component ====================

export function TrendIndicator({
  direction,
  value,
  label,
  size = "sm",
  showIcon = true,
  invertColors = false,
}: TrendIndicatorProps) {
  const sizeStyles = {
    sm: {
      fontSize: typography.fontSize.xs,
      iconSize: 12,
      padding: `${spacing.xs} ${spacing.sm}`,
      gap: "2px",
    },
    md: {
      fontSize: typography.fontSize.sm,
      iconSize: 14,
      padding: `${spacing.xs} ${spacing.sm}`,
      gap: spacing.xs,
    },
    lg: {
      fontSize: typography.fontSize.base,
      iconSize: 16,
      padding: `${spacing.sm} ${spacing.md}`,
      gap: spacing.xs,
    },
  };

  const currentSize = sizeStyles[size];

  // Determine colors based on direction and inversion
  const getColors = () => {
    const isPositive = invertColors ? direction === "down" : direction === "up";
    const isNegative = invertColors ? direction === "up" : direction === "down";

    if (isPositive) {
      return {
        bg: colors.successLight,
        text: colors.successDark,
      };
    }
    if (isNegative) {
      return {
        bg: colors.dangerLight,
        text: colors.dangerDark,
      };
    }
    return {
      bg: colors.gray[100],
      text: colors.gray[600],
    };
  };

  const colorScheme = getColors();

  const Icon =
    direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;

  const formatValue = (val: number): string => {
    const absVal = Math.abs(val);
    if (absVal >= 1000000) {
      return `${(absVal / 1000000).toFixed(1)}M`;
    }
    if (absVal >= 1000) {
      return `${(absVal / 1000).toFixed(1)}K`;
    }
    return absVal.toFixed(1);
  };

  const containerStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: currentSize.gap,
    padding: currentSize.padding,
    backgroundColor: colorScheme.bg,
    color: colorScheme.text,
    borderRadius: borderRadius.full,
    fontSize: currentSize.fontSize,
    fontWeight: typography.fontWeight.semibold,
    whiteSpace: "nowrap",
  };

  return (
    <span style={containerStyle}>
      {showIcon && <Icon size={currentSize.iconSize} />}
      {value !== undefined && (
        <span>
          {direction === "up" ? "+" : direction === "down" ? "-" : ""}
          {formatValue(value)}%
        </span>
      )}
      {label && <span style={{ fontWeight: typography.fontWeight.normal }}>{label}</span>}
    </span>
  );
}

// ==================== Trend Badge ====================

interface TrendBadgeProps {
  current: number;
  previous: number;
  label?: string;
  invertColors?: boolean;
  showPercentage?: boolean;
}

export function TrendBadge({
  current,
  previous,
  label,
  invertColors = false,
  showPercentage = true,
}: TrendBadgeProps) {
  if (previous === 0) {
    return (
      <TrendIndicator
        direction="neutral"
        label={label || "Veri yok"}
        showIcon={false}
      />
    );
  }

  const percentageChange = ((current - previous) / previous) * 100;
  const direction: TrendDirection =
    percentageChange > 0.5 ? "up" : percentageChange < -0.5 ? "down" : "neutral";

  return (
    <TrendIndicator
      direction={direction}
      value={showPercentage ? Math.abs(percentageChange) : undefined}
      label={label}
      invertColors={invertColors}
    />
  );
}
