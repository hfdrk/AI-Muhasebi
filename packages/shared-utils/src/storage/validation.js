"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFileSize = validateFileSize;
exports.validateMimeType = validateMimeType;
exports.sanitizeFileName = sanitizeFileName;
const errors_1 = require("../errors");
/**
 * Validate file size against maximum allowed size
 * @param fileSize - File size in bytes
 * @param maxSize - Maximum allowed size in bytes
 * @throws ValidationError if file size exceeds maximum
 */
function validateFileSize(fileSize, maxSize) {
    if (fileSize > maxSize) {
        const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
        throw new errors_1.ValidationError(`Dosya boyutu çok büyük. Maksimum boyut: ${maxSizeMB} MB.`);
    }
}
/**
 * Validate MIME type against allowed types
 * @param mimeType - MIME type to validate
 * @param allowedTypes - Array of allowed MIME types
 * @throws ValidationError if MIME type is not allowed
 */
function validateMimeType(mimeType, allowedTypes) {
    if (!allowedTypes.includes(mimeType)) {
        throw new errors_1.ValidationError(`Bu dosya türüne izin verilmiyor. İzin verilen türler: ${allowedTypes.join(", ")}`);
    }
}
/**
 * Sanitize file name to prevent path traversal and special character issues
 * @param fileName - Original file name
 * @returns Sanitized file name
 */
function sanitizeFileName(fileName) {
    // Remove path traversal attempts
    let sanitized = fileName.replace(/\.\./g, "").replace(/[\/\\]/g, "_");
    // Remove or replace special characters that could cause issues
    sanitized = sanitized.replace(/[<>:"|?*\x00-\x1f]/g, "_");
    // Remove leading/trailing dots and spaces (Windows issue)
    sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, "");
    // Ensure we have a valid filename
    if (!sanitized || sanitized.length === 0) {
        sanitized = "file";
    }
    // Limit length
    if (sanitized.length > 255) {
        const ext = sanitized.substring(sanitized.lastIndexOf("."));
        const name = sanitized.substring(0, 255 - ext.length);
        sanitized = name + ext;
    }
    return sanitized;
}
//# sourceMappingURL=validation.js.map