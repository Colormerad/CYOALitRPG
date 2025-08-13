#!/usr/bin/env bash
set -euo pipefail

# Restore a PostgreSQL database from a backup created by backup_db.sh
#
# Usage:
#   backend/scripts/restore_db.sh [TARGET_DB] [BACKUP_FILE]
#
# If TARGET_DB is omitted, uses $PGDATABASE. If BACKUP_FILE is omitted, uses the newest file in backend/backups/.
# Set DROP=1 to drop TARGET_DB before recreating it.
#
# Connection settings (override via env):
: "${PGUSER:=cyoa_user}"
: "${PGHOST:=localhost}"
: "${PGPORT:=5432}"
: "${PGDATABASE:=cyoa_litrpg}"

BACKUP_DIR="$(cd "$(dirname "$0")/.." && pwd)/backups"
TARGET_DB="${1:-$PGDATABASE}"
BACKUP_FILE="${2:-}"

if [[ -z "${BACKUP_FILE}" ]]; then
  # pick latest .dump or .sql
  if compgen -G "$BACKUP_DIR/*.dump" > /dev/null; then
    BACKUP_FILE=$(ls -t "$BACKUP_DIR"/*.dump | head -n1)
  elif compgen -G "$BACKUP_DIR/*.sql" > /dev/null; then
    BACKUP_FILE=$(ls -t "$BACKUP_DIR"/*.sql | head -n1)
  else
    echo "[restore] No backup files found in $BACKUP_DIR" >&2
    exit 1
  fi
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "[restore] Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

EXT="${BACKUP_FILE##*.}"

echo "[restore] Restoring to database: ${TARGET_DB} from ${BACKUP_FILE}"

# ensure we can connect to postgres maintenance db
MAINT_DB="postgres"

# optionally drop
if [[ "${DROP:-0}" == "1" ]]; then
  echo "[restore] Dropping existing DB ${TARGET_DB} (if exists)"
  psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$MAINT_DB" -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${TARGET_DB}' AND pid <> pg_backend_pid();" || true
  psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$MAINT_DB" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"${TARGET_DB}\";"
fi

# create if not exists
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$MAINT_DB" -v ON_ERROR_STOP=1 -tc "SELECT 1 FROM pg_database WHERE datname='${TARGET_DB}'" | grep -q 1 || \
  psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$MAINT_DB" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"${TARGET_DB}\" WITH TEMPLATE=template0 ENCODING='UTF8';"

if [[ "$EXT" == "dump" ]]; then
  echo "[restore] Using pg_restore (custom format)"
  pg_restore -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$TARGET_DB" --no-owner --no-privileges "$BACKUP_FILE"
else
  echo "[restore] Using psql (plain SQL)"
  psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$TARGET_DB" -v ON_ERROR_STOP=1 -f "$BACKUP_FILE"
fi

echo "[restore] Done."
