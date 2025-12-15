-- CreateTable
CREATE TABLE "risk_score_history" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" TEXT NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "severity" VARCHAR(50) NOT NULL,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_score_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "risk_score_history_tenant_id_idx" ON "risk_score_history"("tenant_id");

-- CreateIndex
CREATE INDEX "risk_score_history_entity_type_entity_id_idx" ON "risk_score_history"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "risk_score_history_tenant_id_entity_type_entity_id_idx" ON "risk_score_history"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "risk_score_history_recorded_at_idx" ON "risk_score_history"("recorded_at");

-- CreateIndex
CREATE INDEX "risk_score_history_tenant_id_recorded_at_idx" ON "risk_score_history"("tenant_id", "recorded_at");

-- AddForeignKey
ALTER TABLE "risk_score_history" ADD CONSTRAINT "risk_score_history_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;


