"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDocument, deleteDocument, downloadDocument, getDocumentAIAnalysis, retryDocumentProcessing } from "@repo/api-client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useDocumentRiskScore } from "@/hooks/use-risk";
import { Button } from "@/components/ui/Button";

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
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"details" | "ai" | "risk">("details");

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
        a.download = documentData.originalFileName || `document-${documentId}`;
        window.document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        // Safely remove the element if it's still in the DOM
        if (a.parentNode) {
          a.parentNode.removeChild(a);
        }
      } catch (error) {
        console.error("Error downloading file:", error);
        alert("Dosya indirilirken bir hata oluştu.");
      }
    },
    onError: (error: Error) => {
      console.error("Download error:", error);
      alert(`Dosya indirilemedi: ${error.message}`);
    },
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => retryDocumentProcessing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document", documentId] });
      alert("Belge yeniden işleme için kuyruğa eklendi. İşlem birkaç dakika içinde başlayacak.");
    },
    onError: (error: Error) => {
      alert(`Hata: ${error.message}`);
    },
  });

  const handleDelete = () => {
    if (confirm("Bu belgeyi silmek istediğinize emin misiniz?")) {
      deleteMutation.mutate(documentId);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: "40px" }}>
        <p>Yükleniyor...</p>
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
              backgroundColor: "#dc3545",
              color: "white",
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
              backgroundColor: "#f5f5f5",
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
                  ? "#d4edda"
                  : documentData.status === "FAILED"
                  ? "#f8d7da"
                  : documentData.status === "PROCESSING"
                  ? "#fff3cd"
                  : "#e2e3e5",
              color:
                documentData.status === "PROCESSED"
                  ? "#155724"
                  : documentData.status === "FAILED"
                  ? "#721c24"
                  : documentData.status === "PROCESSING"
                  ? "#856404"
                  : "#383d41",
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
            <span style={{ color: "#dc3545" }}>{documentData.processingErrorMessage}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: "1px solid #ddd", marginBottom: "24px" }}>
        <div style={{ display: "flex", gap: "16px" }}>
          <button
            onClick={() => setActiveTab("details")}
            style={{
              padding: "8px 16px",
              border: "none",
              borderBottom: activeTab === "details" ? "2px solid #0066cc" : "2px solid transparent",
              backgroundColor: "transparent",
              cursor: "pointer",
              color: activeTab === "details" ? "#0066cc" : "inherit",
            }}
          >
            Detaylar
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            style={{
              padding: "8px 16px",
              border: "none",
              borderBottom: activeTab === "ai" ? "2px solid #0066cc" : "2px solid transparent",
              backgroundColor: "transparent",
              cursor: "pointer",
              color: activeTab === "ai" ? "#0066cc" : "inherit",
            }}
          >
            AI Analiz
          </button>
          <button
            onClick={() => setActiveTab("risk")}
            style={{
              padding: "8px 16px",
              border: "none",
              borderBottom: activeTab === "risk" ? "2px solid #0066cc" : "2px solid transparent",
              backgroundColor: "transparent",
              cursor: "pointer",
              color: activeTab === "risk" ? "#0066cc" : "inherit",
            }}
          >
            Risk Analizi
          </button>
        </div>
      </div>

      {activeTab === "details" && (
        <div>
          {documentData.status === "PROCESSING" && (
            <div style={{ padding: "16px", backgroundColor: "#fff3cd", borderRadius: "4px", marginBottom: "24px" }}>
              <p>Bu belge şu anda işleniyor.</p>
            </div>
          )}

          {documentData.status === "FAILED" && (
            <div style={{ padding: "16px", backgroundColor: "#f8d7da", borderRadius: "4px", marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ color: "#721c24", margin: 0, marginBottom: "8px" }}>
                    Belge işlenirken bir hata oluştu.
                  </p>
                  {documentData.processingErrorMessage && (
                    <p style={{ color: "#721c24", margin: 0, fontSize: "14px" }}>
                      <strong>Hata:</strong> {documentData.processingErrorMessage}
                    </p>
                  )}
                  <p style={{ color: "#721c24", margin: "8px 0 0 0", fontSize: "12px" }}>
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
          <div style={{ padding: "24px", backgroundColor: "#f8f9fa", borderRadius: "8px", marginBottom: "24px" }}>
            <h2 style={{ marginTop: 0, marginBottom: "20px", fontSize: "20px" }}>Belge Bilgileri</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <strong style={{ display: "block", marginBottom: "4px", color: "#666" }}>Dosya Adı</strong>
                <span>{documentData.originalFileName}</span>
              </div>
              <div>
                <strong style={{ display: "block", marginBottom: "4px", color: "#666" }}>Dosya Türü</strong>
                <span>{documentData.mimeType}</span>
              </div>
              <div>
                <strong style={{ display: "block", marginBottom: "4px", color: "#666" }}>Belge Türü</strong>
                <span>{TYPE_LABELS[documentData.type] || documentData.type}</span>
              </div>
              <div>
                <strong style={{ display: "block", marginBottom: "4px", color: "#666" }}>Yükleme Kaynağı</strong>
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
                <strong style={{ display: "block", marginBottom: "4px", color: "#666" }}>Dosya Boyutu</strong>
                <span>{(documentData.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
              <div>
                <strong style={{ display: "block", marginBottom: "4px", color: "#666" }}>Durum</strong>
                <span
                  style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    backgroundColor:
                      documentData.status === "PROCESSED"
                        ? "#d4edda"
                        : documentData.status === "FAILED"
                        ? "#f8d7da"
                        : documentData.status === "PROCESSING"
                        ? "#fff3cd"
                        : "#e2e3e5",
                    color:
                      documentData.status === "PROCESSED"
                        ? "#155724"
                        : documentData.status === "FAILED"
                        ? "#721c24"
                        : documentData.status === "PROCESSING"
                        ? "#856404"
                        : "#383d41",
                  }}
                >
                  {STATUS_LABELS[documentData.status] || documentData.status}
                </span>
              </div>
              <div>
                <strong style={{ display: "block", marginBottom: "4px", color: "#666" }}>Yükleme Tarihi</strong>
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
                  <strong style={{ display: "block", marginBottom: "4px", color: "#666" }}>İşlenme Tarihi</strong>
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
            <div style={{ padding: "24px", backgroundColor: "#f8f9fa", borderRadius: "8px", marginBottom: "24px" }}>
              <h2 style={{ marginTop: 0, marginBottom: "20px", fontSize: "20px" }}>İlişkili Kayıtlar</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {documentData.relatedInvoiceId && (
                  <div>
                    <strong style={{ display: "block", marginBottom: "4px", color: "#666" }}>İlişkili Fatura</strong>
                    <Link
                      href={`/faturalar/${documentData.relatedInvoiceId}`}
                      style={{ color: "#0066cc", textDecoration: "none" }}
                    >
                      Faturayı Görüntüle →
                    </Link>
                  </div>
                )}
                {documentData.relatedTransactionId && (
                  <div>
                    <strong style={{ display: "block", marginBottom: "4px", color: "#666" }}>
                      İlişkili İşlem
                    </strong>
                    <Link
                      href={`/islemler/${documentData.relatedTransactionId}`}
                      style={{ color: "#0066cc", textDecoration: "none" }}
                    >
                      İşlemi Görüntüle →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Client Company Link */}
          <div style={{ padding: "24px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
            <h2 style={{ marginTop: 0, marginBottom: "20px", fontSize: "20px" }}>Müşteri Bilgisi</h2>
            <div>
              <strong style={{ display: "block", marginBottom: "4px", color: "#666" }}>Müşteri Şirketi</strong>
              <Link
                href={`/musteriler/${documentData.clientCompanyId}`}
                style={{ color: "#0066cc", textDecoration: "none", fontSize: "16px" }}
              >
                Müşteri Detaylarını Görüntüle →
              </Link>
            </div>
          </div>
        </div>
      )}

      {activeTab === "ai" && (
        <div>
          {documentData.status === "PROCESSING" && (
            <div style={{ padding: "16px", backgroundColor: "#fff3cd", borderRadius: "4px", marginBottom: "24px" }}>
              <p>AI analizi hazırlanıyor...</p>
            </div>
          )}

          {documentData.status === "UPLOADED" && (
            <div style={{ padding: "16px", backgroundColor: "#e2e3e5", borderRadius: "4px", marginBottom: "24px" }}>
              <p>Bu belge henüz AI tarafından analiz edilmemiş.</p>
            </div>
          )}

          {aiError && (
            <div style={{ padding: "16px", backgroundColor: "#f8d7da", borderRadius: "4px", marginBottom: "24px" }}>
              <p style={{ color: "#721c24", margin: 0, marginBottom: "8px" }}>
                <strong>Hata:</strong> AI analizi yüklenirken bir hata oluştu.
              </p>
              <p style={{ color: "#721c24", margin: 0, fontSize: "14px", marginBottom: "8px" }}>
                {aiError instanceof Error ? aiError.message : "Bilinmeyen bir hata oluştu."}
              </p>
              <button
                onClick={() => refetchAIAnalysis()}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#dc3545",
                  color: "white",
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
            <div style={{ padding: "16px" }}>
              <p>AI analizi yükleniyor...</p>
            </div>
          )}

          {!aiLoading && aiAnalysis?.data && (
            <>
              {/* Extracted Fields Section */}
              {aiAnalysis.data.parsedData && (
                <div style={{ marginBottom: "24px", padding: "16px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
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
                <div style={{ marginBottom: "24px", padding: "16px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <h2>Risk Göstergeleri</h2>
                    {aiAnalysis.data.riskFeatures.riskScore !== null && (
                      <span
                        style={{
                          padding: "8px 16px",
                          borderRadius: "4px",
                          backgroundColor:
                            aiAnalysis.data.riskFeatures.riskScore >= 70
                              ? "#f8d7da"
                              : aiAnalysis.data.riskFeatures.riskScore >= 40
                              ? "#fff3cd"
                              : "#d4edda",
                          color:
                            aiAnalysis.data.riskFeatures.riskScore >= 70
                              ? "#721c24"
                              : aiAnalysis.data.riskFeatures.riskScore >= 40
                              ? "#856404"
                              : "#155724",
                          fontWeight: "bold",
                        }}
                      >
                        Risk Skoru: {aiAnalysis.data.riskFeatures.riskScore}
                      </span>
                    )}
                  </div>

                  {aiAnalysis.data.riskFeatures.riskFlags.length === 0 ? (
                    <p style={{ color: "#155724" }}>Risk Yok - Bu belgede risk göstergesi tespit edilmedi.</p>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid #ddd" }}>
                          <th style={{ padding: "12px", textAlign: "left" }}>Risk Kodu</th>
                          <th style={{ padding: "12px", textAlign: "left" }}>Açıklama</th>
                          <th style={{ padding: "12px", textAlign: "left" }}>Önem Derecesi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aiAnalysis.data.riskFeatures.riskFlags.map((flag, index) => (
                          <tr key={index} style={{ borderBottom: "1px solid #eee" }}>
                            <td style={{ padding: "12px" }}>{flag.code}</td>
                            <td style={{ padding: "12px" }}>{flag.description}</td>
                            <td style={{ padding: "12px" }}>
                              <span
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                  backgroundColor:
                                    flag.severity === "high"
                                      ? "#f8d7da"
                                      : flag.severity === "medium"
                                      ? "#fff3cd"
                                      : "#d4edda",
                                  color:
                                    flag.severity === "high"
                                      ? "#721c24"
                                      : flag.severity === "medium"
                                      ? "#856404"
                                      : "#155724",
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
                <div style={{ padding: "16px", backgroundColor: "#e2e3e5", borderRadius: "4px" }}>
                  <p>Bu belge henüz AI tarafından analiz edilmemiş.</p>
                </div>
              )}
            </>
          )}

          {!aiLoading && !aiError && !aiAnalysis?.data && documentData.status === "PROCESSED" && (
            <div style={{ padding: "16px", backgroundColor: "#e2e3e5", borderRadius: "4px" }}>
              <p>Bu belge henüz AI tarafından analiz edilmemiş.</p>
              <p style={{ fontSize: "14px", color: "#666", marginTop: "8px" }}>
                Belge işlendi ancak AI analiz verisi bulunamadı. Bu durum genellikle belge işleme sırasında bir sorun olduğunu gösterir.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === "risk" && (
        <div>
          {riskLoading && (
            <div style={{ padding: "16px" }}>
              <p>Risk skoru yükleniyor...</p>
            </div>
          )}

          {!riskLoading && riskScoreData?.data?.riskScore && (
            <div style={{ padding: "16px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
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
                            ? "#dc2626"
                            : riskScoreData.data.riskScore.severity === "medium"
                            ? "#f59e0b"
                            : "#10b981",
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
                            ? "#dc262620"
                            : riskScoreData.data.riskScore.severity === "medium"
                            ? "#f59e0b20"
                            : "#10b98120",
                        color:
                          riskScoreData.data.riskScore.severity === "high"
                            ? "#dc2626"
                            : riskScoreData.data.riskScore.severity === "medium"
                            ? "#f59e0b"
                            : "#10b981",
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
                <div style={{ fontSize: "14px", color: "#666" }}>
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
                          backgroundColor: "#fff",
                          borderRadius: "4px",
                          border: "1px solid #e0e0e0",
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
                                  ? "#dc262620"
                                  : rule.severity === "medium"
                                  ? "#f59e0b20"
                                  : "#10b98120",
                              color:
                                rule.severity === "high"
                                  ? "#dc2626"
                                  : rule.severity === "medium"
                                  ? "#f59e0b"
                                  : "#10b981",
                            }}
                          >
                            {rule.severity === "high" ? "Yüksek" : rule.severity === "medium" ? "Orta" : "Düşük"}
                          </span>
                        </div>
                        <div style={{ fontSize: "14px", color: "#666" }}>{rule.description}</div>
                        <div style={{ fontSize: "12px", color: "#999", marginTop: "4px" }}>
                          Ağırlık: {rule.weight}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {riskScoreData.data.triggeredRules.length === 0 && (
                <div style={{ padding: "16px", textAlign: "center", color: "#666" }}>
                  Bu belge için tetiklenen risk kuralı yok.
                </div>
              )}
            </div>
          )}

          {!riskLoading && (!riskScoreData?.data || !riskScoreData.data.riskScore) && (
            <div style={{ padding: "16px", backgroundColor: "#e2e3e5", borderRadius: "4px" }}>
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
      )}
    </div>
  );
}

