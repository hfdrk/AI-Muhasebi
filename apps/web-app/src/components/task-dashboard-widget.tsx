"use client";

import { type TaskStatistics } from "@repo/api-client";

interface TaskDashboardWidgetProps {
  statistics: TaskStatistics;
}

export default function TaskDashboardWidget({ statistics }: TaskDashboardWidgetProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "16px",
        marginBottom: "24px",
      }}
    >
      <div
        style={{
          padding: "16px",
          backgroundColor: "white",
          borderRadius: "8px",
          border: "1px solid #e0e0e0",
        }}
      >
        <div style={{ fontSize: "24px", fontWeight: "bold", color: "#0066cc" }}>
          {statistics.total}
        </div>
        <div style={{ fontSize: "14px", color: "#666", marginTop: "4px" }}>Toplam Görev</div>
      </div>

      <div
        style={{
          padding: "16px",
          backgroundColor: "white",
          borderRadius: "8px",
          border: "1px solid #e0e0e0",
        }}
      >
        <div style={{ fontSize: "24px", fontWeight: "bold", color: "#f59e0b" }}>
          {statistics.pending}
        </div>
        <div style={{ fontSize: "14px", color: "#666", marginTop: "4px" }}>Beklemede</div>
      </div>

      <div
        style={{
          padding: "16px",
          backgroundColor: "white",
          borderRadius: "8px",
          border: "1px solid #e0e0e0",
        }}
      >
        <div style={{ fontSize: "24px", fontWeight: "bold", color: "#0066cc" }}>
          {statistics.inProgress}
        </div>
        <div style={{ fontSize: "14px", color: "#666", marginTop: "4px" }}>Devam Ediyor</div>
      </div>

      <div
        style={{
          padding: "16px",
          backgroundColor: "white",
          borderRadius: "8px",
          border: "1px solid #e0e0e0",
        }}
      >
        <div style={{ fontSize: "24px", fontWeight: "bold", color: "#10b981" }}>
          {statistics.completed}
        </div>
        <div style={{ fontSize: "14px", color: "#666", marginTop: "4px" }}>Tamamlandı</div>
      </div>

      <div
        style={{
          padding: "16px",
          backgroundColor: "white",
          borderRadius: "8px",
          border: "1px solid #e0e0e0",
        }}
      >
        <div style={{ fontSize: "24px", fontWeight: "bold", color: "#dc2626" }}>
          {statistics.overdue}
        </div>
        <div style={{ fontSize: "14px", color: "#666", marginTop: "4px" }}>Vadesi Geçen</div>
      </div>

      <div
        style={{
          padding: "16px",
          backgroundColor: "white",
          borderRadius: "8px",
          border: "1px solid #e0e0e0",
        }}
      >
        <div style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>Öncelik Dağılımı</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "12px" }}>Yüksek:</span>
            <span style={{ fontWeight: "bold", color: "#dc2626" }}>
              {statistics.byPriority.high}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "12px" }}>Orta:</span>
            <span style={{ fontWeight: "bold", color: "#f59e0b" }}>
              {statistics.byPriority.medium}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "12px" }}>Düşük:</span>
            <span style={{ fontWeight: "bold", color: "#10b981" }}>
              {statistics.byPriority.low}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}


