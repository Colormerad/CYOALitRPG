import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatabaseService, StoryNode, Choice, PlayerProgress, CharacterProfile } from '../../services/database.service';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './game.page.html',
  styleUrls: ['./game.page.scss']
})
export class GamePage implements OnInit {
  characterId: number = 0;
  currentNode: StoryNode | null = null;
  choices: Choice[] = [];
  playerProgress: PlayerProgress | null = null;
  loading: boolean = true;
  error: string | null = null;
  passwordInput: string = '';
  characterProfile: CharacterProfile | null = null;
  
  // Helper for template
  objectKeys = Object.keys;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private databaseService: DatabaseService
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

  loadPlayerProgress(): void {
    this.loading = true;
    this.databaseService.getPlayerProgress(this.characterId).subscribe({
      next: (progress) => {
        this.playerProgress = progress;
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

  makeChoice(choiceId: number, choice?: Choice): void {
    this.loading = true;
    
    // Check if this is an outfit selection choice with a classId
    const classId = choice?.classId;
    
    this.databaseService.makeChoice(this.characterId, choiceId, undefined, classId).subscribe({
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
    this.router.navigate(['/character-select']);
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
