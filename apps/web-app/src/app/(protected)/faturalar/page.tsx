"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { listInvoices, listClientCompanies, listSavedFilters, SAVED_FILTER_TARGETS } from "@repo/api-client";
import { invoices as invoicesI18n } from "@repo/i18n";
import { SavedFiltersDropdown } from "../../../components/saved-filters-dropdown";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
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
import { colors, spacing, typography, borderRadius } from "@/styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";

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

function InvoicesPageContent() {
  const { themeColors } = useTheme();
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
    <PageTransition>
    <div style={{ padding: "40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1>{invoicesI18n.title}</h1>
        <Link
          href="/faturalar/new"
          style={{
            padding: "8px 16px",
            backgroundColor: colors.primary,
            color: colors.white,
            textDecoration: "none",
            borderRadius: borderRadius.sm,
          }}
        >
          {invoicesI18n.list.addNew}
        </Link>
      </div>

      <Card style={{ marginBottom: spacing.lg }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: spacing.md, padding: spacing.md, alignItems: "flex-start" }}>
          <div style={{ flex: "1 1 200px" }}>
            <Select
              label="Şirket"
              value={companyFilter}
              onChange={(e) => {
                setCompanyFilter(e.target.value);
                setPage(1);
                const params = new URLSearchParams(searchParams.toString());
                if (e.target.value === "all") {
                  params.delete("clientCompanyId");
                } else {
                  params.set("clientCompanyId", e.target.value);
                }
                router.push(`/faturalar?${params.toString()}`);
              }}
              options={[
                { value: "all", label: "Tüm Şirketler" },
                ...((companies || []).map((company: any) => ({
                  value: company.id,
                  label: company.name,
                }))),
              ]}
            />
          </div>
          <div style={{ flex: "1 1 200px" }}>
            <Input
              type="date"
              label="Başlangıç Tarihi"
              value={issueDateFrom}
              onChange={(e) => {
                setIssueDateFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div style={{ flex: "1 1 200px" }}>
            <Input
              type="date"
              label="Bitiş Tarihi"
              value={issueDateTo}
              onChange={(e) => {
                setIssueDateTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div style={{ flex: "1 1 200px" }}>
            <Select
              label="Tür"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { value: "all", label: "Tümü" },
                { value: "SATIŞ", label: "Satış" },
                { value: "ALIŞ", label: "Alış" },
              ]}
            />
          </div>
          <div style={{ flex: "1 1 200px" }}>
            <Select
              label="Durum"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { value: "all", label: "Tümü" },
                { value: "taslak", label: "Taslak" },
                { value: "kesildi", label: "Kesildi" },
                { value: "iptal", label: "İptal" },
                { value: "muhasebeleştirilmiş", label: "Muhasebeleştirilmiş" },
              ]}
            />
          </div>
          <div style={{ alignSelf: "flex-end" }}>
            <SavedFiltersDropdown
              target={SAVED_FILTER_TARGETS.INVOICES}
              currentFilters={currentFilters}
              onFilterSelect={handleFilterSelect}
            />
          </div>
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div style={{ padding: spacing.lg }}>
            <SkeletonTable rows={5} columns={9} />
          </div>
        ) : invoices.length === 0 ? (
          <EmptyState
            icon="FileX"
            title={invoicesI18n.list.emptyState}
            description="İlk faturanızı oluşturarak başlayın"
            actionLabel={invoicesI18n.list.emptyStateAction}
            onAction={() => window.location.href = "/faturalar/new"}
          />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${themeColors.border}`, backgroundColor: themeColors.gray[50] }}>
                  <th style={{ padding: spacing.md, textAlign: "left", fontWeight: typography.fontWeight.semibold, color: themeColors.text.primary, fontSize: typography.fontSize.sm }}>
                    Şirket Adı
                  </th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontWeight: typography.fontWeight.semibold, color: themeColors.text.primary, fontSize: typography.fontSize.sm }}>
                    Fatura No
                  </th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontWeight: typography.fontWeight.semibold, color: themeColors.text.primary, fontSize: typography.fontSize.sm }}>
                    Tür
                  </th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontWeight: typography.fontWeight.semibold, color: themeColors.text.primary, fontSize: typography.fontSize.sm }}>
                    Düzenleme Tarihi
                  </th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontWeight: typography.fontWeight.semibold, color: themeColors.text.primary, fontSize: typography.fontSize.sm }}>
                    Vade Tarihi
                  </th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontWeight: typography.fontWeight.semibold, color: themeColors.text.primary, fontSize: typography.fontSize.sm }}>
                    Toplam Tutar
                  </th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontWeight: typography.fontWeight.semibold, color: themeColors.text.primary, fontSize: typography.fontSize.sm }}>
                    Para Birimi
                  </th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontWeight: typography.fontWeight.semibold, color: themeColors.text.primary, fontSize: typography.fontSize.sm }}>
                    Durum
                  </th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontWeight: typography.fontWeight.semibold, color: themeColors.text.primary, fontSize: typography.fontSize.sm }}>
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      {invoice.clientCompanyName || "-"}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/faturalar/${invoice.id}`}
                        style={{ color: colors.primary, textDecoration: "none", fontWeight: typography.fontWeight.medium }}
                      >
                        {invoice.externalId || invoice.id.substring(0, 8)}
                      </Link>
                    </TableCell>
                    <TableCell>{TYPE_LABELS[invoice.type] || invoice.type}</TableCell>
                    <TableCell>
                      {new Date(invoice.issueDate).toLocaleDateString("tr-TR")}
                    </TableCell>
                    <TableCell>
                      {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("tr-TR") : "-"}
                    </TableCell>
                    <TableCell>
                      {invoice.totalAmount.toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell>{invoice.currency}</TableCell>
                    <TableCell>
                      <Badge
                        variant={invoice.status === "kesildi" ? "success" : invoice.status === "iptal" ? "danger" : "secondary"}
                        size="sm"
                      >
                        {STATUS_LABELS[invoice.status] || invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button asLink href={`/faturalar/${invoice.id}/edit`} variant="ghost" size="sm">
                        Düzenle
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {!isLoading && invoices.length > 0 && pagination.totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: spacing.md, marginTop: spacing.lg }}>
          <Button
            variant="outline"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            size="sm"
          >
            Önceki
          </Button>
          <span style={{ color: themeColors.text.secondary, fontSize: typography.fontSize.sm }}>
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

export default function InvoicesPage() {
  return (
    <Suspense fallback={<div>Yükleniyor...</div>}>
      <InvoicesPageContent />
    </Suspense>
  );
}

