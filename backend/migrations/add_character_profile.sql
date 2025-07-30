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
    cp.AdditionalTraits
FROM 
    Character c
LEFT JOIN 
    CharacterProfile cp ON c.Id = cp.CharacterId;

-- Add a function to update character profile based on choice metadata impact
CREATE OR REPLACE FUNCTION update_character_profile()
RETURNS TRIGGER AS 
$BODY$
DECLARE
    metadata_impact JSONB;
    character_id INTEGER;
BEGIN
    -- Get the metadata impact from the new progress record
    metadata_impact := NEW.Metadata;
    character_id := NEW.CharacterId;
    
    -- Create profile if it doesn't exist
    INSERT INTO CharacterProfile (CharacterId)
    VALUES (character_id)
    ON CONFLICT (CharacterId) DO NOTHING;
    
    -- Update specific attributes based on metadata impact
    -- Strength
    IF metadata_impact ? 'strength' THEN
        UPDATE CharacterProfile 
        SET Strength = GREATEST(0, LEAST(100, Strength + (metadata_impact->>'strength')::INTEGER)),
            UpdatedAt = CURRENT_TIMESTAMP
        WHERE CharacterId = character_id;
    END IF;
    
    -- Dexterity
    IF metadata_impact ? 'dexterity' THEN
        UPDATE CharacterProfile 
        SET Dexterity = GREATEST(0, LEAST(100, Dexterity + (metadata_impact->>'dexterity')::INTEGER)),
            UpdatedAt = CURRENT_TIMESTAMP
        WHERE CharacterId = character_id;
    END IF;
    
    -- Constitution
    IF metadata_impact ? 'constitution' THEN
        UPDATE CharacterProfile 
        SET Constitution = GREATEST(0, LEAST(100, Constitution + (metadata_impact->>'constitution')::INTEGER)),
            UpdatedAt = CURRENT_TIMESTAMP
        WHERE CharacterId = character_id;
    END IF;
    
    -- Intelligence
    IF metadata_impact ? 'intelligence' THEN
        UPDATE CharacterProfile 
        SET Intelligence = GREATEST(0, LEAST(100, Intelligence + (metadata_impact->>'intelligence')::INTEGER)),
            UpdatedAt = CURRENT_TIMESTAMP
        WHERE CharacterId = character_id;
    END IF;
    
    -- Wisdom
    IF metadata_impact ? 'wisdom' THEN
        UPDATE CharacterProfile 
        SET Wisdom = GREATEST(0, LEAST(100, Wisdom + (metadata_impact->>'wisdom')::INTEGER)),
            UpdatedAt = CURRENT_TIMESTAMP
        WHERE CharacterId = character_id;
    END IF;
    
    -- Charisma
    IF metadata_impact ? 'charisma' THEN
        UPDATE CharacterProfile 
        SET Charisma = GREATEST(0, LEAST(100, Charisma + (metadata_impact->>'charisma')::INTEGER)),
            UpdatedAt = CURRENT_TIMESTAMP
        WHERE CharacterId = character_id;
    END IF;
    
    -- Alignment: Good/Evil
    IF metadata_impact ? 'good_evil' THEN
        UPDATE CharacterProfile 
        SET GoodEvilAxis = GREATEST(-100, LEAST(100, GoodEvilAxis + (metadata_impact->>'good_evil')::INTEGER)),
            UpdatedAt = CURRENT_TIMESTAMP
        WHERE CharacterId = character_id;
    END IF;
    
    -- Alignment: Order/Chaos
    IF metadata_impact ? 'order_chaos' THEN
        UPDATE CharacterProfile 
        SET OrderChaosAxis = GREATEST(-100, LEAST(100, OrderChaosAxis + (metadata_impact->>'order_chaos')::INTEGER)),
            UpdatedAt = CURRENT_TIMESTAMP
        WHERE CharacterId = character_id;
    END IF;
    
    -- Story preferences
    IF metadata_impact ? 'combat_preference' THEN
        UPDATE CharacterProfile 
        SET CombatPreference = GREATEST(0, LEAST(100, CombatPreference + (metadata_impact->>'combat_preference')::INTEGER)),
            UpdatedAt = CURRENT_TIMESTAMP
        WHERE CharacterId = character_id;
    END IF;
    
    IF metadata_impact ? 'exploration_preference' THEN
        UPDATE CharacterProfile 
        SET ExplorationPreference = GREATEST(0, LEAST(100, ExplorationPreference + (metadata_impact->>'exploration_preference')::INTEGER)),
            UpdatedAt = CURRENT_TIMESTAMP
        WHERE CharacterId = character_id;
    END IF;
    
    IF metadata_impact ? 'social_preference' THEN
        UPDATE CharacterProfile 
        SET SocialPreference = GREATEST(0, LEAST(100, SocialPreference + (metadata_impact->>'social_preference')::INTEGER)),
            UpdatedAt = CURRENT_TIMESTAMP
        WHERE CharacterId = character_id;
    END IF;
    
    IF metadata_impact ? 'puzzle_preference' THEN
        UPDATE CharacterProfile 
        SET PuzzlePreference = GREATEST(0, LEAST(100, PuzzlePreference + (metadata_impact->>'puzzle_preference')::INTEGER)),
            UpdatedAt = CURRENT_TIMESTAMP
        WHERE CharacterId = character_id;
    END IF;
    
    -- Personality traits
    IF metadata_impact ? 'caution' THEN
        UPDATE CharacterProfile 
        SET Caution = GREATEST(0, LEAST(100, Caution + (metadata_impact->>'caution')::INTEGER)),
            UpdatedAt = CURRENT_TIMESTAMP
        WHERE CharacterId = character_id;
    END IF;
    
    IF metadata_impact ? 'bravery' THEN
        UPDATE CharacterProfile 
        SET Bravery = GREATEST(0, LEAST(100, Bravery + (metadata_impact->>'bravery')::INTEGER)),
            UpdatedAt = CURRENT_TIMESTAMP
        WHERE CharacterId = character_id;
    END IF;
    
    IF metadata_impact ? 'curiosity' THEN
        UPDATE CharacterProfile 
        SET Curiosity = GREATEST(0, LEAST(100, Curiosity + (metadata_impact->>'curiosity')::INTEGER)),
            UpdatedAt = CURRENT_TIMESTAMP
        WHERE CharacterId = character_id;
    END IF;
    
    IF metadata_impact ? 'empathy' THEN
        UPDATE CharacterProfile 
        SET Empathy = GREATEST(0, LEAST(100, Empathy + (metadata_impact->>'empathy')::INTEGER)),
            UpdatedAt = CURRENT_TIMESTAMP
        WHERE CharacterId = character_id;
    END IF;
    
    -- Magic affinity
    IF metadata_impact ? 'magic_affinity' THEN
        UPDATE CharacterProfile 
        SET MagicAffinity = GREATEST(0, LEAST(100, MagicAffinity + (metadata_impact->>'magic_affinity')::INTEGER)),
            UpdatedAt = CURRENT_TIMESTAMP
        WHERE CharacterId = character_id;
    END IF;
    
    -- For any other traits, store them in the AdditionalTraits JSONB field
    -- This allows for flexible addition of new traits without schema changes
    UPDATE CharacterProfile
    SET AdditionalTraits = AdditionalTraits || 
        (SELECT jsonb_object_agg(key, value) 
         FROM jsonb_each(metadata_impact) 
         WHERE key NOT IN (
            'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma',
            'good_evil', 'order_chaos', 'combat_preference', 'exploration_preference',
            'social_preference', 'puzzle_preference', 'caution', 'bravery', 'curiosity',
            'empathy', 'magic_affinity'
         )),
    UpdatedAt = CURRENT_TIMESTAMP
    WHERE CharacterId = character_id;
    
    RETURN NEW;
END;
$BODY$ LANGUAGE plpgsql;

-- Create a trigger to update character profile when player progress is updated
CREATE TRIGGER update_profile_on_progress_change
AFTER UPDATE OF Metadata ON PlayerProgress
FOR EACH ROW
EXECUTE FUNCTION update_character_profile();

-- Also trigger on insert
CREATE TRIGGER update_profile_on_progress_insert
AFTER INSERT ON PlayerProgress
FOR EACH ROW
EXECUTE FUNCTION update_character_profile();
