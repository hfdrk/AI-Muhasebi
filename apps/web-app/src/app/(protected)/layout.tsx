"use client";

import { useEffect, useState } from "react";
import { TenantSwitcher } from "../../components/tenant-switcher";
import { NotificationBell } from "../../components/notification-bell";
import { GlobalSearch } from "../../components/global-search";
import Link from "next/link";
import { colors, spacing, shadows } from "../../styles/design-system";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  useEffect(() => {
    // Check if user has platform admin role from token
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

  return (
    <div style={{ minHeight: "100vh", backgroundColor: colors.gray[50] }}>
      <header
        style={{
          padding: `${spacing.md} ${spacing.xxl}`,
          borderBottom: `1px solid ${colors.border}`,
          backgroundColor: colors.white,
          boxShadow: shadows.sm,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Link href="/anasayfa" style={{ textDecoration: "none", color: "inherit" }}>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 600, color: colors.primary }}>
            AI Muhasebi
          </h1>
        </Link>
        <nav style={{ display: "flex", gap: spacing.lg, alignItems: "center" }}>
          <Link
            href="/risk/dashboard"
            style={{
              textDecoration: "none",
              color: colors.text.secondary,
              fontSize: "14px",
              fontWeight: 500,
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = colors.primary)}
            onMouseLeave={(e) => (e.currentTarget.style.color = colors.text.secondary)}
          >
            Risk Panosu
          </Link>
          <Link
            href="/risk/alerts"
            style={{
              textDecoration: "none",
              color: colors.text.secondary,
              fontSize: "14px",
              fontWeight: 500,
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = colors.primary)}
            onMouseLeave={(e) => (e.currentTarget.style.color = colors.text.secondary)}
          >
            Risk Uyarıları
          </Link>
          <Link
            href="/belgeler"
            style={{
              textDecoration: "none",
              color: colors.text.secondary,
              fontSize: "14px",
              fontWeight: 500,
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = colors.primary)}
            onMouseLeave={(e) => (e.currentTarget.style.color = colors.text.secondary)}
          >
            Belgeler
          </Link>
          <Link
            href="/raporlar"
            style={{
              textDecoration: "none",
              color: colors.text.secondary,
              fontSize: "14px",
              fontWeight: 500,
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = colors.primary)}
            onMouseLeave={(e) => (e.currentTarget.style.color = colors.text.secondary)}
          >
            Raporlar
          </Link>
          <Link
            href="/ai-asistan"
            style={{
              textDecoration: "none",
              color: colors.text.secondary,
              fontSize: "14px",
              fontWeight: 500,
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = colors.primary)}
            onMouseLeave={(e) => (e.currentTarget.style.color = colors.text.secondary)}
          >
            AI Asistan
          </Link>
          <Link
            href="/ayarlar"
            style={{
              textDecoration: "none",
              color: colors.text.secondary,
              fontSize: "14px",
              fontWeight: 500,
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = colors.primary)}
            onMouseLeave={(e) => (e.currentTarget.style.color = colors.text.secondary)}
          >
            Ayarlar
          </Link>
          <Link
            href="/ayarlar/abonelik"
            style={{
              textDecoration: "none",
              color: colors.text.secondary,
              fontSize: "14px",
              fontWeight: 500,
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = colors.primary)}
            onMouseLeave={(e) => (e.currentTarget.style.color = colors.text.secondary)}
          >
            Abonelik & Kullanım
          </Link>
          <GlobalSearch />
          <NotificationBell />
          <TenantSwitcher />
          <Link
            href="/ayarlar/kullanicilar"
            style={{
              textDecoration: "none",
              color: colors.text.secondary,
              fontSize: "14px",
              fontWeight: 500,
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = colors.primary)}
            onMouseLeave={(e) => (e.currentTarget.style.color = colors.text.secondary)}
          >
            Kullanıcı Yönetimi
          </Link>
          {isPlatformAdmin && (
            <Link
              href="/admin/overview"
              style={{
                textDecoration: "none",
                color: colors.text.secondary,
                fontSize: "14px",
                fontWeight: 500,
                transition: "color 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = colors.primary)}
              onMouseLeave={(e) => (e.currentTarget.style.color = colors.text.secondary)}
            >
              Yönetim Konsolu
            </Link>
          )}
        </nav>
      </header>
      <main style={{ padding: spacing.xxl, maxWidth: "1400px", margin: "0 auto" }}>{children}</main>
    </div>
  );
}

