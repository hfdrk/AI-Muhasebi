"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { kvkkClient } from "@repo/api-client";
import Link from "next/link";
import { Card } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { colors, spacing, borderRadius, shadows, typography, transitions } from "../../../../styles/design-system";
import { toast } from "../../../../lib/toast";

const SEVERITY_LABELS: Record<string, string> = {
  low: "Düşük",
  medium: "Orta",
  high: "Yüksek",
  critical: "Kritik",
};

const SEVERITY_COLORS: Record<string, { bg: string; text: string }> = {
  low: { bg: colors.infoLight, text: colors.info },
  medium: { bg: colors.warningLight, text: colors.warningDark },
  high: { bg: colors.dangerLight, text: colors.dangerDark },
  critical: { bg: colors.danger, text: colors.white },
};

export default function BreachManagementPage() {
  const [description, setDescription] = useState<string>("");
  const [affectedUsers, setAffectedUsers] = useState<number>(0);
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const queryClient = useQueryClient();

  // Record breach mutation
  const recordBreachMutation = useMutation({
    mutationFn: () => {
      if (!description.trim()) {
        throw new Error("Açıklama gerekli");
      }
      if (affectedUsers < 0) {
        throw new Error("Etkilenen kullanıcı sayısı 0'dan küçük olamaz");
      }
      return kvkkClient.recordBreach(description, affectedUsers, severity);
    },
    onSuccess: (data) => {
      toast.success("Veri ihlali başarıyla kaydedildi!");
      console.log("Data Breach:", data);
      setDescription("");
      setAffectedUsers(0);
      setSeverity("medium");
      queryClient.invalidateQueries({ queryKey: ["kvkk-breaches"] });
    },
    onError: (error: Error) => {
      toast.error(`Hata: ${error.message}`);
    },
  });

  return (
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
          <Button variant="ghost" asLink href="/kvkk" icon="←">
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
          Veri İhlali Yönetimi
        </h1>
        <p
          style={{
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
            lineHeight: typography.lineHeight.relaxed,
            margin: 0,
          }}
        >
          Veri ihlallerini kaydedin ve yönetin. KVKK gereğince, veri ihlalleri 72 saat içinde KVKK Kurumuna bildirilmelidir.
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
                color: colors.text.primary,
                fontWeight: typography.fontWeight.medium,
                marginBottom: spacing.xs,
              }}
            >
              KVKK Bildirim Yükümlülüğü
            </p>
            <p
              style={{
                margin: 0,
                fontSize: typography.fontSize.sm,
                color: colors.text.secondary,
                lineHeight: typography.lineHeight.relaxed,
              }}
            >
              KVKK'nın 12. maddesi gereğince, veri ihlalleri tespit edildiğinde en geç 72 saat içinde KVKK
              Kurumuna bildirilmelidir. Kritik ihlaller için derhal bildirim yapılmalıdır.
            </p>
          </div>
        </div>
      </Card>

      {/* Record Breach Form */}
      <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
        <h2
          style={{
            margin: `0 0 ${spacing.md} 0`,
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
          }}
        >
          Yeni Veri İhlali Kaydet
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
                color: colors.text.primary,
              }}
            >
              Açıklama *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="İhlal hakkında detaylı açıklama yazın..."
              rows={5}
              style={{
                width: "100%",
                padding: spacing.sm,
                borderRadius: borderRadius.md,
                border: `1px solid ${colors.border}`,
                fontSize: typography.fontSize.base,
                backgroundColor: colors.white,
                color: colors.text.primary,
                fontFamily: typography.fontFamily.sans,
                resize: "vertical",
              }}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
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
                  color: colors.text.primary,
                }}
              >
                Etkilenen Kullanıcı Sayısı *
              </label>
              <input
                type="number"
                value={affectedUsers}
                onChange={(e) => setAffectedUsers(parseInt(e.target.value, 10) || 0)}
                min={0}
                style={{
                  width: "100%",
                  padding: spacing.sm,
                  borderRadius: borderRadius.md,
                  border: `1px solid ${colors.border}`,
                  fontSize: typography.fontSize.base,
                  backgroundColor: colors.white,
                  color: colors.text.primary,
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: spacing.xs,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  color: colors.text.primary,
                }}
              >
                Önem Derecesi *
              </label>
              <select
                value={severity}
                onChange={(e) =>
                  setSeverity(
                    e.target.value as "low" | "medium" | "high" | "critical"
                  )
                }
                style={{
                  width: "100%",
                  padding: spacing.sm,
                  borderRadius: borderRadius.md,
                  border: `1px solid ${colors.border}`,
                  fontSize: typography.fontSize.base,
                  backgroundColor: colors.white,
                  color: colors.text.primary,
                }}
              >
                <option value="low">Düşük</option>
                <option value="medium">Orta</option>
                <option value="high">Yüksek</option>
                <option value="critical">Kritik</option>
              </select>
            </div>
          </div>

          <div>
            <Button
              variant="danger"
              onClick={() => recordBreachMutation.mutate()}
              loading={recordBreachMutation.isPending}
              disabled={!description.trim() || affectedUsers < 0}
            >
              📝 İhlali Kaydet
            </Button>
          </div>
        </div>
      </Card>

      {/* Severity Info */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: spacing.md,
          marginBottom: spacing.lg,
        }}
      >
        {Object.entries(SEVERITY_LABELS).map(([key, label]) => (
          <Card
            key={key}
            variant="outlined"
            style={{
              borderLeft: `4px solid ${SEVERITY_COLORS[key].text}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xs }}>
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  backgroundColor: SEVERITY_COLORS[key].text,
                }}
              />
              <span
                style={{
                  fontSize: typography.fontSize.base,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.text.primary,
                }}
              >
                {label}
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: typography.fontSize.xs,
                color: colors.text.secondary,
                lineHeight: typography.lineHeight.relaxed,
              }}
            >
              {key === "low"
                ? "Minimal etki, bildirim gerekli değil"
                : key === "medium"
                ? "Orta etki, bildirim önerilir"
                : key === "high"
                ? "Yüksek etki, 72 saat içinde bildirim zorunlu"
                : "Kritik etki, derhal bildirim zorunlu"}
            </p>
          </Card>
        ))}
      </div>

      {/* Breach History Placeholder */}
      <Card variant="elevated" title="İhlal Geçmişi">
        <div style={{ padding: spacing.lg, textAlign: "center" }}>
          <p style={{ color: colors.text.secondary, margin: 0 }}>
            İhlal geçmişi özelliği yakında eklenecektir.
          </p>
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
  );
}

