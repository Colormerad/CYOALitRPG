-- Add is_dead column to Character table
ALTER TABLE "Character" ADD COLUMN is_dead BOOLEAN NOT NULL DEFAULT FALSE;

-- Update existing records to set is_dead to false
UPDATE "Character" SET is_dead = FALSE;
