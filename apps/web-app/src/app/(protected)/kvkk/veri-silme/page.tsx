"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { kvkkClient, listTenantUsers } from "@repo/api-client";
import { Card } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { Modal } from "../../../../components/ui/Modal";
import { PageTransition } from "../../../../components/ui/PageTransition";
import { colors, spacing, borderRadius, typography } from "../../../../styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "../../../../lib/toast";

const STATUS_LABELS: Record<string, string> = {
  pending: "Beklemede",
  processing: "İşleniyor",
  completed: "Tamamlandı",
  rejected: "Reddedildi",
};

export default function DataDeletionRequestsPage() {
  const { themeColors } = useTheme();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState(false);
  const queryClient = useQueryClient();

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

  // Fetch deletion requests history
  const { data: deletionRequestsData, isLoading: deletionRequestsLoading } = useQuery({
    queryKey: ["kvkk-data-deletion-requests"],
    queryFn: () => kvkkClient.listDataDeletionRequests(),
    enabled: !!tenantId,
  });

  const deletionRequests = deletionRequestsData?.data || [];

  // Create user map for display
  const userMap = new Map(users.map((user: any) => [user.id, user]));

  // Fetch data retention for selected user
  const { data: retentionData } = useQuery({
    queryKey: ["kvkk-retention", selectedUserId],
    queryFn: () => {
      if (!selectedUserId) return null;
      return kvkkClient.checkDataRetention(selectedUserId);
    },
    enabled: !!selectedUserId,
  });

  const retention = retentionData?.data;

  // Request data deletion mutation
  const requestDeletionMutation = useMutation({
    mutationFn: () => {
      if (!selectedUserId) throw new Error("Kullanıcı seçilmedi");
      return kvkkClient.requestDataDeletion(selectedUserId);
    },
    onSuccess: (_data) => {
      setConfirmModal(true);
      queryClient.invalidateQueries({ queryKey: ["kvkk-data-deletion"] });
      queryClient.invalidateQueries({ queryKey: ["kvkk-data-deletion-requests"] });
    },
    onError: (error: Error) => {
      toast.error(`Hata: ${error.message}`);
    },
  });

  return (
    <PageTransition>
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
          Veri Silme Talepleri
        </h1>
        <p
          style={{
            fontSize: typography.fontSize.base,
            color: themeColors.text.secondary,
            lineHeight: typography.lineHeight.relaxed,
            margin: 0,
          }}
        >
          Kullanıcıların veri silme taleplerini yönetin. KVKK kapsamında kullanıcılar kendi verilerinin silinmesini talep edebilir.
        </p>
      </div>

      {/* Warning Card */}
      <Card
        variant="outlined"
        style={{
          marginBottom: spacing.lg,
          backgroundColor: colors.dangerLight,
          borderColor: colors.danger,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: spacing.md }}>
          <span style={{ fontSize: typography.fontSize.xl, flexShrink: 0 }}>⚠️</span>
          <div>
            <p
              style={{
                margin: 0,
                fontSize: typography.fontSize.sm,
                color: themeColors.text.primary,
                fontWeight: typography.fontWeight.medium,
                marginBottom: spacing.xs,
              }}
            >
              Önemli Uyarı
            </p>
            <p
              style={{
                margin: 0,
                fontSize: typography.fontSize.sm,
                color: themeColors.text.secondary,
                lineHeight: typography.lineHeight.relaxed,
              }}
            >
              Veri silme işlemi geri alınamaz. Bu işlem kullanıcının tüm kişisel verilerini kalıcı olarak
              silecektir. Lütfen işlemi dikkatli bir şekilde gerçekleştirin.
            </p>
          </div>
        </div>
      </Card>

      {/* Request Data Deletion */}
      <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
        <h2
          style={{
            margin: `0 0 ${spacing.md} 0`,
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.semibold,
            color: themeColors.text.primary,
          }}
        >
          Yeni Veri Silme Talebi Oluştur
        </h2>
        <div style={{ marginBottom: spacing.md }}>
          <label
            style={{
              display: "block",
              marginBottom: spacing.sm,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              color: themeColors.text.primary,
            }}
          >
            Kullanıcı Seçin
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
            <option value="">Kullanıcı seçin...</option>
            {users.map((user: any) => (
              <option key={user.id} value={user.id}>
                {user.name || user.fullName} ({user.email})
              </option>
            ))}
          </select>
        </div>

        {retention && (
          <div
            style={{
              padding: spacing.md,
              borderRadius: borderRadius.md,
              backgroundColor: colors.infoLight,
              border: `1px solid ${themeColors.border}`,
              marginBottom: spacing.md,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: typography.fontSize.sm,
                color: themeColors.text.primary,
                fontWeight: typography.fontWeight.medium,
                marginBottom: spacing.xs,
              }}
            >
              Veri Saklama Bilgisi
            </p>
            <p
              style={{
                margin: 0,
                fontSize: typography.fontSize.sm,
                color: themeColors.text.secondary,
              }}
            >
              Saklama süresi: {retention.retentionPeriod} gün
            </p>
            <p
              style={{
                margin: `${spacing.xs} 0 0 0`,
                fontSize: typography.fontSize.sm,
                color: themeColors.text.secondary,
              }}
            >
              Son geçerlilik: {new Date(retention.expiresAt).toLocaleDateString("tr-TR")}
            </p>
          </div>
        )}

        <Button
          variant="danger"
          onClick={() => requestDeletionMutation.mutate()}
          loading={requestDeletionMutation.isPending}
          disabled={!selectedUserId}
        >
          🗑️ Veri Silme Talebi Oluştur
        </Button>
      </Card>

      {/* Info Card */}
      <Card
        variant="outlined"
        style={{
          marginBottom: spacing.lg,
          backgroundColor: colors.infoLight,
          borderColor: colors.info,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: spacing.md }}>
          <span style={{ fontSize: typography.fontSize.xl, flexShrink: 0 }}>ℹ️</span>
          <div>
            <p
              style={{
                margin: 0,
                fontSize: typography.fontSize.sm,
                color: themeColors.text.primary,
                fontWeight: typography.fontWeight.medium,
                marginBottom: spacing.xs,
              }}
            >
              KVKK Veri Silme Hakkı
            </p>
            <p
              style={{
                margin: 0,
                fontSize: typography.fontSize.sm,
                color: themeColors.text.secondary,
                lineHeight: typography.lineHeight.relaxed,
              }}
            >
              KVKK'nın 7. maddesi gereğince, kişiler kendi kişisel verilerinin silinmesini talep edebilir. Talep
              oluşturulduktan sonra, veriler yasal saklama süreleri dikkate alınarak silinir.
            </p>
          </div>
        </div>
      </Card>

      {/* Request History */}
      <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
        <h2
          style={{
            margin: `0 0 ${spacing.md} 0`,
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.semibold,
            color: themeColors.text.primary,
          }}
        >
          Talep Geçmişi
        </h2>
        {deletionRequestsLoading ? (
          <div style={{ padding: spacing.lg, textAlign: "center" }}>
            <p style={{ color: themeColors.text.secondary, margin: 0 }}>Yükleniyor...</p>
          </div>
        ) : deletionRequests.length === 0 ? (
          <div style={{ padding: spacing.lg, textAlign: "center" }}>
            <p style={{ color: themeColors.text.secondary, margin: 0 }}>
              Henüz veri silme talebi bulunmuyor.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: themeColors.gray[100], borderBottom: `1px solid ${themeColors.border}` }}>
                  <th style={{ padding: spacing.sm, textAlign: "left", fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>
                    Kullanıcı
                  </th>
                  <th style={{ padding: spacing.sm, textAlign: "left", fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>
                    Durum
                  </th>
                  <th style={{ padding: spacing.sm, textAlign: "left", fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>
                    Talep Tarihi
                  </th>
                  <th style={{ padding: spacing.sm, textAlign: "left", fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>
                    Tamamlanma Tarihi
                  </th>
                  <th style={{ padding: spacing.sm, textAlign: "left", fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>
                    Notlar
                  </th>
                </tr>
              </thead>
              <tbody>
                {deletionRequests.map((request: any) => {
                  const user = userMap.get(request.userId);
                  const statusColor =
                    request.status === "completed" ? colors.success
                    : request.status === "rejected" ? colors.danger
                    : request.status === "processing" ? colors.warning
                    : colors.info;

                  return (
                    <tr key={request.id || request.requestId} style={{ borderBottom: `1px solid ${themeColors.border}` }}>
                      <td style={{ padding: spacing.sm }}>
                        {user ? (
                          <div>
                            <div style={{ fontWeight: typography.fontWeight.medium }}>
                              {user.name || user.fullName}
                            </div>
                            <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.secondary }}>
                              {user.email}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: themeColors.text.secondary }}>Bilinmeyen Kullanıcı</span>
                        )}
                      </td>
                      <td style={{ padding: spacing.sm }}>
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: borderRadius.sm,
                            fontSize: typography.fontSize.xs,
                            backgroundColor: `${statusColor}20`,
                            color: statusColor,
                            fontWeight: typography.fontWeight.medium,
                          }}
                        >
                          {STATUS_LABELS[request.status] || request.status}
                        </span>
                      </td>
                      <td style={{ padding: spacing.sm, color: themeColors.text.secondary }}>
                        {new Date(request.requestedAt).toLocaleDateString("tr-TR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td style={{ padding: spacing.sm, color: themeColors.text.secondary }}>
                        {request.completedAt
                          ? new Date(request.completedAt).toLocaleDateString("tr-TR", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>
                      <td style={{ padding: spacing.sm, color: themeColors.text.secondary, maxWidth: "300px" }}>
                        {request.rejectionReason ? (
                          <div style={{ fontSize: typography.fontSize.xs }}>
                            <strong>Red Nedeni:</strong> {request.rejectionReason}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>

      <Modal
        isOpen={confirmModal}
        onClose={() => setConfirmModal(false)}
        title="Veri Silme Talebi Onayı"
        size="sm"
      >
        <div style={{ marginBottom: spacing.lg }}>
          <p>Veri silme talebi oluşturuldu. Bu işlem geri alınamaz. Devam etmek istediğinize emin misiniz?</p>
        </div>
        <div style={{ display: "flex", gap: spacing.md, justifyContent: "flex-end" }}>
          <Button variant="outline" onClick={() => setConfirmModal(false)}>
            İptal
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              toast.success("Veri silme talebi başarıyla oluşturuldu!");
              setConfirmModal(false);
            }}
          >
            Onayla
          </Button>
        </div>
      </Modal>
    </div>
    </PageTransition>
  );
}
