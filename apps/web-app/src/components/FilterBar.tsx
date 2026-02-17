"use client";

import { spacing } from "../styles/design-system";
import { useTheme } from "../contexts/ThemeContext";
import { Input } from "./ui/Input";
import { Select } from "./ui/Select";

interface FilterBarProps {
  children: React.ReactNode;
}

export function FilterBar({ children }: FilterBarProps) {
  const { themeColors } = useTheme();
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: spacing.md,
        marginBottom: spacing.lg,
        padding: spacing.md,
        backgroundColor: themeColors.gray[100],
        borderRadius: "6px",
      }}
    >
      {children}
    </div>
  );
}

export { Input, Select };








