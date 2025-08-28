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
  equipSlot?: 'head' | 'body' | 'hands' | 'feet' | 'mainhand' | 'offhand' | 'necklace' | 'ring1' | 'ring2';
  isEquipped?: boolean;
  obtainedAt?: Date | string; // Timestamp when item was obtained
  weaponType?: '1handed' | '2handed'; // For weapons and shields
  handSlots?: ('mainhand' | 'offhand')[]; // Which hand slots this item occupies
}

export interface InventoryResponse {
  items: InventoryItem[];
  gold: number;
}
