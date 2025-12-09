# Operations Runbook

This document provides operational guidance for maintaining and troubleshooting the AI Muhasebi platform.

## How to Know the System is Healthy

### Health Check Endpoints

The backend API exposes health endpoints that should be monitored:

1. **`GET /healthz`** - Lightweight health check
   - Returns 200 if HTTP server is up
   - No database check (very fast)
   - Use for basic liveness probes

2. **`GET /readyz`** - Readiness check
   - Returns 200 when database is reachable
   - Returns 503 when database is unavailable
   - Use for readiness probes and pre-deployment checks

**Quick Check:**
```bash
# Using curl
curl http://your-api-url/healthz
curl http://your-api-url/readyz

# Using helper script
./scripts/healthcheck-backend.sh [API_URL]
```

**Expected Responses:**

Healthy:
```json
// /healthz
{"status": "ok", "service": "backend-api"}

// /readyz
{"status": "ready"}
```

Unhealthy:
```json
// /readyz (when DB is down)
{"status": "not_ready", "details": {"error": "Database connection failed"}}
```

### Worker Health Check

Check worker health:
```bash
cd apps/worker-jobs
pnpm health-check
```

This checks:
- Environment validation
- Database connectivity
- Job table accessibility

## What to Do After Deploy

### 1. Verify Health Endpoints

```bash
# Check backend health
curl http://your-api-url/healthz
curl http://your-api-url/readyz

# Check worker (if applicable)
cd apps/worker-jobs && pnpm health-check
```

### 2. Run Smoke Tests

Run smoke tests to verify critical flows:

```bash
# Backend smoke tests
pnpm smoke:backend

# Full stack smoke tests
pnpm smoke:full

# Worker smoke tests
pnpm smoke:worker
```

### 3. Check Application Logs

Monitor logs for:
- Errors or exceptions
- Database connection issues
- Authentication failures
- High error rates

**Log Locations:**
- Application logs: Check your logging system (e.g., CloudWatch, Datadog, stdout)
- Database logs: Check PostgreSQL logs
- Worker logs: Check worker process logs

### 4. Verify Database Migrations

Ensure migrations were applied:
```bash
cd apps/backend-api
pnpm db:migrate:deploy
```

Check migration status in your database or via Prisma Studio:
```bash
pnpm db:studio
```

### 5. Monitor Key Metrics

- API response times
- Database query performance
- Error rates
- Active user sessions
- Background job processing rates

## Common Failure Cases

### Database Connection Failed

**Symptoms:**
- `/readyz` returns 503
- API requests fail with database errors
- Worker health check fails

**Diagnosis:**
1. Check `DATABASE_URL` environment variable
2. Verify PostgreSQL is running
3. Check network connectivity to database
4. Verify database credentials

**Resolution:**
- Restart database service
- Verify `DATABASE_URL` is correct
- Check database server logs
- Verify firewall/security group rules

### Environment Misconfiguration

**Symptoms:**
- Application fails to start
- Missing environment variable errors
- Invalid configuration errors

**Diagnosis:**
1. Check application startup logs
2. Verify all required environment variables are set
3. Check `.env` files exist and are properly formatted

**Resolution:**
- Review `.env.example` files
- Set missing environment variables
- Verify variable formats (e.g., `JWT_SECRET` must be at least 32 characters)
- Restart application

### Migration Failures

**Symptoms:**
- Migration errors during deployment
- Schema mismatch errors
- Database constraint violations

**Diagnosis:**
1. Check migration logs
2. Review `prisma/migrations/` directory
3. Check database schema state

**Resolution:**
- Review migration files for conflicts
- Manually resolve migration conflicts if needed
- Rollback if necessary: `pnpm db:migrate resolve --rolled-back <migration_name>`
- Contact team if migration conflicts are complex

### High Error Rates

**Symptoms:**
- Increased 500 errors
- Timeout errors
- Slow response times

**Diagnosis:**
1. Check application logs for error patterns
2. Monitor database query performance
3. Check system resources (CPU, memory, disk)
4. Review recent deployments or changes

**Resolution:**
- Identify root cause from logs
- Scale resources if needed
- Rollback recent changes if applicable
- Check for database deadlocks or long-running queries

### Worker Jobs Not Processing

**Symptoms:**
- Documents stuck in "PENDING" status
- Scheduled reports not running
- Integration syncs not executing

**Diagnosis:**
1. Check worker process is running
2. Run worker health check: `pnpm -C apps/worker-jobs health-check`
3. Check worker logs for errors
4. Verify job tables in database

**Resolution:**
- Restart worker process
- Check database connectivity
- Review worker logs for specific errors
- Verify job queue is not blocked

### Authentication Issues

**Symptoms:**
- Users cannot login
- Token validation errors
- 401 Unauthorized errors

**Diagnosis:**
1. Check `JWT_SECRET` is set correctly
2. Verify token expiration settings
3. Check authentication middleware logs

**Resolution:**
- Verify `JWT_SECRET` matches across services
- Check token expiration configuration
- Review authentication service logs

## Monitoring Recommendations

### Health Checks

- Set up automated health checks for `/healthz` and `/readyz`
- Configure alerts for 503 responses
- Monitor health check response times

### Application Metrics

- API response times (p50, p95, p99)
- Error rates by endpoint
- Database query performance
- Background job processing rates

### Infrastructure Metrics

- CPU and memory usage
- Database connection pool usage
- Disk I/O
- Network latency

## Emergency Procedures

### Rollback Deployment

1. Revert to previous application version
2. Run database migrations if needed (check migration compatibility)
3. Verify health endpoints
4. Run smoke tests
5. Monitor logs for errors

### Database Recovery

1. Stop application services
2. Restore database from backup
3. Verify database integrity
4. Restart services
5. Run smoke tests

### Service Restart

1. Stop service gracefully (allow in-flight requests to complete)
2. Wait for health checks to fail
3. Start service
4. Verify health endpoints return 200
5. Monitor logs for errors

## Contact and Escalation

For critical issues:
1. Check this runbook first
2. Review application logs
3. Check system health endpoints
4. Escalate to development team if issue persists

## Additional Resources

- Backend API documentation: `apps/backend-api/README.md`
- Web app documentation: `apps/web-app/README.md`
- Architecture documentation: `docs/architecture/`
- Deployment guides: `docs/deployment/`

