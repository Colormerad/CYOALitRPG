export interface CharacterProfile {
  id: number;
  characterId: number;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  goodEvilAxis: number;
  orderChaosAxis: number;
  combatPreference: number;
  explorationPreference: number;
  socialPreference: number;
  puzzlePreference: number;
  caution: number;
  bravery: number;
  curiosity: number;
  empathy: number;
  magicAffinity: number;
  strengthExp: number;
  dexterityExp: number;
  constitutionExp: number;
  intelligenceExp: number;
  wisdomExp: number;
  charismaExp: number;
  additionalTraits: any;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterAlignment {
  alignment: string;
}

export interface CharacterAttributes {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface CharacterPreferences {
  combat: number;
  exploration: number;
  social: number;
  puzzle: number;
}
