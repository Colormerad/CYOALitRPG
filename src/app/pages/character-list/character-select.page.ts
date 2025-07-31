import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, Account } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-character-select',
  templateUrl: './character-select.page.html',
  styleUrls: ['./character-select.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class CharacterSelectPage implements OnInit, OnDestroy {
  characters: any[] = [];
  loading = true;
  error = '';
  username = '';
  selectedCharacter: any = null;
  private accountSubscription: Subscription | null = null;

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    // Get initial account state to avoid showing error on first load
    const initialAccount = this.authService.getCurrentAccount();
    if (initialAccount) {
      this.username = initialAccount.username || 'Player';
      this.loadCharacters(initialAccount.id);
    }
    
    // Subscribe to account changes to update username reactively
    this.accountSubscription = this.authService.currentAccount$.subscribe(account => {
      if (!account) {
        // Don't show error if we're just transitioning between accounts
        // Only show error if we stay in this state for a while
        return;
      }
      
      // Update username whenever account changes
      this.username = account.username || 'Player';
      
      // Load characters for the current account
      this.loadCharacters(account.id);
    });
  }
  
  /**
   * Load characters for the given account ID
   */
  private loadCharacters(accountId: number) {
    // Use full API URL to prevent 404 errors
    this.http.get(`http://localhost:3000/api/characters/user/${accountId}`).subscribe({
      next: (data: any) => {
        this.characters = data;
        this.loading = false;
      },
      error: err => {
        this.error = 'Failed to load characters.';
        this.loading = false;
      }
    });
  }
  
  ngOnDestroy() {
    // Clean up subscription to prevent memory leaks
    if (this.accountSubscription) {
      this.accountSubscription.unsubscribe();
      this.accountSubscription = null;
    }
  }

  onCharacterClick(character: any) {
    // If the character is already selected, deselect it
    if (this.selectedCharacter && this.selectedCharacter.id === character.id) {
      this.selectedCharacter = null;
    } else {
      // Otherwise, select the character
      this.selectedCharacter = character;
    }
  }

  playCharacter(character: any) {
    // Navigate to the game page with the character ID
    if (character && character.id) {
      this.router.navigate(['/game', character.id]);
    } else {
      this.error = 'Invalid character selection';
    }
  }

  deleteCharacter(character: any) {
    if (!character || !character.id) {
      this.error = 'Invalid character selection';
      return;
    }

    // Confirm deletion
    if (confirm(`Are you sure you want to delete ${character.name}? This character will be marked as dead.`)) {
      // Mark character as dead
      this.http.put(`http://localhost:3000/api/characters/${character.id}/mark-dead`, {})
        .subscribe({
          next: () => {
            // Update character in the local array
            const index = this.characters.findIndex(c => c.id === character.id);
            if (index !== -1) {
              this.characters[index].is_dead = true;
              this.selectedCharacter = null; // Deselect the character
            }
          },
          error: err => {
            console.error('Error marking character as dead:', err);
            this.error = 'Failed to delete character';
          }
        });
    }
  }

  createCharacter() {
    // Navigate to the character creation page
    this.router.navigate(['/create-character']);
  }
  
  viewGrave(character: any) {
    if (!character || !character.id) {
      this.error = 'Invalid character selection';
      return;
    }
    
    // Navigate to the grave view page with the character ID
    this.router.navigate(['/grave-view', character.id]);
  }
  
  clearError() {
    // Clear the error state and reset any failed operations
    this.error = '';
    this.selectedCharacter = null;
  }
}
