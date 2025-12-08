const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3800";

export interface ReportDefinition {
  code: string;
  name: string;
  description: string | null;
}

export interface BaseReportResult {
  title: string;
  period: {
    start_date: string;
    end_date: string;
  };
  generated_at: string;
  rows: any[];
  totals?: any;
}

export interface ScheduledReport {
  id: string;
  name: string;
  reportCode: string;
  format: "pdf" | "excel";
  scheduleCron: "daily" | "weekly" | "monthly";
  recipients: string[];
  isActive: boolean;
  lastRunAt: string | null;
  lastRunStatus: "success" | "failed" | null;
  createdAt: string;
  updatedAt: string;
  clientCompany?: {
    id: string;
    name: string;
  } | null;
}

export interface ReportExecutionLog {
  id: string;
  reportCode: string;
  scheduledReportId: string | null;
  startedAt: string;
  finishedAt: string | null;
  status: "success" | "failed";
  message: string | null;
}

export interface GenerateReportParams {
  report_code: string;
  client_company_id?: string | null;
  filters: {
    start_date: string;
    end_date: string;
    [key: string]: any;
  };
}

export interface DownloadReportParams {
  report_code: string;
  client_company_id?: string | null;
  filters: {
    start_date: string;
    end_date: string;
    [key: string]: any;
  };
  format: "pdf" | "excel";
}

export interface CreateScheduledReportInput {
  name: string;
  report_code: string;
  client_company_id?: string | null;
  format: "pdf" | "excel";
  schedule_cron: "daily" | "weekly" | "monthly";
  filters: {
    start_date: string;
    end_date: string;
    [key: string]: any;
  };
  recipients: string[];
  is_active: boolean;
}

export interface UpdateScheduledReportInput {
  name?: string;
  client_company_id?: string | null;
  format?: "pdf" | "excel";
  schedule_cron?: "daily" | "weekly" | "monthly";
  filters?: {
    start_date: string;
    end_date: string;
    [key: string]: any;
  };
  recipients?: string[];
  is_active?: boolean;
}

async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
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

async function apiRequestBlob(endpoint: string, options?: RequestInit): Promise<Blob> {
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

  return response.blob();
}

export async function listReportDefinitions(): Promise<{ data: ReportDefinition[] }> {
  return apiRequest<{ data: ReportDefinition[] }>("/api/v1/reports/definitions");
}

export async function generateReport(
  params: GenerateReportParams
): Promise<{ data: BaseReportResult }> {
  return apiRequest<{ data: BaseReportResult }>("/api/v1/reports/generate", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function downloadReport(params: DownloadReportParams): Promise<Blob> {
  return apiRequestBlob("/api/v1/reports/download", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });
}

export async function listScheduledReports(): Promise<{ data: ScheduledReport[] }> {
  return apiRequest<{ data: ScheduledReport[] }>("/api/v1/scheduled-reports");
}

export async function getScheduledReport(id: string): Promise<{ data: ScheduledReport }> {
  return apiRequest<{ data: ScheduledReport }>(`/api/v1/scheduled-reports/${id}`);
}

export async function createScheduledReport(
  data: CreateScheduledReportInput
): Promise<{ data: ScheduledReport }> {
  return apiRequest<{ data: ScheduledReport }>("/api/v1/scheduled-reports", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateScheduledReport(
  id: string,
  data: UpdateScheduledReportInput
): Promise<{ data: ScheduledReport }> {
  return apiRequest<{ data: ScheduledReport }>(`/api/v1/scheduled-reports/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteScheduledReport(id: string): Promise<void> {
  return apiRequest<void>(`/api/v1/scheduled-reports/${id}`, {
    method: "DELETE",
  });
}

export async function listExecutionLogs(limit: number = 20): Promise<{ data: ReportExecutionLog[] }> {
  return apiRequest<{ data: ReportExecutionLog[] }>(
    `/api/v1/report-execution-logs?limit=${limit}`
  );
}

export async function listExecutionLogsForScheduled(
  scheduledReportId: string
): Promise<{ data: ReportExecutionLog[] }> {
  return apiRequest<{ data: ReportExecutionLog[] }>(
    `/api/v1/report-execution-logs/scheduled/${scheduledReportId}`
  );
}


