"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { taxClient, listClientCompanies } from "@repo/api-client";
import Link from "next/link";
import { Card } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { colors, spacing, borderRadius, shadows, typography, transitions } from "../../../../styles/design-system";

export default function VATOptimizationPage() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split("T")[0]);

  // Fetch client companies
  const { data: clientsData } = useQuery({
    queryKey: ["client-companies"],
    queryFn: () => listClientCompanies({ pageSize: 100 }),
  });

  const clients = clientsData?.data.data || [];

  // Fetch VAT analysis
  const { data: vatAnalysisData, isLoading: vatLoading } = useQuery({
    queryKey: ["vat-analysis", selectedClientId, startDate, endDate],
    queryFn: () => {
      if (!selectedClientId) return null;
      return taxClient.analyzeVAT(selectedClientId, startDate, endDate);
    },
    enabled: !!selectedClientId,
  });

  // Fetch VAT inconsistencies
  const { data: inconsistenciesData, isLoading: inconsistenciesLoading } = useQuery({
    queryKey: ["vat-inconsistencies", selectedClientId],
    queryFn: () => {
      if (!selectedClientId) return null;
      return taxClient.checkVATInconsistencies(selectedClientId);
    },
    enabled: !!selectedClientId,
  });

  const vatAnalysis = vatAnalysisData?.data;
  const inconsistencies = inconsistenciesData?.data?.inconsistencies || [];

  // Prepare VAT return mutation
  const prepareReturnMutation = useMutation({
    mutationFn: () => {
      if (!selectedClientId) throw new Error("Müşteri seçilmedi");
      return taxClient.prepareVATReturn(selectedClientId, startDate, endDate);
    },
    onSuccess: (data) => {
      toast.success("KDV beyannamesi hazırlandı!");
      console.log("VAT Return:", data);
    },
    onError: (error: Error) => {
      toast.error(`Hata: ${error.message}`);
    },
  });

  // Responsive state
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

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

  return (
    <div
      style={{
        padding: isMobile ? spacing.md : spacing.xxl,
        maxWidth: "1600px",
        margin: "0 auto",
        backgroundColor: colors.gray[50],
        minHeight: "100vh",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div
        style={{
          marginBottom: spacing.xl,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: spacing.md, marginBottom: spacing.sm }}>
            <Button
              variant="ghost"
              asLink
              href="/vergi"
              icon="←"
            >
              Geri
            </Button>
          </div>
          <h1
            style={{
              fontSize: isMobile ? typography.fontSize.xl : typography.fontSize["3xl"],
              fontWeight: typography.fontWeight.bold,
              color: colors.text.primary,
              marginBottom: spacing.sm,
            }}
          >
            KDV Yönetimi ve Optimizasyonu
          </h1>
          <p
            style={{
              fontSize: typography.fontSize.base,
              color: colors.text.secondary,
              lineHeight: typography.lineHeight.relaxed,
              margin: 0,
            }}
          >
            KDV analizi, tutarsızlık kontrolü ve beyanname hazırlama işlemlerini buradan yapabilirsiniz.
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile 
              ? "1fr"
              : "repeat(auto-fit, minmax(min(250px, 100%), 1fr))",
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
                color: colors.text.primary,
              }}
            >
              Müşteri
            </label>
            <select
              value={selectedClientId || ""}
              onChange={(e) => setSelectedClientId(e.target.value || null)}
              style={{
                width: "100%",
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

          <div>
            <label
              style={{
                display: "block",
                marginBottom: spacing.xs,
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                color: colors.text.primary,
              }}
            >
              Başlangıç Tarihi
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                width: "100%",
                padding: spacing.sm,
                borderRadius: borderRadius.md,
                border: `1px solid ${colors.border}`,
                fontSize: typography.fontSize.base,
                backgroundColor: colors.white,
                color: colors.text.primary,
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: spacing.xs,
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                color: colors.text.primary,
              }}
            >
              Bitiş Tarihi
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                width: "100%",
                padding: spacing.sm,
                borderRadius: borderRadius.md,
                border: `1px solid ${colors.border}`,
                fontSize: typography.fontSize.base,
                backgroundColor: colors.white,
                color: colors.text.primary,
              }}
            />
          </div>
        </div>
      </Card>

      {selectedClientId && (
        <>
          {/* VAT Analysis */}
          {vatLoading ? (
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
          ) : vatAnalysis ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile 
                  ? "1fr"
                  : "repeat(auto-fit, minmax(min(250px, 100%), 1fr))",
                gap: spacing.lg,
                marginBottom: spacing.lg,
              }}
            >
              <Card variant="elevated">
                <div style={{ marginBottom: spacing.xs }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: typography.fontSize.sm,
                      color: colors.text.secondary,
                      marginBottom: spacing.xs,
                    }}
                  >
                    Toplam KDV
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: typography.fontSize["2xl"],
                      fontWeight: typography.fontWeight.bold,
                      color: colors.text.primary,
                    }}
                  >
                    {(vatAnalysis.totalVAT ?? 0).toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    ₺
                  </p>
                </div>
              </Card>

              <Card variant="elevated">
                <div style={{ marginBottom: spacing.xs }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: typography.fontSize.sm,
                      color: colors.text.secondary,
                      marginBottom: spacing.xs,
                    }}
                  >
                    Giriş KDV
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: typography.fontSize["2xl"],
                      fontWeight: typography.fontWeight.bold,
                      color: colors.successDark,
                    }}
                  >
                    {(vatAnalysis.inputVAT ?? 0).toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    ₺
                  </p>
                </div>
              </Card>

              <Card variant="elevated">
                <div style={{ marginBottom: spacing.xs }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: typography.fontSize.sm,
                      color: colors.text.secondary,
                      marginBottom: spacing.xs,
                    }}
                  >
                    Çıkış KDV
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: typography.fontSize["2xl"],
                      fontWeight: typography.fontWeight.bold,
                      color: colors.dangerDark,
                    }}
                  >
                    {(vatAnalysis.outputVAT ?? 0).toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    ₺
                  </p>
                </div>
              </Card>

              <Card variant="elevated">
                <div style={{ marginBottom: spacing.xs }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: typography.fontSize.sm,
                      color: colors.text.secondary,
                      marginBottom: spacing.xs,
                    }}
                  >
                    Net KDV
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: typography.fontSize["2xl"],
                      fontWeight: typography.fontWeight.bold,
                      color:
                        (vatAnalysis.netVAT ?? 0) >= 0 ? colors.successDark : colors.dangerDark,
                    }}
                  >
                    {(vatAnalysis.netVAT ?? 0).toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    ₺
                  </p>
                </div>
              </Card>
            </div>
          ) : null}

          {/* VAT Inconsistencies */}
          <Card
            variant="elevated"
            title={`KDV Tutarsızlıkları (${inconsistencies.length})`}
            style={{ marginBottom: spacing.lg }}
          >
            {inconsistenciesLoading ? (
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
            ) : inconsistencies.length === 0 ? (
              <div style={{ padding: spacing.lg, textAlign: "center" }}>
                <p style={{ color: colors.text.secondary, margin: 0 }}>
                  KDV tutarsızlığı bulunmamaktadır. ✅
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
                {inconsistencies.map((inc, index) => (
                  <div
                    key={index}
                    style={{
                      padding: spacing.md,
                      borderRadius: borderRadius.md,
                      backgroundColor: colors.gray[50],
                      border: `1px solid ${colors.border}`,
                      borderLeft: `4px solid ${getSeverityColor(inc.severity)}`,
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
                          fontSize: typography.fontSize.sm,
                          fontWeight: typography.fontWeight.semibold,
                          color: colors.text.primary,
                          textTransform: "uppercase",
                        }}
                      >
                        {inc.type}
                      </span>
                      <span
                        style={{
                          fontSize: typography.fontSize.xs,
                          padding: `${spacing.xs} ${spacing.sm}`,
                          borderRadius: borderRadius.sm,
                          backgroundColor: getSeverityColor(inc.severity),
                          color: colors.white,
                          fontWeight: typography.fontWeight.medium,
                        }}
                      >
                        {inc.severity === "high"
                          ? "Yüksek"
                          : inc.severity === "medium"
                          ? "Orta"
                          : "Düşük"}
                      </span>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: typography.fontSize.sm,
                        color: colors.text.secondary,
                      }}
                    >
                      {inc.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Actions */}
          <Card variant="elevated">
            <div style={{ display: "flex", gap: spacing.md, flexWrap: "wrap" }}>
              <Button
                variant="primary"
                onClick={() => prepareReturnMutation.mutate()}
                loading={prepareReturnMutation.isPending}
              >
                📄 KDV Beyannamesi Hazırla
              </Button>
            </div>
          </Card>
        </>
      )}

      {!selectedClientId && (
        <Card variant="elevated">
          <div style={{ padding: spacing.xl, textAlign: "center" }}>
            <p style={{ color: colors.text.secondary, margin: 0 }}>
              Lütfen analiz için bir müşteri seçin.
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

