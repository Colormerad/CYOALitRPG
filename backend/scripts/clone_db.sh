#!/usr/bin/env bash
set -euo pipefail

# Clone the current database to a new database name.
# This will create a compressed dump and restore it into the target DB.
#
# Usage:
#   backend/scripts/clone_db.sh NEW_DB_NAME
# Env:
#   PGUSER, PGHOST, PGPORT, PGDATABASE (source DB; defaults provided)
#   DROP=1   # optional: drop NEW_DB_NAME if it exists
#
: "${PGUSER:=cyoa_user}"
: "${PGHOST:=localhost}"
: "${PGPORT:=5432}"
: "${PGDATABASE:=cyoa_litrpg}"

NEW_DB="${1:-}"
if [[ -z "$NEW_DB" ]]; then
  echo "Usage: $0 NEW_DB_NAME" >&2
  exit 1
fi

BACKUP_DIR="$(cd "$(dirname "$0")/.." && pwd)/backups"
mkdir -p "$BACKUP_DIR"
TS="$(date +%Y%m%d_%H%M%S)"
DUMP_FILE="$BACKUP_DIR/${PGDATABASE}_to_${NEW_DB}_${TS}.dump"

echo "[clone] Dumping source DB '${PGDATABASE}' -> ${DUMP_FILE}"
pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -Fc -f "$DUMP_FILE"

MAINT_DB=postgres
if [[ "${DROP:-0}" == "1" ]]; then
  echo "[clone] Dropping existing DB ${NEW_DB} (if exists)"
  psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$MAINT_DB" -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${NEW_DB}' AND pid <> pg_backend_pid();" || true
  psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$MAINT_DB" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"${NEW_DB}\";"
fi

# create target DB if not exists
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$MAINT_DB" -v ON_ERROR_STOP=1 -tc "SELECT 1 FROM pg_database WHERE datname='${NEW_DB}'" | grep -q 1 || \
  psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$MAINT_DB" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"${NEW_DB}\" WITH TEMPLATE=template0 ENCODING='UTF8';"

echo "[clone] Restoring into '${NEW_DB}'"
pg_restore -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$NEW_DB" --no-owner --no-privileges "$DUMP_FILE"

echo "[clone] Done. New DB: ${NEW_DB}"
