export interface NPC {
  id: string;
  name: string;
  maxHp: number;
  hp: number;
  winPhrase: string;   // what NPC says when they defeat the player
  losePhrase: string;  // what NPC says when they are defeated
  attackMin?: number;  // optional attack range for NPC AI
  attackMax?: number;
}

export const SirSebastian: NPC = {
  id: 'sir-sebastian',
  name: 'Sir Sebastian',
  maxHp: 50,
  hp: 50,
  winPhrase: 'Kneel, knave. Honor prevails!',
  losePhrase: 'You have my respect... and the field.',
  attackMin: 10,
  attackMax: 18,
};
