"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { taxClient, listClientCompanies } from "@repo/api-client";
import Link from "next/link";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Skeleton } from "../../../components/ui/Skeleton";
import { PageTransition } from "../../../components/ui/PageTransition";
import { colors, spacing, borderRadius, shadows, typography, transitions } from "../../../styles/design-system";

export default function TaxDashboardPage() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Fetch client companies
  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ["client-companies"],
    queryFn: () => listClientCompanies({ pageSize: 100 }),
  });

  const clients = clientsData?.data.data || [];

  // Fetch compliance for selected client
  const { data: complianceData, isLoading: complianceLoading, error: complianceError } = useQuery({
    queryKey: ["tax-compliance", selectedClientId],
    queryFn: () => {
      if (!selectedClientId) return null;
      return taxClient.checkCompliance(selectedClientId);
    },
    enabled: !!selectedClientId,
    retry: false,
  });

  const compliance = complianceData?.data;

  if (clientsLoading) {
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
              <Skeleton height="20px" width="100px" />
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
    <PageTransition>
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
          Vergi Yönetimi
        </h1>
        <p
          style={{
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
            lineHeight: typography.lineHeight.relaxed,
            margin: 0,
          }}
        >
          KDV yönetimi, vergi uyumluluğu, raporlama ve TMS uyumluluğu işlemlerini buradan yönetebilirsiniz.
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
          onClick={() => (window.location.href = "/vergi/kdv")}
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
              💰
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
                KDV Yönetimi
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.sm,
                  color: colors.text.secondary,
                }}
              >
                KDV analizi, optimizasyon ve beyanname hazırlama
              </p>
            </div>
          </div>
        </Card>

        <Card
          variant="elevated"
          hoverable
          onClick={() => (window.location.href = "/vergi/uyumluluk")}
          style={{ cursor: "pointer" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: borderRadius.lg,
                backgroundColor: colors.successLight,
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
                Vergi Uyumluluğu
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.sm,
                  color: colors.text.secondary,
                }}
              >
                Uyumluluk kontrolü ve son tarih takibi
              </p>
            </div>
          </div>
        </Card>

        <Card
          variant="elevated"
          hoverable
          onClick={() => (window.location.href = "/vergi/raporlar")}
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
              📊
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
                Vergi Raporları
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.sm,
                  color: colors.text.secondary,
                }}
              >
                KDV, kurumlar vergisi ve stopaj raporları
              </p>
            </div>
          </div>
        </Card>

        <Card
          variant="elevated"
          hoverable
          onClick={() => (window.location.href = "/vergi/tms")}
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
              📋
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
                TMS Uyumluluğu
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.sm,
                  color: colors.text.secondary,
                }}
              >
                Türk Muhasebe Standartları uyumluluğu
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Client Selection & Compliance Status */}
      <Card variant="elevated" title="Müşteri Seçimi ve Uyumluluk Durumu">
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

        {selectedClientId && (
          <div>
            {complianceLoading ? (
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
            ) : compliance ? (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: spacing.md,
                        marginBottom: spacing.md,
                        padding: spacing.md,
                        borderRadius: borderRadius.md,
                        backgroundColor: (compliance?.isCompliant ?? true)
                          ? colors.successLight
                          : colors.dangerLight,
                      }}
                    >
                      <span style={{ fontSize: "24px" }}>
                        {(compliance?.isCompliant ?? true) ? "✅" : "⚠️"}
                      </span>
                      <div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: typography.fontSize.base,
                            fontWeight: typography.fontWeight.semibold,
                            color: colors.text.primary,
                          }}
                        >
                          Uyumluluk Durumu:{" "}
                          {(compliance?.isCompliant ?? true) ? (
                            <span style={{ color: colors.successDark }}>Uyumlu</span>
                          ) : (
                            <span style={{ color: colors.dangerDark }}>Uyumsuz</span>
                          )}
                        </p>
                        {compliance?.issues && compliance.issues.length > 0 && (
                      <p
                        style={{
                          margin: `${spacing.xs} 0 0 0`,
                          fontSize: typography.fontSize.sm,
                          color: colors.text.secondary,
                        }}
                      >
                        {compliance.issues.length} sorun tespit edildi
                      </p>
                    )}
                  </div>
                </div>

                {compliance?.deadlines && compliance.deadlines.length > 0 && (
                  <div style={{ marginTop: spacing.md }}>
                    <h4
                      style={{
                        margin: `0 0 ${spacing.sm} 0`,
                        fontSize: typography.fontSize.base,
                        fontWeight: typography.fontWeight.semibold,
                        color: colors.text.primary,
                      }}
                    >
                      Yaklaşan Son Tarihler
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: spacing.xs }}>
                      {compliance.deadlines.map((deadline, index) => (
                        <div
                          key={index}
                          style={{
                            padding: spacing.sm,
                            borderRadius: borderRadius.md,
                            backgroundColor: colors.gray[50],
                            border: `1px solid ${colors.border}`,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <span
                              style={{
                                fontSize: typography.fontSize.sm,
                                fontWeight: typography.fontWeight.medium,
                                color: colors.text.primary,
                              }}
                            >
                              {deadline.type}
                            </span>
                            <span
                              style={{
                                fontSize: typography.fontSize.sm,
                                color: colors.text.secondary,
                              }}
                            >
                              {new Date(deadline.dueDate).toLocaleDateString("tr-TR")}
                            </span>
                          </div>
                          <p
                            style={{
                              margin: `${spacing.xs} 0 0 0`,
                              fontSize: typography.fontSize.sm,
                              color: colors.text.secondary,
                            }}
                          >
                            {deadline.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : complianceError ? (
              <div
                style={{
                  padding: spacing.md,
                  borderRadius: borderRadius.md,
                  backgroundColor: colors.dangerLight,
                  color: colors.dangerDark,
                }}
              >
                <p style={{ margin: 0, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>
                  ⚠️ Hata: {complianceError instanceof Error ? complianceError.message : "Uyumluluk bilgisi yüklenemedi."}
                </p>
              </div>
            ) : (
              <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                Uyumluluk bilgisi yüklenemedi.
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
    </PageTransition>
  );
}

