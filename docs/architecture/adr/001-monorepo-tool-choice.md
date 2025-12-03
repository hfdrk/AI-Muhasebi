# ADR 001: Monorepo Tool Choice

## Status

Accepted

## Context

We need a monorepo tool to manage multiple applications and shared packages efficiently.

## Decision

We chose **Turborepo** over Nx.

## Rationale

- Simpler setup and configuration
- Excellent caching capabilities
- Strong TypeScript support
- Better suited for polyglot monorepos with clear service boundaries
- Less opinionated, more flexible

## Consequences

- Faster builds through intelligent caching
- Simpler developer onboarding
- Less overhead compared to Nx
- May need to add additional tooling for code generation (if needed later)

