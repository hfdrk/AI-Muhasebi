"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, MoreHorizontal, Download, RefreshCw } from "lucide-react";
import { colors, spacing, borderRadius, shadows, typography, transitions, zIndex } from "@/styles/design-system";
import { useTheme } from "../../contexts/ThemeContext";

// ==================== Types ====================

interface DashboardSectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  actions?: React.ReactNode;
  onRefresh?: () => void;
  onDownload?: () => void;
  loading?: boolean;
  noPadding?: boolean;
  fullWidth?: boolean;
}

// ==================== Dashboard Section Component ====================

export function DashboardSection({
  title,
  subtitle,
  children,
  collapsible = false,
  defaultCollapsed = false,
  actions,
  onRefresh,
  onDownload,
  loading = false,
  noPadding = false,
  fullWidth = false,
}: DashboardSectionProps) {
  const { themeColors } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [showMenu, setShowMenu] = useState(false);

  const containerStyle: React.CSSProperties = {
    background: themeColors.white,
    borderRadius: borderRadius.xl,
    boxShadow: shadows.sm,
    border: `1px solid ${themeColors.border}`,
    overflow: "hidden",
    width: fullWidth ? "100%" : undefined,
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: `${spacing.md} ${spacing.lg}`,
    borderBottom: isCollapsed ? "none" : `1px solid ${themeColors.border}`,
    cursor: collapsible ? "pointer" : "default",
    userSelect: "none",
    transition: `background ${transitions.fast} ease`,
  };

  const titleContainerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: themeColors.text.primary,
    margin: 0,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: typography.fontSize.sm,
    color: themeColors.text.muted,
    margin: 0,
    marginTop: "2px",
  };

  const actionsContainerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: spacing.sm,
  };

  const iconButtonStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    borderRadius: borderRadius.md,
    border: "none",
    background: "transparent",
    color: themeColors.text.muted,
    cursor: "pointer",
    transition: `all ${transitions.fast} ease`,
  };

  const contentStyle: React.CSSProperties = {
    padding: noPadding ? 0 : spacing.lg,
    display: isCollapsed ? "none" : "block",
  };

  const loadingOverlayStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    background: "rgba(255, 255, 255, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: zIndex.sticky,
  };

  const menuStyle: React.CSSProperties = {
    position: "absolute",
    top: "calc(100% + 4px)",
    right: 0,
    background: themeColors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.lg,
    border: `1px solid ${themeColors.border}`,
    minWidth: "160px",
    zIndex: zIndex.dropdown,
    overflow: "hidden",
  };

  const menuItemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: spacing.sm,
    padding: `${spacing.sm} ${spacing.md}`,
    fontSize: typography.fontSize.sm,
    color: themeColors.text.primary,
    background: "transparent",
    border: "none",
    width: "100%",
    textAlign: "left",
    cursor: "pointer",
    transition: `background ${transitions.fast} ease`,
  };

  return (
    <div style={{ ...containerStyle, position: "relative" }}>
      {/* Header */}
      <div
        style={headerStyle}
        onClick={collapsible ? () => setIsCollapsed(!isCollapsed) : undefined}
        onMouseEnter={(e) => {
          if (collapsible) {
            e.currentTarget.style.background = themeColors.gray[50];
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        <div style={titleContainerStyle}>
          {collapsible && (
            <span style={{ color: themeColors.text.muted }}>
              {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </span>
          )}
          <div>
            <h3 style={titleStyle}>{title}</h3>
            {subtitle && <p style={subtitleStyle}>{subtitle}</p>}
          </div>
        </div>

        <div style={actionsContainerStyle} onClick={(e) => e.stopPropagation()}>
          {actions}

          {(onRefresh || onDownload) && (
            <div style={{ position: "relative" }}>
              <button
                style={iconButtonStyle}
                onClick={() => setShowMenu(!showMenu)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = themeColors.gray[100];
                  e.currentTarget.style.color = themeColors.text.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = themeColors.text.muted;
                }}
              >
                <MoreHorizontal size={18} />
              </button>

              {showMenu && (
                <>
                  <div
                    style={{ position: "fixed", inset: 0, zIndex: zIndex.dropdown - 1 }}
                    onClick={() => setShowMenu(false)}
                  />
                  <div style={menuStyle}>
                    {onRefresh && (
                      <button
                        style={menuItemStyle}
                        onClick={() => {
                          onRefresh();
                          setShowMenu(false);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = themeColors.gray[50];
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <RefreshCw size={16} />
                        <span>Yenile</span>
                      </button>
                    )}
                    {onDownload && (
                      <button
                        style={menuItemStyle}
                        onClick={() => {
                          onDownload();
                          setShowMenu(false);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = themeColors.gray[50];
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <Download size={16} />
                        <span>Indir</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={contentStyle}>
        {children}

        {/* Loading Overlay */}
        {loading && (
          <div style={loadingOverlayStyle}>
            <div
              style={{
                width: "32px",
                height: "32px",
                border: `3px solid ${themeColors.gray[200]}`,
                borderTopColor: colors.primary,
                borderRadius: borderRadius.full,
                animation: "spin 1s linear infinite",
              }}
            />
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ==================== Dashboard Grid ====================

interface DashboardGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3;
  gap?: "sm" | "md" | "lg";
}

export function DashboardGrid({ children, columns = 2, gap = "lg" }: DashboardGridProps) {
  const gapMap = {
    sm: spacing.sm,
    md: spacing.md,
    lg: spacing.lg,
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: gapMap[gap],
      }}
    >
      {children}
      <style>{`
        @media (max-width: 1024px) {
          div[style*="grid-template-columns: repeat(${columns}"] {
            grid-template-columns: ${columns > 1 ? "repeat(2, 1fr)" : "1fr"} !important;
          }
        }
        @media (max-width: 640px) {
          div[style*="grid-template-columns: repeat(${columns}"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
