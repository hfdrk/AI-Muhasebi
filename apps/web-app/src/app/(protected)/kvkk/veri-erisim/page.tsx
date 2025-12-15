"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { kvkkClient, listTenantUsers } from "@repo/api-client";
import Link from "next/link";
import { Card } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { colors, spacing, borderRadius, shadows, typography, transitions } from "../../../../styles/design-system";
import { toast } from "../../../../lib/toast";

const STATUS_LABELS: Record<string, string> = {
  pending: "Beklemede",
  processing: "İşleniyor",
  completed: "Tamamlandı",
  rejected: "Reddedildi",
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: colors.warningLight, text: colors.warningDark },
  processing: { bg: colors.infoLight, text: colors.info },
  completed: { bg: colors.successLight, text: colors.successDark },
  rejected: { bg: colors.dangerLight, text: colors.dangerDark },
};

export default function DataAccessRequestsPage() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
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

  // Request data access mutation
  const requestAccessMutation = useMutation({
    mutationFn: () => {
      if (!selectedUserId) throw new Error("Kullanıcı seçilmedi");
      return kvkkClient.requestDataAccess(selectedUserId);
    },
    onSuccess: (data) => {
      toast.success("Veri erişim talebi başarıyla oluşturuldu!");
      console.log("Data Access Request:", data);
      queryClient.invalidateQueries({ queryKey: ["kvkk-data-access"] });
    },
    onError: (error: Error) => {
      toast.error(`Hata: ${error.message}`);
    },
  });

  return (
    <div
      style={{
        padding: spacing.xxl,
        maxWidth: "1600px",
        margin: "0 auto",
        backgroundColor: colors.gray[50],
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
            color: colors.text.primary,
            marginBottom: spacing.sm,
          }}
        >
          Veri Erişim Talepleri
        </h1>
        <p
          style={{
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
            lineHeight: typography.lineHeight.relaxed,
            margin: 0,
          }}
        >
          Kullanıcıların veri erişim taleplerini yönetin. KVKK kapsamında kullanıcılar kendi verilerine erişim talep edebilir.
        </p>
      </div>

      {/* Request New Access */}
      <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
        <h2
          style={{
            margin: `0 0 ${spacing.md} 0`,
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
          }}
        >
          Yeni Veri Erişim Talebi Oluştur
        </h2>
        <div style={{ marginBottom: spacing.md }}>
          <label
            style={{
              display: "block",
              marginBottom: spacing.sm,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              color: colors.text.primary,
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
              border: `1px solid ${colors.border}`,
              fontSize: typography.fontSize.base,
              backgroundColor: colors.white,
              color: colors.text.primary,
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
        <Button
          variant="primary"
          onClick={() => requestAccessMutation.mutate()}
          loading={requestAccessMutation.isPending}
          disabled={!selectedUserId}
        >
          📥 Veri Erişim Talebi Oluştur
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
                color: colors.text.primary,
                fontWeight: typography.fontWeight.medium,
                marginBottom: spacing.xs,
              }}
            >
              KVKK Veri Erişim Hakkı
            </p>
            <p
              style={{
                margin: 0,
                fontSize: typography.fontSize.sm,
                color: colors.text.secondary,
                lineHeight: typography.lineHeight.relaxed,
              }}
            >
              KVKK'nın 11. maddesi gereğince, kişiler kendi kişisel verilerine erişim talep edebilir. Talep
              oluşturulduktan sonra, kullanıcının verileri hazırlanır ve kullanıcıya sunulur.
            </p>
          </div>
        </div>
      </Card>

      {/* Request History Placeholder */}
      <Card variant="elevated" title="Talep Geçmişi">
        <div style={{ padding: spacing.lg, textAlign: "center" }}>
          <p style={{ color: colors.text.secondary, margin: 0 }}>
            Talep geçmişi özelliği yakında eklenecektir.
          </p>
        </div>
      </Card>

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

