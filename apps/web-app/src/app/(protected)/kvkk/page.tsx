"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { kvkkClient, listTenantUsers } from "@repo/api-client";
import Link from "next/link";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { SkeletonTable } from "../../../components/ui/Skeleton";
import { colors, spacing, borderRadius, shadows, typography, transitions } from "../../../styles/design-system";

export default function KVKKDashboardPage() {
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
  const { data: usersData, isLoading: usersLoading } = useQuery({
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

  // Fetch data retention for selected user
  const { data: retentionData } = useQuery({
    queryKey: ["kvkk-retention", selectedUserId],
    queryFn: () => {
      if (!selectedUserId) return null;
      return kvkkClient.checkDataRetention(selectedUserId);
    },
    enabled: !!selectedUserId,
  });

  const consent = consentData?.data;
  const retention = retentionData?.data;

  if (usersLoading) {
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
        <Card variant="elevated">
          <div style={{ padding: spacing["3xl"], textAlign: "center" }}>
            <div
              style={{
                display: "inline-block",
                width: "48px",
                height: "48px",
                border: `4px solid ${colors.gray[200]}`,
                borderTopColor: colors.primary,
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                marginBottom: spacing.md,
              }}
            />
            <p
              style={{
                color: colors.text.muted,
                fontSize: typography.fontSize.sm,
                margin: 0,
              }}
            >
              <SkeletonTable rows={5} columns={4} />
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
        <h1
          style={{
            fontSize: typography.fontSize["3xl"],
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
            marginBottom: spacing.sm,
          }}
        >
          KVKK (Veri Koruma) Yönetimi
        </h1>
        <p
          style={{
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
            lineHeight: typography.lineHeight.relaxed,
            margin: 0,
          }}
        >
          Kişisel Verilerin Korunması Kanunu (KVKK) uyumluluğu için onay yönetimi, veri erişim talepleri ve ihlal yönetimi.
        </p>
      </div>

      {/* Quick Links */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: spacing.lg,
          marginBottom: spacing.xl,
        }}
      >
        <Card
          variant="elevated"
          hoverable
          onClick={() => (window.location.href = "/kvkk/onaylar")}
          style={{ cursor: "pointer" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: borderRadius.lg,
                backgroundColor: colors.primaryPastel,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                flexShrink: 0,
              }}
            >
              ✅
            </div>
            <div style={{ flex: 1 }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.text.primary,
                  marginBottom: spacing.xs,
                }}
              >
                Onay Yönetimi
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.sm,
                  color: colors.text.secondary,
                }}
              >
                Kullanıcı onaylarını görüntüle ve yönet
              </p>
            </div>
          </div>
        </Card>

        <Card
          variant="elevated"
          hoverable
          onClick={() => (window.location.href = "/kvkk/veri-erisim")}
          style={{ cursor: "pointer" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: borderRadius.lg,
                backgroundColor: colors.infoLight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                flexShrink: 0,
              }}
            >
              📥
            </div>
            <div style={{ flex: 1 }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.text.primary,
                  marginBottom: spacing.xs,
                }}
              >
                Veri Erişim Talepleri
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.sm,
                  color: colors.text.secondary,
                }}
              >
                Kullanıcı veri erişim taleplerini yönet
              </p>
            </div>
          </div>
        </Card>

        <Card
          variant="elevated"
          hoverable
          onClick={() => (window.location.href = "/kvkk/veri-silme")}
          style={{ cursor: "pointer" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: borderRadius.lg,
                backgroundColor: colors.dangerLight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                flexShrink: 0,
              }}
            >
              🗑️
            </div>
            <div style={{ flex: 1 }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.text.primary,
                  marginBottom: spacing.xs,
                }}
              >
                Veri Silme Talepleri
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.sm,
                  color: colors.text.secondary,
                }}
              >
                Kullanıcı veri silme taleplerini yönet
              </p>
            </div>
          </div>
        </Card>

        <Card
          variant="elevated"
          hoverable
          onClick={() => (window.location.href = "/kvkk/ihlaller")}
          style={{ cursor: "pointer" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: borderRadius.lg,
                backgroundColor: colors.warningLight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                flexShrink: 0,
              }}
            >
              ⚠️
            </div>
            <div style={{ flex: 1 }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.text.primary,
                  marginBottom: spacing.xs,
                }}
              >
                Veri İhlali Yönetimi
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.sm,
                  color: colors.text.secondary,
                }}
              >
                Veri ihlallerini kaydet ve yönet
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* User Selection & Consent Status */}
      <Card variant="elevated" title="Kullanıcı Seçimi ve Onay Durumu">
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

        {selectedUserId && (
          <div>
            {consentLoading ? (
              <div style={{ padding: spacing.lg, textAlign: "center" }}>
                <div
                  style={{
                    display: "inline-block",
                    width: "32px",
                    height: "32px",
                    border: `3px solid ${colors.gray[200]}`,
                    borderTopColor: colors.primary,
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
              </div>
            ) : consent ? (
              <div>
                <h4
                  style={{
                    margin: `0 0 ${spacing.md} 0`,
                    fontSize: typography.fontSize.base,
                    fontWeight: typography.fontWeight.semibold,
                    color: colors.text.primary,
                  }}
                >
                  Onay Durumu
                </h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: spacing.md,
                    marginBottom: spacing.md,
                  }}
                >
                  <div
                    style={{
                      padding: spacing.md,
                      borderRadius: borderRadius.md,
                      backgroundColor: consent.consents?.data_processing
                        ? colors.successLight
                        : colors.gray[50],
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
                      <span>{consent.consents?.data_processing ? "✅" : "❌"}</span>
                      <span
                        style={{
                          fontSize: typography.fontSize.sm,
                          fontWeight: typography.fontWeight.medium,
                          color: colors.text.primary,
                        }}
                      >
                        Veri İşleme
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      padding: spacing.md,
                      borderRadius: borderRadius.md,
                      backgroundColor: consent.consents?.marketing
                        ? colors.successLight
                        : colors.gray[50],
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
                      <span>{consent.consents?.marketing ? "✅" : "❌"}</span>
                      <span
                        style={{
                          fontSize: typography.fontSize.sm,
                          fontWeight: typography.fontWeight.medium,
                          color: colors.text.primary,
                        }}
                      >
                        Pazarlama
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      padding: spacing.md,
                      borderRadius: borderRadius.md,
                      backgroundColor: consent.consents?.analytics
                        ? colors.successLight
                        : colors.gray[50],
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
                      <span>{consent.consents?.analytics ? "✅" : "❌"}</span>
                      <span
                        style={{
                          fontSize: typography.fontSize.sm,
                          fontWeight: typography.fontWeight.medium,
                          color: colors.text.primary,
                        }}
                      >
                        Analitik
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      padding: spacing.md,
                      borderRadius: borderRadius.md,
                      backgroundColor: consent.consents?.third_party
                        ? colors.successLight
                        : colors.gray[50],
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
                      <span>{consent.consents?.third_party ? "✅" : "❌"}</span>
                      <span
                        style={{
                          fontSize: typography.fontSize.sm,
                          fontWeight: typography.fontWeight.medium,
                          color: colors.text.primary,
                        }}
                      >
                        Üçüncü Taraf
                      </span>
                    </div>
                  </div>
                </div>

                {retention && (
                  <div
                    style={{
                      padding: spacing.md,
                      borderRadius: borderRadius.md,
                      backgroundColor: colors.infoLight,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <h4
                      style={{
                        margin: `0 0 ${spacing.xs} 0`,
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.semibold,
                        color: colors.text.primary,
                      }}
                    >
                      Veri Saklama
                    </h4>
                    <p
                      style={{
                        margin: 0,
                        fontSize: typography.fontSize.sm,
                        color: colors.text.secondary,
                      }}
                    >
                      Saklama süresi: {retention.retentionPeriod} gün
                    </p>
                    <p
                      style={{
                        margin: `${spacing.xs} 0 0 0`,
                        fontSize: typography.fontSize.sm,
                        color: colors.text.secondary,
                      }}
                    >
                      Son geçerlilik:{" "}
                      {new Date(retention.expiresAt).toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                Onay bilgisi yüklenemedi.
              </p>
            )}
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
    </div>
  );
}

