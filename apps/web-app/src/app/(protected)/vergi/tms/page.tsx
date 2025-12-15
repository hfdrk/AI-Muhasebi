"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { taxClient, listClientCompanies } from "@repo/api-client";
import Link from "next/link";
import { Card } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { colors, spacing, borderRadius, shadows, typography, transitions } from "../../../../styles/design-system";

export default function TMSCompliancePage() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [activeTab, setActiveTab] = useState<"validation" | "balance-sheet" | "income-statement">(
    "validation"
  );

  // Fetch client companies
  const { data: clientsData } = useQuery({
    queryKey: ["client-companies"],
    queryFn: () => listClientCompanies({ pageSize: 100 }),
  });

  const clients = clientsData?.data.data || [];

  // Fetch TMS Compliance Validation
  const { data: validationData, isLoading: validationLoading } = useQuery({
    queryKey: ["tms-validation", selectedClientId, startDate, endDate],
    queryFn: () => {
      if (!selectedClientId) return null;
      return taxClient.validateTMSCompliance(selectedClientId, startDate, endDate);
    },
    enabled: !!selectedClientId && activeTab === "validation",
  });

  // Fetch Balance Sheet
  const balanceSheetMutation = useMutation({
    mutationFn: () => {
      if (!selectedClientId) throw new Error("Müşteri seçilmedi");
      return taxClient.generateTMSBalanceSheet(selectedClientId, asOfDate);
    },
    onSuccess: (data) => {
      toast.success("TMS Bilanço başarıyla oluşturuldu!");
      console.log("Balance Sheet:", data);
    },
    onError: (error: Error) => {
      toast.error(`Hata: ${error.message}`);
    },
  });

  // Fetch Income Statement
  const incomeStatementMutation = useMutation({
    mutationFn: () => {
      if (!selectedClientId) throw new Error("Müşteri seçilmedi");
      return taxClient.generateTMSIncomeStatement(selectedClientId, startDate, endDate);
    },
    onSuccess: (data) => {
      toast.success("TMS Gelir Tablosu başarıyla oluşturuldu!");
      console.log("Income Statement:", data);
    },
    onError: (error: Error) => {
      toast.error(`Hata: ${error.message}`);
    },
  });

  const validation = validationData?.data;

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
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
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: spacing.md, marginBottom: spacing.sm }}>
          <Button variant="ghost" asLink href="/vergi" icon="←">
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
          TMS (Türk Muhasebe Standartları) Uyumluluğu
        </h1>
        <p
          style={{
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
            lineHeight: typography.lineHeight.relaxed,
            margin: 0,
          }}
        >
          TMS uyumluluk kontrolü, bilanço ve gelir tablosu oluşturma işlemlerini buradan yapabilirsiniz.
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
          {/* Tabs */}
          <div
            style={{
              display: "flex",
              gap: spacing.sm,
              marginBottom: spacing.lg,
              borderBottom: `2px solid ${colors.border}`,
              overflowX: isMobile ? "auto" : "visible",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <button
              onClick={() => setActiveTab("validation")}
              style={{
                padding: `${spacing.sm} ${spacing.md}`,
                border: "none",
                borderBottom: `3px solid ${
                  activeTab === "validation" ? colors.primary : "transparent"
                }`,
                backgroundColor: "transparent",
                color: activeTab === "validation" ? colors.primary : colors.text.secondary,
                fontSize: typography.fontSize.base,
                fontWeight:
                  activeTab === "validation"
                    ? typography.fontWeight.semibold
                    : typography.fontWeight.normal,
                cursor: "pointer",
                transition: `all ${transitions.normal} ease`,
              }}
            >
              Uyumluluk Kontrolü
            </button>
            <button
              onClick={() => setActiveTab("balance-sheet")}
              style={{
                padding: `${spacing.sm} ${spacing.md}`,
                border: "none",
                borderBottom: `3px solid ${
                  activeTab === "balance-sheet" ? colors.primary : "transparent"
                }`,
                backgroundColor: "transparent",
                color: activeTab === "balance-sheet" ? colors.primary : colors.text.secondary,
                fontSize: typography.fontSize.base,
                fontWeight:
                  activeTab === "balance-sheet"
                    ? typography.fontWeight.semibold
                    : typography.fontWeight.normal,
                cursor: "pointer",
                transition: `all ${transitions.normal} ease`,
              }}
            >
              Bilanço
            </button>
            <button
              onClick={() => setActiveTab("income-statement")}
              style={{
                padding: `${spacing.sm} ${spacing.md}`,
                border: "none",
                borderBottom: `3px solid ${
                  activeTab === "income-statement" ? colors.primary : "transparent"
                }`,
                backgroundColor: "transparent",
                color: activeTab === "income-statement" ? colors.primary : colors.text.secondary,
                fontSize: typography.fontSize.base,
                fontWeight:
                  activeTab === "income-statement"
                    ? typography.fontWeight.semibold
                    : typography.fontWeight.normal,
                cursor: "pointer",
                transition: `all ${transitions.normal} ease`,
              }}
            >
              Gelir Tablosu
            </button>
          </div>

          {/* Validation Tab */}
          {activeTab === "validation" && (
            <>
              <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile 
                      ? "1fr"
                      : "repeat(auto-fit, minmax(min(200px, 100%), 1fr))",
                    gap: spacing.md,
                    marginBottom: spacing.md,
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

              {validationLoading ? (
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
              ) : validation ? (
                <>
                  {/* Compliance Status */}
                  <Card
                    variant="elevated"
                    style={{
                      marginBottom: spacing.lg,
                      backgroundColor: validation.isCompliant
                        ? colors.successLight
                        : colors.dangerLight,
                      border: `2px solid ${
                        validation.isCompliant ? colors.success : colors.danger
                      }`,
                    }}
                  >
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: spacing.md,
                      flexDirection: isMobile ? "column" : "row",
                      textAlign: isMobile ? "center" : "left",
                    }}>
                      <div
                        style={{
                          width: isMobile ? "48px" : "64px",
                          height: isMobile ? "48px" : "64px",
                          borderRadius: "50%",
                          backgroundColor: validation.isCompliant
                            ? colors.success
                            : colors.danger,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: isMobile ? "24px" : "32px",
                          flexShrink: 0,
                        }}
                      >
                        {validation.isCompliant ? "✅" : "⚠️"}
                      </div>
                      <div style={{ flex: 1, width: "100%" }}>
                        <h2
                          style={{
                            margin: 0,
                            fontSize: typography.fontSize.xl,
                            fontWeight: typography.fontWeight.bold,
                            color: colors.text.primary,
                            marginBottom: spacing.xs,
                          }}
                        >
                          TMS Uyumluluk Durumu:{" "}
                          {validation.isCompliant ? (
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
                          {validation.isCompliant
                            ? "Tüm TMS gereksinimleri karşılanmaktadır."
                            : `${validation.violations.length} ihlal tespit edildi.`}
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* Violations */}
                  {validation.violations.length > 0 && (
                    <Card variant="elevated" title="Tespit Edilen İhlaller" style={{ marginBottom: spacing.lg }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
                        {validation.violations.map((violation, index) => (
                          <div
                            key={index}
                            style={{
                              padding: spacing.md,
                              borderRadius: borderRadius.md,
                              backgroundColor: colors.gray[50],
                              border: `1px solid ${colors.border}`,
                              borderLeft: `4px solid ${getSeverityColor(violation.severity)}`,
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
                                {violation.type}
                              </span>
                              <span
                                style={{
                                  fontSize: typography.fontSize.xs,
                                  padding: `${spacing.xs} ${spacing.sm}`,
                                  borderRadius: borderRadius.sm,
                                  backgroundColor: getSeverityColor(violation.severity),
                                  color: colors.white,
                                  fontWeight: typography.fontWeight.medium,
                                }}
                              >
                                {violation.severity === "high"
                                  ? "Yüksek"
                                  : violation.severity === "medium"
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
                              {violation.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Recommendations */}
                  {validation.recommendations.length > 0 && (
                    <Card variant="elevated" title="Öneriler">
                      <div style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
                        {validation.recommendations.map((rec, index) => (
                          <div
                            key={index}
                            style={{
                              padding: spacing.md,
                              borderRadius: borderRadius.md,
                              backgroundColor: colors.infoLight,
                              border: `1px solid ${colors.border}`,
                              borderLeft: `4px solid ${getPriorityColor(rec.priority)}`,
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
                                {rec.type}
                              </span>
                              <span
                                style={{
                                  fontSize: typography.fontSize.xs,
                                  padding: `${spacing.xs} ${spacing.sm}`,
                                  borderRadius: borderRadius.sm,
                                  backgroundColor: getPriorityColor(rec.priority),
                                  color: colors.white,
                                  fontWeight: typography.fontWeight.medium,
                                }}
                              >
                                {rec.priority === "high"
                                  ? "Yüksek Öncelik"
                                  : rec.priority === "medium"
                                  ? "Orta Öncelik"
                                  : "Düşük Öncelik"}
                              </span>
                            </div>
                            <p
                              style={{
                                margin: 0,
                                fontSize: typography.fontSize.sm,
                                color: colors.text.secondary,
                              }}
                            >
                              {rec.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </>
              ) : null}
            </>
          )}

          {/* Balance Sheet Tab */}
          {activeTab === "balance-sheet" && (
            <Card variant="elevated">
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
                  Tarih
                </label>
                <input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  style={{
                    width: "100%",
                    maxWidth: "300px",
                    padding: spacing.sm,
                    borderRadius: borderRadius.md,
                    border: `1px solid ${colors.border}`,
                    fontSize: typography.fontSize.base,
                    backgroundColor: colors.white,
                    color: colors.text.primary,
                  }}
                />
              </div>
              <Button
                variant="primary"
                onClick={() => balanceSheetMutation.mutate()}
                loading={balanceSheetMutation.isPending}
              >
                📊 Bilanço Oluştur
              </Button>
            </Card>
          )}

          {/* Income Statement Tab */}
          {activeTab === "income-statement" && (
            <Card variant="elevated">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile 
                    ? "1fr"
                    : "repeat(auto-fit, minmax(min(200px, 100%), 1fr))",
                  gap: spacing.md,
                  marginBottom: spacing.md,
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
              <Button
                variant="primary"
                onClick={() => incomeStatementMutation.mutate()}
                loading={incomeStatementMutation.isPending}
              >
                📈 Gelir Tablosu Oluştur
              </Button>
            </Card>
          )}
        </>
      )}

      {!selectedClientId && (
        <Card variant="elevated">
          <div style={{ padding: spacing.xl, textAlign: "center" }}>
            <p style={{ color: colors.text.secondary, margin: 0 }}>
              Lütfen TMS işlemleri için bir müşteri seçin.
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

