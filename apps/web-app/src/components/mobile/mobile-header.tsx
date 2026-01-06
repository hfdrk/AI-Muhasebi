"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Menu,
  X,
  Bell,
  Search,
  ChevronLeft,
  MoreVertical,
} from "lucide-react";
import { colors, spacing, borderRadius, shadows, typography, transitions, zIndex } from "@/styles/design-system";
import { useSafeAreaInsets } from "@/hooks/use-responsive";

// ==================== Types ====================

interface MobileHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  showMenu?: boolean;
  showSearch?: boolean;
  showNotifications?: boolean;
  showMoreMenu?: boolean;
  notificationCount?: number;
  onMenuClick?: () => void;
  onBackClick?: () => void;
  onSearchClick?: () => void;
  onNotificationClick?: () => void;
  onMoreClick?: () => void;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  centerContent?: React.ReactNode;
  transparent?: boolean;
  fixed?: boolean;
}

// ==================== Mobile Header Component ====================

export function MobileHeader({
  title,
  subtitle,
  showBack = false,
  showMenu = true,
  showSearch = false,
  showNotifications = false,
  showMoreMenu = false,
  notificationCount = 0,
  onMenuClick,
  onBackClick,
  onSearchClick,
  onNotificationClick,
  onMoreClick,
  leftContent,
  rightContent,
  centerContent,
  transparent = false,
  fixed = true,
}: MobileHeaderProps) {
  const router = useRouter();
  const safeArea = useSafeAreaInsets();

  const handleBack = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      router.back();
    }
  };

  const headerHeight = 56;
  const totalHeight = headerHeight + safeArea.top;

  const containerStyle: React.CSSProperties = {
    position: fixed ? "fixed" : "relative",
    top: 0,
    left: 0,
    right: 0,
    zIndex: zIndex.sticky,
    backgroundColor: transparent ? "transparent" : colors.white,
    borderBottom: transparent ? "none" : `1px solid ${colors.border}`,
    boxShadow: transparent ? "none" : shadows.sm,
    paddingTop: safeArea.top > 0 ? `${safeArea.top}px` : undefined,
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: `${headerHeight}px`,
    padding: `0 ${spacing.sm}`,
    gap: spacing.xs,
  };

  const leftSectionStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: spacing.xs,
    minWidth: "60px",
  };

  const centerSectionStyle: React.CSSProperties = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    padding: `0 ${spacing.xs}`,
  };

  const rightSectionStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: spacing.xs,
    minWidth: "60px",
    justifyContent: "flex-end",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: transparent ? colors.white : colors.text.primary,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "100%",
    lineHeight: 1.2,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: typography.fontSize.xs,
    color: transparent ? "rgba(255,255,255,0.8)" : colors.text.muted,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "100%",
    lineHeight: 1.2,
  };

  return (
    <>
      <header style={containerStyle}>
        <div style={headerStyle}>
          {/* Left Section */}
          <div style={leftSectionStyle}>
            {leftContent ? (
              leftContent
            ) : (
              <>
                {showBack && (
                  <IconButton
                    icon={<ChevronLeft size={24} />}
                    onClick={handleBack}
                    label="Geri"
                    transparent={transparent}
                  />
                )}
                {showMenu && !showBack && (
                  <IconButton
                    icon={<Menu size={24} />}
                    onClick={onMenuClick}
                    label="Menü"
                    transparent={transparent}
                  />
                )}
              </>
            )}
          </div>

          {/* Center Section */}
          <div style={centerSectionStyle}>
            {centerContent ? (
              centerContent
            ) : (
              <>
                {title && <h1 style={titleStyle}>{title}</h1>}
                {subtitle && <span style={subtitleStyle}>{subtitle}</span>}
              </>
            )}
          </div>

          {/* Right Section */}
          <div style={rightSectionStyle}>
            {rightContent ? (
              rightContent
            ) : (
              <>
                {showSearch && (
                  <IconButton
                    icon={<Search size={22} />}
                    onClick={onSearchClick}
                    label="Ara"
                    transparent={transparent}
                  />
                )}
                {showNotifications && (
                  <IconButton
                    icon={<Bell size={22} />}
                    onClick={onNotificationClick}
                    label="Bildirimler"
                    badge={notificationCount}
                    transparent={transparent}
                  />
                )}
                {showMoreMenu && (
                  <IconButton
                    icon={<MoreVertical size={22} />}
                    onClick={onMoreClick}
                    label="Daha fazla"
                    transparent={transparent}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Spacer when fixed */}
      {fixed && <div style={{ height: `${totalHeight}px` }} />}
    </>
  );
}

// ==================== Icon Button Component ====================

interface IconButtonProps {
  icon: React.ReactNode;
  onClick?: () => void;
  label: string;
  badge?: number;
  transparent?: boolean;
  disabled?: boolean;
}

export function IconButton({
  icon,
  onClick,
  label,
  badge,
  transparent = false,
  disabled = false,
}: IconButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const buttonStyle: React.CSSProperties = {
    width: "40px",
    height: "40px",
    borderRadius: borderRadius.full,
    backgroundColor: isPressed
      ? transparent
        ? "rgba(255,255,255,0.2)"
        : colors.gray[100]
      : "transparent",
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: disabled
      ? colors.gray[400]
      : transparent
      ? colors.white
      : colors.gray[700],
    position: "relative",
    transition: `all ${transitions.fast} ease`,
    opacity: disabled ? 0.5 : 1,
    WebkitTapHighlightColor: "transparent",
  };

  const badgeStyle: React.CSSProperties = {
    position: "absolute",
    top: "4px",
    right: "4px",
    backgroundColor: colors.danger,
    color: colors.white,
    fontSize: "9px",
    fontWeight: typography.fontWeight.bold,
    minWidth: "16px",
    height: "16px",
    borderRadius: borderRadius.full,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 4px",
    border: `2px solid ${transparent ? "transparent" : colors.white}`,
  };

  return (
    <button
      style={buttonStyle}
      onClick={onClick}
      onTouchStart={() => !disabled && setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onMouseDown={() => !disabled && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      disabled={disabled}
      aria-label={label}
    >
      {icon}
      {badge !== undefined && badge > 0 && (
        <span style={badgeStyle}>{badge > 99 ? "99+" : badge}</span>
      )}
    </button>
  );
}

// ==================== Search Header Variant ====================

interface SearchHeaderProps {
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SearchHeader({
  value,
  onChange,
  onCancel,
  placeholder = "Ara...",
  autoFocus = true,
}: SearchHeaderProps) {
  const safeArea = useSafeAreaInsets();

  const containerStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: zIndex.sticky,
    backgroundColor: colors.white,
    borderBottom: `1px solid ${colors.border}`,
    paddingTop: safeArea.top > 0 ? `${safeArea.top}px` : undefined,
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    height: "56px",
    padding: `0 ${spacing.md}`,
    gap: spacing.sm,
  };

  const inputContainerStyle: React.CSSProperties = {
    flex: 1,
    position: "relative",
    display: "flex",
    alignItems: "center",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: "40px",
    padding: `0 ${spacing.md} 0 40px`,
    backgroundColor: colors.gray[100],
    border: "none",
    borderRadius: borderRadius.full,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    outline: "none",
  };

  const searchIconStyle: React.CSSProperties = {
    position: "absolute",
    left: spacing.sm,
    color: colors.gray[400],
    pointerEvents: "none",
  };

  const cancelButtonStyle: React.CSSProperties = {
    background: "transparent",
    border: "none",
    color: colors.primary,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    cursor: "pointer",
    padding: spacing.xs,
    WebkitTapHighlightColor: "transparent",
  };

  return (
    <>
      <header style={containerStyle}>
        <div style={headerStyle}>
          <div style={inputContainerStyle}>
            <Search size={20} style={searchIconStyle} />
            <input
              type="text"
              style={inputStyle}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              autoFocus={autoFocus}
            />
            {value && (
              <button
                style={{
                  position: "absolute",
                  right: spacing.sm,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  color: colors.gray[400],
                }}
                onClick={() => onChange("")}
                aria-label="Temizle"
              >
                <X size={18} />
              </button>
            )}
          </div>
          <button style={cancelButtonStyle} onClick={onCancel}>
            İptal
          </button>
        </div>
      </header>
      <div style={{ height: `${56 + safeArea.top}px` }} />
    </>
  );
}

export default MobileHeader;
