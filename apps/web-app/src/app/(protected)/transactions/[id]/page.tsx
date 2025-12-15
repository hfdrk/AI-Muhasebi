"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTransaction, deleteTransaction } from "@repo/api-client";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { PageTransition } from "@/components/ui/PageTransition";
import { spacing, colors } from "@/styles/design-system";

export default function TransactionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const transactionId = params.id as string;
  const queryClient = useQueryClient();
  const [deleteModal, setDeleteModal] = useState(false);

  const { data: transaction, isLoading } = useQuery({
    queryKey: ["transaction", transactionId],
    queryFn: () => getTransaction(transactionId),
    enabled: !!transactionId,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTransaction(transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      router.push("/islemler");
    },
  });

  const handleDelete = () => {
    setDeleteModal(true);
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

  if (!transaction?.data) {
    return (
      <div style={{ padding: "40px" }}>
        <p>Mali hareket bulunamadı.</p>
        <Link href="/islemler">Mali hareket listesine dön</Link>
      </div>
    );
  }

  const transactionData = transaction.data;
  const totalDebit = transactionData.lines?.reduce((sum, line) => sum + line.debitAmount, 0) || 0;
  const totalCredit = transactionData.lines?.reduce((sum, line) => sum + line.creditAmount, 0) || 0;

  return (
    <PageTransition>
      <div style={{ padding: "40px", maxWidth: "1200px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1>Mali Hareket Detayı</h1>
        <div style={{ display: "flex", gap: "8px" }}>
          <Link
            href={`/transactions/${transactionId}/edit`}
            style={{
              padding: "8px 16px",
              backgroundColor: colors.primary,
              color: "white",
              textDecoration: "none",
              borderRadius: "4px",
            }}
          >
            Düzenle
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            style={{
              padding: "8px 16px",
              backgroundColor: colors.danger,
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: deleteMutation.isPending ? "not-allowed" : "pointer",
              opacity: deleteMutation.isPending ? 0.6 : 1,
            }}
          >
            {deleteMutation.isPending ? "Siliniyor..." : "Sil"}
          </button>
          <Link
            href="/islemler"
            style={{
              padding: "8px 16px",
              backgroundColor: colors.gray[100],
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
          <strong>Tarih:</strong> {new Date(transactionData.date).toLocaleDateString("tr-TR")}
        </div>
        <div>
          <strong>Referans No:</strong> {transactionData.referenceNo || "-"}
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <strong>Açıklama:</strong> {transactionData.description || "-"}
        </div>
        <div>
          <strong>Kaynak:</strong> {transactionData.source === "manual" ? "Manuel" : transactionData.source}
        </div>
        <div>
          <strong>Oluşturulma Tarihi:</strong>{" "}
          {new Date(transactionData.createdAt).toLocaleDateString("tr-TR")}
        </div>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ marginBottom: "16px" }}>Hareket Satırları</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #ddd" }}>
              <th style={{ padding: "12px", textAlign: "left" }}>Hesap Kodu</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Hesap Adı</th>
              <th style={{ padding: "12px", textAlign: "right" }}>Borç</th>
              <th style={{ padding: "12px", textAlign: "right" }}>Alacak</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Açıklama</th>
            </tr>
          </thead>
          <tbody>
            {transactionData.lines?.map((line) => (
              <tr key={line.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "12px" }}>{line.ledgerAccountId.substring(0, 8)}</td>
                <td style={{ padding: "12px" }}>-</td>
                <td style={{ padding: "12px", textAlign: "right" }}>
                  {line.debitAmount > 0
                    ? line.debitAmount.toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : "-"}
                </td>
                <td style={{ padding: "12px", textAlign: "right" }}>
                  {line.creditAmount > 0
                    ? line.creditAmount.toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : "-"}
                </td>
                <td style={{ padding: "12px" }}>{line.description || "-"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: "2px solid #ddd", fontWeight: "bold" }}>
              <td colSpan={2} style={{ padding: "12px", textAlign: "right" }}>
                Toplam:
              </td>
              <td style={{ padding: "12px", textAlign: "right" }}>
                {totalDebit.toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td style={{ padding: "12px", textAlign: "right" }}>
                {totalCredit.toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td style={{ padding: "12px" }}>
                {Math.abs(totalDebit - totalCredit) < 0.01 ? (
                  <span style={{ color: colors.success }}>✓ Dengeli</span>
                ) : (
                  <span style={{ color: colors.danger }}>✗ Dengesiz</span>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <Modal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        title="Mali Hareketi Sil"
        size="sm"
      >
        <div style={{ marginBottom: spacing.lg }}>
          <p>Bu mali hareketi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.</p>
        </div>
        <div style={{ display: "flex", gap: spacing.md, justifyContent: "flex-end" }}>
          <Button variant="outline" onClick={() => setDeleteModal(false)}>
            İptal
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              deleteMutation.mutate();
              setDeleteModal(false);
            }}
            loading={deleteMutation.isPending}
          >
            Sil
          </Button>
        </div>
      </Modal>
    </div>
    </PageTransition>
  );
}

