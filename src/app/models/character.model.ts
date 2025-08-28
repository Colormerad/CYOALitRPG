export interface Character {
  id?: number;
  accountId: number;
  name: string;
  level: number;
  experience: number;
  health: number;
  mana: number;
  strength: number;
  dexterity: number;
  intelligence: number;
  classId?: number;
  className?: string; // Added for class name from JOIN query
  createdAt?: string;
  updatedAt?: string;
  is_dead?: boolean;
  iconKey?: string | null;
}
