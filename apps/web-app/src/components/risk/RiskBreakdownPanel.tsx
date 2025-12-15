"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card } from "@/components/ui/Card";
import { colors, spacing, borderRadius, typography } from "@/styles/design-system";

interface RiskBreakdownPanelProps {
  breakdown: {
    totalRiskScore: number;
    categoryBreakdown: {
      fraud: { score: number; percentage: number };
      compliance: { score: number; percentage: number };
      financial: { score: number; percentage: number };
      operational: { score: number; percentage: number };
    };
    topRiskFactors: Array<{
      name: string;
      contribution: number;
      ruleCode: string;
      severity: string;
    }>;
    triggeredRules: Array<{
      code: string;
      description: string;
      weight: number;
      severity: string;
      count: number;
    }>;
  };
}

export default function RiskBreakdownPanel({ breakdown }: RiskBreakdownPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const pieData = [
    { name: "Dolandırıcılık", value: breakdown.categoryBreakdown.fraud.percentage, color: "#f87171" },
    { name: "Uyumluluk", value: breakdown.categoryBreakdown.compliance.percentage, color: "#fbbf24" },
    { name: "Finansal", value: breakdown.categoryBreakdown.financial.percentage, color: "#60a5fa" },
    { name: "Operasyonel", value: breakdown.categoryBreakdown.operational.percentage, color: "#93c5fd" },
  ].filter((item) => item.value > 0);

  return (
    <Card
      style={{
        marginBottom: spacing.xl,
        padding: spacing.xl,
        background: colors.gradients.pastelInfo,
        border: `1px solid ${colors.border}`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg }}>
        <div>
          <h3
            style={{
              margin: 0,
              marginBottom: spacing.xs,
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.bold,
              color: colors.text.primary,
            }}
          >
            Risk Skoru Detayları
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
            }}
          >
            Toplam Risk Skoru: <strong>{breakdown.totalRiskScore.toFixed(1)}</strong>
          </p>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            padding: `${spacing.sm} ${spacing.md}`,
            background: `linear-gradient(135deg, #93c5fd 0%, #60a5fa 100%)`,
            color: colors.white,
            border: "none",
            borderRadius: borderRadius.md,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.semibold,
            cursor: "pointer",
          }}
        >
          {isExpanded ? "Gizle" : "Detayları Göster"}
        </button>
      </div>

      {isExpanded && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.xl }}>
          {/* Pie Chart */}
          <div>
            <h4
              style={{
                margin: 0,
                marginBottom: spacing.md,
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.semibold,
              }}
            >
              Risk Kategorileri
            </h4>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Top Risk Factors */}
          <div>
            <h4
              style={{
                margin: 0,
                marginBottom: spacing.md,
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.semibold,
              }}
            >
              En Önemli Risk Faktörleri
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
              {breakdown.topRiskFactors.map((factor, index) => (
                <div
                  key={index}
                  style={{
                    padding: spacing.md,
                    backgroundColor: colors.gray[50],
                    borderRadius: borderRadius.md,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.medium,
                      }}
                    >
                      {factor.name}
                    </span>
                    <span
                      style={{
                        padding: `${spacing.xs} ${spacing.sm}`,
                        backgroundColor:
                          factor.severity === "high"
                            ? "#f87171"
                            : factor.severity === "medium"
                              ? "#fbbf24"
                              : "#6ee7b7",
                        color: colors.white,
                        borderRadius: borderRadius.sm,
                        fontSize: typography.fontSize.xs,
                        fontWeight: typography.fontWeight.bold,
                      }}
                    >
                      %{(factor.contribution * 100).toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}


