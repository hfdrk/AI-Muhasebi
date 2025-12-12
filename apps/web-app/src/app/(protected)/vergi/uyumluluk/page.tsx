"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { taxClient, listClientCompanies } from "@repo/api-client";
import Link from "next/link";
import { Card } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { colors, spacing, borderRadius, shadows, typography, transitions } from "../../../../styles/design-system";

export default function TaxCompliancePage() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Fetch client companies
  const { data: clientsData } = useQuery({
    queryKey: ["client-companies"],
    queryFn: () => listClientCompanies({ pageSize: 100 }),
  });

  const clients = clientsData?.data.data || [];

  // Fetch compliance status
  const { data: complianceData, isLoading: complianceLoading } = useQuery({
    queryKey: ["tax-compliance", selectedClientId],
    queryFn: () => {
      if (!selectedClientId) return null;
      return taxClient.checkCompliance(selectedClientId);
    },
    enabled: !!selectedClientId,
  });

  const compliance = complianceData?.data;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return colors.danger;
      case "medium":
        return colors.warning;
      case "low":
        return colors.info;
      default:
        return colors.gray[600];
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case "high":
        return "Yüksek";
      case "medium":
        return "Orta";
      case "low":
        return "Düşük";
      default:
        return severity;
    }
  };

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
          <Button variant="ghost" asLink href="/vergi" icon="←">
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
          Vergi Uyumluluğu
        </h1>
        <p
          style={{
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
            lineHeight: typography.lineHeight.relaxed,
            margin: 0,
          }}
        >
          Müşterilerinizin vergi uyumluluk durumunu kontrol edin ve yaklaşan son tarihleri takip edin.
        </p>
      </div>

      {/* Client Selection */}
      <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
        <div>
          <label
            style={{
              display: "block",
              marginBottom: spacing.sm,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              color: colors.text.primary,
            }}
          >
            Müşteri Seçin
          </label>
          <select
            value={selectedClientId || ""}
            onChange={(e) => setSelectedClientId(e.target.value || null)}
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
            <option value="">Müşteri seçin...</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name} ({client.taxNumber})
              </option>
            ))}
          </select>
        </div>
      </Card>

      {selectedClientId && (
        <>
          {complianceLoading ? (
            <Card variant="elevated">
              <div style={{ padding: spacing.xl, textAlign: "center" }}>
                <div
                  style={{
                    display: "inline-block",
                    width: "48px",
                    height: "48px",
                    border: `4px solid ${colors.gray[200]}`,
                    borderTopColor: colors.primary,
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
              </div>
            </Card>
          ) : compliance ? (
            <>
              {/* Compliance Status */}
              <Card
                variant="elevated"
                style={{
                  marginBottom: spacing.lg,
                  backgroundColor: compliance.isCompliant
                    ? colors.successLight
                    : colors.dangerLight,
                  border: `2px solid ${
                    compliance.isCompliant ? colors.success : colors.danger
                  }`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "50%",
                      backgroundColor: compliance.isCompliant
                        ? colors.success
                        : colors.danger,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "32px",
                      flexShrink: 0,
                    }}
                  >
                    {compliance.isCompliant ? "✅" : "⚠️"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: typography.fontSize.xl,
                        fontWeight: typography.fontWeight.bold,
                        color: colors.text.primary,
                        marginBottom: spacing.xs,
                      }}
                    >
                      Uyumluluk Durumu:{" "}
                      {compliance.isCompliant ? (
                        <span style={{ color: colors.successDark }}>Uyumlu</span>
                      ) : (
                        <span style={{ color: colors.dangerDark }}>Uyumsuz</span>
                      )}
                    </h2>
                    <p
                      style={{
                        margin: 0,
                        fontSize: typography.fontSize.sm,
                        color: colors.text.secondary,
                      }}
                    >
                      {compliance.isCompliant
                        ? "Tüm vergi yükümlülükleri yerine getirilmiştir."
                        : `${compliance.issues.length} sorun tespit edildi. Lütfen aşağıdaki sorunları inceleyin.`}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Issues */}
              {compliance.issues.length > 0 && (
                <Card variant="elevated" title="Tespit Edilen Sorunlar" style={{ marginBottom: spacing.lg }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
                    {compliance.issues.map((issue, index) => (
                      <div
                        key={index}
                        style={{
                          padding: spacing.md,
                          borderRadius: borderRadius.md,
                          backgroundColor: colors.gray[50],
                          border: `1px solid ${colors.border}`,
                          borderLeft: `4px solid ${getSeverityColor(issue.severity)}`,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: spacing.xs,
                          }}
                        >
                          <span
                            style={{
                              fontSize: typography.fontSize.base,
                              fontWeight: typography.fontWeight.semibold,
                              color: colors.text.primary,
                            }}
                          >
                            {issue.type}
                          </span>
                          <span
                            style={{
                              fontSize: typography.fontSize.xs,
                              padding: `${spacing.xs} ${spacing.sm}`,
                              borderRadius: borderRadius.sm,
                              backgroundColor: getSeverityColor(issue.severity),
                              color: colors.white,
                              fontWeight: typography.fontWeight.medium,
                            }}
                          >
                            {getSeverityLabel(issue.severity)}
                          </span>
                        </div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: typography.fontSize.sm,
                            color: colors.text.secondary,
                          }}
                        >
                          {issue.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Deadlines */}
              {compliance.deadlines.length > 0 && (
                <Card variant="elevated" title="Yaklaşan Son Tarihler">
                  <div style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
                    {compliance.deadlines.map((deadline, index) => {
                      const dueDate = new Date(deadline.dueDate);
                      const today = new Date();
                      const daysUntil = Math.ceil(
                        (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                      );
                      const isOverdue = daysUntil < 0;
                      const isUrgent = daysUntil >= 0 && daysUntil <= 7;

                      return (
                        <div
                          key={index}
                          style={{
                            padding: spacing.md,
                            borderRadius: borderRadius.md,
                            backgroundColor: isOverdue
                              ? colors.dangerLight
                              : isUrgent
                              ? colors.warningLight
                              : colors.gray[50],
                            border: `1px solid ${colors.border}`,
                            borderLeft: `4px solid ${
                              isOverdue
                                ? colors.danger
                                : isUrgent
                                ? colors.warning
                                : colors.info
                            }`,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              marginBottom: spacing.xs,
                            }}
                          >
                            <div>
                              <span
                                style={{
                                  fontSize: typography.fontSize.base,
                                  fontWeight: typography.fontWeight.semibold,
                                  color: colors.text.primary,
                                }}
                              >
                                {deadline.type}
                              </span>
                              {isOverdue && (
                                <span
                                  style={{
                                    marginLeft: spacing.sm,
                                    fontSize: typography.fontSize.xs,
                                    padding: `${spacing.xs} ${spacing.sm}`,
                                    borderRadius: borderRadius.sm,
                                    backgroundColor: colors.danger,
                                    color: colors.white,
                                    fontWeight: typography.fontWeight.medium,
                                  }}
                                >
                                  SÜRESİ GEÇMİŞ
                                </span>
                              )}
                              {isUrgent && !isOverdue && (
                                <span
                                  style={{
                                    marginLeft: spacing.sm,
                                    fontSize: typography.fontSize.xs,
                                    padding: `${spacing.xs} ${spacing.sm}`,
                                    borderRadius: borderRadius.sm,
                                    backgroundColor: colors.warning,
                                    color: colors.white,
                                    fontWeight: typography.fontWeight.medium,
                                  }}
                                >
                                  ACİL
                                </span>
                              )}
                            </div>
                            <span
                              style={{
                                fontSize: typography.fontSize.base,
                                fontWeight: typography.fontWeight.semibold,
                                color: isOverdue
                                  ? colors.dangerDark
                                  : isUrgent
                                  ? colors.warningDark
                                  : colors.text.primary,
                              }}
                            >
                              {dueDate.toLocaleDateString("tr-TR", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                          <p
                            style={{
                              margin: 0,
                              fontSize: typography.fontSize.sm,
                              color: colors.text.secondary,
                            }}
                          >
                            {deadline.description}
                          </p>
                          {!isOverdue && (
                            <p
                              style={{
                                margin: `${spacing.xs} 0 0 0`,
                                fontSize: typography.fontSize.xs,
                                color: colors.text.secondary,
                                fontStyle: "italic",
                              }}
                            >
                              {daysUntil === 0
                                ? "Bugün son gün!"
                                : `${daysUntil} gün kaldı`}
                            </p>
                          )}
                          {isOverdue && (
                            <p
                              style={{
                                margin: `${spacing.xs} 0 0 0`,
                                fontSize: typography.fontSize.xs,
                                color: colors.dangerDark,
                                fontWeight: typography.fontWeight.medium,
                              }}
                            >
                              {Math.abs(daysUntil)} gün önce süresi doldu
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {compliance.deadlines.length === 0 && (
                <Card variant="elevated">
                  <div style={{ padding: spacing.lg, textAlign: "center" }}>
                    <p style={{ color: colors.text.secondary, margin: 0 }}>
                      Yaklaşan son tarih bulunmamaktadır. ✅
                    </p>
                  </div>
                </Card>
              )}
            </>
          ) : (
            <Card variant="elevated">
              <div style={{ padding: spacing.lg, textAlign: "center" }}>
                <p style={{ color: colors.text.secondary, margin: 0 }}>
                  Uyumluluk bilgisi yüklenemedi.
                </p>
              </div>
            </Card>
          )}
        </>
      )}

      {!selectedClientId && (
        <Card variant="elevated">
          <div style={{ padding: spacing.xl, textAlign: "center" }}>
            <p style={{ color: colors.text.secondary, margin: 0 }}>
              Lütfen uyumluluk kontrolü için bir müşteri seçin.
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

