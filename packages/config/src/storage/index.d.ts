import type { IObjectStorage } from "@repo/shared-utils";
/**
 * Get the configured storage instance
 */
export declare function getStorage(): IObjectStorage;
/**
 * Get storage configuration constants
 */
export declare function getStorageConfig(): {
    type: any;
    basePath: any;
    bucketName: any;
    maxFileSize: number;
    allowedMimeTypes: any;
};
//# sourceMappingURL=index.d.ts.map