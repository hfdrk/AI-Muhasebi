"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTransaction, deleteTransaction } from "@repo/api-client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { PageTransition } from "@/components/ui/PageTransition";
import { colors, spacing, typography } from "@/styles/design-system";
import { toast } from "@/lib/toast";

export default function TransactionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const transactionId = params.id as string;
  const queryClient = useQueryClient();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const { data: transaction, isLoading } = useQuery({
    queryKey: ["transaction", transactionId],
    queryFn: () => getTransaction(transactionId),
    enabled: !!transactionId,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTransaction(transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Mali hareket başarıyla silindi.");
      router.push("/islemler");
    },
    onError: () => {
      toast.error("Mali hareket silinirken bir hata oluştu.");
    },
  });

  const handleDelete = () => {
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    deleteMutation.mutate();
    setDeleteModalOpen(false);
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

  if (!transaction?.data) {
    return (
      <div style={{ padding: spacing.xxl, maxWidth: "1200px", margin: "0 auto" }}>
        <Card>
          <div style={{ textAlign: "center", padding: spacing.xxl }}>
            <p style={{ color: colors.text.secondary, marginBottom: spacing.md }}>Mali hareket bulunamadı.</p>
            <Button asLink href="/islemler" variant="outline">
              Mali hareket listesine dön
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const transactionData = transaction.data;
  const totalDebit = transactionData.lines?.reduce((sum, line) => sum + line.debitAmount, 0) || 0;
  const totalCredit = transactionData.lines?.reduce((sum, line) => sum + line.creditAmount, 0) || 0;

  return (
    <PageTransition>
      <div style={{ padding: spacing.xxl, maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xl }}>
        <div>
          <h1 style={{ fontSize: typography.fontSize["3xl"], fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing.sm }}>
            Mali Hareket Detayı
          </h1>
          <Badge
            variant={Math.abs(totalDebit - totalCredit) < 0.01 ? "success" : "danger"}
            size="md"
          >
            {Math.abs(totalDebit - totalCredit) < 0.01 ? "✓ Dengeli" : "✗ Dengesiz"}
          </Badge>
        </div>
        <div style={{ display: "flex", gap: spacing.sm }}>
          <Button asLink href={`/islemler/${transactionId}/edit`} variant="primary">
            Düzenle
          </Button>
          <Button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            variant="danger"
            loading={deleteMutation.isPending}
          >
            Sil
          </Button>
          <Button asLink href="/islemler" variant="outline">
            Geri
          </Button>
        </div>
      </div>

      <Card style={{ marginBottom: spacing.xl }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.md, padding: spacing.lg }}>
          <div>
            <strong style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>Tarih:</strong>
            <p style={{ margin: spacing.xs + " 0", color: colors.text.primary }}>{new Date(transactionData.date).toLocaleDateString("tr-TR")}</p>
          </div>
          <div>
            <strong style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>Referans No:</strong>
            <p style={{ margin: spacing.xs + " 0", color: colors.text.primary }}>{transactionData.referenceNo || "-"}</p>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <strong style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>Açıklama:</strong>
            <p style={{ margin: spacing.xs + " 0", color: colors.text.primary }}>{transactionData.description || "-"}</p>
          </div>
          <div>
            <strong style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>Kaynak:</strong>
            <p style={{ margin: spacing.xs + " 0", color: colors.text.primary }}>{transactionData.source === "manual" ? "Manuel" : transactionData.source}</p>
          </div>
          <div>
            <strong style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>Oluşturulma Tarihi:</strong>
            <p style={{ margin: spacing.xs + " 0", color: colors.text.primary }}>
              {new Date(transactionData.createdAt).toLocaleDateString("tr-TR")}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <h2 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing.md, padding: spacing.lg, borderBottom: `1px solid ${colors.border}` }}>
          Hareket Satırları
        </h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${colors.border}`, backgroundColor: colors.background }}>
                <th style={{ padding: spacing.md, textAlign: "left", color: colors.text.secondary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>Hesap Kodu</th>
                <th style={{ padding: spacing.md, textAlign: "left", color: colors.text.secondary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>Hesap Adı</th>
                <th style={{ padding: spacing.md, textAlign: "right", color: colors.text.secondary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>Borç</th>
                <th style={{ padding: spacing.md, textAlign: "right", color: colors.text.secondary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>Alacak</th>
                <th style={{ padding: spacing.md, textAlign: "left", color: colors.text.secondary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>Açıklama</th>
              </tr>
            </thead>
            <tbody>
              {transactionData.lines?.map((line, index) => (
                <tr key={line.id} style={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: index % 2 === 0 ? colors.white : colors.background }}>
                  <td style={{ padding: spacing.md, color: colors.text.primary }}>{line.ledgerAccountId.substring(0, 8)}</td>
                  <td style={{ padding: spacing.md, color: colors.text.primary }}>-</td>
                  <td style={{ padding: spacing.md, textAlign: "right", color: colors.text.primary }}>
                    {line.debitAmount > 0
                      ? line.debitAmount.toLocaleString("tr-TR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : "-"}
                  </td>
                  <td style={{ padding: spacing.md, textAlign: "right", color: colors.text.primary }}>
                    {line.creditAmount > 0
                      ? line.creditAmount.toLocaleString("tr-TR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : "-"}
                  </td>
                  <td style={{ padding: spacing.md, color: colors.text.primary }}>{line.description || "-"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: `2px solid ${colors.border}`, fontWeight: typography.fontWeight.bold, backgroundColor: colors.background }}>
                <td colSpan={2} style={{ padding: spacing.md, textAlign: "right", color: colors.text.primary }}>
                  Toplam:
                </td>
                <td style={{ padding: spacing.md, textAlign: "right", color: colors.text.primary }}>
                  {totalDebit.toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td style={{ padding: spacing.md, textAlign: "right", color: colors.text.primary }}>
                  {totalCredit.toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td style={{ padding: spacing.md }}>
                  <Badge
                    variant={Math.abs(totalDebit - totalCredit) < 0.01 ? "success" : "danger"}
                    size="sm"
                  >
                    {Math.abs(totalDebit - totalCredit) < 0.01 ? "✓ Dengeli" : "✗ Dengesiz"}
                  </Badge>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Mali Hareketi Sil"
        size="sm"
      >
        <div style={{ marginBottom: spacing.lg }}>
          <p style={{ color: colors.text.primary }}>
            Bu mali hareketi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
          </p>
        </div>
        <div style={{ display: "flex", gap: spacing.md, justifyContent: "flex-end" }}>
          <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
            İptal
          </Button>
          <Button variant="danger" onClick={handleDeleteConfirm} loading={deleteMutation.isPending}>
            Sil
          </Button>
        </div>
      </Modal>
    </div>
    </PageTransition>
  );
}

