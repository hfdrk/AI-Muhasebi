"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { TenantSwitcher } from "../../components/tenant-switcher";
import { NotificationBell } from "../../components/notification-bell";
import { GlobalSearch } from "../../components/global-search";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout, getCurrentUser } from "@repo/api-client";
import { useQuery } from "@tanstack/react-query";
import { colors, darkColors, spacing, shadows, borderRadius, transitions, zIndex, typography } from "../../styles/design-system";
import { Icon } from "../../components/ui/Icon";
import { BottomNavigation } from "../../components/mobile/bottom-navigation";
import { useTheme } from "../../contexts/ThemeContext";
import { getAccessToken } from "@/lib/auth";

// Idle session timeout (15 minutes of inactivity → auto-logout)
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const IDLE_WARNING_MS = 13 * 60 * 1000; // Show warning 2 min before logout

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
}: {
  currentUser: any;
  onLogout: () => void;
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
                  marginBottom: "2px",
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
                <Icon name="User" size={16} color={colors.text.primary} />
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
                <Icon name="LogOut" size={16} color={colors.danger} />
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
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { isDark, toggleTheme } = useTheme();
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Idle session timeout — auto-logout after 15 min of inactivity
  const resetIdleTimer = useCallback(() => {
    setShowIdleWarning(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);

    warningTimerRef.current = setTimeout(() => {
      setShowIdleWarning(true);
    }, IDLE_WARNING_MS);

    idleTimerRef.current = setTimeout(async () => {
      try { await logout(); } catch {}
      router.push("/auth/login?reason=idle");
    }, IDLE_TIMEOUT_MS);
  }, [router]);

  useEffect(() => {
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, resetIdleTimer, { passive: true }));
    resetIdleTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetIdleTimer));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, [resetIdleTimer]);

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
    const token = getAccessToken();
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
    if (pathname?.startsWith("/masak") || pathname?.startsWith("/kurgan") || pathname?.startsWith("/babs") || pathname?.startsWith("/beyanname") || pathname?.startsWith("/mali-musavir")) {
      setExpandedSections((prev) => new Set(prev).add("maliMusavir"));
    }
    if (pathname?.startsWith("/tekrar-faturalar") || pathname?.startsWith("/cek-senet") || pathname?.startsWith("/nakit-akis") || pathname?.startsWith("/doviz-kurlari") || pathname?.startsWith("/odeme-hatirlatma")) {
      setExpandedSections((prev) => new Set(prev).add("finans"));
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
    { href: "/eksik-belgeler", label: "Eksik Belgeler", icon: "alert" },
    { href: "/gorevler", label: "Görevler", icon: "checkCircle" },
  ];

  const riskNavItems: NavItem[] = [
    { href: "/risk/dashboard", label: "Risk Panosu", icon: "chart" },
    { href: "/risk/alerts", label: "Risk Uyarıları", icon: "alert", badge: 0 },
    { href: "/risk/ml-fraud", label: "ML Dolandırıcılık", icon: "robot" },
  ];

  const maliMusavirNavItems: NavItem[] = [
    { href: "/mali-musavir", label: "Genel Pano", icon: "chart" },
    { href: "/masak", label: "MASAK", icon: "alert" },
    { href: "/kurgan", label: "KURGAN", icon: "security" },
    { href: "/babs", label: "Ba-Bs Formları", icon: "file" },
    { href: "/beyanname", label: "Beyanname", icon: "invoice" },
  ];

  const finansNavItems: NavItem[] = [
    { href: "/tekrar-faturalar", label: "Tekrar Faturalar", icon: "invoice" },
    { href: "/cek-senet", label: "Çek / Senet", icon: "file" },
    { href: "/nakit-akis", label: "Nakit Akış", icon: "chart" },
    { href: "/doviz-kurlari", label: "Döviz Kurları", icon: "creditCard" },
    { href: "/odeme-hatirlatma", label: "Ödeme Hatırlatma", icon: "notification" },
  ];

  // Get unread message count for badge
  const { data: threadsData } = useQuery({
    queryKey: ["message-threads", "unread-count"],
    queryFn: async () => {
      const { messagingClient } = await import("@repo/api-client");
      return messagingClient.listThreads({ limit: 100 });
    },
    enabled: !isUserReadOnly && !!currentUser,
    refetchInterval: 60000, // Poll every 60 seconds (reduced frequency)
    staleTime: 30000,
    retry: false, // Don't retry to avoid spam
  });

  const threads = threadsData?.data || [];
  const unreadMessageCount = threads.reduce((sum: number, thread: any) => sum + (thread.unreadCount || 0), 0);

  // Get unread notification count for badge
  const { data: notificationsData } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const { notificationClient } = await import("@repo/api-client");
      return notificationClient.listNotifications({ is_read: false, limit: 100 });
    },
    enabled: !!currentUser,
    refetchInterval: 60000, // Poll every 60 seconds (reduced frequency)
    staleTime: 30000,
    retry: false, // Don't retry to avoid spam
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
            color: active ? colors.sidebar.textActive : colors.sidebar.text,
            backgroundColor: active ? "rgba(13, 148, 136, 0.15)" : "transparent",
            borderRadius: borderRadius.lg,
            fontWeight: active ? typography.fontWeight.semibold : typography.fontWeight.normal,
            fontSize: typography.fontSize.sm,
            transition: `all ${transitions.normal} ease`,
            position: "relative",
          }}
          onMouseEnter={(e) => {
            if (!active) {
              e.currentTarget.style.backgroundColor = colors.sidebar.bgHover;
              e.currentTarget.style.color = colors.sidebar.textActive;
              e.currentTarget.style.transform = "translateX(4px)";
            }
          }}
          onMouseLeave={(e) => {
            if (!active) {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = colors.sidebar.text;
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
                color={active ? colors.sidebar.accentBorder : colors.sidebar.text}
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
                backgroundColor: colors.sidebar.accentBorder,
                borderRadius: "0 2px 2px 0",
                boxShadow: `0 0 8px ${colors.sidebar.accentBorder}40`,
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
            color: colors.sidebar.sectionTitle,
            fontSize: typography.fontSize.xs,
            fontWeight: typography.fontWeight.semibold,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            cursor: "pointer",
            transition: `color ${transitions.normal} ease`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = colors.sidebar.text;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = colors.sidebar.sectionTitle;
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
        backgroundColor: isDark ? darkColors.background : colors.gray[50],
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
          backgroundColor: colors.sidebar.bg,
          borderRight: "none",
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
            borderBottom: `1px solid rgba(255,255,255,0.08)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            minHeight: "80px",
            background: colors.sidebar.headerBg,
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
                  color: colors.sidebar.textActive,
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
                    color: colors.sidebar.text,
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
                backgroundColor: "rgba(255,255,255,0.08)",
                border: `1px solid rgba(255,255,255,0.12)`,
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
                e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.15)";
                e.currentTarget.style.transform = "scale(1.05)";
                e.currentTarget.style.boxShadow = shadows.md;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)";
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = shadows.sm;
              }}
              title={sidebarCollapsed ? "Menüyü Genişlet" : "Menüyü Daralt"}
            >
              <span style={{ fontSize: "16px", color: colors.sidebar.text }}>
                {sidebarCollapsed ? "→" : "←"}
              </span>
            </button>
          )}
          {isMobile && (
            <button
              onClick={() => setMobileMenuOpen(false)}
              style={{
                backgroundColor: "rgba(255,255,255,0.08)",
                border: `1px solid rgba(255,255,255,0.12)`,
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
              <span style={{ fontSize: "16px", color: colors.sidebar.text }}>✕</span>
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

          {/* Mali Müşavir Platform */}
          <NavSection
            title="Mali Müşavir"
            items={maliMusavirNavItems}
            sectionKey="maliMusavir"
            defaultExpanded={maliMusavirNavItems.some((item) => isActive(item.href))}
          />

          {/* Finans Section */}
          <NavSection
            title="Finans"
            items={finansNavItems}
            sectionKey="finans"
            defaultExpanded={finansNavItems.some((item) => isActive(item.href))}
          />

          {/* Other Features */}
          <NavSection
            title="Diğer"
            items={otherNavItems}
            sectionKey="other"
            defaultExpanded={otherNavItems.some((item) => isActive(item.href))}
          />

          {/* Settings Section */}
          <div style={{ marginTop: spacing.lg, paddingTop: spacing.md, borderTop: `1px solid rgba(255,255,255,0.08)` }}>
            <button
              onClick={() => toggleSection("settings")}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: spacing.sm,
                padding: `${spacing.sm} ${spacing.md}`,
                backgroundColor: isActive("/ayarlar") ? "rgba(13, 148, 136, 0.15)" : "transparent",
                border: "none",
                borderRadius: borderRadius.md,
                color: isActive("/ayarlar") ? colors.sidebar.textActive : colors.sidebar.text,
                fontSize: typography.fontSize.sm,
                fontWeight: isActive("/ayarlar") ? typography.fontWeight.semibold : typography.fontWeight.normal,
                cursor: "pointer",
                transition: `all ${transitions.normal} ease`,
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                if (!isActive("/ayarlar")) {
                  e.currentTarget.style.backgroundColor = colors.sidebar.bgHover;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive("/ayarlar")) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              <Icon name="Settings" size={18} color={isActive("/ayarlar") ? colors.sidebar.accentBorder : colors.sidebar.text} />
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
            <div style={{ marginTop: spacing.md, paddingTop: spacing.md, borderTop: `1px solid rgba(255,255,255,0.08)` }}>
              <Link
                href="/admin/overview"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: spacing.sm,
                  padding: `${spacing.sm} ${spacing.md}`,
                  textDecoration: "none",
                  color: isActive("/admin") ? colors.sidebar.textActive : colors.sidebar.text,
                  backgroundColor: isActive("/admin") ? "rgba(13, 148, 136, 0.15)" : "transparent",
                  borderRadius: borderRadius.md,
                  fontWeight: isActive("/admin") ? typography.fontWeight.semibold : typography.fontWeight.normal,
                  fontSize: typography.fontSize.sm,
                  transition: `all ${transitions.normal} ease`,
                }}
                onMouseEnter={(e) => {
                  if (!isActive("/admin")) {
                    e.currentTarget.style.backgroundColor = colors.sidebar.bgHover;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive("/admin")) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                <Icon name="Crown" size={18} color={isActive("/admin") ? colors.sidebar.accentBorder : colors.sidebar.text} />
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
            borderBottom: `2px solid ${isDark ? darkColors.border : colors.border}`,
            backgroundColor: isDark ? darkColors.white : colors.white,
            boxShadow: shadows.sm,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            zIndex: zIndex.sticky,
            minHeight: isMobile ? "64px" : "80px",
            backdropFilter: "blur(10px)",
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
                        color: isDark ? darkColors.text.muted : colors.text.muted,
                        marginBottom: "2px",
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
                      color: isDark ? darkColors.text.primary : colors.text.primary,
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
            <button
              onClick={toggleTheme}
              style={{
                backgroundColor: "transparent",
                border: `1px solid ${isDark ? darkColors.border : colors.border}`,
                borderRadius: borderRadius.md,
                padding: spacing.sm,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "40px",
                minHeight: "40px",
                transition: `all ${transitions.normal} ease`,
                color: isDark ? darkColors.text.secondary : colors.text.secondary,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDark ? darkColors.gray[100] : colors.gray[100];
                e.currentTarget.style.color = isDark ? darkColors.text.primary : colors.text.primary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = isDark ? darkColors.text.secondary : colors.text.secondary;
              }}
              title={isDark ? "Aydınlık Mod" : "Karanlık Mod"}
            >
              <Icon name={isDark ? "Sun" : "Moon"} size={20} />
            </button>
            {!isMobile && <GlobalSearch />}
            <NotificationBell />
            {!isMobile && <TenantSwitcher />}
            
            {/* User Profile Dropdown */}
            {currentUser && (
              <UserProfileDropdown
                currentUser={currentUser}
                onLogout={handleLogout}
              />
            )}
          </div>
        </header>

        {/* Idle Session Warning */}
        {showIdleWarning && (
          <div
            style={{
              backgroundColor: colors.warning,
              color: colors.white,
              padding: `${spacing.sm} ${spacing.lg}`,
              textAlign: "center",
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: spacing.md,
            }}
          >
            <span>Oturumunuz 2 dakika içinde sona erecek. Devam etmek için herhangi bir yere tıklayın.</span>
            <button
              onClick={resetIdleTimer}
              style={{
                backgroundColor: "rgba(255,255,255,0.2)",
                color: colors.white,
                border: "1px solid rgba(255,255,255,0.3)",
                padding: `${spacing.xs} ${spacing.md}`,
                borderRadius: borderRadius.md,
                cursor: "pointer",
                fontWeight: typography.fontWeight.semibold,
                fontSize: typography.fontSize.sm,
              }}
            >
              Oturumu Uzat
            </button>
          </div>
        )}

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
