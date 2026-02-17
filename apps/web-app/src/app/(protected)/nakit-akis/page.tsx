"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cashFlowClient } from "@repo/api-client";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Skeleton } from "../../../components/ui/Skeleton";
import { colors, spacing, borderRadius, typography, transitions } from "../../../styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "../../../lib/toast";

const CATEGORY_LABELS: Record<string, string> = {
  SALES: "Satis",
  SERVICE: "Hizmet",
  RENT: "Kira",
  SALARY: "Maas",
  TAX: "Vergi",
  UTILITIES: "Faturalar",
  SUPPLIES: "Malzeme",
  LOAN: "Kredi",
  INVESTMENT: "Yatirim",
  OTHER: "Diger",
};

export default function NakitAkisPage() {
  const { themeColors } = useTheme();
  const [activeTab, setActiveTab] = useState<"dashboard" | "records" | "forecast" | "daily">("dashboard");
  const queryClient = useQueryClient();

  // Daily breakdown filters
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);

  // Form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    type: "INFLOW" as "INFLOW" | "OUTFLOW",
    category: "SALES",
    source: "",
    amount: 0,
    currency: "TRY",
    entryDate: new Date().toISOString().split("T")[0],
    description: "",
    isRecurring: false,
  });

  // Queries
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["cash-flow-stats"],
    queryFn: () => cashFlowClient.getStats(),
  });

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["cash-flow-summary"],
    queryFn: () => cashFlowClient.getSummary(),
  });

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ["cash-flow-list"],
    queryFn: () => cashFlowClient.list({ limit: 50 }),
    enabled: activeTab === "records",
  });

  const { data: forecastData, isLoading: forecastLoading } = useQuery({
    queryKey: ["cash-flow-forecast"],
    queryFn: () => cashFlowClient.getForecast(6),
    enabled: activeTab === "forecast",
  });

  const { data: dailyData, isLoading: dailyLoading } = useQuery({
    queryKey: ["cash-flow-daily", selectedYear, selectedMonth],
    queryFn: () => cashFlowClient.getDailyBreakdown(selectedYear, selectedMonth),
    enabled: activeTab === "daily",
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: () => cashFlowClient.create(formData),
    onSuccess: () => {
      toast.success("Nakit akis kaydi olusturuldu");
      queryClient.invalidateQueries({ queryKey: ["cash-flow-stats"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow-summary"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow-list"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow-daily"] });
      setShowCreateForm(false);
      setFormData({
        type: "INFLOW",
        category: "SALES",
        source: "",
        amount: 0,
        currency: "TRY",
        entryDate: new Date().toISOString().split("T")[0],
        description: "",
        isRecurring: false,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Olusturma basarisiz oldu");
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => cashFlowClient.syncFromInvoices(),
    onSuccess: (data) => {
      toast.success(`${data.data.syncedCount} kayit senkronize edildi`);
      queryClient.invalidateQueries({ queryKey: ["cash-flow-stats"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow-summary"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow-list"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Senkronizasyon basarisiz oldu");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => cashFlowClient.delete(id),
    onSuccess: () => {
      toast.success("Kayit silindi");
      queryClient.invalidateQueries({ queryKey: ["cash-flow-stats"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow-summary"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow-list"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Silme basarisiz oldu");
    },
  });

  const stats = statsData?.data;
  const summary = summaryData?.data;
  const records = listData?.data?.items || [];
  const forecast = forecastData?.data;
  const daily = dailyData?.data;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    border: `1px solid ${themeColors.border}`,
    fontSize: typography.fontSize.sm,
    backgroundColor: themeColors.white,
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.xs,
    color: themeColors.text.primary,
  };

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: spacing.xl }}>
        <h1
          style={{
            fontSize: typography.fontSize["2xl"],
            fontWeight: typography.fontWeight.bold,
            color: themeColors.text.primary,
            margin: 0,
          }}
        >
          Nakit Akis Yonetimi
        </h1>
        <p
          style={{
            fontSize: typography.fontSize.sm,
            color: themeColors.text.secondary,
            margin: `${spacing.xs} 0 0`,
          }}
        >
          Nakit akis tahminleri ve takibi
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: spacing.sm,
          marginBottom: spacing.xl,
          borderBottom: `2px solid ${themeColors.border}`,
          paddingBottom: spacing.sm,
        }}
      >
        {[
          { key: "dashboard", label: "Dashboard" },
          { key: "records", label: "Kayitlar" },
          { key: "forecast", label: "Tahmin" },
          { key: "daily", label: "Gunluk" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: `${spacing.sm} ${spacing.lg}`,
              backgroundColor: activeTab === tab.key ? colors.primary : "transparent",
              color: activeTab === tab.key ? colors.white : themeColors.text.secondary,
              border: "none",
              borderRadius: borderRadius.md,
              fontWeight: typography.fontWeight.semibold,
              fontSize: typography.fontSize.sm,
              cursor: "pointer",
              transition: `all ${transitions.normal}`,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <>
          {statsLoading ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: spacing.lg,
              }}
            >
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <div style={{ padding: spacing.lg }}>
                    <Skeleton height="80px" />
                  </div>
                </Card>
              ))}
            </div>
          ) : stats ? (
            <>
              {/* Stats Cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: spacing.lg,
                  marginBottom: spacing.xl,
                }}
              >
                <Card variant="elevated">
                  <div style={{ padding: spacing.lg }}>
                    <div
                      style={{
                        fontSize: typography.fontSize.xs,
                        color: themeColors.text.secondary,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Net Nakit Akis
                    </div>
                    <div
                      style={{
                        fontSize: typography.fontSize["3xl"],
                        fontWeight: typography.fontWeight.bold,
                        color: stats.netCashFlow >= 0 ? colors.success : colors.danger,
                        marginTop: spacing.xs,
                      }}
                    >
                      {Number(stats.netCashFlow).toLocaleString("tr-TR")} TRY
                    </div>
                  </div>
                </Card>
                <Card variant="elevated">
                  <div style={{ padding: spacing.lg }}>
                    <div
                      style={{
                        fontSize: typography.fontSize.xs,
                        color: themeColors.text.secondary,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Aylik Giris
                    </div>
                    <div
                      style={{
                        fontSize: typography.fontSize["3xl"],
                        fontWeight: typography.fontWeight.bold,
                        color: colors.success,
                        marginTop: spacing.xs,
                      }}
                    >
                      {Number(stats.totalInflow).toLocaleString("tr-TR")} TRY
                    </div>
                    <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted, marginTop: spacing.xs }}>
                      {stats.inflowCount} islem
                    </div>
                  </div>
                </Card>
                <Card variant="elevated">
                  <div style={{ padding: spacing.lg }}>
                    <div
                      style={{
                        fontSize: typography.fontSize.xs,
                        color: themeColors.text.secondary,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Aylik Cikis
                    </div>
                    <div
                      style={{
                        fontSize: typography.fontSize["3xl"],
                        fontWeight: typography.fontWeight.bold,
                        color: colors.danger,
                        marginTop: spacing.xs,
                      }}
                    >
                      {Number(stats.totalOutflow).toLocaleString("tr-TR")} TRY
                    </div>
                    <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted, marginTop: spacing.xs }}>
                      {stats.outflowCount} islem
                    </div>
                  </div>
                </Card>
                <Card variant="elevated">
                  <div style={{ padding: spacing.lg }}>
                    <div
                      style={{
                        fontSize: typography.fontSize.xs,
                        color: themeColors.text.secondary,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Net Degisim
                    </div>
                    <div
                      style={{
                        fontSize: typography.fontSize["3xl"],
                        fontWeight: typography.fontWeight.bold,
                        color: colors.primary,
                        marginTop: spacing.xs,
                      }}
                    >
                      {Number(stats.totalInflow - stats.totalOutflow).toLocaleString("tr-TR")} TRY
                    </div>
                  </div>
                </Card>
              </div>

              {/* Summary & Category Breakdown */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.lg, marginBottom: spacing.xl }}>
                {/* Summary */}
                {summary && !summaryLoading && (
                  <Card variant="elevated">
                    <div style={{ padding: spacing.lg }}>
                      <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, margin: `0 0 ${spacing.md}` }}>
                        Donem Ozeti
                      </h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: spacing.sm, backgroundColor: themeColors.gray[50], borderRadius: borderRadius.md }}>
                          <span style={{ fontSize: typography.fontSize.sm, color: themeColors.text.secondary }}>Acilis Bakiyesi</span>
                          <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>{Number(summary.openingBalance).toLocaleString("tr-TR")} TRY</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: spacing.sm, backgroundColor: `${colors.success}10`, borderRadius: borderRadius.md }}>
                          <span style={{ fontSize: typography.fontSize.sm, color: colors.success }}>Toplam Giris</span>
                          <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.success }}>+{Number(summary.totalInflow).toLocaleString("tr-TR")} TRY</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: spacing.sm, backgroundColor: `${colors.danger}10`, borderRadius: borderRadius.md }}>
                          <span style={{ fontSize: typography.fontSize.sm, color: colors.danger }}>Toplam Cikis</span>
                          <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.danger }}>-{Number(summary.totalOutflow).toLocaleString("tr-TR")} TRY</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: spacing.sm, backgroundColor: themeColors.gray[50], borderRadius: borderRadius.md, borderTop: `2px solid ${themeColors.border}` }}>
                          <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>Kapanis Bakiyesi</span>
                          <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: colors.primary }}>{Number(summary.closingBalance).toLocaleString("tr-TR")} TRY</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Category Breakdown */}
                <Card variant="elevated">
                  <div style={{ padding: spacing.lg }}>
                    <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, margin: `0 0 ${spacing.md}` }}>
                      Kategori Dagilimi
                    </h3>
                    {stats.categoryBreakdown.length === 0 ? (
                      <p style={{ color: themeColors.text.muted, fontSize: typography.fontSize.sm }}>Veri bulunmuyor</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
                        {stats.categoryBreakdown.map((cat: any) => (
                          <div
                            key={cat.category}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: spacing.sm,
                              borderRadius: borderRadius.md,
                              backgroundColor: themeColors.gray[50],
                            }}
                          >
                            <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>
                              {CATEGORY_LABELS[cat.category] || cat.category}
                            </span>
                            <div style={{ display: "flex", gap: spacing.md }}>
                              {cat.inflow > 0 && (
                                <span style={{ fontSize: typography.fontSize.xs, color: colors.success, fontWeight: typography.fontWeight.semibold }}>
                                  +{Number(cat.inflow).toLocaleString("tr-TR")}
                                </span>
                              )}
                              {cat.outflow > 0 && (
                                <span style={{ fontSize: typography.fontSize.xs, color: colors.danger, fontWeight: typography.fontWeight.semibold }}>
                                  -{Number(cat.outflow).toLocaleString("tr-TR")}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Monthly Trend */}
              {stats.monthlyTrend.length > 0 && (
                <Card variant="elevated">
                  <div style={{ padding: spacing.lg }}>
                    <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, margin: `0 0 ${spacing.md}` }}>
                      Aylik Trend
                    </h3>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ borderBottom: `2px solid ${themeColors.border}` }}>
                            {["Ay", "Giris", "Cikis", "Net"].map((h) => (
                              <th key={h} style={{ textAlign: "left", padding: spacing.sm, fontSize: typography.fontSize.xs, color: themeColors.text.secondary, textTransform: "uppercase" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {stats.monthlyTrend.map((m: any) => (
                            <tr key={m.month} style={{ borderBottom: `1px solid ${themeColors.border}` }}>
                              <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm }}>{m.month}</td>
                              <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm, color: colors.success }}>+{Number(m.inflow).toLocaleString("tr-TR")}</td>
                              <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm, color: colors.danger }}>-{Number(m.outflow).toLocaleString("tr-TR")}</td>
                              <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: m.net >= 0 ? colors.success : colors.danger }}>
                                {Number(m.net).toLocaleString("tr-TR")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Card>
              )}

              {/* Sync Button */}
              <div style={{ marginTop: spacing.xl }}>
                <Button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending} variant="secondary">
                  {syncMutation.isPending ? "Senkronize ediliyor..." : "Faturalardan Senkronize Et"}
                </Button>
              </div>
            </>
          ) : null}
        </>
      )}

      {/* Records Tab */}
      {activeTab === "records" && (
        <Card variant="elevated">
          <div style={{ padding: spacing.lg }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg }}>
              <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, margin: 0 }}>
                Nakit Akis Kayitlari
              </h3>
              <div style={{ display: "flex", gap: spacing.sm }}>
                <Button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending} variant="secondary" size="sm">
                  {syncMutation.isPending ? "Senkronize..." : "Senkronize Et"}
                </Button>
                <Button onClick={() => setShowCreateForm(!showCreateForm)} size="sm">
                  {showCreateForm ? "Formu Kapat" : "Yeni Kayit"}
                </Button>
              </div>
            </div>

            {/* Create Form */}
            {showCreateForm && (
              <div
                style={{
                  marginBottom: spacing.xl,
                  padding: spacing.lg,
                  borderRadius: borderRadius.lg,
                  backgroundColor: themeColors.gray[50],
                  border: `1px solid ${themeColors.border}`,
                }}
              >
                <h4 style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, margin: `0 0 ${spacing.md}` }}>
                  Yeni Nakit Akis Kaydi
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: spacing.md }}>
                  <div>
                    <label style={labelStyle}>Tur</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as "INFLOW" | "OUTFLOW" })}
                      style={inputStyle}
                    >
                      <option value="INFLOW">Giris</option>
                      <option value="OUTFLOW">Cikis</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Kategori</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      style={inputStyle}
                    >
                      {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Tutar</label>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Tarih</label>
                    <input
                      type="date"
                      value={formData.entryDate}
                      onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Kaynak</label>
                    <input
                      type="text"
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      placeholder="Kaynak bilgisi"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Para Birimi</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="TRY">TRY</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Aciklama</label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Islem aciklamasi"
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div style={{ marginTop: spacing.md }}>
                  <Button
                    onClick={() => createMutation.mutate()}
                    disabled={!formData.amount || createMutation.isPending}
                  >
                    {createMutation.isPending ? "Olusturuluyor..." : "Kaydet"}
                  </Button>
                </div>
                {createMutation.isError && (
                  <div style={{ marginTop: spacing.md, padding: spacing.md, borderRadius: borderRadius.md, backgroundColor: `${colors.danger}10`, color: colors.danger, fontSize: typography.fontSize.sm }}>
                    {(createMutation.error as Error).message}
                  </div>
                )}
              </div>
            )}

            {listLoading ? (
              <Skeleton height="200px" />
            ) : records.length === 0 ? (
              <p style={{ color: themeColors.text.muted, textAlign: "center", padding: spacing.xl }}>
                Henuz nakit akis kaydi bulunmuyor
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${themeColors.border}` }}>
                      {["Tarih", "Tur", "Kategori", "Aciklama", "Tutar", "Islem"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: spacing.sm, fontSize: typography.fontSize.xs, color: themeColors.text.secondary, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r: any) => (
                      <tr key={r.id} style={{ borderBottom: `1px solid ${themeColors.border}` }}>
                        <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm }}>{new Date(r.entryDate).toLocaleDateString("tr-TR")}</td>
                        <td style={{ padding: spacing.sm }}>
                          <span
                            style={{
                              padding: `2px ${spacing.sm}`,
                              borderRadius: borderRadius.full,
                              fontSize: typography.fontSize.xs,
                              fontWeight: typography.fontWeight.semibold,
                              backgroundColor: r.type === "INFLOW" ? `${colors.success}20` : `${colors.danger}20`,
                              color: r.type === "INFLOW" ? colors.success : colors.danger,
                            }}
                          >
                            {r.type === "INFLOW" ? "Giris" : "Cikis"}
                          </span>
                        </td>
                        <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm }}>{CATEGORY_LABELS[r.category] || r.category}</td>
                        <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm, color: themeColors.text.secondary }}>{r.description || "-"}</td>
                        <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: r.type === "INFLOW" ? colors.success : colors.danger }}>
                          {r.type === "INFLOW" ? "+" : "-"}{Number(r.amount).toLocaleString("tr-TR")} {r.currency}
                        </td>
                        <td style={{ padding: spacing.sm }}>
                          <button
                            onClick={() => {
                              if (confirm("Bu kaydi silmek istediginize emin misiniz?")) {
                                deleteMutation.mutate(r.id);
                              }
                            }}
                            style={{
                              padding: `${spacing.xs} ${spacing.sm}`,
                              fontSize: typography.fontSize.xs,
                              backgroundColor: colors.danger,
                              color: colors.white,
                              border: "none",
                              borderRadius: borderRadius.md,
                              cursor: "pointer",
                            }}
                          >
                            Sil
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Forecast Tab */}
      {activeTab === "forecast" && (
        <Card variant="elevated">
          <div style={{ padding: spacing.lg }}>
            <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, margin: `0 0 ${spacing.lg}` }}>
              6 Aylik Nakit Akis Tahmini
            </h3>
            {forecastLoading ? (
              <Skeleton height="300px" />
            ) : !forecast || forecast.months.length === 0 ? (
              <p style={{ color: themeColors.text.muted, textAlign: "center", padding: spacing.xl }}>
                Tahmin verisi bulunmuyor
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${themeColors.border}` }}>
                      {["Ay", "Tahmini Giris", "Tahmini Cikis", "Tahmini Net", "Kumulatif Bakiye"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: spacing.sm, fontSize: typography.fontSize.xs, color: themeColors.text.secondary, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.months.map((m: any) => (
                      <tr key={m.month} style={{ borderBottom: `1px solid ${themeColors.border}` }}>
                        <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>{m.month}</td>
                        <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm, color: colors.success }}>
                          +{Number(m.projectedInflow).toLocaleString("tr-TR")} TRY
                        </td>
                        <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm, color: colors.danger }}>
                          -{Number(m.projectedOutflow).toLocaleString("tr-TR")} TRY
                        </td>
                        <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: m.projectedNet >= 0 ? colors.success : colors.danger }}>
                          {Number(m.projectedNet).toLocaleString("tr-TR")} TRY
                        </td>
                        <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: m.cumulativeBalance >= 0 ? colors.primary : colors.danger }}>
                          {Number(m.cumulativeBalance).toLocaleString("tr-TR")} TRY
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Daily Breakdown Tab */}
      {activeTab === "daily" && (
        <Card variant="elevated">
          <div style={{ padding: spacing.lg }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg }}>
              <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, margin: 0 }}>
                Gunluk Nakit Akis Dokumu
              </h3>
              <div style={{ display: "flex", gap: spacing.sm }}>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  style={{ padding: spacing.sm, borderRadius: borderRadius.md, border: `1px solid ${themeColors.border}`, fontSize: typography.fontSize.sm }}
                >
                  {[2024, 2025, 2026].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  style={{ padding: spacing.sm, borderRadius: borderRadius.md, border: `1px solid ${themeColors.border}`, fontSize: typography.fontSize.sm }}
                >
                  {["Ocak", "Subat", "Mart", "Nisan", "Mayis", "Haziran", "Temmuz", "Agustos", "Eylul", "Ekim", "Kasim", "Aralik"].map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
            {dailyLoading ? (
              <Skeleton height="400px" />
            ) : !daily || daily.days.length === 0 ? (
              <p style={{ color: themeColors.text.muted, textAlign: "center", padding: spacing.xl }}>
                Secilen donem icin veri bulunmuyor
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${themeColors.border}` }}>
                      {["Gun", "Tarih", "Giris", "Cikis", "Net"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: spacing.sm, fontSize: typography.fontSize.xs, color: themeColors.text.secondary, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {daily.days.map((d: any) => (
                      <tr key={d.day} style={{ borderBottom: `1px solid ${themeColors.border}`, backgroundColor: d.net !== 0 ? themeColors.white : themeColors.gray[50] }}>
                        <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>{d.day}</td>
                        <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm }}>{new Date(d.date).toLocaleDateString("tr-TR")}</td>
                        <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm, color: d.inflow > 0 ? colors.success : themeColors.text.muted }}>
                          {d.inflow > 0 ? `+${Number(d.inflow).toLocaleString("tr-TR")}` : "-"}
                        </td>
                        <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm, color: d.outflow > 0 ? colors.danger : themeColors.text.muted }}>
                          {d.outflow > 0 ? `-${Number(d.outflow).toLocaleString("tr-TR")}` : "-"}
                        </td>
                        <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: d.net >= 0 ? colors.success : colors.danger }}>
                          {d.net !== 0 ? Number(d.net).toLocaleString("tr-TR") : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
