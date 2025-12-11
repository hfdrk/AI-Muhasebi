-- AlterTable: Add new fields to audit_logs
ALTER TABLE "audit_logs" ADD COLUMN "resource_type" VARCHAR(100);
ALTER TABLE "audit_logs" ADD COLUMN "resource_id" VARCHAR(255);
ALTER TABLE "audit_logs" ADD COLUMN "ip_address" VARCHAR(45);

-- CreateIndex
CREATE INDEX "audit_logs_resource_type_idx" ON "audit_logs"("resource_type");

-- CreateIndex
CREATE INDEX "audit_logs_resource_id_idx" ON "audit_logs"("resource_id");

-- CreateTable
CREATE TABLE "tenant_settings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "display_name" VARCHAR(255),
    "logo_url" VARCHAR(500),
    "locale" VARCHAR(10) NOT NULL DEFAULT 'tr-TR',
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'Europe/Istanbul',
    "email_from_name" VARCHAR(255),
    "risk_thresholds" JSONB NOT NULL DEFAULT '{"high":70,"critical":90}',
    "default_report_period" VARCHAR(50) NOT NULL DEFAULT 'LAST_30_DAYS',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "locale" VARCHAR(10),
    "timezone" VARCHAR(50),
    "email_notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
    "in_app_notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_settings_tenant_id_key" ON "tenant_settings"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_user_id_key" ON "user_settings"("user_id");

-- AddForeignKey
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;




