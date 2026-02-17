"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listClientCompanies, generateEDefter, submitEDefter, listEDefterLedgers, getEDefterLedger } from "@repo/api-client";
import { toast } from "../../../lib/toast";
import { SkeletonTable } from "../../../components/ui/Skeleton";
import { Badge } from "../../../components/ui/Badge";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { PageTransition } from "../../../components/ui/PageTransition";
import { colors, spacing, borderRadius } from "../../../styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";

const PERIOD_TYPE_LABELS: Record<string, string> = {
  monthly: "Aylık",
  quarterly: "Üç Aylık",
  yearly: "Yıllık",
};

const SUBMISSION_STATUS_LABELS: Record<string, string> = {
  draft: "Taslak",
  submitted: "Gönderildi",
  accepted: "Kabul Edildi",
  rejected: "Reddedildi",
};

export default function EDefterPage() {
  const { themeColors } = useTheme();
  const queryClient = useQueryClient();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [periodType, setPeriodType] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [generateModal, setGenerateModal] = useState(false);
  const [submitModal, setSubmitModal] = useState<{ open: boolean; ledgerId: string | null }>({ open: false, ledgerId: null });
  const [expandedLedgerId, setExpandedLedgerId] = useState<string | null>(null);
  const [expandedLedgerDetail, setExpandedLedgerDetail] = useState<any>(null);
  const [ledgerDetailLoading, setLedgerDetailLoading] = useState(false);

  // Fetch client companies
  const { data: companiesData } = useQuery({
    queryKey: ["clientCompanies"],
    queryFn: () => listClientCompanies({ pageSize: 100, isActive: true }),
  });

  const companies = companiesData?.data.data || [];

  // Fetch ledgers for selected company
  const { data: ledgersData, isLoading: ledgersLoading } = useQuery({
    queryKey: ["e-defter-ledgers", selectedCompanyId],
    queryFn: () => listEDefterLedgers(selectedCompanyId),
    enabled: !!selectedCompanyId,
  });

  const ledgers = ledgersData?.data || [];

  const generateMutation = useMutation({
    mutationFn: () =>
      generateEDefter(selectedCompanyId, {
        startDate: periodStart,
        endDate: periodEnd,
        periodType,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["e-defter-ledgers", selectedCompanyId] });
      toast.success("E-Defter başarıyla oluşturuldu.");
      setPeriodStart("");
      setPeriodEnd("");
    },
    onError: (error: Error) => {
      console.error("E-Defter generation error:", error);
      toast.error(`Hata: ${error.message}`);
    },
  });

  const submitMutation = useMutation({
    mutationFn: (ledgerId: string) => submitEDefter(selectedCompanyId, ledgerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["e-defter-ledgers", selectedCompanyId] });
      toast.success("E-Defter başarıyla GIB'a gönderildi.");
    },
    onError: (error: Error) => {
      toast.error(`Hata: ${error.message}`);
    },
  });

  const handleGenerate = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    if (!selectedCompanyId) {
      toast.warning("Lütfen bir müşteri şirketi seçin.");
      return;
    }
    if (!periodStart || !periodEnd) {
      toast.warning("Lütfen dönem başlangıç ve bitiş tarihlerini seçin.");
      return;
    }
    if (new Date(periodStart) > new Date(periodEnd)) {
      toast.warning("Başlangıç tarihi bitiş tarihinden sonra olamaz.");
      return;
    }
    setGenerateModal(true);
  };

  const handleSubmit = (ledgerId: string) => {
    setSubmitModal({ open: true, ledgerId });
  };

  const handleToggleLedgerDetail = async (ledgerId: string) => {
    if (expandedLedgerId === ledgerId) {
      setExpandedLedgerId(null);
      setExpandedLedgerDetail(null);
      return;
    }
    setExpandedLedgerId(ledgerId);
    setLedgerDetailLoading(true);
    try {
      const result = await getEDefterLedger(selectedCompanyId, ledgerId);
      setExpandedLedgerDetail(result.data);
    } catch (error: any) {
      toast.error(`Defter detayi yuklenemedi: ${error.message}`);
      setExpandedLedgerId(null);
    } finally {
      setLedgerDetailLoading(false);
    }
  };

  // Set default dates based on period type
  const setDatesForPeriodType = (type: "monthly" | "quarterly" | "yearly") => {
    const today = new Date();
    let start = new Date();
    let end = new Date(today);

    if (type === "monthly") {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (type === "quarterly") {
      const quarter = Math.floor(today.getMonth() / 3);
      start = new Date(today.getFullYear(), quarter * 3, 1);
      end = new Date(today.getFullYear(), (quarter + 1) * 3, 0);
    } else {
      start = new Date(today.getFullYear(), 0, 1);
      end = new Date(today.getFullYear(), 11, 31);
    }

    setPeriodStart(start.toISOString().split("T")[0]);
    setPeriodEnd(end.toISOString().split("T")[0]);
  };

  const handlePeriodTypeChange = (type: "monthly" | "quarterly" | "yearly") => {
    setPeriodType(type);
    setDatesForPeriodType(type);
  };

  // Initialize dates on mount
  useEffect(() => {
    if (!periodStart || !periodEnd) {
      setDatesForPeriodType(periodType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PageTransition>
      <div style={{ padding: "40px", maxWidth: "1400px" }}>
      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "10px" }}>E-Defter Yönetimi</h1>
        <p style={{ color: themeColors.text.secondary }}>
          Elektronik defter oluşturun ve GIB'a gönderin. E-Defter, Türk Vergi Usul Kanunu'na göre zorunludur.
        </p>
      </div>

      {/* Generate Section */}
      <div style={{ marginBottom: "40px", padding: "24px", backgroundColor: themeColors.gray[50], borderRadius: borderRadius.md }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "20px" }}>E-Defter Oluştur</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px", marginBottom: "20px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
              Müşteri Şirketi *
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                border: `1px solid ${themeColors.border}`,
                borderRadius: "6px",
                fontSize: "14px",
                backgroundColor: themeColors.white,
              }}
            >
              <option value="">Müşteri seçin...</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name} ({company.taxNumber})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
              Dönem Tipi *
            </label>
            <select
              value={periodType}
              onChange={(e) => handlePeriodTypeChange(e.target.value as "monthly" | "quarterly" | "yearly")}
              style={{
                width: "100%",
                padding: "10px",
                border: `1px solid ${themeColors.border}`,
                borderRadius: "6px",
                fontSize: "14px",
                backgroundColor: themeColors.white,
              }}
            >
              <option value="monthly">Aylık</option>
              <option value="quarterly">Üç Aylık</option>
              <option value="yearly">Yıllık</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
              Başlangıç Tarihi *
            </label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                border: `1px solid ${themeColors.border}`,
                borderRadius: "6px",
                fontSize: "14px",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
              Bitiş Tarihi *
            </label>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                border: `1px solid ${themeColors.border}`,
                borderRadius: "6px",
                fontSize: "14px",
              }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generateMutation.isPending || !selectedCompanyId || !periodStart || !periodEnd}
          style={{
            padding: "12px 24px",
            backgroundColor: generateMutation.isPending || !selectedCompanyId || !periodStart || !periodEnd ? colors.gray[400] : colors.primaryLight,
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: generateMutation.isPending || !selectedCompanyId || !periodStart || !periodEnd ? "not-allowed" : "pointer",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          {generateMutation.isPending ? "Oluşturuluyor..." : "E-Defter Oluştur"}
        </button>
      </div>

      {/* Ledgers List */}
      {selectedCompanyId && (
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "20px" }}>Oluşturulan E-Defterler</h2>
          {ledgersLoading ? (
            <div style={{ padding: "40px", textAlign: "center" }}>
              <SkeletonTable rows={5} columns={4} />
            </div>
          ) : ledgers.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", backgroundColor: themeColors.gray[50], borderRadius: borderRadius.md }}>
              <p style={{ color: themeColors.text.secondary, fontSize: "16px" }}>Henüz E-Defter oluşturulmamış.</p>
            </div>
          ) : (
            <div style={{ backgroundColor: themeColors.white, borderRadius: "8px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: themeColors.gray[100], borderBottom: `2px solid ${themeColors.border}` }}>
                    <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", color: themeColors.text.primary }}>Defter ID</th>
                    <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", color: themeColors.text.primary }}>Dönem</th>
                    <th style={{ padding: "12px", textAlign: "right", fontWeight: "600", color: themeColors.text.primary }}>Kayıt Sayısı</th>
                    <th style={{ padding: "12px", textAlign: "right", fontWeight: "600", color: themeColors.text.primary }}>Toplam Borç</th>
                    <th style={{ padding: "12px", textAlign: "right", fontWeight: "600", color: themeColors.text.primary }}>Toplam Alacak</th>
                    <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", color: themeColors.text.primary }}>Durum</th>
                    <th style={{ padding: "12px", textAlign: "center", fontWeight: "600", color: themeColors.text.primary }}>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgers.map((ledger) => (
                    <React.Fragment key={ledger.ledgerId}>
                      <tr
                        style={{
                          borderBottom: expandedLedgerId === ledger.ledgerId ? "none" : `1px solid ${themeColors.border}`,
                          cursor: "pointer",
                        }}
                        onClick={() => handleToggleLedgerDetail(ledger.ledgerId)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = themeColors.gray[100];
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = expandedLedgerId === ledger.ledgerId ? colors.successPastel : themeColors.white;
                        }}
                      >
                        <td style={{ padding: "12px" }}>
                          <span style={{ fontFamily: "monospace", fontSize: "13px", color: colors.info }}>
                            {expandedLedgerId === ledger.ledgerId ? "[-]" : "[+]"}{" "}
                            {ledger.ledgerId}
                          </span>
                        </td>
                        <td style={{ padding: "12px" }}>
                          {new Date(ledger.period.startDate).toLocaleDateString("tr-TR")} -{" "}
                          {new Date(ledger.period.endDate).toLocaleDateString("tr-TR")}
                          <br />
                          <span style={{ fontSize: "12px", color: themeColors.text.secondary }}>
                            {PERIOD_TYPE_LABELS[ledger.period.periodType]}
                          </span>
                        </td>
                        <td style={{ padding: "12px", textAlign: "right" }}>{ledger.entryCount}</td>
                        <td style={{ padding: "12px", textAlign: "right" }}>
                          {new Intl.NumberFormat("tr-TR", {
                            style: "currency",
                            currency: "TRY",
                          }).format(ledger.totalDebit)}
                        </td>
                        <td style={{ padding: "12px", textAlign: "right" }}>
                          {new Intl.NumberFormat("tr-TR", {
                            style: "currency",
                            currency: "TRY",
                          }).format(ledger.totalCredit)}
                        </td>
                        <td style={{ padding: "12px" }}>
                          {ledger.submissionStatus ? (
                            <Badge
                              variant={
                                ledger.submissionStatus === "accepted"
                                  ? "success"
                                  : ledger.submissionStatus === "rejected"
                                  ? "danger"
                                  : ledger.submissionStatus === "submitted"
                                  ? "primary"
                                  : "warning"
                              }
                              size="sm"
                            >
                              {SUBMISSION_STATUS_LABELS[ledger.submissionStatus] || ledger.submissionStatus}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" size="sm">
                              Taslak
                            </Badge>
                          )}
                        </td>
                        <td style={{ padding: "12px", textAlign: "center" }}>
                          {ledger.submissionStatus !== "submitted" && ledger.submissionStatus !== "accepted" ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSubmit(ledger.ledgerId);
                              }}
                              disabled={submitMutation.isPending}
                              style={{
                                padding: "6px 16px",
                                backgroundColor: colors.success,
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                cursor: submitMutation.isPending ? "not-allowed" : "pointer",
                                fontSize: "14px",
                                opacity: submitMutation.isPending ? 0.6 : 1,
                              }}
                            >
                              {submitMutation.isPending ? "Gonderiliyor..." : "GIB'a Gonder"}
                            </button>
                          ) : (
                            <span style={{ color: themeColors.text.secondary, fontSize: "14px" }}>
                              {ledger.submissionDate
                                ? `Gonderildi: ${new Date(ledger.submissionDate).toLocaleDateString("tr-TR")}`
                                : "Gonderildi"}
                            </span>
                          )}
                        </td>
                      </tr>
                      {expandedLedgerId === ledger.ledgerId && (
                        <tr>
                          <td colSpan={7} style={{ padding: 0, borderBottom: `1px solid ${themeColors.border}` }}>
                            <div style={{
                              padding: "20px 24px",
                              backgroundColor: colors.successPastel,
                              borderTop: `1px solid ${colors.success}40`,
                            }}>
                              {ledgerDetailLoading ? (
                                <div style={{ textAlign: "center", padding: "20px", color: themeColors.text.secondary }}>
                                  Defter detaylari yukleniyor...
                                </div>
                              ) : expandedLedgerDetail ? (
                                <div>
                                  {/* Submission Details */}
                                  <h4 style={{ margin: "0 0 12px", fontSize: "16px", fontWeight: "600", color: colors.successDark }}>
                                    Defter Detaylari
                                  </h4>
                                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "20px" }}>
                                    <div>
                                      <div style={{ fontSize: "12px", color: themeColors.text.secondary, marginBottom: "4px" }}>Musteri Sirketi</div>
                                      <div style={{ fontSize: "14px", fontWeight: "500" }}>{expandedLedgerDetail.clientCompanyName || "-"}</div>
                                    </div>
                                    <div>
                                      <div style={{ fontSize: "12px", color: themeColors.text.secondary, marginBottom: "4px" }}>Olusturma Tarihi</div>
                                      <div style={{ fontSize: "14px", fontWeight: "500" }}>
                                        {expandedLedgerDetail.generationDate
                                          ? new Date(expandedLedgerDetail.generationDate).toLocaleDateString("tr-TR")
                                          : "-"}
                                      </div>
                                    </div>
                                    <div>
                                      <div style={{ fontSize: "12px", color: themeColors.text.secondary, marginBottom: "4px" }}>Gonderim Durumu</div>
                                      <div style={{ fontSize: "14px", fontWeight: "500" }}>
                                        {expandedLedgerDetail.submissionStatus
                                          ? SUBMISSION_STATUS_LABELS[expandedLedgerDetail.submissionStatus] || expandedLedgerDetail.submissionStatus
                                          : "Taslak"}
                                      </div>
                                    </div>
                                    <div>
                                      <div style={{ fontSize: "12px", color: themeColors.text.secondary, marginBottom: "4px" }}>Gonderim Tarihi</div>
                                      <div style={{ fontSize: "14px", fontWeight: "500" }}>
                                        {expandedLedgerDetail.submissionDate
                                          ? new Date(expandedLedgerDetail.submissionDate).toLocaleDateString("tr-TR")
                                          : "-"}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Validation Status */}
                                  <div style={{
                                    display: "flex",
                                    gap: "16px",
                                    marginBottom: "20px",
                                    padding: "12px 16px",
                                    backgroundColor: themeColors.white,
                                    borderRadius: "6px",
                                    border: `1px solid ${themeColors.border}`,
                                  }}>
                                    <div>
                                      <span style={{ fontSize: "12px", color: themeColors.text.secondary }}>Kayit Sayisi: </span>
                                      <span style={{ fontWeight: "600" }}>{expandedLedgerDetail.entryCount}</span>
                                    </div>
                                    <div>
                                      <span style={{ fontSize: "12px", color: themeColors.text.secondary }}>Toplam Borc: </span>
                                      <span style={{ fontWeight: "600" }}>
                                        {new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(expandedLedgerDetail.totalDebit)}
                                      </span>
                                    </div>
                                    <div>
                                      <span style={{ fontSize: "12px", color: themeColors.text.secondary }}>Toplam Alacak: </span>
                                      <span style={{ fontWeight: "600" }}>
                                        {new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(expandedLedgerDetail.totalCredit)}
                                      </span>
                                    </div>
                                    <div>
                                      <span style={{ fontSize: "12px", color: themeColors.text.secondary }}>Bakiye Dogrulama: </span>
                                      <span style={{
                                        fontWeight: "600",
                                        color: Math.abs(expandedLedgerDetail.totalDebit - expandedLedgerDetail.totalCredit) < 0.01 ? colors.success : colors.danger,
                                      }}>
                                        {Math.abs(expandedLedgerDetail.totalDebit - expandedLedgerDetail.totalCredit) < 0.01
                                          ? "Dengeli"
                                          : `Fark: ${new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(Math.abs(expandedLedgerDetail.totalDebit - expandedLedgerDetail.totalCredit))}`}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Entries Table */}
                                  {expandedLedgerDetail.entries && expandedLedgerDetail.entries.length > 0 && (
                                    <div>
                                      <h5 style={{ margin: "0 0 8px", fontSize: "14px", fontWeight: "600", color: themeColors.text.primary }}>
                                        Defter Kayitlari ({expandedLedgerDetail.entries.length})
                                      </h5>
                                      <div style={{ maxHeight: "300px", overflowY: "auto", borderRadius: "6px", border: `1px solid ${themeColors.border}` }}>
                                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                                          <thead>
                                            <tr style={{ backgroundColor: themeColors.gray[100], position: "sticky", top: 0 }}>
                                              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: "600", borderBottom: `1px solid ${themeColors.border}` }}>Tarih</th>
                                              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: "600", borderBottom: `1px solid ${themeColors.border}` }}>Hesap Kodu</th>
                                              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: "600", borderBottom: `1px solid ${themeColors.border}` }}>Hesap Adi</th>
                                              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: "600", borderBottom: `1px solid ${themeColors.border}` }}>Aciklama</th>
                                              <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: "600", borderBottom: `1px solid ${themeColors.border}` }}>Borc</th>
                                              <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: "600", borderBottom: `1px solid ${themeColors.border}` }}>Alacak</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {expandedLedgerDetail.entries.map((entry: any, idx: number) => (
                                              <tr key={idx} style={{ borderBottom: `1px solid ${themeColors.gray[100]}`, backgroundColor: idx % 2 === 0 ? themeColors.white : themeColors.gray[100] }}>
                                                <td style={{ padding: "6px 12px" }}>
                                                  {entry.date ? new Date(entry.date).toLocaleDateString("tr-TR") : "-"}
                                                </td>
                                                <td style={{ padding: "6px 12px", fontFamily: "monospace" }}>{entry.accountCode}</td>
                                                <td style={{ padding: "6px 12px" }}>{entry.accountName}</td>
                                                <td style={{ padding: "6px 12px", color: themeColors.text.secondary }}>{entry.description || "-"}</td>
                                                <td style={{ padding: "6px 12px", textAlign: "right" }}>
                                                  {entry.debitAmount > 0
                                                    ? new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(entry.debitAmount)
                                                    : "-"}
                                                </td>
                                                <td style={{ padding: "6px 12px", textAlign: "right" }}>
                                                  {entry.creditAmount > 0
                                                    ? new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(entry.creditAmount)
                                                    : "-"}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}
                                  {(!expandedLedgerDetail.entries || expandedLedgerDetail.entries.length === 0) && (
                                    <div style={{ padding: "16px", textAlign: "center", color: themeColors.text.secondary, backgroundColor: themeColors.white, borderRadius: "6px", border: `1px solid ${themeColors.border}` }}>
                                      Bu defterde henuz kayit bulunmamaktadir.
                                    </div>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!selectedCompanyId && (
        <div style={{ padding: "40px", textAlign: "center", backgroundColor: themeColors.gray[100], borderRadius: "8px" }}>
          <p style={{ color: themeColors.text.secondary, fontSize: "16px" }}>E-Defter oluşturmak için önce bir müşteri şirketi seçin.</p>
        </div>
      )}

      <Modal
        isOpen={generateModal}
        onClose={() => setGenerateModal(false)}
        title="E-Defter Oluştur"
        size="sm"
      >
        <div style={{ marginBottom: spacing.lg }}>
          <p>E-Defter oluşturmak istediğinize emin misiniz?</p>
        </div>
        <div style={{ display: "flex", gap: spacing.md, justifyContent: "flex-end" }}>
          <Button variant="outline" onClick={() => setGenerateModal(false)}>
            İptal
          </Button>
          <Button
            onClick={() => {
              generateMutation.mutate();
              setGenerateModal(false);
            }}
            loading={generateMutation.isPending}
          >
            Oluştur
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={submitModal.open}
        onClose={() => setSubmitModal({ open: false, ledgerId: null })}
        title="E-Defter'i GIB'a Gönder"
        size="sm"
      >
        <div style={{ marginBottom: spacing.lg }}>
          <p>Bu E-Defter'i GIB'a göndermek istediğinize emin misiniz?</p>
        </div>
        <div style={{ display: "flex", gap: spacing.md, justifyContent: "flex-end" }}>
          <Button variant="outline" onClick={() => setSubmitModal({ open: false, ledgerId: null })}>
            İptal
          </Button>
          <Button
            onClick={() => {
              if (submitModal.ledgerId) {
                submitMutation.mutate(submitModal.ledgerId);
                setSubmitModal({ open: false, ledgerId: null });
              }
            }}
            loading={submitMutation.isPending}
          >
            Gönder
          </Button>
        </div>
      </Modal>
    </div>
    </PageTransition>
  );
}

