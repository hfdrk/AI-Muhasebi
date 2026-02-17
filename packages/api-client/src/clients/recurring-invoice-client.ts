import { apiClient } from "../api-client";

// Tekrarlayan Fatura (Recurring Invoice)

export interface RecurringInvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate?: number;
  amount: number;
}

export interface RecurringInvoice {
  id: string;
  tenantId: string;
  clientCompanyId: string;
  templateName: string;
  type: string;
  frequency: string; // DAILY | WEEKLY | MONTHLY | QUARTERLY | YEARLY
  dayOfMonth?: number;
  startDate: string;
  endDate?: string;
  totalAmount: number;
  currency: string;
  taxAmount: number;
  counterpartyName?: string;
  counterpartyTaxNo?: string;
  lineItems: RecurringInvoiceLineItem[];
  autoSend: boolean;
  isActive: boolean;
  notes?: string;
  lastGeneratedAt?: string;
  nextGenerationDate?: string;
  createdAt: string;
  updatedAt: string;
  clientCompany?: { name: string; taxNumber?: string };
}

export interface RecurringInvoiceListParams {
  clientCompanyId?: string;
  frequency?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
}

export interface RecurringInvoiceCreateInput {
  clientCompanyId: string;
  templateName: string;
  type: string;
  frequency: string;
  dayOfMonth?: number;
  startDate: string;
  endDate?: string;
  totalAmount: number;
  currency?: string;
  taxAmount: number;
  counterpartyName?: string;
  counterpartyTaxNo?: string;
  lineItems?: RecurringInvoiceLineItem[];
  autoSend?: boolean;
  notes?: string;
}

export interface RecurringInvoiceDashboardStats {
  totalTemplates: number;
  activeTemplates: number;
  inactiveTemplates: number;
  totalGeneratedThisMonth: number;
  totalAmountThisMonth: number;
  upcomingGenerations: { id: string; templateName: string; nextDate: string; amount: number }[];
  frequencyBreakdown: { frequency: string; count: number }[];
}

export const recurringInvoiceClient = {
  /** Tekrarlayan faturaları listele */
  async list(params?: RecurringInvoiceListParams): Promise<{ data: { items: RecurringInvoice[]; pagination: any } }> {
    return apiClient.get("/api/v1/recurring-invoices", { params: params as any });
  },

  /** Dashboard istatistikleri */
  async getStats(): Promise<{ data: RecurringInvoiceDashboardStats }> {
    return apiClient.get("/api/v1/recurring-invoices/stats");
  },

  /** Tekil tekrarlayan fatura getir */
  async getById(id: string): Promise<{ data: RecurringInvoice }> {
    return apiClient.get(`/api/v1/recurring-invoices/${id}`);
  },

  /** Yeni tekrarlayan fatura oluştur */
  async create(input: RecurringInvoiceCreateInput): Promise<{ data: RecurringInvoice }> {
    return apiClient.post("/api/v1/recurring-invoices", input);
  },

  /** Tekrarlayan fatura güncelle */
  async update(id: string, input: Partial<RecurringInvoiceCreateInput>): Promise<{ data: RecurringInvoice }> {
    return apiClient.put(`/api/v1/recurring-invoices/${id}`, input);
  },

  /** Tekrarlayan fatura sil (soft delete) */
  async delete(id: string): Promise<{ data: { success: boolean } }> {
    return apiClient.delete(`/api/v1/recurring-invoices/${id}`);
  },

  /** Aktif/pasif durumunu değiştir */
  async toggleActive(id: string): Promise<{ data: RecurringInvoice }> {
    return apiClient.patch(`/api/v1/recurring-invoices/${id}/toggle`);
  },

  /** Fatura üretimini tetikle */
  async generate(): Promise<{ data: { generatedCount: number; invoices: any[] } }> {
    return apiClient.post("/api/v1/recurring-invoices/generate");
  },
};
