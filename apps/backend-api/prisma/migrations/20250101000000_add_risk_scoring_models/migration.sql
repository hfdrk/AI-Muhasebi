-- CreateTable
CREATE TABLE "risk_rules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "scope" VARCHAR(50) NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "weight" DECIMAL(5,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "default_severity" VARCHAR(50) NOT NULL,
    "config" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "risk_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_risk_scores" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "severity" VARCHAR(50) NOT NULL,
    "triggered_rule_codes" JSONB NOT NULL DEFAULT '[]',
    "generated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "document_risk_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_company_risk_scores" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "client_company_id" TEXT NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "severity" VARCHAR(50) NOT NULL,
    "triggered_rule_codes" JSONB NOT NULL DEFAULT '[]',
    "generated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "client_company_risk_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_alerts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "client_company_id" TEXT,
    "document_id" TEXT,
    "type" VARCHAR(100) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "severity" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'open',
    "resolved_at" TIMESTAMPTZ(6),
    "resolved_by_user_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "risk_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "risk_rules_tenant_id_code_key" ON "risk_rules"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "risk_rules_tenant_id_idx" ON "risk_rules"("tenant_id");

-- CreateIndex
CREATE INDEX "risk_rules_scope_idx" ON "risk_rules"("scope");

-- CreateIndex
CREATE INDEX "risk_rules_is_active_idx" ON "risk_rules"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "document_risk_scores_document_id_key" ON "document_risk_scores"("document_id");

-- CreateIndex
CREATE INDEX "document_risk_scores_tenant_id_idx" ON "document_risk_scores"("tenant_id");

-- CreateIndex
CREATE INDEX "document_risk_scores_document_id_idx" ON "document_risk_scores"("document_id");

-- CreateIndex
CREATE INDEX "document_risk_scores_severity_idx" ON "document_risk_scores"("severity");

-- CreateIndex
CREATE INDEX "document_risk_scores_tenant_id_severity_idx" ON "document_risk_scores"("tenant_id", "severity");

-- CreateIndex
CREATE INDEX "document_risk_scores_generated_at_idx" ON "document_risk_scores"("generated_at");

-- CreateIndex
CREATE INDEX "client_company_risk_scores_tenant_id_idx" ON "client_company_risk_scores"("tenant_id");

-- CreateIndex
CREATE INDEX "client_company_risk_scores_client_company_id_idx" ON "client_company_risk_scores"("client_company_id");

-- CreateIndex
CREATE INDEX "client_company_risk_scores_severity_idx" ON "client_company_risk_scores"("severity");

-- CreateIndex
CREATE INDEX "client_company_risk_scores_tenant_id_severity_idx" ON "client_company_risk_scores"("tenant_id", "severity");

-- CreateIndex
CREATE INDEX "client_company_risk_scores_generated_at_idx" ON "client_company_risk_scores"("generated_at");

-- CreateIndex
CREATE INDEX "risk_alerts_tenant_id_idx" ON "risk_alerts"("tenant_id");

-- CreateIndex
CREATE INDEX "risk_alerts_client_company_id_idx" ON "risk_alerts"("client_company_id");

-- CreateIndex
CREATE INDEX "risk_alerts_document_id_idx" ON "risk_alerts"("document_id");

-- CreateIndex
CREATE INDEX "risk_alerts_status_idx" ON "risk_alerts"("status");

-- CreateIndex
CREATE INDEX "risk_alerts_severity_idx" ON "risk_alerts"("severity");

-- CreateIndex
CREATE INDEX "risk_alerts_tenant_id_status_idx" ON "risk_alerts"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "risk_alerts_tenant_id_severity_idx" ON "risk_alerts"("tenant_id", "severity");

-- CreateIndex
CREATE INDEX "risk_alerts_created_at_idx" ON "risk_alerts"("created_at");

-- AddForeignKey
ALTER TABLE "risk_rules" ADD CONSTRAINT "risk_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_risk_scores" ADD CONSTRAINT "document_risk_scores_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_risk_scores" ADD CONSTRAINT "document_risk_scores_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_company_risk_scores" ADD CONSTRAINT "client_company_risk_scores_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_company_risk_scores" ADD CONSTRAINT "client_company_risk_scores_client_company_id_fkey" FOREIGN KEY ("client_company_id") REFERENCES "client_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_alerts" ADD CONSTRAINT "risk_alerts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_alerts" ADD CONSTRAINT "risk_alerts_client_company_id_fkey" FOREIGN KEY ("client_company_id") REFERENCES "client_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_alerts" ADD CONSTRAINT "risk_alerts_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_alerts" ADD CONSTRAINT "risk_alerts_resolved_by_user_id_fkey" FOREIGN KEY ("resolved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

