import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';

// Difficulty types
export type Difficulty = 'easy' | 'normal' | 'hard' | 'veryHard';
interface DifficultyConfig {
  playerForce: number;
  damping: number;
  quadDrag: number;
  fishMin: number;
  fishRange: number;
  tensionBuild: number;
  tensionDecay: number;
  // New: target zone and motion
  zoneWidth: number;      // % width of safe zone
  zoneOscAmp: number;     // oscillation amplitude (% of bar)
  zoneOscSpeed: number;   // oscillation speed scalar
  // New: fish behavior cadence
  fishChangeMinMs: number;
  fishChangeMaxMs: number;
  // New: time to survive
  timeSeconds: number;
  // New: tension scaling and fish bursts
  tensionDistFactor: number; // extra tension build per % overflow outside zone (per second)
  burstChancePerPull: number; // 0..1 chance per pull change to trigger a burst
  burstMultiplier: number;    // multiplier for fishForce during a burst
  burstDurationMs: number;    // how long a burst lasts
  // New: input response lag (seconds to reach ~63% of a step)
  inputLag: number;
  // New: effective mass/inertia (higher -> slower to accelerate)
  inertia: number;
  // New: input shaping for heavier feel
  inputDeadzone: number;     // 0..1; ignore small inputs
  inputSlewPerSec: number;   // max change in inputFiltered per second
  // New: control effectiveness reduces with speed, and velocity cap
  controlVelK: number;       // player control effectiveness factor vs |vel|
  maxVel: number;            // absolute velocity cap (units per second)
}

@Component({
  selector: 'app-fishing',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './fishing.page.html',
  styleUrls: ['./fishing.page.scss']
})
export class FishingPage implements OnInit {
  // Position and physics
  // pos in range [-100, 100], 0 is centered/ideal
  pos = 0;
  vel = 0;
  // Safe zone (moving band across the bar, in percentage coordinates 0..100)
  zoneWidth = 24; // width of the green band in % (will be overridden by difficulty)
  zoneCenter = 50; // center position in %
  private time = 0; // for oscillation
  // Oscillation controls (driven by difficulty)
  private zoneOscAmp = 18;
  private zoneOscSpeed = 1.5;

  // Fish pulling
  fishDir: -1 | 1 = 1;
  fishForce = 28; // baseline pull (raised for difficulty)
  // New: fish targets a position across the full bar [-100, 100]
  private fishTargetPos = 0;
  private fishTimer: any = null;
  private burstTimeout: any = null;

  // Difficulty configuration
  private difficulty: Difficulty ='veryHard';
  private cfg: DifficultyConfig = {
    playerForce: 32,
    damping: 12,
    quadDrag: 0.4,
    fishMin: 22,
    fishRange: 28, // 22..50
    tensionBuild: 45,
    tensionDecay: 12,
    zoneWidth: 24,
    zoneOscAmp: 18,
    zoneOscSpeed: 1.5,
    fishChangeMinMs: 700,
    fishChangeMaxMs: 1700,
    timeSeconds: 45,
    tensionDistFactor: 0.9,
    burstChancePerPull: 0.15,
    burstMultiplier: 1.6,
    burstDurationMs: 350,
    inputLag: 0.08,
    inertia: 1.0,
    inputDeadzone: 0,
    inputSlewPerSec: 2.4,
    controlVelK: 0.01,
    maxVel: 240,
  };

  // Player input from drag (-1..1)
  input = 0;
  private inputFiltered = 0; // smoothed input
  private dragging = false;
  private padLeft = 0;
  private padWidth = 1; // updated on start

  // Game state
  isRunning = false;
  isComplete = false;
  success = false;
  secondsLeft = 45;
  private raf: any = null;
  // Red tension bar (line strain)
  tension = 0; // 0..100; fills when outside zone

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.applyDifficulty(this.difficulty);
    // Start the idle physics loop so pre-start interaction feels identical
    if (!this.raf) {
      this.loop(performance.now());
    }
  }

  setDifficulty(level: Difficulty) {
    this.applyDifficulty(level);
  }

  private applyDifficulty(level: Difficulty) {
    this.difficulty = level;
    switch (level) {
      case 'easy':
        this.cfg = {
          playerForce: 45,
          damping: 8,
          quadDrag: 0.27,
          fishMin: 12,
          fishRange: 20, // 12..32
          tensionBuild: 24,
          tensionDecay: 24,
          zoneWidth: 32,
          zoneOscAmp: 12,
          zoneOscSpeed: 1.2,
          fishChangeMinMs: 1000,
          fishChangeMaxMs: 1800,
          timeSeconds: 50,
          tensionDistFactor: 0.6,
          burstChancePerPull: 0.0,
          burstMultiplier: 1.5,
          burstDurationMs: 300,
          inputLag: 0.065,
          inertia: 1.08,
          inputDeadzone: 0,
          inputSlewPerSec: 2.8,
          controlVelK: 0.006,
          maxVel: 260,
        };
        break;
      case 'normal':
        this.cfg = {
          playerForce: 40,
          damping: 6,
          quadDrag: 0.30,
          fishMin: 22,
          fishRange: 28, // 22..50
          tensionBuild: 45,
          tensionDecay: 30,
          zoneWidth: 24,
          zoneOscAmp: 16,
          zoneOscSpeed: 1.6,
          fishChangeMinMs: 800,
          fishChangeMaxMs: 1400,
          timeSeconds: 40,
          tensionDistFactor: 0.9,
          burstChancePerPull: 0.15,
          burstMultiplier: 1.7,
          burstDurationMs: 350,
          inputLag: 0.06,
          inertia: 1.06,
          inputDeadzone: 0,
          inputSlewPerSec: 4.0,
          controlVelK: 0.0,
          maxVel: 360,
        };
        break;
      case 'hard':
        this.cfg = {
          playerForce: 36,
          damping: 6.5,
          quadDrag: 0.35,
          fishMin: 28,
          fishRange: 34, // 28..62
          tensionBuild: 60,
          tensionDecay: 20,
          zoneWidth: 18,
          zoneOscAmp: 20,
          zoneOscSpeed: 2.0,
          fishChangeMinMs: 650,
          fishChangeMaxMs: 1100,
          timeSeconds: 32,
          tensionDistFactor: 1.1,
          burstChancePerPull: 0.25,
          burstMultiplier: 1.9,
          burstDurationMs: 420,
          inputLag: 0.07,
          inertia: 1.10,
          inputDeadzone: 0,
          inputSlewPerSec: 3.2,
          controlVelK: 0.004,
          maxVel: 340,
        };
        break;
      case 'veryHard':
        this.cfg = {
          playerForce: 30,
          damping: 7.2,
          quadDrag: 0.56,
          fishMin: 34,
          fishRange: 40, // 34..74
          tensionBuild: 75,
          tensionDecay: 18,
          zoneWidth: 14,
          zoneOscAmp: 24,
          zoneOscSpeed: 2.3,
          fishChangeMinMs: 520,
          fishChangeMaxMs: 900,
          timeSeconds: 28,
          tensionDistFactor: 1.25,
          burstChancePerPull: 0.35,
          burstMultiplier: 2.3,
          burstDurationMs: 500,
          inputLag: 0.09,
          inertia: 1.28,
          inputDeadzone: 0,
          inputSlewPerSec: 3.0,
          controlVelK: 0.006,
          maxVel: 320,
        };
        break;
    }
    // Apply immediately-applicable parameters
    this.zoneWidth = this.cfg.zoneWidth;
    this.zoneOscAmp = this.cfg.zoneOscAmp;
    this.zoneOscSpeed = this.cfg.zoneOscSpeed;
    // Resample fish force against new band if running
    this.fishForce = this.cfg.fishMin + Math.random() * this.cfg.fishRange;
    if (this.isRunning) {
      if (this.fishTimer) clearTimeout(this.fishTimer);
      this.scheduleFishPull();
    }
  }

  start() {
    if (this.isRunning || this.isComplete) return;
    this.resetState();
    this.isRunning = true;
    this.scheduleFishPull();
    // Loop already running from ngOnInit for idle physics; avoid double-start
    if (!this.raf) {
      this.loop(performance.now());
    }
  }

  cancel() {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.cleanupTimers();
  }

  finish() {
    this.isComplete = true;
    this.isRunning = false;
    this.cleanupTimers();
  }

  private resetState() {
    this.pos = 0;
    this.vel = 0;
    this.secondsLeft = this.cfg.timeSeconds;
    this.time = 0;
    this.zoneCenter = 50;
    this.success = false;
    this.isComplete = false;
    this.tension = 0;
    this.inputFiltered = 0;
  }

  private loop(last: number) {
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); // cap dt for stability
      last = now;

      // Decrease time only during active gameplay
      if (this.isRunning) {
        this.secondsLeft = Math.max(0, this.secondsLeft - dt);
      }

      // Minimal smoothing only (no deadzone or slew) to add a touch of inertia
      const alpha = 1 - Math.exp(-dt / Math.max(0.001, this.cfg.inputLag));
      this.inputFiltered += (this.input - this.inputFiltered) * alpha;
      this.inputFiltered = Math.max(-1, Math.min(1, this.inputFiltered));

      // Compute forces
      // Fish pulls toward its target position across the full width
      let fish = 0;
      if (this.isRunning) {
        const dist = this.fishTargetPos - this.pos; // [-200..200]
        const dir = Math.sign(dist) || (this.fishDir ?? 1);
        // Update dir for UI indicator
        this.fishDir = (dir >= 0 ? 1 : -1);
        // Scale force with distance (stronger when far, softer when close)
        const distScale = Math.min(1, Math.abs(dist) / 35); // stronger pull to reach edges
        fish = this.fishDir * (this.fishForce * distScale);
      }
      // Simplified: full control (no speed-based reduction)
      const player = -this.inputFiltered * this.cfg.playerForce;
      const damping = -this.vel * this.cfg.damping; // water drag

      const quadDrag = -Math.sign(this.vel) * this.vel * this.vel * this.cfg.quadDrag;
      const acc = fish + player + damping + quadDrag;

      // const acc = fish + player + damping;
      // Apply inertia (mass) so acceleration translates slower
      this.vel += (acc / Math.max(0.1, this.cfg.inertia)) * dt;
      // Cap maximum velocity per difficulty
      const maxV = Math.max(40, this.cfg.maxVel);
      if (this.vel > maxV) this.vel = maxV;
      if (this.vel < -maxV) this.vel = -maxV;
      this.pos += this.vel * dt;
      // clamp position to [-100, 100]
      if (this.pos < -100) { this.pos = -100; this.vel *= -0.2; }
      if (this.pos > 100) { this.pos = 100; this.vel *= -0.2; }

      // Move the green zone left/right a bit (gentle oscillation)
      this.time += dt;
      this.zoneCenter = 50 + Math.sin(this.time * this.zoneOscSpeed) * this.zoneOscAmp; // difficulty-driven oscillation

      // In/out of zone determines tension changes (only during active gameplay)
      const markerPct = (this.pos + 100) * 0.5; // map [-100..100] -> [0..100]
      const inZone = Math.abs(markerPct - this.zoneCenter) <= (this.zoneWidth / 2);
      if (this.isRunning) {
        if (inZone) {
          // Ease tension down while inside zone
          this.tension = Math.max(0, this.tension - (this.cfg.tensionDecay * dt));
        } else {
          // Build tension faster the farther you are outside the zone
          const overflow = Math.max(0, Math.abs(markerPct - this.zoneCenter) - (this.zoneWidth / 2));
          const extra = overflow * this.cfg.tensionDistFactor;
          this.tension = Math.min(100, this.tension + ((this.cfg.tensionBuild + extra) * dt));
        }
      }

      // End conditions
      if (this.isRunning && this.tension >= 100) {
        // Line snapped
        this.success = false;
        this.isComplete = true;
        this.isRunning = false;
        this.cleanupTimers();
        return;
      }
      if (this.isRunning && this.secondsLeft <= 0) {
        this.success = true; // Survive to end wins
        this.isComplete = true;
        this.isRunning = false;
        this.cleanupTimers();
        return;
      }

      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  private scheduleFishPull() {
    if (this.fishTimer) clearTimeout(this.fishTimer);
    if (this.burstTimeout) { clearTimeout(this.burstTimeout); this.burstTimeout = null; }
    // Determine sporadicity scalar by difficulty (higher -> more erratic, faster flips)
    const spor = this.difficulty === 'easy' ? 0.9
                : this.difficulty === 'normal' ? 1.0
                : this.difficulty === 'hard' ? 1.2
                : 1.4; // veryHard
    // Bias fish to pull away from the user's current input direction, scaled by difficulty
    const awayBias = this.difficulty === 'easy' ? 0.15
                   : this.difficulty === 'normal' ? 0.3
                   : this.difficulty === 'hard' ? 0.5
                   : 0.9; // veryHard
    // inputFiltered in [-1..1], multiply by negative to bias opposite direction
    const dirBias = -this.inputFiltered * awayBias;
    const movement = this.fishRandomMovement({
      dirBias,
      distRange: [this.cfg.fishMin, this.cfg.fishMin + this.cfg.fishRange],
      speedRangeMs: [this.cfg.fishChangeMinMs, this.cfg.fishChangeMaxMs],
      sporadicity: spor
    });
    const nextIn = movement.intervalMs;
    // New behavior: from the current rod position, move the fish target left or right
    // by a random increment whose size increases with difficulty. This uses the full bar.
    const dir: -1 | 1 = (Math.random() < 0.5 ? -1 : 1);
    // Step ranges per difficulty (in bar units)
    const stepRange = this.difficulty === 'easy' ? [12, 24]
                      : this.difficulty === 'normal' ? [18, 36]
                      : this.difficulty === 'hard' ? [28, 52]
                      : [36, 70]; // veryHard
    const step = stepRange[0] + Math.random() * (stepRange[1] - stepRange[0]);
    const target = this.pos + dir * step;
    this.fishTargetPos = Math.max(-100, Math.min(100, target));
    this.fishTimer = setTimeout(() => {
      // Apply randomized strength; direction will follow target in loop
      const baseForce = movement.force;
      this.fishForce = baseForce;
      // Chance to trigger a short burst that spikes the fish force
      if (Math.random() < this.cfg.burstChancePerPull) {
        const boosted = baseForce * this.cfg.burstMultiplier;
        this.fishForce = boosted;
        this.burstTimeout = setTimeout(() => {
          // revert towards a new baseline after burst
          this.fishForce = this.cfg.fishMin + Math.random() * this.cfg.fishRange;
          this.burstTimeout = null;
        }, this.cfg.burstDurationMs);
      }
      if (this.isRunning) this.scheduleFishPull();
    }, nextIn);
  }

  /**
   * Randomize fish movement parameters: direction, distance (force), and speed (interval).
   * - dirBias: optional bias toward a direction (-1..1). 0 = neutral.
   * - distRange: [minForce, maxForce]
   * - speedRangeMs: [minMs, maxMs]
   * - sporadicity: >1 increases erratic behavior: favors quicker flips, wider force variance, shorter intervals.
   */
  private fishRandomMovement(params: {
    dirBias?: number;
    distRange: [number, number];
    speedRangeMs: [number, number];
    sporadicity?: number;
  }): { dir: -1 | 1; force: number; intervalMs: number } {
    const { dirBias = 0, distRange, speedRangeMs } = params;
    const spor = Math.max(0.5, params.sporadicity ?? 1);
    // Direction: bias plus sporadic jitter
    const jitter = (Math.random() - 0.5) * 2; // -1..1
    const score = dirBias + jitter * spor * 0.6; // weight jitter by sporadicity
    const dir: -1 | 1 = score >= 0 ? 1 : -1;

    // Force: sample within range, expand upper bound with sporadicity a bit
    const [fMin, fMaxBase] = distRange;
    const fMax = fMaxBase * (1 + (spor - 1) * 0.25);
    const force = fMin + Math.random() * Math.max(0, (fMax - fMin));

    // Interval: shorter with higher sporadicity
    const [sMin, sMax] = speedRangeMs;
    const span = Math.max(0, sMax - sMin);
    // Base interval sample
    let interval = sMin + Math.random() * span;
    // Compress interval by sporadicity (e.g., spor 1.4 -> ~1/(1+0.4*0.6) shorter)
    interval = interval / (1 + (spor - 1) * 0.6);
    // Clamp to a safe min
    interval = Math.max(200, interval);

    return { dir, force, intervalMs: Math.round(interval) };
  }

  private cleanupTimers() {
    if (this.fishTimer) clearTimeout(this.fishTimer);
    this.fishTimer = null;
    this.input = 0;
    this.dragging = false;
  }

  // Drag handling
  onPadDown(ev: PointerEvent) {
    ev.preventDefault();
    (ev.target as HTMLElement).setPointerCapture?.(ev.pointerId);
    this.dragging = true;
    const pad = (ev.currentTarget as HTMLElement);
    const rect = pad.getBoundingClientRect();
    this.padLeft = rect.left;
    this.padWidth = Math.max(1, rect.width);
    // Prime input immediately on down for responsiveness
    const center = this.padLeft + this.padWidth / 2;
    const ratio = (ev.clientX - center) / (this.padWidth / 2);
    this.input = Math.max(-1, Math.min(1, ratio));
    // Immediate response on tap: prime filtered input too
    this.inputFiltered = this.input;
  }

  onPadMove(ev: PointerEvent) {
    ev.preventDefault();
    if (!this.dragging) return;
    const center = this.padLeft + this.padWidth / 2;
    const ratio = (ev.clientX - center) / (this.padWidth / 2); // half width maps to full power
    this.input = Math.max(-1, Math.min(1, ratio));
  }

  onPadUp(ev: PointerEvent) {
    (ev.target as HTMLElement).releasePointerCapture?.(ev.pointerId);
    this.dragging = false;
    this.input = 0;
  }

  markerLeftPct(): string {
    // Map pos [-100..100] to 0..100% across bar
    const pct = (this.pos + 100) * 0.5;
    return pct.toFixed(2) + '%';
  }

  zoneLeft(): number {
    return this.zoneCenter - (this.zoneWidth / 2);
  }

  // Pole drag handling (works even when not running)
  private poleDragging = false;
  private polePadLeft = 0;
  private polePadWidth = 1;

  onPoleDown(ev: PointerEvent) {
    ev.preventDefault();
    (ev.target as HTMLElement).setPointerCapture?.(ev.pointerId);
    this.poleDragging = true;
    // Measure the track container regardless of whether the target is the pole or the track
    const current = ev.currentTarget as HTMLElement;
    const track = (current.closest?.('.pole-track') as HTMLElement) || current.parentElement as HTMLElement;
    const rect = track.getBoundingClientRect();
    this.polePadLeft = rect.left;
    this.polePadWidth = Math.max(1, rect.width);
    this.updatePoleFromEvent(ev);
  }

  onPoleMove(ev: PointerEvent) {
    ev.preventDefault();
    if (!this.poleDragging) return;
    this.updatePoleFromEvent(ev);
  }

  onPoleUp(ev: PointerEvent) {
    (ev.target as HTMLElement).releasePointerCapture?.(ev.pointerId);
    this.poleDragging = false;
    // When not running, keep position; when running, release input
    if (this.isRunning) this.input = 0;
  }

  private updatePoleFromEvent(ev: PointerEvent) {
    const x = ev.clientX;
    const pct = (x - this.polePadLeft) / this.polePadWidth; // 0..1
    const clamped = Math.max(0, Math.min(1, pct));
    // Map to marker pos [-100..100]
    const newPos = clamped * 200 - 100;
    // Heavier feel but ensure visible response: blend position slightly toward target
    const blend = 0.06; // slightly lower blend to rely more on input lag/inertia
    this.pos = this.pos + (newPos - this.pos) * blend;
    // Also feed physics input
    const center = this.polePadLeft + this.polePadWidth / 2;
    const ratio = (x - center) / (this.polePadWidth / 2);
    this.input = Math.max(-1, Math.min(1, ratio));
  }
}
