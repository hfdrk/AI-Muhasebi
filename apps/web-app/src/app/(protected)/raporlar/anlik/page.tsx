"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  generateReport,
  downloadReport,
  listClientCompanies,
  type BaseReportResult,
  type GenerateReportParams,
} from "@repo/api-client";
import { requiresClientCompany, formatReportDate } from "../../../../lib/reports";
import { colors, spacing, borderRadius } from "../../../../styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";
import Link from "next/link";

const REPORT_TYPES = [
  { code: "COMPANY_FINANCIAL_SUMMARY", label: "Müşteri Finansal Özeti" },
  { code: "COMPANY_RISK_SUMMARY", label: "Müşteri Risk Özeti" },
  { code: "TENANT_PORTFOLIO", label: "Portföy Özeti" },
  { code: "DOCUMENT_ACTIVITY", label: "Belge ve Fatura Aktivitesi" },
  { code: "AUDIT_PREPARATION", label: "Denetim Hazırlık Raporu" },
] as const;

export default function OnDemandReportsPage() {
  const { themeColors } = useTheme();
  const [selectedReportType, setSelectedReportType] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [selectedClientCompanyId, setSelectedClientCompanyId] = useState<string>("");
  const [reportResult, setReportResult] = useState<BaseReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<{ pdf: boolean; excel: boolean }>({
    pdf: false,
    excel: false,
  });

  // Clear results when filters change
  useEffect(() => {
    setReportResult(null);
    setError(null);
  }, [selectedReportType, startDate, endDate, selectedClientCompanyId]);

  const { data: clientsData } = useQuery({
    queryKey: ["clientCompanies"],
    queryFn: () => listClientCompanies({ pageSize: 100 }),
  });

  const generateReportMutation = useMutation({
    mutationFn: (params: GenerateReportParams) => generateReport(params),
    onSuccess: (data) => {
      setReportResult(data.data);
      setError(null);
    },
    onError: (err: any) => {
      // Extract error message from API response if available
      const errorMessage =
        err?.response?.data?.error?.message ||
        err?.message ||
        "Rapor oluşturulurken bir hata oluştu.";
      setError(errorMessage);
      setReportResult(null);
    },
  });

  const handleGenerateReport = () => {
    if (!selectedReportType) {
      setError("Lütfen bir rapor türü seçin.");
      return;
    }

    if (!startDate || !endDate) {
      setError("Lütfen tarih aralığını seçin.");
      return;
    }

    if (requiresClientCompany(selectedReportType) && !selectedClientCompanyId) {
      setError("Bu rapor türü için müşteri şirketi seçilmelidir.");
      return;
    }

    const params: GenerateReportParams = {
      report_code: selectedReportType,
      client_company_id: requiresClientCompany(selectedReportType) ? selectedClientCompanyId : null,
      filters: {
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate + "T23:59:59").toISOString(),
      },
    };

    generateReportMutation.mutate(params);
  };

  const handleDownload = async (format: "pdf" | "excel") => {
    if (!selectedReportType) {
      setError("Lütfen bir rapor türü seçin.");
      return;
    }

    if (!startDate || !endDate) {
      setError("Lütfen tarih aralığını seçin.");
      return;
    }

    if (requiresClientCompany(selectedReportType) && !selectedClientCompanyId) {
      setError("Bu rapor türü için müşteri şirketi seçilmelidir.");
      return;
    }

    setIsDownloading((prev) => ({ ...prev, [format]: true }));
    setError(null);

    try {
      const blob = await downloadReport({
        report_code: selectedReportType,
        client_company_id: requiresClientCompany(selectedReportType) ? selectedClientCompanyId : null,
        filters: {
          start_date: new Date(startDate).toISOString(),
          end_date: new Date(endDate + "T23:59:59").toISOString(),
        },
        format,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
      a.download = `report_${selectedReportType.toLowerCase()}_${dateStr}.${format === "pdf" ? "pdf" : "csv"}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      // Safely remove the element if it's still in the DOM
      if (a.parentNode) {
        a.parentNode.removeChild(a);
      }
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.error?.message ||
        err?.message ||
        "Rapor indirilirken bir hata oluştu.";
      setError(errorMessage);
    } finally {
      setIsDownloading((prev) => ({ ...prev, [format]: false }));
    }
  };

  const clients = clientsData?.data.data || [];

  return (
    <div style={{ padding: spacing.xxl }}>
      <div style={{ marginBottom: spacing.xl }}>
        <Link
          href="/raporlar"
          style={{
            textDecoration: "none",
            color: colors.primary,
            fontSize: "14px",
            marginBottom: spacing.md,
            display: "inline-block",
          }}
        >
          ← Raporlara Dön
        </Link>
        <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: spacing.sm, color: themeColors.text.primary }}>
          Anlık Raporlar
        </h1>
        <p style={{ color: themeColors.text.secondary, fontSize: "16px" }}>
          İstediğiniz zaman rapor oluşturun ve görüntüleyin veya indirin.
        </p>
      </div>

      <div
        style={{
          backgroundColor: themeColors.white,
          padding: spacing.xl,
          borderRadius: "8px",
          border: `1px solid ${themeColors.border}`,
          marginBottom: spacing.xl,
        }}
      >
        <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: spacing.lg }}>Filtreler</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: spacing.lg }}>
          <div>
            <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: 500, fontSize: "14px" }}>
              Rapor Türü *
            </label>
            <select
              value={selectedReportType}
              onChange={(e) => {
                setSelectedReportType(e.target.value);
                if (!requiresClientCompany(e.target.value)) {
                  setSelectedClientCompanyId("");
                }
              }}
              style={{
                width: "100%",
                padding: spacing.sm,
                border: `1px solid ${themeColors.border}`,
                borderRadius: "4px",
                fontSize: "14px",
              }}
            >
              <option value="">Rapor türü seçin</option>
              {REPORT_TYPES.map((type) => (
                <option key={type.code} value={type.code}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {requiresClientCompany(selectedReportType) && (
            <div>
              <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: 500, fontSize: "14px" }}>
                Müşteri Şirket *
              </label>
              <select
                value={selectedClientCompanyId}
                onChange={(e) => setSelectedClientCompanyId(e.target.value)}
                style={{
                  width: "100%",
                  padding: spacing.sm,
                  border: `1px solid ${themeColors.border}`,
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              >
                <option value="">Müşteri şirketi seçin</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.md }}>
            <div>
              <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: 500, fontSize: "14px" }}>
                Başlangıç Tarihi *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: spacing.sm,
                  border: `1px solid ${themeColors.border}`,
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: 500, fontSize: "14px" }}>
                Bitiş Tarihi *
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: spacing.sm,
                  border: `1px solid ${themeColors.border}`,
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: spacing.md, marginTop: spacing.xl }}>
          <button
            onClick={handleGenerateReport}
            disabled={generateReportMutation.isPending || isDownloading.pdf || isDownloading.excel}
            style={{
              padding: `${spacing.sm} ${spacing.lg}`,
              backgroundColor: colors.primary,
              color: colors.white,
              border: "none",
              borderRadius: "4px",
              fontSize: "14px",
              fontWeight: 500,
              cursor:
                generateReportMutation.isPending || isDownloading.pdf || isDownloading.excel
                  ? "not-allowed"
                  : "pointer",
              opacity:
                generateReportMutation.isPending || isDownloading.pdf || isDownloading.excel ? 0.6 : 1,
            }}
          >
            {generateReportMutation.isPending ? "Rapor oluşturuluyor, lütfen bekleyin…" : "Raporu Görüntüle"}
          </button>
          <button
            onClick={() => handleDownload("pdf")}
            disabled={
              !selectedReportType ||
              !startDate ||
              !endDate ||
              generateReportMutation.isPending ||
              isDownloading.pdf ||
              isDownloading.excel
            }
            style={{
              padding: `${spacing.sm} ${spacing.lg}`,
              backgroundColor: themeColors.white,
              color: colors.primary,
              border: `1px solid ${colors.primary}`,
              borderRadius: "4px",
              fontSize: "14px",
              fontWeight: 500,
              cursor:
                !selectedReportType ||
                !startDate ||
                !endDate ||
                generateReportMutation.isPending ||
                isDownloading.pdf ||
                isDownloading.excel
                  ? "not-allowed"
                  : "pointer",
              opacity:
                !selectedReportType ||
                !startDate ||
                !endDate ||
                generateReportMutation.isPending ||
                isDownloading.pdf ||
                isDownloading.excel
                  ? 0.5
                  : 1,
            }}
          >
            {isDownloading.pdf ? "Rapor oluşturuluyor, lütfen bekleyin…" : "PDF Olarak İndir"}
          </button>
          <button
            onClick={() => handleDownload("excel")}
            disabled={
              !selectedReportType ||
              !startDate ||
              !endDate ||
              generateReportMutation.isPending ||
              isDownloading.pdf ||
              isDownloading.excel
            }
            style={{
              padding: `${spacing.sm} ${spacing.lg}`,
              backgroundColor: themeColors.white,
              color: colors.primary,
              border: `1px solid ${colors.primary}`,
              borderRadius: "4px",
              fontSize: "14px",
              fontWeight: 500,
              cursor:
                !selectedReportType ||
                !startDate ||
                !endDate ||
                generateReportMutation.isPending ||
                isDownloading.pdf ||
                isDownloading.excel
                  ? "not-allowed"
                  : "pointer",
              opacity:
                !selectedReportType ||
                !startDate ||
                !endDate ||
                generateReportMutation.isPending ||
                isDownloading.pdf ||
                isDownloading.excel
                  ? 0.5
                  : 1,
            }}
          >
            {isDownloading.excel ? "Rapor oluşturuluyor, lütfen bekleyin…" : "Excel Olarak İndir"}
          </button>
        </div>

        {(error || generateReportMutation.isError) && (
          <div
            style={{
              marginTop: spacing.md,
              padding: spacing.md,
              backgroundColor: colors.dangerLight,
              color: colors.danger,
              borderRadius: "4px",
              fontSize: "14px",
              border: `1px solid ${colors.danger}`,
            }}
          >
            {error || "Rapor oluşturulurken bir hata oluştu."}
          </div>
        )}
      </div>

      {generateReportMutation.isPending && (
        <div
          style={{
            backgroundColor: themeColors.white,
            padding: spacing.xl,
            borderRadius: "8px",
            border: `1px solid ${themeColors.border}`,
            textAlign: "center",
          }}
        >
          <p style={{ color: themeColors.text.secondary }}>Rapor oluşturuluyor, lütfen bekleyin…</p>
        </div>
      )}

      {reportResult && (
        <div
          style={{
            backgroundColor: themeColors.white,
            padding: spacing.xl,
            borderRadius: "8px",
            border: `1px solid ${themeColors.border}`,
          }}
        >
          <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: spacing.md }}>{reportResult.title}</h2>
          <div style={{ marginBottom: spacing.md, color: themeColors.text.secondary, fontSize: "14px" }}>
            <p>
              Dönem: {formatReportDate(reportResult.period.start_date)} - {formatReportDate(reportResult.period.end_date)}
            </p>
            <p>Oluşturulma: {formatReportDate(reportResult.generated_at)}</p>
          </div>

          {reportResult.rows && reportResult.rows.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "14px",
                }}
              >
                <thead>
                  <tr style={{ borderBottom: `2px solid ${themeColors.border}`, backgroundColor: themeColors.gray[50] }}>
                    {Object.keys(reportResult.rows[0]).map((key) => (
                      <th
                        key={key}
                        style={{
                          padding: spacing.sm,
                          textAlign: "left",
                          fontWeight: 600,
                          color: themeColors.text.primary,
                        }}
                      >
                        {key
                          .split("_")
                          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(" ")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportResult.rows.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: `1px solid ${themeColors.border}` }}>
                      {Object.keys(reportResult.rows[0]).map((key) => (
                        <td key={key} style={{ padding: spacing.sm, color: themeColors.text.secondary }}>
                          {row[key] !== null && row[key] !== undefined ? String(row[key]) : "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: themeColors.text.secondary, fontStyle: "italic" }}>
              Bu kriterlere uygun bir rapor sonucu bulunamadı.
            </p>
          )}

          {reportResult.totals && (
            <div style={{ marginTop: spacing.xl, padding: spacing.md, backgroundColor: themeColors.gray[50], borderRadius: "4px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: spacing.sm }}>Toplamlar</h3>
              <pre style={{ fontSize: "14px", color: themeColors.text.secondary, margin: 0 }}>
                {JSON.stringify(reportResult.totals, null, 2)}
              </pre>
            </div>
          )}

          {(reportResult as any).suggestions && (reportResult as any).suggestions.length > 0 && (
            <div style={{ marginTop: spacing.xl, padding: spacing.md, backgroundColor: colors.infoLight, borderRadius: borderRadius.sm, border: `1px solid ${colors.info}` }}>
              <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: spacing.sm, color: colors.info }}>
                İyileştirme Önerileri
              </h3>
              <ul style={{ margin: 0, paddingLeft: spacing.lg, color: themeColors.text.primary }}>
                {(reportResult as any).suggestions.map((suggestion: string, index: number) => (
                  <li key={index} style={{ marginBottom: spacing.xs, fontSize: "14px" }}>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

