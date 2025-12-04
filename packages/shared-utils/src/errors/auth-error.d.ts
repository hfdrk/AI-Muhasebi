export declare class AuthenticationError extends Error {
    constructor(message: string);
}
export declare class AuthorizationError extends Error {
    constructor(message?: string);
}
export declare class ValidationError extends Error {
    readonly field?: string | undefined;
    constructor(message: string, field?: string | undefined);
}
export declare class NotFoundError extends Error {
    constructor(message?: string);
}
//# sourceMappingURL=auth-error.d.ts.map