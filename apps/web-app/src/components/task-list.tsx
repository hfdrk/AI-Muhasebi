"use client";

import { type Task } from "@repo/api-client";
import { formatDate } from "@/utils/date-utils";
import { colors, spacing, borderRadius, typography } from "@/styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";

interface TaskListProps {
  tasks: Task[];
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, status: Task["status"]) => void;
}

const PRIORITY_LABELS: Record<Task["priority"], string> = {
  low: "Düşük",
  medium: "Orta",
  high: "Yüksek",
};

const PRIORITY_COLORS: Record<Task["priority"], string> = {
  low: colors.success,
  medium: colors.warning,
  high: colors.danger,
};

export default function TaskList({ tasks, onEdit, onDelete, onStatusChange }: TaskListProps) {
  const { themeColors } = useTheme();

  if (tasks.length === 0) {
    return (
      <div style={{ padding: spacing.lg, textAlign: "center", color: themeColors.text.secondary }}>
        Henüz görev bulunmuyor.
      </div>
    );
  }

  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.status === "completed") return false;
    return new Date(task.dueDate) < new Date();
  };

  return (
    <div style={{ backgroundColor: themeColors.white, borderRadius: borderRadius.md, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ backgroundColor: themeColors.gray[50] }}>
            <th style={{ padding: spacing.md, textAlign: "left", borderBottom: `1px solid ${themeColors.border}` }}>
              Başlık
            </th>
            <th style={{ padding: spacing.md, textAlign: "left", borderBottom: `1px solid ${themeColors.border}` }}>
              Durum
            </th>
            <th style={{ padding: spacing.md, textAlign: "left", borderBottom: `1px solid ${themeColors.border}` }}>
              Öncelik
            </th>
            <th style={{ padding: spacing.md, textAlign: "left", borderBottom: `1px solid ${themeColors.border}` }}>
              Vade Tarihi
            </th>
            <th style={{ padding: spacing.md, textAlign: "left", borderBottom: `1px solid ${themeColors.border}` }}>
              İşlemler
            </th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr
              key={task.id}
              style={{
                borderBottom: `1px solid ${themeColors.gray[200]}`,
                backgroundColor: isOverdue(task) ? themeColors.dangerLight : themeColors.white,
              }}
            >
              <td style={{ padding: spacing.md }}>
                <div style={{ fontWeight: typography.fontWeight.bold }}>{task.title}</div>
                {task.description && (
                  <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.secondary, marginTop: spacing.xs }}>
                    {task.description.substring(0, 50)}
                    {task.description.length > 50 ? "..." : ""}
                  </div>
                )}
              </td>
              <td style={{ padding: spacing.md }}>
                <select
                  value={task.status}
                  onChange={(e) => onStatusChange(task.id, e.target.value as Task["status"])}
                  style={{
                    padding: `${spacing.xs} ${spacing.sm}`,
                    border: `1px solid ${themeColors.border}`,
                    borderRadius: borderRadius.sm,
                    fontSize: typography.fontSize.xs,
                  }}
                >
                  <option value="pending">Beklemede</option>
                  <option value="in_progress">Devam Ediyor</option>
                  <option value="completed">Tamamlandı</option>
                  <option value="cancelled">İptal Edildi</option>
                </select>
              </td>
              <td style={{ padding: spacing.md }}>
                <span
                  style={{
                    padding: `${spacing.xs} ${spacing.sm}`,
                    borderRadius: borderRadius.sm,
                    fontSize: typography.fontSize.xs,
                    backgroundColor: `${PRIORITY_COLORS[task.priority]}20`,
                    color: PRIORITY_COLORS[task.priority],
                  }}
                >
                  {PRIORITY_LABELS[task.priority]}
                </span>
              </td>
              <td style={{ padding: spacing.md }}>
                {task.dueDate ? (
                  <div>
                    {formatDate(new Date(task.dueDate))}
                    {isOverdue(task) && (
                      <span style={{ color: colors.danger, marginLeft: spacing.sm, fontSize: typography.fontSize.xs }}>
                        (Vadesi Geçti)
                      </span>
                    )}
                  </div>
                ) : (
                  <span style={{ color: themeColors.text.muted }}>-</span>
                )}
              </td>
              <td style={{ padding: spacing.md }}>
                <div style={{ display: "flex", gap: spacing.sm }}>
                  <button
                    onClick={() => onEdit(task.id)}
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
                  {task.status !== "completed" && (
                    <button
                      onClick={() => onDelete(task.id)}
                      style={{
                        padding: `${spacing.xs} ${spacing.sm}`,
                        backgroundColor: colors.danger,
                        color: colors.white,
                        border: "none",
                        borderRadius: borderRadius.sm,
                        cursor: "pointer",
                        fontSize: typography.fontSize.xs,
                      }}
                    >
                      Sil
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
