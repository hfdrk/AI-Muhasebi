# Implementation Plan - Missing Features

**Date:** 2025-01-16  
**Purpose:** Plan and track implementation of missing features beyond API keys

---

## 🎯 Implementation Phases

### Phase 1: Critical Production Features (Week 1)
**Goal:** Fix critical issues before production deployment

#### Task 1.1: Push Sync Selection Logic ✅
**Priority:** P1 - Critical  
**Effort:** 2-3 days  
**Files to Modify:**
- `apps/worker-jobs/src/processors/integration-sync-processor.ts`
- `apps/backend-api/prisma/schema.prisma` (add `pushedAt` fields)

**Implementation Steps:**
1. Add `pushedAt` timestamp to Invoice and Transaction models
2. Implement invoice status filtering (only push "kesildi" invoices)
3. Implement duplicate tracking (check `pushedAt` before pushing)
4. Calculate transaction amounts from transaction lines
5. Detect currency from transactions
6. Map client company external IDs
7. Add account identifier mapping

**Acceptance Criteria:**
- Only invoices with status "kesildi" are pushed
- No duplicate invoices pushed
- Transaction amounts calculated correctly
- Currency detected automatically
- Client company external IDs mapped

---

#### Task 1.2: Retry Queue - Job and Sync Retry ✅
**Priority:** P2 - Medium (but improves reliability)  
**Effort:** 1-2 days  
**Files to Modify:**
- `apps/backend-api/src/services/retry-queue-service.ts`
- `apps/worker-jobs/src/processors/` (job processors)

**Implementation Steps:**
1. Implement `retryJob()` method
   - Identify job type from payload
   - Call appropriate job processor
   - Handle errors and update retry queue status
2. Implement `retrySync()` method
   - Call integration sync processor
   - Handle sync-specific errors
   - Update retry queue status
3. Add job type detection logic
4. Add error handling and logging

**Acceptance Criteria:**
- Failed jobs are automatically retried
- Failed sync operations are automatically retried
- Retry queue status updated correctly
- Errors logged appropriately

---

### Phase 2: Data Quality & Analytics (Week 2)

#### Task 2.1: Risk Score History Storage ✅
**Priority:** P2 - Medium  
**Effort:** 1 day  
**Files to Modify:**
- `apps/backend-api/src/services/risk-trend-service.ts`
- `apps/worker-jobs/src/processors/risk-calculation-processor.ts`
- `apps/backend-api/prisma/schema.prisma` (verify RiskScoreHistory model exists)

**Implementation Steps:**
1. Create `RiskScoreHistory` records when scores are calculated
2. Store daily snapshots for documents and companies
3. Update risk calculation processor to save history
4. Update trend service to use history table

**Acceptance Criteria:**
- Risk score history stored in dedicated table
- Daily snapshots created automatically
- Trend queries use history table
- Historical data available for analytics

---

#### Task 2.2: Document Parser Improvements
**Priority:** P1 - High (but complex)  
**Effort:** 3-5 days  
**Status:** ⏸️ Defer to Phase 3 (requires LLM integration)

**Note:** This requires LLM API integration (OpenAI/Anthropic). Will implement in Phase 3 after evaluating options.

---

### Phase 3: Advanced Features (Week 3-4)

#### Task 3.1: Complex Transformation Logic
**Priority:** P2 - Medium  
**Effort:** 2-3 days  
**Files to Modify:**
- `apps/backend-api/src/services/integration-mapping-service.ts`

**Implementation Steps:**
1. Add date format transformation functions
2. Add currency conversion support
3. Add field aggregation/calculation
4. Add custom transformation script support
5. Add transformation UI in field mapping modal

**Acceptance Criteria:**
- Date formats converted correctly
- Currency conversion works
- Field calculations supported
- Custom transformations possible

---

#### Task 3.2: LLM-Based Document Parser
**Priority:** P1 - High  
**Effort:** 3-5 days  
**Status:** ⏸️ Requires LLM API setup

**Implementation Steps:**
1. Evaluate LLM providers (OpenAI, Anthropic, local)
2. Set up LLM client integration
3. Create prompt templates for Turkish documents
4. Implement structured output parsing
5. Add fallback to rule-based parser
6. Add cost optimization (batching, caching)

**Acceptance Criteria:**
- LLM-based parsing works for invoices
- Fallback to rule-based parser on failure
- Cost optimized (batching, caching)
- Better accuracy than rule-based

---

## 📋 Implementation Checklist

### Phase 1 (Week 1) ✅ COMPLETE
- [x] Task 1.1: Push Sync Selection Logic ✅
  - [x] Add `pushedAt` fields to schema
  - [x] Implement invoice status filtering
  - [x] Implement duplicate tracking
  - [x] Calculate transaction amounts
  - [x] Detect currency
  - [x] Map client company external IDs
  - [x] Add account identifier mapping
- [x] Task 1.2: Retry Queue - Job/Sync ✅
  - [x] Implement `retryJob()` method
  - [x] Implement `retrySync()` method
  - [x] Add job type detection
  - [x] Add error handling

### Phase 2 (Week 2) ✅ COMPLETE
- [x] Task 2.1: Risk Score History Storage ✅
  - [x] Create history records in risk calculation (already implemented)
  - [x] Store daily snapshots (already implemented)
  - [x] Update trend service (already implemented)
- [ ] Task 2.2: Document Parser (Deferred to Phase 3)

### Phase 3 (Week 3-4) - Future Enhancements
- [ ] Task 3.1: Complex Transformations
- [ ] Task 3.2: LLM-Based Parser

---

## ✅ Phase 1 & 2 Complete!

**Status:** ✅ All critical features implemented

**Next Steps:**
1. Run database migration: `cd apps/backend-api && pnpm db:migrate dev --name add_pushed_at_fields`
2. Test push sync functionality
3. Test retry queue functionality
4. Deploy to production

See `IMPLEMENTATION_COMPLETE_SUMMARY.md` for detailed completion report.

---

**Created:** 2025-01-16  
**Status:** ✅ Phase 1 & 2 Complete
