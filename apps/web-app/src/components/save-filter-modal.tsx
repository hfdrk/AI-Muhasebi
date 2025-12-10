"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSavedFilter } from "@repo/api-client";
import { savedFilters as savedFiltersI18n, common as commonI18n } from "@repo/i18n";

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

  const createMutation = useMutation({
    mutationFn: (data: { name: string; target: string; filters: Record<string, any>; isDefault?: boolean }) =>
      createSavedFilter(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedFilters", target] });
      onClose();
      alert(savedFiltersI18n.saved);
    },
    onError: (error: any) => {
      alert(error.message || "Filtre kaydedilirken bir hata oluştu.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Filtre adı gerekli.");
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
          backgroundColor: "white",
          borderRadius: "8px",
          padding: "24px",
          width: "90%",
          maxWidth: "400px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: "16px" }}>
          {savedFiltersI18n.saveFilter}
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "4px",
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
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
              }}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
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
                style={{ marginRight: "8px" }}
              />
              {savedFiltersI18n.setAsDefault}
            </label>
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 16px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                backgroundColor: "white",
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
                padding: "8px 16px",
                border: "none",
                borderRadius: "4px",
                backgroundColor: "#0066cc",
                color: "white",
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


