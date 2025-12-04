"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalObjectStorage = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const promises_1 = require("stream/promises");
class LocalObjectStorage {
    basePath;
    constructor(basePath) {
        this.basePath = basePath;
        // Ensure base directory exists
        if (!(0, fs_1.existsSync)(this.basePath)) {
            (0, fs_1.mkdirSync)(this.basePath, { recursive: true });
        }
    }
    /**
     * Generate storage path for a file
     * Structure: {basePath}/{tenantId}/documents/{documentId}/{sanitizedFileName}
     */
    getStoragePath(tenantId, key) {
        return (0, path_1.join)(this.basePath, tenantId, key);
    }
    async uploadObject(tenantId, key, stream, metadata) {
        const fullPath = this.getStoragePath(tenantId, key);
        const dir = (0, path_1.dirname)(fullPath);
        // Ensure directory exists
        if (!(0, fs_1.existsSync)(dir)) {
            (0, fs_1.mkdirSync)(dir, { recursive: true });
        }
        // Write stream to file
        const writeStream = (0, fs_1.createWriteStream)(fullPath);
        await (0, promises_1.pipeline)(stream, writeStream);
        return key;
    }
    async getObjectStream(tenantId, key) {
        const fullPath = this.getStoragePath(tenantId, key);
        if (!(0, fs_1.existsSync)(fullPath)) {
            throw new Error(`File not found: ${key}`);
        }
        return (0, fs_1.createReadStream)(fullPath);
    }
    async deleteObject(tenantId, key) {
        const fullPath = this.getStoragePath(tenantId, key);
        if ((0, fs_1.existsSync)(fullPath)) {
            (0, fs_1.unlinkSync)(fullPath);
        }
    }
    async getObjectUrl(tenantId, key) {
        // For local storage, return a path that can be used by the backend
        // In production with cloud storage, this would return a signed URL
        return `/api/v1/documents/${tenantId}/${key}/download`;
    }
}
exports.LocalObjectStorage = LocalObjectStorage;
//# sourceMappingURL=local-storage.js.map