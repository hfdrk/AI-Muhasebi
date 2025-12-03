# Multi-Tenancy Design

## Overview

AI Muhasebi implements strict multi-tenant isolation where all tenant-bound data is segregated by `tenantId`.

## Tenant Isolation Strategy

### Database Level
- All tenant-bound entities include `tenantId: string` field
- Row-level security (RLS) policies in PostgreSQL
- All queries automatically filter by `tenantId`
- Repository pattern enforces tenant filtering

### API Level
- Tenant context extracted from JWT token (never from request body)
- Middleware validates tenant context on every request
- Resource access verified against tenant ownership
- Cross-tenant access attempts return 404 (security through obscurity)

### Worker Level
- All job payloads include `tenantId`
- Job processors validate tenant before processing
- Optional queue isolation for high-scale tenants

## Tenant Context Resolution

1. User authenticates → JWT token includes `tenantId`
2. Request middleware extracts `tenantId` from token
3. `tenantContext` attached to request: `{ tenantId, userId, roles }`
4. All data access uses `tenantContext.tenantId`

## Entities Requiring Tenant Isolation

- Tenant
- User
- Client
- Invoice
- Document
- RiskScore
- RiskAlert
- Report
- Integration
- AuditLog

## Platform-Level Entities (No tenantId)

- PlatformAdmin
- SystemConfig
- FeatureFlag

