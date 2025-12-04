"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listProviders, createIntegration, updateIntegration, testConnection, type IntegrationProvider } from "@repo/api-client";

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
      console.log("[Integration Modal] Integration created:", data);
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
      console.error("Error creating integration:", error);
      alert(error.message || "Entegrasyon oluşturulurken bir hata oluştu.");
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
    mutationFn: (testConfig: Record<string, unknown>) => {
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
      alert("Lütfen bir sağlayıcı seçin.");
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
      console.error("Error submitting form:", error);
      // Error is already handled by mutation onError
    } finally {
      setIsSubmitting(false);
    }
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  return (
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
          backgroundColor: "white",
          padding: "24px",
          borderRadius: "8px",
          maxWidth: "600px",
          width: "90%",
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0 }}>
          {integrationId ? "İntegrasyonu Düzenle" : "Yeni İntegrasyon Ekle"}
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
              Sağlayıcı
            </label>
            <select
              value={selectedProviderId}
              onChange={(e) => setSelectedProviderId(e.target.value)}
              required
              disabled={!!integrationId}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "16px",
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
              <p style={{ marginTop: "4px", fontSize: "14px", color: "#666" }}>
                {selectedProvider.description}
              </p>
            )}
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
              Görünen Ad
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={selectedProvider?.name || "Entegrasyon adı"}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "16px",
              }}
            />
          </div>

          {selectedProvider && selectedProvider.configSchema && (
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
                Yapılandırma
              </label>
              {Object.entries(selectedProvider.configSchema).map(([key, schema]: [string, any]) => (
                <div key={key} style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>
                    {schema.label || key}
                  </label>
                  <input
                    type={schema.type === "password" ? "password" : "text"}
                    value={config[key] || ""}
                    onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
                    placeholder={schema.placeholder || ""}
                    required={schema.required !== false}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      fontSize: "16px",
                    }}
                  />
                  {schema.description && (
                    <p style={{ marginTop: "4px", fontSize: "12px", color: "#666" }}>
                      {schema.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {testResult && (
            <div
              style={{
                padding: "12px",
                marginBottom: "16px",
                borderRadius: "4px",
                backgroundColor: testResult.success ? "#d4edda" : "#f8d7da",
                color: testResult.success ? "#155724" : "#721c24",
              }}
            >
              {testResult.success ? "✓ " : "✗ "}
              {testResult.message || (testResult.success ? "Bağlantı başarılı." : "Bağlantı başarısız.")}
            </div>
          )}

          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 16px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                background: "white",
                cursor: "pointer",
              }}
            >
              İptal
            </button>
            {integrationId && (
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting}
                style={{
                  padding: "8px 16px",
                  border: "1px solid #0066cc",
                  borderRadius: "4px",
                  background: "white",
                  color: "#0066cc",
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
                padding: "8px 16px",
                border: "none",
                borderRadius: "4px",
                background: isSubmitting || createMutation.isPending || updateMutation.isPending ? "#999" : "#0066cc",
                color: "white",
                cursor: isSubmitting || createMutation.isPending || updateMutation.isPending ? "not-allowed" : "pointer",
              }}
            >
              {isSubmitting || createMutation.isPending || updateMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

