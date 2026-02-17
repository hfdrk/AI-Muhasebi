"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { recurringInvoiceClient } from "@repo/api-client";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Skeleton } from "../../../components/ui/Skeleton";
import { colors, spacing, borderRadius, typography, transitions } from "../../../styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "../../../lib/toast";

const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: "Gunluk",
  WEEKLY: "Haftalik",
  MONTHLY: "Aylik",
  QUARTERLY: "Ucaylik",
  YEARLY: "Yillik",
};

const TYPE_LABELS: Record<string, string> = {
  SALES: "Satis",
  SERVICE: "Hizmet",
  RENT: "Kira",
  SUBSCRIPTION: "Abonelik",
  OTHER: "Diger",
};

export default function TekrarFaturalarPage() {
  const { themeColors } = useTheme();
  const [activeTab, setActiveTab] = useState<"dashboard" | "list" | "create">("dashboard");
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState({
    clientCompanyId: "",
    templateName: "",
    type: "SALES",
    frequency: "MONTHLY",
    dayOfMonth: 1,
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    totalAmount: 0,
    taxAmount: 0,
    currency: "TRY",
    autoSend: false,
    notes: "",
  });

  // Queries
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["recurring-invoice-stats"],
    queryFn: () => recurringInvoiceClient.getStats(),
  });

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ["recurring-invoices"],
    queryFn: () => recurringInvoiceClient.list({ limit: 50 }),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: () =>
      recurringInvoiceClient.create({
        clientCompanyId: formData.clientCompanyId,
        templateName: formData.templateName,
        type: formData.type,
        frequency: formData.frequency,
        dayOfMonth: formData.dayOfMonth,
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        totalAmount: formData.totalAmount,
        taxAmount: formData.taxAmount,
        currency: formData.currency,
        autoSend: formData.autoSend,
        notes: formData.notes || undefined,
      }),
    onSuccess: () => {
      toast.success("Tekrarlayan fatura sablonu olusturuldu");
      queryClient.invalidateQueries({ queryKey: ["recurring-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-invoice-stats"] });
      setActiveTab("list");
      setFormData({
        clientCompanyId: "",
        templateName: "",
        type: "SALES",
        frequency: "MONTHLY",
        dayOfMonth: 1,
        startDate: new Date().toISOString().split("T")[0],
        endDate: "",
        totalAmount: 0,
        taxAmount: 0,
        currency: "TRY",
        autoSend: false,
        notes: "",
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Olusturma basarisiz oldu");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => recurringInvoiceClient.toggleActive(id),
    onSuccess: () => {
      toast.success("Durum guncellendi");
      queryClient.invalidateQueries({ queryKey: ["recurring-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-invoice-stats"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Durum guncellenemedi");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => recurringInvoiceClient.delete(id),
    onSuccess: () => {
      toast.success("Sablon silindi");
      queryClient.invalidateQueries({ queryKey: ["recurring-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-invoice-stats"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Silme basarisiz oldu");
    },
  });

  const generateMutation = useMutation({
    mutationFn: () => recurringInvoiceClient.generate(),
    onSuccess: (data) => {
      toast.success(`${data.data.generatedCount} fatura olusturuldu`);
      queryClient.invalidateQueries({ queryKey: ["recurring-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-invoice-stats"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Fatura uretimi basarisiz oldu");
    },
  });

  const stats = statsData?.data;
  const items = listData?.data?.items || [];

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
          Tekrarlayan Faturalar
        </h1>
        <p
          style={{
            fontSize: typography.fontSize.sm,
            color: themeColors.text.secondary,
            margin: `${spacing.xs} 0 0`,
          }}
        >
          Otomatik fatura olusturma sablonlarini yonetin
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
          { key: "list", label: "Liste" },
          { key: "create", label: "Olustur" },
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
                      Toplam Sablon
                    </div>
                    <div
                      style={{
                        fontSize: typography.fontSize["3xl"],
                        fontWeight: typography.fontWeight.bold,
                        color: colors.primary,
                        marginTop: spacing.xs,
                      }}
                    >
                      {stats.totalTemplates}
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
                      Aktif
                    </div>
                    <div
                      style={{
                        fontSize: typography.fontSize["3xl"],
                        fontWeight: typography.fontWeight.bold,
                        color: colors.success,
                        marginTop: spacing.xs,
                      }}
                    >
                      {stats.activeTemplates}
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
                      Pasif
                    </div>
                    <div
                      style={{
                        fontSize: typography.fontSize["3xl"],
                        fontWeight: typography.fontWeight.bold,
                        color: colors.gray[500],
                        marginTop: spacing.xs,
                      }}
                    >
                      {stats.inactiveTemplates}
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
                      Aylik Toplam
                    </div>
                    <div
                      style={{
                        fontSize: typography.fontSize["3xl"],
                        fontWeight: typography.fontWeight.bold,
                        color: colors.warning,
                        marginTop: spacing.xs,
                      }}
                    >
                      {Number(stats.totalAmountThisMonth).toLocaleString("tr-TR")} TRY
                    </div>
                  </div>
                </Card>
              </div>

              {/* Upcoming Generations & Frequency Breakdown */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.lg }}>
                <Card variant="elevated">
                  <div style={{ padding: spacing.lg }}>
                    <h3
                      style={{
                        fontSize: typography.fontSize.lg,
                        fontWeight: typography.fontWeight.semibold,
                        margin: `0 0 ${spacing.md}`,
                      }}
                    >
                      Yaklasan Uretimler
                    </h3>
                    {stats.upcomingGenerations.length === 0 ? (
                      <p style={{ color: themeColors.text.muted, fontSize: typography.fontSize.sm }}>
                        Yaklasan uretim bulunmuyor
                      </p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
                        {stats.upcomingGenerations.map((g: any) => (
                          <div
                            key={g.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: spacing.sm,
                              borderRadius: borderRadius.md,
                              backgroundColor: themeColors.gray[50],
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontSize: typography.fontSize.sm,
                                  fontWeight: typography.fontWeight.medium,
                                }}
                              >
                                {g.templateName}
                              </div>
                              <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted }}>
                                {Number(g.amount).toLocaleString("tr-TR")} TRY
                              </div>
                            </div>
                            <span
                              style={{
                                fontSize: typography.fontSize.xs,
                                color: colors.info,
                                fontWeight: typography.fontWeight.semibold,
                              }}
                            >
                              {new Date(g.nextDate).toLocaleDateString("tr-TR")}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>

                <Card variant="elevated">
                  <div style={{ padding: spacing.lg }}>
                    <h3
                      style={{
                        fontSize: typography.fontSize.lg,
                        fontWeight: typography.fontWeight.semibold,
                        margin: `0 0 ${spacing.md}`,
                      }}
                    >
                      Siklik Dagilimi
                    </h3>
                    {stats.frequencyBreakdown.length === 0 ? (
                      <p style={{ color: themeColors.text.muted, fontSize: typography.fontSize.sm }}>
                        Veri bulunmuyor
                      </p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
                        {stats.frequencyBreakdown.map((f: any) => (
                          <div
                            key={f.frequency}
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
                              {FREQUENCY_LABELS[f.frequency] || f.frequency}
                            </span>
                            <span
                              style={{
                                padding: `2px ${spacing.sm}`,
                                borderRadius: borderRadius.full,
                                backgroundColor: `${colors.primary}20`,
                                color: colors.primary,
                                fontSize: typography.fontSize.xs,
                                fontWeight: typography.fontWeight.semibold,
                              }}
                            >
                              {f.count}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Generate Due Invoices Button */}
              <div style={{ marginTop: spacing.xl }}>
                <Button
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                  variant="success"
                >
                  {generateMutation.isPending ? "Uretiliyor..." : "Vadesi Gelen Faturalari Uret"}
                </Button>
              </div>
            </>
          ) : null}
        </>
      )}

      {/* List Tab */}
      {activeTab === "list" && (
        <Card variant="elevated">
          <div style={{ padding: spacing.lg }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: spacing.lg,
              }}
            >
              <h3
                style={{
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.semibold,
                  margin: 0,
                }}
              >
                Tekrarlayan Fatura Sablonlari
              </h3>
              <Button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                size="sm"
              >
                {generateMutation.isPending ? "Uretiliyor..." : "Fatura Uret"}
              </Button>
            </div>
            {listLoading ? (
              <Skeleton height="200px" />
            ) : items.length === 0 ? (
              <p style={{ color: themeColors.text.muted, textAlign: "center", padding: spacing.xl }}>
                Henuz tekrarlayan fatura sablonu olusturulmamis
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${themeColors.border}` }}>
                      {["Sablon Adi", "Tur", "Siklik", "Tutar", "Sonraki Tarih", "Durum", "Islem"].map(
                        (h) => (
                          <th
                            key={h}
                            style={{
                              textAlign: "left",
                              padding: spacing.sm,
                              fontSize: typography.fontSize.xs,
                              color: themeColors.text.secondary,
                              textTransform: "uppercase",
                            }}
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item: any) => (
                      <tr key={item.id} style={{ borderBottom: `1px solid ${themeColors.border}` }}>
                        <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm }}>
                          {item.templateName}
                          {item.clientCompany && (
                            <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted }}>
                              {item.clientCompany.name}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm }}>
                          {TYPE_LABELS[item.type] || item.type}
                        </td>
                        <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm }}>
                          {FREQUENCY_LABELS[item.frequency] || item.frequency}
                        </td>
                        <td
                          style={{
                            padding: spacing.sm,
                            fontSize: typography.fontSize.sm,
                            fontWeight: typography.fontWeight.semibold,
                          }}
                        >
                          {Number(item.totalAmount).toLocaleString("tr-TR")} {item.currency}
                        </td>
                        <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm }}>
                          {item.nextGenerationDate
                            ? new Date(item.nextGenerationDate).toLocaleDateString("tr-TR")
                            : "-"}
                        </td>
                        <td style={{ padding: spacing.sm }}>
                          <span
                            style={{
                              padding: `2px ${spacing.sm}`,
                              borderRadius: borderRadius.full,
                              fontSize: typography.fontSize.xs,
                              fontWeight: typography.fontWeight.semibold,
                              backgroundColor: item.isActive
                                ? `${colors.success}20`
                                : `${colors.gray[500]}20`,
                              color: item.isActive ? colors.success : colors.gray[500],
                            }}
                          >
                            {item.isActive ? "Aktif" : "Pasif"}
                          </span>
                        </td>
                        <td style={{ padding: spacing.sm }}>
                          <div style={{ display: "flex", gap: spacing.xs }}>
                            <button
                              onClick={() => toggleMutation.mutate(item.id)}
                              disabled={toggleMutation.isPending}
                              style={{
                                padding: `${spacing.xs} ${spacing.sm}`,
                                fontSize: typography.fontSize.xs,
                                backgroundColor: item.isActive ? colors.warning : colors.success,
                                color: colors.white,
                                border: "none",
                                borderRadius: borderRadius.md,
                                cursor: "pointer",
                              }}
                            >
                              {item.isActive ? "Durdur" : "Etkinlestir"}
                            </button>
                            <button
                              onClick={() => {
                                if (confirm("Bu sablonu silmek istediginize emin misiniz?")) {
                                  deleteMutation.mutate(item.id);
                                }
                              }}
                              disabled={deleteMutation.isPending}
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
                          </div>
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

      {/* Create Tab */}
      {activeTab === "create" && (
        <Card variant="elevated">
          <div style={{ padding: spacing.lg }}>
            <h3
              style={{
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.semibold,
                margin: `0 0 ${spacing.lg}`,
              }}
            >
              Yeni Tekrarlayan Fatura Sablonu
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: spacing.lg,
                marginBottom: spacing.xl,
              }}
            >
              <div>
                <label style={labelStyle}>Musteri ID</label>
                <input
                  type="text"
                  value={formData.clientCompanyId}
                  onChange={(e) => setFormData({ ...formData, clientCompanyId: e.target.value })}
                  placeholder="Musteri ID giriniz"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Sablon Adi</label>
                <input
                  type="text"
                  value={formData.templateName}
                  onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
                  placeholder="Orn: Aylik Kira Faturasi"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Tur</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  style={inputStyle}
                >
                  {Object.entries(TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Siklik</label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  style={inputStyle}
                >
                  {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Baslangic Tarihi</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Bitis Tarihi (Opsiyonel)</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Toplam Tutar</label>
                <input
                  type="number"
                  value={formData.totalAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, totalAmount: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0.00"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Vergi Tutari</label>
                <input
                  type="number"
                  value={formData.taxAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, taxAmount: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0.00"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Ayin Gunu</label>
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={formData.dayOfMonth}
                  onChange={(e) =>
                    setFormData({ ...formData, dayOfMonth: parseInt(e.target.value) || 1 })
                  }
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
                  <option value="GBP">GBP</option>
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Notlar</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ek notlar..."
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
                <input
                  type="checkbox"
                  checked={formData.autoSend}
                  onChange={(e) => setFormData({ ...formData, autoSend: e.target.checked })}
                  id="autoSend"
                />
                <label htmlFor="autoSend" style={{ fontSize: typography.fontSize.sm, cursor: "pointer" }}>
                  Otomatik gonder
                </label>
              </div>
            </div>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!formData.templateName || !formData.clientCompanyId || createMutation.isPending}
            >
              {createMutation.isPending ? "Olusturuluyor..." : "Sablon Olustur"}
            </Button>
            {createMutation.isError && (
              <div
                style={{
                  marginTop: spacing.md,
                  padding: spacing.md,
                  borderRadius: borderRadius.md,
                  backgroundColor: `${colors.danger}10`,
                  color: colors.danger,
                  fontSize: typography.fontSize.sm,
                }}
              >
                {(createMutation.error as Error).message}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
