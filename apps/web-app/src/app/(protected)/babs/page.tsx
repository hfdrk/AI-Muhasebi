"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { babsClient, listClientCompanies } from "@repo/api-client";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Skeleton } from "../../../components/ui/Skeleton";
import { colors, spacing, borderRadius, typography, transitions } from "../../../styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";

const STATUS_LABELS: Record<string, string> = {
  draft: "Taslak",
  generated: "Oluşturuldu",
  verified: "Doğrulandı",
  submitted: "Gönderildi",
  accepted: "Kabul Edildi",
  rejected: "Reddedildi",
};

const STATUS_COLORS: Record<string, string> = {
  draft: colors.gray[500],
  generated: colors.info,
  verified: colors.primary,
  submitted: colors.warning,
  accepted: colors.success,
  rejected: colors.danger,
};

const CROSS_CHECK_LABELS: Record<string, string> = {
  pending: "Bekliyor",
  matched: "Eşleşti",
  mismatched: "Uyumsuz",
};

export default function BaBsPage() {
  const { themeColors } = useTheme();
  const [activeTab, setActiveTab] = useState<"dashboard" | "forms" | "generate">("dashboard");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [formType, setFormType] = useState<"BA" | "BS">("BA");
  const [period, setPeriod] = useState<string>(() => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [statusNotes, setStatusNotes] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const { data: dashboardData, isLoading: dashLoading } = useQuery({
    queryKey: ["babs-dashboard"],
    queryFn: () => babsClient.getDashboard(),
  });

  const { data: clientsData } = useQuery({
    queryKey: ["client-companies"],
    queryFn: () => listClientCompanies({ pageSize: 100 }),
  });

  const { data: formsData, isLoading: formsLoading } = useQuery({
    queryKey: ["babs-forms"],
    queryFn: () => babsClient.listForms({ pageSize: 50 }),
  });

  const generateMutation = useMutation({
    mutationFn: () => babsClient.generateForm({ clientCompanyId: selectedClientId, formType, period }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["babs-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["babs-forms"] });
      setActiveTab("forms");
    },
  });

  const crossCheckMutation = useMutation({
    mutationFn: (formId: string) => babsClient.crossCheck(formId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["babs-forms"] });
      queryClient.invalidateQueries({ queryKey: ["babs-dashboard"] });
    },
  });

  const { data: formDetailData, isLoading: formDetailLoading } = useQuery({
    queryKey: ["babs-form-detail", selectedFormId],
    queryFn: () => babsClient.getForm(selectedFormId!),
    enabled: !!selectedFormId,
  });

  const updateFormStatusMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      babsClient.updateFormStatus(id, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["babs-forms"] });
      queryClient.invalidateQueries({ queryKey: ["babs-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["babs-form-detail", selectedFormId] });
      setStatusNotes("");
      showToast("Form durumu guncellendi");
    },
    onError: (error: Error) => {
      showToast(`Hata: ${error.message}`);
    },
  });

  const formDetail = formDetailData?.data;
  const dashboard = dashboardData?.data;
  const clients = clientsData?.data?.data || [];
  const forms = formsData?.data?.forms || [];

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
          Ba-Bs Formları
        </h1>
        <p style={{ fontSize: typography.fontSize.sm, color: themeColors.text.secondary, margin: `${spacing.xs} 0 0` }}>
          Aylık alış (Ba) ve satış (Bs) bildirim formları
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: spacing.sm, marginBottom: spacing.xl, borderBottom: `2px solid ${themeColors.border}`, paddingBottom: spacing.sm }}>
        {[
          { key: "dashboard", label: "Pano" },
          { key: "forms", label: "Formlar" },
          { key: "generate", label: "Form Oluştur" },
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
                    <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.secondary, textTransform: "uppercase" }}>Toplam Form</div>
                    <div style={{ fontSize: typography.fontSize["3xl"], fontWeight: typography.fontWeight.bold, color: colors.primary, marginTop: spacing.xs }}>{dashboard.totalForms}</div>
                  </div>
                </Card>
                <Card variant="elevated">
                  <div style={{ padding: spacing.lg }}>
                    <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.secondary, textTransform: "uppercase" }}>Taslak</div>
                    <div style={{ fontSize: typography.fontSize["3xl"], fontWeight: typography.fontWeight.bold, color: colors.gray[600], marginTop: spacing.xs }}>{dashboard.draftForms}</div>
                  </div>
                </Card>
                <Card variant="elevated">
                  <div style={{ padding: spacing.lg }}>
                    <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.secondary, textTransform: "uppercase" }}>Gönderildi</div>
                    <div style={{ fontSize: typography.fontSize["3xl"], fontWeight: typography.fontWeight.bold, color: colors.success, marginTop: spacing.xs }}>{dashboard.submittedForms}</div>
                  </div>
                </Card>
                <Card variant="elevated">
                  <div style={{ padding: spacing.lg }}>
                    <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.secondary, textTransform: "uppercase" }}>Uyumsuz</div>
                    <div style={{ fontSize: typography.fontSize["3xl"], fontWeight: typography.fontWeight.bold, color: colors.danger, marginTop: spacing.xs }}>{dashboard.mismatchedForms}</div>
                  </div>
                </Card>
              </div>

              <Card variant="elevated">
                <div style={{ padding: spacing.lg }}>
                  <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, margin: `0 0 ${spacing.md}` }}>Son Formlar</h3>
                  {dashboard.recentForms.length === 0 ? (
                    <p style={{ color: themeColors.text.muted, fontSize: typography.fontSize.sm }}>Henüz form oluşturulmamış</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
                      {dashboard.recentForms.map((f: any) => (
                        <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: spacing.sm, borderRadius: borderRadius.md, backgroundColor: themeColors.gray[50] }}>
                          <div>
                            <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>{f.clientCompanyName}</div>
                            <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted }}>Form {f.formType} - {f.period} ({f.lineCount} satır)</div>
                          </div>
                          <div style={{ display: "flex", gap: spacing.sm, alignItems: "center" }}>
                            <span style={{ fontSize: typography.fontSize.xs, color: themeColors.text.secondary }}>{Number(f.totalAmount).toLocaleString("tr-TR")} TRY</span>
                            <span style={{ padding: `2px ${spacing.sm}`, borderRadius: borderRadius.full, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, backgroundColor: `${STATUS_COLORS[f.status]}20`, color: STATUS_COLORS[f.status] }}>
                              {STATUS_LABELS[f.status] || f.status}
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

      {/* Forms List */}
      {activeTab === "forms" && (
        <>
          <Card variant="elevated">
            <div style={{ padding: spacing.lg }}>
              <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, margin: `0 0 ${spacing.lg}` }}>Ba-Bs Form Listesi</h3>
              {formsLoading ? (
                <Skeleton height="200px" />
              ) : forms.length === 0 ? (
                <p style={{ color: themeColors.text.muted, textAlign: "center", padding: spacing.xl }}>Henüz form oluşturulmamış</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${themeColors.border}` }}>
                        {["Müşteri", "Tür", "Dönem", "Durum", "Tutar", "Satır", "Çapraz Kontrol", "İşlem"].map((h) => (
                          <th key={h} style={{ textAlign: "left", padding: spacing.sm, fontSize: typography.fontSize.xs, color: themeColors.text.secondary, textTransform: "uppercase" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {forms.map((f: any) => (
                        <tr
                          key={f.id}
                          onClick={() => setSelectedFormId(selectedFormId === f.id ? null : f.id)}
                          style={{
                            borderBottom: `1px solid ${themeColors.border}`,
                            cursor: "pointer",
                            backgroundColor: selectedFormId === f.id ? `${colors.primary}08` : "transparent",
                            transition: `background-color ${transitions.normal}`,
                          }}
                        >
                          <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm }}>{f.clientCompany?.name}</td>
                          <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>Form {f.formType}</td>
                          <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm }}>{f.period}</td>
                          <td style={{ padding: spacing.sm }}>
                            <span style={{ padding: `2px ${spacing.sm}`, borderRadius: borderRadius.full, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, backgroundColor: `${STATUS_COLORS[f.status]}20`, color: STATUS_COLORS[f.status] }}>
                              {STATUS_LABELS[f.status] || f.status}
                            </span>
                          </td>
                          <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm }}>{Number(f.totalAmount).toLocaleString("tr-TR")} TRY</td>
                          <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm }}>{f.lineCount}</td>
                          <td style={{ padding: spacing.sm }}>
                            {f.crossCheckStatus ? (
                              <span style={{
                                padding: `2px ${spacing.sm}`, borderRadius: borderRadius.full, fontSize: typography.fontSize.xs,
                                backgroundColor: f.crossCheckStatus === "matched" ? `${colors.success}20` : f.crossCheckStatus === "mismatched" ? `${colors.danger}20` : `${themeColors.gray[200]}`,
                                color: f.crossCheckStatus === "matched" ? colors.success : f.crossCheckStatus === "mismatched" ? colors.danger : themeColors.text.muted,
                              }}>
                                {CROSS_CHECK_LABELS[f.crossCheckStatus] || f.crossCheckStatus}
                              </span>
                            ) : "-"}
                          </td>
                          <td style={{ padding: spacing.sm }}>
                            <div style={{ display: "flex", gap: spacing.xs, flexWrap: "wrap" }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); crossCheckMutation.mutate(f.id); }}
                                disabled={crossCheckMutation.isPending}
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
                                Kontrol Et
                              </button>
                              {/* Status update buttons */}
                              {f.status === "draft" && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); updateFormStatusMutation.mutate({ id: f.id, status: "submitted" }); }}
                                  disabled={updateFormStatusMutation.isPending}
                                  style={{
                                    padding: `${spacing.xs} ${spacing.sm}`,
                                    fontSize: typography.fontSize.xs,
                                    backgroundColor: `${colors.warning}15`,
                                    color: colors.warning,
                                    border: `1px solid ${colors.warning}40`,
                                    borderRadius: borderRadius.md,
                                    cursor: "pointer",
                                  }}
                                >
                                  Gonder
                                </button>
                              )}
                              {f.status === "submitted" && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); updateFormStatusMutation.mutate({ id: f.id, status: "accepted" }); }}
                                  disabled={updateFormStatusMutation.isPending}
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
                              {(f.status === "submitted" || f.status === "generated" || f.status === "verified") && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); updateFormStatusMutation.mutate({ id: f.id, status: "rejected" }); }}
                                  disabled={updateFormStatusMutation.isPending}
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
                                  Reddet
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

          {/* Form Detail Panel */}
          {selectedFormId && (
            <Card variant="elevated" style={{ marginTop: spacing.lg }}>
              <div style={{ padding: spacing.lg }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg }}>
                  <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, margin: 0 }}>Form Detayi</h3>
                  <button
                    onClick={() => setSelectedFormId(null)}
                    style={{ padding: `${spacing.xs} ${spacing.sm}`, fontSize: typography.fontSize.sm, backgroundColor: themeColors.gray[100], color: themeColors.text.secondary, border: "none", borderRadius: borderRadius.md, cursor: "pointer" }}
                  >
                    Kapat
                  </button>
                </div>

                {formDetailLoading ? (
                  <Skeleton height="200px" />
                ) : formDetail ? (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: spacing.lg, marginBottom: spacing.lg }}>
                      <div>
                        <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted, textTransform: "uppercase", marginBottom: "2px" }}>Müşteri</div>
                        <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>{formDetail.clientCompany?.name}</div>
                        {formDetail.clientCompany?.taxNumber && (
                          <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted }}>VKN: {formDetail.clientCompany.taxNumber}</div>
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted, textTransform: "uppercase", marginBottom: "2px" }}>Form Tipi / Dönem</div>
                        <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>Form {formDetail.formType} - {formDetail.period}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted, textTransform: "uppercase", marginBottom: "2px" }}>Durum</div>
                        <span style={{ padding: `2px ${spacing.sm}`, borderRadius: borderRadius.full, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, backgroundColor: `${STATUS_COLORS[formDetail.status]}20`, color: STATUS_COLORS[formDetail.status] }}>
                          {STATUS_LABELS[formDetail.status] || formDetail.status}
                        </span>
                      </div>
                      <div>
                        <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted, textTransform: "uppercase", marginBottom: "2px" }}>Toplam Tutar</div>
                        <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold }}>{Number(formDetail.totalAmount).toLocaleString("tr-TR")} TRY</div>
                      </div>
                      <div>
                        <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted, textTransform: "uppercase", marginBottom: "2px" }}>Satir Sayisi</div>
                        <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>{formDetail.lineCount}</div>
                      </div>
                      {formDetail.generatedBy && (
                        <div>
                          <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted, textTransform: "uppercase", marginBottom: "2px" }}>Olusturan</div>
                          <div style={{ fontSize: typography.fontSize.sm }}>{formDetail.generatedBy.name}</div>
                        </div>
                      )}
                    </div>

                    {/* Form Lines */}
                    {formDetail.lines && formDetail.lines.length > 0 && (
                      <div style={{ marginBottom: spacing.lg }}>
                        <h4 style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, margin: `0 0 ${spacing.sm}` }}>Form Satirlari ({formDetail.lines.length})</h4>
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                              <tr style={{ borderBottom: `2px solid ${themeColors.border}` }}>
                                {["Karsi Taraf", "VKN", "Ulke", "Belge Sayisi", "Tutar", "Eslesti"].map((h) => (
                                  <th key={h} style={{ textAlign: "left", padding: spacing.xs, fontSize: typography.fontSize.xs, color: themeColors.text.secondary, textTransform: "uppercase" }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {formDetail.lines.map((line: any) => (
                                <tr key={line.id} style={{ borderBottom: `1px solid ${themeColors.border}` }}>
                                  <td style={{ padding: spacing.xs, fontSize: typography.fontSize.xs }}>{line.counterpartyName}</td>
                                  <td style={{ padding: spacing.xs, fontSize: typography.fontSize.xs }}>{line.counterpartyTaxNumber}</td>
                                  <td style={{ padding: spacing.xs, fontSize: typography.fontSize.xs }}>{line.counterpartyCountry}</td>
                                  <td style={{ padding: spacing.xs, fontSize: typography.fontSize.xs }}>{line.documentCount}</td>
                                  <td style={{ padding: spacing.xs, fontSize: typography.fontSize.xs }}>{Number(line.totalAmount).toLocaleString("tr-TR")} TRY</td>
                                  <td style={{ padding: spacing.xs }}>
                                    {line.crossCheckMatch != null ? (
                                      <span style={{ fontSize: typography.fontSize.xs, color: line.crossCheckMatch ? colors.success : colors.danger }}>
                                        {line.crossCheckMatch ? "Evet" : "Hayir"}
                                      </span>
                                    ) : "-"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Cross Check Errors */}
                    {formDetail.crossCheckErrors && formDetail.crossCheckErrors.length > 0 && (
                      <div style={{ marginBottom: spacing.lg, padding: spacing.md, borderRadius: borderRadius.md, backgroundColor: `${colors.danger}08`, border: `1px solid ${colors.danger}20` }}>
                        <h4 style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.danger, margin: `0 0 ${spacing.sm}` }}>
                          Capraz Kontrol Hatalari ({formDetail.crossCheckErrors.length})
                        </h4>
                        {formDetail.crossCheckErrors.map((err: any, i: number) => (
                          <div key={i} style={{ fontSize: typography.fontSize.xs, color: themeColors.text.secondary, padding: `${spacing.xs} 0` }}>
                            {typeof err === "string" ? err : JSON.stringify(err)}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Status Update with Notes */}
                    <div style={{ borderTop: `1px solid ${themeColors.border}`, paddingTop: spacing.md }}>
                      <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.sm }}>Durum Guncelle</div>
                      <div style={{ display: "flex", gap: spacing.sm, alignItems: "flex-end" }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: "block", fontSize: typography.fontSize.xs, color: themeColors.text.muted, marginBottom: "2px" }}>Not (istege bagli)</label>
                          <input
                            type="text"
                            value={statusNotes}
                            onChange={(e) => setStatusNotes(e.target.value)}
                            placeholder="Durum notu giriniz..."
                            style={{ width: "100%", padding: spacing.sm, borderRadius: borderRadius.md, border: `1px solid ${themeColors.border}`, fontSize: typography.fontSize.sm }}
                          />
                        </div>
                        {formDetail.status === "draft" && (
                          <button
                            onClick={() => updateFormStatusMutation.mutate({ id: formDetail.id, status: "submitted", notes: statusNotes || undefined })}
                            disabled={updateFormStatusMutation.isPending}
                            style={{ padding: `${spacing.sm} ${spacing.lg}`, fontSize: typography.fontSize.sm, backgroundColor: colors.warning, color: themeColors.white, border: "none", borderRadius: borderRadius.md, cursor: "pointer", whiteSpace: "nowrap" }}
                          >
                            Gonder
                          </button>
                        )}
                        {formDetail.status === "submitted" && (
                          <>
                            <button
                              onClick={() => updateFormStatusMutation.mutate({ id: formDetail.id, status: "accepted", notes: statusNotes || undefined })}
                              disabled={updateFormStatusMutation.isPending}
                              style={{ padding: `${spacing.sm} ${spacing.lg}`, fontSize: typography.fontSize.sm, backgroundColor: colors.success, color: themeColors.white, border: "none", borderRadius: borderRadius.md, cursor: "pointer", whiteSpace: "nowrap" }}
                            >
                              Onayla
                            </button>
                            <button
                              onClick={() => updateFormStatusMutation.mutate({ id: formDetail.id, status: "rejected", notes: statusNotes || undefined })}
                              disabled={updateFormStatusMutation.isPending}
                              style={{ padding: `${spacing.sm} ${spacing.lg}`, fontSize: typography.fontSize.sm, backgroundColor: colors.danger, color: themeColors.white, border: "none", borderRadius: borderRadius.md, cursor: "pointer", whiteSpace: "nowrap" }}
                            >
                              Reddet
                            </button>
                          </>
                        )}
                        {formDetail.status === "generated" && (
                          <button
                            onClick={() => updateFormStatusMutation.mutate({ id: formDetail.id, status: "verified", notes: statusNotes || undefined })}
                            disabled={updateFormStatusMutation.isPending}
                            style={{ padding: `${spacing.sm} ${spacing.lg}`, fontSize: typography.fontSize.sm, backgroundColor: colors.primary, color: themeColors.white, border: "none", borderRadius: borderRadius.md, cursor: "pointer", whiteSpace: "nowrap" }}
                          >
                            Dogrula
                          </button>
                        )}
                        {formDetail.status === "verified" && (
                          <button
                            onClick={() => updateFormStatusMutation.mutate({ id: formDetail.id, status: "submitted", notes: statusNotes || undefined })}
                            disabled={updateFormStatusMutation.isPending}
                            style={{ padding: `${spacing.sm} ${spacing.lg}`, fontSize: typography.fontSize.sm, backgroundColor: colors.warning, color: themeColors.white, border: "none", borderRadius: borderRadius.md, cursor: "pointer", whiteSpace: "nowrap" }}
                          >
                            Gonder
                          </button>
                        )}
                      </div>
                      {formDetail.notes && (
                        <div style={{ marginTop: spacing.sm, padding: spacing.sm, borderRadius: borderRadius.md, backgroundColor: themeColors.gray[50], fontSize: typography.fontSize.xs, color: themeColors.text.secondary }}>
                          <strong>Mevcut Not:</strong> {formDetail.notes}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <p style={{ color: themeColors.text.muted, fontSize: typography.fontSize.sm }}>Form detayi yuklenemedi</p>
                )}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Generate Form */}
      {activeTab === "generate" && (
        <Card variant="elevated">
          <div style={{ padding: spacing.lg }}>
            <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, margin: `0 0 ${spacing.lg}` }}>Form Oluştur</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: spacing.lg, marginBottom: spacing.xl }}>
              <div>
                <label style={{ display: "block", fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, marginBottom: spacing.xs }}>Müşteri</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  style={{ width: "100%", padding: spacing.sm, borderRadius: borderRadius.md, border: `1px solid ${themeColors.border}`, fontSize: typography.fontSize.sm }}
                >
                  <option value="">Müşteri seçin...</option>
                  {clients.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, marginBottom: spacing.xs }}>Form Tipi</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as "BA" | "BS")}
                  style={{ width: "100%", padding: spacing.sm, borderRadius: borderRadius.md, border: `1px solid ${themeColors.border}`, fontSize: typography.fontSize.sm }}
                >
                  <option value="BA">BA - Alışlar</option>
                  <option value="BS">BS - Satışlar</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, marginBottom: spacing.xs }}>Dönem</label>
                <input
                  type="month"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  style={{ width: "100%", padding: spacing.sm, borderRadius: borderRadius.md, border: `1px solid ${themeColors.border}`, fontSize: typography.fontSize.sm }}
                />
              </div>
            </div>
            <Button onClick={() => generateMutation.mutate()} disabled={!selectedClientId || generateMutation.isPending}>
              {generateMutation.isPending ? "Oluşturuluyor..." : "Form Oluştur"}
            </Button>

            {generateMutation.isError && (
              <div style={{ marginTop: spacing.md, padding: spacing.md, borderRadius: borderRadius.md, backgroundColor: `${colors.danger}10`, color: colors.danger, fontSize: typography.fontSize.sm }}>
                {(generateMutation.error as Error).message}
              </div>
            )}

            {generateMutation.isSuccess && (
              <div style={{ marginTop: spacing.md, padding: spacing.md, borderRadius: borderRadius.md, backgroundColor: `${colors.success}10`, color: colors.success, fontSize: typography.fontSize.sm }}>
                Form başarıyla oluşturuldu!
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
