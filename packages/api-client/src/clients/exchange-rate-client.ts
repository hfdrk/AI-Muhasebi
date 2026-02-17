import { apiClient } from "../api-client";

// Döviz Kurları (Exchange Rates)

export interface ExchangeRate {
  id: string;
  baseCurrency: string;
  quoteCurrency: string;
  buyRate: number;
  sellRate: number;
  rateDate: string;
  source?: string;
  createdAt: string;
}

export interface ExchangeRateCurrency {
  code: string;
  name: string;
  symbol?: string;
}

export interface ExchangeRateHistoryParams {
  baseCurrency: string;
  quoteCurrency: string;
  dateStart: string;
  dateEnd: string;
}

export interface ExchangeRateConvertParams {
  amount: number;
  from: string;
  to: string;
  date?: string;
}

export interface ExchangeRateConvertResult {
  amount: number;
  from: string;
  to: string;
  rate: number;
  convertedAmount: number;
  date: string;
}

export interface ExchangeRateCreateInput {
  baseCurrency: string;
  quoteCurrency: string;
  buyRate: number;
  sellRate: number;
  rateDate: string;
  source?: string;
}

export const exchangeRateClient = {
  /** Güncel döviz kurlarını getir */
  async getLatest(baseCurrency?: string): Promise<{ data: ExchangeRate[] }> {
    return apiClient.get("/api/v1/exchange-rates", { params: { baseCurrency } });
  },

  /** Desteklenen para birimlerini getir */
  async getCurrencies(): Promise<{ data: ExchangeRateCurrency[] }> {
    return apiClient.get("/api/v1/exchange-rates/currencies");
  },

  /** Geçmiş kur verilerini getir */
  async getHistory(params: ExchangeRateHistoryParams): Promise<{ data: ExchangeRate[] }> {
    return apiClient.get("/api/v1/exchange-rates/history", { params: params as any });
  },

  /** Döviz çevirisi yap */
  async convert(params: ExchangeRateConvertParams): Promise<{ data: ExchangeRateConvertResult }> {
    return apiClient.get("/api/v1/exchange-rates/convert", { params: params as any });
  },

  /** Manuel kur ekle */
  async addManualRate(input: ExchangeRateCreateInput): Promise<{ data: ExchangeRate }> {
    return apiClient.post("/api/v1/exchange-rates", input);
  },

  /** TCMB'den kur verisi çek */
  async fetchFromTCMB(): Promise<{ data: { fetchedCount: number; rates: ExchangeRate[] } }> {
    return apiClient.post("/api/v1/exchange-rates/fetch-tcmb");
  },
};
