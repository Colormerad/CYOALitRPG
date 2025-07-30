-- Create Class table
CREATE TABLE IF NOT EXISTS Class (
    Id SERIAL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Description TEXT NOT NULL,
    StrengthBonus INTEGER NOT NULL,
    DexterityBonus INTEGER NOT NULL,
    ConstitutionBonus INTEGER NOT NULL,
    IntelligenceBonus INTEGER NOT NULL,
    WisdomBonus INTEGER NOT NULL,
    CharismaBonus INTEGER NOT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Outfit table
CREATE TABLE IF NOT EXISTS ClassOutfit (
    Id SERIAL PRIMARY KEY,
    ClassId INTEGER NOT NULL,
    Description TEXT NOT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ClassId) REFERENCES Class (Id) ON DELETE CASCADE
);

-- Create StartingEquipment table
CREATE TABLE IF NOT EXISTS ClassStartingEquipment (
    Id SERIAL PRIMARY KEY,
    ClassId INTEGER NOT NULL,
    Description TEXT NOT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ClassId) REFERENCES Class (Id) ON DELETE CASCADE
);

-- Add ClassId column to Character table
ALTER TABLE Character ADD COLUMN ClassId INTEGER;
ALTER TABLE Character ADD CONSTRAINT fk_character_class FOREIGN KEY (ClassId) REFERENCES Class (Id);

-- Create unique index on Class name
CREATE UNIQUE INDEX idx_class_name ON Class (Name);
