import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DatabaseService, Character } from '../../services/database.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-character-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './character-create.page.html',
  styleUrls: ['./character-create.page.scss']
})
export class CharacterCreatePage {
  characterName: string = '';
  loading: boolean = false;
  error: string | null = null;
  
  constructor(
    private router: Router,
    private databaseService: DatabaseService,
    private authService: AuthService
  ) {}

  createCharacter(): void {
    if (!this.characterName.trim()) {
      this.error = 'Please enter a character name';
      return;
    }

    this.loading = true;
    const currentUser = this.authService.getCurrentAccount();
    
    if (!currentUser || !currentUser.id) {
      this.error = 'You must be logged in to create a character';
      this.loading = false;
      return;
    }

    // Create a new character with default values
    const newCharacter: Character = {
      accountId: currentUser.id,
      name: this.characterName,
      level: 1,
      experience: 0,
      health: 100,
      mana: 100,
      strength: 10,
      dexterity: 10,
      intelligence: 10
    };

    this.databaseService.createCharacter(newCharacter).subscribe({
      next: (character) => {
        this.loading = false;
        // Navigate to the game page with the new character ID
        if (character && character.id) {
          this.router.navigate(['/game', character.id]);
        } else {
          this.error = 'Failed to create character';
        }
      },
      error: (err: any) => {
        console.error('Error creating character:', err);
        this.error = 'Failed to create character. Please try again.';
        this.loading = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/select-character']);
  }
}
