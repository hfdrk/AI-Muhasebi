"use client";

import { useState } from "react";
import { useRiskAlerts, useUpdateAlertStatus } from "@/hooks/use-risk";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { risk as riskI18n, common as commonI18n } from "@repo/i18n";
import Link from "next/link";

async function getDailyRiskSummary() {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  const response = await fetch("/api/v1/ai/summaries/daily-risk", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    credentials: "include",
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: "Bir hata oluştu." } }));
    throw new Error(error.error?.message || "Şu anda AI servisine ulaşılamıyor. Lütfen daha sonra tekrar deneyin.");
  }
  return response.json();
}

const SEVERITY_COLORS: Record<string, string> = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#dc2626",
  critical: "#991b1b",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Açık",
  in_progress: "İşlemde",
  closed: "Kapatıldı",
  ignored: "Yok Sayıldı",
};

const SEVERITY_LABELS: Record<string, string> = {
  low: "Düşük",
  medium: "Orta",
  high: "Yüksek",
  critical: "Kritik",
};

const TYPE_LABELS: Record<string, string> = {
  RISK_THRESHOLD_EXCEEDED: "Risk Eşiği Aşıldı",
  ANOMALY_DETECTED: "Anomali Tespit Edildi",
};

export default function RiskAlertsPage() {
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading } = useRiskAlerts({
    severity: severityFilter !== "all" ? severityFilter : undefined,
    status: statusFilter !== "all" ? (statusFilter as any) : undefined,
    page,
    pageSize,
  });

  const updateStatusMutation = useUpdateAlertStatus();
  const queryClient = useQueryClient();

  const alerts = data?.data.data || [];
  const pagination = data?.data || { total: 0, page: 1, pageSize: 20, totalPages: 1 };

  const handleStatusUpdate = (alertId: string, newStatus: string) => {
    if (confirm("Uyarı durumunu güncellemek istediğinize emin misiniz?")) {
      updateStatusMutation.mutate(
        { alertId, status: newStatus as any },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["risk-alerts"] });
          },
        }
      );
    }
  };

  const dailyRiskMutation = useMutation({
    mutationFn: getDailyRiskSummary,
    onSuccess: (data) => {
      alert(`Bugünün Risk Özeti:\n\n${data.data.summary}`);
    },
    onError: (error: any) => {
      alert(error.message || "Şu anda AI servisine ulaşılamıyor. Lütfen daha sonra tekrar deneyin.");
    },
  });

  return (
    <div style={{ padding: "40px" }}>
      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "10px" }}>Risk Uyarıları</h1>
        <p style={{ color: "#666" }}>Tüm risk uyarılarını görüntüleyin ve yönetin</p>
      </div>

      {/* AI Summary Panel */}
      <div
        style={{
          marginBottom: "20px",
          padding: "20px",
          backgroundColor: "#f0f9ff",
          borderRadius: "8px",
          border: "1px solid #bae6fd",
        }}
      >
        <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "12px", color: "#0369a1" }}>
          AI Önerileri
        </h3>
        <button
          onClick={() => dailyRiskMutation.mutate()}
          disabled={dailyRiskMutation.isPending}
          style={{
            padding: "10px 20px",
            backgroundColor: "#007AFF",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: dailyRiskMutation.isPending ? "not-allowed" : "pointer",
            opacity: dailyRiskMutation.isPending ? 0.6 : 1,
            fontWeight: 500,
          }}
        >
          {dailyRiskMutation.isPending ? "Oluşturuluyor..." : "Bugünün Risk Özetini Oluştur"}
        </button>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: "15px",
          marginBottom: "20px",
          padding: "15px",
          backgroundColor: "#fff",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          border: "1px solid #e0e0e0",
        }}
      >
        <div>
          <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", color: "#666" }}>
            Şiddet
          </label>
          <select
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
            }}
          >
            <option value="all">Tümü</option>
            <option value="low">Düşük</option>
            <option value="medium">Orta</option>
            <option value="high">Yüksek</option>
            <option value="critical">Kritik</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", color: "#666" }}>
            Durum
          </label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
            }}
          >
            <option value="all">Tümü</option>
            <option value="open">Açık</option>
            <option value="in_progress">İşlemde</option>
            <option value="closed">Kapatıldı</option>
            <option value="ignored">Yok Sayıldı</option>
          </select>
        </div>
      </div>

      {/* Alerts Table */}
      {isLoading ? (
        <div style={{ padding: "40px", textAlign: "center" }}>
          <p>{commonI18n.labels.loading}</p>
        </div>
      ) : alerts.length === 0 ? (
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            backgroundColor: "#fff",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            border: "1px solid #e0e0e0",
          }}
        >
          <p style={{ color: "#666" }}>{riskI18n.alerts.list.noAlerts}</p>
        </div>
      ) : (
        <>
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              border: "1px solid #e0e0e0",
              overflow: "hidden",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: "600" }}>
                    Tip
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: "600" }}>
                    Başlık
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: "600" }}>
                    Şiddet
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: "600" }}>
                    Durum
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: "600" }}>
                    Müşteri
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: "600" }}>
                    Tarih
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: "600" }}>
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={alert.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "12px", fontSize: "14px" }}>{TYPE_LABELS[alert.type] || alert.type}</td>
                    <td style={{ padding: "12px", fontSize: "14px" }}>{alert.title}</td>
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: "500",
                          backgroundColor: `${SEVERITY_COLORS[alert.severity]}20`,
                          color: SEVERITY_COLORS[alert.severity],
                        }}
                      >
                        {SEVERITY_LABELS[alert.severity] || alert.severity}
                      </span>
                    </td>
                    <td style={{ padding: "12px", fontSize: "14px" }}>
                      {STATUS_LABELS[alert.status] || alert.status}
                    </td>
                    <td style={{ padding: "12px", fontSize: "14px" }}>
                      {alert.clientCompanyId ? (
                        <Link
                          href={`/musteriler/${alert.clientCompanyId}`}
                          style={{ color: "#2563eb", textDecoration: "none" }}
                        >
                          Müşteri Detayı
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td style={{ padding: "12px", fontSize: "14px", color: "#666" }}>
                      {new Date(alert.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ display: "flex", gap: "8px" }}>
                        {alert.status === "open" && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(alert.id, "in_progress")}
                              style={{
                                padding: "4px 8px",
                                fontSize: "12px",
                                backgroundColor: "#2563eb",
                                color: "#fff",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                              }}
                            >
                              İşleme Al
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(alert.id, "closed")}
                              style={{
                                padding: "4px 8px",
                                fontSize: "12px",
                                backgroundColor: "#10b981",
                                color: "#fff",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                              }}
                            >
                              Kapat
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(alert.id, "ignored")}
                              style={{
                                padding: "4px 8px",
                                fontSize: "12px",
                                backgroundColor: "#6b7280",
                                color: "#fff",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                              }}
                            >
                              Yok Say
                            </button>
                          </>
                        )}
                        {alert.status === "in_progress" && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(alert.id, "closed")}
                              style={{
                                padding: "4px 8px",
                                fontSize: "12px",
                                backgroundColor: "#10b981",
                                color: "#fff",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                              }}
                            >
                              Kapat
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(alert.id, "open")}
                              style={{
                                padding: "4px 8px",
                                fontSize: "12px",
                                backgroundColor: "#6b7280",
                                color: "#fff",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                              }}
                            >
                              Yeniden Aç
                            </button>
                          </>
                        )}
                        {(alert.status === "closed" || alert.status === "ignored") && (
                          <button
                            onClick={() => handleStatusUpdate(alert.id, "open")}
                            style={{
                              padding: "4px 8px",
                              fontSize: "12px",
                              backgroundColor: "#2563eb",
                              color: "#fff",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            Yeniden Aç
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "20px" }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: "8px 16px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  backgroundColor: page === 1 ? "#f3f4f6" : "#fff",
                  cursor: page === 1 ? "not-allowed" : "pointer",
                }}
              >
                Önceki
              </button>
              <span style={{ padding: "8px 16px", alignSelf: "center" }}>
                Sayfa {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                style={{
                  padding: "8px 16px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  backgroundColor: page === pagination.totalPages ? "#f3f4f6" : "#fff",
                  cursor: page === pagination.totalPages ? "not-allowed" : "pointer",
                }}
              >
                Sonraki
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

