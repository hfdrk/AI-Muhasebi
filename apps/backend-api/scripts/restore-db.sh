#!/bin/bash
#
# PostgreSQL Database Restore Script
#
# Usage:
#   ./restore-db.sh /path/to/backup.sql.gz
#   ./restore-db.sh latest                      # Restore most recent backup
#
# Environment variables:
#   DATABASE_URL       - PostgreSQL connection string (required)
#   BACKUP_DIR         - Local backup directory (default: ./backups)
#

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_FILE="${1:-}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL environment variable is required"
  exit 1
fi

# Find backup file
if [ "${BACKUP_FILE}" = "latest" ] || [ -z "${BACKUP_FILE}" ]; then
  BACKUP_FILE=$(ls -t "${BACKUP_DIR}"/ai_muhasebi_*.sql.gz 2>/dev/null | head -1)
  if [ -z "${BACKUP_FILE}" ]; then
    echo "ERROR: No backup files found in ${BACKUP_DIR}"
    exit 1
  fi
  echo "Using latest backup: ${BACKUP_FILE}"
fi

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "ERROR: Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo ""
echo "WARNING: This will REPLACE the current database with backup data!"
echo "  Backup file: ${BACKUP_FILE} (${BACKUP_SIZE})"
echo "  Database:    ${DATABASE_URL//:*@/:****@}"
echo ""
read -p "Type 'RESTORE' to confirm: " CONFIRM

if [ "${CONFIRM}" != "RESTORE" ]; then
  echo "Cancelled."
  exit 0
fi

echo "[$(date)] Starting database restore..."

pg_restore \
  --dbname="${DATABASE_URL}" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --exit-on-error \
  "${BACKUP_FILE}"

echo "[$(date)] Database restore complete."
