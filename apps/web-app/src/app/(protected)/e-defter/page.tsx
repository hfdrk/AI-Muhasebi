"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listClientCompanies, generateEDefter, submitEDefter, listEDefterLedgers } from "@repo/api-client";
import Link from "next/link";
import { toast } from "../../../lib/toast";
import { SkeletonTable } from "../../../components/ui/Skeleton";
import { Badge } from "../../../components/ui/Badge";
import { colors, spacing, borderRadius } from "../../../styles/design-system";

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
  const queryClient = useQueryClient();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [periodType, setPeriodType] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [generateModal, setGenerateModal] = useState(false);
  const [submitModal, setSubmitModal] = useState<{ open: boolean; ledgerId: string | null }>({ open: false, ledgerId: null });

  // Fetch client companies
  const { data: companiesData, isLoading: companiesLoading } = useQuery({
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
        <p style={{ color: colors.text.secondary }}>
          Elektronik defter oluşturun ve GIB'a gönderin. E-Defter, Türk Vergi Usul Kanunu'na göre zorunludur.
        </p>
      </div>

      {/* Generate Section */}
      <div style={{ marginBottom: "40px", padding: "24px", backgroundColor: colors.gray[50], borderRadius: borderRadius.md }}>
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
                border: `1px solid ${colors.border}`,
                borderRadius: "6px",
                fontSize: "14px",
                backgroundColor: "white",
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
                border: `1px solid ${colors.border}`,
                borderRadius: "6px",
                fontSize: "14px",
                backgroundColor: "white",
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
                border: `1px solid ${colors.border}`,
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
                border: `1px solid ${colors.border}`,
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
            <div style={{ padding: "40px", textAlign: "center", backgroundColor: colors.gray[50], borderRadius: borderRadius.md }}>
              <p style={{ color: colors.text.secondary, fontSize: "16px" }}>Henüz E-Defter oluşturulmamış.</p>
            </div>
          ) : (
            <div style={{ backgroundColor: "white", borderRadius: "8px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                    <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", color: "#374151" }}>Defter ID</th>
                    <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", color: "#374151" }}>Dönem</th>
                    <th style={{ padding: "12px", textAlign: "right", fontWeight: "600", color: "#374151" }}>Kayıt Sayısı</th>
                    <th style={{ padding: "12px", textAlign: "right", fontWeight: "600", color: "#374151" }}>Toplam Borç</th>
                    <th style={{ padding: "12px", textAlign: "right", fontWeight: "600", color: "#374151" }}>Toplam Alacak</th>
                    <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", color: "#374151" }}>Durum</th>
                    <th style={{ padding: "12px", textAlign: "center", fontWeight: "600", color: "#374151" }}>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgers.map((ledger) => (
                    <tr
                      key={ledger.ledgerId}
                      style={{
                        borderBottom: "1px solid #e5e7eb",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f9fafb";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "white";
                      }}
                    >
                      <td style={{ padding: "12px" }}>
                        <span style={{ fontFamily: "monospace", fontSize: "13px" }}>{ledger.ledgerId}</span>
                      </td>
                      <td style={{ padding: "12px" }}>
                        {new Date(ledger.period.startDate).toLocaleDateString("tr-TR")} -{" "}
                        {new Date(ledger.period.endDate).toLocaleDateString("tr-TR")}
                        <br />
                        <span style={{ fontSize: "12px", color: "#6b7280" }}>
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
                            onClick={() => handleSubmit(ledger.ledgerId)}
                            disabled={submitMutation.isPending}
                            style={{
                              padding: "6px 16px",
                              backgroundColor: "#10b981",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: submitMutation.isPending ? "not-allowed" : "pointer",
                              fontSize: "14px",
                              opacity: submitMutation.isPending ? 0.6 : 1,
                            }}
                          >
                            {submitMutation.isPending ? "Gönderiliyor..." : "GIB'a Gönder"}
                          </button>
                        ) : (
                          <span style={{ color: "#6b7280", fontSize: "14px" }}>
                            {ledger.submissionDate
                              ? `Gönderildi: ${new Date(ledger.submissionDate).toLocaleDateString("tr-TR")}`
                              : "Gönderildi"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!selectedCompanyId && (
        <div style={{ padding: "40px", textAlign: "center", backgroundColor: "#f9fafb", borderRadius: "8px" }}>
          <p style={{ color: "#6b7280", fontSize: "16px" }}>E-Defter oluşturmak için önce bir müşteri şirketi seçin.</p>
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

