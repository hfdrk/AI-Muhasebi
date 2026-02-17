import { getAccessToken } from "../token-store";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";

export interface MessageThread {
  id: string;
  tenantId: string;
  clientCompanyId: string | null;
  subject: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  participants: Array<{
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    lastReadAt: string | null;
  }>;
  unreadCount?: number;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  content: string;
  readAt: string | null;
  createdAt: string;
}

export interface MessageThreadWithMessages extends MessageThread {
  messages: Message[];
}

export interface CreateMessageThreadInput {
  clientCompanyId?: string | null;
  subject?: string | null;
  participantUserIds: string[];
}

export interface SendMessageInput {
  content: string;
}

export interface ListThreadsParams {
  clientCompanyId?: string;
  limit?: number;
  offset?: number;
}

export interface ListThreadsResponse {
  data: MessageThread[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}

async function apiRequest<T>(endpoint: string, options?: RequestInit & { params?: Record<string, string | number | boolean | undefined> }): Promise<T> {
  let url = `${API_URL}${endpoint}`;
  
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

  const token = getAccessToken();

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
    
    let errorMessage = "Bir hata oluştu.";
    try {
      const error = await response.json();
      errorMessage = error.error?.message || error.message || errorMessage;
    } catch {
      errorMessage = response.statusText || `HTTP ${response.status} hatası`;
    }
    
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    (error as any).statusCode = response.status;
    (error as any).response = { status: response.status };
    throw error;
  }

  return response.json();
}

export const messagingClient = {
  /**
   * List message threads
   */
  async listThreads(params?: ListThreadsParams): Promise<ListThreadsResponse> {
    return apiRequest<ListThreadsResponse>("/api/v1/messaging/threads", {
      method: "GET",
      params: params ? {
        clientCompanyId: params.clientCompanyId,
        limit: params.limit,
        offset: params.offset,
      } : undefined,
    });
  },

  /**
   * Get thread with messages
   */
  async getThread(threadId: string): Promise<{ data: MessageThreadWithMessages }> {
    return apiRequest<{ data: MessageThreadWithMessages }>(`/api/v1/messaging/threads/${threadId}`, {
      method: "GET",
    });
  },

  /**
   * Create a new message thread
   */
  async createThread(input: CreateMessageThreadInput): Promise<{ data: MessageThread }> {
    return apiRequest<{ data: MessageThread }>("/api/v1/messaging/threads", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  /**
   * Send a message in a thread
   */
  async sendMessage(threadId: string, input: SendMessageInput): Promise<{ data: Message }> {
    return apiRequest<{ data: Message }>(`/api/v1/messaging/threads/${threadId}/messages`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  /**
   * Mark thread as read
   */
  async markAsRead(threadId: string): Promise<{ data: { success: boolean } }> {
    return apiRequest<{ data: { success: boolean } }>(`/api/v1/messaging/threads/${threadId}/read`, {
      method: "POST",
    });
  },
};



