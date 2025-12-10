"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { listInvoices, listTransactions, listClientCompanies, listDocuments, getCurrentUser, onboardingClient } from "@repo/api-client";
import { dashboard as dashboardI18n } from "@repo/i18n";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, TableRow, TableCell } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { colors, spacing } from "@/styles/design-system";

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

export default function DashboardPage() {
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  // Get current user for role check
  const { data: userData } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => getCurrentUser(),
  });

  const currentUser = userData?.data;
  const currentTenant = currentUser?.tenants?.find((t: any) => t.status === "active");
  const userRole = currentTenant?.role;
  const userId = currentUser?.user?.id;
  const userEmail = currentUser?.user?.email;
  const isReadOnly = userRole === "ReadOnly";

  // For ReadOnly users, find their associated client company by email matching
  const { data: allCompaniesData } = useQuery({
    queryKey: ["all-client-companies-for-customer"],
    queryFn: () => listClientCompanies({ pageSize: 1000, isActive: true }),
    enabled: isReadOnly && !!userEmail,
  });

  const customerCompany = isReadOnly && userEmail
    ? allCompaniesData?.data.data?.find(
        (company: any) => company.contactEmail?.toLowerCase() === userEmail.toLowerCase()
      )
    : null;

  const customerCompanyId = customerCompany?.id;

  // Check localStorage for dismissed state
  useEffect(() => {
    if (userId) {
      const dismissed = localStorage.getItem(`onboarding-dismissed-${userId}`);
      setOnboardingDismissed(dismissed === "true");
    }
  }, [userId]);

  // Fetch onboarding state
  const { data: onboardingData } = useQuery({
    queryKey: ["onboarding-state"],
    queryFn: () => onboardingClient.getOnboardingState(),
    enabled: !!userId && !onboardingDismissed,
  });

  const onboardingState = onboardingData?.data;
  const shouldShowOnboarding =
    !onboardingDismissed &&
    onboardingState &&
    (!onboardingState.hasClientCompanies ||
      !onboardingState.hasUploadedDocuments ||
      !onboardingState.hasGeneratedReports);

  const handleDismissOnboarding = (dontShowAgain: boolean) => {
    if (userId) {
      if (dontShowAgain) {
        localStorage.setItem(`onboarding-dismissed-${userId}`, "true");
      }
      setOnboardingDismissed(true);
    }
  };

  // Fetch recent invoices - filter by customer company if ReadOnly
  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ["dashboard-invoices", customerCompanyId],
    queryFn: () => listInvoices({ 
      page: 1, 
      pageSize: 5,
      ...(isReadOnly && customerCompanyId ? { clientCompanyId: customerCompanyId } : {})
    }),
    enabled: !isReadOnly || !!customerCompanyId,
  });

  // Fetch recent transactions - filter by customer company if ReadOnly
  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ["dashboard-transactions", customerCompanyId],
    queryFn: () => listTransactions({ 
      page: 1, 
      pageSize: 5,
      ...(isReadOnly && customerCompanyId ? { clientCompanyId: customerCompanyId } : {})
    }),
    enabled: !isReadOnly || !!customerCompanyId,
  });

  // Fetch recent customers - only for non-ReadOnly users
  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ["dashboard-customers"],
    queryFn: () => listClientCompanies({ page: 1, pageSize: 5, isActive: true }),
    enabled: !isReadOnly,
  });

  // Fetch recent documents - filter by customer company if ReadOnly
  const { data: documentsData, isLoading: documentsLoading } = useQuery({
    queryKey: ["dashboard-documents", customerCompanyId],
    queryFn: () => listDocuments({ 
      page: 1, 
      pageSize: 5,
      ...(isReadOnly && customerCompanyId ? { clientCompanyId: customerCompanyId } : {})
    }),
    enabled: !isReadOnly || !!customerCompanyId,
  });

  // Fetch totals for statistics - filter by customer company if ReadOnly
  const { data: allInvoicesData } = useQuery({
    queryKey: ["dashboard-invoices-total", customerCompanyId],
    queryFn: () => listInvoices({ 
      page: 1, 
      pageSize: 1,
      ...(isReadOnly && customerCompanyId ? { clientCompanyId: customerCompanyId } : {})
    }),
    enabled: !isReadOnly || !!customerCompanyId,
  });

  const { data: allTransactionsData } = useQuery({
    queryKey: ["dashboard-transactions-total", customerCompanyId],
    queryFn: () => listTransactions({ 
      page: 1, 
      pageSize: 1,
      ...(isReadOnly && customerCompanyId ? { clientCompanyId: customerCompanyId } : {})
    }),
    enabled: !isReadOnly || !!customerCompanyId,
  });

  const { data: allCustomersData } = useQuery({
    queryKey: ["dashboard-customers-total"],
    queryFn: () => listClientCompanies({ page: 1, pageSize: 1, isActive: true }),
    enabled: !isReadOnly,
  });

  const { data: allDocumentsData } = useQuery({
    queryKey: ["dashboard-documents-total", customerCompanyId],
    queryFn: () => listDocuments({ 
      page: 1, 
      pageSize: 1,
      ...(isReadOnly && customerCompanyId ? { clientCompanyId: customerCompanyId } : {})
    }),
    enabled: !isReadOnly || !!customerCompanyId,
  });

  const recentInvoices = invoicesData?.data.data || [];
  const recentTransactions = transactionsData?.data.data || [];
  const recentCustomers = customersData?.data.data || [];
  const recentDocuments = documentsData?.data.data || [];

  const totalInvoices = allInvoicesData?.data.total || 0;
  const totalTransactions = allTransactionsData?.data.total || 0;
  const totalCustomers = allCustomersData?.data.total || 0;
  const totalDocuments = allDocumentsData?.data.total || 0;

  // Calculate total invoice amounts (reserved for future use)
  // const totalInvoiceAmount = recentInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Genel bakış ve özet bilgiler"
      />

      {/* Onboarding Card */}
      {shouldShowOnboarding && (
        <Card
          style={{
            marginBottom: spacing.xl,
            backgroundColor: colors.primaryLight,
            border: `2px solid ${colors.primary}`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.md }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: spacing.sm, color: colors.text.primary }}>
                {dashboardI18n.onboarding.title}
              </h2>
              <p style={{ color: colors.text.secondary, marginBottom: spacing.md }}>
                {dashboardI18n.onboarding.description}
              </p>
              <ul style={{ listStyle: "none", padding: 0, marginBottom: spacing.md }}>
                <li style={{ marginBottom: spacing.xs, color: colors.text.primary }}>
                  {dashboardI18n.onboarding.checklist.step1}
                </li>
                <li style={{ marginBottom: spacing.xs, color: colors.text.primary }}>
                  {dashboardI18n.onboarding.checklist.step2}
                </li>
                <li style={{ marginBottom: spacing.xs, color: colors.text.primary }}>
                  {dashboardI18n.onboarding.checklist.step3}
                </li>
              </ul>
              <div style={{ display: "flex", gap: spacing.sm, flexWrap: "wrap" }}>
                {!isReadOnly && (
                  <>
                    <Button asLink href="/musteriler/new" variant="primary" size="sm">
                      {dashboardI18n.onboarding.buttons.createClient}
                    </Button>
                    <Button asLink href="/belgeler" variant="primary" size="sm">
                      {dashboardI18n.onboarding.buttons.uploadDocument}
                    </Button>
                  </>
                )}
                <Button asLink href="/raporlar" variant="outline" size="sm">
                  {dashboardI18n.onboarding.buttons.goToReports}
                </Button>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: spacing.xs }}>
              <button
                onClick={() => handleDismissOnboarding(false)}
                style={{
                  padding: `${spacing.xs} ${spacing.sm}`,
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "14px",
                  color: colors.text.secondary,
                }}
              >
                {dashboardI18n.onboarding.buttons.close}
              </button>
              <button
                onClick={() => handleDismissOnboarding(true)}
                style={{
                  padding: `${spacing.xs} ${spacing.sm}`,
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "12px",
                  color: colors.text.secondary,
                }}
              >
                {dashboardI18n.onboarding.buttons.dontShowAgain}
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Statistics Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: spacing.lg,
          marginBottom: spacing.xl,
        }}
      >
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ margin: 0, color: colors.text.secondary, fontSize: "14px" }}>Toplam Fatura</p>
              <h2 style={{ margin: `${spacing.xs} 0 0 0`, fontSize: "32px", fontWeight: 600 }}>
                {totalInvoices}
              </h2>
            </div>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                backgroundColor: colors.primaryLight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
              }}
            >
              📄
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ margin: 0, color: colors.text.secondary, fontSize: "14px" }}>Toplam İşlem</p>
              <h2 style={{ margin: `${spacing.xs} 0 0 0`, fontSize: "32px", fontWeight: 600 }}>
                {totalTransactions}
              </h2>
            </div>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                backgroundColor: colors.successLight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
              }}
            >
              💰
            </div>
          </div>
        </Card>

        {/* Hide "Toplam Müşteri" card for ReadOnly users */}
        {!isReadOnly && (
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ margin: 0, color: colors.text.secondary, fontSize: "14px" }}>Toplam Müşteri</p>
                <h2 style={{ margin: `${spacing.xs} 0 0 0`, fontSize: "32px", fontWeight: 600 }}>
                  {totalCustomers}
                </h2>
              </div>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  backgroundColor: colors.warning + "20",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                }}
              >
                👥
              </div>
            </div>
          </Card>
        )}

        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ margin: 0, color: colors.text.secondary, fontSize: "14px" }}>Toplam Belge</p>
              <h2 style={{ margin: `${spacing.xs} 0 0 0`, fontSize: "32px", fontWeight: 600 }}>
                {totalDocuments}
              </h2>
            </div>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                backgroundColor: colors.info + "20",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
              }}
            >
              📎
            </div>
          </div>
        </Card>
      </div>

      {/* Show message if customer company not found */}
      {isReadOnly && !customerCompany && (
        <Card
          style={{
            marginBottom: spacing.lg,
            backgroundColor: colors.warning + "20",
            border: `1px solid ${colors.warning}`,
          }}
        >
          <p style={{ color: colors.text.primary, margin: 0 }}>
            ⚠️ Müşteri şirketi bulunamadı. Lütfen yöneticinizle iletişime geçin.
          </p>
        </Card>
      )}

      {/* Recent Data Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
          gap: spacing.lg,
        }}
      >
        {/* Recent Invoices */}
        <Card
          title="Son Faturalar"
          actions={
            <Button asLink href="/faturalar" variant="outline" size="sm">
              Tümünü Gör
            </Button>
          }
        >
          {invoicesLoading ? (
            <p style={{ color: colors.text.secondary }}>Yükleniyor...</p>
          ) : recentInvoices.length === 0 ? (
            <p style={{ color: colors.text.secondary }}>Henüz fatura bulunmuyor.</p>
          ) : (
            <Table
              headers={["Fatura No", "Müşteri", "Tutar", "Durum", "Tarih"]}
            >
              {recentInvoices.map((invoice) => (
                <TableRow
                  key={invoice.id}
                  onClick={() => window.location.href = `/faturalar/${invoice.id}`}
                >
                  <TableCell>
                    <div>
                      <div style={{ fontWeight: 500 }}>{invoice.externalId || "N/A"}</div>
                      <div style={{ fontSize: "12px", color: colors.text.secondary }}>
                        {TYPE_LABELS[invoice.type] || invoice.type}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div style={{ fontSize: "14px" }}>
                      {invoice.clientCompanyName || "N/A"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div style={{ fontWeight: 500 }}>
                      {formatCurrency(invoice.totalAmount, invoice.currency)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      style={{
                        padding: `${spacing.xs} ${spacing.sm}`,
                        borderRadius: "4px",
                        fontSize: "12px",
                        backgroundColor:
                          invoice.status === "kesildi"
                            ? colors.successLight
                            : invoice.status === "taslak"
                            ? colors.warning + "20"
                            : colors.gray[200],
                        color:
                          invoice.status === "kesildi"
                            ? colors.successDark
                            : invoice.status === "taslak"
                            ? colors.dark
                            : colors.text.secondary,
                      }}
                    >
                      {STATUS_LABELS[invoice.status] || invoice.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div style={{ fontSize: "12px", color: colors.text.secondary }}>
                      {formatDate(invoice.issueDate)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </Table>
          )}
        </Card>

        {/* Recent Transactions */}
        <Card
          title="Son İşlemler"
          actions={
            <Button asLink href="/islemler" variant="outline" size="sm">
              Tümünü Gör
            </Button>
          }
        >
          {transactionsLoading ? (
            <p style={{ color: colors.text.secondary }}>Yükleniyor...</p>
          ) : recentTransactions.length === 0 ? (
            <p style={{ color: colors.text.secondary }}>Henüz işlem bulunmuyor.</p>
          ) : (
            <Table
              headers={["Referans", "Açıklama", "Tarih"]}
            >
              {recentTransactions.map((transaction) => (
                <TableRow
                  key={transaction.id}
                  onClick={() => window.location.href = `/islemler/${transaction.id}`}
                >
                  <TableCell>
                    <div style={{ fontWeight: 500 }}>
                      {transaction.referenceNo || "N/A"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div style={{ fontSize: "14px", color: colors.text.secondary }}>
                      {transaction.description || "Açıklama yok"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div style={{ fontSize: "12px", color: colors.text.secondary }}>
                      {formatDate(transaction.date)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </Table>
          )}
        </Card>

        {/* Recent Customers - Hide for ReadOnly users */}
        {!isReadOnly && (
          <Card
            title="Son Müşteriler"
            actions={
              <Button asLink href="/musteriler" variant="outline" size="sm">
                Tümünü Gör
              </Button>
            }
          >
            {customersLoading ? (
              <p style={{ color: colors.text.secondary }}>Yükleniyor...</p>
            ) : recentCustomers.length === 0 ? (
              <p style={{ color: colors.text.secondary }}>Henüz müşteri bulunmuyor.</p>
            ) : (
              <Table
                headers={["Müşteri Adı", "Vergi No", "Durum"]}
              >
                {recentCustomers.map((customer) => (
                  <TableRow
                    key={customer.id}
                    onClick={() => window.location.href = `/musteriler/${customer.id}`}
                  >
                    <TableCell>
                      <div style={{ fontWeight: 500 }}>{customer.name}</div>
                      {customer.contactPersonName && (
                        <div style={{ fontSize: "12px", color: colors.text.secondary }}>
                          {customer.contactPersonName}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div style={{ fontSize: "14px", color: colors.text.secondary }}>
                        {customer.taxNumber}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        style={{
                          padding: `${spacing.xs} ${spacing.sm}`,
                          borderRadius: "4px",
                          fontSize: "12px",
                          backgroundColor: customer.isActive ? colors.successLight : colors.gray[200],
                          color: customer.isActive ? colors.successDark : colors.text.secondary,
                        }}
                      >
                        {customer.isActive ? "Aktif" : "Pasif"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </Table>
            )}
          </Card>
        )}

        {/* Recent Documents */}
        <Card
          title="Son Belgeler"
          actions={
            <Button asLink href="/belgeler" variant="outline" size="sm">
              Tümünü Gör
            </Button>
          }
        >
          {documentsLoading ? (
            <p style={{ color: colors.text.secondary }}>Yükleniyor...</p>
          ) : recentDocuments.length === 0 ? (
            <div>
              <p style={{ color: colors.text.secondary, marginBottom: spacing.md }}>
                Henüz belge bulunmuyor.
              </p>
              <Button asLink href="/belgeler" variant="primary" size="sm">
                Belge Yükle
              </Button>
            </div>
          ) : (
            <Table
              headers={["Dosya Adı", "Tür", "Durum", "Tarih"]}
            >
              {recentDocuments.map((doc) => (
                <TableRow
                  key={doc.id}
                  onClick={() => window.location.href = `/belgeler/${doc.id}`}
                >
                  <TableCell>
                    <div style={{ fontWeight: 500 }}>{doc.originalFileName}</div>
                  </TableCell>
                  <TableCell>
                    <div style={{ fontSize: "14px", color: colors.text.secondary }}>
                      {doc.type === "INVOICE" ? "Fatura" : doc.type === "BANK_STATEMENT" ? "Banka Ekstresi" : doc.type === "RECEIPT" ? "Fiş" : "Diğer"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      style={{
                        padding: `${spacing.xs} ${spacing.sm}`,
                        borderRadius: "4px",
                        fontSize: "12px",
                        backgroundColor:
                          doc.status === "PROCESSED"
                            ? colors.successLight
                            : doc.status === "PROCESSING"
                            ? colors.info + "20"
                            : doc.status === "FAILED"
                            ? colors.dangerLight
                            : colors.gray[200],
                        color:
                          doc.status === "PROCESSED"
                            ? colors.successDark
                            : doc.status === "PROCESSING"
                            ? colors.info
                            : doc.status === "FAILED"
                            ? colors.dangerDark
                            : colors.text.secondary,
                      }}
                    >
                      {doc.status === "PROCESSED" ? "İşlendi" : doc.status === "PROCESSING" ? "İşleniyor" : doc.status === "FAILED" ? "Başarısız" : "Yüklendi"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div style={{ fontSize: "12px", color: colors.text.secondary }}>
                      {formatDate(doc.createdAt)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
