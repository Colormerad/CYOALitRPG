import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';
import { DatabaseService } from '../../../services/database.service';
import { Character } from '../../../models/character.model';
import { InventoryItem } from '../../../models/inventory.model';

@Component({
  selector: 'app-forging',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './forging.page.html',
  styleUrls: ['./forging.page.scss']
})
export class ForgingPage implements OnInit {
  // Marker and zone state (0-100 percent)
  markerPos = 0;
  goodZoneStart = 40;
  goodZoneWidth = 20; // zone from 40% to 60%
  bullseyeStart = 48; // centered portion within good zone
  bullseyeWidth = 4;

  // Game state
  isRunning = false;
  progress = 0; // 0..100
  attemptsLeft = 5;
  isComplete = false;
  success = false;
  hasStarted = false;

  // Internals
  private direction: 1 | -1 = 1;
  private timer: any = null;
  private speed = 90; // percent per second (reduced from 180)

  private character: Character | null = null;

  // Crafting selections
  materials: InventoryItem[] = [];
  enhancements: InventoryItem[] = [];
  selectedMaterial: InventoryItem | null = null;
  selectedEnhancements: InventoryItem[] = [];
  // Slot-based selection
  materialSlots: (InventoryItem | null)[] = [null, null, null];
  enhancementSlots: (InventoryItem | null)[] = [null, null];
  modalVisible = false;
  modalType: 'material' | 'enhancement' | null = null;
  modalIndex = 0;

  // Instructions modal
  instructionsVisible = false;
  instructionsDontShow = false;

  constructor(private router: Router, private route: ActivatedRoute, private db: DatabaseService) {
    const ch = this.db.getCurrentCharacter();
    if (ch) this.character = ch as any;
    // Load inventory for selections
    const cid = this.character?.id ?? this.getRouteCharacterId();
    if (cid && Number.isFinite(cid)) {
      this.db.getCharacterInventory(Number(cid)).subscribe({
        next: (res) => {
          const items: InventoryItem[] = res.items || [];
          this.materials = items.filter(it => this.isMaterialItem(it) && (it.quantity ?? 0) > 0);
          this.enhancements = items.filter(it => this.isEnhancementItem(it) && (it.quantity ?? 0) > 0);
        },
        error: () => {}
      });
    }
  }

  ngOnInit(): void {
    this.openInstructionsIfNeeded();
  }

  startAttempt() {
    if (this.isRunning || this.isComplete || this.attemptsLeft <= 0) return;
    if (!this.hasAnyMaterial()) return; // require at least one material slot filled
    if (!this.hasStarted) this.hasStarted = true;
    this.isRunning = true;
    // Randomize zone a bit for each attempt
    const w = this.randomInt(15, 30);
    const s = this.randomInt(10, 70);
    this.goodZoneWidth = w;
    this.goodZoneStart = s;
    // Bullseye = center band of good zone (about 30% of its width, min 4)
    this.bullseyeWidth = Math.max(4, Math.floor(this.goodZoneWidth * 0.3));
    this.bullseyeStart = this.goodZoneStart + Math.max(0, Math.floor((this.goodZoneWidth - this.bullseyeWidth) / 2));
    this.direction = Math.random() < 0.5 ? 1 : -1;

    let last = performance.now();
    const tick = (now: number) => {
      if (!this.isRunning) return;
      const dt = (now - last) / 1000; // seconds
      last = now;
      this.markerPos += this.direction * this.speed * dt * 0.01 * 100; // keep in 0..100
      if (this.markerPos >= 100) { this.markerPos = 100; this.direction = -1; }
      if (this.markerPos <= 0) { this.markerPos = 0; this.direction = 1; }
      this.timer = requestAnimationFrame(tick);
    };
    this.timer = requestAnimationFrame(tick);
  }

  barClick() {
    // If running, a click stops the attempt
    if (this.isRunning) {
      this.stopAttempt();
    }
  }

  stopAttempt() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.timer) cancelAnimationFrame(this.timer);

    const inZone = this.markerPos >= this.goodZoneStart && this.markerPos <= (this.goodZoneStart + this.goodZoneWidth);
    if (inZone) {
      const inBullseye = this.markerPos >= this.bullseyeStart && this.markerPos <= (this.bullseyeStart + this.bullseyeWidth);
      // Grant progress chunk
      const base = this.randomInt(25, 45);
      const gain = inBullseye ? base * 2 : base;
      this.progress = Math.min(100, this.progress + gain);
    } else {
      // Penalize or just consume attempt
      this.progress = Math.max(0, this.progress - this.randomInt(5, 15));
    }

    this.attemptsLeft = Math.max(0, this.attemptsLeft - 1);
    if (this.progress >= 100) {
      this.isComplete = true;
      this.success = true;
    } else if (this.attemptsLeft <= 0) {
      this.isComplete = true;
      this.success = false;
    } else {
      // Auto-restart after a brief pause
      setTimeout(() => {
        if (!this.isComplete && this.attemptsLeft > 0 && !this.isRunning) {
          this.startAttempt();
        }
      }, 2000);
    }
  }

  cancel() {
    if (this.isRunning) return;
    this.isComplete = true;
    this.success = false;
  }

  finish() {
    // Navigate back to the game page; prefer current character id
    const cid = this.character?.id ?? this.getRouteCharacterId();
    if (cid && Number.isFinite(cid)) {
      // You could also post crafting result here via DatabaseService
      this.router.navigate(['/game', cid]);
    } else {
      this.router.navigate(['/select-character']);
    }
  }

  private randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // ===== Materials/Enhancements helpers =====
  selectMaterial(item: InventoryItem) {
    this.selectedMaterial = item;
  }

  toggleEnhancement(item: InventoryItem) {
    const idx = this.selectedEnhancements.findIndex(e => e.id === item.id);
    if (idx >= 0) {
      this.selectedEnhancements.splice(idx, 1);
    } else {
      this.selectedEnhancements.push(item);
    }
  }

  isEnhSelected(item: InventoryItem): boolean {
    return this.selectedEnhancements.some(e => e.id === item.id);
  }

  private isMaterialItem(item: InventoryItem): boolean {
    const t = (item.type || '').toLowerCase();
    const name = `${item.name || ''} ${item.description || ''}`.toLowerCase();
    if (t === 'material') return true;
    // heuristic fallback
    return /(ore|ingot|metal|wood|leather|cloth|fiber|hide|bone|scale|crystal)/.test(name);
  }

  private isEnhancementItem(item: InventoryItem): boolean {
    const t = (item.type || '').toLowerCase();
    const name = `${item.name || ''} ${item.description || ''}`.toLowerCase();
    if (t === 'enhancement' || t === 'augment' || t === 'rune') return true;
    // heuristic fallback
    return /(rune|gem|essence|sigil|oil|glyph|charm|polish)/.test(name);
  }

  enhancementNames(): string {
    return (this.selectedEnhancements || []).map(e => e?.name || '').filter(Boolean).join(', ');
  }

  private getRouteCharacterId(): number | null {
    const pid = Number(this.route.snapshot.paramMap.get('id'));
    if (Number.isFinite(pid) && pid > 0) return pid;
    const qid = Number(this.route.snapshot.queryParamMap.get('characterId'));
    if (Number.isFinite(qid) && qid > 0) return qid;
    return null;
  }

  private getInstructionsKey(): string {
    const cid = this.character?.id ?? this.getRouteCharacterId() ?? 'anon';
    return `crafting_instructions_hide_${cid}`;
  }

  private openInstructionsIfNeeded() {
    const key = this.getInstructionsKey();
    const hide = localStorage.getItem(key) === '1';
    this.instructionsVisible = !hide;
  }

  ackInstructions() {
    if (this.instructionsDontShow) {
      localStorage.setItem(this.getInstructionsKey(), '1');
    }
    this.instructionsVisible = false;
  }

  closeInstructionsModal() {
    // If closed without pressing Got it, still respect checkbox state
    if (this.instructionsDontShow) {
      localStorage.setItem(this.getInstructionsKey(), '1');
    }
    this.instructionsVisible = false;
  }

  // ===== Slot & Modal selection =====
  openSelect(type: 'material' | 'enhancement', index: number) {
    this.modalType = type;
    this.modalIndex = index;
    this.modalVisible = true;
  }

  closeModal() {
    this.modalVisible = false;
    this.modalType = null;
  }

  chooseItem(it: InventoryItem) {
    if (!this.modalType) return;
    if (this.modalType === 'material') {
      this.materialSlots[this.modalIndex] = it;
      // Keep legacy selectedMaterial in sync as first filled material
      const first = this.materialSlots.find(m => !!m) as InventoryItem | null;
      this.selectedMaterial = first || null;
    } else {
      this.enhancementSlots[this.modalIndex] = it;
      // Keep legacy selectedEnhancements in sync as unique list
      const uniq: Record<string, InventoryItem> = {} as any;
      for (const e of this.enhancementSlots) if (e) uniq[String(e.id)] = e;
      this.selectedEnhancements = Object.values(uniq);
    }
    this.closeModal();
  }

  hasAnyMaterial(): boolean {
    return this.materialSlots.some(m => !!m);
  }
}
