import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface User {
  id?: number;
  username: string;
  email: string;
  password_hash?: string;
  created_at?: string;
  updated_at?: string;
}

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
  requiresInput?: boolean;
  inputType?: string;
  inputPrompt?: string;
  inputDescription?: string;
  classId?: number; // Added for outfit selection
  outfitId?: number; // Added for outfit selection
}

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

export interface PlayerProgress {
  id?: number;
  characterId: number;
  currentNode: StoryNode;
  choiceHistory: any[];
  metadata: any;
  equipment?: string[]; // Added for tracking equipment
  className?: string; // Added for tracking class name
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private apiUrl = 'http://localhost:3000/api'; // Backend API URL
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  // Current game state
  private currentCharacterSubject = new BehaviorSubject<Character | null>(null);
  public currentCharacter$ = this.currentCharacterSubject.asObservable();

  private currentStoryNodeSubject = new BehaviorSubject<StoryNode | null>(null);
  public currentStoryNode$ = this.currentStoryNodeSubject.asObservable();

  constructor(private http: HttpClient) {}

  // User operations
  createUser(user: User): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/users`, user, this.httpOptions);
  }

  getUser(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${id}`);
  }

  // Character operations
  createCharacter(character: Character): Observable<Character> {
    return this.http.post<Character>(`${this.apiUrl}/characters`, character, this.httpOptions);
  }

  getCharacter(id: number): Observable<Character> {
    return this.http.get<Character>(`${this.apiUrl}/characters/${id}`);
  }

  updateCharacter(character: Character): Observable<Character> {
    return this.http.put<Character>(`${this.apiUrl}/characters/${character.id}`, character, this.httpOptions);
  }

  getUserCharacters(userId: number): Observable<Character[]> {
    return this.http.get<Character[]>(`${this.apiUrl}/users/${userId}/characters`);
  }

  // Story operations
  getStoryNode(id: number): Observable<StoryNode> {
    return this.http.get<StoryNode>(`${this.apiUrl}/story/nodes/${id}`);
  }

  getFirstStoryNode(): Observable<StoryNode> {
    return this.http.get<StoryNode>(`${this.apiUrl}/story/start`);
  }

  // Player progress operations
  getPlayerProgress(characterId: number): Observable<PlayerProgress> {
    return this.http.get<PlayerProgress>(`${this.apiUrl}/story/progress/${characterId}`);
  }

  makeChoice(characterId: number, choiceId: number, inputValue?: string, classId?: number): Observable<PlayerProgress> {
    console.log('DatabaseService.makeChoice called with:', { characterId, choiceId, inputValue, classId });
    
    return this.http.post<PlayerProgress>(`${this.apiUrl}/story/choice`, {
      characterId,
      choiceId,
      inputValue,
      classId
    }, this.httpOptions).pipe(
      tap(
        (response) => {
          console.log('makeChoice response:', response);
          if (response?.currentNode?.title?.toLowerCase() === 'the end') {
            console.log('Death node detected in makeChoice response!');
          }
        },
        (error) => console.error('makeChoice error:', error)
      )
    );
  }

  makePasswordChoice(characterId: number, choiceId: number, password: string): Observable<PlayerProgress> {
    return this.http.post<PlayerProgress>(`${this.apiUrl}/story/password-choice`, {
      characterId,
      choiceId,
      password
    }, this.httpOptions);
  }
  
  // Character death operations
  markCharacterDead(characterId: number): Observable<any> {
    console.log(`Marking character ${characterId} as dead via service`);
    return this.http.put<any>(`${this.apiUrl}/characters/${characterId}/mark-dead`, {}, this.httpOptions).pipe(
      tap(
        (response) => console.log('Character marked as dead response:', response),
        (error) => console.error('Error marking character as dead:', error)
      )
    );
  }

  submitPassword(characterId: number, password: string): Observable<PlayerProgress> {
    return this.http.post<PlayerProgress>(`${this.apiUrl}/story/${characterId}/password`, { password });
  }

  getCharacterProfile(characterId: number): Observable<CharacterProfile> {
    return this.http.get<CharacterProfile>(`${this.apiUrl}/profile/${characterId}`);
  }

  getCharacterAlignment(characterId: number): Observable<CharacterAlignment> {
    return this.http.get<CharacterAlignment>(`${this.apiUrl}/profile/${characterId}/alignment`);
  }

  getCharacterAttributes(characterId: number): Observable<CharacterAttributes> {
    return this.http.get<CharacterAttributes>(`${this.apiUrl}/profile/${characterId}/attributes`);
  }

  getCharacterPreferences(characterId: number): Observable<CharacterPreferences> {
    return this.http.get<CharacterPreferences>(`${this.apiUrl}/profile/${characterId}/preferences`);
  }

  getRandomOutfits(count: number = 4): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/story/outfits/random?count=${count}`);
  }

  createPlayerProgress(progress: PlayerProgress): Observable<PlayerProgress> {
    return this.http.post<PlayerProgress>(`${this.apiUrl}/story/progress`, progress, this.httpOptions);
  }

  // Game state management
  setCurrentCharacter(character: Character): void {
    this.currentCharacterSubject.next(character);
  }

  getCurrentCharacter(): Character | null {
    return this.currentCharacterSubject.value;
  }

  setCurrentStoryNode(node: StoryNode): void {
    this.currentStoryNodeSubject.next(node);
  }

  getCurrentStoryNode(): StoryNode | null {
    return this.currentStoryNodeSubject.value;
  }

  // Legacy game mechanics - renamed to avoid conflict with the new makeChoice method
  processGameChoice(choiceId: number, character: Character): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/make-choice`, {
      choice_id: choiceId,
      character_id: character.id
    }, this.httpOptions);
  }

  // Health check for database connection
  checkConnection(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/health`);
  }
}
