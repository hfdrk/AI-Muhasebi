# Missing Features Beyond API Keys

**Date:** 2025-01-16  
**Purpose:** Comprehensive list of incomplete implementations, TODOs, and missing logic (excluding API key configuration)

---

## 🔴 Critical Missing Logic (Production Impact)

### 1. Document Parser - LLM-Based Implementation
**Status:** Currently using rule-based stub parser  
**File:** `apps/worker-jobs/src/services/document-parser-service.ts`  
**Priority:** P1 - High

**What's Missing:**
- Currently uses rule-based regex parsing (stub implementation)
- TODO comment indicates should be replaced with LLM-based parsing
- Should use OpenAI GPT-4, Anthropic Claude, or similar
- Need structured output/function calling for field extraction
- Turkish document format support needed

**Current Implementation:**
- Rule-based parsing with regex patterns
- Works for basic cases but limited accuracy
- Parser version: "1.0-stub"

**Impact:**
- Lower accuracy for complex documents
- May miss fields in non-standard formats
- Limited support for edge cases

**Recommendation:**
- Implement LLM-based parsing for better accuracy
- Keep rule-based as fallback
- Consider cost optimization (batch processing, caching)

---

### 2. Push Sync - Invoice/Transaction Selection Logic
**Status:** Basic implementation exists, but selection logic incomplete  
**File:** `apps/worker-jobs/src/processors/integration-sync-processor.ts`  
**Priority:** P1 - High

**What's Missing:**

#### Invoice Push Logic (Lines 409-468):
- ✅ Basic query exists but needs refinement
- ❌ **Missing:** Filter by invoice status (e.g., only "kesildi" invoices)
- ❌ **Missing:** Track which invoices already pushed (no duplicate tracking)
- ❌ **Missing:** Client company external ID mapping (`clientCompanyExternalId: null` - TODO)
- ⚠️ Currently pushes all invoices since `sinceDate` without status filtering

#### Transaction Push Logic (Lines 472-517):
- ✅ Basic query exists
- ❌ **Missing:** Transaction amount calculation (`amount: 0` - TODO)
- ❌ **Missing:** Currency detection (`currency: "TRY"` - hardcoded, TODO)
- ❌ **Missing:** Account identifier mapping (`accountIdentifier` - TODO)
- ❌ **Missing:** Balance calculation (`balanceAfter: null`)

**Impact:**
- May push invoices that shouldn't be pushed (e.g., draft invoices)
- May push duplicate invoices
- Transaction data incomplete (amount, currency, account)
- No tracking of what was already pushed

**Recommendation:**
- Add `pushedAt` timestamp field to Invoice/Transaction models
- Implement status filtering for invoices
- Calculate transaction amounts from transaction lines
- Map client company external IDs
- Add proper currency and account identifier detection

---

### 3. Retry Queue - Job and Sync Retry Logic
**Status:** Email retry works, but job/sync retry not implemented  
**File:** `apps/backend-api/src/services/retry-queue-service.ts`  
**Priority:** P2 - Medium

**What's Missing:**
- ❌ **Job Retry:** `retryJob()` method returns `false` - not implemented (line 189)
- ❌ **Sync Retry:** `retrySync()` method just logs warning - not implemented (line 197)
- ✅ Email retry is fully implemented

**Current State:**
```typescript
private async retryJob(payload: Record<string, unknown>): Promise<boolean> {
  // This would call the appropriate job processor
  // For now, return false to indicate not implemented
  console.warn("[RetryQueue] Job retry not yet implemented");
  return false;
}

private async retrySync(payload: Record<string, unknown>): Promise<boolean> {
  // This would retry integration sync
  console.warn("[RetryQueue] Sync retry not yet implemented");
  return false;
}
```

**Impact:**
- Failed jobs won't be automatically retried
- Failed sync operations won't be automatically retried
- Manual intervention required for failed operations

**Recommendation:**
- Implement job retry by calling appropriate job processors
- Implement sync retry by calling integration sync processor
- Add retry logic similar to email retry

---

## 🟡 Medium Priority Missing Features

### 4. Risk Score History Storage
**Status:** Risk trend service works but doesn't store history  
**File:** `apps/backend-api/src/services/risk-trend-service.ts`  
**Priority:** P2 - Medium

**What's Missing:**
- Risk trend calculation works (reads from existing scores)
- ❌ **Missing:** Storing history in `RiskScoreHistory` table
- TODO comment at line 141 mentions this

**Current State:**
- Reads historical scores from `DocumentRiskScore` and `ClientCompanyRiskScore` tables
- Calculates trends correctly
- But doesn't create `RiskScoreHistory` records

**Impact:**
- Trends work but history not explicitly tracked
- May need to query multiple tables for historical data
- No dedicated history table for analytics

**Recommendation:**
- Create `RiskScoreHistory` records when scores are calculated
- Store daily snapshots for better trend analysis
- Enable more efficient historical queries

---

### 5. Integration Mapping - Complex Transformations
**Status:** Basic transformations work, complex ones missing  
**File:** `apps/backend-api/src/services/integration-mapping-service.ts`  
**Priority:** P2 - Medium

**What's Missing:**
- ✅ Basic field mapping exists
- ❌ **Missing:** Complex transformations (mentioned in TODO at line 158)
- Examples: Date format conversion, currency conversion, field aggregation

**Impact:**
- Limited mapping capabilities
- May need manual data transformation
- Less flexible for complex integration scenarios

**Recommendation:**
- Add transformation functions (date, currency, format)
- Support custom transformation scripts
- Add field aggregation/calculation support

---

## 🟢 Low Priority / Enhancement Opportunities

### 6. OCR Providers - AWS Textract & Tesseract Implementation
**Status:** Stub implementations exist  
**Files:** 
- `apps/worker-jobs/src/services/ocr-providers/aws-textract-ocr.ts`
- `apps/worker-jobs/src/services/ocr-providers/tesseract-ocr.ts`  
**Priority:** P2 - Medium (if Google Vision not available)

**What's Missing:**
- AWS Textract: Stub implementation, needs AWS SDK integration
- Tesseract: Stub implementation, needs Tesseract.js integration
- Both have TODO comments for implementation

**Note:** This is less critical if Google Vision is configured (which is the primary OCR provider)

**Impact:**
- Limited OCR provider options
- No fallback if Google Vision fails

**Recommendation:**
- Implement if Google Vision is not available
- Or implement as fallback options

---

### 7. Real Integration API Implementations
**Status:** Infrastructure complete, real APIs are stubs  
**Files:** All connector files  
**Priority:** P0 (but blocked on external documentation)

**What's Missing:**
- Actual HTTP API calls to external systems
- Real authentication flows (OAuth, API keys)
- Error handling for real API responses
- Rate limiting handling
- Pagination handling

**Note:** This is **NOT just API keys** - it's the actual implementation logic. The infrastructure is ready, but the actual API call logic needs to be implemented once documentation is available.

**Impact:**
- Integrations won't work until real APIs are implemented
- Currently all connectors return stub/mock data

**Recommendation:**
- Wait for API documentation from providers
- Implement following the existing connector pattern
- Add comprehensive error handling and retry logic

---

## 📊 Summary Table

| Feature | Status | Priority | Impact | Effort |
|---------|--------|----------|--------|--------|
| LLM-Based Document Parser | Stub | P1 - High | High | 3-5 days |
| Push Sync Selection Logic | Partial | P1 - High | Medium | 2-3 days |
| Retry Queue (Job/Sync) | Not Implemented | P2 - Medium | Medium | 1-2 days |
| Risk Score History Storage | Not Stored | P2 - Medium | Low | 1 day |
| Complex Transformations | Basic Only | P2 - Medium | Low | 2-3 days |
| OCR Providers (AWS/Tesseract) | Stub | P2 - Medium | Low | 1-2 days each |
| Real Integration APIs | Stub | P0 (blocked) | High | 5-10 days each |

---

## 🎯 Recommended Implementation Order

### Phase 1 (Immediate - Before Production):
1. **Push Sync Selection Logic** (P1)
   - Critical for two-way sync functionality
   - Prevents pushing wrong data
   - 2-3 days effort

### Phase 2 (Short-term - 1-2 weeks):
2. **LLM-Based Document Parser** (P1)
   - Improves accuracy significantly
   - Better user experience
   - 3-5 days effort

3. **Retry Queue - Job/Sync** (P2)
   - Improves reliability
   - Automatic recovery
   - 1-2 days effort

### Phase 3 (Medium-term - 1 month):
4. **Risk Score History Storage** (P2)
   - Better analytics
   - More efficient queries
   - 1 day effort

5. **Complex Transformations** (P2)
   - Better integration flexibility
   - 2-3 days effort

### Phase 4 (When Needed):
6. **OCR Providers** (P2)
   - Only if Google Vision not available
   - 1-2 days per provider

7. **Real Integration APIs** (P0 - blocked)
   - When API documentation available
   - 5-10 days per connector

---

## 🔍 Code Locations

### Document Parser:
- `apps/worker-jobs/src/services/document-parser-service.ts` (lines 12-19, TODO comment)

### Push Sync Logic:
- `apps/worker-jobs/src/processors/integration-sync-processor.ts`
  - `getInvoicesToPush()` - lines 409-468
  - `getTransactionsToPush()` - lines 472-517

### Retry Queue:
- `apps/backend-api/src/services/retry-queue-service.ts`
  - `retryJob()` - line 187-192
  - `retrySync()` - line 197-201

### Risk Score History:
- `apps/backend-api/src/services/risk-trend-service.ts` (line 141, TODO comment)

### Integration Mapping:
- `apps/backend-api/src/services/integration-mapping-service.ts` (line 158, TODO comment)

### OCR Providers:
- `apps/worker-jobs/src/services/ocr-providers/aws-textract-ocr.ts`
- `apps/worker-jobs/src/services/ocr-providers/tesseract-ocr.ts`

### Integration Connectors:
- `apps/backend-api/src/integrations/connectors/mikro-accounting-connector.ts`
- `apps/backend-api/src/integrations/connectors/logo-accounting-connector.ts`
- `apps/backend-api/src/integrations/connectors/eta-connector.ts`
- `apps/backend-api/src/integrations/connectors/is-bankasi-connector.ts`
- `apps/backend-api/src/integrations/connectors/garanti-connector.ts`
- `apps/worker-jobs/src/integrations/connectors/*` (same connectors)

---

## ✅ What's Already Complete (For Reference)

- ✅ Email retry queue (fully implemented)
- ✅ Push sync infrastructure (scheduling, job types)
- ✅ Basic field mapping
- ✅ Risk trend calculation (reads from existing scores)
- ✅ Basic document parsing (rule-based)
- ✅ Integration connector pattern
- ✅ Sync job processing
- ✅ Error handling infrastructure

---

**Created:** 2025-01-16  
**Last Updated:** 2025-01-16
