import { ValidationError } from "../errors";

/**
 * Magic number signatures for supported file types.
 * Used to verify that the actual file content matches the declared MIME type,
 * preventing MIME type spoofing attacks (e.g. renaming .exe → .pdf).
 */
const MAGIC_NUMBERS: Record<string, { offset: number; bytes: number[] }[]> = {
  "application/pdf": [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }], // %PDF
  "image/jpeg": [{ offset: 0, bytes: [0xFF, 0xD8, 0xFF] }],
  "image/jpg": [{ offset: 0, bytes: [0xFF, 0xD8, 0xFF] }],
  "image/png": [{ offset: 0, bytes: [0x89, 0x50, 0x4E, 0x47] }], // .PNG
  "application/zip": [{ offset: 0, bytes: [0x50, 0x4B, 0x03, 0x04] }], // PK..
  "application/x-zip-compressed": [{ offset: 0, bytes: [0x50, 0x4B, 0x03, 0x04] }],
  "application/x-zip": [{ offset: 0, bytes: [0x50, 0x4B, 0x03, 0x04] }],
  "application/vnd.ms-excel": [
    { offset: 0, bytes: [0xD0, 0xCF, 0x11, 0xE0] }, // OLE2 compound document
  ],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    { offset: 0, bytes: [0x50, 0x4B, 0x03, 0x04] }, // ZIP (xlsx is a ZIP)
  ],
};

/**
 * Validate file content against its declared MIME type using magic number signatures.
 * This prevents MIME type spoofing attacks where an attacker renames a malicious file.
 *
 * @param buffer - File buffer (at least first 8 bytes needed)
 * @param declaredMimeType - The MIME type declared by the client
 * @throws ValidationError if magic numbers don't match the declared type
 */
export function validateFileMagicNumber(buffer: Buffer, declaredMimeType: string): void {
  const signatures = MAGIC_NUMBERS[declaredMimeType];

  // If we don't have a signature for this type, skip validation (allow through)
  if (!signatures || buffer.length < 4) {
    return;
  }

  const matches = signatures.some((sig) => {
    if (buffer.length < sig.offset + sig.bytes.length) return false;
    return sig.bytes.every((byte, i) => buffer[sig.offset + i] === byte);
  });

  if (!matches) {
    throw new ValidationError(
      `Dosya içeriği bildirilen türle (${declaredMimeType}) eşleşmiyor. Dosya bozuk veya yanlış uzantıya sahip olabilir.`
    );
  }
}

/**
 * Validate file size against maximum allowed size
 * @param fileSize - File size in bytes
 * @param maxSize - Maximum allowed size in bytes
 * @throws ValidationError if file size exceeds maximum
 */
export function validateFileSize(fileSize: number, maxSize: number): void {
  if (fileSize > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
    throw new ValidationError(
      `Dosya boyutu çok büyük. Maksimum boyut: ${maxSizeMB} MB.`
    );
  }
}

/**
 * Validate MIME type against allowed types
 * @param mimeType - MIME type to validate
 * @param allowedTypes - Array of allowed MIME types
 * @throws ValidationError if MIME type is not allowed
 */
export function validateMimeType(mimeType: string, allowedTypes: string[]): void {
  if (!allowedTypes.includes(mimeType)) {
    throw new ValidationError(
      `Bu dosya türüne izin verilmiyor. İzin verilen türler: ${allowedTypes.join(", ")}`
    );
  }
}

/**
 * Sanitize file name to prevent path traversal and special character issues
 * @param fileName - Original file name
 * @returns Sanitized file name
 */
export function sanitizeFileName(fileName: string): string {
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

