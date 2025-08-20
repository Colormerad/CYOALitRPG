-- Initialize database schema for Mythos RPG Game

-- Account table
CREATE TABLE IF NOT EXISTS "Account" (
  "Id" SERIAL PRIMARY KEY,
  "Email" VARCHAR(255) NOT NULL UNIQUE,
  "PasswordHash" VARCHAR(255) NOT NULL,
  "Username" VARCHAR(255),
  "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Character table
CREATE TABLE IF NOT EXISTS "Character" (
  "Id" SERIAL PRIMARY KEY,
  "AccountId" INTEGER REFERENCES "Account"("Id"),
  "Name" VARCHAR(255) NOT NULL,
  "Level" INTEGER DEFAULT 1,
  "Experience" INTEGER DEFAULT 0,
  "Health" INTEGER DEFAULT 100,
  "Mana" INTEGER DEFAULT 100,
  "Strength" INTEGER DEFAULT 10,
  "Agility" INTEGER DEFAULT 10,
  "Intelligence" INTEGER DEFAULT 10,
  "ClassId" INTEGER,
  "IsDead" BOOLEAN DEFAULT FALSE,
  "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CharacterProfile table for additional character attributes
CREATE TABLE IF NOT EXISTS "CharacterProfile" (
  "Id" SERIAL PRIMARY KEY,
  "CharacterId" INTEGER REFERENCES "Character"("Id"),
  "Attributes" JSONB DEFAULT '{}',
  "AdditionalTraits" JSONB DEFAULT '{}',
  "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Class table for character classes
CREATE TABLE IF NOT EXISTS "Class" (
  "Id" SERIAL PRIMARY KEY,
  "Name" VARCHAR(255) NOT NULL,
  "Description" TEXT,
  "AttributeBonuses" JSONB DEFAULT '{}',
  "StartingEquipment" JSONB DEFAULT '[]'
);

-- Insert some default classes
INSERT INTO "Class" ("Name", "Description", "AttributeBonuses", "StartingEquipment")
VALUES 
  ('Warrior', 'A strong fighter skilled in combat', '{"strength": 5, "health": 20}', '["Sword", "Shield", "Leather Armor"]'),
  ('Mage', 'A wielder of arcane magic', '{"intelligence": 5, "mana": 20}', '["Staff", "Spellbook", "Robe"]'),
  ('Rogue', 'A stealthy character skilled in deception', '{"agility": 5, "strength": 2}', '["Dagger", "Lockpicks", "Light Armor"]');

-- StoryNode table for game narrative nodes
CREATE TABLE IF NOT EXISTS "StoryNode" (
  "Id" SERIAL PRIMARY KEY,
  "Title" VARCHAR(255),
  "Content" TEXT NOT NULL,
  "NextNodeId" INTEGER,
  "Metadata" JSONB DEFAULT '{}'
);

-- StoryChoice table for choices within story nodes
CREATE TABLE IF NOT EXISTS "StoryChoice" (
  "Id" SERIAL PRIMARY KEY,
  "NodeId" INTEGER REFERENCES "StoryNode"("Id"),
  "Text" TEXT NOT NULL,
  "NextNodeId" INTEGER,
  "Effects" JSONB DEFAULT '{}',
  "RequiredAttributes" JSONB DEFAULT '{}'
);

-- PlayerProgress table to track player progress through the story
CREATE TABLE IF NOT EXISTS "PlayerProgress" (
  "Id" SERIAL PRIMARY KEY,
  "CharacterId" INTEGER REFERENCES "Character"("Id"),
  "CurrentNodeId" INTEGER REFERENCES "StoryNode"("Id"),
  "ChoiceHistory" JSONB DEFAULT '[]',
  "Metadata" JSONB DEFAULT '{}'
);

-- CharacterInventory table for items
CREATE TABLE IF NOT EXISTS "CharacterInventory" (
  "Id" SERIAL PRIMARY KEY,
  "CharacterId" INTEGER REFERENCES "Character"("Id"),
  "ItemName" VARCHAR(255) NOT NULL,
  "ItemType" VARCHAR(50),
  "Quantity" INTEGER DEFAULT 1,
  "Properties" JSONB DEFAULT '{}'
);

-- Create some initial story nodes
INSERT INTO "StoryNode" ("Id", "Title", "Content", "NextNodeId")
VALUES 
  (1, 'Introduction', 'Welcome to the world of Mythos. Your adventure begins here.', NULL),
  (2, 'The Crossroads', 'You find yourself at a crossroads. Which path will you take?', NULL);

-- Create some initial choices
INSERT INTO "StoryChoice" ("NodeId", "Text", "NextNodeId")
VALUES 
  (1, 'Continue your journey', 2),
  (2, 'Take the path to the left', NULL),
  (2, 'Take the path to the right', NULL);
