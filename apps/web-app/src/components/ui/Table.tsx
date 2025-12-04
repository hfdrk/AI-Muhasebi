"use client";

import { useState } from "react";
import { colors, spacing } from "../../styles/design-system";

interface TableProps {
  headers: string[];
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function Table({ headers, children, style }: TableProps) {
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        backgroundColor: colors.white,
        ...style,
      }}
    >
      <thead>
        <tr style={{ borderBottom: `2px solid ${colors.border}` }}>
          {headers.map((header, index) => (
            <th
              key={index}
              style={{
                padding: spacing.md,
                textAlign: "left",
                fontWeight: 600,
                color: colors.text.primary,
                fontSize: "14px",
              }}
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

interface TableRowProps {
  children: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function TableRow({ children, onClick, style }: TableRowProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <tr
      style={{
        borderBottom: `1px solid ${colors.gray[200]}`,
        cursor: onClick ? "pointer" : "default",
        transition: "background-color 0.2s ease",
        backgroundColor: isHovered && onClick ? colors.gray[50] : "transparent",
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


