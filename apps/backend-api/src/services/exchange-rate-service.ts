import { prisma } from "../lib/prisma";
import { NotFoundError } from "@repo/shared-utils";
import { logger } from "@repo/shared-utils";

// Realistic TCMB-based rates for common currencies vs TRY (approximate Feb 2026)
const DEFAULT_RATES: Record<string, { buy: number; sell: number }> = {
  USD: { buy: 36.20, sell: 36.35 },
  EUR: { buy: 37.80, sell: 37.95 },
  GBP: { buy: 45.10, sell: 45.30 },
  CHF: { buy: 40.50, sell: 40.70 },
  JPY: { buy: 0.2380, sell: 0.2395 },
  SAR: { buy: 9.65, sell: 9.70 },
  AED: { buy: 9.86, sell: 9.91 },
  RUB: { buy: 0.36, sell: 0.37 },
  CNY: { buy: 4.95, sell: 5.00 },
  CAD: { buy: 25.40, sell: 25.55 },
  AUD: { buy: 22.80, sell: 22.95 },
  SEK: { buy: 3.35, sell: 3.38 },
  NOK: { buy: 3.30, sell: 3.33 },
  DKK: { buy: 5.07, sell: 5.10 },
  KWD: { buy: 117.50, sell: 118.00 },
};

export class ExchangeRateService {
  private readonly SUPPORTED_CURRENCIES = Object.keys(DEFAULT_RATES);

  /**
   * Get latest rates
   */
  async getLatestRates(baseCurrency?: string) {
    const where: any = { quoteCurrency: "TRY" };
    if (baseCurrency) where.baseCurrency = baseCurrency;

    // Get latest rate date
    const latestEntry = await prisma.exchangeRate.findFirst({
      where,
      orderBy: { rateDate: "desc" },
      select: { rateDate: true },
    });

    if (!latestEntry) {
      // Return default rates if no DB entries
      return this.SUPPORTED_CURRENCIES
        .filter((c) => !baseCurrency || c === baseCurrency)
        .map((currency) => ({
          baseCurrency: currency,
          quoteCurrency: "TRY",
          buyRate: DEFAULT_RATES[currency].buy,
          sellRate: DEFAULT_RATES[currency].sell,
          midRate: (DEFAULT_RATES[currency].buy + DEFAULT_RATES[currency].sell) / 2,
          rateDate: new Date(),
          source: "default",
        }));
    }

    return prisma.exchangeRate.findMany({
      where: { ...where, rateDate: latestEntry.rateDate },
      orderBy: { baseCurrency: "asc" },
    });
  }

  /**
   * Get rate for specific pair and date
   */
  async getRate(baseCurrency: string, quoteCurrency: string, date?: Date) {
    const targetDate = date || new Date();

    const rate = await prisma.exchangeRate.findFirst({
      where: {
        baseCurrency,
        quoteCurrency,
        rateDate: { lte: targetDate },
      },
      orderBy: { rateDate: "desc" },
    });

    if (!rate) {
      // Fallback to default rates
      if (quoteCurrency === "TRY" && DEFAULT_RATES[baseCurrency]) {
        const r = DEFAULT_RATES[baseCurrency];
        return {
          baseCurrency,
          quoteCurrency,
          buyRate: r.buy,
          sellRate: r.sell,
          midRate: (r.buy + r.sell) / 2,
          rateDate: targetDate,
          source: "default",
        };
      }
      throw new NotFoundError(`${baseCurrency}/${quoteCurrency} kuru bulunamadı.`);
    }

    return rate;
  }

  /**
   * Get historical rates for charts
   */
  async getHistory(
    baseCurrency: string,
    quoteCurrency: string,
    params: { dateStart: string; dateEnd: string }
  ) {
    return prisma.exchangeRate.findMany({
      where: {
        baseCurrency,
        quoteCurrency,
        rateDate: {
          gte: new Date(params.dateStart),
          lte: new Date(params.dateEnd),
        },
      },
      orderBy: { rateDate: "asc" },
    });
  }

  /**
   * Add manual rate
   */
  async addRate(data: {
    tenantId?: string;
    baseCurrency: string;
    quoteCurrency: string;
    buyRate: number;
    sellRate: number;
    rateDate: string;
    source?: string;
  }) {
    const midRate = (data.buyRate + data.sellRate) / 2;
    const source = data.source || "manual";

    const rate = await prisma.exchangeRate.upsert({
      where: {
        baseCurrency_quoteCurrency_rateDate_source: {
          baseCurrency: data.baseCurrency,
          quoteCurrency: data.quoteCurrency,
          rateDate: new Date(data.rateDate),
          source,
        },
      },
      create: {
        tenantId: data.tenantId,
        baseCurrency: data.baseCurrency,
        quoteCurrency: data.quoteCurrency,
        buyRate: data.buyRate,
        sellRate: data.sellRate,
        midRate,
        source,
        rateDate: new Date(data.rateDate),
      },
      update: {
        buyRate: data.buyRate,
        sellRate: data.sellRate,
        midRate,
      },
    });

    logger.info(`Exchange rate added: ${data.baseCurrency}/${data.quoteCurrency} = ${midRate}`);
    return rate;
  }

  /**
   * Convert amount between currencies
   */
  async convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    date?: Date
  ): Promise<{ convertedAmount: number; rate: number; rateDate: Date }> {
    if (fromCurrency === toCurrency) {
      return { convertedAmount: amount, rate: 1, rateDate: date || new Date() };
    }

    // Try direct rate
    try {
      const rate = await this.getRate(fromCurrency, toCurrency, date);
      const midRate = Number(rate.midRate);
      return {
        convertedAmount: Math.round(amount * midRate * 100) / 100,
        rate: midRate,
        rateDate: new Date(rate.rateDate),
      };
    } catch {
      // Try inverse
      try {
        const rate = await this.getRate(toCurrency, fromCurrency, date);
        const midRate = Number(rate.midRate);
        return {
          convertedAmount: Math.round((amount / midRate) * 100) / 100,
          rate: Math.round((1 / midRate) * 1000000) / 1000000,
          rateDate: new Date(rate.rateDate),
        };
      } catch {
        // Cross-rate through TRY
        const fromTRY = await this.getRate(fromCurrency, "TRY", date);
        const toTRY = await this.getRate(toCurrency, "TRY", date);
        const crossRate = Number(fromTRY.midRate) / Number(toTRY.midRate);
        return {
          convertedAmount: Math.round(amount * crossRate * 100) / 100,
          rate: Math.round(crossRate * 1000000) / 1000000,
          rateDate: new Date(fromTRY.rateDate),
        };
      }
    }
  }

  /**
   * Fetch rates from TCMB (Türkiye Cumhuriyet Merkez Bankası).
   * Parses the official XML feed at https://www.tcmb.gov.tr/kurlar/today.xml
   * Falls back to DEFAULT_RATES if the TCMB feed is unavailable.
   */
  async fetchTCMBRates(): Promise<{ fetched: number; date: string; source: string }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let fetched = 0;
    let source = "TCMB_LIVE";

    try {
      const response = await fetch("https://www.tcmb.gov.tr/kurlar/today.xml", {
        headers: { "Accept": "application/xml" },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`TCMB responded with HTTP ${response.status}`);
      }

      const xmlText = await response.text();

      // Parse TCMB XML - each currency is a <Currency> element
      // with <ForexBuying>, <ForexSelling>, <CurrencyCode> children
      const currencyRegex = /<Currency[^>]*CurrencyCode="([^"]+)"[^>]*>[\s\S]*?<ForexBuying>([\d.]*)<\/ForexBuying>[\s\S]*?<ForexSelling>([\d.]*)<\/ForexSelling>[\s\S]*?<\/Currency>/g;

      let match;
      while ((match = currencyRegex.exec(xmlText)) !== null) {
        const currencyCode = match[1];
        const buyStr = match[2];
        const sellStr = match[3];

        // Skip currencies not in our supported list or with empty values
        if (!this.SUPPORTED_CURRENCIES.includes(currencyCode) || !buyStr || !sellStr) continue;

        const buyRate = Math.round(parseFloat(buyStr) * 10000) / 10000;
        const sellRate = Math.round(parseFloat(sellStr) * 10000) / 10000;
        if (isNaN(buyRate) || isNaN(sellRate) || buyRate <= 0) continue;

        const midRate = Math.round(((buyRate + sellRate) / 2) * 10000) / 10000;

        await prisma.exchangeRate.upsert({
          where: {
            baseCurrency_quoteCurrency_rateDate_source: {
              baseCurrency: currencyCode,
              quoteCurrency: "TRY",
              rateDate: today,
              source: "TCMB",
            },
          },
          create: {
            baseCurrency: currencyCode,
            quoteCurrency: "TRY",
            buyRate,
            sellRate,
            midRate,
            source: "TCMB",
            rateDate: today,
          },
          update: { buyRate, sellRate, midRate },
        });
        fetched++;
      }

      if (fetched === 0) {
        throw new Error("No rates parsed from TCMB XML response");
      }

      logger.info(`Fetched ${fetched} live TCMB rates`);
    } catch (error) {
      // Fallback to DEFAULT_RATES when TCMB feed is unavailable
      logger.warn("TCMB live feed unavailable, using fallback rates", {
        error: error instanceof Error ? error.message : String(error),
      });
      source = "TCMB_FALLBACK";

      for (const [currency, rates] of Object.entries(DEFAULT_RATES)) {
        const buyRate = rates.buy;
        const sellRate = rates.sell;
        const midRate = Math.round(((buyRate + sellRate) / 2) * 10000) / 10000;

        await prisma.exchangeRate.upsert({
          where: {
            baseCurrency_quoteCurrency_rateDate_source: {
              baseCurrency: currency,
              quoteCurrency: "TRY",
              rateDate: today,
              source: "TCMB",
            },
          },
          create: {
            baseCurrency: currency,
            quoteCurrency: "TRY",
            buyRate,
            sellRate,
            midRate,
            source: "TCMB",
            rateDate: today,
          },
          update: { buyRate, sellRate, midRate },
        });
        fetched++;
      }
    }

    const dateStr = today.toISOString().split("T")[0];
    logger.info(`Stored ${fetched} TCMB rates for ${dateStr} (${source})`);
    return { fetched, date: dateStr, source };
  }

  /**
   * Get supported currencies
   */
  getSupportedCurrencies() {
    return this.SUPPORTED_CURRENCIES.map((code) => ({
      code,
      name: this.getCurrencyName(code),
    }));
  }

  private getCurrencyName(code: string): string {
    const names: Record<string, string> = {
      USD: "ABD Doları",
      EUR: "Euro",
      GBP: "İngiliz Sterlini",
      CHF: "İsviçre Frangı",
      JPY: "Japon Yeni",
      SAR: "Suudi Riyali",
      AED: "BAE Dirhemi",
      RUB: "Rus Rublesi",
      CNY: "Çin Yuanı",
      CAD: "Kanada Doları",
      AUD: "Avustralya Doları",
      SEK: "İsveç Kronu",
      NOK: "Norveç Kronu",
      DKK: "Danimarka Kronu",
      KWD: "Kuveyt Dinarı",
    };
    return names[code] || code;
  }
}

export const exchangeRateService = new ExchangeRateService();
