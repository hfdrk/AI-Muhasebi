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

interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: number;
  children?: NavItem[];
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const pathname = usePathname();
  const router = useRouter();

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
    { href: "/anasayfa", label: "Ana Sayfa", icon: "🏠" },
    { href: "/musteriler", label: "Müşteriler", icon: "👥" },
    { href: "/faturalar", label: "Faturalar", icon: "📄" },
    { href: "/islemler", label: "İşlemler", icon: "💼" },
    { href: "/belgeler", label: "Belgeler", icon: "📁" },
    { href: "/gorevler", label: "Görevler", icon: "✅" },
  ];

  const riskNavItems: NavItem[] = [
    { href: "/risk/dashboard", label: "Risk Panosu", icon: "📊" },
    { href: "/risk/alerts", label: "Risk Uyarıları", icon: "⚠️", badge: 0 },
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

  const otherNavItems: NavItem[] = [
    { href: "/raporlar", label: "Raporlar", icon: "📈" },
    { href: "/entegrasyonlar", label: "Entegrasyonlar", icon: "🔌" },
    { href: "/ai-asistan", label: "AI Asistan", icon: "🤖" },
    { href: "/mesajlar", label: "Mesajlar", icon: "💬", badge: unreadMessageCount },
    { href: "/sozlesmeler", label: "Sözleşmeler", icon: "📄" },
    { href: "/bildirimler", label: "Bildirimler", icon: "🔔" },
  ];

  const settingsItems: NavItem[] = [
    { href: "/ayarlar/ofis", label: "Ofis Ayarları", icon: "🏢" },
    { href: "/ayarlar/profil", label: "Profil Ayarları", icon: "👤" },
    { href: "/ayarlar/kullanicilar", label: "Kullanıcı Yönetimi", icon: "👥" },
    { href: "/ayarlar/email-sablonlari", label: "E-posta Şablonları", icon: "📧" },
    { href: "/ayarlar/email-loglari", label: "E-posta Logları", icon: "📋" },
    { href: "/ayarlar/abonelik", label: "Abonelik & Kullanım", icon: "💳" },
    { href: "/ayarlar/denetim-kayitlari", label: "Denetim Kayıtları", icon: "📋" },
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
            {item.icon}
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
      }}
    >
      {/* Enhanced Sidebar */}
      <aside
        style={{
          width: sidebarCollapsed ? "80px" : "280px",
          backgroundColor: colors.white,
          borderRight: `1px solid ${colors.border}`,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          transition: `width ${transitions.slow} ease`,
          position: "sticky",
          top: 0,
          zIndex: zIndex.sticky,
          boxShadow: shadows.md,
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
              <span style={{ fontSize: "18px" }}>⚙️</span>
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
                <span style={{ fontSize: "18px" }}>👑</span>
                {!sidebarCollapsed && <span>Yönetim Konsolu</span>}
              </Link>
            </div>
          )}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Enhanced Top Header */}
        <header
          style={{
            padding: `${spacing.lg} ${spacing.xxl}`,
            borderBottom: `1px solid ${colors.border}`,
            backgroundColor: colors.white,
            boxShadow: shadows.sm,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            zIndex: zIndex.sticky,
            minHeight: "72px",
          }}
        >
          {/* Page Title / Breadcrumb */}
          <div style={{ flex: 1 }}>
            {currentUser && (
              <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
                <div>
                  <div
                    style={{
                      fontSize: typography.fontSize.sm,
                      color: colors.text.secondary,
                      marginBottom: spacing.xs,
                    }}
                  >
                    {currentTenant?.name || "Ofis"}
                  </div>
                  <div
                    style={{
                      fontSize: typography.fontSize.base,
                      fontWeight: typography.fontWeight.medium,
                      color: colors.text.primary,
                    }}
                  >
                    Hoş geldiniz, {currentUser.user?.fullName || "Kullanıcı"}
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
              gap: spacing.md,
            }}
          >
            <GlobalSearch />
            <NotificationBell />
            <TenantSwitcher />
            
            {/* User Profile Dropdown */}
            {currentUser && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: spacing.sm,
                  padding: `${spacing.xs} ${spacing.sm}`,
                  borderRadius: borderRadius.lg,
                  cursor: "pointer",
                  transition: `all ${transitions.normal} ease`,
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.gray[50];
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: borderRadius.full,
                    background: colors.gradients.primary,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: colors.white,
                    fontWeight: typography.fontWeight.bold,
                    fontSize: typography.fontSize.sm,
                  }}
                >
                  {currentUser.user?.fullName?.charAt(0)?.toUpperCase() || "U"}
                </div>
                {!sidebarCollapsed && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                    <div
                      style={{
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.medium,
                        color: colors.text.primary,
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
                )}
              </div>
            )}
            
            <button
              onClick={handleLogout}
              style={{
                display: "flex",
                alignItems: "center",
                gap: spacing.xs,
                padding: `${spacing.sm} ${spacing.md}`,
                backgroundColor: "transparent",
                border: `1px solid ${colors.border}`,
                borderRadius: borderRadius.md,
                color: colors.text.secondary,
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                cursor: "pointer",
                transition: `all ${transitions.normal} ease`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.error;
                e.currentTarget.style.borderColor = colors.error;
                e.currentTarget.style.color = colors.white;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.borderColor = colors.border;
                e.currentTarget.style.color = colors.text.secondary;
              }}
              title="Çıkış Yap"
            >
              <span style={{ fontSize: "16px" }}>🚪</span>
              <span>Çıkış</span>
            </button>
          </div>
        </header>

        {/* Main Content with smooth transitions */}
        <main
          style={{
            flex: 1,
            padding: spacing.xxl,
            maxWidth: "1600px",
            margin: "0 auto",
            width: "100%",
            transition: `padding ${transitions.normal} ease`,
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
