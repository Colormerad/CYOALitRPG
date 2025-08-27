import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

// Import models from their own files
import { User } from '../models/user.model';
import { Character } from '../models/character.model';
import { StoryNode, Choice } from '../models/story.model';
import { CharacterProfile, CharacterAlignment, CharacterAttributes, CharacterPreferences } from '../models/character-profile.model';
import { InventoryItem, InventoryResponse } from '../models/inventory.model';
import { PlayerProgress } from '../models/player-progress.model';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private apiUrl = environment.apiBase; // Backend API URL
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

  // Merge and persist metadata into PlayerProgress.metadata
  updateProgressMetadata(characterId: number, patch: Record<string, any>): Observable<PlayerProgress> {
    return new Observable<PlayerProgress>((observer) => {
      this.getPlayerProgress(characterId).subscribe({
        next: (progress) => {
          const currentMeta = progress?.metadata && typeof progress.metadata === 'object' ? progress.metadata : {};
          const updated: PlayerProgress = { ...progress, metadata: { ...currentMeta, ...patch } } as any;
          this.http.put<PlayerProgress>(`${this.apiUrl}/story/progress/${characterId}`, updated, this.httpOptions).subscribe({
            next: (saved) => { observer.next(saved); observer.complete(); },
            error: (err) => { console.error('Error updating PlayerProgress.metadata:', err); observer.error(err); }
          });
        },
        error: (err) => { console.error('Error loading PlayerProgress for metadata update:', err); observer.error(err); }
      });
    });
  }

  useInventoryItem(characterId: number, itemId: number, amount: number = 1): Observable<{ itemId: number; quantity: number; removed: boolean }> {
    return this.http.post<{ itemId: number; quantity: number; removed: boolean }>(
      `${this.apiUrl}/characters/${characterId}/inventory/${itemId}/use`,
      { amount },
      this.httpOptions
    );
  }

  getUser(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${id}`);
  }

  // Character operations
  createCharacter(character: Character): Observable<Character> {
    return this.http.post<Character>(`${this.apiUrl}/characters`, character, this.httpOptions);
  }

  getCharacter(id: number): Observable<Character> {
    return this.http.get<Character>(`${this.apiUrl}/characters/${id}`).pipe(
      tap(character => {
        // Merge stored icon if available (fallback for backend issues)
        const storedIcon = this.getStoredIconKey(id);
        if (storedIcon && (!character.iconKey || character.iconKey !== storedIcon)) {
          character.iconKey = storedIcon;
        }
      })
    );
  }

  updateCharacter(character: Character): Observable<Character> {
    return this.http.put<Character>(`${this.apiUrl}/characters/${character.id}`, character, this.httpOptions);
  }

  // Minimal payload update specifically for the character's profile icon.
  // Sends both camelCase and snake_case keys for backend compatibility.
  updateCharacterIcon(id: number, iconKey: string): Observable<Character> {
    const body: any = { iconKey, icon_key: iconKey };
    return this.http.put<Character>(`${this.apiUrl}/characters/${id}`, body, this.httpOptions);
  }

  // Client-side icon persistence (fallback for backend issues)
  private getStoredIconKey(characterId: number): string | null {
    const stored = localStorage.getItem(`character_icon_${characterId}`);
    return stored;
  }

  private storeIconKey(characterId: number, iconKey: string): void {
    localStorage.setItem(`character_icon_${characterId}`, iconKey);
  }

  // Enhanced icon update with client-side fallback
  updateCharacterIconWithFallback(id: number, iconKey: string): Observable<Character> {
    // Store locally first for immediate persistence
    this.storeIconKey(id, iconKey);
    
    // Try backend update, but don't fail if it errors
    return new Observable(observer => {
      this.updateCharacterIcon(id, iconKey).subscribe({
        next: (character) => {
          observer.next(character);
          observer.complete();
        },
        error: (err) => {
          console.warn('Backend icon update failed, using client-side storage:', err);
          // Return a mock success response with the icon set
          const mockCharacter: Character = { 
            id, 
            iconKey,
            accountId: 0, 
            name: '', 
            level: 1, 
            experience: 0, 
            health: 100, 
            mana: 100, 
            strength: 10, 
            dexterity: 10, 
            intelligence: 10 
          };
          observer.next(mockCharacter);
          observer.complete();
        }
      });
    });
  }

  getUserCharacters(userId: number): Observable<Character[]> {
    return this.http.get<Character[]>(`${this.apiUrl}/characters/user/${userId}`).pipe(
      tap(characters => {
        // Merge stored icons for all characters (fallback for backend issues)
        characters.forEach(character => {
          if (character.id) {
            const storedIcon = this.getStoredIconKey(character.id);
            if (storedIcon && (!character.iconKey || character.iconKey !== storedIcon)) {
              character.iconKey = storedIcon;
            }
          }
        });
      })
    );
  }

  // Story operations
  getStoryNode(id: number): Observable<StoryNode> {
    return this.http.get<StoryNode>(`${this.apiUrl}/story/nodes/${id}`);
  }

  getChoice(id: number): Observable<Choice | any> {
    return this.http.get<Choice | any>(`${this.apiUrl}/story/choices/${id}`);
  }

  getFirstStoryNode(): Observable<StoryNode> {
    return this.http.get<StoryNode>(`${this.apiUrl}/story/start`);
  }

  // Player progress operations
  getPlayerProgress(characterId: number): Observable<PlayerProgress> {
    return this.http.get<PlayerProgress>(`${this.apiUrl}/story/progress/${characterId}`);
  }

  makeChoice(characterId: number, choiceId: number, inputValue?: string): Observable<PlayerProgress> {
    console.log('DatabaseService.makeChoice called with:', { characterId, choiceId, inputValue });
    
    return this.http.post<PlayerProgress>(`${this.apiUrl}/story/choice`, {
      characterId,
      choiceId,
      inputValue
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
  
  setCharacterClass(characterId: number, classId: number, outfitStyle?: string): Observable<PlayerProgress> {
    console.log('DatabaseService.setCharacterClass called with:', { characterId, classId, outfitStyle });
    
    return this.http.post<PlayerProgress>(`${this.apiUrl}/story/character/set-class`, {
      characterId,
      classId,
      outfitStyle
    }, this.httpOptions).pipe(
      tap(
        (response) => console.log('setCharacterClass response:', response),
        (error) => console.error('setCharacterClass error:', error)
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

  // --- Frontend-only extras (until backend supports persistence) ---
  getProfileExtras(characterId: number): { gender?: 'masculine'|'feminine'|'neutral'|'flux'; ageBucket?: 'very_young'|'young'|'neutral'|'wisened'|'very_old' } {
    try {
      const raw = localStorage.getItem(`profile_extras_${characterId}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  setProfileExtras(characterId: number, extras: { gender?: 'masculine'|'feminine'|'neutral'|'flux'; ageBucket?: 'very_young'|'young'|'neutral'|'wisened'|'very_old' }): void {
    try {
      const existing = this.getProfileExtras(characterId) || {};
      const merged = { ...existing, ...extras };
      localStorage.setItem(`profile_extras_${characterId}`, JSON.stringify(merged));
    } catch (e) {
      console.warn('Failed to store profile extras', e);
    }
  }

  updateProfileExtras(characterId: number, extras: { gender?: 'masculine'|'feminine'|'neutral'|'flux'; ageBucket?: 'very_young'|'young'|'neutral'|'wisened'|'very_old' }): Observable<CharacterProfile> {
    // Persist to backend; also mirror to local storage for quick restore
    this.setProfileExtras(characterId, extras);
    return new Observable<CharacterProfile>((observer) => {
      this.http.post<CharacterProfile>(`${this.apiUrl}/profile/${characterId}/extras`, extras, this.httpOptions).subscribe({
        next: (profile) => {
          observer.next(profile);
          observer.complete();
        },
        error: (err) => {
          console.warn('Backend updateProfileExtras failed, using local extras fallback', err);
          // Return a synthetic profile merge for UI continuity
          this.getCharacterProfile(characterId).subscribe({
            next: (p) => {
              const merged: any = { ...p, additionalTraits: { ...(p as any).additionalTraits, ...extras } };
              observer.next(merged);
              observer.complete();
            },
            error: () => {
              // As last resort, fabricate minimal object
              observer.next({
                id: 0,
                characterId,
                strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10,
                goodEvilAxis: 0, orderChaosAxis: 0,
                combatPreference: 0, explorationPreference: 0, socialPreference: 0, puzzlePreference: 0,
                caution: 0, bravery: 0, curiosity: 0, empathy: 0, magicAffinity: 0,
                strengthExp: 0, dexterityExp: 0, constitutionExp: 0, intelligenceExp: 0, wisdomExp: 0, charismaExp: 0,
                additionalTraits: { ...extras }, createdAt: '', updatedAt: ''
              } as any);
              observer.complete();
            }
          });
        }
      });
    });
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

  // Advance progress explicitly (e.g., after battle outcome)
  advanceProgress(characterId: number, nextNodeId: number, options?: { choiceId?: number; experienceGain?: any }): Observable<PlayerProgress> {
    const payload: any = { nextNodeId };
    if (options?.choiceId != null) payload.choiceId = options.choiceId;
    if (options?.experienceGain) payload.experienceGain = options.experienceGain;
    return this.http.post<PlayerProgress>(`${this.apiUrl}/story/progress/${characterId}/advance`, payload, this.httpOptions);
  }

  // Legacy game mechanics - renamed to avoid conflict with the new makeChoice method
  processGameChoice(choiceId: number, character: Character): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/make-choice`, {
      choice_id: choiceId,
      character_id: character.id
    }, this.httpOptions);
  }

  // Inventory operations
  getCharacterInventory(characterId: number): Observable<{ items: InventoryItem[], gold: number }> {
    // Fetch items from backend CharacterInventory and gold from player progress, then combine
    return new Observable(observer => {
      this.http.get<any[]>(`${this.apiUrl}/characters/${characterId}/inventory`).subscribe({
        next: (rows) => {
          const mapType = (itemTypeName?: string): 'equipment' | 'consumable' | 'quest' | 'misc' => {
            const t = (itemTypeName || '').toLowerCase();
            if (['weapon', 'armor', 'accessory', 'shield'].includes(t)) return 'equipment';
            if (['consumable', 'potion', 'elixir', 'scroll'].includes(t)) return 'consumable';
            if (['quest'].includes(t)) return 'quest';
            return 'misc';
          };

          const items: InventoryItem[] = (rows || []).map((r) => ({
            id: r.id ?? r.itemid,
            name: r.itemname || r.name,
            description: r.itemdescription || r.description || '',
            type: mapType(r.itemtypename),
            value: r.value ?? 0,
            quantity: r.quantity ?? 1,
            isEquipped: !!r.isequipped,
          }));

          this.getPlayerProgress(characterId).subscribe({
            next: (progress) => {
              const gold = progress?.gold || 0;
              observer.next({ items, gold });
              observer.complete();
            },
            error: (err) => {
              console.warn('Failed to load player progress for gold; defaulting to 0. Error:', err);
              observer.next({ items, gold: 0 });
              observer.complete();
            }
          });
        },
        error: (err) => {
          console.error('Error loading inventory items from backend:', err);
          // Fallback: still try to provide gold so page can render something
          this.getPlayerProgress(characterId).subscribe({
            next: (progress) => {
              const gold = progress?.gold || 0;
              observer.next({ items: [], gold });
              observer.complete();
            },
            error: (e2) => {
              console.error('Additionally failed to load player progress for gold:', e2);
              observer.error(err);
            }
          });
        }
      });
    });
  }
  
  updateInventoryItem(characterId: number, item: InventoryItem): Observable<InventoryItem> {
    return new Observable(observer => {
      // First get the current player progress
      this.getPlayerProgress(characterId).subscribe({
        next: (progress) => {
          // Update the item in the inventory array
          if (!progress.inventory) {
            progress.inventory = [];
          }
          
          const index = progress.inventory.findIndex(i => i.id === item.id);
          if (index !== -1) {
            progress.inventory[index] = item;
          } else {
            progress.inventory.push(item);
          }
          
          // Save the updated progress
          this.http.put<PlayerProgress>(`${this.apiUrl}/story/progress/${characterId}`, progress, this.httpOptions).subscribe({
            next: () => {
              observer.next(item);
              observer.complete();
            },
            error: (err) => {
              console.error('Error updating inventory item:', err);
              observer.error(err);
            }
          });
        },
        error: (err) => {
          console.error('Error getting player progress for inventory update:', err);
          observer.error(err);
        }
      });
    });
  }
  
  // Health check for database connection
  checkConnection(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/health`);
  }
}
