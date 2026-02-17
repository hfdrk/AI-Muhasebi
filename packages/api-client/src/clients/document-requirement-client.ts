import { getAccessToken } from "../token-store";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";

export interface DocumentRequirement {
  id: string;
  tenantId: string;
  clientCompanyId: string;
  documentType: string;
  requiredByDate: Date;
  status: "pending" | "received" | "overdue";
  receivedDocumentId: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListDocumentRequirementsParams {
  clientCompanyId?: string;
  documentType?: string;
  status?: "pending" | "received" | "overdue";
  overdue?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CreateDocumentRequirementInput {
  clientCompanyId: string;
  documentType: string;
  requiredByDate: string;
  description?: string | null;
}

export interface UpdateDocumentRequirementInput {
  documentType?: string;
  requiredByDate?: string;
  status?: "pending" | "received" | "overdue";
  receivedDocumentId?: string | null;
  description?: string | null;
}

import type { PaginatedResponse } from "./shared-types";

async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const token = getAccessToken();

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
    let errorMessage = "Bir hata oluştu.";
    try {
      const error = await response.json();
      const rawMessage = error?.error?.message || error?.message;
      if (typeof rawMessage === "string") {
        errorMessage = rawMessage;
      }
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

export async function listDocumentRequirements(
  params?: ListDocumentRequirementsParams
): Promise<PaginatedResponse<DocumentRequirement>> {
  const queryParams = new URLSearchParams();
  if (params?.clientCompanyId) queryParams.append("clientCompanyId", params.clientCompanyId);
  if (params?.documentType) queryParams.append("documentType", params.documentType);
  if (params?.status) queryParams.append("status", params.status);
  if (params?.overdue) queryParams.append("overdue", "true");
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.pageSize) queryParams.append("pageSize", params.pageSize.toString());

  const url = `/api/v1/document-requirements${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  return apiRequest<PaginatedResponse<DocumentRequirement>>(url);
}

export async function getDocumentRequirement(
  requirementId: string
): Promise<{ data: DocumentRequirement }> {
  return apiRequest<{ data: DocumentRequirement }>(`/api/v1/document-requirements/${requirementId}`);
}

export async function createDocumentRequirement(
  input: CreateDocumentRequirementInput
): Promise<{ data: DocumentRequirement }> {
  return apiRequest<{ data: DocumentRequirement }>("/api/v1/document-requirements", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateDocumentRequirement(
  requirementId: string,
  input: UpdateDocumentRequirementInput
): Promise<{ data: DocumentRequirement }> {
  return apiRequest<{ data: DocumentRequirement }>(`/api/v1/document-requirements/${requirementId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteDocumentRequirement(
  requirementId: string
): Promise<{ data: { message: string } }> {
  return apiRequest<{ data: { message: string } }>(`/api/v1/document-requirements/${requirementId}`, {
    method: "DELETE",
  });
}

export async function checkMissingDocuments(): Promise<{
  data: { checked: number; markedOverdue: number; alertsCreated: number };
}> {
  return apiRequest<{ data: { checked: number; markedOverdue: number; alertsCreated: number } }>(
    "/api/v1/document-requirements/check-missing",
    {
      method: "POST",
    }
  );
}
