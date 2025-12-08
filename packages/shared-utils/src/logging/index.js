"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
class Logger {
    logLevel = "info";
    logLevels = ["debug", "info", "warn", "error"];
    constructor() {
        // Get log level from environment, default to "info"
        const envLogLevel = process.env.LOG_LEVEL?.toLowerCase();
        if (envLogLevel && this.logLevels.includes(envLogLevel)) {
            this.logLevel = envLogLevel;
        }
    }
    shouldLog(level) {
        const levelIndex = this.logLevels.indexOf(level);
        const currentLevelIndex = this.logLevels.indexOf(this.logLevel);
        return levelIndex >= currentLevelIndex;
    }
    log(level, message, context, metadata) {
        if (!this.shouldLog(level)) {
            return;
        }
        const entry = {
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
    debug(message, context, metadata) {
        this.log("debug", message, context, metadata);
    }
    info(message, context, metadata) {
        this.log("info", message, context, metadata);
    }
    warn(message, context, metadata) {
        this.log("warn", message, context, metadata);
    }
    error(message, context, metadata) {
        this.log("error", message, context, metadata);
    }
    // Convenience method for backward compatibility
    logWithMetadata(level, message, metadata) {
        this.log(level, message, undefined, metadata);
    }
}
exports.logger = new Logger();
//# sourceMappingURL=index.js.map