"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getInvoice, updateInvoiceStatus } from "@repo/api-client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";
import { PageTransition } from "@/components/ui/PageTransition";
import { spacing, colors, borderRadius } from "@/styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";

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
  const [cancelModal, setCancelModal] = useState(false);

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
    },
  });

  const handleCancelInvoice = () => {
    setCancelModal(true);
  };

  if (isLoading) {
    return (
      <PageTransition>
        <Card>
          <div style={{ padding: spacing.xxl }}>
            <Skeleton height="40px" width="300px" style={{ marginBottom: spacing.md }} />
            <Skeleton height="200px" width="100%" />
          </div>
        </Card>
      </PageTransition>
    );
  }

  if (!invoice?.data) {
    return (
      <div style={{ padding: "40px" }}>
        <p>Fatura bulunamadı.</p>
        <Link href="/faturalar">Fatura listesine dön</Link>
      </div>
    );
  }

  const invoiceData = invoice.data;
  const canEdit = invoiceData.status === "taslak";

  return (
    <PageTransition>
      <div style={{ padding: "40px", maxWidth: "1200px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1>Fatura Detayı</h1>
        <div style={{ display: "flex", gap: "8px" }}>
          {canEdit && (
            <Link
              href={`/invoices/${invoiceId}/edit`}
              style={{
                padding: "8px 16px",
                backgroundColor: colors.primary,
                color: colors.white,
                textDecoration: "none",
                borderRadius: "4px",
              }}
            >
              Düzenle
            </Link>
          )}
          {invoiceData.status !== "iptal" && (
            <button
              onClick={handleCancelInvoice}
              disabled={statusMutation.isPending}
              style={{
                padding: "8px 16px",
                backgroundColor: colors.danger,
                color: colors.white,
                border: "none",
                borderRadius: "4px",
                cursor: statusMutation.isPending ? "not-allowed" : "pointer",
                opacity: statusMutation.isPending ? 0.6 : 1,
              }}
            >
              İptal Et
            </button>
          )}
          <Link
            href="/faturalar"
            style={{
              padding: "8px 16px",
              backgroundColor: themeColors.gray[100],
              color: "inherit",
              textDecoration: "none",
              borderRadius: "4px",
            }}
          >
            Geri
          </Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div>
          <strong>Fatura No:</strong> {invoiceData.externalId || invoiceData.id.substring(0, 8)}
        </div>
        <div>
          <strong>Tür:</strong> {TYPE_LABELS[invoiceData.type] || invoiceData.type}
        </div>
        <div>
          <strong>Durum:</strong>{" "}
          <span
            style={{
              padding: "4px 8px",
              borderRadius: "4px",
              backgroundColor: invoiceData.status === "kesildi" ? colors.successLight : colors.dangerLight,
              color: invoiceData.status === "kesildi" ? colors.successDark : colors.dangerDark,
              fontSize: "12px",
            }}
          >
            {STATUS_LABELS[invoiceData.status] || invoiceData.status}
          </span>
        </div>
        <div>
          <strong>Düzenleme Tarihi:</strong> {new Date(invoiceData.issueDate).toLocaleDateString("tr-TR")}
        </div>
        <div>
          <strong>Vade Tarihi:</strong>{" "}
          {invoiceData.dueDate ? new Date(invoiceData.dueDate).toLocaleDateString("tr-TR") : "-"}
        </div>
        <div>
          <strong>Para Birimi:</strong> {invoiceData.currency}
        </div>
        <div>
          <strong>Alıcı / Satıcı:</strong> {invoiceData.counterpartyName || "-"}
        </div>
        <div>
          <strong>Alıcı / Satıcı Vergi No:</strong> {invoiceData.counterpartyTaxNumber || "-"}
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <strong>Kaynak:</strong> {invoiceData.source === "manual" ? "Manuel" : invoiceData.source}
        </div>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ marginBottom: "16px" }}>Fatura Satırları</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${themeColors.border}` }}>
              <th style={{ padding: "12px", textAlign: "left" }}>Satır No</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Açıklama</th>
              <th style={{ padding: "12px", textAlign: "right" }}>Miktar</th>
              <th style={{ padding: "12px", textAlign: "right" }}>Birim Fiyat</th>
              <th style={{ padding: "12px", textAlign: "right" }}>Satır Toplamı</th>
              <th style={{ padding: "12px", textAlign: "right" }}>KDV Oranı</th>
              <th style={{ padding: "12px", textAlign: "right" }}>KDV Tutarı</th>
            </tr>
          </thead>
          <tbody>
            {invoiceData.lines?.map((line) => (
              <tr key={line.id} style={{ borderBottom: `1px solid ${themeColors.gray[200]}` }}>
                <td style={{ padding: "12px" }}>{line.lineNumber}</td>
                <td style={{ padding: "12px" }}>{line.description}</td>
                <td style={{ padding: "12px", textAlign: "right" }}>
                  {line.quantity.toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td style={{ padding: "12px", textAlign: "right" }}>
                  {line.unitPrice.toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td style={{ padding: "12px", textAlign: "right" }}>
                  {line.lineTotal.toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td style={{ padding: "12px", textAlign: "right" }}>
                  {(line.vatRate * 100).toFixed(0)}%
                </td>
                <td style={{ padding: "12px", textAlign: "right" }}>
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

      <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px", backgroundColor: themeColors.gray[100], borderRadius: borderRadius.sm }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: "300px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>Net Tutar:</strong>{" "}
            {((invoiceData.netAmount || invoiceData.totalAmount - invoiceData.taxAmount)).toLocaleString("tr-TR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            {invoiceData.currency}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>KDV Tutarı:</strong>{" "}
            {invoiceData.taxAmount.toLocaleString("tr-TR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            {invoiceData.currency}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px", fontWeight: "bold", paddingTop: "8px", borderTop: `1px solid ${themeColors.border}` }}>
            <strong>Toplam Tutar:</strong>{" "}
            {invoiceData.totalAmount.toLocaleString("tr-TR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            {invoiceData.currency}
          </div>
        </div>
      </div>

      <Modal
        isOpen={cancelModal}
        onClose={() => setCancelModal(false)}
        title="Faturayı İptal Et"
        size="sm"
      >
        <div style={{ marginBottom: spacing.lg }}>
          <p>Bu faturayı iptal etmek istediğinize emin misiniz? Bu işlem geri alınamaz.</p>
        </div>
        <div style={{ display: "flex", gap: spacing.md, justifyContent: "flex-end" }}>
          <Button variant="outline" onClick={() => setCancelModal(false)}>
            İptal
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              statusMutation.mutate("iptal");
              setCancelModal(false);
            }}
            loading={statusMutation.isPending}
          >
            İptal Et
          </Button>
        </div>
      </Modal>
    </div>
    </PageTransition>
  );
}

