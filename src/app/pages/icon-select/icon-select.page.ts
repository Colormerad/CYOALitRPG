import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { ICON_ENTRIES, IconEntry } from '../../icons/icon-catalog';
import { DatabaseService } from '../../services/database.service';
import { Character } from '../../models/character.model';

@Component({
  standalone: true,
  selector: 'app-icon-select',
  imports: [CommonModule, IonicModule],
  templateUrl: './icon-select.page.html',
  styleUrls: ['./icon-select.page.scss']
})
export class IconSelectPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private db = inject(DatabaseService);

  characterId = Number(this.route.snapshot.paramMap.get('id'));
  icons: IconEntry[] = ICON_ENTRIES;
  private selectedKeySig = signal<string | null>(null);
  private character: Character | null = null;

  constructor() {
    if (Number.isFinite(this.characterId)) {
      this.db.getCharacter(this.characterId).subscribe(ch => {
        this.character = ch;
        if (ch?.iconKey) this.selectedKeySig.set(ch.iconKey);
      });
    }
  }

  trackByKey = (_: number, item: IconEntry) => item.key;

  select(icon: IconEntry) {
    this.selectedKeySig.set(icon.key);
  }

  selectedKey() {
    return this.selectedKeySig();
  }

  onBackgroundClick(event: Event) {
    const target = event.target as HTMLElement;
    // Ignore clicks inside icon tiles or the play overlay
    if (target.closest('.icon-tile') || target.closest('.character-play-overlay')) {
      return;
    }
    this.selectedKeySig.set(null);
  }

  onPlayOverlayClick(event: Event) {
    event.stopPropagation();
    this.save();
  }

  async save() {
    const key = this.selectedKey();
    if (!this.character || !this.character.id || !key) return;
    const updated: Character = { ...this.character, iconKey: key } as Character;
    // Optimistic update for immediate UI feedback
    this.db.setCurrentCharacter(updated);
    this.db.updateCharacterIconWithFallback(this.character.id, key).subscribe({
      next: () => {
        this.router.navigate(['/game', this.character!.id!]);
      },
      error: (err) => {
        console.error('Unexpected error in icon update fallback:', err);
        // This should rarely happen since fallback handles backend errors
        this.router.navigate(['/game', this.character!.id!]);
      }
    });
  }

  cancel() {
    if (this.character?.id) {
      this.router.navigate(['/game', this.character.id]);
    } else {
      this.router.navigate(['/select-character']);
    }
  }
}
