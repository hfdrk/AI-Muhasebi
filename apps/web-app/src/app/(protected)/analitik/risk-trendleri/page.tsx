"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsClient } from "@repo/api-client";
import Link from "next/link";
import { Card } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { colors, spacing, borderRadius, shadows, typography, transitions } from "../../../../styles/design-system";

export default function RiskTrendsPage() {
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [granularity, setGranularity] = useState<"daily" | "weekly" | "monthly">("monthly");

  // Fetch risk trends
  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ["risk-trends", startDate, endDate, granularity],
    queryFn: () => analyticsClient.getRiskTrends(startDate, endDate, granularity),
  });

  const trends = trendsData?.data || [];

  const getRiskColor = (score: number) => {
    if (score >= 75) return colors.danger;
    if (score >= 50) return colors.warning;
    if (score >= 25) return colors.info;
    return colors.success;
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
          <Button variant="ghost" asLink href="/analitik" icon="←">
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
          Risk Trendleri
        </h1>
        <p
          style={{
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
            lineHeight: typography.lineHeight.relaxed,
            margin: 0,
          }}
        >
          Risk skorları, yüksek riskli müşteri sayısı ve kritik uyarı trendlerini analiz edin.
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
              Detay Seviyesi
            </label>
            <select
              value={granularity}
              onChange={(e) =>
                setGranularity(e.target.value as "daily" | "weekly" | "monthly")
              }
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
              <option value="daily">Günlük</option>
              <option value="weekly">Haftalık</option>
              <option value="monthly">Aylık</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Trends Table */}
      {trendsLoading ? (
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
      ) : trends.length === 0 ? (
        <Card variant="elevated">
          <div style={{ padding: spacing.xl, textAlign: "center" }}>
            <p style={{ color: colors.text.secondary, margin: 0 }}>
              Seçilen dönem için veri bulunamadı.
            </p>
          </div>
        </Card>
      ) : (
        <Card variant="elevated" title={`Risk Trendleri (${trends.length} dönem)`}>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr style={{ borderBottom: `2px solid ${colors.border}` }}>
                  <th
                    style={{
                      padding: spacing.md,
                      textAlign: "left",
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.text.primary,
                    }}
                  >
                    Dönem
                  </th>
                  <th
                    style={{
                      padding: spacing.md,
                      textAlign: "right",
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.text.primary,
                    }}
                  >
                    Ort. Risk Skoru
                  </th>
                  <th
                    style={{
                      padding: spacing.md,
                      textAlign: "right",
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.text.primary,
                    }}
                  >
                    Yüksek Riskli Müşteri
                  </th>
                  <th
                    style={{
                      padding: spacing.md,
                      textAlign: "right",
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.text.primary,
                    }}
                  >
                    Kritik Uyarı
                  </th>
                  <th
                    style={{
                      padding: spacing.md,
                      textAlign: "right",
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.text.primary,
                    }}
                  >
                    Değişim
                  </th>
                </tr>
              </thead>
              <tbody>
                {trends.map((trend, index) => (
                  <tr
                    key={index}
                    style={{
                      borderBottom: `1px solid ${colors.border}`,
                    }}
                  >
                    <td style={{ padding: spacing.md }}>{trend.period}</td>
                    <td style={{ padding: spacing.md, textAlign: "right" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: `${spacing.xs} ${spacing.sm}`,
                          borderRadius: borderRadius.sm,
                          backgroundColor: getRiskColor(trend.averageRiskScore),
                          color: colors.white,
                          fontWeight: typography.fontWeight.semibold,
                          minWidth: "60px",
                        }}
                      >
                        {trend.averageRiskScore.toFixed(2)}
                      </span>
                    </td>
                    <td style={{ padding: spacing.md, textAlign: "right" }}>
                      {trend.highRiskClientCount}
                    </td>
                    <td style={{ padding: spacing.md, textAlign: "right" }}>
                      {trend.criticalAlertsCount}
                    </td>
                    <td
                      style={{
                        padding: spacing.md,
                        textAlign: "right",
                        color:
                          trend.riskScoreChange >= 0
                            ? colors.dangerDark
                            : colors.successDark,
                        fontWeight: typography.fontWeight.medium,
                      }}
                    >
                      {trend.riskScoreChange >= 0 ? "+" : ""}
                      {trend.riskScoreChange.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

