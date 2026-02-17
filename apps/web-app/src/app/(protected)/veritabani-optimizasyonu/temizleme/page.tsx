"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { dbOptimizationClient } from "@repo/api-client";
import { Card } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { PageTransition } from "../../../../components/ui/PageTransition";
import { colors, spacing, borderRadius, typography } from "../../../../styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "../../../../lib/toast";

export default function VacuumPage() {
  const { themeColors } = useTheme();
  const [tableNames, setTableNames] = useState<string>("");
  const queryClient = useQueryClient();

  // Vacuum tables mutation
  const vacuumMutation = useMutation({
    mutationFn: () => {
      const tables = tableNames
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      return dbOptimizationClient.vacuumTables(tables.length > 0 ? tables : undefined);
    },
    onSuccess: (data) => {
      const message = `Vakum işlemi tamamlandı! Temizlenen tablolar: ${data.data.vacuumed.length}, Hatalar: ${data.data.errors.length}`;
      if (data.data.errors.length > 0) {
        toast.warning(message);
        console.error("Vacuum errors:", data.data.errors);
      } else {
        toast.success(message);
      }
      setTableNames("");
      queryClient.invalidateQueries({ queryKey: ["table-sizes"] });
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
          Tablo Temizleme (Vacuum)
        </h1>
        <p
          style={{
            fontSize: typography.fontSize.base,
            color: themeColors.text.secondary,
            lineHeight: typography.lineHeight.relaxed,
            margin: 0,
          }}
        >
          Veritabanı tablolarını vakum ederek gereksiz verileri temizleyin ve performansı optimize edin.
        </p>
      </div>

      {/* Warning Card */}
      <Card
        variant="outlined"
        style={{
          marginBottom: spacing.lg,
          backgroundColor: colors.warningLight,
          borderColor: colors.warning,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: spacing.md }}>
          <span style={{ fontSize: typography.fontSize.xl, flexShrink: 0 }}>⚠️</span>
          <div>
            <p
              style={{
                margin: 0,
                fontSize: typography.fontSize.sm,
                color: themeColors.text.primary,
                fontWeight: typography.fontWeight.medium,
                marginBottom: spacing.xs,
              }}
            >
              Önemli Uyarı
            </p>
            <p
              style={{
                margin: 0,
                fontSize: typography.fontSize.sm,
                color: themeColors.text.secondary,
                lineHeight: typography.lineHeight.relaxed,
              }}
            >
              Vakum işlemi veritabanı performansını artırır ancak işlem sırasında tablolar kilitlenebilir. Bu
              işlem genellikle düşük trafikli saatlerde gerçekleştirilmelidir.
            </p>
          </div>
        </div>
      </Card>

      {/* Vacuum Form */}
      <Card variant="elevated">
        <h2
          style={{
            margin: `0 0 ${spacing.md} 0`,
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.semibold,
            color: themeColors.text.primary,
          }}
        >
          Tablo Vakum İşlemi
        </h2>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: spacing.md,
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                marginBottom: spacing.xs,
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                color: themeColors.text.primary,
              }}
            >
              Tablo İsimleri (Opsiyonel)
            </label>
            <textarea
              value={tableNames}
              onChange={(e) => setTableNames(e.target.value)}
              placeholder="tablo1, tablo2, tablo3 (virgülle ayırın) veya boş bırakın (tüm tablolar)"
              rows={4}
              style={{
                width: "100%",
                padding: spacing.sm,
                borderRadius: borderRadius.md,
                border: `1px solid ${themeColors.border}`,
                fontSize: typography.fontSize.base,
                backgroundColor: themeColors.white,
                color: themeColors.text.primary,
                fontFamily: typography.fontFamily.sans,
                resize: "vertical",
              }}
            />
            <p
              style={{
                margin: `${spacing.xs} 0 0 0`,
                fontSize: typography.fontSize.xs,
                color: themeColors.text.secondary,
              }}
            >
              Belirli tabloları temizlemek için tablo isimlerini virgülle ayırarak girin. Boş bırakırsanız tüm
              tablolar temizlenir.
            </p>
          </div>

          <div>
            <Button
              variant="primary"
              onClick={() => vacuumMutation.mutate()}
              loading={vacuumMutation.isPending}
            >
              🧹 Vakum İşlemini Başlat
            </Button>
          </div>
        </div>
      </Card>

      {/* Info Card */}
      <Card
        variant="outlined"
        style={{
          marginTop: spacing.lg,
          backgroundColor: colors.infoLight,
          borderColor: colors.info,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: spacing.md }}>
          <span style={{ fontSize: typography.fontSize.xl, flexShrink: 0 }}>ℹ️</span>
          <div>
            <p
              style={{
                margin: 0,
                fontSize: typography.fontSize.sm,
                color: themeColors.text.primary,
                fontWeight: typography.fontWeight.medium,
                marginBottom: spacing.xs,
              }}
            >
              Vakum İşlemi Hakkında
            </p>
            <p
              style={{
                margin: 0,
                fontSize: typography.fontSize.sm,
                color: themeColors.text.secondary,
                lineHeight: typography.lineHeight.relaxed,
              }}
            >
              Vakum işlemi, PostgreSQL veritabanında silinen veya güncellenen satırların işaretlendiği
              alanları temizler. Bu işlem veritabanı performansını artırır ve disk alanını geri kazanır.
              İşlem genellikle otomatik olarak çalışır ancak manuel olarak da tetiklenebilir.
            </p>
          </div>
        </div>
      </Card>

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
    </PageTransition>
  );
}

