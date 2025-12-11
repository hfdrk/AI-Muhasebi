# Testing Guide - URLs and Routes for Implemented Features

**Date:** 2025-01-16  
**Purpose:** Quick reference guide to test the newly implemented features

---

## 🎯 What Was Implemented

1. **Push Sync Selection Logic** - Smart filtering for invoices/transactions
2. **Retry Queue for Jobs/Sync** - Automatic retry functionality
3. **Risk Score History Storage** - Automatic history tracking

---

## 🌐 Frontend URLs (Web App)

Base URL: `http://localhost:3000`

### 1. Push Sync Selection Logic

#### Integration Details Page
**URL:** `http://localhost:3000/entegrasyonlar/[integration-id]`

**What You'll See:**
- **"İşlemler" (Actions) Section** with buttons:
  - **⬇️ Faturaları Çek** (Pull Invoices) - Existing button
  - **⬆️ Faturaları Gönder** (Push Invoices) - **NEW BUTTON** ✅
  - **⬇️ Hesap Hareketlerini Çek** (Pull Bank Transactions) - Existing button
  - **⬆️ Hesap Hareketlerini Gönder** (Push Bank Transactions) - **NEW BUTTON** ✅

**How to Test:**
1. **Go to:** `http://localhost:3000/entegrasyonlar`
2. **Click on any integration** (e.g., Mikro, Logo, ETA)
3. **Scroll to "İşlemler" section**
4. **Click "⬆️ Faturaları Gönder"** button
5. **Watch the sync job:**
   - Go to **"Senkronizasyon Geçmişi"** (Sync History) section
   - Job appears with status "Beklemede" (Pending)
   - Status auto-updates every 3 seconds
   - When complete, check **"Günlükler (Log)"** section for results

**What to Verify:**
- ✅ Only invoices with status "kesildi" are pushed
- ✅ Invoices that were already pushed are NOT pushed again
- ✅ Transaction amounts are calculated correctly
- ✅ Currency is detected from bank accounts

**Check Results:**
- **Sync Logs:** Shows how many invoices/transactions were pushed
- **Database:** Check `invoices.pushed_at` and `transactions.pushed_at` fields

---

### 2. Risk Score History

#### Client Risk View
**URL:** `http://localhost:3000/musteriler/[client-id]` → **Risk tab**

**What You'll See:**
- Risk score explanation panel
- **Risk trend chart** - Shows historical risk scores
- Historical data from `RiskScoreHistory` table

**How to Test:**
1. **Go to:** `http://localhost:3000/musteriler`
2. **Click on any client**
3. **Click "Risk" tab**
4. **View risk trend chart** - Should show historical scores
5. **Process more documents** to generate more history
6. **Refresh page** - Chart should show updated history

#### Document Risk Trend
**URL:** `http://localhost:3000/risk/documents/[document-id]/trend`

**How to Test:**
1. **Go to:** `http://localhost:3000/belgeler`
2. **Click on any document**
3. **View risk trend** (if available in UI)
4. **Or use API** (see below)

---

### 3. Retry Queue

**Note:** Retry queue is automatic and not directly accessible via UI. It works in the background.

**How to Verify:**
- Check database: `SELECT * FROM retry_queue WHERE status = 'pending'`
- Failed operations are automatically retried
- Check worker logs for retry activity

---

## 🔌 Backend API Routes

Base URL: `http://localhost:3800`

### 1. Push Sync - Trigger Push

**Endpoint:** `POST /api/v1/integrations/:id/sync`

**Request Body:**
```json
{
  "jobType": "push_invoices"  // or "push_bank_transactions"
}
```

**Example:**
```bash
# Get auth token first (login via UI or API)
TOKEN="your-jwt-token"

# Trigger push invoices
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jobType": "push_invoices"}' \
  http://localhost:3800/api/v1/integrations/INTEGRATION_ID/sync

# Trigger push bank transactions
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jobType": "push_bank_transactions"}' \
  http://localhost:3800/api/v1/integrations/INTEGRATION_ID/sync
```

**Response:**
```json
{
  "data": {
    "id": "job-id",
    "message": "Sync job created"
  }
}
```

---

### 2. View Sync Jobs

**Endpoint:** `GET /api/v1/integrations/:id/jobs`

**Query Parameters:**
- `status` - Filter by status (pending, in_progress, success, failed)
- `jobType` - Filter by job type (push_invoices, push_bank_transactions, etc.)
- `page` - Page number
- `pageSize` - Items per page

**Example:**
```bash
# Get all push sync jobs
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3800/api/v1/integrations/INTEGRATION_ID/jobs?jobType=push_invoices"

# Get successful push jobs
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3800/api/v1/integrations/INTEGRATION_ID/jobs?jobType=push_invoices&status=success"
```

**Response:**
```json
{
  "data": {
    "data": [
      {
        "id": "job-id",
        "jobType": "push_invoices",
        "status": "success",
        "startedAt": "2025-01-16T10:00:00Z",
        "finishedAt": "2025-01-16T10:01:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 1
    }
  }
}
```

---

### 3. View Sync Logs

**Endpoint:** `GET /api/v1/integrations/:id/logs`

**Query Parameters:**
- `level` - Filter by level (info, warning, error)
- `page` - Page number
- `pageSize` - Items per page

**Example:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3800/api/v1/integrations/INTEGRATION_ID/logs"
```

**Response:**
```json
{
  "data": {
    "data": [
      {
        "id": "log-id",
        "level": "info",
        "message": "Fatura gönderimi tamamlandı: 5 başarılı, 0 başarısız",
        "context": {
          "total": 5,
          "success": 5,
          "failed": 0
        },
        "createdAt": "2025-01-16T10:01:00Z"
      }
    ]
  }
}
```

**What to Look For:**
- Logs show how many invoices/transactions were pushed
- Logs show success/failure counts
- Check `context` field for detailed results

---

### 4. Risk Score Trends

**Endpoint:** `GET /api/v1/risk/documents/:id/trend`  
**Endpoint:** `GET /api/v1/risk/companies/:id/trend`

**Query Parameters:**
- `days` - Number of days (optional, default: 90)

**Example:**
```bash
# Get document risk trend
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3800/api/v1/risk/documents/DOCUMENT_ID/trend?days=30"

# Get company risk trend
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3800/api/v1/risk/companies/COMPANY_ID/trend?days=90"
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

---

## 🧪 Step-by-Step Testing Scenarios

### Scenario 1: Test Push Sync - Invoice Status Filtering

**Step 1: Create Test Data**
```sql
-- Create invoice with status "kesildi" (should be pushed)
INSERT INTO invoices (tenant_id, client_company_id, external_id, status, issue_date, total_amount, tax_amount, currency)
VALUES ('tenant-id', 'client-id', 'INV-KESILDI-001', 'kesildi', NOW(), 1000, 180, 'TRY');

-- Create invoice with status "taslak" (should NOT be pushed)
INSERT INTO invoices (tenant_id, client_company_id, external_id, status, issue_date, total_amount, tax_amount, currency)
VALUES ('tenant-id', 'client-id', 'INV-TASLAK-001', 'taslak', NOW(), 2000, 360, 'TRY');
```

**Step 2: Trigger Push Sync**
- **Frontend:** Go to `/entegrasyonlar/[id]` → Click "⬆️ Faturaları Gönder"
- **API:** `POST /api/v1/integrations/:id/sync` with `{"jobType": "push_invoices"}`

**Step 3: Verify Results**
```sql
-- Check which invoices were pushed
SELECT external_id, status, pushed_at 
FROM invoices 
WHERE external_id IN ('INV-KESILDI-001', 'INV-TASLAK-001');

-- Expected:
-- INV-KESILDI-001: pushed_at should be set ✅
-- INV-TASLAK-001: pushed_at should be NULL ✅
```

**Step 4: Check Sync Logs**
- **Frontend:** Integration detail page → "Günlükler (Log)" section
- **API:** `GET /api/v1/integrations/:id/logs`
- Should show: "Fatura gönderimi tamamlandı: 1 başarılı, 0 başarısız"

---

### Scenario 2: Test Push Sync - Duplicate Tracking

**Step 1: Push Invoices First Time**
- Trigger push sync (as in Scenario 1)
- Verify `pushed_at` is set

**Step 2: Try Pushing Again**
- Trigger push sync again
- Check sync logs - should show "Gönderilecek fatura bulunamadı" or 0 invoices

**Step 3: Verify No Duplicates**
- Same invoices should NOT be pushed again
- Check `pushed_at` timestamps - should remain unchanged

---

### Scenario 3: Test Transaction Amount Calculation

**Step 1: Create Transaction with Lines**
```sql
-- Create transaction
INSERT INTO transactions (tenant_id, client_company_id, date, description)
VALUES ('tenant-id', 'client-id', NOW(), 'Test Transaction')
RETURNING id;

-- Add transaction lines (debit: 1000, credit: 500)
INSERT INTO transaction_lines (tenant_id, transaction_id, ledger_account_id, debit_amount, credit_amount)
VALUES 
  ('tenant-id', 'transaction-id', 'account-id', 1000, 0),
  ('tenant-id', 'transaction-id', 'account-id', 0, 500);
```

**Step 2: Trigger Push Sync**
- **Frontend:** Click "⬆️ Hesap Hareketlerini Gönder"
- **API:** `POST /api/v1/integrations/:id/sync` with `{"jobType": "push_bank_transactions"}`

**Step 3: Verify Amount**
- Check sync logs - should show transaction with amount = 1500 (1000 + 500)
- Or check the push payload in logs `context` field

---

### Scenario 4: Test Risk Score History

**Step 1: Calculate Risk Scores**
- Process documents (risk scores calculated automatically)
- Or view document/company risk pages (triggers calculation)

**Step 2: Check History**
```sql
SELECT * FROM risk_score_history
WHERE tenant_id = 'tenant-id'
ORDER BY recorded_at DESC
LIMIT 10;
```

**Step 3: View Trend**
- **Frontend:** `http://localhost:3000/musteriler/[id]` → Risk tab → Trend chart
- **API:** `GET /api/v1/risk/companies/:id/trend`
- Should show historical scores

---

## 📊 Quick Reference

### Frontend URLs:
| Feature | URL | What to Test |
|---------|-----|--------------|
| **Push Sync** | `/entegrasyonlar/[id]` | Click "⬆️ Faturaları Gönder" or "⬆️ Hesap Hareketlerini Gönder" |
| **Sync Jobs** | `/entegrasyonlar/[id]` → Sync History section | View job status and results |
| **Sync Logs** | `/entegrasyonlar/[id]` → Logs section | View detailed sync results |
| **Risk Trends** | `/musteriler/[id]` → Risk tab | View risk trend chart |
| **Document Risk** | `/belgeler/[id]` | View document risk score |

### API Endpoints:
| Feature | Endpoint | Method | Body |
|---------|----------|--------|------|
| **Trigger Push** | `/api/v1/integrations/:id/sync` | POST | `{"jobType": "push_invoices"}` |
| **View Jobs** | `/api/v1/integrations/:id/jobs` | GET | Query: `?jobType=push_invoices` |
| **View Logs** | `/api/v1/integrations/:id/logs` | GET | - |
| **Risk Trend** | `/api/v1/risk/documents/:id/trend` | GET | Query: `?days=30` |
| **Company Trend** | `/api/v1/risk/companies/:id/trend` | GET | Query: `?days=90` |

---

## ✅ What to Verify

### Push Sync Selection Logic:
- ✅ Only "kesildi" invoices are pushed (not "taslak" or "iptal")
- ✅ Already pushed invoices are NOT pushed again (`pushed_at` check)
- ✅ Transaction amounts calculated correctly (sum of debit + credit)
- ✅ Currency detected from bank accounts (or defaults to TRY)
- ✅ `pushed_at` timestamp is set after successful push

### Retry Queue:
- ✅ Failed jobs are automatically retried
- ✅ Failed sync operations are automatically retried
- ✅ Retry queue processes items every 5 minutes
- ✅ Exponential backoff works (1 min → 2 min → 4 min)

### Risk Score History:
- ✅ History records created automatically when scores are calculated
- ✅ Multiple history records can exist for same entity
- ✅ Trend charts show historical data
- ✅ History is used for trend analysis

---

## 🎯 Quick Test Checklist

### Push Sync:
- [ ] Go to `/entegrasyonlar/[id]`
- [ ] Click "⬆️ Faturaları Gönder" button
- [ ] Check sync jobs table - job appears
- [ ] Check sync logs - shows results
- [ ] Verify only "kesildi" invoices were pushed
- [ ] Check database - `pushed_at` is set
- [ ] Try pushing again - no duplicates

### Risk Score History:
- [ ] Go to `/musteriler/[id]` → Risk tab
- [ ] View risk trend chart
- [ ] Process more documents
- [ ] Check chart updates with new history
- [ ] Or use API: `GET /api/v1/risk/companies/:id/trend`

---

**Created:** 2025-01-16  
**Status:** ✅ Ready for Testing
