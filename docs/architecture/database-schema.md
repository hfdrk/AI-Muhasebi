# Database Schema

## Overview

PostgreSQL is used as the primary database with strict multi-tenant isolation.

## Core Tables

### Tenants
- `id`, `name`, `slug`, `created_at`, `updated_at`

### Users
- `id`, `tenant_id`, `email`, `password_hash`, `roles[]`, `created_at`, `updated_at`

### Clients
- `id`, `tenant_id`, `name`, `tax_id`, `contact_info`, `created_at`, `updated_at`

### Invoices
- `id`, `tenant_id`, `client_id`, `invoice_number`, `amount`, `status`, `created_at`, `updated_at`

### Documents
- `id`, `tenant_id`, `client_id`, `file_path`, `file_type`, `metadata`, `created_at`, `updated_at`

### RiskScores
- `id`, `tenant_id`, `client_id`, `score`, `factors`, `calculated_at`

### RiskAlerts
- `id`, `tenant_id`, `client_id`, `risk_score_id`, `severity`, `status`, `created_at`

### Reports
- `id`, `tenant_id`, `type`, `parameters`, `generated_at`, `file_path`

### AuditLogs
- `id`, `tenant_id`, `user_id`, `action`, `resource_type`, `resource_id`, `ip_address`, `user_agent`, `result`, `metadata`, `timestamp`

## Relationships

- Users belong to Tenants
- Clients belong to Tenants
- Invoices belong to Tenants and Clients
- Documents belong to Tenants and optionally Clients
- RiskScores and RiskAlerts belong to Tenants and Clients
- Reports belong to Tenants
- AuditLogs belong to Tenants and Users

## Indexes

- All `tenant_id` columns indexed
- Composite indexes on `(tenant_id, id)` for common queries
- Foreign key constraints enforced

## Row-Level Security

PostgreSQL RLS policies ensure tenant isolation at the database level.

