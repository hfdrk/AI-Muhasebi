"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listIntegrations,
  deleteIntegration,
  triggerSync,
  type TenantIntegration,
} from "@repo/api-client";
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

export default function IntegrationsPage() {
  const { themeColors } = useTheme();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"accounting" | "bank">("accounting");

  const { data: accountingData, isLoading: isLoadingAccounting, error: accountingError } = useQuery({
    queryKey: ["integrations", "accounting"],
    queryFn: () => {
      if (process.env.NODE_ENV === "development") {
        console.log("[Integrations Page] Fetching accounting integrations...");
      }
      return listIntegrations({ type: "accounting" });
    },
  });

  const { data: bankData, isLoading: isLoadingBank, error: bankError } = useQuery({
    queryKey: ["integrations", "bank"],
    queryFn: () => {
      if (process.env.NODE_ENV === "development") {
        console.log("[Integrations Page] Fetching bank integrations...");
      }
      return listIntegrations({ type: "bank" });
    },
  });

  // Log errors only in development
  if (process.env.NODE_ENV === "development") {
    if (accountingError) {
      console.error("[Integrations Page] Accounting query error:", accountingError);
    }
    if (bankError) {
      console.error("[Integrations Page] Bank query error:", bankError);
    }
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
  
  // Handle nested response structure: { data: { data: [...], total, ... } }
  const integrations = currentData?.data?.data || [];
  
  // Debug logging only in development
  if (process.env.NODE_ENV === "development") {
    console.log(`[Integrations Page] Active tab:`, activeTab);
    console.log(`[Integrations Page] Accounting data:`, accountingData);
    console.log(`[Integrations Page] Bank data:`, bankData);
    console.log(`[Integrations Page] Current data:`, currentData);
    console.log(`[Integrations Page] Integrations array:`, integrations);
    console.log(`[Integrations Page] Integrations count:`, integrations.length);
  }

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
    toast.success("Senkronizasyon başlatıldı.");
  };

  return (
    <div style={{ padding: "40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1>İntegrasyonlar</h1>
        <Link
          href="/entegrasyonlar/new"
          style={{
            padding: "8px 16px",
            backgroundColor: colors.primary,
            color: colors.white,
            textDecoration: "none",
            borderRadius: "4px",
          }}
        >
          Yeni İntegrasyon Ekle
        </Link>
      </div>

      <div style={{ display: "flex", gap: "16px", marginBottom: "24px", borderBottom: `2px solid ${themeColors.border}` }}>
        <button
          onClick={() => setActiveTab("accounting")}
          style={{
            padding: "12px 24px",
            border: "none",
            background: "none",
            borderBottom: activeTab === "accounting" ? `2px solid ${colors.primary}` : "2px solid transparent",
            color: activeTab === "accounting" ? colors.primary : themeColors.text.secondary,
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
            borderBottom: activeTab === "bank" ? `2px solid ${colors.primary}` : "2px solid transparent",
            color: activeTab === "bank" ? colors.primary : themeColors.text.secondary,
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
            href="/entegrasyonlar/new"
            style={{
              display: "inline-block",
              marginTop: "16px",
              padding: "8px 16px",
              backgroundColor: colors.primary,
              color: colors.white,
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
            <tr style={{ borderBottom: `2px solid ${themeColors.border}` }}>
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
              <tr key={integration.id} style={{ borderBottom: `1px solid ${themeColors.gray[200]}` }}>
                <td style={{ padding: "12px" }}>
                  <Link
                    href={`/entegrasyonlar/${integration.id}`}
                    style={{ color: colors.primary, textDecoration: "none" }}
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
                        integration.status === "connected" ? colors.successLight : integration.status === "error" ? colors.dangerLight : colors.warningLight,
                      color:
                        integration.status === "connected" ? colors.successDark : integration.status === "error" ? colors.dangerDark : colors.warningDark,
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
                      href={`/entegrasyonlar/${integration.id}`}
                      style={{
                        padding: "4px 8px",
                        color: colors.primary,
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
                        color: colors.primary,
                        border: `1px solid ${colors.primary}`,
                        background: themeColors.white,
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
                        color: colors.danger,
                        border: `1px solid ${colors.danger}`,
                        background: themeColors.white,
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


