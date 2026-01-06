"use client";

import React from "react";
import { colors, typography } from "@/styles/design-system";

// ==================== Types ====================

interface ProgressRingProps {
  value: number; // 0-100
  maxValue?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  label?: string;
  showPercentage?: boolean;
  animate?: boolean;
  children?: React.ReactNode;
}

// ==================== Progress Ring Component ====================

export function ProgressRing({
  value,
  maxValue = 100,
  size = 120,
  strokeWidth = 10,
  color = colors.primary,
  backgroundColor = colors.gray[200],
  label,
  showPercentage = true,
  animate = true,
  children,
}: ProgressRingProps) {
  const normalizedValue = Math.min(Math.max(value, 0), maxValue);
  const percentage = (normalizedValue / maxValue) * 100;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const containerStyle: React.CSSProperties = {
    position: "relative",
    width: size,
    height: size,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const svgStyle: React.CSSProperties = {
    transform: "rotate(-90deg)",
    position: "absolute",
  };

  const centerContentStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    zIndex: 1,
  };

  const valueStyle: React.CSSProperties = {
    fontSize: size > 100 ? typography.fontSize["2xl"] : typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    lineHeight: 1,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    marginTop: "4px",
  };

  return (
    <div style={containerStyle}>
      <svg width={size} height={size} style={svgStyle}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animate ? circumference : strokeDashoffset}
          style={{
            transition: animate ? "stroke-dashoffset 1s ease-out" : undefined,
            animation: animate ? `progressRing-${size} 1s ease-out forwards` : undefined,
          }}
        />
      </svg>
      <div style={centerContentStyle}>
        {children || (
          <>
            {showPercentage && <span style={valueStyle}>{Math.round(percentage)}%</span>}
            {label && <span style={labelStyle}>{label}</span>}
          </>
        )}
      </div>
      {animate && (
        <style>{`
          @keyframes progressRing-${size} {
            to {
              stroke-dashoffset: ${strokeDashoffset};
            }
          }
        `}</style>
      )}
    </div>
  );
}

// ==================== Multi-Ring Progress ====================

interface MultiRingData {
  value: number;
  maxValue?: number;
  color: string;
  label: string;
}

interface MultiRingProgressProps {
  data: MultiRingData[];
  size?: number;
  strokeWidth?: number;
  gap?: number;
  showLegend?: boolean;
  centerContent?: React.ReactNode;
}

export function MultiRingProgress({
  data,
  size = 160,
  strokeWidth = 8,
  gap = 4,
  showLegend = true,
  centerContent,
}: MultiRingProgressProps) {
  const sortedData = [...data].sort((a, b) => (b.maxValue || 100) - (a.maxValue || 100));

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
      <div style={{ position: "relative", width: size, height: size }}>
        {sortedData.map((item, index) => {
          const ringSize = size - index * (strokeWidth + gap) * 2;
          const ringStrokeWidth = strokeWidth;
          const radius = (ringSize - ringStrokeWidth) / 2;
          const circumference = radius * 2 * Math.PI;
          const percentage = (item.value / (item.maxValue || 100)) * 100;
          const strokeDashoffset = circumference - (percentage / 100) * circumference;

          return (
            <svg
              key={index}
              width={ringSize}
              height={ringSize}
              style={{
                position: "absolute",
                top: `${index * (strokeWidth + gap)}px`,
                left: `${index * (strokeWidth + gap)}px`,
                transform: "rotate(-90deg)",
              }}
            >
              {/* Background */}
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                stroke={colors.gray[100]}
                strokeWidth={ringStrokeWidth}
                fill="none"
              />
              {/* Progress */}
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                stroke={item.color}
                strokeWidth={ringStrokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{
                  transition: "stroke-dashoffset 1s ease-out",
                }}
              />
            </svg>
          );
        })}
        {centerContent && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {centerContent}
          </div>
        )}
      </div>

      {showLegend && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center" }}>
          {data.map((item, index) => (
            <div key={index} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  backgroundColor: item.color,
                }}
              />
              <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
                {item.label}: {Math.round(item.value)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== Goal Progress ====================

interface GoalProgressProps {
  title: string;
  current: number;
  target: number;
  unit?: string;
  prefix?: string;
  color?: string;
  size?: "sm" | "md" | "lg";
}

export function GoalProgress({
  title,
  current,
  target,
  unit,
  prefix,
  color = colors.primary,
  size = "md",
}: GoalProgressProps) {
  const sizeMap = {
    sm: { ring: 80, stroke: 6 },
    md: { ring: 100, stroke: 8 },
    lg: { ring: 140, stroke: 10 },
  };

  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;

  const formatValue = (val: number): string => {
    const formatted = val.toLocaleString("tr-TR");
    if (prefix) return `${prefix}${formatted}`;
    if (unit) return `${formatted} ${unit}`;
    return formatted;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
      <ProgressRing
        value={percentage}
        size={sizeMap[size].ring}
        strokeWidth={sizeMap[size].stroke}
        color={color}
        showPercentage={false}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: size === "lg" ? typography.fontSize.xl : typography.fontSize.lg,
              fontWeight: typography.fontWeight.bold,
              color: colors.text.primary,
              lineHeight: 1,
            }}
          >
            {formatValue(current)}
          </div>
          <div
            style={{
              fontSize: typography.fontSize.xs,
              color: colors.text.muted,
              marginTop: "2px",
            }}
          >
            / {formatValue(target)}
          </div>
        </div>
      </ProgressRing>
      <span
        style={{
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.medium,
          color: colors.text.secondary,
        }}
      >
        {title}
      </span>
    </div>
  );
}
