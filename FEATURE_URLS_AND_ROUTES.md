# Feature URLs and Routes Reference

This document lists all URLs and API routes where you can access the implemented features.

**Last Updated:** 2025-01-16  
**New Features Added:** Email System, Messaging API, Client Portal, Contract Parser, Push Sync, Real-time Sync Status Updates, **Messaging Frontend UI**, **Email Template Management UI**, **Error Handling & Retry Queue**, **Contract Analysis Frontend UI**

**⚠️ Important:** Sync jobs require the worker to be running. Start it with: `cd apps/worker-jobs && pnpm dev`

## 🌐 Frontend URLs (Web App)

Base URL: `http://localhost:3000`

### P0 (Critical) Features

#### 1. Real Integrations
- **Main Page**: `/entegrasyonlar`
  - View all integrations
  - Create new integrations
  - Configure integration settings
  - Access field mapping UI

- **Integration Details**: `/entegrasyonlar/[id]`
  - View integration details
  - Test connection
  - Trigger sync (pull/push)
  - Configure field mappings
  - View sync history (jobs table with real-time status updates)
  - View sync logs (auto-refreshes when jobs are active)
  - Edit integration settings

- **Integration Edit**: `/entegrasyonlar/[id]/edit`
  - Edit integration display name
  - Update integration configuration
  - Test connection

#### 2. Advanced Fraud Detection
- **Risk Dashboard**: `/risk/dashboard`
  - View overall risk metrics
  - See fraud detection alerts
  - View risk trends

- **Risk Alerts**: `/risk/alerts`
  - View all risk alerts
  - Filter by severity
  - See fraud pattern detections
  - View duplicate invoice alerts
  - See unusual counterparty alerts

- **Client Risk View**: `/musteriler/[id]` → Risk tab
  - View client-specific risk scores
  - See risk explanations
  - View risk trend charts
  - See triggered fraud patterns

- **Invoice Details**: `/faturalar/[id]`
  - View duplicate detection results
  - See counterparty analysis
  - View fraud pattern flags

### P1 (High) Features

#### 3. OCR Integration
- **Document Upload**: `/belgeler`
  - Upload documents (OCR runs automatically)
  - View OCR results in document details

- **Document Details**: `/belgeler/[id]`
  - View extracted text from OCR
  - See which OCR provider was used
  - View OCR confidence scores

**Note**: OCR runs automatically in the background when documents are uploaded. Check document processing status.

#### 3a. Contract Parser (NEW - 2025-01-15)
- **Automatic Detection**: Contract documents are automatically detected
- **Detection Keywords**: 
  - Turkish: "Sözleşme", "Mukavele", "Anlaşma"
  - English: "Contract", "Agreement"
- **Document Details**: `/belgeler/[id]`
  - View parsed contract data in "Parsed Data" section
  - Extracted fields:
    - Contract number, dates (contract, start, end, expiration)
    - Contract value and currency
    - Parties (names, roles, tax numbers)
    - Contract type (lease, service, purchase, employment)
    - Terms and renewal terms
- **How to Test:**
  1. Upload a PDF with "Sözleşme" or "Contract" in the text
  2. Document will be automatically detected as contract type
  3. View parsed fields in document details page

#### 3b. Advanced Contract Analysis (NEW - 2025-01-16)
- **Frontend Page**: `/sozlesmeler`
  - View all contracts with expiration status
  - Filter by: All, Expiring Soon, Expired
  - Summary cards showing totals and statistics
  - Manual expiration check button
  - Link to view contract documents
- **Automatic Expiration Monitoring**: Contract expiration checks run daily via worker
- **Expiration Alerts**: Automatic notifications created for:
  - Contracts expiring within 30 days (high priority)
  - Contracts expiring within 60 days (medium priority)
  - Contracts expiring within 90 days (low priority)
  - Expired contracts (critical)
- **API Endpoints** (Base: `/api/v1/contracts`):
  - `GET /api/v1/contracts` - Get all contracts for tenant
  - `GET /api/v1/contracts/expiring?days=90` - Get contracts expiring within specified days
  - `GET /api/v1/contracts/expired` - Get expired contracts
  - `GET /api/v1/contracts/summary` - Get contract analysis summary (total, expiring, expired, total value)
  - `POST /api/v1/contracts/check-expirations` - Manually trigger expiration check
- **Worker Job**: Contract expiration checker runs daily at midnight
- **How to Test:**
  1. Go to `/sozlesmeler` to view contracts UI
  2. Upload contract documents (they will be parsed automatically)
  3. View contracts, expiring contracts, and expired contracts in the UI
  4. Check notifications for expiration alerts
  5. Use "Süre Kontrolü Yap" button to manually trigger expiration check

#### 4. Task Management
- **Tasks Page**: `/gorevler`
  - View all tasks
  - Filter by status, priority, overdue
  - Create/edit/delete tasks
  - Change task status inline

- **Dashboard Widget**: `/anasayfa`
  - Task statistics widget
  - Quick overview of tasks

### P2 (Medium) Features

#### 5. Missing Document Tracking
- **Missing Documents Page**: `/eksik-belgeler`
  - View all document requirements
  - Filter by status (pending, overdue, received)
  - Create document requirements
  - Mark documents as received

- **Dashboard Summary**: `/anasayfa`
  - Missing documents summary card
  - Overdue document count

#### 6. Risk Score Enhancements
- **Risk Explanations**: `/risk/documents/[id]/explanation`
  - Detailed risk score breakdown
  - Contributing factors
  - Recommendations

- **Risk Trends**: `/risk/documents/[id]/trend`
  - Historical risk score chart
  - Trend analysis

- **Client Risk Explanations**: `/musteriler/[id]` → Risk tab
  - Company-level risk explanation
  - Risk trend visualization
  - Historical risk data

### P3 (Low) Features

#### 7. Reporting Enhancements
- **Reports Page**: `/raporlar`
  - List all available reports
  - Generate on-demand reports

- **On-Demand Reports**: `/raporlar/anlik`
  - Generate financial summary reports (with AI suggestions)
  - Generate risk summary reports (with AI suggestions)
  - Generate audit preparation reports
  - View improvement suggestions in report results

- **Scheduled Reports**: `/raporlar/zamanlanmis`
  - View scheduled reports
  - Create new scheduled reports

## 🔌 Backend API Routes

Base URL: `http://localhost:3800`

### P0 (Critical) Features

#### 1. Real Integrations API

**Integration Providers:**
- `GET /api/v1/integrations/providers` - List all available providers
- `GET /api/v1/integrations/providers/:id` - Get provider details

**Tenant Integrations:**
- `GET /api/v1/integrations` - List tenant integrations
- `GET /api/v1/integrations/:id` - Get integration details
- `POST /api/v1/integrations` - Create new integration
- `PATCH /api/v1/integrations/:id` - Update integration
- `DELETE /api/v1/integrations/:id` - Delete integration
- `POST /api/v1/integrations/:id/test` - Test connection
- `POST /api/v1/integrations/:id/sync` - Trigger sync (pull/push)

**Field Mapping:**
- `GET /api/v1/integrations/:id/mappings` - Get field mappings
- `PUT /api/v1/integrations/:id/mappings` - Update field mappings
- `GET /api/v1/integrations/:id/mappings/suggestions` - Get suggested mappings

**Sync Jobs:**
- `GET /api/v1/integrations/:id/jobs` - List sync jobs (with status: pending, in_progress, success, failed)
- `GET /api/v1/integrations/:id/jobs/:jobId` - Get sync job details

**Sync Logs:**
- `GET /api/v1/integrations/:id/logs` - List sync logs
  - Logs are created when:
    - Sync job starts (info level)
    - Sync job completes successfully (info level with results)
    - Sync job fails (error level with error details)
  - Logs include context data (created/updated counts, errors, etc.)
  - Auto-refreshes every 5 seconds when active jobs exist

**Push Sync (NEW - 2025-01-15):**
- Push sync jobs are automatically created by the worker scheduler
- Configuration in `TenantIntegration.config`:
  ```json
  {
    "pushSyncEnabled": true,
    "pushSyncFrequency": "daily"  // hourly, daily, weekly, monthly
  }
  ```
- View push sync jobs in: `/entegrasyonlar/[id]` → Sync Jobs tab
- Push sync runs automatically every 10 minutes (configurable)
- Supports: `push_invoices` and `push_bank_transactions` job types

#### 2. Advanced Fraud Detection API

**Risk Scores:**
- `GET /api/v1/risk/documents/:id` - Get document risk score
- `GET /api/v1/risk/companies/:id` - Get company risk score
- `GET /api/v1/risk/dashboard` - Get tenant risk dashboard

**Risk Explanations:**
- `GET /api/v1/risk/documents/:id/explanation` - Get document risk explanation
- `GET /api/v1/risk/companies/:id/explanation` - Get company risk explanation

**Risk Trends:**
- `GET /api/v1/risk/documents/:id/trend` - Get document risk trend
- `GET /api/v1/risk/companies/:id/trend` - Get company risk trend

**Risk Alerts:**
- `GET /api/v1/risk/alerts` - List risk alerts
- `GET /api/v1/risk/alerts/:id` - Get alert details
- `PATCH /api/v1/risk/alerts/:id` - Update alert (acknowledge/resolve)

**Fraud Detection (Automatic):**
- Fraud detection runs automatically when:
  - Invoices are created/updated → Duplicate detection
  - Transactions are processed → Fraud pattern analysis
  - Documents are analyzed → Counterparty analysis
- Results appear in risk alerts

### P1 (High) Features

#### 3. OCR Integration API

**Document Processing:**
- `POST /api/v1/documents` - Upload document (OCR runs automatically)
- `GET /api/v1/documents/:id` - Get document details (includes OCR results)
- `GET /api/v1/documents/:id/ocr` - Get OCR results

**OCR Configuration:**
- Configure via environment variables:
  - `OCR_PROVIDER` (google-vision, aws-textract, tesseract, stub)
  - `GOOGLE_VISION_API_KEY`
  - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
  - `AWS_REGION`

#### 3a. Contract Analysis API (NEW - 2025-01-16)

**Contract Management:**
- `GET /api/v1/contracts` - Get all contracts for tenant
  - Returns: Array of contract analysis results with expiration dates, values, etc.
- `GET /api/v1/contracts/expiring?days=90` - Get contracts expiring within specified days
  - Query parameter: `days` (optional, default: 90)
  - Example: `/api/v1/contracts/expiring?days=30` for contracts expiring in 30 days
- `GET /api/v1/contracts/expired` - Get expired contracts
- `GET /api/v1/contracts/summary` - Get contract analysis summary
  - Returns: `{ total, expiringSoon, expired, totalValue }`
- `POST /api/v1/contracts/check-expirations` - Manually trigger expiration check
  - Creates notifications for expiring/expired contracts
  - Returns: `{ checked, expiringSoon, expired, alertsCreated }`

**Automatic Features:**
- Contract expiration checks run daily via worker (automatic)
- Notifications created automatically for:
  - Contracts expiring within 30 days (high priority alert)
  - Contracts expiring within 60 days (medium priority alert)
  - Contracts expiring within 90 days (low priority alert)
  - Expired contracts (critical alert)

#### 4. Task Management API

**Tasks:**
- `GET /api/v1/tasks` - List tasks (with filters)
- `GET /api/v1/tasks/:id` - Get task details
- `POST /api/v1/tasks` - Create task
- `PATCH /api/v1/tasks/:id` - Update task
- `DELETE /api/v1/tasks/:id` - Delete task
- `GET /api/v1/tasks/stats/summary` - Get task statistics

**Query Parameters for List:**
- `status` - Filter by status (pending, in_progress, completed, cancelled)
- `priority` - Filter by priority (low, medium, high)
- `overdue` - Filter overdue tasks (true/false)
- `clientCompanyId` - Filter by client company
- `assignedToUserId` - Filter by assigned user
- `page` - Page number
- `pageSize` - Items per page

### P2 (Medium) Features

#### 5. Missing Document Tracking API

**Document Requirements:**
- `GET /api/v1/document-requirements` - List document requirements
- `GET /api/v1/document-requirements/:id` - Get requirement details
- `POST /api/v1/document-requirements` - Create requirement
- `PATCH /api/v1/document-requirements/:id` - Update requirement
- `DELETE /api/v1/document-requirements/:id` - Delete requirement
- `POST /api/v1/document-requirements/check-missing` - Trigger missing document check

**Query Parameters:**
- `status` - Filter by status (pending, received, overdue)
- `clientCompanyId` - Filter by client company
- `overdue` - Filter overdue requirements (true/false)
- `page` - Page number
- `pageSize` - Items per page

#### 6. Risk Score Enhancements API

**Risk Explanations:**
- `GET /api/v1/risk/documents/:id/explanation` - Document risk explanation
- `GET /api/v1/risk/companies/:id/explanation` - Company risk explanation

**Risk Trends:**
- `GET /api/v1/risk/documents/:id/trend` - Document risk trend
- `GET /api/v1/risk/companies/:id/trend` - Company risk trend

**Query Parameters:**
- `period` - Time period (optional, e.g., "30d", "90d", "1y")

### P3 (Low) Features

#### 7. Reporting Enhancements API

**Reports:**
- `GET /api/v1/reports/definitions` - List available report types
- `POST /api/v1/reports/generate` - Generate report

**Report Types:**
- `COMPANY_FINANCIAL_SUMMARY` - Financial summary with AI suggestions
- `COMPANY_RISK_SUMMARY` - Risk summary with AI suggestions
- `TENANT_PORTFOLIO` - Portfolio overview
- `DOCUMENT_ACTIVITY` - Document activity report
- `AUDIT_PREPARATION` - Audit preparation report (NEW)

**Report Request Body:**
```json
{
  "report_code": "COMPANY_FINANCIAL_SUMMARY",
  "client_company_id": "optional-client-id",
  "filters": {
    "start_date": "2024-01-01T00:00:00Z",
    "end_date": "2024-12-31T23:59:59Z",
    "limit": 1000
  }
}
```

**Report Response includes:**
- `suggestions` - Array of AI-generated improvement suggestions
- `rows` - Report data rows
- `totals` - Summary totals
- `meta` - Metadata (row count, etc.)

**Report Downloads:**
- `GET /api/v1/reports/download?report_code=...&format=pdf` - Download PDF
- `GET /api/v1/reports/download?report_code=...&format=excel` - Download Excel

## 📍 Quick Access Guide

### To See All Features:

1. **Login**: `http://localhost:3000/auth/login`
   - Use: `yonetici@ornekofis1.com`

2. **Dashboard**: `http://localhost:3000/anasayfa`
   - Task widget
   - Missing documents summary
   - Recent risk alerts

3. **Tasks**: `http://localhost:3000/gorevler`
   - View all 11 demo tasks

4. **Messaging**: `http://localhost:3000/mesajlar`
   - View all message threads
   - Start new conversations
   - Real-time message updates

5. **Email Templates**: `http://localhost:3000/ayarlar/email-sablonlari`
   - Edit email templates
   - Preview templates
   - Send test emails

6. **Contracts**: `http://localhost:3000/sozlesmeler`
   - View all contracts
   - Filter expiring/expired contracts
   - View contract summary
   - Manual expiration check

7. **Integrations**: `http://localhost:3000/entegrasyonlar`
   - View available providers (Mikro, Logo, ETA, İş Bankası, Garanti BBVA)
   - Create integrations
   - Configure field mappings

5. **Integration Details - Sync Jobs & Logs**: `http://localhost:3000/entegrasyonlar/[integration-id]`
   - **To see Sync Jobs & Logs Behavior:**
     1. Go to `/entegrasyonlar` and click on any integration
     2. Scroll down to see two sections:
        - **"Senkronizasyon Geçmişi"** (Sync History) - Shows all sync jobs
        - **"Günlükler (Log)"** (Logs) - Shows detailed sync logs
     3. Click "Faturaları Senkronize Et" or "Hesap Hareketlerini Senkronize Et" button
     4. Watch the behavior:
        - Job appears in "Senkronizasyon Geçmişi" table with status "Beklemede" (pending)
        - Status updates automatically every 3 seconds
        - When job starts: Status changes to "Devam Ediyor" (in_progress) with pulsing dot
        - When job completes: Status changes to "Başarılı" (success) or "Başarısız" (failed)
        - Logs appear in "Günlükler" section when sync completes
        - Logs auto-refresh every 5 seconds while jobs are active
        - Click "Detaylar" on any log to see full context (JSON)

6. **Risk Dashboard**: `http://localhost:3000/risk/dashboard`
   - Overall risk metrics
   - Fraud detection alerts

7. **Missing Documents**: `http://localhost:3000/eksik-belgeler`
   - Track document requirements

8. **Reports**: `http://localhost:3000/raporlar/anlik`
   - Generate reports with AI suggestions
   - Audit preparation report

9. **Client Details**: `http://localhost:3000/musteriler/[client-id]`
   - Risk tab shows:
     - Risk explanation panel
     - Risk trend chart

## 🔍 Testing API Endpoints

### Using curl:

```bash
# Get tasks
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3800/api/v1/tasks

# Get risk explanation
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3800/api/v1/risk/documents/DOCUMENT_ID/explanation

# Get integration providers
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3800/api/v1/integrations/providers

# Generate report with suggestions
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"report_code":"COMPANY_FINANCIAL_SUMMARY","client_company_id":"CLIENT_ID","filters":{"start_date":"2024-01-01T00:00:00Z","end_date":"2024-12-31T23:59:59Z"}}' \
  http://localhost:3800/api/v1/reports/generate
```

## 📧 Email System & Templates (NEW - 2025-01-15)

### Email Templates
**Location:** 
- `apps/backend-api/templates/email/*.html`
- `apps/worker-jobs/templates/email/*.html`

**Available Templates:**
1. `notification.html` - System notifications
2. `report.html` - Scheduled reports
3. `risk-alert.html` - Risk alerts with severity colors
4. `client-communication.html` - Client messages
5. `welcome.html` - Welcome emails

**Usage:**
- Templates are automatically used when sending emails
- Can be called programmatically via `emailService.sendTemplatedEmail()`
- Templates support Handlebars syntax for variable substitution

**Configuration:**
```env
EMAIL_TRANSPORT=smtp  # or "stub" for development
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASSWORD=password
SMTP_FROM=noreply@example.com
```

**Default Mode:** Stub (logs only) - configure SMTP to enable real email sending

**Where Emails Are Sent:**
- Risk alerts (when created)
- Scheduled reports (when generated)
- Integration sync failures
- System notifications

## 📝 Notes

- All API routes require authentication (Bearer token)
- All routes are tenant-scoped (automatically filtered by tenant)
- RBAC permissions apply to all routes
- Frontend routes are protected (require login)
- API base URL can be configured via `NEXT_PUBLIC_API_BASE_URL` env variable
- **ReadOnly users** are automatically redirected to `/client/dashboard`
- **Worker must be running** for sync jobs to process (start with `cd apps/worker-jobs && pnpm dev`)

## 🔄 Sync Jobs & Logs Behavior

**📍 Where to See This:** Go to `/entegrasyonlar/[integration-id]` and scroll down to see:
- **"Senkronizasyon Geçmişi"** section (Sync History table)
- **"Günlükler (Log)"** section (Logs table)

### Sync Jobs
- Jobs are created with status `pending` when sync is triggered
- Worker processes jobs and updates status to `in_progress` → `success` or `failed`
- Job status auto-updates every 3 seconds in the UI when jobs are active
- Jobs show visual indicators (pulsing dot for pending/in_progress)
- **Visible in:** "Senkronizasyon Geçmişi" table on integration detail page

### Sync Logs
- **Logs appear when sync procedures are completed**
- Logs are created at three stages:
  1. **Job Start**: Info log when sync begins
  2. **Job Completion**: Info log with results (created/updated/skipped counts)
  3. **Job Failure**: Error log with error details and stack trace
- Logs auto-refresh every 5 seconds when active jobs exist
- Each log entry can be expanded to view full context (JSON format)
- Logs include detailed information about:
  - Number of records created/updated/skipped
  - Error messages and stack traces
  - Push/pull operation results
- **Visible in:** "Günlükler (Log)" section on integration detail page

### How to Test:
1. **⚠️ IMPORTANT: Start the Worker First!**
   ```bash
   # In a separate terminal, navigate to worker-jobs directory
   cd apps/worker-jobs
   pnpm dev
   ```
   The worker must be running for sync jobs to be processed. Without it, jobs will stay in "Beklemede" (Pending) status.

2. Navigate to `/entegrasyonlar`
3. Click on any integration (e.g., "Luca-AC")
4. Click "Faturaları Senkronize Et" button
5. Watch the "Senkronizasyon Geçmişi" table - job appears with "Beklemede" status
6. Status updates automatically every 3 seconds
7. Worker processes jobs every 5 minutes (or immediately on startup)
8. When sync completes, check "Günlükler" section - logs appear with results
9. Click "Detaylar" on any log entry to see full context

### Troubleshooting:
- **Jobs stuck in "Beklemede" (Pending)?** → Make sure the worker is running (`pnpm dev` in `apps/worker-jobs`)
- **No logs appearing?** → Check worker console for errors, ensure database connection is working
- **Worker not processing?** → Check worker logs for connection errors or job processing errors

## 🧪 Quick Test Guide for New Features

### Messaging Frontend UI
1. **Go to**: `http://localhost:3000/mesajlar`
2. **Click**: "+ Yeni Konuşma Başlat"
3. **Select**: A client company
4. **Enter**: Subject (optional)
5. **Click**: "Konuşmayı Başlat"
6. **Send**: Messages in the conversation
7. **Check**: Unread count badge in navigation updates automatically

**Or from Client Page:**
1. Go to `/musteriler` → Click any client
2. Click "💬 Mesaj Gönder" button
3. Client is pre-selected, start conversation

### Email Template Management
1. **Go to**: `http://localhost:3000/ayarlar/email-sablonlari`
2. **Select**: A template (e.g., "Bildirim Şablonu")
3. **Edit**: Template content using Handlebars syntax
4. **Click**: "Önizle" to see preview
5. **Enter**: Test email address
6. **Click**: "Test Gönder" to send test email
7. **Click**: "Kaydet" to save changes

### Error Handling & Retry Queue
1. **Trigger**: Send an email with invalid SMTP settings
2. **Check**: Email fails after immediate retries
3. **Verify**: Email is added to retry queue (check database)
4. **Wait**: Worker processes queue every 5 minutes
5. **Monitor**: Check retry queue status in database

---

## 🧪 Quick Test Guide for Previous Features

### 1. Client Portal
```bash
# 1. Create or use existing ReadOnly user
# 2. Login as ReadOnly user
# 3. Should automatically redirect to: http://localhost:3000/client/dashboard
# 4. Test document upload: http://localhost:3000/client/upload
# 5. View documents: http://localhost:3000/client/documents
# 6. View invoices: http://localhost:3000/client/invoices
# 7. View transactions: http://localhost:3000/client/transactions
```

### 2. Messaging Frontend UI
```bash
# 1. Go to: http://localhost:3000/mesajlar
# 2. Click: "+ Yeni Konuşma Başlat"
# 3. Select: A client company
# 4. Enter: Subject (optional)
# 5. Click: "Konuşmayı Başlat"
# 6. Send: Messages in the conversation
# 7. Check: Unread count badge in navigation updates automatically

# Or from Client Page:
# 1. Go to /musteriler → Click any client
# 2. Click "💬 Mesaj Gönder" button
# 3. Client is pre-selected, start conversation
```

### 3. Email Template Management
```bash
# 1. Go to: http://localhost:3000/ayarlar/email-sablonlari
# 2. Select: A template (e.g., "Bildirim Şablonu")
# 3. Edit: Template content using Handlebars syntax
# 4. Click: "Önizle" to see preview
# 5. Enter: Test email address
# 6. Click: "Test Gönder" to send test email
# 7. Click: "Kaydet" to save changes
```

### 4. Error Handling & Retry Queue
```bash
# 1. Trigger: Send an email with invalid SMTP settings
# 2. Check: Email fails after immediate retries
# 3. Verify: Email is added to retry queue (check database)
# 4. Wait: Worker processes queue every 5 minutes
# 5. Monitor: Check retry queue status in database

# Database query to check retry queue:
# SELECT status, COUNT(*) FROM retry_queue GROUP BY status;
```

### 5. Push Sync
```bash
# 1. Go to: http://localhost:3000/entegrasyonlar
# 2. Click on an integration
# 3. Edit integration settings
# 4. In config JSON, add:
#    {
#      "pushSyncEnabled": true,
#      "pushSyncFrequency": "daily"
#    }
# 5. Save integration
# 6. Wait for worker scheduler (runs every 10 minutes)
# 7. Check sync jobs tab for push_invoices or push_bank_transactions jobs
```

### 6. Contract Parser
```bash
# 1. Upload a PDF document containing "Sözleşme" or "Contract" in the text
# 2. Go to: http://localhost:3000/belgeler/[document-id]
# 3. Scroll to "Parsed Data" section
# 4. Check documentType - should be "contract"
# 5. View extracted fields:
#    - contractNumber
#    - contractDate, startDate, endDate
#    - value, currency
#    - parties (array with names, roles, tax numbers)
#    - contractType, terms, renewalTerms
```

---

## 🔄 Error Handling & Retry Queue ✅

**Status:** Fully Implemented

**What It Does:**
- Automatically retries failed operations (emails, jobs, syncs)
- Exponential backoff (1 min → 2 min → 4 min, max 1 hour)
- Max 3 retry attempts per item
- Tracks status: pending, processing, failed, success

**How It Works:**
1. When an email fails after all immediate retries, it's added to the retry queue
2. Worker processes retry queue every 5 minutes
3. Failed items are retried with exponential backoff
4. After max attempts, items are marked as "failed"

**Database Model:**
- `RetryQueue` table stores all retry items
- Fields: `type` (email/job/sync), `payload`, `attempts`, `maxAttempts`, `nextRetryAt`, `status`, `error`

**Currently Supported:**
- ✅ Email retry (automatic)
- ⏳ Job retry (planned)
- ⏳ Sync retry (planned)

**Monitoring:**
- Check retry queue status via database:
  ```sql
  SELECT status, COUNT(*) FROM retry_queue GROUP BY status;
  ```
- Failed items can be manually reviewed and retried if needed

**Note:** Requires database migration to add `RetryQueue` model:
```bash
cd apps/backend-api
pnpm db:migrate
```
