#!/bin/bash
# SuperSync Server Backup Script
#
# Usage:
#   ./scripts/backup.sh [--upload]
#
# This script:
#   1. Creates a PostgreSQL dump
#   2. Compresses it with gzip
#   3. Optionally uploads to remote storage (requires rclone)
#   4. Cleans up old backups (keeps 14 days)
#
# Options:
#   --upload    Upload to remote storage via rclone
#
# Setup for cron (daily at 3 AM):
#   (crontab -l; echo "0 3 * * * /opt/supersync/packages/super-sync-server/scripts/backup.sh") | crontab -
#
# Rclone setup for offsite backup:
#   1. Install: curl https://rclone.org/install.sh | sudo bash
#   2. Configure: rclone config (follow prompts for B2/S3)
#   3. Set RCLONE_REMOTE below

set -eo pipefail
# The full dump is the whole database and the accounts dump is users + passkeys — password
# hashes and passkey credentials. Under root cron the default umask is 022, so without this
# both land 0644 and every local account on the host can read them.
umask 077

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-$SERVER_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

# Rclone remote name (e.g., "b2:supersync-backups" or "s3:my-bucket/supersync")
RCLONE_REMOTE="${RCLONE_REMOTE:-}"

# Identifies the dump's session in pg_stat_activity. health-alert.sh exempts exactly this
# name from its long-query check: a full dump legitimately runs for hours and would
# otherwise page every night, on a schedule, forever. It is NOT exempt from the pool-busy
# check, so a dump that actually starves the server still alerts, and the exemption expires
# after 6h so a WEDGED dump still pages. Keep it in sync with the `pageable` expression in
# scripts/health-alert.sh.
BACKUP_APPLICATION_NAME="supersync-backup"

# Every dump goes through here, so a new dump site cannot forget the session stamp that
# the health check's exemption keys on.
run_pg_dump() {
  docker exec -e PGAPPNAME="$BACKUP_APPLICATION_NAME" "$DB_CONTAINER" \
    pg_dump -U "$DB_USER" "$DB_NAME" "$@"
}

# Database container name
DB_CONTAINER="${DB_CONTAINER:-supersync-postgres}"
DB_USER="${POSTGRES_USER:-supersync}"
DB_NAME="${POSTGRES_DB:-supersync}"

# Parse arguments
UPLOAD=false
if [ "$1" = "--upload" ]; then
    UPLOAD=true
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"
# Fixes a directory created before the umask above.
chmod 700 "$BACKUP_DIR"

# Generate filename with timestamp
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/supersync_$DATE.sql.gz"

echo "==> SuperSync Backup"
echo "    Date: $DATE"
echo "    Output: $BACKUP_FILE"
echo ""

# Step 1: Create full PostgreSQL dump
echo "==> Creating full database dump..."
run_pg_dump | gzip > "$BACKUP_FILE"

# Get file size
SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "    Full backup size: $SIZE"

# Step 1b: Create minimal accounts-only dump (users + passkeys)
# This is tiny and sufficient for disaster recovery when clients still have data.
# Recovery: restore accounts, wipe sync data, let clients re-upload.
ACCOUNTS_FILE="$BACKUP_DIR/supersync_accounts_$DATE.sql.gz"
echo ""
echo "==> Creating accounts-only dump (users + passkeys)..."
run_pg_dump --table=users --table=passkeys | gzip > "$ACCOUNTS_FILE"

ACCOUNTS_SIZE=$(du -h "$ACCOUNTS_FILE" | cut -f1)
echo "    Accounts backup size: $ACCOUNTS_SIZE"

# Step 2: Upload to remote (if enabled)
if [ "$UPLOAD" = true ]; then
    if [ -z "$RCLONE_REMOTE" ]; then
        echo ""
        echo "Warning: --upload specified but RCLONE_REMOTE not set"
        echo "    Set RCLONE_REMOTE environment variable to enable uploads"
    elif command -v rclone &> /dev/null; then
        echo ""
        echo "==> Uploading to $RCLONE_REMOTE..."
        rclone copy "$BACKUP_FILE" "$RCLONE_REMOTE/"
        rclone copy "$ACCOUNTS_FILE" "$RCLONE_REMOTE/"
        echo "    Upload complete"
    else
        echo ""
        echo "Warning: rclone not installed, skipping upload"
        echo "    Install with: curl https://rclone.org/install.sh | sudo bash"
    fi
fi

# Step 3: Clean up old backups
echo ""
echo "==> Cleaning up backups older than $RETENTION_DAYS days..."
DELETED=$(find "$BACKUP_DIR" \( -name "supersync_*.sql.gz" -o -name "supersync_accounts_*.sql.gz" \) -mtime +"$RETENTION_DAYS" -delete -print | wc -l)
echo "    Deleted $DELETED old backup(s)"

# List current backups
echo ""
echo "==> Current backups:"
ls -lh "$BACKUP_DIR"/supersync_*.sql.gz "$BACKUP_DIR"/supersync_accounts_*.sql.gz 2>/dev/null | tail -10 || echo "    (none)"

echo ""
echo "==> Backup complete:"
echo "    Full:     $BACKUP_FILE"
echo "    Accounts: $ACCOUNTS_FILE"
