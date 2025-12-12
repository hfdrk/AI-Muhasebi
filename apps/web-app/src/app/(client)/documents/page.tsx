"use client";

import { useQuery } from "@tanstack/react-query";
import { listDocuments, getCurrentUser } from "@repo/api-client";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { colors, spacing } from "@/styles/design-system";
import Link from "next/link";

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("tr-TR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

const STATUS_LABELS: Record<string, string> = {
  UPLOADED: "Yüklendi",
  PROCESSING: "İşleniyor",
  PROCESSED: "İşlendi",
  FAILED: "Hata",
};

export default function ClientDocumentsPage() {
  const { data: userData } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => getCurrentUser(),
  });

  const currentTenant = userData?.data?.tenants?.find((t: any) => t.status === "active");
  const clientCompanyId = currentTenant?.clientCompanyId;

  const { data: documentsData, isLoading } = useQuery({
    queryKey: ["client-documents", clientCompanyId],
    queryFn: () => listDocuments({ page: 1, pageSize: 50, clientCompanyId }),
    enabled: !!clientCompanyId,
  });

  const documents = documentsData?.data?.data || [];

  return (
    <div>
      <PageHeader title="Belgelerim" />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg }}>
        <p style={{ color: colors.text.secondary }}>
          {documents.length} belge bulundu
        </p>
        <Link
          href="/client/upload"
          style={{
            padding: `${spacing.sm} ${spacing.lg}`,
            backgroundColor: colors.primary,
            color: colors.white,
            textDecoration: "none",
            borderRadius: "6px",
            fontWeight: "medium",
          }}
        >
          + Yeni Belge Yükle
        </Link>
      </div>

      {isLoading ? (
        <div>Yükleniyor...</div>
      ) : documents.length === 0 ? (
        <Card>
          <div style={{ padding: spacing.xl, textAlign: "center", color: colors.text.secondary }}>
            <div style={{ fontSize: "48px", marginBottom: spacing.md }}>📁</div>
            <div style={{ marginBottom: spacing.sm }}>Henüz belge bulunmuyor.</div>
            <Link href="/client/upload" style={{ color: colors.primary, textDecoration: "none" }}>
              İlk belgenizi yükleyin →
            </Link>
          </div>
        </Card>
      ) : (
        <Card>
          <div>
            {documents.map((doc: any) => (
              <Link
                key={doc.id}
                href={`/client/documents/${doc.id}`}
                style={{
                  display: "block",
                  padding: spacing.md,
                  borderBottom: `1px solid ${colors.gray[200]}`,
                  textDecoration: "none",
                  color: "inherit",
                  transition: "background-color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.gray[50];
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "medium", marginBottom: spacing.xs, color: colors.text.primary }}>
                      {doc.filename}
                    </div>
                    <div style={{ fontSize: "14px", color: colors.text.secondary }}>
                      {formatDate(doc.uploadedAt)} • {STATUS_LABELS[doc.status] || doc.status}
                    </div>
                  </div>
                  <div style={{ color: colors.primary, fontSize: "14px" }}>→</div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}


