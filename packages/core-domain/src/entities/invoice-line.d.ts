export interface InvoiceLine {
    id: string;
    tenantId: string;
    invoiceId: string;
    lineNumber: number;
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    vatRate: number;
    vatAmount: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateInvoiceLineInput {
    lineNumber: number;
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    vatRate: number;
    vatAmount: number;
}
export interface UpdateInvoiceLineInput {
    lineNumber?: number;
    description?: string;
    quantity?: number;
    unitPrice?: number;
    lineTotal?: number;
    vatRate?: number;
    vatAmount?: number;
}
//# sourceMappingURL=invoice-line.d.ts.map