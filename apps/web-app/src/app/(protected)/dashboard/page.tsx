"use client";

import { useQuery } from "@tanstack/react-query";
import { listInvoices, listTransactions, listClientCompanies, listDocuments } from "@repo/api-client";
import Link from "next/link";
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
  // Fetch recent invoices
  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ["dashboard-invoices"],
    queryFn: () => listInvoices({ page: 1, pageSize: 5 }),
  });

  // Fetch recent transactions
  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ["dashboard-transactions"],
    queryFn: () => listTransactions({ page: 1, pageSize: 5 }),
  });

  // Fetch recent customers
  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ["dashboard-customers"],
    queryFn: () => listClientCompanies({ page: 1, pageSize: 5, isActive: true }),
  });

  // Fetch recent documents
  const { data: documentsData, isLoading: documentsLoading } = useQuery({
    queryKey: ["dashboard-documents"],
    queryFn: () => listDocuments({ page: 1, pageSize: 5 }),
  });

  // Fetch totals for statistics
  const { data: allInvoicesData } = useQuery({
    queryKey: ["dashboard-invoices-total"],
    queryFn: () => listInvoices({ page: 1, pageSize: 1 }),
  });

  const { data: allTransactionsData } = useQuery({
    queryKey: ["dashboard-transactions-total"],
    queryFn: () => listTransactions({ page: 1, pageSize: 1 }),
  });

  const { data: allCustomersData } = useQuery({
    queryKey: ["dashboard-customers-total"],
    queryFn: () => listClientCompanies({ page: 1, pageSize: 1, isActive: true }),
  });

  const { data: allDocumentsData } = useQuery({
    queryKey: ["dashboard-documents-total"],
    queryFn: () => listDocuments({ page: 1, pageSize: 1 }),
  });

  const recentInvoices = invoicesData?.data.data || [];
  const recentTransactions = transactionsData?.data.data || [];
  const recentCustomers = customersData?.data.data || [];
  const recentDocuments = documentsData?.data.data || [];

  const totalInvoices = allInvoicesData?.data.total || 0;
  const totalTransactions = allTransactionsData?.data.total || 0;
  const totalCustomers = allCustomersData?.data.total || 0;
  const totalDocuments = allDocumentsData?.data.total || 0;

  // Calculate total invoice amounts
  const totalInvoiceAmount = recentInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Genel bakış ve özet bilgiler"
      />

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
            <Button asLink href="/invoices" variant="outline" size="sm">
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
                  onClick={() => window.location.href = `/invoices/${invoice.id}`}
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
            <Button asLink href="/transactions" variant="outline" size="sm">
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
                  onClick={() => window.location.href = `/transactions/${transaction.id}`}
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

        {/* Recent Customers */}
        <Card
          title="Son Müşteriler"
          actions={
            <Button asLink href="/clients" variant="outline" size="sm">
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
                  onClick={() => window.location.href = `/clients/${customer.id}`}
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

        {/* Recent Documents */}
        <Card
          title="Son Belgeler"
          actions={
            <Button asLink href="/documents" variant="outline" size="sm">
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
              <Button asLink href="/documents" variant="primary" size="sm">
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
                  onClick={() => window.location.href = `/documents/${doc.id}`}
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
