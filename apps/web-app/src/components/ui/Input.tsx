"use client";

import React, { useState, useRef } from "react";
import { colors, spacing, borderRadius, typography, transitions } from "../../styles/design-system";
import { useTheme } from "../../contexts/ThemeContext";
import { Icon } from "./Icon";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: string;
  showSuccess?: boolean;
}

export function Input({ 
  label, 
  error, 
  helperText, 
  icon,
  showSuccess,
  style, 
  className = "", 
  onFocus,
  onBlur,
  ...props 
}: InputProps) {
  const { themeColors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(!!props.value || !!props.defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    setHasValue(!!e.target.value);
    onBlur?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHasValue(!!e.target.value);
    props.onChange?.(e);
  };

  const getBorderColor = () => {
    if (error) return colors.danger;
    if (showSuccess && hasValue && !error) return colors.success;
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

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: `${spacing.sm} ${spacing.md}${icon ? ` ${spacing.md} ${spacing.xl}` : ""}`,
    border: `2px solid ${getBorderColor()}`,
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.sans,
    color: themeColors.text.primary,
    backgroundColor: props.disabled ? themeColors.gray[100] : themeColors.white,
    transition: `all ${transitions.normal} ease`,
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
        <input
          ref={inputRef}
          style={inputStyle}
          className={className}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          {...props}
        />
        {showSuccess && hasValue && !error && (
          <div
            style={{
              position: "absolute",
              right: spacing.md,
              top: "50%",
              transform: "translateY(-50%)",
              color: colors.success,
              zIndex: 1,
              pointerEvents: "none",
            }}
          >
            <Icon name="CheckCircle" size={18} />
          </div>
        )}
        {error && (
          <div
            style={{
              position: "absolute",
              right: spacing.md,
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
            animation: "shake 0.3s ease",
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
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}




