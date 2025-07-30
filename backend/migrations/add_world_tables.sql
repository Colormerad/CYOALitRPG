-- Create World table
CREATE TABLE IF NOT EXISTS World (
    Id SERIAL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Description TEXT NOT NULL,
    DimensionsX INTEGER NOT NULL,
    DimensionsY INTEGER NOT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Region table
CREATE TABLE IF NOT EXISTS Region (
    Id SERIAL PRIMARY KEY,
    WorldId INTEGER NOT NULL,
    Name VARCHAR(100) NOT NULL,
    XRangeStart INTEGER NOT NULL,
    XRangeEnd INTEGER NOT NULL,
    YRangeStart INTEGER NOT NULL,
    YRangeEnd INTEGER NOT NULL,
    Features JSONB DEFAULT '[]'::JSONB, -- Array of features
    TravelModifier FLOAT NOT NULL DEFAULT 1.0,
    EncounterRate FLOAT NOT NULL DEFAULT 0.5,
    MagicLevel VARCHAR(50) NOT NULL DEFAULT 'medium',
    FactionBias JSONB DEFAULT '[]'::JSONB, -- Array of faction names
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (WorldId) REFERENCES World (Id) ON DELETE CASCADE
);

-- Create City/Location table
CREATE TABLE IF NOT EXISTS Location (
    Id SERIAL PRIMARY KEY,
    WorldId INTEGER NOT NULL,
    Name VARCHAR(100) NOT NULL,
    Type VARCHAR(100) NOT NULL,
    CoordinateX INTEGER NOT NULL,
    CoordinateY INTEGER NOT NULL,
    RegionName VARCHAR(100), -- Reference to the region name
    Terrain VARCHAR(100),
    FactionsPresent JSONB DEFAULT '[]'::JSONB, -- Array of faction names
    Hooks JSONB DEFAULT '[]'::JSONB, -- Array of adventure hooks
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (WorldId) REFERENCES World (Id) ON DELETE CASCADE
);

-- Create Faction table
CREATE TABLE IF NOT EXISTS Faction (
    Id SERIAL PRIMARY KEY,
    WorldId INTEGER NOT NULL,
    Name VARCHAR(100) NOT NULL,
    Type VARCHAR(100) NOT NULL,
    Ideology TEXT,
    ZonesOfInfluence JSONB DEFAULT '[]'::JSONB, -- Array of coordinate pairs
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (WorldId) REFERENCES World (Id) ON DELETE CASCADE
);

-- Create indexes for faster lookups
CREATE INDEX idx_region_world ON Region (WorldId);
CREATE INDEX idx_location_world ON Location (WorldId);
CREATE INDEX idx_faction_world ON Faction (WorldId);
CREATE INDEX idx_region_coordinates ON Region (XRangeStart, XRangeEnd, YRangeStart, YRangeEnd);
CREATE INDEX idx_location_coordinates ON Location (CoordinateX, CoordinateY);

-- Add WorldId and LocationId columns to Character table for tracking character position
ALTER TABLE Character ADD COLUMN WorldId INTEGER;
ALTER TABLE Character ADD COLUMN LocationId INTEGER;
ALTER TABLE Character ADD COLUMN CoordinateX INTEGER;
ALTER TABLE Character ADD COLUMN CoordinateY INTEGER;

-- Add foreign key constraints
ALTER TABLE Character ADD CONSTRAINT fk_character_world FOREIGN KEY (WorldId) REFERENCES World (Id);
ALTER TABLE Character ADD CONSTRAINT fk_character_location FOREIGN KEY (LocationId) REFERENCES Location (Id);

-- Create a function to get region by coordinates
CREATE OR REPLACE FUNCTION get_region_by_coordinates(world_id INTEGER, x INTEGER, y INTEGER)
RETURNS INTEGER AS $$
DECLARE
    region_id INTEGER;
BEGIN
    SELECT Id INTO region_id FROM Region 
    WHERE WorldId = world_id 
    AND x BETWEEN XRangeStart AND XRangeEnd 
    AND y BETWEEN YRangeStart AND YRangeEnd 
    LIMIT 1;
    
    RETURN region_id;
END;
$$ LANGUAGE plpgsql;

-- Create unique index on World name
CREATE UNIQUE INDEX idx_world_name ON World (Name);
CREATE UNIQUE INDEX idx_faction_name_world ON Faction (WorldId, Name);
