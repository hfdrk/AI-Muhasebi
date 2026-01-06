#!/bin/bash
# Database Backup Script
# 
# This script creates a backup of the PostgreSQL database.
# Usage: ./backup.sh [backup_directory] [retention_days]
#
# Environment variables:
#   DATABASE_URL - PostgreSQL connection string
#   BACKUP_DIR - Directory to store backups (default: ./backups)
#   RETENTION_DAYS - Number of days to keep backups (default: 30)

set -euo pipefail

# Configuration
BACKUP_DIR="${1:-${BACKUP_DIR:-./backups}}"
RETENTION_DAYS="${2:-${RETENTION_DAYS:-30}}"
DATABASE_URL="${DATABASE_URL:-}"

# Validate DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL environment variable is not set"
  exit 1
fi

# Extract database name from DATABASE_URL
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
if [ -z "$DB_NAME" ]; then
  echo "Error: Could not extract database name from DATABASE_URL"
  exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

echo "Creating backup of database: $DB_NAME"
echo "Backup file: $BACKUP_FILE"

# Create backup using pg_dump
if echo "$DATABASE_URL" | grep -q "@"; then
  # Parse connection string
  # Format: postgresql://user:password@host:port/database
  DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
  DB_PASS=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
  DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
  DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*@[^:]*:\([^/]*\)\/.*/\1/p' || echo "5432")
  
  export PGPASSWORD="$DB_PASS"
  pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --no-owner --no-acl --clean --if-exists | gzip > "$BACKUP_FILE"
  unset PGPASSWORD
else
  # Use DATABASE_URL directly
  pg_dump "$DATABASE_URL" --no-owner --no-acl --clean --if-exists | gzip > "$BACKUP_FILE"
fi

# Check if backup was successful
if [ $? -eq 0 ] && [ -f "$BACKUP_FILE" ]; then
  BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "✅ Backup created successfully: $BACKUP_FILE ($BACKUP_SIZE)"
  
  # Clean up old backups
  echo "Cleaning up backups older than $RETENTION_DAYS days..."
  find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
  echo "✅ Cleanup complete"
  
  exit 0
else
  echo "❌ Backup failed"
  exit 1
fi
