"use client";

import { useQuery } from "@tanstack/react-query";
import { listTransactions, getMyClientCompany } from "@repo/api-client";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { colors, spacing } from "@/styles/design-system";

function formatCurrency(amount: number, currency: string = "TRY"): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: currency,
  }).format(amount);
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("tr-TR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export default function ClientTransactionsPage() {
  // Get client company for ReadOnly user
  const { data: clientCompanyData } = useQuery({
    queryKey: ["myClientCompany"],
    queryFn: () => getMyClientCompany(),
  });

  const clientCompany = clientCompanyData?.data;
  const clientCompanyId = clientCompany?.id || null;

  const { data: transactionsData, isLoading } = useQuery({
    queryKey: ["client-transactions", clientCompanyId],
    queryFn: () => listTransactions({ page: 1, pageSize: 50, clientCompanyId }),
    enabled: !!clientCompanyId,
  });

  const transactions = transactionsData?.data?.data || [];

  return (
    <div>
      <PageHeader title="İşlemlerim" />

      <div style={{ marginBottom: spacing.lg }}>
        <p style={{ color: colors.text.secondary }}>
          {transactions.length} işlem bulundu
        </p>
      </div>

      {isLoading ? (
        <div>Yükleniyor...</div>
      ) : transactions.length === 0 ? (
        <Card>
          <div style={{ padding: spacing.xl, textAlign: "center", color: colors.text.secondary }}>
            <div style={{ fontSize: "48px", marginBottom: spacing.md }}>💼</div>
            <div>Henüz işlem bulunmuyor.</div>
          </div>
        </Card>
      ) : (
        <Card>
          <div>
            {transactions.map((transaction: any) => (
              <div
                key={transaction.id}
                style={{
                  padding: spacing.md,
                  borderBottom: `1px solid ${colors.gray[200]}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "medium", marginBottom: spacing.xs, color: colors.text.primary }}>
                      {transaction.description || transaction.referenceNo || "İşlem"}
                    </div>
                    <div style={{ fontSize: "14px", color: colors.text.secondary }}>
                      {formatDate(transaction.date)}
                      {transaction.referenceNo && ` • ${transaction.referenceNo}`}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {transaction.totalDebit > 0 && (
                      <div
                        style={{
                          fontWeight: "semibold",
                          color: colors.success,
                          marginBottom: spacing.xs,
                        }}
                      >
                        +{formatCurrency(transaction.totalDebit, "TRY")}
                      </div>
                    )}
                    {transaction.totalCredit > 0 && (
                      <div
                        style={{
                          fontWeight: "semibold",
                          color: colors.error,
                        }}
                      >
                        -{formatCurrency(transaction.totalCredit, "TRY")}
                      </div>
                    )}
                    {transaction.totalDebit === 0 && transaction.totalCredit === 0 && (
                      <div style={{ color: colors.text.secondary }}>
                        {formatCurrency(0, "TRY")}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
