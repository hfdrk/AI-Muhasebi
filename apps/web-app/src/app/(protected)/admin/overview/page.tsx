"use client";

import { useQuery } from "@tanstack/react-query";
import { getPlatformMetrics } from "@repo/api-client";
import { colors, spacing, shadows } from "../../../../styles/design-system";

export default function AdminOverviewPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: () => getPlatformMetrics(),
  });

  const metrics = data?.data;

  const metricCards = [
    { label: "Toplam Kiracı", value: metrics?.total_tenants ?? 0, color: colors.primary },
    { label: "Aktif Kiracı", value: metrics?.active_tenants ?? 0, color: colors.success || "#10b981" },
    { label: "Askıya Alınan Kiracı", value: metrics?.suspended_tenants ?? 0, color: colors.warning || "#f59e0b" },
    { label: "Toplam Kullanıcı", value: metrics?.total_users ?? 0, color: colors.primary },
    { label: "Toplam Müşteri Şirket", value: metrics?.total_client_companies ?? 0, color: colors.info || "#3b82f6" },
    { label: "Toplam Belge", value: metrics?.total_documents ?? 0, color: colors.info || "#3b82f6" },
    { label: "Toplam Fatura", value: metrics?.total_invoices ?? 0, color: colors.info || "#3b82f6" },
    { label: "Son 7 Günde Risk Uyarıları", value: metrics?.total_risk_alerts_last_7_days ?? 0, color: colors.error || "#ef4444" },
    { label: "Son 7 Günde Başarısız Entegrasyonlar", value: metrics?.total_failed_integrations_last_7_days ?? 0, color: colors.error || "#ef4444" },
  ];

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: spacing.xxl }}>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: spacing.xxl }}>
        <p style={{ color: colors.error || "#ef4444" }}>
          Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: spacing.xl, fontSize: "28px", fontWeight: 600, color: colors.text.primary }}>
        Yönetim Konsolu - Genel Bakış
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
          gap: spacing.lg,
        }}
      >
        {metricCards.map((card, index) => (
          <div
            key={index}
            style={{
              backgroundColor: colors.white,
              padding: spacing.lg,
              borderRadius: "8px",
              boxShadow: shadows.sm,
              borderLeft: `4px solid ${card.color}`,
            }}
          >
            <p style={{ margin: 0, fontSize: "14px", color: colors.text.secondary, marginBottom: spacing.xs }}>
              {card.label}
            </p>
            <p style={{ margin: 0, fontSize: "32px", fontWeight: 700, color: colors.text.primary }}>
              {card.value.toLocaleString("tr-TR")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}


