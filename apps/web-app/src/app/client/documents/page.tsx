"use client";

import { useQuery } from "@tanstack/react-query";
import { listDocuments, getMyClientCompany } from "@repo/api-client";
import { Card } from "@/components/ui/Card";
import { colors, spacing, borderRadius, transitions, typography, shadows } from "@/styles/design-system";
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
  // Get client company for ReadOnly user
  const { data: clientCompanyData } = useQuery({
    queryKey: ["myClientCompany"],
    queryFn: () => getMyClientCompany(),
  });

  const clientCompany = clientCompanyData?.data;
  const clientCompanyId = clientCompany?.id || null;

  const { data: documentsData, isLoading } = useQuery({
    queryKey: ["client-documents", clientCompanyId],
    queryFn: () => listDocuments({ page: 1, pageSize: 50, clientCompanyId }),
    enabled: !!clientCompanyId,
  });

  const documents = documentsData?.data?.data || [];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: spacing.xl,
          flexWrap: "wrap",
          gap: spacing.md,
        }}
      >
        <div>
          <p
            style={{
              color: colors.text.secondary,
              fontSize: typography.fontSize.base,
              margin: 0,
            }}
          >
            <strong style={{ color: colors.text.primary }}>{documents.length}</strong> belge bulundu
          </p>
        </div>
        <Link
          href="/client/upload"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: spacing.sm,
            padding: `${spacing.md} ${spacing.xl}`,
            background: colors.gradients.primary,
            color: colors.white,
            textDecoration: "none",
            borderRadius: borderRadius.lg,
            fontWeight: typography.fontWeight.semibold,
            fontSize: typography.fontSize.base,
            boxShadow: shadows.md,
            transition: `all ${transitions.normal} ease`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = shadows.lg;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = shadows.md;
          }}
        >
          <span style={{ fontSize: "20px" }}>📤</span>
          <span>Yeni Belge Yükle</span>
        </Link>
      </div>

      {isLoading ? (
        <Card>
          <div
            style={{
              padding: spacing.xxl,
              textAlign: "center",
              color: colors.text.secondary,
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: spacing.md }}>⏳</div>
            <div style={{ fontSize: typography.fontSize.base }}>Belgeler yükleniyor...</div>
          </div>
        </Card>
      ) : documents.length === 0 ? (
        <Card>
          <div
            style={{
              padding: spacing.xxl,
              textAlign: "center",
              color: colors.text.secondary,
            }}
          >
            <div style={{ fontSize: "64px", marginBottom: spacing.lg }}>📁</div>
            <div
              style={{
                fontSize: typography.fontSize.xl,
                fontWeight: typography.fontWeight.semibold,
                color: colors.text.primary,
                marginBottom: spacing.sm,
              }}
            >
              Henüz belge bulunmuyor
            </div>
            <div style={{ marginBottom: spacing.lg, fontSize: typography.fontSize.base }}>
              İlk belgenizi yükleyerek başlayın
            </div>
            <Link
              href="/client/upload"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: spacing.sm,
                padding: `${spacing.md} ${spacing.xl}`,
                background: colors.gradients.primary,
                color: colors.white,
                textDecoration: "none",
                borderRadius: borderRadius.lg,
                fontWeight: typography.fontWeight.semibold,
                fontSize: typography.fontSize.base,
                boxShadow: shadows.md,
                transition: `all ${transitions.normal} ease`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = shadows.lg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = shadows.md;
              }}
            >
              <span style={{ fontSize: "20px" }}>📤</span>
              <span>İlk Belgenizi Yükleyin</span>
            </Link>
          </div>
        </Card>
      ) : (
        <Card>
          <div>
            {documents.map((doc: any, index: number) => (
              <Link
                key={doc.id}
                href={`/client/documents/${doc.id}`}
                style={{
                  display: "block",
                  padding: spacing.lg,
                  borderBottom: index < documents.length - 1 ? `1px solid ${colors.border}` : "none",
                  textDecoration: "none",
                  color: "inherit",
                  transition: `all ${transitions.normal} ease`,
                  borderRadius: borderRadius.md,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.gray[50];
                  e.currentTarget.style.transform = "translateX(4px)";
                  e.currentTarget.style.boxShadow = shadows.sm;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.transform = "translateX(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: spacing.md }}>
                    <div
                      style={{
                        fontSize: "32px",
                        padding: spacing.md,
                        backgroundColor: colors.primaryLighter,
                        borderRadius: borderRadius.lg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: "56px",
                        height: "56px",
                      }}
                    >
                      📄
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: typography.fontWeight.semibold,
                          marginBottom: spacing.xs,
                          color: colors.text.primary,
                          fontSize: typography.fontSize.base,
                        }}
                      >
                        {doc.filename}
                      </div>
                      <div
                        style={{
                          fontSize: typography.fontSize.sm,
                          color: colors.text.secondary,
                          display: "flex",
                          alignItems: "center",
                          gap: spacing.sm,
                          flexWrap: "wrap",
                        }}
                      >
                        <span>{formatDate(doc.uploadedAt)}</span>
                        <span>•</span>
                        <span
                          style={{
                            padding: `${spacing.xs} ${spacing.sm}`,
                            backgroundColor: colors.gray[100],
                            color: colors.text.secondary,
                            borderRadius: borderRadius.sm,
                            fontSize: typography.fontSize.xs,
                            fontWeight: typography.fontWeight.medium,
                          }}
                        >
                          {STATUS_LABELS[doc.status] || doc.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      color: colors.primary,
                      fontSize: typography.fontSize.xl,
                      fontWeight: typography.fontWeight.bold,
                      marginLeft: spacing.md,
                    }}
                  >
                    →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
