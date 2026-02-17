"use client";

import { useQuery } from "@tanstack/react-query";
import { dbOptimizationClient } from "@repo/api-client";
import { Card } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { colors, spacing, typography } from "../../../../styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";

export default function TableSizesPage() {
  const { themeColors } = useTheme();
  // Fetch table sizes
  const { data: sizesData, isLoading: sizesLoading } = useQuery({
    queryKey: ["table-sizes"],
    queryFn: () => dbOptimizationClient.analyzeTableSizes(),
  });

  const sizes = sizesData?.data || [];

  return (
    <div
      style={{
        padding: spacing.xxl,
        maxWidth: "1600px",
        margin: "0 auto",
        backgroundColor: themeColors.gray[50],
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
            color: themeColors.text.primary,
            marginBottom: spacing.sm,
          }}
        >
          Tablo Boyutları
        </h1>
        <p
          style={{
            fontSize: typography.fontSize.base,
            color: themeColors.text.secondary,
            lineHeight: typography.lineHeight.relaxed,
            margin: 0,
          }}
        >
          Veritabanı tablolarının boyutlarını, satır sayılarını ve indeks boyutlarını analiz edin.
        </p>
      </div>

      {/* Table Sizes */}
      {sizesLoading ? (
        <Card variant="elevated">
          <div style={{ padding: spacing.xl, textAlign: "center" }}>
            <div
              style={{
                display: "inline-block",
                width: "48px",
                height: "48px",
                border: `4px solid ${themeColors.gray[200]}`,
                borderTopColor: colors.primary,
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
          </div>
        </Card>
      ) : sizes.length === 0 ? (
        <Card variant="elevated">
          <div style={{ padding: spacing.xl, textAlign: "center" }}>
            <p style={{ color: themeColors.text.secondary, margin: 0 }}>
              Tablo boyutu bilgisi bulunamadı.
            </p>
          </div>
        </Card>
      ) : (
        <Card variant="elevated" title={`Tablo Boyutları (${sizes.length} tablo)`}>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr style={{ borderBottom: `2px solid ${themeColors.border}` }}>
                  <th
                    style={{
                      padding: spacing.md,
                      textAlign: "left",
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.semibold,
                      color: themeColors.text.primary,
                    }}
                  >
                    Tablo
                  </th>
                  <th
                    style={{
                      padding: spacing.md,
                      textAlign: "right",
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.semibold,
                      color: themeColors.text.primary,
                    }}
                  >
                    Boyut
                  </th>
                  <th
                    style={{
                      padding: spacing.md,
                      textAlign: "right",
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.semibold,
                      color: themeColors.text.primary,
                    }}
                  >
                    Satır Sayısı
                  </th>
                  <th
                    style={{
                      padding: spacing.md,
                      textAlign: "right",
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.semibold,
                      color: themeColors.text.primary,
                    }}
                  >
                    İndeks Boyutu
                  </th>
                </tr>
              </thead>
              <tbody>
                {sizes.map((size, index) => (
                  <tr
                    key={index}
                    style={{
                      borderBottom: `1px solid ${themeColors.border}`,
                    }}
                  >
                    <td
                      style={{
                        padding: spacing.md,
                        fontFamily: "monospace",
                        fontSize: typography.fontSize.sm,
                      }}
                    >
                      {size.table}
                    </td>
                    <td style={{ padding: spacing.md, textAlign: "right" }}>{size.size}</td>
                    <td style={{ padding: spacing.md, textAlign: "right" }}>
                      {size.rows.toLocaleString("tr-TR")}
                    </td>
                    <td style={{ padding: spacing.md, textAlign: "right" }}>{size.indexSize}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    </div>
  );
}

