import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DATABASE_URL_TEST: z.string().optional(),
  REDIS_URL: z.string().optional(),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_ACCESS_TOKEN_EXPIRY: z.string().default("15m"),
  JWT_REFRESH_TOKEN_EXPIRY: z.string().default("7d"),
  API_URL: z.string().url().optional(),
  FRONTEND_URL: z.string().url().optional(),
  PORT: z.string().default("3800"),
  BACKEND_PORT: z.string().optional(),
  CORS_ORIGIN: z.string().url().optional(),
  // Logging
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  // Worker configuration
  WORKER_CONCURRENCY: z
    .string()
    .default("5")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(100)),
  // Web app configuration
  NEXT_PUBLIC_API_BASE_URL: z.string().url().default("http://localhost:3800"),
  // Email configuration
  EMAIL_FROM_DEFAULT: z.string().email().optional(),
  EMAIL_TRANSPORT: z.enum(["stub", "smtp", "sendgrid", "ses", "mailgun"]).default("stub"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const parsed = parseInt(val, 10);
      if (isNaN(parsed)) return undefined;
      return parsed;
    })
    .pipe(z.number().int().min(1).max(65535).optional()),
  SMTP_SECURE: z.string().default("false").transform((val) => val === "true" || val === "1"),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  AWS_SES_REGION: z.string().optional(),
  AWS_SES_ACCESS_KEY_ID: z.string().optional(),
  AWS_SES_SECRET_ACCESS_KEY: z.string().optional(),
  MAILGUN_API_KEY: z.string().optional(),
  MAILGUN_DOMAIN: z.string().optional(),
  // Error tracking
  SENTRY_DSN: z.string().optional(),
  // Storage configuration
  STORAGE_TYPE: z.enum(["local", "s3", "gcs", "azure"]).default("local"),
  STORAGE_BASE_PATH: z.string().default("./storage"),
  STORAGE_BUCKET_NAME: z.string().optional(),
  STORAGE_MAX_FILE_SIZE: z.string().default("20971520"), // 20MB in bytes
  STORAGE_MAX_ZIP_FILE_SIZE: z.string().default("104857600"), // 100MB in bytes for zip files
  STORAGE_ALLOWED_MIME_TYPES: z.string().default("application/pdf,image/jpeg,image/png,image/jpg,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
  STORAGE_ALLOWED_ZIP_MIME_TYPES: z.string().default("application/zip,application/x-zip-compressed,application/x-zip"),
  // Reporting feature flags
  REPORTING_ENABLED: z
    .string()
    .default("true")
    .transform((val) => val === "true" || val === "1"),
  PDF_EXPORT_ENABLED: z
    .string()
    .default("true")
    .transform((val) => val === "true" || val === "1"),
  EXCEL_EXPORT_ENABLED: z
    .string()
    .default("true")
    .transform((val) => val === "true" || val === "1"),
  SCHEDULED_REPORTS_ENABLED: z
    .string()
    .default("true")
    .transform((val) => val === "true" || val === "1"),
});

export type EnvConfig = z.infer<typeof envSchema>;

let config: EnvConfig | null = null;

export function getConfig(): EnvConfig {
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
export function clearConfigCache(): void {
  config = null;
}

export function validateEnv(): void {
  getConfig();
}
