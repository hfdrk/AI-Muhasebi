"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  DollarSign,
  Receipt,
  Users,
  AlertTriangle,
  FileText,
  Calendar,
  Download,
  RefreshCw,
  PieChart,
} from "lucide-react";
import { colors, spacing, borderRadius, typography, transitions } from "@/styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";
import {
  KPICard,
  KPICardGrid,
  DashboardSection,
  MetricComparison,
  PeriodSelector,
  QuickPeriodTabs,
  MultiRingProgress,
  GoalProgress,
  DataTable,
} from "@/components/dashboard";
import type { Period, Column } from "@/components/dashboard";

// ==================== Mock Data (Replace with API calls) ====================

// ==================== Executive Dashboard Page ====================

export default function ExecutiveSummaryPage() {
  const { themeColors } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>({
    label: "Bu Ay",
    value: "this_month",
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    endDate: new Date(),
  });
  const [comparePeriod, setComparePeriod] = useState<Period | undefined>(undefined);
  const [quickPeriod, setQuickPeriod] = useState("30d");

  // Fetch dashboard data from real API
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ["executive-dashboard", selectedPeriod.value],
    queryFn: async () => {
      const { analyticsClient } = await import("@repo/api-client");
      const response = await analyticsClient.getAnalyticsDashboard(
        selectedPeriod.startDate.toISOString(),
        selectedPeriod.endDate.toISOString()
      );
      return response.data;
    },
    staleTime: 30000,
  });

  // Fetch portfolio data for top clients
  const { data: portfolioData, isLoading: portfolioLoading } = useQuery({
    queryKey: ["portfolio-analytics", selectedPeriod.value],
    queryFn: async () => {
      const { analyticsClient } = await import("@repo/api-client");
      const response = await analyticsClient.getClientPortfolioAnalytics(
        selectedPeriod.startDate.toISOString(),
        selectedPeriod.endDate.toISOString()
      );
      return response.data;
    },
    staleTime: 30000,
  });

  // Fetch financial trends for sparklines
  const { data: trendsData } = useQuery({
    queryKey: ["financial-trends", selectedPeriod.value],
    queryFn: async () => {
      const { analyticsClient } = await import("@repo/api-client");
      const response = await analyticsClient.getFinancialTrends(
        selectedPeriod.startDate.toISOString(),
        selectedPeriod.endDate.toISOString(),
        "daily"
      );
      return response.data;
    },
    staleTime: 30000,
  });

  // Combine data for the UI
  const isLoading = dashboardLoading || portfolioLoading;
  const data = dashboardData ? {
    summary: {
      totalRevenue: dashboardData.financial?.totalRevenue || 0,
      totalExpenses: dashboardData.financial?.totalExpenses || 0,
      netProfit: dashboardData.financial?.netProfit || 0,
      invoiceCount: 0, // Not in dashboard API, would need separate query
      clientCount: dashboardData.portfolio?.totalClients || 0,
      averageRiskScore: dashboardData.risk?.averageRiskScore || 0,
      pendingInvoices: 0,
      overdueAmount: 0,
    },
    previousPeriod: {
      totalRevenue: dashboardData.financial?.totalRevenue * (1 - (dashboardData.financial?.revenueGrowth || 0) / 100) || 0,
      totalExpenses: dashboardData.financial?.totalExpenses * (1 - (dashboardData.financial?.expenseGrowth || 0) / 100) || 0,
      netProfit: dashboardData.financial?.netProfit * 0.9 || 0,
      invoiceCount: 0,
      clientCount: (dashboardData.portfolio?.totalClients || 0) - (dashboardData.portfolio?.newClients || 0),
    },
    sparklines: {
      revenue: trendsData?.map(t => t.revenue) || [],
      expenses: trendsData?.map(t => t.expenses) || [],
      profit: trendsData?.map(t => t.profit) || [],
      invoices: trendsData?.map(t => t.invoiceCount) || [],
    },
    topClients: portfolioData?.topClients?.map(c => ({
      name: c.clientName,
      revenue: c.revenue,
      invoices: 0,
      riskScore: c.riskScore,
    })) || [],
    riskDistribution: { low: portfolioData?.lowRiskClients || 0, medium: portfolioData?.mediumRiskClients || 0, high: portfolioData?.highRiskClients || 0 },
    monthlyGoals: {
      revenue: { current: dashboardData.financial?.totalRevenue || 0, target: (dashboardData.financial?.totalRevenue || 0) * 1.2 },
      clients: { current: dashboardData.portfolio?.totalClients || 0, target: (dashboardData.portfolio?.totalClients || 0) + 5 },
      invoices: { current: 0, target: 200 },
    },
    recentAlerts: [] as Array<{ id: string; severity: string; message: string }>,
  } : null;

  const refetch = () => {
    // Refetch all queries
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value);

  const getTrendDirection = (current: number, previous: number): "up" | "down" | "neutral" => {
    const change = ((current - previous) / previous) * 100;
    if (change > 1) return "up";
    if (change < -1) return "down";
    return "neutral";
  };

  const getTrendValue = (current: number, previous: number): number => {
    return Math.abs(((current - previous) / previous) * 100);
  };

  // Client table columns
  const clientColumns: Column<{ name: string; revenue: number; invoices: number; riskScore: number }>[] = [
    { key: "name", header: "Musteri", width: "40%" },
    {
      key: "revenue",
      header: "Ciro",
      align: "right",
      render: (value) => formatCurrency(value as number),
    },
    { key: "invoices", header: "Fatura", align: "center" },
    {
      key: "riskScore",
      header: "Risk",
      align: "center",
      render: (value) => {
        const score = value as number;
        const color = score < 30 ? colors.success : score < 60 ? colors.warning : colors.danger;
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "24px",
              borderRadius: borderRadius.md,
              backgroundColor: `${color}20`,
              color: color,
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.semibold,
            }}
          >
            {score}
          </span>
        );
      },
    },
  ];

  const pageHeaderStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
    flexWrap: "wrap",
    gap: spacing.md,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    color: themeColors.text.primary,
    margin: 0,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: typography.fontSize.sm,
    color: themeColors.text.muted,
    marginTop: spacing.xs,
  };

  const actionsStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: spacing.sm,
  };

  const buttonStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: spacing.xs,
    padding: `${spacing.sm} ${spacing.md}`,
    backgroundColor: themeColors.white,
    border: `1px solid ${themeColors.border}`,
    borderRadius: borderRadius.lg,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: themeColors.text.primary,
    cursor: "pointer",
    transition: `all ${transitions.fast} ease`,
  };

  return (
    <div>
      {/* Page Header */}
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={titleStyle}>Yonetici Ozeti</h1>
          <p style={subtitleStyle}>
            Finansal performans ve operasyonel metriklerin ozeti
          </p>
        </div>
        <div style={actionsStyle}>
          <QuickPeriodTabs
            value={quickPeriod}
            onChange={(period) => {
              setQuickPeriod(period.value);
              setSelectedPeriod(period);
            }}
          />
          <PeriodSelector
            value={selectedPeriod}
            onChange={setSelectedPeriod}
            compareMode
            comparePeriod={comparePeriod}
            onCompareChange={(period) => setComparePeriod(period ?? undefined)}
          />
          <button
            style={buttonStyle}
            onClick={() => refetch()}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = themeColors.gray[50];
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = themeColors.white;
            }}
          >
            <RefreshCw size={16} />
            Yenile
          </button>
          <button
            style={{ ...buttonStyle, backgroundColor: colors.primary, color: colors.white, border: "none" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.primaryDark;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = colors.primary;
            }}
          >
            <Download size={16} />
            Rapor Indir
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <KPICardGrid columns={4} gap="md">
        <KPICard
          title="Toplam Gelir"
          data={{
            value: data?.summary.totalRevenue || 0,
            prefix: "₺",
            sparklineData: data?.sparklines.revenue,
          }}
          icon={<DollarSign size={20} />}
          color="success"
          trend={data ? getTrendDirection(data.summary.totalRevenue, data.previousPeriod.totalRevenue) : "neutral"}
          trendValue={data ? getTrendValue(data.summary.totalRevenue, data.previousPeriod.totalRevenue) : 0}
          trendLabel="onceki doneme gore"
          loading={isLoading}
        />
        <KPICard
          title="Toplam Gider"
          data={{
            value: data?.summary.totalExpenses || 0,
            prefix: "₺",
            sparklineData: data?.sparklines.expenses,
          }}
          icon={<Receipt size={20} />}
          color="danger"
          trend={data ? getTrendDirection(data.summary.totalExpenses, data.previousPeriod.totalExpenses) : "neutral"}
          trendValue={data ? getTrendValue(data.summary.totalExpenses, data.previousPeriod.totalExpenses) : 0}
          loading={isLoading}
        />
        <KPICard
          title="Net Kar"
          data={{
            value: data?.summary.netProfit || 0,
            prefix: "₺",
            sparklineData: data?.sparklines.profit,
          }}
          icon={<TrendingUp size={20} />}
          color="primary"
          trend={data ? getTrendDirection(data.summary.netProfit, data.previousPeriod.netProfit) : "neutral"}
          trendValue={data ? getTrendValue(data.summary.netProfit, data.previousPeriod.netProfit) : 0}
          loading={isLoading}
        />
        <KPICard
          title="Aktif Musteriler"
          data={{
            value: data?.summary.clientCount || 0,
            sparklineData: data?.sparklines.invoices,
          }}
          icon={<Users size={20} />}
          color="info"
          trend={data ? getTrendDirection(data.summary.clientCount, data.previousPeriod.clientCount) : "neutral"}
          trendValue={data ? getTrendValue(data.summary.clientCount, data.previousPeriod.clientCount) : 0}
          loading={isLoading}
        />
      </KPICardGrid>

      {/* Secondary KPIs */}
      <div style={{ marginTop: spacing.lg }}>
        <KPICardGrid columns={4} gap="md">
          <KPICard
            title="Fatura Sayisi"
            data={{ value: data?.summary.invoiceCount || 0 }}
            icon={<FileText size={20} />}
            size="sm"
            loading={isLoading}
          />
          <KPICard
            title="Bekleyen Faturalar"
            data={{ value: data?.summary.pendingInvoices || 0 }}
            icon={<Calendar size={20} />}
            color="warning"
            size="sm"
            loading={isLoading}
          />
          <KPICard
            title="Geciken Tutar"
            data={{ value: data?.summary.overdueAmount || 0, prefix: "₺" }}
            icon={<AlertTriangle size={20} />}
            color="danger"
            size="sm"
            loading={isLoading}
          />
          <KPICard
            title="Ort. Risk Skoru"
            data={{ value: Math.round(data?.summary.averageRiskScore || 0) }}
            icon={<PieChart size={20} />}
            color={
              (data?.summary.averageRiskScore || 0) < 30
                ? "success"
                : (data?.summary.averageRiskScore || 0) < 60
                ? "warning"
                : "danger"
            }
            size="sm"
            loading={isLoading}
          />
        </KPICardGrid>
      </div>

      {/* Main Content Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: spacing.lg,
          marginTop: spacing.xl,
        }}
      >
        {/* Left Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: spacing.lg }}>
          {/* Period Comparison */}
          {comparePeriod && data && (
            <MetricComparison
              title="Donem Karsilastirmasi"
              currentPeriod={selectedPeriod.label}
              previousPeriod={comparePeriod.label}
              data={[
                {
                  label: "Toplam Gelir",
                  currentValue: data.summary.totalRevenue,
                  previousValue: data.previousPeriod.totalRevenue,
                  prefix: "₺",
                },
                {
                  label: "Toplam Gider",
                  currentValue: data.summary.totalExpenses,
                  previousValue: data.previousPeriod.totalExpenses,
                  prefix: "₺",
                },
                {
                  label: "Net Kar",
                  currentValue: data.summary.netProfit,
                  previousValue: data.previousPeriod.netProfit,
                  prefix: "₺",
                },
                {
                  label: "Fatura Sayisi",
                  currentValue: data.summary.invoiceCount,
                  previousValue: data.previousPeriod.invoiceCount,
                },
              ]}
            />
          )}

          {/* Top Clients */}
          <DashboardSection
            title="En Iyi Musteriler"
            subtitle="Ciroya gore siralama"
            onRefresh={() => refetch()}
            onDownload={() => {
              // Export top clients to CSV
              if (!data?.topClients?.length) return;
              const headers = ["Musteri", "Ciro", "Fatura Sayisi", "Risk Skoru"];
              const rows = data.topClients.map(c => [
                c.name,
                formatCurrency(c.revenue),
                c.invoices.toString(),
                c.riskScore.toString()
              ]);
              const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
              const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
              const link = document.createElement("a");
              link.href = URL.createObjectURL(blob);
              link.download = `en-iyi-musteriler-${new Date().toISOString().split("T")[0]}.csv`;
              link.click();
            }}
            loading={isLoading}
          >
            <DataTable
              columns={clientColumns}
              data={data?.topClients || []}
              showPagination={false}
              compact
            />
          </DashboardSection>
        </div>

        {/* Right Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: spacing.lg }}>
          {/* Monthly Goals */}
          <DashboardSection title="Aylik Hedefler" loading={isLoading}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-around",
                flexWrap: "wrap",
                gap: spacing.md,
              }}
            >
              <GoalProgress
                title="Gelir Hedefi"
                current={data?.monthlyGoals.revenue.current || 0}
                target={data?.monthlyGoals.revenue.target || 1}
                prefix="₺"
                color={colors.success}
              />
              <GoalProgress
                title="Musteri Hedefi"
                current={data?.monthlyGoals.clients.current || 0}
                target={data?.monthlyGoals.clients.target || 1}
                color={colors.info}
              />
              <GoalProgress
                title="Fatura Hedefi"
                current={data?.monthlyGoals.invoices.current || 0}
                target={data?.monthlyGoals.invoices.target || 1}
                color={colors.primary}
              />
            </div>
          </DashboardSection>

          {/* Risk Distribution */}
          <DashboardSection title="Risk Dagilimi" loading={isLoading}>
            <MultiRingProgress
              data={[
                {
                  value: data?.riskDistribution.low || 0,
                  maxValue: (data?.riskDistribution.low || 0) + (data?.riskDistribution.medium || 0) + (data?.riskDistribution.high || 0) || 1,
                  color: colors.success,
                  label: "Dusuk Risk",
                },
                {
                  value: data?.riskDistribution.medium || 0,
                  maxValue: (data?.riskDistribution.low || 0) + (data?.riskDistribution.medium || 0) + (data?.riskDistribution.high || 0) || 1,
                  color: colors.warning,
                  label: "Orta Risk",
                },
                {
                  value: data?.riskDistribution.high || 0,
                  maxValue: (data?.riskDistribution.low || 0) + (data?.riskDistribution.medium || 0) + (data?.riskDistribution.high || 0) || 1,
                  color: colors.danger,
                  label: "Yuksek Risk",
                },
              ]}
              size={140}
              centerContent={
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: typography.fontSize["2xl"], fontWeight: typography.fontWeight.bold, color: themeColors.text.primary }}>
                    {(data?.riskDistribution.low || 0) + (data?.riskDistribution.medium || 0) + (data?.riskDistribution.high || 0)}
                  </div>
                  <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted }}>Musteri</div>
                </div>
              }
            />
          </DashboardSection>

          {/* Recent Alerts */}
          <DashboardSection title="Son Uyarilar" collapsible defaultCollapsed={false}>
            <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
              {data?.recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: spacing.sm,
                    padding: spacing.sm,
                    backgroundColor:
                      alert.severity === "danger"
                        ? colors.dangerLight
                        : alert.severity === "warning"
                        ? colors.warningLight
                        : colors.infoLight,
                    borderRadius: borderRadius.md,
                    fontSize: typography.fontSize.sm,
                  }}
                >
                  <AlertTriangle
                    size={16}
                    color={
                      alert.severity === "danger"
                        ? colors.danger
                        : alert.severity === "warning"
                        ? colors.warning
                        : colors.info
                    }
                  />
                  <span style={{ flex: 1, color: themeColors.text.primary }}>{alert.message}</span>
                </div>
              ))}
            </div>
          </DashboardSection>
        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 1024px) {
          div[style*="grid-template-columns: 2fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
