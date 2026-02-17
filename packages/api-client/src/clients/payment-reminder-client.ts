import { apiClient } from "../api-client";

// Ödeme Hatırlatıcıları (Payment Reminders)

export interface PaymentReminder {
  id: string;
  tenantId: string;
  clientCompanyId?: string;
  invoiceId?: string;
  checkNoteId?: string;
  type: string;
  dueDate: string;
  amount: number;
  currency: string;
  description: string;
  reminderDaysBefore: number;
  isPaid: boolean;
  paidAt?: string;
  lastNotifiedAt?: string;
  createdAt: string;
  updatedAt: string;
  clientCompany?: { name: string; taxNumber?: string };
  invoice?: { invoiceNumber: string };
  checkNote?: { documentNumber: string; type: string };
}

export interface PaymentReminderListParams {
  type?: string;
  isPaid?: boolean;
  upcoming?: boolean;
  overdue?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
}

export interface PaymentReminderCreateInput {
  clientCompanyId?: string;
  invoiceId?: string;
  checkNoteId?: string;
  type: string;
  dueDate: string;
  amount: number;
  currency?: string;
  description: string;
  reminderDaysBefore?: number;
}

export interface PaymentReminderDashboardStats {
  totalReminders: number;
  paidCount: number;
  unpaidCount: number;
  overdueCount: number;
  overdueAmount: number;
  upcomingCount: number;
  upcomingAmount: number;
  totalOutstandingAmount: number;
  typeBreakdown: { type: string; count: number; amount: number }[];
}

export const paymentReminderClient = {
  /** Ödeme hatırlatıcılarını listele */
  async list(params?: PaymentReminderListParams): Promise<{ data: { items: PaymentReminder[]; pagination: any } }> {
    return apiClient.get("/api/v1/payment-reminders", { params: params as any });
  },

  /** Dashboard istatistikleri */
  async getStats(): Promise<{ data: PaymentReminderDashboardStats }> {
    return apiClient.get("/api/v1/payment-reminders/stats");
  },

  /** Yaklaşan ödemeler */
  async getUpcoming(days?: number): Promise<{ data: PaymentReminder[] }> {
    return apiClient.get("/api/v1/payment-reminders/upcoming", { params: { days } });
  },

  /** Vadesi geçmiş ödemeler */
  async getOverdue(): Promise<{ data: PaymentReminder[] }> {
    return apiClient.get("/api/v1/payment-reminders/overdue");
  },

  /** Tekil hatırlatıcı getir */
  async getById(id: string): Promise<{ data: PaymentReminder }> {
    return apiClient.get(`/api/v1/payment-reminders/${id}`);
  },

  /** Yeni hatırlatıcı oluştur */
  async create(input: PaymentReminderCreateInput): Promise<{ data: PaymentReminder }> {
    return apiClient.post("/api/v1/payment-reminders", input);
  },

  /** Fatura ve çeklerden otomatik senkronize et */
  async sync(): Promise<{ data: { syncedCount: number } }> {
    return apiClient.post("/api/v1/payment-reminders/sync");
  },

  /** Hatırlatıcıları işle ve bildirim gönder */
  async processAndNotify(): Promise<{ data: { processedCount: number; notifiedCount: number } }> {
    return apiClient.post("/api/v1/payment-reminders/process");
  },

  /** Hatırlatıcı güncelle */
  async update(id: string, input: Partial<PaymentReminderCreateInput>): Promise<{ data: PaymentReminder }> {
    return apiClient.put(`/api/v1/payment-reminders/${id}`, input);
  },

  /** Hatırlatıcı sil */
  async delete(id: string): Promise<{ data: { success: boolean } }> {
    return apiClient.delete(`/api/v1/payment-reminders/${id}`);
  },

  /** Ödendi olarak işaretle */
  async markAsPaid(id: string): Promise<{ data: PaymentReminder }> {
    return apiClient.patch(`/api/v1/payment-reminders/${id}/paid`);
  },
};
