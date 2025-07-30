-- Add CharacterProfile table to track aggregated character development
CREATE TABLE IF NOT EXISTS CharacterProfile (
    Id SERIAL PRIMARY KEY,
    CharacterId INTEGER NOT NULL,
    
    -- Core attributes (0-100 scale)
    Strength INTEGER DEFAULT 10,
    Dexterity INTEGER DEFAULT 10,
    Constitution INTEGER DEFAULT 10,
    Intelligence INTEGER DEFAULT 10,
    Wisdom INTEGER DEFAULT 10,
    Charisma INTEGER DEFAULT 10,
    
    -- Alignment tracking (-100 to 100 scale, where negative is evil, positive is good)
    GoodEvilAxis INTEGER DEFAULT 0,
    
    -- Order vs Chaos (-100 to 100 scale, where negative is chaotic, positive is lawful)
    OrderChaosAxis INTEGER DEFAULT 0,
    
    -- Story preferences (0-100 scale)
    CombatPreference INTEGER DEFAULT 50,
    ExplorationPreference INTEGER DEFAULT 50,
    SocialPreference INTEGER DEFAULT 50,
    PuzzlePreference INTEGER DEFAULT 50,
    
    -- Personality traits (0-100 scale)
    Caution INTEGER DEFAULT 50,
    Bravery INTEGER DEFAULT 50,
    Curiosity INTEGER DEFAULT 50,
    Empathy INTEGER DEFAULT 50,
    
    -- Magic affinity (0-100 scale)
    MagicAffinity INTEGER DEFAULT 0,
    
    -- Experience points for skills
    StrengthExp INTEGER DEFAULT 0,
    DexterityExp INTEGER DEFAULT 0,
    ConstitutionExp INTEGER DEFAULT 0,
    IntelligenceExp INTEGER DEFAULT 0,
    WisdomExp INTEGER DEFAULT 0,
    CharismaExp INTEGER DEFAULT 0,
    
    -- Additional preferences stored as JSONB for flexibility
    AdditionalTraits JSONB DEFAULT '{}'::JSONB,
    
    -- Timestamps
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    FOREIGN KEY (CharacterId) REFERENCES Character (Id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX idx_character_profile_character ON CharacterProfile (CharacterId);

-- Add a view to see combined character and profile data
CREATE OR REPLACE VIEW CharacterWithProfile AS
SELECT 
    c.*,
    cp.Strength,
    cp.Dexterity,
    cp.Constitution,
    cp.Intelligence,
    cp.Wisdom,
    cp.Charisma,
    cp.GoodEvilAxis,
    cp.OrderChaosAxis,
    cp.CombatPreference,
    cp.ExplorationPreference,
    cp.SocialPreference,
    cp.PuzzlePreference,
    cp.Caution,
    cp.Bravery,
    cp.Curiosity,
    cp.Empathy,
    cp.MagicAffinity,
    cp.StrengthExp,
    cp.DexterityExp,
    cp.ConstitutionExp,
    cp.IntelligenceExp,
    cp.WisdomExp,
    cp.CharismaExp,
    cp.AdditionalTraits
FROM 
    Character c
LEFT JOIN 
    CharacterProfile cp ON c.Id = cp.CharacterId;
