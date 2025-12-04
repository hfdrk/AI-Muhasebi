"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
class Logger {
    log(level, message, metadata) {
        const entry = {
            level,
            message,
            timestamp: new Date(),
            metadata,
        };
        const logString = JSON.stringify(entry);
        console.log(logString);
    }
    debug(message, metadata) {
        this.log("debug", message, metadata);
    }
    info(message, metadata) {
        this.log("info", message, metadata);
    }
    warn(message, metadata) {
        this.log("warn", message, metadata);
    }
    error(message, metadata) {
        this.log("error", message, metadata);
    }
}
exports.logger = new Logger();
//# sourceMappingURL=index.js.map