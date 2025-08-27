-- Migration: Add icon_key column to character table (idempotent)
-- Date: 2025-08-27
-- Safely adds the column only if it does not already exist.

BEGIN;

ALTER TABLE "character"
  ADD COLUMN IF NOT EXISTS icon_key TEXT;

COMMIT;
