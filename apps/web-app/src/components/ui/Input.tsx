"use client";

import { colors, spacing, borderRadius, typography } from "../../styles/design-system";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({ label, error, helperText, style, className = "", ...props }: InputProps) {
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: `${spacing.sm} ${spacing.md}`,
    border: `1px solid ${error ? colors.danger : colors.border}`,
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.sans,
    color: colors.text.primary,
    backgroundColor: props.disabled ? colors.gray[100] : colors.white,
    transition: "border-color 0.2s ease",
    ...style,
  };

  return (
    <div style={{ marginBottom: spacing.md }}>
      {label && (
        <label
          style={{
            display: "block",
            marginBottom: spacing.xs,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            color: colors.text.primary,
          }}
        >
          {label}
          {props.required && <span style={{ color: colors.danger, marginLeft: spacing.xs }}>*</span>}
        </label>
      )}
      <input style={inputStyle} className={className} {...props} />
      {error && (
        <p style={{ color: colors.danger, fontSize: typography.fontSize.sm, marginTop: spacing.xs, margin: 0 }}>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, marginTop: spacing.xs, margin: 0 }}>
          {helperText}
        </p>
      )}
    </div>
  );
}



