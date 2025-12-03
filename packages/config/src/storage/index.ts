import { getConfig } from "../env";
import type { IObjectStorage } from "@repo/shared-utils";
import { LocalObjectStorage } from "@repo/shared-utils";

let storageInstance: IObjectStorage | null = null;

/**
 * Get the configured storage instance
 */
export function getStorage(): IObjectStorage {
  if (storageInstance) {
    return storageInstance;
  }

  const config = getConfig();
  const storageType = config.STORAGE_TYPE;

  switch (storageType) {
    case "local":
      storageInstance = new LocalObjectStorage(config.STORAGE_BASE_PATH);
      break;
    case "s3":
      // TODO: Implement S3 storage adapter
      throw new Error("S3 storage adapter not yet implemented");
    case "gcs":
      // TODO: Implement GCS storage adapter
      throw new Error("GCS storage adapter not yet implemented");
    case "azure":
      // TODO: Implement Azure Blob storage adapter
      throw new Error("Azure storage adapter not yet implemented");
    default:
      throw new Error(`Unknown storage type: ${storageType}`);
  }

  return storageInstance;
}

/**
 * Get storage configuration constants
 */
export function getStorageConfig() {
  const config = getConfig();
  return {
    type: config.STORAGE_TYPE,
    basePath: config.STORAGE_BASE_PATH,
    bucketName: config.STORAGE_BUCKET_NAME,
    maxFileSize: parseInt(config.STORAGE_MAX_FILE_SIZE, 10),
    allowedMimeTypes: config.STORAGE_ALLOWED_MIME_TYPES.split(",").map((t) => t.trim()),
  };
}

