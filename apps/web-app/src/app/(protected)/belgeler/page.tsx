"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { listDocuments, listClientCompanies, searchDocumentsByRisk } from "@repo/api-client";
import { documents as documentsI18n } from "@repo/i18n";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Table, TableRow, TableCell } from "@/components/ui/Table";
import { Select } from "@/components/ui/Select";
import { DocumentUploadModal } from "@/components/document-upload-modal";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageTransition } from "@/components/ui/PageTransition";
import { colors, spacing } from "@/styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";
import Link from "next/link";
import { Suspense } from "react";

const TYPE_LABELS: Record<string, string> = {
  INVOICE: "Fatura",
  BANK_STATEMENT: "Banka Ekstresi",
  RECEIPT: "Fiş",
  OTHER: "Diğer",
};

const STATUS_LABELS: Record<string, string> = {
  UPLOADED: "Yüklendi",
  PROCESSING: "İşleniyor",
  PROCESSED: "İşlendi",
  FAILED: "Başarısız",
};

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("tr-TR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function formatFileSize(bytes: number | bigint): string {
  const size = typeof bytes === "bigint" ? Number(bytes) : bytes;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentsPageContent() {
  const { themeColors } = useTheme();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Read URL parameters for risk filtering
  useEffect(() => {
    const riskParam = searchParams.get("risk");
    const severityParam = searchParams.get("severity");
    
    if (riskParam === "high" && severityParam === "high") {
      setRiskFilter("high");
    } else if (riskParam) {
      setRiskFilter(riskParam);
    }
  }, [searchParams]);

  // Fetch companies for dropdown
  const { data: companiesData } = useQuery({
    queryKey: ["clientCompanies"],
    queryFn: () => listClientCompanies({ pageSize: 100, isActive: true }),
  });

  const companies = companiesData?.data.data || [];

  // Fetch documents - use risk search if risk filter is active
  const { data, isLoading } = useQuery({
    queryKey: [
      "documents",
      selectedClientId !== "all" ? selectedClientId : undefined,
      typeFilter !== "all" ? typeFilter : undefined,
      statusFilter !== "all" ? statusFilter : undefined,
      riskFilter !== "all" ? riskFilter : undefined,
      page,
    ],
    queryFn: () => {
      // If risk filter is active, use risk search API
      if (riskFilter !== "all") {
        return searchDocumentsByRisk({
          riskSeverity: riskFilter as "low" | "medium" | "high",
          clientCompanyId: selectedClientId !== "all" ? selectedClientId : undefined,
          page,
          pageSize,
        });
      }
      
      // Otherwise use regular documents list
      return listDocuments({
        clientCompanyId: selectedClientId !== "all" ? selectedClientId : undefined,
        type: typeFilter !== "all" ? (typeFilter as any) : undefined,
        status: statusFilter !== "all" ? (statusFilter as any) : undefined,
        page,
        pageSize,
      });
    },
  });

  const documents = data?.data.data || [];
  const pagination = data?.data || { total: 0, page: 1, pageSize: 20, totalPages: 1 };

  const handleUploadClick = () => {
    // Always open the modal - it will handle customer selection if needed
    setDocumentModalOpen(true);
  };

  return (
    <PageTransition>
      <div>
      <PageHeader
        title="Belgeler"
        subtitle="Yüklenen belgeleri görüntüleyin ve yönetin"
        actions={
          <Button
            onClick={handleUploadClick}
            variant="primary"
            title={selectedClientId === "all" ? "Belge yüklemek için önce bir müşteri seçin" : "Belge yükle"}
          >
            Belge Yükle
          </Button>
        }
      />

      {/* Filters */}
      <Card style={{ marginBottom: spacing.lg }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: spacing.md,
          }}
        >
          <Select
            label="Müşteri"
            value={selectedClientId}
            onChange={(e) => {
              setSelectedClientId(e.target.value);
              setPage(1);
            }}
            options={[
              { value: "all", label: "Tümü" },
              ...companies.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />

          <Select
            label="Belge Türü"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: "all", label: "Tümü" },
              { value: "INVOICE", label: "Fatura" },
              { value: "BANK_STATEMENT", label: "Banka Ekstresi" },
              { value: "RECEIPT", label: "Fiş" },
              { value: "OTHER", label: "Diğer" },
            ]}
          />

          <Select
            label="Durum"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: "all", label: "Tümü" },
              { value: "UPLOADED", label: "Yüklendi" },
              { value: "PROCESSING", label: "İşleniyor" },
              { value: "PROCESSED", label: "İşlendi" },
              { value: "FAILED", label: "Başarısız" },
            ]}
          />

          <Select
            label="Risk Seviyesi"
            value={riskFilter}
            onChange={(e) => {
              setRiskFilter(e.target.value);
              setPage(1);
              // Update URL if high risk is selected
              if (e.target.value === "high") {
                router.push("/belgeler?risk=high&severity=high");
              } else if (e.target.value === "all") {
                router.push("/belgeler");
              }
            }}
            options={[
              { value: "all", label: "Tümü" },
              { value: "low", label: "Düşük Risk" },
              { value: "medium", label: "Orta Risk" },
              { value: "high", label: "Yüksek Risk" },
            ]}
          />
        </div>
      </Card>

      {/* Documents Table */}
      <Card>
        {isLoading ? (
          <div style={{ padding: spacing.lg }}>
            <SkeletonTable rows={5} columns={8} />
          </div>
        ) : documents.length === 0 ? (
          <EmptyState
            icon="FileText"
            title="Henüz belge bulunmuyor"
            description={selectedClientId !== "all" 
              ? "Bu müşteri için henüz belge yüklenmemiş. İlk belgeyi yükleyerek başlayın."
              : "Henüz hiç belge yüklenmemiş. İlk belgenizi yükleyerek başlayın."}
            actionLabel={selectedClientId !== "all" ? documentsI18n.list.emptyStateAction : "Belge Yükle"}
            onAction={() => setDocumentModalOpen(true)}
            variant="subtle"
          />
        ) : (
          <>
            <Table
              headers={["Dosya Adı", "Müşteri", "Tür", "Durum", "Risk", "Boyut", "Yüklenme Tarihi", "İşlemler"]}
            >
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div>
                      <div style={{ fontWeight: 500 }}>{doc.originalFileName}</div>
                      <div style={{ fontSize: "12px", color: themeColors.text.secondary }}>
                        {doc.mimeType}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/musteriler/${doc.clientCompanyId}`}
                      style={{ color: colors.primary, textDecoration: "none" }}
                    >
                      {companies.find((c) => c.id === doc.clientCompanyId)?.name || "N/A"}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span style={{ fontSize: "14px" }}>
                      {TYPE_LABELS[doc.type] || doc.type}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      style={{
                        padding: `${spacing.xs} ${spacing.sm}`,
                        borderRadius: "4px",
                        fontSize: "12px",
                        backgroundColor:
                          doc.status === "PROCESSED"
                            ? colors.successLight
                            : doc.status === "PROCESSING"
                            ? colors.info + "20"
                            : doc.status === "FAILED"
                            ? colors.dangerLight
                            : themeColors.gray[200],
                        color:
                          doc.status === "PROCESSED"
                            ? colors.successDark
                            : doc.status === "PROCESSING"
                            ? colors.info
                            : doc.status === "FAILED"
                            ? colors.dangerDark
                            : themeColors.text.secondary,
                      }}
                    >
                      {STATUS_LABELS[doc.status] || doc.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {(doc as any).riskSeverity ? (
                      <span
                        style={{
                          padding: `${spacing.xs} ${spacing.sm}`,
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: 500,
                          backgroundColor:
                            (doc as any).riskSeverity === "high"
                              ? colors.dangerPastel
                              : (doc as any).riskSeverity === "medium"
                                ? colors.warningPastel
                                : colors.successPastel,
                          color:
                            (doc as any).riskSeverity === "high"
                              ? colors.dangerDark
                              : (doc as any).riskSeverity === "medium"
                                ? colors.warning
                                : colors.successDark,
                        }}
                      >
                        {(doc as any).riskSeverity === "high"
                          ? "Yüksek"
                          : (doc as any).riskSeverity === "medium"
                            ? "Orta"
                            : "Düşük"}
                        {typeof (doc as any).riskScore === "number" && (
                          <span style={{ marginLeft: spacing.xs, opacity: 0.7 }}>
                            ({(doc as any).riskScore.toFixed(0)})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span style={{ fontSize: "12px", color: themeColors.text.muted }}>—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div style={{ fontSize: "14px", color: themeColors.text.secondary }}>
                      {formatFileSize(doc.fileSizeBytes)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div style={{ fontSize: "12px", color: themeColors.text.secondary }}>
                      {formatDate(doc.createdAt)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div style={{ display: "flex", gap: spacing.sm }}>
                      <Link href={`/belgeler/${doc.id}`}>
                        <Button variant="outline" size="sm">
                          Görüntüle
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </Table>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: spacing.lg,
                  paddingTop: spacing.lg,
                  borderTop: `1px solid ${themeColors.border}`,
                }}
              >
                <div style={{ color: themeColors.text.secondary, fontSize: "14px" }}>
                  Toplam {pagination.total} belge, Sayfa {pagination.page} / {pagination.totalPages}
                </div>
                <div style={{ display: "flex", gap: spacing.sm }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pagination.page === 1}
                  >
                    Önceki
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Sonraki
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Upload Modal */}
      <DocumentUploadModal
        clientCompanyId={selectedClientId !== "all" ? selectedClientId : undefined}
        isOpen={documentModalOpen}
        onClose={() => setDocumentModalOpen(false)}
      />
    </div>
    </PageTransition>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={<div>Yükleniyor...</div>}>
      <DocumentsPageContent />
    </Suspense>
  );
}

