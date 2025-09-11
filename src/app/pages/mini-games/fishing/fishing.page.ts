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
  // New: grouped fish movement parameters
  fishMove: {
    minForce: number;         // min fish pull force
    rangeForce: number;       // range added to min for max force
    changeMinMs: number;      // min interval for movement changes
    changeMaxMs: number;      // max interval for movement changes
    sporadicity: number;      // randomness intensity (>1 more erratic)
    awayBias: number;         // bias away from player input (0..1)
    stepMin: number;          // min step size (bar units) for target selection
    stepMax: number;          // max step size (bar units) for target selection
  };
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

  // Fish pulling
  fishDir: -1 | 1 = 1;
  fishForce = 28; // baseline pull (raised for difficulty)
  // Fish smooth movement state
  private fishTargetPos = 0; // where the fish is heading
  private fishSpeed = 40;    // units per second toward target
  // Fish current position (shown as fish indicator on the bar)
  private fishPos = 0;
  // If fish hits wall, force next direction inward
  private nextForcedDir: (-1 | 1) | null = null;
  private fishTimer: any = null;
  private burstTimeout: any = null;

  // Difficulty configuration
  private difficulty: Difficulty ='normal';
  private cfg: DifficultyConfig = {
    playerForce: 32,
    damping: 12,
    quadDrag: 0.4,
    fishMin: 22,
    fishRange: 28, // 22..50
    tensionBuild: 45,
    tensionDecay: 12,
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
    fishMove: {
      minForce: 22,
      rangeForce: 28,
      changeMinMs: 700,
      changeMaxMs: 1700,
      sporadicity: 1.0,
      awayBias: 0.3,
      stepMin: 18,
      stepMax: 36,
    },
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
  secondsLeft = 0;
  private raf: any = null;
  // Red tension bar (line strain)
  tension = 0; // 0..100; fills when outside zone
  catchProgress = 0; // 0..100
  isLoading = false;
  

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.applyDifficulty(this.difficulty);
    // Start the idle physics loop so pre-start interaction feels identical
    if (!this.raf) {
      this.loop(performance.now());
    }
  }

  // Logical half-width of the fish zone in bar units ([-100..100]).
  // Lure within this distance of fishPos should NOT increase tension.
  private fishHalfUnits(): number {
    switch (this.difficulty) {
      case 'easy':
        return 14; // generous catch zone
      case 'normal':
        return 10;
      case 'hard':
        return 10; // match normal
      case 'veryHard':
      default:
        return 10; // match normal
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
          fishMove: {
            minForce: 12,
            rangeForce: 20,
            changeMinMs: 1000,
            changeMaxMs: 1800,
            sporadicity: 0.9,
            awayBias: 0.15,
            stepMin: 12,
            stepMax: 24,
          },
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
          fishMove: {
            minForce: 22,
            rangeForce: 28,
            changeMinMs: 800,
            changeMaxMs: 1400,
            sporadicity: 1.0,
            awayBias: 0.3,
            stepMin: 18,
            stepMax: 36,
          },
        };
        break;
      case 'hard':
        this.cfg = {
          playerForce: 36,
          damping: 6.5,
          quadDrag: 0.35,
          fishMin: 28,
          fishRange: 34, // 28..62
          tensionBuild: 45,
          tensionDecay: 30,
          timeSeconds: 32,
          tensionDistFactor: 0.9,
          burstChancePerPull: 0.25,
          burstMultiplier: 1.9,
          burstDurationMs: 420,
          inputLag: 0.07,
          inertia: 1.10,
          inputDeadzone: 0,
          inputSlewPerSec: 3.2,
          controlVelK: 0.004,
          maxVel: 340,
          fishMove: {
            minForce: 28,
            rangeForce: 34,
            changeMinMs: 650,
            changeMaxMs: 1100,
            sporadicity: 1.2,
            awayBias: 0.5,
            stepMin: 28,
            stepMax: 52,
          },
        };
        break;
      case 'veryHard':
        this.cfg = {
          playerForce: 30,
          damping: 7.2,
          quadDrag: 0.56,
          fishMin: 34,
          fishRange: 40, // 34..74
          tensionBuild: 45,
          tensionDecay: 30,
          timeSeconds: 28,
          tensionDistFactor: 0.9,
          burstChancePerPull: 0.35,
          burstMultiplier: 2.3,
          burstDurationMs: 500,
          inputLag: 0.09,
          inertia: 1.28,
          inputDeadzone: 0,
          inputSlewPerSec: 3.0,
          controlVelK: 0.006,
          maxVel: 320,
          fishMove: {
            minForce: 34,
            rangeForce: 40,
            changeMinMs: 520,
            changeMaxMs: 900,
            sporadicity: 1.4,
            awayBias: 0.9,
            stepMin: 36,
            stepMax: 70,
          },
        };
        break;
    }
    // Resample fish force baseline if running
    this.fishForce = this.cfg.fishMove.minForce + Math.random() * this.cfg.fishMove.rangeForce;
    if (this.isRunning) {
      if (this.fishTimer) clearTimeout(this.fishTimer);
      this.moveFish();
    }
  }

  start() {
    if (this.isRunning || this.isComplete) return;
  
    // Randomize difficulty and log it
    const levels: Difficulty[] = ['easy', 'normal', 'hard', 'veryHard'];
    const randomLevel = levels[Math.floor(Math.random() * levels.length)];
    this.applyDifficulty(randomLevel);
    console.log('Fishing difficulty:', randomLevel);
  
    this.resetState();
    this.isRunning = true;
    this.moveFish();
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

  // Retry the minigame: clear completion, reset meters and positions. Does not auto-start.
  retry() {
    // Show loading spinner for 1s, then reset
    this.isComplete = false; // close modal
    this.isLoading = true;
    this.isRunning = false;
    this.cleanupTimers();
    setTimeout(() => {
      this.resetState();
      // Ensure not running after reset
      this.isRunning = false;
      this.isLoading = false;
      // Do not auto-start; first pole click will start the game
    }, 1000);
  }

  private resetState() {
    this.pos = 0;
    this.vel = 0;
    this.fishPos = 0;
    this.secondsLeft = this.cfg.timeSeconds;
    this.success = false;
    this.isComplete = false;
    this.tension = 0;
    this.catchProgress = 0;
    this.inputFiltered = 0;
    this.isRunning = false;
  }

  private loop(last: number) {
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); // cap dt for stability
      last = now;

      // Timer disabled for now
      // if (this.isRunning) {
      //   this.secondsLeft = Math.max(0, this.secondsLeft - dt);
      // }

      // Minimal smoothing only (no deadzone or slew) to add a touch of inertia
      const alpha = 1 - Math.exp(-dt / Math.max(0.001, this.cfg.inputLag));
      this.inputFiltered += (this.input - this.inputFiltered) * alpha;
      this.inputFiltered = Math.max(-1, Math.min(1, this.inputFiltered));

      // Compute forces
      // Fish movement is discrete (handled in moveFish). No continuous fish force here.
      const fish = 0;
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

      // Smoothly move the fish toward its current target at fishSpeed
      if (this.isRunning || true) {
        const diff = this.fishTargetPos - this.fishPos;
        const maxStep = this.fishSpeed * dt;
        if (Math.abs(diff) <= maxStep) {
          this.fishPos = this.fishTargetPos;
          // If we arrived at a wall, force next move inward
          if (this.fishPos <= -100 + 1e-6) {
            this.nextForcedDir = 1;
          } else if (this.fishPos >= 100 - 1e-6) {
            this.nextForcedDir = -1;
          }
        } else {
          this.fishPos += Math.sign(diff) * maxStep;
        }
        // Update UI indicator for direction based on current motion
        const dirNow = Math.sign(this.fishTargetPos - this.fishPos);
        if (dirNow !== 0) this.fishDir = dirNow as -1 | 1;
      }

      // Catch/Tension logic: per-difficulty rates
      if (this.isRunning) {
        const d = Math.abs(this.pos - this.fishPos);
        const inFish = d <= this.fishHalfUnits();
        let catchRate = 5;   // % per second
        let tensionRate = 5; // % per second
        if (this.difficulty === 'hard' || this.difficulty === 'veryHard') {
          catchRate = 2.5;
          tensionRate = 10;
        }
        if (inFish) {
          this.catchProgress = Math.min(100, this.catchProgress + catchRate * dt);
          // Smooth continuous reduction: net -5% per second while inside
          this.tension = Math.max(0, this.tension - (5 * dt));
        } else {
          this.tension = Math.min(100, this.tension + tensionRate * dt);
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
      if (this.isRunning && this.catchProgress >= 100) {
        // Caught the fish
        this.success = true;
        this.isComplete = true;
        this.isRunning = false;
        this.cleanupTimers();
        return;
      }
      // if (this.isRunning && this.secondsLeft <= 0) {
      //   this.success = true; // Survive to end wins
      //   this.isComplete = true;
      //   this.isRunning = false;
      //   this.cleanupTimers();
      //   return;
      // }

      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  private moveFish() {
    // Do not move or schedule when not running
    if (!this.isRunning) return;
    // Choose a new smooth movement target and schedule next change
    if (this.fishTimer) clearTimeout(this.fishTimer);

    // Pick a direction biased away from the lure position, with some randomness
    const awayProb = this.difficulty === 'easy' ? 0.6
                   : this.difficulty === 'normal' ? 0.7
                   : this.difficulty === 'hard' ? 0.8
                   : 0.9; // veryHard
    const awaySign = Math.sign(this.fishPos - this.pos) || (Math.random() < 0.5 ? 1 : -1);
    let dir: -1 | 1;
    if (this.nextForcedDir) {
      dir = this.nextForcedDir;
      this.nextForcedDir = null;
    } else {
      dir = (Math.random() < awayProb ? (awaySign as -1 | 1) : (Math.random() < 0.5 ? -1 : 1));
    }
    const step = this.cfg.fishMove.stepMin + Math.random() * (this.cfg.fishMove.stepMax - this.cfg.fishMove.stepMin);
    // Set a new target within full bar
    this.fishTargetPos = Math.max(-100, Math.min(100, this.fishPos + dir * step));
    // Choose a speed based on difficulty/step size
    const baseSpeed = this.difficulty === 'easy' ? 40
                     : this.difficulty === 'normal' ? 60
                     : this.difficulty === 'hard' ? 65
                     : 100; // veryHard
    // Add a little randomness so movement doesn't feel uniform
    const jitter = 0.8 + Math.random() * 0.6; // 0.8..1.4
    this.fishSpeed = baseSpeed * jitter;

    // Schedule the next random movement change using multiplicative sampling (more irregular)
    const min = Math.max(50, this.cfg.fishMove.changeMinMs);
    const max = Math.max(min + 1, this.cfg.fishMove.changeMaxMs);
    const ratio = max / min;
    const nextIn = Math.round(min * Math.pow(ratio, Math.random()));
    this.fishTimer = setTimeout(() => {
      this.moveFish();
    }, nextIn);
  }

  // UI helpers: map positions [-100..100] to CSS left percent strings
  lureLeftPct(): string {
    const pct = (this.pos + 100) * 0.5; // 0..100
    return pct.toFixed(2) + '%';
  }

  fishLeftPct(): string {
    // Map to 0..100, then clamp to avoid exact 0%/100% which can cause visual sticking
    let pct = (this.fishPos + 100) * 0.5; // 0..100
    const minPct = 1;
    const maxPct = 99;
    if (pct < minPct) pct = minPct;
    if (pct > maxPct) pct = maxPct;
    return pct.toFixed(2) + '%';
  }

  // Visual size of the fish indicator varies by difficulty (Easy largest, Very Hard smallest)
  fishWidthPx(): number {
    switch (this.difficulty) {
      case 'easy':
        return 52; // easiest target (doubled)
      case 'normal':
        return 36;
      case 'hard':
        return 36; // match normal
      case 'veryHard':
      default:
        return 36; // match normal
    }
  }





  // random movement helper removed

  private cleanupTimers() {
    if (this.fishTimer) clearTimeout(this.fishTimer);
    this.fishTimer = null;
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
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

  // legacy helpers removed (markerLeftPct/zoneLeft)

  // Pole drag handling (works even when not running)
  private poleDragging = false;
  private polePadLeft = 0;
  private polePadWidth = 1;

  onPoleDown(ev: PointerEvent) {
    ev.preventDefault();
    (ev.target as HTMLElement).setPointerCapture?.(ev.pointerId);
    // Ignore clicks while loading overlay is visible
    if (this.isLoading) return;
    // Begin the game on first pole click
    if (!this.isRunning && !this.isComplete) {
      this.start();
    }
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
