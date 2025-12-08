export type DocumentParsedType = "invoice" | "bank_statement" | "receipt" | "unknown";
export interface ParsedInvoiceFields {
    invoiceNumber?: string | null;
    issueDate?: string | null;
    dueDate?: string | null;
    totalAmount?: number | null;
    netAmount?: number | null;
    taxAmount?: number | null;
    currency?: string | null;
    counterpartyName?: string | null;
    counterpartyTaxNumber?: string | null;
    lineItems?: Array<{
        description?: string;
        quantity?: number;
        unitPrice?: number;
        lineTotal?: number;
        vatRate?: number;
        vatAmount?: number;
    }>;
    [key: string]: any;
}
export interface ParsedBankStatementFields {
    accountNumber?: string | null;
    currency?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    startingBalance?: number | null;
    endingBalance?: number | null;
    transactions?: Array<{
        date?: string;
        description?: string;
        amount?: number;
        balance?: number;
    }>;
    [key: string]: any;
}
export type ParsedDocumentFields = ParsedInvoiceFields | ParsedBankStatementFields | Record<string, any>;
export interface ParsedDocumentResult {
    documentType: DocumentParsedType;
    fields: ParsedDocumentFields;
    parserVersion: string;
}
export interface DocumentParsedData {
    id: string;
    tenantId: string;
    documentId: string;
    documentType: DocumentParsedType;
    fields: ParsedDocumentFields;
    parserVersion: string;
    createdAt: Date;
    updatedAt: Date;
}
export type ParsedDocumentData = ParsedDocumentResult | DocumentParsedData;
export interface CreateDocumentParsedDataInput {
    tenantId: string;
    documentId: string;
    documentType: DocumentParsedType;
    fields: ParsedDocumentFields;
    parserVersion: string;
}
//# sourceMappingURL=document-parsed-data.d.ts.map