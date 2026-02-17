#!/usr/bin/env bash
# ==============================================================================
# AI Muhasebi - Pre-Launch Production Readiness Check
# ==============================================================================
# Run this script before deploying to production to verify all requirements.
# Usage: bash scripts/prelaunch-check.sh [.env file path]
# ==============================================================================

set -euo pipefail

ENV_FILE="${1:-.env}"
ERRORS=0
WARNINGS=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

pass() { echo -e "  ${GREEN}[PASS]${NC} $1"; }
fail() { echo -e "  ${RED}[FAIL]${NC} $1"; ERRORS=$((ERRORS + 1)); }
warn() { echo -e "  ${YELLOW}[WARN]${NC} $1"; WARNINGS=$((WARNINGS + 1)); }
info() { echo -e "  ${BLUE}[INFO]${NC} $1"; }
header() { echo -e "\n${BLUE}=== $1 ===${NC}"; }

# Load .env file if it exists
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
  info "Loaded environment from $ENV_FILE"
else
  warn "No .env file found at $ENV_FILE — checking system environment"
fi

echo ""
echo "=============================================="
echo "  AI Muhasebi - Production Readiness Check"
echo "=============================================="

# --------------------------------------------------------------------------
header "1. Environment Variables"
# --------------------------------------------------------------------------

check_var() {
  local var_name="$1"
  local required="${2:-true}"
  local value="${!var_name:-}"

  if [ -z "$value" ]; then
    if [ "$required" = "true" ]; then
      fail "$var_name is not set (REQUIRED)"
    else
      warn "$var_name is not set (recommended)"
    fi
  else
    # Mask secrets in output
    if echo "$var_name" | grep -qiE "password|secret|key|token|dsn"; then
      pass "$var_name = ****${value: -4}"
    else
      pass "$var_name = $value"
    fi
  fi
}

check_var "NODE_ENV"
check_var "DATABASE_URL"
check_var "JWT_SECRET"
check_var "CORS_ORIGIN"
check_var "FRONTEND_URL"
check_var "REDIS_URL"
check_var "EMAIL_TRANSPORT"
check_var "SENTRY_DSN" false
check_var "STORAGE_TYPE"

# Check JWT_SECRET is not the default
if [ "${JWT_SECRET:-}" = "your-super-secret-jwt-key-minimum-32-characters-long-change-in-production" ]; then
  fail "JWT_SECRET is set to the default example value — change it!"
fi

# Check NODE_ENV is production
if [ "${NODE_ENV:-}" != "production" ]; then
  fail "NODE_ENV is '${NODE_ENV:-development}', expected 'production'"
fi

# Check email config
if [ "${EMAIL_TRANSPORT:-}" = "smtp" ]; then
  check_var "SMTP_HOST"
  check_var "SMTP_FROM"
elif [ "${EMAIL_TRANSPORT:-}" = "stub" ]; then
  warn "EMAIL_TRANSPORT=stub — no emails will be sent in production"
fi

# Check storage config
if [ "${STORAGE_TYPE:-}" = "s3" ]; then
  check_var "STORAGE_BUCKET_NAME"
  check_var "STORAGE_ACCESS_KEY_ID"
  check_var "STORAGE_SECRET_ACCESS_KEY"
fi

# --------------------------------------------------------------------------
header "2. Database"
# --------------------------------------------------------------------------

if command -v psql &>/dev/null && [ -n "${DATABASE_URL:-}" ]; then
  if psql "$DATABASE_URL" -c "SELECT 1" &>/dev/null; then
    pass "PostgreSQL connection successful"

    # Check for pending migrations
    MIGRATION_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM _prisma_migrations WHERE finished_at IS NULL" 2>/dev/null || echo "0")
    if [ "$MIGRATION_COUNT" -gt 0 ]; then
      fail "There are $MIGRATION_COUNT pending database migrations"
    else
      pass "No pending migrations"
    fi

    # Check RLS is enabled
    RLS_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public' AND tablename IN ('Invoice','Document','Transaction') AND rowsecurity=true" 2>/dev/null || echo "0")
    if [ "$RLS_COUNT" -gt 0 ]; then
      pass "Row-Level Security is enabled on key tables"
    else
      warn "Row-Level Security may not be enabled — run the RLS migration"
    fi
  else
    fail "Cannot connect to PostgreSQL"
  fi
else
  warn "psql not available — skipping database checks"
fi

# --------------------------------------------------------------------------
header "3. Redis"
# --------------------------------------------------------------------------

if command -v redis-cli &>/dev/null && [ -n "${REDIS_URL:-}" ]; then
  # Extract host:port from redis URL
  REDIS_HOST=$(echo "$REDIS_URL" | sed -E 's|redis://([^:]+):?([0-9]*).*|\1|')
  REDIS_PORT=$(echo "$REDIS_URL" | sed -E 's|redis://[^:]+:?([0-9]*).*|\1|')
  REDIS_PORT="${REDIS_PORT:-6379}"

  if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping &>/dev/null; then
    pass "Redis connection successful"
  else
    fail "Cannot connect to Redis at $REDIS_HOST:$REDIS_PORT"
  fi
else
  warn "redis-cli not available — skipping Redis checks"
fi

# --------------------------------------------------------------------------
header "4. Docker Images"
# --------------------------------------------------------------------------

if command -v docker &>/dev/null; then
  for img in backend-api web-app worker-jobs; do
    if docker images --format '{{.Repository}}' | grep -q "$img"; then
      pass "Docker image for $img exists locally"
    else
      warn "Docker image for $img not found locally"
    fi
  done

  # Check if docker compose file exists
  if [ -f "docker-compose.prod.yml" ]; then
    pass "docker-compose.prod.yml exists"
  else
    fail "docker-compose.prod.yml not found"
  fi
else
  warn "Docker not available — skipping image checks"
fi

# --------------------------------------------------------------------------
header "5. Security"
# --------------------------------------------------------------------------

# Check for .env in .gitignore
if [ -f ".gitignore" ]; then
  if grep -q "^\.env$" .gitignore; then
    pass ".env is in .gitignore"
  else
    fail ".env is NOT in .gitignore — secrets may be committed!"
  fi
fi

# Check JWT secret length
JWT_LEN=${#JWT_SECRET}
if [ "$JWT_LEN" -ge 64 ]; then
  pass "JWT_SECRET length ($JWT_LEN chars) is strong"
elif [ "$JWT_LEN" -ge 32 ]; then
  warn "JWT_SECRET length ($JWT_LEN chars) — recommend 64+ chars"
else
  fail "JWT_SECRET is too short ($JWT_LEN chars) — minimum 32 required"
fi

# Check CORS is not wildcard
if [ "${CORS_ORIGIN:-}" = "*" ]; then
  fail "CORS_ORIGIN is set to '*' — must be a specific domain in production"
else
  pass "CORS_ORIGIN is not wildcard"
fi

# Check HTTPS in URLs
if [ -n "${FRONTEND_URL:-}" ]; then
  if echo "$FRONTEND_URL" | grep -q "^https://"; then
    pass "FRONTEND_URL uses HTTPS"
  else
    warn "FRONTEND_URL does not use HTTPS — recommended for production"
  fi
fi

# --------------------------------------------------------------------------
header "6. Build Verification"
# --------------------------------------------------------------------------

if [ -d "apps/backend-api/dist" ]; then
  pass "Backend build output exists (apps/backend-api/dist)"
else
  warn "Backend not built — run 'pnpm build' before deploying"
fi

if [ -d "apps/web-app/.next" ]; then
  pass "Frontend build output exists (apps/web-app/.next)"
else
  warn "Frontend not built — run 'pnpm build' before deploying"
fi

# Check Prisma client is generated
if [ -d "node_modules/.prisma/client" ] || [ -d "apps/backend-api/node_modules/.prisma/client" ]; then
  pass "Prisma client is generated"
else
  warn "Prisma client not found — run 'npx prisma generate'"
fi

# --------------------------------------------------------------------------
header "7. Observability"
# --------------------------------------------------------------------------

check_var "SENTRY_DSN" false
check_var "LOG_LEVEL" false

info "Metrics endpoint: GET /metrics (Prometheus format)"
info "Health endpoint: GET /healthz"
info "Readiness endpoint: GET /readyz"

# --------------------------------------------------------------------------
# Summary
# --------------------------------------------------------------------------

echo ""
echo "=============================================="
if [ $ERRORS -gt 0 ]; then
  echo -e "  ${RED}RESULT: NOT READY${NC}"
  echo -e "  ${RED}$ERRORS error(s)${NC}, ${YELLOW}$WARNINGS warning(s)${NC}"
  echo ""
  echo "  Fix all errors before deploying to production."
else
  if [ $WARNINGS -gt 0 ]; then
    echo -e "  ${YELLOW}RESULT: READY (with warnings)${NC}"
    echo -e "  ${GREEN}0 errors${NC}, ${YELLOW}$WARNINGS warning(s)${NC}"
  else
    echo -e "  ${GREEN}RESULT: PRODUCTION READY${NC}"
    echo -e "  ${GREEN}All checks passed!${NC}"
  fi
fi
echo "=============================================="
echo ""

exit $ERRORS
