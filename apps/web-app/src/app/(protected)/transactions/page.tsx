"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listTransactions, listClientCompanies } from "@repo/api-client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Card } from "@/components/ui/Card";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { PageTransition } from "@/components/ui/PageTransition";
import { spacing, colors } from "@/styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";
import Link from "next/link";

function TransactionsPageContent() {
  const { themeColors } = useTheme();
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
      <div style={{ padding: "40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1>Mali Hareketler</h1>
        <Link
          href="/islemler/new"
          style={{
            padding: "8px 16px",
            backgroundColor: colors.primary,
            color: colors.white,
            textDecoration: "none",
            borderRadius: "4px",
          }}
        >
          Yeni Hareket Ekle
        </Link>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
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
              border: `1px solid ${themeColors.border}`,
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
              border: `1px solid ${themeColors.border}`,
              borderRadius: "4px",
              fontSize: "16px",
            }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>Referans No</label>
          <input
            type="text"
            value={referenceNo}
            onChange={(e) => {
              setReferenceNo(e.target.value);
              setPage(1);
            }}
            placeholder="Referans no ile ara..."
            style={{
              padding: "8px 12px",
              border: `1px solid ${themeColors.border}`,
              borderRadius: "4px",
              fontSize: "16px",
            }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>Müşteri Şirketi</label>
          <select
            value={clientCompanyId || ""}
            onChange={(e) => {
              setClientCompanyId(e.target.value || undefined);
              setPage(1);
            }}
            style={{
              padding: "8px 12px",
              border: `1px solid ${themeColors.border}`,
              borderRadius: "4px",
              fontSize: "16px",
              minWidth: "200px",
            }}
          >
            <option value="">Tümü</option>
            {clientsData?.data.data.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <div style={{ padding: spacing.lg }}>
            <SkeletonTable rows={5} columns={6} />
          </div>
        </Card>
      ) : transactions.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <p>Henüz mali hareket bulunmamaktadır.</p>
          <Link
            href="/islemler/new"
            style={{
              display: "inline-block",
              marginTop: "16px",
              padding: "8px 16px",
              backgroundColor: colors.primary,
              color: colors.white,
              textDecoration: "none",
              borderRadius: "4px",
            }}
          >
            İlk Mali Hareketi Ekle
          </Link>
        </div>
      ) : (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${themeColors.border}` }}>
                <th style={{ padding: "12px", textAlign: "left" }}>Tarih</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Referans No</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Açıklama</th>
                <th style={{ padding: "12px", textAlign: "right" }}>Toplam Borç</th>
                <th style={{ padding: "12px", textAlign: "right" }}>Toplam Alacak</th>
                <th style={{ padding: "12px", textAlign: "left" }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id} style={{ borderBottom: `1px solid ${themeColors.gray[200]}` }}>
                  <td style={{ padding: "12px" }}>
                    {new Date(transaction.date).toLocaleDateString("tr-TR")}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <Link
                      href={`/islemler/${transaction.id}`}
                      style={{ color: colors.primary, textDecoration: "none" }}
                    >
                      {transaction.referenceNo || transaction.id.substring(0, 8)}
                    </Link>
                  </td>
                  <td style={{ padding: "12px" }}>{transaction.description || "-"}</td>
                  <td style={{ padding: "12px", textAlign: "right" }}>
                    {transaction.totalDebit?.toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }) || "0.00"}
                  </td>
                  <td style={{ padding: "12px", textAlign: "right" }}>
                    {transaction.totalCredit?.toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }) || "0.00"}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <Link
                      href={`/islemler/${transaction.id}/edit`}
                      style={{
                        padding: "4px 8px",
                        color: colors.primary,
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
                  border: `1px solid ${themeColors.border}`,
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
                  border: `1px solid ${themeColors.border}`,
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

