"use client";

import { TenantSwitcher } from "../../components/tenant-switcher";
import Link from "next/link";
import { colors, spacing, shadows } from "../../styles/design-system";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
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
        <Link href="/dashboard" style={{ textDecoration: "none", color: "inherit" }}>
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
            href="/documents"
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
          <TenantSwitcher />
          <Link
            href="/settings/users"
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
        </nav>
      </header>
      <main style={{ padding: spacing.xxl, maxWidth: "1400px", margin: "0 auto" }}>{children}</main>
    </div>
  );
}

