"use client";

import React from "react";
import { ArrowRight, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { colors, spacing, borderRadius, shadows, typography, transitions } from "@/styles/design-system";
import { useTheme } from "../../contexts/ThemeContext";

// ==================== Types ====================

export interface ComparisonData {
  label: string;
  currentValue: number;
  previousValue: number;
  unit?: string;
  prefix?: string;
}

interface MetricComparisonProps {
  title: string;
  currentPeriod: string;
  previousPeriod: string;
  data: ComparisonData[];
  showPercentageChange?: boolean;
  invertColors?: boolean; // For metrics where decrease is good
}

// ==================== Metric Comparison Component ====================

export function MetricComparison({
  title,
  currentPeriod,
  previousPeriod,
  data,
  showPercentageChange = true,
  invertColors = false,
}: MetricComparisonProps) {
  const { themeColors } = useTheme();
  const formatValue = (value: number, prefix?: string, unit?: string): string => {
    const formatted = value.toLocaleString("tr-TR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    if (prefix) return `${prefix}${formatted}`;
    if (unit) return `${formatted} ${unit}`;
    return formatted;
  };

  const calculateChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const getChangeColor = (change: number): string => {
    const isPositive = invertColors ? change < 0 : change > 0;
    const isNegative = invertColors ? change > 0 : change < 0;

    if (isPositive) return colors.success;
    if (isNegative) return colors.danger;
    return colors.gray[500];
  };

  const containerStyle: React.CSSProperties = {
    background: themeColors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    boxShadow: shadows.sm,
    border: `1px solid ${themeColors.border}`,
  };

  const headerStyle: React.CSSProperties = {
    marginBottom: spacing.lg,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: themeColors.text.primary,
    margin: 0,
    marginBottom: spacing.sm,
  };

  const periodHeaderStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 120px 120px 80px",
    gap: spacing.md,
    padding: `${spacing.sm} 0`,
    borderBottom: `2px solid ${themeColors.border}`,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: themeColors.text.muted,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };

  const rowStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 120px 120px 80px",
    gap: spacing.md,
    padding: `${spacing.md} 0`,
    borderBottom: `1px solid ${themeColors.gray[100]}`,
    alignItems: "center",
    transition: `background ${transitions.fast} ease`,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: themeColors.text.primary,
  };

  const valueStyle: React.CSSProperties = {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: themeColors.text.primary,
    textAlign: "right",
  };

  const previousValueStyle: React.CSSProperties = {
    fontSize: typography.fontSize.sm,
    color: themeColors.text.muted,
    textAlign: "right",
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h3 style={titleStyle}>{title}</h3>
      </div>

      {/* Table Header */}
      <div style={periodHeaderStyle}>
        <span>Metrik</span>
        <span style={{ textAlign: "right" }}>{currentPeriod}</span>
        <span style={{ textAlign: "right" }}>{previousPeriod}</span>
        {showPercentageChange && <span style={{ textAlign: "right" }}>Degisim</span>}
      </div>

      {/* Data Rows */}
      {data.map((item, index) => {
        const change = calculateChange(item.currentValue, item.previousValue);
        const changeColor = getChangeColor(change);
        const isPositive = change > 0;
        const isNegative = change < 0;
        const ChangeIcon = isPositive ? ArrowUpRight : isNegative ? ArrowDownRight : ArrowRight;

        return (
          <div
            key={index}
            style={rowStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = themeColors.gray[50];
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <span style={labelStyle}>{item.label}</span>
            <span style={valueStyle}>
              {formatValue(item.currentValue, item.prefix, item.unit)}
            </span>
            <span style={previousValueStyle}>
              {formatValue(item.previousValue, item.prefix, item.unit)}
            </span>
            {showPercentageChange && (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: "2px",
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold,
                  color: changeColor,
                }}
              >
                <ChangeIcon size={14} />
                {Math.abs(change).toFixed(1)}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ==================== Comparison Card ====================

interface ComparisonCardProps {
  label: string;
  currentValue: number;
  previousValue: number;
  currentLabel?: string;
  previousLabel?: string;
  prefix?: string;
  unit?: string;
  invertColors?: boolean;
}

export function ComparisonCard({
  label,
  currentValue,
  previousValue,
  currentLabel = "Bu Donem",
  previousLabel = "Onceki Donem",
  prefix,
  unit,
  invertColors = false,
}: ComparisonCardProps) {
  const { themeColors } = useTheme();
  const formatValue = (value: number): string => {
    const formatted = value.toLocaleString("tr-TR");
    if (prefix) return `${prefix}${formatted}`;
    if (unit) return `${formatted} ${unit}`;
    return formatted;
  };

  const change =
    previousValue !== 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;

  const isPositive = invertColors ? change < 0 : change > 0;
  const isNegative = invertColors ? change > 0 : change < 0;

  const changeColor = isPositive
    ? colors.success
    : isNegative
    ? colors.danger
    : colors.gray[500];

  const changeBg = isPositive
    ? colors.successLight
    : isNegative
    ? colors.dangerLight
    : themeColors.gray[100];

  const ChangeIcon = change > 0 ? ArrowUpRight : change < 0 ? ArrowDownRight : ArrowRight;

  return (
    <div
      style={{
        background: themeColors.white,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        border: `1px solid ${themeColors.border}`,
      }}
    >
      <div
        style={{
          fontSize: typography.fontSize.xs,
          fontWeight: typography.fontWeight.medium,
          color: themeColors.text.muted,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: spacing.sm,
        }}
      >
        {label}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing.md,
        }}
      >
        {/* Current Value */}
        <div>
          <div
            style={{
              fontSize: typography.fontSize.xs,
              color: themeColors.text.muted,
              marginBottom: "2px",
            }}
          >
            {currentLabel}
          </div>
          <div
            style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.bold,
              color: themeColors.text.primary,
            }}
          >
            {formatValue(currentValue)}
          </div>
        </div>

        {/* Arrow */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "2px",
              padding: `${spacing.xs} ${spacing.sm}`,
              backgroundColor: changeBg,
              borderRadius: borderRadius.full,
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.bold,
              color: changeColor,
            }}
          >
            <ChangeIcon size={12} />
            {Math.abs(change).toFixed(1)}%
          </div>
        </div>

        {/* Previous Value */}
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: typography.fontSize.xs,
              color: themeColors.text.muted,
              marginBottom: "2px",
            }}
          >
            {previousLabel}
          </div>
          <div
            style={{
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.semibold,
              color: themeColors.text.secondary,
            }}
          >
            {formatValue(previousValue)}
          </div>
        </div>
      </div>
    </div>
  );
}
