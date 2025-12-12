"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listInvoices, archiveInvoiceToEArsiv, searchArchivedInvoices, autoArchiveOldInvoices } from "@repo/api-client";
import Link from "next/link";

const STATUS_LABELS: Record<string, string> = {
  taslak: "Taslak",
  kesildi: "Kesildi",
  iptal: "İptal",
  muhasebeleştirilmiş: "Muhasebeleştirilmiş",
};

export default function EArsivPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"archive" | "search">("archive");
  const [searchFilters, setSearchFilters] = useState({
    startDate: "",
    endDate: "",
    invoiceNumber: "",
    customerName: "",
  });

  // Fetch invoices that can be archived (status: kesildi or muhasebeleştirilmiş)
  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ["invoices", { status: ["kesildi", "muhasebeleştirilmiş"] }],
    queryFn: () => listInvoices({ status: "kesildi", pageSize: 100 }),
    enabled: activeTab === "archive",
  });

  // Search archived invoices
  const { data: archivedData, isLoading: searchLoading } = useQuery({
    queryKey: ["archived-invoices", searchFilters],
    queryFn: () =>
      searchArchivedInvoices({
        startDate: searchFilters.startDate || undefined,
        endDate: searchFilters.endDate || undefined,
        invoiceNumber: searchFilters.invoiceNumber || undefined,
        customerName: searchFilters.customerName || undefined,
      }),
    enabled: activeTab === "search",
  });

  const invoices = invoicesData?.data.data || [];
  const archivedInvoices = archivedData?.data || [];

  const archiveMutation = useMutation({
    mutationFn: (invoiceId: string) => archiveInvoiceToEArsiv(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["archived-invoices"] });
      alert("Fatura E-Arşiv sistemine başarıyla arşivlendi.");
    },
    onError: (error: Error) => {
      alert(`Hata: ${error.message}`);
    },
  });

  const autoArchiveMutation = useMutation({
    mutationFn: () => autoArchiveOldInvoices(90),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["archived-invoices"] });
      alert(data.data.message);
    },
    onError: (error: Error) => {
      alert(`Hata: ${error.message}`);
    },
  });

  const handleArchive = (invoiceId: string) => {
    if (confirm("Bu faturayı E-Arşiv sistemine arşivlemek istediğinize emin misiniz?")) {
      archiveMutation.mutate(invoiceId);
    }
  };

  const handleAutoArchive = () => {
    if (confirm("90 günden eski faturaları otomatik olarak arşivlemek istediğinize emin misiniz?")) {
      autoArchiveMutation.mutate();
    }
  };

  const handleSearch = () => {
    queryClient.invalidateQueries({ queryKey: ["archived-invoices"] });
  };

  return (
    <div style={{ padding: "40px", maxWidth: "1400px" }}>
      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "10px" }}>E-Arşiv Yönetimi</h1>
        <p style={{ color: "#6b7280" }}>
          Faturaları E-Arşiv sistemine arşivleyin ve arşivlenmiş faturaları arayın.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "30px", borderBottom: "2px solid #e5e7eb" }}>
        <button
          onClick={() => setActiveTab("archive")}
          style={{
            padding: "12px 24px",
            border: "none",
            backgroundColor: "transparent",
            borderBottom: activeTab === "archive" ? "2px solid #3b82f6" : "2px solid transparent",
            color: activeTab === "archive" ? "#3b82f6" : "#6b7280",
            fontWeight: activeTab === "archive" ? "600" : "400",
            cursor: "pointer",
            marginBottom: "-2px",
          }}
        >
          Arşivle
        </button>
        <button
          onClick={() => setActiveTab("search")}
          style={{
            padding: "12px 24px",
            border: "none",
            backgroundColor: "transparent",
            borderBottom: activeTab === "search" ? "2px solid #3b82f6" : "2px solid transparent",
            color: activeTab === "search" ? "#3b82f6" : "#6b7280",
            fontWeight: activeTab === "search" ? "600" : "400",
            cursor: "pointer",
            marginBottom: "-2px",
          }}
        >
          Arşiv Ara
        </button>
      </div>

      {activeTab === "archive" && (
        <>
          <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ padding: "15px", backgroundColor: "#f3f4f6", borderRadius: "8px", flex: 1 }}>
              <p style={{ margin: 0, color: "#374151" }}>
                E-Arşiv sistemine arşivlenebilecek faturalar. Faturaları arşivlemek için aşağıdaki listeden seçin.
              </p>
            </div>
            <button
              onClick={handleAutoArchive}
              disabled={autoArchiveMutation.isPending}
              style={{
                marginLeft: "20px",
                padding: "10px 20px",
                backgroundColor: "#10b981",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: autoArchiveMutation.isPending ? "not-allowed" : "pointer",
                opacity: autoArchiveMutation.isPending ? 0.6 : 1,
              }}
            >
              {autoArchiveMutation.isPending ? "İşleniyor..." : "Otomatik Arşivle (90+ gün)"}
            </button>
          </div>

          {isLoading ? (
            <div style={{ padding: "40px", textAlign: "center" }}>
              <p>Yükleniyor...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", backgroundColor: "#f9fafb", borderRadius: "8px" }}>
              <p style={{ color: "#6b7280", fontSize: "16px" }}>Arşivlenebilecek fatura bulunmamaktadır.</p>
              <Link
                href="/faturalar"
                style={{
                  display: "inline-block",
                  marginTop: "15px",
                  color: "#3b82f6",
                  textDecoration: "none",
                }}
              >
                Fatura listesine git →
              </Link>
            </div>
          ) : (
            <div style={{ backgroundColor: "white", borderRadius: "8px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                    <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", color: "#374151" }}>Fatura No</th>
                    <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", color: "#374151" }}>Müşteri</th>
                    <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", color: "#374151" }}>Tarih</th>
                    <th style={{ padding: "12px", textAlign: "right", fontWeight: "600", color: "#374151" }}>Tutar</th>
                    <th style={{ padding: "12px", textAlign: "center", fontWeight: "600", color: "#374151" }}>Durum</th>
                    <th style={{ padding: "12px", textAlign: "center", fontWeight: "600", color: "#374151" }}>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => {
                    const metadata = (invoice as any).metadata as Record<string, unknown> | undefined;
                    const eArsivData = metadata?.eArsiv as Record<string, unknown> | undefined;
                    const isArchived = !!eArsivData?.archiveId;

                    return (
                      <tr
                        key={invoice.id}
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
                          <Link
                            href={`/faturalar/${invoice.id}`}
                            style={{ color: "#3b82f6", textDecoration: "none" }}
                          >
                            {invoice.externalId || invoice.id.slice(0, 8)}
                          </Link>
                        </td>
                        <td style={{ padding: "12px" }}>{invoice.clientCompanyName || "-"}</td>
                        <td style={{ padding: "12px" }}>
                          {new Date(invoice.issueDate).toLocaleDateString("tr-TR")}
                        </td>
                        <td style={{ padding: "12px", textAlign: "right" }}>
                          {new Intl.NumberFormat("tr-TR", {
                            style: "currency",
                            currency: invoice.currency || "TRY",
                          }).format(Number(invoice.totalAmount))}
                        </td>
                        <td style={{ padding: "12px", textAlign: "center" }}>
                          <span
                            style={{
                              padding: "4px 12px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              fontWeight: "500",
                              backgroundColor: isArchived ? "#d1fae5" : "#fef3c7",
                              color: isArchived ? "#065f46" : "#92400e",
                            }}
                          >
                            {isArchived ? "Arşivlendi" : STATUS_LABELS[invoice.status] || invoice.status}
                          </span>
                        </td>
                        <td style={{ padding: "12px", textAlign: "center" }}>
                          {!isArchived ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleArchive(invoice.id);
                              }}
                              disabled={archiveMutation.isPending}
                              style={{
                                padding: "6px 16px",
                                backgroundColor: "#10b981",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                cursor: archiveMutation.isPending ? "not-allowed" : "pointer",
                                fontSize: "14px",
                                opacity: archiveMutation.isPending ? 0.6 : 1,
                              }}
                            >
                              {archiveMutation.isPending ? "Arşivleniyor..." : "Arşivle"}
                            </button>
                          ) : (
                            <span style={{ color: "#6b7280", fontSize: "14px" }}>Arşivlendi</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === "search" && (
        <>
          <div style={{ marginBottom: "20px", padding: "20px", backgroundColor: "#f9fafb", borderRadius: "8px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "15px", fontSize: "18px", fontWeight: "600" }}>Arama Filtreleri</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "15px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                  Başlangıç Tarihi
                </label>
                <input
                  type="date"
                  value={searchFilters.startDate}
                  onChange={(e) => setSearchFilters({ ...searchFilters, startDate: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                  Bitiş Tarihi
                </label>
                <input
                  type="date"
                  value={searchFilters.endDate}
                  onChange={(e) => setSearchFilters({ ...searchFilters, endDate: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                  Fatura No
                </label>
                <input
                  type="text"
                  value={searchFilters.invoiceNumber}
                  onChange={(e) => setSearchFilters({ ...searchFilters, invoiceNumber: e.target.value })}
                  placeholder="Fatura numarası..."
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                  Müşteri Adı
                </label>
                <input
                  type="text"
                  value={searchFilters.customerName}
                  onChange={(e) => setSearchFilters({ ...searchFilters, customerName: e.target.value })}
                  placeholder="Müşteri adı..."
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                  }}
                />
              </div>
            </div>
            <button
              onClick={handleSearch}
              style={{
                marginTop: "15px",
                padding: "10px 24px",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              Ara
            </button>
          </div>

          {searchLoading ? (
            <div style={{ padding: "40px", textAlign: "center" }}>
              <p>Yükleniyor...</p>
            </div>
          ) : archivedInvoices.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", backgroundColor: "#f9fafb", borderRadius: "8px" }}>
              <p style={{ color: "#6b7280", fontSize: "16px" }}>Arşivlenmiş fatura bulunamadı.</p>
            </div>
          ) : (
            <div style={{ backgroundColor: "white", borderRadius: "8px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                    <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", color: "#374151" }}>Fatura No</th>
                    <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", color: "#374151" }}>Müşteri</th>
                    <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", color: "#374151" }}>Tarih</th>
                    <th style={{ padding: "12px", textAlign: "right", fontWeight: "600", color: "#374151" }}>Tutar</th>
                    <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", color: "#374151" }}>Arşiv Tarihi</th>
                    <th style={{ padding: "12px", textAlign: "center", fontWeight: "600", color: "#374151" }}>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {archivedInvoices.map((invoice) => (
                    <tr
                      key={invoice.invoiceId}
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
                        <Link
                          href={`/faturalar/${invoice.invoiceId}`}
                          style={{ color: "#3b82f6", textDecoration: "none" }}
                        >
                          {invoice.invoiceNumber}
                        </Link>
                      </td>
                      <td style={{ padding: "12px" }}>{invoice.customerName || "-"}</td>
                      <td style={{ padding: "12px" }}>
                        {new Date(invoice.issueDate).toLocaleDateString("tr-TR")}
                      </td>
                      <td style={{ padding: "12px", textAlign: "right" }}>
                        {new Intl.NumberFormat("tr-TR", {
                          style: "currency",
                          currency: invoice.currency || "TRY",
                        }).format(Number(invoice.totalAmount))}
                      </td>
                      <td style={{ padding: "12px" }}>
                        {invoice.archiveDate
                          ? new Date(invoice.archiveDate).toLocaleDateString("tr-TR")
                          : "-"}
                      </td>
                      <td style={{ padding: "12px", textAlign: "center" }}>
                        <Link
                          href={`/faturalar/${invoice.invoiceId}`}
                          style={{
                            padding: "6px 16px",
                            backgroundColor: "#f3f4f6",
                            color: "#374151",
                            textDecoration: "none",
                            borderRadius: "6px",
                            fontSize: "14px",
                            display: "inline-block",
                          }}
                        >
                          Detay
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

