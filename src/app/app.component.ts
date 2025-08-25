import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from './services/auth.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  // Flag to determine if game has started (only profile icon enabled initially)
  gameStarted = false;
  // Track active menu item
  activeMenuItem = '';
  // Flag to check if current page is login or registration
  isAuthPage = false;
  // Flag to check if a character is selected
  characterSelected = false;
  
  constructor(
    private router: Router,
    private authService: AuthService
  ) {
    // Subscribe to auth state to determine if game has started
    this.authService.currentAccount$.subscribe(account => {
      if (account) {
        // In a real app, you would check if the user has started a game
        // For now, we'll simulate that the game has started if the user is logged in
        this.gameStarted = true;
      } else {
        this.gameStarted = false;
      }
    });
    
    // Set active menu item based on current route
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        const currentUrl = event.url;
        
        // Check if current page should hide navigation (auth pages, character select, grave)
        this.isAuthPage = currentUrl.includes('/login') || 
                         currentUrl.includes('/register') || 
                         currentUrl.includes('/select-character') ||
                         currentUrl.includes('/grave');
        
        // Check if a character is selected by looking for character ID in URL
        const characterIdMatch = currentUrl.match(/\/(game|inventory|quests|icon-select)\/([0-9]+)/);
        this.characterSelected = characterIdMatch !== null && characterIdMatch.length > 2;
        
        // Set active menu item based on URL
        if (currentUrl.includes('/game')) {
          this.activeMenuItem = 'game';
        } else if (currentUrl.includes('/inventory')) {
          this.activeMenuItem = 'inventory';
        } else if (currentUrl.includes('/quests') || currentUrl.includes('/icon-select')) {
          this.activeMenuItem = 'quests';
        } else if (currentUrl.includes('/profile')) {
          this.activeMenuItem = 'profile';
        } else {
          this.activeMenuItem = '';
        }
      }
    });
  }
  
  /**
   * Navigate to the selected page
   * @param page The page to navigate to
   */
  navigateToPage(page: string): void {
    // If game hasn't started, only allow navigation to profile
    if (!this.gameStarted && page !== 'profile') {
      return;
    }
    
    // Set active menu item
    this.activeMenuItem = page;
    
    // Get current character ID from URL if available
    let characterId: number | null = null;
    const currentUrl = this.router.url;
    const gameMatch = currentUrl.match(/\/game\/(\d+)/);
    if (gameMatch && gameMatch[1]) {
      characterId = parseInt(gameMatch[1], 10);
    }
    
    // Handle navigation based on page
    switch (page) {
      case 'game':
        this.navigateToGame();
        break;
      case 'inventory':
        if (characterId) {
          this.router.navigate(['/inventory', characterId]);
        } else {
          this.router.navigate(['/select-character']);
        }
        break;
      case 'quests':
        if (characterId) {
          this.router.navigate(['/icon-select', characterId]);
        } else {
          this.router.navigate(['/select-character']);
        }
        break;
      case 'profile':
        this.router.navigate(['/profile']);
        break;
      default:
        break;
    }
  }

  /**
   * Smart navigation to game - returns to active game or character select
   */
  private async navigateToGame(): Promise<void> {
    // First, check if we're currently in a game (URL contains character ID)
    const currentUrl = this.router.url;
    const gameMatch = currentUrl.match(/\/game\/(\d+)/);
    if (gameMatch && gameMatch[1]) {
      // Already in a game, check if character is still alive
      const characterId = parseInt(gameMatch[1], 10);
      const isAlive = await this.checkCharacterIsAlive(characterId);
      if (isAlive) {
        this.router.navigate(['/game', characterId]);
        return;
      } else {
        // Character is dead, clear stored ID and go to character select
        localStorage.removeItem('activeCharacterId');
        this.router.navigate(['/select-character']);
        return;
      }
    }

    // Check if there's a stored active character ID in localStorage
    const storedCharacterId = localStorage.getItem('activeCharacterId');
    if (storedCharacterId) {
      const characterId = parseInt(storedCharacterId, 10);
      if (!isNaN(characterId)) {
        // Check if the stored character is still alive
        const isAlive = await this.checkCharacterIsAlive(characterId);
        if (isAlive) {
          // Navigate to the stored character's game
          this.router.navigate(['/game', characterId]);
          return;
        } else {
          // Character is dead, clear stored ID and go to character select
          localStorage.removeItem('activeCharacterId');
          this.router.navigate(['/select-character']);
          return;
        }
      }
    }

    // Check if any other page has a character ID we can use
    const inventoryMatch = currentUrl.match(/\/inventory\/(\d+)/);
    const questsMatch = currentUrl.match(/\/quests\/(\d+)/);
    const iconSelectMatch = currentUrl.match(/\/icon-select\/(\d+)/);
    
    if (inventoryMatch && inventoryMatch[1]) {
      const characterId = parseInt(inventoryMatch[1], 10);
      const isAlive = await this.checkCharacterIsAlive(characterId);
      if (isAlive) {
        this.router.navigate(['/game', characterId]);
        return;
      } else {
        // Character is dead, go to character select
        this.router.navigate(['/select-character']);
        return;
      }
    }
    
    if (questsMatch && questsMatch[1]) {
      const characterId = parseInt(questsMatch[1], 10);
      const isAlive = await this.checkCharacterIsAlive(characterId);
      if (isAlive) {
        this.router.navigate(['/game', characterId]);
        return;
      } else {
        // Character is dead, go to character select
        this.router.navigate(['/select-character']);
        return;
      }
    }

    if (iconSelectMatch && iconSelectMatch[1]) {
      const characterId = parseInt(iconSelectMatch[1], 10);
      const isAlive = await this.checkCharacterIsAlive(characterId);
      if (isAlive) {
        this.router.navigate(['/game', characterId]);
        return;
      } else {
        // Character is dead, go to character select
        this.router.navigate(['/select-character']);
        return;
      }
    }

    // No active game found, go to character select
    this.router.navigate(['/select-character']);
  }

  private async checkCharacterIsAlive(characterId: number): Promise<boolean> {
    try {
      // Make API call to check character status
      const response = await fetch(`${environment.apiBase}/characters/${characterId}`);
      if (response.ok) {
        const character = await response.json();
        return !character.is_dead;
      }
      return false;
    } catch (error) {
      console.error('Error checking character status:', error);
      // If we can't check, assume character is alive to avoid breaking navigation
      return true;
    }
  }
}
