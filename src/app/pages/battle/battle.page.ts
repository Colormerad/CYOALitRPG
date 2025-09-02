import { Component, signal, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { NPC, SirSebastian } from '../../models/npc.model';
import { DatabaseService } from '../../services/database.service';
import { Character } from '../../models/character.model';
import { InventoryItem } from '../../models/inventory.model';
import { AudioService } from '../../services/audio.service';

@Component({
  selector: 'app-battle',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './battle.page.html',
  styleUrls: ['./battle.page.scss']
})
export class BattlePage implements AfterViewInit, OnDestroy {
  @ViewChild('backgroundMusic') battleMusic!: ElementRef<HTMLAudioElement>;
  private prevMusicEl: HTMLAudioElement | null = null;
  // Basic demo state (can be replaced with real character/enemy data)
  playerName = 'You';
  character: Character | null = null;
  inventory: InventoryItem[] = [];
  showInventory = signal(false);

  // Opponent assignment
  opponent: NPC = SirSebastian;
  enemyName = this.opponent.name;

  maxPlayerHp = 100;
  maxEnemyHp = this.opponent.maxHp;

  playerHp = signal(100);
  enemyHp = signal(this.opponent.hp);

  isPlayerTurn = signal(true);
  battleLog: string[] = [];

  // Outcome wiring from query params
  private nextOnWin?: number;
  private nextOnLose?: number;
  private choiceId?: number;
  private expOnWin: any | null = null;
  private expOnLose: any | null = null;

  // End-of-battle state
  outcome: 'win' | 'lose' | null = null;
  awardedExp: any | null = null;

  constructor(private toastCtrl: ToastController, private route: ActivatedRoute, private router: Router, private db: DatabaseService, private audioService: AudioService) {
    // Allow assigning an NPC via query param: /battle?npc=sir-sebastian
    const npcId = this.route.snapshot.queryParamMap.get('npc');
    if (npcId) {
      const resolved = this.resolveNpc(npcId);
      if (resolved) this.assignOpponent(resolved);
    }

    // Parse outcome wiring (always)
    const win = this.route.snapshot.queryParamMap.get('nextOnWin');
    const lose = this.route.snapshot.queryParamMap.get('nextOnLose');
    const choiceId = this.route.snapshot.queryParamMap.get('choiceId');
    const expW = this.route.snapshot.queryParamMap.get('expOnWin');
    const expL = this.route.snapshot.queryParamMap.get('expOnLose');
    this.nextOnWin = win && !isNaN(Number(win)) ? Number(win) : undefined;
    this.nextOnLose = lose && !isNaN(Number(lose)) ? Number(lose) : undefined;
    this.choiceId = choiceId && !isNaN(Number(choiceId)) ? Number(choiceId) : undefined;
    this.expOnWin = expW ? this.safeParse(expW) : null;
    this.expOnLose = expL ? this.safeParse(expL) : null;

    // Load character from service or query param
    const idParam = this.route.snapshot.queryParamMap.get('characterId');
    const existing = this.db.getCurrentCharacter();
    if (existing) {
      this.setCharacter(existing);
    } else if (idParam) {
      const cid = Number(idParam);
      if (Number.isFinite(cid)) {
        this.db.getCharacter(cid).subscribe({
          next: (ch) => {
            this.db.setCurrentCharacter(ch);
            this.setCharacter(ch);
          },
          error: () => {}
        });
      }
    }
  }

  ngAfterViewInit(): void {
    const battleEl = this.battleMusic?.nativeElement;
    if (!battleEl) return;

    // Save and pause current music, then start battle music
    this.prevMusicEl = this.audioService.getCurrentMusicElement();
    this.audioService.pauseCurrentMusic();

    // React to global audio state
    this.audioService.masterVolume$.subscribe(() => {
      battleEl.volume = this.audioService.getEffectiveMusicVolume();
    });
    this.audioService.musicVolume$.subscribe(() => {
      battleEl.volume = this.audioService.getEffectiveMusicVolume();
    });
    this.audioService.muted$.subscribe((muted) => {
      battleEl.muted = muted;
    });

    // Play battle music under current settings
    this.audioService.playElementWithCurrentSettings(battleEl);
  }

  ngOnDestroy(): void {
    // Stop battle music
    try { this.battleMusic?.nativeElement.pause(); } catch {}
    // Resume previous music if any
    if (this.prevMusicEl) {
      this.audioService.playElementWithCurrentSettings(this.prevMusicEl);
    }
  }

  private safeParse(json: string): any | null {
    try { return JSON.parse(json); } catch { return null; }
  }


  private resolveNpc(id: string): NPC | null {
    const key = id.trim().toLowerCase();
    switch (key) {
      case 'sir-sebastian':
      case 'sir_sebastian':
      case 'sebastian':
        return { ...SirSebastian };
      default:
        return null;
    }
  }

  private assignOpponent(npc: NPC) {
    this.opponent = { ...npc };
    this.enemyName = this.opponent.name;
    this.maxEnemyHp = this.opponent.maxHp;
    this.enemyHp.set(this.opponent.hp);
  }

  private setCharacter(ch: Character) {
    this.character = ch;
    this.playerName = ch.name || 'You';
    // Derive HP from attributes if available
    if (ch.id == null) return;
    this.db.getCharacterAttributes(ch.id!).subscribe({
      next: (attrs) => {
        const con = (attrs?.constitution as number) || 10;
        const base = 50; // base HP
        this.maxPlayerHp = Math.max(1, base + con * 2);
        if (this.playerHp() > this.maxPlayerHp) this.playerHp.set(this.maxPlayerHp);
      },
      error: () => {}
    });

    // Load inventory
    this.db.getCharacterInventory(ch.id!).subscribe({
      next: (res) => {
        this.inventory = res.items || [];
      },
      error: () => {}
    });
  }

  get playerHpPct() {
    return Math.max(0, Math.min(1, this.playerHp() / this.maxPlayerHp));
  }

  get enemyHpPct() {
    return Math.max(0, Math.min(1, this.enemyHp() / this.maxEnemyHp));
  }

  async addLog(entry: string) {
    this.battleLog.unshift(entry);
    const toast = await this.toastCtrl.create({ message: entry, duration: 1200, position: 'top' });
    toast.present();
  }

  // Actions
  async onAttack() {
    if (!this.isPlayerTurn()) return;
    const dmg = this.roll(10, 18);
    this.enemyHp.set(Math.max(0, this.enemyHp() - dmg));
    await this.addLog(`${this.playerName} attacks for ${dmg} damage!`);
    this.endPlayerTurn();
  }

  async onDefend() {
    if (!this.isPlayerTurn()) return;
    await this.addLog(`${this.playerName} braces for impact (Defend)!`);
    this.endPlayerTurn({ defended: true });
  }

  async onItem() {
    if (!this.isPlayerTurn()) return;
    // Toggle inventory panel for item selection
    this.showInventory.set(!this.showInventory());
  }

  async onRun() {
    if (!this.isPlayerTurn()) return;
    const success = Math.random() < 0.4;
    if (success) {
      await this.addLog(`${this.playerName} successfully fled the battle!`);
      this.outcome = 'lose';
      this.awardedExp = this.expOnLose;
    } else {
      await this.addLog(`${this.playerName} failed to run!`);
      this.endPlayerTurn();
    }
  }

  // Turn resolution (very simple demo AI)
  private async endPlayerTurn(ctx?: { defended?: boolean }) {
    this.isPlayerTurn.set(false);

    if (this.enemyHp() <= 0) {
      await this.addLog(`${this.enemyName} is defeated!`);
      if (this.opponent.losePhrase) {
        await this.addLog(`${this.enemyName}: "${this.opponent.losePhrase}"`);
      }
      this.outcome = 'win';
      this.awardedExp = this.expOnWin;
      // Close inventory if open
      this.showInventory.set(false);
      return;
    }

    // Enemy takes action after artificial thinking delay
    const preDelay = this.roll(900, 1600);
    setTimeout(async () => {
      const action = Math.random();
      if (action < 0.8) {
        const min = this.opponent.attackMin ?? 8;
        const max = this.opponent.attackMax ?? 14;
        let dmg = this.roll(min, max);
        if (ctx?.defended) dmg = Math.floor(dmg * 0.5);
        this.playerHp.set(Math.max(0, this.playerHp() - dmg));
        await this.addLog(`${this.enemyName} strikes for ${dmg} damage!`);
      } else {
        const heal = this.roll(5, 10);
        this.enemyHp.set(Math.min(this.maxEnemyHp, this.enemyHp() + heal));
        await this.addLog(`${this.enemyName} recovers ${heal} HP!`);
      }

      if (this.playerHp() <= 0) {
        await this.addLog(`${this.playerName} has fallen...`);
        if (this.opponent.winPhrase) {
          await this.addLog(`${this.enemyName}: "${this.opponent.winPhrase}"`);
        }
        this.outcome = 'lose';
        this.awardedExp = this.expOnLose;
        // Close inventory if open
        this.showInventory.set(false);
        return;
      }

      // Brief post-action pause before returning control
      await new Promise(resolve => setTimeout(resolve, this.roll(350, 700)));
      this.isPlayerTurn.set(true);
    }, preDelay);
  }

  private roll(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  isArmor(item: InventoryItem): boolean {
    const t = (item.type || '').toLowerCase();
    // Only treat as armor if equipment and matches common armor terms
    if (t !== 'equipment') return false;
    const text = `${item.name || ''} ${item.description || ''}`.toLowerCase();
    return /armor|helmet|helm|shield|gauntlet|greaves|boots|gloves|robe|cloak|breastplate|mail|plate|leather/.test(text);
  }

  async useItem(item: InventoryItem) {
    if (!this.isPlayerTurn()) return;
    if (!this.character || this.character.id == null) return;

    // If not consumable, show message and end turn without changing inventory
    if (item.type !== 'consumable') {
      await this.addLog(`That won't help me now.`);
      this.showInventory.set(false);
      this.endPlayerTurn();
      return;
    }

    // Guard: zero quantity
    if ((item.quantity ?? 0) <= 0) {
      await this.addLog(`${item.name} is all used up.`);
      this.showInventory.set(false);
      this.endPlayerTurn();
      return;
    }

    // Determine heal amount from item stats or fallback
    const heal = item.stats?.health ?? 20;
    const before = this.playerHp();
    this.playerHp.set(Math.min(this.maxPlayerHp, before + heal));
    await this.addLog(`${this.playerName} uses ${item.name} and heals ${this.playerHp() - before} HP!`);

    // Decrement quantity on server (CharacterInventory)
    this.db.useInventoryItem(this.character.id!, item.id, 1).subscribe({
      next: (resp) => {
        const idx = this.inventory.findIndex(i => i.id === item.id);
        if (idx >= 0) {
          if (resp.removed || resp.quantity <= 0) {
            this.inventory.splice(idx, 1);
          } else {
            this.inventory[idx] = { ...this.inventory[idx], quantity: resp.quantity };
          }
        }
      },
      error: (e) => console.warn('Failed to decrement item on server', e)
    });

    this.showInventory.set(false);
    this.endPlayerTurn();
  }
  
  // Called by UI to apply outcome and return to game
  finalizeOutcome() {
    if (!this.character?.id) {
      // Best effort: try to get character from service
      const ch = this.db.getCurrentCharacter();
      if (ch?.id) {
        this.character = ch as any;
      }
    }

    const cid = this.character?.id;
    if (!cid) {
      // If we truly cannot resolve, go back to character select
      this.router.navigate(['/select-character']);
      return;
    }

    const nextNodeId = this.outcome === 'win' ? this.nextOnWin : this.nextOnLose;

    // If no explicit next node provided, just return to the game without advancing
    if (!nextNodeId || !Number.isFinite(nextNodeId)) {
      this.router.navigate(['/game', cid]);
      return;
    }

    // Build options: include original choiceId and awarded experience if any
    const opts: { choiceId?: number; experienceGain?: any } = {};
    if (this.choiceId != null) opts.choiceId = this.choiceId;
    if (this.awardedExp) opts.experienceGain = this.awardedExp;

    this.db.advanceProgress(cid, Number(nextNodeId), opts).subscribe({
      next: () => this.router.navigate(['/game', cid]),
      error: () => this.router.navigate(['/game', cid])
    });
  }
}
