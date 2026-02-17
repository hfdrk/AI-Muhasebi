-- Row-Level Security (RLS) for multi-tenant isolation
-- This adds a database-level safety net: even if application code has a bug
-- that forgets a WHERE tenantId=... filter, PostgreSQL will block cross-tenant access.
--
-- How it works:
-- 1. Application sets current_setting('app.tenant_id') at the start of each request
-- 2. RLS policies enforce that SELECT/INSERT/UPDATE/DELETE only touch rows
--    matching the current tenant_id
-- 3. Superuser/migration connections bypass RLS (FORCE ROW LEVEL SECURITY is NOT used)

-- Create a helper function to get the current tenant ID from session settings
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS TEXT AS $$
BEGIN
  RETURN NULLIF(current_setting('app.tenant_id', true), '');
EXCEPTION
  WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Enable RLS on all tenant-scoped tables
-- Note: Table owners (the migration user) bypass RLS by default,
-- so migrations and admin operations are unaffected.

-- Core business tables
ALTER TABLE client_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_company_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_lines ENABLE ROW LEVEL SECURITY;

-- Document tables
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_ocr_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_parsed_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_risk_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;

-- Risk tables
ALTER TABLE risk_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_company_risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_alerts ENABLE ROW LEVEL SECURITY;

-- Integration tables
ALTER TABLE tenant_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_logs ENABLE ROW LEVEL SECURITY;

-- Reporting tables
ALTER TABLE report_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_execution_logs ENABLE ROW LEVEL SECURITY;

-- Notification & messaging tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Billing & usage tables
ALTER TABLE tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;

-- Task & filter tables
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_requirements ENABLE ROW LEVEL SECURITY;

-- Compliance tables
ALTER TABLE masak_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE kurgan_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ba_bs_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE beyannameler ENABLE ROW LEVEL SECURITY;

-- Mali musavir & e-defter
ALTER TABLE mali_musavir_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE e_defter_ledgers ENABLE ROW LEVEL SECURITY;

-- Recurring invoices, checks, payments
ALTER TABLE recurring_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_flow_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for each table
-- Policy pattern: allow access when tenant_id matches current_tenant_id() OR when no tenant is set (admin/migration)

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'client_companies', 'client_company_bank_accounts', 'invoices', 'invoice_lines',
      'ledger_accounts', 'transactions', 'transaction_lines',
      'documents', 'document_processing_jobs', 'document_ocr_results',
      'document_parsed_data', 'document_risk_features', 'document_embeddings',
      'risk_rules', 'document_risk_scores', 'client_company_risk_scores',
      'risk_score_history', 'risk_alerts',
      'tenant_integrations', 'integration_sync_jobs', 'integration_sync_logs',
      'report_definitions', 'scheduled_reports', 'report_execution_logs',
      'notifications', 'notification_preferences', 'message_threads', 'messages',
      'tenant_subscriptions', 'tenant_usages', 'tenant_settings',
      'tasks', 'saved_filters', 'document_requirements',
      'masak_reports', 'kurgan_signals', 'ba_bs_forms', 'beyannameler',
      'mali_musavir_profiles', 'e_defter_ledgers',
      'recurring_invoices', 'check_notes', 'payment_reminders', 'cash_flow_entries'
    ])
  LOOP
    -- SELECT policy
    EXECUTE format(
      'CREATE POLICY tenant_isolation_select ON %I FOR SELECT USING (tenant_id = current_tenant_id() OR current_tenant_id() IS NULL)',
      tbl
    );
    -- INSERT policy
    EXECUTE format(
      'CREATE POLICY tenant_isolation_insert ON %I FOR INSERT WITH CHECK (tenant_id = current_tenant_id() OR current_tenant_id() IS NULL)',
      tbl
    );
    -- UPDATE policy
    EXECUTE format(
      'CREATE POLICY tenant_isolation_update ON %I FOR UPDATE USING (tenant_id = current_tenant_id() OR current_tenant_id() IS NULL)',
      tbl
    );
    -- DELETE policy
    EXECUTE format(
      'CREATE POLICY tenant_isolation_delete ON %I FOR DELETE USING (tenant_id = current_tenant_id() OR current_tenant_id() IS NULL)',
      tbl
    );
  END LOOP;
END $$;
