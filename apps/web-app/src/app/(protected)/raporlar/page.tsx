"use client";

import Link from "next/link";
import { colors, spacing } from "../../../styles/design-system";

export default function ReportsPage() {
  return (
    <div style={{ padding: spacing.xxl }}>
      <div style={{ marginBottom: spacing.xxl }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: spacing.sm, color: colors.text.primary }}>
          Raporlar
        </h1>
        <p style={{ color: colors.text.secondary, fontSize: "16px" }}>
          Finansal özetler, risk analizleri ve aktivite raporları oluşturun ve yönetin.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: spacing.lg }}>
        <Link
          href="/raporlar/anlik"
          style={{
            textDecoration: "none",
            color: "inherit",
            display: "block",
            padding: spacing.xl,
            backgroundColor: colors.white,
            borderRadius: "8px",
            border: `1px solid ${colors.border}`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
          }}
        >
          <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: spacing.sm, color: colors.primary }}>
            Anlık Raporlar
          </h2>
          <p style={{ color: colors.text.secondary, fontSize: "14px", lineHeight: 1.6 }}>
            İstediğiniz zaman finansal özet, risk analizi ve aktivite raporları oluşturun. PDF veya Excel formatında indirin.
          </p>
        </Link>

        <Link
          href="/raporlar/zamanlanmis"
          style={{
            textDecoration: "none",
            color: "inherit",
            display: "block",
            padding: spacing.xl,
            backgroundColor: colors.white,
            borderRadius: "8px",
            border: `1px solid ${colors.border}`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
          }}
        >
          <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: spacing.sm, color: colors.primary }}>
            Zamanlanmış Raporlar
          </h2>
          <p style={{ color: colors.text.secondary, fontSize: "14px", lineHeight: 1.6 }}>
            Raporları otomatik olarak günlük, haftalık veya aylık olarak oluşturun ve e-posta ile gönderin.
          </p>
        </Link>
      </div>
    </div>
  );
}


