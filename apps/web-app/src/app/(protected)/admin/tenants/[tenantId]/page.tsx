"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { getTenantDetail, updateTenantStatus } from "@repo/api-client";
import { colors, spacing, shadows } from "../../../../../styles/design-system";

export default function AdminTenantDetailPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const router = useRouter();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-tenant-detail", tenantId],
    queryFn: () => getTenantDetail(tenantId),
  });

  const handleStatusChange = async (newStatus: "ACTIVE" | "SUSPENDED") => {
    if (!confirm(`Kiracı durumunu "${newStatus === "ACTIVE" ? "Aktif" : "Askıya Alındı"}" olarak değiştirmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      await updateTenantStatus(tenantId, newStatus);
      refetch();
    } catch (error) {
      alert("Durum güncellenemedi: " + (error instanceof Error ? error.message : "Bilinmeyen hata"));
    }
  };

  if (isLoading) {
    return <div style={{ textAlign: "center", padding: spacing.xxl }}>Yükleniyor...</div>;
  }

  if (error || !data) {
    return (
      <div style={{ textAlign: "center", padding: spacing.xxl, color: colors.error || "#ef4444" }}>
        Hata: {error instanceof Error ? error.message : "Kiracı bulunamadı"}
      </div>
    );
  }

  const tenant = data.data;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xl }}>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 600, color: colors.text.primary }}>
          Kiracı Detayı: {tenant.name}
        </h1>
        <button
          onClick={() => router.back()}
          style={{
            padding: `${spacing.sm} ${spacing.md}`,
            border: `1px solid ${colors.border}`,
            borderRadius: "4px",
            cursor: "pointer",
            backgroundColor: colors.white,
          }}
        >
          Geri
        </button>
      </div>

      <div style={{ display: "grid", gap: spacing.lg }}>
        {/* Ofis Bilgileri */}
        <div style={{ backgroundColor: colors.white, padding: spacing.lg, borderRadius: "8px", boxShadow: shadows.sm }}>
          <h2 style={{ marginTop: 0, marginBottom: spacing.md, fontSize: "20px", fontWeight: 600 }}>
            Ofis Bilgileri
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: spacing.md }}>
            <div>
              <p style={{ margin: 0, fontSize: "12px", color: colors.text.secondary, marginBottom: spacing.xs }}>
                Ad
              </p>
              <p style={{ margin: 0, fontWeight: 500 }}>{tenant.name}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "12px", color: colors.text.secondary, marginBottom: spacing.xs }}>
                Slug
              </p>
              <p style={{ margin: 0, fontWeight: 500 }}>{tenant.slug}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "12px", color: colors.text.secondary, marginBottom: spacing.xs }}>
                Durum
              </p>
              <div style={{ display: "flex", gap: spacing.md, alignItems: "center" }}>
                <span
                  style={{
                    padding: `${spacing.xs} ${spacing.sm}`,
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: 500,
                    backgroundColor:
                      tenant.status === "ACTIVE"
                        ? (colors.success || "#10b981") + "20"
                        : (colors.warning || "#f59e0b") + "20",
                    color:
                      tenant.status === "ACTIVE"
                        ? colors.success || "#10b981"
                        : colors.warning || "#f59e0b",
                  }}
                >
                  {tenant.status === "ACTIVE" ? "Aktif" : "Askıya Alındı"}
                </span>
                <button
                  onClick={() => handleStatusChange(tenant.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE")}
                  style={{
                    padding: `${spacing.xs} ${spacing.sm}`,
                    backgroundColor: colors.primary,
                    color: colors.white,
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  Durumu Değiştir
                </button>
              </div>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "12px", color: colors.text.secondary, marginBottom: spacing.xs }}>
                Vergi Numarası
              </p>
              <p style={{ margin: 0, fontWeight: 500 }}>{tenant.taxNumber || "-"}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "12px", color: colors.text.secondary, marginBottom: spacing.xs }}>
                E-posta
              </p>
              <p style={{ margin: 0, fontWeight: 500 }}>{tenant.email || "-"}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "12px", color: colors.text.secondary, marginBottom: spacing.xs }}>
                Telefon
              </p>
              <p style={{ margin: 0, fontWeight: 500 }}>{tenant.phone || "-"}</p>
            </div>
          </div>
        </div>

        {/* Plan ve Kullanım */}
        <div style={{ backgroundColor: colors.white, padding: spacing.lg, borderRadius: "8px", boxShadow: shadows.sm }}>
          <h2 style={{ marginTop: 0, marginBottom: spacing.md, fontSize: "20px", fontWeight: 600 }}>
            Plan ve Kullanım
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: spacing.md }}>
            <div>
              <p style={{ margin: 0, fontSize: "12px", color: colors.text.secondary, marginBottom: spacing.xs }}>
                Plan
              </p>
              <p style={{ margin: 0, fontWeight: 500 }}>{tenant.billingPlan || "-"}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "12px", color: colors.text.secondary, marginBottom: spacing.xs }}>
                Müşteri Şirketler
              </p>
              <p style={{ margin: 0, fontWeight: 500 }}>{tenant.quotaUsage.clientCompanies}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "12px", color: colors.text.secondary, marginBottom: spacing.xs }}>
                Belgeler
              </p>
              <p style={{ margin: 0, fontWeight: 500 }}>{tenant.quotaUsage.documents}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "12px", color: colors.text.secondary, marginBottom: spacing.xs }}>
                Kullanıcılar
              </p>
              <p style={{ margin: 0, fontWeight: 500 }}>{tenant.quotaUsage.users}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "12px", color: colors.text.secondary, marginBottom: spacing.xs }}>
                Zamanlanmış Raporlar
              </p>
              <p style={{ margin: 0, fontWeight: 500 }}>{tenant.quotaUsage.scheduledReports}</p>
            </div>
          </div>
        </div>

        {/* Son Aktivite */}
        <div style={{ backgroundColor: colors.white, padding: spacing.lg, borderRadius: "8px", boxShadow: shadows.sm }}>
          <h2 style={{ marginTop: 0, marginBottom: spacing.md, fontSize: "20px", fontWeight: 600 }}>
            Son Aktivite
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: spacing.md }}>
            <div>
              <p style={{ margin: 0, fontSize: "12px", color: colors.text.secondary, marginBottom: spacing.xs }}>
                Son 7 Günde Risk Uyarıları
              </p>
              <p style={{ margin: 0, fontWeight: 500, color: colors.error || "#ef4444" }}>
                {tenant.recentRiskAlertsCount}
              </p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "12px", color: colors.text.secondary, marginBottom: spacing.xs }}>
                Son 7 Günde Başarısız Entegrasyonlar
              </p>
              <p style={{ margin: 0, fontWeight: 500, color: colors.error || "#ef4444" }}>
                {tenant.recentFailedIntegrationsCount}
              </p>
            </div>
          </div>
        </div>

        {/* Son Denetim Kayıtları */}
        {tenant.recentAuditEvents && tenant.recentAuditEvents.length > 0 && (
          <div style={{ backgroundColor: colors.white, padding: spacing.lg, borderRadius: "8px", boxShadow: shadows.sm }}>
            <h2 style={{ marginTop: 0, marginBottom: spacing.md, fontSize: "20px", fontWeight: 600 }}>
              Son Denetim Kayıtları
            </h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: colors.gray[100] }}>
                    <th style={{ padding: spacing.md, textAlign: "left", borderBottom: `1px solid ${colors.border}` }}>
                      Tarih
                    </th>
                    <th style={{ padding: spacing.md, textAlign: "left", borderBottom: `1px solid ${colors.border}` }}>
                      Kullanıcı
                    </th>
                    <th style={{ padding: spacing.md, textAlign: "left", borderBottom: `1px solid ${colors.border}` }}>
                      İşlem
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tenant.recentAuditEvents.map((event) => (
                    <tr key={event.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <td style={{ padding: spacing.md }}>
                        {new Date(event.createdAt).toLocaleString("tr-TR")}
                      </td>
                      <td style={{ padding: spacing.md }}>
                        {event.user ? `${event.user.fullName} (${event.user.email})` : "-"}
                      </td>
                      <td style={{ padding: spacing.md }}>{event.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

