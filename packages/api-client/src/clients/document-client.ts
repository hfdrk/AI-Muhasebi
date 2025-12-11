const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";

export interface Document {
  id: string;
  tenantId: string;
  clientCompanyId: string;
  relatedInvoiceId: string | null;
  relatedTransactionId: string | null;
  type: "INVOICE" | "BANK_STATEMENT" | "RECEIPT" | "OTHER";
  originalFileName: string;
  storagePath: string;
  mimeType: string;
  fileSizeBytes: number;
  uploadUserId: string;
  uploadSource: "manual" | "email_import" | "integration";
  status: "UPLOADED" | "PROCESSING" | "PROCESSED" | "FAILED";
  processingErrorMessage: string | null;
  processedAt: Date | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListDocumentsParams {
  clientCompanyId?: string;
  type?: "INVOICE" | "BANK_STATEMENT" | "RECEIPT" | "OTHER";
  status?: "UPLOADED" | "PROCESSING" | "PROCESSED" | "FAILED";
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

import type { PaginatedResponse } from "./shared-types";

// Re-export for backward compatibility
export type { PaginatedResponse };

export interface DocumentAIAnalysis {
  ocrResult: {
    id: string;
    rawText: string;
    ocrEngine: string;
    confidence: number | null;
    createdAt: Date;
  } | null;
  parsedData: {
    id: string;
    documentType: string;
    fields: any;
    parserVersion: string;
    createdAt: Date;
  } | null;
  riskFeatures: {
    id: string;
    features: any;
    riskFlags: Array<{
      code: string;
      severity: "low" | "medium" | "high";
      description: string;
      value?: boolean | string | number;
    }>;
    riskScore: number | null;
    generatedAt: Date;
  } | null;
}

export interface DocumentWithRiskFlags extends Document {
  riskFlagCount?: number;
  riskScore?: number | null;
  riskSeverity?: "low" | "medium" | "high" | null;
}

export interface SearchByRiskParams {
  hasRiskFlags?: boolean;
  riskFlagCode?: string;
  riskSeverity?: "low" | "medium" | "high";
  minRiskScore?: number;
  maxRiskScore?: number;
  clientCompanyId?: string;
  page?: number;
  pageSize?: number;
}

async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
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

export async function uploadDocument(
  file: File,
  metadata: {
    clientCompanyId: string;
    type?: "INVOICE" | "BANK_STATEMENT" | "RECEIPT" | "OTHER";
    relatedInvoiceId?: string | null;
    relatedTransactionId?: string | null;
  }
): Promise<{ data: Document }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("clientCompanyId", metadata.clientCompanyId);
  if (metadata.type) {
    formData.append("type", metadata.type);
  }
  if (metadata.relatedInvoiceId) {
    formData.append("relatedInvoiceId", metadata.relatedInvoiceId);
  }
  if (metadata.relatedTransactionId) {
    formData.append("relatedTransactionId", metadata.relatedTransactionId);
  }

  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const response = await fetch(`${API_URL}/api/v1/documents/upload`, {
    method: "POST",
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: "Bir hata oluştu." } }));
    throw new Error(error.error?.message || "Bir hata oluştu.");
  }

  return response.json();
}

export interface BatchUploadResult {
  batchId: string;
  totalFiles: number;
  successfulUploads: number;
  failedUploads: number;
  documentIds: string[];
  errors: Array<{ fileName: string; error: string }>;
}

export interface BatchStatus {
  batchId: string;
  totalFiles: number;
  processed: number;
  failed: number;
  documents: Array<{
    id: string;
    fileName: string;
    status: string;
    error?: string;
  }>;
}

export interface BatchAnalysisResult {
  analysisId: string;
  batchId: string;
  summary: string;
  riskScore: number;
  findings: Array<{
    type: "risk" | "anomaly" | "pattern" | "recommendation";
    severity: "low" | "medium" | "high";
    description: string;
    documentIds?: string[];
  }>;
  documentCount: number;
  analyzedAt: Date;
}

export async function uploadZipFile(
  zipFile: File,
  metadata: {
    clientCompanyId: string;
    type?: "INVOICE" | "BANK_STATEMENT" | "RECEIPT" | "OTHER";
    relatedInvoiceId?: string | null;
    relatedTransactionId?: string | null;
  }
): Promise<{ data: BatchUploadResult }> {
  const formData = new FormData();
  formData.append("zipFile", zipFile);
  formData.append("clientCompanyId", metadata.clientCompanyId);
  if (metadata.type) {
    formData.append("type", metadata.type);
  }
  if (metadata.relatedInvoiceId) {
    formData.append("relatedInvoiceId", metadata.relatedInvoiceId);
  }
  if (metadata.relatedTransactionId) {
    formData.append("relatedTransactionId", metadata.relatedTransactionId);
  }

  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const response = await fetch(`${API_URL}/api/v1/documents/upload-batch`, {
    method: "POST",
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: "Bir hata oluştu." } }));
    throw new Error(error.error?.message || "Bir hata oluştu.");
  }

  return response.json();
}

export async function getBatchStatus(batchId: string): Promise<{ data: BatchStatus }> {
  return apiRequest<{ data: BatchStatus }>(`/api/v1/documents/batch/${batchId}/status`);
}

export async function analyzeBatch(params: {
  clientCompanyId: string;
  documentIds: string[];
}): Promise<{ data: BatchAnalysisResult }> {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const response = await fetch(`${API_URL}/api/v1/documents/batch/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    credentials: "include",
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: "Bir hata oluştu." } }));
    throw new Error(error.error?.message || "Bir hata oluştu.");
  }

  return response.json();
}

export async function listDocuments(
  params?: ListDocumentsParams
): Promise<PaginatedResponse<DocumentWithRiskFlags>> {
  const queryParams = new URLSearchParams();
  if (params?.clientCompanyId) {
    queryParams.append("clientCompanyId", params.clientCompanyId);
  }
  if (params?.type) {
    queryParams.append("type", params.type);
  }
  if (params?.status) {
    queryParams.append("status", params.status);
  }
  if (params?.dateFrom) {
    queryParams.append("dateFrom", params.dateFrom);
  }
  if (params?.dateTo) {
    queryParams.append("dateTo", params.dateTo);
  }
  if (params?.page) {
    queryParams.append("page", params.page.toString());
  }
  if (params?.pageSize) {
    queryParams.append("pageSize", params.pageSize.toString());
  }

  return apiRequest<PaginatedResponse<Document>>(
    `/api/v1/documents?${queryParams.toString()}`
  );
}

export async function getDocument(id: string): Promise<{ data: Document }> {
  return apiRequest<{ data: Document }>(`/api/v1/documents/${id}`);
}

export async function getDocumentAIAnalysis(id: string): Promise<{ data: DocumentAIAnalysis }> {
  return apiRequest<{ data: DocumentAIAnalysis }>(`/api/v1/documents/${id}/ai-analysis`);
}

export async function searchDocumentsByRisk(
  params?: SearchByRiskParams
): Promise<PaginatedResponse<DocumentWithRiskFlags>> {
  const queryParams = new URLSearchParams();
  if (params?.hasRiskFlags !== undefined) {
    queryParams.append("hasRiskFlags", params.hasRiskFlags.toString());
  }
  if (params?.riskFlagCode) {
    queryParams.append("riskFlagCode", params.riskFlagCode);
  }
  if (params?.riskSeverity) {
    queryParams.append("riskSeverity", params.riskSeverity);
  }
  if (params?.minRiskScore !== undefined) {
    queryParams.append("minRiskScore", params.minRiskScore.toString());
  }
  if (params?.maxRiskScore !== undefined) {
    queryParams.append("maxRiskScore", params.maxRiskScore.toString());
  }
  if (params?.clientCompanyId) {
    queryParams.append("clientCompanyId", params.clientCompanyId);
  }
  if (params?.page) {
    queryParams.append("page", params.page.toString());
  }
  if (params?.pageSize) {
    queryParams.append("pageSize", params.pageSize.toString());
  }

  return apiRequest<PaginatedResponse<DocumentWithRiskFlags>>(
    `/api/v1/documents/search-by-risk?${queryParams.toString()}`
  );
}

export async function downloadDocument(id: string): Promise<Blob> {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const response = await fetch(`${API_URL}/api/v1/documents/${id}/download`, {
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: "Bir hata oluştu." } }));
    throw new Error(error.error?.message || "Bir hata oluştu.");
  }

  return response.blob();
}

export async function retryDocumentProcessing(id: string): Promise<{ data: { message: string } }> {
  return apiRequest<{ data: { message: string } }>(`/api/v1/documents/${id}/retry`, {
    method: "POST",
  });
}

export async function deleteDocument(id: string): Promise<{ data: { message: string } }> {
  return apiRequest<{ data: { message: string } }>(`/api/v1/documents/${id}`, {
    method: "DELETE",
  });
}

