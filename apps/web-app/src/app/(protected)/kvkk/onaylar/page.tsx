"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { kvkkClient, listTenantUsers } from "@repo/api-client";
import { Card } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { colors, spacing, borderRadius, typography } from "../../../../styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "../../../../lib/toast";

const CONSENT_TYPE_LABELS: Record<string, string> = {
  data_processing: "Veri İşleme",
  marketing: "Pazarlama",
  analytics: "Analitik",
  third_party: "Üçüncü Taraf",
};

export default function ConsentManagementPage() {
  const { themeColors } = useTheme();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [consentType, setConsentType] = useState<
    "data_processing" | "marketing" | "analytics" | "third_party" | ""
  >("");
  const [granted, setGranted] = useState<boolean>(true);

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

  // Fetch consent status for selected user
  const { data: consentData, isLoading: consentLoading } = useQuery({
    queryKey: ["kvkk-consent", selectedUserId],
    queryFn: () => {
      if (!selectedUserId) return null;
      return kvkkClient.getConsentStatus(selectedUserId);
    },
    enabled: !!selectedUserId,
  });

  const consent = consentData?.data;

  // Record consent mutation
  const recordConsentMutation = useMutation({
    mutationFn: () => {
      if (!selectedUserId || !consentType) {
        throw new Error("Kullanıcı ve onay türü seçilmelidir");
      }
      return kvkkClient.recordConsent(
        selectedUserId,
        consentType as "data_processing" | "marketing" | "analytics" | "third_party",
        granted
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kvkk-consent", selectedUserId] });
      toast.success("Onay başarıyla kaydedildi!");
      setConsentType("");
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
          Onay Yönetimi
        </h1>
        <p
          style={{
            fontSize: typography.fontSize.base,
            color: themeColors.text.secondary,
            lineHeight: typography.lineHeight.relaxed,
            margin: 0,
          }}
        >
          Kullanıcıların veri işleme onaylarını görüntüleyin ve yönetin.
        </p>
      </div>

      {/* User Selection */}
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
      </Card>

      {selectedUserId && (
        <>
          {/* Current Consent Status */}
          {consentLoading ? (
            <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
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
          ) : consent ? (
            <Card variant="elevated" title="Mevcut Onay Durumu" style={{ marginBottom: spacing.lg }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: spacing.md,
                }}
              >
                {consent.consents && Object.keys(consent.consents).length > 0 ? (
                  Object.entries(consent.consents).map(([type, granted]) => (
                    <div
                      key={type}
                      style={{
                        padding: spacing.md,
                        borderRadius: borderRadius.md,
                        backgroundColor: granted ? colors.successLight : themeColors.gray[50],
                        border: `1px solid ${themeColors.border}`,
                        borderLeft: `4px solid ${granted ? colors.success : themeColors.gray[400]}`,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
                        <span style={{ fontSize: "20px" }}>{granted ? "✅" : "❌"}</span>
                        <div>
                          <p
                            style={{
                              margin: 0,
                              fontSize: typography.fontSize.base,
                              fontWeight: typography.fontWeight.semibold,
                              color: themeColors.text.primary,
                            }}
                          >
                            {CONSENT_TYPE_LABELS[type] || type}
                          </p>
                          <p
                            style={{
                              margin: `${spacing.xs} 0 0 0`,
                              fontSize: typography.fontSize.sm,
                              color: themeColors.text.secondary,
                            }}
                          >
                            {granted ? "Onay verildi" : "Onay verilmedi"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      padding: spacing.xl,
                      textAlign: "center",
                      color: themeColors.text.secondary,
                    }}
                  >
                    <p style={{ margin: 0, fontSize: typography.fontSize.sm }}>
                      Henüz onay kaydı bulunmuyor.
                    </p>
                  </div>
                )}
              </div>
            </Card>
          ) : null}

          {/* Record New Consent */}
          <Card variant="elevated" title="Yeni Onay Kaydet">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: spacing.md,
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: spacing.xs,
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    color: themeColors.text.primary,
                  }}
                >
                  Onay Türü
                </label>
                <select
                  value={consentType}
                  onChange={(e) =>
                    setConsentType(
                      (e.target.value as typeof consentType) || ""
                    )
                  }
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
                  <option value="">Onay türü seçin...</option>
                  <option value="data_processing">Veri İşleme</option>
                  <option value="marketing">Pazarlama</option>
                  <option value="analytics">Analitik</option>
                  <option value="third_party">Üçüncü Taraf</option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: spacing.xs,
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    color: themeColors.text.primary,
                  }}
                >
                  Onay Durumu
                </label>
                <div style={{ display: "flex", gap: spacing.md }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: spacing.sm,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      checked={granted === true}
                      onChange={() => setGranted(true)}
                      style={{ cursor: "pointer" }}
                    />
                    <span>Onay Verildi</span>
                  </label>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: spacing.sm,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      checked={granted === false}
                      onChange={() => setGranted(false)}
                      style={{ cursor: "pointer" }}
                    />
                    <span>Onay İptal Edildi</span>
                  </label>
                </div>
              </div>

              <div>
                <Button
                  variant="primary"
                  onClick={() => recordConsentMutation.mutate()}
                  loading={recordConsentMutation.isPending}
                  disabled={!consentType}
                >
                  💾 Onayı Kaydet
                </Button>
              </div>
            </div>
          </Card>
        </>
      )}

      {!selectedUserId && (
        <Card variant="elevated">
          <div style={{ padding: spacing.xl, textAlign: "center" }}>
            <p style={{ color: themeColors.text.secondary, margin: 0 }}>
              Lütfen onay yönetimi için bir kullanıcı seçin.
            </p>
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
