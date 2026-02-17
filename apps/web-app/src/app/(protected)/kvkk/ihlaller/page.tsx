"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { kvkkClient } from "@repo/api-client";
import { Card } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { colors, spacing, borderRadius, typography } from "../../../../styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";
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
  const { themeColors } = useTheme();
  const [description, setDescription] = useState<string>("");
  const [affectedUsers, setAffectedUsers] = useState<number>(0);
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [expandedBreachId, setExpandedBreachId] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const queryClient = useQueryClient();

  // Get current tenant
  const { data: userData } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const { getCurrentUser } = await import("@repo/api-client");
      return getCurrentUser();
    },
  });

  const currentTenant = userData?.data?.tenants?.find((t: any) => t.status === "active");
  const tenantId = currentTenant?.id;

  // Fetch breaches history
  const { data: breachesData, isLoading: breachesLoading } = useQuery({
    queryKey: ["kvkk-breaches"],
    queryFn: () => kvkkClient.listBreaches(),
    enabled: !!tenantId,
  });

  const allBreaches = breachesData?.data || [];
  const filteredBreaches = severityFilter === "all" 
    ? allBreaches 
    : allBreaches.filter((b: any) => b.severity === severityFilter);

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
    onSuccess: (_data) => {
      toast.success("Veri ihlali başarıyla kaydedildi!");
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
          <Button variant="ghost" asLink href="/kvkk" icon="←">
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
          Veri İhlali Yönetimi
        </h1>
        <p
          style={{
            fontSize: typography.fontSize.base,
            color: themeColors.text.secondary,
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
                color: themeColors.text.primary,
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
                color: themeColors.text.secondary,
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
            color: themeColors.text.primary,
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
                color: themeColors.text.primary,
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
                border: `1px solid ${themeColors.border}`,
                fontSize: typography.fontSize.base,
                backgroundColor: themeColors.white,
                color: themeColors.text.primary,
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
                  color: themeColors.text.primary,
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
                  border: `1px solid ${themeColors.border}`,
                  fontSize: typography.fontSize.base,
                  backgroundColor: themeColors.white,
                  color: themeColors.text.primary,
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
                  color: themeColors.text.primary,
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
                  border: `1px solid ${themeColors.border}`,
                  fontSize: typography.fontSize.base,
                  backgroundColor: themeColors.white,
                  color: themeColors.text.primary,
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
                  color: themeColors.text.primary,
                }}
              >
                {label}
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: typography.fontSize.xs,
                color: themeColors.text.secondary,
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

      {/* Breach History */}
      <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }}>
          <h2
            style={{
              margin: 0,
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.semibold,
              color: themeColors.text.primary,
            }}
          >
            İhlal Geçmişi
          </h2>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{
              padding: spacing.sm,
              borderRadius: borderRadius.md,
              border: `1px solid ${themeColors.border}`,
              fontSize: typography.fontSize.sm,
              backgroundColor: themeColors.white,
              color: themeColors.text.primary,
            }}
          >
            <option value="all">Tüm Şiddetler</option>
            <option value="low">Düşük</option>
            <option value="medium">Orta</option>
            <option value="high">Yüksek</option>
            <option value="critical">Kritik</option>
          </select>
        </div>
        {breachesLoading ? (
          <div style={{ padding: spacing.lg, textAlign: "center" }}>
            <p style={{ color: themeColors.text.secondary, margin: 0 }}>Yükleniyor...</p>
          </div>
        ) : filteredBreaches.length === 0 ? (
          <div style={{ padding: spacing.lg, textAlign: "center" }}>
            <p style={{ color: themeColors.text.secondary, margin: 0 }}>
              {severityFilter === "all" 
                ? "Henüz veri ihlali kaydı bulunmuyor."
                : "Bu şiddet seviyesinde ihlal kaydı bulunmuyor."}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: themeColors.gray[100], borderBottom: `1px solid ${themeColors.border}` }}>
                  <th style={{ padding: spacing.sm, textAlign: "left", fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>
                    Tespit Tarihi
                  </th>
                  <th style={{ padding: spacing.sm, textAlign: "left", fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>
                    Şiddet
                  </th>
                  <th style={{ padding: spacing.sm, textAlign: "left", fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>
                    Etkilenen Kullanıcı
                  </th>
                  <th style={{ padding: spacing.sm, textAlign: "left", fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>
                    Durum
                  </th>
                  <th style={{ padding: spacing.sm, textAlign: "left", fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>
                    Açıklama
                  </th>
                  <th style={{ padding: spacing.sm, textAlign: "left", fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredBreaches.map((breach: any) => {
                  const isExpanded = expandedBreachId === breach.id;
                  const severityInfo = SEVERITY_COLORS[breach.severity] || SEVERITY_COLORS.medium;
                  
                  return (
                    <tr key={breach.id || breach.breachId} style={{ borderBottom: `1px solid ${themeColors.border}` }}>
                      <td style={{ padding: spacing.sm, color: themeColors.text.secondary }}>
                        {new Date(breach.detectedAt || breach.recordedAt).toLocaleDateString("tr-TR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td style={{ padding: spacing.sm }}>
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: borderRadius.sm,
                            fontSize: typography.fontSize.xs,
                            backgroundColor: severityInfo.bg,
                            color: severityInfo.text,
                            fontWeight: typography.fontWeight.medium,
                          }}
                        >
                          {SEVERITY_LABELS[breach.severity] || breach.severity}
                        </span>
                      </td>
                      <td style={{ padding: spacing.sm, color: themeColors.text.secondary }}>
                        {breach.affectedUsers}
                      </td>
                      <td style={{ padding: spacing.sm }}>
                        {breach.status && (
                          <span
                            style={{
                              padding: "4px 8px",
                              borderRadius: borderRadius.sm,
                              fontSize: typography.fontSize.xs,
                              backgroundColor: themeColors.gray[100],
                              color: themeColors.text.secondary,
                            }}
                          >
                            {breach.status}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: spacing.sm, color: themeColors.text.secondary, maxWidth: "300px" }}>
                        <div style={{ 
                          overflow: "hidden", 
                          textOverflow: "ellipsis", 
                          whiteSpace: isExpanded ? "normal" : "nowrap" 
                        }}>
                          {breach.description}
                        </div>
                      </td>
                      <td style={{ padding: spacing.sm }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedBreachId(isExpanded ? null : breach.id)}
                        >
                          {isExpanded ? "Gizle" : "Detay"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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

