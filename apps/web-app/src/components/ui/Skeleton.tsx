"use client";

import { borderRadius, spacing } from "../../styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: "text" | "circular" | "rectangular";
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({
  width,
  height,
  variant = "rectangular",
  className = "",
  style,
}: SkeletonProps) {
  const { themeColors } = useTheme();
  const baseStyle: React.CSSProperties = {
    backgroundColor: themeColors.gray[200],
    borderRadius:
      variant === "circular"
        ? "50%"
        : variant === "text"
        ? borderRadius.sm
        : borderRadius.md,
    width: width || (variant === "text" ? "100%" : "100%"),
    height: height || (variant === "text" ? "1em" : "100%"),
    animation: "pulse 1.5s ease-in-out infinite",
    ...style,
  };

  return (
    <>
      <div className={className} style={baseStyle} />
      <style jsx global>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </>
  );
}

// Pre-built skeleton components
export function SkeletonText({ lines = 1, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={className}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          height="1em"
          width={i === lines - 1 ? "80%" : "100%"}
          style={{ marginBottom: i < lines - 1 ? spacing.xs : 0 }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  const { themeColors } = useTheme();
  return (
    <div
      className={className}
      style={{
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        border: `1px solid ${themeColors.border}`,
        backgroundColor: themeColors.white,
      }}
    >
      <Skeleton variant="rectangular" height="24px" width="60%" style={{ marginBottom: spacing.md }} />
      <SkeletonText lines={3} />
    </div>
  );
}

export function SkeletonAvatar({ size = 40, className = "" }: { size?: number; className?: string }) {
  return <Skeleton variant="circular" width={size} height={size} className={className} />;
}

export function SkeletonTable({ rows = 5, columns = 4, className = "" }: { rows?: number; columns?: number; className?: string }) {
  return (
    <div className={className}>
      {/* Header */}
      <div style={{ display: "flex", gap: spacing.md, marginBottom: spacing.md }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} variant="rectangular" height="20px" width="100%" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} style={{ display: "flex", gap: spacing.md, marginBottom: spacing.sm }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} variant="rectangular" height="16px" width="100%" />
          ))}
        </div>
      ))}
    </div>
  );
}


