"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listIntegrations,
  deleteIntegration,
  triggerSync,
  type TenantIntegration,
} from "@repo/api-client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageTransition } from "@/components/ui/PageTransition";
import { spacing, typography } from "@/styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "@/lib/toast";

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
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string | null; name: string }>({
    open: false,
    id: null,
    name: "",
  });

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

  // Log errors and show toasts
  if (accountingError) {
    console.error("[Integrations Page] Accounting query error:", accountingError);
    if (activeTab === "accounting") {
      toast.error("Muhasebe entegrasyonları yüklenirken bir hata oluştu.");
    }
  }
  if (bankError) {
    if (process.env.NODE_ENV === "development" && bankError) {
      console.error("[Integrations Page] Bank query error:", bankError);
    }
    if (activeTab === "bank") {
      toast.error("Banka entegrasyonları yüklenirken bir hata oluştu.");
    }
  }

  const deleteMutation = useMutation({
    mutationFn: deleteIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      toast.success("Entegrasyon başarıyla silindi.");
    },
    onError: () => {
      toast.error("Entegrasyon silinirken bir hata oluştu.");
    },
  });

  const syncMutation = useMutation({
    mutationFn: ({ id, jobType }: { id: string; jobType: "pull_invoices" | "pull_bank_transactions" }) =>
      triggerSync(id, jobType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      toast.success("Senkronizasyon başlatıldı.");
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.error?.message || "Senkronizasyon başlatılamadı.";
      toast.error(errorMessage);
    },
  });

  const currentData = activeTab === "accounting" ? accountingData : bankData;
  const isLoading = activeTab === "accounting" ? isLoadingAccounting : isLoadingBank;
  
  // Handle nested response structure: { data: { data: [...], total, ... } }
  // Also handle direct array response as fallback
  const integrations = currentData?.data?.data || (Array.isArray(currentData?.data) ? currentData.data : []);
  
  // Debug logging
  if (currentData && !isLoading) {
    if (process.env.NODE_ENV === "development") {
      console.log("[Integrations Page] Current data:", currentData);
      console.log("[Integrations Page] Integrations:", integrations);
    }
  }

  const handleDeleteClick = (id: string, name: string) => {
    setDeleteModal({ open: true, id, name });
  };

  const handleDeleteConfirm = async () => {
    if (deleteModal.id) {
      await deleteMutation.mutateAsync(deleteModal.id);
      setDeleteModal({ open: false, id: null, name: "" });
    }
  };

  const handleSync = async (integration: TenantIntegration) => {
    if (integration.status !== "connected") {
      toast.error("Sadece bağlı entegrasyonlar senkronize edilebilir.");
      return;
    }
    const jobType = integration.providerId.includes("ACCOUNTING")
      ? "pull_invoices"
      : "pull_bank_transactions";
    await syncMutation.mutateAsync({ id: integration.id, jobType });
  };

  const getStatusVariant = (status: string): "success" | "danger" | "warning" | "secondary" => {
    switch (status) {
      case "connected":
        return "success";
      case "error":
        return "danger";
      default:
        return "warning";
    }
  };

  const getSyncStatusVariant = (status: string): "success" | "danger" | "info" | "secondary" => {
    switch (status) {
      case "success":
        return "success";
      case "error":
        return "danger";
      case "in_progress":
        return "info";
      default:
        return "secondary";
    }
  };

  return (
    <PageTransition>
    <div style={{ padding: spacing.xxl, maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xl }}>
        <div>
          <h1 style={{ margin: 0, fontSize: typography.fontSize["3xl"], fontWeight: typography.fontWeight.bold, color: themeColors.text.primary, marginBottom: spacing.sm }}>
            İntegrasyonlar
          </h1>
          <p style={{ margin: 0, color: themeColors.text.secondary, fontSize: typography.fontSize.base }}>
            Muhasebe sistemleri ve banka bağlantılarını yönetin
          </p>
        </div>
        <Button asLink href="/entegrasyonlar/new" variant="primary">
          Yeni İntegrasyon
        </Button>
      </div>

      {/* Tabs */}
      <Tabs
        items={[
          {
            id: "accounting",
            label: "Muhasebe Sistemleri",
            icon: "Calculator",
            content: (
              <div style={{ marginTop: spacing.lg }}>
                {isLoadingAccounting ? (
                  <Card>
                    <div style={{ padding: spacing.lg }}>
                      <SkeletonTable rows={3} columns={1} />
                    </div>
                  </Card>
                ) : integrations.length === 0 ? (
                  <EmptyState
                    icon="Calculator"
                    title="Henüz muhasebe sistemi entegrasyonu bulunmamaktadır"
                    description="İlk entegrasyonunuzu ekleyerek başlayın"
                    actionLabel="İlk Entegrasyonu Ekle"
                    onAction={() => window.location.href = "/entegrasyonlar/new"}
                  />
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: spacing.lg }}>
                    {integrations.map((integration) => (
                      <Card key={integration.id} hoverable>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.md }}>
                          <div style={{ flex: 1 }}>
                            <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: themeColors.text.primary, marginBottom: spacing.xs }}>
                              {integration.displayName || integration.provider?.name || "Entegrasyon"}
                            </h3>
                            <Badge variant={getStatusVariant(integration.status)} size="sm" style={{ marginBottom: spacing.sm }}>
                              {STATUS_LABELS[integration.status] || integration.status}
                            </Badge>
                          </div>
                        </div>
                        <div style={{ marginBottom: spacing.md }}>
                          <p style={{ fontSize: typography.fontSize.sm, color: themeColors.text.secondary, marginBottom: spacing.xs }}>
                            <strong>Sağlayıcı:</strong> {integration.provider?.name || integration.providerName || "-"}
                          </p>
                          {integration.lastSyncAt && (
                            <p style={{ fontSize: typography.fontSize.sm, color: themeColors.text.secondary }}>
                              <strong>Son Senkronizasyon:</strong> {new Date(integration.lastSyncAt).toLocaleString("tr-TR")}
                            </p>
                          )}
                          {integration.lastSyncStatus && (
                            <p style={{ fontSize: typography.fontSize.sm, color: themeColors.text.secondary, marginTop: spacing.xs }}>
                              <strong>Senkron Durumu:</strong>{" "}
                              <Badge variant={getSyncStatusVariant(integration.lastSyncStatus)} size="sm">
                                {SYNC_STATUS_LABELS[integration.lastSyncStatus] || integration.lastSyncStatus}
                              </Badge>
                            </p>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: spacing.sm, flexWrap: "wrap" }}>
                          <Button
                            asLink
                            href={`/entegrasyonlar/${integration.id}`}
                            variant="outline"
                            size="sm"
                          >
                            Detaylar
                          </Button>
                          <Button
                            onClick={() => handleSync(integration)}
                            disabled={syncMutation.isPending || integration.status !== "connected"}
                            variant="outline"
                            size="sm"
                            loading={syncMutation.isPending}
                            title={integration.status !== "connected" ? "Sadece bağlı entegrasyonlar senkronize edilebilir" : undefined}
                          >
                            Senkronize Et
                          </Button>
                          <Button
                            onClick={() => handleDeleteClick(integration.id, integration.displayName || integration.provider?.name || "Entegrasyon")}
                            variant="danger"
                            size="sm"
                          >
                            Sil
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ),
          },
          {
            id: "bank",
            label: "Banka Bağlantıları",
            icon: "CreditCard",
            content: (
              <div style={{ marginTop: spacing.lg }}>
                {isLoadingBank ? (
                  <Card>
                    <div style={{ padding: spacing.lg }}>
                      <SkeletonTable rows={3} columns={1} />
                    </div>
                  </Card>
                ) : integrations.length === 0 ? (
                  <EmptyState
                    icon="CreditCard"
                    title="Henüz banka bağlantısı bulunmamaktadır"
                    description="İlk bağlantınızı ekleyerek başlayın"
                    actionLabel="İlk Bağlantıyı Ekle"
                    onAction={() => window.location.href = "/entegrasyonlar/new"}
                  />
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: spacing.lg }}>
                    {integrations.map((integration) => (
                      <Card key={integration.id} hoverable>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.md }}>
                          <div style={{ flex: 1 }}>
                            <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: themeColors.text.primary, marginBottom: spacing.xs }}>
                              {integration.displayName || integration.provider?.name || "Entegrasyon"}
                            </h3>
                            <Badge variant={getStatusVariant(integration.status)} size="sm" style={{ marginBottom: spacing.sm }}>
                              {STATUS_LABELS[integration.status] || integration.status}
                            </Badge>
                          </div>
                        </div>
                        <div style={{ marginBottom: spacing.md }}>
                          <p style={{ fontSize: typography.fontSize.sm, color: themeColors.text.secondary, marginBottom: spacing.xs }}>
                            <strong>Sağlayıcı:</strong> {integration.provider?.name || integration.providerName || "-"}
                          </p>
                          {integration.lastSyncAt && (
                            <p style={{ fontSize: typography.fontSize.sm, color: themeColors.text.secondary }}>
                              <strong>Son Senkronizasyon:</strong> {new Date(integration.lastSyncAt).toLocaleString("tr-TR")}
                            </p>
                          )}
                          {integration.lastSyncStatus && (
                            <p style={{ fontSize: typography.fontSize.sm, color: themeColors.text.secondary, marginTop: spacing.xs }}>
                              <strong>Senkron Durumu:</strong>{" "}
                              <Badge variant={getSyncStatusVariant(integration.lastSyncStatus)} size="sm">
                                {SYNC_STATUS_LABELS[integration.lastSyncStatus] || integration.lastSyncStatus}
                              </Badge>
                            </p>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: spacing.sm, flexWrap: "wrap" }}>
                          <Button
                            asLink
                            href={`/entegrasyonlar/${integration.id}`}
                            variant="outline"
                            size="sm"
                          >
                            Detaylar
                          </Button>
                          <Button
                            onClick={() => handleSync(integration)}
                            disabled={syncMutation.isPending || integration.status !== "connected"}
                            variant="outline"
                            size="sm"
                            loading={syncMutation.isPending}
                            title={integration.status !== "connected" ? "Sadece bağlı entegrasyonlar senkronize edilebilir" : undefined}
                          >
                            Senkronize Et
                          </Button>
                          <Button
                            onClick={() => handleDeleteClick(integration.id, integration.displayName || integration.provider?.name || "Entegrasyon")}
                            variant="danger"
                            size="sm"
                          >
                            Sil
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ),
          },
        ]}
        defaultTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId as "accounting" | "bank")}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null, name: "" })}
        title="Entegrasyonu Sil"
        size="sm"
      >
        <div style={{ marginBottom: spacing.lg }}>
          <p style={{ color: themeColors.text.primary, marginBottom: spacing.md }}>
            <strong>"{deleteModal.name}"</strong> entegrasyonunu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
          </p>
        </div>
        <div style={{ display: "flex", gap: spacing.md, justifyContent: "flex-end" }}>
          <Button
            variant="outline"
            onClick={() => setDeleteModal({ open: false, id: null, name: "" })}
          >
            İptal
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteConfirm}
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
