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

export class ConnectorRegistry {
  private accountingConnectors: Map<string, AccountingIntegrationConnector> = new Map();
  private bankConnectors: Map<string, BankIntegrationConnector> = new Map();

  constructor() {
    this.registerAccountingConnector("MOCK_ACCOUNTING", new MockAccountingConnector());
    this.registerBankConnector("MOCK_BANK", new MockBankConnector());
    
    // Register real integrations
    this.registerAccountingConnector("MIKRO_ACCOUNTING", new MikroAccountingConnector());
    this.registerAccountingConnector("LOGO_ACCOUNTING", new LogoAccountingConnector());
    this.registerAccountingConnector("ETA", new ETAConnector());
    
    // Register bank integrations
    this.registerBankConnector("IS_BANKASI", new IsBankasiConnector());
    this.registerBankConnector("GARANTI_BBVA", new GarantiConnector());
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
}

export const connectorRegistry = new ConnectorRegistry();





