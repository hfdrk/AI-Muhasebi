export interface TransactionLine {
  id: string;
  tenantId: string;
  transactionId: string;
  ledgerAccountId: string;
  debitAmount: number;
  creditAmount: number;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTransactionLineInput {
  ledgerAccountId: string;
  debitAmount: number;
  creditAmount: number;
  description?: string | null;
}

export interface UpdateTransactionLineInput {
  ledgerAccountId?: string;
  debitAmount?: number;
  creditAmount?: number;
  description?: string | null;
}

