# Production Environment Configuration Examples

## Backend API (.env)

```bash
# Environment
NODE_ENV=production

# Database
# Format: postgresql://user:password@host:port/database
DATABASE_URL=postgresql://user:password@db-host:5432/ai_muhasebi_prod
DATABASE_POOL_SIZE=10

# JWT Configuration
# Generate a secure random string (minimum 32 characters)
# Example: openssl rand -base64 32
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d

# API Configuration
PORT=3800
API_URL=https://api.yourdomain.com
FRONTEND_URL=https://app.yourdomain.com
CORS_ORIGIN=https://app.yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info

# Email Configuration
EMAIL_TRANSPORT=smtp
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=your-smtp-password
SMTP_FROM=noreply@yourdomain.com

# Error Tracking (Sentry)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Storage Configuration
STORAGE_TYPE=s3
STORAGE_BUCKET_NAME=ai-muhasebi-documents
# AWS S3 Configuration (if using S3)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1

# Redis (optional, for caching and rate limiting)
REDIS_URL=redis://redis-host:6379

# Worker Configuration
WORKER_CONCURRENCY=5

# Reporting Feature Flags
REPORTING_ENABLED=true
PDF_EXPORT_ENABLED=true
EXCEL_EXPORT_ENABLED=true
SCHEDULED_REPORTS_ENABLED=true

# Storage Limits
STORAGE_MAX_FILE_SIZE=20971520
STORAGE_MAX_ZIP_FILE_SIZE=104857600
```

## Web App (.env.local)

```bash
# Environment
NODE_ENV=production

# API Configuration
# This should point to your production backend API
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com

# Optional: Analytics
# NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id

# Optional: Feature Flags
# NEXT_PUBLIC_ENABLE_FEATURE_X=true
```

## Worker Jobs (.env)

```bash
# Environment
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:password@db-host:5432/ai_muhasebi_prod
DATABASE_POOL_SIZE=5

# Logging
LOG_LEVEL=info

# Worker Configuration
WORKER_CONCURRENCY=5

# Email Configuration (same as backend-api)
EMAIL_TRANSPORT=smtp
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=your-smtp-password
SMTP_FROM=noreply@yourdomain.com

# Storage Configuration (same as backend-api)
STORAGE_TYPE=s3
STORAGE_BUCKET_NAME=ai-muhasebi-documents
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1

# Redis (optional)
REDIS_URL=redis://redis-host:6379

# Error Tracking (Sentry)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

## Security Notes

1. **Never commit .env files to version control**
2. Use a secrets management service (AWS Secrets Manager, HashiCorp Vault, etc.) in production
3. Rotate secrets regularly
4. Use different secrets for each environment
5. Restrict access to production environment variables

## Generating Secure Secrets

```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Generate database password
openssl rand -base64 24
```

