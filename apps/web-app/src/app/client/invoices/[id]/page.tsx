"use client";

import { useQuery } from "@tanstack/react-query";
import { getInvoice } from "@repo/api-client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { colors, spacing } from "@/styles/design-system";

function formatCurrency(amount: number, currency: string = "TRY"): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: currency,
  }).format(amount);
}

function formatDate(date: Date | string | null): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("tr-TR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

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

export default function ClientInvoiceDetailPage() {
  const params = useParams();
  const invoiceId = params.id as string;

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: () => getInvoice(invoiceId),
    enabled: !!invoiceId,
  });

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Fatura Detayı" />
        <Card>
          <div style={{ padding: spacing.xl, textAlign: "center", color: colors.text.secondary }}>
            Yükleniyor...
          </div>
        </Card>
      </div>
    );
  }

  const invoiceData = invoice?.data;
  if (!invoiceData) {
    return (
      <div>
        <PageHeader title="Fatura Detayı" />
        <Card>
          <div style={{ padding: spacing.xl, textAlign: "center", color: colors.text.secondary }}>
            <div style={{ fontSize: "48px", marginBottom: spacing.md }}>❌</div>
            <div>Fatura bulunamadı.</div>
            <Link href="/client/invoices" style={{ color: colors.primary, textDecoration: "none", marginTop: spacing.md, display: "inline-block" }}>
              ← Faturalarıma Dön
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg }}>
        <Link href="/client/invoices" style={{ color: colors.primary, textDecoration: "none", fontSize: "18px" }}>
          ←
        </Link>
        <PageHeader title={`Fatura #${invoiceData.invoiceNumber || invoiceId}`} />
      </div>

      {/* Invoice Details */}
      <Card style={{ marginBottom: spacing.lg }}>
        <div style={{ padding: spacing.lg }}>
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: spacing.md, marginBottom: spacing.md }}>
            <div style={{ color: colors.text.secondary, fontSize: "14px" }}>Fatura No:</div>
            <div style={{ fontWeight: "medium" }}>{invoiceData.invoiceNumber || "-"}</div>

            <div style={{ color: colors.text.secondary, fontSize: "14px" }}>Tip:</div>
            <div>{TYPE_LABELS[invoiceData.type] || invoiceData.type}</div>

            <div style={{ color: colors.text.secondary, fontSize: "14px" }}>Durum:</div>
            <div>
              <span
                style={{
                  padding: `${spacing.xs} ${spacing.sm}`,
                  borderRadius: "4px",
                  backgroundColor:
                    invoiceData.status === "kesildi"
                      ? colors.success + "20"
                      : invoiceData.status === "iptal"
                      ? colors.error + "20"
                      : colors.gray[200],
                  color:
                    invoiceData.status === "kesildi"
                      ? colors.success
                      : invoiceData.status === "iptal"
                      ? colors.error
                      : colors.text.secondary,
                  fontSize: "12px",
                  fontWeight: "medium",
                }}
              >
                {STATUS_LABELS[invoiceData.status] || invoiceData.status}
              </span>
            </div>

            <div style={{ color: colors.text.secondary, fontSize: "14px" }}>Tarih:</div>
            <div>{formatDate(invoiceData.issueDate)}</div>

            {invoiceData.dueDate && (
              <>
                <div style={{ color: colors.text.secondary, fontSize: "14px" }}>Vade Tarihi:</div>
                <div>{formatDate(invoiceData.dueDate)}</div>
              </>
            )}

            <div style={{ color: colors.text.secondary, fontSize: "14px" }}>Toplam:</div>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: colors.primary }}>
              {formatCurrency(Number(invoiceData.totalAmount), invoiceData.currency)}
            </div>

            {invoiceData.counterpartyName && (
              <>
                <div style={{ color: colors.text.secondary, fontSize: "14px" }}>Karşı Taraf:</div>
                <div>{invoiceData.counterpartyName}</div>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Invoice Lines */}
      {invoiceData.lines && invoiceData.lines.length > 0 && (
        <Card>
          <div style={{ padding: spacing.lg }}>
            <h3 style={{ fontSize: "18px", fontWeight: "semibold", marginBottom: spacing.md }}>Fatura Kalemleri</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${colors.gray[300]}` }}>
                    <th style={{ padding: spacing.md, textAlign: "left", fontSize: "14px", fontWeight: "semibold" }}>
                      Açıklama
                    </th>
                    <th style={{ padding: spacing.md, textAlign: "right", fontSize: "14px", fontWeight: "semibold" }}>
                      Miktar
                    </th>
                    <th style={{ padding: spacing.md, textAlign: "right", fontSize: "14px", fontWeight: "semibold" }}>
                      Birim Fiyat
                    </th>
                    <th style={{ padding: spacing.md, textAlign: "right", fontSize: "14px", fontWeight: "semibold" }}>
                      Toplam
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceData.lines.map((line: any, index: number) => (
                    <tr key={index} style={{ borderBottom: `1px solid ${colors.gray[200]}` }}>
                      <td style={{ padding: spacing.md, fontSize: "14px" }}>{line.description || "-"}</td>
                      <td style={{ padding: spacing.md, fontSize: "14px", textAlign: "right" }}>
                        {Number(line.quantity).toFixed(2)}
                      </td>
                      <td style={{ padding: spacing.md, fontSize: "14px", textAlign: "right" }}>
                        {formatCurrency(Number(line.unitPrice), invoiceData.currency)}
                      </td>
                      <td style={{ padding: spacing.md, fontSize: "14px", textAlign: "right", fontWeight: "medium" }}>
                        {formatCurrency(Number(line.lineTotal), invoiceData.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: `2px solid ${colors.gray[300]}` }}>
                    <td colSpan={3} style={{ padding: spacing.md, textAlign: "right", fontWeight: "semibold" }}>
                      Toplam:
                    </td>
                    <td style={{ padding: spacing.md, textAlign: "right", fontWeight: "bold", fontSize: "16px" }}>
                      {formatCurrency(Number(invoiceData.totalAmount), invoiceData.currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
