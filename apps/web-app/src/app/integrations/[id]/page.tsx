"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getIntegration,
  listSyncJobs,
  listSyncLogs,
  triggerSync,
  deleteIntegration,
} from "@repo/api-client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "@/lib/toast";
import { colors } from "@/styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";

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
  const { themeColors } = useTheme();
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const integrationId = params.id as string;

  const { data: integrationData, isLoading } = useQuery({
    queryKey: ["integration", integrationId],
    queryFn: () => getIntegration(integrationId),
  });

  const { data: jobsData } = useQuery({
    queryKey: ["integration-jobs", integrationId],
    queryFn: () => listSyncJobs(integrationId),
  });

  const { data: logsData } = useQuery({
    queryKey: ["integration-logs", integrationId],
    queryFn: () => listSyncLogs(integrationId),
  });

  const syncMutation = useMutation({
    mutationFn: (jobType: "pull_invoices" | "pull_bank_transactions") =>
      triggerSync(integrationId, jobType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration", integrationId] });
      queryClient.invalidateQueries({ queryKey: ["integration-jobs", integrationId] });
      toast.success("Senkronizasyon başlatıldı.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteIntegration(integrationId),
    onSuccess: () => {
      router.push("/entegrasyonlar");
    },
  });

  if (isLoading) {
    return <div style={{ padding: "40px" }}>Yükleniyor...</div>;
  }

  if (!integrationData?.data) {
    return <div style={{ padding: "40px" }}>Entegrasyon bulunamadı.</div>;
  }

  const integration = integrationData.data;
  const jobs = jobsData?.data.data || [];
  const logs = logsData?.data.data || [];
  const provider = integration.provider;

  const handleSync = (jobType: "pull_invoices" | "pull_bank_transactions") => {
    syncMutation.mutate(jobType);
  };

  const handleDelete = () => {
    if (confirm("Bu entegrasyonu silmek istediğinize emin misiniz?")) {
      deleteMutation.mutate();
    }
  };

  return (
    <div style={{ padding: "40px" }}>
      <div style={{ marginBottom: "24px" }}>
        <Link
          href="/integrations"
          style={{ color: colors.primary, textDecoration: "none", marginBottom: "16px", display: "inline-block" }}
        >
          ← İntegrasyonlara Dön
        </Link>
        <h1 style={{ marginTop: "16px" }}>{integration.displayName}</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
        <div style={{ padding: "16px", border: `1px solid ${themeColors.border}`, borderRadius: "4px" }}>
          <h3 style={{ marginTop: 0 }}>Sağlayıcı Bilgileri</h3>
          <p>
            <strong>Ad:</strong> {provider.name}
          </p>
          <p>
            <strong>Tür:</strong> {provider.type === "accounting" ? "Muhasebe" : "Banka"}
          </p>
          {provider.description && (
            <p>
              <strong>Açıklama:</strong> {provider.description}
            </p>
          )}
        </div>

        <div style={{ padding: "16px", border: `1px solid ${themeColors.border}`, borderRadius: "4px" }}>
          <h3 style={{ marginTop: 0 }}>Durum</h3>
          <p>
            <strong>Bağlantı Durumu:</strong>{" "}
            <span
              style={{
                padding: "4px 8px",
                borderRadius: "4px",
                backgroundColor:
                  integration.status === "connected"
                    ? colors.successLight
                    : integration.status === "error"
                    ? colors.dangerLight
                    : colors.warningLight,
                color:
                  integration.status === "connected"
                    ? colors.successDark
                    : integration.status === "error"
                    ? colors.dangerDark
                    : colors.warningDark,
                fontSize: "14px",
              }}
            >
              {STATUS_LABELS[integration.status] || integration.status}
            </span>
          </p>
          <p>
            <strong>Son Senkron:</strong>{" "}
            {integration.lastSyncAt
              ? new Date(integration.lastSyncAt).toLocaleString("tr-TR")
              : "Henüz senkronize edilmedi"}
          </p>
          <p>
            <strong>Son Senkron Durumu:</strong>{" "}
            {integration.lastSyncStatus ? (
              <span
                style={{
                  padding: "4px 8px",
                  borderRadius: "4px",
                  backgroundColor:
                    integration.lastSyncStatus === "success"
                      ? colors.successLight
                      : integration.lastSyncStatus === "error"
                      ? colors.dangerLight
                      : colors.infoLight,
                  color:
                    integration.lastSyncStatus === "success"
                      ? colors.successDark
                      : integration.lastSyncStatus === "error"
                      ? colors.dangerDark
                      : colors.primaryDark,
                  fontSize: "14px",
                }}
              >
                {SYNC_STATUS_LABELS[integration.lastSyncStatus] || integration.lastSyncStatus}
              </span>
            ) : (
              "-"
            )}
          </p>
        </div>
      </div>

      <div style={{ marginBottom: "32px" }}>
        <h2>Manuel Senkronizasyon</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          {provider.type === "accounting" && (
            <button
              onClick={() => handleSync("pull_invoices")}
              style={{
                padding: "8px 16px",
                backgroundColor: colors.primary,
                color: colors.white,
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Faturaları Senkronize Et
            </button>
          )}
          {provider.type === "bank" && (
            <button
              onClick={() => handleSync("pull_bank_transactions")}
              style={{
                padding: "8px 16px",
                backgroundColor: colors.primary,
                color: colors.white,
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Hesap Hareketlerini Senkronize Et
            </button>
          )}
          <Link
            href={`/integrations/${integrationId}/edit`}
            style={{
              padding: "8px 16px",
              backgroundColor: colors.success,
              color: colors.white,
              textDecoration: "none",
              borderRadius: "4px",
              display: "inline-block",
            }}
          >
            Düzenle
          </Link>
          <button
            onClick={handleDelete}
            style={{
              padding: "8px 16px",
              backgroundColor: colors.danger,
              color: colors.white,
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Bağlantıyı Kes
          </button>
        </div>
      </div>

      <div style={{ marginBottom: "32px" }}>
        <h2>Senkronizasyon Geçmişi</h2>
        {jobs.length === 0 ? (
          <p>Henüz senkronizasyon işi bulunmamaktadır.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${themeColors.border}` }}>
                <th style={{ padding: "12px", textAlign: "left" }}>İşlem Tipi</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Durum</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Başlangıç</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Bitiş</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Detay / Mesaj</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job: any) => (
                <tr key={job.id} style={{ borderBottom: `1px solid ${themeColors.gray[200]}` }}>
                  <td style={{ padding: "12px" }}>{JOB_TYPE_LABELS[job.jobType] || job.jobType}</td>
                  <td style={{ padding: "12px" }}>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
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
                            : colors.warningDark,
                        fontSize: "12px",
                      }}
                    >
                      {JOB_STATUS_LABELS[job.status] || job.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px" }}>
                    {job.startedAt ? new Date(job.startedAt).toLocaleString("tr-TR") : "-"}
                  </td>
                  <td style={{ padding: "12px" }}>
                    {job.finishedAt ? new Date(job.finishedAt).toLocaleString("tr-TR") : "-"}
                  </td>
                  <td style={{ padding: "12px" }}>
                    {job.errorMessage ? (
                      <span style={{ color: colors.danger }}>{job.errorMessage}</span>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div>
        <h2>Günlükler (Log)</h2>
        {logs.length === 0 ? (
          <p>Henüz günlük kaydı bulunmamaktadır.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${themeColors.border}` }}>
                <th style={{ padding: "12px", textAlign: "left" }}>Seviye</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Mesaj</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Tarih</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => (
                <tr key={log.id} style={{ borderBottom: `1px solid ${themeColors.gray[200]}` }}>
                  <td style={{ padding: "12px" }}>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        backgroundColor:
                          log.level === "error"
                            ? colors.dangerLight
                            : log.level === "warning"
                            ? colors.warningLight
                            : colors.infoLight,
                        color:
                          log.level === "error"
                            ? colors.dangerDark
                            : log.level === "warning"
                            ? colors.warningDark
                            : colors.primaryDark,
                        fontSize: "12px",
                      }}
                    >
                      {LOG_LEVEL_LABELS[log.level] || log.level}
                    </span>
                  </td>
                  <td style={{ padding: "12px" }}>{log.message}</td>
                  <td style={{ padding: "12px" }}>
                    {new Date(log.createdAt).toLocaleString("tr-TR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}




