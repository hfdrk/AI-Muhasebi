# Remaining Issues Implementation Plan

**Date:** January 2025  
**Status:** Ready for Implementation  
**Priority:** P0-P1 (Critical to High)

---

## Overview

This document outlines the implementation plan for remaining issues identified in the comprehensive audit. These issues do not block production deployment but should be addressed for full functionality.

---

## Issue 1: ETA Connector Stub Methods ⚠️

**Priority:** P1 - High  
**Effort:** 2-3 days  
**Status:** Partially Implemented

### Current State

**File:** `apps/backend-api/src/integrations/connectors/eta-connector.ts`

- ✅ Class structure exists
- ✅ Interface implementation complete
- ✅ `testConnection()` - Basic validation exists
- ⚠️ `fetchInvoices()` - Stub implementation (line 139)
- ⚠️ `pushInvoices()` - Stub implementation (line 172)

### Implementation Steps

#### Step 1: Obtain GIB API Documentation (1 day)

1. **Contact GIB (Gelir İdaresi Başkanlığı)**
   - Email: destek@efatura.gov.tr
   - Request E-Fatura API documentation
   - Request developer/sandbox access
   - Request API credentials

2. **Review Documentation**
   - Base URL: `https://earsivportal.efatura.gov.tr` (verify)
   - Authentication method (OAuth2, certificate-based, etc.)
   - Endpoint specifications
   - Request/response formats
   - Error codes

3. **Set Up Test Environment**
   - Create GIB developer account
   - Obtain sandbox credentials
   - Test API access manually (Postman/curl)

#### Step 2: Implement `fetchInvoices()` (1 day)

```typescript
async fetchInvoices(
  sinceDate: Date,
  untilDate: Date,
  options?: FetchInvoicesOptions
): Promise<NormalizedInvoice[]> {
  // 1. Authenticate with GIB API
  const token = await this.authenticate();
  
  // 2. Fetch invoices from GIB
  const response = await fetch(
    `${this.baseUrl}/api/v1/invoices?startDate=${sinceDate.toISOString()}&endDate=${untilDate.toISOString()}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`GIB API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // 3. Map GIB invoice format to NormalizedInvoice
  return data.invoices.map((invoice: any) => this.mapGIBInvoiceToNormalized(invoice));
}
```

#### Step 3: Implement `pushInvoices()` (1 day)

```typescript
async pushInvoices(
  invoices: PushInvoiceInput[],
  config: Record<string, unknown>
): Promise<PushInvoiceResult[]> {
  // 1. Authenticate with GIB API
  const token = await this.authenticate();
  
  // 2. Convert invoices to GIB format
  const gibInvoices = invoices.map(invoice => this.mapNormalizedInvoiceToGIB(invoice));
  
  // 3. Submit invoices to GIB
  const results: PushInvoiceResult[] = [];
  
  for (const gibInvoice of gibInvoices) {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/invoices`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(gibInvoice),
      });
      
      if (response.ok) {
        const data = await response.json();
        results.push({
          success: true,
          externalId: data.invoiceId,
          message: 'Fatura başarıyla gönderildi.',
        });
      } else {
        const error = await response.json();
        results.push({
          success: false,
          externalId: null,
          message: `GIB API hatası: ${error.message}`,
        });
      }
    } catch (error) {
      results.push({
        success: false,
        externalId: null,
        message: `Ağ hatası: ${error.message}`,
      });
    }
  }
  
  return results;
}
```

#### Step 4: Implement Authentication (0.5 day)

```typescript
private async authenticate(): Promise<string> {
  // Check if token is cached and valid
  if (this.cachedToken && this.tokenExpiresAt > Date.now()) {
    return this.cachedToken;
  }
  
  // Authenticate with GIB API
  const response = await fetch(`${this.baseUrl}/api/v1/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: this.config.username,
      password: this.config.password,
      // Add other required fields based on GIB API
    }),
  });
  
  if (!response.ok) {
    throw new Error('GIB authentication failed');
  }
  
  const data = await response.json();
  this.cachedToken = data.accessToken;
  this.tokenExpiresAt = Date.now() + (data.expiresIn * 1000);
  
  return this.cachedToken;
}
```

#### Step 5: Data Mapping (0.5 day)

```typescript
private mapGIBInvoiceToNormalized(gibInvoice: any): NormalizedInvoice {
  return {
    externalId: gibInvoice.invoiceNumber || gibInvoice.id,
    clientCompanyName: gibInvoice.customerName,
    clientCompanyTaxNumber: gibInvoice.customerTaxNumber,
    issueDate: new Date(gibInvoice.issueDate),
    dueDate: gibInvoice.dueDate ? new Date(gibInvoice.dueDate) : null,
    totalAmount: parseFloat(gibInvoice.totalAmount || 0),
    currency: gibInvoice.currency || 'TRY',
    taxAmount: parseFloat(gibInvoice.taxAmount || 0),
    netAmount: parseFloat(gibInvoice.netAmount || gibInvoice.totalAmount - gibInvoice.taxAmount),
    counterpartyName: gibInvoice.supplierName || gibInvoice.customerName,
    counterpartyTaxNumber: gibInvoice.supplierTaxNumber || gibInvoice.customerTaxNumber,
    status: this.mapGIBStatus(gibInvoice.status),
    type: gibInvoice.type === 'SALES' ? 'SATIŞ' : 'ALIŞ',
    lines: (gibInvoice.lines || []).map((line: any, index: number) => ({
      lineNumber: index + 1,
      description: line.description || line.name,
      quantity: parseFloat(line.quantity || 1),
      unitPrice: parseFloat(line.unitPrice || 0),
      lineTotal: parseFloat(line.lineTotal || line.quantity * line.unitPrice),
      vatRate: parseFloat(line.vatRate || 0.18),
      vatAmount: parseFloat(line.vatAmount || 0),
    })),
  };
}

private mapNormalizedInvoiceToGIB(invoice: PushInvoiceInput): any {
  return {
    invoiceNumber: invoice.externalId,
    customerName: invoice.clientCompanyName,
    customerTaxNumber: invoice.clientCompanyTaxNumber,
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate?.toISOString(),
    totalAmount: invoice.totalAmount.toString(),
    currency: invoice.currency,
    taxAmount: invoice.taxAmount.toString(),
    lines: invoice.lines.map((line) => ({
      description: line.description,
      quantity: line.quantity.toString(),
      unitPrice: line.unitPrice.toString(),
      vatRate: line.vatRate.toString(),
    })),
  };
}
```

#### Step 6: Testing (0.5 day)

1. **Unit Tests**
   - Test authentication
   - Test data mapping
   - Test error handling

2. **Integration Tests**
   - Test with GIB sandbox
   - Test invoice fetch
   - Test invoice push

3. **Manual Testing**
   - Test with real GIB account (if available)
   - Verify data accuracy

### Success Criteria

- ✅ `fetchInvoices()` works with GIB API
- ✅ `pushInvoices()` works with GIB API
- ✅ Authentication works correctly
- ✅ Data mapping is accurate
- ✅ Error handling is robust
- ✅ Tests pass

---

## Issue 2: External Integration Connectors (Stubs) ⚠️

**Priority:** P0 - Critical (but blocked by external dependencies)  
**Effort:** 5-7 days per connector  
**Status:** Stub implementations exist

### Current State

All connectors have:
- ✅ Class structure
- ✅ Interface implementation
- ✅ Config validation
- ❌ Actual API calls are stubs

### Implementation Plan

**Note:** Detailed implementation plan exists in `REMAINING_TASKS_IMPLEMENTATION_PLAN.md`

#### 2.1 Mikro Accounting Integration

**File:** `apps/backend-api/src/integrations/connectors/mikro-accounting-connector.ts`

**Steps:**
1. Obtain Mikro API documentation
2. Set up developer account
3. Implement authentication (OAuth2 or API key)
4. Implement `fetchInvoices()`
5. Implement `pushInvoices()`
6. Implement data mapping
7. Add error handling and retry logic
8. Testing

**Timeline:** 5-7 days

#### 2.2 Logo Accounting Integration

**File:** `apps/backend-api/src/integrations/connectors/logo-accounting-connector.ts`

**Steps:** Similar to Mikro
**Timeline:** 5-7 days

#### 2.3 Bank Integrations

**Files:**
- `apps/backend-api/src/integrations/connectors/is-bankasi-connector.ts`
- `apps/backend-api/src/integrations/connectors/garanti-connector.ts`

**Steps:**
1. Obtain bank API documentation
2. Legal/compliance approval
3. Set up developer account
4. Implement authentication (certificate-based or OAuth2)
5. Implement transaction fetch
6. Implement account balance fetch
7. Add error handling
8. Testing

**Timeline:** 3-5 days per bank

**Note:** Bank integrations may require legal review and compliance approval.

---

## Issue 3: Testing Coverage ⚠️

**Priority:** P1 - High  
**Effort:** 5-7 days  
**Status:** Not verified

### Current State

- ⚠️ Unit tests: Not verified
- ⚠️ Integration tests: Not verified
- ⚠️ E2E tests: Not verified

### Implementation Plan

#### Step 1: Unit Tests (2-3 days)

**Priority Services to Test:**
1. `e-fatura-service.ts`
2. `e-arsiv-service.ts`
3. `e-defter-service.ts`
4. `ml-fraud-detector-service.ts`
5. `vat-optimization-service.ts`
6. `tax-compliance-service.ts`
7. `kvkk-compliance-service.ts`
8. `security-service.ts`

**Test Framework:** Jest

**Example:**
```typescript
describe('EFaturaService', () => {
  describe('submitInvoice', () => {
    it('should submit invoice successfully', async () => {
      // Test implementation
    });
    
    it('should throw error if invoice not found', async () => {
      // Test implementation
    });
  });
});
```

#### Step 2: Integration Tests (2-3 days)

**Priority Routes to Test:**
1. `/api/v1/e-fatura/*`
2. `/api/v1/e-arsiv/*`
3. `/api/v1/tax/*`
4. `/api/v1/kvkk/*`
5. `/api/v1/security/*`

**Test Framework:** Supertest

**Example:**
```typescript
describe('E-Fatura Routes', () => {
  it('POST /api/v1/e-fatura/submit should submit invoice', async () => {
    const response = await request(app)
      .post('/api/v1/e-fatura/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ invoiceId: 'test-id' });
    
    expect(response.status).toBe(200);
    expect(response.body.data.success).toBe(true);
  });
});
```

#### Step 3: E2E Tests (1-2 days)

**Priority Flows to Test:**
1. E-Fatura submission flow
2. Tax compliance check flow
3. KVKK consent management flow
4. 2FA setup flow

**Test Framework:** Playwright or Cypress

**Example:**
```typescript
test('E-Fatura submission flow', async ({ page }) => {
  await page.goto('/e-fatura');
  await page.click('button[data-testid="submit-invoice"]');
  await page.waitForSelector('[data-testid="success-message"]');
  expect(await page.textContent('[data-testid="success-message"]')).toContain('başarıyla');
});
```

### Success Criteria

- ✅ Unit test coverage > 80% for critical services
- ✅ Integration tests for all API routes
- ✅ E2E tests for critical user flows
- ✅ All tests pass in CI/CD

---

## Issue 4: Documentation ⚠️

**Priority:** P1 - High  
**Effort:** 2-3 days  
**Status:** Missing

### Implementation Plan

#### Step 1: API Documentation (1 day)

**Tool:** Swagger/OpenAPI

**Content:**
- All new API endpoints
- Request/response schemas
- Authentication requirements
- Error codes
- Examples

#### Step 2: User Guides (1 day)

**Content:**
- E-Fatura user guide
- E-Arşiv user guide
- Tax compliance guide
- KVKK compliance guide
- Security features guide

#### Step 3: Developer Documentation (0.5 day)

**Content:**
- Architecture overview
- Service descriptions
- Integration guide
- Deployment guide

#### Step 4: Deployment Guide (0.5 day)

**Content:**
- Environment variables
- Database setup
- Redis setup
- Production deployment steps
- Monitoring setup

---

## Implementation Priority

### Immediate (Before Production)

1. **Testing Coverage** (P1) - 5-7 days
2. **Documentation** (P1) - 2-3 days

### Short-term (1-2 months)

1. **ETA Connector** (P1) - 2-3 days (requires GIB API docs)
2. **Mikro Integration** (P0) - 5-7 days (requires API docs)
3. **Logo Integration** (P0) - 5-7 days (requires API docs)

### Long-term (3+ months)

1. **Bank Integrations** (P1) - 3-5 days per bank (requires API docs + legal approval)

---

## Dependencies & Risks

### Dependencies

1. **External API Documentation**
   - GIB API documentation (for ETA connector)
   - Mikro API documentation
   - Logo API documentation
   - Bank API documentation

2. **Developer Accounts**
   - GIB developer account
   - Mikro developer account
   - Logo developer account
   - Bank developer accounts

3. **Legal/Compliance**
   - Bank API access may require legal review
   - Compliance with Turkish banking regulations

### Risks

1. **API Access Delays**
   - Risk: API documentation may take time to obtain
   - Mitigation: Start early, follow up regularly

2. **API Changes**
   - Risk: APIs may change without notice
   - Mitigation: Version API calls, monitor for changes

3. **Testing Coverage**
   - Risk: Insufficient testing may cause production issues
   - Mitigation: Prioritize critical paths, add tests incrementally

---

## Timeline Estimate

### Phase 1: Testing & Documentation (1-2 weeks)
- Testing: 5-7 days
- Documentation: 2-3 days
- **Total:** 7-10 days

### Phase 2: ETA Connector (1 week)
- Research: 1 day
- Implementation: 2-3 days
- Testing: 0.5 day
- **Total:** 3-4 days (plus waiting for API docs)

### Phase 3: External Integrations (3-4 weeks)
- Mikro: 5-7 days
- Logo: 5-7 days
- Banks: 6-10 days
- **Total:** 16-24 days (plus waiting for API docs)

### Overall Timeline
- **Minimum:** 26 days (if all APIs are well-documented)
- **Realistic:** 30-40 days (with research and testing)
- **Maximum:** 60+ days (if API access requires approval)

---

## Next Steps

1. **Immediate Actions:**
   - [ ] Add unit tests for critical services
   - [ ] Add integration tests for API routes
   - [ ] Create API documentation
   - [ ] Create user guides

2. **Short-term Actions:**
   - [ ] Contact GIB for ETA API documentation
   - [ ] Contact Mikro for API documentation
   - [ ] Contact Logo for API documentation
   - [ ] Implement ETA connector when docs available

3. **Long-term Actions:**
   - [ ] Contact banks for API access
   - [ ] Implement bank connectors when approved
   - [ ] Add E2E tests
   - [ ] Performance testing

---

**Document Status:** Ready for Implementation  
**Last Review:** January 2025

