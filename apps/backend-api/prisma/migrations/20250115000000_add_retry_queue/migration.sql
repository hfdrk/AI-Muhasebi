-- CreateTable
CREATE TABLE "retry_queue" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "type" VARCHAR(50) NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "next_retry_at" TIMESTAMPTZ(6) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "retry_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "retry_queue_tenant_id_idx" ON "retry_queue"("tenant_id");

-- CreateIndex
CREATE INDEX "retry_queue_status_idx" ON "retry_queue"("status");

-- CreateIndex
CREATE INDEX "retry_queue_next_retry_at_idx" ON "retry_queue"("next_retry_at");

-- CreateIndex
CREATE INDEX "retry_queue_type_idx" ON "retry_queue"("type");

-- AddForeignKey
ALTER TABLE "retry_queue" ADD CONSTRAINT "retry_queue_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;


