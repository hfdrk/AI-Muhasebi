# Architecture Overview

## High-Level Architecture

AI Muhasebi is built as a modular monolith using a Turborepo monorepo structure. The system is designed for multi-tenant SaaS operations with strict tenant isolation and comprehensive RBAC.

## System Boundaries

- **Frontend**: Next.js web application (Turkish UI)
- **Backend**: Node.js API server (Express/Fastify)
- **Workers**: Background job processing
- **Database**: PostgreSQL (primary), Redis (cache/queues)
- **Storage**: S3-compatible object storage

## Key Architectural Decisions

1. **Monorepo**: Turborepo for managing multiple apps and packages
2. **Modular Monolith**: Start simple, extract services as needed
3. **Multi-Tenancy**: Tenant ID as first-class field, enforced at all layers
4. **RBAC**: Role-based access control with granular permissions
5. **Security First**: OWASP Top 10 compliance, comprehensive audit logging

## See Also

- [Multi-Tenancy Design](./multi-tenancy.md)
- [RBAC Design](./rbac.md)
- [Security Architecture](./security.md)
- [Database Schema](./database-schema.md)
- [API Design](./api-design.md)
- [Frontend Architecture](./frontend-architecture.md)
- [Deployment Architecture](./deployment.md)

