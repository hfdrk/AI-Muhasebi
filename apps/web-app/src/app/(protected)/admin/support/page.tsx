"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSupportIncidents } from "@repo/api-client";
import { colors, spacing, shadows } from "../../../../styles/design-system";

export default function AdminSupportPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [typeFilter, setTypeFilter] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-support-incidents", page, pageSize, typeFilter],
    queryFn: () =>
      getSupportIncidents({
        page,
        pageSize,
        type: typeFilter || undefined,
      }),
  });

  if (isLoading) {
    return <div style={{ textAlign: "center", padding: spacing.xxl }}>Yükleniyor...</div>;
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: spacing.xxl, color: colors.error || "#ef4444" }}>
        Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
      </div>
    );
  }

  const incidents = data?.data || [];
  const pagination = data?.meta.pagination;

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "SCHEDULED_REPORT":
        return "Zamanlanmış Rapor";
      case "INTEGRATION_SYNC":
        return "Entegrasyon";
      default:
        return "Sistem";
    }
  };

  if (incidents.length === 0 && !isLoading) {
    return (
      <div>
        <h1 style={{ marginBottom: spacing.xl, fontSize: "28px", fontWeight: 600, color: colors.text.primary }}>
          Destek / Olaylar
        </h1>
        <div
          style={{
            backgroundColor: colors.white,
            padding: spacing.xxl,
            borderRadius: "8px",
            boxShadow: shadows.sm,
            textAlign: "center",
            color: colors.text.secondary,
          }}
        >
          Gösterilecek olay bulunamadı.
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: spacing.xl, fontSize: "28px", fontWeight: 600, color: colors.text.primary }}>
        Destek / Olaylar
      </h1>

      {/* Filter */}
      <div style={{ marginBottom: spacing.lg }}>
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          style={{
            padding: spacing.md,
            border: `1px solid ${colors.border}`,
            borderRadius: "4px",
          }}
        >
          <option value="">Tüm Türler</option>
          <option value="SCHEDULED_REPORT">Zamanlanmış Rapor</option>
          <option value="INTEGRATION_SYNC">Entegrasyon</option>
          <option value="OTHER">Sistem</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: colors.white, borderRadius: "8px", boxShadow: shadows.sm, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: colors.gray[100] }}>
              <th style={{ padding: spacing.md, textAlign: "left", borderBottom: `1px solid ${colors.border}` }}>
                Tarih
              </th>
              <th style={{ padding: spacing.md, textAlign: "left", borderBottom: `1px solid ${colors.border}` }}>
                Kiracı
              </th>
              <th style={{ padding: spacing.md, textAlign: "left", borderBottom: `1px solid ${colors.border}` }}>
                Tür
              </th>
              <th style={{ padding: spacing.md, textAlign: "left", borderBottom: `1px solid ${colors.border}` }}>
                Mesaj
              </th>
              <th style={{ padding: spacing.md, textAlign: "left", borderBottom: `1px solid ${colors.border}` }}>
                Durum
              </th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((incident) => (
              <tr key={incident.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                <td style={{ padding: spacing.md }}>
                  {new Date(incident.createdAt).toLocaleString("tr-TR")}
                </td>
                <td style={{ padding: spacing.md }}>{incident.tenantName}</td>
                <td style={{ padding: spacing.md }}>{getTypeLabel(incident.type)}</td>
                <td style={{ padding: spacing.md }}>{incident.message}</td>
                <td style={{ padding: spacing.md }}>
                  <span
                    style={{
                      padding: `${spacing.xs} ${spacing.sm}`,
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: 500,
                      backgroundColor: (colors.error || "#ef4444") + "20",
                      color: colors.error || "#ef4444",
                    }}
                  >
                    {incident.status}
                  </span>
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
              border: `1px solid ${colors.border}`,
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
              border: `1px solid ${colors.border}`,
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
  );
}


