import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-grave-view',
  templateUrl: './grave-view.page.html',
  styleUrls: ['./grave-view.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
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
    this.http.get(`http://localhost:3000/api/characters/${characterId}`).subscribe({
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
        this.error = 'Failed to load character data';
        this.loading = false;
      }
    });
  }
  
  private loadLegacyData(characterId: number) {
    // In a real implementation, this would load from the backend
    // For now, we'll generate some placeholder data
    this.http.get(`http://localhost:3000/api/characters/${characterId}/legacy`).subscribe({
      next: (data: any) => {
        // Use real data if available
        this.promptsSurvived = data.promptsSurvived || this.generateRandomPromptCount();
        this.moralityScale = data.moralityScale || this.generateRandomMorality();
        this.familyLeftBehind = data.familyLeftBehind || this.generateRandomFamily();
        this.worldImpacts = data.worldImpacts || this.generateRandomImpacts();
        this.loading = false;
      },
      error: err => {
        // Generate placeholder data if the endpoint doesn't exist yet
        console.warn('Legacy endpoint not available, using placeholder data');
        this.promptsSurvived = this.generateRandomPromptCount();
        this.moralityScale = this.generateRandomMorality();
        this.familyLeftBehind = this.generateRandomFamily();
        this.worldImpacts = this.generateRandomImpacts();
        this.loading = false;
      }
    });
  }
  
  // Helper methods to generate placeholder data
  private generateRandomPromptCount(): number {
    return Math.floor(Math.random() * 20) + 1;
  }
  
  private generateRandomMorality(): number {
    return Math.floor(Math.random() * 100);
  }
  
  private generateRandomFamily(): string[] {
    const possibleFamily = [
      'Spouse who misses them dearly',
      'Three young children',
      'Elderly parents',
      'A loyal dog named Rex',
      'A twin sibling',
      'A large extended family',
      'No known relatives'
    ];
    
    const count = Math.floor(Math.random() * 3) + 1;
    const family = [];
    
    for (let i = 0; i < count; i++) {
      const index = Math.floor(Math.random() * possibleFamily.length);
      family.push(possibleFamily[index]);
      possibleFamily.splice(index, 1);
      
      if (possibleFamily.length === 0) break;
    }
    
    return family;
  }
  
  private generateRandomImpacts(): string[] {
    const possibleImpacts = [
      'Saved a village from destruction',
      'Defeated a fearsome monster',
      'Discovered an ancient artifact',
      'Brokered peace between warring factions',
      'Built a school for orphaned children',
      'Planted an enchanted forest',
      'Composed songs that are still sung today',
      'Left behind a mysterious prophecy',
      'Their name is carved on the Wall of Heroes',
      'Their deeds are recorded in the Great Library'
    ];
    
    const count = Math.floor(Math.random() * 4) + 1;
    const impacts = [];
    
    for (let i = 0; i < count; i++) {
      const index = Math.floor(Math.random() * possibleImpacts.length);
      impacts.push(possibleImpacts[index]);
      possibleImpacts.splice(index, 1);
      
      if (possibleImpacts.length === 0) break;
    }
    
    return impacts;
  }

  goBack() {
    this.router.navigate(['/character-select']);
  }
}
