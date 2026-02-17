"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { kvkkClient, listTenantUsers } from "@repo/api-client";
import { Card } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { colors, spacing, borderRadius, typography } from "../../../../styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";

export default function KVKKAuditLogPage() {
  const { themeColors } = useTheme();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Get current tenant
  const { data: userData } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const { getCurrentUser } = await import("@repo/api-client");
      return getCurrentUser();
    },
  });

  const currentTenant = userData?.data?.tenants?.find((t: any) => t.status === "active");
  const tenantId = currentTenant?.id;

  // Fetch tenant users
  const { data: usersData } = useQuery({
    queryKey: ["tenantUsers", tenantId],
    queryFn: () => (tenantId ? listTenantUsers(tenantId) : Promise.resolve({ data: [] })),
    enabled: !!tenantId,
  });

  const users = usersData?.data || [];

  // Fetch audit log
  const { data: auditLogData, isLoading: auditLogLoading } = useQuery({
    queryKey: ["kvkk-audit-log", selectedUserId],
    queryFn: () => kvkkClient.getDataAccessAuditLog(selectedUserId || undefined),
  });

  const auditLogs = auditLogData?.data || [];

  return (
    <div
      style={{
        padding: spacing.xxl,
        maxWidth: "1600px",
        margin: "0 auto",
        backgroundColor: themeColors.gray[50],
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <div
        style={{
          marginBottom: spacing.xl,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: spacing.md, marginBottom: spacing.sm }}>
          <Button variant="ghost" asLink href="/kvkk" icon="←">
            Geri
          </Button>
        </div>
        <h1
          style={{
            fontSize: typography.fontSize["3xl"],
            fontWeight: typography.fontWeight.bold,
            color: themeColors.text.primary,
            marginBottom: spacing.sm,
          }}
        >
          KVKK Denetim Kayıtları
        </h1>
        <p
          style={{
            fontSize: typography.fontSize.base,
            color: themeColors.text.secondary,
            lineHeight: typography.lineHeight.relaxed,
            margin: 0,
          }}
        >
          Veri erişim ve işleme işlemlerinin denetim kayıtlarını görüntüleyin. KVKK gereğince tüm veri işleme
          faaliyetleri kayıt altına alınmalıdır.
        </p>
      </div>

      {/* User Filter */}
      <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
        <div>
          <label
            style={{
              display: "block",
              marginBottom: spacing.sm,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              color: themeColors.text.primary,
            }}
          >
            Kullanıcı Filtresi (Opsiyonel)
          </label>
          <select
            value={selectedUserId || ""}
            onChange={(e) => setSelectedUserId(e.target.value || null)}
            style={{
              width: "100%",
              maxWidth: "400px",
              padding: spacing.sm,
              borderRadius: borderRadius.md,
              border: `1px solid ${themeColors.border}`,
              fontSize: typography.fontSize.base,
              backgroundColor: themeColors.white,
              color: themeColors.text.primary,
            }}
          >
            <option value="">Tüm kullanıcılar</option>
            {users.map((user: any) => (
              <option key={user.id} value={user.id}>
                {user.name || user.fullName} ({user.email})
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Audit Log */}
      {auditLogLoading ? (
        <Card variant="elevated">
          <div style={{ padding: spacing.xl, textAlign: "center" }}>
            <div
              style={{
                display: "inline-block",
                width: "48px",
                height: "48px",
                border: `4px solid ${themeColors.gray[200]}`,
                borderTopColor: colors.primary,
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
          </div>
        </Card>
      ) : auditLogs.length === 0 ? (
        <Card variant="elevated">
          <div style={{ padding: spacing.xl, textAlign: "center" }}>
            <p style={{ color: themeColors.text.secondary, margin: 0 }}>
              Denetim kaydı bulunmamaktadır.
            </p>
          </div>
        </Card>
      ) : (
        <Card variant="elevated" title={`Denetim Kayıtları (${auditLogs.length})`}>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr style={{ borderBottom: `2px solid ${themeColors.border}` }}>
                  <th
                    style={{
                      padding: spacing.md,
                      textAlign: "left",
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.semibold,
                      color: themeColors.text.primary,
                    }}
                  >
                    Tarih/Saat
                  </th>
                  <th
                    style={{
                      padding: spacing.md,
                      textAlign: "left",
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.semibold,
                      color: themeColors.text.primary,
                    }}
                  >
                    Kullanıcı
                  </th>
                  <th
                    style={{
                      padding: spacing.md,
                      textAlign: "left",
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.semibold,
                      color: themeColors.text.primary,
                    }}
                  >
                    İşlem
                  </th>
                  <th
                    style={{
                      padding: spacing.md,
                      textAlign: "left",
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.semibold,
                      color: themeColors.text.primary,
                    }}
                  >
                    Detaylar
                  </th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log: any) => (
                  <tr
                    key={log.logId}
                    style={{
                      borderBottom: `1px solid ${themeColors.border}`,
                    }}
                  >
                    <td style={{ padding: spacing.md }}>
                      {new Date(log.timestamp).toLocaleString("tr-TR")}
                    </td>
                    <td style={{ padding: spacing.md }}>
                      {users.find((u: any) => u.id === log.userId)?.name ||
                        users.find((u: any) => u.id === log.userId)?.fullName ||
                        log.userId}
                    </td>
                    <td style={{ padding: spacing.md }}>
                      <span
                        style={{
                          padding: `${spacing.xs} ${spacing.sm}`,
                          borderRadius: borderRadius.sm,
                          backgroundColor: colors.primaryPastel,
                          color: colors.primary,
                          fontSize: typography.fontSize.xs,
                          fontWeight: typography.fontWeight.medium,
                        }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: spacing.md }}>
                      {log.details ? (
                        <details>
                          <summary
                            style={{
                              cursor: "pointer",
                              color: themeColors.text.secondary,
                              fontSize: typography.fontSize.sm,
                            }}
                          >
                            Detayları göster
                          </summary>
                          <pre
                            style={{
                              marginTop: spacing.xs,
                              padding: spacing.sm,
                              backgroundColor: themeColors.gray[50],
                              borderRadius: borderRadius.md,
                              fontSize: typography.fontSize.xs,
                              overflow: "auto",
                            }}
                          >
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        <span style={{ color: themeColors.text.secondary, fontSize: typography.fontSize.sm }}>
                          -
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
