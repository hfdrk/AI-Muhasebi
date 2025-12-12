"use client";

import { useQuery } from "@tanstack/react-query";

interface RiskExplanation {
  score: number;
  severity: "low" | "medium" | "high";
  contributingFactors: Array<{
    ruleCode: string;
    ruleDescription: string;
    weight: number;
    triggered: boolean;
  }>;
  summary: string;
  recommendations: string[];
}

interface RiskExplanationPanelProps {
  type: "document" | "company";
  id: string;
}

export default function RiskExplanationPanel({ type, id }: RiskExplanationPanelProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["risk-explanation", type, id],
    queryFn: async () => {
      const endpoint = type === "document" 
        ? `/api/v1/risk/documents/${id}/explanation`
        : `/api/v1/risk/companies/${id}/explanation`;
      
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error("Failed to fetch risk explanation");
      return response.json();
    },
  });

  if (isLoading) {
    return <div style={{ padding: "16px" }}>Yükleniyor...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: "16px", color: "#dc2626" }}>
        Risk açıklaması yüklenirken bir hata oluştu.
      </div>
    );
  }

  const explanation: RiskExplanation = data?.data;

  if (!explanation) {
    return null;
  }

  const severityColors = {
    low: "#10b981",
    medium: "#f59e0b",
    high: "#dc2626",
  };

  return (
    <div style={{ padding: "16px", backgroundColor: "white", borderRadius: "8px" }}>
      <h3 style={{ marginBottom: "16px" }}>Risk Açıklaması</h3>

      <div style={{ marginBottom: "20px", padding: "12px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
        <div style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>Özet</div>
        <div style={{ fontSize: "16px" }}>{explanation.summary}</div>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h4 style={{ marginBottom: "12px", fontSize: "16px" }}>Katkıda Bulunan Faktörler</h4>
        <div style={{ display: "grid", gap: "8px" }}>
          {explanation.contributingFactors.map((factor, index) => (
            <div
              key={index}
              style={{
                padding: "12px",
                backgroundColor: factor.triggered ? "#fee2e2" : "#f5f5f5",
                borderRadius: "4px",
                border: factor.triggered ? "1px solid #dc2626" : "1px solid #e0e0e0",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <strong>{factor.ruleCode}</strong>
                <span
                  style={{
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    backgroundColor: factor.triggered ? "#dc2626" : "#10b981",
                    color: "white",
                  }}
                >
                  {factor.triggered ? "Tetiklenmiş" : "Normal"}
                </span>
              </div>
              <div style={{ fontSize: "14px", color: "#666", marginBottom: "4px" }}>
                {factor.ruleDescription}
              </div>
              <div style={{ fontSize: "12px", color: "#999" }}>
                Ağırlık: {factor.weight.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {explanation.recommendations.length > 0 && (
        <div>
          <h4 style={{ marginBottom: "12px", fontSize: "16px" }}>Öneriler</h4>
          <ul style={{ paddingLeft: "20px", margin: 0 }}>
            {explanation.recommendations.map((rec, index) => (
              <li key={index} style={{ marginBottom: "8px", fontSize: "14px" }}>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}


