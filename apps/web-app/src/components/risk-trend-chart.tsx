"use client";

import { useQuery } from "@tanstack/react-query";
import { colors, spacing, borderRadius, typography } from "@/styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";

interface RiskScoreHistory {
  date: Date;
  score: number;
  severity: "low" | "medium" | "high";
}

interface RiskTrendData {
  history: RiskScoreHistory[];
  currentScore: number;
  previousScore: number | null;
  trend: "increasing" | "decreasing" | "stable";
  averageScore: number;
  minScore: number;
  maxScore: number;
}

interface RiskTrendChartProps {
  type: "document" | "company";
  id: string;
  days?: number;
}

export default function RiskTrendChart({ type, id, days = 90 }: RiskTrendChartProps) {
  const { themeColors } = useTheme();

  const { data, isLoading, error } = useQuery({
    queryKey: ["risk-trend", type, id, days],
    queryFn: async () => {
      const endpoint = type === "document"
        ? `/api/v1/risk/documents/${id}/trend?days=${days}`
        : `/api/v1/risk/companies/${id}/trend?days=${days}`;

      const response = await fetch(endpoint);
      if (!response.ok) throw new Error("Failed to fetch risk trend");
      return response.json();
    },
  });

  if (isLoading) {
    return <div style={{ padding: spacing.md }}>Yükleniyor...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: spacing.md, color: colors.danger }}>
        Risk trend verisi yüklenirken bir hata oluştu.
      </div>
    );
  }

  const trendData: RiskTrendData = data?.data;

  if (!trendData || trendData.history.length === 0) {
    return (
      <div style={{ padding: spacing.md, color: themeColors.text.secondary }}>
        Henüz yeterli veri bulunmuyor.
      </div>
    );
  }

  // Simple line chart using divs (in production, use a charting library like recharts)
  const maxScore = Math.max(trendData.maxScore, 100);
  const minScore = Math.min(trendData.minScore, 0);

  return (
    <div style={{ padding: spacing.md, backgroundColor: themeColors.white, borderRadius: borderRadius.md }}>
      <h3 style={{ marginBottom: spacing.md }}>Risk Skoru Trendi</h3>

      <div style={{ marginBottom: spacing.md }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: spacing.sm }}>
          <span style={{ fontSize: typography.fontSize.sm, color: themeColors.text.secondary }}>Mevcut Skor</span>
          <span style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold }}>{trendData.currentScore.toFixed(1)}</span>
        </div>
        {trendData.previousScore !== null && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: spacing.sm }}>
            <span style={{ fontSize: typography.fontSize.sm, color: themeColors.text.secondary }}>Önceki Skor</span>
            <span style={{ fontSize: typography.fontSize.sm }}>{trendData.previousScore.toFixed(1)}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: spacing.sm }}>
          <span style={{ fontSize: typography.fontSize.sm, color: themeColors.text.secondary }}>Trend</span>
          <span
            style={{
              fontSize: typography.fontSize.sm,
              color:
                trendData.trend === "increasing"
                  ? colors.danger
                  : trendData.trend === "decreasing"
                  ? colors.success
                  : themeColors.text.secondary,
            }}
          >
            {trendData.trend === "increasing"
              ? "↑ Artıyor"
              : trendData.trend === "decreasing"
              ? "↓ Azalıyor"
              : "→ Stabil"}
          </span>
        </div>
      </div>

      {/* Simple bar chart representation */}
      <div style={{ marginTop: "20px" }}>
        <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.secondary, marginBottom: spacing.sm }}>Skor Geçmişi</div>
        <div style={{ display: "flex", gap: spacing.xs, alignItems: "flex-end", height: "100px" }}>
          {trendData.history.map((point, index) => {
            const height = ((point.score - minScore) / (maxScore - minScore)) * 100;
            return (
              <div
                key={index}
                style={{
                  flex: 1,
                  height: `${height}%`,
                  backgroundColor:
                    point.severity === "high"
                      ? colors.danger
                      : point.severity === "medium"
                      ? colors.warning
                      : colors.success,
                  borderRadius: `${borderRadius.sm} ${borderRadius.sm} 0 0`,
                  minHeight: spacing.xs,
                }}
                title={`${new Date(point.date).toLocaleDateString("tr-TR")}: ${point.score.toFixed(1)}`}
              />
            );
          })}
        </div>
        <div style={{ fontSize: "10px", color: themeColors.text.muted, marginTop: spacing.xs, textAlign: "center" }}>
          {trendData.history.length} veri noktası
        </div>
      </div>
    </div>
  );
}
