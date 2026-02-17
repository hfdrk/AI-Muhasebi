"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDocumentRequirement,
  createDocumentRequirement,
  updateDocumentRequirement,
  listClientCompanies,
} from "@repo/api-client";
import { colors, spacing, borderRadius } from "@/styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";

interface DocumentRequirementModalProps {
  isOpen: boolean;
  onClose: () => void;
  requirementId?: string | null;
  onSuccess?: () => void;
}

export default function DocumentRequirementModal({
  isOpen,
  onClose,
  requirementId,
  onSuccess,
}: DocumentRequirementModalProps) {
  const queryClient = useQueryClient();
  const { themeColors } = useTheme();
  const [clientCompanyId, setClientCompanyId] = useState<string>("");
  const [documentType, setDocumentType] = useState<string>("INVOICE");
  const [requiredByDate, setRequiredByDate] = useState("");
  const [description, setDescription] = useState("");

  const { data: requirementData } = useQuery({
    queryKey: ["document-requirement", requirementId],
    queryFn: () => getDocumentRequirement(requirementId!),
    enabled: !!requirementId && isOpen,
  });

  const { data: clientsData } = useQuery({
    queryKey: ["client-companies"],
    queryFn: () => listClientCompanies({ page: 1, pageSize: 100 }),
    enabled: isOpen,
  });

  useEffect(() => {
    if (requirementData?.data) {
      const req = requirementData.data;
      setClientCompanyId(req.clientCompanyId);
      setDocumentType(req.documentType);
      setRequiredByDate(new Date(req.requiredByDate).toISOString().split("T")[0]);
      setDescription(req.description || "");
    } else if (!requirementId) {
      // Reset for new requirement
      setClientCompanyId("");
      setDocumentType("INVOICE");
      setRequiredByDate("");
      setDescription("");
    }
  }, [requirementData, requirementId]);

  const createMutation = useMutation({
    mutationFn: createDocumentRequirement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-requirements"] });
      onSuccess?.();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateDocumentRequirement(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-requirements"] });
      onSuccess?.();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const requirementData = {
      clientCompanyId,
      documentType,
      requiredByDate: requiredByDate || new Date().toISOString(),
      description: description || null,
    };

    if (requirementId) {
      await updateMutation.mutateAsync({ id: requirementId, data: requirementData });
    } else {
      await createMutation.mutateAsync(requirementData);
    }
  };

  if (!isOpen) return null;

  const clients = clientsData?.data?.data || [];

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
          backgroundColor: themeColors.white,
          borderRadius: borderRadius.md,
          padding: spacing.lg,
          maxWidth: "600px",
          width: "90%",
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: "20px" }}>
          {requirementId ? "Belge Gereksinimini Düzenle" : "Yeni Belge Gereksinimi"}
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: spacing.md }}>
            <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: "bold" }}>
              Müşteri Şirketi *
            </label>
            <select
              value={clientCompanyId}
              onChange={(e) => setClientCompanyId(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "8px",
                border: `1px solid ${themeColors.border}`,
                borderRadius: borderRadius.sm,
              }}
            >
              <option value="">Seçiniz</option>
              {clients.map((client: any) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: spacing.md }}>
            <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: "bold" }}>
              Belge Tipi *
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "8px",
                border: `1px solid ${themeColors.border}`,
                borderRadius: borderRadius.sm,
              }}
            >
              <option value="INVOICE">Fatura</option>
              <option value="BANK_STATEMENT">Banka Ekstresi</option>
              <option value="RECEIPT">Fiş</option>
              <option value="CONTRACT">Sözleşme</option>
              <option value="OTHER">Diğer</option>
            </select>
          </div>

          <div style={{ marginBottom: spacing.md }}>
            <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: "bold" }}>
              Gerekli Tarih *
            </label>
            <input
              type="date"
              value={requiredByDate}
              onChange={(e) => setRequiredByDate(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "8px",
                border: `1px solid ${themeColors.border}`,
                borderRadius: borderRadius.sm,
              }}
            />
          </div>

          <div style={{ marginBottom: spacing.md }}>
            <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: "bold" }}>
              Açıklama
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              style={{
                width: "100%",
                padding: "8px",
                border: `1px solid ${themeColors.border}`,
                borderRadius: borderRadius.sm,
              }}
            />
          </div>

          <div style={{ display: "flex", gap: spacing.sm, justifyContent: "flex-end", marginTop: spacing.lg }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: `${spacing.sm} ${spacing.md}`,
                backgroundColor: themeColors.gray[100],
                border: "none",
                borderRadius: borderRadius.sm,
                cursor: "pointer",
              }}
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              style={{
                padding: `${spacing.sm} ${spacing.md}`,
                backgroundColor: colors.primary,
                color: colors.white,
                border: "none",
                borderRadius: borderRadius.sm,
                cursor: "pointer",
              }}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Kaydediliyor..."
                : requirementId
                ? "Güncelle"
                : "Oluştur"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}



