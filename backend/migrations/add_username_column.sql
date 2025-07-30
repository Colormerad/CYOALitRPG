-- Add username column to Account table
ALTER TABLE Account ADD COLUMN Username VARCHAR(50);

-- Update existing accounts with default usernames
UPDATE Account SET Username = 'Player' || Id WHERE Username IS NULL;

-- Add unique constraint to username column
ALTER TABLE Account ADD CONSTRAINT unique_username UNIQUE (Username);
