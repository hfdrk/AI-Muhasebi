# How to Test the Implemented Features

**Date:** 2025-01-16  
**Purpose:** Guide to test the newly implemented features

---

## 🎯 What Was Implemented

1. **Push Sync Selection Logic** - Smart filtering for invoices/transactions to push
2. **Retry Queue for Jobs/Sync** - Automatic retry for failed operations
3. **Risk Score History Storage** - Automatic history tracking (already working)

---

## 📍 Where to Test - Frontend URLs

### 1. Push Sync Selection Logic

#### Frontend: Integration Details Page
**URL:** `http://localhost:3000/entegrasyonlar/[integration-id]`

**What to Test:**
1. **Go to:** `/entegrasyonlar` - View all integrations
2. **Click on an integration** to see details
3. **Scroll to "Senkronizasyon Geçmişi"** (Sync History) section
4. **Click "Faturaları Senkronize Et"** or **"Hesap Hareketlerini Senkronize Et"** button
5. **Watch the sync job:**
   - Job appears with status "Beklemede" (Pending)
   - Status updates to "Devam Ediyor" (In Progress)
   - Status updates to "Başarılı" (Success) or "Başarısız" (Failed)
   - Check logs in "Günlükler (Log)" section

**What the Implementation Does:**
- ✅ Only pushes invoices with status "kesildi" (not "taslak" or "iptal")
- ✅ Doesn't push invoices that were already pushed (checks `pushedAt`)
- ✅ Calculates transaction amounts from transaction lines
- ✅ Detects currency from bank accounts
- ✅ Updates `pushedAt` timestamp after successful push

**How to Verify:**
1. Create invoices with different statuses:
   - Create invoice with status "kesildi" → Should be pushed
   - Create invoice with status "taslak" → Should NOT be pushed
   - Create invoice with status "iptal" → Should NOT be pushed

2. Check database after push:
   ```sql
   SELECT id, external_id, status, pushed_at 
   FROM invoices 
   WHERE tenant_id = 'your-tenant-id'
   ORDER BY created_at DESC;
   ```
   - Invoices that were successfully pushed should have `pushed_at` set
   - Only "kesildi" invoices should have `pushed_at` set

3. Try pushing again:
   - Same invoices should NOT be pushed again (already have `pushed_at`)

#### API Endpoint: Trigger Push Sync
**URL:** `POST http://localhost:3800/api/v1/integrations/:id/sync`

**Request Body:**
```json
{
  "jobType": "push_invoices"  // or "push_bank_transactions"
}
```

**Example with curl:**
```bash
# Get your auth token first
TOKEN="your-jwt-token"

# Trigger push sync
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jobType": "push_invoices"}' \
  http://localhost:3800/api/v1/integrations/INTEGRATION_ID/sync
```

**Response:**
```json
{
  "data": {
    "jobId": "job-id",
    "status": "pending",
    "jobType": "push_invoices"
  }
}
```

#### API Endpoint: View Sync Jobs
**URL:** `GET http://localhost:3800/api/v1/integrations/:id/jobs`

**Query Parameters:**
- `status` - Filter by status (pending, in_progress, success, failed)
- `jobType` - Filter by job type (push_invoices, push_bank_transactions, etc.)
- `page` - Page number
- `pageSize` - Items per page

**Example:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3800/api/v1/integrations/INTEGRATION_ID/jobs?jobType=push_invoices&status=success"
```

#### API Endpoint: View Sync Logs
**URL:** `GET http://localhost:3800/api/v1/integrations/:id/logs`

**Example:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3800/api/v1/integrations/INTEGRATION_ID/logs"
```

**What to Look For:**
- Logs show how many invoices/transactions were pushed
- Logs show which ones succeeded/failed
- Check logs for messages like: "Fatura gönderimi tamamlandı: X başarılı, Y başarısız"

---

### 2. Retry Queue for Jobs/Sync

#### How It Works:
The retry queue automatically retries failed operations. It's not directly accessible via UI, but you can verify it works:

**Test Scenario 1: Failed Job Retry**
1. Create a document processing job that will fail (e.g., invalid document)
2. The job will fail and be added to retry queue automatically
3. Worker processes retry queue every 5 minutes
4. Check retry queue status via database:

```sql
SELECT type, status, attempts, max_attempts, next_retry_at, error
FROM retry_queue
WHERE status IN ('pending', 'processing', 'failed')
ORDER BY created_at DESC;
```

**Test Scenario 2: Failed Sync Retry**
1. Trigger a sync that will fail (e.g., invalid integration config)
2. Sync fails and is added to retry queue
3. Worker retries automatically
4. Check retry queue in database

**API Endpoint: Check Retry Queue Stats** (if you add this endpoint)
Currently, retry queue is internal. You can check it via database:

```sql
-- Get retry queue statistics
SELECT 
  type,
  status,
  COUNT(*) as count
FROM retry_queue
GROUP BY type, status;
```

**Manual Test via Code:**
```typescript
// In Node.js REPL or script
const { retryQueueService } = require('./apps/backend-api/src/services/retry-queue-service');

// Enqueue a job
const itemId = await retryQueueService.enqueue("job", {
  jobType: "DOCUMENT_PROCESSING",
  tenantId: "tenant-id",
  documentId: "doc-id",
});

// Get stats
const stats = await retryQueueService.getStats();
console.log(stats);
// { pending: 1, processing: 0, failed: 0, success: 0 }

// Process pending items (normally done by worker)
await retryQueueService.processPendingItems();
```

---

### 3. Risk Score History Storage

#### Frontend: Risk Trend Charts
**URL:** `http://localhost:3000/risk/documents/[id]/trend`  
**URL:** `http://localhost:3000/musteriler/[id]` → Risk tab → Trend chart

**What to Test:**
1. **Calculate risk scores** for documents or companies
2. **View risk trend charts** - Should show historical data
3. **Check that history is stored** - Multiple risk score calculations should create history records

#### API Endpoint: Get Risk Trend
**URL:** `GET http://localhost:3800/api/v1/risk/documents/:id/trend`  
**URL:** `GET http://localhost:3800/api/v1/risk/companies/:id/trend`

**Query Parameters:**
- `period` - Time period (optional, e.g., "30d", "90d", "1y")

**Example:**
```bash
# Get document risk trend
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3800/api/v1/risk/documents/DOCUMENT_ID/trend?period=30d"

# Get company risk trend
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3800/api/v1/risk/companies/COMPANY_ID/trend?period=90d"
```

**Response:**
```json
{
  "data": {
    "history": [
      {
        "date": "2025-01-15T00:00:00Z",
        "score": 50,
        "severity": "low"
      },
      {
        "date": "2025-01-16T00:00:00Z",
        "score": 75,
        "severity": "high"
      }
    ],
    "currentScore": 75,
    "previousScore": 50,
    "trend": "increasing",
    "averageScore": 62.5,
    "minScore": 50,
    "maxScore": 75
  }
}
```

**Verify History Storage:**
```sql
-- Check risk score history
SELECT 
  entity_type,
  entity_id,
  score,
  severity,
  recorded_at
FROM risk_score_history
WHERE tenant_id = 'your-tenant-id'
ORDER BY recorded_at DESC
LIMIT 20;
```

**How to Generate History:**
1. Calculate risk scores multiple times (they're calculated automatically when documents are processed)
2. Each calculation creates a history record
3. View trends to see the history

---

## 🧪 Step-by-Step Testing Guide

### Test 1: Push Sync - Invoice Status Filtering

**Step 1: Create Test Invoices**
```sql
-- Create invoice with status "kesildi" (should be pushed)
INSERT INTO invoices (tenant_id, client_company_id, external_id, status, issue_date, total_amount, tax_amount, currency)
VALUES ('tenant-id', 'client-id', 'INV-KESILDI-001', 'kesildi', NOW(), 1000, 180, 'TRY');

-- Create invoice with status "taslak" (should NOT be pushed)
INSERT INTO invoices (tenant_id, client_company_id, external_id, status, issue_date, total_amount, tax_amount, currency)
VALUES ('tenant-id', 'client-id', 'INV-TASLAK-001', 'taslak', NOW(), 2000, 360, 'TRY');
```

**Step 2: Trigger Push Sync**
- Go to: `http://localhost:3000/entegrasyonlar/[integration-id]`
- Click "Faturaları Senkronize Et"
- Or use API: `POST /api/v1/integrations/:id/sync` with `{"jobType": "push_invoices"}`

**Step 3: Verify Results**
```sql
-- Check which invoices were pushed
SELECT external_id, status, pushed_at 
FROM invoices 
WHERE tenant_id = 'tenant-id' 
  AND external_id IN ('INV-KESILDI-001', 'INV-TASLAK-001');

-- Expected:
-- INV-KESILDI-001: pushed_at should be set (was pushed)
-- INV-TASLAK-001: pushed_at should be NULL (was NOT pushed)
```

**Step 4: Check Sync Logs**
- Go to integration detail page → "Günlükler (Log)" section
- Or API: `GET /api/v1/integrations/:id/logs`
- Should see log showing how many invoices were pushed

---

### Test 2: Push Sync - Duplicate Tracking

**Step 1: Push Invoices First Time**
- Trigger push sync (as in Test 1)
- Verify invoices have `pushed_at` set

**Step 2: Try Pushing Again**
- Trigger push sync again with same `sinceDate`
- Check sync logs - should show "Gönderilecek fatura bulunamadı" or 0 invoices

**Step 3: Verify No Duplicates**
```sql
-- Check that same invoices weren't pushed twice
-- (This is handled automatically - invoices with pushed_at are excluded)
```

---

### Test 3: Push Sync - Transaction Amount Calculation

**Step 1: Create Transaction with Lines**
```sql
-- Create transaction
INSERT INTO transactions (tenant_id, client_company_id, date, description)
VALUES ('tenant-id', 'client-id', NOW(), 'Test Transaction')
RETURNING id;

-- Add transaction lines
INSERT INTO transaction_lines (tenant_id, transaction_id, ledger_account_id, debit_amount, credit_amount)
VALUES 
  ('tenant-id', 'transaction-id', 'account-id', 1000, 0),
  ('tenant-id', 'transaction-id', 'account-id', 0, 500);
```

**Step 2: Trigger Push Sync**
- API: `POST /api/v1/integrations/:id/sync` with `{"jobType": "push_bank_transactions"}`

**Step 3: Verify Amount**
- Check sync logs - should show transaction with amount = 1500 (1000 + 500)
- Or check the push payload in logs

---

### Test 4: Retry Queue

**Step 1: Create a Failing Operation**
- Create a document processing job that will fail
- Or trigger a sync with invalid config

**Step 2: Check Retry Queue**
```sql
SELECT * FROM retry_queue 
WHERE status = 'pending' 
ORDER BY created_at DESC;
```

**Step 3: Wait for Retry**
- Worker processes retry queue every 5 minutes
- Or manually trigger: `await retryQueueService.processPendingItems()`

**Step 4: Verify Retry**
```sql
-- Check retry queue status
SELECT type, status, attempts, max_attempts, error
FROM retry_queue
WHERE status IN ('pending', 'processing', 'success', 'failed')
ORDER BY updated_at DESC;
```

---

### Test 5: Risk Score History

**Step 1: Calculate Risk Scores**
- Process documents (risk scores calculated automatically)
- Or manually: `GET /api/v1/risk/documents/:id` (triggers calculation)

**Step 2: Check History**
```sql
SELECT * FROM risk_score_history
WHERE tenant_id = 'tenant-id'
ORDER BY recorded_at DESC;
```

**Step 3: View Trend**
- Frontend: `http://localhost:3000/risk/documents/[id]/trend`
- Or API: `GET /api/v1/risk/documents/:id/trend`
- Should show historical scores

---

## 📊 Quick Test Checklist

### Push Sync Selection Logic ✅
- [ ] Create invoices with different statuses
- [ ] Trigger push sync
- [ ] Verify only "kesildi" invoices are pushed
- [ ] Check `pushed_at` is set for pushed invoices
- [ ] Try pushing again - verify no duplicates
- [ ] Create transactions with lines
- [ ] Verify transaction amounts are calculated correctly
- [ ] Check currency detection works

### Retry Queue ✅
- [ ] Create a failing job
- [ ] Check retry queue in database
- [ ] Verify retry happens automatically
- [ ] Check retry queue stats

### Risk Score History ✅
- [ ] Calculate risk scores multiple times
- [ ] Check `risk_score_history` table
- [ ] View risk trend charts
- [ ] Verify history is used in trends

---

## 🔗 Quick Links

### Frontend URLs:
- **Integrations List:** `http://localhost:3000/entegrasyonlar`
- **Integration Details:** `http://localhost:3000/entegrasyonlar/[id]`
- **Risk Dashboard:** `http://localhost:3000/risk/dashboard`
- **Risk Trends:** `http://localhost:3000/risk/documents/[id]/trend`
- **Client Risk:** `http://localhost:3000/musteriler/[id]` → Risk tab

### API Endpoints:
- **Trigger Sync:** `POST /api/v1/integrations/:id/sync`
- **View Sync Jobs:** `GET /api/v1/integrations/:id/jobs`
- **View Sync Logs:** `GET /api/v1/integrations/:id/logs`
- **Risk Trend:** `GET /api/v1/risk/documents/:id/trend`
- **Company Risk Trend:** `GET /api/v1/risk/companies/:id/trend`

---

## 🎯 Expected Results

### Push Sync:
- ✅ Only "kesildi" invoices appear in push results
- ✅ `pushed_at` timestamp is set after successful push
- ✅ Same invoices are not pushed twice
- ✅ Transaction amounts are calculated correctly
- ✅ Currency is detected from bank accounts

### Retry Queue:
- ✅ Failed operations are added to retry queue
- ✅ Retry queue processes items automatically
- ✅ Retries happen with exponential backoff
- ✅ Max attempts are respected

### Risk Score History:
- ✅ History records are created automatically
- ✅ Multiple history records can exist
- ✅ Trend charts show historical data
- ✅ History is used for trend analysis

---

**Created:** 2025-01-16  
**Status:** ✅ Ready for Testing


