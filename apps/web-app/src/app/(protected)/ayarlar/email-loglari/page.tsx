"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { emailLogClient, type EmailLog } from "@repo/api-client";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { PageTransition } from "@/components/ui/PageTransition";
import { colors, spacing } from "@/styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";

function formatDate(date: Date | string | null): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("tr-TR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function getStatusColor(status: string, fallbackColor: string): string {
  switch (status) {
    case "delivered":
      return colors.success;
    case "sent":
      return colors.primary;
    case "bounced":
      return colors.error;
    case "failed":
      return colors.error;
    default:
      return fallbackColor;
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "delivered":
      return "Teslim Edildi";
    case "sent":
      return "Gönderildi";
    case "bounced":
      return "Geri Döndü";
    case "failed":
      return "Başarısız";
    default:
      return status;
  }
}

export default function EmailLogsPage() {
  const { themeColors } = useTheme();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const { data: logsData, isLoading: logsLoading, error: logsError, refetch: refetchLogs } = useQuery({
    queryKey: ["email-logs", statusFilter, dateFrom, dateTo],
    queryFn: () =>
      emailLogClient.getEmailLogs({
        status: statusFilter !== "all" ? (statusFilter as "sent" | "delivered" | "bounced" | "failed") : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        limit: 50,
      }),
    staleTime: 60000, // Consider data fresh for 1 minute
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  const { data: analyticsData } = useQuery({
    queryKey: ["email-analytics", dateFrom, dateTo],
    queryFn: () =>
      emailLogClient.getEmailAnalytics({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    staleTime: 60000, // Consider data fresh for 1 minute
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  const logs = logsData?.data || [];
  const analytics = analyticsData?.data;

  return (
    <PageTransition>
      <div>
        <PageHeader title="E-posta Logları" />

      {/* Analytics Cards */}
      {analytics && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: spacing.md, marginBottom: spacing.lg }}>
          <Card>
            <div style={{ padding: spacing.md }}>
              <div style={{ fontSize: "14px", color: themeColors.text.secondary, marginBottom: spacing.xs }}>Toplam</div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: themeColors.text.primary }}>{analytics.total}</div>
            </div>
          </Card>
          <Card>
            <div style={{ padding: spacing.md }}>
              <div style={{ fontSize: "14px", color: themeColors.text.secondary, marginBottom: spacing.xs }}>Teslim Oranı</div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: colors.success }}>
                {analytics.deliveryRate.toFixed(1)}%
              </div>
            </div>
          </Card>
          <Card>
            <div style={{ padding: spacing.md }}>
              <div style={{ fontSize: "14px", color: themeColors.text.secondary, marginBottom: spacing.xs }}>Geri Dönme Oranı</div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: colors.error }}>
                {analytics.bounceRate.toFixed(1)}%
              </div>
            </div>
          </Card>
          <Card>
            <div style={{ padding: spacing.md }}>
              <div style={{ fontSize: "14px", color: themeColors.text.secondary, marginBottom: spacing.xs }}>Açılma Oranı</div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: colors.primary }}>
                {analytics.openRate.toFixed(1)}%
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card style={{ marginBottom: spacing.lg }}>
        <div style={{ padding: spacing.md, display: "flex", gap: spacing.md, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <label style={{ display: "block", marginBottom: spacing.xs, fontSize: "14px", color: themeColors.text.secondary }}>
              Durum
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: "100%",
                padding: spacing.sm,
                border: `1px solid ${themeColors.gray[300]}`,
                borderRadius: "6px",
                fontSize: "14px",
              }}
            >
              <option value="all">Tümü</option>
              <option value="sent">Gönderildi</option>
              <option value="delivered">Teslim Edildi</option>
              <option value="bounced">Geri Döndü</option>
              <option value="failed">Başarısız</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: "150px" }}>
            <label style={{ display: "block", marginBottom: spacing.xs, fontSize: "14px", color: themeColors.text.secondary }}>
              Başlangıç Tarihi
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{
                width: "100%",
                padding: spacing.sm,
                border: `1px solid ${themeColors.gray[300]}`,
                borderRadius: "6px",
                fontSize: "14px",
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: "150px" }}>
            <label style={{ display: "block", marginBottom: spacing.xs, fontSize: "14px", color: themeColors.text.secondary }}>
              Bitiş Tarihi
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{
                width: "100%",
                padding: spacing.sm,
                border: `1px solid ${themeColors.gray[300]}`,
                borderRadius: "6px",
                fontSize: "14px",
              }}
            />
          </div>
          <Button onClick={() => refetchLogs()}>Yenile</Button>
        </div>
      </Card>

      {/* Email Logs Table */}
      <Card>
        {logsLoading ? (
          <div style={{ padding: spacing.lg }}>
            <SkeletonTable rows={5} columns={6} />
          </div>
        ) : logsError ? (
          <div style={{ padding: spacing.xl, textAlign: "center", color: colors.error }}>
            <div style={{ fontSize: "48px", marginBottom: spacing.md }}>⚠️</div>
            <div>E-posta logları yüklenirken bir hata oluştu.</div>
            <div style={{ marginTop: spacing.sm, fontSize: "14px" }}>
              {(logsError as Error)?.message || "Bilinmeyen hata"}
            </div>
            <Button onClick={() => refetchLogs()} style={{ marginTop: spacing.md }}>
              Tekrar Dene
            </Button>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: spacing.xl, textAlign: "center", color: themeColors.text.secondary }}>
            <div style={{ fontSize: "48px", marginBottom: spacing.md }}>📧</div>
            <div>Henüz e-posta logu bulunmuyor.</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${themeColors.gray[300]}` }}>
                  <th style={{ padding: spacing.md, textAlign: "left", fontSize: "14px", fontWeight: "semibold" }}>
                    Tarih
                  </th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontSize: "14px", fontWeight: "semibold" }}>
                    Alıcı
                  </th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontSize: "14px", fontWeight: "semibold" }}>
                    Konu
                  </th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontSize: "14px", fontWeight: "semibold" }}>
                    Durum
                  </th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontSize: "14px", fontWeight: "semibold" }}>
                    Hata
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: EmailLog) => (
                  <tr key={log.id} style={{ borderBottom: `1px solid ${themeColors.gray[200]}` }}>
                    <td style={{ padding: spacing.md, fontSize: "14px" }}>{formatDate(log.createdAt)}</td>
                    <td style={{ padding: spacing.md, fontSize: "14px" }}>{log.to.join(", ")}</td>
                    <td style={{ padding: spacing.md, fontSize: "14px" }}>{log.subject}</td>
                    <td style={{ padding: spacing.md, fontSize: "14px" }}>
                      <span
                        style={{
                          padding: `${spacing.xs} ${spacing.sm}`,
                          borderRadius: "4px",
                          backgroundColor: getStatusColor(log.status, themeColors.text.secondary) + "20",
                          color: getStatusColor(log.status, themeColors.text.secondary),
                          fontSize: "12px",
                          fontWeight: "medium",
                        }}
                      >
                        {getStatusLabel(log.status)}
                      </span>
                    </td>
                    <td style={{ padding: spacing.md, fontSize: "14px", color: themeColors.text.secondary }}>
                      {log.error || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
    </PageTransition>
  );
}
