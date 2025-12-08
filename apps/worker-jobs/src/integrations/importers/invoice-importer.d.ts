import type { NormalizedInvoice } from "../connectors/types";
export interface InvoiceImportSummary {
    created: number;
    updated: number;
    skipped: number;
    errors: Array<{
        externalId: string;
        error: string;
    }>;
}
export declare class InvoiceImporter {
    importInvoices(tenantId: string, normalizedInvoices: NormalizedInvoice[], tenantIntegrationId: string): Promise<InvoiceImportSummary>;
    private resolveClientCompany;
}
//# sourceMappingURL=invoice-importer.d.ts.map