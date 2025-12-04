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
    },
  });

  const syncMutation = useMutation({
    mutationFn: ({ id, jobType }: { id: string; jobType: "pull_invoices" | "pull_bank_transactions" }) =>
      triggerSync(id, jobType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
    },
  });

  const currentData = activeTab === "accounting" ? accountingData : bankData;
  const isLoading = activeTab === "accounting" ? isLoadingAccounting : isLoadingBank;
  
  // Debug logging
  console.log(`[Integrations Page] Active tab:`, activeTab);
  console.log(`[Integrations Page] Accounting data:`, accountingData);
  console.log(`[Integrations Page] Bank data:`, bankData);
  console.log(`[Integrations Page] Current data:`, currentData);
  
  // Handle nested response structure: { data: { data: [...], total, ... } }
  const integrations = currentData?.data?.data || [];
  
  console.log(`[Integrations Page] Integrations array:`, integrations);
  console.log(`[Integrations Page] Integrations count:`, integrations.length);

  const handleDelete = async (id: string) => {
    if (confirm("Bu entegrasyonu silmek istediğinize emin misiniz?")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleSync = async (integration: TenantIntegration) => {
    const jobType = integration.providerId.includes("ACCOUNTING")
      ? "pull_invoices"
      : "pull_bank_transactions";
    await syncMutation.mutateAsync({ id: integration.id, jobType });
    alert("Senkronizasyon başlatıldı.");
  };

  return (
    <div style={{ padding: "40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1>İntegrasyonlar</h1>
        <Link
          href="/integrations/new"
          style={{
            padding: "8px 16px",
            backgroundColor: "#0066cc",
            color: "white",
            textDecoration: "none",
            borderRadius: "4px",
          }}
        >
          Yeni İntegrasyon Ekle
        </Link>
      </div>

      <div style={{ display: "flex", gap: "16px", marginBottom: "24px", borderBottom: "2px solid #ddd" }}>
        <button
          onClick={() => setActiveTab("accounting")}
          style={{
            padding: "12px 24px",
            border: "none",
            background: "none",
            borderBottom: activeTab === "accounting" ? "2px solid #0066cc" : "2px solid transparent",
            color: activeTab === "accounting" ? "#0066cc" : "#666",
            cursor: "pointer",
            fontWeight: activeTab === "accounting" ? "bold" : "normal",
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
            borderBottom: activeTab === "bank" ? "2px solid #0066cc" : "2px solid transparent",
            color: activeTab === "bank" ? "#0066cc" : "#666",
            cursor: "pointer",
            fontWeight: activeTab === "bank" ? "bold" : "normal",
          }}
        >
          Banka Bağlantıları
        </button>
      </div>

      {isLoading ? (
        <p>Yükleniyor...</p>
      ) : integrations.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <p>Henüz entegrasyon bulunmamaktadır.</p>
          <Link
            href="/integrations/new"
            style={{
              display: "inline-block",
              marginTop: "16px",
              padding: "8px 16px",
              backgroundColor: "#0066cc",
              color: "white",
              textDecoration: "none",
              borderRadius: "4px",
            }}
          >
            İlk Entegrasyonu Ekle
          </Link>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #ddd" }}>
              <th style={{ padding: "12px", textAlign: "left" }}>Ad</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Sağlayıcı</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Durum</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Son Senkron Zamanı</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Son Senkron Durumu</th>
              <th style={{ padding: "12px", textAlign: "left" }}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {integrations.map((integration: any) => (
              <tr key={integration.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "12px" }}>
                  <Link
                    href={`/integrations/${integration.id}`}
                    style={{ color: "#0066cc", textDecoration: "none" }}
                  >
                    {integration.displayName}
                  </Link>
                </td>
                <td style={{ padding: "12px" }}>{integration.provider?.name || "Bilinmeyen"}</td>
                <td style={{ padding: "12px" }}>
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      backgroundColor:
                        integration.status === "connected" ? "#d4edda" : integration.status === "error" ? "#f8d7da" : "#fff3cd",
                      color:
                        integration.status === "connected" ? "#155724" : integration.status === "error" ? "#721c24" : "#856404",
                      fontSize: "12px",
                    }}
                  >
                    {STATUS_LABELS[integration.status] || integration.status}
                  </span>
                </td>
                <td style={{ padding: "12px" }}>
                  {integration.lastSyncAt
                    ? new Date(integration.lastSyncAt).toLocaleString("tr-TR")
                    : "-"}
                </td>
                <td style={{ padding: "12px" }}>
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
                        fontSize: "12px",
                      }}
                    >
                      {SYNC_STATUS_LABELS[integration.lastSyncStatus] || integration.lastSyncStatus}
                    </span>
                  ) : (
                    "-"
                  )}
                </td>
                <td style={{ padding: "12px" }}>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <Link
                      href={`/integrations/${integration.id}`}
                      style={{
                        padding: "4px 8px",
                        color: "#0066cc",
                        textDecoration: "none",
                        fontSize: "14px",
                      }}
                    >
                      Düzenle
                    </Link>
                    <button
                      onClick={() => handleSync(integration)}
                      style={{
                        padding: "4px 8px",
                        color: "#0066cc",
                        border: "1px solid #0066cc",
                        background: "white",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "14px",
                      }}
                    >
                      Senkronize Et
                    </button>
                    <button
                      onClick={() => handleDelete(integration.id)}
                      style={{
                        padding: "4px 8px",
                        color: "#dc3545",
                        border: "1px solid #dc3545",
                        background: "white",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "14px",
                      }}
                    >
                      Bağlantıyı Kes
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}


