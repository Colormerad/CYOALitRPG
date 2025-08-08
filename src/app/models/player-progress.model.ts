import { StoryNode } from './story.model';
import { InventoryItem } from './inventory.model';

export interface PlayerProgress {
  id?: number;
  characterId: number;
  currentNode: StoryNode;
  choiceHistory: any[];
  metadata: any;
  equipment?: string[]; // Added for tracking equipment
  className?: string; // Added for tracking class name
  inventory?: InventoryItem[]; // Added for tracking inventory items
  gold?: number; // Added for tracking gold
  created_at?: string;
  updated_at?: string;
}
