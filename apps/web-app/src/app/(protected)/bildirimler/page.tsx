"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationClient, type Notification, type NotificationType } from "@repo/api-client";
import { colors, spacing, shadows, borderRadius } from "../../../styles/design-system";

function formatTimeAgo(date: string): string {
  const now = new Date();
  const notificationDate = new Date(date);
  const diffMs = now.getTime() - notificationDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return "Az önce";
  } else if (diffMins < 60) {
    return `${diffMins} dakika önce`;
  } else if (diffHours < 24) {
    return `${diffHours} saat önce`;
  } else {
    return `${diffDays} gün önce`;
  }
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("tr-TR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTypeLabel(type: NotificationType): string {
  const labels: Record<NotificationType, string> = {
    RISK_ALERT: "Risk uyarıları",
    SCHEDULED_REPORT: "Raporlar",
    INTEGRATION_SYNC: "Entegrasyonlar",
    SYSTEM: "Sistem",
  };
  return labels[type] || type;
}

export default function NotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "read">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | NotificationType>("all");
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["notifications", "list", statusFilter, typeFilter, offset],
    queryFn: () =>
      notificationClient.listNotifications({
        is_read: statusFilter === "all" ? undefined : statusFilter === "read",
        type: typeFilter === "all" ? undefined : typeFilter,
        limit,
        offset,
      }),
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => notificationClient.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      refetch();
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationClient.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      refetch();
    },
  });

  const notifications = data?.data || [];
  const total = data?.meta.total || 0;
  const hasMore = offset + limit < total;

  const getNotificationRedirectUrl = (notification: Notification): string | null => {
    const meta = notification.meta || {};
    
    switch (notification.type) {
      case "RISK_ALERT":
        // If there's an alert ID in metadata, go to specific alert
        if (meta.alertId && typeof meta.alertId === "string") {
          return `/risk/alerts?alertId=${meta.alertId}`;
        }
        return "/risk/alerts";
      
      case "SCHEDULED_REPORT":
        // If there's a report ID in metadata, go to specific report
        if (meta.reportId && typeof meta.reportId === "string") {
          return `/raporlar/zamanlanmis/${meta.reportId}`;
        }
        return "/raporlar/zamanlanmis";
      
      case "INTEGRATION_SYNC":
        // If there's an integration ID, go to integrations page
        if (meta.integrationId && typeof meta.integrationId === "string") {
          return `/integrations?integrationId=${meta.integrationId}`;
        }
        return "/integrations";
      
      case "SYSTEM":
        // System notifications might go to dashboard or stay on notifications page
        return null;
      
      default:
        return null;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
    
    // Redirect based on notification type and metadata
    const redirectUrl = getNotificationRedirectUrl(notification);
    if (redirectUrl) {
      router.push(redirectUrl);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: spacing.xl,
        }}
      >
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 600, color: colors.text.primary }}>
          Bildirimler
        </h1>
        {notifications.some((n) => !n.is_read) && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={markAllAsReadMutation.isPending}
            style={{
              padding: `${spacing.sm} ${spacing.md}`,
              backgroundColor: colors.primary,
              color: colors.white,
              border: "none",
              borderRadius: borderRadius.md,
              cursor: markAllAsReadMutation.isPending ? "not-allowed" : "pointer",
              fontWeight: 500,
              opacity: markAllAsReadMutation.isPending ? 0.6 : 1,
            }}
          >
            {markAllAsReadMutation.isPending ? "İşleniyor..." : "Tümünü okundu işaretle"}
          </button>
        )}
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: spacing.md,
          marginBottom: spacing.lg,
          padding: spacing.md,
          backgroundColor: colors.white,
          borderRadius: borderRadius.md,
          boxShadow: shadows.sm,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: spacing.xs }}>
          <label style={{ fontSize: "12px", fontWeight: 500, color: colors.text.secondary }}>
            Durum
          </label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "all" | "unread" | "read");
              setOffset(0);
            }}
            style={{
              padding: `${spacing.xs} ${spacing.sm}`,
              border: `1px solid ${colors.border}`,
              borderRadius: borderRadius.sm,
              fontSize: "14px",
            }}
          >
            <option value="all">Tümü</option>
            <option value="unread">Okunmamış</option>
            <option value="read">Okunmuş</option>
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: spacing.xs }}>
          <label style={{ fontSize: "12px", fontWeight: 500, color: colors.text.secondary }}>
            Tür
          </label>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as "all" | NotificationType);
              setOffset(0);
            }}
            style={{
              padding: `${spacing.xs} ${spacing.sm}`,
              border: `1px solid ${colors.border}`,
              borderRadius: borderRadius.sm,
              fontSize: "14px",
            }}
          >
            <option value="all">Tümü</option>
            <option value="RISK_ALERT">Risk uyarıları</option>
            <option value="SCHEDULED_REPORT">Raporlar</option>
            <option value="INTEGRATION_SYNC">Entegrasyonlar</option>
            <option value="SYSTEM">Sistem</option>
          </select>
        </div>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: spacing.xxl, color: colors.text.secondary }}>
          Yükleniyor...
        </div>
      ) : notifications.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: spacing.xxl,
            backgroundColor: colors.white,
            borderRadius: borderRadius.md,
            boxShadow: shadows.sm,
            color: colors.text.secondary,
          }}
        >
          Bu kriterlere uygun bildirim bulunamadı.
        </div>
      ) : (
        <div
          style={{
            backgroundColor: colors.white,
            borderRadius: borderRadius.md,
            boxShadow: shadows.sm,
            overflow: "hidden",
          }}
        >
          {notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              style={{
                padding: spacing.md,
                borderBottom: `1px solid ${colors.border}`,
                cursor: "pointer",
                backgroundColor: notification.is_read ? colors.white : colors.primaryLight,
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.gray[100];
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = notification.is_read
                  ? colors.white
                  : colors.primaryLight;
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      gap: spacing.md,
                      alignItems: "center",
                      marginBottom: spacing.xs,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: notification.is_read ? 400 : 600,
                        fontSize: "16px",
                        color: colors.text.primary,
                      }}
                    >
                      {notification.title}
                    </span>
                    {!notification.is_read && (
                      <span
                        style={{
                          padding: `${spacing.xs} ${spacing.sm}`,
                          backgroundColor: colors.primary,
                          color: colors.white,
                          borderRadius: borderRadius.sm,
                          fontSize: "11px",
                          fontWeight: 600,
                        }}
                      >
                        Yeni
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      color: colors.text.secondary,
                      marginBottom: spacing.xs,
                    }}
                  >
                    {notification.message}
                  </div>
                  <div style={{ display: "flex", gap: spacing.md, alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: "12px",
                        color: colors.text.muted,
                        padding: `${spacing.xs} ${spacing.sm}`,
                        backgroundColor: colors.gray[100],
                        borderRadius: borderRadius.sm,
                      }}
                    >
                      {getTypeLabel(notification.type)}
                    </span>
                    <span
                      style={{
                        fontSize: "12px",
                        color: colors.text.muted,
                      }}
                    >
                      {formatTimeAgo(notification.createdAt)}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: colors.text.muted,
                    textAlign: "right",
                    minWidth: "150px",
                  }}
                >
                  {formatDate(notification.createdAt)}
                </div>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {(offset > 0 || hasMore) && (
            <div
              style={{
                padding: spacing.md,
                borderTop: `1px solid ${colors.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                style={{
                  padding: `${spacing.sm} ${spacing.md}`,
                  backgroundColor: offset === 0 ? colors.gray[300] : colors.primary,
                  color: colors.white,
                  border: "none",
                  borderRadius: borderRadius.md,
                  cursor: offset === 0 ? "not-allowed" : "pointer",
                  opacity: offset === 0 ? 0.6 : 1,
                }}
              >
                Önceki
              </button>
              <span style={{ color: colors.text.secondary, fontSize: "14px" }}>
                {offset + 1}-{Math.min(offset + limit, total)} / {total}
              </span>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={!hasMore}
                style={{
                  padding: `${spacing.sm} ${spacing.md}`,
                  backgroundColor: !hasMore ? colors.gray[300] : colors.primary,
                  color: colors.white,
                  border: "none",
                  borderRadius: borderRadius.md,
                  cursor: !hasMore ? "not-allowed" : "pointer",
                  opacity: !hasMore ? 0.6 : 1,
                }}
              >
                Sonraki
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

