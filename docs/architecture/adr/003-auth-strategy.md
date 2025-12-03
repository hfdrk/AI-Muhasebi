# ADR 003: Authentication Strategy

## Status

Accepted

## Context

We need a secure authentication system that supports multi-tenancy and RBAC.

## Decision

We chose **JWT tokens** with access/refresh token pattern.

## Rationale

- Stateless authentication (scales well)
- Access/refresh token pattern provides security and UX balance
- RS256 asymmetric signing for enhanced security
- Token includes tenant context, eliminating need for separate tenant resolution
- Standard approach, well-understood

## Consequences

- Stateless backend (good for scaling)
- Token revocation requires token blacklist (Redis)
- Short-lived access tokens reduce impact of token theft
- Refresh token rotation improves security

