import type { BankIntegrationConnector, NormalizedBankTransaction, FetchTransactionsOptions } from "./types";
export declare class MockBankConnector implements BankIntegrationConnector {
    testConnection(config: Record<string, unknown>): Promise<{
        success: boolean;
        message?: string;
    }>;
    fetchTransactions(sinceDate: Date, untilDate: Date, options?: FetchTransactionsOptions): Promise<NormalizedBankTransaction[]>;
}
//# sourceMappingURL=mock-bank-connector.d.ts.map