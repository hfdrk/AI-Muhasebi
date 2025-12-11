"use client";

import { useQuery } from "@tanstack/react-query";
import { getDocument, downloadDocument, getDocumentAIAnalysis } from "@repo/api-client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useDocumentRiskScore } from "@/hooks/use-risk";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { colors, spacing } from "@/styles/design-system";

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

function formatDate(date: Date | string | null): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("tr-TR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ClientDocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;
  const [activeTab, setActiveTab] = useState<"details" | "ai" | "risk">("details");
  const [downloading, setDownloading] = useState(false);

  const { data: document, isLoading } = useQuery({
    queryKey: ["document", documentId],
    queryFn: () => getDocument(documentId),
    enabled: !!documentId,
  });

  const { data: aiAnalysis, isLoading: aiLoading } = useQuery({
    queryKey: ["document-ai", documentId],
    queryFn: () => getDocumentAIAnalysis(documentId),
    enabled: !!documentId && !!document?.data && document.data.status === "PROCESSED",
  });

  const { data: riskScoreData, isLoading: riskLoading } = useDocumentRiskScore(documentId);

  const handleDownload = async () => {
    if (!documentId) return;
    setDownloading(true);
    try {
      const blob = await downloadDocument(documentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = documentData.originalFileName || `document-${documentId}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      alert(`Dosya indirilemedi: ${error.message}`);
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Belge Detayı" />
        <Card>
          <div style={{ padding: spacing.xl, textAlign: "center", color: colors.text.secondary }}>
            Yükleniyor...
          </div>
        </Card>
      </div>
    );
  }

  const documentData = document?.data;
  if (!documentData) {
    return (
      <div>
        <PageHeader title="Belge Detayı" />
        <Card>
          <div style={{ padding: spacing.xl, textAlign: "center", color: colors.text.secondary }}>
            <div style={{ fontSize: "48px", marginBottom: spacing.md }}>❌</div>
            <div>Belge bulunamadı.</div>
            <Link href="/client/documents" style={{ color: colors.primary, textDecoration: "none", marginTop: spacing.md, display: "inline-block" }}>
              ← Belgelerime Dön
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const riskScore = riskScoreData?.data;
  const aiData = aiAnalysis?.data;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg }}>
        <Link href="/client/documents" style={{ color: colors.primary, textDecoration: "none", fontSize: "18px" }}>
          ←
        </Link>
        <PageHeader title={documentData.originalFileName || "Belge Detayı"} />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: spacing.md, marginBottom: spacing.lg }}>
        <Button onClick={handleDownload} disabled={downloading}>
          {downloading ? "İndiriliyor..." : "📥 İndir"}
        </Button>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: `1px solid ${colors.gray[300]}`, marginBottom: spacing.lg }}>
        <div style={{ display: "flex", gap: spacing.md }}>
          <button
            onClick={() => setActiveTab("details")}
            style={{
              padding: `${spacing.sm} ${spacing.md}`,
              border: "none",
              borderBottom: activeTab === "details" ? `2px solid ${colors.primary}` : "2px solid transparent",
              backgroundColor: "transparent",
              cursor: "pointer",
              color: activeTab === "details" ? colors.primary : colors.text.secondary,
              fontWeight: activeTab === "details" ? "semibold" : "normal",
            }}
          >
            Detaylar
          </button>
          {documentData.status === "PROCESSED" && (
            <>
              <button
                onClick={() => setActiveTab("ai")}
                style={{
                  padding: `${spacing.sm} ${spacing.md}`,
                  border: "none",
                  borderBottom: activeTab === "ai" ? `2px solid ${colors.primary}` : "2px solid transparent",
                  backgroundColor: "transparent",
                  cursor: "pointer",
                  color: activeTab === "ai" ? colors.primary : colors.text.secondary,
                  fontWeight: activeTab === "ai" ? "semibold" : "normal",
                }}
              >
                AI Analizi
              </button>
              <button
                onClick={() => setActiveTab("risk")}
                style={{
                  padding: `${spacing.sm} ${spacing.md}`,
                  border: "none",
                  borderBottom: activeTab === "risk" ? `2px solid ${colors.primary}` : "2px solid transparent",
                  backgroundColor: "transparent",
                  cursor: "pointer",
                  color: activeTab === "risk" ? colors.primary : colors.text.secondary,
                  fontWeight: activeTab === "risk" ? "semibold" : "normal",
                }}
              >
                Risk Skoru
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "details" && (
        <Card>
          <div style={{ padding: spacing.lg }}>
            <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: spacing.md, marginBottom: spacing.md }}>
              <div style={{ color: colors.text.secondary, fontSize: "14px" }}>Dosya Adı:</div>
              <div style={{ fontWeight: "medium" }}>{documentData.originalFileName}</div>

              <div style={{ color: colors.text.secondary, fontSize: "14px" }}>Tip:</div>
              <div>{TYPE_LABELS[documentData.type] || documentData.type}</div>

              <div style={{ color: colors.text.secondary, fontSize: "14px" }}>Durum:</div>
              <div>
                <span
                  style={{
                    padding: `${spacing.xs} ${spacing.sm}`,
                    borderRadius: "4px",
                    backgroundColor:
                      documentData.status === "PROCESSED"
                        ? colors.success + "20"
                        : documentData.status === "PROCESSING"
                        ? colors.primary + "20"
                        : documentData.status === "FAILED"
                        ? colors.error + "20"
                        : colors.gray[200],
                    color:
                      documentData.status === "PROCESSED"
                        ? colors.success
                        : documentData.status === "PROCESSING"
                        ? colors.primary
                        : documentData.status === "FAILED"
                        ? colors.error
                        : colors.text.secondary,
                    fontSize: "12px",
                    fontWeight: "medium",
                  }}
                >
                  {STATUS_LABELS[documentData.status] || documentData.status}
                </span>
              </div>

              <div style={{ color: colors.text.secondary, fontSize: "14px" }}>Dosya Boyutu:</div>
              <div>{formatFileSize(Number(documentData.fileSizeBytes))}</div>

              <div style={{ color: colors.text.secondary, fontSize: "14px" }}>Yüklenme Tarihi:</div>
              <div>{formatDate(documentData.createdAt)}</div>

              {documentData.processedAt && (
                <>
                  <div style={{ color: colors.text.secondary, fontSize: "14px" }}>İşlenme Tarihi:</div>
                  <div>{formatDate(documentData.processedAt)}</div>
                </>
              )}

              {documentData.processingErrorMessage && (
                <>
                  <div style={{ color: colors.text.secondary, fontSize: "14px" }}>Hata:</div>
                  <div style={{ color: colors.error }}>{documentData.processingErrorMessage}</div>
                </>
              )}
            </div>
          </div>
        </Card>
      )}

      {activeTab === "ai" && documentData.status === "PROCESSED" && (
        <Card>
          <div style={{ padding: spacing.lg }}>
            {aiLoading ? (
              <div style={{ textAlign: "center", color: colors.text.secondary }}>AI analizi yükleniyor...</div>
            ) : aiData ? (
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: "semibold", marginBottom: spacing.md }}>AI Analiz Sonuçları</h3>
                <pre
                  style={{
                    backgroundColor: colors.gray[50],
                    padding: spacing.md,
                    borderRadius: "6px",
                    overflow: "auto",
                    fontSize: "14px",
                    lineHeight: "1.6",
                  }}
                >
                  {JSON.stringify(aiData, null, 2)}
                </pre>
              </div>
            ) : (
              <div style={{ textAlign: "center", color: colors.text.secondary }}>
                AI analizi henüz mevcut değil.
              </div>
            )}
          </div>
        </Card>
      )}

      {activeTab === "risk" && documentData.status === "PROCESSED" && (
        <Card>
          <div style={{ padding: spacing.lg }}>
            {riskLoading ? (
              <div style={{ textAlign: "center", color: colors.text.secondary }}>Risk skoru yükleniyor...</div>
            ) : riskScore?.riskScore ? (
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: "semibold", marginBottom: spacing.md }}>Risk Skoru</h3>
                <div
                  style={{
                    fontSize: "48px",
                    fontWeight: "bold",
                    color:
                      riskScore.riskScore.severity === "high"
                        ? colors.error
                        : riskScore.riskScore.severity === "medium"
                        ? "#FFA500"
                        : colors.success,
                    marginBottom: spacing.sm,
                  }}
                >
                  {Number(riskScore.riskScore.score).toFixed(0)}
                </div>
                <div style={{ color: colors.text.secondary, marginBottom: spacing.md }}>
                  Şiddet: {riskScore.riskScore.severity === "high" ? "Yüksek" : riskScore.riskScore.severity === "medium" ? "Orta" : "Düşük"}
                </div>
                {riskScore.riskScore.explanation && (
                  <div style={{ marginTop: spacing.md }}>
                    <div style={{ fontWeight: "medium", marginBottom: spacing.xs }}>Açıklama:</div>
                    <div style={{ color: colors.text.secondary, lineHeight: "1.6" }}>
                      {riskScore.riskScore.explanation}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: "center", color: colors.text.secondary }}>
                Risk skoru henüz hesaplanmadı.
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
