"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout, getCurrentUser } from "@repo/api-client";
import { useQuery } from "@tanstack/react-query";
import { colors, spacing, shadows, borderRadius, transitions, typography } from "../../styles/design-system";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
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

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: colors.gray[50] }}>
      {/* Sidebar */}
      <aside
        style={{
          width: sidebarCollapsed ? "80px" : "260px",
          backgroundColor: colors.white,
          borderRight: `1px solid ${colors.gray[200]}`,
          display: "flex",
          flexDirection: "column",
          transition: `width ${transitions.normal} ease`,
          boxShadow: shadows.sm,
        }}
      >
        {/* Logo/Header */}
        <div
          style={{
            padding: spacing.lg,
            borderBottom: `1px solid ${colors.gray[200]}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {!sidebarCollapsed && (
            <h1 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.primary }}>
              AI Muhasebi
            </h1>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: spacing.xs,
              color: colors.text.secondary,
            }}
          >
            {sidebarCollapsed ? "→" : "←"}
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: spacing.md, overflowY: "auto" }}>
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
                  marginBottom: spacing.xs,
                  textDecoration: "none",
                  color: active ? colors.primary : colors.text.secondary,
                  backgroundColor: active ? colors.primaryLighter : "transparent",
                  borderRadius: borderRadius.md,
                  fontWeight: active ? typography.fontWeight.semibold : typography.fontWeight.normal,
                  fontSize: typography.fontSize.sm,
                  transition: `all ${transitions.normal} ease`,
                }}
              >
                <span style={{ fontSize: "18px", lineHeight: 1 }}>{item.icon}</span>
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div
          style={{
            padding: spacing.md,
            borderTop: `1px solid ${colors.gray[200]}`,
          }}
        >
          {!sidebarCollapsed && currentUser && (
            <div style={{ marginBottom: spacing.sm }}>
              <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                {currentUser.user?.fullName || "Müşteri"}
              </div>
              <div style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>
                {currentUser.user?.email}
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              padding: `${spacing.sm} ${spacing.md}`,
              backgroundColor: colors.error,
              color: colors.white,
              border: "none",
              borderRadius: borderRadius.md,
              cursor: "pointer",
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
            }}
          >
            {sidebarCollapsed ? "🚪" : "Çıkış Yap"}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top Bar */}
        <header
          style={{
            backgroundColor: colors.white,
            borderBottom: `1px solid ${colors.gray[200]}`,
            padding: `${spacing.md} ${spacing.lg}`,
            boxShadow: shadows.sm,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
              Müşteri Portalı
            </h2>
          </div>
        </header>

        {/* Page Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: spacing.lg }}>
          {children}
        </div>
      </main>
    </div>
  );
}


