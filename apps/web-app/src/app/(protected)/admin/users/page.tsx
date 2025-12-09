"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUsersOverview } from "@repo/api-client";
import { colors, spacing, shadows } from "../../../../styles/design-system";

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [emailFilter, setEmailFilter] = useState("");
  const [tenantIdFilter, setTenantIdFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-users", page, pageSize, emailFilter, tenantIdFilter, roleFilter],
    queryFn: () =>
      getUsersOverview({
        page,
        pageSize,
        email: emailFilter || undefined,
        tenantId: tenantIdFilter || undefined,
        role: roleFilter || undefined,
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

  const users = data?.data || [];
  const pagination = data?.meta.pagination;

  return (
    <div>
      <h1 style={{ marginBottom: spacing.xl, fontSize: "28px", fontWeight: 600, color: colors.text.primary }}>
        Kullanıcılar
      </h1>

      {/* Filters */}
      <div style={{ marginBottom: spacing.lg, display: "flex", gap: spacing.md, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="E-posta ara..."
          value={emailFilter}
          onChange={(e) => {
            setEmailFilter(e.target.value);
            setPage(1);
          }}
          style={{
            padding: spacing.md,
            border: `1px solid ${colors.border}`,
            borderRadius: "4px",
            flex: 1,
            maxWidth: "300px",
          }}
        />
        <input
          type="text"
          placeholder="Kiracı ID..."
          value={tenantIdFilter}
          onChange={(e) => {
            setTenantIdFilter(e.target.value);
            setPage(1);
          }}
          style={{
            padding: spacing.md,
            border: `1px solid ${colors.border}`,
            borderRadius: "4px",
            flex: 1,
            maxWidth: "300px",
          }}
        />
        <input
          type="text"
          placeholder="Rol..."
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          style={{
            padding: spacing.md,
            border: `1px solid ${colors.border}`,
            borderRadius: "4px",
            flex: 1,
            maxWidth: "300px",
          }}
        />
      </div>

      {/* Table */}
      <div style={{ backgroundColor: colors.white, borderRadius: "8px", boxShadow: shadows.sm, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: colors.gray[100] }}>
              <th style={{ padding: spacing.md, textAlign: "left", borderBottom: `1px solid ${colors.border}` }}>
                Ad Soyad
              </th>
              <th style={{ padding: spacing.md, textAlign: "left", borderBottom: `1px solid ${colors.border}` }}>
                E-posta
              </th>
              <th style={{ padding: spacing.md, textAlign: "left", borderBottom: `1px solid ${colors.border}` }}>
                Kiracılar
              </th>
              <th style={{ padding: spacing.md, textAlign: "left", borderBottom: `1px solid ${colors.border}` }}>
                Roller
              </th>
              <th style={{ padding: spacing.md, textAlign: "left", borderBottom: `1px solid ${colors.border}` }}>
                Son Giriş Zamanı
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                <td style={{ padding: spacing.md }}>{user.name}</td>
                <td style={{ padding: spacing.md }}>{user.email}</td>
                <td style={{ padding: spacing.md }}>
                  {user.tenantMemberships.length > 0
                    ? user.tenantMemberships.map((m) => m.tenantName).join(", ")
                    : "-"}
                </td>
                <td style={{ padding: spacing.md }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: spacing.xs }}>
                    {user.platformRoles.length > 0 && (
                      <div>
                        <span style={{ fontSize: "12px", color: colors.text.secondary }}>Platform: </span>
                        {user.platformRoles.join(", ")}
                      </div>
                    )}
                    {user.tenantMemberships.length > 0 && (
                      <div>
                        <span style={{ fontSize: "12px", color: colors.text.secondary }}>Kiracı: </span>
                        {user.tenantMemberships.map((m) => m.role).join(", ")}
                      </div>
                    )}
                  </div>
                </td>
                <td style={{ padding: spacing.md }}>
                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("tr-TR") : "Hiç giriş yapmamış"}
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

