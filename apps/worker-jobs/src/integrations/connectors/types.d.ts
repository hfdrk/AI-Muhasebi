export interface NormalizedInvoiceLine {
    lineNumber: number;
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    vatRate: number;
    vatAmount: number;
}
export interface NormalizedInvoice {
    externalId: string;
    clientCompanyExternalId?: string | null;
    clientCompanyName?: string | null;
    clientCompanyTaxNumber?: string | null;
    issueDate: Date;
    dueDate: Date | null;
    totalAmount: number;
    currency: string;
    taxAmount: number;
    netAmount?: number | null;
    counterpartyName?: string | null;
    counterpartyTaxNumber?: string | null;
    status?: string;
    type?: "SATIŞ" | "ALIŞ";
    lines: NormalizedInvoiceLine[];
}
export interface NormalizedBankTransaction {
    externalId: string;
    accountIdentifier: string;
    bookingDate: Date;
    valueDate?: Date | null;
    description: string;
    amount: number;
    currency: string;
    balanceAfter?: number | null;
}
export interface FetchInvoicesOptions {
    limit?: number;
    offset?: number;
    [key: string]: unknown;
}
export interface FetchTransactionsOptions {
    limit?: number;
    offset?: number;
    accountIdentifier?: string;
    [key: string]: unknown;
}
export interface AccountingIntegrationConnector {
    testConnection(config: Record<string, unknown>): Promise<{
        success: boolean;
        message?: string;
    }>;
    fetchInvoices(sinceDate: Date, untilDate: Date, options?: FetchInvoicesOptions): Promise<NormalizedInvoice[]>;
}
export interface BankIntegrationConnector {
    testConnection(config: Record<string, unknown>): Promise<{
        success: boolean;
        message?: string;
    }>;
    fetchTransactions(sinceDate: Date, untilDate: Date, options?: FetchTransactionsOptions): Promise<NormalizedBankTransaction[]>;
}
//# sourceMappingURL=types.d.ts.map