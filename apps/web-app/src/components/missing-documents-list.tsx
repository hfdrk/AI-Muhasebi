"use client";

import { type DocumentRequirement } from "@repo/api-client";
import { formatDate } from "@/utils/date-utils";

interface MissingDocumentsListProps {
  requirements: DocumentRequirement[];
  onEdit: (requirementId: string) => void;
}

const STATUS_LABELS: Record<DocumentRequirement["status"], string> = {
  pending: "Beklemede",
  received: "Alındı",
  overdue: "Vadesi Geçti",
};

const STATUS_COLORS: Record<DocumentRequirement["status"], string> = {
  pending: "#f59e0b",
  received: "#10b981",
  overdue: "#dc2626",
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  INVOICE: "Fatura",
  BANK_STATEMENT: "Banka Ekstresi",
  RECEIPT: "Fiş",
  CONTRACT: "Sözleşme",
  OTHER: "Diğer",
};

export default function MissingDocumentsList({
  requirements,
  onEdit,
}: MissingDocumentsListProps) {
  if (requirements.length === 0) {
    return (
      <div style={{ padding: "24px", textAlign: "center", color: "#666" }}>
        Henüz belge gereksinimi bulunmuyor.
      </div>
    );
  }

  const isOverdue = (requirement: DocumentRequirement) => {
    if (requirement.status === "received") return false;
    return new Date(requirement.requiredByDate) < new Date();
  };

  return (
    <div style={{ backgroundColor: "white", borderRadius: "8px", overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ backgroundColor: "#f5f5f5" }}>
            <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>
              Müşteri
            </th>
            <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>
              Belge Tipi
            </th>
            <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>
              Gerekli Tarih
            </th>
            <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>
              Durum
            </th>
            <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>
              İşlemler
            </th>
          </tr>
        </thead>
        <tbody>
          {requirements.map((requirement) => (
            <tr
              key={requirement.id}
              style={{
                borderBottom: "1px solid #eee",
                backgroundColor: isOverdue(requirement) ? "#fee2e2" : "white",
              }}
            >
              <td style={{ padding: "12px" }}>
                <div style={{ fontWeight: "bold" }}>
                  {requirement.clientCompanyId} {/* TODO: Fetch client name */}
                </div>
                {requirement.description && (
                  <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                    {requirement.description.substring(0, 50)}
                    {requirement.description.length > 50 ? "..." : ""}
                  </div>
                )}
              </td>
              <td style={{ padding: "12px" }}>
                {DOCUMENT_TYPE_LABELS[requirement.documentType] || requirement.documentType}
              </td>
              <td style={{ padding: "12px" }}>
                <div>{formatDate(new Date(requirement.requiredByDate))}</div>
                {isOverdue(requirement) && (
                  <span style={{ color: "#dc2626", fontSize: "12px" }}>(Vadesi Geçti)</span>
                )}
              </td>
              <td style={{ padding: "12px" }}>
                <span
                  style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    backgroundColor: `${STATUS_COLORS[requirement.status]}20`,
                    color: STATUS_COLORS[requirement.status],
                  }}
                >
                  {STATUS_LABELS[requirement.status]}
                </span>
              </td>
              <td style={{ padding: "12px" }}>
                <button
                  onClick={() => onEdit(requirement.id)}
                  style={{
                    padding: "4px 8px",
                    backgroundColor: "#0066cc",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  Düzenle
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
