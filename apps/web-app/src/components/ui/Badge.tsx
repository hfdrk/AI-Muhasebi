"use client";

import React from 'react';
import { colors, spacing, borderRadius, typography, shadows } from '../../styles/design-system';
import { useTheme } from '../../contexts/ThemeContext';
import { Icon } from './Icon';

interface BadgeProps {
  variant?: 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  icon?: keyof typeof import('lucide-react');
  className?: string;
  style?: React.CSSProperties;
}

export function Badge({
  variant = 'primary',
  size = 'md',
  children,
  icon,
  className = '',
  style,
}: BadgeProps) {
  const { themeColors } = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.primaryLighter,
          color: colors.primaryDark,
          border: `1px solid ${colors.primary}`,
        };
      case 'success':
        return {
          backgroundColor: colors.successLight,
          color: colors.successDark,
          border: `1px solid ${colors.success}`,
        };
      case 'danger':
        return {
          backgroundColor: colors.dangerLight,
          color: colors.dangerDark,
          border: `1px solid ${colors.danger}`,
        };
      case 'warning':
        return {
          backgroundColor: colors.warningLight,
          color: colors.warning,
          border: `1px solid ${colors.warning}`,
        };
      case 'info':
        return {
          backgroundColor: colors.infoLight,
          color: colors.info,
          border: `1px solid ${colors.info}`,
        };
      case 'secondary':
        return {
          backgroundColor: themeColors.gray[100],
          color: themeColors.gray[700],
          border: `1px solid ${themeColors.gray[300]}`,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: themeColors.text.primary,
          border: `1px solid ${themeColors.border}`,
        };
      default:
        return {
          backgroundColor: colors.primaryLighter,
          color: colors.primaryDark,
          border: `1px solid ${colors.primary}`,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          padding: `${spacing.xs} ${spacing.sm}`,
          fontSize: typography.fontSize.xs,
          gap: spacing.xs,
        };
      case 'lg':
        return {
          padding: `${spacing.sm} ${spacing.md}`,
          fontSize: typography.fontSize.base,
          gap: spacing.sm,
        };
      case 'md':
      default:
        return {
          padding: `${spacing.xs} ${spacing.md}`,
          fontSize: typography.fontSize.sm,
          gap: spacing.xs,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: borderRadius.full,
        fontWeight: typography.fontWeight.medium,
        ...variantStyles,
        ...sizeStyles,
        boxShadow: shadows.sm,
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 12 : size === 'lg' ? 18 : 14} />}
      {children}
    </span>
  );
}


