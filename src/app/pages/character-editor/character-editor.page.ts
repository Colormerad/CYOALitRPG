import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
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
  characterId!: number;
  profile: CharacterProfile | null = null;
  character: Character | null = null;
  alignment = { row: 1, col: 1 }; // 0..2 each; default neutral
  alignmentText = 'Neutral';
  // demographics
  gender: 'masculine'|'feminine'|'neutral'|'flux' | '' = '';
  ageBucket: 'very_young'|'young'|'neutral'|'wisened'|'very_old' | '' = '';
  name: string = '';

  constructor(private route: ActivatedRoute, private router: Router, private db: DatabaseService) {}

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
    const trimmed = (this.name || '').trim();
    if (!trimmed || trimmed === this.character.name) return;
    const payload: Character = { ...this.character, name: trimmed };
    this.db.updateCharacter(payload).subscribe({
      next: (updated) => {
        console.log('[CharacterEditor] Name updated:', updated?.name);
        this.character = updated;
        this.name = updated?.name || trimmed;
      },
      error: (err) => {
        console.warn('[CharacterEditor] Failed to update name:', err);
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
        this.gender = (extras.gender || this.profile.gender || '') as any;
        this.ageBucket = (extras.ageBucket || this.profile.ageBucket || '') as any;
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

  private loadCharacterMeta(): void {
    this.db.getCharacter(this.characterId).subscribe({
      next: (ch: any) => {
        this.character = ch as Character;
        this.name = (ch?.name ?? '').toString();
        const meta = ch?.metadata ?? ch?.meta ?? ch?.additionalTraits ?? ch;
        console.log('[CharacterEditor] Character metadata:', meta);
        if (meta) {
          const g = meta.gender || meta.Gender || null;
          const a = meta.ageBucket || meta.age_bucket || meta.age || null;
          if (!this.gender && g && ['masculine','feminine','neutral','flux'].includes(String(g))) {
            this.gender = g as any;
          }
          if (!this.ageBucket && a && ['very_young','young','neutral','wisened','very_old'].includes(String(a))) {
            this.ageBucket = a as any;
          }
        }
      },
      error: (err) => {
        console.warn('[CharacterEditor] Failed to load character for metadata logging:', err);
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
          if (!this.gender && g && ['masculine','feminine','neutral','flux'].includes(String(g))) {
            this.gender = g as any;
          }
          if (!this.ageBucket && a && ['very_young','young','neutral','wisened','very_old','very old','very-old'].includes(String(a))) {
            // normalize alternative spellings
            const norm = String(a).replace('very old','very_old').replace('very-old','very_old');
            this.ageBucket = norm as any;
          }

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

  onGenderChange(value: 'masculine'|'feminine'|'neutral'|'flux'): void {
    this.gender = value;
    // Persist into PlayerProgress.metadata as the source of truth
    this.db.updateProgressMetadata(this.characterId, { gender_preference: value }).subscribe({
      next: (saved) => console.log('[CharacterEditor] Updated PlayerProgress.metadata (gender_preference):', saved?.metadata),
      error: (err) => console.warn('[CharacterEditor] Failed to update PlayerProgress.metadata gender_preference:', err)
    });
    // Mirror to profile extras for continuity (non-blocking)
    this.db.updateProfileExtras(this.characterId, { gender: value }).subscribe({
      next: () => {},
      error: () => {}
    });
  }

  onAgeBucketChange(value: 'very_young'|'young'|'neutral'|'wisened'|'very_old'): void {
    this.ageBucket = value;
    // Persist into PlayerProgress.metadata as the source of truth
    this.db.updateProgressMetadata(this.characterId, { age_preference: value }).subscribe({
      next: (saved) => console.log('[CharacterEditor] Updated PlayerProgress.metadata (age_preference):', saved?.metadata),
      error: (err) => console.warn('[CharacterEditor] Failed to update PlayerProgress.metadata age_preference:', err)
    });
    // Mirror to profile extras for continuity (non-blocking)
    this.db.updateProfileExtras(this.characterId, { ageBucket: value }).subscribe({
      next: () => {},
      error: () => {}
    });
  }
}
