"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSavedFilter } from "@repo/api-client";
import { toast } from "@/lib/toast";
import { colors, spacing, borderRadius } from "@/styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";

// Use hardcoded strings to avoid i18n import issues
const savedFiltersI18n = {
  name: "Filtre Adı",
  setAsDefault: "Varsayılan olarak ayarla",
  save: "Kaydet",
  cancel: "İptal",
  saveFilter: "Filtreyi Kaydet",
  filterName: "Filtre Adı",
  filterNamePlaceholder: "Filtre adını girin",
  saved: "Filtre başarıyla kaydedildi",
};
const commonI18n = {
  labels: {
    loading: "Yükleniyor...",
  },
  buttons: {
    cancel: "İptal",
  },
};

interface SaveFilterModalProps {
  target: string;
  currentFilters: Record<string, any>;
  onClose: () => void;
}

export function SaveFilterModal({
  target,
  currentFilters,
  onClose,
}: SaveFilterModalProps) {
  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const queryClient = useQueryClient();
  const { themeColors } = useTheme();

  const createMutation = useMutation({
    mutationFn: (data: { name: string; target: string; filters: Record<string, any>; isDefault?: boolean }) =>
      createSavedFilter(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedFilters", target] });
      onClose();
      toast.success(savedFiltersI18n.saved);
    },
    onError: (error: any) => {
      toast.error(error.message || "Filtre kaydedilirken bir hata oluştu.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warning("Filtre adı gerekli.");
      return;
    }

    createMutation.mutate({
      name: name.trim(),
      target,
      filters: currentFilters,
      isDefault: isDefault || undefined,
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: themeColors.white,
          borderRadius: borderRadius.md,
          padding: spacing.lg,
          width: "90%",
          maxWidth: "400px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: spacing.md }}>
          {savedFiltersI18n.saveFilter}
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: spacing.md }}>
            <label
              style={{
                display: "block",
                marginBottom: spacing.xs,
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              {savedFiltersI18n.filterName}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={savedFiltersI18n.filterNamePlaceholder}
              style={{
                width: "100%",
                padding: `${spacing.sm} 12px`,
                border: `1px solid ${themeColors.border}`,
                borderRadius: borderRadius.sm,
                fontSize: "14px",
              }}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: spacing.md }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                style={{ marginRight: spacing.sm }}
              />
              {savedFiltersI18n.setAsDefault}
            </label>
          </div>

          <div
            style={{
              display: "flex",
              gap: spacing.sm,
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: `${spacing.sm} ${spacing.md}`,
                border: `1px solid ${themeColors.border}`,
                borderRadius: borderRadius.sm,
                backgroundColor: themeColors.white,
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              {commonI18n.buttons.cancel}
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || !name.trim()}
              style={{
                padding: `${spacing.sm} ${spacing.md}`,
                border: "none",
                borderRadius: borderRadius.sm,
                backgroundColor: colors.primary,
                color: colors.white,
                cursor: createMutation.isPending || !name.trim() ? "not-allowed" : "pointer",
                fontSize: "14px",
                opacity: createMutation.isPending || !name.trim() ? 0.6 : 1,
              }}
            >
              {createMutation.isPending ? "Kaydediliyor..." : savedFiltersI18n.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}




