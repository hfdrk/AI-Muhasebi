"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationClient, type Notification, getCurrentUser } from "@repo/api-client";
import { useRouter } from "next/navigation";
import { colors, spacing, shadows, borderRadius } from "../styles/design-system";
import Link from "next/link";

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

export function NotificationBell() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // Check if user is authenticated and has an active tenant
  const hasAuthToken = typeof window !== "undefined" && !!localStorage.getItem("accessToken");
  
  // Get current user to check for active tenant
  const { data: userData } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => getCurrentUser(),
    enabled: hasAuthToken,
  });

  const currentTenant = userData?.data?.tenants?.find((t: any) => t.status === "active");
  const hasActiveTenant = !!currentTenant;

  // Fetch notifications
  const { data, refetch, error } = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => notificationClient.listNotifications({ limit: 5, is_read: false }),
    enabled: hasAuthToken && hasActiveTenant, // Only fetch if user is authenticated AND has active tenant
    refetchInterval: (query) => {
      // Only poll if query is successful, user is authenticated, and has active tenant
      if (!hasAuthToken || !hasActiveTenant || query.state.error) {
        return false;
      }
      return 30000; // Poll every 30 seconds
    },
    retry: (failureCount, error: any) => {
      // Don't retry on 401/403/404 errors (auth/tenant issues)
      if (error?.status === 401 || error?.status === 403 || error?.status === 404) {
        return false;
      }
      // Don't retry on network errors (status 0) - server is likely down
      if (error?.status === 0) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    onError: (error: any) => {
      // Silently handle errors - don't spam console
      // Only log if it's not a connection/auth error
      const isNetworkError = error?.status === 0 || error?.message?.includes("Failed to fetch") || error?.message?.includes("connection");
      const isAuthError = error?.status === 401 || error?.status === 403 || error?.status === 404;
      if (!isNetworkError && !isAuthError) {
        console.warn("Notification fetch error:", error);
      }
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => notificationClient.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      refetch();
    },
  });

  const notifications = data?.data || [];
  const unreadCount = notifications.length;

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-notification-bell]')) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

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
          return `/entegrasyonlar?integrationId=${meta.integrationId}`;
        }
        return "/entegrasyonlar";
      
      case "SYSTEM":
        // System notifications might go to dashboard or stay on notifications page
        return null;
      
      default:
        return null;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsReadMutation.mutate(notification.id);
    setIsOpen(false);
    
    // Redirect based on notification type and metadata
    const redirectUrl = getNotificationRedirectUrl(notification);
    if (redirectUrl) {
      router.push(redirectUrl);
    }
  };

  return (
    <div style={{ position: "relative" }} data-notification-bell>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "relative",
          padding: spacing.sm,
          backgroundColor: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: colors.text.secondary,
          fontSize: "20px",
        }}
        title="Bildirimler"
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "0",
              right: "0",
              backgroundColor: colors.danger,
              color: colors.white,
              borderRadius: borderRadius.full,
              width: "18px",
              height: "18px",
              fontSize: "11px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1,
            }}
            onClick={() => setIsOpen(false)}
          />
          <div
            style={{
              position: "absolute",
              top: "100%",
              right: 0,
              marginTop: spacing.sm,
              backgroundColor: colors.white,
              border: `1px solid ${colors.border}`,
              borderRadius: borderRadius.md,
              boxShadow: shadows.lg,
              zIndex: 2,
              minWidth: "320px",
              maxWidth: "400px",
              maxHeight: "500px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: spacing.md,
                borderBottom: `1px solid ${colors.border}`,
                fontWeight: 600,
                fontSize: "16px",
              }}
            >
              Bildirimler
            </div>

            <div style={{ overflowY: "auto", flex: 1 }}>
              {notifications.length === 0 ? (
                <div
                  style={{
                    padding: spacing.xl,
                    textAlign: "center",
                    color: colors.text.muted,
                  }}
                >
                  Yeni bildirim yok
                </div>
              ) : (
                notifications.map((notification) => (
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
                      e.currentTarget.style.backgroundColor = notification.is_read ? colors.white : colors.primaryLight;
                    }}
                  >
                    <div
                      style={{
                        fontWeight: notification.is_read ? 400 : 600,
                        fontSize: "14px",
                        marginBottom: spacing.xs,
                        color: colors.text.primary,
                      }}
                    >
                      {notification.title}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: colors.text.secondary,
                        marginBottom: spacing.xs,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {notification.message}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: colors.text.muted,
                      }}
                    >
                      {formatTimeAgo(notification.createdAt)}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div
              style={{
                padding: spacing.md,
                borderTop: `1px solid ${colors.border}`,
                textAlign: "center",
              }}
            >
              <Link
                href="/bildirimler"
                style={{
                  color: colors.primary,
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
                onClick={() => setIsOpen(false)}
              >
                Tüm bildirimleri gör
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

