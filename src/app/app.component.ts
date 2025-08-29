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
    // Ensure a default theme is set and applied on startup
    this.ensureDefaultTheme();
    // Subscribe to auth state to determine if game has started
    this.authService.currentAccount$.subscribe(account => {
      this.gameStarted = !!account;
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
  
  private ensureDefaultTheme(): void {
    const root = document.documentElement;
    const saved = localStorage.getItem('selectedTheme') || 'retro-green';
    if (!localStorage.getItem('selectedTheme')) {
      localStorage.setItem('selectedTheme', saved);
    }
    // Apply full theme variables so UI is correct on first load/refresh.
    switch (saved) {
      case 'retro-green':
        root.style.setProperty('--retro-bg', '#0f380f');
        root.style.setProperty('--retro-bg-light', '#1a5a1a');
        root.style.setProperty('--retro-green-darkest', '#0f380f');
        root.style.setProperty('--retro-green-dark', '#306230');
        root.style.setProperty('--retro-green-medium', '#8bac0f');
        root.style.setProperty('--retro-green-light', '#9bbc0f');
        root.style.setProperty('--retro-green-lightest', '#c4d626');
        root.style.setProperty('--frame-tint-color', '#9bbc0f');
        root.style.setProperty('--frame-tint-opacity', '1');
        root.style.setProperty('--frame-image-url', `url('/assets/frames/32/frame-37/full.png')`);
        root.style.setProperty('--slice-top', '8');
        root.style.setProperty('--slice-right', '8');
        root.style.setProperty('--slice-bottom', '8');
        root.style.setProperty('--slice-left', '8');
        root.style.setProperty('--frame-border-width', '8px');
        break;
      case 'zelda-classic':
        root.style.setProperty('--retro-bg', '#2d4a22');
        root.style.setProperty('--retro-bg-light', '#3d5a32');
        root.style.setProperty('--retro-green-darkest', '#2d4a22');
        root.style.setProperty('--retro-green-dark', '#4a7a3a');
        root.style.setProperty('--retro-green-medium', '#ccaa00');
        root.style.setProperty('--retro-green-light', '#ffd700');
        root.style.setProperty('--retro-green-lightest', '#ffff66');
        root.style.setProperty('--frame-tint-color', '#ffd700');
        root.style.setProperty('--frame-tint-opacity', '1');
        break;
      case 'mario-classic':
        // Accessible Mushroom Kingdom palette
        root.style.setProperty('--retro-bg', '#0b2a6f');
        root.style.setProperty('--retro-bg-light', '#18419a');
        root.style.setProperty('--retro-green-darkest', '#0b2a6f');
        root.style.setProperty('--retro-green-dark', '#123778');
        root.style.setProperty('--retro-green-medium', '#e24a2b');
        root.style.setProperty('--retro-green-light', '#ff6b47');
        root.style.setProperty('--retro-green-lightest', '#ffd7cf');
        root.style.setProperty('--retro-text', '#FFFFFF');
        root.style.setProperty('--retro-button-bg', '#123778');
        root.style.setProperty('--retro-button-text', '#FFFFFF');
        root.style.setProperty('--retro-input-bg', '#0f2f7a');
        root.style.setProperty('--retro-input-text', '#FFFFFF');
        root.style.setProperty('--retro-border', '#ff6b47');
        root.style.setProperty('--frame-image-url', `url('/assets/frames/32/frame-35/full.png')`);
        root.style.setProperty('--slice-top', '8');
        root.style.setProperty('--slice-right', '8');
        root.style.setProperty('--slice-bottom', '8');
        root.style.setProperty('--slice-left', '8');
        root.style.setProperty('--frame-border-width', '8px');
        root.style.setProperty('--frame-tint-color', '#ff6b47');
        root.style.setProperty('--frame-tint-opacity', '1');
        break;
      case 'metroid-space':
        root.style.setProperty('--retro-bg', '#1a1a2e');
        root.style.setProperty('--retro-bg-light', '#2a2a3e');
        root.style.setProperty('--retro-green-darkest', '#1a1a2e');
        root.style.setProperty('--retro-green-dark', '#cc3333');
        root.style.setProperty('--retro-green-medium', '#ee3333');
        root.style.setProperty('--retro-green-light', '#ff4444');
        root.style.setProperty('--retro-green-lightest', '#ff6666');
        root.style.setProperty('--frame-tint-color', '#ff4444');
        root.style.setProperty('--frame-tint-opacity', '1');
        root.style.setProperty('--frame-image-url', `url('/assets/frames/32/frame-6/full.png')`);
        root.style.setProperty('--slice-top', '8');
        root.style.setProperty('--slice-right', '8');
        root.style.setProperty('--slice-bottom', '8');
        root.style.setProperty('--slice-left', '8');
        root.style.setProperty('--frame-border-width', '8px');
        break;
      case 'castlevania-gothic':
        root.style.setProperty('--retro-bg', '#2d1b69');
        root.style.setProperty('--retro-bg-light', '#3d2b79');
        root.style.setProperty('--retro-green-darkest', '#2d1b69');
        root.style.setProperty('--retro-green-dark', '#9966cc');
        root.style.setProperty('--retro-green-medium', '#aa7700');
        root.style.setProperty('--retro-green-light', '#cc9900');
        root.style.setProperty('--retro-green-lightest', '#ffcc33');
        root.style.setProperty('--frame-image-url', `url('/assets/frames/32/frame-32/full.png')`);
        root.style.setProperty('--slice-top', '8');
        root.style.setProperty('--slice-right', '8');
        root.style.setProperty('--slice-bottom', '8');
        root.style.setProperty('--slice-left', '8');
        root.style.setProperty('--frame-border-width', '8px');
        root.style.setProperty('--frame-tint-color', '#cc9900');
        root.style.setProperty('--frame-tint-opacity', '1');
        break;
      case 'megaman-electric':
        root.style.setProperty('--retro-bg', '#1a1a3a');
        root.style.setProperty('--retro-bg-light', '#2a2a4a');
        root.style.setProperty('--retro-green-darkest', '#1a1a3a');
        root.style.setProperty('--retro-green-dark', '#0099cc');
        root.style.setProperty('--retro-green-medium', '#00aadd');
        root.style.setProperty('--retro-green-light', '#00ccff');
        root.style.setProperty('--retro-green-lightest', '#66ddff');
        root.style.setProperty('--frame-tint-color', '#00ccff');
        root.style.setProperty('--frame-tint-opacity', '1');
        root.style.setProperty('--frame-image-url', `url('/assets/frames/32/frame-1/full.png')`);
        root.style.setProperty('--slice-top', '8');
        root.style.setProperty('--slice-right', '8');
        root.style.setProperty('--slice-bottom', '8');
        root.style.setProperty('--slice-left', '8');
        root.style.setProperty('--frame-border-width', '8px');
        break;
      case 'contra-military':
        root.style.setProperty('--retro-bg', '#0d2818');
        root.style.setProperty('--retro-bg-light', '#1d3828');
        root.style.setProperty('--retro-green-darkest', '#0d2818');
        root.style.setProperty('--retro-green-dark', '#2d5830');
        root.style.setProperty('--retro-green-medium', '#44cc44');
        root.style.setProperty('--retro-green-light', '#66ff66');
        root.style.setProperty('--retro-green-lightest', '#99ff99');
        root.style.setProperty('--frame-tint-color', '#66ff66');
        root.style.setProperty('--frame-tint-opacity', '1');
        root.style.setProperty('--frame-image-url', `url('/assets/frames/32/frame-7/full.png')`);
        root.style.setProperty('--slice-top', '8');
        root.style.setProperty('--slice-right', '8');
        root.style.setProperty('--slice-bottom', '8');
        root.style.setProperty('--slice-left', '8');
        root.style.setProperty('--frame-border-width', '8px');
        break;
      case 'pac-man-arcade':
        root.style.setProperty('--retro-bg', '#000080');
        root.style.setProperty('--retro-bg-light', '#1a1a90');
        root.style.setProperty('--retro-green-darkest', '#000080');
        root.style.setProperty('--retro-green-dark', '#cccc00');
        root.style.setProperty('--retro-green-medium', '#dddd00');
        root.style.setProperty('--retro-green-light', '#ffff00');
        root.style.setProperty('--retro-green-lightest', '#ffff66');
        root.style.setProperty('--frame-tint-color', '#ffff00');
        root.style.setProperty('--frame-tint-opacity', '1');
        root.style.setProperty('--frame-image-url', `url('/assets/frames/32/frame-9/full.png')`);
        root.style.setProperty('--slice-top', '8');
        root.style.setProperty('--slice-right', '8');
        root.style.setProperty('--slice-bottom', '8');
        root.style.setProperty('--slice-left', '8');
        root.style.setProperty('--frame-border-width', '8px');
        break;
      case 'retro-amber':
        root.style.setProperty('--retro-bg', '#2b1810');
        root.style.setProperty('--retro-bg-light', '#3d2418');
        root.style.setProperty('--retro-green-darkest', '#2b1810');
        root.style.setProperty('--retro-green-dark', '#5d3a20');
        root.style.setProperty('--retro-green-medium', '#cc8800');
        root.style.setProperty('--retro-green-light', '#ffb000');
        root.style.setProperty('--retro-green-lightest', '#ffd633');
        root.style.setProperty('--frame-tint-color', '#ffb000');
        root.style.setProperty('--frame-tint-opacity', '1');
        root.style.setProperty('--frame-image-url', `url('/assets/frames/32/frame-13/full.png')`);
        root.style.setProperty('--slice-top', '8');
        root.style.setProperty('--slice-right', '8');
        root.style.setProperty('--slice-bottom', '8');
        root.style.setProperty('--slice-left', '8');
        root.style.setProperty('--frame-border-width', '8px');
        break;
      case 'retro-purple':
        root.style.setProperty('--retro-bg', '#2d1b3d');
        root.style.setProperty('--retro-bg-light', '#3d2550');
        root.style.setProperty('--retro-green-darkest', '#2d1b3d');
        root.style.setProperty('--retro-green-dark', '#5c3a7a');
        root.style.setProperty('--retro-green-medium', '#8b5fbf');
        root.style.setProperty('--retro-green-light', '#b19cd9');
        root.style.setProperty('--retro-green-lightest', '#d4c4f0');
        root.style.setProperty('--frame-tint-color', '#b19cd9');
        root.style.setProperty('--frame-tint-opacity', '1');
        root.style.setProperty('--frame-image-url', `url('/assets/frames/32/frame-16/full.png')`);
        root.style.setProperty('--slice-top', '8');
        root.style.setProperty('--slice-right', '8');
        root.style.setProperty('--slice-bottom', '8');
        root.style.setProperty('--slice-left', '8');
        root.style.setProperty('--frame-border-width', '8px');
        break;
      default:
        // Fallback to Retro Green if unknown id
        root.style.setProperty('--retro-bg', '#0f380f');
        root.style.setProperty('--retro-bg-light', '#1a5a1a');
        root.style.setProperty('--retro-green-darkest', '#0f380f');
        root.style.setProperty('--retro-green-dark', '#306230');
        root.style.setProperty('--retro-green-medium', '#8bac0f');
        root.style.setProperty('--retro-green-light', '#9bbc0f');
        root.style.setProperty('--retro-green-lightest', '#c4d626');
        root.style.setProperty('--frame-tint-color', '#9bbc0f');
        root.style.setProperty('--frame-tint-opacity', '1');
        root.style.setProperty('--frame-image-url', `url('/assets/frames/32/frame-37/full.png')`);
        root.style.setProperty('--slice-top', '8');
        root.style.setProperty('--slice-right', '8');
        root.style.setProperty('--slice-bottom', '8');
        root.style.setProperty('--slice-left', '8');
        root.style.setProperty('--frame-border-width', '8px');
        break;
    }
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
