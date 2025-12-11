"use client";

import { useQuery } from "@tanstack/react-query";
import { listInvoices, listTransactions, listDocuments, getCurrentUser, getClientCompanyRiskScore, getMyClientCompany } from "@repo/api-client";
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
  // Get current user
  const { data: userData } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => getCurrentUser(),
  });

  const currentUser = userData?.data;

  // Get client company for ReadOnly user (matched by email)
  const { data: clientCompanyData } = useQuery({
    queryKey: ["myClientCompany"],
    queryFn: () => getMyClientCompany(),
  });

  const clientCompany = clientCompanyData?.data;
  const clientCompanyId = clientCompany?.id || null;

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

  // Show message if client company not found
  if (!clientCompanyId && clientCompanyData && !clientCompanyData.data) {
    return (
      <div>
        <PageHeader title="Müşteri Panosu" />
        <Card style={{ padding: spacing.xl, textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: spacing.md }}>⚠️</div>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: spacing.sm }}>
            Müşteri Şirketi Bulunamadı
          </h2>
          <p style={{ color: colors.text.secondary, marginBottom: spacing.md }}>
            Hesabınız henüz bir müşteri şirketi ile eşleştirilmemiş.
          </p>
          <p style={{ color: colors.text.secondary, fontSize: "14px" }}>
            Lütfen muhasebeci ile iletişime geçin. E-posta adresinizin müşteri şirketinin iletişim e-postası ile eşleşmesi gerekmektedir.
          </p>
        </Card>
      </div>
    );
  }

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
            <div style={{ fontSize: "32px", fontWeight: "bold", color: riskScore.riskScore.severity === "high" ? colors.error : riskScore.riskScore.severity === "medium" ? "#FFA500" : colors.success, marginBottom: spacing.xs }}>
              {Number(riskScore.riskScore.score).toFixed(0)}
            </div>
            <div style={{ color: colors.text.secondary, fontSize: "14px", marginBottom: spacing.xs }}>Risk Skoru</div>
            <div style={{ fontSize: "12px", color: colors.text.secondary }}>
              {riskScore.riskScore.severity === "high" ? "Yüksek Risk" : riskScore.riskScore.severity === "medium" ? "Orta Risk" : "Düşük Risk"}
            </div>
          </Card>
        )}
      </div>

      {/* Risk Score Details */}
      {riskScore && riskScore.riskScore && (
        <Card style={{ marginBottom: spacing.lg }}>
          <h3 style={{ fontSize: "18px", fontWeight: "semibold", marginBottom: spacing.md }}>Risk Analizi</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: spacing.md }}>
            <div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: colors.success, marginBottom: spacing.xs }}>
                {riskScore.breakdown?.low || 0}
              </div>
              <div style={{ color: colors.text.secondary, fontSize: "14px" }}>Düşük Risk</div>
            </div>
            <div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#FFA500", marginBottom: spacing.xs }}>
                {riskScore.breakdown?.medium || 0}
              </div>
              <div style={{ color: colors.text.secondary, fontSize: "14px" }}>Orta Risk</div>
            </div>
            <div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: colors.error, marginBottom: spacing.xs }}>
                {riskScore.breakdown?.high || 0}
              </div>
              <div style={{ color: colors.text.secondary, fontSize: "14px" }}>Yüksek Risk</div>
            </div>
          </div>
          {riskScore.topTriggeredRules && riskScore.topTriggeredRules.length > 0 && (
            <div style={{ marginTop: spacing.md, paddingTop: spacing.md, borderTop: `1px solid ${colors.gray[200]}` }}>
              <div style={{ fontSize: "14px", fontWeight: "medium", marginBottom: spacing.sm }}>En Çok Tetiklenen Kurallar:</div>
              {riskScore.topTriggeredRules.slice(0, 3).map((rule: any, index: number) => (
                <div key={index} style={{ fontSize: "13px", color: colors.text.secondary, marginBottom: spacing.xs }}>
                  • {rule.description} ({rule.count} kez)
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

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
