"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listScheduledReports,
  deleteScheduledReport,
  getCurrentUser,
} from "@repo/api-client";
import { reports as reportsI18n } from "@repo/i18n";
import { getReportTypeLabel, getScheduleCronLabel, getStatusLabel, formatReportDate } from "@/lib/reports";
import { colors, spacing } from "@/styles/design-system";
import { Card } from "@/components/ui/Card";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { PageTransition } from "@/components/ui/PageTransition";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ScheduledReportsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; reportId: string | null }>({ open: false, reportId: null });

  const { data: userData } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => getCurrentUser(),
  });

  const currentUser = userData?.data;
  const currentTenant = currentUser?.tenants.find((t) => t.status === "active");
  const userRole = currentTenant?.role;
  const canManage = userRole === "TenantOwner" || userRole === "Accountant";

  const { data, isLoading, error: queryError } = useQuery({
    queryKey: ["scheduledReports"],
    queryFn: () => listScheduledReports(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteScheduledReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduledReports"] });
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message || "Rapor silinirken bir hata oluştu.");
    },
  });

  const scheduledReports = data?.data || [];

  if (isLoading) {
    return (
      <PageTransition>
        <Card>
          <div style={{ padding: spacing.lg }}>
            <SkeletonTable rows={5} columns={6} />
          </div>
        </Card>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div style={{ padding: spacing.xxl }}>
      <div style={{ marginBottom: spacing.xl, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <Link
            href="/raporlar"
            style={{
              textDecoration: "none",
              color: colors.primary,
              fontSize: "14px",
              marginBottom: spacing.md,
              display: "inline-block",
            }}
          >
            ← Raporlara Dön
          </Link>
          <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: spacing.sm, color: colors.text.primary }}>
            Zamanlanmış Raporlar
          </h1>
          <p style={{ color: colors.text.secondary, fontSize: "16px" }}>
            Otomatik olarak oluşturulan ve e-posta ile gönderilen raporları yönetin.
          </p>
        </div>
        {canManage && (
          <Link
            href="/raporlar/zamanlanmis/new"
            style={{
              padding: `${spacing.sm} ${spacing.lg}`,
              backgroundColor: colors.primary,
              color: colors.white,
              textDecoration: "none",
              borderRadius: "4px",
              fontSize: "14px",
              fontWeight: 500,
              display: "inline-block",
            }}
          >
            Yeni Zamanlanmış Rapor Oluştur
          </Link>
        )}
      </div>

      {error && (
        <div
          style={{
            marginBottom: spacing.md,
            padding: spacing.md,
            backgroundColor: "#fee",
            color: "#c33",
            borderRadius: "4px",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}

      {queryError && (
        <div
          style={{
            marginBottom: spacing.md,
            padding: spacing.md,
            backgroundColor: "#fee",
            color: "#c33",
            borderRadius: "4px",
            fontSize: "14px",
          }}
        >
          {(queryError as Error).message || "Raporlar yüklenirken bir hata oluştu."}
        </div>
      )}

      {scheduledReports.length === 0 ? (
        <div
          style={{
            backgroundColor: colors.white,
            padding: spacing.xxl,
            borderRadius: "8px",
            border: `1px solid ${colors.border}`,
            textAlign: "center",
          }}
        >
          <p style={{ color: colors.text.secondary }}>{reportsI18n.list.emptyState}</p>
          {canManage && (
            <Link
              href="/raporlar/zamanlanmis/new"
              style={{
                display: "inline-block",
                marginTop: spacing.md,
                padding: `${spacing.sm} ${spacing.lg}`,
                backgroundColor: colors.primary,
                color: colors.white,
                textDecoration: "none",
                borderRadius: "4px",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              İlk Zamanlanmış Raporu Oluştur
            </Link>
          )}
        </div>
      ) : (
        <div
          style={{
            backgroundColor: colors.white,
            borderRadius: "8px",
            border: `1px solid ${colors.border}`,
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ backgroundColor: colors.gray[50], borderBottom: `2px solid ${colors.border}` }}>
                  <th style={{ padding: spacing.md, textAlign: "left", fontWeight: 600 }}>Ad</th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontWeight: 600 }}>Rapor Türü</th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontWeight: 600 }}>Format</th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontWeight: 600 }}>Sıklık</th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontWeight: 600 }}>Alıcılar</th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontWeight: 600 }}>Son Çalışma Zamanı</th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontWeight: 600 }}>Son Durum</th>
                  {canManage && <th style={{ padding: spacing.md, textAlign: "left", fontWeight: 600 }}>İşlemler</th>}
                </tr>
              </thead>
              <tbody>
                {scheduledReports.map((report) => (
                  <tr key={report.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: spacing.md, color: colors.text.primary }}>{report.name}</td>
                    <td style={{ padding: spacing.md, color: colors.text.secondary }}>
                      {getReportTypeLabel(report.reportCode)}
                    </td>
                    <td style={{ padding: spacing.md, color: colors.text.secondary }}>
                      {report.format === "pdf" ? "PDF" : "Excel"}
                    </td>
                    <td style={{ padding: spacing.md, color: colors.text.secondary }}>
                      {getScheduleCronLabel(report.scheduleCron)}
                    </td>
                    <td style={{ padding: spacing.md, color: colors.text.secondary }}>
                      {report.recipients.join(", ")}
                    </td>
                    <td style={{ padding: spacing.md, color: colors.text.secondary }}>
                      {report.lastRunAt ? formatReportDate(report.lastRunAt) : "-"}
                    </td>
                    <td style={{ padding: spacing.md, color: colors.text.secondary }}>
                      {getStatusLabel(report.lastRunStatus)}
                    </td>
                    {canManage && (
                      <td style={{ padding: spacing.md }}>
                        <div style={{ display: "flex", gap: spacing.sm }}>
                          <button
                            onClick={() => router.push(`/raporlar/zamanlanmis/${report.id}`)}
                            style={{
                              padding: `${spacing.xs} ${spacing.sm}`,
                              backgroundColor: "transparent",
                              color: colors.primary,
                              border: `1px solid ${colors.primary}`,
                              borderRadius: "4px",
                              fontSize: "12px",
                              cursor: "pointer",
                            }}
                          >
                            Düzenle
                          </button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setDeleteModal({ open: true, reportId: report.id })}
                            disabled={deleteMutation.isPending}
                            style={{
                              padding: `${spacing.xs} ${spacing.sm}`,
                              backgroundColor: "transparent",
                              color: "#c33",
                              border: `1px solid #c33`,
                              borderRadius: "4px",
                              fontSize: "12px",
                              cursor: deleteMutation.isPending ? "not-allowed" : "pointer",
                              opacity: deleteMutation.isPending ? 0.5 : 1,
                            }}
                          >
                            Sil
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, reportId: null })}
        title="Zamanlanmış Raporu Sil"
        size="sm"
      >
        <div style={{ marginBottom: spacing.lg }}>
          <p>Bu zamanlanmış raporu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.</p>
        </div>
        <div style={{ display: "flex", gap: spacing.md, justifyContent: "flex-end" }}>
          <Button variant="outline" onClick={() => setDeleteModal({ open: false, reportId: null })}>
            İptal
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (deleteModal.reportId) {
                deleteMutation.mutate(deleteModal.reportId);
                setDeleteModal({ open: false, reportId: null });
              }
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

