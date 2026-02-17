"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listProviders, createIntegration, updateIntegration, testConnection, type IntegrationProvider } from "@repo/api-client";
import { toast } from "@/lib/toast";
import { colors, spacing, borderRadius, typography, transitions } from "@/styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";

interface IntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  integrationId?: string;
  initialData?: {
    providerId: string;
    displayName: string;
    config: Record<string, unknown>;
  };
  type?: "accounting" | "bank";
  onSuccess?: (integration: any) => void;
}

export default function IntegrationModal({
  isOpen,
  onClose,
  integrationId,
  initialData,
  type,
  onSuccess,
}: IntegrationModalProps) {
  const { themeColors } = useTheme();
  const queryClient = useQueryClient();
  const [selectedProviderId, setSelectedProviderId] = useState<string>(initialData?.providerId || "");
  const [displayName, setDisplayName] = useState<string>(initialData?.displayName || "");
  const [config, setConfig] = useState<Record<string, string>>(
    initialData?.config ? (Object.fromEntries(Object.entries(initialData.config).map(([k, v]) => [k, String(v)]))) : {}
  );
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: providersData } = useQuery({
    queryKey: ["providers", type],
    queryFn: () => listProviders(type),
    enabled: isOpen,
  });

  const providers = providersData?.data || [];
  const selectedProvider = providers.find((p: IntegrationProvider) => p.id === selectedProviderId);

  const createMutation = useMutation({
    mutationFn: createIntegration,
    onSuccess: async (data) => {
      if (process.env.NODE_ENV === "development") {
        console.log("[Integration Modal] Integration created:", data);
      }
      // Invalidate all integration queries to refresh both tabs
      await queryClient.invalidateQueries({ queryKey: ["integrations"] });
      // Refetch immediately to ensure data is fresh
      await queryClient.refetchQueries({ queryKey: ["integrations"] });
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(data.data);
      }
      onClose();
    },
    onError: (error: any) => {
      if (process.env.NODE_ENV === "development") {
        console.error("Error creating integration:", error);
      }
      toast.error(error.message || "Entegrasyon oluşturulurken bir hata oluştu.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateIntegration(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      onClose();
    },
  });

  const testMutation = useMutation({
    mutationFn: (_testConfig: Record<string, unknown>) => {
      if (integrationId) {
        return testConnection(integrationId);
      }
      // For new integrations, we need to test with the config
      // In a real scenario, we'd have a separate test endpoint
      return Promise.resolve({ data: { success: false, message: "Lütfen önce kaydedin." } });
    },
  });

  const handleTest = async () => {
    if (!selectedProvider) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      // For new integrations, we can't test without saving first
      // This is a limitation - in production, you'd have a test endpoint that accepts config
      if (!integrationId) {
        setTestResult({ success: false, message: "Lütfen önce entegrasyonu kaydedin." });
        return;
      }

      const result = await testMutation.mutateAsync(config);
      setTestResult(result.data);
    } catch (error: any) {
      setTestResult({ success: false, message: error.message || "Test başarısız." });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (isSubmitting) {
      return;
    }

    if (!selectedProvider) {
      toast.warning("Lütfen bir sağlayıcı seçin.");
      return;
    }

    setIsSubmitting(true);

    try {
      const configObj: Record<string, unknown> = {};
      if (selectedProvider.configSchema) {
        for (const [key, schema] of Object.entries(selectedProvider.configSchema)) {
          const value = config[key];
          if (value !== undefined && value !== "") {
            // Try to parse as number if schema indicates it
            if ((schema as any).type === "number") {
              configObj[key] = parseFloat(value);
            } else {
              configObj[key] = value;
            }
          }
        }
      } else {
        // Fallback: use all config values
        for (const [key, value] of Object.entries(config)) {
          if (value !== undefined && value !== "") {
            configObj[key] = value;
          }
        }
      }

      if (integrationId) {
        await updateMutation.mutateAsync({
          id: integrationId,
          data: {
            displayName: displayName || selectedProvider.name,
            config: configObj,
          },
        });
      } else {
        await createMutation.mutateAsync({
          providerId: selectedProviderId,
          displayName: displayName || selectedProvider.name,
          config: configObj,
        });
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error submitting form:", error);
      }
      // Error is already handled by mutation onError
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update state when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData && integrationId) {
      // Only update if we're in edit mode and have initial data
      if (initialData.providerId) {
        setSelectedProviderId(initialData.providerId);
      }
      if (initialData.displayName !== undefined) {
        setDisplayName(initialData.displayName);
      }
      if (initialData.config) {
        const configStrings = Object.fromEntries(
          Object.entries(initialData.config).map(([k, v]) => [k, String(v)])
        );
        setConfig(configStrings);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integrationId, initialData?.providerId, initialData?.displayName]);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: themeColors.white,
          padding: spacing.xl,
          borderRadius: borderRadius.lg,
          maxWidth: "700px",
          width: "90%",
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: spacing.lg, borderBottom: `1px solid ${themeColors.gray[200]}`, paddingBottom: spacing.md }}>
          <h2 style={{ margin: 0, fontSize: typography.fontSize["2xl"], fontWeight: typography.fontWeight.bold, color: themeColors.text.primary }}>
            {integrationId ? "Integrasyonu Düzenle" : "Yeni Integrasyon Ekle"}
          </h2>
          <p style={{ margin: `${spacing.sm} 0 0 0`, color: themeColors.text.secondary, fontSize: typography.fontSize.sm }}>
            {integrationId
              ? "Entegrasyon ayarlarını güncelleyin"
              : "Yeni bir entegrasyon bağlantısı oluşturun"}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: spacing.sm,
                fontWeight: typography.fontWeight.semibold,
                fontSize: typography.fontSize.sm,
                color: themeColors.text.primary,
              }}
            >
              Sağlayıcı
            </label>
            <select
              value={selectedProviderId}
              onChange={(e) => setSelectedProviderId(e.target.value)}
              required
              disabled={!!integrationId}
              style={{
                width: "100%",
                padding: `12px ${spacing.md}`,
                border: `1px solid ${themeColors.gray[300]}`,
                borderRadius: borderRadius.md,
                fontSize: typography.fontSize.base,
                backgroundColor: integrationId ? themeColors.gray[50] : themeColors.white,
                color: themeColors.text.primary,
                transition: `all ${transitions.normal}`,
              }}
              onFocus={(e) => {
                if (!integrationId) {
                  e.currentTarget.style.borderColor = colors.primary;
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.1)";
                }
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = themeColors.gray[300];
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <option value="">Seçiniz...</option>
              {providers.map((provider: IntegrationProvider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
            {selectedProvider && selectedProvider.description && (
              <p style={{ marginTop: spacing.sm, fontSize: typography.fontSize.sm, color: themeColors.text.secondary }}>
                {selectedProvider.description}
              </p>
            )}
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: spacing.sm,
                fontWeight: typography.fontWeight.semibold,
                fontSize: typography.fontSize.sm,
                color: themeColors.text.primary,
              }}
            >
              Görünen Ad
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={selectedProvider?.name || "Entegrasyon adı"}
              style={{
                width: "100%",
                padding: `12px ${spacing.md}`,
                border: `1px solid ${themeColors.gray[300]}`,
                borderRadius: borderRadius.md,
                fontSize: typography.fontSize.base,
                transition: `all ${transitions.normal}`,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = colors.primary;
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = themeColors.gray[300];
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {selectedProvider && selectedProvider.configSchema && (
            <div style={{ marginBottom: spacing.lg }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "12px",
                  fontWeight: typography.fontWeight.semibold,
                  fontSize: typography.fontSize.sm,
                  color: themeColors.text.primary,
                }}
              >
                Yapılandırma
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
                {Object.entries(selectedProvider.configSchema).map(([key, schema]: [string, any]) => (
                  <div key={key}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: spacing.sm,
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.medium,
                        color: themeColors.text.primary,
                      }}
                    >
                      {schema.label || key}
                      {schema.required !== false && <span style={{ color: colors.danger, marginLeft: spacing.xs }}>*</span>}
                    </label>
                    <input
                      type={schema.type === "password" ? "password" : "text"}
                      value={config[key] || ""}
                      onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
                      placeholder={schema.placeholder || ""}
                      required={schema.required !== false}
                      style={{
                        width: "100%",
                        padding: `12px ${spacing.md}`,
                        border: `1px solid ${themeColors.gray[300]}`,
                        borderRadius: borderRadius.md,
                        fontSize: typography.fontSize.base,
                        transition: `all ${transitions.normal}`,
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = colors.primary;
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.1)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = themeColors.gray[300];
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                    {schema.description && (
                      <p style={{ marginTop: "6px", fontSize: typography.fontSize.sm, color: themeColors.text.secondary }}>
                        {schema.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {testResult && (
            <div
              style={{
                padding: "12px",
                marginBottom: spacing.md,
                borderRadius: borderRadius.sm,
                backgroundColor: testResult.success ? colors.successLight : colors.dangerLight,
                color: testResult.success ? colors.successDark : colors.dangerDark,
              }}
            >
              {testResult.success ? "\u2713 " : "\u2717 "}
              {testResult.message || (testResult.success ? "Bağlantı başarılı." : "Bağlantı başarısız.")}
            </div>
          )}

          <div style={{ display: "flex", gap: spacing.sm, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: `${spacing.sm} ${spacing.md}`,
                border: `1px solid ${themeColors.border}`,
                borderRadius: borderRadius.sm,
                background: themeColors.white,
                cursor: "pointer",
              }}
            >
              Iptal
            </button>
            {integrationId && (
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting}
                style={{
                  padding: `${spacing.sm} ${spacing.md}`,
                  border: `1px solid ${colors.primary}`,
                  borderRadius: borderRadius.sm,
                  background: themeColors.white,
                  color: colors.primary,
                  cursor: isTesting ? "not-allowed" : "pointer",
                }}
              >
                {isTesting ? "Test Ediliyor..." : "Bağlantıyı Test Et"}
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
              style={{
                padding: `12px ${spacing.lg}`,
                backgroundColor: isSubmitting || createMutation.isPending || updateMutation.isPending ? themeColors.gray[400] : colors.primary,
                color: themeColors.white,
                border: "none",
                borderRadius: borderRadius.md,
                cursor: isSubmitting || createMutation.isPending || updateMutation.isPending ? "not-allowed" : "pointer",
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.medium,
                transition: `all ${transitions.normal}`,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting && !createMutation.isPending && !updateMutation.isPending) {
                  e.currentTarget.style.backgroundColor = colors.primaryDark;
                  e.currentTarget.style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting && !createMutation.isPending && !updateMutation.isPending) {
                  e.currentTarget.style.backgroundColor = colors.primary;
                  e.currentTarget.style.transform = "translateY(0)";
                }
              }}
            >
              {isSubmitting || createMutation.isPending || updateMutation.isPending
                ? "\u23f3 Kaydediliyor..."
                : integrationId
                ? "\ud83d\udcbe Güncelle"
                : "\u2728 Oluştur"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
