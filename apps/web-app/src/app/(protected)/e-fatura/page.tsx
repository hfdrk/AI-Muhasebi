"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listInvoices, submitInvoiceToEFatura, checkEFaturaStatus, retryFailedEFaturaSubmissions } from "@repo/api-client";
import Link from "next/link";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { SkeletonCard } from "../../../components/ui/Skeleton";
import { Modal } from "../../../components/ui/Modal";
import { toast } from "../../../lib/toast";
import { colors, spacing, borderRadius, shadows, typography, transitions } from "../../../styles/design-system";

const STATUS_LABELS: Record<string, string> = {
  taslak: "Taslak",
  kesildi: "Kesildi",
  iptal: "İptal",
  muhasebeleştirilmiş: "Muhasebeleştirilmiş",
};

const EFATURA_STATUS_LABELS: Record<string, string> = {
  draft: "Taslak",
  sent: "Gönderildi",
  accepted: "Kabul Edildi",
  rejected: "Reddedildi",
  cancelled: "İptal Edildi",
};

const EFATURA_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: colors.gray[100], text: colors.gray[700] },
  sent: { bg: colors.infoLight, text: colors.info },
  accepted: { bg: colors.successLight, text: colors.successDark },
  rejected: { bg: colors.dangerLight, text: colors.dangerDark },
  cancelled: { bg: colors.gray[200], text: colors.gray[700] },
};

export default function EFaturaPage() {
  const queryClient = useQueryClient();
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [submitModal, setSubmitModal] = useState<{ open: boolean; invoiceId: string | null }>({ open: false, invoiceId: null });
  const [retryModal, setRetryModal] = useState(false);

  // Fetch invoices that can be submitted (status: kesildi)
  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ["invoices", { status: "kesildi" }],
    queryFn: () => listInvoices({ status: "kesildi", pageSize: 100 }),
  });

  const invoices = invoicesData?.data.data || [];

  const submitMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      if (process.env.NODE_ENV === "development") {
        console.log("[E-Fatura] mutationFn called with invoiceId:", invoiceId);
      }
      try {
        const result = await submitInvoiceToEFatura(invoiceId);
        if (process.env.NODE_ENV === "development") {
          console.log("[E-Fatura] API call successful:", result);
        }
        return result;
      } catch (error) {
        console.error("[E-Fatura] API call failed:", error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate all invoice queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices", { status: "kesildi" }] });
      // Also refetch immediately to get updated metadata
      queryClient.refetchQueries({ queryKey: ["invoices", { status: "kesildi" }] });
      toast.success("Fatura E-Fatura sistemine başarıyla gönderildi.");
    },
    onError: (error: Error) => {
      console.error("[E-Fatura] onError called:", error);
      toast.error(`Hata: ${error.message}`);
    },
  });

  const retryMutation = useMutation({
    mutationFn: () => retryFailedEFaturaSubmissions(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(data.data.message);
    },
    onError: (error: Error) => {
      toast.error(`Hata: ${error.message}`);
    },
  });

  const handleSubmit = (invoiceId: string) => {
    setSubmitModal({ open: true, invoiceId });
  };

  const handleRetryFailed = () => {
    setRetryModal(true);
  };

  if (isLoading) {
    return (
      <div
        style={{
          padding: spacing.xxl,
          maxWidth: "1600px",
          margin: "0 auto",
          backgroundColor: colors.gray[50],
          minHeight: "100vh",
        }}
      >
        <Card variant="elevated">
          <div style={{ padding: spacing["3xl"], textAlign: "center" }}>
            <div
              style={{
                display: "inline-block",
                width: "48px",
                height: "48px",
                border: `4px solid ${colors.gray[200]}`,
                borderTopColor: colors.primary,
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                marginBottom: spacing.md,
              }}
            />
            <p
              style={{
                color: colors.text.muted,
                fontSize: typography.fontSize.sm,
                margin: 0,
              }}
            >
              <SkeletonCard />
            </p>
          </div>
        </Card>
        <style jsx global>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <PageTransition>
      <div
        style={{
        padding: spacing.xxl,
        maxWidth: "1600px",
        margin: "0 auto",
        backgroundColor: colors.gray[50],
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <div
        style={{
          marginBottom: spacing.xl,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: typography.fontSize["3xl"],
              fontWeight: typography.fontWeight.bold,
              color: colors.text.primary,
              marginBottom: spacing.sm,
            }}
          >
            E-Fatura Yönetimi
          </h1>
          <p
            style={{
              fontSize: typography.fontSize.base,
              color: colors.text.secondary,
              lineHeight: typography.lineHeight.relaxed,
              margin: 0,
            }}
          >
            E-Fatura sistemine gönderilebilecek faturaları yönetin ve takip edin.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleRetryFailed}
          loading={retryMutation.isPending}
        >
          🔄 Başarısız Gönderimleri Tekrar Dene
        </Button>
      </div>

      {/* Info Card */}
      <Card
        variant="outlined"
        style={{
          marginBottom: spacing.lg,
          backgroundColor: colors.primaryPastel,
          borderColor: colors.primaryLight,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: spacing.md }}>
          <span style={{ fontSize: typography.fontSize.xl, flexShrink: 0 }}>ℹ️</span>
          <div>
            <p
              style={{
                margin: 0,
                fontSize: typography.fontSize.sm,
                color: colors.text.primary,
                fontWeight: typography.fontWeight.medium,
                marginBottom: spacing.xs,
              }}
            >
              E-Fatura Sistemine Gönderim
            </p>
            <p
              style={{
                margin: 0,
                fontSize: typography.fontSize.sm,
                color: colors.text.secondary,
                lineHeight: typography.lineHeight.relaxed,
              }}
            >
              Durumu "Kesildi" olan faturalar E-Fatura sistemine gönderilebilir. Aşağıdaki listeden faturaları seçerek
              E-Fatura sistemine gönderebilirsiniz.
            </p>
          </div>
        </div>
      </Card>

      {/* Invoices List or Empty State */}
      {invoices.length === 0 ? (
        <Card variant="elevated">
          <div
            style={{
              padding: spacing["3xl"],
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "64px",
                marginBottom: spacing.md,
                opacity: 0.5,
              }}
            >
              📄
            </div>
            <h3
              style={{
                fontSize: typography.fontSize.xl,
                fontWeight: typography.fontWeight.semibold,
                color: colors.text.primary,
                marginBottom: spacing.sm,
              }}
            >
              E-Fatura Sistemine Gönderilebilecek Fatura Bulunmuyor
            </h3>
            <p
              style={{
                color: colors.text.secondary,
                fontSize: typography.fontSize.sm,
                marginBottom: spacing.lg,
                lineHeight: typography.lineHeight.relaxed,
              }}
            >
              Durumu "Kesildi" olan faturalar burada görüntülenir. Henüz kesilmiş fatura bulunmamaktadır.
            </p>
            <Button
              variant="primary"
              asLink
              href="/faturalar"
            >
              Fatura Listesine Git →
            </Button>
          </div>
        </Card>
      ) : (
        <Card variant="elevated" title={`${invoices.length} Fatura Bulundu`}>
          <div
            style={{
              overflowX: "auto",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: colors.gray[50],
                    borderBottom: `2px solid ${colors.border}`,
                  }}
                >
                  <th
                    style={{
                      padding: spacing.md,
                      textAlign: "left",
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.text.primary,
                      fontSize: typography.fontSize.sm,
                    }}
                  >
                    Fatura No
                  </th>
                  <th
                    style={{
                      padding: spacing.md,
                      textAlign: "left",
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.text.primary,
                      fontSize: typography.fontSize.sm,
                    }}
                  >
                    Müşteri
                  </th>
                  <th
                    style={{
                      padding: spacing.md,
                      textAlign: "left",
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.text.primary,
                      fontSize: typography.fontSize.sm,
                    }}
                  >
                    Tarih
                  </th>
                  <th
                    style={{
                      padding: spacing.md,
                      textAlign: "right",
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.text.primary,
                      fontSize: typography.fontSize.sm,
                    }}
                  >
                    Tutar
                  </th>
                  <th
                    style={{
                      padding: spacing.md,
                      textAlign: "center",
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.text.primary,
                      fontSize: typography.fontSize.sm,
                    }}
                  >
                    E-Fatura Durumu
                  </th>
                  <th
                    style={{
                      padding: spacing.md,
                      textAlign: "center",
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.text.primary,
                      fontSize: typography.fontSize.sm,
                    }}
                  >
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => {
                  const metadata = (invoice as any).metadata as Record<string, unknown> | undefined;
                  const eFaturaData = metadata?.eFatura as Record<string, unknown> | undefined;
                  const eFaturaStatus = eFaturaData?.status as string | undefined;
                  const statusColors = eFaturaStatus
                    ? EFATURA_STATUS_COLORS[eFaturaStatus] || EFATURA_STATUS_COLORS.draft
                    : null;
                  

                  return (
                    <tr
                      key={invoice.id}
                      style={{
                        borderBottom: `1px solid ${colors.border}`,
                        transition: `background-color ${transitions.normal} ease`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.gray[50];
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <td style={{ padding: spacing.md }}>
                        <Link
                          href={`/faturalar/${invoice.id}`}
                          style={{
                            color: colors.primary,
                            textDecoration: "none",
                            fontWeight: typography.fontWeight.medium,
                            fontSize: typography.fontSize.sm,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.textDecoration = "underline";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.textDecoration = "none";
                          }}
                        >
                          {invoice.externalId || invoice.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td
                        style={{
                          padding: spacing.md,
                          fontSize: typography.fontSize.sm,
                          color: colors.text.primary,
                        }}
                      >
                        {invoice.clientCompanyName || "-"}
                      </td>
                      <td
                        style={{
                          padding: spacing.md,
                          fontSize: typography.fontSize.sm,
                          color: colors.text.secondary,
                        }}
                      >
                        {new Date(invoice.issueDate).toLocaleDateString("tr-TR")}
                      </td>
                      <td
                        style={{
                          padding: spacing.md,
                          textAlign: "right",
                          fontSize: typography.fontSize.sm,
                          fontWeight: typography.fontWeight.medium,
                          color: colors.text.primary,
                        }}
                      >
                        {new Intl.NumberFormat("tr-TR", {
                          style: "currency",
                          currency: invoice.currency || "TRY",
                        }).format(Number(invoice.totalAmount))}
                      </td>
                      <td style={{ padding: spacing.md, textAlign: "center" }}>
                        {eFaturaStatus && statusColors ? (
                          <span
                            style={{
                              padding: `${spacing.xs} ${spacing.sm}`,
                              borderRadius: borderRadius.full,
                              fontSize: typography.fontSize.xs,
                              fontWeight: typography.fontWeight.semibold,
                              backgroundColor: statusColors.bg,
                              color: statusColors.text,
                              display: "inline-block",
                            }}
                          >
                            {EFATURA_STATUS_LABELS[eFaturaStatus] || eFaturaStatus}
                          </span>
                        ) : (
                          <span
                            style={{
                              padding: `${spacing.xs} ${spacing.sm}`,
                              borderRadius: borderRadius.full,
                              fontSize: typography.fontSize.xs,
                              fontWeight: typography.fontWeight.medium,
                              backgroundColor: colors.gray[100],
                              color: colors.text.muted,
                              display: "inline-block",
                            }}
                          >
                            Henüz Gönderilmedi
                          </span>
                        )}
                      </td>
                      <td style={{ padding: spacing.md, textAlign: "center" }}>
                        {!eFaturaStatus || eFaturaStatus === "rejected" ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              // CRITICAL: Stop all event propagation first
                              e.preventDefault();
                              e.stopPropagation();
                              if (e.nativeEvent) {
                                e.nativeEvent.stopImmediatePropagation();
                              }
                              
                              // Directly call the mutation instead of going through handleSubmit
                              setSubmitModal({ open: true, invoiceId: invoice.id });
                              
                              // Explicitly return false to prevent any default behavior
                              return false;
                            }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onMouseUp={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            disabled={submitMutation.isPending}
                            style={{
                              padding: `${spacing.xs} ${spacing.sm}`,
                              backgroundColor: submitMutation.isPending ? colors.gray[300] : colors.primary,
                              color: colors.white,
                              border: "none",
                              borderRadius: borderRadius.md,
                              cursor: submitMutation.isPending ? "not-allowed" : "pointer",
                              fontSize: typography.fontSize.sm,
                              fontWeight: typography.fontWeight.medium,
                              opacity: submitMutation.isPending ? 0.6 : 1,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: spacing.xs,
                            }}
                          >
                            {submitMutation.isPending ? "⏳ Gönderiliyor..." : "📤 E-Fatura'ya Gönder"}
                          </button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            asLink
                            href={`/faturalar/${invoice.id}`}
                          >
                            Detay
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        isOpen={submitModal.open}
        onClose={() => setSubmitModal({ open: false, invoiceId: null })}
        title="E-Fatura Gönder"
        size="sm"
      >
        <div style={{ marginBottom: spacing.lg }}>
          <p>Bu faturayı E-Fatura sistemine göndermek istediğinize emin misiniz?</p>
        </div>
        <div style={{ display: "flex", gap: spacing.md, justifyContent: "flex-end" }}>
          <Button variant="outline" onClick={() => setSubmitModal({ open: false, invoiceId: null })}>
            İptal
          </Button>
          <Button
            onClick={() => {
              if (submitModal.invoiceId) {
                submitMutation.mutate(submitModal.invoiceId);
                setSubmitModal({ open: false, invoiceId: null });
              }
            }}
            loading={submitMutation.isPending}
          >
            Gönder
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={retryModal}
        onClose={() => setRetryModal(false)}
        title="Başarısız Gönderimleri Tekrar Dene"
        size="sm"
      >
        <div style={{ marginBottom: spacing.lg }}>
          <p>Başarısız E-Fatura gönderimlerini tekrar denemek istediğinize emin misiniz?</p>
        </div>
        <div style={{ display: "flex", gap: spacing.md, justifyContent: "flex-end" }}>
          <Button variant="outline" onClick={() => setRetryModal(false)}>
            İptal
          </Button>
          <Button
            onClick={() => {
              retryMutation.mutate();
              setRetryModal(false);
            }}
            loading={retryMutation.isPending}
          >
            Tekrar Dene
          </Button>
        </div>
      </Modal>
    </div>
    </PageTransition>
  );
}
