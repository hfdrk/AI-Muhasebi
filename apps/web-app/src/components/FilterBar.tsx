"use client";

import { spacing } from "../styles/design-system";
import { Input } from "./ui/Input";
import { Select } from "./ui/Select";

interface FilterBarProps {
  children: React.ReactNode;
}

export function FilterBar({ children }: FilterBarProps) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: spacing.md,
        marginBottom: spacing.lg,
        padding: spacing.md,
        backgroundColor: "#f8f9fa",
        borderRadius: "6px",
      }}
    >
      {children}
    </div>
  );
}

export { Input, Select };



