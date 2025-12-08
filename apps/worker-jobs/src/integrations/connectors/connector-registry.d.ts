import type { AccountingIntegrationConnector, BankIntegrationConnector } from "./types";
export declare class ConnectorRegistry {
    private accountingConnectors;
    private bankConnectors;
    constructor();
    registerAccountingConnector(code: string, connector: AccountingIntegrationConnector): void;
    registerBankConnector(code: string, connector: BankIntegrationConnector): void;
    getAccountingConnector(code: string): AccountingIntegrationConnector | null;
    getBankConnector(code: string): BankIntegrationConnector | null;
    getConnector(code: string, type: "accounting" | "bank"): AccountingIntegrationConnector | BankIntegrationConnector | null;
}
export declare const connectorRegistry: ConnectorRegistry;
//# sourceMappingURL=connector-registry.d.ts.map