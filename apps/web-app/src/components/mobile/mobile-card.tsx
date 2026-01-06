"use client";

import React, { useState } from "react";
import { ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { colors, spacing, borderRadius, shadows, typography, transitions } from "@/styles/design-system";

// ==================== Types ====================

interface MobileCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  padding?: "none" | "sm" | "md" | "lg";
  margin?: "none" | "sm" | "md" | "lg";
  shadow?: boolean;
  border?: boolean;
  rounded?: "sm" | "md" | "lg" | "xl";
  showArrow?: boolean;
  pressable?: boolean;
  style?: React.CSSProperties;
}

interface MobileListItemProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  value?: string | React.ReactNode;
  badge?: string | number;
  badgeColor?: "primary" | "success" | "danger" | "warning" | "info";
  onClick?: () => void;
  showArrow?: boolean;
  disabled?: boolean;
  destructive?: boolean;
}

interface MobileAccordionProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string | number;
}

interface MobileSectionProps {
  title?: string;
  children: React.ReactNode;
  padding?: boolean;
}

// ==================== Mobile Card Component ====================

export function MobileCard({
  children,
  onClick,
  padding = "md",
  margin = "none",
  shadow = true,
  border = true,
  rounded = "lg",
  showArrow = false,
  pressable = false,
  style,
}: MobileCardProps) {
  const [isPressed, setIsPressed] = useState(false);

  const paddingMap = {
    none: "0",
    sm: spacing.sm,
    md: spacing.md,
    lg: spacing.lg,
  };

  const marginMap = {
    none: "0",
    sm: spacing.sm,
    md: spacing.md,
    lg: spacing.lg,
  };

  const roundedMap = {
    sm: borderRadius.sm,
    md: borderRadius.md,
    lg: borderRadius.lg,
    xl: borderRadius.xl,
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: colors.white,
    padding: paddingMap[padding],
    margin: marginMap[margin],
    borderRadius: roundedMap[rounded],
    boxShadow: shadow ? shadows.sm : "none",
    border: border ? `1px solid ${colors.border}` : "none",
    cursor: (onClick || pressable) ? "pointer" : "default",
    transition: `all ${transitions.fast} ease`,
    transform: isPressed ? "scale(0.98)" : "scale(1)",
    display: showArrow ? "flex" : "block",
    alignItems: showArrow ? "center" : undefined,
    justifyContent: showArrow ? "space-between" : undefined,
    WebkitTapHighlightColor: "transparent",
    ...style,
  };

  const handlePress = () => {
    if (onClick || pressable) {
      setIsPressed(true);
    }
  };

  const handleRelease = () => {
    setIsPressed(false);
  };

  return (
    <div
      style={cardStyle}
      onClick={onClick}
      onTouchStart={handlePress}
      onTouchEnd={handleRelease}
      onMouseDown={handlePress}
      onMouseUp={handleRelease}
      onMouseLeave={handleRelease}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div style={{ flex: 1 }}>{children}</div>
      {showArrow && (
        <ChevronRight size={20} color={colors.gray[400]} style={{ marginLeft: spacing.sm }} />
      )}
    </div>
  );
}

// ==================== Mobile List Item Component ====================

export function MobileListItem({
  icon,
  title,
  subtitle,
  value,
  badge,
  badgeColor = "primary",
  onClick,
  showArrow = true,
  disabled = false,
  destructive = false,
}: MobileListItemProps) {
  const [isPressed, setIsPressed] = useState(false);

  const badgeColors = {
    primary: { bg: colors.primaryLighter, text: colors.primary },
    success: { bg: colors.successLight, text: colors.successDark },
    danger: { bg: colors.dangerLight, text: colors.dangerDark },
    warning: { bg: colors.warningLight, text: colors.warning },
    info: { bg: colors.infoLight, text: colors.info },
  };

  const containerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: spacing.md,
    padding: `${spacing.md} ${spacing.md}`,
    backgroundColor: isPressed ? colors.gray[50] : "transparent",
    cursor: disabled ? "not-allowed" : onClick ? "pointer" : "default",
    opacity: disabled ? 0.5 : 1,
    transition: `background ${transitions.fast} ease`,
    WebkitTapHighlightColor: "transparent",
    borderBottom: `1px solid ${colors.border}`,
  };

  const iconContainerStyle: React.CSSProperties = {
    width: "40px",
    height: "40px",
    borderRadius: borderRadius.lg,
    backgroundColor: destructive ? colors.dangerLight : colors.gray[100],
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: destructive ? colors.danger : colors.gray[600],
    flexShrink: 0,
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: destructive ? colors.danger : colors.text.primary,
    marginBottom: subtitle ? "2px" : 0,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
  };

  const valueStyle: React.CSSProperties = {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: "right",
  };

  const badgeStyle: React.CSSProperties = {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    backgroundColor: badgeColors[badgeColor].bg,
    color: badgeColors[badgeColor].text,
    padding: `2px ${spacing.sm}`,
    borderRadius: borderRadius.full,
  };

  return (
    <div
      style={containerStyle}
      onClick={disabled ? undefined : onClick}
      onTouchStart={() => !disabled && onClick && setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onMouseDown={() => !disabled && onClick && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      role={onClick ? "button" : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
    >
      {icon && <div style={iconContainerStyle}>{icon}</div>}
      <div style={contentStyle}>
        <div style={titleStyle}>{title}</div>
        {subtitle && <div style={subtitleStyle}>{subtitle}</div>}
      </div>
      {badge !== undefined && <span style={badgeStyle}>{badge}</span>}
      {value && <div style={valueStyle}>{value}</div>}
      {showArrow && onClick && (
        <ChevronRight size={20} color={colors.gray[400]} />
      )}
    </div>
  );
}

// ==================== Mobile Accordion Component ====================

export function MobileAccordion({
  title,
  subtitle,
  icon,
  children,
  defaultOpen = false,
  badge,
}: MobileAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
    borderBottom: `1px solid ${colors.border}`,
  };

  const iconContainerStyle: React.CSSProperties = {
    width: "40px",
    height: "40px",
    borderRadius: borderRadius.lg,
    backgroundColor: colors.gray[100],
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: colors.gray[600],
    flexShrink: 0,
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginBottom: subtitle ? "2px" : 0,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
  };

  const badgeStyle: React.CSSProperties = {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    backgroundColor: colors.primaryLighter,
    color: colors.primary,
    padding: `2px ${spacing.sm}`,
    borderRadius: borderRadius.full,
  };

  const bodyStyle: React.CSSProperties = {
    padding: isOpen ? spacing.md : 0,
    maxHeight: isOpen ? "1000px" : 0,
    overflow: "hidden",
    transition: `all ${transitions.normal} ease`,
    backgroundColor: colors.gray[50],
  };

  return (
    <div>
      <div
        style={headerStyle}
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        aria-expanded={isOpen}
      >
        {icon && <div style={iconContainerStyle}>{icon}</div>}
        <div style={contentStyle}>
          <div style={titleStyle}>{title}</div>
          {subtitle && <div style={subtitleStyle}>{subtitle}</div>}
        </div>
        {badge !== undefined && <span style={badgeStyle}>{badge}</span>}
        {isOpen ? (
          <ChevronUp size={20} color={colors.gray[400]} />
        ) : (
          <ChevronDown size={20} color={colors.gray[400]} />
        )}
      </div>
      <div style={bodyStyle}>{children}</div>
    </div>
  );
}

// ==================== Mobile Section Component ====================

export function MobileSection({ title, children, padding = true }: MobileSectionProps) {
  const containerStyle: React.CSSProperties = {
    marginBottom: spacing.lg,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.muted,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    padding: `${spacing.sm} ${padding ? spacing.md : 0}`,
  };

  const contentStyle: React.CSSProperties = {
    backgroundColor: colors.white,
    borderTop: `1px solid ${colors.border}`,
    borderBottom: `1px solid ${colors.border}`,
  };

  return (
    <div style={containerStyle}>
      {title && <div style={titleStyle}>{title}</div>}
      <div style={contentStyle}>{children}</div>
    </div>
  );
}

// ==================== Mobile Stat Card ====================

interface MobileStatCardProps {
  icon: React.ReactNode;
  iconColor?: string;
  iconBgColor?: string;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onClick?: () => void;
}

export function MobileStatCard({
  icon,
  iconColor = colors.primary,
  iconBgColor = colors.primaryLighter,
  title,
  value,
  subtitle,
  trend,
  onClick,
}: MobileStatCardProps) {
  const [isPressed, setIsPressed] = useState(false);

  const cardStyle: React.CSSProperties = {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    border: `1px solid ${colors.border}`,
    cursor: onClick ? "pointer" : "default",
    transition: `all ${transitions.fast} ease`,
    transform: isPressed ? "scale(0.98)" : "scale(1)",
    WebkitTapHighlightColor: "transparent",
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  };

  const iconContainerStyle: React.CSSProperties = {
    width: "36px",
    height: "36px",
    borderRadius: borderRadius.md,
    backgroundColor: iconBgColor,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: iconColor,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
  };

  const valueStyle: React.CSSProperties = {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    lineHeight: 1.2,
  };

  const footerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  };

  const trendStyle: React.CSSProperties = {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: trend?.isPositive ? colors.success : colors.danger,
  };

  return (
    <div
      style={cardStyle}
      onClick={onClick}
      onTouchStart={() => onClick && setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onMouseDown={() => onClick && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
    >
      <div style={headerStyle}>
        <div style={iconContainerStyle}>{icon}</div>
        <span style={titleStyle}>{title}</span>
      </div>
      <div style={valueStyle}>{value}</div>
      <div style={footerStyle}>
        {subtitle && <span style={subtitleStyle}>{subtitle}</span>}
        {trend && (
          <span style={trendStyle}>
            {trend.isPositive ? "+" : ""}
            {trend.value}%
          </span>
        )}
      </div>
    </div>
  );
}

export default MobileCard;
