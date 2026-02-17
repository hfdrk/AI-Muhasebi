"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { checkNoteClient } from "@repo/api-client";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Skeleton } from "../../../components/ui/Skeleton";
import { colors, spacing, borderRadius, typography, transitions } from "../../../styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "../../../lib/toast";

const TYPE_LABELS: Record<string, string> = {
  CEK: "Cek",
  SENET: "Senet",
};

const DIRECTION_LABELS: Record<string, string> = {
  ALACAK: "Alacak",
  BORC: "Borc",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Beklemede",
  COLLECTED: "Tahsil Edildi",
  BOUNCED: "Karsiliksiz",
  ENDORSED: "Ciro Edildi",
  CANCELLED: "Iptal Edildi",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: colors.warning,
  COLLECTED: colors.success,
  BOUNCED: colors.danger,
  ENDORSED: colors.info,
  CANCELLED: colors.gray[500],
};

export default function CekSenetPage() {
  const { themeColors } = useTheme();
  const [activeTab, setActiveTab] = useState<"dashboard" | "list" | "upcoming" | "overdue">("dashboard");
  const [endorseId, setEndorseId] = useState<string>("");
  const [endorseTo, setEndorseTo] = useState<string>("");
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState({
    type: "CEK" as "CEK" | "SENET",
    direction: "ALACAK" as "ALACAK" | "BORC",
    documentNumber: "",
    issuer: "",
    bankName: "",
    branchName: "",
    amount: 0,
    currency: "TRY",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    notes: "",
  });
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Queries
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["check-note-stats"],
    queryFn: () => checkNoteClient.getStats(),
  });

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ["check-notes"],
    queryFn: () => checkNoteClient.list({ limit: 50 }),
  });

  const { data: upcomingData, isLoading: upcomingLoading } = useQuery({
    queryKey: ["check-notes-upcoming"],
    queryFn: () => checkNoteClient.getUpcoming(30),
    enabled: activeTab === "upcoming",
  });

  const { data: overdueData, isLoading: overdueLoading } = useQuery({
    queryKey: ["check-notes-overdue"],
    queryFn: () => checkNoteClient.getOverdue(),
    enabled: activeTab === "overdue",
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: () => checkNoteClient.create(formData),
    onSuccess: () => {
      toast.success("Cek/senet olusturuldu");
      queryClient.invalidateQueries({ queryKey: ["check-notes"] });
      queryClient.invalidateQueries({ queryKey: ["check-note-stats"] });
      setShowCreateForm(false);
      setFormData({
        type: "CEK",
        direction: "ALACAK",
        documentNumber: "",
        issuer: "",
        bankName: "",
        branchName: "",
        amount: 0,
        currency: "TRY",
        issueDate: new Date().toISOString().split("T")[0],
        dueDate: "",
        notes: "",
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Olusturma basarisiz oldu");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      checkNoteClient.updateStatus(id, { status }),
    onSuccess: () => {
      toast.success("Durum guncellendi");
      queryClient.invalidateQueries({ queryKey: ["check-notes"] });
      queryClient.invalidateQueries({ queryKey: ["check-note-stats"] });
      queryClient.invalidateQueries({ queryKey: ["check-notes-upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["check-notes-overdue"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Durum guncellenemedi");
    },
  });

  const endorseMutation = useMutation({
    mutationFn: ({ id, endorsedTo }: { id: string; endorsedTo: string }) =>
      checkNoteClient.endorse(id, endorsedTo),
    onSuccess: () => {
      toast.success("Ciro islemi tamamlandi");
      queryClient.invalidateQueries({ queryKey: ["check-notes"] });
      queryClient.invalidateQueries({ queryKey: ["check-note-stats"] });
      setEndorseId("");
      setEndorseTo("");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Ciro islemi basarisiz oldu");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => checkNoteClient.delete(id),
    onSuccess: () => {
      toast.success("Cek/senet silindi");
      queryClient.invalidateQueries({ queryKey: ["check-notes"] });
      queryClient.invalidateQueries({ queryKey: ["check-note-stats"] });
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

  const renderItemRow = (item: any, showActions: boolean = true) => (
    <tr key={item.id} style={{ borderBottom: `1px solid ${themeColors.border}` }}>
      <td style={{ padding: spacing.sm }}>
        <span
          style={{
            padding: `2px ${spacing.sm}`,
            borderRadius: borderRadius.full,
            fontSize: typography.fontSize.xs,
            fontWeight: typography.fontWeight.semibold,
            backgroundColor: item.type === "CEK" ? `${colors.primary}20` : `${colors.info}20`,
            color: item.type === "CEK" ? colors.primary : colors.info,
          }}
        >
          {TYPE_LABELS[item.type]}
        </span>
      </td>
      <td style={{ padding: spacing.sm }}>
        <span
          style={{
            fontSize: typography.fontSize.sm,
            color: item.direction === "ALACAK" ? colors.success : colors.danger,
            fontWeight: typography.fontWeight.semibold,
          }}
        >
          {DIRECTION_LABELS[item.direction]}
        </span>
      </td>
      <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm }}>{item.documentNumber}</td>
      <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>
        {Number(item.amount).toLocaleString("tr-TR")} {item.currency}
      </td>
      <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm }}>
        {new Date(item.dueDate).toLocaleDateString("tr-TR")}
      </td>
      <td style={{ padding: spacing.sm }}>
        <span
          style={{
            padding: `2px ${spacing.sm}`,
            borderRadius: borderRadius.full,
            fontSize: typography.fontSize.xs,
            fontWeight: typography.fontWeight.semibold,
            backgroundColor: `${STATUS_COLORS[item.status] || colors.gray[500]}20`,
            color: STATUS_COLORS[item.status] || colors.gray[500],
          }}
        >
          {STATUS_LABELS[item.status] || item.status}
        </span>
      </td>
      {showActions && (
        <td style={{ padding: spacing.sm }}>
          <div style={{ display: "flex", gap: spacing.xs, flexWrap: "wrap" }}>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  statusMutation.mutate({ id: item.id, status: e.target.value });
                  e.target.value = "";
                }
              }}
              style={{
                padding: `${spacing.xs} ${spacing.sm}`,
                fontSize: typography.fontSize.xs,
                border: `1px solid ${themeColors.border}`,
                borderRadius: borderRadius.md,
                backgroundColor: themeColors.white,
                cursor: "pointer",
              }}
              defaultValue=""
            >
              <option value="" disabled>
                Durum
              </option>
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            {item.status === "PENDING" && item.direction === "ALACAK" && (
              <>
                {endorseId === item.id ? (
                  <div style={{ display: "flex", gap: spacing.xs }}>
                    <input
                      type="text"
                      value={endorseTo}
                      onChange={(e) => setEndorseTo(e.target.value)}
                      placeholder="Ciro edilen"
                      style={{
                        padding: `${spacing.xs} ${spacing.sm}`,
                        fontSize: typography.fontSize.xs,
                        border: `1px solid ${themeColors.border}`,
                        borderRadius: borderRadius.md,
                        width: "120px",
                      }}
                    />
                    <button
                      onClick={() =>
                        endorseTo && endorseMutation.mutate({ id: item.id, endorsedTo: endorseTo })
                      }
                      disabled={!endorseTo || endorseMutation.isPending}
                      style={{
                        padding: `${spacing.xs} ${spacing.sm}`,
                        fontSize: typography.fontSize.xs,
                        backgroundColor: colors.info,
                        color: colors.white,
                        border: "none",
                        borderRadius: borderRadius.md,
                        cursor: "pointer",
                      }}
                    >
                      Onayla
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEndorseId(item.id)}
                    style={{
                      padding: `${spacing.xs} ${spacing.sm}`,
                      fontSize: typography.fontSize.xs,
                      backgroundColor: colors.info,
                      color: colors.white,
                      border: "none",
                      borderRadius: borderRadius.md,
                      cursor: "pointer",
                    }}
                  >
                    Ciro Et
                  </button>
                )}
              </>
            )}
            <button
              onClick={() => {
                if (confirm("Bu kaydi silmek istediginize emin misiniz?")) {
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

  const tableHeaders = ["Tur", "Yon", "Belge No", "Tutar", "Vade Tarihi", "Durum", "Islem"];
  const tableHeadersNoAction = ["Tur", "Yon", "Belge No", "Tutar", "Vade Tarihi", "Durum"];

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
          Cek / Senet Takibi
        </h1>
        <p
          style={{
            fontSize: typography.fontSize.sm,
            color: themeColors.text.secondary,
            margin: `${spacing.xs} 0 0`,
          }}
        >
          Cek ve senet hareketlerini takip edin
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
          { key: "upcoming", label: "Vadesi Yaklasan" },
          { key: "overdue", label: "Vadesi Gecmis" },
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
                      Toplam
                    </div>
                    <div
                      style={{
                        fontSize: typography.fontSize["3xl"],
                        fontWeight: typography.fontWeight.bold,
                        color: colors.primary,
                        marginTop: spacing.xs,
                      }}
                    >
                      {stats.totalChecks + stats.totalNotes}
                    </div>
                    <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted, marginTop: spacing.xs }}>
                      {stats.totalChecks} Cek / {stats.totalNotes} Senet
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
                      Alacak
                    </div>
                    <div
                      style={{
                        fontSize: typography.fontSize["3xl"],
                        fontWeight: typography.fontWeight.bold,
                        color: colors.success,
                        marginTop: spacing.xs,
                      }}
                    >
                      {Number(stats.totalReceivable).toLocaleString("tr-TR")} TRY
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
                      Borc
                    </div>
                    <div
                      style={{
                        fontSize: typography.fontSize["3xl"],
                        fontWeight: typography.fontWeight.bold,
                        color: colors.danger,
                        marginTop: spacing.xs,
                      }}
                    >
                      {Number(stats.totalPayable).toLocaleString("tr-TR")} TRY
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
                      Vadesi Gecmis
                    </div>
                    <div
                      style={{
                        fontSize: typography.fontSize["3xl"],
                        fontWeight: typography.fontWeight.bold,
                        color: colors.warning,
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
              </div>

              {/* Status Breakdown */}
              <Card variant="elevated">
                <div style={{ padding: spacing.lg }}>
                  <h3
                    style={{
                      fontSize: typography.fontSize.lg,
                      fontWeight: typography.fontWeight.semibold,
                      margin: `0 0 ${spacing.md}`,
                    }}
                  >
                    Durum Dagilimi
                  </h3>
                  {stats.statusBreakdown.length === 0 ? (
                    <p style={{ color: themeColors.text.muted, fontSize: typography.fontSize.sm }}>
                      Veri bulunmuyor
                    </p>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: spacing.md }}>
                      {stats.statusBreakdown.map((s: any) => (
                        <div
                          key={s.status}
                          style={{
                            padding: spacing.md,
                            borderRadius: borderRadius.md,
                            backgroundColor: themeColors.gray[50],
                            textAlign: "center",
                          }}
                        >
                          <div style={{ fontSize: typography.fontSize.sm, color: themeColors.text.secondary, marginBottom: spacing.xs }}>
                            {STATUS_LABELS[s.status] || s.status}
                          </div>
                          <div style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: STATUS_COLORS[s.status] || colors.primary }}>
                            {s.count}
                          </div>
                          <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted }}>
                            {Number(s.amount).toLocaleString("tr-TR")} TRY
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
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
                Cek ve Senet Listesi
              </h3>
              <Button onClick={() => setShowCreateForm(!showCreateForm)} size="sm">
                {showCreateForm ? "Formu Kapat" : "Yeni Ekle"}
              </Button>
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
                  Yeni Cek/Senet Olustur
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: spacing.md }}>
                  <div>
                    <label style={labelStyle}>Tur</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as "CEK" | "SENET" })}
                      style={inputStyle}
                    >
                      <option value="CEK">Cek</option>
                      <option value="SENET">Senet</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Yon</label>
                    <select
                      value={formData.direction}
                      onChange={(e) => setFormData({ ...formData, direction: e.target.value as "ALACAK" | "BORC" })}
                      style={inputStyle}
                    >
                      <option value="ALACAK">Alacak</option>
                      <option value="BORC">Borc</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Belge No</label>
                    <input
                      type="text"
                      value={formData.documentNumber}
                      onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                      placeholder="Belge numarasi"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Duzenleyen</label>
                    <input
                      type="text"
                      value={formData.issuer}
                      onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
                      placeholder="Duzenleyen"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Banka</label>
                    <input
                      type="text"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      placeholder="Banka adi"
                      style={inputStyle}
                    />
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
                    <label style={labelStyle}>Duzenleme Tarihi</label>
                    <input
                      type="date"
                      value={formData.issueDate}
                      onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
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
                </div>
                <div style={{ marginTop: spacing.md }}>
                  <Button
                    onClick={() => createMutation.mutate()}
                    disabled={!formData.documentNumber || !formData.dueDate || createMutation.isPending}
                  >
                    {createMutation.isPending ? "Olusturuluyor..." : "Kaydet"}
                  </Button>
                </div>
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
            )}

            {listLoading ? (
              <Skeleton height="200px" />
            ) : items.length === 0 ? (
              <p style={{ color: themeColors.text.muted, textAlign: "center", padding: spacing.xl }}>
                Henuz cek veya senet kaydi bulunmuyor
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${themeColors.border}` }}>
                      {tableHeaders.map((h) => (
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
                      ))}
                    </tr>
                  </thead>
                  <tbody>{items.map((item: any) => renderItemRow(item, true))}</tbody>
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
            <h3
              style={{
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.semibold,
                margin: `0 0 ${spacing.lg}`,
              }}
            >
              Vadesi Yaklasan (30 Gun)
            </h3>
            {upcomingLoading ? (
              <Skeleton height="200px" />
            ) : upcomingItems.length === 0 ? (
              <p style={{ color: themeColors.text.muted, textAlign: "center", padding: spacing.xl }}>
                Vadesi yaklasan cek/senet bulunmuyor
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${themeColors.border}` }}>
                      {tableHeadersNoAction.map((h) => (
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
                      ))}
                    </tr>
                  </thead>
                  <tbody>{upcomingItems.map((item: any) => renderItemRow(item, false))}</tbody>
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
            <h3
              style={{
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.semibold,
                margin: `0 0 ${spacing.lg}`,
              }}
            >
              Vadesi Gecmis
            </h3>
            {overdueLoading ? (
              <Skeleton height="200px" />
            ) : overdueItems.length === 0 ? (
              <p style={{ color: themeColors.text.muted, textAlign: "center", padding: spacing.xl }}>
                Vadesi gecmis cek/senet bulunmuyor
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${themeColors.border}` }}>
                      {tableHeadersNoAction.map((h) => (
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
                      ))}
                    </tr>
                  </thead>
                  <tbody>{overdueItems.map((item: any) => renderItemRow(item, false))}</tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
