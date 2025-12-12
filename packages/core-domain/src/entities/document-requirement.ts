export type DocumentRequirementStatus = "pending" | "received" | "overdue";

export interface DocumentRequirement {
  id: string;
  tenantId: string;
  clientCompanyId: string;
  documentType: string;
  requiredByDate: Date;
  status: DocumentRequirementStatus;
  receivedDocumentId: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDocumentRequirementInput {
  tenantId: string;
  clientCompanyId: string;
  documentType: string;
  requiredByDate: Date;
  description?: string | null;
}

export interface UpdateDocumentRequirementInput {
  documentType?: string;
  requiredByDate?: Date;
  status?: DocumentRequirementStatus;
  receivedDocumentId?: string | null;
  description?: string | null;
}


