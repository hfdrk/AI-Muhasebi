# Security Architecture

## Authentication

- **Password Requirements**: Minimum 12 characters, uppercase, lowercase, number, special character
- **Password History**: Cannot reuse last 5 passwords
- **MFA**: Optional TOTP-based, enforced for TenantOwner and PlatformAdmin
- **Session Management**: JWT tokens (15min access, 7day refresh), token rotation

## Token Strategy

- **Access Token**: Short-lived (15 minutes), includes `userId`, `tenantId`, `roles[]`, `permissions[]`
- **Refresh Token**: Long-lived (7 days), stored in httpOnly cookie
- **Signing**: RS256 (asymmetric keys)
- **Storage**: Access token in-memory or secure cookie, never localStorage

## Encryption

- **At Rest**: Full disk encryption + column-level encryption for PII
- **In Transit**: TLS 1.3, HTTPS only, HSTS headers

## Audit Logs

- **What**: All authentication events, data modifications, permission changes, admin actions
- **Format**: Structured JSON with `timestamp`, `tenantId`, `userId`, `action`, `resourceType`, `resourceId`, `ipAddress`, `userAgent`, `result`, `metadata`
- **Retention**: 90 days hot storage, 1 year cold storage

## OWASP Top 10 Compliance

1. Injection: Parameterized queries, input validation, ORM usage
2. Broken Authentication: Strong password policy, MFA, secure tokens
3. Sensitive Data Exposure: Encryption at rest/transit, no secrets in logs
4. XML External Entities: Disabled, use JSON
5. Broken Access Control: RBAC enforcement, tenant isolation
6. Security Misconfiguration: Secure defaults, regular audits
7. XSS: CSP, input sanitization, React protection
8. Insecure Deserialization: Avoid untrusted deserialization
9. Known Vulnerabilities: Regular dependency audits
10. Insufficient Logging: Comprehensive audit logs

## Secrets Management

- No secrets in repository
- Environment variables or secret management service (AWS Secrets Manager, Vault)
- Local: `.env.example` with dummy values, `.env` gitignored
- Production: Cloud secret manager, regular rotation

