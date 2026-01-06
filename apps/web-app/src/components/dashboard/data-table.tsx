"use client";

import React, { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { colors, spacing, borderRadius, typography, transitions } from "@/styles/design-system";

// ==================== Types ====================

export interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  pageSize?: number;
  showPagination?: boolean;
  sortable?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T, index: number) => void;
  loading?: boolean;
  stickyHeader?: boolean;
  maxHeight?: string;
}

type SortDirection = "asc" | "desc" | null;

// ==================== Data Table Component ====================

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  pageSize = 10,
  showPagination = true,
  sortable = true,
  striped = true,
  hoverable = true,
  compact = false,
  emptyMessage = "Veri bulunamadi",
  onRowClick,
  loading = false,
  stickyHeader = false,
  maxHeight,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const comparison = aValue < bValue ? -1 : 1;
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [data, sortColumn, sortDirection]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!showPagination) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize, showPagination]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const getValue = (row: T, key: string): unknown => {
    const keys = key.split(".");
    let value: unknown = row;
    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return undefined;
      }
    }
    return value;
  };

  const cellPadding = compact ? `${spacing.xs} ${spacing.sm}` : `${spacing.sm} ${spacing.md}`;

  const containerStyle: React.CSSProperties = {
    width: "100%",
    overflow: "auto",
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.border}`,
    maxHeight: maxHeight,
  };

  const tableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: compact ? typography.fontSize.xs : typography.fontSize.sm,
  };

  const theadStyle: React.CSSProperties = {
    backgroundColor: colors.gray[50],
    position: stickyHeader ? "sticky" : undefined,
    top: 0,
    zIndex: 1,
  };

  const thStyle = (column: Column<T>): React.CSSProperties => ({
    padding: cellPadding,
    textAlign: column.align || "left",
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    borderBottom: `2px solid ${colors.border}`,
    whiteSpace: "nowrap",
    cursor: sortable && column.sortable !== false ? "pointer" : "default",
    userSelect: "none",
    width: column.width,
  });

  const tdStyle = (column: Column<T>): React.CSSProperties => ({
    padding: cellPadding,
    textAlign: column.align || "left",
    borderBottom: `1px solid ${colors.gray[100]}`,
    color: colors.text.primary,
    width: column.width,
  });

  const trStyle = (index: number): React.CSSProperties => ({
    backgroundColor: striped && index % 2 === 1 ? colors.gray[50] : colors.white,
    cursor: onRowClick ? "pointer" : "default",
    transition: `background ${transitions.fast} ease`,
  });

  const paginationStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: `${spacing.sm} ${spacing.md}`,
    borderTop: `1px solid ${colors.border}`,
    backgroundColor: colors.gray[50],
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
  };

  const pageButtonStyle = (disabled: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.border}`,
    background: disabled ? colors.gray[100] : colors.white,
    color: disabled ? colors.gray[400] : colors.text.primary,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: `all ${transitions.fast} ease`,
  });

  if (loading) {
    return (
      <div style={containerStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: spacing.xxl,
            color: colors.text.muted,
          }}
        >
          <div
            style={{
              width: "24px",
              height: "24px",
              border: `3px solid ${colors.gray[200]}`,
              borderTopColor: colors.primary,
              borderRadius: borderRadius.full,
              animation: "spin 1s linear infinite",
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div style={containerStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: spacing.xxl,
            color: colors.text.muted,
            fontSize: typography.fontSize.sm,
          }}
        >
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <table style={tableStyle}>
        <thead style={theadStyle}>
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                style={thStyle(column)}
                onClick={() => sortable && column.sortable !== false && handleSort(String(column.key))}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: spacing.xs,
                    justifyContent: column.align === "right" ? "flex-end" : column.align === "center" ? "center" : "flex-start",
                  }}
                >
                  <span>{column.header}</span>
                  {sortable && column.sortable !== false && (
                    <span style={{ display: "flex", flexDirection: "column", opacity: sortColumn === column.key ? 1 : 0.3 }}>
                      <ChevronUp
                        size={10}
                        style={{
                          marginBottom: "-4px",
                          color: sortColumn === column.key && sortDirection === "asc" ? colors.primary : colors.gray[400],
                        }}
                      />
                      <ChevronDown
                        size={10}
                        style={{
                          marginTop: "-4px",
                          color: sortColumn === column.key && sortDirection === "desc" ? colors.primary : colors.gray[400],
                        }}
                      />
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              style={trStyle(rowIndex)}
              onClick={() => onRowClick?.(row, rowIndex)}
              onMouseEnter={(e) => {
                if (hoverable) {
                  e.currentTarget.style.backgroundColor = colors.primaryLighter;
                }
              }}
              onMouseLeave={(e) => {
                if (hoverable) {
                  e.currentTarget.style.backgroundColor =
                    striped && rowIndex % 2 === 1 ? colors.gray[50] : colors.white;
                }
              }}
            >
              {columns.map((column) => {
                const value = getValue(row, String(column.key));
                return (
                  <td key={String(column.key)} style={tdStyle(column)}>
                    {column.render ? column.render(value, row, rowIndex) : String(value ?? "-")}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {showPagination && totalPages > 1 && (
        <div style={paginationStyle}>
          <span>
            {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, sortedData.length)} / {sortedData.length} kayit
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: spacing.xs }}>
            <button
              style={pageButtonStyle(currentPage === 1)}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ padding: `0 ${spacing.sm}` }}>
              Sayfa {currentPage} / {totalPages}
            </span>
            <button
              style={pageButtonStyle(currentPage === totalPages)}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
