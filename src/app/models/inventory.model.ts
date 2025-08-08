export interface InventoryItem {
  id: number;
  name: string;
  description: string;
  type: 'equipment' | 'consumable' | 'quest' | 'misc';
  value: number;
  quantity: number;
  icon?: string;
  stats?: {
    strength?: number;
    dexterity?: number;
    intelligence?: number;
    health?: number;
    mana?: number;
  };
  equipSlot?: 'head' | 'body' | 'hands' | 'feet' | 'weapon' | 'accessory';
  isEquipped?: boolean;
}

export interface InventoryResponse {
  items: InventoryItem[];
  gold: number;
}
