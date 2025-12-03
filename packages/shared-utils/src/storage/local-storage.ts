import { createReadStream, createWriteStream, mkdirSync, existsSync, unlinkSync, statSync } from "fs";
import { join, dirname } from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import type { IObjectStorage, FileMetadata } from "./interface";
import { sanitizeFileName } from "./validation";

export class LocalObjectStorage implements IObjectStorage {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
    // Ensure base directory exists
    if (!existsSync(this.basePath)) {
      mkdirSync(this.basePath, { recursive: true });
    }
  }

  /**
   * Generate storage path for a file
   * Structure: {basePath}/{tenantId}/documents/{documentId}/{sanitizedFileName}
   */
  private getStoragePath(tenantId: string, key: string): string {
    return join(this.basePath, tenantId, key);
  }

  async uploadObject(
    tenantId: string,
    key: string,
    stream: Readable,
    metadata?: FileMetadata
  ): Promise<string> {
    const fullPath = this.getStoragePath(tenantId, key);
    const dir = dirname(fullPath);

    // Ensure directory exists
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Write stream to file
    const writeStream = createWriteStream(fullPath);
    await pipeline(stream, writeStream);

    return key;
  }

  async getObjectStream(tenantId: string, key: string): Promise<Readable> {
    const fullPath = this.getStoragePath(tenantId, key);

    if (!existsSync(fullPath)) {
      throw new Error(`File not found: ${key}`);
    }

    return createReadStream(fullPath);
  }

  async deleteObject(tenantId: string, key: string): Promise<void> {
    const fullPath = this.getStoragePath(tenantId, key);

    if (existsSync(fullPath)) {
      unlinkSync(fullPath);
    }
  }

  async getObjectUrl(tenantId: string, key: string): Promise<string> {
    // For local storage, return a path that can be used by the backend
    // In production with cloud storage, this would return a signed URL
    return `/api/v1/documents/${tenantId}/${key}/download`;
  }
}

