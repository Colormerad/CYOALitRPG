import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from './services/auth.service';

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
        
        // Check if current page is login or registration
        this.isAuthPage = currentUrl.includes('/login') || currentUrl.includes('/register');
        
        // Set active menu item based on URL
        if (currentUrl.includes('/game')) {
          this.activeMenuItem = 'game';
        } else if (currentUrl.includes('/inventory')) {
          this.activeMenuItem = 'inventory';
        } else if (currentUrl.includes('/quests')) {
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
    
    // Handle navigation based on page
    switch (page) {
      case 'game':
        this.router.navigate(['/game']);
        break;
      case 'inventory':
        this.router.navigate(['/inventory']);
        break;
      case 'quests':
        this.router.navigate(['/quests']);
        break;
      case 'profile':
        this.router.navigate(['/profile']);
        break;
      default:
        break;
    }
  }
}
