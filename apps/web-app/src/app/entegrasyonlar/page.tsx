"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listIntegrations,
  listProviders,
  deleteIntegration,
  triggerSync,
  type TenantIntegration,
} from "@repo/api-client";
import { useRouter } from "next/navigation";
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

export default function IntegrationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"accounting" | "bank">("accounting");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const { data: accountingData, isLoading: isLoadingAccounting, error: accountingError } = useQuery({
    queryKey: ["integrations", "accounting"],
    queryFn: () => {
      console.log("[Integrations Page] Fetching accounting integrations...");
      return listIntegrations({ type: "accounting" });
    },
  });

  const { data: bankData, isLoading: isLoadingBank, error: bankError } = useQuery({
    queryKey: ["integrations", "bank"],
    queryFn: () => {
      console.log("[Integrations Page] Fetching bank integrations...");
      return listIntegrations({ type: "bank" });
    },
  });

  // Log errors
  if (accountingError) {
    console.error("[Integrations Page] Accounting query error:", accountingError);
  }
  if (bankError) {
    console.error("[Integrations Page] Bank query error:", bankError);
  }

  const deleteMutation = useMutation({
    mutationFn: deleteIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      setNotification({ message: "Entegrasyon başarıyla silindi.", type: "success" });
      setTimeout(() => setNotification(null), 3000);
    },
    onError: () => {
      setNotification({ message: "Entegrasyon silinirken bir hata oluştu.", type: "error" });
      setTimeout(() => setNotification(null), 3000);
    },
  });

  const syncMutation = useMutation({
    mutationFn: ({ id, jobType }: { id: string; jobType: "pull_invoices" | "pull_bank_transactions" }) =>
      triggerSync(id, jobType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      setNotification({ message: "Senkronizasyon başlatıldı.", type: "success" });
      setTimeout(() => setNotification(null), 3000);
    },
    onError: () => {
      setNotification({ message: "Senkronizasyon başlatılamadı.", type: "error" });
      setTimeout(() => setNotification(null), 3000);
    },
  });

  const currentData = activeTab === "accounting" ? accountingData : bankData;
  const isLoading = activeTab === "accounting" ? isLoadingAccounting : isLoadingBank;
  
  // Handle nested response structure: { data: { data: [...], total, ... } }
  const integrations = currentData?.data?.data || [];

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`"${name}" entegrasyonunu silmek istediğinize emin misiniz?`)) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleSync = async (integration: TenantIntegration) => {
    const jobType = integration.providerId.includes("ACCOUNTING")
      ? "pull_invoices"
      : "pull_bank_transactions";
    await syncMutation.mutateAsync({ id: integration.id, jobType });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return { bg: "#d1fae5", text: "#065f46", border: "#10b981" };
      case "error":
        return { bg: "#fee2e2", text: "#991b1b", border: "#ef4444" };
      default:
        return { bg: "#fef3c7", text: "#92400e", border: "#f59e0b" };
    }
  };

  const getSyncStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return { bg: "#d1fae5", text: "#065f46" };
      case "error":
        return { bg: "#fee2e2", text: "#991b1b" };
      case "in_progress":
        return { bg: "#dbeafe", text: "#1e40af" };
      default:
        return { bg: "#f3f4f6", text: "#6b7280" };
    }
  };

  return (
    <div style={{ padding: "32px", maxWidth: "1400px", margin: "0 auto" }}>
      {notification && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            padding: "16px 20px",
            backgroundColor: notification.type === "success" ? "#d1fae5" : "#fee2e2",
            color: notification.type === "success" ? "#065f46" : "#991b1b",
            borderRadius: "8px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            minWidth: "300px",
          }}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            style={{
              background: "none",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              fontSize: "20px",
              padding: "0",
              lineHeight: "1",
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "32px", fontWeight: "700", color: "#111827" }}>
            İntegrasyonlar
          </h1>
          <p style={{ margin: "8px 0 0 0", color: "#6b7280", fontSize: "16px" }}>
            Muhasebe sistemleri ve banka bağlantılarını yönetin
          </p>
        </div>
        <Link
          href="/entegrasyonlar/new"
          style={{
            padding: "12px 24px",
            backgroundColor: "#2563eb",
            color: "white",
            textDecoration: "none",
            borderRadius: "8px",
            fontWeight: "500",
            fontSize: "16px",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#1d4ed8";
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#2563eb";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
          }}
        >
          <span>+</span> Yeni İntegrasyon
        </Link>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "32px",
          borderBottom: "2px solid #e5e7eb",
          paddingBottom: "0",
        }}
      >
        <button
          onClick={() => setActiveTab("accounting")}
          style={{
            padding: "12px 24px",
            border: "none",
            background: "none",
            borderBottom: activeTab === "accounting" ? "3px solid #2563eb" : "3px solid transparent",
            color: activeTab === "accounting" ? "#2563eb" : "#6b7280",
            cursor: "pointer",
            fontWeight: activeTab === "accounting" ? "600" : "400",
            fontSize: "16px",
            transition: "all 0.2s",
            marginBottom: "-2px",
          }}
        >
          Muhasebe Sistemleri
        </button>
        <button
          onClick={() => setActiveTab("bank")}
          style={{
            padding: "12px 24px",
            border: "none",
            background: "none",
            borderBottom: activeTab === "bank" ? "3px solid #2563eb" : "3px solid transparent",
            color: activeTab === "bank" ? "#2563eb" : "#6b7280",
            cursor: "pointer",
            fontWeight: activeTab === "bank" ? "600" : "400",
            fontSize: "16px",
            transition: "all 0.2s",
            marginBottom: "-2px",
          }}
        >
          Banka Bağlantıları
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                backgroundColor: "#f9fafb",
                borderRadius: "12px",
                padding: "24px",
                border: "1px solid #e5e7eb",
                minHeight: "200px",
                animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
              }}
            />
          ))}
        </div>
      ) : integrations.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "80px 40px",
            backgroundColor: "#f9fafb",
            borderRadius: "12px",
            border: "2px dashed #d1d5db",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔌</div>
          <h3 style={{ margin: "0 0 8px 0", fontSize: "20px", fontWeight: "600", color: "#111827" }}>
            Henüz entegrasyon bulunmamaktadır
          </h3>
          <p style={{ margin: "0 0 24px 0", color: "#6b7280", fontSize: "16px" }}>
            İlk entegrasyonunuzu ekleyerek başlayın
          </p>
          <Link
            href="/entegrasyonlar/new"
            style={{
              display: "inline-block",
              padding: "12px 24px",
              backgroundColor: "#2563eb",
              color: "white",
              textDecoration: "none",
              borderRadius: "8px",
              fontWeight: "500",
              fontSize: "16px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#1d4ed8";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#2563eb";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            İlk Entegrasyonu Ekle
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>
          {integrations.map((integration: any) => {
            const statusColors = getStatusColor(integration.status);
            const syncStatusColors = getSyncStatusColor(integration.lastSyncStatus || "");

            return (
              <div
                key={integration.id}
                style={{
                  backgroundColor: "white",
                  borderRadius: "12px",
                  padding: "24px",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  transition: "all 0.2s",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {/* Header */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <Link
                      href={`/entegrasyonlar/${integration.id}`}
                      style={{
                        color: "#111827",
                        textDecoration: "none",
                        fontSize: "20px",
                        fontWeight: "600",
                        transition: "color 0.2s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#2563eb")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#111827")}
                    >
                      {integration.displayName}
                    </Link>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "500",
                        backgroundColor: statusColors.bg,
                        color: statusColors.text,
                        border: `1px solid ${statusColors.border}`,
                      }}
                    >
                      {STATUS_LABELS[integration.status] || integration.status}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
                    {integration.provider?.name || "Bilinmeyen Sağlayıcı"}
                  </p>
                </div>

                {/* Status Info */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#6b7280", fontSize: "14px" }}>Son Senkron:</span>
                    <span style={{ color: "#111827", fontSize: "14px", fontWeight: "500" }}>
                      {integration.lastSyncAt
                        ? new Date(integration.lastSyncAt).toLocaleDateString("tr-TR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Henüz yok"}
                    </span>
                  </div>
                  {integration.lastSyncStatus && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#6b7280", fontSize: "14px" }}>Durum:</span>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "500",
                          backgroundColor: syncStatusColors.bg,
                          color: syncStatusColors.text,
                        }}
                      >
                        {SYNC_STATUS_LABELS[integration.lastSyncStatus] || integration.lastSyncStatus}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    paddingTop: "16px",
                    borderTop: "1px solid #e5e7eb",
                  }}
                >
                  <Link
                    href={`/entegrasyonlar/${integration.id}`}
                    style={{
                      flex: 1,
                      padding: "8px 16px",
                      color: "#2563eb",
                      textDecoration: "none",
                      fontSize: "14px",
                      fontWeight: "500",
                      textAlign: "center",
                      borderRadius: "6px",
                      border: "1px solid #2563eb",
                      backgroundColor: "white",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#eff6ff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "white";
                    }}
                  >
                    Detaylar
                  </Link>
                  <button
                    onClick={() => handleSync(integration)}
                    disabled={syncMutation.isPending}
                    style={{
                      flex: 1,
                      padding: "8px 16px",
                      color: "white",
                      border: "none",
                      background: syncMutation.isPending ? "#9ca3af" : "#10b981",
                      borderRadius: "6px",
                      cursor: syncMutation.isPending ? "not-allowed" : "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (!syncMutation.isPending) {
                        e.currentTarget.style.backgroundColor = "#059669";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!syncMutation.isPending) {
                        e.currentTarget.style.backgroundColor = "#10b981";
                      }
                    }}
                  >
                    {syncMutation.isPending ? "..." : "Senkron"}
                  </button>
                  <button
                    onClick={() => handleDelete(integration.id, integration.displayName)}
                    disabled={deleteMutation.isPending}
                    style={{
                      padding: "8px 12px",
                      color: "#ef4444",
                      border: "1px solid #ef4444",
                      background: "white",
                      borderRadius: "6px",
                      cursor: deleteMutation.isPending ? "not-allowed" : "pointer",
                      fontSize: "14px",
                      transition: "all 0.2s",
                      opacity: deleteMutation.isPending ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!deleteMutation.isPending) {
                        e.currentTarget.style.backgroundColor = "#fee2e2";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!deleteMutation.isPending) {
                        e.currentTarget.style.backgroundColor = "white";
                      }
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add pulse animation for loading */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
