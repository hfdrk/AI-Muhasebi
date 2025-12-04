"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAccessToken = generateAccessToken;
exports.generateRefreshToken = generateRefreshToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("@repo/config");
function generateAccessToken(payload) {
    const config = (0, config_1.getConfig)();
    return jsonwebtoken_1.default.sign(payload, config.JWT_SECRET, {
        expiresIn: config.JWT_ACCESS_TOKEN_EXPIRY,
        issuer: "ai-muhasebi",
        audience: "ai-muhasebi-api",
    });
}
function generateRefreshToken(payload) {
    const config = (0, config_1.getConfig)();
    return jsonwebtoken_1.default.sign(payload, config.JWT_SECRET, {
        expiresIn: config.JWT_REFRESH_TOKEN_EXPIRY,
        issuer: "ai-muhasebi",
        audience: "ai-muhasebi-api",
    });
}
// Password reset tokens are now generated using crypto.randomBytes in the service layer
//# sourceMappingURL=generate.js.map