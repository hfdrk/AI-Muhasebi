export interface TokenPayload {
    userId: string;
    tenantId?: string;
    email: string;
    roles?: string[];
}
export declare function generateAccessToken(payload: TokenPayload): string;
export declare function generateRefreshToken(payload: TokenPayload): string;
//# sourceMappingURL=generate.d.ts.map