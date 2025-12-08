import type { IObjectStorage } from "@repo/shared-utils";
/**
 * Get the configured storage instance
 */
export declare function getStorage(): IObjectStorage;
/**
 * Get storage configuration constants
 */
export declare function getStorageConfig(): {
    type: "local" | "s3" | "gcs" | "azure";
    basePath: string;
    bucketName: string | undefined;
    maxFileSize: number;
    allowedMimeTypes: string[];
};
//# sourceMappingURL=index.d.ts.map