"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { listClientCompanies, listSavedFilters, SAVED_FILTER_TARGETS, getCurrentUser } from "@repo/api-client";
import { clients as clientsI18n, common as commonI18n } from "@repo/i18n";
import { SavedFiltersDropdown } from "../../../components/saved-filters-dropdown";
// import { useRouter } from "next/navigation"; // Reserved for future use
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageTransition } from "@/components/ui/PageTransition";
import { colors, spacing, typography, borderRadius } from "@/styles/design-system";

export default function ClientsPage() {
  // const router = useRouter(); // Reserved for future use
  const [search, setSearch] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Check if user is ReadOnly (customer)
  const { data: userData } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => getCurrentUser(),
  });

  const currentUser = userData?.data;
  const userRole = currentUser?.tenants?.find((t: any) => t.status === "active")?.role;
  const isReadOnly = userRole === "ReadOnly";

  // Load saved filters
  const { data: savedFiltersData } = useQuery({
    queryKey: ["savedFilters", SAVED_FILTER_TARGETS.CLIENT_COMPANIES],
    queryFn: () => listSavedFilters(SAVED_FILTER_TARGETS.CLIENT_COMPANIES),
  });

  // Apply default filter on mount
  useEffect(() => {
    const defaultFilter = savedFiltersData?.data.find((f) => f.isDefault);
    if (defaultFilter) {
      const filters = defaultFilter.filters;
      if (filters.search !== undefined) {
        setSearch(filters.search || "");
      }
      if (filters.isActive !== undefined) {
        setIsActiveFilter(filters.isActive);
      }
    }
  }, [savedFiltersData]);

  const handleFilterSelect = (filters: Record<string, any>) => {
    if (filters.search !== undefined) {
      setSearch(filters.search || "");
    }
    if (filters.isActive !== undefined) {
      setIsActiveFilter(filters.isActive);
    } else {
      setIsActiveFilter(undefined);
    }
    setPage(1);
  };

  const currentFilters = {
    search,
    isActive: isActiveFilter,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["clientCompanies", search, isActiveFilter, page],
    queryFn: () =>
      listClientCompanies({
        search: search || undefined,
        isActive: isActiveFilter,
        page,
        pageSize,
      }),
  });

  const clients = data?.data.data || [];
  const pagination = data?.data || { total: 0, page: 1, pageSize: 20, totalPages: 1 };

  return (
    <div style={{ padding: "40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1>{clientsI18n.title}</h1>
        {!isReadOnly && (
          <Link
            href="/musteriler/new"
            style={{
              padding: "8px 16px",
              backgroundColor: colors.primary,
              color: "white",
              textDecoration: "none",
              borderRadius: "4px",
            }}
          >
            {clientsI18n.list.addNew}
          </Link>
        )}
      </div>

      <div style={{ display: "flex", gap: "16px", marginBottom: "24px", alignItems: "flex-start" }}>
        <div style={{ flex: 1, display: "flex", gap: "16px" }}>
          <input
            type="text"
            placeholder={clientsI18n.list.searchPlaceholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{
              flex: 1,
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "16px",
            }}
          />
          <select
            value={isActiveFilter === undefined ? "all" : isActiveFilter ? "active" : "inactive"}
            onChange={(e) => {
              const value = e.target.value;
              setIsActiveFilter(value === "all" ? undefined : value === "active");
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
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
          </select>
        </div>
        <SavedFiltersDropdown
          target={SAVED_FILTER_TARGETS.CLIENT_COMPANIES}
          currentFilters={currentFilters}
          onFilterSelect={handleFilterSelect}
        />
      </div>

      {isLoading ? (
        <p>{commonI18n.labels.loading}</p>
      ) : clients.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <p>{clientsI18n.list.emptyState}</p>
          {!isReadOnly && (
            <Link
              href="/musteriler/new"
              style={{
                display: "inline-block",
                marginTop: "16px",
                padding: "8px 16px",
                backgroundColor: colors.primary,
                color: "white",
                textDecoration: "none",
                borderRadius: "4px",
              }}
            >
              {clientsI18n.list.emptyStateAction}
            </Link>
          )}
        </div>
      ) : (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: "12px", textAlign: "left" }}>Şirket Adı</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Vergi Numarası</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Sektör</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Durum</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Oluşturulma Tarihi</th>
                <th style={{ padding: "12px", textAlign: "left" }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "12px" }}>
                    <Link
                      href={`/musteriler/${client.id}`}
                      style={{ color: colors.primary, textDecoration: "none" }}
                    >
                      {client.name}
                    </Link>
                  </td>
                  <td style={{ padding: "12px" }}>{client.taxNumber}</td>
                  <td style={{ padding: "12px" }}>{client.sector || "-"}</td>
                  <td style={{ padding: "12px" }}>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        backgroundColor: client.isActive ? colors.successLight : colors.dangerLight,
                        color: client.isActive ? colors.successDark : colors.dangerDark,
                        fontSize: "12px",
                      }}
                    >
                      {client.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td style={{ padding: "12px" }}>
                    {new Date(client.createdAt).toLocaleDateString("tr-TR")}
                  </td>
                  <td style={{ padding: "12px" }}>
                    {!isReadOnly && (
                      <Link
                        href={`/musteriler/${client.id}/edit`}
                        style={{
                          padding: "4px 8px",
                          color: colors.primary,
                          textDecoration: "none",
                          fontSize: "14px",
                        }}
                      >
                        {commonI18n.buttons.edit}
                      </Link>
                    )}
                    {isReadOnly && <span style={{ color: "#999" }}>-</span>}
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

