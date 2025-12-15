"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
  tenantId,
}: IntegrationFieldMappingModalProps) {
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
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
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
      console.log("🔍 API Response:", data);
      return data;
    },
    enabled: isOpen && !!integrationId,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const { data: suggestionsData } = useQuery({
    queryKey: ["integrationMappingSuggestions", integrationId],
    queryFn: async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
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
      console.log("📦 Loaded mappings from API:", mappingsData.data);
      setMappings(mappingsData.data);
    } else if (mappingsData) {
      console.log("⚠️ Mappings data structure:", mappingsData);
    }
  }, [mappingsData]);

  const saveMutation = useMutation({
    mutationFn: async (mappingsToSave: IntegrationMappingConfig) => {
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
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
          zIndex: 1000,
        }}
        onClick={onClose}
      >
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "8px",
            padding: "24px",
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
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          padding: "24px",
          maxWidth: "800px",
          width: "90%",
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: "20px" }}>Alan Eşleştirme</h2>

        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          <button
            onClick={() => setActiveTab("invoice")}
            style={{
              padding: "8px 16px",
              border: "none",
              borderRadius: "4px",
              backgroundColor: activeTab === "invoice" ? "#0066cc" : "#f0f0f0",
              color: activeTab === "invoice" ? "white" : "black",
              cursor: "pointer",
            }}
          >
            Fatura Alanları
          </button>
          <button
            onClick={() => setActiveTab("transaction")}
            style={{
              padding: "8px 16px",
              border: "none",
              borderRadius: "4px",
              backgroundColor: activeTab === "transaction" ? "#0066cc" : "#f0f0f0",
              color: activeTab === "transaction" ? "white" : "black",
              cursor: "pointer",
            }}
          >
            İşlem Alanları
          </button>
          <button
            onClick={() => setActiveTab("client")}
            style={{
              padding: "8px 16px",
              border: "none",
              borderRadius: "4px",
              backgroundColor: activeTab === "client" ? "#0066cc" : "#f0f0f0",
              color: activeTab === "client" ? "white" : "black",
              cursor: "pointer",
            }}
          >
            Müşteri Alanları
          </button>
        </div>

        {suggestionsData?.data && (
          <div style={{ marginBottom: "16px" }}>
            <button
              onClick={applySuggestions}
              style={{
                padding: "8px 16px",
                backgroundColor: "#10b981",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Önerilen Eşleştirmeleri Uygula
            </button>
          </div>
        )}

        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr auto", gap: "8px", marginBottom: "8px" }}>
            <strong>Kaynak Alan</strong>
            <strong>Hedef Alan</strong>
            <strong>Dönüşüm</strong>
            <div></div>
          </div>

          {getCurrentMappings().length === 0 ? (
            <div style={{ padding: "16px", textAlign: "center", color: "#666" }}>
              Henüz eşleştirme yapılmamış. Aşağıdaki butona tıklayarak yeni eşleştirme ekleyebilirsiniz.
            </div>
          ) : (
            getCurrentMappings().map((mapping, index) => (
            <div key={index} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr auto", gap: "8px", marginBottom: "8px" }}>
              <select
                value={mapping.sourceField}
                onChange={(e) => updateMapping(activeTab === "invoice" ? "invoiceMappings" : activeTab === "transaction" ? "transactionMappings" : "clientCompanyMappings", index, "sourceField", e.target.value)}
                style={{ padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
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
                style={{ padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
              />
              <select
                value={mapping.transformation || ""}
                onChange={(e) => updateMapping(activeTab === "invoice" ? "invoiceMappings" : activeTab === "transaction" ? "transactionMappings" : "clientCompanyMappings", index, "transformation", e.target.value)}
                style={{ padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
              >
                <option value="">Yok</option>
                <option value="uppercase">Büyük Harf</option>
                <option value="lowercase">Küçük Harf</option>
                <option value="trim">Boşluk Temizle</option>
              </select>
              <button
                onClick={() => removeMapping(activeTab === "invoice" ? "invoiceMappings" : activeTab === "transaction" ? "transactionMappings" : "clientCompanyMappings", index)}
                style={{
                  padding: "8px",
                  backgroundColor: "#dc2626",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
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
              padding: "8px 16px",
              backgroundColor: "#0066cc",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            + Eşleştirme Ekle
          </button>
        </div>

        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              backgroundColor: "#f0f0f0",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            style={{
              padding: "8px 16px",
              backgroundColor: "#0066cc",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
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



