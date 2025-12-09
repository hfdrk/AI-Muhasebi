"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { listInvoices, listClientCompanies, listSavedFilters, SAVED_FILTER_TARGETS } from "@repo/api-client";
import { invoices as invoicesI18n, common as commonI18n } from "@repo/i18n";
import { SavedFiltersDropdown } from "../../../components/saved-filters-dropdown";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const STATUS_LABELS: Record<string, string> = {
  taslak: "Taslak",
  kesildi: "Kesildi",
  iptal: "İptal",
  muhasebeleştirilmiş: "Muhasebeleştirilmiş",
};

const TYPE_LABELS: Record<string, string> = {
  SATIŞ: "Satış",
  ALIŞ: "Alış",
};

export default function InvoicesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientCompanyId = searchParams.get("clientCompanyId") || undefined;

  const [issueDateFrom, setIssueDateFrom] = useState("");
  const [issueDateTo, setIssueDateTo] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>(clientCompanyId || "all");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Load saved filters
  const { data: savedFiltersData } = useQuery({
    queryKey: ["savedFilters", SAVED_FILTER_TARGETS.INVOICES],
    queryFn: () => listSavedFilters(SAVED_FILTER_TARGETS.INVOICES),
  });

  // Fetch companies for dropdown
  const { data: companiesData } = useQuery({
    queryKey: ["clientCompanies"],
    queryFn: () => listClientCompanies({ pageSize: 100, isActive: true }),
  });

  const companies = companiesData?.data.data || [];

  // Apply default filter on mount
  useEffect(() => {
    const defaultFilter = savedFiltersData?.data.find((f) => f.isDefault);
    if (defaultFilter) {
      const filters = defaultFilter.filters;
      if (filters.clientCompanyId !== undefined) {
        setCompanyFilter(filters.clientCompanyId || "all");
      }
      if (filters.issueDateFrom !== undefined) {
        setIssueDateFrom(filters.issueDateFrom || "");
      }
      if (filters.issueDateTo !== undefined) {
        setIssueDateTo(filters.issueDateTo || "");
      }
      if (filters.type !== undefined) {
        setTypeFilter(filters.type || "all");
      }
      if (filters.status !== undefined) {
        setStatusFilter(filters.status || "all");
      }
    }
  }, [savedFiltersData]);

  const handleFilterSelect = (filters: Record<string, any>) => {
    if (filters.clientCompanyId !== undefined) {
      setCompanyFilter(filters.clientCompanyId || "all");
    }
    if (filters.issueDateFrom !== undefined) {
      setIssueDateFrom(filters.issueDateFrom || "");
    }
    if (filters.issueDateTo !== undefined) {
      setIssueDateTo(filters.issueDateTo || "");
    }
    if (filters.type !== undefined) {
      setTypeFilter(filters.type || "all");
    }
    if (filters.status !== undefined) {
      setStatusFilter(filters.status || "all");
    }
    setPage(1);
  };

  const currentFilters = {
    clientCompanyId: companyFilter !== "all" ? companyFilter : undefined,
    issueDateFrom: issueDateFrom || undefined,
    issueDateTo: issueDateTo || undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["invoices", companyFilter !== "all" ? companyFilter : undefined, issueDateFrom, issueDateTo, typeFilter, statusFilter, page],
    queryFn: () =>
      listInvoices({
        clientCompanyId: companyFilter !== "all" ? companyFilter : undefined,
        issueDateFrom: issueDateFrom || undefined,
        issueDateTo: issueDateTo || undefined,
        type: typeFilter !== "all" ? typeFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        page,
        pageSize,
      }),
  });

  const invoices = data?.data.data || [];
  const pagination = data?.data || { total: 0, page: 1, pageSize: 20, totalPages: 1 };

  return (
    <div style={{ padding: "40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1>{invoicesI18n.title}</h1>
        <Link
          href="/faturalar/new"
          style={{
            padding: "8px 16px",
            backgroundColor: "#0066cc",
            color: "white",
            textDecoration: "none",
            borderRadius: "4px",
          }}
        >
          {invoicesI18n.list.addNew}
        </Link>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "24px", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", flex: 1 }}>
          <div>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>Şirket</label>
            <select
              value={companyFilter}
              onChange={(e) => {
                setCompanyFilter(e.target.value);
                setPage(1);
                // Update URL with company filter
                const params = new URLSearchParams(searchParams.toString());
                if (e.target.value === "all") {
                  params.delete("clientCompanyId");
                } else {
                  params.set("clientCompanyId", e.target.value);
                }
                router.push(`/faturalar?${params.toString()}`);
              }}
              style={{
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "16px",
                minWidth: "200px",
              }}
            >
              <option value="all">Tüm Şirketler</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
        <div>
          <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>Başlangıç Tarihi</label>
          <input
            type="date"
            value={issueDateFrom}
            onChange={(e) => {
              setIssueDateFrom(e.target.value);
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
            value={issueDateTo}
            onChange={(e) => {
              setIssueDateTo(e.target.value);
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
          <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>Tür</label>
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
            <option value="SATIŞ">Satış</option>
            <option value="ALIŞ">Alış</option>
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
            <option value="taslak">Taslak</option>
            <option value="kesildi">Kesildi</option>
            <option value="iptal">İptal</option>
            <option value="muhasebeleştirilmiş">Muhasebeleştirilmiş</option>
          </select>
        </div>
        </div>
        <div style={{ alignSelf: "flex-end" }}>
          <SavedFiltersDropdown
            target={SAVED_FILTER_TARGETS.INVOICES}
            currentFilters={currentFilters}
            onFilterSelect={handleFilterSelect}
          />
        </div>
      </div>

      {isLoading ? (
        <p>{commonI18n.labels.loading}</p>
      ) : invoices.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <p>{invoicesI18n.list.emptyState}</p>
          <Link
            href="/faturalar/new"
            style={{
              display: "inline-block",
              marginTop: "16px",
              padding: "8px 16px",
              backgroundColor: "#0066cc",
              color: "white",
              textDecoration: "none",
              borderRadius: "4px",
            }}
          >
            {invoicesI18n.list.emptyStateAction}
          </Link>
        </div>
      ) : (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: "12px", textAlign: "left" }}>Şirket Adı</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Fatura No</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Tür</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Düzenleme Tarihi</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Vade Tarihi</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Toplam Tutar</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Para Birimi</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Durum</th>
                <th style={{ padding: "12px", textAlign: "left" }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "12px" }}>
                    {invoice.clientCompanyName || "-"}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <Link
                      href={`/faturalar/${invoice.id}`}
                      style={{ color: "#0066cc", textDecoration: "none" }}
                    >
                      {invoice.externalId || invoice.id.substring(0, 8)}
                    </Link>
                  </td>
                  <td style={{ padding: "12px" }}>{TYPE_LABELS[invoice.type] || invoice.type}</td>
                  <td style={{ padding: "12px" }}>
                    {new Date(invoice.issueDate).toLocaleDateString("tr-TR")}
                  </td>
                  <td style={{ padding: "12px" }}>
                    {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("tr-TR") : "-"}
                  </td>
                  <td style={{ padding: "12px" }}>
                    {invoice.totalAmount.toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td style={{ padding: "12px" }}>{invoice.currency}</td>
                  <td style={{ padding: "12px" }}>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        backgroundColor: invoice.status === "kesildi" ? "#d4edda" : "#f8d7da",
                        color: invoice.status === "kesildi" ? "#155724" : "#721c24",
                        fontSize: "12px",
                      }}
                    >
                      {STATUS_LABELS[invoice.status] || invoice.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <Link
                      href={`/faturalar/${invoice.id}/edit`}
                      style={{
                        padding: "4px 8px",
                        color: "#0066cc",
                        textDecoration: "none",
                        fontSize: "14px",
                      }}
                    >
                      Düzenle
                    </Link>
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

