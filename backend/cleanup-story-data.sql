-- Cleanup script to remove all story-related data
-- This will delete all data from StoryChoice and StoryNode tables
-- Run this before re-importing story prompts

-- First delete all choices as they reference story nodes
DELETE FROM StoryChoice;

-- Then delete all story nodes
DELETE FROM StoryNode;

-- Reset sequences to avoid ID conflicts
ALTER SEQUENCE storychoice_id_seq RESTART WITH 1;
ALTER SEQUENCE storynode_id_seq RESTART WITH 1;

-- Output confirmation
SELECT 'Story data cleanup complete. You can now re-import story prompts.' as message;
