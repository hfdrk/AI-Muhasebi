import type { TokenPayload } from "./generate";
export interface VerifiedToken extends TokenPayload {
    iat?: number;
    exp?: number;
    iss?: string;
    aud?: string;
}
export declare function verifyToken(token: string): VerifiedToken;
export declare function verifyPasswordResetToken(token: string): boolean;
//# sourceMappingURL=verify.d.ts.map