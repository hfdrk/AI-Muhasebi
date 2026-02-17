"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentReminderClient } from "@repo/api-client";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Skeleton } from "../../../components/ui/Skeleton";
import { colors, spacing, borderRadius, typography, transitions } from "../../../styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "../../../lib/toast";

const TYPE_LABELS: Record<string, string> = {
  INVOICE: "Fatura",
  CHECK: "Cek",
  NOTE: "Senet",
  MANUAL: "Manuel",
  SUBSCRIPTION: "Abonelik",
  TAX: "Vergi",
  RENT: "Kira",
  OTHER: "Diger",
};

export default function OdemeHatirlatmaPage() {
  const { themeColors } = useTheme();
  const [activeTab, setActiveTab] = useState<"dashboard" | "list" | "upcoming" | "overdue">("dashboard");
  const queryClient = useQueryClient();

  // Form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    type: "MANUAL",
    description: "",
    amount: 0,
    currency: "TRY",
    dueDate: "",
    counterpartyName: "",
    referenceNumber: "",
    reminderDaysBefore: 3,
  });

  // Queries
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["payment-reminder-stats"],
    queryFn: () => paymentReminderClient.getStats(),
  });

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ["payment-reminders"],
    queryFn: () => paymentReminderClient.list({ limit: 50 }),
  });

  const { data: upcomingData, isLoading: upcomingLoading } = useQuery({
    queryKey: ["payment-reminders-upcoming"],
    queryFn: () => paymentReminderClient.getUpcoming(30),
    enabled: activeTab === "upcoming",
  });

  const { data: overdueData, isLoading: overdueLoading } = useQuery({
    queryKey: ["payment-reminders-overdue"],
    queryFn: () => paymentReminderClient.getOverdue(),
    enabled: activeTab === "overdue",
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: () =>
      paymentReminderClient.create({
        type: formData.type,
        description: formData.description,
        amount: formData.amount,
        currency: formData.currency,
        dueDate: formData.dueDate,
        reminderDaysBefore: formData.reminderDaysBefore,
      } as any),
    onSuccess: () => {
      toast.success("Odeme hatirlatmasi olusturuldu");
      queryClient.invalidateQueries({ queryKey: ["payment-reminders"] });
      queryClient.invalidateQueries({ queryKey: ["payment-reminder-stats"] });
      queryClient.invalidateQueries({ queryKey: ["payment-reminders-upcoming"] });
      setShowCreateForm(false);
      setFormData({
        type: "MANUAL",
        description: "",
        amount: 0,
        currency: "TRY",
        dueDate: "",
        counterpartyName: "",
        referenceNumber: "",
        reminderDaysBefore: 3,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Olusturma basarisiz oldu");
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => paymentReminderClient.markAsPaid(id),
    onSuccess: () => {
      toast.success("Odeme yapildi olarak isaretlendi");
      queryClient.invalidateQueries({ queryKey: ["payment-reminders"] });
      queryClient.invalidateQueries({ queryKey: ["payment-reminder-stats"] });
      queryClient.invalidateQueries({ queryKey: ["payment-reminders-upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["payment-reminders-overdue"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Islem basarisiz oldu");
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => paymentReminderClient.sync(),
    onSuccess: (data) => {
      toast.success(`${data.data.syncedCount} hatirlatma senkronize edildi`);
      queryClient.invalidateQueries({ queryKey: ["payment-reminders"] });
      queryClient.invalidateQueries({ queryKey: ["payment-reminder-stats"] });
      queryClient.invalidateQueries({ queryKey: ["payment-reminders-upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["payment-reminders-overdue"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Senkronizasyon basarisiz oldu");
    },
  });

  const processMutation = useMutation({
    mutationFn: () => paymentReminderClient.processAndNotify(),
    onSuccess: (data) => {
      toast.success(`${data.data.processedCount} hatirlatma islendi, ${data.data.notifiedCount} bildirim gonderildi`);
      queryClient.invalidateQueries({ queryKey: ["payment-reminders"] });
      queryClient.invalidateQueries({ queryKey: ["payment-reminder-stats"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Bildirim gonderme basarisiz oldu");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => paymentReminderClient.delete(id),
    onSuccess: () => {
      toast.success("Hatirlatma silindi");
      queryClient.invalidateQueries({ queryKey: ["payment-reminders"] });
      queryClient.invalidateQueries({ queryKey: ["payment-reminder-stats"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Silme basarisiz oldu");
    },
  });

  const stats = statsData?.data;
  const items = listData?.data?.items || [];
  const upcomingItems = upcomingData?.data || [];
  const overdueItems = overdueData?.data || [];

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

  const renderReminderRow = (item: any, showActions: boolean = true) => {
    const isOverdue = !item.isPaid && new Date(item.dueDate) < new Date();
    return (
      <tr key={item.id} style={{ borderBottom: `1px solid ${themeColors.border}`, backgroundColor: isOverdue ? `${colors.danger}05` : "transparent" }}>
        <td style={{ padding: spacing.sm }}>
          <span
            style={{
              padding: `2px ${spacing.sm}`,
              borderRadius: borderRadius.full,
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.semibold,
              backgroundColor: `${colors.info}20`,
              color: colors.info,
            }}
          >
            {TYPE_LABELS[item.type] || item.type}
          </span>
        </td>
        <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm }}>
          {item.description}
          {item.counterpartyName && (
            <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted }}>{item.counterpartyName}</div>
          )}
        </td>
        <td
          style={{
            padding: spacing.sm,
            fontSize: typography.fontSize.sm,
            color: isOverdue ? colors.danger : themeColors.text.primary,
            fontWeight: typography.fontWeight.medium,
          }}
        >
          {new Date(item.dueDate).toLocaleDateString("tr-TR")}
          {isOverdue && (
            <div style={{ fontSize: typography.fontSize.xs, color: colors.danger, fontWeight: typography.fontWeight.semibold }}>
              Gecikti
            </div>
          )}
        </td>
        <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>
          {Number(item.amount).toLocaleString("tr-TR")} {item.currency}
        </td>
        <td style={{ padding: spacing.sm }}>
          <span
            style={{
              padding: `2px ${spacing.sm}`,
              borderRadius: borderRadius.full,
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.semibold,
              backgroundColor: item.isPaid ? `${colors.success}20` : `${colors.warning}20`,
              color: item.isPaid ? colors.success : colors.warning,
            }}
          >
            {item.isPaid ? "Odendi" : "Bekliyor"}
          </span>
        </td>
        {showActions && (
          <td style={{ padding: spacing.sm }}>
            <div style={{ display: "flex", gap: spacing.xs }}>
              {!item.isPaid && (
                <button
                  onClick={() => markPaidMutation.mutate(item.id)}
                  disabled={markPaidMutation.isPending}
                  style={{
                    padding: `${spacing.xs} ${spacing.sm}`,
                    fontSize: typography.fontSize.xs,
                    backgroundColor: colors.success,
                    color: colors.white,
                    border: "none",
                    borderRadius: borderRadius.md,
                    cursor: "pointer",
                  }}
                >
                  Odendi
                </button>
              )}
              <button
                onClick={() => {
                  if (confirm("Bu hatirlatmayi silmek istediginize emin misiniz?")) {
                    deleteMutation.mutate(item.id);
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
            </div>
          </td>
        )}
      </tr>
    );
  };

  const tableHeaders = ["Tur", "Aciklama", "Vade Tarihi", "Tutar", "Durum", "Islem"];
  const tableHeadersNoAction = ["Tur", "Aciklama", "Vade Tarihi", "Tutar", "Durum"];

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
          Odeme Hatirlatmalari
        </h1>
        <p
          style={{
            fontSize: typography.fontSize.sm,
            color: themeColors.text.secondary,
            margin: `${spacing.xs} 0 0`,
          }}
        >
          Yaklasan ve gecikmis odemeleri takip edin
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
          { key: "upcoming", label: "Yaklasan" },
          { key: "overdue", label: "Gecikmis" },
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
                      Toplam Hatirlatma
                    </div>
                    <div
                      style={{
                        fontSize: typography.fontSize["3xl"],
                        fontWeight: typography.fontWeight.bold,
                        color: colors.primary,
                        marginTop: spacing.xs,
                      }}
                    >
                      {stats.totalReminders}
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
                      Yaklasan
                    </div>
                    <div
                      style={{
                        fontSize: typography.fontSize["3xl"],
                        fontWeight: typography.fontWeight.bold,
                        color: colors.warning,
                        marginTop: spacing.xs,
                      }}
                    >
                      {stats.upcomingCount}
                    </div>
                    <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted, marginTop: spacing.xs }}>
                      {Number(stats.upcomingAmount).toLocaleString("tr-TR")} TRY
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
                      Gecikmis
                    </div>
                    <div
                      style={{
                        fontSize: typography.fontSize["3xl"],
                        fontWeight: typography.fontWeight.bold,
                        color: colors.danger,
                        marginTop: spacing.xs,
                      }}
                    >
                      {stats.overdueCount}
                    </div>
                    <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted, marginTop: spacing.xs }}>
                      {Number(stats.overdueAmount).toLocaleString("tr-TR")} TRY
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
                      Odenen
                    </div>
                    <div
                      style={{
                        fontSize: typography.fontSize["3xl"],
                        fontWeight: typography.fontWeight.bold,
                        color: colors.success,
                        marginTop: spacing.xs,
                      }}
                    >
                      {stats.paidCount}
                    </div>
                  </div>
                </Card>
              </div>

              {/* Type Breakdown & Actions */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.lg }}>
                <Card variant="elevated">
                  <div style={{ padding: spacing.lg }}>
                    <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, margin: `0 0 ${spacing.md}` }}>
                      Tur Dagilimi
                    </h3>
                    {stats.typeBreakdown.length === 0 ? (
                      <p style={{ color: themeColors.text.muted, fontSize: typography.fontSize.sm }}>Veri bulunmuyor</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
                        {stats.typeBreakdown.map((t: any) => (
                          <div
                            key={t.type}
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
                              {TYPE_LABELS[t.type] || t.type}
                            </span>
                            <div style={{ display: "flex", gap: spacing.md, alignItems: "center" }}>
                              <span style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted }}>{t.count} adet</span>
                              <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.primary }}>
                                {Number(t.amount).toLocaleString("tr-TR")} TRY
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>

                <Card variant="elevated">
                  <div style={{ padding: spacing.lg }}>
                    <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, margin: `0 0 ${spacing.md}` }}>
                      Hizli Islemler
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
                      <div
                        style={{
                          padding: spacing.md,
                          borderRadius: borderRadius.md,
                          backgroundColor: themeColors.gray[50],
                          border: `1px solid ${themeColors.border}`,
                        }}
                      >
                        <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, marginBottom: spacing.xs }}>
                          Toplam Odenecek
                        </div>
                        <div style={{ fontSize: typography.fontSize["2xl"], fontWeight: typography.fontWeight.bold, color: colors.danger }}>
                          {Number(stats.totalOutstandingAmount).toLocaleString("tr-TR")} TRY
                        </div>
                      </div>
                      <Button
                        onClick={() => syncMutation.mutate()}
                        disabled={syncMutation.isPending}
                        variant="secondary"
                      >
                        {syncMutation.isPending ? "Senkronize ediliyor..." : "Fatura/Ceklerden Senkronize Et"}
                      </Button>
                      <Button
                        onClick={() => processMutation.mutate()}
                        disabled={processMutation.isPending}
                        variant="primary"
                      >
                        {processMutation.isPending ? "Gonderiliyor..." : "Bildirimleri Gonder"}
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            </>
          ) : null}
        </>
      )}

      {/* List Tab */}
      {activeTab === "list" && (
        <Card variant="elevated">
          <div style={{ padding: spacing.lg }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg }}>
              <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, margin: 0 }}>
                Tum Hatirlatmalar
              </h3>
              <div style={{ display: "flex", gap: spacing.sm }}>
                <Button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending} variant="secondary" size="sm">
                  {syncMutation.isPending ? "Senkronize..." : "Senkronize Et"}
                </Button>
                <Button onClick={() => processMutation.mutate()} disabled={processMutation.isPending} variant="outline" size="sm">
                  {processMutation.isPending ? "Gonderiliyor..." : "Bildirimleri Gonder"}
                </Button>
                <Button onClick={() => setShowCreateForm(!showCreateForm)} size="sm">
                  {showCreateForm ? "Formu Kapat" : "Yeni Olustur"}
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
                  Yeni Odeme Hatirlatmasi
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: spacing.md }}>
                  <div>
                    <label style={labelStyle}>Tur</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      style={inputStyle}
                    >
                      {Object.entries(TYPE_LABELS).map(([key, label]) => (
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
                    <label style={labelStyle}>Vade Tarihi</label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Karsi Taraf</label>
                    <input
                      type="text"
                      value={formData.counterpartyName}
                      onChange={(e) => setFormData({ ...formData, counterpartyName: e.target.value })}
                      placeholder="Firma/kisi adi"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Referans No</label>
                    <input
                      type="text"
                      value={formData.referenceNumber}
                      onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                      placeholder="Fatura/belge no"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Hatirlatma (Gun Once)</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={formData.reminderDaysBefore}
                      onChange={(e) => setFormData({ ...formData, reminderDaysBefore: parseInt(e.target.value) || 3 })}
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Aciklama</label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Odeme aciklamasi"
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div style={{ marginTop: spacing.md }}>
                  <Button
                    onClick={() => createMutation.mutate()}
                    disabled={!formData.description || !formData.dueDate || !formData.amount || createMutation.isPending}
                  >
                    {createMutation.isPending ? "Olusturuluyor..." : "Hatirlatma Olustur"}
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
            ) : items.length === 0 ? (
              <p style={{ color: themeColors.text.muted, textAlign: "center", padding: spacing.xl }}>
                Henuz odeme hatirlatmasi bulunmuyor
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${themeColors.border}` }}>
                      {tableHeaders.map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: spacing.sm, fontSize: typography.fontSize.xs, color: themeColors.text.secondary, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>{items.map((item: any) => renderReminderRow(item, true))}</tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Upcoming Tab */}
      {activeTab === "upcoming" && (
        <Card variant="elevated">
          <div style={{ padding: spacing.lg }}>
            <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, margin: `0 0 ${spacing.lg}` }}>
              Yaklasan Odemeler (30 Gun)
            </h3>
            {upcomingLoading ? (
              <Skeleton height="200px" />
            ) : upcomingItems.length === 0 ? (
              <p style={{ color: themeColors.text.muted, textAlign: "center", padding: spacing.xl }}>
                Yaklasan odeme bulunmuyor
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${themeColors.border}` }}>
                      {tableHeadersNoAction.map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: spacing.sm, fontSize: typography.fontSize.xs, color: themeColors.text.secondary, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>{upcomingItems.map((item: any) => renderReminderRow(item, false))}</tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Overdue Tab */}
      {activeTab === "overdue" && (
        <Card variant="elevated">
          <div style={{ padding: spacing.lg }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg }}>
              <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, margin: 0 }}>
                Gecikmis Odemeler
              </h3>
              <Button
                onClick={() => processMutation.mutate()}
                disabled={processMutation.isPending}
                variant="danger"
                size="sm"
              >
                {processMutation.isPending ? "Gonderiliyor..." : "Hatirlatma Gonder"}
              </Button>
            </div>
            {overdueLoading ? (
              <Skeleton height="200px" />
            ) : overdueItems.length === 0 ? (
              <p style={{ color: themeColors.text.muted, textAlign: "center", padding: spacing.xl }}>
                Gecikmis odeme bulunmuyor
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${themeColors.border}` }}>
                      {tableHeaders.map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: spacing.sm, fontSize: typography.fontSize.xs, color: themeColors.text.secondary, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>{overdueItems.map((item: any) => renderReminderRow(item, true))}</tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
