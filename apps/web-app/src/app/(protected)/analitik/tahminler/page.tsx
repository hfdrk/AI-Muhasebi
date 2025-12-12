"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsClient } from "@repo/api-client";
import Link from "next/link";
import { Card } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { colors, spacing, borderRadius, shadows, typography, transitions } from "../../../../styles/design-system";

export default function ForecastsPage() {
  const [months, setMonths] = useState<number>(6);
  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<"revenue" | "expense">("revenue");

  // Fetch revenue forecast
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ["revenue-forecast", months, startDate],
    queryFn: () => analyticsClient.getRevenueForecast(months, startDate),
    enabled: activeTab === "revenue",
  });

  // Fetch expense forecast
  const { data: expenseData, isLoading: expenseLoading } = useQuery({
    queryKey: ["expense-forecast", months, startDate],
    queryFn: () => analyticsClient.getExpenseForecast(months, startDate),
    enabled: activeTab === "expense",
  });

  const revenueForecast = revenueData?.data || [];
  const expenseForecast = expenseData?.data || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const isLoading = activeTab === "revenue" ? revenueLoading : expenseLoading;
  const forecast = activeTab === "revenue" ? revenueForecast : expenseForecast;

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
          Gelir ve Gider Tahminleri
        </h1>
        <p
          style={{
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
            lineHeight: typography.lineHeight.relaxed,
            margin: 0,
          }}
        >
          Gelecek dönemler için gelir ve gider tahminlerini görüntüleyin. Tahminler geçmiş verilere dayanarak
          oluşturulur.
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
              Tahmin Süresi (Ay)
            </label>
            <input
              type="number"
              value={months}
              onChange={(e) => setMonths(parseInt(e.target.value, 10) || 6)}
              min={1}
              max={24}
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
                border: `1px solid ${colors.border}`,
                fontSize: typography.fontSize.base,
                backgroundColor: colors.white,
                color: colors.text.primary,
              }}
            />
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: spacing.sm,
          marginBottom: spacing.lg,
          borderBottom: `2px solid ${colors.border}`,
        }}
      >
        <button
          onClick={() => setActiveTab("revenue")}
          style={{
            padding: `${spacing.sm} ${spacing.md}`,
            border: "none",
            borderBottom: `3px solid ${activeTab === "revenue" ? colors.primary : "transparent"}`,
            backgroundColor: "transparent",
            color: activeTab === "revenue" ? colors.primary : colors.text.secondary,
            fontSize: typography.fontSize.base,
            fontWeight:
              activeTab === "revenue"
                ? typography.fontWeight.semibold
                : typography.fontWeight.normal,
            cursor: "pointer",
            transition: `all ${transitions.normal} ease`,
          }}
        >
          Gelir Tahminleri
        </button>
        <button
          onClick={() => setActiveTab("expense")}
          style={{
            padding: `${spacing.sm} ${spacing.md}`,
            border: "none",
            borderBottom: `3px solid ${activeTab === "expense" ? colors.primary : "transparent"}`,
            backgroundColor: "transparent",
            color: activeTab === "expense" ? colors.primary : colors.text.secondary,
            fontSize: typography.fontSize.base,
            fontWeight:
              activeTab === "expense"
                ? typography.fontWeight.semibold
                : typography.fontWeight.normal,
            cursor: "pointer",
            transition: `all ${transitions.normal} ease`,
          }}
        >
          Gider Tahminleri
        </button>
      </div>

      {/* Forecast Table */}
      {isLoading ? (
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
      ) : forecast.length === 0 ? (
        <Card variant="elevated">
          <div style={{ padding: spacing.xl, textAlign: "center" }}>
            <p style={{ color: colors.text.secondary, margin: 0 }}>
              Tahmin verisi bulunamadı.
            </p>
          </div>
        </Card>
      ) : (
        <Card variant="elevated" title={`${activeTab === "revenue" ? "Gelir" : "Gider"} Tahminleri`}>
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
                    Tahmin
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
                    Alt Sınır
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
                    Üst Sınır
                  </th>
                </tr>
              </thead>
              <tbody>
                {forecast.map((item: any, index: number) => (
                  <tr
                    key={index}
                    style={{
                      borderBottom: `1px solid ${colors.border}`,
                    }}
                  >
                    <td style={{ padding: spacing.md }}>{item.period}</td>
                    <td
                      style={{
                        padding: spacing.md,
                        textAlign: "right",
                        color: activeTab === "revenue" ? colors.successDark : colors.dangerDark,
                        fontWeight: typography.fontWeight.semibold,
                      }}
                    >
                      {formatCurrency(item.forecastedRevenue || item.forecastedExpenses)}
                    </td>
                    <td
                      style={{
                        padding: spacing.md,
                        textAlign: "right",
                        color: colors.text.secondary,
                      }}
                    >
                      {formatCurrency(
                        item.confidenceInterval?.lower ||
                          item.lowerBound ||
                          0
                      )}
                    </td>
                    <td
                      style={{
                        padding: spacing.md,
                        textAlign: "right",
                        color: colors.text.secondary,
                      }}
                    >
                      {formatCurrency(
                        item.confidenceInterval?.upper ||
                          item.upperBound ||
                          0
                      )}
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

