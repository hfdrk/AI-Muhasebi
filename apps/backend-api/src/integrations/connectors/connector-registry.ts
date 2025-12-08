import type {
  AccountingIntegrationConnector,
  BankIntegrationConnector,
} from "./types";
import { MockAccountingConnector } from "./mock-accounting-connector";
import { MockBankConnector } from "./mock-bank-connector";

export class ConnectorRegistry {
  private accountingConnectors: Map<string, AccountingIntegrationConnector> = new Map();
  private bankConnectors: Map<string, BankIntegrationConnector> = new Map();

  constructor() {
    // Register mock providers
    this.registerAccountingConnector("MOCK_ACCOUNTING", new MockAccountingConnector());
    this.registerBankConnector("MOCK_BANK", new MockBankConnector());
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

// Singleton instance
export const connectorRegistry = new ConnectorRegistry();




