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
    this.http.get(`http://localhost:3000/api/accounts/${accountId}/characters`).subscribe({
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

  selectCharacter(character: any) {
    // Navigate to the game page with the character ID
    if (character && character.id) {
      this.router.navigate(['/game', character.id]);
    } else {
      this.error = 'Invalid character selection';
    }
  }

  createCharacter() {
    // Navigate to the character creation page
    this.router.navigate(['/create-character']);
  }
}
