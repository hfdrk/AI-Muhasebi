"use client";

import { type Task } from "@repo/api-client";
import { formatDate } from "@/utils/date-utils";

interface TaskListProps {
  tasks: Task[];
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, status: Task["status"]) => void;
}

const STATUS_LABELS: Record<Task["status"], string> = {
  pending: "Beklemede",
  in_progress: "Devam Ediyor",
  completed: "Tamamlandı",
  cancelled: "İptal Edildi",
};

const PRIORITY_LABELS: Record<Task["priority"], string> = {
  low: "Düşük",
  medium: "Orta",
  high: "Yüksek",
};

const PRIORITY_COLORS: Record<Task["priority"], string> = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#dc2626",
};

export default function TaskList({ tasks, onEdit, onDelete, onStatusChange }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div style={{ padding: "24px", textAlign: "center", color: "#666" }}>
        Henüz görev bulunmuyor.
      </div>
    );
  }

  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.status === "completed") return false;
    return new Date(task.dueDate) < new Date();
  };

  return (
    <div style={{ backgroundColor: "white", borderRadius: "8px", overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ backgroundColor: "#f5f5f5" }}>
            <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>
              Başlık
            </th>
            <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>
              Durum
            </th>
            <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>
              Öncelik
            </th>
            <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>
              Vade Tarihi
            </th>
            <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>
              İşlemler
            </th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr
              key={task.id}
              style={{
                borderBottom: "1px solid #eee",
                backgroundColor: isOverdue(task) ? "#fee2e2" : "white",
              }}
            >
              <td style={{ padding: "12px" }}>
                <div style={{ fontWeight: "bold" }}>{task.title}</div>
                {task.description && (
                  <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                    {task.description.substring(0, 50)}
                    {task.description.length > 50 ? "..." : ""}
                  </div>
                )}
              </td>
              <td style={{ padding: "12px" }}>
                <select
                  value={task.status}
                  onChange={(e) => onStatusChange(task.id, e.target.value as Task["status"])}
                  style={{
                    padding: "4px 8px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    fontSize: "12px",
                  }}
                >
                  <option value="pending">Beklemede</option>
                  <option value="in_progress">Devam Ediyor</option>
                  <option value="completed">Tamamlandı</option>
                  <option value="cancelled">İptal Edildi</option>
                </select>
              </td>
              <td style={{ padding: "12px" }}>
                <span
                  style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    backgroundColor: `${PRIORITY_COLORS[task.priority]}20`,
                    color: PRIORITY_COLORS[task.priority],
                  }}
                >
                  {PRIORITY_LABELS[task.priority]}
                </span>
              </td>
              <td style={{ padding: "12px" }}>
                {task.dueDate ? (
                  <div>
                    {formatDate(new Date(task.dueDate))}
                    {isOverdue(task) && (
                      <span style={{ color: "#dc2626", marginLeft: "8px", fontSize: "12px" }}>
                        (Vadesi Geçti)
                      </span>
                    )}
                  </div>
                ) : (
                  <span style={{ color: "#999" }}>-</span>
                )}
              </td>
              <td style={{ padding: "12px" }}>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => onEdit(task.id)}
                    style={{
                      padding: "4px 8px",
                      backgroundColor: "#0066cc",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                  >
                    Düzenle
                  </button>
                  {task.status !== "completed" && (
                    <button
                      onClick={() => onDelete(task.id)}
                      style={{
                        padding: "4px 8px",
                        backgroundColor: "#dc2626",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
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



