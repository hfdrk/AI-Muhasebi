"use client";

import { useEffect, useState } from "react";
import { TenantSwitcher } from "../../components/tenant-switcher";
import { NotificationBell } from "../../components/notification-bell";
import { GlobalSearch } from "../../components/global-search";
import { MessageCountBadge } from "../../components/message-count-badge";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout, getCurrentUser } from "@repo/api-client";
import { useQuery } from "@tanstack/react-query";
import { colors, spacing, shadows, borderRadius, transitions, zIndex, typography } from "../../styles/design-system";
import { Icon } from "../../components/ui/Icon";
import { BottomNavigation } from "../../components/mobile/bottom-navigation";

interface NavItem {
  href: string;
  label: string;
  icon: string; // Can be emoji (legacy) or icon name
  badge?: number;
  children?: NavItem[];
}

// User Profile Dropdown Component
function UserProfileDropdown({ 
  currentUser, 
  onLogout, 
  sidebarCollapsed 
}: { 
  currentUser: any; 
  onLogout: () => void;
  sidebarCollapsed: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-user-profile-dropdown]')) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div style={{ position: "relative" }} data-user-profile-dropdown>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: spacing.sm,
          padding: `${spacing.xs} ${spacing.md} ${spacing.xs} ${spacing.xs}`,
          borderRadius: borderRadius.lg,
          cursor: "pointer",
          transition: `all ${transitions.normal} ease`,
          position: "relative",
          border: `1px solid ${isOpen ? colors.primary : colors.border}`,
          backgroundColor: isOpen ? colors.primaryLighter : colors.gray[50],
          boxShadow: isOpen ? shadows.md : shadows.sm,
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.backgroundColor = colors.gray[100];
            e.currentTarget.style.borderColor = colors.primary;
            e.currentTarget.style.boxShadow = shadows.md;
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.backgroundColor = colors.gray[50];
            e.currentTarget.style.borderColor = colors.border;
            e.currentTarget.style.boxShadow = shadows.sm;
          }
        }}
      >
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: borderRadius.full,
            background: colors.gradients.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: colors.white,
            fontWeight: typography.fontWeight.bold,
            fontSize: typography.fontSize.base,
            boxShadow: shadows.sm,
            border: `2px solid ${colors.white}`,
          }}
        >
          {currentUser.user?.fullName?.charAt(0)?.toUpperCase() || "U"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 0 }}>
          <div
            style={{
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "180px",
            }}
          >
            {currentUser.user?.fullName || "Kullanıcı"}
          </div>
          <div
            style={{
              fontSize: typography.fontSize.xs,
              color: colors.text.secondary,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "180px",
            }}
          >
            {currentUser.user?.email}
          </div>
        </div>
        <span
          style={{
            fontSize: "12px",
            color: colors.text.secondary,
            marginLeft: spacing.xs,
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: `transform ${transitions.normal} ease`,
          }}
        >
          ▼
        </span>
      </div>

      {isOpen && (
        <>
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: zIndex.dropdown - 1,
            }}
            onClick={() => setIsOpen(false)}
          />
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              backgroundColor: colors.white,
              border: `1px solid ${colors.border}`,
              borderRadius: borderRadius.lg,
              boxShadow: shadows.xl,
              zIndex: zIndex.dropdown,
              minWidth: "240px",
              overflow: "hidden",
            }}
          >
            {/* User Info Header */}
            <div
              style={{
                padding: spacing.md,
                borderBottom: `1px solid ${colors.border}`,
                background: colors.gradients.pastelPrimary,
              }}
            >
              <div
                style={{
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.text.primary,
                  marginBottom: spacing.xs / 2,
                }}
              >
                {currentUser.user?.fullName || "Kullanıcı"}
              </div>
              <div
                style={{
                  fontSize: typography.fontSize.xs,
                  color: colors.text.secondary,
                }}
              >
                {currentUser.user?.email}
              </div>
            </div>

            {/* Menu Items */}
            <div style={{ padding: spacing.xs }}>
              <button
                onClick={() => {
                  router.push("/ayarlar/profil");
                  setIsOpen(false);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: spacing.sm,
                  padding: `${spacing.sm} ${spacing.md}`,
                  backgroundColor: "transparent",
                  border: "none",
                  borderRadius: borderRadius.md,
                  color: colors.text.primary,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  cursor: "pointer",
                  transition: `all ${transitions.normal} ease`,
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.gray[50];
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <Icon name="user" size={16} color={colors.text.primary} />
                <span>Profil Ayarları</span>
              </button>
            </div>

            {/* Logout Button */}
            <div
              style={{
                padding: spacing.xs,
                borderTop: `1px solid ${colors.border}`,
                backgroundColor: colors.gray[50],
              }}
            >
              <button
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: spacing.sm,
                  padding: `${spacing.sm} ${spacing.md}`,
                  backgroundColor: "transparent",
                  border: `1px solid ${colors.danger}`,
                  borderRadius: borderRadius.md,
                  color: colors.danger,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold,
                  cursor: "pointer",
                  transition: `all ${transitions.normal} ease`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.danger;
                  e.currentTarget.style.color = colors.white;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = colors.danger;
                }}
              >
                <Icon name="logout" size={16} color={colors.danger} />
                <span>Çıkış Yap</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const pathname = usePathname();
  const router = useRouter();
  
  // Responsive breakpoints
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      // Auto-collapse sidebar on mobile
      if (width < 768) {
        setSidebarCollapsed(true);
      }
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  
  // Close mobile menu when route changes
  useEffect(() => {
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  }, [pathname, isMobile]);

  // Check user role
  const { data: userData } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => getCurrentUser(),
    retry: false,
  });

  const currentUser = userData?.data;
  const currentTenant = currentUser?.tenants?.find((t: any) => t.status === "active");
  const userRole = currentTenant?.role;
  const isUserReadOnly = userRole === "ReadOnly";

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const platformRoles = payload.platformRoles || [];
        setIsPlatformAdmin(platformRoles.includes("PLATFORM_ADMIN"));
      } catch (e) {
        // Invalid token, ignore
      }
    }
  }, []);

  // Redirect ReadOnly users to client portal
  useEffect(() => {
    if (isUserReadOnly && pathname && !pathname.startsWith("/client")) {
      router.push("/client/dashboard");
    }
  }, [isUserReadOnly, pathname, router]);

  // Auto-expand sections if current path matches
  useEffect(() => {
    if (pathname?.startsWith("/ayarlar")) {
      setExpandedSections((prev) => new Set(prev).add("settings"));
    }
    if (pathname?.startsWith("/risk")) {
      setExpandedSections((prev) => new Set(prev).add("risk"));
    }
    if (pathname?.startsWith("/raporlar") || pathname?.startsWith("/entegrasyonlar") || pathname?.startsWith("/ai-asistan") || pathname?.startsWith("/mesajlar") || pathname?.startsWith("/sozlesmeler") || pathname?.startsWith("/bildirimler")) {
      setExpandedSections((prev) => new Set(prev).add("other"));
    }
  }, [pathname]);

  // Main navigation items
  const mainNavItems: NavItem[] = [
    { href: "/anasayfa", label: "Ana Sayfa", icon: "home" },
    { href: "/musteriler", label: "Müşteriler", icon: "users" },
    { href: "/faturalar", label: "Faturalar", icon: "invoice" },
    { href: "/e-fatura", label: "E-Fatura", icon: "invoice" },
    { href: "/e-arsiv", label: "E-Arşiv", icon: "archive" },
    { href: "/e-defter", label: "E-Defter", icon: "book" },
    { href: "/islemler", label: "İşlemler", icon: "briefcase" },
    { href: "/belgeler", label: "Belgeler", icon: "folder" },
    { href: "/gorevler", label: "Görevler", icon: "checkCircle" },
  ];

  const riskNavItems: NavItem[] = [
    { href: "/risk/dashboard", label: "Risk Panosu", icon: "chart" },
    { href: "/risk/alerts", label: "Risk Uyarıları", icon: "alert", badge: 0 },
    { href: "/risk/ml-fraud", label: "ML Dolandırıcılık", icon: "robot" },
  ];

  // Get unread message count for badge
  const { data: threadsData } = useQuery({
    queryKey: ["message-threads", "unread-count"],
    queryFn: async () => {
      const { messagingClient } = await import("@repo/api-client");
      return messagingClient.listThreads({ limit: 100 });
    },
    enabled: !isUserReadOnly && !!currentUser,
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const threads = threadsData?.data?.data || [];
  const unreadMessageCount = threads.reduce((sum: number, thread: any) => sum + (thread.unreadCount || 0), 0);

  // Get unread notification count for badge
  const { data: notificationsData } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const { notificationClient } = await import("@repo/api-client");
      return notificationClient.listNotifications({ is_read: false, limit: 100 });
    },
    enabled: !!currentUser,
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const unreadNotificationCount = notificationsData?.meta?.total || notificationsData?.data?.length || 0;

  const otherNavItems: NavItem[] = [
    { href: "/vergi", label: "Vergi", icon: "tax" },
    { href: "/kvkk", label: "KVKK", icon: "lock" },
    { href: "/guvenlik", label: "Güvenlik", icon: "security" },
    { href: "/analitik", label: "Analitik", icon: "analytics" },
    { href: "/raporlar", label: "Raporlar", icon: "report" },
    { href: "/entegrasyonlar", label: "Entegrasyonlar", icon: "plug" },
    { href: "/ai-asistan", label: "AI Asistan", icon: "robot" },
    { href: "/mesajlar", label: "Mesajlar", icon: "message", badge: unreadMessageCount },
    { href: "/sozlesmeler", label: "Sözleşmeler", icon: "contract" },
    { href: "/bildirimler", label: "Bildirimler", icon: "notification", badge: unreadNotificationCount },
  ];

  const settingsItems: NavItem[] = [
    { href: "/ayarlar/ofis", label: "Ofis Ayarları", icon: "building" },
    { href: "/ayarlar/profil", label: "Profil Ayarları", icon: "user" },
    { href: "/ayarlar/kullanicilar", label: "Kullanıcı Yönetimi", icon: "users" },
    { href: "/ayarlar/email-sablonlari", label: "E-posta Şablonları", icon: "mail" },
    { href: "/ayarlar/email-loglari", label: "E-posta Logları", icon: "file" },
    { href: "/ayarlar/abonelik", label: "Abonelik & Kullanım", icon: "creditCard" },
    { href: "/ayarlar/denetim-kayitlari", label: "Denetim Kayıtları", icon: "file" },
  ];

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const isActive = (href: string) => {
    if (href === "/anasayfa") return pathname === href;
    return pathname?.startsWith(href);
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/auth/login");
    } catch (error) {
      // Even if logout fails, redirect to login
      router.push("/auth/login");
    }
  };

  const NavLink = ({ item, level = 0 }: { item: NavItem; level?: number }) => {
    const active = isActive(item.href);

    return (
      <div>
        <Link
          href={item.href}
          style={{
            display: "flex",
            alignItems: "center",
            gap: spacing.sm,
            padding: `${spacing.md} ${spacing.md}`,
            marginLeft: level > 0 ? spacing.lg : 0,
            marginBottom: spacing.xs,
            textDecoration: "none",
            color: active ? colors.primary : colors.text.secondary,
            backgroundColor: active ? colors.primaryLighter : "transparent",
            borderRadius: borderRadius.lg,
            fontWeight: active ? typography.fontWeight.semibold : typography.fontWeight.normal,
            fontSize: typography.fontSize.sm,
            transition: `all ${transitions.normal} ease`,
            position: "relative",
          }}
          onMouseEnter={(e) => {
            if (!active) {
              e.currentTarget.style.backgroundColor = colors.gray[50];
              e.currentTarget.style.color = colors.text.primary;
              e.currentTarget.style.transform = "translateX(4px)";
            }
          }}
          onMouseLeave={(e) => {
            if (!active) {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = colors.text.secondary;
              e.currentTarget.style.transform = "translateX(0)";
            }
          }}
          title={sidebarCollapsed ? item.label : undefined}
        >
          <span
            style={{
              fontSize: "20px",
              lineHeight: 1,
              minWidth: "24px",
              textAlign: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {item.icon.length === 1 || item.icon.startsWith("🏠") || item.icon.startsWith("👥") ? (
              // Legacy emoji support
              item.icon
            ) : (
              // Icon component
              <Icon 
                name={item.icon as any} 
                size={20} 
                color={active ? colors.primary : colors.text.secondary}
                strokeWidth={active ? 2.5 : 2}
              />
            )}
          </span>
          {!sidebarCollapsed && (
            <>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  style={{
                    backgroundColor: colors.danger,
                    color: colors.white,
                    borderRadius: borderRadius.full,
                    padding: `2px ${spacing.sm}`,
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.bold,
                    minWidth: "22px",
                    height: "22px",
                    textAlign: "center",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: shadows.sm,
                  }}
                >
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </>
          )}
          {active && (
            <div
              style={{
                position: "absolute",
                left: 0,
                top: "50%",
                transform: "translateY(-50%)",
                width: "4px",
                height: "70%",
                backgroundColor: colors.primary,
                borderRadius: "0 2px 2px 0",
                boxShadow: `0 0 8px ${colors.primary}40`,
              }}
            />
          )}
        </Link>
      </div>
    );
  };

  const NavSection = ({
    title,
    items,
    sectionKey,
    defaultExpanded = false,
  }: {
    title: string;
    items: NavItem[];
    sectionKey: string;
    defaultExpanded?: boolean;
  }) => {
    const isExpanded = expandedSections.has(sectionKey) || defaultExpanded;

    if (sidebarCollapsed) {
      return (
        <div style={{ marginTop: spacing.md }}>
          {items.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>
      );
    }

    return (
      <div style={{ marginTop: spacing.md }}>
        <button
          onClick={() => toggleSection(sectionKey)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: `${spacing.xs} ${spacing.md}`,
            backgroundColor: "transparent",
            border: "none",
            color: colors.text.secondary,
            fontSize: typography.fontSize.xs,
            fontWeight: typography.fontWeight.semibold,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            cursor: "pointer",
            transition: `color ${transitions.normal} ease`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = colors.text.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = colors.text.secondary;
          }}
        >
          <span>{title}</span>
          <span
            style={{
              transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: `transform ${transitions.normal} ease`,
              fontSize: "12px",
            }}
          >
            ▼
          </span>
        </button>
        {isExpanded && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: spacing.xs,
              marginTop: spacing.xs,
            }}
          >
            {items.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: colors.gray[50],
        display: "flex",
        position: "relative",
      }}
    >
      {/* Mobile Menu Overlay */}
      {isMobile && mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: zIndex.modal - 1,
          }}
        />
      )}
      
      {/* Enhanced Sidebar */}
      <aside
        style={{
          width: isMobile 
            ? (mobileMenuOpen ? "280px" : "0")
            : (sidebarCollapsed ? "80px" : "280px"),
          backgroundColor: colors.white,
          borderRight: `1px solid ${colors.border}`,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          transition: isMobile 
            ? `transform ${transitions.slow} ease`
            : `width ${transitions.slow} ease`,
          position: isMobile ? "fixed" : "sticky",
          top: 0,
          left: 0,
          zIndex: isMobile ? zIndex.modal : zIndex.sticky,
          boxShadow: shadows.md,
          transform: isMobile && !mobileMenuOpen ? "translateX(-100%)" : "translateX(0)",
          overflow: isMobile ? "auto" : "visible",
        }}
      >
        {/* Logo/Header */}
        <div
          style={{
            padding: spacing.lg,
            borderBottom: `1px solid ${colors.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            minHeight: "80px",
            background: `linear-gradient(135deg, ${colors.primaryLighter} 0%, ${colors.white} 100%)`,
          }}
        >
          <div
            style={{
              opacity: sidebarCollapsed ? 0 : 1,
              width: sidebarCollapsed ? 0 : "auto",
              overflow: "hidden",
              transition: `opacity ${transitions.normal} ease`,
              pointerEvents: sidebarCollapsed ? "none" : "auto",
            }}
          >
            <Link 
              href="/anasayfa" 
              style={{ 
                textDecoration: "none", 
                color: "inherit",
                display: "block",
              }}
            >
              <h1
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.xl,
                  fontWeight: typography.fontWeight.bold,
                  background: colors.gradients.primary,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  whiteSpace: "nowrap",
                  marginBottom: spacing.xs,
                }}
              >
                AI Muhasebi
              </h1>
              {currentTenant && (
                <div
                  style={{
                    fontSize: typography.fontSize.xs,
                    color: colors.text.secondary,
                    fontWeight: typography.fontWeight.normal,
                  }}
                >
                  {currentTenant.name}
                </div>
              )}
            </Link>
          </div>
          {!isMobile && (
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{
                backgroundColor: colors.white,
                border: `1px solid ${colors.border}`,
                borderRadius: borderRadius.md,
                padding: spacing.sm,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: `all ${transitions.normal} ease`,
                minWidth: "36px",
                minHeight: "36px",
                boxShadow: shadows.sm,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.gray[50];
                e.currentTarget.style.transform = "scale(1.05)";
                e.currentTarget.style.boxShadow = shadows.md;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.white;
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = shadows.sm;
              }}
              title={sidebarCollapsed ? "Menüyü Genişlet" : "Menüyü Daralt"}
            >
              <span style={{ fontSize: "16px", color: colors.text.secondary }}>
                {sidebarCollapsed ? "→" : "←"}
              </span>
            </button>
          )}
          {isMobile && (
            <button
              onClick={() => setMobileMenuOpen(false)}
              style={{
                backgroundColor: colors.white,
                border: `1px solid ${colors.border}`,
                borderRadius: borderRadius.md,
                padding: spacing.sm,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "36px",
                minHeight: "36px",
              }}
              aria-label="Close menu"
            >
              <span style={{ fontSize: "16px", color: colors.text.secondary }}>✕</span>
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav
          style={{
            flex: 1,
            padding: spacing.md,
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          {/* Main Navigation */}
          <div style={{ display: "flex", flexDirection: "column", gap: spacing.xs }}>
            {mainNavItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>

          {/* Risk Section */}
          <NavSection
            title="Risk Yönetimi"
            items={riskNavItems}
            sectionKey="risk"
            defaultExpanded={riskNavItems.some((item) => isActive(item.href))}
          />

          {/* Other Features */}
          <NavSection
            title="Diğer"
            items={otherNavItems}
            sectionKey="other"
            defaultExpanded={otherNavItems.some((item) => isActive(item.href))}
          />

          {/* Settings Section */}
          <div style={{ marginTop: spacing.lg, paddingTop: spacing.md, borderTop: `1px solid ${colors.border}` }}>
            <button
              onClick={() => toggleSection("settings")}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: spacing.sm,
                padding: `${spacing.sm} ${spacing.md}`,
                backgroundColor: isActive("/ayarlar") ? colors.primaryLighter : "transparent",
                border: "none",
                borderRadius: borderRadius.md,
                color: isActive("/ayarlar") ? colors.primary : colors.text.secondary,
                fontSize: typography.fontSize.sm,
                fontWeight: isActive("/ayarlar") ? typography.fontWeight.semibold : typography.fontWeight.normal,
                cursor: "pointer",
                transition: `all ${transitions.normal} ease`,
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                if (!isActive("/ayarlar")) {
                  e.currentTarget.style.backgroundColor = colors.gray[100];
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive("/ayarlar")) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              <Icon name="settings" size={18} color={isActive("/ayarlar") ? colors.primary : colors.text.secondary} />
              {!sidebarCollapsed && (
                <>
                  <span style={{ flex: 1 }}>Ayarlar</span>
                  <span
                    style={{
                      transform: expandedSections.has("settings") ? "rotate(180deg)" : "rotate(0deg)",
                      transition: `transform ${transitions.normal} ease`,
                      fontSize: "12px",
                    }}
                  >
                    ▼
                  </span>
                </>
              )}
            </button>
            {expandedSections.has("settings") && !sidebarCollapsed && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: spacing.xs,
                  marginTop: spacing.xs,
                  paddingLeft: spacing.md,
                }}
              >
                {settingsItems.map((item) => (
                  <NavLink key={item.href} item={item} level={1} />
                ))}
              </div>
            )}
          </div>

          {/* Admin Link */}
          {isPlatformAdmin && (
            <div style={{ marginTop: spacing.md, paddingTop: spacing.md, borderTop: `1px solid ${colors.border}` }}>
              <Link
                href="/admin/overview"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: spacing.sm,
                  padding: `${spacing.sm} ${spacing.md}`,
                  textDecoration: "none",
                  color: isActive("/admin") ? colors.primary : colors.text.secondary,
                  backgroundColor: isActive("/admin") ? colors.primaryLighter : "transparent",
                  borderRadius: borderRadius.md,
                  fontWeight: isActive("/admin") ? typography.fontWeight.semibold : typography.fontWeight.normal,
                  fontSize: typography.fontSize.sm,
                  transition: `all ${transitions.normal} ease`,
                }}
                onMouseEnter={(e) => {
                  if (!isActive("/admin")) {
                    e.currentTarget.style.backgroundColor = colors.gray[100];
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive("/admin")) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                <Icon name="crown" size={18} color={isActive("/admin") ? colors.primary : colors.text.secondary} />
                {!sidebarCollapsed && <span>Yönetim Konsolu</span>}
              </Link>
            </div>
          )}
        </nav>
      </aside>

        {/* Main Content Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, width: "100%" }}>
        {/* Enhanced Top Header */}
        <header
          style={{
            padding: isMobile 
              ? `${spacing.sm} ${spacing.md}`
              : isTablet
              ? `${spacing.md} ${spacing.lg}`
              : `${spacing.md} ${spacing.xxl}`,
            borderBottom: `1px solid ${colors.border}`,
            backgroundColor: colors.white,
            boxShadow: shadows.sm,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            zIndex: zIndex.sticky,
            minHeight: isMobile ? "64px" : "80px",
            backdropFilter: "blur(10px)",
            background: colors.white,
            borderBottom: `2px solid ${colors.border}`,
            gap: spacing.sm,
          }}
        >
          {/* Mobile Menu Toggle */}
          {isMobile && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                backgroundColor: "transparent",
                border: `1px solid ${colors.border}`,
                borderRadius: borderRadius.md,
                padding: spacing.sm,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "40px",
                minHeight: "40px",
              }}
              aria-label="Toggle menu"
            >
              <span style={{ fontSize: "20px" }}>☰</span>
            </button>
          )}
          
          {/* Page Title / Welcome Section */}
          <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
            {currentUser && (
              <div style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  {!isMobile && (
                    <div
                      style={{
                        fontSize: typography.fontSize.xs,
                        color: colors.text.muted,
                        marginBottom: spacing.xs / 2,
                        fontWeight: typography.fontWeight.medium,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {currentTenant?.name || "Ofis"}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: isMobile ? typography.fontSize.base : typography.fontSize.lg,
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.text.primary,
                      lineHeight: typography.lineHeight.tight,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {isMobile 
                      ? (currentUser.user?.fullName || "Kullanıcı")
                      : `Hoş geldiniz, ${currentUser.user?.fullName || "Kullanıcı"}`
                    }
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right side actions */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: isMobile ? spacing.xs : spacing.sm,
              flexShrink: 0,
            }}
          >
            {!isMobile && <GlobalSearch />}
            <NotificationBell />
            {!isMobile && <TenantSwitcher />}
            
            {/* User Profile Dropdown */}
            {currentUser && (
              <UserProfileDropdown 
                currentUser={currentUser}
                onLogout={handleLogout}
                sidebarCollapsed={isMobile ? false : sidebarCollapsed}
              />
            )}
          </div>
        </header>

        {/* Main Content with smooth transitions */}
        <main
          style={{
            flex: 1,
            padding: isMobile
              ? spacing.md
              : isTablet
              ? spacing.lg
              : spacing.xxl,
            paddingBottom: isMobile ? "100px" : undefined, // Extra padding for bottom navigation
            maxWidth: "1600px",
            margin: "0 auto",
            width: "100%",
            transition: `padding ${transitions.normal} ease`,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              animation: "fadeIn 0.3s ease-in",
            }}
          >
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <BottomNavigation
          notificationCount={unreadNotificationCount}
          messageCount={unreadMessageCount}
        />
      )}

      {/* Add fade-in animation */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
