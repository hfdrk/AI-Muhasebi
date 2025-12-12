"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listSavedFilters,
  updateSavedFilter,
  deleteSavedFilter,
  type SavedFilter,
} from "@repo/api-client";
import { savedFilters as savedFiltersI18n } from "@repo/i18n";
import { SaveFilterModal } from "./save-filter-modal";

interface SavedFiltersDropdownProps {
  target: string;
  currentFilters: Record<string, any>;
  onFilterSelect: (filters: Record<string, any>) => void;
}

export function SavedFiltersDropdown({
  target,
  currentFilters,
  onFilterSelect,
}: SavedFiltersDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: savedFiltersData } = useQuery({
    queryKey: ["savedFilters", target],
    queryFn: () => listSavedFilters(target),
  });

  const savedFilters = savedFiltersData?.data || [];
  const defaultFilter = savedFilters.find((f) => f.isDefault);

  const updateMutation = useMutation({
    mutationFn: (id: string) =>
      updateSavedFilter(id, { isDefault: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedFilters", target] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSavedFilter(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedFilters", target] });
    },
  });

  const handleSelectFilter = (filter: SavedFilter) => {
    onFilterSelect(filter.filters);
    setIsOpen(false);
  };

  const handleSetDefault = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateMutation.mutate(id);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(savedFiltersI18n.deleteConfirm)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <>
      <div style={{ position: "relative", display: "inline-block" }}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            backgroundColor: "white",
            cursor: "pointer",
            fontSize: "14px",
            minWidth: "200px",
            textAlign: "left",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{savedFiltersI18n.title}</span>
          <span style={{ fontSize: "12px" }}>▼</span>
        </button>

        {isOpen && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginTop: "4px",
              backgroundColor: "white",
              border: "1px solid #ddd",
              borderRadius: "4px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              zIndex: 1000,
              minWidth: "250px",
              maxHeight: "400px",
              overflowY: "auto",
            }}
          >
            {savedFilters.length === 0 ? (
              <div style={{ padding: "16px", textAlign: "center", color: "#666" }}>
                {savedFiltersI18n.emptyState}
              </div>
            ) : (
              <>
                {savedFilters.map((filter) => (
                  <div
                    key={filter.id}
                    onClick={() => handleSelectFilter(filter)}
                    style={{
                      padding: "12px",
                      borderBottom: "1px solid #eee",
                      cursor: "pointer",
                      transition: "background-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#f5f5f5";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "4px",
                      }}
                    >
                      <div style={{ fontWeight: filter.isDefault ? 600 : 400 }}>
                        {filter.name}
                        {filter.isDefault && (
                          <span style={{ marginLeft: "8px", fontSize: "12px", color: "#0066cc" }}>
                            (Varsayılan)
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        marginTop: "8px",
                      }}
                    >
                      {!filter.isDefault && (
                        <button
                          onClick={(e) => handleSetDefault(filter.id, e)}
                          disabled={updateMutation.isPending}
                          style={{
                            padding: "4px 8px",
                            fontSize: "12px",
                            border: "1px solid #ddd",
                            borderRadius: "4px",
                            backgroundColor: "white",
                            cursor: "pointer",
                          }}
                        >
                          {savedFiltersI18n.setDefault}
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDelete(filter.id, e)}
                        disabled={deleteMutation.isPending}
                        style={{
                          padding: "4px 8px",
                          fontSize: "12px",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          backgroundColor: "white",
                          cursor: "pointer",
                          color: "#d32f2f",
                        }}
                      >
                        {savedFiltersI18n.delete}
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
            <div style={{ padding: "8px", borderTop: "1px solid #eee" }}>
              <button
                onClick={() => {
                  setShowSaveModal(true);
                  setIsOpen(false);
                }}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #0066cc",
                  borderRadius: "4px",
                  backgroundColor: "#0066cc",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                {savedFiltersI18n.saveFilter}
              </button>
            </div>
          </div>
        )}
      </div>

      {showSaveModal && (
        <SaveFilterModal
          target={target}
          currentFilters={currentFilters}
          onClose={() => setShowSaveModal(false)}
        />
      )}

      {defaultFilter && (
        <div
          style={{
            marginTop: "8px",
            padding: "8px",
            backgroundColor: "#e3f2fd",
            borderRadius: "4px",
            fontSize: "14px",
            color: "#1976d2",
          }}
        >
          {savedFiltersI18n.defaultApplied.replace("{name}", defaultFilter.name)}
        </div>
      )}
    </>
  );
}




