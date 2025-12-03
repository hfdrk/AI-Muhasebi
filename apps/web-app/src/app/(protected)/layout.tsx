"use client";

import { TenantSwitcher } from "../../components/tenant-switcher";
import Link from "next/link";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <header
        style={{
          padding: "16px 40px",
          borderBottom: "1px solid #ddd",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Link href="/dashboard" style={{ textDecoration: "none", color: "inherit" }}>
          <h1 style={{ margin: 0 }}>AI Muhasebi</h1>
        </Link>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <TenantSwitcher />
          <Link href="/settings/users" style={{ textDecoration: "none", color: "#0066cc" }}>
            Kullanıcı Yönetimi
          </Link>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

