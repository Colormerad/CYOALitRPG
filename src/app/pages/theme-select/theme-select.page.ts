import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

interface Theme {
  id: string;
  name: string;
  description: string;
  primaryColor: string;
  backgroundColor: string;
  preview: string;
}

@Component({
  selector: 'app-theme-select',
  templateUrl: './theme-select.page.html',
  styleUrls: ['./theme-select.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class ThemeSelectPage implements OnInit {
  selectedTheme: Theme | null = null;
  
  themes: Theme[] = [
    {
      id: 'retro-green',
      name: 'Retro Green',
      description: 'Classic Game Boy inspired green theme',
      primaryColor: '#9bbc0f',
      backgroundColor: '#0f380f',
      preview: 'Current default theme with nostalgic green tones'
    },
    {
      id: 'zelda-classic',
      name: 'Hyrule Gold',
      description: 'Inspired by The Legend of Zelda',
      primaryColor: '#ffd700',
      backgroundColor: '#2d4a22',
      preview: 'Golden treasures and forest greens of Hyrule'
    },
    {
      id: 'mario-classic',
      name: 'Mushroom Kingdom',
      description: 'Super Mario Bros classic colors',
      primaryColor: '#ff6b47',
      backgroundColor: '#5c94fc',
      preview: 'Red and blue from the Mushroom Kingdom'
    },
    {
      id: 'metroid-space',
      name: 'Space Pirate',
      description: 'Metroid space station theme',
      primaryColor: '#ff4444',
      backgroundColor: '#1a1a2e',
      preview: 'Dark space corridors with danger alerts'
    },
    {
      id: 'castlevania-gothic',
      name: 'Dracula\'s Castle',
      description: 'Gothic Castlevania atmosphere',
      primaryColor: '#cc9900',
      backgroundColor: '#2d1b69',
      preview: 'Gothic purples and golden candlelight'
    },
    {
      id: 'megaman-electric',
      name: 'Robot Master',
      description: 'Mega Man electric blue theme',
      primaryColor: '#00ccff',
      backgroundColor: '#1a1a3a',
      preview: 'Electric blues of the robot masters'
    },
    {
      id: 'contra-military',
      name: 'Jungle Warfare',
      description: 'Contra military green theme',
      primaryColor: '#66ff66',
      backgroundColor: '#0d2818',
      preview: 'Military greens from the jungle battlefields'
    },
    {
      id: 'pac-man-arcade',
      name: 'Arcade Neon',
      description: 'Pac-Man arcade cabinet colors',
      primaryColor: '#ffff00',
      backgroundColor: '#000080',
      preview: 'Bright neon yellows on deep arcade blue'
    },
    {
      id: 'retro-amber',
      name: 'Amber Terminal',
      description: 'Vintage computer terminal amber theme',
      primaryColor: '#ffb000',
      backgroundColor: '#2b1810',
      preview: 'Warm amber colors reminiscent of old terminals'
    },
    {
      id: 'retro-purple',
      name: 'Mystic Purple',
      description: 'Magical purple fantasy theme',
      primaryColor: '#b19cd9',
      backgroundColor: '#2d1b3d',
      preview: 'Mystical purple colors perfect for fantasy adventures'
    }
  ];

  constructor(private router: Router) { }

  ngOnInit(): void {
    // Load saved theme preference
    const savedTheme = localStorage.getItem('selectedTheme') || 'retro-green';
    this.selectedTheme = this.themes.find(theme => theme.id === savedTheme) || this.themes[0];
  }

  // Provide CSS variables to preview each theme's border frame on the card itself
  themeFrameVars(theme: Theme) {
    return {
      // Use the default 32x32 4x4-slice frame unless a theme specifies otherwise
      '--frame-image-url': `url('/assets/frames/32/frame-22/full.png')`,
      '--slice-top': 8,
      '--slice-right': 8,
      '--slice-bottom': 8,
      '--slice-left': 8,
      '--frame-border-width': '8px',
      // Tint and background per theme preview
      '--frame-tint-color': theme.primaryColor,
      '--frame-tint-opacity': 0.25,
      '--frame-background': theme.backgroundColor,
    } as any;
  }

  onThemeClick(theme: Theme): void {
    if (this.selectedTheme && this.selectedTheme.id === theme.id) {
      this.selectedTheme = null;
    } else {
      this.selectedTheme = theme;
    }
  }

  onApplyTheme(theme: Theme, event: Event): void {
    // Prevent the theme card click event from firing
    event.stopPropagation();
    
    // Apply the theme
    this.applyTheme(theme);
  }

  applyTheme(theme: Theme): void {
    // Save theme preference
    localStorage.setItem('selectedTheme', theme.id);
    
    // Apply theme to document root
    const root = document.documentElement;
    
    // Update CSS custom properties based on theme
    switch (theme.id) {
      case 'retro-green':
        root.style.setProperty('--retro-bg', '#0f380f');
        root.style.setProperty('--retro-bg-light', '#1a5a1a');
        root.style.setProperty('--retro-green-darkest', '#0f380f');
        root.style.setProperty('--retro-green-dark', '#306230');
        root.style.setProperty('--retro-green-medium', '#8bac0f');
        root.style.setProperty('--retro-green-light', '#9bbc0f');
        root.style.setProperty('--retro-green-lightest', '#c4d626');
        break;
      case 'zelda-classic':
        root.style.setProperty('--retro-bg', '#2d4a22');
        root.style.setProperty('--retro-bg-light', '#3d5a32');
        root.style.setProperty('--retro-green-darkest', '#2d4a22');
        root.style.setProperty('--retro-green-dark', '#4a7a3a');
        root.style.setProperty('--retro-green-medium', '#ccaa00');
        root.style.setProperty('--retro-green-light', '#ffd700');
        root.style.setProperty('--retro-green-lightest', '#ffff66');
        break;
      case 'mario-classic':
        root.style.setProperty('--retro-bg', '#5c94fc');
        root.style.setProperty('--retro-bg-light', '#7ca4ff');
        root.style.setProperty('--retro-green-darkest', '#5c94fc');
        root.style.setProperty('--retro-green-dark', '#ff4433');
        root.style.setProperty('--retro-green-medium', '#ff5544');
        root.style.setProperty('--retro-green-light', '#ff6b47');
        root.style.setProperty('--retro-green-lightest', '#ff8866');
        break;
      case 'metroid-space':
        root.style.setProperty('--retro-bg', '#1a1a2e');
        root.style.setProperty('--retro-bg-light', '#2a2a3e');
        root.style.setProperty('--retro-green-darkest', '#1a1a2e');
        root.style.setProperty('--retro-green-dark', '#cc3333');
        root.style.setProperty('--retro-green-medium', '#ee3333');
        root.style.setProperty('--retro-green-light', '#ff4444');
        root.style.setProperty('--retro-green-lightest', '#ff6666');
        break;
      case 'castlevania-gothic':
        root.style.setProperty('--retro-bg', '#2d1b69');
        root.style.setProperty('--retro-bg-light', '#3d2b79');
        root.style.setProperty('--retro-green-darkest', '#2d1b69');
        root.style.setProperty('--retro-green-dark', '#9966cc');
        root.style.setProperty('--retro-green-medium', '#aa7700');
        root.style.setProperty('--retro-green-light', '#cc9900');
        root.style.setProperty('--retro-green-lightest', '#ffcc33');
        break;
      case 'megaman-electric':
        root.style.setProperty('--retro-bg', '#1a1a3a');
        root.style.setProperty('--retro-bg-light', '#2a2a4a');
        root.style.setProperty('--retro-green-darkest', '#1a1a3a');
        root.style.setProperty('--retro-green-dark', '#0099cc');
        root.style.setProperty('--retro-green-medium', '#00aadd');
        root.style.setProperty('--retro-green-light', '#00ccff');
        root.style.setProperty('--retro-green-lightest', '#66ddff');
        break;
      case 'contra-military':
        root.style.setProperty('--retro-bg', '#0d2818');
        root.style.setProperty('--retro-bg-light', '#1d3828');
        root.style.setProperty('--retro-green-darkest', '#0d2818');
        root.style.setProperty('--retro-green-dark', '#2d5830');
        root.style.setProperty('--retro-green-medium', '#44cc44');
        root.style.setProperty('--retro-green-light', '#66ff66');
        root.style.setProperty('--retro-green-lightest', '#99ff99');
        break;
      case 'pac-man-arcade':
        root.style.setProperty('--retro-bg', '#000080');
        root.style.setProperty('--retro-bg-light', '#1a1a90');
        root.style.setProperty('--retro-green-darkest', '#000080');
        root.style.setProperty('--retro-green-dark', '#cccc00');
        root.style.setProperty('--retro-green-medium', '#dddd00');
        root.style.setProperty('--retro-green-light', '#ffff00');
        root.style.setProperty('--retro-green-lightest', '#ffff66');
        break;
      case 'retro-amber':
        root.style.setProperty('--retro-bg', '#2b1810');
        root.style.setProperty('--retro-bg-light', '#3d2418');
        root.style.setProperty('--retro-green-darkest', '#2b1810');
        root.style.setProperty('--retro-green-dark', '#5d3a20');
        root.style.setProperty('--retro-green-medium', '#cc8800');
        root.style.setProperty('--retro-green-light', '#ffb000');
        root.style.setProperty('--retro-green-lightest', '#ffd633');
        break;
      case 'retro-purple':
        root.style.setProperty('--retro-bg', '#2d1b3d');
        root.style.setProperty('--retro-bg-light', '#3d2550');
        root.style.setProperty('--retro-green-darkest', '#2d1b3d');
        root.style.setProperty('--retro-green-dark', '#5c3a7a');
        root.style.setProperty('--retro-green-medium', '#8b5fbf');
        root.style.setProperty('--retro-green-light', '#b19cd9');
        root.style.setProperty('--retro-green-lightest', '#d4c4f0');
        break;
    }
    
    // Show confirmation and navigate back
    setTimeout(() => {
      this.router.navigate(['/profile']);
    }, 500);
  }

  goBack(): void {
    this.router.navigate(['/profile']);
  }
}
