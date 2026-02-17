"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { kurganClient, listClientCompanies } from "@repo/api-client";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Skeleton } from "../../../components/ui/Skeleton";
import { colors, spacing, borderRadius, typography, transitions } from "../../../styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";

const SIGNAL_TYPE_LABELS: Record<string, string> = {
  fake_invoice: "Sahte Fatura",
  income_mismatch: "Gelir Uyumsuzluğu",
  stock_discrepancy: "Stok Uyumsuzluğu",
  vat_anomaly: "KDV Anomalisi",
  profit_loss_anomaly: "Kâr/Zarar Anomalisi",
  declaration_mismatch: "Beyanname Uyumsuzluğu",
  cross_company_pattern: "Döngüsel İşlem",
};

const SEVERITY_COLORS: Record<string, string> = {
  low: colors.info,
  medium: colors.warning,
  high: colors.warning,
  critical: colors.danger,
};

const STATUS_LABELS: Record<string, string> = {
  new: "Yeni",
  acknowledged: "Onaylandı",
  investigating: "İnceleniyor",
  resolved: "Çözüldü",
  false_positive: "Yanlış Alarm",
};

export default function KurganPage() {
  const { themeColors } = useTheme();
  const [activeTab, setActiveTab] = useState<"dashboard" | "signals" | "analyze">("dashboard");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [editingSignalId, setEditingSignalId] = useState<string | null>(null);
  const [signalNotes, setSignalNotes] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const { data: dashboardData, isLoading: dashLoading } = useQuery({
    queryKey: ["kurgan-dashboard"],
    queryFn: () => kurganClient.getDashboard(),
  });

  const { data: clientsData } = useQuery({
    queryKey: ["client-companies"],
    queryFn: () => listClientCompanies({ pageSize: 100 }),
  });

  const { data: signalsData, isLoading: signalsLoading } = useQuery({
    queryKey: ["kurgan-signals"],
    queryFn: () => kurganClient.listSignals({ pageSize: 50 }),
  });

  const analyzeMutation = useMutation({
    mutationFn: (clientCompanyId: string) => kurganClient.analyzeCompany(clientCompanyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kurgan-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["kurgan-signals"] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, responseNotes }: { id: string; status: string; responseNotes?: string }) =>
      kurganClient.updateSignalStatus(id, status, responseNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kurgan-signals"] });
      queryClient.invalidateQueries({ queryKey: ["kurgan-dashboard"] });
      setEditingSignalId(null);
      setSignalNotes("");
      showToast("Sinyal durumu guncellendi");
    },
    onError: (error: Error) => {
      showToast(`Hata: ${error.message}`);
    },
  });

  const dashboard = dashboardData?.data;
  const clients = clientsData?.data?.data || [];
  const signals = signalsData?.data?.signals || [];

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: "fixed", top: spacing.lg, right: spacing.lg, zIndex: 9999,
          padding: `${spacing.md} ${spacing.xl}`, borderRadius: borderRadius.lg,
          backgroundColor: toastMessage.startsWith("Hata") ? colors.danger : colors.success,
          color: colors.white, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}>
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: spacing.xl }}>
        <h1 style={{ fontSize: typography.fontSize["2xl"], fontWeight: typography.fontWeight.bold, color: themeColors.text.primary, margin: 0 }}>
          KURGAN Risk Monitör
        </h1>
        <p style={{ fontSize: typography.fontSize.sm, color: themeColors.text.secondary, margin: `${spacing.xs} 0 0` }}>
          Sahte fatura, kayıt dışı ekonomi ve vergi kaçakçılığı risk sinyalleri
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: spacing.sm, marginBottom: spacing.xl, borderBottom: `2px solid ${themeColors.border}`, paddingBottom: spacing.sm }}>
        {[
          { key: "dashboard", label: "Pano" },
          { key: "signals", label: "Sinyaller" },
          { key: "analyze", label: "Analiz" },
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
                    <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.secondary, textTransform: "uppercase" }}>Toplam Sinyal</div>
                    <div style={{ fontSize: typography.fontSize["3xl"], fontWeight: typography.fontWeight.bold, color: colors.primary, marginTop: spacing.xs }}>{dashboard.totalSignals}</div>
                  </div>
                </Card>
                <Card variant="elevated">
                  <div style={{ padding: spacing.lg }}>
                    <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.secondary, textTransform: "uppercase" }}>Yeni</div>
                    <div style={{ fontSize: typography.fontSize["3xl"], fontWeight: typography.fontWeight.bold, color: colors.warning, marginTop: spacing.xs }}>{dashboard.newSignals}</div>
                  </div>
                </Card>
                <Card variant="elevated">
                  <div style={{ padding: spacing.lg }}>
                    <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.secondary, textTransform: "uppercase" }}>İnceleniyor</div>
                    <div style={{ fontSize: typography.fontSize["3xl"], fontWeight: typography.fontWeight.bold, color: colors.info, marginTop: spacing.xs }}>{dashboard.investigatingSignals}</div>
                  </div>
                </Card>
                <Card variant="elevated">
                  <div style={{ padding: spacing.lg }}>
                    <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.secondary, textTransform: "uppercase" }}>Kritik</div>
                    <div style={{ fontSize: typography.fontSize["3xl"], fontWeight: typography.fontWeight.bold, color: colors.danger, marginTop: spacing.xs }}>{dashboard.criticalSignals}</div>
                  </div>
                </Card>
              </div>

              {/* Recent Signals */}
              <Card variant="elevated">
                <div style={{ padding: spacing.lg }}>
                  <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, margin: `0 0 ${spacing.md}` }}>Son Sinyaller</h3>
                  {dashboard.recentSignals.length === 0 ? (
                    <p style={{ color: themeColors.text.muted, fontSize: typography.fontSize.sm }}>Henüz sinyal bulunmuyor</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
                      {dashboard.recentSignals.map((s: any) => (
                        <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: spacing.sm, borderRadius: borderRadius.md, backgroundColor: themeColors.gray[50] }}>
                          <div>
                            <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>{s.title}</div>
                            <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted }}>{s.clientCompanyName} - {SIGNAL_TYPE_LABELS[s.signalType] || s.signalType}</div>
                          </div>
                          <div style={{ display: "flex", gap: spacing.sm, alignItems: "center" }}>
                            <span style={{ padding: `2px ${spacing.sm}`, borderRadius: borderRadius.full, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, backgroundColor: `${SEVERITY_COLORS[s.severity]}20`, color: SEVERITY_COLORS[s.severity] }}>
                              {s.severity.toUpperCase()}
                            </span>
                            <span style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted }}>{s.riskScore}/100</span>
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

      {/* Signals Tab */}
      {activeTab === "signals" && (
        <Card variant="elevated">
          <div style={{ padding: spacing.lg }}>
            <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, margin: `0 0 ${spacing.lg}` }}>KURGAN Sinyalleri</h3>
            {signalsLoading ? (
              <Skeleton height="200px" />
            ) : signals.length === 0 ? (
              <p style={{ color: themeColors.text.muted, textAlign: "center", padding: spacing.xl }}>Henüz sinyal bulunmuyor</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
                {signals.map((s: any) => (
                  <div key={s.id} style={{ padding: spacing.md, borderRadius: borderRadius.lg, border: `1px solid ${themeColors.border}`, backgroundColor: themeColors.white }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.sm }}>
                      <div>
                        <div style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold }}>{s.title}</div>
                        <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted, marginTop: "2px" }}>
                          {s.clientCompany?.name} | {SIGNAL_TYPE_LABELS[s.signalType] || s.signalType} | {s.dataSource}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: spacing.sm }}>
                        <span style={{ padding: `2px ${spacing.sm}`, borderRadius: borderRadius.full, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, backgroundColor: `${SEVERITY_COLORS[s.severity]}20`, color: SEVERITY_COLORS[s.severity] }}>
                          {s.severity.toUpperCase()}
                        </span>
                        <span style={{ padding: `2px ${spacing.sm}`, borderRadius: borderRadius.full, fontSize: typography.fontSize.xs, backgroundColor: themeColors.gray[100], color: themeColors.text.secondary }}>
                          {STATUS_LABELS[s.status] || s.status}
                        </span>
                      </div>
                    </div>
                    <p style={{ margin: 0, fontSize: typography.fontSize.sm, color: themeColors.text.secondary }}>{s.description}</p>
                    {s.recommendedAction && (
                      <div style={{ marginTop: spacing.sm, padding: spacing.sm, borderRadius: borderRadius.md, backgroundColor: `${colors.info}10`, fontSize: typography.fontSize.xs, color: colors.info }}>
                        Öneri: {s.recommendedAction}
                      </div>
                    )}
                    <div style={{ marginTop: spacing.sm, display: "flex", gap: spacing.md, fontSize: typography.fontSize.xs, color: themeColors.text.muted }}>
                      <span>Risk: {s.riskScore}/100</span>
                      {s.financialImpact && <span>Etki: {Number(s.financialImpact).toLocaleString("tr-TR")} TRY</span>}
                      {s.affectedPeriod && <span>Dönem: {s.affectedPeriod}</span>}
                    </div>
                    {s.responseNotes && (
                      <div style={{ marginTop: spacing.sm, padding: spacing.sm, borderRadius: borderRadius.md, backgroundColor: themeColors.gray[50], fontSize: typography.fontSize.xs, color: themeColors.text.secondary }}>
                        <strong>Not:</strong> {s.responseNotes}
                      </div>
                    )}

                    {/* Status Update Controls */}
                    <div style={{ marginTop: spacing.md, borderTop: `1px solid ${themeColors.border}`, paddingTop: spacing.md }}>
                      <div style={{ display: "flex", gap: spacing.xs, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted, marginRight: spacing.xs }}>Durumu Guncelle:</span>
                        {(["acknowledged", "investigating", "resolved", "false_positive"] as const).filter((st) => st !== s.status).map((newStatus) => (
                          <button
                            key={newStatus}
                            onClick={() => {
                              if (editingSignalId === s.id) {
                                updateStatusMutation.mutate({ id: s.id, status: newStatus, responseNotes: signalNotes || undefined });
                              } else {
                                setEditingSignalId(s.id);
                                setSignalNotes(s.responseNotes || "");
                                updateStatusMutation.mutate({ id: s.id, status: newStatus });
                              }
                            }}
                            disabled={updateStatusMutation.isPending}
                            style={{
                              padding: `${spacing.xs} ${spacing.sm}`,
                              fontSize: typography.fontSize.xs,
                              fontWeight: typography.fontWeight.medium,
                              backgroundColor: newStatus === "resolved" ? `${colors.success}15` : newStatus === "false_positive" ? `${themeColors.gray[200]}` : newStatus === "investigating" ? `${colors.info}15` : `${colors.primary}15`,
                              color: newStatus === "resolved" ? colors.success : newStatus === "false_positive" ? themeColors.text.secondary : newStatus === "investigating" ? colors.info : colors.primary,
                              border: `1px solid ${newStatus === "resolved" ? colors.success : newStatus === "false_positive" ? themeColors.gray[300] : newStatus === "investigating" ? colors.info : colors.primary}40`,
                              borderRadius: borderRadius.md,
                              cursor: "pointer",
                              transition: `all ${transitions.normal}`,
                            }}
                          >
                            {STATUS_LABELS[newStatus]}
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            if (editingSignalId === s.id) {
                              setEditingSignalId(null);
                              setSignalNotes("");
                            } else {
                              setEditingSignalId(s.id);
                              setSignalNotes(s.responseNotes || "");
                            }
                          }}
                          style={{
                            padding: `${spacing.xs} ${spacing.sm}`,
                            fontSize: typography.fontSize.xs,
                            backgroundColor: editingSignalId === s.id ? themeColors.gray[200] : "transparent",
                            color: themeColors.text.secondary,
                            border: `1px solid ${themeColors.border}`,
                            borderRadius: borderRadius.md,
                            cursor: "pointer",
                            marginLeft: spacing.xs,
                          }}
                        >
                          {editingSignalId === s.id ? "Notu Kapat" : "Not Ekle"}
                        </button>
                      </div>

                      {/* Notes input (expanded when editing) */}
                      {editingSignalId === s.id && (
                        <div style={{ marginTop: spacing.sm, display: "flex", gap: spacing.sm }}>
                          <textarea
                            value={signalNotes}
                            onChange={(e) => setSignalNotes(e.target.value)}
                            placeholder="Yanit notunuzu buraya yazin..."
                            rows={2}
                            style={{
                              flex: 1, padding: spacing.sm, borderRadius: borderRadius.md,
                              border: `1px solid ${themeColors.border}`, fontSize: typography.fontSize.sm,
                              fontFamily: "inherit", resize: "vertical",
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Analyze Tab */}
      {activeTab === "analyze" && (
        <Card variant="elevated">
          <div style={{ padding: spacing.lg }}>
            <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, margin: `0 0 ${spacing.lg}` }}>KURGAN Analizi</h3>
            <div style={{ display: "flex", gap: spacing.md, alignItems: "flex-end", marginBottom: spacing.xl }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, marginBottom: spacing.xs }}>Müşteri Seçin</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  style={{ width: "100%", padding: spacing.sm, borderRadius: borderRadius.md, border: `1px solid ${themeColors.border}`, fontSize: typography.fontSize.sm, backgroundColor: themeColors.white }}
                >
                  <option value="">Müşteri seçin...</option>
                  {clients.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <Button onClick={() => selectedClientId && analyzeMutation.mutate(selectedClientId)} disabled={!selectedClientId || analyzeMutation.isPending}>
                {analyzeMutation.isPending ? "Analiz ediliyor..." : "Analizi Başlat"}
              </Button>
            </div>

            {analyzeMutation.data && (
              <div style={{ padding: spacing.lg, borderRadius: borderRadius.lg, backgroundColor: themeColors.gray[50], border: `1px solid ${themeColors.border}` }}>
                <div style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.md }}>{analyzeMutation.data.data.summary}</div>
                {analyzeMutation.data.data.signals.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
                    {analyzeMutation.data.data.signals.map((s: any, i: number) => (
                      <div key={i} style={{ padding: spacing.md, borderRadius: borderRadius.md, backgroundColor: themeColors.white, border: `1px solid ${themeColors.border}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: spacing.xs }}>
                          <span style={{ fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.sm }}>{s.title}</span>
                          <span style={{ padding: `2px ${spacing.sm}`, borderRadius: borderRadius.full, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, backgroundColor: `${SEVERITY_COLORS[s.severity]}20`, color: SEVERITY_COLORS[s.severity] }}>
                            {s.severity.toUpperCase()}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: typography.fontSize.sm, color: themeColors.text.secondary }}>{s.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
