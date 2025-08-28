import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';
import { DatabaseService } from '../../services/database.service';
import { CharacterProfile } from '../../models/character-profile.model';
import { Character } from '../../models/character.model';
import { BottomTabsComponent } from '../../components/bottom-tabs/bottom-tabs.component';

@Component({
  selector: 'app-character-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, IonicModule, BottomTabsComponent],
  templateUrl: './character-editor.page.html',
  styleUrls: ['./character-editor.page.scss']
})
export class CharacterEditorPage implements OnInit {
  private isRenaming = false;
  private lastSubmittedName: string | null = null;
  isSaving = false;
  characterId!: number;
  profile: CharacterProfile | null = null;
  character: Character | null = null;
  alignment = { row: 1, col: 1 }; // 0..2 each; default neutral
  alignmentText = 'Neutral';
  // demographics
  gender: 'masculine'|'feminine'|'neutral'|'flux'|'unknown'|'' = 'unknown';
  ageBucket: 'very_young'|'young'|'neutral'|'wisened'|'very_old'|'unknown'|'' = 'unknown';
  name: string = '';

  constructor(private route: ActivatedRoute, private router: Router, private db: DatabaseService, private toastCtrl: ToastController) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = Number(params['id']);
      if (Number.isFinite(id)) {
        this.characterId = id;
        this.loadCharacterMeta();
        this.loadProfile();
        this.loadProgressMeta();
      } else {
        // If no ID, go back to character select
        this.router.navigate(['/select-character']);
      }
    });
  }

  onNameCommit(): void {
    if (!this.character || !this.character.id) return;
    if (this.isRenaming) return;
    const trimmed = (this.name || '').trim();
    if (!trimmed || trimmed === this.character.name || trimmed === this.lastSubmittedName) return;
    this.isRenaming = true;
    this.lastSubmittedName = trimmed;
    this.db.updateCharacterNameWithFallback(this.character.id, trimmed, (this.character as Character).accountId)
      .pipe(finalize(() => { this.isRenaming = false; }))
      .subscribe({
      next: (updated) => {
        console.log('[CharacterEditor] Name updated:', updated?.name);
        // Ensure local state reflects the new name even if backend omits it in response
        this.character = { ...(this.character as Character), ...(updated || {}), name: updated?.name || trimmed } as Character;
        this.name = updated?.name || trimmed;
      },
      error: (err) => {
        console.error('[CharacterEditor] Name update failed', err);
      }
    });
  }

  private loadProfile(): void {
    this.db.getCharacterProfile(this.characterId).subscribe({
      next: (p: CharacterProfile) => {
        this.profile = p;
        console.log('[CharacterEditor] Profile additionalTraits:', (p as any)?.additionalTraits || {});
        this.computeAlignment(); // initial alignment from profile as fallback
        // load extras (frontend persisted)
        const extras = this.db.getProfileExtras(this.characterId);
        this.gender = ((extras.gender || this.profile.gender || '') as any) || 'unknown';
        this.ageBucket = ((extras.ageBucket || this.profile.ageBucket || '') as any) || 'unknown';
      },
      error: () => {
        // leave defaults
      }
    });
  }

  private computeAlignment(): void {
    const good = Number(this.profile?.goodEvilAxis);
    const order = Number(this.profile?.orderChaosAxis);
    const bucket = (v: number) => {
      if (!Number.isFinite(v)) return 1;
      if (v >= 67) return 0; // high -> top/left bucket
      if (v <= 33) return 2; // low -> bottom/right bucket
      return 1; // middle
    };
    // Rows: 0 Good, 1 Neutral, 2 Evil (good high -> top)
    const row = bucket(good);
    // Cols: 0 Lawful, 1 Neutral, 2 Chaotic (order high -> left)
    const col = bucket(order);
    this.alignment = { row, col };

    const rowLabel = ['Good', 'Neutral', 'Evil'][row];
    const colLabel = ['Lawful', 'Neutral', 'Chaotic'][col];
    if (rowLabel === 'Neutral' && colLabel === 'Neutral') {
      this.alignmentText = 'True Neutral';
    } else if (rowLabel === 'Neutral') {
      this.alignmentText = `${colLabel}`;
    } else if (colLabel === 'Neutral') {
      this.alignmentText = `${rowLabel}`;
    } else {
      this.alignmentText = `${colLabel} ${rowLabel}`;
    }
  }

  goBack(): void {
    if (this.characterId) {
      this.router.navigate(['/game', this.characterId]);
    } else {
      this.router.navigate(['/select-character']);
    }
  }

  async saveAll(): Promise<void> {
    if (!this.character || !this.character.id) return;
    if (this.isSaving) return;
    this.isSaving = true;
    const updated: Character = { ...this.character, name: (this.name || '').trim() || this.character.name } as Character;
    
    // Prepare metadata updates for gender and age preferences
    const metadataUpdates: Record<string, any> = {};
    if (this.gender && this.gender !== 'unknown') {
      metadataUpdates['gender_preference'] = this.gender;
    }
    if (this.ageBucket && this.ageBucket !== 'unknown') {
      metadataUpdates['age_preference'] = this.ageBucket;
    }
    
    this.db.updateCharacterWithCompatibility(updated)
      .pipe(finalize(() => { this.isSaving = false; }))
      .subscribe({
        next: async (saved) => {
          // sync local state from server response (fallback to our updated fields)
          this.character = { ...updated, ...(saved || {}) } as Character;
          this.name = this.character.name;
          
          // Update metadata if there are changes
          if (Object.keys(metadataUpdates).length > 0) {
            console.log('[CharacterEditor] Updating metadata:', metadataUpdates);
            this.db.updateProgressMetadata(this.character.id!, metadataUpdates).subscribe({
              next: (progressSaved) => {
                console.log('[CharacterEditor] Metadata updated successfully:', progressSaved);
              },
              error: (metaErr) => {
                console.warn('[CharacterEditor] Failed to update metadata:', metaErr);
              }
            });
          }
          
          const t = await this.toastCtrl.create({ message: 'Character saved', duration: 1500, color: 'success', position: 'bottom' });
          await t.present();
          const active = document.activeElement as HTMLElement | null;
          if (active && typeof active.blur === 'function') active.blur();
        },
        error: async (err) => {
          console.warn('[CharacterEditor] Save failed:', err);
          const t = await this.toastCtrl.create({ message: 'Failed to save to server', duration: 1800, color: 'danger', position: 'bottom' });
          await t.present();
        }
      });
  }

  private loadCharacterMeta(): void {
    this.db.getCharacter(this.characterId).subscribe({
      next: (ch: any) => {
        this.character = ch as Character;
        this.name = (ch?.name ?? '').toString();
        
        // Load game session metadata first (priority source)
        this.db.getPlayerProgress(this.characterId).subscribe({
          next: (progress: any) => {
            const sessionMeta = progress?.metadata || {};
            const characterMeta = ch?.metadata ?? ch?.meta ?? ch?.additionalTraits ?? ch;
            
            console.log('[CharacterEditor] Game session metadata:', sessionMeta);
            console.log('[CharacterEditor] Character metadata:', characterMeta);
            
            // Priority: game session metadata > character metadata > defaults
            const g = sessionMeta.gender_preference || characterMeta?.gender || characterMeta?.Gender || null;
            const a = sessionMeta.age_preference || characterMeta?.ageBucket || characterMeta?.age_bucket || characterMeta?.age || null;
            
            if (g && ['masculine','feminine','neutral','flux'].includes(String(g))) {
              this.gender = g as any;
            } else {
              this.gender = 'unknown';
            }
            
            if (a && ['very_young','young','neutral','wisened','very_old'].includes(String(a))) {
              this.ageBucket = a as any;
            } else {
              this.ageBucket = 'unknown';
            }
            
            console.log('[CharacterEditor] Loaded preferences - Gender:', this.gender, 'Age:', this.ageBucket);
          },
          error: (progressErr) => {
            console.warn('[CharacterEditor] Failed to load game session metadata, falling back to character metadata:', progressErr);
            
            // Fallback to character metadata only
            const meta = ch?.metadata ?? ch?.meta ?? ch?.additionalTraits ?? ch;
            if (meta) {
              const g = meta.gender || meta.Gender || null;
              const a = meta.ageBucket || meta.age_bucket || meta.age || null;
              
              if (g && ['masculine','feminine','neutral','flux'].includes(String(g))) {
                this.gender = g as any;
              } else {
                this.gender = 'unknown';
              }
              
              if (a && ['very_young','young','neutral','wisened','very_old'].includes(String(a))) {
                this.ageBucket = a as any;
              } else {
                this.ageBucket = 'unknown';
              }
            }
          }
        });
      },
      error: (err) => {
        console.warn('[CharacterEditor] Failed to load character:', err);
      }
    });
  }

  private loadProgressMeta(): void {
    this.db.getPlayerProgress(this.characterId).subscribe({
      next: (progress: any) => {
        try {
          console.log('[CharacterEditor] PlayerProgress:', progress);
          console.log('[CharacterEditor] PlayerProgress.metadata:', progress?.metadata || {});
          const choices = Array.isArray(progress?.choiceHistory) ? progress.choiceHistory : [];
          console.log('[CharacterEditor] PlayerProgress.choiceHistory length:', choices.length, 'sample:', choices.slice(-5));

          const meta = progress?.metadata || {};
          // Prepopulate gender and age from metadata preferences
          const g = meta.gender_preference || meta.genderPreference || null;
          const a = meta.age_preference || meta.agePreference || null;
          if ((this.gender === '' || this.gender === 'unknown') && g && ['masculine','feminine','neutral','flux'].includes(String(g))) {
            this.gender = g as any;
          }
          if ((this.ageBucket === '' || this.ageBucket === 'unknown') && a && ['very_young','young','neutral','wisened','very_old','very old','very-old'].includes(String(a))) {
            // normalize alternative spellings
            const norm = String(a).replace('very old','very_old').replace('very-old','very_old');
            this.ageBucket = norm as any;
          }
          // Ensure defaults if nothing resolvable
          if (!this.gender) this.gender = 'unknown';
          if (!this.ageBucket) this.ageBucket = 'unknown';

          // Compute alignment from metadata axes if present
          this.computeAlignmentFromMeta(meta);
        } catch (e) {
          console.warn('[CharacterEditor] Error logging PlayerProgress metadata:', e);
        }
      },
      error: (err) => {
        console.warn('[CharacterEditor] Failed to load PlayerProgress for metadata logging:', err);
      }
    });
  }

  private computeAlignmentFromMeta(meta: any): void {
    if (!meta) return;
    const ge = Number(meta.goodevilaxis ?? meta.good_evil ?? 0); // positive => Good, negative => Evil
    const rc = Number(meta.rule_following ?? meta.order_chaos ?? 0); // positive => Lawful, negative => Chaotic
    const bucketFromSign = (v: number) => {
      if (!Number.isFinite(v) || v === 0) return 1; // Neutral
      return v > 0 ? 0 : 2; // >0 => high (Good/Lawful) -> index 0; <0 => low (Evil/Chaotic) -> index 2
    };
    const row = bucketFromSign(ge); // 0 Good, 1 Neutral, 2 Evil
    const col = bucketFromSign(rc); // 0 Lawful, 1 Neutral, 2 Chaotic
    this.alignment = { row, col };
    const rowLabel = ['Good', 'Neutral', 'Evil'][row];
    const colLabel = ['Lawful', 'Neutral', 'Chaotic'][col];
    if (rowLabel === 'Neutral' && colLabel === 'Neutral') {
      this.alignmentText = 'True Neutral';
    } else if (rowLabel === 'Neutral') {
      this.alignmentText = `${colLabel}`;
    } else if (colLabel === 'Neutral') {
      this.alignmentText = `${rowLabel}`;
    } else {
      this.alignmentText = `${colLabel} ${rowLabel}`;
    }
  }

  onGenderChange(value: 'masculine'|'feminine'|'neutral'|'flux'|'unknown'): void {
    this.gender = value;
    // Persist into PlayerProgress.metadata only when not 'unknown'
    if (value !== 'unknown') {
      const v = value as 'masculine'|'feminine'|'neutral'|'flux';
      this.db.updateProgressMetadata(this.characterId, { gender_preference: v }).subscribe({
        next: (saved) => console.log('[CharacterEditor] Updated PlayerProgress.metadata (gender_preference):', saved?.metadata),
        error: (err) => console.warn('[CharacterEditor] Failed to update PlayerProgress.metadata gender_preference:', err)
      });
    } else {
      this.db.updateProgressMetadata(this.characterId, {}).subscribe({
        next: () => {},
        error: () => {}
      });
    }
    // Mirror to profile extras for continuity (non-blocking)
    const genderExtras: { gender?: 'masculine'|'feminine'|'neutral'|'flux' } =
      value === 'unknown' ? {} : { gender: value as 'masculine'|'feminine'|'neutral'|'flux' };
    this.db.updateProfileExtras(this.characterId, genderExtras).subscribe({
      next: () => {},
      error: () => {}
    });
  }

  onAgeBucketChange(value: 'very_young'|'young'|'neutral'|'wisened'|'very_old'|'unknown'): void {
    this.ageBucket = value;
    // Persist into PlayerProgress.metadata only when not 'unknown'
    if (value !== 'unknown') {
      const v = value as 'very_young'|'young'|'neutral'|'wisened'|'very_old';
      this.db.updateProgressMetadata(this.characterId, { age_preference: v }).subscribe({
        next: (saved) => console.log('[CharacterEditor] Updated PlayerProgress.metadata (age_preference):', saved?.metadata),
        error: (err) => console.warn('[CharacterEditor] Failed to update PlayerProgress.metadata age_preference:', err)
      });
    } else {
      this.db.updateProgressMetadata(this.characterId, {}).subscribe({
        next: () => {},
        error: () => {}
      });
    }
    // Mirror to profile extras for continuity (non-blocking)
    const ageExtras: { ageBucket?: 'very_young'|'young'|'neutral'|'wisened'|'very_old' } =
      value === 'unknown' ? {} : { ageBucket: value as 'very_young'|'young'|'neutral'|'wisened'|'very_old' };
    this.db.updateProfileExtras(this.characterId, ageExtras).subscribe({
      next: () => {},
      error: () => {}
    });
  }
}
