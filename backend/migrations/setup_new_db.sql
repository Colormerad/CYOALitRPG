-- Migration script to set up a new database with all existing data except users and characters
-- This script assumes:
-- 1. You have already created a new empty database
-- 2. You have connected to that new database
-- 3. The source database is accessible via a database link or can be referenced directly

-- Step 1: Create all tables from the schema

-- Core tables from init.sql
CREATE TABLE Stat (
    Id SERIAL PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    Description TEXT NOT NULL
);

CREATE TABLE SkillCategory (
    Id SERIAL PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    Description TEXT NOT NULL
);

CREATE TABLE Skill (
    Id SERIAL PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    Description TEXT NOT NULL,
    SkillCategoryId INTEGER NOT NULL,
    FOREIGN KEY (SkillCategoryId) REFERENCES SkillCategory(Id)
);

CREATE TABLE SpellCategory (
    Id SERIAL PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    Description TEXT NOT NULL
);

CREATE TABLE Spell (
    Id SERIAL PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    Description TEXT NOT NULL,
    SpellCategoryId INTEGER NOT NULL,
    BaseDamage INTEGER NOT NULL DEFAULT 0,
    DamageType VARCHAR(100) NOT NULL,
    ConditionEffect VARCHAR(255) NOT NULL,
    ChanceToHit FLOAT NOT NULL DEFAULT 1.0,
    TargetType VARCHAR(100) NOT NULL,
    FOREIGN KEY (SpellCategoryId) REFERENCES SpellCategory(Id)
);

CREATE TABLE SpellScaling (
    Id SERIAL PRIMARY KEY,
    SpellId INTEGER NOT NULL,
    StatId INTEGER NOT NULL,
    ScalingFactor FLOAT NOT NULL DEFAULT 0.0,
    FOREIGN KEY (SpellId) REFERENCES Spell(Id),
    FOREIGN KEY (StatId) REFERENCES Stat(Id)
);

CREATE TABLE ItemType (
    Id SERIAL PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    Description TEXT NOT NULL
);

CREATE TABLE Item (
    Id SERIAL PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    Description TEXT NOT NULL,
    ItemTypeId INTEGER NOT NULL,
    RequiredLevel INTEGER NOT NULL DEFAULT 0,
    Value INTEGER NOT NULL DEFAULT 0,
    IsConsumable BOOLEAN NOT NULL DEFAULT FALSE,
    UseDescription TEXT NOT NULL,
    Rarity VARCHAR(100) NOT NULL,
    FOREIGN KEY (ItemTypeId) REFERENCES ItemType(Id)
);

CREATE TABLE ItemStatBonus (
    Id SERIAL PRIMARY KEY,
    ItemId INTEGER NOT NULL,
    StatId INTEGER NOT NULL,
    BonusAmount INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (ItemId) REFERENCES Item(Id),
    FOREIGN KEY (StatId) REFERENCES Stat(Id)
);

CREATE TABLE ItemUseEffect (
    Id SERIAL PRIMARY KEY,
    ItemId INTEGER NOT NULL,
    EffectType VARCHAR(255) NOT NULL,
    StatId INTEGER NOT NULL DEFAULT 0,
    Amount INTEGER NOT NULL DEFAULT 0,
    DurationInTurns INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (ItemId) REFERENCES Item(Id)
);

CREATE TABLE LootTable (
    Id SERIAL PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    Description TEXT NOT NULL
);

CREATE TABLE LootTableEntry (
    Id SERIAL PRIMARY KEY,
    LootTableId INTEGER NOT NULL,
    ItemId INTEGER NOT NULL,
    DropChance FLOAT NOT NULL DEFAULT 1.0,
    MinQuantity INTEGER NOT NULL DEFAULT 1,
    MaxQuantity INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (LootTableId) REFERENCES LootTable(Id),
    FOREIGN KEY (ItemId) REFERENCES Item(Id)
);

CREATE TABLE MonsterType (
    Id SERIAL PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    Description TEXT NOT NULL
);

CREATE TABLE Monster (
    Id SERIAL PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    Description TEXT NOT NULL,
    Level INTEGER NOT NULL DEFAULT 1,
    ExperienceReward INTEGER NOT NULL DEFAULT 0,
    MonsterTypeId INTEGER NOT NULL,
    LootTableId INTEGER NOT NULL,
    FOREIGN KEY (MonsterTypeId) REFERENCES MonsterType(Id),
    FOREIGN KEY (LootTableId) REFERENCES LootTable(Id)
);

CREATE TABLE MonsterStat (
    MonsterId INTEGER NOT NULL,
    StatId INTEGER NOT NULL,
    Value INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (MonsterId, StatId),
    FOREIGN KEY (MonsterId) REFERENCES Monster(Id),
    FOREIGN KEY (StatId) REFERENCES Stat(Id)
);

CREATE TABLE MonsterSkill (
    MonsterId INTEGER NOT NULL,
    SkillId INTEGER NOT NULL,
    Level INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (MonsterId, SkillId),
    FOREIGN KEY (MonsterId) REFERENCES Monster(Id),
    FOREIGN KEY (SkillId) REFERENCES Skill(Id)
);

CREATE TABLE MonsterSpell (
    MonsterId INTEGER NOT NULL,
    SpellId INTEGER NOT NULL,
    PRIMARY KEY (MonsterId, SpellId),
    FOREIGN KEY (MonsterId) REFERENCES Monster(Id),
    FOREIGN KEY (SpellId) REFERENCES Spell(Id)
);

CREATE TABLE MonsterGuaranteedDrop (
    Id SERIAL PRIMARY KEY,
    MonsterId INTEGER NOT NULL,
    ItemId INTEGER NOT NULL,
    MinQuantity INTEGER NOT NULL DEFAULT 1,
    MaxQuantity INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (MonsterId) REFERENCES Monster(Id),
    FOREIGN KEY (ItemId) REFERENCES Item(Id)
);

-- Tables from add_world_tables.sql
CREATE TABLE World (
    Id SERIAL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Description TEXT NOT NULL,
    DimensionsX INTEGER NOT NULL,
    DimensionsY INTEGER NOT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Region (
    Id SERIAL PRIMARY KEY,
    WorldId INTEGER NOT NULL,
    Name VARCHAR(100) NOT NULL,
    XRangeStart INTEGER NOT NULL,
    XRangeEnd INTEGER NOT NULL,
    YRangeStart INTEGER NOT NULL,
    YRangeEnd INTEGER NOT NULL,
    Features JSONB DEFAULT '[]'::JSONB,
    TravelModifier FLOAT NOT NULL DEFAULT 1.0,
    EncounterRate FLOAT NOT NULL DEFAULT 0.5,
    MagicLevel VARCHAR(50) NOT NULL DEFAULT 'medium',
    FactionBias JSONB DEFAULT '[]'::JSONB,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (WorldId) REFERENCES World (Id) ON DELETE CASCADE
);

CREATE TABLE Location (
    Id SERIAL PRIMARY KEY,
    WorldId INTEGER NOT NULL,
    Name VARCHAR(100) NOT NULL,
    Type VARCHAR(100) NOT NULL,
    CoordinateX INTEGER NOT NULL,
    CoordinateY INTEGER NOT NULL,
    RegionName VARCHAR(100),
    Terrain VARCHAR(100),
    FactionsPresent JSONB DEFAULT '[]'::JSONB,
    Hooks JSONB DEFAULT '[]'::JSONB,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (WorldId) REFERENCES World (Id) ON DELETE CASCADE
);

CREATE TABLE Faction (
    Id SERIAL PRIMARY KEY,
    WorldId INTEGER NOT NULL,
    Name VARCHAR(100) NOT NULL,
    Type VARCHAR(100) NOT NULL,
    Ideology TEXT,
    ZonesOfInfluence JSONB DEFAULT '[]'::JSONB,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (WorldId) REFERENCES World (Id) ON DELETE CASCADE
);

-- Tables from add_story_tables.sql
CREATE TABLE StoryNode (
    Id SERIAL PRIMARY KEY,
    Title VARCHAR(100) NOT NULL,
    Content TEXT NOT NULL,
    NodeType VARCHAR(50) NOT NULL DEFAULT 'standard',
    RequiresInput BOOLEAN DEFAULT FALSE,
    InputType VARCHAR(50) DEFAULT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE StoryChoice (
    Id SERIAL PRIMARY KEY,
    StoryNodeId INTEGER NOT NULL,
    ChoiceText TEXT NOT NULL,
    NextNodeId INTEGER,
    MetadataImpact JSONB DEFAULT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (StoryNodeId) REFERENCES StoryNode (Id) ON DELETE CASCADE,
    FOREIGN KEY (NextNodeId) REFERENCES StoryNode (Id) ON DELETE SET NULL
);

-- Tables from add_class_tables.sql
CREATE TABLE Class (
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

CREATE TABLE ClassOutfit (
    Id SERIAL PRIMARY KEY,
    ClassId INTEGER NOT NULL,
    Description TEXT NOT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ClassId) REFERENCES Class (Id) ON DELETE CASCADE
);

CREATE TABLE ClassStartingEquipment (
    Id SERIAL PRIMARY KEY,
    ClassId INTEGER NOT NULL,
    Description TEXT NOT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ClassId) REFERENCES Class (Id) ON DELETE CASCADE
);

-- Create indexes from init.sql
CREATE INDEX idx_monster_stat_monster_id ON MonsterStat(MonsterId);
CREATE INDEX idx_item_stat_bonus_item_id ON ItemStatBonus(ItemId);

-- Create indexes from add_world_tables.sql
CREATE INDEX idx_region_world ON Region (WorldId);
CREATE INDEX idx_location_world ON Location (WorldId);
CREATE INDEX idx_faction_world ON Faction (WorldId);
CREATE INDEX idx_region_coordinates ON Region (XRangeStart, XRangeEnd, YRangeStart, YRangeEnd);
CREATE INDEX idx_location_coordinates ON Location (CoordinateX, CoordinateY);
CREATE UNIQUE INDEX idx_world_name ON World (Name);
CREATE UNIQUE INDEX idx_faction_name_world ON Faction (WorldId, Name);

-- Create indexes from add_story_tables.sql
CREATE INDEX idx_story_choice_node ON StoryChoice (StoryNodeId);

-- Create indexes from add_class_tables.sql
CREATE UNIQUE INDEX idx_class_name ON Class (Name);

-- Create function from add_world_tables.sql
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

-- Step 2: Copy data from the source database to the new database
-- Note: Replace 'source_db' with your actual source database name or connection method

-- Copy Stat data
INSERT INTO Stat (Id, Name, Description)
SELECT Id, Name, Description FROM source_db.Stat;
SELECT setval('stat_id_seq', (SELECT MAX(Id) FROM Stat), true);

-- Copy SkillCategory data
INSERT INTO SkillCategory (Id, Name, Description)
SELECT Id, Name, Description FROM source_db.SkillCategory;
SELECT setval('skillcategory_id_seq', (SELECT MAX(Id) FROM SkillCategory), true);

-- Copy Skill data
INSERT INTO Skill (Id, Name, Description, SkillCategoryId)
SELECT Id, Name, Description, SkillCategoryId FROM source_db.Skill;
SELECT setval('skill_id_seq', (SELECT MAX(Id) FROM Skill), true);

-- Copy SpellCategory data
INSERT INTO SpellCategory (Id, Name, Description)
SELECT Id, Name, Description FROM source_db.SpellCategory;
SELECT setval('spellcategory_id_seq', (SELECT MAX(Id) FROM SpellCategory), true);

-- Copy Spell data
INSERT INTO Spell (Id, Name, Description, SpellCategoryId, BaseDamage, DamageType, ConditionEffect, ChanceToHit, TargetType)
SELECT Id, Name, Description, SpellCategoryId, BaseDamage, DamageType, ConditionEffect, ChanceToHit, TargetType FROM source_db.Spell;
SELECT setval('spell_id_seq', (SELECT MAX(Id) FROM Spell), true);

-- Copy SpellScaling data
INSERT INTO SpellScaling (Id, SpellId, StatId, ScalingFactor)
SELECT Id, SpellId, StatId, ScalingFactor FROM source_db.SpellScaling;
SELECT setval('spellscaling_id_seq', (SELECT MAX(Id) FROM SpellScaling), true);

-- Copy ItemType data
INSERT INTO ItemType (Id, Name, Description)
SELECT Id, Name, Description FROM source_db.ItemType;
SELECT setval('itemtype_id_seq', (SELECT MAX(Id) FROM ItemType), true);

-- Copy Item data
INSERT INTO Item (Id, Name, Description, ItemTypeId, RequiredLevel, Value, IsConsumable, UseDescription, Rarity)
SELECT Id, Name, Description, ItemTypeId, RequiredLevel, Value, IsConsumable, UseDescription, Rarity FROM source_db.Item;
SELECT setval('item_id_seq', (SELECT MAX(Id) FROM Item), true);

-- Copy ItemStatBonus data
INSERT INTO ItemStatBonus (Id, ItemId, StatId, BonusAmount)
SELECT Id, ItemId, StatId, BonusAmount FROM source_db.ItemStatBonus;
SELECT setval('itemstatbonus_id_seq', (SELECT MAX(Id) FROM ItemStatBonus), true);

-- Copy ItemUseEffect data
INSERT INTO ItemUseEffect (Id, ItemId, EffectType, StatId, Amount, DurationInTurns)
SELECT Id, ItemId, EffectType, StatId, Amount, DurationInTurns FROM source_db.ItemUseEffect;
SELECT setval('itemuseeffect_id_seq', (SELECT MAX(Id) FROM ItemUseEffect), true);

-- Copy LootTable data
INSERT INTO LootTable (Id, Name, Description)
SELECT Id, Name, Description FROM source_db.LootTable;
SELECT setval('loottable_id_seq', (SELECT MAX(Id) FROM LootTable), true);

-- Copy LootTableEntry data
INSERT INTO LootTableEntry (Id, LootTableId, ItemId, DropChance, MinQuantity, MaxQuantity)
SELECT Id, LootTableId, ItemId, DropChance, MinQuantity, MaxQuantity FROM source_db.LootTableEntry;
SELECT setval('loottableentry_id_seq', (SELECT MAX(Id) FROM LootTableEntry), true);

-- Copy MonsterType data
INSERT INTO MonsterType (Id, Name, Description)
SELECT Id, Name, Description FROM source_db.MonsterType;
SELECT setval('monstertype_id_seq', (SELECT MAX(Id) FROM MonsterType), true);

-- Copy Monster data
INSERT INTO Monster (Id, Name, Description, Level, ExperienceReward, MonsterTypeId, LootTableId)
SELECT Id, Name, Description, Level, ExperienceReward, MonsterTypeId, LootTableId FROM source_db.Monster;
SELECT setval('monster_id_seq', (SELECT MAX(Id) FROM Monster), true);

-- Copy MonsterStat data
INSERT INTO MonsterStat (MonsterId, StatId, Value)
SELECT MonsterId, StatId, Value FROM source_db.MonsterStat;

-- Copy MonsterSkill data
INSERT INTO MonsterSkill (MonsterId, SkillId, Level)
SELECT MonsterId, SkillId, Level FROM source_db.MonsterSkill;

-- Copy MonsterSpell data
INSERT INTO MonsterSpell (MonsterId, SpellId)
SELECT MonsterId, SpellId FROM source_db.MonsterSpell;

-- Copy MonsterGuaranteedDrop data
INSERT INTO MonsterGuaranteedDrop (Id, MonsterId, ItemId, MinQuantity, MaxQuantity)
SELECT Id, MonsterId, ItemId, MinQuantity, MaxQuantity FROM source_db.MonsterGuaranteedDrop;
SELECT setval('monsterguaranteeddrop_id_seq', (SELECT MAX(Id) FROM MonsterGuaranteedDrop), true);

-- Copy World data
INSERT INTO World (Id, Name, Description, DimensionsX, DimensionsY, CreatedAt, UpdatedAt)
SELECT Id, Name, Description, DimensionsX, DimensionsY, CreatedAt, UpdatedAt FROM source_db.World;
SELECT setval('world_id_seq', (SELECT MAX(Id) FROM World), true);

-- Copy Region data
INSERT INTO Region (Id, WorldId, Name, XRangeStart, XRangeEnd, YRangeStart, YRangeEnd, Features, TravelModifier, EncounterRate, MagicLevel, FactionBias, CreatedAt, UpdatedAt)
SELECT Id, WorldId, Name, XRangeStart, XRangeEnd, YRangeStart, YRangeEnd, Features, TravelModifier, EncounterRate, MagicLevel, FactionBias, CreatedAt, UpdatedAt FROM source_db.Region;
SELECT setval('region_id_seq', (SELECT MAX(Id) FROM Region), true);

-- Copy Location data
INSERT INTO Location (Id, WorldId, Name, Type, CoordinateX, CoordinateY, RegionName, Terrain, FactionsPresent, Hooks, CreatedAt, UpdatedAt)
SELECT Id, WorldId, Name, Type, CoordinateX, CoordinateY, RegionName, Terrain, FactionsPresent, Hooks, CreatedAt, UpdatedAt FROM source_db.Location;
SELECT setval('location_id_seq', (SELECT MAX(Id) FROM Location), true);

-- Copy Faction data
INSERT INTO Faction (Id, WorldId, Name, Type, Ideology, ZonesOfInfluence, CreatedAt, UpdatedAt)
SELECT Id, WorldId, Name, Type, Ideology, ZonesOfInfluence, CreatedAt, UpdatedAt FROM source_db.Faction;
SELECT setval('faction_id_seq', (SELECT MAX(Id) FROM Faction), true);

-- Copy StoryNode data
INSERT INTO StoryNode (Id, Title, Content, NodeType, RequiresInput, InputType, CreatedAt, UpdatedAt)
SELECT Id, Title, Content, NodeType, RequiresInput, InputType, CreatedAt, UpdatedAt FROM source_db.StoryNode;
SELECT setval('storynode_id_seq', (SELECT MAX(Id) FROM StoryNode), true);

-- Copy StoryChoice data
INSERT INTO StoryChoice (Id, StoryNodeId, ChoiceText, NextNodeId, MetadataImpact, CreatedAt, UpdatedAt)
SELECT Id, StoryNodeId, ChoiceText, NextNodeId, MetadataImpact, CreatedAt, UpdatedAt FROM source_db.StoryChoice;
SELECT setval('storychoice_id_seq', (SELECT MAX(Id) FROM StoryChoice), true);

-- Copy Class data
INSERT INTO Class (Id, Name, Description, StrengthBonus, DexterityBonus, ConstitutionBonus, IntelligenceBonus, WisdomBonus, CharismaBonus, CreatedAt, UpdatedAt)
SELECT Id, Name, Description, StrengthBonus, DexterityBonus, ConstitutionBonus, IntelligenceBonus, WisdomBonus, CharismaBonus, CreatedAt, UpdatedAt FROM source_db.Class;
SELECT setval('class_id_seq', (SELECT MAX(Id) FROM Class), true);

-- Copy ClassOutfit data
INSERT INTO ClassOutfit (Id, ClassId, Description, CreatedAt)
SELECT Id, ClassId, Description, CreatedAt FROM source_db.ClassOutfit;
SELECT setval('classoutfit_id_seq', (SELECT MAX(Id) FROM ClassOutfit), true);

-- Copy ClassStartingEquipment data
INSERT INTO ClassStartingEquipment (Id, ClassId, Description, CreatedAt)
SELECT Id, ClassId, Description, CreatedAt FROM source_db.ClassStartingEquipment;
SELECT setval('classstartingequipment_id_seq', (SELECT MAX(Id) FROM ClassStartingEquipment), true);

-- Final step: Create a default admin account if needed
-- This is commented out as you may want to handle user creation separately
/*
INSERT INTO Account (Email, PasswordHash, Username)
VALUES ('admin@example.com', '$2b$10$example.hash.for.admin.user', 'Admin');
*/
