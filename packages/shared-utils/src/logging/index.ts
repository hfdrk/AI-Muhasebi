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

class Logger {
  private logLevel: LogLevel = "info";
  private logLevels: LogLevel[] = ["debug", "info", "warn", "error"];

  constructor() {
    // Get log level from environment, default to "info"
    const envLogLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined;
    if (envLogLevel && this.logLevels.includes(envLogLevel)) {
      this.logLevel = envLogLevel;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levelIndex = this.logLevels.indexOf(level);
    const currentLevelIndex = this.logLevels.indexOf(this.logLevel);
    return levelIndex >= currentLevelIndex;
  }

  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(context && { context }),
      ...(metadata && { metadata }),
    };

    const logString = JSON.stringify(entry);
    
    // Use appropriate console method based on level
    switch (level) {
      case "error":
        console.error(logString);
        break;
      case "warn":
        console.warn(logString);
        break;
      case "debug":
        console.debug(logString);
        break;
      default:
        console.log(logString);
    }
  }

  debug(message: string, context?: LogContext, metadata?: Record<string, unknown>): void {
    this.log("debug", message, context, metadata);
  }

  info(message: string, context?: LogContext, metadata?: Record<string, unknown>): void {
    this.log("info", message, context, metadata);
  }

  warn(message: string, context?: LogContext, metadata?: Record<string, unknown>): void {
    this.log("warn", message, context, metadata);
  }

  error(message: string, context?: LogContext, metadata?: Record<string, unknown>): void {
    this.log("error", message, context, metadata);
  }

  // Convenience method for backward compatibility
  logWithMetadata(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>
  ): void {
    this.log(level, message, undefined, metadata);
  }
}

export const logger = new Logger();
