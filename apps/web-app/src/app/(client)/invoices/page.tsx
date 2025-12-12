"use client";

import { useQuery } from "@tanstack/react-query";
import { listInvoices, getCurrentUser } from "@repo/api-client";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { colors, spacing } from "@/styles/design-system";
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
  const { data: userData } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => getCurrentUser(),
  });

  const currentTenant = userData?.data?.tenants?.find((t: any) => t.status === "active");
  const clientCompanyId = currentTenant?.clientCompanyId;

  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ["client-invoices", clientCompanyId],
    queryFn: () => listInvoices({ page: 1, pageSize: 50, clientCompanyId }),
    enabled: !!clientCompanyId,
  });

  const invoices = invoicesData?.data?.data || [];

  return (
    <div>
      <PageHeader title="Faturalarım" />

      <div style={{ marginBottom: spacing.lg }}>
        <p style={{ color: colors.text.secondary }}>
          {invoices.length} fatura bulundu
        </p>
      </div>

      {isLoading ? (
        <div>Yükleniyor...</div>
      ) : invoices.length === 0 ? (
        <Card>
          <div style={{ padding: spacing.xl, textAlign: "center", color: colors.text.secondary }}>
            <div style={{ fontSize: "48px", marginBottom: spacing.md }}>📄</div>
            <div>Henüz fatura bulunmuyor.</div>
          </div>
        </Card>
      ) : (
        <Card>
          <div>
            {invoices.map((invoice: any) => (
              <Link
                key={invoice.id}
                href={`/client/invoices/${invoice.id}`}
                style={{
                  display: "block",
                  padding: spacing.md,
                  borderBottom: `1px solid ${colors.gray[200]}`,
                  textDecoration: "none",
                  color: "inherit",
                  transition: "background-color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.gray[50];
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "medium", marginBottom: spacing.xs, color: colors.text.primary }}>
                      {TYPE_LABELS[invoice.type] || invoice.type} Faturası
                    </div>
                    <div style={{ fontSize: "14px", color: colors.text.secondary }}>
                      {formatDate(invoice.issueDate)} • {formatCurrency(Number(invoice.totalAmount), invoice.currency)}
                    </div>
                  </div>
                  <div style={{ color: colors.primary, fontSize: "14px" }}>→</div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}


