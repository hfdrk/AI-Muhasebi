"use client";

import { useQuery } from "@tanstack/react-query";
import { listInvoices, listTransactions, listDocuments, getCurrentUser, getClientCompanyRiskScore, getMyClientCompany } from "@repo/api-client";
import { Card } from "@/components/ui/Card";
import { colors, spacing, borderRadius, shadows, transitions, typography } from "@/styles/design-system";
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
      {/* Welcome Section */}
      <Card
        style={{
          marginBottom: spacing.xl,
          padding: spacing.xxl,
          background: colors.gradients.subtle,
          border: `1px solid ${colors.border}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: spacing.lg }}>
          <div style={{ flex: 1, minWidth: "300px" }}>
            <h2
              style={{
                fontSize: typography.fontSize["3xl"],
                fontWeight: typography.fontWeight.bold,
                marginBottom: spacing.sm,
                color: colors.text.primary,
              }}
            >
              Hoş Geldiniz, {currentUser?.user?.fullName || "Müşteri"}! 👋
            </h2>
            <p
              style={{
                color: colors.text.secondary,
                marginBottom: spacing.lg,
                fontSize: typography.fontSize.base,
                lineHeight: typography.lineHeight.relaxed,
              }}
            >
              Bu panelden belgelerinizi görüntüleyebilir, yeni belgeler yükleyebilir ve finansal durumunuzu takip edebilirsiniz.
            </p>
            <Link
              href="/client/upload"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: spacing.sm,
                padding: `${spacing.md} ${spacing.xl}`,
                background: colors.gradients.primary,
                color: colors.white,
                textDecoration: "none",
                borderRadius: borderRadius.lg,
                fontWeight: typography.fontWeight.semibold,
                fontSize: typography.fontSize.base,
                boxShadow: shadows.md,
                transition: `all ${transitions.normal} ease`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = shadows.lg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = shadows.md;
              }}
            >
              <span style={{ fontSize: "20px" }}>📤</span>
              <span>Yeni Belge Yükle</span>
            </Link>
          </div>
        </div>
      </Card>

      {/* Enhanced Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: spacing.lg,
          marginBottom: spacing.xl,
        }}
      >
        <Card
          hoverable
          style={{
            padding: spacing.xl,
            background: `linear-gradient(135deg, ${colors.primaryLighter} 0%, ${colors.white} 100%)`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md }}>
            <div style={{ fontSize: "32px" }}>📄</div>
            <div
              style={{
                padding: `${spacing.xs} ${spacing.sm}`,
                backgroundColor: colors.primary,
                color: colors.white,
                borderRadius: borderRadius.full,
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.semibold,
              }}
            >
              {invoices.length}
            </div>
          </div>
          <div
            style={{
              fontSize: typography.fontSize["3xl"],
              fontWeight: typography.fontWeight.bold,
              color: colors.primary,
              marginBottom: spacing.xs,
            }}
          >
            {invoices.length}
          </div>
          <div style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>
            Son Faturalar
          </div>
        </Card>

        <Card
          hoverable
          style={{
            padding: spacing.xl,
            background: `linear-gradient(135deg, ${colors.successLight} 0%, ${colors.white} 100%)`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md }}>
            <div style={{ fontSize: "32px" }}>💼</div>
            <div
              style={{
                padding: `${spacing.xs} ${spacing.sm}`,
                backgroundColor: colors.success,
                color: colors.white,
                borderRadius: borderRadius.full,
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.semibold,
              }}
            >
              {transactions.length}
            </div>
          </div>
          <div
            style={{
              fontSize: typography.fontSize["3xl"],
              fontWeight: typography.fontWeight.bold,
              color: colors.success,
              marginBottom: spacing.xs,
            }}
          >
            {transactions.length}
          </div>
          <div style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>
            Son İşlemler
          </div>
        </Card>

        <Card
          hoverable
          style={{
            padding: spacing.xl,
            background: `linear-gradient(135deg, ${colors.infoLight} 0%, ${colors.white} 100%)`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md }}>
            <div style={{ fontSize: "32px" }}>📁</div>
            <div
              style={{
                padding: `${spacing.xs} ${spacing.sm}`,
                backgroundColor: colors.info,
                color: colors.white,
                borderRadius: borderRadius.full,
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.semibold,
              }}
            >
              {documents.length}
            </div>
          </div>
          <div
            style={{
              fontSize: typography.fontSize["3xl"],
              fontWeight: typography.fontWeight.bold,
              color: colors.info,
              marginBottom: spacing.xs,
            }}
          >
            {documents.length}
          </div>
          <div style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>
            Yüklenen Belgeler
          </div>
        </Card>

        {riskScore && riskScore.riskScore && (
          <Card
            hoverable
            style={{
              padding: spacing.xl,
              background: `linear-gradient(135deg, ${
                riskScore.riskScore.severity === "high"
                  ? colors.dangerLight
                  : riskScore.riskScore.severity === "medium"
                    ? colors.warningLight
                    : colors.successLight
              } 0%, ${colors.white} 100%)`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md }}>
              <div style={{ fontSize: "32px" }}>⚠️</div>
              <div
                style={{
                  padding: `${spacing.xs} ${spacing.sm}`,
                  backgroundColor:
                    riskScore.riskScore.severity === "high"
                      ? colors.error
                      : riskScore.riskScore.severity === "medium"
                        ? colors.warning
                        : colors.success,
                  color: colors.white,
                  borderRadius: borderRadius.full,
                  fontSize: typography.fontSize.xs,
                  fontWeight: typography.fontWeight.semibold,
                }}
              >
                {riskScore.riskScore.severity === "high" ? "Yüksek" : riskScore.riskScore.severity === "medium" ? "Orta" : "Düşük"}
              </div>
            </div>
            <div
              style={{
                fontSize: typography.fontSize["3xl"],
                fontWeight: typography.fontWeight.bold,
                color:
                  riskScore.riskScore.severity === "high"
                    ? colors.error
                    : riskScore.riskScore.severity === "medium"
                      ? colors.warning
                      : colors.success,
                marginBottom: spacing.xs,
              }}
            >
              {Number(riskScore.riskScore.score).toFixed(0)}
            </div>
            <div style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>
              Risk Skoru
            </div>
          </Card>
        )}
      </div>

      {/* Risk Score Details */}
      {riskScore && riskScore.riskScore && (
        <Card
          style={{
            marginBottom: spacing.xl,
            background: `linear-gradient(135deg, ${colors.gray[50]} 0%, ${colors.white} 100%)`,
          }}
        >
          <h3
            style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.bold,
              marginBottom: spacing.lg,
              color: colors.text.primary,
            }}
          >
            Risk Analizi Detayları
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: spacing.lg,
              marginBottom: riskScore.topTriggeredRules && riskScore.topTriggeredRules.length > 0 ? spacing.lg : 0,
            }}
          >
            <div
              style={{
                padding: spacing.lg,
                backgroundColor: colors.successLight,
                borderRadius: borderRadius.lg,
                border: `2px solid ${colors.success}`,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: typography.fontSize["2xl"],
                  fontWeight: typography.fontWeight.bold,
                  color: colors.success,
                  marginBottom: spacing.xs,
                }}
              >
                {riskScore.breakdown?.low || 0}
              </div>
              <div
                style={{
                  color: colors.successDark,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                }}
              >
                Düşük Risk
              </div>
            </div>
            <div
              style={{
                padding: spacing.lg,
                backgroundColor: colors.warningLight,
                borderRadius: borderRadius.lg,
                border: `2px solid ${colors.warning}`,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: typography.fontSize["2xl"],
                  fontWeight: typography.fontWeight.bold,
                  color: colors.warning,
                  marginBottom: spacing.xs,
                }}
              >
                {riskScore.breakdown?.medium || 0}
              </div>
              <div
                style={{
                  color: colors.warning,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                }}
              >
                Orta Risk
              </div>
            </div>
            <div
              style={{
                padding: spacing.lg,
                backgroundColor: colors.dangerLight,
                borderRadius: borderRadius.lg,
                border: `2px solid ${colors.error}`,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: typography.fontSize["2xl"],
                  fontWeight: typography.fontWeight.bold,
                  color: colors.error,
                  marginBottom: spacing.xs,
                }}
              >
                {riskScore.breakdown?.high || 0}
              </div>
              <div
                style={{
                  color: colors.dangerDark,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                }}
              >
                Yüksek Risk
              </div>
            </div>
          </div>
          {riskScore.topTriggeredRules && riskScore.topTriggeredRules.length > 0 && (
            <div
              style={{
                marginTop: spacing.lg,
                paddingTop: spacing.lg,
                borderTop: `2px solid ${colors.border}`,
              }}
            >
              <div
                style={{
                  fontSize: typography.fontSize.base,
                  fontWeight: typography.fontWeight.semibold,
                  marginBottom: spacing.md,
                  color: colors.text.primary,
                }}
              >
                En Çok Tetiklenen Kurallar
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
                {riskScore.topTriggeredRules.slice(0, 3).map((rule: any, index: number) => (
                  <div
                    key={index}
                    style={{
                      padding: spacing.md,
                      backgroundColor: colors.gray[50],
                      borderRadius: borderRadius.md,
                      fontSize: typography.fontSize.sm,
                      color: colors.text.secondary,
                      display: "flex",
                      alignItems: "center",
                      gap: spacing.sm,
                    }}
                  >
                    <span
                      style={{
                        fontSize: typography.fontSize.lg,
                        fontWeight: typography.fontWeight.bold,
                        color: colors.primary,
                      }}
                    >
                      {index + 1}.
                    </span>
                    <span style={{ flex: 1 }}>{rule.description}</span>
                    <span
                      style={{
                        padding: `${spacing.xs} ${spacing.sm}`,
                        backgroundColor: colors.primary,
                        color: colors.white,
                        borderRadius: borderRadius.sm,
                        fontSize: typography.fontSize.xs,
                        fontWeight: typography.fontWeight.semibold,
                      }}
                    >
                      {rule.count} kez
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Recent Invoices */}
      <Card style={{ marginBottom: spacing.xl }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: spacing.lg,
            paddingBottom: spacing.md,
            borderBottom: `2px solid ${colors.border}`,
          }}
        >
          <h3
            style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.bold,
              color: colors.text.primary,
              margin: 0,
            }}
          >
            Son Faturalar
          </h3>
          <Link
            href="/client/invoices"
            style={{
              color: colors.primary,
              textDecoration: "none",
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              display: "flex",
              alignItems: "center",
              gap: spacing.xs,
              transition: `all ${transitions.normal} ease`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.gap = spacing.sm;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.gap = spacing.xs;
            }}
          >
            <span>Tümünü Gör</span>
            <span>→</span>
          </Link>
        </div>
        {invoicesLoading ? (
          <div
            style={{
              padding: spacing.xxl,
              textAlign: "center",
              color: colors.text.secondary,
            }}
          >
            <div style={{ fontSize: "24px", marginBottom: spacing.sm }}>⏳</div>
            <div>Yükleniyor...</div>
          </div>
        ) : invoices.length === 0 ? (
          <div
            style={{
              color: colors.text.secondary,
              padding: spacing.xxl,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: spacing.md }}>📄</div>
            <div style={{ fontSize: typography.fontSize.base, marginBottom: spacing.sm }}>Henüz fatura bulunmuyor.</div>
          </div>
        ) : (
          <div>
            {invoices.map((invoice: any, index: number) => (
              <Link
                key={invoice.id}
                href={`/client/invoices/${invoice.id}`}
                style={{
                  display: "block",
                  padding: spacing.lg,
                  borderBottom: index < invoices.length - 1 ? `1px solid ${colors.border}` : "none",
                  textDecoration: "none",
                  color: "inherit",
                  transition: `all ${transitions.normal} ease`,
                  borderRadius: borderRadius.md,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.gray[50];
                  e.currentTarget.style.transform = "translateX(4px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.transform = "translateX(0)";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: typography.fontWeight.semibold,
                        marginBottom: spacing.xs,
                        color: colors.text.primary,
                        fontSize: typography.fontSize.base,
                      }}
                    >
                      {formatDate(invoice.issueDate)} • {formatCurrency(Number(invoice.totalAmount), invoice.currency)}
                    </div>
                    <div
                      style={{
                        fontSize: typography.fontSize.sm,
                        color: colors.text.secondary,
                        display: "flex",
                        alignItems: "center",
                        gap: spacing.sm,
                      }}
                    >
                      <span
                        style={{
                          padding: `${spacing.xs} ${spacing.sm}`,
                          backgroundColor: invoice.type === "SATIŞ" ? colors.successLight : colors.infoLight,
                          color: invoice.type === "SATIŞ" ? colors.success : colors.info,
                          borderRadius: borderRadius.sm,
                          fontSize: typography.fontSize.xs,
                          fontWeight: typography.fontWeight.medium,
                        }}
                      >
                        {invoice.type === "SATIŞ" ? "Satış" : "Alış"} Faturası
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      color: colors.primary,
                      fontSize: typography.fontSize.lg,
                      fontWeight: typography.fontWeight.bold,
                    }}
                  >
                    →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* Recent Documents */}
      <Card>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: spacing.lg,
            paddingBottom: spacing.md,
            borderBottom: `2px solid ${colors.border}`,
          }}
        >
          <h3
            style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.bold,
              color: colors.text.primary,
              margin: 0,
            }}
          >
            Son Belgeler
          </h3>
          <Link
            href="/client/documents"
            style={{
              color: colors.primary,
              textDecoration: "none",
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              display: "flex",
              alignItems: "center",
              gap: spacing.xs,
              transition: `all ${transitions.normal} ease`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.gap = spacing.sm;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.gap = spacing.xs;
            }}
          >
            <span>Tümünü Gör</span>
            <span>→</span>
          </Link>
        </div>
        {documentsLoading ? (
          <div
            style={{
              padding: spacing.xxl,
              textAlign: "center",
              color: colors.text.secondary,
            }}
          >
            <div style={{ fontSize: "24px", marginBottom: spacing.sm }}>⏳</div>
            <div>Yükleniyor...</div>
          </div>
        ) : documents.length === 0 ? (
          <div
            style={{
              color: colors.text.secondary,
              padding: spacing.xxl,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: spacing.md }}>📁</div>
            <div style={{ fontSize: typography.fontSize.base, marginBottom: spacing.md }}>
              Henüz belge bulunmuyor.
            </div>
            <Link
              href="/client/upload"
              style={{
                color: colors.primary,
                textDecoration: "none",
                fontWeight: typography.fontWeight.medium,
                display: "inline-flex",
                alignItems: "center",
                gap: spacing.xs,
              }}
            >
              <span>İlk belgenizi yükleyin</span>
              <span>→</span>
            </Link>
          </div>
        ) : (
          <div>
            {documents.map((doc: any, index: number) => (
              <Link
                key={doc.id}
                href={`/client/documents/${doc.id}`}
                style={{
                  display: "block",
                  padding: spacing.lg,
                  borderBottom: index < documents.length - 1 ? `1px solid ${colors.border}` : "none",
                  textDecoration: "none",
                  color: "inherit",
                  transition: `all ${transitions.normal} ease`,
                  borderRadius: borderRadius.md,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.gray[50];
                  e.currentTarget.style.transform = "translateX(4px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.transform = "translateX(0)";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: typography.fontWeight.semibold,
                        marginBottom: spacing.xs,
                        color: colors.text.primary,
                        fontSize: typography.fontSize.base,
                      }}
                    >
                      {doc.filename}
                    </div>
                    <div
                      style={{
                        fontSize: typography.fontSize.sm,
                        color: colors.text.secondary,
                        display: "flex",
                        alignItems: "center",
                        gap: spacing.sm,
                      }}
                    >
                      <span>{formatDate(doc.uploadedAt)}</span>
                      <span>•</span>
                      <span
                        style={{
                          padding: `${spacing.xs} ${spacing.sm}`,
                          backgroundColor: colors.gray[100],
                          color: colors.text.secondary,
                          borderRadius: borderRadius.sm,
                          fontSize: typography.fontSize.xs,
                          fontWeight: typography.fontWeight.medium,
                        }}
                      >
                        {doc.status}
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      color: colors.primary,
                      fontSize: typography.fontSize.lg,
                      fontWeight: typography.fontWeight.bold,
                    }}
                  >
                    →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
