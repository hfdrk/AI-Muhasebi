"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listDocuments, deleteDocument, downloadDocument, type DocumentWithRiskFlags } from "@repo/api-client";
import { documents as documentsI18n, common as commonI18n } from "@repo/i18n";
import Link from "next/link";
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

interface DocumentListProps {
  clientCompanyId: string;
  onUploadClick?: () => void;
  canUpload?: boolean;
  canDelete?: boolean;
}

export function DocumentList({ clientCompanyId, onUploadClick, canUpload = true, canDelete = true }: DocumentListProps) {
  const { themeColors } = useTheme();
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["documents", clientCompanyId, typeFilter, statusFilter, dateFrom, dateTo, page],
    queryFn: () =>
      listDocuments({
        clientCompanyId,
        type: typeFilter !== "all" ? (typeFilter as any) : undefined,
        status: statusFilter !== "all" ? (statusFilter as any) : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        pageSize,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (documentId: string) => deleteDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", clientCompanyId] });
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const blob = await downloadDocument(documentId);
      return blob;
    },
    onSuccess: (blob, documentId) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `document-${documentId}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      // Safely remove the element if it's still in the DOM
      if (a.parentNode) {
        a.parentNode.removeChild(a);
      }
    },
  });

  const handleDelete = (documentId: string) => {
    if (confirm("Bu belgeyi silmek istediğinize emin misiniz?")) {
      deleteMutation.mutate(documentId);
    }
  };

  const documents = (data?.data.data || []) as DocumentWithRiskFlags[];
  const pagination = data?.data || { total: 0, page: 1, pageSize: 20, totalPages: 1 };

  const filterSelectStyle = {
    padding: `${spacing.sm} ${spacing.md}`,
    border: `1px solid ${themeColors.border}`,
    borderRadius: borderRadius.sm,
    fontSize: typography.fontSize.base,
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg }}>
        <h2>Belgeler</h2>
        {canUpload && onUploadClick && (
          <button
            onClick={onUploadClick}
            style={{
              padding: `${spacing.sm} ${spacing.md}`,
              backgroundColor: colors.primary,
              color: colors.white,
              border: "none",
              borderRadius: borderRadius.sm,
              cursor: "pointer",
            }}
          >
            Belge Yükle
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.lg }}>
        <div>
          <label style={{ display: "block", marginBottom: spacing.xs, fontSize: typography.fontSize.sm }}>Belge Türü</label>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            style={filterSelectStyle}
          >
            <option value="all">Tümü</option>
            <option value="INVOICE">Fatura</option>
            <option value="BANK_STATEMENT">Banka Ekstresi</option>
            <option value="RECEIPT">Dekont</option>
            <option value="OTHER">Diğer</option>
          </select>
        </div>
        <div>
          <label style={{ display: "block", marginBottom: spacing.xs, fontSize: typography.fontSize.sm }}>Durum</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={filterSelectStyle}
          >
            <option value="all">Tümü</option>
            <option value="UPLOADED">Yüklendi</option>
            <option value="PROCESSING">İşleniyor</option>
            <option value="PROCESSED">İşlendi</option>
            <option value="FAILED">Hata</option>
          </select>
        </div>
        <div>
          <label style={{ display: "block", marginBottom: spacing.xs, fontSize: typography.fontSize.sm }}>Başlangıç Tarihi</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            style={filterSelectStyle}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: spacing.xs, fontSize: typography.fontSize.sm }}>Bitiş Tarihi</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            style={filterSelectStyle}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: spacing.xs, fontSize: typography.fontSize.sm }}>Risk Durumu</label>
          <select
            value={riskFilter}
            onChange={(e) => {
              setRiskFilter(e.target.value);
              setPage(1);
            }}
            style={filterSelectStyle}
          >
            <option value="all">Tümü</option>
            <option value="no-risk">Risk Yok</option>
            <option value="has-risk">Risk Var</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <p>{commonI18n.labels.loading}</p>
      ) : documents.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <p>{documentsI18n.list.emptyState}</p>
          {canUpload && onUploadClick && (
            <button
              onClick={onUploadClick}
              style={{
                display: "inline-block",
                marginTop: spacing.md,
                padding: `${spacing.sm} ${spacing.md}`,
                backgroundColor: colors.primary,
                color: colors.white,
                border: "none",
                borderRadius: borderRadius.sm,
                cursor: "pointer",
              }}
            >
              {documentsI18n.list.upload}
            </button>
          )}
        </div>
      ) : (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${themeColors.border}` }}>
                <th style={{ padding: spacing.md, textAlign: "left" }}>Dosya Adı</th>
                <th style={{ padding: spacing.md, textAlign: "left" }}>Belge Türü</th>
                <th style={{ padding: spacing.md, textAlign: "left" }}>Durum</th>
                <th style={{ padding: spacing.md, textAlign: "left" }}>Yükleme Tarihi</th>
                <th style={{ padding: spacing.md, textAlign: "left" }}>İşlenme Tarihi</th>
                <th style={{ padding: spacing.md, textAlign: "left" }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {documents
                .filter((document) => {
                  if (riskFilter === "no-risk") {
                    return (document.riskFlagCount || 0) === 0;
                  }
                  if (riskFilter === "has-risk") {
                    return (document.riskFlagCount || 0) > 0;
                  }
                  return true;
                })
                .map((document) => (
                <tr key={document.id} style={{ borderBottom: `1px solid ${themeColors.gray[200]}` }}>
                  <td style={{ padding: spacing.md }}>
                    <Link
                      href={`/belgeler/${document.id}`}
                      style={{ color: colors.primary, textDecoration: "none" }}
                    >
                      {document.originalFileName}
                    </Link>
                  </td>
                  <td style={{ padding: spacing.md }}>{TYPE_LABELS[document.type] || document.type}</td>
                  <td style={{ padding: spacing.md }}>
                    <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
                      <span
                        style={{
                          padding: `${spacing.xs} ${spacing.sm}`,
                          borderRadius: borderRadius.sm,
                          backgroundColor:
                            document.status === "PROCESSED"
                              ? themeColors.successLight
                              : document.status === "FAILED"
                              ? themeColors.dangerLight
                              : document.status === "PROCESSING"
                              ? themeColors.warningLight
                              : themeColors.gray[200],
                          color:
                            document.status === "PROCESSED"
                              ? themeColors.successDark
                              : document.status === "FAILED"
                              ? themeColors.dangerDark
                              : document.status === "PROCESSING"
                              ? themeColors.warningDark
                              : themeColors.text.secondary,
                          fontSize: typography.fontSize.xs,
                        }}
                      >
                        {STATUS_LABELS[document.status] || document.status}
                      </span>
                      {document.status === "PROCESSED" && (
                        <span
                          title={
                            (document.riskFlagCount || 0) === 0
                              ? "Bu belge AI tarafından analiz edilmiş ve risk göstergesi tespit edilmemiştir."
                              : `Bu belge AI tarafından analiz edilmiş ve ${document.riskFlagCount} adet risk göstergesi tespit edilmiştir.`
                          }
                          style={{
                            padding: `${spacing.xs} ${spacing.sm}`,
                            borderRadius: borderRadius.sm,
                            backgroundColor: (document.riskFlagCount || 0) === 0 ? themeColors.successLight : themeColors.dangerLight,
                            color: (document.riskFlagCount || 0) === 0 ? themeColors.successDark : themeColors.dangerDark,
                            fontSize: typography.fontSize.xs,
                            cursor: "help",
                          }}
                        >
                          {(document.riskFlagCount || 0) === 0 ? "Risk Yok" : `${document.riskFlagCount} Risk`}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: spacing.md }}>
                    {new Date(document.createdAt).toLocaleDateString("tr-TR")}
                  </td>
                  <td style={{ padding: spacing.md }}>
                    {document.processedAt ? new Date(document.processedAt).toLocaleDateString("tr-TR") : "-"}
                  </td>
                  <td style={{ padding: spacing.md }}>
                    <div style={{ display: "flex", gap: spacing.sm }}>
                      <Link
                        href={`/belgeler/${document.id}`}
                        style={{
                          padding: `${spacing.xs} ${spacing.sm}`,
                          color: colors.primary,
                          textDecoration: "none",
                          fontSize: typography.fontSize.sm,
                        }}
                      >
                        Görüntüle
                      </Link>
                      <button
                        onClick={() => downloadMutation.mutate(document.id)}
                        disabled={downloadMutation.isPending}
                        style={{
                          padding: `${spacing.xs} ${spacing.sm}`,
                          color: colors.primary,
                          border: `1px solid ${colors.primary}`,
                          borderRadius: borderRadius.sm,
                          cursor: downloadMutation.isPending ? "not-allowed" : "pointer",
                          fontSize: typography.fontSize.sm,
                          backgroundColor: "transparent",
                        }}
                      >
                        İndir
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(document.id)}
                          disabled={deleteMutation.isPending}
                          style={{
                            padding: `${spacing.xs} ${spacing.sm}`,
                            color: colors.danger,
                            border: `1px solid ${colors.danger}`,
                            borderRadius: borderRadius.sm,
                            cursor: deleteMutation.isPending ? "not-allowed" : "pointer",
                            fontSize: typography.fontSize.sm,
                            backgroundColor: "transparent",
                          }}
                        >
                          Sil
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pagination.totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: spacing.sm, marginTop: spacing.lg }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: `${spacing.sm} ${spacing.md}`,
                  border: `1px solid ${themeColors.border}`,
                  borderRadius: borderRadius.sm,
                  cursor: page === 1 ? "not-allowed" : "pointer",
                  opacity: page === 1 ? 0.5 : 1,
                }}
              >
                Önceki
              </button>
              <span style={{ padding: `${spacing.sm} ${spacing.md}`, display: "flex", alignItems: "center" }}>
                Sayfa {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                style={{
                  padding: `${spacing.sm} ${spacing.md}`,
                  border: `1px solid ${themeColors.border}`,
                  borderRadius: borderRadius.sm,
                  cursor: page === pagination.totalPages ? "not-allowed" : "pointer",
                  opacity: page === pagination.totalPages ? 0.5 : 1,
                }}
              >
                Sonraki
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
