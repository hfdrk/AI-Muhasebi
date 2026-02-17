"use client";

import React from "react";
import { useState } from "react";
import { colors, spacing, transitions, shadows } from "../../styles/design-system";
import { useTheme } from "../../contexts/ThemeContext";

interface TableProps {
  headers: string[];
  children: React.ReactNode;
  style?: React.CSSProperties;
  stickyHeader?: boolean;
}

export function Table({ headers, children, style, stickyHeader = false }: TableProps) {
  const { themeColors } = useTheme();

  return (
    <div
      style={{
        overflowX: "auto",
        borderRadius: "8px",
        border: `1px solid ${themeColors.border}`,
        boxShadow: shadows.sm,
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          backgroundColor: themeColors.white,
          ...style,
        }}
      >
        <thead
          style={{
            backgroundColor: themeColors.gray[50],
            position: stickyHeader ? "sticky" : "relative",
            top: stickyHeader ? 0 : "auto",
            zIndex: 10,
            boxShadow: stickyHeader ? shadows.sm : "none",
          }}
        >
          <tr style={{ borderBottom: `2px solid ${themeColors.border}` }}>
            {headers.map((header, index) => (
              <th
                key={index}
                style={{
                  padding: spacing.md,
                  textAlign: "left",
                  fontWeight: 600,
                  color: themeColors.text.primary,
                  fontSize: "14px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  whiteSpace: "nowrap",
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

interface TableRowProps {
  children: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function TableRow({ children, onClick, style }: TableRowProps) {
  const { themeColors } = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <tr
      style={{
        borderBottom: `1px solid ${themeColors.gray[200]}`,
        cursor: onClick ? "pointer" : "default",
        transition: `all ${transitions.normal} ease`,
        backgroundColor: isHovered && onClick ? colors.primaryLighter : "transparent",
        transform: isHovered && onClick ? "scale(1.001)" : "scale(1)",
        boxShadow: isHovered && onClick ? shadows.sm : "none",
        ...style,
      }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </tr>
  );
}

interface TableCellProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function TableCell({ children, style }: TableCellProps) {
  return (
    <td
      style={{
        padding: spacing.md,
        ...style,
      }}
    >
      {children}
    </td>
  );
}


