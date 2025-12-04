"use client";

import Link from "next/link";
import { useState } from "react";
import { colors, spacing, borderRadius, typography } from "../../styles/design-system";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "success" | "outline";
  size?: "sm" | "md" | "lg";
  asLink?: boolean;
  href?: string;
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  asLink = false,
  href,
  children,
  className = "",
  style,
  ...props
}: ButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getVariantStyles = (): React.CSSProperties => {
    if (props.disabled) {
      return {
        backgroundColor: colors.gray[400],
        color: colors.white,
        opacity: 0.6,
        cursor: "not-allowed",
      };
    }

    switch (variant) {
      case "primary":
        return {
          backgroundColor: isHovered ? colors.primaryDark : colors.primary,
          color: colors.white,
        };
      case "secondary":
        return {
          backgroundColor: isHovered ? colors.gray[700] : colors.secondary,
          color: colors.white,
        };
      case "danger":
        return {
          backgroundColor: isHovered ? "#c82333" : colors.danger,
          color: colors.white,
        };
      case "success":
        return {
          backgroundColor: isHovered ? "#218838" : colors.success,
          color: colors.white,
        };
      case "outline":
        return {
          backgroundColor: "transparent",
          color: colors.primary,
          border: `1px solid ${colors.border}`,
        };
      default:
        return {
          backgroundColor: colors.primary,
          color: colors.white,
        };
    }
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: {
      padding: `${spacing.xs} ${spacing.sm}`,
      fontSize: typography.fontSize.sm,
    },
    md: {
      padding: `${spacing.sm} ${spacing.md}`,
      fontSize: typography.fontSize.base,
    },
    lg: {
      padding: `${spacing.md} ${spacing.lg}`,
      fontSize: typography.fontSize.lg,
    },
  };

  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: typography.fontWeight.medium,
    fontFamily: typography.fontFamily.sans,
    border: variant === "outline" ? `1px solid ${colors.border}` : "none",
    borderRadius: borderRadius.md,
    cursor: props.disabled ? "not-allowed" : "pointer",
    transition: "all 0.2s ease",
    textDecoration: "none",
    ...getVariantStyles(),
    ...sizeStyles[size],
    ...style,
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);

  if (asLink && href) {
    return (
      <Link
        href={href}
        style={baseStyle}
        className={className}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      style={baseStyle}
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </button>
  );
}


