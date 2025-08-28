import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
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
  private toastCtrl = inject(ToastController);

  characterId = Number(this.route.snapshot.paramMap.get('id'));
  icons: IconEntry[] = ICON_ENTRIES;
  private selectedKeySig = signal<string | null>(null);
  private character: Character | null = null;

  constructor() {
    if (Number.isFinite(this.characterId)) {
      this.db.getCharacter(this.characterId).subscribe(ch => {
        this.character = ch;
        if (ch?.icon_key) this.selectedKeySig.set(ch.icon_key);
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
    const updated: Character = { ...this.character, icon_key: key } as Character;
    // Optimistic update for immediate UI feedback
    this.db.setCurrentCharacter(updated);
    const accountId = (this.character as any)?.accountId;
    // First attempt: PATCH minimal icon update
    this.db.updateCharacterIconPatch(this.character.id, key, accountId).subscribe({
      next: async () => {
        await this.presentToast('Icon saved', 'success');
        const active = document.activeElement as HTMLElement | null;
        if (active && typeof active.blur === 'function') active.blur();
        try { localStorage.removeItem(`character_icon_${this.character!.id!}`); } catch {}
        this.router.navigate(['/game', this.character!.id!]);
      },
      error: async (err) => {
        console.warn('[IconSelect] PATCH failed, trying minimal icon PUT:', err);
        this.db.updateCharacterIcon(this.character!.id!, key, accountId).subscribe({
          next: async () => {
            await this.presentToast('Icon saved', 'success');
            const active = document.activeElement as HTMLElement | null;
            if (active && typeof active.blur === 'function') active.blur();
            try { localStorage.removeItem(`character_icon_${this.character!.id!}`); } catch {}
            this.router.navigate(['/game', this.character!.id!]);
          },
          error: async (err2) => {
            console.warn('[IconSelect] Minimal icon PUT failed, trying full PUT:', err2);
            this.db.updateCharacterWithCompatibility(updated).subscribe({
              next: async () => {
                await this.presentToast('Icon saved', 'success');
                const active = document.activeElement as HTMLElement | null;
                if (active && typeof active.blur === 'function') active.blur();
                this.router.navigate(['/game', this.character!.id!]);
              },
              error: async (err3) => {
                console.warn('[IconSelect] Full PUT failed; falling back to local:', err3);
                this.db.updateCharacterIconWithFallback(this.character!.id!, key, accountId).subscribe({
                  next: async () => {
                    await this.presentToast('Icon saved locally (server error)', 'warning');
                    const active = document.activeElement as HTMLElement | null;
                    if (active && typeof active.blur === 'function') active.blur();
                    this.router.navigate(['/game', this.character!.id!]);
                  },
                  error: async (fallbackErr) => {
                    console.error('Unexpected error in icon update fallback:', fallbackErr);
                    await this.presentToast('Failed to save icon', 'danger');
                    const active = document.activeElement as HTMLElement | null;
                    if (active && typeof active.blur === 'function') active.blur();
                    this.router.navigate(['/game', this.character!.id!]);
                  }
                });
              }
            });
          }
        });
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

  private async presentToast(message: string, color: 'success' | 'warning' | 'danger' | 'primary' = 'primary') {
    const t = await this.toastCtrl.create({
      message,
      duration: 1500,
      position: 'bottom',
      color,
      buttons: [{ text: 'OK', role: 'cancel' }]
    });
    await t.present();
  }
}
