-- Create StoryNode table
CREATE TABLE IF NOT EXISTS StoryNode (
    Id SERIAL PRIMARY KEY,
    Title VARCHAR(100) NOT NULL,
    Content TEXT NOT NULL,
    NodeType VARCHAR(50) NOT NULL DEFAULT 'standard', -- standard, choice, ending, etc.
    RequiresInput BOOLEAN DEFAULT FALSE,
    InputType VARCHAR(50) DEFAULT NULL, -- text, numeric, etc.
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create StoryChoice table
CREATE TABLE IF NOT EXISTS StoryChoice (
    Id SERIAL PRIMARY KEY,
    StoryNodeId INTEGER NOT NULL,
    ChoiceText TEXT NOT NULL,
    NextNodeId INTEGER,
    MetadataImpact JSONB DEFAULT NULL, -- Store metadata changes as JSON
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (StoryNodeId) REFERENCES StoryNode (Id) ON DELETE CASCADE,
    FOREIGN KEY (NextNodeId) REFERENCES StoryNode (Id) ON DELETE SET NULL
);

-- Create PlayerProgress table to track story progress
CREATE TABLE IF NOT EXISTS PlayerProgress (
    Id SERIAL PRIMARY KEY,
    CharacterId INTEGER NOT NULL,
    CurrentNodeId INTEGER NOT NULL,
    ChoiceHistory JSONB DEFAULT '[]'::JSONB, -- Array of choice IDs made
    Metadata JSONB DEFAULT '{}'::JSONB, -- Player metadata affected by choices
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (CharacterId) REFERENCES Character (Id) ON DELETE CASCADE,
    FOREIGN KEY (CurrentNodeId) REFERENCES StoryNode (Id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX idx_player_progress_character ON PlayerProgress (CharacterId);
CREATE INDEX idx_story_choice_node ON StoryChoice (StoryNodeId);
