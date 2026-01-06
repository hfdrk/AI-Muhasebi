#!/bin/bash
# Database Migration Script
# 
# This script runs database migrations for production deployments.
# Usage: ./migrate.sh [environment]
#
# Environment variables:
#   DATABASE_URL - PostgreSQL connection string
#   NODE_ENV - Environment (production, staging, development)

set -euo pipefail

ENVIRONMENT="${1:-${NODE_ENV:-production}}"

echo "Running database migrations for environment: $ENVIRONMENT"

# Validate DATABASE_URL
if [ -z "${DATABASE_URL:-}" ]; then
  echo "Error: DATABASE_URL environment variable is not set"
  exit 1
fi

# Change to backend-api directory
cd "$(dirname "$0")/../../apps/backend-api" || exit 1

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  pnpm install --frozen-lockfile
fi

# Run migrations
echo "Applying database migrations..."
pnpm db:migrate:deploy

if [ $? -eq 0 ]; then
  echo "✅ Migrations applied successfully"
  
  # Verify database connection
  echo "Verifying database connection..."
  if pnpm exec prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Database connection verified"
  else
    echo "⚠️  Warning: Could not verify database connection"
  fi
  
  exit 0
else
  echo "❌ Migration failed"
  exit 1
fi
