export interface StoryNode {
  id?: number;
  title: string;
  content: string;
  nodeType: string;
  requiresInput?: boolean;
  inputType?: string;
  inputDescription?: string;
  choices?: Choice[];
  created_at?: string;
  updated_at?: string;
}

export interface Choice {
  id?: number;
  storyNodeId?: number;
  text: string;
  nextNodeId?: number;
  metadataImpact?: any;
  classId?: number; // For outfit/class selection
  outfitStyle?: string;
  outfitId?: number; // For outfit selection
  requiresInput?: boolean;
  inputType?: string;
  inputPrompt?: string;
  inputDescription?: string;
}
