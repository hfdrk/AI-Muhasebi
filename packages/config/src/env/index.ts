import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().optional(),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_ACCESS_TOKEN_EXPIRY: z.string().default("15m"),
  JWT_REFRESH_TOKEN_EXPIRY: z.string().default("7d"),
  API_URL: z.string().url().optional(),
  FRONTEND_URL: z.string().url().optional(),
  PORT: z.string().default("3800"),
  // Email configuration (stubbed for now)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  // Error tracking
  SENTRY_DSN: z.string().optional(),
  // Storage configuration
  STORAGE_TYPE: z.enum(["local", "s3", "gcs", "azure"]).default("local"),
  STORAGE_BASE_PATH: z.string().default("./storage"),
  STORAGE_BUCKET_NAME: z.string().optional(),
  STORAGE_MAX_FILE_SIZE: z.string().default("20971520"), // 20MB in bytes
  STORAGE_ALLOWED_MIME_TYPES: z.string().default("application/pdf,image/jpeg,image/png,image/jpg,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
});

export type EnvConfig = z.infer<typeof envSchema>;

let config: EnvConfig | null = null;

export function getConfig(): EnvConfig {
  if (config) {
    return config;
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${errors}`);
  }

  config = result.data;
  return config;
}

export function validateEnv(): void {
  getConfig();
}
