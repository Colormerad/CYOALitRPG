-- Initialize RPG Game Database
-- Converted from SQL Server to PostgreSQL syntax

-- Account and Character
CREATE TABLE Account (
    Id SERIAL PRIMARY KEY,
    Email VARCHAR(255) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Character (
    Id SERIAL PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    AccountId INTEGER NOT NULL,
    Level INTEGER NOT NULL DEFAULT 1,
    Experience INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (AccountId) REFERENCES Account(Id)
);

-- Stat and CharacterStat
CREATE TABLE Stat (
    Id SERIAL PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    Description TEXT NOT NULL
);

CREATE TABLE CharacterStat (
    CharacterId INTEGER NOT NULL,
    StatId INTEGER NOT NULL,
    Value INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (CharacterId, StatId),
    FOREIGN KEY (CharacterId) REFERENCES Character(Id),
    FOREIGN KEY (StatId) REFERENCES Stat(Id)
);

-- SkillCategory, Skill, CharacterSkill
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

CREATE TABLE CharacterSkill (
    CharacterId INTEGER NOT NULL,
    SkillId INTEGER NOT NULL,
    Level INTEGER NOT NULL DEFAULT 0,
    Experience INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (CharacterId, SkillId),
    FOREIGN KEY (CharacterId) REFERENCES Character(Id),
    FOREIGN KEY (SkillId) REFERENCES Skill(Id)
);

-- SpellCategory, Spell, CharacterSpell, SpellScaling
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

CREATE TABLE CharacterSpell (
    CharacterId INTEGER NOT NULL,
    SpellId INTEGER NOT NULL,
    IsEquipped BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (CharacterId, SpellId),
    FOREIGN KEY (CharacterId) REFERENCES Character(Id),
    FOREIGN KEY (SpellId) REFERENCES Spell(Id)
);

CREATE TABLE SpellScaling (
    Id SERIAL PRIMARY KEY,
    SpellId INTEGER NOT NULL,
    StatId INTEGER NOT NULL,
    ScalingFactor FLOAT NOT NULL DEFAULT 0.0,
    FOREIGN KEY (SpellId) REFERENCES Spell(Id),
    FOREIGN KEY (StatId) REFERENCES Stat(Id)
);

-- ItemType, Item, ItemStatBonus, ItemUseEffect, CharacterInventory
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

CREATE TABLE CharacterInventory (
    CharacterId INTEGER NOT NULL,
    ItemId INTEGER NOT NULL,
    Quantity INTEGER NOT NULL DEFAULT 1,
    IsEquipped BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (CharacterId, ItemId),
    FOREIGN KEY (CharacterId) REFERENCES Character(Id),
    FOREIGN KEY (ItemId) REFERENCES Item(Id)
);

-- Loot Table System
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

-- Monster System
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

-- Insert sample data for testing
-- Stats
INSERT INTO Stat (Name, Description) VALUES
('Strength', 'Physical power and melee damage'),
('Agility', 'Speed, dexterity, and dodge chance'),
('Intelligence', 'Magical power and mana pool'),
('Vitality', 'Health points and physical resistance'),
('Wisdom', 'Mana regeneration and magical resistance'),
('Luck', 'Critical hit chance and loot quality');

-- Skill Categories
INSERT INTO SkillCategory (Name, Description) VALUES
('Combat', 'Physical fighting abilities'),
('Magic', 'Spellcasting and magical abilities'),
('Crafting', 'Item creation and enhancement'),
('Survival', 'Exploration and resource gathering');

-- Skills
INSERT INTO Skill (Name, Description, SkillCategoryId) VALUES
('Sword Fighting', 'Proficiency with sword weapons', 1),
('Archery', 'Skill with bows and ranged weapons', 1),
('Fire Magic', 'Mastery of fire-based spells', 2),
('Healing Magic', 'Ability to restore health and cure ailments', 2),
('Blacksmithing', 'Creating and repairing weapons and armor', 3),
('Alchemy', 'Brewing potions and magical concoctions', 3),
('Foraging', 'Finding food and materials in the wild', 4),
('Stealth', 'Moving unseen and avoiding detection', 4);

-- Spell Categories
INSERT INTO SpellCategory (Name, Description) VALUES
('Offensive', 'Damage-dealing spells'),
('Defensive', 'Protection and shielding spells'),
('Utility', 'Non-combat helpful spells'),
('Healing', 'Health restoration spells');

-- Spells
INSERT INTO Spell (Name, Description, SpellCategoryId, BaseDamage, DamageType, ConditionEffect, ChanceToHit, TargetType) VALUES
('Fireball', 'Launches a ball of fire at the target', 1, 25, 'Fire', 'Burn', 0.85, 'Single'),
('Lightning Bolt', 'Strikes target with electrical energy', 1, 30, 'Lightning', 'Stun', 0.90, 'Single'),
('Shield', 'Creates a magical barrier around the caster', 2, 0, 'None', 'Shield', 1.0, 'Self'),
('Heal', 'Restores health to the target', 4, 0, 'Healing', 'Regeneration', 1.0, 'Single'),
('Teleport', 'Instantly moves to a different location', 3, 0, 'None', 'None', 1.0, 'Self');

-- Item Types
INSERT INTO ItemType (Name, Description) VALUES
('Weapon', 'Items used for combat'),
('Armor', 'Protective equipment'),
('Consumable', 'Single-use items'),
('Accessory', 'Jewelry and magical trinkets'),
('Material', 'Crafting components');

-- Items
INSERT INTO Item (Name, Description, ItemTypeId, RequiredLevel, Value, IsConsumable, UseDescription, Rarity) VALUES
('Iron Sword', 'A sturdy blade forged from iron', 1, 1, 100, FALSE, 'Equip to increase attack power', 'Common'),
('Leather Armor', 'Basic protection made from tanned hide', 2, 1, 80, FALSE, 'Equip to increase defense', 'Common'),
('Health Potion', 'Restores 50 health points', 3, 1, 25, TRUE, 'Drink to restore health', 'Common'),
('Magic Ring', 'Increases magical power', 4, 5, 200, FALSE, 'Equip to boost intelligence', 'Rare'),
('Iron Ore', 'Raw material for blacksmithing', 5, 1, 10, FALSE, 'Used in crafting weapons', 'Common');

-- Sample Account and Character
INSERT INTO Account (Email, PasswordHash) VALUES
('demo@example.com', '$2b$10$example.hash.for.demo.user');

INSERT INTO Character (Name, AccountId, Level, Experience) VALUES
('Demo Hero', 1, 1, 0);

-- Sample Character Stats
INSERT INTO CharacterStat (CharacterId, StatId, Value) VALUES
(1, 1, 10), -- Strength
(1, 2, 8),  -- Agility
(1, 3, 12), -- Intelligence
(1, 4, 15), -- Vitality
(1, 5, 9),  -- Wisdom
(1, 6, 7);  -- Luck

-- Sample Character Skills
INSERT INTO CharacterSkill (CharacterId, SkillId, Level, Experience) VALUES
(1, 1, 1, 0), -- Sword Fighting
(1, 3, 2, 150); -- Fire Magic

-- Sample Character Inventory
INSERT INTO CharacterInventory (CharacterId, ItemId, Quantity, IsEquipped) VALUES
(1, 1, 1, TRUE),  -- Iron Sword (equipped)
(1, 2, 1, TRUE),  -- Leather Armor (equipped)
(1, 3, 5, FALSE), -- Health Potions
(1, 5, 10, FALSE); -- Iron Ore

-- Create indexes for better performance
CREATE INDEX idx_character_account_id ON Character(AccountId);
CREATE INDEX idx_character_stat_character_id ON CharacterStat(CharacterId);
CREATE INDEX idx_character_skill_character_id ON CharacterSkill(CharacterId);
CREATE INDEX idx_character_inventory_character_id ON CharacterInventory(CharacterId);
CREATE INDEX idx_monster_stat_monster_id ON MonsterStat(MonsterId);
CREATE INDEX idx_item_stat_bonus_item_id ON ItemStatBonus(ItemId);
