#!/bin/bash
#
# PostgreSQL Automated Backup Script
#
# Usage:
#   ./backup-db.sh                       # Backup to default directory
#   ./backup-db.sh /path/to/backups      # Backup to custom directory
#   BACKUP_S3_BUCKET=my-bucket ./backup-db.sh  # Upload to S3
#
# Environment variables:
#   DATABASE_URL       - PostgreSQL connection string (required)
#   BACKUP_DIR         - Local backup directory (default: ./backups)
#   BACKUP_RETENTION   - Days to keep local backups (default: 30)
#   BACKUP_S3_BUCKET   - S3 bucket for offsite backups (optional)
#   BACKUP_S3_PREFIX   - S3 key prefix (default: db-backups/)
#

set -euo pipefail

# Configuration
BACKUP_DIR="${1:-${BACKUP_DIR:-./backups}}"
RETENTION_DAYS="${BACKUP_RETENTION:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="ai_muhasebi_${TIMESTAMP}.sql.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

# Parse DATABASE_URL if set
if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL environment variable is required"
  exit 1
fi

echo "[$(date)] Starting database backup..."

# Run pg_dump with compression
pg_dump "${DATABASE_URL}" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --format=custom \
  --compress=9 \
  --file="${BACKUP_PATH}"

BACKUP_SIZE=$(du -h "${BACKUP_PATH}" | cut -f1)
echo "[$(date)] Backup created: ${BACKUP_FILE} (${BACKUP_SIZE})"

# Upload to S3 if configured
if [ -n "${BACKUP_S3_BUCKET:-}" ]; then
  S3_PREFIX="${BACKUP_S3_PREFIX:-db-backups/}"
  S3_PATH="s3://${BACKUP_S3_BUCKET}/${S3_PREFIX}${BACKUP_FILE}"

  echo "[$(date)] Uploading to S3: ${S3_PATH}"
  aws s3 cp "${BACKUP_PATH}" "${S3_PATH}" --storage-class STANDARD_IA

  echo "[$(date)] S3 upload complete"

  # Clean old S3 backups (keep last 90 days)
  aws s3 ls "s3://${BACKUP_S3_BUCKET}/${S3_PREFIX}" \
    | awk '{print $4}' \
    | head -n -90 \
    | while read -r old_file; do
        if [ -n "${old_file}" ]; then
          aws s3 rm "s3://${BACKUP_S3_BUCKET}/${S3_PREFIX}${old_file}"
          echo "[$(date)] Deleted old S3 backup: ${old_file}"
        fi
      done
fi

# Remove old local backups
echo "[$(date)] Cleaning local backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "ai_muhasebi_*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete 2>/dev/null || true

# Count remaining backups
LOCAL_COUNT=$(find "${BACKUP_DIR}" -name "ai_muhasebi_*.sql.gz" | wc -l)
echo "[$(date)] Backup complete. ${LOCAL_COUNT} local backup(s) retained."
