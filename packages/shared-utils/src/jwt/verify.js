"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = verifyToken;
exports.verifyPasswordResetToken = verifyPasswordResetToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("@repo/config");
function verifyToken(token) {
    const config = (0, config_1.getConfig)();
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config.JWT_SECRET, {
            issuer: "ai-muhasebi",
            audience: "ai-muhasebi-api",
        });
        return decoded;
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            throw new Error("Token süresi dolmuş.");
        }
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            throw new Error("Geçersiz token.");
        }
        throw error;
    }
}
function verifyPasswordResetToken(token) {
    const config = (0, config_1.getConfig)();
    try {
        jsonwebtoken_1.default.verify(token, config.JWT_SECRET);
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=verify.js.map