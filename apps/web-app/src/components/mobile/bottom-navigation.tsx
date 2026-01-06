"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  FileText,
  Receipt,
  CreditCard,
  MoreHorizontal,
  Settings,
  Bell,
  User,
  BarChart3,
  FileSearch,
  Building2,
  X,
  ChevronRight,
} from "lucide-react";
import { colors, spacing, borderRadius, typography, transitions, zIndex } from "@/styles/design-system";
import { useDevice, useSafeAreaInsets, useScrollLock } from "@/hooks/use-responsive";

// ==================== Types ====================

interface NavItem {
  id: string;
  label: string;
  labelTr: string;
  icon: React.ReactNode;
  href: string;
  badge?: number;
}

interface MoreMenuItem {
  id: string;
  label: string;
  labelTr: string;
  icon: React.ReactNode;
  href: string;
  badge?: number;
  description?: string;
}

interface BottomNavigationProps {
  notificationCount?: number;
  messageCount?: number;
}

// ==================== Navigation Items ====================

const primaryNavItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Home",
    labelTr: "Ana Sayfa",
    icon: <Home size={22} />,
    href: "/anasayfa",
  },
  {
    id: "invoices",
    label: "Invoices",
    labelTr: "Faturalar",
    icon: <Receipt size={22} />,
    href: "/faturalar",
  },
  {
    id: "transactions",
    label: "Transactions",
    labelTr: "İşlemler",
    icon: <CreditCard size={22} />,
    href: "/islemler",
  },
  {
    id: "documents",
    label: "Documents",
    labelTr: "Belgeler",
    icon: <FileText size={22} />,
    href: "/belgeler",
  },
];

const moreMenuItems: MoreMenuItem[] = [
  {
    id: "reports",
    label: "Reports",
    labelTr: "Raporlar",
    icon: <BarChart3 size={20} />,
    href: "/raporlar",
    description: "Finansal raporlar ve analizler",
  },
  {
    id: "clients",
    label: "Clients",
    labelTr: "Müşteriler",
    icon: <Building2 size={20} />,
    href: "/musteriler",
    description: "Müşteri ve cari hesap yönetimi",
  },
  {
    id: "search",
    label: "Search",
    labelTr: "Arama",
    icon: <FileSearch size={20} />,
    href: "/arama",
    description: "Belge ve işlem arama",
  },
  {
    id: "notifications",
    label: "Notifications",
    labelTr: "Bildirimler",
    icon: <Bell size={20} />,
    href: "/bildirimler",
    description: "Tüm bildirimleriniz",
  },
  {
    id: "settings",
    label: "Settings",
    labelTr: "Ayarlar",
    icon: <Settings size={20} />,
    href: "/ayarlar",
    description: "Uygulama ayarları",
  },
  {
    id: "profile",
    label: "Profile",
    labelTr: "Profil",
    icon: <User size={20} />,
    href: "/ayarlar/profil",
    description: "Kullanıcı profili",
  },
];

// ==================== Bottom Navigation Component ====================

export function BottomNavigation({ notificationCount = 0, messageCount = 0 }: BottomNavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile } = useDevice();
  const safeArea = useSafeAreaInsets();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  useScrollLock(isMoreMenuOpen);

  // Close more menu on route change
  useEffect(() => {
    setIsMoreMenuOpen(false);
  }, [pathname]);

  // Don't render on desktop
  if (!isMobile) {
    return null;
  }

  const isActive = (href: string): boolean => {
    if (href === "/anasayfa") {
      return pathname === "/" || pathname === "/anasayfa";
    }
    return pathname.startsWith(href);
  };

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  const containerStyle: React.CSSProperties = {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTop: `1px solid ${colors.border}`,
    boxShadow: "0 -4px 16px rgba(0, 0, 0, 0.08)",
    zIndex: zIndex.fixed,
    paddingBottom: safeArea.bottom > 0 ? `${safeArea.bottom}px` : spacing.xs,
  };

  const navStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    height: "60px",
    maxWidth: "500px",
    margin: "0 auto",
    padding: `0 ${spacing.xs}`,
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav style={containerStyle} role="navigation" aria-label="Alt gezinme menüsü">
        <div style={navStyle}>
          {primaryNavItems.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              isActive={isActive(item.href)}
              onClick={() => handleNavigation(item.href)}
              badge={item.id === "invoices" ? messageCount : undefined}
            />
          ))}
          <MoreButton
            isActive={isMoreMenuOpen}
            onClick={() => setIsMoreMenuOpen(true)}
            badge={notificationCount > 0 ? notificationCount : undefined}
          />
        </div>
      </nav>

      {/* More Menu Bottom Sheet */}
      <MoreMenuSheet
        isOpen={isMoreMenuOpen}
        onClose={() => setIsMoreMenuOpen(false)}
        items={moreMenuItems}
        onNavigate={handleNavigation}
        notificationCount={notificationCount}
        safeAreaBottom={safeArea.bottom}
      />

      {/* Spacer to prevent content from being hidden behind nav */}
      <div style={{ height: `${60 + safeArea.bottom}px` }} />
    </>
  );
}

// ==================== Nav Button Component ====================

interface NavButtonProps {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
}

function NavButton({ item, isActive, onClick, badge }: NavButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const buttonStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "2px",
    padding: spacing.xs,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    borderRadius: borderRadius.md,
    transition: `all ${transitions.fast} ease`,
    color: isActive ? colors.primary : colors.gray[500],
    transform: isPressed ? "scale(0.92)" : "scale(1)",
    minWidth: "56px",
    minHeight: "48px",
    position: "relative",
    WebkitTapHighlightColor: "transparent",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "10px",
    fontWeight: isActive ? typography.fontWeight.semibold : typography.fontWeight.medium,
    lineHeight: 1,
    marginTop: "2px",
  };

  const badgeStyle: React.CSSProperties = {
    position: "absolute",
    top: "4px",
    right: "8px",
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
  };

  return (
    <button
      style={buttonStyle}
      onClick={onClick}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      aria-label={item.labelTr}
      aria-current={isActive ? "page" : undefined}
    >
      {item.icon}
      <span style={labelStyle}>{item.labelTr}</span>
      {badge !== undefined && badge > 0 && (
        <span style={badgeStyle}>{badge > 99 ? "99+" : badge}</span>
      )}
    </button>
  );
}

// ==================== More Button Component ====================

interface MoreButtonProps {
  isActive: boolean;
  onClick: () => void;
  badge?: number;
}

function MoreButton({ isActive, onClick, badge }: MoreButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const buttonStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "2px",
    padding: spacing.xs,
    background: isActive ? colors.primaryLighter : "transparent",
    border: "none",
    cursor: "pointer",
    borderRadius: borderRadius.md,
    transition: `all ${transitions.fast} ease`,
    color: isActive ? colors.primary : colors.gray[500],
    transform: isPressed ? "scale(0.92)" : "scale(1)",
    minWidth: "56px",
    minHeight: "48px",
    position: "relative",
    WebkitTapHighlightColor: "transparent",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "10px",
    fontWeight: isActive ? typography.fontWeight.semibold : typography.fontWeight.medium,
    lineHeight: 1,
    marginTop: "2px",
  };

  const badgeStyle: React.CSSProperties = {
    position: "absolute",
    top: "4px",
    right: "8px",
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
  };

  return (
    <button
      style={buttonStyle}
      onClick={onClick}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      aria-label="Daha fazla"
      aria-expanded={isActive}
      aria-haspopup="dialog"
    >
      <MoreHorizontal size={22} />
      <span style={labelStyle}>Daha</span>
      {badge !== undefined && badge > 0 && (
        <span style={badgeStyle}>{badge > 99 ? "99+" : badge}</span>
      )}
    </button>
  );
}

// ==================== More Menu Bottom Sheet ====================

interface MoreMenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
  items: MoreMenuItem[];
  onNavigate: (href: string) => void;
  notificationCount: number;
  safeAreaBottom: number;
}

function MoreMenuSheet({
  isOpen,
  onClose,
  items,
  onNavigate,
  notificationCount,
  safeAreaBottom,
}: MoreMenuSheetProps) {
  const backdropStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: zIndex.modalBackdrop,
    opacity: isOpen ? 1 : 0,
    visibility: isOpen ? "visible" : "hidden",
    transition: `opacity ${transitions.normal} ease, visibility ${transitions.normal} ease`,
  };

  const sheetStyle: React.CSSProperties = {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    zIndex: zIndex.modal,
    transform: isOpen ? "translateY(0)" : "translateY(100%)",
    transition: `transform ${transitions.slow} cubic-bezier(0.32, 0.72, 0, 1)`,
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    paddingBottom: safeAreaBottom > 0 ? `${safeAreaBottom}px` : spacing.md,
  };

  const handleStyle: React.CSSProperties = {
    width: "36px",
    height: "4px",
    backgroundColor: colors.gray[300],
    borderRadius: borderRadius.full,
    margin: `${spacing.sm} auto`,
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: `0 ${spacing.md} ${spacing.md}`,
    borderBottom: `1px solid ${colors.border}`,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  };

  const closeButtonStyle: React.CSSProperties = {
    background: colors.gray[100],
    border: "none",
    borderRadius: borderRadius.full,
    width: "36px",
    height: "36px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: colors.gray[600],
  };

  const listStyle: React.CSSProperties = {
    padding: spacing.md,
    overflowY: "auto",
    flex: 1,
  };

  return (
    <>
      {/* Backdrop */}
      <div style={backdropStyle} onClick={onClose} aria-hidden="true" />

      {/* Sheet */}
      <div
        style={sheetStyle}
        role="dialog"
        aria-modal="true"
        aria-label="Daha fazla menü"
      >
        {/* Handle */}
        <div style={handleStyle} />

        {/* Header */}
        <div style={headerStyle}>
          <h2 style={titleStyle}>Daha Fazla</h2>
          <button style={closeButtonStyle} onClick={onClose} aria-label="Kapat">
            <X size={20} />
          </button>
        </div>

        {/* Menu Items */}
        <div style={listStyle}>
          {items.map((item) => (
            <MoreMenuItemButton
              key={item.id}
              item={item}
              onClick={() => {
                onNavigate(item.href);
                onClose();
              }}
              badge={item.id === "notifications" ? notificationCount : undefined}
            />
          ))}
        </div>
      </div>
    </>
  );
}

// ==================== More Menu Item Component ====================

interface MoreMenuItemButtonProps {
  item: MoreMenuItem;
  onClick: () => void;
  badge?: number;
}

function MoreMenuItemButton({ item, onClick, badge }: MoreMenuItemButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const itemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    background: isPressed ? colors.gray[50] : "transparent",
    border: "none",
    borderRadius: borderRadius.lg,
    cursor: "pointer",
    width: "100%",
    textAlign: "left",
    transition: `background ${transitions.fast} ease`,
    marginBottom: spacing.xs,
    WebkitTapHighlightColor: "transparent",
  };

  const iconContainerStyle: React.CSSProperties = {
    width: "44px",
    height: "44px",
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryLighter,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: colors.primary,
    position: "relative",
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginBottom: "2px",
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
  };

  const arrowStyle: React.CSSProperties = {
    color: colors.gray[400],
  };

  const badgeStyle: React.CSSProperties = {
    position: "absolute",
    top: "-4px",
    right: "-4px",
    backgroundColor: colors.danger,
    color: colors.white,
    fontSize: "10px",
    fontWeight: typography.fontWeight.bold,
    minWidth: "18px",
    height: "18px",
    borderRadius: borderRadius.full,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 5px",
    border: `2px solid ${colors.white}`,
  };

  return (
    <button
      style={itemStyle}
      onClick={onClick}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
    >
      <div style={iconContainerStyle}>
        {item.icon}
        {badge !== undefined && badge > 0 && (
          <span style={badgeStyle}>{badge > 99 ? "99+" : badge}</span>
        )}
      </div>
      <div style={contentStyle}>
        <div style={labelStyle}>{item.labelTr}</div>
        {item.description && <div style={descriptionStyle}>{item.description}</div>}
      </div>
      <ChevronRight size={20} style={arrowStyle} />
    </button>
  );
}

export default BottomNavigation;
