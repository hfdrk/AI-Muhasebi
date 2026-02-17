-- CreateTable
CREATE TABLE "masak_reports" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "client_company_id" TEXT NOT NULL,
    "report_type" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "suspicion_type" VARCHAR(100) NOT NULL,
    "suspicion_details" TEXT NOT NULL,
    "transaction_ids" JSONB NOT NULL DEFAULT '[]',
    "invoice_ids" JSONB NOT NULL DEFAULT '[]',
    "total_amount" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'TRY',
    "counterparty_name" VARCHAR(255),
    "counterparty_tax_no" VARCHAR(50),
    "risk_score" DECIMAL(5,2),
    "risk_indicators" JSONB NOT NULL DEFAULT '[]',
    "detected_at" TIMESTAMPTZ(6) NOT NULL,
    "reported_at" TIMESTAMPTZ(6),
    "filing_reference" VARCHAR(100),
    "deadline" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_by_user_id" TEXT NOT NULL,
    "reviewed_by_user_id" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "masak_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kurgan_signals" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "client_company_id" TEXT NOT NULL,
    "signal_type" VARCHAR(100) NOT NULL,
    "severity" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'new',
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT NOT NULL,
    "data_source" VARCHAR(100) NOT NULL,
    "affected_period" VARCHAR(50),
    "risk_score" DECIMAL(5,2) NOT NULL,
    "financial_impact" DECIMAL(15,2),
    "related_invoice_ids" JSONB NOT NULL DEFAULT '[]',
    "related_document_ids" JSONB NOT NULL DEFAULT '[]',
    "recommended_action" TEXT,
    "response_notes" TEXT,
    "responded_at" TIMESTAMPTZ(6),
    "responded_by_user_id" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "kurgan_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ba_bs_forms" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "client_company_id" TEXT NOT NULL,
    "form_type" VARCHAR(10) NOT NULL,
    "period" VARCHAR(7) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "total_amount" DECIMAL(15,2) NOT NULL,
    "line_count" INTEGER NOT NULL DEFAULT 0,
    "cross_check_status" VARCHAR(50),
    "cross_check_errors" JSONB NOT NULL DEFAULT '[]',
    "submitted_at" TIMESTAMPTZ(6),
    "filing_reference" VARCHAR(100),
    "generated_by_user_id" TEXT,
    "notes" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ba_bs_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ba_bs_form_lines" (
    "id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "counterparty_name" VARCHAR(255) NOT NULL,
    "counterparty_tax_number" VARCHAR(50) NOT NULL,
    "counterparty_country" VARCHAR(2) NOT NULL DEFAULT 'TR',
    "document_count" INTEGER NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "cross_check_match" BOOLEAN,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ba_bs_form_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beyannameler" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "client_company_id" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "period" VARCHAR(10) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "due_date" TIMESTAMPTZ(6) NOT NULL,
    "calculated_amount" DECIMAL(15,2),
    "deductible_amount" DECIMAL(15,2),
    "net_payable" DECIMAL(15,2),
    "carry_forward" DECIMAL(15,2),
    "calculation_data" JSONB NOT NULL DEFAULT '{}',
    "submitted_at" TIMESTAMPTZ(6),
    "filing_reference" VARCHAR(100),
    "prepared_by_user_id" TEXT,
    "reviewed_by_user_id" TEXT,
    "notes" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "beyannameler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mali_musavir_profiles" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "license_type" VARCHAR(10) NOT NULL,
    "license_number" VARCHAR(50) NOT NULL,
    "turmob_number" VARCHAR(50),
    "chamber_name" VARCHAR(255),
    "specializations" JSONB NOT NULL DEFAULT '[]',
    "insurance_provider" VARCHAR(255),
    "insurance_amount" DECIMAL(15,2),
    "insurance_expiry" TIMESTAMPTZ(6),
    "insurance_policy_no" VARCHAR(100),
    "cpd_hours_completed" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "cpd_period_start" TIMESTAMPTZ(6),
    "masak_training_date" TIMESTAMPTZ(6),
    "total_active_clients" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mali_musavir_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "masak_reports_tenant_id_idx" ON "masak_reports"("tenant_id");
CREATE INDEX "masak_reports_tenant_id_status_idx" ON "masak_reports"("tenant_id", "status");
CREATE INDEX "masak_reports_tenant_id_client_company_id_idx" ON "masak_reports"("tenant_id", "client_company_id");
CREATE INDEX "masak_reports_tenant_id_suspicion_type_idx" ON "masak_reports"("tenant_id", "suspicion_type");
CREATE INDEX "masak_reports_status_idx" ON "masak_reports"("status");
CREATE INDEX "masak_reports_detected_at_idx" ON "masak_reports"("detected_at");
CREATE INDEX "masak_reports_deadline_idx" ON "masak_reports"("deadline");

-- CreateIndex
CREATE INDEX "kurgan_signals_tenant_id_idx" ON "kurgan_signals"("tenant_id");
CREATE INDEX "kurgan_signals_tenant_id_status_idx" ON "kurgan_signals"("tenant_id", "status");
CREATE INDEX "kurgan_signals_tenant_id_client_company_id_idx" ON "kurgan_signals"("tenant_id", "client_company_id");
CREATE INDEX "kurgan_signals_tenant_id_signal_type_idx" ON "kurgan_signals"("tenant_id", "signal_type");
CREATE INDEX "kurgan_signals_tenant_id_severity_idx" ON "kurgan_signals"("tenant_id", "severity");
CREATE INDEX "kurgan_signals_status_idx" ON "kurgan_signals"("status");
CREATE INDEX "kurgan_signals_created_at_idx" ON "kurgan_signals"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ba_bs_forms_tenant_id_client_company_id_form_type_period_key" ON "ba_bs_forms"("tenant_id", "client_company_id", "form_type", "period");
CREATE INDEX "ba_bs_forms_tenant_id_idx" ON "ba_bs_forms"("tenant_id");
CREATE INDEX "ba_bs_forms_tenant_id_client_company_id_idx" ON "ba_bs_forms"("tenant_id", "client_company_id");
CREATE INDEX "ba_bs_forms_tenant_id_period_idx" ON "ba_bs_forms"("tenant_id", "period");
CREATE INDEX "ba_bs_forms_tenant_id_status_idx" ON "ba_bs_forms"("tenant_id", "status");
CREATE INDEX "ba_bs_forms_period_idx" ON "ba_bs_forms"("period");

-- CreateIndex
CREATE INDEX "ba_bs_form_lines_form_id_idx" ON "ba_bs_form_lines"("form_id");
CREATE INDEX "ba_bs_form_lines_counterparty_tax_number_idx" ON "ba_bs_form_lines"("counterparty_tax_number");

-- CreateIndex
CREATE UNIQUE INDEX "beyannameler_tenant_id_client_company_id_type_period_key" ON "beyannameler"("tenant_id", "client_company_id", "type", "period");
CREATE INDEX "beyannameler_tenant_id_idx" ON "beyannameler"("tenant_id");
CREATE INDEX "beyannameler_tenant_id_client_company_id_idx" ON "beyannameler"("tenant_id", "client_company_id");
CREATE INDEX "beyannameler_tenant_id_type_idx" ON "beyannameler"("tenant_id", "type");
CREATE INDEX "beyannameler_tenant_id_status_idx" ON "beyannameler"("tenant_id", "status");
CREATE INDEX "beyannameler_tenant_id_due_date_idx" ON "beyannameler"("tenant_id", "due_date");
CREATE INDEX "beyannameler_due_date_idx" ON "beyannameler"("due_date");
CREATE INDEX "beyannameler_period_idx" ON "beyannameler"("period");

-- CreateIndex
CREATE UNIQUE INDEX "mali_musavir_profiles_tenant_id_key" ON "mali_musavir_profiles"("tenant_id");
CREATE INDEX "mali_musavir_profiles_license_type_idx" ON "mali_musavir_profiles"("license_type");
CREATE INDEX "mali_musavir_profiles_license_number_idx" ON "mali_musavir_profiles"("license_number");

-- AddForeignKey
ALTER TABLE "masak_reports" ADD CONSTRAINT "masak_reports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "masak_reports" ADD CONSTRAINT "masak_reports_client_company_id_fkey" FOREIGN KEY ("client_company_id") REFERENCES "client_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "masak_reports" ADD CONSTRAINT "masak_reports_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "masak_reports" ADD CONSTRAINT "masak_reports_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kurgan_signals" ADD CONSTRAINT "kurgan_signals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kurgan_signals" ADD CONSTRAINT "kurgan_signals_client_company_id_fkey" FOREIGN KEY ("client_company_id") REFERENCES "client_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kurgan_signals" ADD CONSTRAINT "kurgan_signals_responded_by_user_id_fkey" FOREIGN KEY ("responded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ba_bs_forms" ADD CONSTRAINT "ba_bs_forms_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ba_bs_forms" ADD CONSTRAINT "ba_bs_forms_client_company_id_fkey" FOREIGN KEY ("client_company_id") REFERENCES "client_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ba_bs_forms" ADD CONSTRAINT "ba_bs_forms_generated_by_user_id_fkey" FOREIGN KEY ("generated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ba_bs_form_lines" ADD CONSTRAINT "ba_bs_form_lines_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "ba_bs_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beyannameler" ADD CONSTRAINT "beyannameler_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "beyannameler" ADD CONSTRAINT "beyannameler_client_company_id_fkey" FOREIGN KEY ("client_company_id") REFERENCES "client_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "beyannameler" ADD CONSTRAINT "beyannameler_prepared_by_user_id_fkey" FOREIGN KEY ("prepared_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "beyannameler" ADD CONSTRAINT "beyannameler_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mali_musavir_profiles" ADD CONSTRAINT "mali_musavir_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
