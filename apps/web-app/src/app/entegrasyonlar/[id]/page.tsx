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
      alert("Senkronizasyon başlatıldı.");
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
          href="/entegrasyonlar"
          style={{ color: "#0066cc", textDecoration: "none", marginBottom: "16px", display: "inline-block" }}
        >
          ← İntegrasyonlara Dön
        </Link>
        <h1 style={{ marginTop: "16px" }}>{integration.displayName}</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
        <div style={{ padding: "16px", border: "1px solid #ddd", borderRadius: "4px" }}>
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

        <div style={{ padding: "16px", border: "1px solid #ddd", borderRadius: "4px" }}>
          <h3 style={{ marginTop: 0 }}>Durum</h3>
          <p>
            <strong>Bağlantı Durumu:</strong>{" "}
            <span
              style={{
                padding: "4px 8px",
                borderRadius: "4px",
                backgroundColor:
                  integration.status === "connected"
                    ? "#d4edda"
                    : integration.status === "error"
                    ? "#f8d7da"
                    : "#fff3cd",
                color:
                  integration.status === "connected"
                    ? "#155724"
                    : integration.status === "error"
                    ? "#721c24"
                    : "#856404",
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
                      ? "#d4edda"
                      : integration.lastSyncStatus === "error"
                      ? "#f8d7da"
                      : "#d1ecf1",
                  color:
                    integration.lastSyncStatus === "success"
                      ? "#155724"
                      : integration.lastSyncStatus === "error"
                      ? "#721c24"
                      : "#0c5460",
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
                backgroundColor: "#0066cc",
                color: "white",
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
                backgroundColor: "#0066cc",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Hesap Hareketlerini Senkronize Et
            </button>
          )}
          <Link
            href={`/entegrasyonlar/${integrationId}/edit`}
            style={{
              padding: "8px 16px",
              backgroundColor: "#28a745",
              color: "white",
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
              backgroundColor: "#dc3545",
              color: "white",
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
              <tr style={{ borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: "12px", textAlign: "left" }}>İşlem Tipi</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Durum</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Başlangıç</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Bitiş</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Detay / Mesaj</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job: any) => (
                <tr key={job.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "12px" }}>{JOB_TYPE_LABELS[job.jobType] || job.jobType}</td>
                  <td style={{ padding: "12px" }}>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        backgroundColor:
                          job.status === "success"
                            ? "#d4edda"
                            : job.status === "failed"
                            ? "#f8d7da"
                            : job.status === "in_progress"
                            ? "#d1ecf1"
                            : "#fff3cd",
                        color:
                          job.status === "success"
                            ? "#155724"
                            : job.status === "failed"
                            ? "#721c24"
                            : job.status === "in_progress"
                            ? "#0c5460"
                            : "#856404",
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
                      <span style={{ color: "#dc3545" }}>{job.errorMessage}</span>
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
              <tr style={{ borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: "12px", textAlign: "left" }}>Seviye</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Mesaj</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Tarih</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => (
                <tr key={log.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "12px" }}>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        backgroundColor:
                          log.level === "error"
                            ? "#f8d7da"
                            : log.level === "warning"
                            ? "#fff3cd"
                            : "#d1ecf1",
                        color:
                          log.level === "error"
                            ? "#721c24"
                            : log.level === "warning"
                            ? "#856404"
                            : "#0c5460",
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




