export interface ClientCompanyBankAccount {
  id: string;
  tenantId: string;
  clientCompanyId: string;
  bankName: string;
  iban: string;
  accountNumber: string | null;
  currency: string;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBankAccountInput {
  bankName: string;
  iban: string;
  accountNumber?: string | null;
  currency?: string;
  isPrimary?: boolean;
}

export interface UpdateBankAccountInput {
  bankName?: string;
  iban?: string;
  accountNumber?: string | null;
  currency?: string;
  isPrimary?: boolean;
}

