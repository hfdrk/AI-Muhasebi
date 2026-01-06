"use client";

import React, { useMemo } from "react";
import { colors, borderRadius } from "@/styles/design-system";

// ==================== Types ====================

interface SparklineChartProps {
  data: number[];
  color?: string;
  height?: number;
  width?: string;
  showArea?: boolean;
  showDots?: boolean;
  showLastDot?: boolean;
  animate?: boolean;
}

// ==================== Sparkline Chart Component ====================

export function SparklineChart({
  data,
  color = colors.primary,
  height = 40,
  width = "100%",
  showArea = true,
  showDots = false,
  showLastDot = true,
  animate = true,
}: SparklineChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const padding = 4;
    const effectiveHeight = height - padding * 2;

    // Normalize data to fit within the chart
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = padding + effectiveHeight - ((value - min) / range) * effectiveHeight;
      return { x, y, value };
    });

    // Create SVG path for the line
    const linePath = points
      .map((point, index) => {
        const command = index === 0 ? "M" : "L";
        return `${command} ${point.x} ${point.y}`;
      })
      .join(" ");

    // Create SVG path for the area (fill)
    const areaPath = `${linePath} L 100 ${height - padding} L 0 ${height - padding} Z`;

    return {
      points,
      linePath,
      areaPath,
      min,
      max,
    };
  }, [data, height]);

  if (!chartData) {
    return (
      <div
        style={{
          height,
          width,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: colors.text.muted,
          fontSize: "12px",
        }}
      >
        Veri yok
      </div>
    );
  }

  const containerStyle: React.CSSProperties = {
    height,
    width,
    position: "relative",
  };

  return (
    <div style={containerStyle}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        style={{ overflow: "visible" }}
      >
        {/* Gradient definition for area fill */}
        <defs>
          <linearGradient id={`sparkline-gradient-${color.replace("#", "")}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        {showArea && (
          <path
            d={chartData.areaPath}
            fill={`url(#sparkline-gradient-${color.replace("#", "")})`}
            style={{
              animation: animate ? "fadeIn 0.5s ease" : undefined,
            }}
          />
        )}

        {/* Line */}
        <path
          d={chartData.linePath}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            animation: animate ? "drawLine 1s ease forwards" : undefined,
          }}
        />

        {/* Dots */}
        {showDots &&
          chartData.points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="2"
              fill={colors.white}
              stroke={color}
              strokeWidth="1.5"
            />
          ))}

        {/* Last dot highlight */}
        {showLastDot && chartData.points.length > 0 && (
          <>
            <circle
              cx={chartData.points[chartData.points.length - 1].x}
              cy={chartData.points[chartData.points.length - 1].y}
              r="4"
              fill={color}
              opacity="0.3"
              style={{
                animation: animate ? "pulse 2s infinite" : undefined,
              }}
            />
            <circle
              cx={chartData.points[chartData.points.length - 1].x}
              cy={chartData.points[chartData.points.length - 1].y}
              r="2.5"
              fill={colors.white}
              stroke={color}
              strokeWidth="2"
            />
          </>
        )}
      </svg>

      <style>{`
        @keyframes drawLine {
          from {
            stroke-dasharray: 1000;
            stroke-dashoffset: 1000;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.5); opacity: 0.1; }
        }
      `}</style>
    </div>
  );
}

// ==================== Mini Bar Chart ====================

interface MiniBarChartProps {
  data: number[];
  color?: string;
  height?: number;
  width?: string;
  barGap?: number;
  highlightLast?: boolean;
}

export function MiniBarChart({
  data,
  color = colors.primary,
  height = 40,
  width = "100%",
  barGap = 2,
  highlightLast = true,
}: MiniBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height,
          width,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: colors.text.muted,
          fontSize: "12px",
        }}
      >
        Veri yok
      </div>
    );
  }

  const max = Math.max(...data);
  const barWidth = `calc((100% - ${barGap * (data.length - 1)}px) / ${data.length})`;

  return (
    <div
      style={{
        height,
        width,
        display: "flex",
        alignItems: "flex-end",
        gap: `${barGap}px`,
      }}
    >
      {data.map((value, index) => {
        const barHeight = max > 0 ? (value / max) * 100 : 0;
        const isLast = index === data.length - 1;

        return (
          <div
            key={index}
            style={{
              width: barWidth,
              height: `${barHeight}%`,
              minHeight: "2px",
              backgroundColor: isLast && highlightLast ? color : `${color}80`,
              borderRadius: `${borderRadius.sm} ${borderRadius.sm} 0 0`,
              transition: "height 0.3s ease",
            }}
          />
        );
      })}
    </div>
  );
}
