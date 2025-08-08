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
  createdAt?: string;
  updatedAt?: string;
  is_dead?: boolean;
}
