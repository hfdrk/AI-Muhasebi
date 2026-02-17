"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { beyannameClient, listClientCompanies } from "@repo/api-client";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Skeleton } from "../../../components/ui/Skeleton";
import { colors, spacing, borderRadius, typography, transitions } from "../../../styles/design-system";
import { useTheme } from "../../../contexts/ThemeContext";

const TYPE_LABELS: Record<string, string> = {
  KDV: "KDV Beyannamesi",
  MUHTASAR: "Muhtasar Beyanname",
  GECICI_VERGI: "Geçici Vergi",
  KURUMLAR: "Kurumlar Vergisi",
  GELIR: "Gelir Vergisi",
  DAMGA: "Damga Vergisi",
  KDV2: "KDV-2 (Sorumlu Sıfatıyla)",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Taslak",
  calculating: "Hesaplanıyor",
  calculated: "Hesaplandı",
  reviewed: "İncelendi",
  submitted: "Gönderildi",
  accepted: "Kabul Edildi",
  revision_needed: "Düzeltme Gerekli",
};

const STATUS_COLORS: Record<string, string> = {
  draft: colors.gray[500],
  calculating: colors.info,
  calculated: colors.primary,
  reviewed: colors.warning,
  submitted: colors.success,
  accepted: colors.success,
  revision_needed: colors.danger,
};

export default function BeyannamePage() {
  const { themeColors } = useTheme();
  const [activeTab, setActiveTab] = useState<"dashboard" | "list" | "create">("dashboard");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [beyannameType, setBeyannameType] = useState<string>("KDV");
  const [period, setPeriod] = useState<string>(() => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;
  });
  const [dueDate, setDueDate] = useState<string>(() => {
    const now = new Date();
    now.setMonth(now.getMonth() + 1);
    now.setDate(26);
    return now.toISOString().split("T")[0];
  });
  const [selectedBeyannameId, setSelectedBeyannameId] = useState<string | null>(null);
  const [statusNotes, setStatusNotes] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const { data: dashboardData, isLoading: dashLoading } = useQuery({
    queryKey: ["beyanname-dashboard"],
    queryFn: () => beyannameClient.getDashboard(),
  });

  const { data: clientsData } = useQuery({
    queryKey: ["client-companies"],
    queryFn: () => listClientCompanies({ pageSize: 100 }),
  });

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ["beyanname-list"],
    queryFn: () => beyannameClient.listBeyannameler({ pageSize: 50 }),
  });

  const createMutation = useMutation({
    mutationFn: () => beyannameClient.createBeyanname({ clientCompanyId: selectedClientId, type: beyannameType, period, dueDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beyanname-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["beyanname-list"] });
      setActiveTab("list");
    },
  });

  const calculateMutation = useMutation({
    mutationFn: (id: string) => beyannameClient.calculateBeyanname(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beyanname-list"] });
      queryClient.invalidateQueries({ queryKey: ["beyanname-dashboard"] });
    },
  });

  const { data: beyannameDetailData, isLoading: beyannameDetailLoading } = useQuery({
    queryKey: ["beyanname-detail", selectedBeyannameId],
    queryFn: () => beyannameClient.getBeyanname(selectedBeyannameId!),
    enabled: !!selectedBeyannameId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      beyannameClient.updateBeyannameStatus(id, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beyanname-list"] });
      queryClient.invalidateQueries({ queryKey: ["beyanname-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["beyanname-detail", selectedBeyannameId] });
      setStatusNotes("");
      showToast("Beyanname durumu guncellendi");
    },
    onError: (error: Error) => {
      showToast(`Hata: ${error.message}`);
    },
  });

  const beyannameDetail = beyannameDetailData?.data;
  const dashboard = dashboardData?.data;
  const clients = clientsData?.data?.data || [];
  const beyannameler = listData?.data?.beyannameler || [];

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: "fixed", top: spacing.lg, right: spacing.lg, zIndex: 9999,
          padding: `${spacing.md} ${spacing.xl}`, borderRadius: borderRadius.lg,
          backgroundColor: toastMessage.startsWith("Hata") ? colors.danger : colors.success,
          color: themeColors.white, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}>
          {toastMessage}
        </div>
      )}

      <div style={{ marginBottom: spacing.xl }}>
        <h1 style={{ fontSize: typography.fontSize["2xl"], fontWeight: typography.fontWeight.bold, color: themeColors.text.primary, margin: 0 }}>
          Beyanname Yönetimi
        </h1>
        <p style={{ fontSize: typography.fontSize.sm, color: themeColors.text.secondary, margin: `${spacing.xs} 0 0` }}>
          Vergi beyannamesi hazırlama, hesaplama ve takip
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: spacing.sm, marginBottom: spacing.xl, borderBottom: `2px solid ${themeColors.border}`, paddingBottom: spacing.sm }}>
        {[
          { key: "dashboard", label: "Pano" },
          { key: "list", label: "Beyannameler" },
          { key: "create", label: "Yeni Oluştur" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: `${spacing.sm} ${spacing.lg}`,
              backgroundColor: activeTab === tab.key ? colors.primary : "transparent",
              color: activeTab === tab.key ? themeColors.white : themeColors.text.secondary,
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

      {/* Dashboard */}
      {activeTab === "dashboard" && (
        <>
          {dashLoading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: spacing.lg }}>
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}><div style={{ padding: spacing.lg }}><Skeleton height="80px" /></div></Card>
              ))}
            </div>
          ) : dashboard ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: spacing.lg, marginBottom: spacing.xl }}>
                <Card variant="elevated">
                  <div style={{ padding: spacing.lg }}>
                    <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.secondary, textTransform: "uppercase" }}>Toplam</div>
                    <div style={{ fontSize: typography.fontSize["3xl"], fontWeight: typography.fontWeight.bold, color: colors.primary, marginTop: spacing.xs }}>{dashboard.totalBeyanname}</div>
                  </div>
                </Card>
                <Card variant="elevated">
                  <div style={{ padding: spacing.lg }}>
                    <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.secondary, textTransform: "uppercase" }}>Taslak</div>
                    <div style={{ fontSize: typography.fontSize["3xl"], fontWeight: typography.fontWeight.bold, color: colors.gray[600], marginTop: spacing.xs }}>{dashboard.draftBeyanname}</div>
                  </div>
                </Card>
                <Card variant="elevated">
                  <div style={{ padding: spacing.lg }}>
                    <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.secondary, textTransform: "uppercase" }}>Gönderildi</div>
                    <div style={{ fontSize: typography.fontSize["3xl"], fontWeight: typography.fontWeight.bold, color: colors.success, marginTop: spacing.xs }}>{dashboard.submittedBeyanname}</div>
                  </div>
                </Card>
                <Card variant="elevated">
                  <div style={{ padding: spacing.lg }}>
                    <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.secondary, textTransform: "uppercase" }}>Gecikmiş</div>
                    <div style={{ fontSize: typography.fontSize["3xl"], fontWeight: typography.fontWeight.bold, color: colors.danger, marginTop: spacing.xs }}>{dashboard.overdueBeyanname}</div>
                  </div>
                </Card>
              </div>

              {/* Upcoming Due Dates */}
              <Card variant="elevated">
                <div style={{ padding: spacing.lg }}>
                  <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, margin: `0 0 ${spacing.md}` }}>Yaklaşan Beyanname Süreleri</h3>
                  {dashboard.upcomingDue.length === 0 ? (
                    <p style={{ color: themeColors.text.muted, fontSize: typography.fontSize.sm }}>Yaklaşan süre bulunmuyor</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
                      {dashboard.upcomingDue.map((b: any) => (
                        <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: spacing.sm, borderRadius: borderRadius.md, backgroundColor: themeColors.gray[50] }}>
                          <div>
                            <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>{b.clientCompanyName}</div>
                            <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted }}>{TYPE_LABELS[b.type] || b.type} - {b.period}</div>
                          </div>
                          <div style={{ display: "flex", gap: spacing.sm, alignItems: "center" }}>
                            {b.netPayable != null && (
                              <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>{Number(b.netPayable).toLocaleString("tr-TR")} TRY</span>
                            )}
                            <span style={{ fontSize: typography.fontSize.xs, color: colors.danger, fontWeight: typography.fontWeight.semibold }}>
                              {new Date(b.dueDate).toLocaleDateString("tr-TR")}
                            </span>
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

      {/* List */}
      {activeTab === "list" && (
        <>
          <Card variant="elevated">
            <div style={{ padding: spacing.lg }}>
              <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, margin: `0 0 ${spacing.lg}` }}>Beyanname Listesi</h3>
              {listLoading ? (
                <Skeleton height="200px" />
              ) : beyannameler.length === 0 ? (
                <p style={{ color: themeColors.text.muted, textAlign: "center", padding: spacing.xl }}>Henüz beyanname oluşturulmamış</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${themeColors.border}` }}>
                        {["Müşteri", "Tür", "Dönem", "Durum", "Net Ödenecek", "Son Tarih", "İşlem"].map((h) => (
                          <th key={h} style={{ textAlign: "left", padding: spacing.sm, fontSize: typography.fontSize.xs, color: themeColors.text.secondary, textTransform: "uppercase" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {beyannameler.map((b: any) => (
                        <tr
                          key={b.id}
                          onClick={() => setSelectedBeyannameId(selectedBeyannameId === b.id ? null : b.id)}
                          style={{
                            borderBottom: `1px solid ${themeColors.border}`,
                            cursor: "pointer",
                            backgroundColor: selectedBeyannameId === b.id ? `${colors.primary}08` : "transparent",
                            transition: `background-color ${transitions.normal}`,
                          }}
                        >
                          <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm }}>{b.clientCompany?.name}</td>
                          <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm }}>{TYPE_LABELS[b.type] || b.type}</td>
                          <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm }}>{b.period}</td>
                          <td style={{ padding: spacing.sm }}>
                            <span style={{ padding: `2px ${spacing.sm}`, borderRadius: borderRadius.full, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, backgroundColor: `${STATUS_COLORS[b.status]}20`, color: STATUS_COLORS[b.status] }}>
                              {STATUS_LABELS[b.status] || b.status}
                            </span>
                          </td>
                          <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>
                            {b.netPayable != null ? `${Number(b.netPayable).toLocaleString("tr-TR")} TRY` : "-"}
                          </td>
                          <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm, color: new Date(b.dueDate) < new Date() ? colors.danger : themeColors.text.primary }}>
                            {new Date(b.dueDate).toLocaleDateString("tr-TR")}
                          </td>
                          <td style={{ padding: spacing.sm }}>
                            <div style={{ display: "flex", gap: spacing.xs, flexWrap: "wrap" }}>
                              {(b.status === "draft" || b.status === "calculating") && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); calculateMutation.mutate(b.id); }}
                                  disabled={calculateMutation.isPending}
                                  style={{
                                    padding: `${spacing.xs} ${spacing.sm}`,
                                    fontSize: typography.fontSize.xs,
                                    backgroundColor: colors.primary,
                                    color: themeColors.white,
                                    border: "none",
                                    borderRadius: borderRadius.md,
                                    cursor: "pointer",
                                  }}
                                >
                                  Hesapla
                                </button>
                              )}
                              {b.status === "draft" && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ id: b.id, status: "calculated" }); }}
                                  disabled={updateStatusMutation.isPending}
                                  style={{
                                    padding: `${spacing.xs} ${spacing.sm}`,
                                    fontSize: typography.fontSize.xs,
                                    backgroundColor: `${colors.primary}15`,
                                    color: colors.primary,
                                    border: `1px solid ${colors.primary}40`,
                                    borderRadius: borderRadius.md,
                                    cursor: "pointer",
                                  }}
                                >
                                  Hesaplandi
                                </button>
                              )}
                              {(b.status === "calculated" || b.status === "reviewed") && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ id: b.id, status: "submitted" }); }}
                                  disabled={updateStatusMutation.isPending}
                                  style={{
                                    padding: `${spacing.xs} ${spacing.sm}`,
                                    fontSize: typography.fontSize.xs,
                                    backgroundColor: `${colors.success}15`,
                                    color: colors.success,
                                    border: `1px solid ${colors.success}40`,
                                    borderRadius: borderRadius.md,
                                    cursor: "pointer",
                                  }}
                                >
                                  Gonder
                                </button>
                              )}
                              {b.status === "submitted" && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ id: b.id, status: "accepted" }); }}
                                  disabled={updateStatusMutation.isPending}
                                  style={{
                                    padding: `${spacing.xs} ${spacing.sm}`,
                                    fontSize: typography.fontSize.xs,
                                    backgroundColor: `${colors.success}15`,
                                    color: colors.success,
                                    border: `1px solid ${colors.success}40`,
                                    borderRadius: borderRadius.md,
                                    cursor: "pointer",
                                  }}
                                >
                                  Onayla
                                </button>
                              )}
                              {(b.status === "calculated" || b.status === "submitted") && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ id: b.id, status: "revision_needed" }); }}
                                  disabled={updateStatusMutation.isPending}
                                  style={{
                                    padding: `${spacing.xs} ${spacing.sm}`,
                                    fontSize: typography.fontSize.xs,
                                    backgroundColor: `${colors.danger}15`,
                                    color: colors.danger,
                                    border: `1px solid ${colors.danger}40`,
                                    borderRadius: borderRadius.md,
                                    cursor: "pointer",
                                  }}
                                >
                                  Duzeltme
                                </button>
                              )}
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

          {/* Beyanname Detail Panel */}
          {selectedBeyannameId && (
            <Card variant="elevated" style={{ marginTop: spacing.lg }}>
              <div style={{ padding: spacing.lg }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg }}>
                  <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, margin: 0 }}>Beyanname Detayi</h3>
                  <button
                    onClick={() => setSelectedBeyannameId(null)}
                    style={{ padding: `${spacing.xs} ${spacing.sm}`, fontSize: typography.fontSize.sm, backgroundColor: themeColors.gray[100], color: themeColors.text.secondary, border: "none", borderRadius: borderRadius.md, cursor: "pointer" }}
                  >
                    Kapat
                  </button>
                </div>

                {beyannameDetailLoading ? (
                  <Skeleton height="200px" />
                ) : beyannameDetail ? (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: spacing.lg, marginBottom: spacing.lg }}>
                      <div>
                        <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted, textTransform: "uppercase", marginBottom: "2px" }}>Müşteri</div>
                        <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>{beyannameDetail.clientCompany?.name}</div>
                        {beyannameDetail.clientCompany?.taxNumber && (
                          <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted }}>VKN: {beyannameDetail.clientCompany.taxNumber}</div>
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted, textTransform: "uppercase", marginBottom: "2px" }}>Beyanname Turu</div>
                        <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>{TYPE_LABELS[beyannameDetail.type] || beyannameDetail.type}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted, textTransform: "uppercase", marginBottom: "2px" }}>Dönem</div>
                        <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>{beyannameDetail.period}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted, textTransform: "uppercase", marginBottom: "2px" }}>Durum</div>
                        <span style={{ padding: `2px ${spacing.sm}`, borderRadius: borderRadius.full, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, backgroundColor: `${STATUS_COLORS[beyannameDetail.status]}20`, color: STATUS_COLORS[beyannameDetail.status] }}>
                          {STATUS_LABELS[beyannameDetail.status] || beyannameDetail.status}
                        </span>
                      </div>
                      <div>
                        <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted, textTransform: "uppercase", marginBottom: "2px" }}>Son Tarih</div>
                        <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: new Date(beyannameDetail.dueDate) < new Date() ? colors.danger : themeColors.text.primary }}>
                          {new Date(beyannameDetail.dueDate).toLocaleDateString("tr-TR")}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted, textTransform: "uppercase", marginBottom: "2px" }}>Olusturulma</div>
                        <div style={{ fontSize: typography.fontSize.sm }}>{new Date(beyannameDetail.createdAt).toLocaleDateString("tr-TR")}</div>
                      </div>
                    </div>

                    {/* Financial Details */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: spacing.md, marginBottom: spacing.lg, padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: themeColors.gray[50] }}>
                      <div>
                        <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted, textTransform: "uppercase", marginBottom: "2px" }}>Hesaplanan Tutar</div>
                        <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold }}>
                          {beyannameDetail.calculatedAmount != null ? `${Number(beyannameDetail.calculatedAmount).toLocaleString("tr-TR")} TRY` : "-"}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted, textTransform: "uppercase", marginBottom: "2px" }}>Indirilecek</div>
                        <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold }}>
                          {beyannameDetail.deductibleAmount != null ? `${Number(beyannameDetail.deductibleAmount).toLocaleString("tr-TR")} TRY` : "-"}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted, textTransform: "uppercase", marginBottom: "2px" }}>Net Ödenecek</div>
                        <div style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.bold, color: colors.primary }}>
                          {beyannameDetail.netPayable != null ? `${Number(beyannameDetail.netPayable).toLocaleString("tr-TR")} TRY` : "-"}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted, textTransform: "uppercase", marginBottom: "2px" }}>Sonraki Doneme Devreden</div>
                        <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold }}>
                          {beyannameDetail.carryForward != null ? `${Number(beyannameDetail.carryForward).toLocaleString("tr-TR")} TRY` : "-"}
                        </div>
                      </div>
                    </div>

                    {/* Calculation Data */}
                    {beyannameDetail.calculationData && Object.keys(beyannameDetail.calculationData).length > 0 && (
                      <div style={{ marginBottom: spacing.lg }}>
                        <h4 style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, margin: `0 0 ${spacing.sm}` }}>Hesaplama Detaylari</h4>
                        <div style={{ padding: spacing.md, borderRadius: borderRadius.md, backgroundColor: themeColors.gray[50], fontSize: typography.fontSize.xs, fontFamily: "monospace", whiteSpace: "pre-wrap", overflowX: "auto" }}>
                          {JSON.stringify(beyannameDetail.calculationData, null, 2)}
                        </div>
                      </div>
                    )}

                    {/* Prepared By / Reviewed By */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.lg, marginBottom: spacing.lg }}>
                      {beyannameDetail.preparedBy && (
                        <div>
                          <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted, textTransform: "uppercase", marginBottom: "2px" }}>Hazirlayan</div>
                          <div style={{ fontSize: typography.fontSize.sm }}>{beyannameDetail.preparedBy.name} ({beyannameDetail.preparedBy.email})</div>
                        </div>
                      )}
                      {beyannameDetail.reviewedBy && (
                        <div>
                          <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted, textTransform: "uppercase", marginBottom: "2px" }}>Inceleyen</div>
                          <div style={{ fontSize: typography.fontSize.sm }}>{beyannameDetail.reviewedBy.name} ({beyannameDetail.reviewedBy.email})</div>
                        </div>
                      )}
                    </div>

                    {/* Existing Notes */}
                    {beyannameDetail.notes && (
                      <div style={{ marginBottom: spacing.lg, padding: spacing.sm, borderRadius: borderRadius.md, backgroundColor: themeColors.gray[50], fontSize: typography.fontSize.xs, color: themeColors.text.secondary }}>
                        <strong>Mevcut Not:</strong> {beyannameDetail.notes}
                      </div>
                    )}

                    {/* Status Update with Notes */}
                    <div style={{ borderTop: `1px solid ${themeColors.border}`, paddingTop: spacing.md }}>
                      <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.sm }}>Durum Guncelle</div>
                      <div style={{ display: "flex", gap: spacing.sm, alignItems: "flex-end", flexWrap: "wrap" }}>
                        <div style={{ flex: 1, minWidth: "200px" }}>
                          <label style={{ display: "block", fontSize: typography.fontSize.xs, color: themeColors.text.muted, marginBottom: "2px" }}>Not (istege bagli)</label>
                          <input
                            type="text"
                            value={statusNotes}
                            onChange={(e) => setStatusNotes(e.target.value)}
                            placeholder="Durum notu giriniz..."
                            style={{ width: "100%", padding: spacing.sm, borderRadius: borderRadius.md, border: `1px solid ${themeColors.border}`, fontSize: typography.fontSize.sm }}
                          />
                        </div>
                        {beyannameDetail.status === "draft" && (
                          <button
                            onClick={() => updateStatusMutation.mutate({ id: beyannameDetail.id, status: "calculated", notes: statusNotes || undefined })}
                            disabled={updateStatusMutation.isPending}
                            style={{ padding: `${spacing.sm} ${spacing.lg}`, fontSize: typography.fontSize.sm, backgroundColor: colors.primary, color: themeColors.white, border: "none", borderRadius: borderRadius.md, cursor: "pointer", whiteSpace: "nowrap" }}
                          >
                            Hesaplandi
                          </button>
                        )}
                        {beyannameDetail.status === "calculated" && (
                          <>
                            <button
                              onClick={() => updateStatusMutation.mutate({ id: beyannameDetail.id, status: "reviewed", notes: statusNotes || undefined })}
                              disabled={updateStatusMutation.isPending}
                              style={{ padding: `${spacing.sm} ${spacing.lg}`, fontSize: typography.fontSize.sm, backgroundColor: colors.warning, color: themeColors.white, border: "none", borderRadius: borderRadius.md, cursor: "pointer", whiteSpace: "nowrap" }}
                            >
                              Incelendi
                            </button>
                            <button
                              onClick={() => updateStatusMutation.mutate({ id: beyannameDetail.id, status: "submitted", notes: statusNotes || undefined })}
                              disabled={updateStatusMutation.isPending}
                              style={{ padding: `${spacing.sm} ${spacing.lg}`, fontSize: typography.fontSize.sm, backgroundColor: colors.success, color: themeColors.white, border: "none", borderRadius: borderRadius.md, cursor: "pointer", whiteSpace: "nowrap" }}
                            >
                              Gonder
                            </button>
                          </>
                        )}
                        {beyannameDetail.status === "reviewed" && (
                          <button
                            onClick={() => updateStatusMutation.mutate({ id: beyannameDetail.id, status: "submitted", notes: statusNotes || undefined })}
                            disabled={updateStatusMutation.isPending}
                            style={{ padding: `${spacing.sm} ${spacing.lg}`, fontSize: typography.fontSize.sm, backgroundColor: colors.success, color: themeColors.white, border: "none", borderRadius: borderRadius.md, cursor: "pointer", whiteSpace: "nowrap" }}
                          >
                            Gonder
                          </button>
                        )}
                        {beyannameDetail.status === "submitted" && (
                          <button
                            onClick={() => updateStatusMutation.mutate({ id: beyannameDetail.id, status: "accepted", notes: statusNotes || undefined })}
                            disabled={updateStatusMutation.isPending}
                            style={{ padding: `${spacing.sm} ${spacing.lg}`, fontSize: typography.fontSize.sm, backgroundColor: colors.success, color: themeColors.white, border: "none", borderRadius: borderRadius.md, cursor: "pointer", whiteSpace: "nowrap" }}
                          >
                            Onayla
                          </button>
                        )}
                        {(beyannameDetail.status === "calculated" || beyannameDetail.status === "submitted" || beyannameDetail.status === "reviewed") && (
                          <button
                            onClick={() => updateStatusMutation.mutate({ id: beyannameDetail.id, status: "revision_needed", notes: statusNotes || undefined })}
                            disabled={updateStatusMutation.isPending}
                            style={{ padding: `${spacing.sm} ${spacing.lg}`, fontSize: typography.fontSize.sm, backgroundColor: colors.danger, color: themeColors.white, border: "none", borderRadius: borderRadius.md, cursor: "pointer", whiteSpace: "nowrap" }}
                          >
                            Duzeltme Gerekli
                          </button>
                        )}
                        {beyannameDetail.status === "revision_needed" && (
                          <button
                            onClick={() => updateStatusMutation.mutate({ id: beyannameDetail.id, status: "draft", notes: statusNotes || undefined })}
                            disabled={updateStatusMutation.isPending}
                            style={{ padding: `${spacing.sm} ${spacing.lg}`, fontSize: typography.fontSize.sm, backgroundColor: colors.gray[500], color: themeColors.white, border: "none", borderRadius: borderRadius.md, cursor: "pointer", whiteSpace: "nowrap" }}
                          >
                            Taslaga Al
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <p style={{ color: themeColors.text.muted, fontSize: typography.fontSize.sm }}>Beyanname detayi yuklenemedi</p>
                )}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Create */}
      {activeTab === "create" && (
        <Card variant="elevated">
          <div style={{ padding: spacing.lg }}>
            <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, margin: `0 0 ${spacing.lg}` }}>Yeni Beyanname Oluştur</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.lg, marginBottom: spacing.xl }}>
              <div>
                <label style={{ display: "block", fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, marginBottom: spacing.xs }}>Müşteri</label>
                <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} style={{ width: "100%", padding: spacing.sm, borderRadius: borderRadius.md, border: `1px solid ${themeColors.border}`, fontSize: typography.fontSize.sm }}>
                  <option value="">Müşteri seçin...</option>
                  {clients.map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, marginBottom: spacing.xs }}>Beyanname Türü</label>
                <select value={beyannameType} onChange={(e) => setBeyannameType(e.target.value)} style={{ width: "100%", padding: spacing.sm, borderRadius: borderRadius.md, border: `1px solid ${themeColors.border}`, fontSize: typography.fontSize.sm }}>
                  {Object.entries(TYPE_LABELS).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, marginBottom: spacing.xs }}>Dönem</label>
                <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} style={{ width: "100%", padding: spacing.sm, borderRadius: borderRadius.md, border: `1px solid ${themeColors.border}`, fontSize: typography.fontSize.sm }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, marginBottom: spacing.xs }}>Son Tarih</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ width: "100%", padding: spacing.sm, borderRadius: borderRadius.md, border: `1px solid ${themeColors.border}`, fontSize: typography.fontSize.sm }} />
              </div>
            </div>
            <Button onClick={() => createMutation.mutate()} disabled={!selectedClientId || createMutation.isPending}>
              {createMutation.isPending ? "Oluşturuluyor..." : "Beyanname Oluştur"}
            </Button>
            {createMutation.isError && (
              <div style={{ marginTop: spacing.md, padding: spacing.md, borderRadius: borderRadius.md, backgroundColor: `${colors.danger}10`, color: colors.danger, fontSize: typography.fontSize.sm }}>
                {(createMutation.error as Error).message}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
