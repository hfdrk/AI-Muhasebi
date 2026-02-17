import { getConfig } from "../env";
import type { IObjectStorage } from "@repo/shared-utils";
import { LocalObjectStorage, S3ObjectStorage } from "@repo/shared-utils";

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
      storageInstance = new S3ObjectStorage({
        bucket: config.STORAGE_BUCKET_NAME || "",
        region: config.STORAGE_REGION,
        accessKeyId: config.STORAGE_ACCESS_KEY_ID,
        secretAccessKey: config.STORAGE_SECRET_ACCESS_KEY,
        endpoint: config.STORAGE_ENDPOINT,
      });
      break;
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
    maxZipFileSize: parseInt(config.STORAGE_MAX_ZIP_FILE_SIZE, 10),
    allowedMimeTypes: config.STORAGE_ALLOWED_MIME_TYPES.split(",").map((t) => t.trim()),
    allowedZipMimeTypes: config.STORAGE_ALLOWED_ZIP_MIME_TYPES.split(",").map((t) => t.trim()),
  };
}

