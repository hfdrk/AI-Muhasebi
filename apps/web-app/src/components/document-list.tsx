"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listDocuments, deleteDocument, downloadDocument, type DocumentWithRiskFlags } from "@repo/api-client";
import { documents as documentsI18n, common as commonI18n } from "@repo/i18n";
import Link from "next/link";

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
      document.body.removeChild(a);
    },
  });

  const handleDelete = (documentId: string) => {
    if (confirm("Bu belgeyi silmek istediğinize emin misiniz?")) {
      deleteMutation.mutate(documentId);
    }
  };

  const documents = (data?.data.data || []) as DocumentWithRiskFlags[];
  const pagination = data?.data || { total: 0, page: 1, pageSize: 20, totalPages: 1 };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h2>Belgeler</h2>
        {canUpload && onUploadClick && (
          <button
            onClick={onUploadClick}
            style={{
              padding: "8px 16px",
              backgroundColor: "#0066cc",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Belge Yükle
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
        <div>
          <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>Belge Türü</label>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "16px",
            }}
          >
            <option value="all">Tümü</option>
            <option value="INVOICE">Fatura</option>
            <option value="BANK_STATEMENT">Banka Ekstresi</option>
            <option value="RECEIPT">Dekont</option>
            <option value="OTHER">Diğer</option>
          </select>
        </div>
        <div>
          <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>Durum</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "16px",
            }}
          >
            <option value="all">Tümü</option>
            <option value="UPLOADED">Yüklendi</option>
            <option value="PROCESSING">İşleniyor</option>
            <option value="PROCESSED">İşlendi</option>
            <option value="FAILED">Hata</option>
          </select>
        </div>
        <div>
          <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>Başlangıç Tarihi</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            style={{
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "16px",
            }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>Bitiş Tarihi</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            style={{
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "16px",
            }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>Risk Durumu</label>
          <select
            value={riskFilter}
            onChange={(e) => {
              setRiskFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "16px",
            }}
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
                marginTop: "16px",
                padding: "8px 16px",
                backgroundColor: "#0066cc",
                color: "white",
                border: "none",
                borderRadius: "4px",
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
              <tr style={{ borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: "12px", textAlign: "left" }}>Dosya Adı</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Belge Türü</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Durum</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Yükleme Tarihi</th>
                <th style={{ padding: "12px", textAlign: "left" }}>İşlenme Tarihi</th>
                <th style={{ padding: "12px", textAlign: "left" }}>İşlemler</th>
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
                <tr key={document.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "12px" }}>
                    <Link
                      href={`/documents/${document.id}`}
                      style={{ color: "#0066cc", textDecoration: "none" }}
                    >
                      {document.originalFileName}
                    </Link>
                  </td>
                  <td style={{ padding: "12px" }}>{TYPE_LABELS[document.type] || document.type}</td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          backgroundColor:
                            document.status === "PROCESSED"
                              ? "#d4edda"
                              : document.status === "FAILED"
                              ? "#f8d7da"
                              : document.status === "PROCESSING"
                              ? "#fff3cd"
                              : "#e2e3e5",
                          color:
                            document.status === "PROCESSED"
                              ? "#155724"
                              : document.status === "FAILED"
                              ? "#721c24"
                              : document.status === "PROCESSING"
                              ? "#856404"
                              : "#383d41",
                          fontSize: "12px",
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
                            padding: "4px 8px",
                            borderRadius: "4px",
                            backgroundColor: (document.riskFlagCount || 0) === 0 ? "#d4edda" : "#f8d7da",
                            color: (document.riskFlagCount || 0) === 0 ? "#155724" : "#721c24",
                            fontSize: "12px",
                            cursor: "help",
                          }}
                        >
                          {(document.riskFlagCount || 0) === 0 ? "Risk Yok" : `${document.riskFlagCount} Risk`}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "12px" }}>
                    {new Date(document.createdAt).toLocaleDateString("tr-TR")}
                  </td>
                  <td style={{ padding: "12px" }}>
                    {document.processedAt ? new Date(document.processedAt).toLocaleDateString("tr-TR") : "-"}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <Link
                        href={`/documents/${document.id}`}
                        style={{
                          padding: "4px 8px",
                          color: "#0066cc",
                          textDecoration: "none",
                          fontSize: "14px",
                        }}
                      >
                        Görüntüle
                      </Link>
                      <button
                        onClick={() => downloadMutation.mutate(document.id)}
                        disabled={downloadMutation.isPending}
                        style={{
                          padding: "4px 8px",
                          color: "#0066cc",
                          border: "1px solid #0066cc",
                          borderRadius: "4px",
                          cursor: downloadMutation.isPending ? "not-allowed" : "pointer",
                          fontSize: "14px",
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
                            padding: "4px 8px",
                            color: "#dc3545",
                            border: "1px solid #dc3545",
                            borderRadius: "4px",
                            cursor: deleteMutation.isPending ? "not-allowed" : "pointer",
                            fontSize: "14px",
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
            <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "24px" }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: "8px 16px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  cursor: page === 1 ? "not-allowed" : "pointer",
                  opacity: page === 1 ? 0.5 : 1,
                }}
              >
                Önceki
              </button>
              <span style={{ padding: "8px 16px", display: "flex", alignItems: "center" }}>
                Sayfa {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                style={{
                  padding: "8px 16px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
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

