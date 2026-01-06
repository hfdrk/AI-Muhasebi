import AdmZip from "adm-zip";
import { ValidationError, logger } from "@repo/shared-utils";
import { getStorageConfig } from "@repo/config";
import path from "path";

export interface ExtractedFile {
  name: string;
  buffer: Buffer;
  size: number;
  mimeType: string;
  relativePath: string;
}

export interface ZipExtractionResult {
  files: ExtractedFile[];
  totalSize: number;
  fileCount: number;
}

export class ZipExtractionService {
  private storageConfig = getStorageConfig();
  private readonly MAX_FILES_PER_ZIP = 100;
  private readonly MAX_TOTAL_EXTRACTED_SIZE = 500 * 1024 * 1024; // 500MB
  private readonly MAX_FILE_NAME_LENGTH = 500;

  /**
   * Extract files from a zip buffer
   */
  async extractZipFile(zipBuffer: Buffer): Promise<ZipExtractionResult> {
    let zip: AdmZip;
    try {
      zip = new AdmZip(zipBuffer);
    } catch (error: any) {
      throw new ValidationError(`Geçersiz ZIP dosyası: ${error.message}`);
    }

    const entries = zip.getEntries();
    
    // Security check: prevent zip bombs
    if (entries.length > this.MAX_FILES_PER_ZIP) {
      throw new ValidationError(
        `ZIP dosyası çok fazla dosya içeriyor. Maksimum ${this.MAX_FILES_PER_ZIP} dosya izin verilir.`
      );
    }

    const extractedFiles: ExtractedFile[] = [];
    let totalSize = 0;

    for (const entry of entries) {
      // Skip directories
      if (entry.isDirectory) {
        continue;
      }

      // Security: prevent path traversal
      const safePath = this.sanitizePath(entry.entryName);
      if (!safePath) {
        logger.warn(`Skipping file with unsafe path: ${entry.entryName}`);
        continue;
      }

      // Security: check file name length
      const fileName = path.basename(safePath);
      if (fileName.length > this.MAX_FILE_NAME_LENGTH) {
        logger.warn(`Skipping file with name too long: ${fileName}`);
        continue;
      }

      // Extract file
      let fileBuffer: Buffer;
      try {
        fileBuffer = entry.getData();
      } catch (error: any) {
        logger.warn(`Error extracting file ${entry.entryName}:`, { error: error.message });
        continue;
      }

      const fileSize = fileBuffer.length;
      totalSize += fileSize;

      // Security: check total extracted size
      if (totalSize > this.MAX_TOTAL_EXTRACTED_SIZE) {
        throw new ValidationError(
          `ZIP dosyası çıkarıldıktan sonra toplam boyut çok büyük. Maksimum ${this.MAX_TOTAL_EXTRACTED_SIZE / (1024 * 1024)}MB izin verilir.`
        );
      }

      // Detect MIME type
      const mimeType = this.detectMimeType(fileName, fileBuffer);

      extractedFiles.push({
        name: fileName,
        buffer: fileBuffer,
        size: fileSize,
        mimeType,
        relativePath: safePath,
      });
    }

    if (extractedFiles.length === 0) {
      throw new ValidationError("ZIP dosyası geçerli dosya içermiyor.");
    }

    return {
      files: extractedFiles,
      totalSize,
      fileCount: extractedFiles.length,
    };
  }

  /**
   * Filter files to only include supported types
   */
  filterSupportedFiles(files: ExtractedFile[]): ExtractedFile[] {
    const supportedMimeTypes = this.storageConfig.allowedMimeTypes;
    
    return files.filter((file) => {
      const isSupported = supportedMimeTypes.includes(file.mimeType);
      if (!isSupported) {
        logger.warn(`Skipping unsupported file type: ${file.name} (${file.mimeType})`);
      }
      return isSupported;
    });
  }

  /**
   * Validate extracted files
   */
  async validateExtractedFiles(files: ExtractedFile[]): Promise<void> {
    if (files.length === 0) {
      throw new ValidationError("ZIP dosyası desteklenen dosya türü içermiyor.");
    }

    // Check individual file sizes
    for (const file of files) {
      if (file.size > this.storageConfig.maxFileSize) {
        throw new ValidationError(
          `Dosya çok büyük: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)}MB). Maksimum ${this.storageConfig.maxFileSize / (1024 * 1024)}MB izin verilir.`
        );
      }

      if (file.size === 0) {
        throw new ValidationError(`Boş dosya: ${file.name}`);
      }
    }
  }

  /**
   * Sanitize file path to prevent path traversal attacks
   */
  private sanitizePath(filePath: string): string | null {
    // Normalize path separators
    const normalized = filePath.replace(/\\/g, "/");
    
    // Remove leading slashes and resolve relative paths
    const cleanPath = path.normalize(normalized).replace(/^(\.\.(\/|\\|$))+/, "");
    
    // Check for path traversal attempts
    if (cleanPath.includes("..") || path.isAbsolute(cleanPath)) {
      return null;
    }

    // Remove any remaining dangerous characters
    if (cleanPath.includes("\0") || cleanPath.includes("\r") || cleanPath.includes("\n")) {
      return null;
    }

    return cleanPath;
  }

  /**
   * Detect MIME type from file extension and buffer
   */
  private detectMimeType(fileName: string, buffer: Buffer): string {
    const ext = path.extname(fileName).toLowerCase();
    
    // MIME type mapping
    const mimeTypes: Record<string, string> = {
      ".pdf": "application/pdf",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".bmp": "image/bmp",
      ".xls": "application/vnd.ms-excel",
      ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".doc": "application/msword",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };

    // Check extension first
    if (mimeTypes[ext]) {
      return mimeTypes[ext];
    }

    // Fallback: check magic bytes for PDF
    if (buffer.length >= 4) {
      const header = buffer.slice(0, 4).toString("ascii");
      if (header === "%PDF") {
        return "application/pdf";
      }
    }

    // Default to application/octet-stream if unknown
    return "application/octet-stream";
  }
}

export const zipExtractionService = new ZipExtractionService();



