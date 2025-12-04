export interface LogLevel {
    DEBUG: "debug";
    INFO: "info";
    WARN: "warn";
    ERROR: "error";
}
export interface LogEntry {
    level: string;
    message: string;
    timestamp: Date;
    metadata?: Record<string, unknown>;
}
declare class Logger {
    private log;
    debug(message: string, metadata?: Record<string, unknown>): void;
    info(message: string, metadata?: Record<string, unknown>): void;
    warn(message: string, metadata?: Record<string, unknown>): void;
    error(message: string, metadata?: Record<string, unknown>): void;
}
export declare const logger: Logger;
export {};
//# sourceMappingURL=index.d.ts.map