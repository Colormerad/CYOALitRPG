import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
// HttpClient no longer used directly; requests go through CharacterService
import { CharacterService } from '../../services/character.service';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { SecondaryBottomTabsComponent } from '../../components/secondary-bottom-tabs/secondary-bottom-tabs.component';

@Component({
  selector: 'app-grave-view',
  templateUrl: './grave-view.page.html',
  styleUrls: ['./grave-view.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, SecondaryBottomTabsComponent]
})
export class GraveViewPage implements OnInit {
  character: any = null;
  loading = true;
  error = '';
  
  // Legacy information
  promptsSurvived = 0;
  moralityScale = 50; // 0-100 scale, 50 is neutral
  familyLeftBehind: string[] = [];
  worldImpacts: string[] = [];
  // Additional stats loaded from backend when available
  deathReason: string | null = null;
  deathTimestamp: string | null = null;
  lastChoiceId: number | null = null;
  deathNode: any = null;
  deathPrompt: any = null;
  profile: any = null;
  className: string | null = null;
  
  // Preference slider definitions (0-100 scale)
  private preferenceDefs = [
    { key: 'bravery', label: 'Bravery', minLabel: 'Coward', maxLabel: 'Brave' },
    { key: 'caution', label: 'Caution', minLabel: 'Reckless', maxLabel: 'Cautious' },
    { key: 'combatpreference', label: 'Combat Preference', minLabel: 'Avoids Combat', maxLabel: 'Seeks Combat' },
    { key: 'explorationpreference', label: 'Exploration Preference', minLabel: 'Homebody', maxLabel: 'Explorer' },
    { key: 'socialpreference', label: 'Social Preference', minLabel: 'Introvert', maxLabel: 'Extrovert' },
    { key: 'curiousity', label: 'Curiosity', minLabel: 'Uncurious', maxLabel: 'Curious' }, // handle misspelling
    { key: 'empathy', label: 'Empathy', minLabel: 'Callous', maxLabel: 'Empathetic' },
    // Alignment axes
    { key: 'orderchaos', label: 'Order vs Chaos', minLabel: 'Chaos', maxLabel: 'Order' },
    { key: 'goodevil', label: 'Good vs Evil', minLabel: 'Evil', maxLabel: 'Good' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private characterService: CharacterService
  ) {}

  ngOnInit() {
    const characterId = this.route.snapshot.paramMap.get('id');
   if (!characterId) {
      this.error = 'No character ID provided';
      this.loading = false;
      return;
    }

    this.loadCharacter(parseInt(characterId));
  }

  private loadCharacter(characterId: number) {
    this.characterService.getCharacter(characterId).subscribe({
      next: (character: any) => {
        this.character = character;
        console.log('Character data received:', character);
        
        // Check if is_dead property exists and is true
        // Also check for isDead or IsDead in case of case sensitivity issues
        if (!character.is_dead && !character.isDead && !character.IsDead) {
          console.log('Character is not marked as dead, is_dead =', character.is_dead);
          
          // Force character to be marked as dead if it came from the death screen
          const fromDeathScreen = this.route.snapshot.queryParamMap.get('fromDeathScreen') === 'true';
          if (fromDeathScreen) {
            console.log('Character came from death screen, forcing is_dead = true');
            character.is_dead = true;
            this.loadLegacyData(characterId);
            return;
          }
          
          this.error = `This character is not deceased (is_dead: ${character.is_dead})`;
          this.loading = false;
          return;
        }
        
        console.log('Character is marked as dead, loading legacy data');
        this.loadLegacyData(characterId);
      },
      error: err => {
        console.error('Error loading character:', err);
        this.error = `Failed to load character data: ${err?.status || ''} ${err?.statusText || ''}`.trim();
        this.loading = false;
      }
    });
  }
  
  getClassDisplay(): string {
    // Prefer className from legacy data
    const candidates = [
      this.className,
      this.character?.className,
      this.character?.classname,
      this.character?.class,
      this.profile?.className,
      this.profile?.classname,
      this.profile?.class
    ];
    const found = candidates.find(v => typeof v === 'string' && v.trim().length > 0);
    return (found as string) || 'Warrior';
  }

  private loadLegacyData(characterId: number) {
    this.characterService.getLegacy(characterId).subscribe({
      next: (data: any) => {
        // Expect real data only; drop placeholders
        this.promptsSurvived = data.promptsSurvived ?? 0;
        this.moralityScale = data.moralityScale ?? 50;
        this.familyLeftBehind = data.familyLeftBehind ?? [];
        this.worldImpacts = data.worldImpacts ?? [];
        // Map additional stats if provided by backend
        this.deathReason = data.deathReason ?? data.death_reason ?? null;
        this.deathTimestamp = data.deathTimestamp ?? data.death_timestamp ?? null;
        this.lastChoiceId = data.lastChoiceId ?? null;
        this.deathNode = data.deathNode ?? null;
        this.deathPrompt = data.deathPrompt ?? null;
        this.profile = data.profile ?? data.characterProfile ?? null;
        this.className = data.className ?? data.classname ?? data.class ?? null;
        
        console.debug('Legacy data loaded:', data);
        this.loading = false;
      },
      error: err => {
        console.error('Failed to load legacy data:', err);
        this.error = `Failed to load legacy data: ${err?.status || ''} ${err?.statusText || ''}`.trim();
        this.loading = false;
      }
    });
  }
  
  // Helper methods to generate placeholder data
  // Placeholder generators removed — page now relies solely on backend data
  getCauseOfDeath(): string {
    // Prefer explicit final choice/prompt text over generic metadata messages
    const promptChoice = (this.deathPrompt && (this.deathPrompt.choiceText || this.deathPrompt.selectedChoiceText || this.deathPrompt.text || this.deathPrompt.title)) || '';
    if (promptChoice) return String(promptChoice);
    // Fallback to metadata deathReason if it's non-generic
    const reason = this.deathReason?.trim();
    const genericMessages = [
      'you met an unfortunate end of your adventure',
      'you met an unfortunate end',
      'unfortunate end of your adventure'
    ];
    if (reason && !genericMessages.includes(reason.toLowerCase())) return reason;
    if (this.lastChoiceId != null) return `Final choice #${this.lastChoiceId}`;
    return 'Unknown';
  }
  
  private normalizeKey(s: string): string {
    let out = s.toLowerCase().replace(/[^a-z0-9]/g, '');
    // Treat trailing 'axis' as optional for matching purposes
    if (out.endsWith('axis')) out = out.slice(0, -4);
    return out;
  }

  showProfileKey(key: any): boolean {
    if (key == null) return false;
    const k = String(key).toLowerCase();
    if (k === 'id' || k === 'characterid') return false;
    if (k.endsWith('exp')) return false;
    // hide preference keys from raw list (shown as sliders)
    const norm = this.normalizeKey(k);
    if (this.preferenceDefs.some(d => this.normalizeKey(d.key) === norm)) return false;
    // hide created/updated timestamps (shown in legacy section)
    if (norm.endsWith('createdat') || norm === 'createdat') return false;
    if (norm.endsWith('updatedat') || norm === 'updatedat') return false;
    // hide Additional Traits field
    if (norm === 'additionaltraits') return false;
    // hide curiosity regardless of spelling
    if (norm === 'curiosity' || norm === 'curiousity') return false;
    // hide magic affinity
    if (norm === 'magicaffinity') return false;
    if (k.endsWith('preference')) return false;
    return true;
  }

  isDateTime(value: any): boolean {
    if (value == null) return false;
    if (value instanceof Date) return !isNaN(value.getTime());
    if (typeof value === 'number') {
      // treat large numbers as epoch ms; small as seconds
      const ms = value > 1e12 ? value : (value > 1e9 ? value * 1000 : NaN);
      return !isNaN(ms) && !isNaN(new Date(ms).getTime());
    }
    if (typeof value === 'string') {
      const t = Date.parse(value);
      return !isNaN(t);
    }
    return false;
  }

  toDateValue(value: any): string | number | Date | null {
    if (value == null) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'number') {
      const ms = value > 1e12 ? value : (value > 1e9 ? value * 1000 : NaN);
      return isNaN(ms) ? null : new Date(ms);
    }
    if (typeof value === 'string') return value;
    return null;
  }

  private pickTimestamp(...candidates: string[]): any | null {
    const sources = [this.character, this.profile];
    for (const src of sources) {
      if (!src) continue;
      for (const name of candidates) {
        const found = Object.keys(src).find(k => this.normalizeKey(k) === this.normalizeKey(name));
        if (found) return (src as any)[found];
      }
    }
    return null;
  }

  getCreatedAt(): any | null {
    return this.pickTimestamp('createdAt', 'created_at', 'createdat');
  }

  getUpdatedAt(): any | null {
    return this.pickTimestamp('updatedAt', 'updated_at', 'updatedat');
  }

  displayKey(key: any): string {
    if (key == null) return '';
    const raw = String(key);
    const known: Record<string, string> = {
      'combatpreference': 'Combat Preference',
      'explorationpreference': 'Exploration Preference',
      'characterid': 'Character ID'
    };
    const lower = raw.toLowerCase();
    if (known[lower]) return known[lower];
    // Normalize separators and camelCase boundaries
    let s = raw.replace(/[_-]+/g, ' ');
    s = s.replace(/([a-z])([A-Z])/g, '$1 $2');
    // Title case words
    s = s.split(' ').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return s;
  }

  getAvailablePreferences() {
    if (!this.profile) return [] as Array<{ key: string; label: string; minLabel: string; maxLabel: string; value: number }>;
    // start with known defs
    const fromDefs = this.preferenceDefs
      .map(def => ({...def, label: this.displayKey(def.label ?? def.key), value: this.getPreferenceValue(def.key)}))
      .filter(item => item.value !== null) as Array<{ key: string; label: string; minLabel: string; maxLabel: string; value: number }>;
    // include any other '*preference' numeric fields from profile
    const extra = Object.keys(this.profile || {})
      .filter(k => typeof (this.profile as any)[k] !== 'object')
      .filter(k => k.toLowerCase().endsWith('preference'))
      .filter(k => !this.preferenceDefs.some(d => this.normalizeKey(d.key) === this.normalizeKey(k)))
      .map(k => ({
        key: k,
        label: this.displayKey(k),
        minLabel: 'Low',
        maxLabel: 'High',
        value: this.getPreferenceValue(k) as number | null
      }))
      .filter(item => item.value !== null) as Array<{ key: string; label: string; minLabel: string; maxLabel: string; value: number }>;
    return [...fromDefs, ...extra];
  }

  private getPreferenceValue(key: string): number | null {
    if (!this.profile) return null;
    // find matching key case-insensitively and ignoring separators
    const targetNorm = this.normalizeKey(key);
    let raw: any = (this.profile as any)[key];
    if (raw == null) {
      const foundKey = Object.keys(this.profile).find(k => this.normalizeKey(k) === targetNorm);
      if (foundKey) raw = (this.profile as any)[foundKey];
    }
    if (raw == null) return null;
    const num = Number(raw);
    if (isNaN(num)) return null;
    // clamp 0..100
    return Math.max(0, Math.min(100, num));
  }

  goBack() {
    this.router.navigate(['/select-character']);
  }
}
