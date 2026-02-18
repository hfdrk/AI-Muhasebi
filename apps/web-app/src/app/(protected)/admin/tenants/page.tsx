"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { getTenantsOverview, startImpersonation } from "@repo/api-client";
import { Card } from "../../../../components/ui/Card";
import { SkeletonTable } from "../../../../components/ui/Skeleton";
import { PageTransition } from "../../../../components/ui/PageTransition";
import { colors, spacing, shadows } from "../../../../styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "../../../../lib/toast";

export default function AdminTenantsPage() {
  const { themeColors } = useTheme();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-tenants", page, pageSize, statusFilter, search],
    queryFn: () => getTenantsOverview({ page, pageSize, status: statusFilter || undefined, search: search || undefined }),
  });

  const handleImpersonate = async (tenantId: string, userEmail?: string) => {
    try {
      const response = await startImpersonation({
        targetTenantId: tenantId,
        targetUserEmail: userEmail,
      });

      // Store impersonation token in sessionStorage (not localStorage)
      // sessionStorage is tab-scoped and cleared when the tab closes, reducing XSS risk
      if (response.data.impersonationToken) {
        sessionStorage.setItem("impersonationToken", response.data.impersonationToken);
        toast.success("İmpersonasyon başlatıldı. Yönlendiriliyorsunuz...");
        // Redirect to dashboard with impersonation context
        window.location.href = "/dashboard";
      }
    } catch (error) {
      console.error("Impersonation failed:", error);
      toast.error("İmpersonasyon başlatılamadı: " + (error instanceof Error ? error.message : "Bilinmeyen hata"));
    }
  };

  if (isLoading) {
    return (
      <PageTransition>
        <Card>
          <div style={{ padding: spacing.lg }}>
            <SkeletonTable rows={5} columns={6} />
          </div>
        </Card>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: spacing.xxl, color: colors.error }}>
        Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
      </div>
    );
  }

  const tenants = data?.data || [];
  const pagination = data?.meta.pagination;

  return (
    <PageTransition>
      <div>
      <h1 style={{ marginBottom: spacing.xl, fontSize: "28px", fontWeight: 600, color: themeColors.text.primary }}>
        Kiracılar
      </h1>

      {/* Filters */}
      <div style={{ marginBottom: spacing.lg, display: "flex", gap: spacing.md, alignItems: "center" }}>
        <input
          type="text"
          placeholder="Ara (ofis adı, slug)..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{
            padding: spacing.md,
            border: `1px solid ${themeColors.border}`,
            borderRadius: "4px",
            flex: 1,
            maxWidth: "300px",
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          style={{
            padding: spacing.md,
            border: `1px solid ${themeColors.border}`,
            borderRadius: "4px",
          }}
        >
          <option value="">Tüm Durumlar</option>
          <option value="ACTIVE">Aktif</option>
          <option value="SUSPENDED">Askıya Alındı</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: themeColors.white, borderRadius: "8px", boxShadow: shadows.sm, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: themeColors.gray[100] }}>
              <th style={{ padding: spacing.md, textAlign: "left", borderBottom: `1px solid ${themeColors.border}` }}>
                Ofis Adı
              </th>
              <th style={{ padding: spacing.md, textAlign: "left", borderBottom: `1px solid ${themeColors.border}` }}>
                Slug
              </th>
              <th style={{ padding: spacing.md, textAlign: "left", borderBottom: `1px solid ${themeColors.border}` }}>
                Durum
              </th>
              <th style={{ padding: spacing.md, textAlign: "left", borderBottom: `1px solid ${themeColors.border}` }}>
                Plan
              </th>
              <th style={{ padding: spacing.md, textAlign: "left", borderBottom: `1px solid ${themeColors.border}` }}>
                Kullanıcı Sayısı
              </th>
              <th style={{ padding: spacing.md, textAlign: "left", borderBottom: `1px solid ${themeColors.border}` }}>
                Müşteri Şirket Sayısı
              </th>
              <th style={{ padding: spacing.md, textAlign: "left", borderBottom: `1px solid ${themeColors.border}` }}>
                Oluşturulma Tarihi
              </th>
              <th style={{ padding: spacing.md, textAlign: "left", borderBottom: `1px solid ${themeColors.border}` }}>
                İşlemler
              </th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr key={tenant.id} style={{ borderBottom: `1px solid ${themeColors.border}` }}>
                <td style={{ padding: spacing.md }}>{tenant.name}</td>
                <td style={{ padding: spacing.md }}>{tenant.slug}</td>
                <td style={{ padding: spacing.md }}>
                  <span
                    style={{
                      padding: `${spacing.xs} ${spacing.sm}`,
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: 500,
                      backgroundColor:
                        tenant.status === "ACTIVE"
                          ? (colors.success || colors.success) + "20"
                          : (colors.warning || colors.warning) + "20",
                      color:
                        tenant.status === "ACTIVE"
                          ? colors.success || colors.success
                          : colors.warning || colors.warning,
                    }}
                  >
                    {tenant.status === "ACTIVE" ? "Aktif" : "Askıya Alındı"}
                  </span>
                </td>
                <td style={{ padding: spacing.md }}>{tenant.billingPlan || "-"}</td>
                <td style={{ padding: spacing.md }}>{tenant.userCount}</td>
                <td style={{ padding: spacing.md }}>{tenant.clientCompanyCount}</td>
                <td style={{ padding: spacing.md }}>
                  {new Date(tenant.createdAt).toLocaleDateString("tr-TR")}
                </td>
                <td style={{ padding: spacing.md }}>
                  <div style={{ display: "flex", gap: spacing.xs }}>
                    <button
                      onClick={() => router.push(`/admin/tenants/${tenant.id}`)}
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
                      Detay
                    </button>
                    <button
                      onClick={() => handleImpersonate(tenant.id)}
                      style={{
                        padding: `${spacing.xs} ${spacing.sm}`,
                        backgroundColor: colors.info || colors.info,
                        color: colors.white,
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                    >
                      İmpersonasyon Başlat
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div style={{ marginTop: spacing.lg, display: "flex", justifyContent: "center", gap: spacing.md }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: `${spacing.sm} ${spacing.md}`,
              border: `1px solid ${themeColors.border}`,
              borderRadius: "4px",
              cursor: page === 1 ? "not-allowed" : "pointer",
              opacity: page === 1 ? 0.5 : 1,
            }}
          >
            Önceki
          </button>
          <span style={{ padding: `${spacing.sm} ${spacing.md}`, alignSelf: "center" }}>
            Sayfa {page} / {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages}
            style={{
              padding: `${spacing.sm} ${spacing.md}`,
              border: `1px solid ${themeColors.border}`,
              borderRadius: "4px",
              cursor: page === pagination.totalPages ? "not-allowed" : "pointer",
              opacity: page === pagination.totalPages ? 0.5 : 1,
            }}
          >
            Sonraki
          </button>
        </div>
      )}
    </div>
    </PageTransition>
  );
}
