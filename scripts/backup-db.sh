#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────────
# Memorica Database Backup
# Usage: ./scripts/backup-db.sh [backup-dir]
# ──────────────────────────────────────────────────────────────────────────────

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/memorica_$TIMESTAMP.sql.gz"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-30}"

# Source DB credentials from .env
if [ -f .env ]; then
    set -a; source .env; set +a
fi

DB_URL="${DB_URL:-jdbc:postgresql://localhost:5432/memorica}"
DB_USER="${DB_USERNAME:-memorica}"
DB_PASS="${DB_PASSWORD:-}"

# Extract host, port, db from JDBC URL
DB_HOST=$(echo "$DB_URL" | sed -n 's|.*://\([^:/]*\).*|\1|p')
DB_PORT=$(echo "$DB_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
DB_NAME=$(echo "$DB_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-memorica}"

mkdir -p "$BACKUP_DIR"

echo "Backing up $DB_NAME@$DB_HOST:$DB_PORT → $BACKUP_FILE"

PGPASSWORD="$DB_PASS" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-owner --no-acl \
    | gzip > "$BACKUP_FILE"

echo "Backup complete: $(du -h "$BACKUP_FILE" | cut -f1)"

# Clean up old backups
find "$BACKUP_DIR" -name "memorica_*.sql.gz" -mtime +$KEEP_DAYS -delete 2>/dev/null || true
echo "Retaining backups from last $KEEP_DAYS days."
