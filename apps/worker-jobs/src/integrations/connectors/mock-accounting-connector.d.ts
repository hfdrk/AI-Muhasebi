import type { AccountingIntegrationConnector, NormalizedInvoice, FetchInvoicesOptions } from "./types";
export declare class MockAccountingConnector implements AccountingIntegrationConnector {
    testConnection(config: Record<string, unknown>): Promise<{
        success: boolean;
        message?: string;
    }>;
    fetchInvoices(sinceDate: Date, untilDate: Date, options?: FetchInvoicesOptions): Promise<NormalizedInvoice[]>;
}
//# sourceMappingURL=mock-accounting-connector.d.ts.map