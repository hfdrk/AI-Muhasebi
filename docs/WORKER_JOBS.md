# Worker Jobs Service

The worker jobs service handles background processing for the AI Muhasebi platform. It automatically processes documents, calculates risk scores, and syncs integration data.

## Running the Worker

### Development

To run the worker in development mode:

```bash
pnpm dev:worker
```

This command starts the worker with hot-reload enabled (using `tsx watch`). The worker will:
- Process pending document jobs every 5 seconds
- Run risk calculations daily (every 24 hours)
- Process integration sync jobs every 5 minutes
- Schedule new integration sync jobs every 10 minutes

### Production

To run the worker in production:

```bash
pnpm --filter worker-jobs build
pnpm --filter worker-jobs start
```

## What the Worker Does

### 1. Document Processing

**Interval:** Every 5 seconds  
**Function:** `processPendingJobs()`

The worker automatically processes uploaded documents:

1. **Fetches pending jobs** - Queries for `DocumentProcessingJob` records with status `PENDING`
2. **Marks as IN_PROGRESS** - Updates job status and document status to `PROCESSING`
3. **Runs processing pipeline:**
   - **OCR** - Extracts text from PDF/image files (stub implementation)
   - **Parsing** - Extracts structured data (invoice fields, bank statement data)
   - **Risk Features** - Generates risk flags and features
   - **Risk Calculation** - Calculates document risk score and creates alerts if needed
4. **Updates status:**
   - On success: Job status → `SUCCESS`, Document status → `PROCESSED`
   - On failure: Job status → `FAILED` (after 3 retries), Document status → `FAILED`

**Retry Logic:**
- Jobs are retried up to 3 times
- Failed jobs are marked as `FAILED` after max attempts
- Error messages are stored in `lastErrorMessage` field

### 2. Risk Calculation & Anomaly Detection

**Interval:** Every 24 hours (daily)  
**Function:** `processScheduledRiskCalculations()`

The worker periodically recalculates risk scores for all active client companies:

1. **Fetches all tenants** - Gets all active tenants
2. **For each tenant:**
   - Fetches all active client companies
   - For each company:
     - Recalculates `ClientCompanyRiskScore` using `RiskRuleEngine`
     - Runs anomaly detection on transactions
     - Creates `RiskAlert` entries when:
       - Risk score severity is "high" or "critical"
       - Anomalies are detected (expense spikes, large transactions, etc.)

**Note:** In development, you can modify `RISK_CALCULATION_INTERVAL_MS` in `apps/worker-jobs/src/worker.ts` to run more frequently for testing.

### 3. Integration Sync Jobs

**Interval:** Every 5 minutes  
**Function:** `processIntegrationSyncJobs()`

The worker processes integration sync jobs:

1. **Fetches pending jobs** - Queries for `IntegrationSyncJob` records with status `pending`
2. **For each job:**
   - Marks job as `in_progress`
   - Loads `TenantIntegration` and provider configuration
   - Uses connector registry to get the appropriate connector (mock or real)
   - **For `pull_invoices` jobs:**
     - Calls connector's `fetchInvoices()` method
     - Uses `InvoiceImporter` to create/update invoices in database
   - **For `pull_bank_transactions` jobs:**
     - Calls connector's `fetchBankTransactions()` method
     - Uses `BankTransactionImporter` to create/update transactions
3. **On success:**
   - Updates job status → `success`
   - Updates `TenantIntegration.last_sync_at` and `last_sync_status = "success"`
   - Creates `IntegrationSyncLog` entry with import summary
4. **On failure:**
   - Updates job status → `failed`
   - Updates `TenantIntegration.last_sync_status = "error"`
   - Creates error log entry

### 4. Integration Sync Scheduler

**Interval:** Every 10 minutes  
**Function:** `scheduleIntegrationSyncs()`

The worker automatically creates sync jobs for active integrations:

1. **Fetches active integrations** - Gets all `TenantIntegration` records with status `connected`
2. **For each integration:**
   - Checks if last sync was more than 24 hours ago (or never synced)
   - Checks if a pending/in_progress job already exists
   - Creates new `IntegrationSyncJob` if needed:
     - `pull_invoices` for accounting integrations
     - `pull_bank_transactions` for bank integrations

## Configuration

### Environment Variables

The worker uses the same environment variables as the backend API:

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT secret (for token validation if needed)
- `STORAGE_TYPE` - Storage backend type (`local`, `s3`, `gcs`, `azure`)
- `STORAGE_BASE_PATH` - Base path for local storage

See `packages/config` for full configuration options.

### Polling Intervals

Intervals can be modified in `apps/worker-jobs/src/worker.ts`:

```typescript
const POLL_INTERVAL_MS = 5000; // Document processing: 5 seconds
const RISK_CALCULATION_INTERVAL_MS = 24 * 60 * 60 * 1000; // Risk: 24 hours
const INTEGRATION_SYNC_INTERVAL_MS = 5 * 60 * 1000; // Sync: 5 minutes
const INTEGRATION_SCHEDULER_INTERVAL_MS = 10 * 60 * 1000; // Scheduler: 10 minutes
```

**Note:** For development/testing, you may want to reduce `RISK_CALCULATION_INTERVAL_MS` to run more frequently (e.g., every 15 minutes).

## Logging

The worker uses structured logging with timestamps. Log format:

```
[ISO_TIMESTAMP] [LEVEL] Message {JSON_CONTEXT}
```

**Log Levels:**
- `INFO` - Normal operations (job pickup, success, scheduling)
- `ERROR` - Errors and failures (with error messages and stack traces)

**Example logs:**
```
[2025-01-04T14:30:00.000Z] [INFO] Worker jobs service starting {"documentProcessingInterval":"5s","riskCalculationInterval":"24h","integrationSyncInterval":"300s","integrationSchedulerInterval":"600s"}
[2025-01-04T14:30:05.123Z] [INFO] Picked up 2 pending document processing job(s) {"jobCount":2}
[2025-01-04T14:30:05.456Z] [INFO] Processing document job {"jobId":"abc123","documentId":"doc456","tenantId":"tenant789","attempt":1}
[2025-01-04T14:30:10.789Z] [INFO] Document processed successfully {"jobId":"abc123","documentId":"doc456","tenantId":"tenant789"}
```

## Troubleshooting

### Worker Not Processing Documents

1. **Check if worker is running:**
   ```bash
   # Should see logs like "Worker jobs service starting..."
   ```

2. **Check for pending jobs:**
   ```sql
   SELECT * FROM document_processing_jobs WHERE status = 'PENDING';
   ```

3. **Check document status:**
   ```sql
   SELECT id, status, processing_error_message FROM documents WHERE status IN ('UPLOADED', 'PROCESSING');
   ```

4. **Check worker logs** for error messages

### Integration Sync Not Working

1. **Check integration status:**
   ```sql
   SELECT id, status, last_sync_at, last_sync_status FROM tenant_integrations WHERE status = 'connected';
   ```

2. **Check for pending sync jobs:**
   ```sql
   SELECT * FROM integration_sync_jobs WHERE status = 'pending';
   ```

3. **Check sync logs:**
   ```sql
   SELECT * FROM integration_sync_logs ORDER BY created_at DESC LIMIT 10;
   ```

### Risk Calculations Not Running

1. **Check if risk calculation loop is active:**
   - Look for logs: "Starting scheduled risk calculations"
   - Default interval is 24 hours, so it may not run immediately

2. **For testing, reduce interval:**
   ```typescript
   const RISK_CALCULATION_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes for dev
   ```

3. **Check for risk scores:**
   ```sql
   SELECT * FROM document_risk_scores ORDER BY created_at DESC LIMIT 10;
   SELECT * FROM client_company_risk_scores ORDER BY created_at DESC LIMIT 10;
   ```

### Import Path Errors

If you see errors like "Cannot find module '../../backend-api/src/services/...'":

- The worker uses dynamic imports to load services from backend-api
- Ensure both `worker-jobs` and `backend-api` are built/compiled
- Check that TypeScript paths are configured correctly in `tsconfig.json`

## Architecture

### Job Processing Flow

```
┌─────────────────┐
│  Upload Document│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Create Job      │
│ (status: PENDING)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Worker Picks Up │
│ (status: IN_PROGRESS)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Process Document│
│ (OCR → Parse →  │
│  Risk Features) │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│SUCCESS│ │FAILED │
└───────┘ └───────┘
```

### Service Dependencies

The worker depends on:
- **Database** - Shared PostgreSQL database (via Prisma)
- **Storage** - File storage abstraction (local/S3/GCS/Azure)
- **Backend Services** - Risk rule engine, anomaly detector, alert service (via dynamic imports)

## Development Tips

1. **Run worker in separate terminal:**
   ```bash
   # Terminal 1: Backend API
   pnpm --filter backend-api dev
   
   # Terminal 2: Frontend
   pnpm --filter web-app dev
   
   # Terminal 3: Worker
   pnpm dev:worker
   ```

2. **Monitor logs in real-time:**
   - Worker logs all operations with timestamps
   - Watch for ERROR level logs to catch issues early

3. **Test document processing:**
   - Upload a document via UI or API
   - Watch worker logs to see processing
   - Check document status in database or UI

4. **Test integration sync:**
   - Create an integration via UI
   - Wait for scheduler to create sync job (up to 10 minutes)
   - Or trigger manual sync via API/UI
   - Watch worker logs for sync processing

## Related Documentation

- [API Documentation](../docs/api/README.md)
- [Architecture Overview](../docs/architecture/overview.md)
- [Database Schema](../docs/architecture/database-schema.md)





