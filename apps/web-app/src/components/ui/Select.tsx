"use client";

import React, { useState } from "react";
import { colors, spacing, borderRadius, typography, transitions } from "../../styles/design-system";
import { useTheme } from "../../contexts/ThemeContext";
import { Icon } from "./Icon";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: Array<{ value: string; label: string }>;
  icon?: string;
}

export function Select({ 
  label, 
  error, 
  helperText, 
  options, 
  icon,
  style, 
  className = "", 
  onFocus,
  onBlur,
  ...props 
}: SelectProps) {
  const { themeColors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: React.FocusEvent<HTMLSelectElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLSelectElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const getBorderColor = () => {
    if (error) return colors.danger;
    if (isFocused) return colors.primary;
    return themeColors.border;
  };

  const getFocusRing = () => {
    if (isFocused && !error) {
      return {
        boxShadow: `0 0 0 3px ${colors.primary}20`,
        outline: "none",
      };
    }
    return {};
  };

  const selectStyle: React.CSSProperties = {
    width: "100%",
    padding: `${spacing.sm} ${spacing.md}${icon ? ` ${spacing.md} ${spacing.xl}` : ""}`,
    border: `2px solid ${getBorderColor()}`,
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.sans,
    color: themeColors.text.primary,
    backgroundColor: props.disabled ? themeColors.gray[100] : themeColors.white,
    cursor: props.disabled ? "not-allowed" : "pointer",
    transition: `all ${transitions.normal} ease`,
    appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: `right ${spacing.md} center`,
    paddingRight: spacing.xl,
    ...getFocusRing(),
    ...style,
  };

  return (
    <div style={{ marginBottom: spacing.md, position: "relative" }}>
      {label && (
        <label
          style={{
            display: "block",
            marginBottom: spacing.xs,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            color: themeColors.text.primary,
            transition: `color ${transitions.normal} ease`,
          }}
        >
          {label}
          {props.required && <span style={{ color: colors.danger, marginLeft: spacing.xs }}>*</span>}
        </label>
      )}
      <div style={{ position: "relative" }}>
        {icon && (
          <div
            style={{
              position: "absolute",
              left: spacing.md,
              top: "50%",
              transform: "translateY(-50%)",
              color: isFocused ? colors.primary : themeColors.text.secondary,
              transition: `color ${transitions.normal} ease`,
              zIndex: 1,
              pointerEvents: "none",
            }}
          >
            <Icon name={icon as any} size={18} />
          </div>
        )}
        <select 
          style={selectStyle} 
          className={className}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <div
            style={{
              position: "absolute",
              right: spacing.xl,
              top: "50%",
              transform: "translateY(-50%)",
              color: colors.danger,
              zIndex: 1,
              pointerEvents: "none",
            }}
          >
            <Icon name="XCircle" size={18} />
          </div>
        )}
      </div>
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: spacing.xs,
            color: colors.danger,
            fontSize: typography.fontSize.sm,
            marginTop: spacing.xs,
          }}
        >
          <Icon name="AlertCircle" size={14} />
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      )}
      {helperText && !error && (
        <p style={{ color: themeColors.text.secondary, fontSize: typography.fontSize.sm, marginTop: spacing.xs, margin: 0 }}>
          {helperText}
        </p>
      )}
    </div>
  );
}




