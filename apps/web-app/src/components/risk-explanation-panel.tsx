"use client";

import { useQuery } from "@tanstack/react-query";
import { colors, spacing, borderRadius, typography } from "@/styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";

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
  const { themeColors } = useTheme();

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
    return <div style={{ padding: spacing.md }}>Yükleniyor...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: spacing.md, color: colors.danger }}>
        Risk açıklaması yüklenirken bir hata oluştu.
      </div>
    );
  }

  const explanation: RiskExplanation = data?.data;

  if (!explanation) {
    return null;
  }

  return (
    <div style={{ padding: spacing.md, backgroundColor: themeColors.white, borderRadius: borderRadius.md }}>
      <h3 style={{ marginBottom: spacing.md }}>Risk Açıklaması</h3>

      <div style={{ marginBottom: "20px", padding: spacing.md, backgroundColor: themeColors.gray[50], borderRadius: borderRadius.sm }}>
        <div style={{ fontSize: typography.fontSize.sm, color: themeColors.text.secondary, marginBottom: spacing.sm }}>Özet</div>
        <div style={{ fontSize: typography.fontSize.base }}>{explanation.summary}</div>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h4 style={{ marginBottom: spacing.md, fontSize: typography.fontSize.base }}>Katkıda Bulunan Faktörler</h4>
        <div style={{ display: "grid", gap: spacing.sm }}>
          {explanation.contributingFactors.map((factor, index) => (
            <div
              key={index}
              style={{
                padding: spacing.md,
                backgroundColor: factor.triggered ? themeColors.dangerLight : themeColors.gray[50],
                borderRadius: borderRadius.sm,
                border: factor.triggered ? `1px solid ${colors.danger}` : `1px solid ${themeColors.border}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: spacing.xs }}>
                <strong>{factor.ruleCode}</strong>
                <span
                  style={{
                    padding: `2px 6px`,
                    borderRadius: borderRadius.sm,
                    fontSize: typography.fontSize.xs,
                    backgroundColor: factor.triggered ? colors.danger : colors.success,
                    color: colors.white,
                  }}
                >
                  {factor.triggered ? "Tetiklenmiş" : "Normal"}
                </span>
              </div>
              <div style={{ fontSize: typography.fontSize.sm, color: themeColors.text.secondary, marginBottom: spacing.xs }}>
                {factor.ruleDescription}
              </div>
              <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted }}>
                Ağırlık: {factor.weight.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {explanation.recommendations.length > 0 && (
        <div>
          <h4 style={{ marginBottom: spacing.md, fontSize: typography.fontSize.base }}>Öneriler</h4>
          <ul style={{ paddingLeft: "20px", margin: 0 }}>
            {explanation.recommendations.map((rec, index) => (
              <li key={index} style={{ marginBottom: spacing.sm, fontSize: typography.fontSize.sm }}>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
