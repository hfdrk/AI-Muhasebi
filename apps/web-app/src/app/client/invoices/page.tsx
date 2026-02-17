"use client";

import { useQuery } from "@tanstack/react-query";
import { listInvoices, getMyClientCompany } from "@repo/api-client";
import { Card } from "@/components/ui/Card";
import { colors, spacing, borderRadius, transitions, typography, shadows } from "@/styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";
import Link from "next/link";

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

const TYPE_LABELS: Record<string, string> = {
  SATIŞ: "Satış",
  ALIŞ: "Alış",
};

export default function ClientInvoicesPage() {
  const { themeColors } = useTheme();
  // Get client company for ReadOnly user
  const { data: clientCompanyData } = useQuery({
    queryKey: ["myClientCompany"],
    queryFn: () => getMyClientCompany(),
  });

  const clientCompany = clientCompanyData?.data;
  const clientCompanyId = clientCompany?.id || undefined;

  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ["client-invoices", clientCompanyId],
    queryFn: () => listInvoices({ page: 1, pageSize: 50, clientCompanyId }),
    enabled: !!clientCompanyId,
  });

  const invoices = invoicesData?.data?.data || [];

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
          <strong style={{ color: themeColors.text.primary }}>{invoices.length}</strong> fatura bulundu
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
            <div style={{ fontSize: typography.fontSize.base }}>Faturalar yükleniyor...</div>
          </div>
        </Card>
      ) : invoices.length === 0 ? (
        <Card>
          <div
            style={{
              padding: spacing.xxl,
              textAlign: "center",
              color: themeColors.text.secondary,
            }}
          >
            <div style={{ fontSize: "64px", marginBottom: spacing.lg }}>📄</div>
            <div
              style={{
                fontSize: typography.fontSize.xl,
                fontWeight: typography.fontWeight.semibold,
                color: themeColors.text.primary,
                marginBottom: spacing.sm,
              }}
            >
              Henüz fatura bulunmuyor
            </div>
            <div style={{ fontSize: typography.fontSize.base }}>
              Faturalarınız burada görüntülenecektir
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <div>
            {invoices.map((invoice: any, index: number) => (
              <Link
                key={invoice.id}
                href={`/client/invoices/${invoice.id}`}
                style={{
                  display: "block",
                  padding: spacing.lg,
                  borderBottom: index < invoices.length - 1 ? `1px solid ${themeColors.border}` : "none",
                  textDecoration: "none",
                  color: "inherit",
                  transition: `all ${transitions.normal} ease`,
                  borderRadius: borderRadius.md,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = themeColors.gray[50];
                  e.currentTarget.style.transform = "translateX(4px)";
                  e.currentTarget.style.boxShadow = shadows.sm;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.transform = "translateX(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: spacing.md }}>
                    <div
                      style={{
                        fontSize: "32px",
                        padding: spacing.md,
                        backgroundColor:
                          invoice.type === "SATIŞ" ? colors.successLight : colors.infoLight,
                        borderRadius: borderRadius.lg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: "56px",
                        height: "56px",
                      }}
                    >
                      {invoice.type === "SATIŞ" ? "📊" : "📥"}
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
                        {TYPE_LABELS[invoice.type] || invoice.type} Faturası
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
                        <span>{formatDate(invoice.issueDate)}</span>
                        <span>•</span>
                        <span
                          style={{
                            fontSize: typography.fontSize.base,
                            fontWeight: typography.fontWeight.bold,
                            color: invoice.type === "SATIŞ" ? colors.success : colors.info,
                          }}
                        >
                          {formatCurrency(Number(invoice.totalAmount), invoice.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      color: colors.primary,
                      fontSize: typography.fontSize.xl,
                      fontWeight: typography.fontWeight.bold,
                      marginLeft: spacing.md,
                    }}
                  >
                    →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
