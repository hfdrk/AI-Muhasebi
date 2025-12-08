"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listAuditLogs, getCurrentUser } from "@repo/api-client";
import { auditLogs as auditLogsI18n, common as commonI18n } from "@repo/i18n";
import { colors, spacing } from "@/styles/design-system";

export default function AuditLogsPage() {
  const [filters, setFilters] = useState({
    userId: "",
    action: "",
    resourceType: "",
    from: "",
    to: "",
  });
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data: userData } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => getCurrentUser(),
  });

  const { data: auditLogsData, isLoading, error } = useQuery({
    queryKey: ["auditLogs", filters, page],
    queryFn: () =>
      listAuditLogs({
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.action && { action: filters.action }),
        ...(filters.resourceType && { resourceType: filters.resourceType }),
        ...(filters.from && { from: filters.from }),
        ...(filters.to && { to: filters.to }),
        page,
        pageSize,
      }),
  });

  const currentUser = userData?.data;
  const currentTenant = currentUser?.tenants?.find((t: any) => t.status === "active");
  const userRole = currentTenant?.role;
  const canView = userRole === "TenantOwner" || userRole === "Accountant";

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filters change
  };

  const handleApplyFilters = () => {
    // Filters are applied automatically via query key
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters({
      userId: "",
      action: "",
      resourceType: "",
      from: "",
      to: "",
    });
    setPage(1);
  };

  if (!canView) {
    return (
      <div style={{ padding: spacing.xxl }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: spacing.lg, color: colors.text.primary }}>
          Denetim Kayıtları
        </h1>
        <div
          style={{
            padding: spacing.xl,
            backgroundColor: colors.white,
            borderRadius: "8px",
            border: `1px solid ${colors.border}`,
          }}
        >
          <p style={{ color: colors.text.secondary }}>Bu sayfayı görüntüleme yetkiniz yok.</p>
        </div>
      </div>
    );
  }

  const auditLogs = auditLogsData?.data || [];
  const meta = auditLogsData?.meta;
  const totalPages = meta?.totalPages || 1;

  return (
    <div style={{ padding: spacing.xxl }}>
      <div style={{ marginBottom: spacing.xxl }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: spacing.sm, color: colors.text.primary }}>
          Denetim Kayıtları
        </h1>
        <p style={{ color: colors.text.secondary, fontSize: "16px" }}>
          Sistemdeki tüm işlem kayıtlarını görüntüleyin ve filtreleyin.
        </p>
      </div>

      <div
        style={{
          padding: spacing.xl,
          backgroundColor: colors.white,
          borderRadius: "8px",
          border: `1px solid ${colors.border}`,
          marginBottom: spacing.lg,
        }}
      >
        <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: spacing.lg, color: colors.text.primary }}>
          Filtreler
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: spacing.md }}>
          <div>
            <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: 500, fontSize: "14px" }}>
              Kullanıcı
            </label>
            <input
              type="text"
              value={filters.userId}
              onChange={(e) => handleFilterChange("userId", e.target.value)}
              placeholder="Kullanıcı ID"
              style={{
                width: "100%",
                padding: spacing.sm,
                border: `1px solid ${colors.border}`,
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: 500, fontSize: "14px" }}>
              İşlem Türü
            </label>
            <input
              type="text"
              value={filters.action}
              onChange={(e) => handleFilterChange("action", e.target.value)}
              placeholder="LOGIN_SUCCESS, DOCUMENT_UPLOADED..."
              style={{
                width: "100%",
                padding: spacing.sm,
                border: `1px solid ${colors.border}`,
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: 500, fontSize: "14px" }}>
              Kaynak Türü
            </label>
            <input
              type="text"
              value={filters.resourceType}
              onChange={(e) => handleFilterChange("resourceType", e.target.value)}
              placeholder="Document, Invoice..."
              style={{
                width: "100%",
                padding: spacing.sm,
                border: `1px solid ${colors.border}`,
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: 500, fontSize: "14px" }}>
              Başlangıç Tarihi
            </label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => handleFilterChange("from", e.target.value)}
              style={{
                width: "100%",
                padding: spacing.sm,
                border: `1px solid ${colors.border}`,
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: 500, fontSize: "14px" }}>
              Bitiş Tarihi
            </label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => handleFilterChange("to", e.target.value)}
              style={{
                width: "100%",
                padding: spacing.sm,
                border: `1px solid ${colors.border}`,
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: spacing.md, marginTop: spacing.lg }}>
          <button
            onClick={handleApplyFilters}
            style={{
              padding: `${spacing.sm} ${spacing.lg}`,
              backgroundColor: colors.primary,
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Filtreleri Uygula
          </button>
          <button
            onClick={handleClearFilters}
            style={{
              padding: `${spacing.sm} ${spacing.lg}`,
              backgroundColor: colors.gray[200],
              color: colors.text.primary,
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Temizle
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: spacing.md,
            marginBottom: spacing.lg,
            backgroundColor: "#f8d7da",
            color: "#721c24",
            borderRadius: "4px",
            border: "1px solid #f5c6cb",
          }}
        >
          Denetim kayıtları yüklenirken bir hata oluştu.
        </div>
      )}

      {isLoading ? (
        <div style={{ padding: spacing.xxl, textAlign: "center" }}>{commonI18n.labels.loading}</div>
      ) : auditLogs.length === 0 ? (
        <div
          style={{
            padding: spacing.xxl,
            textAlign: "center",
            backgroundColor: colors.white,
            borderRadius: "8px",
            border: `1px solid ${colors.border}`,
          }}
        >
          <p style={{ color: colors.text.secondary }}>{auditLogsI18n.empty}</p>
        </div>
      ) : (
        <>
          <div
            style={{
              backgroundColor: colors.white,
              borderRadius: "8px",
              border: `1px solid ${colors.border}`,
              overflow: "hidden",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: colors.gray[50], borderBottom: `1px solid ${colors.border}` }}>
                  <th style={{ padding: spacing.md, textAlign: "left", fontWeight: 600, fontSize: "14px" }}>Tarih</th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontWeight: 600, fontSize: "14px" }}>Kullanıcı</th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontWeight: 600, fontSize: "14px" }}>İşlem</th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontWeight: 600, fontSize: "14px" }}>
                    Kaynak Türü
                  </th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontWeight: 600, fontSize: "14px" }}>
                    Kaynak ID
                  </th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontWeight: 600, fontSize: "14px" }}>
                    IP Adresi
                  </th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log: any) => (
                  <tr key={log.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: spacing.md, fontSize: "14px" }}>
                      {new Date(log.createdAt).toLocaleString("tr-TR")}
                    </td>
                    <td style={{ padding: spacing.md, fontSize: "14px" }}>
                      {log.user ? `${log.user.name} (${log.user.email})` : "-"}
                    </td>
                    <td style={{ padding: spacing.md, fontSize: "14px" }}>{log.action}</td>
                    <td style={{ padding: spacing.md, fontSize: "14px" }}>{log.resourceType || "-"}</td>
                    <td style={{ padding: spacing.md, fontSize: "14px" }}>{log.resourceId || "-"}</td>
                    <td style={{ padding: spacing.md, fontSize: "14px" }}>{log.ipAddress || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: spacing.md, marginTop: spacing.lg }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: `${spacing.sm} ${spacing.md}`,
                  backgroundColor: page === 1 ? colors.gray[200] : colors.primary,
                  color: page === 1 ? colors.text.secondary : "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: page === 1 ? "not-allowed" : "pointer",
                }}
              >
                Önceki
              </button>
              <span style={{ padding: `${spacing.sm} ${spacing.md}`, display: "flex", alignItems: "center" }}>
                Sayfa {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding: `${spacing.sm} ${spacing.md}`,
                  backgroundColor: page === totalPages ? colors.gray[200] : colors.primary,
                  color: page === totalPages ? colors.text.secondary : "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: page === totalPages ? "not-allowed" : "pointer",
                }}
              >
                Sonraki
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}


