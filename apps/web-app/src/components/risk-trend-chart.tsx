"use client";

import { useQuery } from "@tanstack/react-query";

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
    return <div style={{ padding: "16px" }}>Yükleniyor...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: "16px", color: "#dc2626" }}>
        Risk trend verisi yüklenirken bir hata oluştu.
      </div>
    );
  }

  const trendData: RiskTrendData = data?.data;

  if (!trendData || trendData.history.length === 0) {
    return (
      <div style={{ padding: "16px", color: "#666" }}>
        Henüz yeterli veri bulunmuyor.
      </div>
    );
  }

  // Simple line chart using divs (in production, use a charting library like recharts)
  const maxScore = Math.max(trendData.maxScore, 100);
  const minScore = Math.min(trendData.minScore, 0);

  return (
    <div style={{ padding: "16px", backgroundColor: "white", borderRadius: "8px" }}>
      <h3 style={{ marginBottom: "16px" }}>Risk Skoru Trendi</h3>

      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <span style={{ fontSize: "14px", color: "#666" }}>Mevcut Skor</span>
          <span style={{ fontSize: "18px", fontWeight: "bold" }}>{trendData.currentScore.toFixed(1)}</span>
        </div>
        {trendData.previousScore !== null && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "14px", color: "#666" }}>Önceki Skor</span>
            <span style={{ fontSize: "14px" }}>{trendData.previousScore.toFixed(1)}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <span style={{ fontSize: "14px", color: "#666" }}>Trend</span>
          <span
            style={{
              fontSize: "14px",
              color:
                trendData.trend === "increasing"
                  ? "#dc2626"
                  : trendData.trend === "decreasing"
                  ? "#10b981"
                  : "#666",
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
        <div style={{ fontSize: "12px", color: "#666", marginBottom: "8px" }}>Skor Geçmişi</div>
        <div style={{ display: "flex", gap: "4px", alignItems: "flex-end", height: "100px" }}>
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
                      ? "#dc2626"
                      : point.severity === "medium"
                      ? "#f59e0b"
                      : "#10b981",
                  borderRadius: "4px 4px 0 0",
                  minHeight: "4px",
                }}
                title={`${new Date(point.date).toLocaleDateString("tr-TR")}: ${point.score.toFixed(1)}`}
              />
            );
          })}
        </div>
        <div style={{ fontSize: "10px", color: "#999", marginTop: "4px", textAlign: "center" }}>
          {trendData.history.length} veri noktası
        </div>
      </div>
    </div>
  );
}



