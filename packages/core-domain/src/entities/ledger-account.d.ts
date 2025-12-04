export type LedgerAccountType = "asset" | "liability" | "equity" | "income" | "expense";
export interface LedgerAccount {
    id: string;
    tenantId: string;
    code: string;
    name: string;
    type: LedgerAccountType;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateLedgerAccountInput {
    code: string;
    name: string;
    type: LedgerAccountType;
    isActive?: boolean;
}
export interface UpdateLedgerAccountInput {
    code?: string;
    name?: string;
    type?: LedgerAccountType;
    isActive?: boolean;
}
//# sourceMappingURL=ledger-account.d.ts.map