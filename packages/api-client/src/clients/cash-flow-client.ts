import { apiClient } from "../api-client";

// Nakit Akışı (Cash Flow)

export interface CashFlowEntry {
  id: string;
  tenantId: string;
  type: "INFLOW" | "OUTFLOW"; // Giriş | Çıkış
  category: string;
  source?: string;
  amount: number;
  currency: string;
  entryDate: string;
  description?: string;
  clientCompanyId?: string;
  isRecurring: boolean;
  createdAt: string;
  updatedAt: string;
  clientCompany?: { name: string; taxNumber?: string };
}

export interface CashFlowListParams {
  type?: "INFLOW" | "OUTFLOW";
  category?: string;
  source?: string;
  dateStart?: string;
  dateEnd?: string;
  clientCompanyId?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export interface CashFlowCreateInput {
  type: "INFLOW" | "OUTFLOW";
  category: string;
  source?: string;
  amount: number;
  currency?: string;
  entryDate: string;
  description?: string;
  clientCompanyId?: string;
  isRecurring?: boolean;
}

export interface CashFlowDashboardStats {
  totalInflow: number;
  totalOutflow: number;
  netCashFlow: number;
  inflowCount: number;
  outflowCount: number;
  categoryBreakdown: { category: string; inflow: number; outflow: number }[];
  monthlyTrend: { month: string; inflow: number; outflow: number; net: number }[];
}

export interface CashFlowSummary {
  periodStart: string;
  periodEnd: string;
  totalInflow: number;
  totalOutflow: number;
  netCashFlow: number;
  openingBalance: number;
  closingBalance: number;
}

export interface CashFlowForecast {
  months: {
    month: string;
    projectedInflow: number;
    projectedOutflow: number;
    projectedNet: number;
    cumulativeBalance: number;
  }[];
}

export interface CashFlowDailyBreakdown {
  year: number;
  month: number;
  days: {
    day: number;
    date: string;
    inflow: number;
    outflow: number;
    net: number;
  }[];
}

export const cashFlowClient = {
  /** Nakit akışı kayıtlarını listele */
  async list(params?: CashFlowListParams): Promise<{ data: { items: CashFlowEntry[]; pagination: any } }> {
    return apiClient.get("/api/v1/cash-flow", { params: params as any });
  },

  /** Dashboard istatistikleri */
  async getStats(): Promise<{ data: CashFlowDashboardStats }> {
    return apiClient.get("/api/v1/cash-flow/stats");
  },

  /** Mevcut dönem özeti */
  async getSummary(): Promise<{ data: CashFlowSummary }> {
    return apiClient.get("/api/v1/cash-flow/summary");
  },

  /** N aylık tahmin (forecast) */
  async getForecast(months?: number): Promise<{ data: CashFlowForecast }> {
    return apiClient.get("/api/v1/cash-flow/forecast", { params: { months } });
  },

  /** Günlük detay dökümü */
  async getDailyBreakdown(year: number, month: number): Promise<{ data: CashFlowDailyBreakdown }> {
    return apiClient.get("/api/v1/cash-flow/daily", { params: { year, month } });
  },

  /** Yeni nakit akışı kaydı oluştur */
  async create(input: CashFlowCreateInput): Promise<{ data: CashFlowEntry }> {
    return apiClient.post("/api/v1/cash-flow", input);
  },

  /** Faturalardan senkronize et */
  async syncFromInvoices(): Promise<{ data: { syncedCount: number } }> {
    return apiClient.post("/api/v1/cash-flow/sync");
  },

  /** Nakit akışı kaydı güncelle */
  async update(id: string, input: Partial<CashFlowCreateInput>): Promise<{ data: CashFlowEntry }> {
    return apiClient.put(`/api/v1/cash-flow/${id}`, input);
  },

  /** Nakit akışı kaydı sil */
  async delete(id: string): Promise<{ data: { success: boolean } }> {
    return apiClient.delete(`/api/v1/cash-flow/${id}`);
  },
};
