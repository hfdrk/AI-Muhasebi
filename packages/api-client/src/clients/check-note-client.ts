import { apiClient } from "../api-client";

// Çek ve Senet (Check & Promissory Note)

export interface CheckNote {
  id: string;
  tenantId: string;
  clientCompanyId?: string;
  type: "CEK" | "SENET"; // Çek | Senet
  direction: "ALACAK" | "BORC"; // Alacak | Borç
  status: string;
  documentNumber: string;
  issuer?: string;
  bankName?: string;
  branchName?: string;
  amount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  endorsedTo?: string;
  collectedDate?: string;
  bouncedDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  clientCompany?: { name: string; taxNumber?: string };
}

export interface CheckNoteListParams {
  type?: "CEK" | "SENET";
  direction?: "ALACAK" | "BORC";
  status?: string;
  clientCompanyId?: string;
  dueDateStart?: string;
  dueDateEnd?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export interface CheckNoteCreateInput {
  clientCompanyId?: string;
  type: "CEK" | "SENET";
  direction: "ALACAK" | "BORC";
  documentNumber: string;
  issuer?: string;
  bankName?: string;
  branchName?: string;
  amount: number;
  currency?: string;
  issueDate: string;
  dueDate: string;
  notes?: string;
}

export interface CheckNoteStatusUpdateInput {
  status: string;
  endorsedTo?: string;
  collectedDate?: string;
  bouncedDate?: string;
}

export interface CheckNoteDashboardStats {
  totalChecks: number;
  totalNotes: number;
  totalReceivable: number;
  totalPayable: number;
  overdueCount: number;
  overdueAmount: number;
  upcomingCount: number;
  upcomingAmount: number;
  statusBreakdown: { status: string; count: number; amount: number }[];
}

export const checkNoteClient = {
  /** Çek ve senetleri listele */
  async list(params?: CheckNoteListParams): Promise<{ data: { items: CheckNote[]; pagination: any } }> {
    return apiClient.get("/api/v1/check-notes", { params: params as any });
  },

  /** Dashboard istatistikleri */
  async getStats(): Promise<{ data: CheckNoteDashboardStats }> {
    return apiClient.get("/api/v1/check-notes/stats");
  },

  /** Yaklaşan vadeli çek/senetler */
  async getUpcoming(days?: number): Promise<{ data: CheckNote[] }> {
    return apiClient.get("/api/v1/check-notes/upcoming", { params: { days } });
  },

  /** Vadesi geçmiş çek/senetler */
  async getOverdue(): Promise<{ data: CheckNote[] }> {
    return apiClient.get("/api/v1/check-notes/overdue");
  },

  /** Tekil çek/senet getir */
  async getById(id: string): Promise<{ data: CheckNote }> {
    return apiClient.get(`/api/v1/check-notes/${id}`);
  },

  /** Yeni çek/senet oluştur */
  async create(input: CheckNoteCreateInput): Promise<{ data: CheckNote }> {
    return apiClient.post("/api/v1/check-notes", input);
  },

  /** Çek/senet güncelle */
  async update(id: string, input: Partial<CheckNoteCreateInput>): Promise<{ data: CheckNote }> {
    return apiClient.put(`/api/v1/check-notes/${id}`, input);
  },

  /** Çek/senet sil */
  async delete(id: string): Promise<{ data: { success: boolean } }> {
    return apiClient.delete(`/api/v1/check-notes/${id}`);
  },

  /** Durum güncelle */
  async updateStatus(id: string, input: CheckNoteStatusUpdateInput): Promise<{ data: CheckNote }> {
    return apiClient.patch(`/api/v1/check-notes/${id}/status`, input);
  },

  /** Ciro et */
  async endorse(id: string, endorsedTo: string): Promise<{ data: CheckNote }> {
    return apiClient.patch(`/api/v1/check-notes/${id}/endorse`, { endorsedTo });
  },
};
