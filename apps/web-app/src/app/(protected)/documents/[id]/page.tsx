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
import { PageTransition } from "@/components/ui/PageTransition";
import { Tabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/lib/toast";
import { colors, spacing, borderRadius } from "@/styles/design-system";
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
              backgroundColor: themeColors.gray[50],
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
                  : themeColors.gray[100],
              color:
                documentData.status === "PROCESSED"
                  ? colors.successDark
                  : documentData.status === "FAILED"
                  ? colors.dangerDark
                  : documentData.status === "PROCESSING"
                  ? colors.warningDark
                  : themeColors.text.secondary,
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
            <div style={{ padding: "16px", backgroundColor: colors.warningLight, borderRadius: "4px", marginBottom: "24px" }}>
              <p>Bu belge şu anda işleniyor.</p>
            </div>
          )}

          {documentData.status === "FAILED" && (
            <div style={{ padding: "16px", backgroundColor: colors.dangerLight, borderRadius: "4px", marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ color: colors.dangerDark, margin: 0, marginBottom: "8px" }}>
                    Belge işlenirken bir hata oluştu.
                  </p>
                  {documentData.processingErrorMessage && (
                    <p style={{ color: colors.dangerDark, margin: 0, fontSize: "14px" }}>
                      <strong>Hata:</strong> {documentData.processingErrorMessage}
                    </p>
                  )}
                  <p style={{ color: colors.dangerDark, margin: "8px 0 0 0", fontSize: "12px" }}>
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
          <div style={{ padding: "24px", backgroundColor: themeColors.gray[50], borderRadius: "8px", marginBottom: "24px" }}>
            <h2 style={{ marginTop: 0, marginBottom: "20px", fontSize: "20px" }}>Belge Bilgileri</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <strong style={{ display: "block", marginBottom: "4px", color: themeColors.text.secondary }}>Dosya Adı</strong>
                <span>{documentData.originalFileName}</span>
              </div>
              <div>
                <strong style={{ display: "block", marginBottom: "4px", color: themeColors.text.secondary }}>Dosya Türü</strong>
                <span>{documentData.mimeType}</span>
              </div>
              <div>
                <strong style={{ display: "block", marginBottom: "4px", color: themeColors.text.secondary }}>Belge Türü</strong>
                <span>{TYPE_LABELS[documentData.type] || documentData.type}</span>
              </div>
              <div>
                <strong style={{ display: "block", marginBottom: "4px", color: themeColors.text.secondary }}>Yükleme Kaynağı</strong>
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
                <strong style={{ display: "block", marginBottom: "4px", color: themeColors.text.secondary }}>Dosya Boyutu</strong>
                <span>{(documentData.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
              <div>
                <strong style={{ display: "block", marginBottom: "4px", color: themeColors.text.secondary }}>Durum</strong>
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
                <strong style={{ display: "block", marginBottom: "4px", color: themeColors.text.secondary }}>Yükleme Tarihi</strong>
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
                  <strong style={{ display: "block", marginBottom: "4px", color: themeColors.text.secondary }}>İşlenme Tarihi</strong>
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
            <div style={{ padding: "24px", backgroundColor: themeColors.gray[50], borderRadius: "8px", marginBottom: "24px" }}>
              <h2 style={{ marginTop: 0, marginBottom: "20px", fontSize: "20px" }}>İlişkili Kayıtlar</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {documentData.relatedInvoiceId && (
                  <div>
                    <strong style={{ display: "block", marginBottom: "4px", color: themeColors.text.secondary }}>İlişkili Fatura</strong>
                    <Link
                      href={`/invoices/${documentData.relatedInvoiceId}`}
                      style={{ color: colors.primary, textDecoration: "none" }}
                    >
                      Faturayı Görüntüle →
                    </Link>
                  </div>
                )}
                {documentData.relatedTransactionId && (
                  <div>
                    <strong style={{ display: "block", marginBottom: "4px", color: themeColors.text.secondary }}>
                      İlişkili İşlem
                    </strong>
                    <Link
                      href={`/transactions/${documentData.relatedTransactionId}`}
                      style={{ color: colors.primary, textDecoration: "none" }}
                    >
                      İşlemi Görüntüle →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Client Company Link */}
          <div style={{ padding: "24px", backgroundColor: themeColors.gray[50], borderRadius: "8px" }}>
            <h2 style={{ marginTop: 0, marginBottom: "20px", fontSize: "20px" }}>Müşteri Bilgisi</h2>
            <div>
              <strong style={{ display: "block", marginBottom: "4px", color: themeColors.text.secondary }}>Müşteri Şirketi</strong>
              <Link
                href={`/musteriler/${documentData.clientCompanyId}`}
                style={{ color: colors.primary, textDecoration: "none", fontSize: "16px" }}
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
            <div style={{ padding: "16px", backgroundColor: themeColors.gray[200], borderRadius: "4px", marginBottom: "24px" }}>
              <p>Bu belge henüz AI tarafından analiz edilmemiş.</p>
            </div>
          )}

          {aiError && (
            <div style={{ padding: "16px", backgroundColor: colors.dangerLight, borderRadius: "4px", marginBottom: "24px" }}>
              <p style={{ color: colors.dangerDark, margin: 0, marginBottom: "8px" }}>
                <strong>Hata:</strong> AI analizi yüklenirken bir hata oluştu.
              </p>
              <p style={{ color: colors.dangerDark, margin: 0, fontSize: "14px", marginBottom: "8px" }}>
                {aiError instanceof Error ? aiError.message : "Bilinmeyen bir hata oluştu."}
              </p>
              <button
                onClick={() => refetchAIAnalysis()}
                style={{
                  padding: "8px 16px",
                  backgroundColor: colors.danger,
                  color: colors.white,
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Tekrar Dene
              </button>
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
                <div style={{ marginBottom: "24px", padding: "16px", backgroundColor: themeColors.gray[50], borderRadius: "4px" }}>
                  <h2 style={{ marginBottom: "16px" }}>Çıkarılan Alanlar</h2>
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
                      {aiAnalysis.data.parsedData.fields.totalAmount !== null && (
                        <div>
                          <strong>Toplam Tutar:</strong> {aiAnalysis.data.parsedData.fields.totalAmount} {aiAnalysis.data.parsedData.fields.currency || "TRY"}
                        </div>
                      )}
                      {aiAnalysis.data.parsedData.fields.netAmount !== null && (
                        <div>
                          <strong>Net Tutar:</strong> {aiAnalysis.data.parsedData.fields.netAmount} {aiAnalysis.data.parsedData.fields.currency || "TRY"}
                        </div>
                      )}
                      {aiAnalysis.data.parsedData.fields.taxAmount !== null && (
                        <div>
                          <strong>KDV Tutarı:</strong> {aiAnalysis.data.parsedData.fields.taxAmount} {aiAnalysis.data.parsedData.fields.currency || "TRY"}
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
                <div style={{ marginBottom: "24px", padding: "16px", backgroundColor: themeColors.gray[50], borderRadius: "4px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <h2>Risk Göstergeleri</h2>
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
                <div style={{ padding: "16px", backgroundColor: themeColors.gray[200], borderRadius: "4px" }}>
                  <p>Bu belge henüz AI tarafından analiz edilmemiş.</p>
                </div>
              )}
            </>
          )}

          {!aiLoading && !aiError && !aiAnalysis?.data && documentData.status === "PROCESSED" && (
            <div style={{ padding: "16px", backgroundColor: themeColors.gray[200], borderRadius: "4px" }}>
              <p>Bu belge henüz AI tarafından analiz edilmemiş.</p>
              <p style={{ fontSize: "14px", color: themeColors.text.secondary, marginTop: "8px" }}>
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
            <div style={{ padding: "16px", backgroundColor: themeColors.gray[50], borderRadius: "4px" }}>
              <h2 style={{ marginBottom: "16px" }}>Belge Risk Skoru</h2>
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "12px" }}>
                  <div>
                    <strong>Risk Skoru:</strong>{" "}
                    <span
                      style={{
                        fontSize: "24px",
                        fontWeight: "bold",
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
                    <strong>Şiddet:</strong>{" "}
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "14px",
                        fontWeight: "500",
                        backgroundColor:
                          riskScoreData.data.riskScore.severity === "high"
                            ? `${colors.danger}20`
                            : riskScoreData.data.riskScore.severity === "medium"
                            ? `${colors.warning}20`
                            : `${colors.success}20`,
                        color:
                          riskScoreData.data.riskScore.severity === "high"
                            ? colors.danger
                            : riskScoreData.data.riskScore.severity === "medium"
                            ? colors.warning
                            : colors.success,
                      }}
                    >
                      {riskScoreData.data.riskScore.severity === "high"
                        ? "Yüksek"
                        : riskScoreData.data.riskScore.severity === "medium"
                        ? "Orta"
                        : "Düşük"}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: "14px", color: themeColors.text.secondary }}>
                  Hesaplanma Tarihi: {new Date(riskScoreData.data.riskScore.generatedAt).toLocaleString("tr-TR")}
                </div>
              </div>

              {riskScoreData.data.triggeredRules.length > 0 && (
                <div>
                  <h3 style={{ marginBottom: "12px" }}>Tetiklenen Kurallar</h3>
                  <div style={{ display: "grid", gap: "8px" }}>
                    {riskScoreData.data.triggeredRules.map((rule, index) => (
                      <div
                        key={index}
                        style={{
                          padding: "12px",
                          backgroundColor: themeColors.white,
                          borderRadius: "4px",
                          border: `1px solid ${themeColors.border}`,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                          <strong>{rule.code}</strong>
                          <span
                            style={{
                              padding: "2px 6px",
                              borderRadius: "4px",
                              fontSize: "12px",
                              backgroundColor:
                                rule.severity === "high"
                                  ? `${colors.danger}20`
                                  : rule.severity === "medium"
                                  ? `${colors.warning}20`
                                  : `${colors.success}20`,
                              color:
                                rule.severity === "high"
                                  ? colors.danger
                                  : rule.severity === "medium"
                                  ? colors.warning
                                  : colors.success,
                            }}
                          >
                            {rule.severity === "high" ? "Yüksek" : rule.severity === "medium" ? "Orta" : "Düşük"}
                          </span>
                        </div>
                        <div style={{ fontSize: "14px", color: themeColors.text.secondary }}>{rule.description}</div>
                        <div style={{ fontSize: "12px", color: themeColors.text.muted, marginTop: "4px" }}>
                          Ağırlık: {rule.weight}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {riskScoreData.data.triggeredRules.length === 0 && (
                <div style={{ padding: "16px", textAlign: "center", color: themeColors.text.secondary }}>
                  Bu belge için tetiklenen risk kuralı yok.
                </div>
              )}
            </div>
          )}

          {!riskLoading && (!riskScoreData?.data || !riskScoreData.data.riskScore) && (
            <div style={{ padding: "16px", backgroundColor: themeColors.gray[200], borderRadius: "4px" }}>
              <p>
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

