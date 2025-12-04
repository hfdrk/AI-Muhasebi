import { Readable } from "stream";
import type { IObjectStorage, FileMetadata } from "./interface";
export declare class LocalObjectStorage implements IObjectStorage {
    private basePath;
    constructor(basePath: string);
    /**
     * Generate storage path for a file
     * Structure: {basePath}/{tenantId}/documents/{documentId}/{sanitizedFileName}
     */
    private getStoragePath;
    uploadObject(tenantId: string, key: string, stream: Readable, metadata?: FileMetadata): Promise<string>;
    getObjectStream(tenantId: string, key: string): Promise<Readable>;
    deleteObject(tenantId: string, key: string): Promise<void>;
    getObjectUrl(tenantId: string, key: string): Promise<string>;
}
//# sourceMappingURL=local-storage.d.ts.map