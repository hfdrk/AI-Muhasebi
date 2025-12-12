# New API Routes Documentation

**Last Updated:** January 2025  
**Status:** All routes implemented and active

---

## Overview

This document lists all new API routes/URLs added during the Turkish Market Enhancement Plan implementation. All routes require authentication and tenant context.

**Base URL:** `/api/v1`

**Authentication:** All routes require `Authorization: Bearer <token>` header  
**Tenant Context:** All routes require valid tenant context

---

## 1. E-Fatura (Electronic Invoice) Routes

**Base Path:** `/api/v1/e-fatura`

### Submit Invoice to E-Fatura System
- **Method:** `POST`
- **URL:** `/api/v1/e-fatura/submit`
- **Permission:** `invoices:manage`
- **Request Body:**
  ```json
  {
    "invoiceId": "string (required)",
    "config": {} // optional
  }
  ```
- **Response:**
  ```json
  {
    "data": {
      "success": true,
      "externalId": "string",
      "status": "string",
      "submittedAt": "ISO date"
    }
  }
  ```

### Check Invoice Status
- **Method:** `GET`
- **URL:** `/api/v1/e-fatura/status/:invoiceId`
- **Permission:** `invoices:read`
- **Response:**
  ```json
  {
    "data": {
      "status": "string",
      "externalId": "string",
      "lastCheckedAt": "ISO date"
    }
  }
  ```

### Retry Failed Submissions
- **Method:** `POST`
- **URL:** `/api/v1/e-fatura/retry-failed`
- **Permission:** `invoices:manage`
- **Response:**
  ```json
  {
    "data": {
      "retryCount": 5,
      "message": "5 fatura tekrar gönderildi."
    }
  }
  ```

---

## 2. E-Arşiv (Electronic Archive) Routes

**Base Path:** `/api/v1/e-arsiv`

### Archive Invoice
- **Method:** `POST`
- **URL:** `/api/v1/e-arsiv/archive`
- **Permission:** `invoices:manage`
- **Request Body:**
  ```json
  {
    "invoiceId": "string (required)"
  }
  ```
- **Response:**
  ```json
  {
    "data": {
      "success": true,
      "archivedAt": "ISO date",
      "archiveId": "string"
    }
  }
  ```

### Search Archived Invoices
- **Method:** `GET`
- **URL:** `/api/v1/e-arsiv/search`
- **Permission:** `invoices:read`
- **Query Parameters:**
  - `startDate` (optional) - ISO date string
  - `endDate` (optional) - ISO date string
  - `invoiceNumber` (optional) - string
  - `customerName` (optional) - string
  - `minAmount` (optional) - number
  - `maxAmount` (optional) - number
- **Response:**
  ```json
  {
    "data": [
      {
        "invoiceId": "string",
        "invoiceNumber": "string",
        "archivedAt": "ISO date",
        "customerName": "string"
      }
    ]
  }
  ```

### Get Archived Invoice Details
- **Method:** `GET`
- **URL:** `/api/v1/e-arsiv/:invoiceId`
- **Permission:** `invoices:read`
- **Response:**
  ```json
  {
    "data": {
      "invoiceId": "string",
      "invoiceNumber": "string",
      "archivedAt": "ISO date",
      "details": {}
    }
  }
  ```

### Auto-Archive Old Invoices
- **Method:** `POST`
- **URL:** `/api/v1/e-arsiv/auto-archive`
- **Permission:** `invoices:manage`
- **Request Body:**
  ```json
  {
    "retentionDays": 90 // optional, default: 90
  }
  ```
- **Response:**
  ```json
  {
    "data": {
      "archivedCount": 25,
      "message": "25 fatura otomatik olarak arşivlendi."
    }
  }
  ```

---

## 3. E-Defter (Electronic Ledger) Routes

**Base Path:** `/api/v1/e-defter`

### Generate E-Defter
- **Method:** `POST`
- **URL:** `/api/v1/e-defter/generate`
- **Permission:** `invoices:manage`
- **Request Body:**
  ```json
  {
    "clientCompanyId": "string (required)",
    "periodStart": "ISO date string (required)",
    "periodEnd": "ISO date string (required)",
    "periodType": "monthly | quarterly | yearly (required)"
  }
  ```
- **Response:**
  ```json
  {
    "data": {
      "ledgerId": "string",
      "clientCompanyId": "string",
      "periodStart": "ISO date",
      "periodEnd": "ISO date",
      "generatedAt": "ISO date"
    }
  }
  ```

### Submit E-Defter to GIB
- **Method:** `POST`
- **URL:** `/api/v1/e-defter/submit`
- **Permission:** `invoices:manage`
- **Request Body:**
  ```json
  {
    "clientCompanyId": "string (required)",
    "ledgerId": "string (required)"
  }
  ```
- **Response:**
  ```json
  {
    "data": {
      "success": true,
      "submittedAt": "ISO date",
      "submissionId": "string"
    }
  }
  ```

### Get Ledger by ID
- **Method:** `GET`
- **URL:** `/api/v1/e-defter/:clientCompanyId/:ledgerId`
- **Permission:** `invoices:read`
- **Response:**
  ```json
  {
    "data": {
      "ledgerId": "string",
      "clientCompanyId": "string",
      "periodStart": "ISO date",
      "periodEnd": "ISO date",
      "entries": []
    }
  }
  ```

### List Ledgers for Company
- **Method:** `GET`
- **URL:** `/api/v1/e-defter/:clientCompanyId`
- **Permission:** `invoices:read`
- **Response:**
  ```json
  {
    "data": [
      {
        "ledgerId": "string",
        "periodStart": "ISO date",
        "periodEnd": "ISO date",
        "status": "string"
      }
    ]
  }
  ```

---

## 4. Tax Routes

**Base Path:** `/api/v1/tax`

### VAT Optimization

#### Analyze VAT
- **Method:** `POST`
- **URL:** `/api/v1/tax/vat/analyze`
- **Permission:** `reports:read`
- **Request Body:**
  ```json
  {
    "clientCompanyId": "string (required)",
    "startDate": "ISO date string (required)",
    "endDate": "ISO date string (required)"
  }
  ```
- **Response:**
  ```json
  {
    "data": {
      "totalVAT": 0,
      "inputVAT": 0,
      "outputVAT": 0,
      "netVAT": 0,
      "inconsistencies": []
    }
  }
  ```

#### Check VAT Inconsistencies
- **Method:** `GET`
- **URL:** `/api/v1/tax/vat/inconsistencies/:clientCompanyId`
- **Permission:** `reports:read`
- **Response:**
  ```json
  {
    "data": {
      "inconsistencies": [
        {
          "type": "string",
          "description": "string",
          "severity": "low | medium | high"
        }
      ]
    }
  }
  ```

#### Prepare VAT Return
- **Method:** `POST`
- **URL:** `/api/v1/tax/vat/prepare-return`
- **Permission:** `reports:manage`
- **Request Body:**
  ```json
  {
    "clientCompanyId": "string (required)",
    "startDate": "ISO date string (required)",
    "endDate": "ISO date string (required)"
  }
  ```
- **Response:**
  ```json
  {
    "data": {
      "period": "string",
      "inputVAT": 0,
      "outputVAT": 0,
      "netVAT": 0,
      "returnData": {}
    }
  }
  ```

### Tax Compliance

#### Check Tax Compliance
- **Method:** `GET`
- **URL:** `/api/v1/tax/compliance/:clientCompanyId`
- **Permission:** `reports:read`
- **Response:**
  ```json
  {
    "data": {
      "isCompliant": true,
      "issues": [],
      "deadlines": []
    }
  }
  ```

### Tax Reporting

#### Generate VAT Declaration
- **Method:** `POST`
- **URL:** `/api/v1/tax/reports/vat-declaration`
- **Permission:** `reports:manage`
- **Request Body:**
  ```json
  {
    "clientCompanyId": "string (required)",
    "startDate": "ISO date string (required)",
    "endDate": "ISO date string (required)"
  }
  ```
- **Response:**
  ```json
  {
    "data": {
      "declaration": {},
      "period": "string",
      "generatedAt": "ISO date"
    }
  }
  ```

#### Generate Corporate Tax Report
- **Method:** `GET`
- **URL:** `/api/v1/tax/reports/corporate-tax/:clientCompanyId/:year`
- **Permission:** `reports:read`
- **Response:**
  ```json
  {
    "data": {
      "year": 2024,
      "taxableIncome": 0,
      "taxAmount": 0,
      "report": {}
    }
  }
  ```

#### Generate Withholding Tax Report
- **Method:** `POST`
- **URL:** `/api/v1/tax/reports/withholding-tax`
- **Permission:** `reports:read`
- **Request Body:**
  ```json
  {
    "clientCompanyId": "string (required)",
    "startDate": "ISO date string (required)",
    "endDate": "ISO date string (required)"
  }
  ```
- **Response:**
  ```json
  {
    "data": {
      "withholdingTax": 0,
      "report": {}
    }
  }
  ```

#### Generate Monthly Tax Summary
- **Method:** `GET`
- **URL:** `/api/v1/tax/reports/monthly-summary/:clientCompanyId/:year/:month`
- **Permission:** `reports:read`
- **Response:**
  ```json
  {
    "data": {
      "year": 2024,
      "month": 1,
      "summary": {}
    }
  }
  ```

### TMS Compliance

#### Validate TMS Compliance
- **Method:** `POST`
- **URL:** `/api/v1/tax/tms/validate`
- **Permission:** `reports:read`
- **Request Body:**
  ```json
  {
    "clientCompanyId": "string (required)",
    "startDate": "ISO date string (required)",
    "endDate": "ISO date string (required)"
  }
  ```
- **Response:**
  ```json
  {
    "data": {
      "isCompliant": true,
      "violations": [],
      "recommendations": []
    }
  }
  ```

#### Generate TMS Balance Sheet
- **Method:** `GET`
- **URL:** `/api/v1/tax/tms/balance-sheet/:clientCompanyId`
- **Permission:** `reports:read`
- **Query Parameters:**
  - `asOfDate` (optional) - ISO date string, default: today
- **Response:**
  ```json
  {
    "data": {
      "asOfDate": "ISO date",
      "assets": {},
      "liabilities": {},
      "equity": {}
    }
  }
  ```

#### Generate TMS Income Statement
- **Method:** `POST`
- **URL:** `/api/v1/tax/tms/income-statement`
- **Permission:** `reports:read`
- **Request Body:**
  ```json
  {
    "clientCompanyId": "string (required)",
    "startDate": "ISO date string (required)",
    "endDate": "ISO date string (required)"
  }
  ```
- **Response:**
  ```json
  {
    "data": {
      "revenue": 0,
      "expenses": 0,
      "netIncome": 0,
      "statement": {}
    }
  }
  ```

---

## 5. KVKK (Data Protection) Routes

**Base Path:** `/api/v1/kvkk`

### Record Consent
- **Method:** `POST`
- **URL:** `/api/v1/kvkk/consent`
- **Permission:** `users:manage`
- **Request Body:**
  ```json
  {
    "userId": "string (required)",
    "consentType": "data_processing | marketing | analytics | third_party (required)",
    "granted": true, // boolean (required)
    "ipAddress": "string (optional)",
    "userAgent": "string (optional)"
  }
  ```
- **Response:**
  ```json
  {
    "data": {
      "consentId": "string",
      "userId": "string",
      "consentType": "string",
      "granted": true,
      "recordedAt": "ISO date"
    }
  }
  ```

### Get Consent Status
- **Method:** `GET`
- **URL:** `/api/v1/kvkk/consent/:userId`
- **Permission:** `users:read`
- **Response:**
  ```json
  {
    "data": {
      "userId": "string",
      "consents": {
        "data_processing": true,
        "marketing": false,
        "analytics": true,
        "third_party": false
      }
    }
  }
  ```

### Request Data Access
- **Method:** `POST`
- **URL:** `/api/v1/kvkk/data-access/:userId`
- **Permission:** `users:read`
- **Response:**
  ```json
  {
    "data": {
      "requestId": "string",
      "userId": "string",
      "status": "pending",
      "requestedAt": "ISO date"
    }
  }
  ```

### Request Data Deletion
- **Method:** `POST`
- **URL:** `/api/v1/kvkk/data-deletion/:userId`
- **Permission:** `users:manage`
- **Response:**
  ```json
  {
    "data": {
      "requestId": "string",
      "userId": "string",
      "status": "pending",
      "requestedAt": "ISO date"
    }
  }
  ```

### Record Data Breach
- **Method:** `POST`
- **URL:** `/api/v1/kvkk/breach`
- **Permission:** `admin`
- **Request Body:**
  ```json
  {
    "description": "string (required)",
    "affectedUsers": 0, // number (required)
    "severity": "low | medium | high | critical (required)"
  }
  ```
- **Response:**
  ```json
  {
    "data": {
      "breachId": "string",
      "recordedAt": "ISO date",
      "severity": "string",
      "affectedUsers": 0
    }
  }
  ```

### Check Data Retention
- **Method:** `GET`
- **URL:** `/api/v1/kvkk/retention/:userId`
- **Permission:** `users:read`
- **Response:**
  ```json
  {
    "data": {
      "userId": "string",
      "retentionPeriod": 0,
      "expiresAt": "ISO date"
    }
  }
  ```

### Get Data Access Audit Log
- **Method:** `GET`
- **URL:** `/api/v1/kvkk/audit-log`
- **Permission:** `audit:read`
- **Query Parameters:**
  - `userId` (optional) - string
- **Response:**
  ```json
  {
    "data": [
      {
        "logId": "string",
        "userId": "string",
        "action": "string",
        "timestamp": "ISO date"
      }
    ]
  }
  ```

---

## 6. Security Routes

**Base Path:** `/api/v1/security`

### Two-Factor Authentication

#### Enable 2FA
- **Method:** `POST`
- **URL:** `/api/v1/security/2fa/enable`
- **Permission:** `users:manage`
- **Request Body:**
  ```json
  {
    "userId": "string (optional)" // defaults to current user
  }
  ```
- **Response:**
  ```json
  {
    "data": {
      "enabled": false,
      "secret": "string",
      "qrCode": "data:image/png;base64,...",
      "backupCodes": ["CODE1", "CODE2", ...]
    }
  }
  ```

#### Verify and Enable 2FA
- **Method:** `POST`
- **URL:** `/api/v1/security/2fa/verify`
- **Permission:** `users:manage`
- **Request Body:**
  ```json
  {
    "userId": "string (optional)",
    "token": "123456" // 6-digit code (required)
  }
  ```
- **Response:**
  ```json
  {
    "data": {
      "success": true,
      "message": "2FA başarıyla etkinleştirildi."
    }
  }
  ```

#### Disable 2FA
- **Method:** `POST`
- **URL:** `/api/v1/security/2fa/disable`
- **Permission:** `users:manage`
- **Request Body:**
  ```json
  {
    "userId": "string (optional)"
  }
  ```
- **Response:**
  ```json
  {
    "data": {
      "message": "2FA devre dışı bırakıldı."
    }
  }
  ```

### IP Whitelisting

#### Add IP to Whitelist
- **Method:** `POST`
- **URL:** `/api/v1/security/ip-whitelist`
- **Permission:** `admin`
- **Request Body:**
  ```json
  {
    "ipAddress": "string (required)",
    "description": "string (optional)",
    "userId": "string (optional)"
  }
  ```
- **Response:**
  ```json
  {
    "data": {
      "id": "string",
      "tenantId": "string",
      "ipAddress": "string",
      "description": "string",
      "createdAt": "ISO date"
    }
  }
  ```

#### Check IP Whitelist Status
- **Method:** `GET`
- **URL:** `/api/v1/security/ip-whitelist/check`
- **Permission:** `users:read`
- **Response:**
  ```json
  {
    "data": {
      "isWhitelisted": true,
      "ipAddress": "string"
    }
  }
  ```

### Password & Account Security

#### Validate Password
- **Method:** `POST`
- **URL:** `/api/v1/security/password/validate`
- **Permission:** `users:read`
- **Request Body:**
  ```json
  {
    "password": "string (required)"
  }
  ```
- **Response:**
  ```json
  {
    "data": {
      "valid": true,
      "errors": []
    }
  }
  ```

#### Get Account Lockout Status
- **Method:** `GET`
- **URL:** `/api/v1/security/account-lockout/:userId`
- **Permission:** `users:read`
- **Response:**
  ```json
  {
    "data": {
      "locked": false,
      "lockoutUntil": "ISO date (optional)",
      "failedAttempts": 0,
      "remainingAttempts": 5
    }
  }
  ```

---

## 7. Database Optimization Routes

**Base Path:** `/api/v1/db-optimization`

### Get Index Recommendations
- **Method:** `GET`
- **URL:** `/api/v1/db-optimization/indexes/recommendations`
- **Permission:** `admin`
- **Response:**
  ```json
  {
    "data": [
      {
        "table": "string",
        "columns": ["string"],
        "type": "btree | gin | gist | hash",
        "reason": "string",
        "estimatedImpact": "low | medium | high"
      }
    ]
  }
  ```

### Create Recommended Indexes
- **Method:** `POST`
- **URL:** `/api/v1/db-optimization/indexes/create`
- **Permission:** `admin`
- **Response:**
  ```json
  {
    "data": {
      "created": 5,
      "skipped": 2,
      "errors": []
    }
  }
  ```

### Get Connection Pool Stats
- **Method:** `GET`
- **URL:** `/api/v1/db-optimization/connection-pool/stats`
- **Permission:** `admin`
- **Response:**
  ```json
  {
    "data": {
      "activeConnections": 10,
      "idleConnections": 5,
      "totalConnections": 15,
      "maxConnections": 100
    }
  }
  ```

### Analyze Table Sizes
- **Method:** `GET`
- **URL:** `/api/v1/db-optimization/tables/sizes`
- **Permission:** `admin`
- **Response:**
  ```json
  {
    "data": [
      {
        "table": "string",
        "size": "string",
        "rows": 0,
        "indexSize": "string"
      }
    ]
  }
  ```

### Vacuum Tables
- **Method:** `POST`
- **URL:** `/api/v1/db-optimization/tables/vacuum`
- **Permission:** `admin`
- **Request Body:**
  ```json
  {
    "tableNames": ["string"] // optional, if not provided, vacuums all tables
  }
  ```
- **Response:**
  ```json
  {
    "data": {
      "vacuumed": ["string"],
      "errors": []
    }
  }
  ```

---

## 8. Analytics Routes

**Base Path:** `/api/v1/analytics`

### Get Financial Trends
- **Method:** `GET`
- **URL:** `/api/v1/analytics/financial-trends`
- **Permission:** `reports:read`
- **Query Parameters:**
  - `startDate` (required) - ISO date string
  - `endDate` (required) - ISO date string
  - `granularity` (optional) - `daily | weekly | monthly | quarterly`, default: `monthly`
- **Response:**
  ```json
  {
    "data": [
      {
        "period": "2024-01",
        "revenue": 0,
        "expenses": 0,
        "profit": 0,
        "profitMargin": 0,
        "invoiceCount": 0,
        "averageInvoiceValue": 0
      }
    ]
  }
  ```

### Get Risk Trends
- **Method:** `GET`
- **URL:** `/api/v1/analytics/risk-trends`
- **Permission:** `reports:read`
- **Query Parameters:**
  - `startDate` (required) - ISO date string
  - `endDate` (required) - ISO date string
  - `granularity` (optional) - `daily | weekly | monthly`, default: `monthly`
- **Response:**
  ```json
  {
    "data": [
      {
        "period": "2024-01",
        "averageRiskScore": 0,
        "highRiskClientCount": 0,
        "criticalAlertsCount": 0,
        "riskScoreChange": 0
      }
    ]
  }
  ```

### Get Client Portfolio Analytics
- **Method:** `GET`
- **URL:** `/api/v1/analytics/portfolio`
- **Permission:** `reports:read`
- **Query Parameters:**
  - `startDate` (optional) - ISO date string
  - `endDate` (optional) - ISO date string
- **Response:**
  ```json
  {
    "data": {
      "totalClients": 0,
      "activeClients": 0,
      "highRiskClients": 0,
      "mediumRiskClients": 0,
      "lowRiskClients": 0,
      "totalRevenue": 0,
      "averageRevenuePerClient": 0,
      "topClients": [],
      "riskDistribution": {
        "low": 0,
        "medium": 0,
        "high": 0
      }
    }
  }
  ```

### Get Revenue Forecast
- **Method:** `GET`
- **URL:** `/api/v1/analytics/revenue-forecast`
- **Permission:** `reports:read`
- **Query Parameters:**
  - `periods` (optional) - number, default: 3 (months)
  - `historicalMonths` (optional) - number, default: 12
- **Response:**
  ```json
  {
    "data": [
      {
        "period": "2024-04",
        "forecastedRevenue": 0,
        "confidence": 0.85,
        "lowerBound": 0,
        "upperBound": 0,
        "factors": []
      }
    ]
  }
  ```

### Get Expense Forecast
- **Method:** `GET`
- **URL:** `/api/v1/analytics/expense-forecast`
- **Permission:** `reports:read`
- **Query Parameters:**
  - `periods` (optional) - number, default: 3 (months)
  - `historicalMonths` (optional) - number, default: 12
- **Response:**
  ```json
  {
    "data": [
      {
        "period": "2024-04",
        "forecastedExpenses": 0,
        "confidence": 0.85,
        "lowerBound": 0,
        "upperBound": 0,
        "categoryBreakdown": []
      }
    ]
  }
  ```

### Get Comprehensive Analytics Dashboard
- **Method:** `GET`
- **URL:** `/api/v1/analytics/dashboard`
- **Permission:** `reports:read`
- **Query Parameters:**
  - `startDate` (required) - ISO date string
  - `endDate` (required) - ISO date string
  - `granularity` (optional) - `daily | weekly | monthly | quarterly`
- **Response:**
  ```json
  {
    "data": {
      "financialTrends": [],
      "riskTrends": [],
      "portfolio": {},
      "revenueForecast": [],
      "expenseForecast": [],
      "summary": {
        "totalRevenue": 0,
        "totalExpenses": 0,
        "netProfit": 0,
        "profitMargin": 0,
        "averageRiskScore": 0,
        "highRiskClientCount": 0
      }
    }
  }
  ```

---

## 9. ML Fraud Detection Routes

**Base Path:** `/api/v1/risk`

### Get ML Fraud Score
- **Method:** `GET`
- **URL:** `/api/v1/risk/ml-fraud/:clientCompanyId`
- **Permission:** `clients:read`
- **Response:**
  ```json
  {
    "data": {
      "clientCompanyId": "string",
      "fraudScore": 0,
      "riskLevel": "low | medium | high | critical",
      "factors": [],
      "calculatedAt": "ISO date"
    }
  }
  ```

### Check and Alert for Fraud
- **Method:** `POST`
- **URL:** `/api/v1/risk/ml-fraud/:clientCompanyId/check`
- **Permission:** `clients:read`
- **Response:**
  ```json
  {
    "data": {
      "message": "ML dolandırıcılık kontrolü tamamlandı."
    }
  }
  ```

---

## Summary

### Route Statistics

- **Total Route Groups:** 9
- **Total Endpoints:** 40+
- **Authentication:** Required for all routes
- **Tenant Context:** Required for all routes
- **Response Format:** JSON

### Common Response Patterns

**Success Response:**
```json
{
  "data": { ... }
}
```

**Error Response:**
```json
{
  "error": {
    "message": "Error message in Turkish",
    "details": [
      {
        "path": ["field"],
        "message": "Validation error"
      }
    ]
  }
}
```

### Permission Levels

- `admin` - Full administrative access
- `users:manage` - User management operations
- `users:read` - Read user data
- `invoices:manage` - Invoice management operations
- `invoices:read` - Read invoice data
- `reports:manage` - Generate and manage reports
- `reports:read` - Read reports
- `clients:read` - Read client data
- `audit:read` - Read audit logs

---

**Document Status:** Complete  
**Last Review:** January 2025

