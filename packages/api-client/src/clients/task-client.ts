const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";

export interface Task {
  id: string;
  tenantId: string;
  clientCompanyId: string | null;
  assignedToUserId: string | null;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high";
  dueDate: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListTasksParams {
  clientCompanyId?: string;
  assignedToUserId?: string;
  status?: "pending" | "in_progress" | "completed" | "cancelled";
  priority?: "low" | "medium" | "high";
  overdue?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CreateTaskInput {
  clientCompanyId?: string | null;
  assignedToUserId?: string | null;
  title: string;
  description?: string | null;
  status?: "pending" | "in_progress" | "completed" | "cancelled";
  priority?: "low" | "medium" | "high";
  dueDate?: string | null;
}

export interface UpdateTaskInput {
  clientCompanyId?: string | null;
  assignedToUserId?: string | null;
  title?: string;
  description?: string | null;
  status?: "pending" | "in_progress" | "completed" | "cancelled";
  priority?: "low" | "medium" | "high";
  dueDate?: string | null;
}

import type { PaginatedResponse } from "./shared-types";

async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
    credentials: "include",
  });

  if (!response.ok) {
    // Handle 401 Unauthorized - clear token and redirect to login
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

export async function listTasks(params?: ListTasksParams): Promise<PaginatedResponse<Task>> {
  const queryParams = new URLSearchParams();
  if (params?.clientCompanyId) queryParams.append("clientCompanyId", params.clientCompanyId);
  if (params?.assignedToUserId) queryParams.append("assignedToUserId", params.assignedToUserId);
  if (params?.status) queryParams.append("status", params.status);
  if (params?.priority) queryParams.append("priority", params.priority);
  if (params?.overdue) queryParams.append("overdue", "true");
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.pageSize) queryParams.append("pageSize", params.pageSize.toString());

  const url = `/api/v1/tasks${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  return apiRequest<PaginatedResponse<Task>>(url);
}

export async function getTask(taskId: string): Promise<{ data: Task }> {
  return apiRequest<{ data: Task }>(`/api/v1/tasks/${taskId}`);
}

export async function createTask(input: CreateTaskInput): Promise<{ data: Task }> {
  return apiRequest<{ data: Task }>("/api/v1/tasks", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateTask(taskId: string, input: UpdateTaskInput): Promise<{ data: Task }> {
  return apiRequest<{ data: Task }>(`/api/v1/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteTask(taskId: string): Promise<{ data: { message: string } }> {
  return apiRequest<{ data: { message: string } }>(`/api/v1/tasks/${taskId}`, {
    method: "DELETE",
  });
}

export interface TaskStatistics {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  byPriority: {
    low: number;
    medium: number;
    high: number;
  };
}

export async function getTaskStatistics(): Promise<{ data: TaskStatistics }> {
  return apiRequest<{ data: TaskStatistics }>("/api/v1/tasks/stats/summary");
}
