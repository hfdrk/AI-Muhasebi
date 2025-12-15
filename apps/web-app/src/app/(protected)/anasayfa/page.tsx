"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { listInvoices, listTransactions, listClientCompanies, listDocuments, getCurrentUser, onboardingClient } from "@repo/api-client";
import { dashboard as dashboardI18n } from "@repo/i18n";
import { Card } from "@/components/ui/Card";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageTransition } from "@/components/ui/PageTransition";
import { colors, spacing, borderRadius, shadows, transitions, typography } from "@/styles/design-system";
import { toast } from "@/lib/toast";
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
  const errorToastShown = useRef(false);

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
  const { data: invoicesData, isLoading: invoicesLoading, error: invoicesError } = useQuery({
    queryKey: ["dashboard-invoices", customerCompanyId],
    queryFn: () => listInvoices({ 
      page: 1, 
      pageSize: 5,
      ...(isReadOnly && customerCompanyId ? { clientCompanyId: customerCompanyId } : {})
    }),
    enabled: !isReadOnly || !!customerCompanyId,
    retry: false, // Don't retry on error to avoid spam
  });

  // Fetch recent transactions - filter by customer company if ReadOnly
  const { data: transactionsData, isLoading: transactionsLoading, error: transactionsError } = useQuery({
    queryKey: ["dashboard-transactions", customerCompanyId],
    queryFn: () => listTransactions({ 
      page: 1, 
      pageSize: 5,
      ...(isReadOnly && customerCompanyId ? { clientCompanyId: customerCompanyId } : {})
    }),
    enabled: !isReadOnly || !!customerCompanyId,
    retry: false,
  });

  // Fetch recent customers - only for non-ReadOnly users
  const { data: customersData, isLoading: customersLoading, error: customersError } = useQuery({
    queryKey: ["dashboard-customers"],
    queryFn: () => listClientCompanies({ page: 1, pageSize: 5, isActive: true }),
    enabled: !isReadOnly,
    retry: false,
  });

  // Fetch recent documents - filter by customer company if ReadOnly
  const { data: documentsData, isLoading: documentsLoading, error: documentsError } = useQuery({
    queryKey: ["dashboard-documents", customerCompanyId],
    queryFn: () => listDocuments({ 
      page: 1, 
      pageSize: 5,
      ...(isReadOnly && customerCompanyId ? { clientCompanyId: customerCompanyId } : {})
    }),
    enabled: !isReadOnly || !!customerCompanyId,
    retry: false,
  });

  // Fetch totals for statistics - filter by customer company if ReadOnly
  const { data: allInvoicesData, error: allInvoicesError } = useQuery({
    queryKey: ["dashboard-invoices-total", customerCompanyId],
    queryFn: () => listInvoices({ 
      page: 1, 
      pageSize: 1,
      ...(isReadOnly && customerCompanyId ? { clientCompanyId: customerCompanyId } : {})
    }),
    enabled: !isReadOnly || !!customerCompanyId,
    retry: false,
  });

  const { data: allTransactionsData, error: allTransactionsError } = useQuery({
    queryKey: ["dashboard-transactions-total", customerCompanyId],
    queryFn: () => listTransactions({ 
      page: 1, 
      pageSize: 1,
      ...(isReadOnly && customerCompanyId ? { clientCompanyId: customerCompanyId } : {})
    }),
    enabled: !isReadOnly || !!customerCompanyId,
    retry: false,
  });

  const { data: allCustomersData, error: allCustomersError } = useQuery({
    queryKey: ["dashboard-customers-total"],
    queryFn: () => listClientCompanies({ page: 1, pageSize: 1, isActive: true }),
    enabled: !isReadOnly,
    retry: false,
  });

  const { data: allDocumentsData, error: allDocumentsError } = useQuery({
    queryKey: ["dashboard-documents-total", customerCompanyId],
    queryFn: () => listDocuments({ 
      page: 1, 
      pageSize: 1,
      ...(isReadOnly && customerCompanyId ? { clientCompanyId: customerCompanyId } : {})
    }),
    enabled: !isReadOnly || !!customerCompanyId,
    retry: false,
  });

  const recentInvoices = invoicesData?.data.data || [];
  const recentTransactions = transactionsData?.data.data || [];
  const recentCustomers = customersData?.data.data || [];
  const recentDocuments = documentsData?.data.data || [];

  const totalInvoices = allInvoicesData?.data.total || 0;
  const totalTransactions = allTransactionsData?.data.total || 0;
  const totalCustomers = allCustomersData?.data.total || 0;
  const totalDocuments = allDocumentsData?.data.total || 0;

  // Check for API errors
  const hasApiErrors = invoicesError || transactionsError || customersError || documentsError || 
                       allInvoicesError || allTransactionsError || allCustomersError || allDocumentsError;

  // Show error notification once (using ref to prevent multiple toasts)
  useEffect(() => {
    if (hasApiErrors && !isReadOnly && !errorToastShown.current) {
      console.error("[Dashboard] API Errors detected:", {
        invoices: invoicesError || allInvoicesError,
        transactions: transactionsError || allTransactionsError,
        customers: customersError || allCustomersError,
        documents: documentsError || allDocumentsError,
      });
      // Only show one toast to avoid spam
      toast.error("Sunucu hatası: Veriler yüklenemedi. Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin.");
      errorToastShown.current = true;
    }
    // Reset when errors clear
    if (!hasApiErrors) {
      errorToastShown.current = false;
    }
  }, [hasApiErrors, invoicesError, transactionsError, customersError, documentsError, 
      allInvoicesError, allTransactionsError, allCustomersError, allDocumentsError, isReadOnly]);

  const getStatusVariant = (status: string): "success" | "warning" | "secondary" | "primary" | "info" => {
    switch (status) {
      case "kesildi":
        return "success";
      case "taslak":
        return "warning";
      case "iptal":
        return "secondary";
      case "muhasebeleştirilmiş":
        return "primary";
      default:
        return "secondary";
    }
  };

  return (
    <PageTransition>
      <div>
      {/* Header */}
      <div style={{ marginBottom: spacing.xl }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm }}>
          <div>
            <h1
              style={{
                fontSize: typography.fontSize["4xl"],
                fontWeight: typography.fontWeight.bold,
                marginBottom: spacing.sm,
                background: colors.gradients.primary,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Dashboard
            </h1>
            <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.base }}>
              Genel bakış ve özet bilgiler
            </p>
          </div>
        </div>
      </div>

      {/* Onboarding Card */}
      {shouldShowOnboarding && (
        <Card
          variant="elevated"
          style={{
            padding: spacing.xl,
            backgroundColor: colors.primaryLighter,
            border: `2px solid ${colors.primary}`,
            marginBottom: spacing.xl,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.sm, color: colors.text.primary }}>
                {dashboardI18n.onboarding.title}
              </h2>
              <p style={{ color: colors.text.secondary, marginBottom: spacing.md, fontSize: typography.fontSize.sm }}>
                {dashboardI18n.onboarding.description}
              </p>
              <ul style={{ listStyle: "none", padding: 0, marginBottom: spacing.md }}>
                <li style={{ marginBottom: spacing.sm, color: colors.text.primary, fontSize: typography.fontSize.sm }}>
                  ✓ {dashboardI18n.onboarding.checklist.step1}
                </li>
                <li style={{ marginBottom: spacing.sm, color: colors.text.primary, fontSize: typography.fontSize.sm }}>
                  ✓ {dashboardI18n.onboarding.checklist.step2}
                </li>
                <li style={{ marginBottom: spacing.sm, color: colors.text.primary, fontSize: typography.fontSize.sm }}>
                  ✓ {dashboardI18n.onboarding.checklist.step3}
                </li>
              </ul>
              <div style={{ display: "flex", gap: spacing.md, flexWrap: "wrap" }}>
                {!isReadOnly && (
                  <>
                    <Link
                      href="/musteriler/new"
                      style={{
                        padding: `${spacing.sm} ${spacing.lg}`,
                        backgroundColor: colors.primary,
                        color: colors.white,
                        borderRadius: borderRadius.md,
                        textDecoration: "none",
                        fontWeight: typography.fontWeight.medium,
                        fontSize: typography.fontSize.sm,
                        transition: `all ${transitions.normal} ease`,
                        boxShadow: shadows.sm,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.primaryDark;
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow = shadows.md;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = colors.primary;
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = shadows.sm;
                      }}
                    >
                      {dashboardI18n.onboarding.buttons.createClient}
                    </Link>
                    <Link
                      href="/belgeler"
                      style={{
                        padding: `${spacing.sm} ${spacing.lg}`,
                        backgroundColor: colors.primary,
                        color: colors.white,
                        borderRadius: borderRadius.md,
                        textDecoration: "none",
                        fontWeight: typography.fontWeight.medium,
                        fontSize: typography.fontSize.sm,
                        transition: `all ${transitions.normal} ease`,
                        boxShadow: shadows.sm,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.primaryDark;
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow = shadows.md;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = colors.primary;
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = shadows.sm;
                      }}
                    >
                      {dashboardI18n.onboarding.buttons.uploadDocument}
                    </Link>
                  </>
                )}
                <Link
                  href="/raporlar"
                  style={{
                    padding: `${spacing.sm} ${spacing.lg}`,
                    backgroundColor: colors.white,
                    color: colors.primary,
                    borderRadius: borderRadius.md,
                    textDecoration: "none",
                    fontWeight: typography.fontWeight.medium,
                    fontSize: typography.fontSize.sm,
                    border: `1px solid ${colors.primary}`,
                    transition: `all ${transitions.normal} ease`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = colors.primaryLighter;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = colors.white;
                  }}
                >
                  {dashboardI18n.onboarding.buttons.goToReports}
                </Link>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
              <button
                onClick={() => handleDismissOnboarding(false)}
                style={{
                  padding: `${spacing.sm} ${spacing.md}`,
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: typography.fontSize.sm,
                  color: colors.text.muted,
                  borderRadius: borderRadius.sm,
                  transition: `all ${transitions.normal} ease`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.gray[100];
                  e.currentTarget.style.color = colors.text.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = colors.text.muted;
                }}
              >
                ✕
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* API Error Banner */}
      {hasApiErrors && (
        <Card
          style={{
            marginBottom: spacing.xl,
            padding: spacing.lg,
            backgroundColor: colors.dangerLight,
            border: `2px solid ${colors.danger}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
            <span style={{ fontSize: "24px" }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.danger, marginBottom: spacing.xs }}>
                Sunucu Hatası
              </h3>
              <p style={{ margin: 0, color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                Veriler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin.
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: `${spacing.sm} ${spacing.md}`,
                backgroundColor: colors.danger,
                color: colors.white,
                border: "none",
                borderRadius: borderRadius.md,
                cursor: "pointer",
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
              }}
            >
              Sayfayı Yenile
            </button>
          </div>
        </Card>
      )}

      {/* Statistics Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))",
          gap: spacing.lg,
          marginBottom: spacing.xl,
        }}
      >
        {/* Total Invoices */}
        <Card
          hoverable
          style={{
            padding: spacing.xl,
            background: `linear-gradient(135deg, ${colors.primaryLighter} 0%, ${colors.white} 100%)`,
            border: `2px solid ${colors.primary}20`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.md }}>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  margin: 0,
                  color: colors.text.secondary,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  marginBottom: spacing.sm,
                }}
              >
                Toplam Fatura
              </p>
              <h2
                style={{
                  margin: 0,
                  fontSize: typography.fontSize["4xl"],
                  fontWeight: typography.fontWeight.bold,
                  color: colors.primary,
                }}
              >
                {totalInvoices}
              </h2>
            </div>
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: borderRadius.lg,
                backgroundColor: colors.primary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px",
                boxShadow: shadows.md,
              }}
            >
              📄
            </div>
          </div>
          <Link
            href="/faturalar"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: spacing.xs,
              color: colors.primary,
              textDecoration: "none",
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
            }}
          >
            <span>Tümünü Gör</span>
            <span>→</span>
          </Link>
        </Card>

        {/* Total Transactions */}
        <Card
          hoverable
          style={{
            padding: spacing.xl,
            background: `linear-gradient(135deg, ${colors.successLight} 0%, ${colors.white} 100%)`,
            border: `2px solid ${colors.success}20`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.md }}>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  margin: 0,
                  color: colors.text.secondary,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  marginBottom: spacing.sm,
                }}
              >
                Toplam İşlem
              </p>
              <h2
                style={{
                  margin: 0,
                  fontSize: typography.fontSize["4xl"],
                  fontWeight: typography.fontWeight.bold,
                  color: colors.success,
                }}
              >
                {totalTransactions}
              </h2>
            </div>
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: borderRadius.lg,
                backgroundColor: colors.success,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px",
                boxShadow: shadows.md,
              }}
            >
              💰
            </div>
          </div>
          <Link
            href="/islemler"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: spacing.xs,
              color: colors.success,
              textDecoration: "none",
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
            }}
          >
            <span>Tümünü Gör</span>
            <span>→</span>
          </Link>
        </Card>

        {/* Total Customers - Hide for ReadOnly users */}
        {!isReadOnly && (
          <Card
            hoverable
            style={{
              padding: spacing.xl,
              background: `linear-gradient(135deg, ${colors.warningLight} 0%, ${colors.white} 100%)`,
              border: `2px solid ${colors.warning}20`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.md }}>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    margin: 0,
                    color: colors.text.secondary,
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    marginBottom: spacing.sm,
                  }}
                >
                  Toplam Müşteri
                </p>
                <h2
                  style={{
                    margin: 0,
                    fontSize: typography.fontSize["4xl"],
                    fontWeight: typography.fontWeight.bold,
                    color: colors.warning,
                  }}
                >
                  {totalCustomers}
                </h2>
              </div>
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: borderRadius.lg,
                  backgroundColor: colors.warning,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "32px",
                  boxShadow: shadows.md,
                }}
              >
                👥
              </div>
            </div>
            <Link
              href="/musteriler"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: spacing.xs,
                color: colors.warning,
                textDecoration: "none",
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
              }}
            >
              <span>Tümünü Gör</span>
              <span>→</span>
            </Link>
          </Card>
        )}

        {/* Total Documents */}
        <Card
          hoverable
          style={{
            padding: spacing.xl,
            background: `linear-gradient(135deg, ${colors.infoLight} 0%, ${colors.white} 100%)`,
            border: `2px solid ${colors.info}20`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.md }}>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  margin: 0,
                  color: colors.text.secondary,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  marginBottom: spacing.sm,
                }}
              >
                Toplam Belge
              </p>
              <h2
                style={{
                  margin: 0,
                  fontSize: typography.fontSize["4xl"],
                  fontWeight: typography.fontWeight.bold,
                  color: colors.info,
                }}
              >
                {totalDocuments}
              </h2>
            </div>
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: borderRadius.lg,
                backgroundColor: colors.info,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px",
                boxShadow: shadows.md,
              }}
            >
              📎
            </div>
          </div>
          <Link
            href="/belgeler"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: spacing.xs,
              color: colors.info,
              textDecoration: "none",
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
            }}
          >
            <span>Tümünü Gör</span>
            <span>→</span>
          </Link>
        </Card>
      </div>

      {/* Show message if customer company not found */}
      {isReadOnly && !customerCompany && (
        <Card style={{ marginBottom: spacing.xl, backgroundColor: colors.warningLight, border: `1px solid ${colors.warning}` }}>
          <p style={{ margin: 0, fontSize: typography.fontSize.sm, color: colors.warning }}>
            ⚠️ Müşteri şirketi bulunamadı. Lütfen yöneticinizle iletişime geçin.
          </p>
        </Card>
      )}

      {/* Recent Data Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(400px, 100%), 1fr))",
          gap: "24px",
        }}
      >
        {/* Recent Invoices */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg }}>
            <h3 style={{ margin: 0, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>Son Faturalar</h3>
            <Link
              href="/faturalar"
              style={{
                padding: `${spacing.xs} ${spacing.md}`,
                color: colors.primary,
                textDecoration: "none",
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                borderRadius: borderRadius.md,
                transition: `all ${transitions.fast} ease`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.primaryLighter;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              Tümünü Gör →
            </Link>
          </div>
          {invoicesLoading ? (
            <SkeletonTable rows={5} columns={4} />
          ) : recentInvoices.length === 0 ? (
            <EmptyState
              icon="FileText"
              title="Henüz fatura bulunmuyor"
              description="Henüz hiç fatura oluşturulmamış."
              variant="subtle"
            />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${colors.border}` }}>
                    <th style={{ padding: spacing.md, textAlign: "left", fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary }}>
                      Fatura No
                    </th>
                    <th style={{ padding: spacing.md, textAlign: "left", fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary }}>
                      Müşteri
                    </th>
                    <th style={{ padding: spacing.md, textAlign: "left", fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary }}>
                      Tutar
                    </th>
                    <th style={{ padding: spacing.md, textAlign: "left", fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary }}>
                      Durum
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map((invoice) => {
                    const statusVariant = getStatusVariant(invoice.status);
                    return (
                      <tr
                        key={invoice.id}
                        style={{
                          borderBottom: `1px solid ${colors.border}`,
                          cursor: "pointer",
                          transition: `background-color ${transitions.fast} ease`,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = colors.gray[50];
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                        onClick={() => (window.location.href = `/faturalar/${invoice.id}`)}
                      >
                        <td style={{ padding: spacing.md }}>
                          <div>
                            <div style={{ fontWeight: typography.fontWeight.medium, color: colors.text.primary, fontSize: typography.fontSize.sm }}>
                              {invoice.externalId || "N/A"}
                            </div>
                            <div style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary, marginTop: spacing.xs }}>
                              {TYPE_LABELS[invoice.type] || invoice.type}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: spacing.md, color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                          {invoice.clientCompanyName || "N/A"}
                        </td>
                        <td style={{ padding: spacing.md, fontWeight: typography.fontWeight.medium, color: colors.text.primary, fontSize: typography.fontSize.sm }}>
                          {formatCurrency(invoice.totalAmount, invoice.currency)}
                        </td>
                        <td style={{ padding: spacing.md }}>
                          <Badge variant={statusVariant} size="sm">
                            {STATUS_LABELS[invoice.status] || invoice.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Recent Transactions */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg }}>
            <h3 style={{ margin: 0, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>Son İşlemler</h3>
            <Link
              href="/islemler"
              style={{
                padding: `${spacing.xs} ${spacing.md}`,
                color: colors.primary,
                textDecoration: "none",
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                borderRadius: borderRadius.md,
                transition: `all ${transitions.fast} ease`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.primaryLighter;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              Tümünü Gör →
            </Link>
          </div>
          {transactionsLoading ? (
            <SkeletonTable rows={5} columns={4} />
          ) : recentTransactions.length === 0 ? (
            <EmptyState
              icon="FileX"
              title="Henüz işlem bulunmuyor"
              description="Henüz hiç mali hareket oluşturulmamış."
              variant="subtle"
            />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${colors.border}` }}>
                    <th style={{ padding: spacing.md, textAlign: "left", fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary }}>
                      Referans
                    </th>
                    <th style={{ padding: spacing.md, textAlign: "left", fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary }}>
                      Açıklama
                    </th>
                    <th style={{ padding: spacing.md, textAlign: "left", fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary }}>
                      Tarih
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      style={{
                        borderBottom: `1px solid ${colors.border}`,
                        cursor: "pointer",
                        transition: `background-color ${transitions.fast} ease`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.gray[50];
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                      onClick={() => (window.location.href = `/islemler/${transaction.id}`)}
                    >
                      <td style={{ padding: spacing.md, fontWeight: typography.fontWeight.medium, color: colors.text.primary, fontSize: typography.fontSize.sm }}>
                        {transaction.referenceNo || "N/A"}
                      </td>
                      <td style={{ padding: spacing.md, color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                        {transaction.description || "Açıklama yok"}
                      </td>
                      <td style={{ padding: spacing.md, color: colors.text.secondary, fontSize: typography.fontSize.xs }}>
                        {formatDate(transaction.date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Recent Customers - Hide for ReadOnly users */}
        {!isReadOnly && (
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg }}>
              <h3 style={{ margin: 0, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>Son Müşteriler</h3>
              <Link
                href="/musteriler"
                style={{
                  padding: `${spacing.xs} ${spacing.md}`,
                  color: colors.primary,
                  textDecoration: "none",
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  borderRadius: borderRadius.md,
                  transition: `all ${transitions.fast} ease`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.primaryLighter;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                Tümünü Gör →
              </Link>
            </div>
            {customersLoading ? (
              <SkeletonTable rows={5} columns={3} />
            ) : recentCustomers.length === 0 ? (
              <EmptyState
                icon="Users"
                title="Henüz müşteri bulunmuyor"
                description="Henüz hiç müşteri eklenmemiş."
                variant="subtle"
              />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${colors.border}` }}>
                      <th style={{ padding: spacing.md, textAlign: "left", fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary }}>
                        Müşteri Adı
                      </th>
                      <th style={{ padding: spacing.md, textAlign: "left", fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary }}>
                        Vergi No
                      </th>
                      <th style={{ padding: spacing.md, textAlign: "left", fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary }}>
                        Durum
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentCustomers.map((customer) => (
                      <tr
                        key={customer.id}
                        style={{
                          borderBottom: `1px solid ${colors.border}`,
                          cursor: "pointer",
                          transition: `background-color ${transitions.fast} ease`,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = colors.gray[50];
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                        onClick={() => (window.location.href = `/musteriler/${customer.id}`)}
                      >
                        <td style={{ padding: spacing.md }}>
                          <div style={{ fontWeight: typography.fontWeight.medium, color: colors.text.primary, fontSize: typography.fontSize.sm }}>{customer.name}</div>
                          {customer.contactPersonName && (
                            <div style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary, marginTop: spacing.xs }}>
                              {customer.contactPersonName}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: spacing.md, color: colors.text.secondary, fontSize: typography.fontSize.sm }}>{customer.taxNumber}</td>
                        <td style={{ padding: spacing.md }}>
                          <Badge variant={customer.isActive ? "success" : "secondary"} size="sm">
                            {customer.isActive ? "Aktif" : "Pasif"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Recent Documents */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg }}>
            <h3 style={{ margin: 0, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>Son Belgeler</h3>
            <Link
              href="/belgeler"
              style={{
                padding: `${spacing.xs} ${spacing.md}`,
                color: colors.primary,
                textDecoration: "none",
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                borderRadius: borderRadius.md,
                transition: `all ${transitions.fast} ease`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.primaryLighter;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              Tümünü Gör →
            </Link>
          </div>
          {documentsLoading ? (
            <SkeletonTable rows={5} columns={4} />
          ) : recentDocuments.length === 0 ? (
            <EmptyState
              icon="FileText"
              title="Henüz belge bulunmuyor"
              description="Henüz hiç belge yüklenmemiş."
              actionLabel="Belge Yükle"
              onAction={() => window.location.href = "/belgeler"}
              variant="subtle"
            />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${colors.border}` }}>
                    <th style={{ padding: spacing.md, textAlign: "left", fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary }}>
                      Dosya Adı
                    </th>
                    <th style={{ padding: spacing.md, textAlign: "left", fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary }}>
                      Tür
                    </th>
                    <th style={{ padding: spacing.md, textAlign: "left", fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary }}>
                      Durum
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentDocuments.map((doc) => {
                    const getDocStatusVariant = (status: string): "success" | "primary" | "danger" | "secondary" => {
                      switch (status) {
                        case "PROCESSED":
                          return "success";
                        case "PROCESSING":
                          return "primary";
                        case "FAILED":
                          return "danger";
                        default:
                          return "secondary";
                      }
                    };
                    const docStatusVariant = getDocStatusVariant(doc.status);
                    return (
                      <tr
                        key={doc.id}
                        style={{
                          borderBottom: `1px solid ${colors.border}`,
                          cursor: "pointer",
                          transition: `background-color ${transitions.fast} ease`,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = colors.gray[50];
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                        onClick={() => (window.location.href = `/belgeler/${doc.id}`)}
                      >
                        <td style={{ padding: spacing.md, fontWeight: typography.fontWeight.medium, color: colors.text.primary, fontSize: typography.fontSize.sm }}>
                          {doc.originalFileName}
                        </td>
                        <td style={{ padding: spacing.md, color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                          {doc.type === "INVOICE" ? "Fatura" : doc.type === "BANK_STATEMENT" ? "Banka Ekstresi" : doc.type === "RECEIPT" ? "Fiş" : "Diğer"}
                        </td>
                        <td style={{ padding: spacing.md }}>
                          <Badge variant={docStatusVariant} size="sm">
                            {doc.status === "PROCESSED" ? "İşlendi" : doc.status === "PROCESSING" ? "İşleniyor" : doc.status === "FAILED" ? "Başarısız" : "Yüklendi"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
    </PageTransition>
  );
}
