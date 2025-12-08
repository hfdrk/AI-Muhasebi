"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getInvoice, updateInvoiceStatus } from "@repo/api-client";
import { useParams } from "next/navigation";
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

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = params.id as string;
  const queryClient = useQueryClient();

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
    if (confirm("Bu faturayı iptal etmek istediğinize emin misiniz?")) {
      statusMutation.mutate("iptal");
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: "40px" }}>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  if (!invoice?.data) {
    return (
      <div style={{ padding: "40px" }}>
        <p>Fatura bulunamadı.</p>
        <Link href="/invoices">Fatura listesine dön</Link>
      </div>
    );
  }

  const invoiceData = invoice.data;
  const canEdit = invoiceData.status === "taslak";

  return (
    <div style={{ padding: "40px", maxWidth: "1200px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1>Fatura Detayı</h1>
        <div style={{ display: "flex", gap: "8px" }}>
          {canEdit && (
            <Link
              href={`/invoices/${invoiceId}/edit`}
              style={{
                padding: "8px 16px",
                backgroundColor: "#0066cc",
                color: "white",
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
                backgroundColor: "#dc3545",
                color: "white",
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
            href="/invoices"
            style={{
              padding: "8px 16px",
              backgroundColor: "#f5f5f5",
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
              backgroundColor: invoiceData.status === "kesildi" ? "#d4edda" : "#f8d7da",
              color: invoiceData.status === "kesildi" ? "#155724" : "#721c24",
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
            <tr style={{ borderBottom: "2px solid #ddd" }}>
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
              <tr key={line.id} style={{ borderBottom: "1px solid #eee" }}>
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

      <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
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
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px", fontWeight: "bold", paddingTop: "8px", borderTop: "1px solid #ddd" }}>
            <strong>Toplam Tutar:</strong>{" "}
            {invoiceData.totalAmount.toLocaleString("tr-TR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            {invoiceData.currency}
          </div>
        </div>
      </div>
    </div>
  );
}

