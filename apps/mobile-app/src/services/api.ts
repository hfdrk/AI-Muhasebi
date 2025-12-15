import {tokenStorage} from '../storage/token-storage';

const API_URL = process.env.API_URL || 'http://localhost:3800';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {params, ...fetchOptions} = options;

  // Build URL with query params
  let url = `${API_URL}${endpoint}`;
  if (params) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });
    const queryString = queryParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  // Get auth token
  const token = await tokenStorage.getAccessToken();

  // Make request
  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(token && {Authorization: `Bearer ${token}`}),
      ...fetchOptions.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: {message: 'Bir hata oluştu.'},
    }));
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// Auth endpoints
export const authAPI = {
  async login(email: string, password: string) {
    return apiRequest<{
      data: {
        user: {
          id: string;
          email: string;
          fullName: string;
          locale: string;
        };
        accessToken: string;
        tenantId?: string;
      };
    }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({email, password}),
    });
  },
};

// Mobile dashboard endpoint
export const mobileAPI = {
  async getDashboard() {
    return apiRequest<{
      data: {
        totalClientCompanies: number;
        openRiskAlerts: number;
        pendingDocuments: number;
        todayInvoices: number;
        recentNotifications: Array<{
          id: string;
          title: string;
          createdAt: string;
        }>;
      };
    }>('/api/v1/mobile/dashboard');
  },
};

// Risk alerts
export const riskAPI = {
  async listAlerts(params?: {
    clientCompanyId?: string;
    severity?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    return apiRequest<{
      data: {
        data: Array<any>;
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      };
    }>('/api/v1/risk/alerts', {params});
  },
};

// Notifications
export const notificationAPI = {
  async list(params?: {
    is_read?: boolean;
    type?: string;
    limit?: number;
    offset?: number;
  }) {
    return apiRequest<{
      data: Array<any>;
      meta: {
        total: number;
        limit: number;
        offset: number;
      };
    }>('/api/v1/notifications', {params});
  },

  async markAsRead(notificationId: string) {
    return apiRequest<{data: any}>(`/api/v1/notifications/${notificationId}/read`, {
      method: 'POST',
    });
  },

  async markAllAsRead() {
    return apiRequest<{data: any}>('/api/v1/notifications/read-all', {
      method: 'POST',
    });
  },
};

// Client companies
export const clientCompanyAPI = {
  async list(params?: {
    isActive?: boolean;
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    return apiRequest<{
      data: {
        data: Array<{id: string; name: string; taxNumber: string}>;
        total: number;
      };
    }>('/api/v1/client-companies', {params});
  },
};

// Documents
export const documentAPI = {
  async upload(file: {uri: string; type: string; name: string}, clientCompanyId: string, type?: string) {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      type: file.type,
      name: file.name,
    } as any);
    formData.append('clientCompanyId', clientCompanyId);
    if (type) {
      formData.append('type', type);
    }

    const token = await tokenStorage.getAccessToken();

    const response = await fetch(`${API_URL}/api/v1/documents/upload`, {
      method: 'POST',
      headers: {
        ...(token && {Authorization: `Bearer ${token}`}),
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: {message: 'Bir hata oluştu.'},
      }));
      throw new Error(error.error?.message || 'Yükleme başarısız.');
    }

    return response.json();
  },
};

// AI Assistant
export const aiAPI = {
  async chat(question: string, type?: 'GENEL' | 'RAPOR' | 'RISK') {
    return apiRequest<{
      data: {answer: string};
    }>('/api/v1/ai/chat', {
      method: 'POST',
      body: JSON.stringify({question, type}),
    });
  },

  async getDailyRiskSummary(date?: string) {
    return apiRequest<{
      data: {summary: string; date: string};
    }>('/api/v1/ai/summaries/daily-risk', {
      method: 'POST',
      body: JSON.stringify(date ? {date} : {}),
    });
  },

  async getPortfolioSummary() {
    return apiRequest<{
      data: {summary: string};
    }>('/api/v1/ai/summaries/portfolio', {
      method: 'POST',
    });
  },
};

// User info
export const userAPI = {
  async getMe() {
    return apiRequest<{
      data: {
        id: string;
        email: string;
        fullName: string;
        locale: string;
        tenants: Array<{
          id: string;
          name: string;
          role: string;
        }>;
      };
    }>('/api/v1/users/me');
  },
};





