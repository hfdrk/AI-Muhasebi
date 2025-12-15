"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dbOptimizationClient } from "@repo/api-client";
import Link from "next/link";
import { Card } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { Modal } from "../../../../components/ui/Modal";
import { PageTransition } from "../../../../components/ui/PageTransition";
import { colors, spacing, borderRadius, shadows, typography, transitions } from "../../../../styles/design-system";
import { toast } from "../../../../lib/toast";

const IMPACT_COLORS: Record<string, { bg: string; text: string }> = {
  high: { bg: colors.dangerLight, text: colors.dangerDark },
  medium: { bg: colors.warningLight, text: colors.warningDark },
  low: { bg: colors.infoLight, text: colors.info },
};

const TYPE_LABELS: Record<string, string> = {
  btree: "B-Tree",
  gin: "GIN",
  gist: "GiST",
  hash: "Hash",
};

export default function IndexManagementPage() {
  const queryClient = useQueryClient();
  const [createAllModal, setCreateAllModal] = useState(false);

  // Fetch index recommendations
  const { data: recommendationsData, isLoading: recommendationsLoading } = useQuery({
    queryKey: ["index-recommendations"],
    queryFn: () => dbOptimizationClient.getIndexRecommendations(),
  });

  const recommendations = recommendationsData?.data || [];

  // Create indexes mutation
  const createIndexesMutation = useMutation({
    mutationFn: () => dbOptimizationClient.createRecommendedIndexes(),
    onSuccess: (data) => {
      const message = `İndeks oluşturma tamamlandı! Oluşturulan: ${data.data.created}, Atlanan: ${data.data.skipped}, Hatalar: ${data.data.errors.length}`;
      if (data.data.errors.length > 0) {
        toast.warning(message);
      } else {
        toast.success(message);
      }
      queryClient.invalidateQueries({ queryKey: ["index-recommendations"] });
    },
    onError: (error: Error) => {
      toast.error(`Hata: ${error.message}`);
    },
  });

  return (
    <PageTransition>
      <div
        style={{
        padding: spacing.xxl,
        maxWidth: "1600px",
        margin: "0 auto",
        backgroundColor: colors.gray[50],
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <div
        style={{
          marginBottom: spacing.xl,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: spacing.md, marginBottom: spacing.sm }}>
          <Button variant="ghost" asLink href="/veritabani-optimizasyonu" icon="←">
            Geri
          </Button>
        </div>
        <h1
          style={{
            fontSize: typography.fontSize["3xl"],
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
            marginBottom: spacing.sm,
          }}
        >
          İndeks Yönetimi
        </h1>
        <p
          style={{
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
            lineHeight: typography.lineHeight.relaxed,
            margin: 0,
          }}
        >
          Veritabanı performansını artırmak için önerilen indeksleri görüntüleyin ve oluşturun.
        </p>
      </div>

      {/* Create All Button */}
      {recommendations.length > 0 && (
        <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.xl,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.text.primary,
                  marginBottom: spacing.xs,
                }}
              >
                Tüm Önerilen İndeksleri Oluştur
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.sm,
                  color: colors.text.secondary,
                }}
              >
                {recommendations.length} önerilen indeks bulundu.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => setCreateAllModal(true)}
              loading={createIndexesMutation.isPending}
            >
              📑 Tümünü Oluştur
            </Button>
          </div>
        </Card>
      )}

      {/* Recommendations List */}
      {recommendationsLoading ? (
        <Card variant="elevated">
          <div style={{ padding: spacing.xl, textAlign: "center" }}>
            <div
              style={{
                display: "inline-block",
                width: "48px",
                height: "48px",
                border: `4px solid ${colors.gray[200]}`,
                borderTopColor: colors.primary,
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
          </div>
        </Card>
      ) : recommendations.length === 0 ? (
        <Card variant="elevated">
          <div style={{ padding: spacing.xl, textAlign: "center" }}>
            <p style={{ color: colors.text.secondary, margin: 0 }}>
              Önerilen indeks bulunmamaktadır.
            </p>
          </div>
        </Card>
      ) : (
        <Card variant="elevated" title={`İndeks Önerileri (${recommendations.length})`}>
          <div style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
            {recommendations.map((rec, index) => (
              <div
                key={index}
                style={{
                  padding: spacing.md,
                  borderRadius: borderRadius.md,
                  backgroundColor: colors.gray[50],
                  border: `1px solid ${colors.border}`,
                  borderLeft: `4px solid ${IMPACT_COLORS[rec.estimatedImpact].text}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: spacing.xs,
                  }}
                >
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: typography.fontSize.base,
                        fontWeight: typography.fontWeight.semibold,
                        color: colors.text.primary,
                      }}
                    >
                      {rec.table}
                    </p>
                    <p
                      style={{
                        margin: `${spacing.xs} 0 0 0`,
                        fontSize: typography.fontSize.sm,
                        color: colors.text.secondary,
                      }}
                    >
                      Sütunlar: {rec.columns.join(", ")}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: typography.fontSize.xs,
                      padding: `${spacing.xs} ${spacing.sm}`,
                      borderRadius: borderRadius.sm,
                      backgroundColor: IMPACT_COLORS[rec.estimatedImpact].bg,
                      color: IMPACT_COLORS[rec.estimatedImpact].text,
                      fontWeight: typography.fontWeight.medium,
                    }}
                  >
                    {rec.estimatedImpact === "high"
                      ? "Yüksek Etki"
                      : rec.estimatedImpact === "medium"
                      ? "Orta Etki"
                      : "Düşük Etki"}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: spacing.md,
                    marginTop: spacing.sm,
                  }}
                >
                  <span
                    style={{
                      fontSize: typography.fontSize.xs,
                      padding: `${spacing.xs} ${spacing.sm}`,
                      borderRadius: borderRadius.sm,
                      backgroundColor: colors.primaryPastel,
                      color: colors.primary,
                      fontWeight: typography.fontWeight.medium,
                    }}
                  >
                    {TYPE_LABELS[rec.type] || rec.type}
                  </span>
                </div>
                <p
                  style={{
                    margin: `${spacing.sm} 0 0 0`,
                    fontSize: typography.fontSize.sm,
                    color: colors.text.secondary,
                    lineHeight: typography.lineHeight.relaxed,
                  }}
                >
                  {rec.reason}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>

      <Modal
        isOpen={createAllModal}
        onClose={() => setCreateAllModal(false)}
        title="Tüm İndeksleri Oluştur"
        size="sm"
      >
        <div style={{ marginBottom: spacing.lg }}>
          <p>Tüm önerilen indeksleri oluşturmak istediğinize emin misiniz? Bu işlem biraz zaman alabilir.</p>
        </div>
        <div style={{ display: "flex", gap: spacing.md, justifyContent: "flex-end" }}>
          <Button variant="outline" onClick={() => setCreateAllModal(false)}>
            İptal
          </Button>
          <Button
            onClick={() => {
              createIndexesMutation.mutate();
              setCreateAllModal(false);
            }}
            loading={createIndexesMutation.isPending}
          >
            Oluştur
          </Button>
        </div>
      </Modal>
    </div>
    </PageTransition>
  );
}

