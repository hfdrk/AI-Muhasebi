"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { colors, spacing, borderRadius, typography, zIndex } from "@/styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";
import { getAccessToken } from "@/lib/auth";

interface FieldMapping {
  sourceField: string;
  targetField: string;
  transformation?: string;
}

interface IntegrationMappingConfig {
  invoiceMappings?: FieldMapping[];
  transactionMappings?: FieldMapping[];
  clientCompanyMappings?: FieldMapping[];
}

interface IntegrationFieldMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  integrationId: string;
  tenantId: string;
}

const COMMON_INVOICE_FIELDS = [
  "invoiceNumber",
  "issueDate",
  "dueDate",
  "totalAmount",
  "taxAmount",
  "netAmount",
  "counterpartyName",
  "counterpartyTaxNumber",
  "status",
  "type",
];

const COMMON_TRANSACTION_FIELDS = [
  "bookingDate",
  "valueDate",
  "description",
  "amount",
  "currency",
  "balanceAfter",
  "accountIdentifier",
];

const COMMON_CLIENT_COMPANY_FIELDS = [
  "name",
  "taxNumber",
  "address",
  "phone",
  "email",
];

export default function IntegrationFieldMappingModal({
  isOpen,
  onClose,
  integrationId,
  tenantId: _tenantId,
}: IntegrationFieldMappingModalProps) {
  const { themeColors } = useTheme();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"invoice" | "transaction" | "client">("invoice");
  const [mappings, setMappings] = useState<IntegrationMappingConfig>({
    invoiceMappings: [],
    transactionMappings: [],
    clientCompanyMappings: [],
  });

  // Reset mappings when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setMappings({
        invoiceMappings: [],
        transactionMappings: [],
        clientCompanyMappings: [],
      });
    }
  }, [isOpen]);

  const { data: mappingsData, isLoading } = useQuery({
    queryKey: ["integrationMappings", integrationId],
    queryFn: async () => {
      const token = getAccessToken();
      const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";
      const response = await fetch(`${API_URL}/api/v1/integrations/${integrationId}/mappings`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch mappings");
      const data = await response.json();
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 API Response:", data);
      }
      return data;
    },
    enabled: isOpen && !!integrationId,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const { data: suggestionsData } = useQuery({
    queryKey: ["integrationMappingSuggestions", integrationId],
    queryFn: async () => {
      const token = getAccessToken();
      const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";
      const response = await fetch(`${API_URL}/api/v1/integrations/${integrationId}/mappings/suggestions`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch suggestions");
      return response.json();
    },
    enabled: isOpen && !!integrationId,
  });

  useEffect(() => {
    if (mappingsData?.data) {
      if (process.env.NODE_ENV === "development") {
        console.log("📦 Loaded mappings from API:", mappingsData.data);
      }
      setMappings(mappingsData.data);
    } else if (mappingsData && process.env.NODE_ENV === "development") {
      console.log("⚠️ Mappings data structure:", mappingsData);
    }
  }, [mappingsData]);

  const saveMutation = useMutation({
    mutationFn: async (mappingsToSave: IntegrationMappingConfig) => {
      const token = getAccessToken();
      const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";
      const response = await fetch(`${API_URL}/api/v1/integrations/${integrationId}/mappings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: "include",
        body: JSON.stringify(mappingsToSave),
      });
      if (!response.ok) throw new Error("Failed to save mappings");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrationMappings", integrationId] });
      onClose();
    },
  });

  const applySuggestions = () => {
    if (suggestionsData?.data) {
      setMappings(suggestionsData.data);
    }
  };

  const addMapping = (type: keyof IntegrationMappingConfig) => {
    const newMapping: FieldMapping = { sourceField: "", targetField: "" };
    setMappings((prev) => ({
      ...prev,
      [type]: [...(prev[type] || []), newMapping],
    }));
  };

  const updateMapping = (
    type: keyof IntegrationMappingConfig,
    index: number,
    field: keyof FieldMapping,
    value: string
  ) => {
    setMappings((prev) => {
      const updated = { ...prev };
      const mappings = [...(updated[type] || [])];
      mappings[index] = { ...mappings[index], [field]: value };
      updated[type] = mappings as FieldMapping[];
      return updated;
    });
  };

  const removeMapping = (type: keyof IntegrationMappingConfig, index: number) => {
    setMappings((prev) => {
      const updated = { ...prev };
      const mappings = [...(updated[type] || [])];
      mappings.splice(index, 1);
      updated[type] = mappings;
      return updated;
    });
  };

  const getAvailableFields = () => {
    switch (activeTab) {
      case "invoice":
        return COMMON_INVOICE_FIELDS;
      case "transaction":
        return COMMON_TRANSACTION_FIELDS;
      case "client":
        return COMMON_CLIENT_COMPANY_FIELDS;
    }
  };

  const getCurrentMappings = () => {
    switch (activeTab) {
      case "invoice":
        return mappings.invoiceMappings || [];
      case "transaction":
        return mappings.transactionMappings || [];
      case "client":
        return mappings.clientCompanyMappings || [];
    }
  };

  const handleSave = () => {
    saveMutation.mutate(mappings);
  };

  if (!isOpen) return null;

  if (isLoading) {
    return createPortal(
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
          zIndex: zIndex.modal,
        }}
        onClick={onClose}
      >
        <div
          style={{
            backgroundColor: themeColors.white,
            borderRadius: borderRadius.md,
            padding: spacing.lg,
            maxWidth: "400px",
            width: "90%",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <p>Yükleniyor...</p>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
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
        zIndex: zIndex.modal,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: themeColors.white,
          borderRadius: borderRadius.md,
          padding: spacing.lg,
          maxWidth: "800px",
          width: "90%",
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: spacing.lg }}>Alan Eşleştirme</h2>

        <div style={{ display: "flex", gap: spacing.sm, marginBottom: spacing.lg }}>
          <button
            onClick={() => setActiveTab("invoice")}
            style={{
              padding: `${spacing.sm} ${spacing.md}`,
              border: "none",
              borderRadius: borderRadius.sm,
              backgroundColor: activeTab === "invoice" ? colors.primary : themeColors.gray[100],
              color: activeTab === "invoice" ? colors.white : themeColors.text.primary,
              cursor: "pointer",
              fontSize: typography.fontSize.sm,
            }}
          >
            Fatura Alanları
          </button>
          <button
            onClick={() => setActiveTab("transaction")}
            style={{
              padding: `${spacing.sm} ${spacing.md}`,
              border: "none",
              borderRadius: borderRadius.sm,
              backgroundColor: activeTab === "transaction" ? colors.primary : themeColors.gray[100],
              color: activeTab === "transaction" ? colors.white : themeColors.text.primary,
              cursor: "pointer",
              fontSize: typography.fontSize.sm,
            }}
          >
            İşlem Alanları
          </button>
          <button
            onClick={() => setActiveTab("client")}
            style={{
              padding: `${spacing.sm} ${spacing.md}`,
              border: "none",
              borderRadius: borderRadius.sm,
              backgroundColor: activeTab === "client" ? colors.primary : themeColors.gray[100],
              color: activeTab === "client" ? colors.white : themeColors.text.primary,
              cursor: "pointer",
              fontSize: typography.fontSize.sm,
            }}
          >
            Müşteri Alanları
          </button>
        </div>

        {suggestionsData?.data && (
          <div style={{ marginBottom: spacing.md }}>
            <button
              onClick={applySuggestions}
              style={{
                padding: `${spacing.sm} ${spacing.md}`,
                backgroundColor: colors.success,
                color: colors.white,
                border: "none",
                borderRadius: borderRadius.sm,
                cursor: "pointer",
                fontSize: typography.fontSize.sm,
              }}
            >
              Önerilen Eşleştirmeleri Uygula
            </button>
          </div>
        )}

        <div style={{ marginBottom: spacing.lg }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr auto", gap: spacing.sm, marginBottom: spacing.sm }}>
            <strong>Kaynak Alan</strong>
            <strong>Hedef Alan</strong>
            <strong>Dönüşüm</strong>
            <div></div>
          </div>

          {getCurrentMappings().length === 0 ? (
            <div style={{ padding: spacing.md, textAlign: "center", color: themeColors.text.secondary }}>
              Henüz eşleştirme yapılmamış. Aşağıdaki butona tıklayarak yeni eşleştirme ekleyebilirsiniz.
            </div>
          ) : (
            getCurrentMappings().map((mapping, index) => (
            <div key={index} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr auto", gap: spacing.sm, marginBottom: spacing.sm }}>
              <select
                value={mapping.sourceField}
                onChange={(e) => updateMapping(activeTab === "invoice" ? "invoiceMappings" : activeTab === "transaction" ? "transactionMappings" : "clientCompanyMappings", index, "sourceField", e.target.value)}
                style={{ padding: spacing.sm, border: `1px solid ${themeColors.border}`, borderRadius: borderRadius.sm, fontSize: typography.fontSize.sm }}
              >
                <option value="">Seçiniz</option>
                {getAvailableFields().map((field) => (
                  <option key={field} value={field}>
                    {field}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={mapping.targetField}
                onChange={(e) => updateMapping(activeTab === "invoice" ? "invoiceMappings" : activeTab === "transaction" ? "transactionMappings" : "clientCompanyMappings", index, "targetField", e.target.value)}
                placeholder="Hedef alan adı"
                style={{ padding: spacing.sm, border: `1px solid ${themeColors.border}`, borderRadius: borderRadius.sm, fontSize: typography.fontSize.sm }}
              />
              <select
                value={mapping.transformation || ""}
                onChange={(e) => updateMapping(activeTab === "invoice" ? "invoiceMappings" : activeTab === "transaction" ? "transactionMappings" : "clientCompanyMappings", index, "transformation", e.target.value)}
                style={{ padding: spacing.sm, border: `1px solid ${themeColors.border}`, borderRadius: borderRadius.sm, fontSize: typography.fontSize.sm }}
              >
                <option value="">Yok</option>
                <option value="uppercase">Büyük Harf</option>
                <option value="lowercase">Küçük Harf</option>
                <option value="trim">Boşluk Temizle</option>
              </select>
              <button
                onClick={() => removeMapping(activeTab === "invoice" ? "invoiceMappings" : activeTab === "transaction" ? "transactionMappings" : "clientCompanyMappings", index)}
                style={{
                  padding: spacing.sm,
                  backgroundColor: colors.danger,
                  color: colors.white,
                  border: "none",
                  borderRadius: borderRadius.sm,
                  cursor: "pointer",
                  fontSize: typography.fontSize.sm,
                }}
              >
                Sil
              </button>
            </div>
          ))
          )}

          <button
            onClick={() => addMapping(activeTab === "invoice" ? "invoiceMappings" : activeTab === "transaction" ? "transactionMappings" : "clientCompanyMappings")}
            style={{
              padding: `${spacing.sm} ${spacing.md}`,
              backgroundColor: colors.primary,
              color: colors.white,
              border: "none",
              borderRadius: borderRadius.sm,
              cursor: "pointer",
              fontSize: typography.fontSize.sm,
            }}
          >
            + Eşleştirme Ekle
          </button>
        </div>

        <div style={{ display: "flex", gap: spacing.sm, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: `${spacing.sm} ${spacing.md}`,
              backgroundColor: themeColors.gray[100],
              border: "none",
              borderRadius: borderRadius.sm,
              cursor: "pointer",
              fontSize: typography.fontSize.sm,
            }}
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            style={{
              padding: `${spacing.sm} ${spacing.md}`,
              backgroundColor: colors.primary,
              color: colors.white,
              border: "none",
              borderRadius: borderRadius.sm,
              cursor: "pointer",
              fontSize: typography.fontSize.sm,
            }}
          >
            {saveMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}



