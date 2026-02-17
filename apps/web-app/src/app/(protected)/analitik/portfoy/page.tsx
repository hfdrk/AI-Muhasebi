"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsClient } from "@repo/api-client";
import { Card } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { colors, spacing, borderRadius, typography } from "../../../../styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";

export default function PortfolioPage() {
  const { themeColors } = useTheme();
  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);

  // Fetch portfolio analytics
  const { data: portfolioData, isLoading: portfolioLoading } = useQuery({
    queryKey: ["portfolio-analytics", startDate, endDate],
    queryFn: () => analyticsClient.getClientPortfolioAnalytics(startDate, endDate),
  });

  const portfolio = portfolioData?.data;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      minimumFractionDigits: 2,
    }).format(amount);
  };

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
          <Button variant="ghost" asLink href="/analitik" icon="←">
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
          Müşteri Portföyü Analizi
        </h1>
        <p
          style={{
            fontSize: typography.fontSize.base,
            color: themeColors.text.secondary,
            lineHeight: typography.lineHeight.relaxed,
            margin: 0,
          }}
        >
          Müşteri portföyünüzün kapsamlı analizi: risk dağılımı, gelir performansı ve en iyi müşteriler.
        </p>
      </div>

      {/* Filters */}
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
                color: themeColors.text.primary,
              }}
            >
              Başlangıç Tarihi (Opsiyonel)
            </label>
            <input
              type="date"
              value={startDate || ""}
              onChange={(e) => setStartDate(e.target.value || undefined)}
              style={{
                width: "100%",
                padding: spacing.sm,
                borderRadius: borderRadius.md,
                border: `1px solid ${themeColors.border}`,
                fontSize: typography.fontSize.base,
                backgroundColor: themeColors.white,
                color: themeColors.text.primary,
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
                color: themeColors.text.primary,
              }}
            >
              Bitiş Tarihi (Opsiyonel)
            </label>
            <input
              type="date"
              value={endDate || ""}
              onChange={(e) => setEndDate(e.target.value || undefined)}
              style={{
                width: "100%",
                padding: spacing.sm,
                borderRadius: borderRadius.md,
                border: `1px solid ${themeColors.border}`,
                fontSize: typography.fontSize.base,
                backgroundColor: themeColors.white,
                color: themeColors.text.primary,
              }}
            />
          </div>
        </div>
      </Card>

      {portfolioLoading ? (
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
      ) : portfolio ? (
        <>
          {/* Summary Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: spacing.lg,
              marginBottom: spacing.lg,
            }}
          >
            <Card variant="elevated">
              <p
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.sm,
                  color: themeColors.text.secondary,
                }}
              >
                Toplam Müşteri
              </p>
              <p
                style={{
                  margin: `${spacing.xs} 0 0 0`,
                  fontSize: typography.fontSize["2xl"],
                  fontWeight: typography.fontWeight.bold,
                  color: themeColors.text.primary,
                }}
              >
                {portfolio.totalClients}
              </p>
            </Card>

            <Card variant="elevated">
              <p
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.sm,
                  color: themeColors.text.secondary,
                }}
              >
                Aktif Müşteri
              </p>
              <p
                style={{
                  margin: `${spacing.xs} 0 0 0`,
                  fontSize: typography.fontSize["2xl"],
                  fontWeight: typography.fontWeight.bold,
                  color: colors.successDark,
                }}
              >
                {portfolio.activeClients}
              </p>
            </Card>

            <Card variant="elevated">
              <p
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.sm,
                  color: themeColors.text.secondary,
                }}
              >
                Toplam Gelir
              </p>
              <p
                style={{
                  margin: `${spacing.xs} 0 0 0`,
                  fontSize: typography.fontSize["2xl"],
                  fontWeight: typography.fontWeight.bold,
                  color: themeColors.text.primary,
                }}
              >
                {formatCurrency(portfolio.totalRevenue)}
              </p>
            </Card>

            <Card variant="elevated">
              <p
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.sm,
                  color: themeColors.text.secondary,
                }}
              >
                Ort. Gelir/Müşteri
              </p>
              <p
                style={{
                  margin: `${spacing.xs} 0 0 0`,
                  fontSize: typography.fontSize["2xl"],
                  fontWeight: typography.fontWeight.bold,
                  color: themeColors.text.primary,
                }}
              >
                {formatCurrency(portfolio.averageRevenuePerClient)}
              </p>
            </Card>
          </div>

          {/* Risk Distribution */}
          <Card variant="elevated" title="Risk Dağılımı" style={{ marginBottom: spacing.lg }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: spacing.md,
              }}
            >
              <div
                style={{
                  padding: spacing.md,
                  borderRadius: borderRadius.md,
                  backgroundColor: colors.dangerLight,
                  border: `2px solid ${colors.danger}`,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: typography.fontSize.sm,
                    color: themeColors.text.secondary,
                    fontWeight: typography.fontWeight.medium,
                  }}
                >
                  Yüksek Risk
                </p>
                <p
                  style={{
                    margin: `${spacing.xs} 0 0 0`,
                    fontSize: typography.fontSize.xl,
                    fontWeight: typography.fontWeight.bold,
                    color: colors.dangerDark,
                  }}
                >
                  {portfolio.highRiskClients}
                </p>
              </div>
              <div
                style={{
                  padding: spacing.md,
                  borderRadius: borderRadius.md,
                  backgroundColor: colors.warningLight,
                  border: `2px solid ${colors.warning}`,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: typography.fontSize.sm,
                    color: themeColors.text.secondary,
                    fontWeight: typography.fontWeight.medium,
                  }}
                >
                  Orta Risk
                </p>
                <p
                  style={{
                    margin: `${spacing.xs} 0 0 0`,
                    fontSize: typography.fontSize.xl,
                    fontWeight: typography.fontWeight.bold,
                    color: colors.warningDark,
                  }}
                >
                  {portfolio.mediumRiskClients}
                </p>
              </div>
              <div
                style={{
                  padding: spacing.md,
                  borderRadius: borderRadius.md,
                  backgroundColor: colors.successLight,
                  border: `2px solid ${colors.success}`,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: typography.fontSize.sm,
                    color: themeColors.text.secondary,
                    fontWeight: typography.fontWeight.medium,
                  }}
                >
                  Düşük Risk
                </p>
                <p
                  style={{
                    margin: `${spacing.xs} 0 0 0`,
                    fontSize: typography.fontSize.xl,
                    fontWeight: typography.fontWeight.bold,
                    color: colors.successDark,
                  }}
                >
                  {portfolio.lowRiskClients}
                </p>
              </div>
            </div>
          </Card>

          {/* Top Clients */}
          {portfolio.topClients && portfolio.topClients.length > 0 && (
            <Card variant="elevated" title="En İyi Müşteriler">
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
                        Müşteri
                      </th>
                      <th
                        style={{
                          padding: spacing.md,
                          textAlign: "right",
                          fontSize: typography.fontSize.sm,
                          fontWeight: typography.fontWeight.semibold,
                          color: themeColors.text.primary,
                        }}
                      >
                        Gelir
                      </th>
                      <th
                        style={{
                          padding: spacing.md,
                          textAlign: "right",
                          fontSize: typography.fontSize.sm,
                          fontWeight: typography.fontWeight.semibold,
                          color: themeColors.text.primary,
                        }}
                      >
                        Risk Skoru
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.topClients.map((client, _index) => (
                      <tr
                        key={client.clientId}
                        style={{
                          borderBottom: `1px solid ${themeColors.border}`,
                        }}
                      >
                        <td style={{ padding: spacing.md }}>{client.clientName}</td>
                        <td
                          style={{
                            padding: spacing.md,
                            textAlign: "right",
                            color: colors.successDark,
                            fontWeight: typography.fontWeight.medium,
                          }}
                        >
                          {formatCurrency(client.revenue)}
                        </td>
                        <td style={{ padding: spacing.md, textAlign: "right" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: `${spacing.xs} ${spacing.sm}`,
                              borderRadius: borderRadius.sm,
                              backgroundColor:
                                client.riskScore >= 75
                                  ? colors.danger
                                  : client.riskScore >= 50
                                  ? colors.warning
                                  : colors.success,
                              color: colors.white,
                              fontWeight: typography.fontWeight.medium,
                              minWidth: "60px",
                            }}
                          >
                            {client.riskScore.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
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

