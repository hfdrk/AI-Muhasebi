"use client";

import { colors, spacing, borderRadius, typography } from "../../styles/design-system";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: Array<{ value: string; label: string }>;
}

export function Select({ label, error, helperText, options, style, className = "", ...props }: SelectProps) {
  const selectStyle: React.CSSProperties = {
    width: "100%",
    padding: `${spacing.sm} ${spacing.md}`,
    border: `1px solid ${error ? colors.danger : colors.border}`,
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.sans,
    color: colors.text.primary,
    backgroundColor: props.disabled ? colors.gray[100] : colors.white,
    cursor: props.disabled ? "not-allowed" : "pointer",
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
      <select style={selectStyle} className={className} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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



