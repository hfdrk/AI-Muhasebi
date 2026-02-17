"use client";

import { type TaskStatistics } from "@repo/api-client";
import { colors, spacing, borderRadius, typography } from "@/styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";

interface TaskDashboardWidgetProps {
  statistics: TaskStatistics;
}

export default function TaskDashboardWidget({ statistics }: TaskDashboardWidgetProps) {
  const { themeColors } = useTheme();

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: spacing.md,
        marginBottom: spacing.lg,
      }}
    >
      <div
        style={{
          padding: spacing.md,
          backgroundColor: themeColors.white,
          borderRadius: borderRadius.md,
          border: `1px solid ${themeColors.border}`,
        }}
      >
        <div style={{ fontSize: typography.fontSize["2xl"], fontWeight: typography.fontWeight.bold, color: colors.primary }}>
          {statistics.total}
        </div>
        <div style={{ fontSize: typography.fontSize.sm, color: themeColors.text.secondary, marginTop: spacing.xs }}>Toplam Görev</div>
      </div>

      <div
        style={{
          padding: spacing.md,
          backgroundColor: themeColors.white,
          borderRadius: borderRadius.md,
          border: `1px solid ${themeColors.border}`,
        }}
      >
        <div style={{ fontSize: typography.fontSize["2xl"], fontWeight: typography.fontWeight.bold, color: colors.warning }}>
          {statistics.pending}
        </div>
        <div style={{ fontSize: typography.fontSize.sm, color: themeColors.text.secondary, marginTop: spacing.xs }}>Beklemede</div>
      </div>

      <div
        style={{
          padding: spacing.md,
          backgroundColor: themeColors.white,
          borderRadius: borderRadius.md,
          border: `1px solid ${themeColors.border}`,
        }}
      >
        <div style={{ fontSize: typography.fontSize["2xl"], fontWeight: typography.fontWeight.bold, color: colors.primary }}>
          {statistics.inProgress}
        </div>
        <div style={{ fontSize: typography.fontSize.sm, color: themeColors.text.secondary, marginTop: spacing.xs }}>Devam Ediyor</div>
      </div>

      <div
        style={{
          padding: spacing.md,
          backgroundColor: themeColors.white,
          borderRadius: borderRadius.md,
          border: `1px solid ${themeColors.border}`,
        }}
      >
        <div style={{ fontSize: typography.fontSize["2xl"], fontWeight: typography.fontWeight.bold, color: colors.success }}>
          {statistics.completed}
        </div>
        <div style={{ fontSize: typography.fontSize.sm, color: themeColors.text.secondary, marginTop: spacing.xs }}>Tamamlandı</div>
      </div>

      <div
        style={{
          padding: spacing.md,
          backgroundColor: themeColors.white,
          borderRadius: borderRadius.md,
          border: `1px solid ${themeColors.border}`,
        }}
      >
        <div style={{ fontSize: typography.fontSize["2xl"], fontWeight: typography.fontWeight.bold, color: colors.danger }}>
          {statistics.overdue}
        </div>
        <div style={{ fontSize: typography.fontSize.sm, color: themeColors.text.secondary, marginTop: spacing.xs }}>Vadesi Geçen</div>
      </div>

      <div
        style={{
          padding: spacing.md,
          backgroundColor: themeColors.white,
          borderRadius: borderRadius.md,
          border: `1px solid ${themeColors.border}`,
        }}
      >
        <div style={{ fontSize: typography.fontSize.sm, color: themeColors.text.secondary, marginBottom: spacing.sm }}>Öncelik Dağılımı</div>
        <div style={{ display: "flex", flexDirection: "column", gap: spacing.xs }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: typography.fontSize.xs }}>Yüksek:</span>
            <span style={{ fontWeight: typography.fontWeight.bold, color: colors.danger }}>
              {statistics.byPriority.high}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: typography.fontSize.xs }}>Orta:</span>
            <span style={{ fontWeight: typography.fontWeight.bold, color: colors.warning }}>
              {statistics.byPriority.medium}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: typography.fontSize.xs }}>Düşük:</span>
            <span style={{ fontWeight: typography.fontWeight.bold, color: colors.success }}>
              {statistics.byPriority.low}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
