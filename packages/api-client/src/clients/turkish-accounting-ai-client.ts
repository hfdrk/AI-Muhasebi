import { apiClient } from "../api-client";

export const turkishAccountingAiClient = {
  async getAccountSuggestions(input: { description: string; amount?: number; type?: string }): Promise<{ data: any }> {
    return apiClient.post("/api/v1/turkish-accounting-ai/hesap-onerileri", input);
  },
  async analyzeTransaction(input: { description: string; amount: number; date?: string }): Promise<{ data: any }> {
    return apiClient.post("/api/v1/turkish-accounting-ai/islem-analizi", input);
  },
  async checkBaBsRequirement(input: { counterpartyVkn: string; totalAmount: number; period: string }): Promise<{ data: any }> {
    return apiClient.post("/api/v1/turkish-accounting-ai/babs-kontrol", input);
  },
  async generateVoucher(input: { transactionId?: string; description: string; entries: any[] }): Promise<{ data: any }> {
    return apiClient.post("/api/v1/turkish-accounting-ai/muhasebe-fisi", input);
  },
  async askQuestion(input: { question: string; context?: string }): Promise<{ data: any }> {
    return apiClient.post("/api/v1/turkish-accounting-ai/soru-cevap", input);
  },
  async getTerms(): Promise<{ data: any }> {
    return apiClient.get("/api/v1/turkish-accounting-ai/terimler");
  },
  async getTermDetail(term: string): Promise<{ data: any }> {
    return apiClient.get(`/api/v1/turkish-accounting-ai/terimler/${encodeURIComponent(term)}`);
  },
  async searchTerms(input: { query: string }): Promise<{ data: any }> {
    return apiClient.post("/api/v1/turkish-accounting-ai/terimler/ara", input);
  },
  async getChartOfAccounts(): Promise<{ data: any }> {
    return apiClient.get("/api/v1/turkish-accounting-ai/hesap-plani");
  },
  async getAccountDetail(code: string): Promise<{ data: any }> {
    return apiClient.get(`/api/v1/turkish-accounting-ai/hesap-plani/${encodeURIComponent(code)}`);
  },
  async getTaxRates(): Promise<{ data: any }> {
    return apiClient.get("/api/v1/turkish-accounting-ai/vergi-oranlari");
  },
  async getAccountingScenarios(): Promise<{ data: any }> {
    return apiClient.get("/api/v1/turkish-accounting-ai/muhasebe-senaryolari");
  },
};
