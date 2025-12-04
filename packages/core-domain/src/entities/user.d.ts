export interface User {
    id: string;
    email: string;
    hashedPassword: string;
    fullName: string;
    locale: string;
    isActive: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateUserInput {
    email: string;
    hashedPassword: string;
    fullName: string;
    locale?: string;
}
export interface UpdateUserInput {
    fullName?: string;
    locale?: string;
    isActive?: boolean;
    lastLoginAt?: Date | null;
}
//# sourceMappingURL=user.d.ts.map