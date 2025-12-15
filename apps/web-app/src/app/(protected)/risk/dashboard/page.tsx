"use client";

import { useRiskDashboard } from "@/hooks/use-risk";
import { useQuery } from "@tanstack/react-query";
import { riskClient } from "@repo/api-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import RiskExplanationPanel from "@/components/risk-explanation-panel";
import { Card } from "@/components/ui/Card";
import { colors, spacing, borderRadius, shadows, transitions, typography } from "@/styles/design-system";
import { toast } from "@/lib/toast";
import RiskTrendChart from "@/components/risk/RiskTrendChart";
import AlertFrequencyChart from "@/components/risk/AlertFrequencyChart";
import RiskDistributionChart from "@/components/risk/RiskDistributionChart";
import RecommendationsWidget from "@/components/risk/RecommendationsWidget";
import RiskBreakdownPanel from "@/components/risk/RiskBreakdownPanel";
import RiskHeatMap from "@/components/risk/RiskHeatMap";

export default function RiskDashboardPage() {
  const router = useRouter();
  const { data, isLoading, error } = useRiskDashboard();
  const [trendPeriod, setTrendPeriod] = useState<"7d" | "30d" | "90d" | "1y">("30d");

  // Fetch recent alerts for widget
  const { data: recentAlertsData } = useQuery({
    queryKey: ["recent-risk-alerts"],
    queryFn: () => riskClient.getRecentRiskAlerts(5),
    enabled: !!data?.data,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch trends
  const { data: trendsData } = useQuery({
    queryKey: ["risk-trends", trendPeriod],
    queryFn: () => riskClient.getRiskTrends(trendPeriod),
    enabled: !!data?.data,
  });

  // Fetch breakdown
  const { data: breakdownData } = useQuery({
    queryKey: ["risk-breakdown"],
    queryFn: () => riskClient.getRiskBreakdown(),
    enabled: !!data?.data,
  });

  // Fetch recommendations
  const { data: recommendationsData } = useQuery({
    queryKey: ["risk-recommendations"],
    queryFn: () => riskClient.getRiskRecommendations(),
    enabled: !!data?.data,
  });

  // Fetch heatmap
  const { data: heatmapData } = useQuery({
    queryKey: ["risk-heatmap"],
    queryFn: () => riskClient.getRiskHeatMap(),
    enabled: !!data?.data,
  });

  // Fetch forecast
  const { data: forecastData } = useQuery({
    queryKey: ["risk-forecast"],
    queryFn: () => riskClient.getRiskForecast(30),
    enabled: !!data?.data,
  });

  const recentAlerts = recentAlertsData?.data || [];
  const trends = trendsData?.data;
  const breakdown = breakdownData?.data;
  const recommendations = recommendationsData?.data || [];
  const heatmap = heatmapData?.data;
  const forecast = forecastData?.data;

  if (isLoading) {
    return (
      <div>
        {/* Loading Header */}
        <div
          style={{
            marginBottom: spacing.xl,
            padding: spacing.xxl,
            background: colors.gradients.pastelHero,
            borderRadius: borderRadius.xl,
            border: `1px solid ${colors.border}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: spacing.md, marginBottom: spacing.md }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: borderRadius.xl,
                backgroundColor: colors.white,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px",
                boxShadow: shadows.lg,
                animation: "pulse 2s infinite",
              }}
            >
              📊
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  height: "32px",
                  width: "200px",
                  backgroundColor: colors.white,
                  borderRadius: borderRadius.md,
                  marginBottom: spacing.xs,
                  animation: "pulse 2s infinite",
                }}
              />
              <div
                style={{
                  height: "16px",
                  width: "300px",
                  backgroundColor: colors.white,
                  borderRadius: borderRadius.sm,
                  opacity: 0.7,
                  animation: "pulse 2s infinite",
                }}
              />
            </div>
          </div>
        </div>

        {/* Loading Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: spacing.lg }}>
          {[1, 2, 3, 4].map((i) => (
            <Card
              key={i}
              style={{
                padding: spacing.xl,
                minHeight: "180px",
                animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
              }}
            >
              <div
                style={{
                  height: "120px",
                  backgroundColor: colors.gray[100],
                  borderRadius: borderRadius.md,
                }}
              />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    const isAuthError = error instanceof Error && (
      error.message.includes("Yetkilendirme") ||
      error.message.includes("Authorization") ||
      error.message.includes("401") ||
      error.message.includes("Unauthorized")
    );

    const isTenantError = error instanceof Error && (
      error.message.includes("Kiracı bulunamadı") ||
      error.message.includes("tenant") ||
      error.message.includes("Tenant not found")
    );

    return (
      <div>
        {/* Error Header */}
        <div
          style={{
            marginBottom: spacing.xl,
            padding: spacing.xxl,
            background: `linear-gradient(135deg, ${colors.dangerLight} 0%, ${colors.warningLight} 50%, ${colors.primaryLighter} 100%)`,
            borderRadius: borderRadius.xl,
            border: `2px solid ${colors.border}`,
          }}
        >
          <h1
            style={{
              margin: 0,
              marginBottom: spacing.xs,
              fontSize: typography.fontSize["4xl"],
              fontWeight: typography.fontWeight.bold,
              background: colors.gradients.primary,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Risk Panosu
          </h1>
        </div>

        {/* Error Card */}
        <Card
          style={{
            padding: spacing.xxl,
            backgroundColor: isAuthError ? colors.warningLight : isTenantError ? colors.primaryLighter : colors.dangerLight,
            border: `2px solid ${isAuthError ? colors.warning : isTenantError ? colors.primary : colors.danger}`,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "64px", marginBottom: spacing.lg }}>⚠️</div>
            <h2
              style={{
                margin: 0,
                marginBottom: spacing.md,
                fontSize: typography.fontSize.xl,
                fontWeight: typography.fontWeight.bold,
                color: isAuthError ? colors.warning : isTenantError ? colors.primary : colors.danger,
              }}
            >
              Hata Oluştu
            </h2>
            <p
              style={{
                margin: 0,
                marginBottom: spacing.xl,
                fontSize: typography.fontSize.base,
                color: colors.text.secondary,
              }}
            >
              {error instanceof Error ? error.message : "Risk verileri yüklenirken bir hata oluştu."}
            </p>
            {isTenantError && (
              <div>
                <p style={{ marginBottom: spacing.md, fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                  Risk panosunu görüntülemek için önce bir şirket/ofis seçmeniz gerekiyor.
                </p>
                <Link
                  href="/anasayfa"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: spacing.sm,
                    padding: `${spacing.md} ${spacing.xl}`,
                    background: colors.gradients.primary,
                    color: colors.white,
                    borderRadius: borderRadius.lg,
                    textDecoration: "none",
                    fontWeight: typography.fontWeight.semibold,
                    fontSize: typography.fontSize.base,
                    boxShadow: shadows.sm,
                    transition: `all ${transitions.normal} ease`,
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
                  <span>Ana Sayfaya Dön</span>
                  <span>→</span>
                </Link>
              </div>
            )}
            {isAuthError && !isTenantError && (
              <div>
                <p style={{ marginBottom: spacing.md, fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                  Risk panosunu görüntülemek için giriş yapmanız gerekiyor.
                </p>
                <Link
                  href="/auth/login"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: spacing.sm,
                    padding: `${spacing.md} ${spacing.xl}`,
                    background: colors.gradients.primary,
                    color: colors.white,
                    borderRadius: borderRadius.lg,
                    textDecoration: "none",
                    fontWeight: typography.fontWeight.semibold,
                    fontSize: typography.fontSize.base,
                    boxShadow: shadows.md,
                    transition: `all ${transitions.normal} ease`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = shadows.lg;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = shadows.md;
                  }}
                >
                  <span>Giriş Yap</span>
                  <span>→</span>
                </Link>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  const dashboard = data?.data;

  if (!dashboard) {
    return (
      <div>
        {/* Empty State Header */}
        <div
          style={{
            marginBottom: spacing.xl,
            padding: spacing.xxl,
            background: `linear-gradient(135deg, ${colors.dangerLight} 0%, ${colors.warningLight} 50%, ${colors.primaryLighter} 100%)`,
            borderRadius: borderRadius.xl,
            border: `2px solid ${colors.border}`,
          }}
        >
          <h1
            style={{
              margin: 0,
              marginBottom: spacing.xs,
              fontSize: typography.fontSize["4xl"],
              fontWeight: typography.fontWeight.bold,
              background: colors.gradients.primary,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Risk Panosu
          </h1>
        </div>

        {/* Empty State Card */}
        <Card
          style={{
            padding: spacing.xxl,
            textAlign: "center",
            background: `linear-gradient(135deg, ${colors.gray[50]} 0%, ${colors.white} 100%)`,
          }}
        >
          <div style={{ fontSize: "80px", marginBottom: spacing.lg }}>📊</div>
          <h2
            style={{
              margin: 0,
              marginBottom: spacing.md,
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.bold,
              color: colors.text.primary,
            }}
          >
            Henüz Risk Verisi Bulunmuyor
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: typography.fontSize.base,
              color: colors.text.secondary,
            }}
          >
            Risk analizi için belgeler ve işlemler yüklendikten sonra burada görüntülenecektir.
          </p>
        </Card>
      </div>
    );
  }

  const totalClients =
    dashboard.clientRiskDistribution.low +
    dashboard.clientRiskDistribution.medium +
    dashboard.clientRiskDistribution.high;

  return (
    <div>
      {/* Enhanced Header with Hero Section */}
      <div
        style={{
          marginBottom: spacing.xl,
          padding: spacing.xxl,
          background: colors.gradients.pastelHero,
          borderRadius: borderRadius.xl,
          border: `1px solid ${colors.border}`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative elements - softer */}
        <div
          style={{
            position: "absolute",
            top: "-50px",
            right: "-50px",
            width: "200px",
            height: "200px",
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(99, 102, 241, 0.05) 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-30px",
            left: "-30px",
            width: "150px",
            height: "150px",
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(251, 191, 36, 0.05) 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: spacing.md, marginBottom: spacing.md }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: borderRadius.xl,
                background: colors.primaryPastel,
                border: `1px solid ${colors.primaryLighter}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px",
                boxShadow: shadows.sm,
              }}
            >
              📊
            </div>
            <div style={{ flex: 1 }}>
              <h1
                style={{
                  margin: 0,
                  marginBottom: spacing.xs,
                  fontSize: typography.fontSize["4xl"],
                  fontWeight: typography.fontWeight.bold,
                  background: colors.gradients.primary,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Risk Panosu
              </h1>
              <p
                style={{
                  margin: 0,
                  color: colors.text.secondary,
                  fontSize: typography.fontSize.base,
                  fontWeight: typography.fontWeight.medium,
                }}
              >
                Genel risk durumu ve istatistikler
              </p>
            </div>
          </div>

          {/* Quick Stats in Header */}
          {dashboard && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                gap: spacing.md,
                marginTop: spacing.lg,
              }}
            >
              <div
                style={{
                  padding: spacing.md,
                  backgroundColor: colors.white,
                  borderRadius: borderRadius.lg,
                  boxShadow: shadows.sm,
                  textAlign: "center",
                  border: `1px solid ${colors.border}`,
                }}
              >
                <div
                  style={{
                    fontSize: typography.fontSize["2xl"],
                    fontWeight: typography.fontWeight.bold,
                    color: colors.dangerDark,
                    marginBottom: spacing.xs,
                  }}
                >
                  {dashboard.highRiskClientCount}
                </div>
                <div style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>
                  Yüksek Risk
                </div>
              </div>
              <div
                style={{
                  padding: spacing.md,
                  backgroundColor: colors.white,
                  borderRadius: borderRadius.lg,
                  boxShadow: shadows.sm,
                  textAlign: "center",
                  border: `1px solid ${colors.border}`,
                }}
              >
                <div
                  style={{
                    fontSize: typography.fontSize["2xl"],
                    fontWeight: typography.fontWeight.bold,
                    color: colors.warning,
                    marginBottom: spacing.xs,
                  }}
                >
                  {dashboard.openCriticalAlertsCount}
                </div>
                <div style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>
                  Kritik Uyarı
                </div>
              </div>
              <div
                style={{
                  padding: spacing.md,
                  backgroundColor: colors.white,
                  borderRadius: borderRadius.lg,
                  boxShadow: shadows.sm,
                  textAlign: "center",
                  border: `1px solid ${colors.border}`,
                }}
              >
                <div
                  style={{
                    fontSize: typography.fontSize["2xl"],
                    fontWeight: typography.fontWeight.bold,
                    color: colors.primaryDark,
                    marginBottom: spacing.xs,
                  }}
                >
                  {dashboard.totalDocuments}
                </div>
                <div style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>
                  Toplam Belge
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {dashboard && (
        <>
          {/* Enhanced Key Metrics Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: spacing.lg,
              marginBottom: spacing.xl,
            }}
          >
            {/* High Risk Clients */}
            <Card
              hoverable
              onClick={() => router.push("/musteriler?risk=high&severity=high")}
              style={{
                padding: spacing.xl,
                background: colors.gradients.pastelDanger,
                border: `1px solid ${colors.border}`,
                position: "relative",
                overflow: "hidden",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "-20px",
                  right: "-20px",
                  width: "120px",
                  height: "120px",
                  borderRadius: "50%",
                  background: `radial-gradient(circle, rgba(239, 68, 68, 0.05) 0%, transparent 70%)`,
                  pointerEvents: "none",
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.md, position: "relative", zIndex: 1 }}>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.medium,
                      color: colors.dangerDark,
                      marginBottom: spacing.sm,
                      display: "flex",
                      alignItems: "center",
                      gap: spacing.xs,
                    }}
                  >
                    <span>⚠️</span>
                    <span>Yüksek Riskli Müşteriler</span>
                  </div>
                  <div
                    style={{
                      fontSize: typography.fontSize["4xl"],
                      fontWeight: typography.fontWeight.bold,
                      color: colors.dangerDark,
                      marginBottom: spacing.xs,
                    }}
                  >
                    {dashboard.highRiskClientCount}
                  </div>
                  <div
                    style={{
                      fontSize: typography.fontSize.xs,
                      color: colors.text.secondary,
                    }}
                  >
                    Dikkat gerektiren müşteri sayısı
                  </div>
                </div>
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: borderRadius.xl,
                    backgroundColor: colors.dangerPastel,
                    border: `1px solid ${colors.dangerLight}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "32px",
                    boxShadow: shadows.sm,
                  }}
                >
                  ⚠️
                </div>
              </div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: spacing.xs,
                  color: colors.dangerDark,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  marginTop: spacing.sm,
                }}
              >
                <span>Detayları Gör</span>
                <span>→</span>
              </div>
              {dashboard.comparisons && (
                <div
                  style={{
                    marginTop: spacing.xs,
                    fontSize: typography.fontSize.xs,
                    color: colors.text.secondary,
                    display: "flex",
                    alignItems: "center",
                    gap: spacing.xs,
                  }}
                >
                  {dashboard.highRiskClientCount > dashboard.comparisons.previousPeriod.highRiskClientCount ? (
                    <>
                      <span style={{ color: colors.danger }}>↑</span>
                      <span>
                        +{dashboard.highRiskClientCount - dashboard.comparisons.previousPeriod.highRiskClientCount} önceki döneme göre
                      </span>
                    </>
                  ) : dashboard.highRiskClientCount < dashboard.comparisons.previousPeriod.highRiskClientCount ? (
                    <>
                      <span style={{ color: colors.success }}>↓</span>
                      <span>
                        {dashboard.highRiskClientCount - dashboard.comparisons.previousPeriod.highRiskClientCount} önceki döneme göre
                      </span>
                    </>
                  ) : (
                    <>
                      <span style={{ color: colors.text.secondary }}>→</span>
                      <span>Değişiklik yok</span>
                    </>
                  )}
                </div>
              )}
            </Card>

            {/* Critical Alerts */}
            <Card
              hoverable
              onClick={() => router.push("/risk/alerts?severity=critical&status=open")}
              style={{
                padding: spacing.xl,
                background: colors.gradients.pastelDanger,
                border: `1px solid ${colors.border}`,
                position: "relative",
                overflow: "hidden",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "-20px",
                  right: "-20px",
                  width: "120px",
                  height: "120px",
                  borderRadius: "50%",
                  background: `radial-gradient(circle, rgba(239, 68, 68, 0.05) 0%, transparent 70%)`,
                  pointerEvents: "none",
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.md, position: "relative", zIndex: 1 }}>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.medium,
                      color: colors.dangerDark,
                      marginBottom: spacing.sm,
                      display: "flex",
                      alignItems: "center",
                      gap: spacing.xs,
                    }}
                  >
                    <span>🚨</span>
                    <span>Kritik Uyarılar</span>
                  </div>
                  <div
                    style={{
                      fontSize: typography.fontSize["4xl"],
                      fontWeight: typography.fontWeight.bold,
                      color: colors.dangerDark,
                      marginBottom: spacing.xs,
                    }}
                  >
                    {dashboard.openCriticalAlertsCount}
                  </div>
                  <div
                    style={{
                      fontSize: typography.fontSize.xs,
                      color: colors.text.secondary,
                    }}
                  >
                    Acil müdahale gerektiren uyarılar
                  </div>
                </div>
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: borderRadius.xl,
                    backgroundColor: colors.dangerPastel,
                    border: `1px solid ${colors.dangerLight}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "32px",
                    boxShadow: shadows.sm,
                    animation: dashboard.openCriticalAlertsCount > 0 ? "pulse 2s infinite" : "none",
                  }}
                >
                  🚨
                </div>
              </div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: spacing.xs,
                  color: colors.dangerDark,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  marginTop: spacing.sm,
                }}
              >
                <span>Uyarıları Görüntüle</span>
                <span>→</span>
              </div>
              {dashboard.comparisons && (
                <div
                  style={{
                    marginTop: spacing.xs,
                    fontSize: typography.fontSize.xs,
                    color: colors.text.secondary,
                    display: "flex",
                    alignItems: "center",
                    gap: spacing.xs,
                  }}
                >
                  {dashboard.openCriticalAlertsCount > dashboard.comparisons.previousPeriod.openCriticalAlertsCount ? (
                    <>
                      <span style={{ color: colors.danger }}>↑</span>
                      <span>
                        +{dashboard.openCriticalAlertsCount - dashboard.comparisons.previousPeriod.openCriticalAlertsCount} önceki döneme göre
                      </span>
                    </>
                  ) : dashboard.openCriticalAlertsCount < dashboard.comparisons.previousPeriod.openCriticalAlertsCount ? (
                    <>
                      <span style={{ color: colors.success }}>↓</span>
                      <span>
                        {dashboard.openCriticalAlertsCount - dashboard.comparisons.previousPeriod.openCriticalAlertsCount} önceki döneme göre
                      </span>
                    </>
                  ) : (
                    <>
                      <span style={{ color: colors.text.secondary }}>→</span>
                      <span>Değişiklik yok</span>
                    </>
                  )}
                </div>
              )}
            </Card>

            {/* Total Documents */}
            <Card
              hoverable
              onClick={() => router.push("/belgeler")}
              style={{
                padding: spacing.xl,
                background: colors.gradients.pastelPrimary,
                border: `1px solid ${colors.border}`,
                position: "relative",
                overflow: "hidden",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "-20px",
                  right: "-20px",
                  width: "120px",
                  height: "120px",
                  borderRadius: "50%",
                  background: `radial-gradient(circle, rgba(37, 99, 235, 0.05) 0%, transparent 70%)`,
                  pointerEvents: "none",
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.md, position: "relative", zIndex: 1 }}>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.medium,
                      color: colors.primaryDark,
                      marginBottom: spacing.sm,
                      display: "flex",
                      alignItems: "center",
                      gap: spacing.xs,
                    }}
                  >
                    <span>📄</span>
                    <span>Toplam Belge</span>
                  </div>
                  <div
                    style={{
                      fontSize: typography.fontSize["4xl"],
                      fontWeight: typography.fontWeight.bold,
                      color: colors.primaryDark,
                      marginBottom: spacing.xs,
                    }}
                  >
                    {dashboard.totalDocuments}
                  </div>
                  <div
                    style={{
                      fontSize: typography.fontSize.xs,
                      color: colors.text.secondary,
                    }}
                  >
                    Sistemdeki toplam belge sayısı
                  </div>
                </div>
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: borderRadius.xl,
                    backgroundColor: colors.primaryPastel,
                    border: `1px solid ${colors.primaryLighter}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "32px",
                    boxShadow: shadows.sm,
                  }}
                >
                  📄
                </div>
              </div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: spacing.xs,
                  color: colors.primaryDark,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  marginTop: spacing.sm,
                }}
              >
                <span>Tüm Belgeler</span>
                <span>→</span>
              </div>
            </Card>

            {/* High Risk Documents */}
            <Card
              hoverable
              onClick={() => router.push("/belgeler?risk=high&severity=high")}
              style={{
                padding: spacing.xl,
                background: colors.gradients.pastelWarning,
                border: `1px solid ${colors.border}`,
                position: "relative",
                overflow: "hidden",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "-20px",
                  right: "-20px",
                  width: "120px",
                  height: "120px",
                  borderRadius: "50%",
                  background: `radial-gradient(circle, rgba(245, 158, 11, 0.05) 0%, transparent 70%)`,
                  pointerEvents: "none",
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.md, position: "relative", zIndex: 1 }}>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.medium,
                      color: colors.warning,
                      marginBottom: spacing.sm,
                      display: "flex",
                      alignItems: "center",
                      gap: spacing.xs,
                    }}
                  >
                    <span>📋</span>
                    <span>Yüksek Riskli Belgeler</span>
                  </div>
                  <div
                    style={{
                      fontSize: typography.fontSize["4xl"],
                      fontWeight: typography.fontWeight.bold,
                      color: colors.warning,
                      marginBottom: spacing.xs,
                    }}
                  >
                    {dashboard.highRiskDocumentsCount}
                  </div>
                  <div
                    style={{
                      fontSize: typography.fontSize.xs,
                      color: colors.text.secondary,
                    }}
                  >
                    İnceleme gerektiren belgeler
                  </div>
                </div>
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: borderRadius.xl,
                    backgroundColor: colors.warningPastel,
                    border: `1px solid ${colors.warningLight}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "32px",
                    boxShadow: shadows.sm,
                  }}
                >
                  📋
                </div>
              </div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: spacing.xs,
                  color: colors.warning,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  marginTop: spacing.sm,
                }}
              >
                <span>Belgeleri İncele</span>
                <span>→</span>
              </div>
              {dashboard.comparisons && (
                <div
                  style={{
                    marginTop: spacing.xs,
                    fontSize: typography.fontSize.xs,
                    color: colors.text.secondary,
                    display: "flex",
                    alignItems: "center",
                    gap: spacing.xs,
                  }}
                >
                  {dashboard.highRiskDocumentsCount > dashboard.comparisons.previousPeriod.highRiskDocumentsCount ? (
                    <>
                      <span style={{ color: colors.warning }}>↑</span>
                      <span>
                        +{dashboard.highRiskDocumentsCount - dashboard.comparisons.previousPeriod.highRiskDocumentsCount} önceki döneme göre
                      </span>
                    </>
                  ) : dashboard.highRiskDocumentsCount < dashboard.comparisons.previousPeriod.highRiskDocumentsCount ? (
                    <>
                      <span style={{ color: colors.success }}>↓</span>
                      <span>
                        {dashboard.highRiskDocumentsCount - dashboard.comparisons.previousPeriod.highRiskDocumentsCount} önceki döneme göre
                      </span>
                    </>
                  ) : (
                    <>
                      <span style={{ color: colors.text.secondary }}>→</span>
                      <span>Değişiklik yok</span>
                    </>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Recent Alerts Widget */}
          {recentAlerts.length > 0 && (
            <Card
              style={{
                marginBottom: spacing.xl,
                padding: spacing.xl,
                background: colors.gradients.pastelDanger,
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
                    Son Kritik Uyarılar
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: typography.fontSize.sm,
                      color: colors.text.secondary,
                    }}
                  >
                    Acil müdahale gerektiren uyarılar
                  </p>
                </div>
                <Link
                  href="/risk/alerts?severity=critical&status=open"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: spacing.xs,
                    padding: `${spacing.sm} ${spacing.md}`,
                    background: colors.gradients.danger,
                    color: colors.white,
                    textDecoration: "none",
                    borderRadius: borderRadius.md,
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.semibold,
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
                  <span>Tümünü Gör</span>
                  <span>→</span>
                </Link>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
                {recentAlerts.map((alert: any) => {
                  const timeAgo = new Date(alert.createdAt);
                  const now = new Date();
                  const diffMs = now.getTime() - timeAgo.getTime();
                  const diffMins = Math.floor(diffMs / 60000);
                  const diffHours = Math.floor(diffMs / 3600000);
                  const diffDays = Math.floor(diffMs / 86400000);

                  let timeAgoText = "";
                  if (diffMins < 60) {
                    timeAgoText = `${diffMins} dakika önce`;
                  } else if (diffHours < 24) {
                    timeAgoText = `${diffHours} saat önce`;
                  } else {
                    timeAgoText = `${diffDays} gün önce`;
                  }

                  return (
                    <Link
                      key={alert.id}
                      href={`/risk/alerts?alertId=${alert.id}`}
                      style={{
                        display: "block",
                        padding: spacing.md,
                        backgroundColor: colors.white,
                        borderRadius: borderRadius.lg,
                        border: `1px solid ${colors.border}`,
                        textDecoration: "none",
                        color: "inherit",
                        transition: `all ${transitions.normal} ease`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = colors.danger;
                        e.currentTarget.style.boxShadow = shadows.sm;
                        e.currentTarget.style.transform = "translateX(4px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = colors.border;
                        e.currentTarget.style.boxShadow = "none";
                        e.currentTarget.style.transform = "translateX(0)";
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md }}>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: spacing.sm,
                              marginBottom: spacing.xs,
                            }}
                          >
                            <span style={{ fontSize: "20px" }}>🚨</span>
                            <span
                              style={{
                                fontSize: typography.fontSize.base,
                                fontWeight: typography.fontWeight.semibold,
                                color: colors.text.primary,
                              }}
                            >
                              {alert.title}
                            </span>
                            <span
                              style={{
                                padding: `${spacing.xs} ${spacing.sm}`,
                                backgroundColor: colors.dangerDark,
                                color: colors.white,
                                borderRadius: borderRadius.sm,
                                fontSize: typography.fontSize.xs,
                                fontWeight: typography.fontWeight.bold,
                              }}
                            >
                              {alert.severity === "critical" ? "KRİTİK" : "YÜKSEK"}
                            </span>
                          </div>
                          <p
                            style={{
                              margin: 0,
                              fontSize: typography.fontSize.sm,
                              color: colors.text.secondary,
                              marginBottom: spacing.xs,
                            }}
                          >
                            {alert.message}
                          </p>
                          <div
                            style={{
                              fontSize: typography.fontSize.xs,
                              color: colors.text.muted,
                            }}
                          >
                            {timeAgoText}
                          </div>
                        </div>
                        <div
                          style={{
                            color: colors.primary,
                            fontSize: typography.fontSize.lg,
                            fontWeight: typography.fontWeight.bold,
                          }}
                        >
                          →
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Enhanced Client Risk Distribution */}
          <Card
            style={{
              padding: spacing.xxl,
              marginBottom: spacing.xl,
              background: colors.gradients.subtle,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xl }}>
              <div>
                <h2
                  style={{
                    margin: 0,
                    marginBottom: spacing.xs,
                    fontSize: typography.fontSize["2xl"],
                    fontWeight: typography.fontWeight.bold,
                    color: colors.text.primary,
                  }}
                >
                  Müşteri Risk Dağılımı
                </h2>
                <p
                  style={{
                    margin: 0,
                    fontSize: typography.fontSize.sm,
                    color: colors.text.secondary,
                  }}
                >
                  Müşterilerinizin risk seviyesi dağılımı
                </p>
              </div>
              <div
                style={{
                  padding: `${spacing.sm} ${spacing.lg}`,
                  backgroundColor: colors.primaryPastel,
                  borderRadius: borderRadius.lg,
                  fontSize: typography.fontSize.base,
                  border: `1px solid ${colors.primaryLighter}`,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.primary,
                }}
              >
                Toplam: {totalClients}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: spacing.lg }}>
              {/* Low Risk */}
              <div
                style={{
                  padding: spacing.lg,
                  backgroundColor: colors.white,
                  borderRadius: borderRadius.lg,
                  border: `1px solid ${colors.border}`,
                  transition: `all ${transitions.normal} ease`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = colors.success;
                  e.currentTarget.style.boxShadow = shadows.sm;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = colors.border;
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }}>
                  <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "50%",
                        backgroundColor: colors.success,
                        boxShadow: `0 0 0 4px ${colors.successPastel}`,
                      }}
                    />
                    <span
                      style={{
                        color: colors.text.primary,
                        fontWeight: typography.fontWeight.semibold,
                        fontSize: typography.fontSize.base,
                      }}
                    >
                      Düşük Risk
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: spacing.xs }}>
                    <span
                      style={{
                        fontWeight: typography.fontWeight.bold,
                        fontSize: typography.fontSize["2xl"],
                        color: colors.successDark,
                      }}
                    >
                      {dashboard.clientRiskDistribution.low}
                    </span>
                    <span
                      style={{
                        fontSize: typography.fontSize.sm,
                        color: colors.text.secondary,
                        fontWeight: typography.fontWeight.medium,
                      }}
                    >
                      müşteri
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    height: "40px",
                    backgroundColor: colors.successPastel,
                    borderRadius: borderRadius.lg,
                    overflow: "hidden",
                    position: "relative",
                    boxShadow: shadows.sm,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${totalClients > 0 ? (dashboard.clientRiskDistribution.low / totalClients) * 100 : 0}%`,
                      background: colors.gradients.success,
                      borderRadius: borderRadius.lg,
                      transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      paddingRight: spacing.md,
                      boxShadow: shadows.sm,
                    }}
                  >
                    {dashboard.clientRiskDistribution.low > 0 && (
                      <span
                        style={{
                          color: colors.white,
                          fontSize: typography.fontSize.sm,
                          fontWeight: typography.fontWeight.bold,
                        }}
                      >
                        {totalClients > 0
                          ? Math.round((dashboard.clientRiskDistribution.low / totalClients) * 100)
                          : 0}
                        %
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Medium Risk */}
              <div
                style={{
                  padding: spacing.lg,
                  backgroundColor: colors.white,
                  borderRadius: borderRadius.lg,
                  border: `1px solid ${colors.border}`,
                  transition: `all ${transitions.normal} ease`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = colors.warning;
                  e.currentTarget.style.boxShadow = shadows.sm;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = colors.border;
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }}>
                  <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "50%",
                        backgroundColor: colors.warning,
                        boxShadow: `0 0 0 4px ${colors.warningPastel}`,
                      }}
                    />
                    <span
                      style={{
                        color: colors.text.primary,
                        fontWeight: typography.fontWeight.semibold,
                        fontSize: typography.fontSize.base,
                      }}
                    >
                      Orta Risk
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: spacing.xs }}>
                    <span
                      style={{
                        fontWeight: typography.fontWeight.bold,
                        fontSize: typography.fontSize["2xl"],
                        color: colors.warning,
                      }}
                    >
                      {dashboard.clientRiskDistribution.medium}
                    </span>
                    <span
                      style={{
                        fontSize: typography.fontSize.sm,
                        color: colors.text.secondary,
                        fontWeight: typography.fontWeight.medium,
                      }}
                    >
                      müşteri
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    height: "40px",
                    backgroundColor: colors.warningPastel,
                    borderRadius: borderRadius.lg,
                    overflow: "hidden",
                    position: "relative",
                    boxShadow: shadows.sm,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${totalClients > 0 ? (dashboard.clientRiskDistribution.medium / totalClients) * 100 : 0}%`,
                      background: `linear-gradient(135deg, ${colors.warning} 0%, ${colors.warning} 100%)`,
                      borderRadius: borderRadius.lg,
                      transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      paddingRight: spacing.md,
                      boxShadow: shadows.sm,
                    }}
                  >
                    {dashboard.clientRiskDistribution.medium > 0 && (
                      <span
                        style={{
                          color: colors.white,
                          fontSize: typography.fontSize.sm,
                          fontWeight: typography.fontWeight.bold,
                        }}
                      >
                        {totalClients > 0
                          ? Math.round((dashboard.clientRiskDistribution.medium / totalClients) * 100)
                          : 0}
                        %
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* High Risk */}
              <div
                style={{
                  padding: spacing.lg,
                  backgroundColor: colors.white,
                  borderRadius: borderRadius.lg,
                  border: `1px solid ${colors.border}`,
                  transition: `all ${transitions.normal} ease`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = colors.dangerDark;
                  e.currentTarget.style.boxShadow = shadows.sm;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = colors.border;
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }}>
                  <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "50%",
                        backgroundColor: colors.dangerDark,
                        boxShadow: `0 0 0 4px ${colors.dangerPastel}`,
                      }}
                    />
                    <span
                      style={{
                        color: colors.text.primary,
                        fontWeight: typography.fontWeight.semibold,
                        fontSize: typography.fontSize.base,
                      }}
                    >
                      Yüksek Risk
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: spacing.xs }}>
                    <span
                      style={{
                        fontWeight: typography.fontWeight.bold,
                        fontSize: typography.fontSize["2xl"],
                        color: colors.dangerDark,
                      }}
                    >
                      {dashboard.clientRiskDistribution.high}
                    </span>
                    <span
                      style={{
                        fontSize: typography.fontSize.sm,
                        color: colors.text.secondary,
                        fontWeight: typography.fontWeight.medium,
                      }}
                    >
                      müşteri
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    height: "40px",
                    backgroundColor: colors.dangerPastel,
                    borderRadius: borderRadius.lg,
                    overflow: "hidden",
                    position: "relative",
                    boxShadow: shadows.sm,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${totalClients > 0 ? (dashboard.clientRiskDistribution.high / totalClients) * 100 : 0}%`,
                      background: colors.gradients.danger,
                      borderRadius: borderRadius.lg,
                      transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      paddingRight: spacing.md,
                      boxShadow: shadows.sm,
                    }}
                  >
                    {dashboard.clientRiskDistribution.high > 0 && (
                      <span
                        style={{
                          color: colors.white,
                          fontSize: typography.fontSize.sm,
                          fontWeight: typography.fontWeight.bold,
                        }}
                      >
                        {totalClients > 0
                          ? Math.round((dashboard.clientRiskDistribution.high / totalClients) * 100)
                          : 0}
                        %
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Enhanced Quick Actions */}
          <div style={{ display: "flex", gap: spacing.md, flexWrap: "wrap", alignItems: "center" }}>
            <button
              onClick={async () => {
                try {
                  const blob = await riskClient.exportRiskDashboard("csv");
                  if (!blob || blob.size === 0) {
                    throw new Error("Empty export data");
                  }
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `risk-dashboard-${new Date().toISOString().split("T")[0]}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                } catch (error: any) {
                  console.error("Export failed:", error);
                  toast.error(`Dışa aktarma başarısız oldu: ${error.message || "Bilinmeyen hata"}`);
                }
              }}
              style={{
                padding: `${spacing.md} ${spacing.xl}`,
                background: colors.gradients.success,
                color: colors.white,
                borderRadius: borderRadius.lg,
                border: "none",
                fontWeight: typography.fontWeight.semibold,
                fontSize: typography.fontSize.base,
                display: "inline-flex",
                alignItems: "center",
                gap: spacing.sm,
                boxShadow: shadows.sm,
                transition: `all ${transitions.normal} ease`,
                cursor: "pointer",
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
              <span>📥</span>
              <span>CSV Dışa Aktar</span>
            </button>
            <Link
              href="/risk/alerts"
              style={{
                padding: `${spacing.md} ${spacing.xl}`,
                background: colors.gradients.danger,
                color: colors.white,
                borderRadius: borderRadius.lg,
                textDecoration: "none",
                fontWeight: typography.fontWeight.semibold,
                fontSize: typography.fontSize.base,
                display: "inline-flex",
                alignItems: "center",
                gap: spacing.sm,
                boxShadow: shadows.md,
                transition: `all ${transitions.normal} ease`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = shadows.lg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = shadows.md;
              }}
            >
              <span style={{ fontSize: "20px" }}>🚨</span>
              <span>Uyarıları Görüntüle</span>
              {dashboard.openCriticalAlertsCount > 0 && (
                <span
                  style={{
                    padding: `${spacing.xs} ${spacing.sm}`,
                    backgroundColor: colors.white,
                    color: colors.dangerDark,
                    borderRadius: borderRadius.full,
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.bold,
                    minWidth: "24px",
                    textAlign: "center",
                  }}
                >
                  {dashboard.openCriticalAlertsCount}
                </span>
              )}
            </Link>
            <Link
              href="/musteriler"
              style={{
                padding: `${spacing.md} ${spacing.xl}`,
                backgroundColor: colors.white,
                color: colors.primary,
                borderRadius: borderRadius.lg,
                textDecoration: "none",
                fontWeight: typography.fontWeight.semibold,
                fontSize: typography.fontSize.base,
                display: "inline-flex",
                alignItems: "center",
                gap: spacing.sm,
                border: `1px solid ${colors.primaryLighter}`,
                transition: `all ${transitions.normal} ease`,
                boxShadow: shadows.sm,
                color: colors.primaryDark,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.primaryPastel;
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = shadows.sm;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.white;
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = shadows.sm;
              }}
            >
              <span style={{ fontSize: "20px" }}>👥</span>
              <span>Müşterileri Görüntüle</span>
            </Link>
          </div>
        </>
      )}

      {/* Phase 2 & 3 Features */}
      {dashboard && (
        <>
          {/* Recommendations Widget */}
          {recommendations.length > 0 && <RecommendationsWidget recommendations={recommendations} />}

          {/* Risk Breakdown Panel */}
          {breakdown && <RiskBreakdownPanel breakdown={breakdown} />}

          {/* Time-Series Charts */}
          {trends && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: spacing.xl, marginBottom: spacing.xl }}>
              <Card
                style={{
                  padding: spacing.xl,
                  background: colors.gradients.pastelPrimary,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <div style={{ marginBottom: spacing.md }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: typography.fontSize.xl,
                        fontWeight: typography.fontWeight.bold,
                      }}
                    >
                      Risk Skoru Trendi
                    </h3>
                    <div style={{ display: "flex", gap: spacing.xs }}>
                      {(["7d", "30d", "90d", "1y"] as const).map((period) => (
                        <button
                          key={period}
                          onClick={() => setTrendPeriod(period)}
                          style={{
                            padding: `${spacing.xs} ${spacing.sm}`,
                            background: trendPeriod === period ? colors.primaryLighter : colors.gray[200],
                            color: trendPeriod === period ? colors.white : colors.text.primary,
                            border: "none",
                            borderRadius: borderRadius.sm,
                            fontSize: typography.fontSize.xs,
                            fontWeight: typography.fontWeight.semibold,
                            cursor: "pointer",
                          }}
                        >
                          {period}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                    Ortalama: {trends.riskScoreTrend.averageScore.toFixed(1)}
                  </p>
                </div>
                <RiskTrendChart data={trends.riskScoreTrend} />
              </Card>

              <Card
                style={{
                  padding: spacing.xl,
                  background: colors.gradients.pastelDanger,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <div style={{ marginBottom: spacing.md }}>
                  <h3
                    style={{
                      margin: 0,
                      marginBottom: spacing.xs,
                      fontSize: typography.fontSize.xl,
                      fontWeight: typography.fontWeight.bold,
                    }}
                  >
                    Uyarı Frekansı
                  </h3>
                  <p style={{ margin: 0, fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                    Toplam: {trends.alertFrequencyTrend.totalAlerts} uyarı
                  </p>
                </div>
                <AlertFrequencyChart data={trends.alertFrequencyTrend} />
              </Card>
            </div>
          )}

          {/* Risk Distribution Chart */}
          {trends && (
            <Card
              style={{
                padding: spacing.xl,
                marginBottom: spacing.xl,
                background: colors.gradients.pastelSuccess,
                border: `1px solid ${colors.border}`,
              }}
            >
              <div style={{ marginBottom: spacing.md }}>
                <h3
                  style={{
                    margin: 0,
                    marginBottom: spacing.xs,
                    fontSize: typography.fontSize.xl,
                    fontWeight: typography.fontWeight.bold,
                  }}
                >
                  Risk Dağılım Trendi
                </h3>
                <p style={{ margin: 0, fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                  Risk seviyelerinin zaman içindeki değişimi
                </p>
              </div>
              <RiskDistributionChart data={trends.riskDistributionTrend} />
            </Card>
          )}

          {/* Risk Heat Map */}
          {heatmap && <RiskHeatMap heatmap={heatmap} />}

          {/* Forecast Section */}
          {forecast && (
            <Card
              style={{
                padding: spacing.xl,
                marginBottom: spacing.xl,
                background: colors.gradients.pastelInfo,
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
                  }}
                >
                  Risk Tahmini (30 Gün)
                </h3>
                <p style={{ margin: 0, fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                  Gelecek 30 gün için risk skoru tahmini
                </p>
              </div>

              {forecast.earlyWarnings.length > 0 && (
                <div style={{ marginBottom: spacing.lg }}>
                  <h4
                    style={{
                      margin: 0,
                      marginBottom: spacing.md,
                      fontSize: typography.fontSize.base,
                      fontWeight: typography.fontWeight.semibold,
                    }}
                  >
                    Erken Uyarılar
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
                    {forecast.earlyWarnings.map((warning, index) => (
                      <div
                        key={index}
                        style={{
                          padding: spacing.md,
                          backgroundColor: colors.warningPastel,
                          borderRadius: borderRadius.md,
                          border: `1px solid ${colors.border}`,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div
                              style={{
                                fontSize: typography.fontSize.base,
                                fontWeight: typography.fontWeight.semibold,
                                marginBottom: spacing.xs,
                                color: colors.text.primary,
                              }}
                            >
                              {warning.message}
                            </div>
                            <div style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                              {warning.recommendedAction}
                            </div>
                          </div>
                          <div
                            style={{
                              padding: `${spacing.sm} ${spacing.md}`,
                              backgroundColor: colors.warningLight,
                              color: colors.text.primary,
                              borderRadius: borderRadius.md,
                              fontSize: typography.fontSize.sm,
                              fontWeight: typography.fontWeight.bold,
                            }}
                          >
                            %{warning.probability}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: spacing.md }}>
                <div
                  style={{
                    padding: spacing.md,
                    backgroundColor: colors.gray[50],
                    borderRadius: borderRadius.md,
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.xs }}>
                    Mevcut Hız
                  </div>
                  <div style={{ fontSize: typography.fontSize["2xl"], fontWeight: typography.fontWeight.bold }}>
                    {forecast.riskVelocity.current > 0 ? "+" : ""}
                    {forecast.riskVelocity.current.toFixed(2)}
                  </div>
                </div>
                <div
                  style={{
                    padding: spacing.md,
                    backgroundColor: colors.gray[50],
                    borderRadius: borderRadius.md,
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.xs }}>
                    Tahmini Hız
                  </div>
                  <div style={{ fontSize: typography.fontSize["2xl"], fontWeight: typography.fontWeight.bold }}>
                    {forecast.riskVelocity.predicted > 0 ? "+" : ""}
                    {forecast.riskVelocity.predicted.toFixed(2)}
                  </div>
                </div>
                <div
                  style={{
                    padding: spacing.md,
                    backgroundColor: colors.gray[50],
                    borderRadius: borderRadius.md,
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.xs }}>
                    Trend
                  </div>
                  <div
                    style={{
                      fontSize: typography.fontSize["2xl"],
                      fontWeight: typography.fontWeight.bold,
                      color:
                        forecast.riskVelocity.trend === "accelerating"
                          ? colors.danger
                          : forecast.riskVelocity.trend === "decelerating"
                            ? colors.success
                            : colors.warning,
                    }}
                  >
                    {forecast.riskVelocity.trend === "accelerating"
                      ? "↑ Hızlanıyor"
                      : forecast.riskVelocity.trend === "decelerating"
                        ? "↓ Yavaşlıyor"
                        : "→ Stabil"}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Enhanced Animations */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
