"use client";

import { spacing, borderRadius, shadows, transitions } from "../../styles/design-system";
import { useTheme } from "../../contexts/ThemeContext";
import { useState } from "react";

interface CardProps {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
  style?: React.CSSProperties;
  hoverable?: boolean;
  variant?: "default" | "elevated" | "outlined";
  onClick?: () => void;
}

export function Card({
  children,
  title,
  actions,
  style,
  hoverable = false,
  variant = "default",
  onClick,
}: CardProps) {
  const { themeColors } = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case "elevated":
        return {
          boxShadow: isHovered ? shadows.lg : shadows.md,
          border: "none",
        };
      case "outlined":
        return {
          boxShadow: "none",
          border: `2px solid ${themeColors.border}`,
        };
      default:
        return {
          boxShadow: isHovered ? shadows.md : shadows.sm,
          border: `1px solid ${themeColors.border}`,
        };
    }
  };

  return (
    <div
      style={{
        backgroundColor: themeColors.white,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        transition: `all ${transitions.normal} ease`,
        transform: hoverable && isHovered ? "translateY(-4px) scale(1.01)" : "translateY(0) scale(1)",
        cursor: onClick ? "pointer" : "default",
        ...getVariantStyles(),
        ...style,
      }}
      onMouseEnter={() => hoverable && setIsHovered(true)}
      onMouseLeave={() => hoverable && setIsHovered(false)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={onClick ? title : undefined}
    >
      {(title || actions) && (
        <div
          style={{
            paddingBottom: title || actions ? spacing.md : 0,
            marginBottom: title || actions ? spacing.md : 0,
            borderBottom: title || actions ? `1px solid ${themeColors.border}` : "none",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {title && (
            <h2
              style={{
                margin: 0,
                fontSize: "20px",
                fontWeight: 600,
                color: themeColors.text.primary,
              }}
            >
              {title}
            </h2>
          )}
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}




