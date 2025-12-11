# Gap Analysis Implementation Plan

**Date:** 2025-01-15  
**Purpose:** Detailed implementation plan to align codebase 100% with GAP_ANALYSIS.md requirements

---

## Overview

This document provides a detailed implementation plan for all missing features identified in `GAP_ANALYSIS.md`. The plan is organized by priority and includes specific tasks, files to modify, and implementation details.

---

## 🔴 Critical Priority (Must Have for Production)

### 1. Real Email Provider Integration

**Status:** Stub implementation exists  
**Priority:** Critical - Required for production  
**Files to Modify:**
- `apps/backend-api/src/services/email-service.ts`
- `apps/worker-jobs/src/services/email-service.ts`
- `packages/config/src/env/index.ts` (add email env vars)

**Implementation Tasks:**

1. **Choose Email Provider**
   - Options: SMTP (nodemailer), SendGrid, AWS SES, Mailgun
   - Recommendation: Start with nodemailer for flexibility

2. **Add Environment Variables**
   ```typescript
   // packages/config/src/env/index.ts
   EMAIL_PROVIDER: 'smtp' | 'sendgrid' | 'ses' | 'mailgun'
   SMTP_HOST?: string
   SMTP_PORT?: number
   SMTP_USER?: string
   SMTP_PASSWORD?: string
   SMTP_FROM_EMAIL?: string
   SENDGRID_API_KEY?: string
   AWS_SES_REGION?: string
   AWS_SES_ACCESS_KEY?: string
   AWS_SES_SECRET_KEY?: string
   ```

3. **Implement Real Email Sending**
   - Replace stub `sendEmail()` method with actual provider integration
   - Add error handling and retries
   - Add email delivery tracking (optional)
   - Add bounce handling (optional)

4. **Update Both Email Services**
   - Backend API email service
   - Worker jobs email service (with attachments support)

5. **Add Tests**
   - Unit tests for email service
   - Integration tests with test email provider

**Estimated Effort:** 1-2 days

---

## 🟡 Medium Priority (Should Have)

### 2. Email Templates System

**Status:** Not implemented  
**Priority:** Medium  
**Files to Create/Modify:**
- `apps/backend-api/src/services/email-template-service.ts` (new)
- `apps/backend-api/src/services/email-service.ts` (modify)
- `apps/worker-jobs/src/services/email-template-service.ts` (new)
- `apps/worker-jobs/src/services/email-service.ts` (modify)
- Database schema: Add `EmailTemplate` model (optional, can use files initially)

**Implementation Tasks:**

1. **Choose Template Engine**
   - Options: Handlebars, Mustache, EJS
   - Recommendation: Handlebars (popular, flexible)

2. **Create Template Service**
   ```typescript
   class EmailTemplateService {
     async renderTemplate(templateName: string, variables: Record<string, any>): Promise<string>
     async getTemplate(templateName: string): Promise<string>
   }
   ```

3. **Define Template Storage**
   - Option A: File-based (templates in `templates/email/` directory)
   - Option B: Database (EmailTemplate model)
   - Recommendation: Start with files, migrate to DB later if needed

4. **Create Template Files**
   - `templates/email/notification.html` - System notifications
   - `templates/email/report.html` - Scheduled reports
   - `templates/email/risk-alert.html` - Risk alerts
   - `templates/email/client-communication.html` - Client messages
   - `templates/email/welcome.html` - Welcome emails

5. **Update Email Service**
   - Modify `sendEmail()` to accept template name + variables
   - Add `sendTemplatedEmail()` method
   - Keep plain text support for backward compatibility

6. **Update All Email Calls**
   - Replace hardcoded email messages with template calls
   - Update notification service
   - Update scheduled report runner
   - Update risk alert service

7. **Optional: Template Management UI**
   - Admin UI to edit templates
   - Template preview functionality
   - Template versioning

**Estimated Effort:** 2-3 days

---

### 3. Push Sync Automatic Scheduling

**Status:** Infrastructure exists, but no automatic scheduling  
**Priority:** Medium  
**Files to Modify:**
- `apps/worker-jobs/src/schedulers/integration-sync-scheduler.ts`

**Implementation Tasks:**

1. **Extend IntegrationSyncScheduler**
   - Add method `schedulePushSyncs()`
   - Check if integration supports push (check connector interface)
   - Create push jobs based on configuration

2. **Add Push Sync Configuration**
   - Add `pushSyncEnabled` flag to TenantIntegration
   - Add `pushSyncFrequency` (daily, weekly, etc.)
   - Add `lastPushSyncAt` tracking

3. **Implement Push Job Creation Logic**
   ```typescript
   async schedulePushSyncs(): Promise<void> {
     // Find integrations with push enabled
     // Check if push sync is due
     // Create push_invoices or push_bank_transactions jobs
   }
   ```

4. **Update Worker Loop**
   - Add `schedulePushSyncs()` to worker interval loop
   - Run alongside pull sync scheduling

5. **Add Push Sync Configuration UI**
   - Allow users to enable/disable push sync
   - Configure push sync frequency
   - Show push sync status

**Estimated Effort:** 1 day

---

## 🟢 Low Priority (Nice to Have)

### 4. Client Messaging/Communication Feature

**Status:** Not implemented  
**Priority:** Low (P3)  
**Files to Create/Modify:**
- Database schema: Add `Message` and `MessageThread` models
- `apps/backend-api/src/services/messaging-service.ts` (new)
- `apps/backend-api/src/routes/messaging-routes.ts` (new)
- `apps/web-app/src/app/(protected)/mesajlar/page.tsx` (new)
- `apps/web-app/src/components/message-thread.tsx` (new)
- `packages/api-client/src/clients/messaging-client.ts` (new)

**Implementation Tasks:**

1. **Database Schema**
   ```prisma
   model MessageThread {
     id            String   @id @default(cuid())
     tenantId      String
     clientCompanyId String
     participants  User[]   @relation("ThreadParticipants")
     messages      Message[]
     createdAt     DateTime @default(now())
     updatedAt     DateTime @updatedAt
   }

   model Message {
     id          String   @id @default(cuid())
     threadId    String
     thread      MessageThread @relation(fields: [threadId], references: [id])
     senderId    String
     sender      User     @relation(fields: [senderId], references: [id])
     content     String
     readAt      DateTime?
     createdAt   DateTime @default(now())
   }
   ```

2. **Backend Service**
   - Create messaging service with CRUD operations
   - Add message thread creation
   - Add message sending
   - Add read receipts
   - Add notification preferences

3. **API Routes**
   - `GET /api/messaging/threads` - List threads
   - `GET /api/messaging/threads/:id` - Get thread with messages
   - `POST /api/messaging/threads` - Create thread
   - `POST /api/messaging/threads/:id/messages` - Send message
   - `PUT /api/messaging/messages/:id/read` - Mark as read

4. **Frontend Components**
   - Message thread list page
   - Message thread detail view
   - Message composer
   - Real-time updates (optional, can use polling initially)

5. **Integration**
   - Add messaging link to client detail page
   - Add unread message count to navigation
   - Add notifications for new messages

**Estimated Effort:** 3-5 days

---

### 5. Dedicated Client Portal

**Status:** Partial - ReadOnly role exists but no dedicated portal  
**Priority:** Low (P3)  
**Files to Create/Modify:**
- `apps/web-app/src/app/(client)/layout.tsx` (new client layout)
- `apps/web-app/src/app/(client)/dashboard/page.tsx` (new)
- `apps/web-app/src/app/(client)/documents/page.tsx` (new)
- `apps/web-app/src/app/(client)/documents/upload/page.tsx` (new)
- `apps/web-app/src/components/client-portal/*` (new components)

**Implementation Tasks:**

1. **Create Client Portal Layout**
   - Separate layout for client users
   - Client-specific navigation
   - Client branding options

2. **Client Dashboard**
   - Client-specific metrics
   - Recent documents
   - Pending tasks (if applicable)
   - Risk score overview (read-only)

3. **Client Document Upload**
   - Dedicated upload page for clients
   - Document type selection
   - Upload progress
   - Upload history

4. **Client Self-Service Features**
   - View invoices
   - View bank transactions
   - Download reports (if shared)
   - View risk alerts (read-only)

5. **RBAC Updates**
   - Ensure ReadOnly users can access client portal
   - Restrict access to accountant-only features
   - Add client-specific permissions

6. **Optional Features**
   - Client preferences/settings
   - Client notification preferences
   - Client document request feature

**Estimated Effort:** 5-7 days

---

### 6. Contract Parser

**Status:** Not implemented  
**Priority:** Low - Enhancement  
**Files to Modify:**
- `apps/worker-jobs/src/services/document-parser-service.ts`
- Database schema: Add contract fields to `DocumentParsedData`

**Implementation Tasks:**

1. **Add Contract Document Type**
   - Add "contract" to `DocumentParsedType` enum
   - Add contract detection logic

2. **Define Contract Fields**
   ```typescript
   interface ParsedContractFields {
     contractNumber?: string
     contractDate?: Date
     parties?: Array<{ name: string; role: string }>
     startDate?: Date
     endDate?: Date
     value?: number
     currency?: string
     terms?: string
     renewalTerms?: string
   }
   ```

3. **Implement Contract Parsing**
   - Add `parseContract()` method
   - Extract contract-specific fields
   - Handle different contract formats

4. **Add Contract Analysis**
   - Contract expiration alerts
   - Contract value tracking
   - Contract renewal reminders

5. **Update Document Type Detection**
   - Add contract detection in `detectDocumentType()`
   - Support contract file uploads

**Estimated Effort:** 2-3 days

---

### 7. Real Integration API Implementations

**Status:** Stub implementations with TODOs  
**Priority:** Depends on API documentation availability  
**Files to Modify:**
- `apps/worker-jobs/src/integrations/connectors/mikro-accounting-connector.ts`
- `apps/worker-jobs/src/integrations/connectors/logo-accounting-connector.ts`
- `apps/worker-jobs/src/integrations/connectors/eta-connector.ts`
- `apps/worker-jobs/src/integrations/connectors/is-bankasi-connector.ts`
- `apps/worker-jobs/src/integrations/connectors/garanti-connector.ts`

**Implementation Tasks:**

1. **Obtain API Documentation**
   - Mikro API documentation
   - Logo API documentation
   - ETA API documentation
   - İş Bankası API documentation
   - Garanti API documentation

2. **Implement Authentication**
   - OAuth flows
   - API key authentication
   - Token refresh logic

3. **Implement API Calls**
   - Replace stub `fetchInvoices()` with real API calls
   - Replace stub `fetchBankTransactions()` with real API calls
   - Replace stub `pushInvoices()` with real API calls
   - Replace stub `pushTransactions()` with real API calls

4. **Add Error Handling**
   - Handle API rate limits
   - Handle authentication errors
   - Handle network errors
   - Add retry logic

5. **Add Data Mapping**
   - Map provider data format to internal format
   - Handle field mapping (already exists in UI)
   - Handle data transformations

6. **Testing**
   - Integration tests with sandbox/test environments
   - Error scenario testing
   - Rate limit testing

**Estimated Effort:** 5-10 days per connector (depends on API complexity)

**Note:** This is expected and acceptable. Implementation can proceed once API documentation is available.

---

## Implementation Order

### Phase 1: Critical (Before Production)
1. ✅ Real Email Provider Integration

### Phase 2: Medium Priority (Short-term)
2. ✅ Email Templates System
3. ✅ Push Sync Automatic Scheduling

### Phase 3: Low Priority (Long-term)
4. ✅ Client Messaging/Communication Feature
5. ✅ Dedicated Client Portal
6. ✅ Contract Parser

### Phase 4: External Dependencies
7. ✅ Real Integration API Implementations (when API docs available)

---

## Summary

| Feature | Priority | Status | Estimated Effort |
|---------|----------|--------|-----------------|
| Real Email Provider Integration | Critical | Stub | 1-2 days |
| Email Templates System | Medium | Missing | 2-3 days |
| Push Sync Scheduling | Medium | Partial | 1 day |
| Client Messaging | Low | Missing | 3-5 days |
| Client Portal | Low | Partial | 5-7 days |
| Contract Parser | Low | Missing | 2-3 days |
| Real Integration APIs | Depends | Stub | 5-10 days each |

**Total Estimated Effort (excluding integration APIs):** 14-21 days

---

## Notes

- Integration API implementations are blocked on external API documentation
- Client Portal and Messaging are marked as low priority but can provide significant value
- Email Templates can be implemented incrementally (start with file-based, migrate to DB later)
- All features should include proper error handling, logging, and tests

---

**Created:** 2025-01-15  
**Last Updated:** 2025-01-15

