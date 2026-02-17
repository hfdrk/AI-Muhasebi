"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDocument, deleteDocument, downloadDocument, getDocumentAIAnalysis, retryDocumentProcessing } from "@repo/api-client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useDocumentRiskScore } from "@/hooks/use-risk";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/lib/toast";
import { PageTransition } from "@/components/ui/PageTransition";
import { colors, spacing, borderRadius, typography } from "@/styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";

const TYPE_LABELS: Record<string, string> = {
  INVOICE: "Fatura",
  BANK_STATEMENT: "Banka Ekstresi",
  RECEIPT: "Dekont",
  OTHER: "Diğer",
};

const STATUS_LABELS: Record<string, string> = {
  UPLOADED: "Yüklendi",
  PROCESSING: "İşleniyor",
  PROCESSED: "İşlendi",
  FAILED: "Hata",
};

export default function DocumentDetailPage() {
  const { themeColors } = useTheme();
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;
  const queryClient = useQueryClient();
  const [deleteModal, setDeleteModal] = useState(false);

  const { data: document, isLoading } = useQuery({
    queryKey: ["document", documentId],
    queryFn: () => getDocument(documentId),
    enabled: !!documentId,
  });

  const { data: aiAnalysis, isLoading: aiLoading, error: aiError, refetch: refetchAIAnalysis } = useQuery({
    queryKey: ["document-ai", documentId],
    queryFn: () => getDocumentAIAnalysis(documentId),
    enabled: !!documentId && !!document?.data && (document.data.status === "PROCESSED" || document.data.status === "PROCESSING"),
    retry: 1,
    retryDelay: 1000,
  });

  const { data: riskScoreData, isLoading: riskLoading } = useDocumentRiskScore(documentId);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      router.push("/musteriler");
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async (id: string) => {
      const blob = await downloadDocument(id);
      return { blob, documentId: id };
    },
    onSuccess: ({ blob, documentId }) => {
      try {
        if (typeof window === "undefined" || !window.document) return;
        const url = window.URL.createObjectURL(blob);
        const a = window.document.createElement("a");
        a.href = url;
        const fileName = document?.data?.originalFileName || `document-${documentId}`;
        a.download = fileName;
        window.document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        // Safely remove the element if it's still in the DOM
        if (a.parentNode) {
          a.parentNode.removeChild(a);
        }
        toast.success("Dosya başarıyla indirildi.");
      } catch (error) {
        console.error("Error downloading file:", error);
        toast.error("Dosya indirilirken bir hata oluştu.");
      }
    },
    onError: (error: Error) => {
      console.error("Download error:", error);
      toast.error(`Dosya indirilemedi: ${error.message}`);
    },
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => retryDocumentProcessing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document", documentId] });
      toast.success("Belge yeniden işleme için kuyruğa eklendi. İşlem birkaç dakika içinde başlayacak.");
    },
    onError: (error: Error) => {
      toast.error(`Hata: ${error.message}`);
    },
  });

  const handleDelete = () => {
    setDeleteModal(true);
  };

  if (isLoading) {
    return (
      <div style={{ padding: spacing.xxl, maxWidth: "1200px" }}>
        <div style={{ marginBottom: spacing.xl }}>
          <Skeleton height="40px" width="300px" variant="text" />
        </div>
        <div style={{ display: "flex", gap: spacing.md, marginBottom: spacing.lg }}>
          <Skeleton height="40px" width="120px" variant="rectangular" />
          <Skeleton height="40px" width="120px" variant="rectangular" />
        </div>
        <div style={{ backgroundColor: themeColors.white, padding: spacing.lg, borderRadius: borderRadius.lg, marginBottom: spacing.lg }}>
          <Skeleton height="24px" width="200px" variant="text" style={{ marginBottom: spacing.md }} />
          <Skeleton height="20px" width="100%" variant="text" style={{ marginBottom: spacing.sm }} />
          <Skeleton height="20px" width="90%" variant="text" style={{ marginBottom: spacing.sm }} />
          <Skeleton height="20px" width="95%" variant="text" />
        </div>
        <div style={{ backgroundColor: themeColors.white, padding: spacing.lg, borderRadius: borderRadius.lg }}>
          <Skeleton height="24px" width="200px" variant="text" style={{ marginBottom: spacing.md }} />
          <Skeleton height="150px" width="100%" variant="rectangular" />
        </div>
      </div>
    );
  }

  if (!document?.data) {
    return (
      <div style={{ padding: "40px" }}>
        <p>Belge bulunamadı.</p>
        <Link href="/musteriler">Müşteri listesine dön</Link>
      </div>
    );
  }

  const documentData = document.data;

  return (
    <PageTransition>
      <div style={{ padding: "40px", maxWidth: "1200px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1>Belge Detayı</h1>
        <div style={{ display: "flex", gap: "8px" }}>
          <Button
            onClick={() => downloadMutation.mutate(documentId)}
            disabled={downloadMutation.isPending}
            variant="primary"
          >
            {downloadMutation.isPending ? "İndiriliyor..." : "İndir"}
          </Button>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            style={{
              padding: "8px 16px",
              backgroundColor: colors.danger,
              color: colors.white,
              border: "none",
              borderRadius: "4px",
              cursor: deleteMutation.isPending ? "not-allowed" : "pointer",
              opacity: deleteMutation.isPending ? 0.6 : 1,
            }}
          >
            {deleteMutation.isPending ? "Siliniyor..." : "Sil"}
          </button>
          <Link
            href={`/musteriler/${documentData.clientCompanyId}`}
            style={{
              padding: "8px 16px",
              backgroundColor: themeColors.gray[100],
              color: "inherit",
              textDecoration: "none",
              borderRadius: "4px",
            }}
          >
            Geri
          </Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div>
          <strong>Orijinal Dosya Adı:</strong> {documentData.originalFileName}
        </div>
        <div>
          <strong>Belge Türü:</strong> {TYPE_LABELS[documentData.type] || documentData.type}
        </div>
        <div>
          <strong>Durum:</strong>{" "}
          <span
            style={{
              padding: "4px 8px",
              borderRadius: "4px",
              backgroundColor:
                documentData.status === "PROCESSED"
                  ? colors.successLight
                  : documentData.status === "FAILED"
                  ? colors.dangerLight
                  : documentData.status === "PROCESSING"
                  ? colors.warningLight
                  : themeColors.gray[200],
              color:
                documentData.status === "PROCESSED"
                  ? colors.successDark
                  : documentData.status === "FAILED"
                  ? colors.dangerDark
                  : documentData.status === "PROCESSING"
                  ? colors.warning
                  : colors.gray[700],
              fontSize: "12px",
            }}
          >
            {STATUS_LABELS[documentData.status] || documentData.status}
          </span>
        </div>
        <div>
          <strong>Dosya Boyutu:</strong>{" "}
          {(documentData.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
        </div>
        <div>
          <strong>Yükleme Tarihi:</strong>{" "}
          {new Date(documentData.createdAt).toLocaleDateString("tr-TR", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
        {documentData.processedAt && (
          <div>
            <strong>İşlenme Tarihi:</strong>{" "}
            {new Date(documentData.processedAt).toLocaleDateString("tr-TR", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        )}
        {documentData.processingErrorMessage && (
          <div style={{ gridColumn: "1 / -1" }}>
            <strong>İşleme Hatası:</strong>{" "}
            <span style={{ color: colors.danger }}>{documentData.processingErrorMessage}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        items={[
          {
            id: "details",
            label: "Detaylar",
            icon: "FileText",
            content: (
        <div>
          {documentData.status === "PROCESSING" && (
            <div style={{ padding: spacing.md, backgroundColor: colors.warningLight, borderRadius: borderRadius.md, marginBottom: spacing.lg, border: `1px solid ${colors.warning}` }}>
              <p style={{ margin: 0, color: colors.warning }}>Bu belge şu anda işleniyor.</p>
            </div>
          )}

          {documentData.status === "FAILED" && (
            <div style={{ padding: spacing.md, backgroundColor: colors.dangerLight, borderRadius: borderRadius.md, marginBottom: spacing.lg, border: `1px solid ${colors.danger}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ color: colors.dangerDark, margin: 0, marginBottom: spacing.sm, fontWeight: typography.fontWeight.medium }}>
                    Belge işlenirken bir hata oluştu.
                  </p>
                  {documentData.processingErrorMessage && (
                    <p style={{ color: colors.dangerDark, margin: 0, fontSize: typography.fontSize.sm }}>
                      <strong>Hata:</strong> {documentData.processingErrorMessage}
                    </p>
                  )}
                  <p style={{ color: colors.dangerDark, margin: `${spacing.sm} 0 0 0`, fontSize: typography.fontSize.xs }}>
                    Belgeyi yeniden işlemek için "Yeniden Dene" butonuna tıklayın.
                  </p>
                </div>
                <Button
                  onClick={() => retryMutation.mutate(documentId)}
                  disabled={retryMutation.isPending}
                  variant="primary"
                  size="sm"
                >
                  {retryMutation.isPending ? "İşleniyor..." : "Yeniden Dene"}
                </Button>
              </div>
            </div>
          )}

          {/* Detailed Information Card */}
          <div style={{ padding: spacing.xl, backgroundColor: themeColors.gray[50], borderRadius: borderRadius.lg, marginBottom: spacing.lg, border: `1px solid ${themeColors.border}` }}>
            <h2 style={{ marginTop: 0, marginBottom: spacing.lg, fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, color: themeColors.text.primary }}>Belge Bilgileri</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.md }}>
              <div>
                <strong style={{ display: "block", marginBottom: spacing.xs, color: themeColors.text.secondary, fontSize: typography.fontSize.sm }}>Dosya Adı</strong>
                <span>{documentData.originalFileName}</span>
              </div>
              <div>
                <strong style={{ display: "block", marginBottom: spacing.xs, color: themeColors.text.secondary, fontSize: typography.fontSize.sm }}>Dosya Türü</strong>
                <span>{documentData.mimeType}</span>
              </div>
              <div>
                <strong style={{ display: "block", marginBottom: spacing.xs, color: themeColors.text.secondary, fontSize: typography.fontSize.sm }}>Belge Türü</strong>
                <span>{TYPE_LABELS[documentData.type] || documentData.type}</span>
              </div>
              <div>
                <strong style={{ display: "block", marginBottom: spacing.xs, color: themeColors.text.secondary, fontSize: typography.fontSize.sm }}>Yükleme Kaynağı</strong>
                <span>
                  {documentData.uploadSource === "manual"
                    ? "Manuel Yükleme"
                    : documentData.uploadSource === "email_import"
                    ? "E-posta İçe Aktarma"
                    : documentData.uploadSource === "integration"
                    ? "Entegrasyon"
                    : documentData.uploadSource}
                </span>
              </div>
              <div>
                <strong style={{ display: "block", marginBottom: spacing.xs, color: themeColors.text.secondary, fontSize: typography.fontSize.sm }}>Dosya Boyutu</strong>
                <span>{(documentData.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
              <div>
                <strong style={{ display: "block", marginBottom: spacing.xs, color: themeColors.text.secondary, fontSize: typography.fontSize.sm }}>Durum</strong>
                <Badge
                  variant={
                    documentData.status === "PROCESSED"
                      ? "success"
                      : documentData.status === "FAILED"
                      ? "danger"
                      : documentData.status === "PROCESSING"
                      ? "warning"
                      : "secondary"
                  }
                  size="sm"
                >
                  {STATUS_LABELS[documentData.status] || documentData.status}
                </Badge>
              </div>
              <div>
                <strong style={{ display: "block", marginBottom: spacing.xs, color: themeColors.text.secondary, fontSize: typography.fontSize.sm }}>Yükleme Tarihi</strong>
                <span>
                  {new Date(documentData.createdAt).toLocaleDateString("tr-TR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {documentData.processedAt && (
                <div>
                  <strong style={{ display: "block", marginBottom: spacing.xs, color: themeColors.text.secondary, fontSize: typography.fontSize.sm }}>İşlenme Tarihi</strong>
                  <span>
                    {new Date(documentData.processedAt).toLocaleDateString("tr-TR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Related Information */}
          {(documentData.relatedInvoiceId || documentData.relatedTransactionId) && (
            <div style={{ padding: spacing.xl, backgroundColor: themeColors.gray[50], borderRadius: borderRadius.lg, marginBottom: spacing.lg, border: `1px solid ${themeColors.border}` }}>
              <h2 style={{ marginTop: 0, marginBottom: spacing.lg, fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, color: themeColors.text.primary }}>İlişkili Kayıtlar</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
                {documentData.relatedInvoiceId && (
                  <div>
                    <strong style={{ display: "block", marginBottom: spacing.xs, color: themeColors.text.secondary, fontSize: typography.fontSize.sm }}>İlişkili Fatura</strong>
                    <Link
                      href={`/faturalar/${documentData.relatedInvoiceId}`}
                      style={{ color: colors.primary, textDecoration: "none", fontWeight: typography.fontWeight.medium }}
                    >
                      Faturayı Görüntüle →
                    </Link>
                  </div>
                )}
                {documentData.relatedTransactionId && (
                  <div>
                    <strong style={{ display: "block", marginBottom: spacing.xs, color: themeColors.text.secondary, fontSize: typography.fontSize.sm }}>
                      İlişkili İşlem
                    </strong>
                    <Link
                      href={`/islemler/${documentData.relatedTransactionId}`}
                      style={{ color: colors.primary, textDecoration: "none", fontWeight: typography.fontWeight.medium }}
                    >
                      İşlemi Görüntüle →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Client Company Link */}
          <div style={{ padding: spacing.xl, backgroundColor: themeColors.gray[50], borderRadius: borderRadius.lg, border: `1px solid ${themeColors.border}` }}>
            <h2 style={{ marginTop: 0, marginBottom: spacing.lg, fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, color: themeColors.text.primary }}>Müşteri Bilgisi</h2>
            <div>
              <strong style={{ display: "block", marginBottom: spacing.xs, color: themeColors.text.secondary, fontSize: typography.fontSize.sm }}>Müşteri Şirketi</strong>
              <Link
                href={`/musteriler/${documentData.clientCompanyId}`}
                style={{ color: colors.primary, textDecoration: "none", fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.medium }}
              >
                Müşteri Detaylarını Görüntüle →
              </Link>
            </div>
          </div>
        </div>
            ),
          },
          {
            id: "ai",
            label: "AI Analiz",
            icon: "Brain",
            content: (
        <div>
          {documentData.status === "PROCESSING" && (
            <div style={{ padding: "16px", backgroundColor: colors.warningLight, borderRadius: "4px", marginBottom: "24px" }}>
              <p>AI analizi hazırlanıyor...</p>
            </div>
          )}

          {documentData.status === "UPLOADED" && (
            <div style={{ padding: spacing.md, backgroundColor: themeColors.gray[200], borderRadius: borderRadius.md, marginBottom: spacing.lg, border: `1px solid ${themeColors.border}` }}>
              <p style={{ margin: 0, color: themeColors.text.secondary }}>Bu belge henüz AI tarafından analiz edilmemiş.</p>
            </div>
          )}

          {aiError && (
            <div style={{ padding: spacing.md, backgroundColor: colors.dangerLight, borderRadius: borderRadius.md, marginBottom: spacing.lg, border: `1px solid ${colors.danger}` }}>
              <p style={{ color: colors.dangerDark, margin: 0, marginBottom: spacing.sm, fontWeight: typography.fontWeight.medium }}>
                <strong>Hata:</strong> AI analizi yüklenirken bir hata oluştu.
              </p>
              <p style={{ color: colors.dangerDark, margin: 0, fontSize: typography.fontSize.sm, marginBottom: spacing.sm }}>
                {aiError instanceof Error ? aiError.message : "Bilinmeyen bir hata oluştu."}
              </p>
              <Button
                onClick={() => refetchAIAnalysis()}
                variant="danger"
                size="sm"
              >
                Tekrar Dene
              </Button>
            </div>
          )}

          {aiLoading && (
            <div style={{ padding: spacing.md }}>
              <Skeleton height="24px" width="200px" variant="text" style={{ marginBottom: spacing.md }} />
              <Skeleton height="20px" width="100%" variant="text" style={{ marginBottom: spacing.sm }} />
              <Skeleton height="20px" width="90%" variant="text" style={{ marginBottom: spacing.sm }} />
              <Skeleton height="20px" width="95%" variant="text" style={{ marginBottom: spacing.md }} />
              <Skeleton height="150px" width="100%" variant="rectangular" />
            </div>
          )}

          {!aiLoading && aiAnalysis?.data && (
            <>
              {/* Extracted Fields Section */}
              {aiAnalysis.data.parsedData && (
                <div style={{ marginBottom: spacing.lg, padding: spacing.md, backgroundColor: themeColors.gray[50], borderRadius: borderRadius.md, border: `1px solid ${themeColors.border}` }}>
                  <h2 style={{ marginBottom: spacing.md, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: themeColors.text.primary }}>Çıkarılan Alanlar</h2>
                  {aiAnalysis.data.parsedData.documentType === "invoice" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      {aiAnalysis.data.parsedData.fields.invoiceNumber && (
                        <div>
                          <strong>Fatura Numarası:</strong> {aiAnalysis.data.parsedData.fields.invoiceNumber}
                        </div>
                      )}
                      {aiAnalysis.data.parsedData.fields.issueDate && (
                        <div>
                          <strong>Fatura Tarihi:</strong> {aiAnalysis.data.parsedData.fields.issueDate}
                        </div>
                      )}
                      {aiAnalysis.data.parsedData.fields.dueDate && (
                        <div>
                          <strong>Vade Tarihi:</strong> {aiAnalysis.data.parsedData.fields.dueDate}
                        </div>
                      )}
                      {(aiAnalysis.data.parsedData.fields.totalAmount !== null && aiAnalysis.data.parsedData.fields.totalAmount !== undefined && aiAnalysis.data.parsedData.fields.totalAmount !== 0) && (
                        <div>
                          <strong>Toplam Tutar:</strong> {typeof aiAnalysis.data.parsedData.fields.totalAmount === 'number' 
                            ? aiAnalysis.data.parsedData.fields.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : aiAnalysis.data.parsedData.fields.totalAmount} {aiAnalysis.data.parsedData.fields.currency || "TRY"}
                        </div>
                      )}
                      {(aiAnalysis.data.parsedData.fields.netAmount !== null && aiAnalysis.data.parsedData.fields.netAmount !== undefined && aiAnalysis.data.parsedData.fields.netAmount !== 0) && (
                        <div>
                          <strong>Net Tutar:</strong> {typeof aiAnalysis.data.parsedData.fields.netAmount === 'number'
                            ? aiAnalysis.data.parsedData.fields.netAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : aiAnalysis.data.parsedData.fields.netAmount} {aiAnalysis.data.parsedData.fields.currency || "TRY"}
                        </div>
                      )}
                      {(aiAnalysis.data.parsedData.fields.taxAmount !== null && aiAnalysis.data.parsedData.fields.taxAmount !== undefined && aiAnalysis.data.parsedData.fields.taxAmount !== 0) && (
                        <div>
                          <strong>KDV Tutarı:</strong> {typeof aiAnalysis.data.parsedData.fields.taxAmount === 'number'
                            ? aiAnalysis.data.parsedData.fields.taxAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : aiAnalysis.data.parsedData.fields.taxAmount} {aiAnalysis.data.parsedData.fields.currency || "TRY"}
                        </div>
                      )}
                      {aiAnalysis.data.parsedData.fields.counterpartyName && (
                        <div>
                          <strong>Karşı Taraf Adı:</strong> {aiAnalysis.data.parsedData.fields.counterpartyName}
                        </div>
                      )}
                      {aiAnalysis.data.parsedData.fields.counterpartyTaxNumber && (
                        <div>
                          <strong>Karşı Taraf Vergi No:</strong> {aiAnalysis.data.parsedData.fields.counterpartyTaxNumber}
                        </div>
                      )}
                    </div>
                  )}
                  {aiAnalysis.data.parsedData.documentType === "bank_statement" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      {aiAnalysis.data.parsedData.fields.accountNumber && (
                        <div>
                          <strong>Hesap Numarası:</strong> {aiAnalysis.data.parsedData.fields.accountNumber}
                        </div>
                      )}
                      {aiAnalysis.data.parsedData.fields.currency && (
                        <div>
                          <strong>Para Birimi:</strong> {aiAnalysis.data.parsedData.fields.currency}
                        </div>
                      )}
                      {aiAnalysis.data.parsedData.fields.startDate && (
                        <div>
                          <strong>Başlangıç Tarihi:</strong> {aiAnalysis.data.parsedData.fields.startDate}
                        </div>
                      )}
                      {aiAnalysis.data.parsedData.fields.endDate && (
                        <div>
                          <strong>Bitiş Tarihi:</strong> {aiAnalysis.data.parsedData.fields.endDate}
                        </div>
                      )}
                      {aiAnalysis.data.parsedData.fields.startingBalance !== null && (
                        <div>
                          <strong>Başlangıç Bakiyesi:</strong> {aiAnalysis.data.parsedData.fields.startingBalance} {aiAnalysis.data.parsedData.fields.currency || "TRY"}
                        </div>
                      )}
                      {aiAnalysis.data.parsedData.fields.endingBalance !== null && (
                        <div>
                          <strong>Bitiş Bakiyesi:</strong> {aiAnalysis.data.parsedData.fields.endingBalance} {aiAnalysis.data.parsedData.fields.currency || "TRY"}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Risk Features Section */}
              {aiAnalysis.data.riskFeatures && (
                <div style={{ marginBottom: spacing.lg, padding: spacing.md, backgroundColor: themeColors.gray[50], borderRadius: borderRadius.md, border: `1px solid ${themeColors.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }}>
                    <h2 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: themeColors.text.primary }}>Risk Göstergeleri</h2>
                    {aiAnalysis.data.riskFeatures.riskScore !== null && (
                      <span
                        style={{
                          padding: "8px 16px",
                          borderRadius: "4px",
                          backgroundColor:
                            aiAnalysis.data.riskFeatures.riskScore >= 70
                              ? colors.dangerLight
                              : aiAnalysis.data.riskFeatures.riskScore >= 40
                              ? colors.warningLight
                              : colors.successLight,
                          color:
                            aiAnalysis.data.riskFeatures.riskScore >= 70
                              ? colors.dangerDark
                              : aiAnalysis.data.riskFeatures.riskScore >= 40
                              ? colors.warningDark
                              : colors.successDark,
                          fontWeight: "bold",
                        }}
                      >
                        Risk Skoru: {aiAnalysis.data.riskFeatures.riskScore}
                      </span>
                    )}
                  </div>

                  {aiAnalysis.data.riskFeatures.riskFlags.length === 0 ? (
                    <p style={{ color: colors.successDark }}>Risk Yok - Bu belgede risk göstergesi tespit edilmedi.</p>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: `2px solid ${themeColors.border}` }}>
                          <th style={{ padding: "12px", textAlign: "left" }}>Risk Kodu</th>
                          <th style={{ padding: "12px", textAlign: "left" }}>Açıklama</th>
                          <th style={{ padding: "12px", textAlign: "left" }}>Önem Derecesi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aiAnalysis.data.riskFeatures.riskFlags.map((flag, index) => (
                          <tr key={index} style={{ borderBottom: `1px solid ${themeColors.gray[200]}` }}>
                            <td style={{ padding: "12px" }}>{flag.code}</td>
                            <td style={{ padding: "12px" }}>{flag.description}</td>
                            <td style={{ padding: "12px" }}>
                              <span
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                  backgroundColor:
                                    flag.severity === "high"
                                      ? colors.dangerLight
                                      : flag.severity === "medium"
                                      ? colors.warningLight
                                      : colors.successLight,
                                  color:
                                    flag.severity === "high"
                                      ? colors.dangerDark
                                      : flag.severity === "medium"
                                      ? colors.warningDark
                                      : colors.successDark,
                                  fontSize: "12px",
                                }}
                              >
                                {flag.severity === "high" ? "Yüksek" : flag.severity === "medium" ? "Orta" : "Düşük"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {!aiAnalysis.data.parsedData && !aiAnalysis.data.riskFeatures && (
            <div style={{ padding: spacing.md, backgroundColor: themeColors.gray[200], borderRadius: borderRadius.md, border: `1px solid ${themeColors.border}` }}>
              <p style={{ margin: 0, color: themeColors.text.secondary }}>Bu belge henüz AI tarafından analiz edilmemiş.</p>
            </div>
              )}
            </>
          )}

          {!aiLoading && !aiError && !aiAnalysis?.data && documentData.status === "PROCESSED" && (
            <div style={{ padding: spacing.md, backgroundColor: themeColors.gray[200], borderRadius: borderRadius.md, border: `1px solid ${themeColors.border}` }}>
              <p style={{ margin: 0, color: themeColors.text.secondary }}>Bu belge henüz AI tarafından analiz edilmemiş.</p>
              <p style={{ fontSize: typography.fontSize.sm, color: themeColors.text.secondary, marginTop: spacing.sm, margin: `${spacing.sm} 0 0 0` }}>
                Belge işlendi ancak AI analiz verisi bulunamadı. Bu durum genellikle belge işleme sırasında bir sorun olduğunu gösterir.
              </p>
            </div>
          )}
        </div>
            ),
          },
          {
            id: "risk",
            label: "Risk Analizi",
            icon: "AlertTriangle",
            content: (
        <div>
          {riskLoading && (
            <div style={{ padding: spacing.md }}>
              <Skeleton height="24px" width="200px" variant="text" style={{ marginBottom: spacing.md }} />
              <Skeleton height="100px" width="100%" variant="rectangular" style={{ marginBottom: spacing.md }} />
              <Skeleton height="20px" width="100%" variant="text" style={{ marginBottom: spacing.sm }} />
              <Skeleton height="20px" width="90%" variant="text" />
            </div>
          )}

          {!riskLoading && riskScoreData?.data?.riskScore && (
            <div style={{ padding: spacing.md, backgroundColor: themeColors.gray[50], borderRadius: borderRadius.md, border: `1px solid ${themeColors.border}` }}>
              <h2 style={{ marginBottom: spacing.md, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: themeColors.text.primary }}>Belge Risk Skoru</h2>
              <div style={{ marginBottom: spacing.lg }}>
                <div style={{ display: "flex", alignItems: "center", gap: spacing.md, marginBottom: spacing.md, flexWrap: "wrap" }}>
                  <div>
                    <strong style={{ color: themeColors.text.secondary }}>Risk Skoru:</strong>{" "}
                    <span
                      style={{
                        fontSize: typography.fontSize["2xl"],
                        fontWeight: typography.fontWeight.bold,
                        color:
                          riskScoreData.data.riskScore.severity === "high"
                            ? colors.danger
                            : riskScoreData.data.riskScore.severity === "medium"
                            ? colors.warning
                            : colors.success,
                      }}
                    >
                      {riskScoreData.data.riskScore.score}
                    </span>
                    /100
                  </div>
                  <div>
                    <strong style={{ color: themeColors.text.secondary }}>Şiddet:</strong>{" "}
                    <Badge
                      variant={
                        riskScoreData.data.riskScore.severity === "high"
                          ? "danger"
                          : riskScoreData.data.riskScore.severity === "medium"
                          ? "warning"
                          : "success"
                      }
                      size="sm"
                    >
                      {riskScoreData.data.riskScore.severity === "high"
                        ? "Yüksek"
                        : riskScoreData.data.riskScore.severity === "medium"
                        ? "Orta"
                        : "Düşük"}
                    </Badge>
                  </div>
                </div>
                <div style={{ fontSize: typography.fontSize.sm, color: themeColors.text.secondary }}>
                  Hesaplanma Tarihi: {new Date(riskScoreData.data.riskScore.generatedAt).toLocaleString("tr-TR")}
                </div>
              </div>

              {riskScoreData.data.triggeredRules.length > 0 && (
                <div>
                  <h3 style={{ marginBottom: spacing.md, fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: themeColors.text.primary }}>Tetiklenen Kurallar</h3>
                  <div style={{ display: "grid", gap: spacing.sm }}>
                    {riskScoreData.data.triggeredRules.map((rule, index) => (
                      <div
                        key={index}
                        style={{
                          padding: spacing.md,
                          backgroundColor: themeColors.white,
                          borderRadius: borderRadius.md,
                          border: `1px solid ${themeColors.border}`,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: spacing.xs, alignItems: "center", flexWrap: "wrap", gap: spacing.xs }}>
                          <strong style={{ color: themeColors.text.primary }}>{rule.code}</strong>
                          <Badge
                            variant={
                              rule.severity === "high"
                                ? "danger"
                                : rule.severity === "medium"
                                ? "warning"
                                : "success"
                            }
                            size="sm"
                          >
                            {rule.severity === "high" ? "Yüksek" : rule.severity === "medium" ? "Orta" : "Düşük"}
                          </Badge>
                        </div>
                        <div style={{ fontSize: typography.fontSize.sm, color: themeColors.text.secondary }}>{rule.description}</div>
                        <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted, marginTop: spacing.xs }}>
                          Ağırlık: {rule.weight}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {riskScoreData.data.triggeredRules.length === 0 && (
                <div style={{ padding: spacing.md, textAlign: "center", color: themeColors.text.secondary }}>
                  Bu belge için tetiklenen risk kuralı yok.
                </div>
              )}
            </div>
          )}

          {!riskLoading && (!riskScoreData?.data || !riskScoreData.data.riskScore) && (
            <div style={{ padding: spacing.md, backgroundColor: themeColors.gray[200], borderRadius: borderRadius.md, border: `1px solid ${themeColors.border}` }}>
              <p style={{ margin: 0, color: themeColors.text.secondary }}>
                {documentData.status === "FAILED"
                  ? "Bu belge işlenirken bir hata oluştu, bu nedenle risk skoru hesaplanamadı."
                  : documentData.status === "PROCESSING"
                  ? "Bu belge şu anda işleniyor. Risk skoru hesaplanınca burada görünecektir."
                  : "Bu belge için henüz risk skoru hesaplanmamış."}
              </p>
            </div>
          )}
        </div>
            ),
          },
        ]}
        defaultTab="details"
      />

      <Modal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        title="Belgeyi Sil"
        size="sm"
      >
        <div style={{ marginBottom: spacing.lg }}>
          <p>Bu belgeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.</p>
        </div>
        <div style={{ display: "flex", gap: spacing.md, justifyContent: "flex-end" }}>
          <Button variant="outline" onClick={() => setDeleteModal(false)}>
            İptal
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              deleteMutation.mutate(documentId);
              setDeleteModal(false);
            }}
            loading={deleteMutation.isPending}
          >
            Sil
          </Button>
        </div>
      </Modal>
    </div>
    </PageTransition>
  );
}

