// Configuration exports
export * from "./env";
export * from "./database";
export * from "./redis";
export * from "./ocr";
export { getConfig, validateEnv } from "./env";

// Storage exports - import directly to avoid directory resolution issues  
import { getStorage as _getStorage, getStorageConfig as _getStorageConfig } from "./storage/index";
export const getStorage = _getStorage;
export const getStorageConfig = _getStorageConfig;

