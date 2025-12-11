"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listDocumentRequirements,
  getDocumentRequirement,
  type DocumentRequirement,
} from "@repo/api-client";
import { PageHeader } from "@/components/ui/PageHeader";
import DocumentRequirementModal from "@/components/document-requirement-modal";
import MissingDocumentsList from "@/components/missing-documents-list";

export default function MissingDocumentsPage() {
  const [selectedRequirementId, setSelectedRequirementId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState<{
    status?: "pending" | "received" | "overdue";
    clientCompanyId?: string;
    documentType?: string;
    overdue?: boolean;
  }>({});

  const queryClient = useQueryClient();

  const { data: requirementsData, isLoading } = useQuery({
    queryKey: ["document-requirements", filters],
    queryFn: () => listDocumentRequirements(filters),
  });

  const handleCreateRequirement = () => {
    setSelectedRequirementId(null);
    setIsModalOpen(true);
  };

  const handleEditRequirement = (requirementId: string) => {
    setSelectedRequirementId(requirementId);
    setIsModalOpen(true);
  };

  const requirements = requirementsData?.data?.data || [];

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      <PageHeader
        title="Eksik Belgeler"
        actions={
          <button
            onClick={handleCreateRequirement}
            style={{
              padding: "10px 20px",
              backgroundColor: "#0066cc",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            + Yeni Belge Gereksinimi
          </button>
        }
      />

      <div style={{ marginTop: "24px" }}>
        <div style={{ marginBottom: "16px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <select
            value={filters.status || ""}
            onChange={(e) =>
              setFilters({ ...filters, status: e.target.value as any || undefined })
            }
            style={{ padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
          >
            <option value="">Tüm Durumlar</option>
            <option value="pending">Beklemede</option>
            <option value="received">Alındı</option>
            <option value="overdue">Vadesi Geçti</option>
          </select>

          <select
            value={filters.documentType || ""}
            onChange={(e) =>
              setFilters({ ...filters, documentType: e.target.value || undefined })
            }
            style={{ padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
          >
            <option value="">Tüm Belge Tipleri</option>
            <option value="INVOICE">Fatura</option>
            <option value="BANK_STATEMENT">Banka Ekstresi</option>
            <option value="RECEIPT">Fiş</option>
            <option value="CONTRACT">Sözleşme</option>
            <option value="OTHER">Diğer</option>
          </select>

          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              checked={filters.overdue || false}
              onChange={(e) =>
                setFilters({ ...filters, overdue: e.target.checked || undefined })
              }
            />
            Sadece Vadesi Geçenler
          </label>
        </div>

        {isLoading ? (
          <div style={{ padding: "24px", textAlign: "center" }}>Yükleniyor...</div>
        ) : (
          <MissingDocumentsList
            requirements={requirements}
            onEdit={handleEditRequirement}
          />
        )}
      </div>

      {isModalOpen && (
        <DocumentRequirementModal
          requirementId={selectedRequirementId}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedRequirementId(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["document-requirements"] });
            setIsModalOpen(false);
            setSelectedRequirementId(null);
          }}
        />
      )}
    </div>
  );
}
