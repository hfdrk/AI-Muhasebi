export type TransactionSource = "manual" | "import" | "integration";

export interface Transaction {
  id: string;
  tenantId: string;
  clientCompanyId: string | null;
  date: Date;
  referenceNo: string | null;
  description: string | null;
  source: TransactionSource;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTransactionInput {
  clientCompanyId?: string | null;
  date: Date;
  referenceNo?: string | null;
  description?: string | null;
  source?: TransactionSource;
  lines: CreateTransactionLineInput[];
}

export interface UpdateTransactionInput {
  clientCompanyId?: string | null;
  date?: Date;
  referenceNo?: string | null;
  description?: string | null;
  lines?: CreateTransactionLineInput[];
}

