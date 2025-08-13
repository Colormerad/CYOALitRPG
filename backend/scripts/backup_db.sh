#!/usr/bin/env bash
set -euo pipefail

# Portable PostgreSQL backup script for this project.
# Creates a timestamped dump in backend/backups/
#
# Usage:
#   backend/scripts/backup_db.sh
#
# Connection settings (override via env):
: "${PGUSER:=cyoa_user}"
: "${PGHOST:=localhost}"
: "${PGPORT:=5432}"
: "${PGDATABASE:=cyoa_litrpg}"

BACKUP_DIR="$(cd "$(dirname "$0")/.." && pwd)/backups"
mkdir -p "$BACKUP_DIR"
TS="$(date +%Y%m%d_%H%M%S)"
BASENAME="${PGDATABASE}_${TS}"

# Locate pg_dump (search PATH and common macOS locations)
PG_DUMP_BIN="${PG_DUMP_BIN:-}"
if ! command -v pg_dump >/dev/null 2>&1; then
  for cand in \
    "/opt/homebrew/opt/libpq/bin/pg_dump" \
    "/usr/local/opt/libpq/bin/pg_dump" \
    "/Applications/Postgres.app/Contents/Versions/latest/bin/pg_dump" \
    "/Library/PostgreSQL/16/bin/pg_dump" \
    "/Library/PostgreSQL/15/bin/pg_dump" \
    "/Library/PostgreSQL/14/bin/pg_dump"; do
    if [ -x "$cand" ]; then PG_DUMP_BIN="$cand"; break; fi
  done
else
  PG_DUMP_BIN="$(command -v pg_dump)"
fi

if [ -z "$PG_DUMP_BIN" ]; then
  echo "[backup] Error: pg_dump not found. Install one of the following or export PG_DUMP_BIN to its path:" >&2
  echo "  - brew install libpq && echo 'export PATH=\"$(brew --prefix)/opt/libpq/bin:$PATH\"' >> ~/.zshrc" >&2
  echo "  - Install Postgres.app and add: /Applications/Postgres.app/Contents/Versions/latest/bin to PATH" >&2
  echo "  - Or specify: PG_DUMP_BIN=/full/path/to/pg_dump backend/scripts/backup_db.sh" >&2
  exit 127
fi

# Custom format (recommended)
OUT_DUMP="$BACKUP_DIR/${BASENAME}.dump"
# Plain SQL for easy diff
OUT_SQL="$BACKUP_DIR/${BASENAME}.sql"

echo "[backup] Dumping ${PGDATABASE} to ${OUT_DUMP} (custom) and ${OUT_SQL} (plain)"
"$PG_DUMP_BIN" -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -Fc -f "$OUT_DUMP"
"$PG_DUMP_BIN" -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -f "$OUT_SQL"

echo "[backup] Done. Files:"
echo "  - $OUT_DUMP"
echo "  - $OUT_SQL"
