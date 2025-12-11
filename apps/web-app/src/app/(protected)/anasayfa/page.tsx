"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { listInvoices, listTransactions, listClientCompanies, listDocuments, getCurrentUser, onboardingClient } from "@repo/api-client";
import { dashboard as dashboardI18n } from "@repo/i18n";
import Link from "next/link";

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "kesildi":
        return { bg: "#d1fae5", text: "#065f46", border: "#10b981" };
      case "taslak":
        return { bg: "#fef3c7", text: "#92400e", border: "#f59e0b" };
      case "iptal":
        return { bg: "#f3f4f6", text: "#6b7280", border: "#9ca3af" };
      case "muhasebeleştirilmiş":
        return { bg: "#dbeafe", text: "#1e40af", border: "#3b82f6" };
      default:
        return { bg: "#f3f4f6", text: "#6b7280", border: "#9ca3af" };
    }
  };

  return (
    <div style={{ padding: "32px", maxWidth: "1600px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "700", marginBottom: "8px", color: "#111827" }}>
          Dashboard
        </h1>
        <p style={{ color: "#6b7280", fontSize: "16px" }}>Genel bakış ve özet bilgiler</p>
      </div>

      {/* Onboarding Card */}
      {shouldShowOnboarding && (
        <div
          style={{
            padding: "24px",
            backgroundColor: "#eff6ff",
            borderRadius: "12px",
            border: "2px solid #2563eb",
            marginBottom: "32px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "8px", color: "#111827" }}>
                {dashboardI18n.onboarding.title}
              </h2>
              <p style={{ color: "#4b5563", marginBottom: "16px", fontSize: "14px" }}>
                {dashboardI18n.onboarding.description}
              </p>
              <ul style={{ listStyle: "none", padding: 0, marginBottom: "16px" }}>
                <li style={{ marginBottom: "8px", color: "#111827", fontSize: "14px" }}>
                  ✓ {dashboardI18n.onboarding.checklist.step1}
                </li>
                <li style={{ marginBottom: "8px", color: "#111827", fontSize: "14px" }}>
                  ✓ {dashboardI18n.onboarding.checklist.step2}
                </li>
                <li style={{ marginBottom: "8px", color: "#111827", fontSize: "14px" }}>
                  ✓ {dashboardI18n.onboarding.checklist.step3}
                </li>
              </ul>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                {!isReadOnly && (
                  <>
                    <Link
                      href="/musteriler/new"
                      style={{
                        padding: "10px 20px",
                        backgroundColor: "#2563eb",
                        color: "white",
                        borderRadius: "8px",
                        textDecoration: "none",
                        fontWeight: "500",
                        fontSize: "14px",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#1d4ed8";
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#2563eb";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      {dashboardI18n.onboarding.buttons.createClient}
                    </Link>
                    <Link
                      href="/belgeler"
                      style={{
                        padding: "10px 20px",
                        backgroundColor: "#2563eb",
                        color: "white",
                        borderRadius: "8px",
                        textDecoration: "none",
                        fontWeight: "500",
                        fontSize: "14px",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#1d4ed8";
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#2563eb";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      {dashboardI18n.onboarding.buttons.uploadDocument}
                    </Link>
                  </>
                )}
                <Link
                  href="/raporlar"
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "white",
                    color: "#2563eb",
                    borderRadius: "8px",
                    textDecoration: "none",
                    fontWeight: "500",
                    fontSize: "14px",
                    border: "1px solid #2563eb",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#eff6ff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "white";
                  }}
                >
                  {dashboardI18n.onboarding.buttons.goToReports}
                </Link>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <button
                onClick={() => handleDismissOnboarding(false)}
                style={{
                  padding: "8px 12px",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "14px",
                  color: "#6b7280",
                }}
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "24px",
          marginBottom: "32px",
        }}
      >
        {/* Total Invoices */}
        <div
          style={{
            padding: "24px",
            backgroundColor: "white",
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            border: "1px solid #e5e7eb",
            transition: "all 0.2s",
            position: "relative",
            overflow: "hidden",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "80px",
              height: "80px",
              backgroundColor: "#dbeafe",
              borderRadius: "0 0 0 100%",
              opacity: 0.3,
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ margin: 0, color: "#6b7280", fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>
                Toplam Fatura
              </p>
              <h2 style={{ margin: 0, fontSize: "36px", fontWeight: "700", color: "#111827" }}>
                {totalInvoices}
              </h2>
            </div>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "12px",
                backgroundColor: "#dbeafe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
              }}
            >
              📄
            </div>
          </div>
        </div>

        {/* Total Transactions */}
        <div
          style={{
            padding: "24px",
            backgroundColor: "white",
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            border: "1px solid #e5e7eb",
            transition: "all 0.2s",
            position: "relative",
            overflow: "hidden",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "80px",
              height: "80px",
              backgroundColor: "#d1fae5",
              borderRadius: "0 0 0 100%",
              opacity: 0.3,
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ margin: 0, color: "#6b7280", fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>
                Toplam İşlem
              </p>
              <h2 style={{ margin: 0, fontSize: "36px", fontWeight: "700", color: "#111827" }}>
                {totalTransactions}
              </h2>
            </div>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "12px",
                backgroundColor: "#d1fae5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
              }}
            >
              💰
            </div>
          </div>
        </div>

        {/* Total Customers - Hide for ReadOnly users */}
        {!isReadOnly && (
          <div
            style={{
              padding: "24px",
              backgroundColor: "white",
              borderRadius: "12px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              border: "1px solid #e5e7eb",
              transition: "all 0.2s",
              position: "relative",
              overflow: "hidden",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: "80px",
                height: "80px",
                backgroundColor: "#fef3c7",
                borderRadius: "0 0 0 100%",
                opacity: 0.3,
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ margin: 0, color: "#6b7280", fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>
                  Toplam Müşteri
                </p>
                <h2 style={{ margin: 0, fontSize: "36px", fontWeight: "700", color: "#111827" }}>
                  {totalCustomers}
                </h2>
              </div>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "12px",
                  backgroundColor: "#fef3c7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "28px",
                }}
              >
                👥
              </div>
            </div>
          </div>
        )}

        {/* Total Documents */}
        <div
          style={{
            padding: "24px",
            backgroundColor: "white",
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            border: "1px solid #e5e7eb",
            transition: "all 0.2s",
            position: "relative",
            overflow: "hidden",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "80px",
              height: "80px",
              backgroundColor: "#e0e7ff",
              borderRadius: "0 0 0 100%",
              opacity: 0.3,
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ margin: 0, color: "#6b7280", fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>
                Toplam Belge
              </p>
              <h2 style={{ margin: 0, fontSize: "36px", fontWeight: "700", color: "#111827" }}>
                {totalDocuments}
              </h2>
            </div>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "12px",
                backgroundColor: "#e0e7ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
              }}
            >
              📎
            </div>
          </div>
        </div>
      </div>

      {/* Show message if customer company not found */}
      {isReadOnly && !customerCompany && (
        <div
          style={{
            padding: "16px 20px",
            backgroundColor: "#fef3c7",
            borderRadius: "12px",
            border: "1px solid #f59e0b",
            marginBottom: "24px",
            color: "#92400e",
          }}
        >
          <p style={{ margin: 0, fontSize: "14px" }}>
            ⚠️ Müşteri şirketi bulunamadı. Lütfen yöneticinizle iletişime geçin.
          </p>
        </div>
      )}

      {/* Recent Data Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
          gap: "24px",
        }}
      >
        {/* Recent Invoices */}
        <div
          style={{
            padding: "24px",
            backgroundColor: "white",
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#111827" }}>Son Faturalar</h3>
            <Link
              href="/faturalar"
              style={{
                padding: "6px 12px",
                color: "#2563eb",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "500",
                borderRadius: "6px",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#eff6ff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              Tümünü Gör →
            </Link>
          </div>
          {invoicesLoading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>Yükleniyor...</div>
          ) : recentInvoices.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
              <p style={{ margin: 0 }}>Henüz fatura bulunmuyor.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                    <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280" }}>
                      Fatura No
                    </th>
                    <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280" }}>
                      Müşteri
                    </th>
                    <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280" }}>
                      Tutar
                    </th>
                    <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280" }}>
                      Durum
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map((invoice) => {
                    const statusColors = getStatusColor(invoice.status);
                    return (
                      <tr
                        key={invoice.id}
                        style={{
                          borderBottom: "1px solid #e5e7eb",
                          cursor: "pointer",
                          transition: "background-color 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#f9fafb";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                        onClick={() => (window.location.href = `/faturalar/${invoice.id}`)}
                      >
                        <td style={{ padding: "12px" }}>
                          <div>
                            <div style={{ fontWeight: "500", color: "#111827", fontSize: "14px" }}>
                              {invoice.externalId || "N/A"}
                            </div>
                            <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                              {TYPE_LABELS[invoice.type] || invoice.type}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "12px", color: "#374151", fontSize: "14px" }}>
                          {invoice.clientCompanyName || "N/A"}
                        </td>
                        <td style={{ padding: "12px", fontWeight: "500", color: "#111827", fontSize: "14px" }}>
                          {formatCurrency(invoice.totalAmount, invoice.currency)}
                        </td>
                        <td style={{ padding: "12px" }}>
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: "8px",
                              fontSize: "12px",
                              fontWeight: "500",
                              backgroundColor: statusColors.bg,
                              color: statusColors.text,
                              border: `1px solid ${statusColors.border}`,
                            }}
                          >
                            {STATUS_LABELS[invoice.status] || invoice.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div
          style={{
            padding: "24px",
            backgroundColor: "white",
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#111827" }}>Son İşlemler</h3>
            <Link
              href="/islemler"
              style={{
                padding: "6px 12px",
                color: "#2563eb",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "500",
                borderRadius: "6px",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#eff6ff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              Tümünü Gör →
            </Link>
          </div>
          {transactionsLoading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>Yükleniyor...</div>
          ) : recentTransactions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
              <p style={{ margin: 0 }}>Henüz işlem bulunmuyor.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                    <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280" }}>
                      Referans
                    </th>
                    <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280" }}>
                      Açıklama
                    </th>
                    <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280" }}>
                      Tarih
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      style={{
                        borderBottom: "1px solid #e5e7eb",
                        cursor: "pointer",
                        transition: "background-color 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f9fafb";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                      onClick={() => (window.location.href = `/islemler/${transaction.id}`)}
                    >
                      <td style={{ padding: "12px", fontWeight: "500", color: "#111827", fontSize: "14px" }}>
                        {transaction.referenceNo || "N/A"}
                      </td>
                      <td style={{ padding: "12px", color: "#6b7280", fontSize: "14px" }}>
                        {transaction.description || "Açıklama yok"}
                      </td>
                      <td style={{ padding: "12px", color: "#6b7280", fontSize: "12px" }}>
                        {formatDate(transaction.date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Customers - Hide for ReadOnly users */}
        {!isReadOnly && (
          <div
            style={{
              padding: "24px",
              backgroundColor: "white",
              borderRadius: "12px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#111827" }}>Son Müşteriler</h3>
              <Link
                href="/musteriler"
                style={{
                  padding: "6px 12px",
                  color: "#2563eb",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: "500",
                  borderRadius: "6px",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#eff6ff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                Tümünü Gör →
              </Link>
            </div>
            {customersLoading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>Yükleniyor...</div>
            ) : recentCustomers.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
                <p style={{ margin: 0 }}>Henüz müşteri bulunmuyor.</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                      <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280" }}>
                        Müşteri Adı
                      </th>
                      <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280" }}>
                        Vergi No
                      </th>
                      <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280" }}>
                        Durum
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentCustomers.map((customer) => (
                      <tr
                        key={customer.id}
                        style={{
                          borderBottom: "1px solid #e5e7eb",
                          cursor: "pointer",
                          transition: "background-color 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#f9fafb";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                        onClick={() => (window.location.href = `/musteriler/${customer.id}`)}
                      >
                        <td style={{ padding: "12px" }}>
                          <div style={{ fontWeight: "500", color: "#111827", fontSize: "14px" }}>{customer.name}</div>
                          {customer.contactPersonName && (
                            <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                              {customer.contactPersonName}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "12px", color: "#6b7280", fontSize: "14px" }}>{customer.taxNumber}</td>
                        <td style={{ padding: "12px" }}>
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: "8px",
                              fontSize: "12px",
                              fontWeight: "500",
                              backgroundColor: customer.isActive ? "#d1fae5" : "#f3f4f6",
                              color: customer.isActive ? "#065f46" : "#6b7280",
                              border: `1px solid ${customer.isActive ? "#10b981" : "#9ca3af"}`,
                            }}
                          >
                            {customer.isActive ? "Aktif" : "Pasif"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Recent Documents */}
        <div
          style={{
            padding: "24px",
            backgroundColor: "white",
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#111827" }}>Son Belgeler</h3>
            <Link
              href="/belgeler"
              style={{
                padding: "6px 12px",
                color: "#2563eb",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "500",
                borderRadius: "6px",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#eff6ff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              Tümünü Gör →
            </Link>
          </div>
          {documentsLoading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>Yükleniyor...</div>
          ) : recentDocuments.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <p style={{ margin: "0 0 16px 0", color: "#6b7280" }}>Henüz belge bulunmuyor.</p>
              <Link
                href="/belgeler"
                style={{
                  display: "inline-block",
                  padding: "10px 20px",
                  backgroundColor: "#2563eb",
                  color: "white",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontWeight: "500",
                  fontSize: "14px",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#1d4ed8";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#2563eb";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                Belge Yükle
              </Link>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                    <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280" }}>
                      Dosya Adı
                    </th>
                    <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280" }}>
                      Tür
                    </th>
                    <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280" }}>
                      Durum
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentDocuments.map((doc) => {
                    const getDocStatusColor = (status: string) => {
                      switch (status) {
                        case "PROCESSED":
                          return { bg: "#d1fae5", text: "#065f46", border: "#10b981" };
                        case "PROCESSING":
                          return { bg: "#dbeafe", text: "#1e40af", border: "#3b82f6" };
                        case "FAILED":
                          return { bg: "#fee2e2", text: "#991b1b", border: "#ef4444" };
                        default:
                          return { bg: "#f3f4f6", text: "#6b7280", border: "#9ca3af" };
                      }
                    };
                    const docStatusColors = getDocStatusColor(doc.status);
                    return (
                      <tr
                        key={doc.id}
                        style={{
                          borderBottom: "1px solid #e5e7eb",
                          cursor: "pointer",
                          transition: "background-color 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#f9fafb";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                        onClick={() => (window.location.href = `/belgeler/${doc.id}`)}
                      >
                        <td style={{ padding: "12px", fontWeight: "500", color: "#111827", fontSize: "14px" }}>
                          {doc.originalFileName}
                        </td>
                        <td style={{ padding: "12px", color: "#6b7280", fontSize: "14px" }}>
                          {doc.type === "INVOICE" ? "Fatura" : doc.type === "BANK_STATEMENT" ? "Banka Ekstresi" : doc.type === "RECEIPT" ? "Fiş" : "Diğer"}
                        </td>
                        <td style={{ padding: "12px" }}>
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: "8px",
                              fontSize: "12px",
                              fontWeight: "500",
                              backgroundColor: docStatusColors.bg,
                              color: docStatusColors.text,
                              border: `1px solid ${docStatusColors.border}`,
                            }}
                          >
                            {doc.status === "PROCESSED" ? "İşlendi" : doc.status === "PROCESSING" ? "İşleniyor" : doc.status === "FAILED" ? "Başarısız" : "Yüklendi"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
