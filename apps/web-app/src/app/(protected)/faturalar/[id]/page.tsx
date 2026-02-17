"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getInvoice, updateInvoiceStatus } from "@repo/api-client";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { PageTransition } from "@/components/ui/PageTransition";
import { colors, spacing, typography } from "@/styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "@/lib/toast";

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

export default function InvoiceDetailPage() {
  const { themeColors } = useTheme();
  const params = useParams();
  const invoiceId = params.id as string;
  const queryClient = useQueryClient();
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: () => getInvoice(invoiceId),
    enabled: !!invoiceId,
  });

  const statusMutation = useMutation({
    mutationFn: (status: "taslak" | "kesildi" | "iptal" | "muhasebeleştirilmiş") =>
      updateInvoiceStatus(invoiceId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Fatura durumu güncellendi.");
      setCancelModalOpen(false);
    },
    onError: () => {
      toast.error("Fatura durumu güncellenirken bir hata oluştu.");
    },
  });

  const handleCancelInvoice = () => {
    setCancelModalOpen(true);
  };

  const handleCancelConfirm = () => {
    statusMutation.mutate("iptal");
  };

  if (isLoading) {
    return (
      <div style={{ padding: spacing.xxl, maxWidth: "1200px", margin: "0 auto" }}>
        <Card>
          <div style={{ padding: spacing.lg }}>
            <Skeleton height="40px" width="60%" style={{ marginBottom: spacing.md }} />
            <Skeleton height="20px" width="80%" style={{ marginBottom: spacing.sm }} />
            <Skeleton height="20px" width="90%" style={{ marginBottom: spacing.sm }} />
            <Skeleton height="200px" width="100%" />
          </div>
        </Card>
      </div>
    );
  }

  if (!invoice?.data) {
    return (
      <div style={{ padding: spacing.xxl, maxWidth: "1200px", margin: "0 auto" }}>
        <Card>
          <div style={{ textAlign: "center", padding: spacing.xxl }}>
            <p style={{ color: themeColors.text.secondary, marginBottom: spacing.md }}>Fatura bulunamadı.</p>
            <Button asLink href="/faturalar" variant="outline">
              Fatura listesine dön
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const invoiceData = invoice.data;
  const canEdit = invoiceData.status === "taslak";

  return (
    <PageTransition>
      <div style={{ padding: spacing.xxl, maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xl }}>
        <div>
          <h1 style={{ fontSize: typography.fontSize["3xl"], fontWeight: typography.fontWeight.bold, color: themeColors.text.primary, marginBottom: spacing.sm }}>
            Fatura Detayı
          </h1>
          <Badge
            variant={
              invoiceData.status === "kesildi"
                ? "success"
                : invoiceData.status === "iptal"
                ? "danger"
                : invoiceData.status === "muhasebeleştirilmiş"
                ? "info"
                : "secondary"
            }
            size="md"
          >
            {STATUS_LABELS[invoiceData.status] || invoiceData.status}
          </Badge>
        </div>
        <div style={{ display: "flex", gap: spacing.sm }}>
          {canEdit && (
            <Button asLink href={`/faturalar/${invoiceId}/edit`} variant="primary">
              Düzenle
            </Button>
          )}
          {invoiceData.status !== "iptal" && (
            <Button
              onClick={handleCancelInvoice}
              disabled={statusMutation.isPending}
              variant="danger"
              loading={statusMutation.isPending}
            >
              İptal Et
            </Button>
          )}
          <Button asLink href="/faturalar" variant="outline">
            Geri
          </Button>
        </div>
      </div>

      <Card style={{ marginBottom: spacing.xl }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.md, padding: spacing.lg }}>
          <div>
            <strong style={{ color: themeColors.text.secondary, fontSize: typography.fontSize.sm }}>Fatura No:</strong>
            <p style={{ margin: spacing.xs + " 0", color: themeColors.text.primary }}>{invoiceData.externalId || invoiceData.id.substring(0, 8)}</p>
          </div>
          <div>
            <strong style={{ color: themeColors.text.secondary, fontSize: typography.fontSize.sm }}>Tür:</strong>
            <p style={{ margin: spacing.xs + " 0", color: themeColors.text.primary }}>{TYPE_LABELS[invoiceData.type] || invoiceData.type}</p>
          </div>
          <div>
            <strong style={{ color: themeColors.text.secondary, fontSize: typography.fontSize.sm }}>Düzenleme Tarihi:</strong>
            <p style={{ margin: spacing.xs + " 0", color: themeColors.text.primary }}>{new Date(invoiceData.issueDate).toLocaleDateString("tr-TR")}</p>
          </div>
          <div>
            <strong style={{ color: themeColors.text.secondary, fontSize: typography.fontSize.sm }}>Vade Tarihi:</strong>
            <p style={{ margin: spacing.xs + " 0", color: themeColors.text.primary }}>
              {invoiceData.dueDate ? new Date(invoiceData.dueDate).toLocaleDateString("tr-TR") : "-"}
            </p>
          </div>
          <div>
            <strong style={{ color: themeColors.text.secondary, fontSize: typography.fontSize.sm }}>Para Birimi:</strong>
            <p style={{ margin: spacing.xs + " 0", color: themeColors.text.primary }}>{invoiceData.currency}</p>
          </div>
          <div>
            <strong style={{ color: themeColors.text.secondary, fontSize: typography.fontSize.sm }}>Alıcı / Satıcı:</strong>
            <p style={{ margin: spacing.xs + " 0", color: themeColors.text.primary }}>{invoiceData.counterpartyName || "-"}</p>
          </div>
          <div>
            <strong style={{ color: themeColors.text.secondary, fontSize: typography.fontSize.sm }}>Alıcı / Satıcı Vergi No:</strong>
            <p style={{ margin: spacing.xs + " 0", color: themeColors.text.primary }}>{invoiceData.counterpartyTaxNumber || "-"}</p>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <strong style={{ color: themeColors.text.secondary, fontSize: typography.fontSize.sm }}>Kaynak:</strong>
            <p style={{ margin: spacing.xs + " 0", color: themeColors.text.primary }}>{invoiceData.source === "manual" ? "Manuel" : invoiceData.source}</p>
          </div>
        </div>
      </Card>

      <Card style={{ marginBottom: spacing.xl }}>
        <h2 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, color: themeColors.text.primary, marginBottom: spacing.md, padding: spacing.lg, borderBottom: `1px solid ${themeColors.border}` }}>
          Fatura Satırları
        </h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${themeColors.border}`, backgroundColor: colors.background }}>
                <th style={{ padding: spacing.md, textAlign: "left", color: themeColors.text.secondary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>Satır No</th>
                <th style={{ padding: spacing.md, textAlign: "left", color: themeColors.text.secondary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>Açıklama</th>
                <th style={{ padding: spacing.md, textAlign: "right", color: themeColors.text.secondary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>Miktar</th>
                <th style={{ padding: spacing.md, textAlign: "right", color: themeColors.text.secondary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>Birim Fiyat</th>
                <th style={{ padding: spacing.md, textAlign: "right", color: themeColors.text.secondary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>Satır Toplamı</th>
                <th style={{ padding: spacing.md, textAlign: "right", color: themeColors.text.secondary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>KDV Oranı</th>
                <th style={{ padding: spacing.md, textAlign: "right", color: themeColors.text.secondary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>KDV Tutarı</th>
              </tr>
            </thead>
            <tbody>
              {invoiceData.lines?.map((line, index) => (
                <tr key={line.id} style={{ borderBottom: `1px solid ${themeColors.border}`, backgroundColor: index % 2 === 0 ? themeColors.white : colors.background }}>
                  <td style={{ padding: spacing.md, color: themeColors.text.primary }}>{line.lineNumber}</td>
                  <td style={{ padding: spacing.md, color: themeColors.text.primary }}>{line.description}</td>
                  <td style={{ padding: spacing.md, textAlign: "right", color: themeColors.text.primary }}>
                    {line.quantity.toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td style={{ padding: spacing.md, textAlign: "right", color: themeColors.text.primary }}>
                    {line.unitPrice.toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td style={{ padding: spacing.md, textAlign: "right", color: themeColors.text.primary }}>
                    {line.lineTotal.toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td style={{ padding: spacing.md, textAlign: "right", color: themeColors.text.primary }}>
                    {(line.vatRate * 100).toFixed(0)}%
                  </td>
                  <td style={{ padding: spacing.md, textAlign: "right", color: themeColors.text.primary }}>
                    {line.vatAmount.toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div style={{ display: "flex", justifyContent: "flex-end", padding: spacing.lg, backgroundColor: colors.background, borderRadius: "8px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm, minWidth: "300px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: themeColors.text.primary }}>
              <strong>Net Tutar:</strong>
              <span>
                {((invoiceData.netAmount || invoiceData.totalAmount - invoiceData.taxAmount)).toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                {invoiceData.currency}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: themeColors.text.primary }}>
              <strong>KDV Tutarı:</strong>
              <span>
                {invoiceData.taxAmount.toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                {invoiceData.currency}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, paddingTop: spacing.md, borderTop: `1px solid ${themeColors.border}`, color: themeColors.text.primary }}>
              <strong>Toplam Tutar:</strong>
              <span>
                {invoiceData.totalAmount.toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                {invoiceData.currency}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Faturayı İptal Et"
        size="sm"
      >
        <div style={{ marginBottom: spacing.lg }}>
          <p style={{ color: themeColors.text.primary }}>
            Bu faturayı iptal etmek istediğinize emin misiniz? Bu işlem geri alınamaz.
          </p>
        </div>
        <div style={{ display: "flex", gap: spacing.md, justifyContent: "flex-end" }}>
          <Button variant="outline" onClick={() => setCancelModalOpen(false)}>
            İptal
          </Button>
          <Button variant="danger" onClick={handleCancelConfirm} loading={statusMutation.isPending}>
            İptal Et
          </Button>
        </div>
      </Modal>
    </div>
    </PageTransition>
  );
}

