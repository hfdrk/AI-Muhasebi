"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout, getCurrentUser } from "@repo/api-client";
import { useQuery } from "@tanstack/react-query";
import { colors, spacing, shadows, borderRadius, transitions, typography, zIndex } from "../../styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { themeColors } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Check if user is ReadOnly (client)
  const { data: userData } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => getCurrentUser(),
  });

  const currentUser = userData?.data;
  const currentTenant = currentUser?.tenants?.find((t: any) => t.status === "active");
  const userRole = currentTenant?.role;
  const isReadOnly = userRole === "ReadOnly";

  // Redirect to protected routes if not ReadOnly
  useEffect(() => {
    if (currentUser && !isReadOnly) {
      router.push("/anasayfa");
    }
  }, [currentUser, isReadOnly, router]);

  // Client-specific navigation (simplified)
  const clientNavItems: NavItem[] = [
    { href: "/client/dashboard", label: "Ana Sayfa", icon: "🏠" },
    { href: "/client/documents", label: "Belgelerim", icon: "📁" },
    { href: "/client/invoices", label: "Faturalarım", icon: "📄" },
    { href: "/client/transactions", label: "İşlemlerim", icon: "💼" },
    { href: "/client/upload", label: "Belge Yükle", icon: "📤" },
    { href: "/client/ayarlar", label: "Ayarlar", icon: "⚙️" },
  ];

  const isActive = (href: string) => {
    if (href === "/client/dashboard") return pathname === href;
    return pathname?.startsWith(href);
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/auth/login");
    } catch (error) {
      router.push("/auth/login");
    }
  };

  if (!isReadOnly && currentUser) {
    return null; // Will redirect
  }

  // Get page title from pathname
  const getPageTitle = () => {
    if (pathname === "/client/dashboard") return "Ana Sayfa";
    if (pathname?.startsWith("/client/documents")) return "Belgelerim";
    if (pathname?.startsWith("/client/invoices")) return "Faturalarım";
    if (pathname?.startsWith("/client/transactions")) return "İşlemlerim";
    if (pathname?.startsWith("/client/upload")) return "Belge Yükle";
    if (pathname?.startsWith("/client/ayarlar")) return "Ayarlar";
    return "Müşteri Portalı";
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: themeColors.gray[50] }}>
      {/* Enhanced Sidebar */}
      <aside
        style={{
          width: sidebarCollapsed ? "80px" : "280px",
          backgroundColor: themeColors.white,
          borderRight: `1px solid ${themeColors.border}`,
          display: "flex",
          flexDirection: "column",
          transition: `width ${transitions.slow} ease`,
          boxShadow: shadows.md,
          position: "sticky",
          top: 0,
          height: "100vh",
          zIndex: zIndex.sticky,
        }}
      >
        {/* Logo/Header */}
        <div
          style={{
            padding: spacing.lg,
            borderBottom: `1px solid ${themeColors.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            minHeight: "72px",
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
              href="/client/dashboard" 
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
                }}
              >
                AI Muhasebi
              </h1>
              <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.secondary, marginTop: spacing.xs }}>
                Müşteri Portalı
              </div>
            </Link>
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{
              backgroundColor: themeColors.gray[100],
              border: "none",
              borderRadius: borderRadius.md,
              padding: spacing.xs,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: `all ${transitions.normal} ease`,
              minWidth: "32px",
              minHeight: "32px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = themeColors.gray[200];
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = themeColors.gray[100];
            }}
            title={sidebarCollapsed ? "Menüyü Genişlet" : "Menüyü Daralt"}
          >
            <span style={{ fontSize: "16px", color: themeColors.text.secondary }}>
              {sidebarCollapsed ? "→" : "←"}
            </span>
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: spacing.md, overflowY: "auto", overflowX: "hidden" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: spacing.xs }}>
            {clientNavItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: spacing.sm,
                    padding: `${spacing.sm} ${spacing.md}`,
                    textDecoration: "none",
                    color: active ? colors.primary : themeColors.text.secondary,
                    backgroundColor: active ? colors.primaryLighter : "transparent",
                    borderRadius: borderRadius.md,
                    fontWeight: active ? typography.fontWeight.semibold : typography.fontWeight.normal,
                    fontSize: typography.fontSize.sm,
                    transition: `all ${transitions.normal} ease`,
                    position: "relative",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = themeColors.gray[50];
                      e.currentTarget.style.color = themeColors.text.primary;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = themeColors.text.secondary;
                    }
                  }}
                >
                  <span style={{ fontSize: "20px", lineHeight: 1, minWidth: "24px", textAlign: "center" }}>
                    {item.icon}
                  </span>
                  {!sidebarCollapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                  {active && (
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: "3px",
                        height: "60%",
                        backgroundColor: colors.primary,
                        borderRadius: "0 2px 2px 0",
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User Info & Logout */}
        <div
          style={{
            padding: spacing.md,
            borderTop: `1px solid ${themeColors.border}`,
            backgroundColor: themeColors.gray[50],
          }}
        >
          {!sidebarCollapsed && currentUser && (
            <div
              style={{
                marginBottom: spacing.md,
                padding: spacing.sm,
                backgroundColor: themeColors.white,
                borderRadius: borderRadius.md,
                border: `1px solid ${themeColors.border}`,
              }}
            >
              <div
                style={{
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold,
                  color: themeColors.text.primary,
                  marginBottom: spacing.xs,
                }}
              >
                {currentUser.user?.fullName || "Müşteri"}
              </div>
              <div
                style={{
                  fontSize: typography.fontSize.xs,
                  color: themeColors.text.secondary,
                  wordBreak: "break-word",
                }}
              >
                {currentUser.user?.email}
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              padding: `${spacing.sm} ${spacing.md}`,
              backgroundColor: colors.danger,
              color: colors.white,
              border: "none",
              borderRadius: borderRadius.md,
              cursor: "pointer",
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              transition: `all ${transitions.normal} ease`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: spacing.xs,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.dangerDark;
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = shadows.md;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = colors.danger;
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <span style={{ fontSize: "16px" }}>🚪</span>
            {!sidebarCollapsed && <span>Çıkış Yap</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {/* Enhanced Top Bar */}
        <header
          style={{
            backgroundColor: themeColors.white,
            borderBottom: `1px solid ${themeColors.border}`,
            padding: `${spacing.md} ${spacing.xl}`,
            boxShadow: shadows.sm,
            position: "sticky",
            top: 0,
            zIndex: zIndex.sticky - 1,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: typography.fontSize["2xl"],
                  fontWeight: typography.fontWeight.bold,
                  color: themeColors.text.primary,
                  background: colors.gradients.primary,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {getPageTitle()}
              </h2>
              {currentUser && (
                <p
                  style={{
                    margin: 0,
                    marginTop: spacing.xs,
                    fontSize: typography.fontSize.sm,
                    color: themeColors.text.secondary,
                  }}
                >
                  Hoş geldiniz, {currentUser.user?.fullName || "Müşteri"}
                </p>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: spacing.xl,
            maxWidth: "1400px",
            width: "100%",
            margin: "0 auto",
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
