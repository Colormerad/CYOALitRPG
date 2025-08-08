import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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

  // Inventory operations
  getCharacterInventory(characterId: number): Observable<{ items: InventoryItem[], gold: number }> {
    // Get the player progress which contains the real inventory data
    return new Observable(observer => {
      this.getPlayerProgress(characterId).subscribe({
        next: (progress) => {
          // Initialize items array
          let items: InventoryItem[] = [];
          
          // Add inventory items from player progress if they exist
          if (progress.inventory && Array.isArray(progress.inventory)) {
            items = [...progress.inventory];
          }
          
          // Add equipment items if they exist but aren't already in the inventory
          if (progress.equipment && Array.isArray(progress.equipment)) {
            // Convert equipment items to inventory items if they're not already in the format
            const equipmentItems = progress.equipment.map((item: any, index: number) => {
              // If the item is already an InventoryItem object, use it directly
              if (typeof item === 'object' && item !== null && 'id' in item && 'name' in item) {
                // Check if this equipment item is already in the inventory
                const existingItem = items.find(invItem => invItem.id === item.id);
                if (existingItem) {
                  return null; // Skip this item as it's already in the inventory
                }
                
                return {
                  ...item,
                  type: item.type || 'equipment',
                  quantity: item.quantity || 1,
                  isEquipped: true // Equipment items are equipped by default
                } as InventoryItem;
              }
              
              // Otherwise, create a new InventoryItem from the equipment string or object
              const itemName = typeof item === 'string' ? item : `Equipment ${index + 1}`;
              
              // Check if this equipment item is already in the inventory by name
              const existingItem = items.find(invItem => invItem.name === itemName);
              if (existingItem) {
                return null; // Skip this item as it's already in the inventory
              }
              
              return {
                id: 1000 + items.length + index, // Generate a unique ID
                name: itemName,
                description: `Class equipment: ${itemName}`,
                type: 'equipment' as 'equipment',
                value: 0,
                quantity: 1,
                isEquipped: true,
                equipSlot: 'weapon' as 'weapon' // Default slot, should be determined based on item type
              };
            }).filter((item): item is InventoryItem => item !== null);
            
            // Add equipment items to the inventory
            items = [...items, ...equipmentItems];
          }
          
          const gold = progress.gold || 0;
          
          // Return the combined inventory data
          observer.next({ items, gold });
          observer.complete();
        },
        error: (err) => {
          console.error('Error loading inventory data from player progress:', err);
          observer.error(err);
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
