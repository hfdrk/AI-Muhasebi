export type LogLevel = "debug" | "info" | "warn" | "error";
export interface LogContext {
    tenantId?: string;
    userId?: string;
    requestId?: string;
    [key: string]: unknown;
}
export interface LogEntry {
    level: string;
    message: string;
    timestamp: string;
    context?: LogContext;
    metadata?: Record<string, unknown>;
}
declare class Logger {
    private logLevel;
    private logLevels;
    constructor();
    private shouldLog;
    private log;
    debug(message: string, context?: LogContext, metadata?: Record<string, unknown>): void;
    info(message: string, context?: LogContext, metadata?: Record<string, unknown>): void;
    warn(message: string, context?: LogContext, metadata?: Record<string, unknown>): void;
    error(message: string, context?: LogContext, metadata?: Record<string, unknown>): void;
    logWithMetadata(level: LogLevel, message: string, metadata?: Record<string, unknown>): void;
}
export declare const logger: Logger;
export {};
//# sourceMappingURL=index.d.ts.map