-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "to" VARCHAR(255)[],
    "subject" VARCHAR(500) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'sent',
    "message_id" VARCHAR(255),
    "error" TEXT,
    "opened_at" TIMESTAMPTZ(6),
    "clicked_at" TIMESTAMPTZ(6),
    "bounced_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_logs_tenant_id_idx" ON "email_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "email_logs_status_idx" ON "email_logs"("status");

-- CreateIndex
CREATE INDEX "email_logs_created_at_idx" ON "email_logs"("created_at");

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
