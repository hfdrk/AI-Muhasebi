# ADR 002: Database Choice

## Status

Accepted

## Context

We need a database that supports multi-tenancy, ACID compliance, and complex relational queries.

## Decision

We chose **PostgreSQL**.

## Rationale

- ACID compliance for financial data
- Excellent support for row-level security (RLS)
- Strong relational data modeling
- Full-text search capabilities
- Mature ecosystem and tooling
- JSON support for flexible schemas

## Consequences

- Reliable data integrity
- Built-in tenant isolation via RLS
- May need additional search solution (Elasticsearch) if search requirements grow
- Requires database administration expertise

