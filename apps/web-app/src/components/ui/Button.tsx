"use client";

import Link from "next/link";
import React, { useState } from "react";
import { colors, spacing, borderRadius, typography, transitions } from "../../styles/design-system";
import { useTheme } from "../../contexts/ThemeContext";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "success" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  asLink?: boolean;
  href?: string;
  children: React.ReactNode;
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  asLink = false,
  href,
  children,
  className = "",
  style,
  loading = false,
  icon,
  disabled,
  onClick,
  ...props
}: ButtonProps) {
  const { themeColors } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;
    
    // Create ripple effect
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = Date.now();
      
      setRipples((prev) => [...prev, { x, y, id }]);
      
      // Remove ripple after animation
      setTimeout(() => {
        setRipples((prev) => prev.filter((ripple) => ripple.id !== id));
      }, 600);
    }
    
    onClick?.(e);
  };

  const getVariantStyles = (): React.CSSProperties => {
    if (disabled || loading) {
      return {
        backgroundColor: themeColors.gray[300],
        color: themeColors.gray[600],
        cursor: "not-allowed",
        opacity: 0.6,
      };
    }

    switch (variant) {
      case "primary":
        return {
          backgroundColor: isHovered ? colors.primaryDark : colors.primary,
          color: colors.white,
          boxShadow: isHovered ? `0 4px 12px ${colors.primary}40` : "none",
        };
      case "secondary":
        return {
          backgroundColor: isHovered ? themeColors.gray[700] : themeColors.gray[600],
          color: colors.white,
        };
      case "danger":
        return {
          backgroundColor: isHovered ? colors.dangerDark : colors.danger,
          color: colors.white,
        };
      case "success":
        return {
          backgroundColor: isHovered ? colors.successDark : colors.success,
          color: colors.white,
        };
      case "outline":
        return {
          backgroundColor: "transparent",
          color: colors.primary,
          border: `2px solid ${colors.primary}`,
          ...(isHovered && {
            backgroundColor: colors.primaryLighter,
          }),
        };
      case "ghost":
        return {
          backgroundColor: isHovered ? themeColors.gray[100] : "transparent",
          color: themeColors.text.secondary,
          ...(isHovered && {
            color: themeColors.text.primary,
          }),
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
      gap: spacing.xs,
    },
    md: {
      padding: `${spacing.sm} ${spacing.md}`,
      fontSize: typography.fontSize.base,
      gap: spacing.sm,
    },
    lg: {
      padding: `${spacing.md} ${spacing.lg}`,
      fontSize: typography.fontSize.lg,
      gap: spacing.sm,
    },
  };

  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: typography.fontWeight.medium,
    fontFamily: typography.fontFamily.sans,
    borderRadius: borderRadius.md,
    cursor: disabled || loading ? "not-allowed" : "pointer",
    transition: `all ${transitions.normal} ease`,
    textDecoration: "none",
    border: variant === "outline" ? undefined : "none",
    position: "relative",
    overflow: "hidden",
    transform: isHovered && !disabled && !loading ? "translateY(-1px)" : "translateY(0)",
    ...getVariantStyles(),
    ...sizeStyles[size],
    ...style,
  };

  const content = (
    <>
      {loading && (
        <span
          style={{
            display: "inline-block",
            width: "16px",
            height: "16px",
            border: `2px solid ${colors.white}40`,
            borderTopColor: colors.white,
            borderRadius: "50%",
            animation: "spin 0.6s linear infinite",
          }}
        />
      )}
      {icon && !loading && <span>{icon}</span>}
      {children}
    </>
  );

  if (asLink && href && !loading && !disabled) {
    return (
      <>
        <Link
          href={href}
          style={baseStyle}
          className={className}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {icon && <span>{icon}</span>}
          {children}
        </Link>
        <style jsx global>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </>
    );
  }

  return (
    <>
      <button
        ref={buttonRef}
        type={asLink ? undefined : (props.type || "button")}
        style={baseStyle}
        className={className}
        disabled={disabled || loading}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        aria-disabled={disabled || loading}
        {...props}
      >
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            style={{
              position: "absolute",
              left: ripple.x,
              top: ripple.y,
              width: "0",
              height: "0",
              borderRadius: "50%",
              backgroundColor: "rgba(255, 255, 255, 0.6)",
              transform: "translate(-50%, -50%)",
              animation: "ripple 0.6s ease-out",
              pointerEvents: "none",
            }}
          />
        ))}
        {content}
      </button>
      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes ripple {
          to {
            width: 300px;
            height: 300px;
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
}


