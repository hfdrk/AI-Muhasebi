/**
 * Validate file size against maximum allowed size
 * @param fileSize - File size in bytes
 * @param maxSize - Maximum allowed size in bytes
 * @throws ValidationError if file size exceeds maximum
 */
export declare function validateFileSize(fileSize: number, maxSize: number): void;
/**
 * Validate MIME type against allowed types
 * @param mimeType - MIME type to validate
 * @param allowedTypes - Array of allowed MIME types
 * @throws ValidationError if MIME type is not allowed
 */
export declare function validateMimeType(mimeType: string, allowedTypes: string[]): void;
/**
 * Sanitize file name to prevent path traversal and special character issues
 * @param fileName - Original file name
 * @returns Sanitized file name
 */
export declare function sanitizeFileName(fileName: string): string;
//# sourceMappingURL=validation.d.ts.map