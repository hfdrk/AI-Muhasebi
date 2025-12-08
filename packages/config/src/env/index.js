"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = getConfig;
exports.clearConfigCache = clearConfigCache;
exports.validateEnv = validateEnv;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(["development", "staging", "production"]).default("development"),
    DATABASE_URL: zod_1.z.string().min(1, "DATABASE_URL is required"),
    DATABASE_URL_TEST: zod_1.z.string().optional(),
    REDIS_URL: zod_1.z.string().optional(),
    JWT_SECRET: zod_1.z.string().min(32, "JWT_SECRET must be at least 32 characters"),
    JWT_ACCESS_TOKEN_EXPIRY: zod_1.z.string().default("15m"),
    JWT_REFRESH_TOKEN_EXPIRY: zod_1.z.string().default("7d"),
    API_URL: zod_1.z.string().url().optional(),
    FRONTEND_URL: zod_1.z.string().url().optional(),
    PORT: zod_1.z.string().default("3800"),
    BACKEND_PORT: zod_1.z.string().optional(),
    CORS_ORIGIN: zod_1.z.string().url().optional(),
    // Logging
    LOG_LEVEL: zod_1.z.enum(["debug", "info", "warn", "error"]).default("info"),
    // Worker configuration
    WORKER_CONCURRENCY: zod_1.z
        .string()
        .default("5")
        .transform((val) => parseInt(val, 10))
        .pipe(zod_1.z.number().int().min(1).max(100)),
    // Web app configuration
    NEXT_PUBLIC_API_BASE_URL: zod_1.z.string().url().default("http://localhost:3800"),
    // Email configuration
    EMAIL_FROM_DEFAULT: zod_1.z.string().email().optional(),
    EMAIL_TRANSPORT: zod_1.z.enum(["stub", "smtp"]).default("stub"),
    SMTP_HOST: zod_1.z.string().optional(),
    SMTP_PORT: zod_1.z.string().optional(),
    SMTP_USER: zod_1.z.string().optional(),
    SMTP_PASSWORD: zod_1.z.string().optional(),
    SMTP_FROM: zod_1.z.string().optional(),
    // Error tracking
    SENTRY_DSN: zod_1.z.string().optional(),
    // Storage configuration
    STORAGE_TYPE: zod_1.z.enum(["local", "s3", "gcs", "azure"]).default("local"),
    STORAGE_BASE_PATH: zod_1.z.string().default("./storage"),
    STORAGE_BUCKET_NAME: zod_1.z.string().optional(),
    STORAGE_MAX_FILE_SIZE: zod_1.z.string().default("20971520"), // 20MB in bytes
    STORAGE_ALLOWED_MIME_TYPES: zod_1.z.string().default("application/pdf,image/jpeg,image/png,image/jpg,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    // Reporting feature flags
    REPORTING_ENABLED: zod_1.z
        .string()
        .default("true")
        .transform((val) => val === "true" || val === "1"),
    PDF_EXPORT_ENABLED: zod_1.z
        .string()
        .default("true")
        .transform((val) => val === "true" || val === "1"),
    EXCEL_EXPORT_ENABLED: zod_1.z
        .string()
        .default("true")
        .transform((val) => val === "true" || val === "1"),
    SCHEDULED_REPORTS_ENABLED: zod_1.z
        .string()
        .default("true")
        .transform((val) => val === "true" || val === "1"),
});
let config = null;
function getConfig() {
    // Always re-read from process.env in development to pick up changes
    // In production, cache for performance
    if (config && process.env.NODE_ENV === "production") {
        return config;
    }
    // Clear cache in development to pick up env changes
    if (process.env.NODE_ENV !== "production") {
        config = null;
    }
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        const errors = result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("\n");
        throw new Error(`Invalid environment configuration:\n${errors}`);
    }
    config = result.data;
    return config;
}
// Function to clear config cache (useful for testing or hot reloading)
function clearConfigCache() {
    config = null;
}
function validateEnv() {
    getConfig();
}
//# sourceMappingURL=index.js.map