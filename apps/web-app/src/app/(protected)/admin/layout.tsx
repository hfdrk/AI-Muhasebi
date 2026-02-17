"use client";

import { ImpersonationBanner } from "../../../components/impersonation-banner";
import Link from "next/link";
import { colors, spacing } from "../../../styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";
import { usePathname } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { themeColors } = useTheme();
  const pathname = usePathname();

  const navItems = [
    { href: "/admin/overview", label: "Genel Bakış" },
    { href: "/admin/tenants", label: "Kiracılar" },
    { href: "/admin/users", label: "Kullanıcılar" },
    { href: "/admin/support", label: "Destek / Olaylar" },
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: themeColors.gray[50] }}>
      <ImpersonationBanner />
      <div style={{ display: "flex" }}>
        {/* Sidebar */}
        <aside
          style={{
            width: "250px",
            backgroundColor: themeColors.white,
            borderRight: `1px solid ${themeColors.border}`,
            padding: spacing.lg,
            minHeight: "calc(100vh - 60px)",
          }}
        >
          <h2
            style={{
              margin: `0 0 ${spacing.lg} 0`,
              fontSize: "18px",
              fontWeight: 600,
              color: themeColors.text.primary,
            }}
          >
            Yönetim Konsolu
          </h2>
          <nav style={{ display: "flex", flexDirection: "column", gap: spacing.xs }}>
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    padding: spacing.md,
                    textDecoration: "none",
                    color: isActive ? colors.primary : themeColors.text.secondary,
                    backgroundColor: isActive ? colors.primary + "10" : "transparent",
                    borderRadius: "4px",
                    fontWeight: isActive ? 600 : 400,
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = themeColors.gray[100];
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, padding: spacing.xxl }}>
          {children}
        </main>
      </div>
    </div>
  );
}
