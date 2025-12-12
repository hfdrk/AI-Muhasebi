"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { colors, spacing, borderRadius, shadows, transitions, typography } from "@/styles/design-system";

interface Recommendation {
  id: string;
  type: "urgent" | "preventive" | "optimization";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  actionUrl: string;
  actionLabel: string;
  relatedMetric: string;
  impact: string;
}

interface RecommendationsWidgetProps {
  recommendations: Recommendation[];
}

export default function RecommendationsWidget({ recommendations }: RecommendationsWidgetProps) {
  const router = useRouter();

  if (recommendations.length === 0) {
    return null;
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "urgent":
        return "#f87171"; // Pastel red
      case "preventive":
        return "#fbbf24"; // Pastel orange
      case "optimization":
        return "#6ee7b7"; // Pastel green
      default:
        return "#93c5fd"; // Pastel blue
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "urgent":
        return "🚨";
      case "preventive":
        return "⚠️";
      case "optimization":
        return "✅";
      default:
        return "💡";
    }
  };

  return (
    <Card
      style={{
        marginBottom: spacing.xl,
        padding: spacing.xl,
        background: `linear-gradient(135deg, ${colors.primaryLighter} 0%, ${colors.white} 100%)`,
        border: `2px solid ${colors.primary}30`,
      }}
    >
      <div style={{ marginBottom: spacing.lg }}>
        <h3
          style={{
            margin: 0,
            marginBottom: spacing.xs,
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
          }}
        >
          Önerilen Aksiyonlar
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: typography.fontSize.sm,
            color: colors.text.secondary,
          }}
        >
          Risk yönetimi için önerilen aksiyonlar
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            style={{
              padding: spacing.md,
              backgroundColor: colors.white,
              borderRadius: borderRadius.lg,
              border: `1px solid ${colors.border}`,
              borderLeft: `4px solid ${getTypeColor(rec.type)}`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xs }}>
                  <span style={{ fontSize: "20px" }}>{getTypeIcon(rec.type)}</span>
                  <span
                    style={{
                      fontSize: typography.fontSize.base,
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.text.primary,
                    }}
                  >
                    {rec.title}
                  </span>
                  <span
                    style={{
                      padding: `${spacing.xs} ${spacing.sm}`,
                      backgroundColor: getTypeColor(rec.type),
                      color: colors.white,
                      borderRadius: borderRadius.sm,
                      fontSize: typography.fontSize.xs,
                      fontWeight: typography.fontWeight.bold,
                    }}
                  >
                    {rec.priority === "high" ? "YÜKSEK" : rec.priority === "medium" ? "ORTA" : "DÜŞÜK"}
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    marginBottom: spacing.sm,
                    fontSize: typography.fontSize.sm,
                    color: colors.text.secondary,
                  }}
                >
                  {rec.description}
                </p>
                <button
                  onClick={() => router.push(rec.actionUrl)}
                  style={{
                    padding: `${spacing.sm} ${spacing.md}`,
                    background: `linear-gradient(135deg, #93c5fd 0%, #60a5fa 100%)`,
                    color: colors.white,
                    border: "none",
                    borderRadius: borderRadius.md,
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.semibold,
                    cursor: "pointer",
                    transition: `all ${transitions.normal} ease`,
                    boxShadow: shadows.sm,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = shadows.md;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = shadows.sm;
                  }}
                >
                  {rec.actionLabel} →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

