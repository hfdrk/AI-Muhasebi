"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listTransactions, listClientCompanies } from "@repo/api-client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableRow, TableCell } from "@/components/ui/Table";
import { PageTransition } from "@/components/ui/PageTransition";
import { colors, spacing, typography } from "@/styles/design-system";

function TransactionsPageContent() {
  const searchParams = useSearchParams();
  const defaultClientId = searchParams.get("clientCompanyId") || undefined;

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [clientCompanyId, setClientCompanyId] = useState<string | undefined>(defaultClientId);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data: clientsData } = useQuery({
    queryKey: ["clientCompanies"],
    queryFn: () => listClientCompanies({ pageSize: 100 }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["transactions", clientCompanyId, dateFrom, dateTo, referenceNo, page],
    queryFn: () =>
      listTransactions({
        clientCompanyId,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        referenceNo: referenceNo || undefined,
        page,
        pageSize,
      }),
  });

  const transactions = data?.data.data || [];
  const pagination = data?.data || { total: 0, page: 1, pageSize: 20, totalPages: 1 };

  return (
    <PageTransition>
      <div style={{ padding: spacing.xxl, maxWidth: "1600px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xl }}>
        <div>
          <h1 style={{ fontSize: typography.fontSize["3xl"], fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing.sm }}>
            Mali Hareketler
          </h1>
          <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.base }}>
            Mali hareketlerinizi görüntüleyin ve yönetin
          </p>
        </div>
        <Button asLink href="/islemler/new" variant="primary">
          Yeni Hareket Ekle
        </Button>
      </div>

      <Card style={{ marginBottom: spacing.lg }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: spacing.md, padding: spacing.md }}>
          <div style={{ flex: "1 1 200px" }}>
            <Input
              type="date"
              label="Başlangıç Tarihi"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div style={{ flex: "1 1 200px" }}>
            <Input
              type="date"
              label="Bitiş Tarihi"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div style={{ flex: "1 1 200px" }}>
            <Input
              type="text"
              label="Referans No"
              value={referenceNo}
              onChange={(e) => {
                setReferenceNo(e.target.value);
                setPage(1);
              }}
              placeholder="Referans no ile ara..."
            />
          </div>
          <div style={{ flex: "1 1 200px" }}>
            <Select
              label="Müşteri Şirketi"
              value={clientCompanyId || ""}
              onChange={(e) => {
                setClientCompanyId(e.target.value || undefined);
                setPage(1);
              }}
              options={[
                { value: "", label: "Tümü" },
                ...((clientsData?.data?.data || []).map((client: any) => ({
                  value: client.id,
                  label: client.name,
                }))),
              ]}
            />
          </div>
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div style={{ padding: spacing.lg }}>
            <SkeletonTable rows={5} columns={6} />
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            icon="FileX"
            title="Henüz mali hareket bulunmamaktadır"
            description="İlk mali hareketinizi ekleyerek başlayın"
            actionLabel="İlk Mali Hareketi Ekle"
            onAction={() => window.location.href = "/islemler/new"}
          />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${colors.border}`, backgroundColor: colors.gray[50] }}>
                  <th style={{ padding: spacing.md, textAlign: "left", fontWeight: typography.fontWeight.semibold, color: colors.text.primary, fontSize: typography.fontSize.sm }}>
                    Tarih
                  </th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontWeight: typography.fontWeight.semibold, color: colors.text.primary, fontSize: typography.fontSize.sm }}>
                    Referans No
                  </th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontWeight: typography.fontWeight.semibold, color: colors.text.primary, fontSize: typography.fontSize.sm }}>
                    Açıklama
                  </th>
                  <th style={{ padding: spacing.md, textAlign: "right", fontWeight: typography.fontWeight.semibold, color: colors.text.primary, fontSize: typography.fontSize.sm }}>
                    Toplam Borç
                  </th>
                  <th style={{ padding: spacing.md, textAlign: "right", fontWeight: typography.fontWeight.semibold, color: colors.text.primary, fontSize: typography.fontSize.sm }}>
                    Toplam Alacak
                  </th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontWeight: typography.fontWeight.semibold, color: colors.text.primary, fontSize: typography.fontSize.sm }}>
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {new Date(transaction.date).toLocaleDateString("tr-TR")}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/islemler/${transaction.id}`}
                        style={{ color: colors.primary, textDecoration: "none", fontWeight: typography.fontWeight.medium }}
                      >
                        {transaction.referenceNo || transaction.id.substring(0, 8)}
                      </Link>
                    </TableCell>
                    <TableCell>{transaction.description || "-"}</TableCell>
                    <TableCell style={{ textAlign: "right" }}>
                      {transaction.totalDebit?.toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }) || "0.00"}
                    </TableCell>
                    <TableCell style={{ textAlign: "right" }}>
                      {transaction.totalCredit?.toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }) || "0.00"}
                    </TableCell>
                    <TableCell>
                      <Button asLink href={`/islemler/${transaction.id}/edit`} variant="ghost" size="sm">
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
      {!isLoading && transactions.length > 0 && pagination.totalPages > 1 && (
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

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div>Yükleniyor...</div>}>
      <TransactionsPageContent />
    </Suspense>
  );
}

