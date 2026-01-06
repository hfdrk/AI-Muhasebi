#!/bin/bash
# Deployment Script
# 
# This script handles deployment of the application.
# Usage: ./deploy.sh [environment] [action]
#
# Actions:
#   - backup: Create database backup before deployment
#   - migrate: Run database migrations
#   - deploy: Deploy application (requires infrastructure setup)
#   - rollback: Rollback to previous version
#   - verify: Verify deployment health

set -euo pipefail

ENVIRONMENT="${1:-${DEPLOY_ENV:-staging}}"
ACTION="${2:-deploy}"

echo "Deployment script for environment: $ENVIRONMENT"
echo "Action: $ACTION"

# Pre-deployment checks
pre_deployment_checks() {
  echo "Running pre-deployment checks..."
  
  # Check required environment variables
  local required_vars=("DATABASE_URL" "JWT_SECRET")
  for var in "${required_vars[@]}"; do
    if [ -z "${!var:-}" ]; then
      echo "❌ Error: $var environment variable is not set"
      exit 1
    fi
  done
  
  # Verify database connection
  echo "Verifying database connection..."
  cd "$(dirname "$0")/../../apps/backend-api" || exit 1
  if pnpm exec prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Database connection verified"
  else
    echo "❌ Error: Could not connect to database"
    exit 1
  fi
  
  echo "✅ Pre-deployment checks passed"
}

# Create backup
create_backup() {
  echo "Creating database backup..."
  "$(dirname "$0")/backup.sh"
  if [ $? -eq 0 ]; then
    echo "✅ Backup created successfully"
  else
    echo "❌ Backup failed"
    exit 1
  fi
}

# Run migrations
run_migrations() {
  echo "Running database migrations..."
  "$(dirname "$0")/migrate.sh" "$ENVIRONMENT"
  if [ $? -eq 0 ]; then
    echo "✅ Migrations completed successfully"
  else
    echo "❌ Migration failed"
    exit 1
  fi
}

# Deploy application
deploy_app() {
  echo "Deploying application..."
  echo "⚠️  This step should be customized based on your deployment target"
  echo "Examples:"
  echo "  - Kubernetes: kubectl apply -f k8s/"
  echo "  - Docker Compose: docker-compose up -d"
  echo "  - AWS ECS: aws ecs update-service ..."
  echo "  - Railway/Render: Usually handled by Git push"
  
  # Add your deployment logic here
  # For now, this is a placeholder
  echo "✅ Deployment step completed (customize as needed)"
}

# Verify deployment
verify_deployment() {
  echo "Verifying deployment..."
  
  local api_url="${API_URL:-http://localhost:3800}"
  
  # Check health endpoint
  echo "Checking health endpoint..."
  if curl -f -s "${api_url}/healthz" > /dev/null; then
    echo "✅ Health check passed"
  else
    echo "❌ Health check failed"
    exit 1
  fi
  
  # Check readiness endpoint
  echo "Checking readiness endpoint..."
  if curl -f -s "${api_url}/readyz" > /dev/null; then
    echo "✅ Readiness check passed"
  else
    echo "❌ Readiness check failed"
    exit 1
  fi
  
  echo "✅ Deployment verification complete"
}

# Rollback
rollback() {
  echo "Rolling back deployment..."
  echo "⚠️  Rollback logic should be implemented based on your deployment method"
  
  # Example: Restore previous Docker image
  # Example: kubectl rollout undo deployment/backend-api
  # Example: Restore database from backup
  
  echo "✅ Rollback completed (customize as needed)"
}

# Main deployment flow
main() {
  case "$ACTION" in
    backup)
      pre_deployment_checks
      create_backup
      ;;
    migrate)
      pre_deployment_checks
      run_migrations
      ;;
    deploy)
      pre_deployment_checks
      create_backup
      run_migrations
      deploy_app
      sleep 10  # Wait for services to start
      verify_deployment
      ;;
    verify)
      verify_deployment
      ;;
    rollback)
      rollback
      ;;
    *)
      echo "Unknown action: $ACTION"
      echo "Available actions: backup, migrate, deploy, verify, rollback"
      exit 1
      ;;
  esac
}

main
