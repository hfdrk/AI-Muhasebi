export type DocumentProcessingJobStatus = "PENDING" | "IN_PROGRESS" | "SUCCESS" | "FAILED";

export interface DocumentProcessingJob {
  id: string;
  tenantId: string;
  documentId: string;
  status: DocumentProcessingJobStatus;
  attemptsCount: number;
  lastErrorMessage: string | null;
  lastAttemptAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDocumentProcessingJobInput {
  tenantId: string;
  documentId: string;
}

