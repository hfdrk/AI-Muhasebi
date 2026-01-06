import type {
  AccountingIntegrationConnector,
  BankIntegrationConnector,
} from "./types";
import { MockAccountingConnector } from "./mock-accounting-connector";
import { MockBankConnector } from "./mock-bank-connector";
import { MikroAccountingConnector } from "./mikro-accounting-connector";
import { LogoAccountingConnector } from "./logo-accounting-connector";
import { ETAConnector } from "./eta-connector";
import { IsBankasiConnector } from "./is-bankasi-connector";
import { GarantiConnector } from "./garanti-connector";
import { ZiraatBankasiConnector } from "./ziraat-bankasi-connector";
import { AkbankConnector } from "./akbank-connector";
import { YapiKrediConnector } from "./yapi-kredi-connector";
import { QNBFinansbankConnector } from "./qnb-finansbank-connector";
import { VakifbankConnector } from "./vakifbank-connector";

/**
 * Turkish Bank Codes:
 * - 00010: T.C. Ziraat Bankası
 * - 00012: Türkiye Halk Bankası
 * - 00015: Türkiye Vakıflar Bankası (VakıfBank)
 * - 00046: Akbank
 * - 00062: Garanti BBVA
 * - 00064: Türkiye İş Bankası
 * - 00067: Yapı ve Kredi Bankası
 * - 00099: ING Bank
 * - 00111: QNB Finansbank
 * - 00134: Denizbank
 */
export class ConnectorRegistry {
  private accountingConnectors: Map<string, AccountingIntegrationConnector> = new Map();
  private bankConnectors: Map<string, BankIntegrationConnector> = new Map();

  constructor() {
    // Register mock providers
    this.registerAccountingConnector("MOCK_ACCOUNTING", new MockAccountingConnector());
    this.registerBankConnector("MOCK_BANK", new MockBankConnector());

    // Register real integrations - Accounting
    this.registerAccountingConnector("MIKRO_ACCOUNTING", new MikroAccountingConnector());
    this.registerAccountingConnector("LOGO_ACCOUNTING", new LogoAccountingConnector());
    this.registerAccountingConnector("ETA", new ETAConnector());

    // Register bank integrations - Major Turkish Banks
    // Private Banks
    this.registerBankConnector("IS_BANKASI", new IsBankasiConnector());
    this.registerBankConnector("GARANTI_BBVA", new GarantiConnector());
    this.registerBankConnector("AKBANK", new AkbankConnector());
    this.registerBankConnector("YAPI_KREDI", new YapiKrediConnector());
    this.registerBankConnector("QNB_FINANSBANK", new QNBFinansbankConnector());

    // State-owned Banks
    this.registerBankConnector("ZIRAAT_BANKASI", new ZiraatBankasiConnector());
    this.registerBankConnector("VAKIFBANK", new VakifbankConnector());
  }

  registerAccountingConnector(code: string, connector: AccountingIntegrationConnector): void {
    this.accountingConnectors.set(code, connector);
  }

  registerBankConnector(code: string, connector: BankIntegrationConnector): void {
    this.bankConnectors.set(code, connector);
  }

  getAccountingConnector(code: string): AccountingIntegrationConnector | null {
    return this.accountingConnectors.get(code) || null;
  }

  getBankConnector(code: string): BankIntegrationConnector | null {
    return this.bankConnectors.get(code) || null;
  }

  getConnector(
    code: string,
    type: "accounting" | "bank"
  ): AccountingIntegrationConnector | BankIntegrationConnector | null {
    if (type === "accounting") {
      return this.getAccountingConnector(code);
    } else if (type === "bank") {
      return this.getBankConnector(code);
    }
    return null;
  }

  /**
   * Get all registered bank connector codes
   */
  getAllBankConnectorCodes(): string[] {
    return Array.from(this.bankConnectors.keys());
  }

  /**
   * Get all registered accounting connector codes
   */
  getAllAccountingConnectorCodes(): string[] {
    return Array.from(this.accountingConnectors.keys());
  }

  /**
   * Get bank information by code
   */
  getBankInfo(code: string): BankInfo | null {
    const bankInfoMap: Record<string, BankInfo> = {
      IS_BANKASI: {
        code: "IS_BANKASI",
        bankCode: "00064",
        name: "Türkiye İş Bankası",
        shortName: "İş Bankası",
        type: "private",
        features: ["AIS", "PIS", "FAST", "Maximum Card"],
      },
      GARANTI_BBVA: {
        code: "GARANTI_BBVA",
        bankCode: "00062",
        name: "Garanti BBVA",
        shortName: "Garanti",
        type: "private",
        features: ["AIS", "PIS", "FAST", "Bonus Card"],
      },
      AKBANK: {
        code: "AKBANK",
        bankCode: "00046",
        name: "Akbank",
        shortName: "Akbank",
        type: "private",
        features: ["AIS", "PIS", "FAST", "Axess Card", "Wing"],
      },
      YAPI_KREDI: {
        code: "YAPI_KREDI",
        bankCode: "00067",
        name: "Yapı ve Kredi Bankası",
        shortName: "Yapı Kredi",
        type: "private",
        features: ["AIS", "PIS", "FAST", "World Card", "Parapara"],
      },
      QNB_FINANSBANK: {
        code: "QNB_FINANSBANK",
        bankCode: "00111",
        name: "QNB Finansbank",
        shortName: "Finansbank",
        type: "private",
        features: ["AIS", "PIS", "FAST", "CardFinans", "Enpara"],
      },
      ZIRAAT_BANKASI: {
        code: "ZIRAAT_BANKASI",
        bankCode: "00010",
        name: "T.C. Ziraat Bankası",
        shortName: "Ziraat",
        type: "state",
        features: ["AIS", "PIS", "FAST", "Bankkart", "Agricultural Subsidies"],
      },
      VAKIFBANK: {
        code: "VAKIFBANK",
        bankCode: "00015",
        name: "Türkiye Vakıflar Bankası",
        shortName: "VakıfBank",
        type: "state",
        features: ["AIS", "PIS", "FAST", "World Card", "Vakıf Katılım", "Gold Accounts"],
      },
      MOCK_BANK: {
        code: "MOCK_BANK",
        bankCode: "99999",
        name: "Test Bankası",
        shortName: "Mock",
        type: "mock",
        features: ["AIS", "PIS"],
      },
    };

    return bankInfoMap[code] || null;
  }

  /**
   * Get all bank info
   */
  getAllBankInfo(): BankInfo[] {
    return this.getAllBankConnectorCodes()
      .map((code) => this.getBankInfo(code))
      .filter((info): info is BankInfo => info !== null && info.type !== "mock");
  }

  /**
   * Get bank connector by IBAN (extracts bank code from IBAN)
   */
  getBankConnectorByIBAN(iban: string): BankIntegrationConnector | null {
    // Turkish IBAN format: TR + 2 check digits + 5 bank code + 1 reserve + 16 account
    const cleanIBAN = iban.replace(/\s/g, "").toUpperCase();

    if (!cleanIBAN.startsWith("TR") || cleanIBAN.length !== 26) {
      return null;
    }

    const bankCode = cleanIBAN.slice(4, 9);

    const bankCodeMapping: Record<string, string> = {
      "00010": "ZIRAAT_BANKASI",
      "00015": "VAKIFBANK",
      "00046": "AKBANK",
      "00062": "GARANTI_BBVA",
      "00064": "IS_BANKASI",
      "00067": "YAPI_KREDI",
      "00111": "QNB_FINANSBANK",
    };

    const connectorCode = bankCodeMapping[bankCode];
    if (!connectorCode) {
      return null;
    }

    return this.getBankConnector(connectorCode);
  }
}

/**
 * Bank information interface
 */
export interface BankInfo {
  code: string;
  bankCode: string;
  name: string;
  shortName: string;
  type: "private" | "state" | "mock";
  features: string[];
}

// Singleton instance
export const connectorRegistry = new ConnectorRegistry();





