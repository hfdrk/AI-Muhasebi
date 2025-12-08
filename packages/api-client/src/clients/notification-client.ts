const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3800";

export type NotificationType = "RISK_ALERT" | "SCHEDULED_REPORT" | "INTEGRATION_SYNC" | "SYSTEM";

export interface Notification {
  id: string;
  tenantId: string;
  userId: string | null;
  type: NotificationType;
  title: string;
  message: string;
  meta: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListNotificationsParams {
  is_read?: boolean;
  type?: NotificationType;
  limit?: number;
  offset?: number;
}

export interface ListNotificationsResponse {
  data: Notification[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface MarkAllAsReadResponse {
  data: {
    updatedCount: number;
  };
}

async function apiRequest<T>(endpoint: string, options?: RequestInit & { params?: Record<string, string | number | boolean | undefined> }): Promise<T> {
  let url = `${API_URL}${endpoint}`;
  
  // Handle query parameters
  if (options?.params) {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const { params, ...fetchOptions } = options || {};

  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...fetchOptions?.headers,
    },
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
        if (!window.location.pathname.startsWith("/auth/")) {
          window.location.href = "/auth/login";
        }
      }
    }
    const error = await response.json().catch(() => ({ error: { message: "Bir hata oluştu." } }));
    throw new Error(error.error?.message || "Bir hata oluştu.");
  }

  return response.json();
}

export const notificationClient = {
  /**
   * List notifications with optional filters
   */
  async listNotifications(params?: ListNotificationsParams): Promise<ListNotificationsResponse> {
    return apiRequest<ListNotificationsResponse>("/api/v1/notifications", {
      method: "GET",
      params: params ? {
        is_read: params.is_read,
        type: params.type,
        limit: params.limit,
        offset: params.offset,
      } : undefined,
    });
  },

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<{ data: Notification }> {
    return apiRequest<{ data: Notification }>(`/api/v1/notifications/${notificationId}/read`, {
      method: "POST",
    });
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<MarkAllAsReadResponse> {
    return apiRequest<MarkAllAsReadResponse>("/api/v1/notifications/read-all", {
      method: "POST",
    });
  },
};


