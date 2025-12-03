import type { Readable } from "stream";

export interface FileMetadata {
  contentType?: string;
  contentLength?: number;
  [key: string]: any;
}

export interface IObjectStorage {
  /**
   * Upload an object to storage
   * @param tenantId - Tenant identifier
   * @param key - Storage key/path
   * @param stream - File stream
   * @param metadata - File metadata
   * @returns Promise resolving to the storage path/key
   */
  uploadObject(
    tenantId: string,
    key: string,
    stream: Readable,
    metadata?: FileMetadata
  ): Promise<string>;

  /**
   * Get an object stream from storage
   * @param tenantId - Tenant identifier
   * @param key - Storage key/path
   * @returns Promise resolving to a readable stream
   */
  getObjectStream(tenantId: string, key: string): Promise<Readable>;

  /**
   * Delete an object from storage
   * @param tenantId - Tenant identifier
   * @param key - Storage key/path
   * @returns Promise that resolves when deletion is complete
   */
  deleteObject(tenantId: string, key: string): Promise<void>;

  /**
   * Get a URL for accessing an object (for signed URLs in cloud storage)
   * @param tenantId - Tenant identifier
   * @param key - Storage key/path
   * @returns Promise resolving to a URL string
   */
  getObjectUrl(tenantId: string, key: string): Promise<string>;
}

