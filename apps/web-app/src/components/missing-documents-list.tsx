"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { type DocumentRequirement, listClientCompanies } from "@repo/api-client";
import { formatDate } from "@/utils/date-utils";
import { colors, spacing, borderRadius, typography } from "@/styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";

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
  pending: colors.warning,
  received: colors.success,
  overdue: colors.danger,
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
  const { themeColors } = useTheme();

  // Fetch all client companies to map IDs to names
  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ["client-companies-for-documents"],
    queryFn: () => listClientCompanies({ pageSize: 1000 }),
  });

  // Create a map of clientCompanyId -> client name
  const clientNameMap = useMemo(() => {
    const map = new Map<string, string>();
    if (clientsData?.data?.data) {
      clientsData.data.data.forEach((client) => {
        map.set(client.id, client.name);
      });
    }
    return map;
  }, [clientsData]);

  const getClientName = (clientCompanyId: string | null | undefined): string => {
    if (!clientCompanyId) return "Bilinmeyen Müşteri";
    return clientNameMap.get(clientCompanyId) || clientCompanyId;
  };

  if (requirements.length === 0) {
    return (
      <div style={{ padding: spacing.lg, textAlign: "center", color: themeColors.text.secondary }}>
        Henüz belge gereksinimi bulunmuyor.
      </div>
    );
  }

  const isOverdue = (requirement: DocumentRequirement) => {
    if (requirement.status === "received") return false;
    return new Date(requirement.requiredByDate) < new Date();
  };

  return (
    <div style={{ backgroundColor: themeColors.white, borderRadius: borderRadius.md, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ backgroundColor: themeColors.gray[50] }}>
            <th style={{ padding: spacing.md, textAlign: "left", borderBottom: `1px solid ${themeColors.border}` }}>
              Müşteri
            </th>
            <th style={{ padding: spacing.md, textAlign: "left", borderBottom: `1px solid ${themeColors.border}` }}>
              Belge Tipi
            </th>
            <th style={{ padding: spacing.md, textAlign: "left", borderBottom: `1px solid ${themeColors.border}` }}>
              Gerekli Tarih
            </th>
            <th style={{ padding: spacing.md, textAlign: "left", borderBottom: `1px solid ${themeColors.border}` }}>
              Durum
            </th>
            <th style={{ padding: spacing.md, textAlign: "left", borderBottom: `1px solid ${themeColors.border}` }}>
              İşlemler
            </th>
          </tr>
        </thead>
        <tbody>
          {requirements.map((requirement) => (
            <tr
              key={requirement.id}
              style={{
                borderBottom: `1px solid ${themeColors.gray[200]}`,
                backgroundColor: isOverdue(requirement) ? themeColors.dangerLight : themeColors.white,
              }}
            >
              <td style={{ padding: spacing.md }}>
                <div style={{ fontWeight: typography.fontWeight.bold }}>
                  {clientsLoading ? (
                    <span style={{ color: themeColors.text.muted, fontStyle: "italic" }}>Yükleniyor...</span>
                  ) : (
                    getClientName(requirement.clientCompanyId)
                  )}
                </div>
                {requirement.description && (
                  <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.secondary, marginTop: spacing.xs }}>
                    {requirement.description.substring(0, 50)}
                    {requirement.description.length > 50 ? "..." : ""}
                  </div>
                )}
              </td>
              <td style={{ padding: spacing.md }}>
                {DOCUMENT_TYPE_LABELS[requirement.documentType] || requirement.documentType}
              </td>
              <td style={{ padding: spacing.md }}>
                <div>{formatDate(new Date(requirement.requiredByDate))}</div>
                {isOverdue(requirement) && (
                  <span style={{ color: colors.danger, fontSize: typography.fontSize.xs }}>(Vadesi Geçti)</span>
                )}
              </td>
              <td style={{ padding: spacing.md }}>
                <span
                  style={{
                    padding: `${spacing.xs} ${spacing.sm}`,
                    borderRadius: borderRadius.sm,
                    fontSize: typography.fontSize.xs,
                    backgroundColor: `${STATUS_COLORS[requirement.status]}20`,
                    color: STATUS_COLORS[requirement.status],
                  }}
                >
                  {STATUS_LABELS[requirement.status]}
                </span>
              </td>
              <td style={{ padding: spacing.md }}>
                <button
                  onClick={() => onEdit(requirement.id)}
                  style={{
                    padding: `${spacing.xs} ${spacing.sm}`,
                    backgroundColor: colors.primary,
                    color: colors.white,
                    border: "none",
                    borderRadius: borderRadius.sm,
                    cursor: "pointer",
                    fontSize: typography.fontSize.xs,
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
