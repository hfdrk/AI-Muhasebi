"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getIntegration,
  listSyncJobs,
  listSyncLogs,
  triggerSync,
  updateIntegration,
  deleteIntegration,
} from "@repo/api-client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import IntegrationFieldMappingModal from "@/components/integration-field-mapping-modal";
import { colors, spacing, borderRadius } from "@/styles/design-system";

const STATUS_LABELS: Record<string, string> = {
  connected: "Bağlı",
  disconnected: "Bağlı Değil",
  error: "Hata",
};

const SYNC_STATUS_LABELS: Record<string, string> = {
  success: "Başarılı",
  error: "Hata",
  in_progress: "Devam Ediyor",
};

const JOB_TYPE_LABELS: Record<string, string> = {
  pull_invoices: "Fatura Çekme",
  pull_bank_transactions: "Banka İşlemi Çekme",
  push_invoices: "Fatura Gönderme",
  push_bank_transactions: "Banka İşlemi Gönderme",
};

const JOB_STATUS_LABELS: Record<string, string> = {
  pending: "Beklemede",
  in_progress: "Devam Ediyor",
  success: "Başarılı",
  failed: "Başarısız",
};

const LOG_LEVEL_LABELS: Record<string, string> = {
  info: "Bilgi",
  warning: "Uyarı",
  error: "Hata",
};

export default function IntegrationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const integrationId = params.id as string;
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);

  const { data: integrationData, isLoading } = useQuery({
    queryKey: ["integration", integrationId],
    queryFn: () => getIntegration(integrationId),
  });

  const { data: jobsData } = useQuery({
    queryKey: ["integration-jobs", integrationId],
    queryFn: () => listSyncJobs(integrationId),
    refetchInterval: (query) => {
      // Auto-refetch every 3 seconds if there are pending/in_progress jobs
      const jobs = query.state.data?.data?.data || [];
      const hasActiveJobs = jobs.some(
        (job: any) => job.status === "pending" || job.status === "in_progress"
      );
      return hasActiveJobs ? 3000 : false;
    },
  });

  const { data: logsData } = useQuery({
    queryKey: ["integration-logs", integrationId],
    queryFn: () => listSyncLogs(integrationId),
    refetchInterval: (query) => {
      // Auto-refetch every 5 seconds if there are active jobs
      const jobs = jobsData?.data?.data || [];
      const hasActiveJobs = jobs.some(
        (job: any) => job.status === "pending" || job.status === "in_progress"
      );
      return hasActiveJobs ? 5000 : false;
    },
  });

  const [syncNotification, setSyncNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const syncMutation = useMutation({
    mutationFn: (jobType: "pull_invoices" | "pull_bank_transactions" | "push_invoices" | "push_bank_transactions") =>
      triggerSync(integrationId, jobType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration", integrationId] });
      queryClient.invalidateQueries({ queryKey: ["integration-jobs", integrationId] });
      setSyncNotification({
        message: "Senkronizasyon başlatıldı. Durum tabloda güncellenecektir.",
        type: "success",
      });
      // Auto-hide notification after 5 seconds
      setTimeout(() => setSyncNotification(null), 5000);
      // Start polling immediately to show status updates
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["integration-jobs", integrationId] });
      }, 1000);
    },
    onError: (error: any) => {
      setSyncNotification({
        message: error?.message || "Senkronizasyon başlatılamadı.",
        type: "error",
      });
      setTimeout(() => setSyncNotification(null), 5000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteIntegration(integrationId),
    onSuccess: () => {
      router.push("/entegrasyonlar");
    },
  });

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

  if (!integrationData?.data) {
    return (
      <div style={{ padding: "40px", maxWidth: "1400px", margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
        <h2 style={{ color: colors.text.primary, marginBottom: "8px" }}>Entegrasyon bulunamadı</h2>
        <p style={{ color: colors.text.secondary, marginBottom: "24px" }}>
          Aradığınız entegrasyon mevcut değil veya silinmiş olabilir.
        </p>
        <Link
          href="/entegrasyonlar"
          style={{
            display: "inline-block",
            padding: "12px 24px",
            backgroundColor: colors.primary,
            color: "white",
            textDecoration: "none",
            borderRadius: "8px",
            fontWeight: "500",
          }}
        >
          İntegrasyonlara Dön
        </Link>
      </div>
    );
  }

  const integration = integrationData.data;
  const jobs = jobsData?.data.data || [];
  const logs = logsData?.data.data || [];
  const provider = integration.provider;

  const handleSync = (jobType: "pull_invoices" | "pull_bank_transactions" | "push_invoices" | "push_bank_transactions") => {
    syncMutation.mutate(jobType);
  };

  const handleDelete = () => {
    setDeleteModal(true);
  };

  // Add CSS for animations
  if (typeof document !== "undefined" && !document.getElementById("sync-animations-style")) {
    const style = document.createElement("style");
    style.id = "sync-animations-style";
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  return (
    <PageTransition>
      <div style={{ padding: "32px", maxWidth: "1400px", margin: "0 auto" }}>
      {syncNotification && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            padding: "16px 20px",
            backgroundColor: syncNotification.type === "success" ? colors.successLight : colors.dangerLight,
            color: syncNotification.type === "success" ? colors.successDark : colors.dangerDark,
            borderRadius: "8px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            zIndex: 1000,
            maxWidth: "400px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <span>{syncNotification.message}</span>
          <button
            onClick={() => setSyncNotification(null)}
            style={{
              background: "none",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              fontSize: "18px",
              padding: "0",
              lineHeight: "1",
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <Link
          href="/entegrasyonlar"
          style={{
            color: "#2563eb",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: "500",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "16px",
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = colors.primaryDark)}
          onMouseLeave={(e) => (e.currentTarget.style.color = colors.primary)}
        >
          ← İntegrasyonlara Dön
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ margin: "0 0 8px 0", fontSize: "32px", fontWeight: "700", color: colors.text.primary }}>
              {integration.displayName}
            </h1>
            <p style={{ margin: 0, color: colors.text.secondary, fontSize: "16px" }}>
              {provider.name} • {provider.type === "accounting" ? "Muhasebe Sistemi" : "Banka Bağlantısı"}
            </p>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
        {/* Provider Info Card */}
        <div
          style={{
            padding: "24px",
            backgroundColor: "white",
            border: `1px solid ${colors.border}`,
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", fontWeight: "600", color: colors.text.primary }}>
            Sağlayıcı Bilgileri
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <span style={{ color: colors.text.secondary, fontSize: "14px", display: "block", marginBottom: "4px" }}>Ad</span>
              <span style={{ color: colors.text.primary, fontSize: "16px", fontWeight: "500" }}>{provider.name}</span>
            </div>
            <div>
              <span style={{ color: colors.text.secondary, fontSize: "14px", display: "block", marginBottom: "4px" }}>Tür</span>
              <span style={{ color: colors.text.primary, fontSize: "16px", fontWeight: "500" }}>
                {provider.type === "accounting" ? "Muhasebe" : "Banka"}
              </span>
            </div>
            {provider.description && (
              <div>
                <span style={{ color: colors.text.secondary, fontSize: "14px", display: "block", marginBottom: "4px" }}>
                  Açıklama
                </span>
                <span style={{ color: colors.text.primary, fontSize: "16px" }}>{provider.description}</span>
              </div>
            )}
          </div>
        </div>

        {/* Status Card */}
        <div
          style={{
            padding: "24px",
            backgroundColor: "white",
            border: `1px solid ${colors.border}`,
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", fontWeight: "600", color: colors.text.primary }}>Durum</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <span style={{ color: colors.text.secondary, fontSize: "14px", display: "block", marginBottom: "4px" }}>
                Bağlantı Durumu
              </span>
              <span
                style={{
                  padding: "6px 12px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "500",
                  display: "inline-block",
                  backgroundColor:
                    integration.status === "connected"
                      ? "#d1fae5"
                      : integration.status === "error"
                      ? "#fee2e2"
                      : "#fef3c7",
                  color:
                    integration.status === "connected"
                      ? "#065f46"
                      : integration.status === "error"
                      ? "#991b1b"
                      : "#92400e",
                }}
              >
                {STATUS_LABELS[integration.status] || integration.status}
              </span>
            </div>
            <div>
              <span style={{ color: colors.text.secondary, fontSize: "14px", display: "block", marginBottom: "4px" }}>
                Son Senkron
              </span>
              <span style={{ color: colors.text.primary, fontSize: "16px", fontWeight: "500" }}>
                {integration.lastSyncAt
                  ? new Date(integration.lastSyncAt).toLocaleString("tr-TR")
                  : "Henüz senkronize edilmedi"}
              </span>
            </div>
            {integration.lastSyncStatus && (
              <div>
                <span style={{ color: colors.text.secondary, fontSize: "14px", display: "block", marginBottom: "4px" }}>
                  Son Senkron Durumu
                </span>
                <span
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "500",
                    display: "inline-block",
                    backgroundColor:
                      integration.lastSyncStatus === "success"
                        ? "#d1fae5"
                        : integration.lastSyncStatus === "error"
                        ? "#fee2e2"
                        : "#dbeafe",
                    color:
                      integration.lastSyncStatus === "success"
                        ? "#065f46"
                        : integration.lastSyncStatus === "error"
                        ? "#991b1b"
                        : "#1e40af",
                  }}
                >
                  {SYNC_STATUS_LABELS[integration.lastSyncStatus] || integration.lastSyncStatus}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions Section */}
      <div
        style={{
          marginBottom: "32px",
          padding: "24px",
          backgroundColor: "white",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <h2 style={{ margin: "0 0 16px 0", fontSize: "20px", fontWeight: "600", color: colors.text.primary }}>
          İşlemler
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
          {provider.type === "accounting" && (
            <>
              <button
                onClick={() => handleSync("pull_invoices")}
                disabled={syncMutation.isPending}
                style={{
                  padding: "12px 24px",
                  backgroundColor: syncMutation.isPending ? "#9ca3af" : "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: syncMutation.isPending ? "not-allowed" : "pointer",
                  fontSize: "16px",
                  fontWeight: "500",
                  transition: "all 0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
                onMouseEnter={(e) => {
                  if (!syncMutation.isPending) {
                    e.currentTarget.style.backgroundColor = "#1d4ed8";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!syncMutation.isPending) {
                    e.currentTarget.style.backgroundColor = "#2563eb";
                    e.currentTarget.style.transform = "translateY(0)";
                  }
                }}
              >
                {syncMutation.isPending ? "⏳ Başlatılıyor..." : "⬇️ Faturaları Çek"}
              </button>
              <button
                onClick={() => handleSync("push_invoices")}
                disabled={syncMutation.isPending}
                style={{
                  padding: "12px 24px",
                  backgroundColor: syncMutation.isPending ? "#9ca3af" : "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: syncMutation.isPending ? "not-allowed" : "pointer",
                  fontSize: "16px",
                  fontWeight: "500",
                  transition: "all 0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
                onMouseEnter={(e) => {
                  if (!syncMutation.isPending) {
                    e.currentTarget.style.backgroundColor = "#059669";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!syncMutation.isPending) {
                    e.currentTarget.style.backgroundColor = "#10b981";
                    e.currentTarget.style.transform = "translateY(0)";
                  }
                }}
              >
                {syncMutation.isPending ? "⏳ Başlatılıyor..." : "⬆️ Faturaları Gönder"}
              </button>
            </>
          )}
          {provider.type === "bank" && (
            <>
              <button
                onClick={() => handleSync("pull_bank_transactions")}
                disabled={syncMutation.isPending}
                style={{
                  padding: "12px 24px",
                  backgroundColor: syncMutation.isPending ? "#9ca3af" : "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: syncMutation.isPending ? "not-allowed" : "pointer",
                  fontSize: "16px",
                  fontWeight: "500",
                  transition: "all 0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
                onMouseEnter={(e) => {
                  if (!syncMutation.isPending) {
                    e.currentTarget.style.backgroundColor = "#1d4ed8";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!syncMutation.isPending) {
                    e.currentTarget.style.backgroundColor = "#2563eb";
                    e.currentTarget.style.transform = "translateY(0)";
                  }
                }}
              >
                {syncMutation.isPending ? "⏳ Başlatılıyor..." : "⬇️ Hesap Hareketlerini Çek"}
              </button>
              <button
                onClick={() => handleSync("push_bank_transactions")}
                disabled={syncMutation.isPending}
                style={{
                  padding: "12px 24px",
                  backgroundColor: syncMutation.isPending ? "#9ca3af" : "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: syncMutation.isPending ? "not-allowed" : "pointer",
                  fontSize: "16px",
                  fontWeight: "500",
                  transition: "all 0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
                onMouseEnter={(e) => {
                  if (!syncMutation.isPending) {
                    e.currentTarget.style.backgroundColor = "#059669";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!syncMutation.isPending) {
                    e.currentTarget.style.backgroundColor = "#10b981";
                    e.currentTarget.style.transform = "translateY(0)";
                  }
                }}
              >
                {syncMutation.isPending ? "⏳ Başlatılıyor..." : "⬆️ Hesap Hareketlerini Gönder"}
              </button>
            </>
          )}
          <Link
            href={`/entegrasyonlar/${integrationId}/edit`}
            style={{
              padding: "12px 24px",
              backgroundColor: "#10b981",
              color: "white",
              textDecoration: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "500",
              display: "inline-block",
              transition: "all 0.2s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#059669";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#10b981";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            ✏️ Düzenle
          </Link>
          <button
            onClick={() => setIsMappingModalOpen(true)}
            style={{
              padding: "12px 24px",
              backgroundColor: "#06b6d4",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "500",
              transition: "all 0.2s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#0891b2";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#06b6d4";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            🔗 Alan Eşleştirme
          </button>
          <button
            onClick={handleDelete}
            style={{
              padding: "12px 24px",
              backgroundColor: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "500",
              transition: "all 0.2s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#dc2626";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#ef4444";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            ✕ Bağlantıyı Kes
          </button>
        </div>
      </div>

      {/* Sync History */}
      <div
        style={{
          marginBottom: "32px",
          padding: "24px",
          backgroundColor: "white",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <h2 style={{ margin: "0 0 20px 0", fontSize: "20px", fontWeight: "600", color: "#111827" }}>
          Senkronizasyon Geçmişi
        </h2>
        {jobs.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: colors.text.secondary,
              backgroundColor: colors.gray[50],
              borderRadius: "8px",
            }}
          >
            <p style={{ margin: 0 }}>Henüz senkronizasyon işi bulunmamaktadır.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${colors.border}` }}>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: "600", color: colors.text.secondary }}>
                    İşlem Tipi
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: "600", color: "#6b7280" }}>
                    Durum
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: "600", color: "#6b7280" }}>
                    Başlangıç
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: "600", color: "#6b7280" }}>
                    Bitiş
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: "600", color: "#6b7280" }}>
                    Detay / Mesaj
                  </th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job: any) => (
                  <tr
                    key={job.id}
                    style={{
                      borderBottom: `1px solid ${colors.border}`,
                      transition: "background-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = colors.gray[50];
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <td style={{ padding: "12px", color: colors.text.primary, fontSize: "14px" }}>
                      {JOB_TYPE_LABELS[job.jobType] || job.jobType}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          padding: "6px 12px",
                          borderRadius: "8px",
                          fontSize: "13px",
                          fontWeight: "500",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          backgroundColor:
                            job.status === "success"
                              ? colors.successLight
                              : job.status === "failed"
                              ? colors.dangerLight
                              : job.status === "in_progress"
                              ? colors.infoLight
                              : colors.warningLight,
                          color:
                            job.status === "success"
                              ? colors.successDark
                              : job.status === "failed"
                              ? colors.dangerDark
                              : job.status === "in_progress"
                              ? colors.primaryDark
                              : colors.warning,
                        }}
                      >
                        {(job.status === "pending" || job.status === "in_progress") && (
                          <span
                            style={{
                              display: "inline-block",
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              backgroundColor:
                                job.status === "in_progress" ? colors.primaryDark : colors.warning,
                              animation: "pulse 1.5s ease-in-out infinite",
                            }}
                          />
                        )}
                        {JOB_STATUS_LABELS[job.status] || job.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px", color: colors.text.secondary, fontSize: "14px" }}>
                      {job.startedAt ? new Date(job.startedAt).toLocaleString("tr-TR") : "-"}
                    </td>
                    <td style={{ padding: "12px", color: colors.text.secondary, fontSize: "14px" }}>
                      {job.finishedAt ? new Date(job.finishedAt).toLocaleString("tr-TR") : "-"}
                    </td>
                    <td style={{ padding: "12px" }}>
                      {job.errorMessage ? (
                        <span style={{ color: "#ef4444", fontSize: "14px" }}>{job.errorMessage}</span>
                      ) : (
                        <span style={{ color: "#9ca3af" }}>-</span>
                      )}
                    </td>
                </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Logs Section */}
        <div
          style={{
            padding: "24px",
            backgroundColor: "white",
            border: `1px solid ${colors.border}`,
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <h2 style={{ margin: "0 0 20px 0", fontSize: "20px", fontWeight: "600", color: "#111827" }}>
            Günlükler (Log)
          </h2>
          {logs.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px",
                color: colors.text.secondary,
                backgroundColor: colors.gray[50],
                borderRadius: "8px",
              }}
            >
              <p style={{ margin: 0 }}>Henüz günlük kaydı bulunmamaktadır.</p>
              {jobs.some((job: any) => job.status === "pending" || job.status === "in_progress") && (
                <p style={{ fontSize: "14px", color: colors.text.secondary, marginTop: "8px" }}>
                  <em>Günlükler, senkronizasyon işlemleri tamamlandığında görünecektir.</em>
                </p>
              )}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                    <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: "600", color: "#6b7280" }}>
                      Seviye
                    </th>
                    <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: "600", color: "#6b7280" }}>
                      Mesaj
                    </th>
                    <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: "600", color: "#6b7280" }}>
                      Tarih
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log: any) => (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: `1px solid ${colors.border}`,
                        transition: "background-color 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.gray[50];
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <td style={{ padding: "12px" }}>
                        <span
                          style={{
                            padding: "6px 12px",
                            borderRadius: "8px",
                            fontSize: "13px",
                            fontWeight: "500",
                            display: "inline-block",
                            backgroundColor:
                              log.level === "error"
                                ? "#fee2e2"
                                : log.level === "warning"
                                ? "#fef3c7"
                                : "#dbeafe",
                            color:
                              log.level === "error"
                                ? "#991b1b"
                                : log.level === "warning"
                                ? "#92400e"
                                : "#1e40af",
                          }}
                        >
                          {LOG_LEVEL_LABELS[log.level] || log.level}
                        </span>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <div style={{ color: "#111827", fontSize: "14px", marginBottom: log.context ? "4px" : "0" }}>
                          {log.message}
                        </div>
                        {log.context && Object.keys(log.context).length > 0 && (
                          <details style={{ marginTop: "4px" }}>
                            <summary
                              style={{
                                cursor: "pointer",
                                color: "#2563eb",
                                fontSize: "13px",
                                fontWeight: "500",
                              }}
                            >
                              Detaylar
                            </summary>
                            <pre
                              style={{
                                marginTop: "8px",
                                padding: "12px",
                                backgroundColor: "#f9fafb",
                                borderRadius: "6px",
                                overflow: "auto",
                                maxHeight: "200px",
                                fontSize: "12px",
                                border: `1px solid ${colors.border}`,
                              }}
                            >
                              {JSON.stringify(log.context, null, 2)}
                            </pre>
                          </details>
                        )}
                      </td>
                      <td style={{ padding: "12px", color: colors.text.secondary, fontSize: "14px" }}>
                        {new Date(log.createdAt).toLocaleString("tr-TR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      {isMappingModalOpen && integration.tenantId && (
        <IntegrationFieldMappingModal
          isOpen={isMappingModalOpen}
          onClose={() => setIsMappingModalOpen(false)}
          integrationId={integrationId}
          tenantId={integration.tenantId}
        />
      )}

      <Modal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        title="Entegrasyonu Sil"
        size="sm"
      >
        <div style={{ marginBottom: spacing.lg }}>
          <p>Bu entegrasyonu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.</p>
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




