"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { masakClient, listClientCompanies } from "@repo/api-client";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Skeleton } from "../../../components/ui/Skeleton";
import { Modal } from "../../../components/ui/Modal";
import { colors, spacing, borderRadius, typography, transitions } from "../../../styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";

const STATUS_LABELS: Record<string, string> = {
  draft: "Taslak",
  pending_review: "Inceleme Bekliyor",
  submitted: "Gonderildi",
  acknowledged: "Onaylandi",
  investigation: "Sorusturma",
  closed: "Kapatildi",
};

const SUSPICION_LABELS: Record<string, string> = {
  money_laundering: "Kara Para Aklama",
  terrorism_financing: "Terorun Finansmani",
  fraud: "Dolandiricilik",
  tax_evasion: "Vergi Kacakciligi",
  structuring: "Yapilandirma",
  other: "Diger",
};

// STATUS_COLORS moved inside component for theme support

/** Maps each status to which status(es) it can transition to */
const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ["pending_review"],
  pending_review: ["submitted"],
  submitted: ["acknowledged", "investigation"],
  acknowledged: ["closed"],
  investigation: ["closed"],
};

const REPORT_TYPE_LABELS: Record<string, string> = {
  sib: "SIB (Supheli Islem Bildirimi)",
  voluntary: "Gonullu Bildirim",
  periodic: "Periyodik Rapor",
};

// inputStyle and labelStyle moved inside component for theme support

interface CreateFormState {
  clientCompanyId: string;
  reportType: string;
  suspicionType: string;
  suspicionDetails: string;
  totalAmount: string;
  currency: string;
  counterpartyName: string;
  counterpartyTaxNo: string;
  riskScore: string;
  notes: string;
}

const emptyForm: CreateFormState = {
  clientCompanyId: "",
  reportType: "sib",
  suspicionType: "",
  suspicionDetails: "",
  totalAmount: "",
  currency: "TRY",
  counterpartyName: "",
  counterpartyTaxNo: "",
  riskScore: "",
  notes: "",
};

export default function MasakPage() {
  const { themeColors } = useTheme();
  const [activeTab, setActiveTab] = useState<"dashboard" | "reports" | "scan">("dashboard");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const queryClient = useQueryClient();

  const STATUS_COLORS: Record<string, string> = {
    draft: colors.gray[500],
    pending_review: colors.warning,
    submitted: colors.info,
    acknowledged: colors.success,
    investigation: colors.danger,
    closed: themeColors.text.muted,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    border: `1px solid ${themeColors.border}`,
    fontSize: typography.fontSize.sm,
    backgroundColor: themeColors.white,
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.xs,
    color: themeColors.text.primary,
  };

  // --- Modal / detail states ---
  const [detailReportId, setDetailReportId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(emptyForm);
  const [statusUpdateNotes, setStatusUpdateNotes] = useState<string>("");

  // --- Queries ---
  const { data: dashboardData, isLoading: dashLoading } = useQuery({
    queryKey: ["masak-dashboard"],
    queryFn: () => masakClient.getDashboard(),
  });

  const { data: clientsData } = useQuery({
    queryKey: ["client-companies"],
    queryFn: () => listClientCompanies({ pageSize: 100 }),
  });

  const { data: reportsData, isLoading: reportsLoading } = useQuery({
    queryKey: ["masak-reports"],
    queryFn: () => masakClient.listReports({ pageSize: 50 }),
  });

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ["masak-report", detailReportId],
    queryFn: () => masakClient.getReport(detailReportId!),
    enabled: !!detailReportId,
  });

  // --- Mutations ---
  const scanMutation = useMutation({
    mutationFn: (clientCompanyId: string) => masakClient.scanCompany(clientCompanyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["masak-dashboard"] }),
  });

  const createMutation = useMutation({
    mutationFn: (input: Parameters<typeof masakClient.createReport>[0]) =>
      masakClient.createReport(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masak-reports"] });
      queryClient.invalidateQueries({ queryKey: ["masak-dashboard"] });
      setCreateModalOpen(false);
      setCreateForm(emptyForm);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      masakClient.updateReportStatus(id, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masak-reports"] });
      queryClient.invalidateQueries({ queryKey: ["masak-dashboard"] });
      if (detailReportId) {
        queryClient.invalidateQueries({ queryKey: ["masak-report", detailReportId] });
      }
      setStatusUpdateNotes("");
    },
  });

  // --- Derived ---
  const dashboard = dashboardData?.data;
  const clients = clientsData?.data?.data || [];
  const reports = reportsData?.data?.reports || [];
  const detailReport = detailData?.data;

  // --- Handlers ---
  const handleCreateSubmit = () => {
    if (!createForm.clientCompanyId || !createForm.suspicionType || !createForm.suspicionDetails || !createForm.totalAmount) {
      return;
    }
    createMutation.mutate({
      clientCompanyId: createForm.clientCompanyId,
      reportType: createForm.reportType || undefined,
      suspicionType: createForm.suspicionType,
      suspicionDetails: createForm.suspicionDetails,
      totalAmount: parseFloat(createForm.totalAmount),
      currency: createForm.currency || undefined,
      counterpartyName: createForm.counterpartyName || undefined,
      counterpartyTaxNo: createForm.counterpartyTaxNo || undefined,
      riskScore: createForm.riskScore ? parseInt(createForm.riskScore, 10) : undefined,
      notes: createForm.notes || undefined,
    });
  };

  const handleStatusUpdate = (reportId: string, newStatus: string) => {
    statusMutation.mutate({ id: reportId, status: newStatus, notes: statusUpdateNotes || undefined });
  };

  const updateFormField = (field: keyof CreateFormState, value: string) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: spacing.xl }}>
        <h1 style={{ fontSize: typography.fontSize["2xl"], fontWeight: typography.fontWeight.bold, color: themeColors.text.primary, margin: 0 }}>
          MASAK Uyumluluk
        </h1>
        <p style={{ fontSize: typography.fontSize.sm, color: themeColors.text.secondary, margin: `${spacing.xs} 0 0` }}>
          Supheli Islem Bildirimi (SIB) yonetimi ve izleme
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: spacing.sm, marginBottom: spacing.xl, borderBottom: `2px solid ${themeColors.border}`, paddingBottom: spacing.sm }}>
        {[
          { key: "dashboard", label: "Pano" },
          { key: "reports", label: "Raporlar" },
          { key: "scan", label: "Tarama" },
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

      {/* ==================== Dashboard Tab ==================== */}
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
              {/* Stats Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: spacing.lg, marginBottom: spacing.xl }}>
                <Card variant="elevated">
                  <div style={{ padding: spacing.lg }}>
                    <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.secondary, textTransform: "uppercase", letterSpacing: "0.05em" }}>Toplam Rapor</div>
                    <div style={{ fontSize: typography.fontSize["3xl"], fontWeight: typography.fontWeight.bold, color: colors.primary, marginTop: spacing.xs }}>{dashboard.totalReports}</div>
                  </div>
                </Card>
                <Card variant="elevated">
                  <div style={{ padding: spacing.lg }}>
                    <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.secondary, textTransform: "uppercase", letterSpacing: "0.05em" }}>Bekleyen</div>
                    <div style={{ fontSize: typography.fontSize["3xl"], fontWeight: typography.fontWeight.bold, color: colors.warning, marginTop: spacing.xs }}>{dashboard.pendingReports}</div>
                  </div>
                </Card>
                <Card variant="elevated">
                  <div style={{ padding: spacing.lg }}>
                    <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.secondary, textTransform: "uppercase", letterSpacing: "0.05em" }}>Gonderildi</div>
                    <div style={{ fontSize: typography.fontSize["3xl"], fontWeight: typography.fontWeight.bold, color: colors.success, marginTop: spacing.xs }}>{dashboard.submittedReports}</div>
                  </div>
                </Card>
                <Card variant="elevated">
                  <div style={{ padding: spacing.lg }}>
                    <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.secondary, textTransform: "uppercase", letterSpacing: "0.05em" }}>Taslak</div>
                    <div style={{ fontSize: typography.fontSize["3xl"], fontWeight: typography.fontWeight.bold, color: colors.gray[600], marginTop: spacing.xs }}>{dashboard.draftReports}</div>
                  </div>
                </Card>
              </div>

              {/* Recent Reports & Deadlines */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.lg }}>
                <Card variant="elevated">
                  <div style={{ padding: spacing.lg }}>
                    <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, margin: `0 0 ${spacing.md}` }}>Son Raporlar</h3>
                    {dashboard.recentReports.length === 0 ? (
                      <p style={{ color: themeColors.text.muted, fontSize: typography.fontSize.sm }}>Henuz rapor bulunmuyor</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
                        {dashboard.recentReports.map((r: any) => (
                          <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: spacing.sm, borderRadius: borderRadius.md, backgroundColor: themeColors.gray[50] }}>
                            <div>
                              <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>{r.clientCompanyName}</div>
                              <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted }}>{SUSPICION_LABELS[r.suspicionType] || r.suspicionType}</div>
                            </div>
                            <span style={{ padding: `2px ${spacing.sm}`, borderRadius: borderRadius.full, backgroundColor: `${STATUS_COLORS[r.status]}20`, color: STATUS_COLORS[r.status], fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold }}>
                              {STATUS_LABELS[r.status] || r.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>

                <Card variant="elevated">
                  <div style={{ padding: spacing.lg }}>
                    <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, margin: `0 0 ${spacing.md}` }}>Yaklasan Sureler</h3>
                    {dashboard.upcomingDeadlines.length === 0 ? (
                      <p style={{ color: themeColors.text.muted, fontSize: typography.fontSize.sm }}>Yaklasan sure bulunmuyor</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
                        {dashboard.upcomingDeadlines.map((d: any) => (
                          <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: spacing.sm, borderRadius: borderRadius.md, backgroundColor: themeColors.gray[50] }}>
                            <div>
                              <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>{d.clientCompanyName}</div>
                              <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted }}>{SUSPICION_LABELS[d.suspicionType] || d.suspicionType}</div>
                            </div>
                            <span style={{ fontSize: typography.fontSize.xs, color: colors.danger, fontWeight: typography.fontWeight.semibold }}>
                              {new Date(d.deadline).toLocaleDateString("tr-TR")}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </>
          ) : null}
        </>
      )}

      {/* ==================== Reports Tab ==================== */}
      {activeTab === "reports" && (
        <Card variant="elevated">
          <div style={{ padding: spacing.lg }}>
            {/* Reports header with create button */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg }}>
              <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, margin: 0 }}>MASAK Raporlari</h3>
              <Button onClick={() => setCreateModalOpen(true)}>
                + Yeni Rapor
              </Button>
            </div>

            {reportsLoading ? (
              <Skeleton height="200px" />
            ) : reports.length === 0 ? (
              <div style={{ textAlign: "center", padding: spacing.xl }}>
                <p style={{ color: themeColors.text.muted, marginBottom: spacing.md }}>Henuz rapor olusturulmamis</p>
                <Button onClick={() => setCreateModalOpen(true)}>
                  Ilk Raporu Olustur
                </Button>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${themeColors.border}` }}>
                      {["Musteri", "Tur", "Durum", "Tutar", "Risk", "Son Tarih", "Olusturma", "Islemler"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: spacing.sm, fontSize: typography.fontSize.xs, color: themeColors.text.secondary, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r: any) => {
                      const nextStatuses = STATUS_TRANSITIONS[r.status] || [];
                      return (
                        <tr
                          key={r.id}
                          style={{
                            borderBottom: `1px solid ${themeColors.border}`,
                            cursor: "pointer",
                            transition: `background-color ${transitions.normal}`,
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = themeColors.gray[50]; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                        >
                          <td
                            style={{ padding: spacing.sm, fontSize: typography.fontSize.sm }}
                            onClick={() => setDetailReportId(r.id)}
                          >
                            {r.clientCompany?.name}
                          </td>
                          <td
                            style={{ padding: spacing.sm, fontSize: typography.fontSize.sm }}
                            onClick={() => setDetailReportId(r.id)}
                          >
                            {SUSPICION_LABELS[r.suspicionType] || r.suspicionType}
                          </td>
                          <td
                            style={{ padding: spacing.sm }}
                            onClick={() => setDetailReportId(r.id)}
                          >
                            <span style={{ padding: `2px ${spacing.sm}`, borderRadius: borderRadius.full, backgroundColor: `${STATUS_COLORS[r.status]}20`, color: STATUS_COLORS[r.status], fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold }}>
                              {STATUS_LABELS[r.status] || r.status}
                            </span>
                          </td>
                          <td
                            style={{ padding: spacing.sm, fontSize: typography.fontSize.sm }}
                            onClick={() => setDetailReportId(r.id)}
                          >
                            {Number(r.totalAmount).toLocaleString("tr-TR")} {r.currency}
                          </td>
                          <td
                            style={{ padding: spacing.sm, fontSize: typography.fontSize.sm }}
                            onClick={() => setDetailReportId(r.id)}
                          >
                            {r.riskScore ? `${r.riskScore}/100` : "-"}
                          </td>
                          <td
                            style={{ padding: spacing.sm, fontSize: typography.fontSize.sm, color: r.deadline ? colors.danger : themeColors.text.muted }}
                            onClick={() => setDetailReportId(r.id)}
                          >
                            {r.deadline ? new Date(r.deadline).toLocaleDateString("tr-TR") : "-"}
                          </td>
                          <td
                            style={{ padding: spacing.sm, fontSize: typography.fontSize.sm }}
                            onClick={() => setDetailReportId(r.id)}
                          >
                            {new Date(r.createdAt).toLocaleDateString("tr-TR")}
                          </td>
                          {/* Status transition buttons */}
                          <td style={{ padding: spacing.sm }}>
                            <div style={{ display: "flex", gap: spacing.xs, flexWrap: "wrap" }}>
                              {nextStatuses.map((nextStatus) => (
                                <Button
                                  key={nextStatus}
                                  size="sm"
                                  variant={nextStatus === "closed" ? "secondary" : nextStatus === "investigation" ? "danger" : "outline"}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusUpdate(r.id, nextStatus);
                                  }}
                                  loading={statusMutation.isPending && statusMutation.variables?.id === r.id && statusMutation.variables?.status === nextStatus}
                                  disabled={statusMutation.isPending}
                                >
                                  {STATUS_LABELS[nextStatus] || nextStatus}
                                </Button>
                              ))}
                              {nextStatuses.length === 0 && (
                                <span style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted, fontStyle: "italic" }}>
                                  Son durum
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ==================== Scan Tab ==================== */}
      {activeTab === "scan" && (
        <Card variant="elevated">
          <div style={{ padding: spacing.lg }}>
            <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, margin: `0 0 ${spacing.lg}` }}>Supheli Islem Taramasi</h3>
            <div style={{ display: "flex", gap: spacing.md, alignItems: "flex-end", marginBottom: spacing.xl }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Musteri Secin</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Musteri secin...</option>
                  {clients.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <Button
                onClick={() => selectedClientId && scanMutation.mutate(selectedClientId)}
                disabled={!selectedClientId || scanMutation.isPending}
              >
                {scanMutation.isPending ? "Taraniyor..." : "Taramayi Baslat"}
              </Button>
            </div>

            {scanMutation.data && (
              <div style={{ marginTop: spacing.lg }}>
                <div style={{
                  padding: spacing.lg,
                  borderRadius: borderRadius.lg,
                  backgroundColor: scanMutation.data.data.riskScore > 50 ? `${colors.danger}10` : `${colors.success}10`,
                  border: `1px solid ${scanMutation.data.data.riskScore > 50 ? colors.danger : colors.success}`,
                  marginBottom: spacing.lg,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold }}>{scanMutation.data.data.summary}</div>
                    <div style={{
                      fontSize: typography.fontSize["2xl"],
                      fontWeight: typography.fontWeight.bold,
                      color: scanMutation.data.data.riskScore > 50 ? colors.danger : colors.success,
                    }}>
                      {scanMutation.data.data.riskScore}/100
                    </div>
                  </div>
                </div>

                {scanMutation.data.data.suspiciousIndicators.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
                    {scanMutation.data.data.suspiciousIndicators.map((ind: any, i: number) => (
                      <div key={i} style={{
                        padding: spacing.md,
                        borderRadius: borderRadius.md,
                        border: `1px solid ${themeColors.border}`,
                        backgroundColor: themeColors.white,
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: spacing.xs }}>
                          <span style={{ fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.sm }}>{ind.type}</span>
                          <span style={{
                            padding: `2px ${spacing.sm}`,
                            borderRadius: borderRadius.full,
                            fontSize: typography.fontSize.xs,
                            fontWeight: typography.fontWeight.bold,
                            backgroundColor: ind.severity === "critical" ? `${colors.danger}20` : ind.severity === "high" ? `${colors.warning}20` : `${colors.info}20`,
                            color: ind.severity === "critical" ? colors.danger : ind.severity === "high" ? colors.warning : colors.info,
                          }}>
                            {ind.severity.toUpperCase()}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: typography.fontSize.sm, color: themeColors.text.secondary }}>{ind.description}</p>
                        {ind.amount && (
                          <div style={{ marginTop: spacing.xs, fontSize: typography.fontSize.xs, color: themeColors.text.muted }}>
                            Tutar: {ind.amount.toLocaleString("tr-TR")} TRY
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ==================== Report Detail Modal ==================== */}
      <Modal
        isOpen={!!detailReportId}
        onClose={() => setDetailReportId(null)}
        title="Rapor Detayi"
        size="lg"
      >
        {detailLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
            <Skeleton height="24px" />
            <Skeleton height="120px" />
            <Skeleton height="80px" />
          </div>
        ) : detailReport ? (
          <div style={{ display: "flex", flexDirection: "column", gap: spacing.lg }}>
            {/* Status badge and report type */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{
                padding: `${spacing.xs} ${spacing.md}`,
                borderRadius: borderRadius.full,
                backgroundColor: `${STATUS_COLORS[detailReport.status]}20`,
                color: STATUS_COLORS[detailReport.status],
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.semibold,
              }}>
                {STATUS_LABELS[detailReport.status] || detailReport.status}
              </span>
              <span style={{ fontSize: typography.fontSize.sm, color: themeColors.text.muted }}>
                {REPORT_TYPE_LABELS[detailReport.reportType] || detailReport.reportType}
              </span>
            </div>

            {/* Main info grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.md }}>
              <DetailField label="Musteri" value={detailReport.clientCompany?.name || "-"} />
              <DetailField label="Suphe Turu" value={SUSPICION_LABELS[detailReport.suspicionType] || detailReport.suspicionType} />
              <DetailField label="Toplam Tutar" value={`${Number(detailReport.totalAmount).toLocaleString("tr-TR")} ${detailReport.currency}`} />
              <DetailField label="Risk Puani" value={detailReport.riskScore ? `${detailReport.riskScore}/100` : "-"} />
              <DetailField label="Karsi Taraf" value={detailReport.counterpartyName || "-"} />
              <DetailField label="Karsi Taraf VKN" value={detailReport.counterpartyTaxNo || "-"} />
              <DetailField label="Olusturan" value={detailReport.createdBy?.name || "-"} />
              <DetailField label="Inceleyen" value={detailReport.reviewedBy?.name || "-"} />
              <DetailField label="Olusturma Tarihi" value={new Date(detailReport.createdAt).toLocaleDateString("tr-TR")} />
              <DetailField label="Tespit Tarihi" value={new Date(detailReport.detectedAt).toLocaleDateString("tr-TR")} />
              {detailReport.reportedAt && (
                <DetailField label="Bildirim Tarihi" value={new Date(detailReport.reportedAt).toLocaleDateString("tr-TR")} />
              )}
              {detailReport.deadline && (
                <DetailField label="Son Tarih" value={new Date(detailReport.deadline).toLocaleDateString("tr-TR")} highlight />
              )}
            </div>

            {/* Suspicion details */}
            <div>
              <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: themeColors.text.secondary, marginBottom: spacing.xs }}>Suphe Detaylari</div>
              <div style={{
                padding: spacing.md,
                borderRadius: borderRadius.md,
                backgroundColor: themeColors.gray[50],
                fontSize: typography.fontSize.sm,
                color: themeColors.text.primary,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}>
                {detailReport.suspicionDetails}
              </div>
            </div>

            {/* Notes */}
            {detailReport.notes && (
              <div>
                <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: themeColors.text.secondary, marginBottom: spacing.xs }}>Notlar</div>
                <div style={{
                  padding: spacing.md,
                  borderRadius: borderRadius.md,
                  backgroundColor: themeColors.gray[50],
                  fontSize: typography.fontSize.sm,
                  color: themeColors.text.primary,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}>
                  {detailReport.notes}
                </div>
              </div>
            )}

            {/* Risk Indicators */}
            {detailReport.riskIndicators && detailReport.riskIndicators.length > 0 && (
              <div>
                <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: themeColors.text.secondary, marginBottom: spacing.xs }}>Risk Gostergeleri</div>
                <div style={{ display: "flex", flexDirection: "column", gap: spacing.xs }}>
                  {detailReport.riskIndicators.map((indicator: any, idx: number) => (
                    <div key={idx} style={{
                      padding: spacing.sm,
                      borderRadius: borderRadius.md,
                      border: `1px solid ${themeColors.border}`,
                      fontSize: typography.fontSize.sm,
                    }}>
                      {typeof indicator === "string" ? indicator : JSON.stringify(indicator)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status transition actions inside detail modal */}
            {(STATUS_TRANSITIONS[detailReport.status] || []).length > 0 && (
              <div style={{
                padding: spacing.md,
                borderRadius: borderRadius.md,
                border: `1px solid ${themeColors.border}`,
                backgroundColor: themeColors.gray[50],
              }}>
                <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: themeColors.text.secondary, marginBottom: spacing.sm }}>Durum Guncelle</div>
                <div style={{ marginBottom: spacing.sm }}>
                  <label style={labelStyle}>Durum notu (istege bagli)</label>
                  <textarea
                    value={statusUpdateNotes}
                    onChange={(e) => setStatusUpdateNotes(e.target.value)}
                    placeholder="Durum degisikligi icin not ekleyin..."
                    rows={2}
                    style={{
                      ...inputStyle,
                      resize: "vertical",
                    }}
                  />
                </div>
                <div style={{ display: "flex", gap: spacing.sm, flexWrap: "wrap" }}>
                  {(STATUS_TRANSITIONS[detailReport.status] || []).map((nextStatus) => (
                    <Button
                      key={nextStatus}
                      size="sm"
                      variant={nextStatus === "closed" ? "secondary" : nextStatus === "investigation" ? "danger" : "primary"}
                      onClick={() => handleStatusUpdate(detailReport.id, nextStatus)}
                      loading={statusMutation.isPending && statusMutation.variables?.id === detailReport.id && statusMutation.variables?.status === nextStatus}
                      disabled={statusMutation.isPending}
                    >
                      {STATUS_LABELS[nextStatus] || nextStatus}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p style={{ color: themeColors.text.muted }}>Rapor bulunamadi.</p>
        )}
      </Modal>

      {/* ==================== Create Report Modal ==================== */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => { setCreateModalOpen(false); setCreateForm(emptyForm); }}
        title="Yeni MASAK Raporu Olustur"
        size="lg"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
          {/* Row 1: Client & Report Type */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.md }}>
            <div>
              <label style={labelStyle}>Musteri *</label>
              <select
                value={createForm.clientCompanyId}
                onChange={(e) => updateFormField("clientCompanyId", e.target.value)}
                style={inputStyle}
              >
                <option value="">Musteri secin...</option>
                {clients.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Rapor Turu</label>
              <select
                value={createForm.reportType}
                onChange={(e) => updateFormField("reportType", e.target.value)}
                style={inputStyle}
              >
                {Object.entries(REPORT_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Suspicion Type */}
          <div>
            <label style={labelStyle}>Suphe Turu *</label>
            <select
              value={createForm.suspicionType}
              onChange={(e) => updateFormField("suspicionType", e.target.value)}
              style={inputStyle}
            >
              <option value="">Suphe turu secin...</option>
              {Object.entries(SUSPICION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Row 3: Suspicion Details */}
          <div>
            <label style={labelStyle}>Suphe Detaylari *</label>
            <textarea
              value={createForm.suspicionDetails}
              onChange={(e) => updateFormField("suspicionDetails", e.target.value)}
              placeholder="Supheli islemin detaylarini aciklayiniz..."
              rows={4}
              style={{
                ...inputStyle,
                resize: "vertical",
              }}
            />
          </div>

          {/* Row 4: Amount & Currency */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: spacing.md }}>
            <div>
              <label style={labelStyle}>Toplam Tutar *</label>
              <input
                type="number"
                value={createForm.totalAmount}
                onChange={(e) => updateFormField("totalAmount", e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Para Birimi</label>
              <select
                value={createForm.currency}
                onChange={(e) => updateFormField("currency", e.target.value)}
                style={inputStyle}
              >
                <option value="TRY">TRY</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          {/* Row 5: Counterparty */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.md }}>
            <div>
              <label style={labelStyle}>Karsi Taraf Adi</label>
              <input
                type="text"
                value={createForm.counterpartyName}
                onChange={(e) => updateFormField("counterpartyName", e.target.value)}
                placeholder="Karsi tarafin adi..."
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Karsi Taraf VKN</label>
              <input
                type="text"
                value={createForm.counterpartyTaxNo}
                onChange={(e) => updateFormField("counterpartyTaxNo", e.target.value)}
                placeholder="Vergi kimlik numarasi..."
                style={inputStyle}
              />
            </div>
          </div>

          {/* Row 6: Risk Score */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.md }}>
            <div>
              <label style={labelStyle}>Risk Puani (0-100)</label>
              <input
                type="number"
                value={createForm.riskScore}
                onChange={(e) => updateFormField("riskScore", e.target.value)}
                placeholder="0"
                min="0"
                max="100"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Row 7: Notes */}
          <div>
            <label style={labelStyle}>Notlar</label>
            <textarea
              value={createForm.notes}
              onChange={(e) => updateFormField("notes", e.target.value)}
              placeholder="Ek notlar..."
              rows={3}
              style={{
                ...inputStyle,
                resize: "vertical",
              }}
            />
          </div>

          {/* Error display */}
          {createMutation.isError && (
            <div style={{
              padding: spacing.sm,
              borderRadius: borderRadius.md,
              backgroundColor: `${colors.danger}10`,
              border: `1px solid ${colors.danger}`,
              color: colors.danger,
              fontSize: typography.fontSize.sm,
            }}>
              Rapor olusturulurken hata olustu. Lutfen tekrar deneyin.
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: spacing.sm, paddingTop: spacing.md, borderTop: `1px solid ${themeColors.border}` }}>
            <Button
              variant="outline"
              onClick={() => { setCreateModalOpen(false); setCreateForm(emptyForm); }}
            >
              Iptal
            </Button>
            <Button
              onClick={handleCreateSubmit}
              loading={createMutation.isPending}
              disabled={!createForm.clientCompanyId || !createForm.suspicionType || !createForm.suspicionDetails || !createForm.totalAmount}
            >
              Raporu Olustur
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/** Small helper component for the detail modal fields */
function DetailField({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  const { themeColors } = useTheme();
  return (
    <div>
      <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.secondary, marginBottom: "2px" }}>{label}</div>
      <div style={{
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
        color: highlight ? colors.danger : themeColors.text.primary,
      }}>
        {value}
      </div>
    </div>
  );
}
