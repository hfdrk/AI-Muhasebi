"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { colors, spacing, borderRadius, shadows, transitions, typography } from "@/styles/design-system";

interface RiskHeatMapClient {
  id: string;
  name: string;
  riskScore: number;
  severity: "low" | "medium" | "high";
  alertCount: number;
  documentCount: number;
}

interface RiskHeatMapProps {
  heatmap: {
    clients: RiskHeatMapClient[];
    riskMatrix: {
      low: { low: number; medium: number; high: number };
      medium: { low: number; medium: number; high: number };
      high: { low: number; medium: number; high: number };
    };
    totalClients: number;
    averageRiskScore: number;
  };
}

export default function RiskHeatMap({ heatmap }: RiskHeatMapProps) {
  const router = useRouter();

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "#c2410c";
      case "medium":
        return "#d97706";
      case "low":
        return "#059669";
      default:
        return colors.gray[300];
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case "high":
        return colors.dangerPastel;
      case "medium":
        return colors.warningPastel;
      case "low":
        return colors.successPastel;
      default:
        return colors.gray[50];
    }
  };

  return (
    <Card
      style={{
        marginBottom: spacing.xl,
        padding: spacing.xl,
        background: colors.gradients.pastelWarning,
        border: `1px solid ${colors.border}`,
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
          Risk Haritası
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: typography.fontSize.sm,
            color: colors.text.secondary,
          }}
        >
          {heatmap.totalClients} müşteri • Ortalama Risk: {heatmap.averageRiskScore.toFixed(1)}
        </p>
      </div>

      {/* Risk Matrix */}
      <div style={{ marginBottom: spacing.xl }}>
        <h4
          style={{
            margin: 0,
            marginBottom: spacing.md,
            fontSize: typography.fontSize.base,
            fontWeight: typography.fontWeight.semibold,
          }}
        >
          Risk Matrisi
        </h4>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: spacing.sm,
            marginBottom: spacing.md,
          }}
        >
          <div></div>
          <div style={{ textAlign: "center", fontWeight: typography.fontWeight.semibold }}>Düşük Etki</div>
          <div style={{ textAlign: "center", fontWeight: typography.fontWeight.semibold }}>Orta Etki</div>
          <div style={{ textAlign: "center", fontWeight: typography.fontWeight.semibold }}>Yüksek Etki</div>

          <div style={{ fontWeight: typography.fontWeight.semibold }}>Düşük Olasılık</div>
          <div
            style={{
              padding: spacing.md,
              backgroundColor: colors.successPastel,
              borderRadius: borderRadius.md,
              textAlign: "center",
              fontWeight: typography.fontWeight.bold,
            }}
          >
            {heatmap.riskMatrix.low.low}
          </div>
          <div
            style={{
              padding: spacing.md,
              backgroundColor: colors.warningLight,
              borderRadius: borderRadius.md,
              textAlign: "center",
              fontWeight: typography.fontWeight.bold,
            }}
          >
            {heatmap.riskMatrix.low.medium}
          </div>
          <div
            style={{
              padding: spacing.md,
              backgroundColor: colors.dangerPastel,
              borderRadius: borderRadius.md,
              textAlign: "center",
              fontWeight: typography.fontWeight.bold,
            }}
          >
            {heatmap.riskMatrix.low.high}
          </div>

          <div style={{ fontWeight: typography.fontWeight.semibold }}>Orta Olasılık</div>
          <div
            style={{
              padding: spacing.md,
              backgroundColor: colors.successPastel,
              borderRadius: borderRadius.md,
              textAlign: "center",
              fontWeight: typography.fontWeight.bold,
            }}
          >
            {heatmap.riskMatrix.medium.low}
          </div>
          <div
            style={{
              padding: spacing.md,
              backgroundColor: colors.warningLight,
              borderRadius: borderRadius.md,
              textAlign: "center",
              fontWeight: typography.fontWeight.bold,
            }}
          >
            {heatmap.riskMatrix.medium.medium}
          </div>
          <div
            style={{
              padding: spacing.md,
              backgroundColor: colors.dangerPastel,
              borderRadius: borderRadius.md,
              textAlign: "center",
              fontWeight: typography.fontWeight.bold,
            }}
          >
            {heatmap.riskMatrix.medium.high}
          </div>

          <div style={{ fontWeight: typography.fontWeight.semibold }}>Yüksek Olasılık</div>
          <div
            style={{
              padding: spacing.md,
              backgroundColor: colors.successPastel,
              borderRadius: borderRadius.md,
              textAlign: "center",
              fontWeight: typography.fontWeight.bold,
            }}
          >
            {heatmap.riskMatrix.high.low}
          </div>
          <div
            style={{
              padding: spacing.md,
              backgroundColor: colors.warningLight,
              borderRadius: borderRadius.md,
              textAlign: "center",
              fontWeight: typography.fontWeight.bold,
            }}
          >
            {heatmap.riskMatrix.high.medium}
          </div>
          <div
            style={{
              padding: spacing.md,
              backgroundColor: colors.dangerPastel,
              borderRadius: borderRadius.md,
              textAlign: "center",
              fontWeight: typography.fontWeight.bold,
            }}
          >
            {heatmap.riskMatrix.high.high}
          </div>
        </div>
      </div>

      {/* Client Grid */}
      <div>
        <h4
          style={{
            margin: 0,
            marginBottom: spacing.md,
            fontSize: typography.fontSize.base,
            fontWeight: typography.fontWeight.semibold,
          }}
        >
          Müşteriler (Risk Skoruna Göre)
        </h4>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: spacing.md,
          }}
        >
          {heatmap.clients.slice(0, 20).map((client) => (
            <div
              key={client.id}
              onClick={() => router.push(`/musteriler/${client.id}`)}
              style={{
                padding: spacing.md,
                backgroundColor: getSeverityBg(client.severity),
                borderRadius: borderRadius.lg,
                border: `2px solid ${getSeverityColor(client.severity)}`,
                cursor: "pointer",
                transition: `all ${transitions.normal} ease`,
                boxShadow: shadows.sm,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = shadows.md;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = shadows.sm;
              }}
            >
              <div
                style={{
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold,
                  marginBottom: spacing.xs,
                  color: colors.text.primary,
                }}
              >
                {client.name}
              </div>
              <div
                style={{
                  fontSize: typography.fontSize["2xl"],
                  fontWeight: typography.fontWeight.bold,
                  color: getSeverityColor(client.severity),
                  marginBottom: spacing.xs,
                }}
              >
                {client.riskScore.toFixed(0)}
              </div>
              <div
                style={{
                  fontSize: typography.fontSize.xs,
                  color: colors.text.secondary,
                }}
              >
                {client.alertCount} uyarı • {client.documentCount} belge
              </div>
            </div>
          ))}
        </div>
        {heatmap.clients.length > 20 && (
          <div style={{ marginTop: spacing.md, textAlign: "center" }}>
            <button
              onClick={() => router.push("/musteriler")}
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
              Tüm Müşterileri Gör ({heatmap.clients.length})
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

