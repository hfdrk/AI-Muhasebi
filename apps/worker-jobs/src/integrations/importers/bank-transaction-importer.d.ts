import type { NormalizedBankTransaction } from "../connectors/types";
export interface BankTransactionImportSummary {
    created: number;
    updated: number;
    skipped: number;
    errors: Array<{
        externalId: string;
        error: string;
    }>;
}
export declare class BankTransactionImporter {
    importTransactions(tenantId: string, normalizedTransactions: NormalizedBankTransaction[], tenantIntegrationId: string): Promise<BankTransactionImportSummary>;
    private resolveOrCreateBankAccount;
    private findOrCreateBankLedgerAccount;
    private calculateDebitCredit;
    private extractBankNameFromIBAN;
}
//# sourceMappingURL=bank-transaction-importer.d.ts.map