import { getAccessToken } from "../token-store";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";

export interface EmailTemplate {
  name: string;
  exists: boolean;
  size: number;
}

export interface EmailTemplateContent {
  name: string;
  content: string;
}

export interface PreviewResponse {
  html: string;
  text: string;
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

export const emailTemplateClient = {
  /**
   * List all email templates
   */
  async listTemplates(): Promise<{ data: EmailTemplate[] }> {
    return apiRequest<{ data: EmailTemplate[] }>("/api/v1/email-templates", {
      method: "GET",
    });
  },

  /**
   * Get template content
   */
  async getTemplate(templateName: string): Promise<{ data: EmailTemplateContent }> {
    return apiRequest<{ data: EmailTemplateContent }>(`/api/v1/email-templates/${templateName}`, {
      method: "GET",
    });
  },

  /**
   * Update template
   */
  async updateTemplate(templateName: string, content: string): Promise<{ data: { name: string; message: string } }> {
    return apiRequest<{ data: { name: string; message: string } }>(`/api/v1/email-templates/${templateName}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    });
  },

  /**
   * Preview template with sample data
   */
  async previewTemplate(templateName: string, variables?: Record<string, any>): Promise<{ data: PreviewResponse }> {
    return apiRequest<{ data: PreviewResponse }>(`/api/v1/email-templates/${templateName}/preview`, {
      method: "POST",
      body: JSON.stringify({ variables }),
    });
  },

  /**
   * Send test email
   */
  async sendTestEmail(templateName: string, to: string, subject?: string, variables?: Record<string, any>): Promise<{ data: { message: string } }> {
    return apiRequest<{ data: { message: string } }>(`/api/v1/email-templates/${templateName}/test`, {
      method: "POST",
      body: JSON.stringify({ to, subject, variables }),
    });
  },
};



