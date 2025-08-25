import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../../services/database.service';
import { StoryNode, Choice } from '../../models/story.model';
import { PlayerProgress } from '../../models/player-progress.model';
import { CharacterProfile } from '../../models/character-profile.model';
import { Character } from '../../models/character.model';
import { AudioService } from '../../services/audio.service';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './game.page.html',
  styleUrls: ['./game.page.scss']
})
export class GamePage implements OnInit, AfterViewInit {
  @ViewChild('backgroundMusic') backgroundMusic!: ElementRef<HTMLAudioElement>;
  characterId: number = 0;
  currentNode: StoryNode | null = null;
  choices: Choice[] = [];
  playerProgress: PlayerProgress | null = null;
  loading: boolean = true;
  error: string | null = null;
  passwordInput: string = '';
  characterProfile: CharacterProfile | null = null;
  characterData: Character | null = null;
  isDeathScreen: boolean = false;
  selectedChoice: Choice | null = null;
  
  // Helper for template
  objectKeys = Object.keys;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private databaseService: DatabaseService,
    private audioService: AudioService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.characterId = +params['id']; // Convert to number
      if (this.characterId) {
        this.loadPlayerProgress();
      } else {
        this.error = 'Invalid character ID';
        this.loading = false;
      }
    });
  }

  ngAfterViewInit(): void {
    this.initializeMusic();
  }

  ngOnDestroy(): void {
    if (this.backgroundMusic) {
      this.backgroundMusic.nativeElement.pause();
    }
  }

  private initializeMusic() {
    if (!this.backgroundMusic) {
      console.error('Background music element not found');
      return;
    }

    const audioEl = this.backgroundMusic.nativeElement;
    audioEl.loop = true;

    // React to global volume/mute
    this.audioService.volume$.subscribe(volume => {
      audioEl.volume = volume;
    });
    this.audioService.muted$.subscribe(muted => {
      audioEl.muted = muted;
    });

    audioEl.addEventListener('error', () => {
      console.error('Game page audio error', audioEl.error);
    });

    // Attempt playback (handles most autoplay cases after user interaction)
    audioEl.play().catch(err => {
      console.warn('Autoplay blocked on game page; will retry after user interaction.', err);
      const tryPlay = () => {
        audioEl.play().catch(() => {});
        window.removeEventListener('click', tryPlay);
        window.removeEventListener('keydown', tryPlay);
      };
      window.addEventListener('click', tryPlay, { once: true });
      window.addEventListener('keydown', tryPlay, { once: true });
    });
  }

  loadPlayerProgress(): void {
    this.loading = true;
    this.databaseService.getPlayerProgress(this.characterId).subscribe({
      next: (progress) => {
        this.playerProgress = progress;
        // Load character data to check if character is dead
        this.loadCharacterData();
        if (progress.currentNode && progress.currentNode.id) {
          this.loadCurrentNode(progress.currentNode.id);
        } else {
          this.error = 'No current story node found';
          this.loading = false;
        }
      },
      error: (err: any) => {
        console.error('Error loading player progress:', err);
        this.error = 'Failed to load game progress. Please try again.';
        this.loading = false;
      }
    });
  }

  loadCurrentNode(nodeId: number): void {
    this.databaseService.getStoryNode(nodeId).subscribe({
      next: (node) => {
        // Process any remaining placeholders in the content
        if (node.content) {
          node.content = this.processPlaceholders(node.content);
        }
        
        this.currentNode = node;
        // Load character profile
        this.loadCharacterProfile();
        
        // Check if this is a death node (title is 'The End')
        console.log('Checking if node is a death node:', node.title);
        if (node.title && node.title.toLowerCase() === 'the end') {
          console.log('Death node detected! Setting isDeathScreen to true');
          
          this.isDeathScreen = true;
          
          // Mark the character as dead using the database service
          this.databaseService.markCharacterDead(this.characterId).subscribe({
            next: (response) => {
              console.log('Character marked as dead successfully:', response);
              
              // Verify character death status after marking as dead
              this.databaseService.getCharacter(this.characterId).subscribe({
                next: (character) => {
                  console.log('Character after marking as dead:', character);
                  console.log('Is character marked as dead?', character.is_dead);
                },
                error: (err) => console.error('Error checking character death status:', err)
              });
            },
            error: (err) => {
              console.error('Error marking character as dead:', err);
              this.error = 'Failed to mark character as dead';
            }
          });
        }
        
        // Extract choices from the node if available
        if (node.choices && Array.isArray(node.choices)) {
          this.choices = node.choices;
          this.loading = false;
        } else {
          this.choices = [];
          this.loading = false;
        }
      },
      error: (err: any) => {
        console.error('Error loading story node:', err);
        this.error = 'Failed to load story content. Please try again.';
        this.loading = false;
      }
    });
  }

  loadCharacterProfile(): void {
    this.databaseService.getCharacterProfile(this.characterId).subscribe({
      next: (profile) => {
        this.characterProfile = profile;
      },
      error: (err: any) => {
        console.error('Error loading character profile:', err);
        // Non-blocking error, continue with the game
      }
    });
  }

  onChoiceClick(choice: Choice): void {
    if (this.selectedChoice && this.selectedChoice.id === choice.id) {
      this.selectedChoice = null;
    } else {
      this.selectedChoice = choice;
    }
  }

  onPlayIconClick(choice: Choice, event: Event): void {
    // Prevent the choice card click event from firing
    event.stopPropagation();
    
    // Make the choice immediately
    this.makeChoice(choice.id || 0, choice);
  }

  makeChoice(choiceId: number, choice?: Choice): void {
    this.loading = true;

    // If this choice initiates a battle, route to BattlePage with outcome wiring
    const effects: any = (choice as any)?.effects || (choice as any)?.Effects || {};
    const battle = effects?.battle || effects?.Battle || effects; // allow effects with onWin/onLose at top-level
    const hasBattleSignals = !!(battle?.onWin || battle?.on_win || battle?.onLose || battle?.on_lose);
    if (battle && hasBattleSignals) {
      this.loading = false;
      const npc = battle.opponent || battle.npc || effects.npc || 'sir-sebastian';
      const onWin = battle.onWin || battle.on_win || {};
      const onLose = battle.onLose || battle.on_lose || {};
      const winNextRaw = (onWin.nextNodeId ?? onWin.next_node_id ?? onWin.nextPromptId ?? onWin.next_prompt_id);
      const loseNextRaw = (onLose.nextNodeId ?? onLose.next_node_id ?? onLose.nextPromptId ?? onLose.next_prompt_id);
      const winNext = Number(winNextRaw);
      const loseNext = Number(loseNextRaw);
      this.databaseService.setCurrentCharacter({ id: this.characterId, name: '', classId: undefined } as any);
      this.router.navigate(['/battle'], {
        queryParams: {
          characterId: this.characterId,
          npc,
          choiceId: choiceId,
          nextOnWin: Number.isFinite(winNext) ? winNext : undefined,
          nextOnLose: Number.isFinite(loseNext) ? loseNext : undefined,
          expOnWin: onWin.experienceGain ? JSON.stringify(onWin.experienceGain) : undefined,
          expOnLose: onLose.experienceGain ? JSON.stringify(onLose.experienceGain) : undefined,
        }
      });
      return;
    }

    // Check if this is an outfit selection choice with a classId
    const classId = choice?.classId;
    const outfitStyle = choice?.outfitStyle;
    
    // If this is a class selection via outfit, handle it separately
    if (classId) {
      console.log(`Outfit selection with classId ${classId} detected, handling separately`);
      
      // First make the choice to advance the story
      this.databaseService.makeChoice(this.characterId, choiceId).subscribe({
        next: (progress) => {
          this.playerProgress = progress;
          
          // Then set the character class
          this.databaseService.setCharacterClass(this.characterId, classId, outfitStyle).subscribe({
            next: (updatedProgress) => {
              console.log('Class assignment successful:', updatedProgress);
              this.playerProgress = updatedProgress;
              
              if (progress.currentNode && progress.currentNode.id) {
                this.loadCurrentNode(progress.currentNode.id);
              } else {
                this.error = 'No next story node found';
                this.loading = false;
              }
            },
            error: (err: any) => {
              console.error('Error assigning class:', err);
              this.error = 'Failed to assign character class. Please try again.';
              this.loading = false;
            }
          });
        },
        error: (err: any) => {
          console.error('Error making choice:', err);
          this.error = 'Failed to process your choice. Please try again.';
          this.loading = false;
        }
      });
    } else {
      // Regular choice without class assignment
      this.databaseService.makeChoice(this.characterId, choiceId).subscribe({
        next: (progress) => {
          this.playerProgress = progress;
          if (progress.currentNode && progress.currentNode.id) {
            this.loadCurrentNode(progress.currentNode.id);
          } else {
            this.error = 'No next story node found';
            this.loading = false;
          }
        },
        error: (err: any) => {
          console.error('Error making choice:', err);
          this.error = 'Failed to process your choice. Please try again.';
          this.loading = false;
        }
      });
    }
  }

  submitPassword(): void {
    if (!this.passwordInput) {
      this.error = 'Please enter a password';
      return;
    }

    this.loading = true;
    this.databaseService.submitPassword(this.characterId, this.passwordInput).subscribe({
      next: (progress) => {
        this.passwordInput = ''; // Clear the input
        this.playerProgress = progress;
        if (progress.currentNode && progress.currentNode.id) {
          this.loadCurrentNode(progress.currentNode.id);
        } else {
          this.error = 'No next story node found';
          this.loading = false;
        }
      },
      error: (err: any) => {
        console.error('Error submitting password:', err);
        this.error = 'Incorrect password. Please try again.';
        this.loading = false;
      }
    });
  }
  
  formatMetadataKey(key: string): string {
    // Convert camelCase or snake_case to Title Case with spaces
    return key
      .replace(/([A-Z])/g, ' $1') // Insert a space before all capital letters
      .replace(/_/g, ' ') // Replace underscores with spaces
      .replace(/^./, (str) => str.toUpperCase()); // Capitalize the first letter
  }

  goToCharacterSelect(): void {
    this.router.navigate(['/select-character']);
  }
  
  goToInventory(): void {
    this.router.navigate(['/inventory', this.characterId]);
  }
  
  loadCharacterData(): void {
    this.databaseService.getCharacter(this.characterId).subscribe({
      next: (character) => {
        this.characterData = character;
        // Check if character is marked as dead
        if (character && character.is_dead) {
          this.isDeathScreen = true;
        }
      },
      error: (err: any) => {
        console.error('Error loading character data:', err);
        // Non-blocking error, continue with the game
      }
    });
  }
  
  startOver(): void {
    // Navigate to character creation to start a new character
    this.router.navigate(['/character-create']);
  }
  
  viewGrave(): void {
    // Navigate to the grave view page with the character ID
    // Pass a query parameter to indicate this character came from the death screen
    this.router.navigate(['/grave-view', this.characterId], {
      queryParams: { fromDeathScreen: 'true' }
    });
  }

  /**
   * Process any remaining placeholders in the content
   * @param content The content to process
   * @returns The processed content with placeholders replaced
   */
  processPlaceholders(content: string): string {
    if (!content) return content;
    
    // Replace {{prompt2answer}} with a gendered term based on user preference
    if (content.includes('{{prompt2answer}}')) {
      let address = 'adventurer';
      
      // Check if we have player progress with metadata
      if (this.playerProgress?.metadata?.gender_preference) {
        if (this.playerProgress.metadata.gender_preference === 'masculine') {
          address = 'my lord';
        } else if (this.playerProgress.metadata.gender_preference === 'feminine') {
          address = 'my lady';
        }
      }
      
      content = content.replace(/\{\{prompt2answer\}\}/g, address);
      console.log(`Frontend replaced {{prompt2answer}} placeholder with "${address}"`);
    }
    
    // Add more placeholder replacements here as needed
    
    return content;
  }
}
