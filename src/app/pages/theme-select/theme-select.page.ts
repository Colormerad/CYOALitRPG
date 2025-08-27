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
      backgroundColor: '#0b2a6f',
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
    },
    {
      id: 'high-contrast',
      name: 'High Contrast',
      description: 'Accessibility-first high contrast theme',
      primaryColor: '#FFD400',
      backgroundColor: '#000000',
      preview: 'Black background, white text, yellow accents for maximum contrast'
    }
  ];

  // Quick WCAG contrast audit for current CSS vars and auto-adjustment where needed (silent)
  private auditThemeContrast(): void {
    const rootStyles = getComputedStyle(document.documentElement);

    // Helper to ensure a foreground var has >= 4.5:1 contrast against a background var
    const ensureContrastVar = (fgVar: string, bgVar: string): void => {
      const bg = rootStyles.getPropertyValue(bgVar).trim();
      let fg = rootStyles.getPropertyValue(fgVar).trim();
      if (!bg) return;
      if (!fg) return;
      const ratio = this.contrastRatio(bg, fg);
      if (ratio < 4.5) {
        const whiteRatio = this.contrastRatio(bg, '#FFFFFF');
        const blackRatio = this.contrastRatio(bg, '#000000');
        const better = whiteRatio >= blackRatio ? '#FFFFFF' : '#000000';
        document.documentElement.style.setProperty(fgVar, better);
      }
    };

    // Base text on main background
    ensureContrastVar('--retro-text', '--retro-bg');
    // Buttons: if custom button bg not set, fallback to bg-light for audit
    const buttonBg = rootStyles.getPropertyValue('--retro-button-bg').trim() || rootStyles.getPropertyValue('--retro-bg-light').trim();
    if (buttonBg) {
      document.documentElement.style.setProperty('--__audit-button-bg', buttonBg);
      ensureContrastVar('--retro-button-text', '--__audit-button-bg');
      document.documentElement.style.removeProperty('--__audit-button-bg');
    }
    // Inputs
    const inputBg = rootStyles.getPropertyValue('--retro-input-bg').trim();
    if (inputBg) {
      document.documentElement.style.setProperty('--__audit-input-bg', inputBg);
      ensureContrastVar('--retro-input-text', '--__audit-input-bg');
      document.documentElement.style.removeProperty('--__audit-input-bg');
    }
  }

  private contrastRatio(hex1: string, hex2: string): number {
    const L = (h: string) => {
      const rgb = this.hexToRgb(h);
      const srgb = rgb.map(v => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
    };
    const L1 = L(hex1);
    const L2 = L(hex2);
    const [lighter, darker] = L1 > L2 ? [L1, L2] : [L2, L1];
    return (lighter + 0.05) / (darker + 0.05);
  }

  private hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    const bigint = parseInt(h, 16);
    if (h.length === 3) {
      const r = ((bigint >> 8) & 0xf) * 17;
      const g = ((bigint >> 4) & 0xf) * 17;
      const b = (bigint & 0xf) * 17;
      return [r, g, b];
    }
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r, g, b];
  }

  // Preview helper: readable text color per theme on cards
  themeTextColor(theme: Theme): string {
    // Ensure accessible contrast for preview text
    if (theme.id === 'mario-classic' || theme.id === 'high-contrast') return '#FFFFFF';
    return theme.primaryColor;
  }

  constructor(private router: Router) { }

  ngOnInit(): void {
    // Load saved theme preference
    const savedTheme = localStorage.getItem('selectedTheme') || 'retro-green';
    this.selectedTheme = this.themes.find(theme => theme.id === savedTheme) || this.themes[0];
    // Do NOT apply the theme automatically here; keep the page visible.
    // The user should explicitly click the apply overlay to apply and navigate back.
  }

  // Provide CSS variables to preview each theme's border frame on the card itself
  themeFrameVars(theme: Theme) {
    const frameUrl = theme.id === 'castlevania-gothic'
      ? `url('/assets/frames/32/frame-32/full.png')`
      : theme.id === 'mario-classic'
        ? `url('/assets/frames/32/frame-35/full.png')`
      : theme.id === 'retro-green'
        ? `url('/assets/frames/32/frame-37/full.png')`
      : theme.id === 'megaman-electric'
        ? `url('/assets/frames/32/frame-1/full.png')`
      : theme.id === 'metroid-space'
        ? `url('/assets/frames/32/frame-6/full.png')`
      : theme.id === 'contra-military'
        ? `url('/assets/frames/32/frame-7/full.png')`
      : theme.id === 'pac-man-arcade'
        ? `url('/assets/frames/32/frame-9/full.png')`
      : theme.id === 'retro-amber'
        ? `url('/assets/frames/32/frame-13/full.png')`
      : theme.id === 'retro-purple'
        ? `url('/assets/frames/32/frame-16/full.png')`
      : theme.id === 'high-contrast'
        ? `url('/assets/frames/32/frame-22/full.png')`
      : `url('/assets/frames/32/frame-22/full.png')`;
    return {
      // Use the default 32x32 4x4-slice frame unless a theme specifies otherwise
      '--frame-image-url': frameUrl,
      '--slice-top': 8,
      '--slice-right': 8,
      '--slice-bottom': 8,
      '--slice-left': 8,
      '--frame-border-width': '8px',
      // Tint and background per theme preview
      '--frame-tint-color': theme.primaryColor,
      '--frame-tint-opacity': 1,
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

    // Apply theme variables
    this.setThemeVars(theme);

    // Dev: audit key contrast pairs in console and auto-adjust text if needed
    this.auditThemeContrast();
    
    // Show confirmation and navigate back
    setTimeout(() => {
      this.router.navigate(['/profile']);
    }, 500);
  }

  // Apply CSS custom properties for a theme without navigation or auditing side-effects
  private setThemeVars(theme: Theme): void {
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
        // Accessible text and control defaults
        root.style.setProperty('--retro-text', '#FFFFFF');
        root.style.setProperty('--retro-button-text', '#FFFFFF');
        root.style.setProperty('--retro-input-text', '#FFFFFF');
        // Frame tint to match theme
        root.style.setProperty('--frame-tint-color', '#9bbc0f');
        root.style.setProperty('--frame-tint-opacity', '1');
        // Use frame-37 for Retro Green
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
        root.style.setProperty('--retro-text', '#FFFFFF');
        root.style.setProperty('--retro-button-text', '#FFFFFF');
        root.style.setProperty('--retro-input-text', '#FFFFFF');
        root.style.setProperty('--frame-tint-color', '#ffd700');
        root.style.setProperty('--frame-tint-opacity', '1');
        break;
      case 'mario-classic':
        // Accessible Mushroom Kingdom palette (higher contrast)
        // Deep arcade blue background, light text, and vivid accent
        root.style.setProperty('--retro-bg', '#0b2a6f');
        root.style.setProperty('--retro-bg-light', '#18419a');
        // Repurpose the generic green vars as theme ramp for components
        root.style.setProperty('--retro-green-darkest', '#0b2a6f');
        root.style.setProperty('--retro-green-dark', '#123778');
        root.style.setProperty('--retro-green-medium', '#e24a2b');
        root.style.setProperty('--retro-green-light', '#ff6b47');
        root.style.setProperty('--retro-green-lightest', '#ffd7cf');
        // Text and control colors with strong contrast on dark bg
        root.style.setProperty('--retro-text', '#FFFFFF');
        root.style.setProperty('--retro-button-bg', '#123778');
        root.style.setProperty('--retro-button-text', '#FFFFFF');
        root.style.setProperty('--retro-input-bg', '#0f2f7a');
        root.style.setProperty('--retro-input-text', '#FFFFFF');
        root.style.setProperty('--retro-border', '#ff6b47');
        // Use frame-35 for Mushroom Kingdom
        root.style.setProperty('--frame-image-url', `url('/assets/frames/32/frame-35/full.png')`);
        root.style.setProperty('--slice-top', '8');
        root.style.setProperty('--slice-right', '8');
        root.style.setProperty('--slice-bottom', '8');
        root.style.setProperty('--slice-left', '8');
        root.style.setProperty('--frame-border-width', '8px');
        // Frame tint remains vivid but ensure readability against blue bg
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
        root.style.setProperty('--retro-text', '#FFFFFF');
        root.style.setProperty('--retro-button-text', '#FFFFFF');
        root.style.setProperty('--retro-input-text', '#FFFFFF');
        root.style.setProperty('--frame-tint-color', '#ff4444');
        root.style.setProperty('--frame-tint-opacity', '1');
        // Use frame-6 for Space Pirate
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
        root.style.setProperty('--retro-text', '#FFFFFF');
        root.style.setProperty('--retro-button-text', '#FFFFFF');
        root.style.setProperty('--retro-input-text', '#FFFFFF');
        // Use frame-32 for Dracula's Castle
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
        root.style.setProperty('--retro-text', '#FFFFFF');
        root.style.setProperty('--retro-button-text', '#FFFFFF');
        root.style.setProperty('--retro-input-text', '#FFFFFF');
        root.style.setProperty('--frame-tint-color', '#00ccff');
        root.style.setProperty('--frame-tint-opacity', '1');
        // Use frame-1 for Robot Master
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
        root.style.setProperty('--retro-text', '#FFFFFF');
        root.style.setProperty('--retro-button-text', '#FFFFFF');
        root.style.setProperty('--retro-input-text', '#FFFFFF');
        root.style.setProperty('--frame-tint-color', '#66ff66');
        root.style.setProperty('--frame-tint-opacity', '1');
        // Use frame-7 for Jungle Warfare
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
        root.style.setProperty('--retro-text', '#FFFFFF');
        root.style.setProperty('--retro-button-text', '#FFFFFF');
        root.style.setProperty('--retro-input-text', '#FFFFFF');
        root.style.setProperty('--frame-tint-color', '#ffff00');
        root.style.setProperty('--frame-tint-opacity', '1');
        // Use frame-9 for Arcade Neon
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
        root.style.setProperty('--retro-text', '#FFF7EC');
        root.style.setProperty('--retro-button-text', '#FFF7EC');
        root.style.setProperty('--retro-input-text', '#FFF7EC');
        root.style.setProperty('--frame-tint-color', '#ffb000');
        root.style.setProperty('--frame-tint-opacity', '1');
        // Use frame-13 for Amber Terminal
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
        root.style.setProperty('--retro-text', '#FFFFFF');
        root.style.setProperty('--retro-button-text', '#FFFFFF');
        root.style.setProperty('--retro-input-text', '#FFFFFF');
        root.style.setProperty('--frame-tint-color', '#b19cd9');
        root.style.setProperty('--frame-tint-opacity', '1');
        // Use frame-16 for Mystic Purple
        root.style.setProperty('--frame-image-url', `url('/assets/frames/32/frame-16/full.png')`);
        root.style.setProperty('--slice-top', '8');
        root.style.setProperty('--slice-right', '8');
        root.style.setProperty('--slice-bottom', '8');
        root.style.setProperty('--slice-left', '8');
        root.style.setProperty('--frame-border-width', '8px');
        break;
      case 'high-contrast':
        // Accessibility-first: black bg, white text, yellow accents
        root.style.setProperty('--retro-bg', '#000000');
        root.style.setProperty('--retro-bg-light', '#1a1a1a');
        root.style.setProperty('--retro-green-darkest', '#000000');
        root.style.setProperty('--retro-green-dark', '#222222');
        root.style.setProperty('--retro-green-medium', '#FFD400');
        root.style.setProperty('--retro-green-light', '#FFE34D');
        root.style.setProperty('--retro-green-lightest', '#FFF0A6');
        // Text and controls for maximum readability
        root.style.setProperty('--retro-text', '#FFFFFF');
        root.style.setProperty('--retro-button-bg', '#222222');
        root.style.setProperty('--retro-button-text', '#FFFFFF');
        root.style.setProperty('--retro-input-bg', '#111111');
        root.style.setProperty('--retro-input-text', '#FFFFFF');
        root.style.setProperty('--retro-border', '#FFD400');
        // Overlays: dark background with yellow icon/border for clarity
        root.style.setProperty('--overlay-bg', '#111111');
        root.style.setProperty('--overlay-border', '#FFD400');
        root.style.setProperty('--overlay-icon', '#FFD400');
        // Tiles (character/icon selectors)
        root.style.setProperty('--tile-bg', '#0d0d0d');
        root.style.setProperty('--tile-border', '#3a3a3a');
        root.style.setProperty('--tile-selected-bg', '#151515');
        root.style.setProperty('--tile-selected-border', '#FFD400');
        root.style.setProperty('--tile-hover-border', '#FFE34D');
        // Pixel art containers (avatar area)
        root.style.setProperty('--pixel-art-bg', '#0d0d0d');
        root.style.setProperty('--pixel-art-border', '#3a3a3a');
        root.style.setProperty('--pixel-art-swatch', '#1a1a1a');
        // Frame tint and image
        root.style.setProperty('--frame-tint-color', '#FFD400');
        root.style.setProperty('--frame-tint-opacity', '1');
        root.style.setProperty('--frame-image-url', `url('/assets/frames/32/frame-22/full.png')`);
        root.style.setProperty('--slice-top', '8');
        root.style.setProperty('--slice-right', '8');
        root.style.setProperty('--slice-bottom', '8');
        root.style.setProperty('--slice-left', '8');
        root.style.setProperty('--frame-border-width', '8px');
        break;
    }
  }

  

  goBack(): void {
    this.router.navigate(['/profile']);
  }
}
