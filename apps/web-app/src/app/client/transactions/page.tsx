"use client";

import { useQuery } from "@tanstack/react-query";
import { listTransactions, getMyClientCompany } from "@repo/api-client";
import { Card } from "@/components/ui/Card";
import { colors, spacing, borderRadius, transitions, typography } from "@/styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";

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
  const { themeColors } = useTheme();
  // Get client company for ReadOnly user
  const { data: clientCompanyData } = useQuery({
    queryKey: ["myClientCompany"],
    queryFn: () => getMyClientCompany(),
  });

  const clientCompany = clientCompanyData?.data;
  const clientCompanyId = clientCompany?.id || undefined;

  const { data: transactionsData, isLoading } = useQuery({
    queryKey: ["client-transactions", clientCompanyId],
    queryFn: () => listTransactions({ page: 1, pageSize: 50, clientCompanyId }),
    enabled: !!clientCompanyId,
  });

  const transactions = transactionsData?.data?.data || [];

  return (
    <div>
      <div style={{ marginBottom: spacing.xl }}>
        <p
          style={{
            color: themeColors.text.secondary,
            fontSize: typography.fontSize.base,
            margin: 0,
          }}
        >
          <strong style={{ color: themeColors.text.primary }}>{transactions.length}</strong> işlem bulundu
        </p>
      </div>

      {isLoading ? (
        <Card>
          <div
            style={{
              padding: spacing.xxl,
              textAlign: "center",
              color: themeColors.text.secondary,
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: spacing.md }}>⏳</div>
            <div style={{ fontSize: typography.fontSize.base }}>İşlemler yükleniyor...</div>
          </div>
        </Card>
      ) : transactions.length === 0 ? (
        <Card>
          <div
            style={{
              padding: spacing.xxl,
              textAlign: "center",
              color: themeColors.text.secondary,
            }}
          >
            <div style={{ fontSize: "64px", marginBottom: spacing.lg }}>💼</div>
            <div
              style={{
                fontSize: typography.fontSize.xl,
                fontWeight: typography.fontWeight.semibold,
                color: themeColors.text.primary,
                marginBottom: spacing.sm,
              }}
            >
              Henüz işlem bulunmuyor
            </div>
            <div style={{ fontSize: typography.fontSize.base }}>
              İşlemleriniz burada görüntülenecektir
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <div>
            {transactions.map((transaction: any, index: number) => (
              <div
                key={transaction.id}
                style={{
                  padding: spacing.lg,
                  borderBottom: index < transactions.length - 1 ? `1px solid ${themeColors.border}` : "none",
                  transition: `all ${transitions.normal} ease`,
                  borderRadius: borderRadius.md,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = themeColors.gray[50];
                  e.currentTarget.style.transform = "translateX(4px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.transform = "translateX(0)";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: spacing.md }}>
                    <div
                      style={{
                        fontSize: "32px",
                        padding: spacing.md,
                        backgroundColor:
                          transaction.totalDebit > 0
                            ? colors.successLight
                            : transaction.totalCredit > 0
                              ? colors.dangerLight
                              : themeColors.gray[100],
                        borderRadius: borderRadius.lg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: "56px",
                        height: "56px",
                      }}
                    >
                      {transaction.totalDebit > 0 ? "⬇️" : transaction.totalCredit > 0 ? "⬆️" : "💼"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: typography.fontWeight.semibold,
                          marginBottom: spacing.xs,
                          color: themeColors.text.primary,
                          fontSize: typography.fontSize.base,
                        }}
                      >
                        {transaction.description || transaction.referenceNo || "İşlem"}
                      </div>
                      <div
                        style={{
                          fontSize: typography.fontSize.sm,
                          color: themeColors.text.secondary,
                          display: "flex",
                          alignItems: "center",
                          gap: spacing.sm,
                          flexWrap: "wrap",
                        }}
                      >
                        <span>{formatDate(transaction.date)}</span>
                        {transaction.referenceNo && (
                          <>
                            <span>•</span>
                            <span
                              style={{
                                padding: `${spacing.xs} ${spacing.sm}`,
                                backgroundColor: themeColors.gray[100],
                                borderRadius: borderRadius.sm,
                                fontSize: typography.fontSize.xs,
                              }}
                            >
                              {transaction.referenceNo}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", marginLeft: spacing.md }}>
                    {transaction.totalDebit > 0 && (
                      <div
                        style={{
                          fontWeight: typography.fontWeight.bold,
                          color: colors.success,
                          fontSize: typography.fontSize.lg,
                          marginBottom: spacing.xs,
                        }}
                      >
                        +{formatCurrency(transaction.totalDebit, "TRY")}
                      </div>
                    )}
                    {transaction.totalCredit > 0 && (
                      <div
                        style={{
                          fontWeight: typography.fontWeight.bold,
                          color: colors.error,
                          fontSize: typography.fontSize.lg,
                        }}
                      >
                        -{formatCurrency(transaction.totalCredit, "TRY")}
                      </div>
                    )}
                    {transaction.totalDebit === 0 && transaction.totalCredit === 0 && (
                      <div
                        style={{
                          color: themeColors.text.secondary,
                          fontSize: typography.fontSize.base,
                        }}
                      >
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
