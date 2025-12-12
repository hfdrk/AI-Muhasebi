"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsClient } from "@repo/api-client";
import Link from "next/link";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { colors, spacing, borderRadius, shadows, typography, transitions } from "../../../styles/design-system";

export default function AnalyticsDashboardPage() {
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split("T")[0]);

  // Fetch comprehensive dashboard
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ["analytics-dashboard", startDate, endDate],
    queryFn: () => analyticsClient.getAnalyticsDashboard(startDate, endDate),
  });

  const dashboard = dashboardData?.data;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
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
        <h1
          style={{
            fontSize: typography.fontSize["3xl"],
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
            marginBottom: spacing.sm,
          }}
        >
          Analitik Dashboard
        </h1>
        <p
          style={{
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
            lineHeight: typography.lineHeight.relaxed,
            margin: 0,
          }}
        >
          Finansal trendler, risk analizi, portföy performansı ve tahminler hakkında kapsamlı görünüm.
        </p>
      </div>

      {/* Date Range Filter */}
      <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
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

      {dashboardLoading ? (
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
              Yükleniyor...
            </p>
          </div>
        </Card>
      ) : dashboard ? (
        <>
          {/* Financial Overview */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: spacing.lg,
              marginBottom: spacing.lg,
            }}
          >
            <Card variant="elevated">
              <div style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: borderRadius.lg,
                    backgroundColor: colors.successLight,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                    flexShrink: 0,
                  }}
                >
                  💰
                </div>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: typography.fontSize.sm,
                      color: colors.text.secondary,
                    }}
                  >
                    Toplam Gelir
                  </p>
                  <p
                    style={{
                      margin: `${spacing.xs} 0 0 0`,
                      fontSize: typography.fontSize.xl,
                      fontWeight: typography.fontWeight.bold,
                      color: colors.text.primary,
                    }}
                  >
                    {formatCurrency(dashboard.financial.totalRevenue)}
                  </p>
                  <p
                    style={{
                      margin: `${spacing.xs} 0 0 0`,
                      fontSize: typography.fontSize.xs,
                      color:
                        dashboard.financial.revenueGrowth >= 0
                          ? colors.successDark
                          : colors.dangerDark,
                    }}
                  >
                    {formatPercent(dashboard.financial.revenueGrowth)}
                  </p>
                </div>
              </div>
            </Card>

            <Card variant="elevated">
              <div style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: borderRadius.lg,
                    backgroundColor: colors.dangerLight,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                    flexShrink: 0,
                  }}
                >
                  📉
                </div>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: typography.fontSize.sm,
                      color: colors.text.secondary,
                    }}
                  >
                    Toplam Gider
                  </p>
                  <p
                    style={{
                      margin: `${spacing.xs} 0 0 0`,
                      fontSize: typography.fontSize.xl,
                      fontWeight: typography.fontWeight.bold,
                      color: colors.text.primary,
                    }}
                  >
                    {formatCurrency(dashboard.financial.totalExpenses)}
                  </p>
                  <p
                    style={{
                      margin: `${spacing.xs} 0 0 0`,
                      fontSize: typography.fontSize.xs,
                      color:
                        dashboard.financial.expenseGrowth <= 0
                          ? colors.successDark
                          : colors.dangerDark,
                    }}
                  >
                    {formatPercent(dashboard.financial.expenseGrowth)}
                  </p>
                </div>
              </div>
            </Card>

            <Card variant="elevated">
              <div style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: borderRadius.lg,
                    backgroundColor: colors.primaryPastel,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                    flexShrink: 0,
                  }}
                >
                  📊
                </div>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: typography.fontSize.sm,
                      color: colors.text.secondary,
                    }}
                  >
                    Net Kar
                  </p>
                  <p
                    style={{
                      margin: `${spacing.xs} 0 0 0`,
                      fontSize: typography.fontSize.xl,
                      fontWeight: typography.fontWeight.bold,
                      color: colors.text.primary,
                    }}
                  >
                    {formatCurrency(dashboard.financial.netProfit)}
                  </p>
                  <p
                    style={{
                      margin: `${spacing.xs} 0 0 0`,
                      fontSize: typography.fontSize.xs,
                      color: colors.text.secondary,
                    }}
                  >
                    Kar Marjı: {dashboard.financial.profitMargin.toFixed(2)}%
                  </p>
                </div>
              </div>
            </Card>
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
              onClick={() => (window.location.href = "/analitik/finansal-trendler")}
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
                  📈
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
                    Finansal Trendler
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: typography.fontSize.sm,
                      color: colors.text.secondary,
                    }}
                  >
                    Gelir, gider ve kar trendlerini görüntüle
                  </p>
                </div>
              </div>
            </Card>

            <Card
              variant="elevated"
              hoverable
              onClick={() => (window.location.href = "/analitik/risk-trendleri")}
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
                    Risk Trendleri
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: typography.fontSize.sm,
                      color: colors.text.secondary,
                    }}
                  >
                    Risk skorları ve uyarı trendlerini analiz et
                  </p>
                </div>
              </div>
            </Card>

            <Card
              variant="elevated"
              hoverable
              onClick={() => (window.location.href = "/analitik/portfoy")}
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
                  👥
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
                    Müşteri Portföyü
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: typography.fontSize.sm,
                      color: colors.text.secondary,
                    }}
                  >
                    Müşteri portföyü analizi ve performans
                  </p>
                </div>
              </div>
            </Card>

            <Card
              variant="elevated"
              hoverable
              onClick={() => (window.location.href = "/analitik/tahminler")}
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
                  🔮
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
                    Gelir/Gider Tahminleri
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: typography.fontSize.sm,
                      color: colors.text.secondary,
                    }}
                  >
                    Gelecek dönem gelir ve gider tahminleri
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Risk & Portfolio Summary */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: spacing.lg,
            }}
          >
            <Card variant="elevated" title="Risk Özeti">
              <div style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: typography.fontSize.sm,
                      color: colors.text.secondary,
                    }}
                  >
                    Ortalama Risk Skoru
                  </p>
                  <p
                    style={{
                      margin: `${spacing.xs} 0 0 0`,
                      fontSize: typography.fontSize["2xl"],
                      fontWeight: typography.fontWeight.bold,
                      color: colors.text.primary,
                    }}
                  >
                    {dashboard.risk.averageRiskScore.toFixed(2)}
                  </p>
                </div>
                <div
                  style={{
                    padding: spacing.md,
                    borderRadius: borderRadius.md,
                    backgroundColor: colors.gray[50],
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: typography.fontSize.sm,
                      color: colors.text.secondary,
                    }}
                  >
                    Yüksek Riskli Müşteri: {dashboard.risk.highRiskClientCount}
                  </p>
                  <p
                    style={{
                      margin: `${spacing.xs} 0 0 0`,
                      fontSize: typography.fontSize.sm,
                      color: colors.text.secondary,
                    }}
                  >
                    Kritik Uyarı: {dashboard.risk.criticalAlertsCount}
                  </p>
                  <p
                    style={{
                      margin: `${spacing.xs} 0 0 0`,
                      fontSize: typography.fontSize.sm,
                      color: colors.text.secondary,
                    }}
                  >
                    Trend:{" "}
                    {dashboard.risk.riskTrend === "increasing"
                      ? "📈 Artıyor"
                      : dashboard.risk.riskTrend === "decreasing"
                      ? "📉 Azalıyor"
                      : "➡️ Stabil"}
                  </p>
                </div>
              </div>
            </Card>

            <Card variant="elevated" title="Portföy Özeti">
              <div style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: typography.fontSize.sm,
                      color: colors.text.secondary,
                    }}
                  >
                    Toplam Müşteri
                  </p>
                  <p
                    style={{
                      margin: `${spacing.xs} 0 0 0`,
                      fontSize: typography.fontSize["2xl"],
                      fontWeight: typography.fontWeight.bold,
                      color: colors.text.primary,
                    }}
                  >
                    {dashboard.portfolio.totalClients}
                  </p>
                </div>
                <div
                  style={{
                    padding: spacing.md,
                    borderRadius: borderRadius.md,
                    backgroundColor: colors.gray[50],
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: typography.fontSize.sm,
                      color: colors.text.secondary,
                    }}
                  >
                    Aktif: {dashboard.portfolio.activeClients}
                  </p>
                  <p
                    style={{
                      margin: `${spacing.xs} 0 0 0`,
                      fontSize: typography.fontSize.sm,
                      color: colors.text.secondary,
                    }}
                  >
                    Yeni: {dashboard.portfolio.newClients}
                  </p>
                  <p
                    style={{
                      margin: `${spacing.xs} 0 0 0`,
                      fontSize: typography.fontSize.sm,
                      color: colors.text.secondary,
                    }}
                  >
                    Ayrılan: {dashboard.portfolio.churnedClients}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </>
      ) : null}

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

