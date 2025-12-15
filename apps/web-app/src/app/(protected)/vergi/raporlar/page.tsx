"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { taxClient, listClientCompanies } from "@repo/api-client";
import Link from "next/link";
import { Card } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { colors, spacing, borderRadius, shadows, typography, transitions } from "../../../../styles/design-system";

export default function TaxReportingPage() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [reportType, setReportType] = useState<
    "vat-declaration" | "corporate-tax" | "withholding-tax" | "monthly-summary" | null
  >(null);

  // Fetch client companies
  const { data: clientsData } = useQuery({
    queryKey: ["client-companies"],
    queryFn: () => listClientCompanies({ pageSize: 100 }),
  });

  const clients = clientsData?.data.data || [];

  // Generate VAT Declaration
  const vatDeclarationMutation = useMutation({
    mutationFn: () => {
      if (!selectedClientId) throw new Error("Müşteri seçilmedi");
      return taxClient.generateVATDeclaration(selectedClientId, startDate, endDate);
    },
    onSuccess: (data) => {
      toast.success("KDV beyannamesi başarıyla oluşturuldu!");
      console.log("VAT Declaration:", data);
    },
    onError: (error: Error) => {
      toast.error(`Hata: ${error.message}`);
    },
  });

  // Generate Corporate Tax Report
  const corporateTaxMutation = useMutation({
    mutationFn: () => {
      if (!selectedClientId) throw new Error("Müşteri seçilmedi");
      return taxClient.generateCorporateTaxReport(selectedClientId, year);
    },
    onSuccess: (data) => {
      toast.success("Kurumlar vergisi raporu başarıyla oluşturuldu!");
      console.log("Corporate Tax Report:", data);
    },
    onError: (error: Error) => {
      toast.error(`Hata: ${error.message}`);
    },
  });

  // Generate Withholding Tax Report
  const withholdingTaxMutation = useMutation({
    mutationFn: () => {
      if (!selectedClientId) throw new Error("Müşteri seçilmedi");
      return taxClient.generateWithholdingTaxReport(selectedClientId, startDate, endDate);
    },
    onSuccess: (data) => {
      toast.success("Stopaj vergisi raporu başarıyla oluşturuldu!");
      console.log("Withholding Tax Report:", data);
    },
    onError: (error: Error) => {
      toast.error(`Hata: ${error.message}`);
    },
  });

  // Generate Monthly Tax Summary
  const monthlySummaryMutation = useMutation({
    mutationFn: () => {
      if (!selectedClientId) throw new Error("Müşteri seçilmedi");
      return taxClient.generateMonthlyTaxSummary(selectedClientId, year, month);
    },
    onSuccess: (data) => {
      toast.success("Aylık vergi özeti başarıyla oluşturuldu!");
      console.log("Monthly Tax Summary:", data);
    },
    onError: (error: Error) => {
      toast.error(`Hata: ${error.message}`);
    },
  });

  const handleGenerateReport = () => {
    if (!selectedClientId) {
      toast.warning("Lütfen bir müşteri seçin");
      return;
    }

    if (!reportType) {
      toast.warning("Lütfen bir rapor türü seçin");
      return;
    }

    switch (reportType) {
      case "vat-declaration":
        vatDeclarationMutation.mutate();
        break;
      case "corporate-tax":
        corporateTaxMutation.mutate();
        break;
      case "withholding-tax":
        withholdingTaxMutation.mutate();
        break;
      case "monthly-summary":
        monthlySummaryMutation.mutate();
        break;
    }
  };

  const isLoading =
    vatDeclarationMutation.isPending ||
    corporateTaxMutation.isPending ||
    withholdingTaxMutation.isPending ||
    monthlySummaryMutation.isPending;

  return (
    <div
      style={{
        padding: spacing.xxl,
        maxWidth: "1600px",
        margin: "0 auto",
        backgroundColor: colors.gray[50],
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <div
        style={{
          marginBottom: spacing.xl,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: spacing.md, marginBottom: spacing.sm }}>
          <Button variant="ghost" asLink href="/vergi" icon="←">
            Geri
          </Button>
        </div>
        <h1
          style={{
            fontSize: typography.fontSize["3xl"],
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
            marginBottom: spacing.sm,
          }}
        >
          Vergi Raporları
        </h1>
        <p
          style={{
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
            lineHeight: typography.lineHeight.relaxed,
            margin: 0,
          }}
        >
          KDV beyannamesi, kurumlar vergisi, stopaj vergisi ve aylık vergi özeti raporlarını oluşturun.
        </p>
      </div>

      {/* Report Generator */}
      <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
        <h2
          style={{
            margin: `0 0 ${spacing.lg} 0`,
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
          }}
        >
          Rapor Oluştur
        </h2>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: spacing.md,
          }}
        >
          {/* Client Selection */}
          <div>
            <label
              style={{
                display: "block",
                marginBottom: spacing.xs,
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                color: colors.text.primary,
              }}
            >
              Müşteri *
            </label>
            <select
              value={selectedClientId || ""}
              onChange={(e) => setSelectedClientId(e.target.value || null)}
              style={{
                width: "100%",
                maxWidth: "400px",
                padding: spacing.sm,
                borderRadius: borderRadius.md,
                border: `1px solid ${colors.border}`,
                fontSize: typography.fontSize.base,
                backgroundColor: colors.white,
                color: colors.text.primary,
              }}
            >
              <option value="">Müşteri seçin...</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} ({client.taxNumber})
                </option>
              ))}
            </select>
          </div>

          {/* Report Type */}
          <div>
            <label
              style={{
                display: "block",
                marginBottom: spacing.xs,
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                color: colors.text.primary,
              }}
            >
              Rapor Türü *
            </label>
            <select
              value={reportType || ""}
              onChange={(e) =>
                setReportType(
                  (e.target.value as typeof reportType) || null
                )
              }
              style={{
                width: "100%",
                maxWidth: "400px",
                padding: spacing.sm,
                borderRadius: borderRadius.md,
                border: `1px solid ${colors.border}`,
                fontSize: typography.fontSize.base,
                backgroundColor: colors.white,
                color: colors.text.primary,
              }}
            >
              <option value="">Rapor türü seçin...</option>
              <option value="vat-declaration">KDV Beyannamesi</option>
              <option value="corporate-tax">Kurumlar Vergisi Raporu</option>
              <option value="withholding-tax">Stopaj Vergisi Raporu</option>
              <option value="monthly-summary">Aylık Vergi Özeti</option>
            </select>
          </div>

          {/* Date Range (for VAT Declaration and Withholding Tax) */}
          {(reportType === "vat-declaration" || reportType === "withholding-tax") && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: spacing.md,
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: spacing.xs,
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    color: colors.text.primary,
                  }}
                >
                  Başlangıç Tarihi *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: spacing.sm,
                    borderRadius: borderRadius.md,
                    border: `1px solid ${colors.border}`,
                    fontSize: typography.fontSize.base,
                    backgroundColor: colors.white,
                    color: colors.text.primary,
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: spacing.xs,
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    color: colors.text.primary,
                  }}
                >
                  Bitiş Tarihi *
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: spacing.sm,
                    borderRadius: borderRadius.md,
                    border: `1px solid ${colors.border}`,
                    fontSize: typography.fontSize.base,
                    backgroundColor: colors.white,
                    color: colors.text.primary,
                  }}
                />
              </div>
            </div>
          )}

          {/* Year (for Corporate Tax) */}
          {reportType === "corporate-tax" && (
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: spacing.xs,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  color: colors.text.primary,
                }}
              >
                Yıl *
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10))}
                min={2000}
                max={new Date().getFullYear()}
                style={{
                  width: "100%",
                  maxWidth: "200px",
                  padding: spacing.sm,
                  borderRadius: borderRadius.md,
                  border: `1px solid ${colors.border}`,
                  fontSize: typography.fontSize.base,
                  backgroundColor: colors.white,
                  color: colors.text.primary,
                }}
              />
            </div>
          )}

          {/* Year and Month (for Monthly Summary) */}
          {reportType === "monthly-summary" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: spacing.md,
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: spacing.xs,
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    color: colors.text.primary,
                  }}
                >
                  Yıl *
                </label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value, 10))}
                  min={2000}
                  max={new Date().getFullYear()}
                  style={{
                    width: "100%",
                    padding: spacing.sm,
                    borderRadius: borderRadius.md,
                    border: `1px solid ${colors.border}`,
                    fontSize: typography.fontSize.base,
                    backgroundColor: colors.white,
                    color: colors.text.primary,
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: spacing.xs,
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    color: colors.text.primary,
                  }}
                >
                  Ay *
                </label>
                <select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                  style={{
                    width: "100%",
                    padding: spacing.sm,
                    borderRadius: borderRadius.md,
                    border: `1px solid ${colors.border}`,
                    fontSize: typography.fontSize.base,
                    backgroundColor: colors.white,
                    color: colors.text.primary,
                  }}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {new Date(2000, m - 1, 1).toLocaleDateString("tr-TR", {
                        month: "long",
                      })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <div style={{ marginTop: spacing.md }}>
            <Button
              variant="primary"
              onClick={handleGenerateReport}
              loading={isLoading}
              disabled={!selectedClientId || !reportType}
            >
              📄 Raporu Oluştur
            </Button>
          </div>
        </div>
      </Card>

      {/* Report Types Info */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: spacing.lg,
        }}
      >
        <Card variant="outlined">
          <h3
            style={{
              margin: `0 0 ${spacing.sm} 0`,
              fontSize: typography.fontSize.base,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
            }}
          >
            📋 KDV Beyannamesi
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
              lineHeight: typography.lineHeight.relaxed,
            }}
          >
            Belirli bir dönem için KDV beyannamesi hazırlayın. Giriş ve çıkış KDV bilgilerini içerir.
          </p>
        </Card>

        <Card variant="outlined">
          <h3
            style={{
              margin: `0 0 ${spacing.sm} 0`,
              fontSize: typography.fontSize.base,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
            }}
          >
            🏢 Kurumlar Vergisi
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
              lineHeight: typography.lineHeight.relaxed,
            }}
          >
            Yıllık kurumlar vergisi raporu oluşturun. Vergiye tabi kazanç ve vergi tutarını hesaplar.
          </p>
        </Card>

        <Card variant="outlined">
          <h3
            style={{
              margin: `0 0 ${spacing.sm} 0`,
              fontSize: typography.fontSize.base,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
            }}
          >
            💼 Stopaj Vergisi
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
              lineHeight: typography.lineHeight.relaxed,
            }}
          >
            Belirli bir dönem için stopaj vergisi raporu hazırlayın. Kesilen stopaj tutarlarını içerir.
          </p>
        </Card>

        <Card variant="outlined">
          <h3
            style={{
              margin: `0 0 ${spacing.sm} 0`,
              fontSize: typography.fontSize.base,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
            }}
          >
            📅 Aylık Vergi Özeti
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
              lineHeight: typography.lineHeight.relaxed,
            }}
          >
            Belirli bir ay için tüm vergi türlerinin özet raporunu oluşturun.
          </p>
        </Card>
      </div>

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

