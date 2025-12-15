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
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { TableRow, TableCell } from "@/components/ui/Table";
import { PageTransition } from "@/components/ui/PageTransition";
import { colors, spacing, typography } from "@/styles/design-system";

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
    <PageTransition>
    <div style={{ padding: spacing.xxl, maxWidth: "1600px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xl }}>
        <div>
          <h1 style={{ fontSize: typography.fontSize["3xl"], fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing.sm }}>
            {clientsI18n.title}
          </h1>
          <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.base }}>
            Müşteri şirketlerinizi görüntüleyin ve yönetin
          </p>
        </div>
        {!isReadOnly && (
          <Button asLink href="/musteriler/new" variant="primary">
            {clientsI18n.list.addNew}
          </Button>
        )}
      </div>

      <Card style={{ marginBottom: spacing.lg }}>
        <div style={{ display: "flex", gap: spacing.md, padding: spacing.md, alignItems: "flex-start" }}>
          <div style={{ flex: 1, display: "flex", gap: spacing.md }}>
            <Input
              type="text"
              placeholder={clientsI18n.list.searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ flex: 1 }}
            />
            <Select
              value={isActiveFilter === undefined ? "all" : isActiveFilter ? "active" : "inactive"}
              onChange={(e) => {
                const value = e.target.value;
                setIsActiveFilter(value === "all" ? undefined : value === "active");
                setPage(1);
              }}
              options={[
                { value: "all", label: "Tümü" },
                { value: "active", label: "Aktif" },
                { value: "inactive", label: "Pasif" },
              ]}
            />
          </div>
          <SavedFiltersDropdown
            target={SAVED_FILTER_TARGETS.CLIENT_COMPANIES}
            currentFilters={currentFilters}
            onFilterSelect={handleFilterSelect}
          />
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div style={{ padding: spacing.lg }}>
            <SkeletonTable rows={5} columns={6} />
          </div>
        ) : clients.length === 0 ? (
          <EmptyState
            icon="Users"
            title={clientsI18n.list.emptyState}
            description="İlk müşteri şirketinizi ekleyerek başlayın"
            actionLabel={!isReadOnly ? clientsI18n.list.emptyStateAction : undefined}
            onAction={!isReadOnly ? () => window.location.href = "/musteriler/new" : undefined}
          />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${colors.border}`, backgroundColor: colors.gray[50] }}>
                  <th style={{ padding: spacing.md, textAlign: "left", fontWeight: typography.fontWeight.semibold, color: colors.text.primary, fontSize: typography.fontSize.sm }}>
                    Şirket Adı
                  </th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontWeight: typography.fontWeight.semibold, color: colors.text.primary, fontSize: typography.fontSize.sm }}>
                    Vergi Numarası
                  </th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontWeight: typography.fontWeight.semibold, color: colors.text.primary, fontSize: typography.fontSize.sm }}>
                    Sektör
                  </th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontWeight: typography.fontWeight.semibold, color: colors.text.primary, fontSize: typography.fontSize.sm }}>
                    Durum
                  </th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontWeight: typography.fontWeight.semibold, color: colors.text.primary, fontSize: typography.fontSize.sm }}>
                    Oluşturulma Tarihi
                  </th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontWeight: typography.fontWeight.semibold, color: colors.text.primary, fontSize: typography.fontSize.sm }}>
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <Link
                        href={`/musteriler/${client.id}`}
                        style={{ color: colors.primary, textDecoration: "none", fontWeight: typography.fontWeight.medium }}
                      >
                        {client.name}
                      </Link>
                    </TableCell>
                    <TableCell>{client.taxNumber}</TableCell>
                    <TableCell>{client.sector || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={client.isActive ? "success" : "danger"} size="sm">
                        {client.isActive ? "Aktif" : "Pasif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(client.createdAt).toLocaleDateString("tr-TR")}
                    </TableCell>
                    <TableCell>
                      {!isReadOnly ? (
                        <Button asLink href={`/musteriler/${client.id}/edit`} variant="ghost" size="sm">
                          {commonI18n.buttons.edit}
                        </Button>
                      ) : (
                        <span style={{ color: colors.text.muted }}>-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {!isLoading && clients.length > 0 && pagination.totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: spacing.md, marginTop: spacing.lg }}>
          <Button
            variant="outline"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            size="sm"
          >
            Önceki
          </Button>
          <span style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
            Sayfa {page} / {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(page + 1)}
            disabled={page === pagination.totalPages}
            size="sm"
          >
            Sonraki
          </Button>
        </div>
      )}
    </div>
    </PageTransition>
  );
}

