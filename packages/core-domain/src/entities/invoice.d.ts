import type { CreateInvoiceLineInput } from "./invoice-line";
export type InvoiceType = "SATIŞ" | "ALIŞ";
export type InvoiceStatus = "taslak" | "kesildi" | "iptal" | "muhasebeleştirilmiş";
export type InvoiceSource = "manual" | "import" | "integration";
export interface Invoice {
    id: string;
    tenantId: string;
    clientCompanyId: string;
    externalId: string | null;
    type: InvoiceType;
    issueDate: Date;
    dueDate: Date | null;
    totalAmount: number;
    currency: string;
    taxAmount: number;
    netAmount: number | null;
    counterpartyName: string | null;
    counterpartyTaxNumber: string | null;
    status: InvoiceStatus;
    source: InvoiceSource;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateInvoiceInput {
    clientCompanyId: string;
    externalId?: string | null;
    type: InvoiceType;
    issueDate: Date;
    dueDate?: Date | null;
    totalAmount: number;
    currency?: string;
    taxAmount: number;
    netAmount?: number | null;
    counterpartyName?: string | null;
    counterpartyTaxNumber?: string | null;
    status?: InvoiceStatus;
    source?: InvoiceSource;
    lines: CreateInvoiceLineInput[];
}
export interface UpdateInvoiceInput {
    externalId?: string | null;
    type?: InvoiceType;
    issueDate?: Date;
    dueDate?: Date | null;
    totalAmount?: number;
    currency?: string;
    taxAmount?: number;
    netAmount?: number | null;
    counterpartyName?: string | null;
    counterpartyTaxNumber?: string | null;
    status?: InvoiceStatus;
    lines?: CreateInvoiceLineInput[];
}
//# sourceMappingURL=invoice.d.ts.map