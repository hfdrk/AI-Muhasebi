"use client";

import { useQuery } from "@tanstack/react-query";
import { listInvoices, listTransactions, listDocuments, getCurrentUser, getClientCompanyRiskScore } from "@repo/api-client";
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

export default function ClientDashboardPage() {
  // Get current user to find their client company
  const { data: userData } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => getCurrentUser(),
  });

  const currentUser = userData?.data;
  const currentTenant = currentUser?.tenants?.find((t: any) => t.status === "active");
  
  // For ReadOnly users, we need to find their associated client company
  // This is a simplified approach - in production, you'd have a direct link
  const clientCompanyId = currentTenant?.clientCompanyId;

  // Fetch recent invoices (filtered by client company if available)
  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ["client-dashboard-invoices", clientCompanyId],
    queryFn: () => listInvoices({ page: 1, pageSize: 5, clientCompanyId }),
    enabled: !!clientCompanyId,
  });

  // Fetch recent transactions
  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ["client-dashboard-transactions", clientCompanyId],
    queryFn: () => listTransactions({ page: 1, pageSize: 5, clientCompanyId }),
    enabled: !!clientCompanyId,
  });

  // Fetch recent documents
  const { data: documentsData, isLoading: documentsLoading } = useQuery({
    queryKey: ["client-dashboard-documents", clientCompanyId],
    queryFn: () => listDocuments({ page: 1, pageSize: 5, clientCompanyId }),
    enabled: !!clientCompanyId,
  });

  // Fetch risk score
  const { data: riskData } = useQuery({
    queryKey: ["client-risk-score", clientCompanyId],
    queryFn: () => getClientCompanyRiskScore(clientCompanyId!),
    enabled: !!clientCompanyId,
  });

  const invoices = invoicesData?.data?.data || [];
  const transactions = transactionsData?.data?.data || [];
  const documents = documentsData?.data?.data || [];
  const riskScore = riskData?.data;

  return (
    <div>
      <PageHeader title="Müşteri Panosu" />

      {/* Welcome Section */}
      <Card style={{ marginBottom: spacing.lg, padding: spacing.xl }}>
        <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: spacing.sm }}>
          Hoş Geldiniz, {currentUser?.user?.fullName || "Müşteri"}!
        </h2>
        <p style={{ color: colors.text.secondary, marginBottom: spacing.md }}>
          Bu panelden belgelerinizi görüntüleyebilir, yeni belgeler yükleyebilir ve finansal durumunuzu takip edebilirsiniz.
        </p>
        <Link
          href="/client/upload"
          style={{
            display: "inline-block",
            padding: `${spacing.sm} ${spacing.lg}`,
            backgroundColor: colors.primary,
            color: colors.white,
            textDecoration: "none",
            borderRadius: "6px",
            fontWeight: "medium",
          }}
        >
          📤 Yeni Belge Yükle
        </Link>
      </Card>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: spacing.md, marginBottom: spacing.lg }}>
        <Card>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: colors.primary, marginBottom: spacing.xs }}>
            {invoices.length}
          </div>
          <div style={{ color: colors.text.secondary, fontSize: "14px" }}>Son Faturalar</div>
        </Card>

        <Card>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: colors.primary, marginBottom: spacing.xs }}>
            {transactions.length}
          </div>
          <div style={{ color: colors.text.secondary, fontSize: "14px" }}>Son İşlemler</div>
        </Card>

        <Card>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: colors.primary, marginBottom: spacing.xs }}>
            {documents.length}
          </div>
          <div style={{ color: colors.text.secondary, fontSize: "14px" }}>Yüklenen Belgeler</div>
        </Card>

        {riskScore && riskScore.riskScore && (
          <Card>
            <div style={{ fontSize: "32px", fontWeight: "bold", color: riskScore.riskScore.severity === "high" ? colors.error : colors.primary, marginBottom: spacing.xs }}>
              {Number(riskScore.riskScore.score).toFixed(0)}
            </div>
            <div style={{ color: colors.text.secondary, fontSize: "14px" }}>Risk Skoru</div>
          </Card>
        )}
      </div>

      {/* Recent Invoices */}
      <Card style={{ marginBottom: spacing.lg }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }}>
          <h3 style={{ fontSize: "18px", fontWeight: "semibold" }}>Son Faturalar</h3>
          <Link href="/client/invoices" style={{ color: colors.primary, textDecoration: "none", fontSize: "14px" }}>
            Tümünü Gör →
          </Link>
        </div>
        {invoicesLoading ? (
          <div>Yükleniyor...</div>
        ) : invoices.length === 0 ? (
          <div style={{ color: colors.text.secondary, padding: spacing.md, textAlign: "center" }}>
            Henüz fatura bulunmuyor.
          </div>
        ) : (
          <div>
            {invoices.map((invoice: any) => (
              <div
                key={invoice.id}
                style={{
                  padding: spacing.md,
                  borderBottom: `1px solid ${colors.gray[200]}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: "medium", marginBottom: spacing.xs }}>
                    {formatDate(invoice.issueDate)} - {formatCurrency(Number(invoice.totalAmount), invoice.currency)}
                  </div>
                  <div style={{ fontSize: "14px", color: colors.text.secondary }}>
                    {invoice.type === "SATIŞ" ? "Satış" : "Alış"} Faturası
                  </div>
                </div>
                <Link
                  href={`/client/invoices/${invoice.id}`}
                  style={{ color: colors.primary, textDecoration: "none", fontSize: "14px" }}
                >
                  Detay →
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Recent Documents */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }}>
          <h3 style={{ fontSize: "18px", fontWeight: "semibold" }}>Son Belgeler</h3>
          <Link href="/client/documents" style={{ color: colors.primary, textDecoration: "none", fontSize: "14px" }}>
            Tümünü Gör →
          </Link>
        </div>
        {documentsLoading ? (
          <div>Yükleniyor...</div>
        ) : documents.length === 0 ? (
          <div style={{ color: colors.text.secondary, padding: spacing.md, textAlign: "center" }}>
            Henüz belge bulunmuyor. <Link href="/client/upload" style={{ color: colors.primary }}>İlk belgenizi yükleyin</Link>
          </div>
        ) : (
          <div>
            {documents.map((doc: any) => (
              <div
                key={doc.id}
                style={{
                  padding: spacing.md,
                  borderBottom: `1px solid ${colors.gray[200]}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: "medium", marginBottom: spacing.xs }}>{doc.filename}</div>
                  <div style={{ fontSize: "14px", color: colors.text.secondary }}>
                    {formatDate(doc.uploadedAt)} - {doc.status}
                  </div>
                </div>
                <Link
                  href={`/client/documents/${doc.id}`}
                  style={{ color: colors.primary, textDecoration: "none", fontSize: "14px" }}
                >
                  Görüntüle →
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

