export type DocumentType = "INVOICE" | "BANK_STATEMENT" | "RECEIPT" | "OTHER";
export type DocumentStatus = "UPLOADED" | "PROCESSING" | "PROCESSED" | "FAILED";
export type DocumentUploadSource = "manual" | "email_import" | "integration";
export interface Document {
    id: string;
    tenantId: string;
    clientCompanyId: string;
    relatedInvoiceId: string | null;
    relatedTransactionId: string | null;
    type: DocumentType;
    originalFileName: string;
    storagePath: string;
    mimeType: string;
    fileSizeBytes: bigint | number;
    uploadUserId: string;
    uploadSource: DocumentUploadSource;
    status: DocumentStatus;
    processingErrorMessage: string | null;
    processedAt: Date | null;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateDocumentInput {
    clientCompanyId: string;
    relatedInvoiceId?: string | null;
    relatedTransactionId?: string | null;
    type: DocumentType;
    originalFileName: string;
    storagePath: string;
    mimeType: string;
    fileSizeBytes: number;
    uploadSource?: DocumentUploadSource;
}
export interface UpdateDocumentInput {
    type?: DocumentType;
    relatedInvoiceId?: string | null;
    relatedTransactionId?: string | null;
}
//# sourceMappingURL=document.d.ts.map