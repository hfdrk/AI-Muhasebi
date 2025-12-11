export type DocumentParsedType = "invoice" | "bank_statement" | "receipt" | "contract" | "unknown";

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

export interface ParsedContractFields {
  contractNumber?: string | null;
  contractDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  expirationDate?: string | null;
  value?: number | null;
  currency?: string | null;
  parties?: Array<{
    name?: string;
    role?: string; // "lessor", "lessee", "buyer", "seller", "provider", "client", etc.
    taxNumber?: string;
  }>;
  terms?: string | null;
  renewalTerms?: string | null;
  contractType?: string | null; // "lease", "service", "purchase", "employment", etc.
  [key: string]: any;
}

export type ParsedDocumentFields = ParsedInvoiceFields | ParsedBankStatementFields | ParsedContractFields | Record<string, any>;

// Result from parser (without database fields)
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

// Alias for backward compatibility - maps to ParsedDocumentResult for parser output
export type ParsedDocumentData = ParsedDocumentResult | DocumentParsedData;

export interface CreateDocumentParsedDataInput {
  tenantId: string;
  documentId: string;
  documentType: DocumentParsedType;
  fields: ParsedDocumentFields;
  parserVersion: string;
}

