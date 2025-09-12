import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';

type Difficulty = 'easy' | 'normal' | 'hard' | 'veryHard';


interface FishMovementConfig {
  // Movement range parameters
  stepMin: number;        // Minimum step size for fish movement
  stepMax: number;        // Maximum step size for fish movement
  
  // Force parameters
  minForce: number;       // Minimum force applied by fish
  rangeForce: number;     // Additional random force range
  
  // Timing parameters
  changeMinMs: number;    // Minimum time between direction changes (ms)
  changeMaxMs: number;    // Maximum time between direction changes (ms)
  sporadicity: number;    // Multiplier for movement frequency (higher = more erratic)
  
  // Behavior parameters
  awayProbability: number; // Chance fish will move away from lure
  baseSpeed: number;      // Base movement speed of fish
}

interface DifficultyConfig {
  // Physics parameters
  playerForce: number;     // Force applied by player input
  damping: number;         // Linear water resistance
  quadDrag: number;        // Quadratic drag coefficient
  inputLag: number;        // Input smoothing factor (seconds)
  inertia: number;         // Lure mass/inertia factor
  inputSlewPerSec: number; // Input rate limiting
  maxVel: number;          // Maximum lure velocity
  
  // Visual parameters
  fishWidthPx: number;     // Visual width of fish indicator in pixels
  
  // Game mechanics
  catchProgressRate: number;    // How fast catch progress increases (% per second)
  lineStressRate: number;       // How fast tension builds when outside fish zone (% per second)
  tensionReductionRate: number; // How fast tension reduces when in fish zone (% per second)
  fishBaseSpeed: number;        // Base speed for fish movement
  
  // Fish movement behavior
  fishMove: FishMovementConfig;
}

@Component({
  selector: 'app-fishing',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './fishing.page.html',
  styleUrls: ['./fishing.page.scss']
})
export class FishingPage implements OnInit {
  pos = 0; // lure position in range [-100, 100], 0 is centered
  vel = 0; // lure velocity

  // Fish pulling
  fishDir: -1 | 1 = 1;
  fishForce = 28;
  // Fish smooth movement state
  fishTargetPos = 0; // where the fish is heading
  private fishSpeed = 0; // Will be set from config in applyDifficulty
  // Fish current position (shown as fish indicator on the bar)
  fishPos = 0;
  // If fish hits wall, force next direction inward
  private nextForcedDir: (-1 | 1) | null = null;
  private fishTimer: any = null;

  // Difficulty configuration
  private difficulty: Difficulty ='normal';
  private cfg: DifficultyConfig = {
    // Physics parameters
    playerForce: 32,
    damping: 12,
    quadDrag: 0.4,
    inputLag: 0.08,
    inertia: 1.0,
    inputSlewPerSec: 2.4,
    maxVel: 240,
    
    // Visual parameters
    fishWidthPx: 50, // Default to normal difficulty width
    
    // Game mechanics
    catchProgressRate: 5, // How fast catch progress increases
    lineStressRate: 5, // How fast tension builds when outside fish zone
    tensionReductionRate: 5, // How fast tension reduces when in fish zone
    fishBaseSpeed: 40, // Base speed for fish movement
    fishMove: {
      // Movement range parameters
      stepMin: 18,
      stepMax: 36,
      
      // Force parameters
      minForce: 22,
      rangeForce: 28,
      
      // Timing parameters
      changeMinMs: 700,
      changeMaxMs: 1700,
      sporadicity: 1.0,
      
      // Behavior parameters
      awayProbability: 0.7,
      baseSpeed: 60,
    },
  };

  // Player input from drag (-1..1)
  input = 0;
  private inputFiltered = 0; // smoothed input
  private dragging = false;
  private padLeft = 0;
  private padWidth = 1; // updated on start
  private poleDragging = false;
  private polePadLeft = 0;
  private polePadWidth = 1;
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
    this.applyDifficulty(this.difficulty)
  }

  private fishHalfUnits(): number {
    // Calculate catch zone size based on visual width
    // We use a scaling factor to convert pixels to game units
    // This ensures the gameplay mechanics match the visual representation
    const scalingFactor = 0.2; // 1 pixel = 0.2 game units
    return this.cfg.fishWidthPx * scalingFactor;
  }

  private applyDifficulty(level: Difficulty) {
    this.difficulty = level;
    switch (level) {
      case 'easy':
        this.cfg = {
          playerForce: 45,
          damping: 8,
          quadDrag: 0.27,
          inputLag: 0.065,
          inertia: 1.08,
          inputSlewPerSec: 2.8,
          maxVel: 260,
          fishWidthPx: 60,
          catchProgressRate: 7.5,
          lineStressRate: 3,
          tensionReductionRate: 8,
          fishBaseSpeed: 30,
          fishMove: {
            stepMin: 12,
            stepMax: 24,
            minForce: 12,
            rangeForce: 20,
            changeMinMs: 1000,
            changeMaxMs: 1800,
            sporadicity: 0.8,
            awayProbability: 0.6,
            baseSpeed: 40,
          },
        };
        break;
      case 'normal':
        this.cfg = {
          playerForce: 40,
          damping: 6,
          quadDrag: 0.30,
          inputLag: 0.06,
          inertia: 1.06,
          inputSlewPerSec: 4.0,
          maxVel: 360,
          fishWidthPx: 50,
          catchProgressRate: 5,
          lineStressRate: 5,
          tensionReductionRate: 5,
          fishBaseSpeed: 40,
          fishMove: {
            stepMin: 18,
            stepMax: 36,
            minForce: 22,
            rangeForce: 28,
            changeMinMs: 800,
            changeMaxMs: 1400,
            sporadicity: 1.0,
            awayProbability: 0.7,
            baseSpeed: 60,
          },
        };
        break;
      case 'hard':
        this.cfg = {
          playerForce: 36,
          damping: 6.5,
          quadDrag: 0.35,
          inputLag: 0.07,
          inertia: 1.10,
          inputSlewPerSec: 3.2,
          maxVel: 340,
          fishWidthPx: 40,
          catchProgressRate: 2.5,
          lineStressRate: 10,
          tensionReductionRate: 3,
          fishBaseSpeed: 50,
          fishMove: {
            stepMin: 28,
            stepMax: 52,
            minForce: 28,
            rangeForce: 34,
            changeMinMs: 650,
            changeMaxMs: 1100,
            sporadicity: 1.2,
            awayProbability: 0.8,
            baseSpeed: 65,
          },
        };
        break;
      case 'veryHard':
        this.cfg = {
          playerForce: 30,
          damping: 7.2,
          quadDrag: 0.56,
          inputLag: 0.09,
          inertia: 1.28,
          inputSlewPerSec: 3.0,
          maxVel: 320,
          fishWidthPx: 36,
          catchProgressRate: 2,
          lineStressRate: 12,
          tensionReductionRate: 2,
          fishBaseSpeed: 60,
          fishMove: {
            stepMin: 36,
            stepMax: 70,
            minForce: 34,
            rangeForce: 40,
            changeMinMs: 520,
            changeMaxMs: 900,
            sporadicity: 1.5,
            awayProbability: 0.9,
            baseSpeed: 100,
          },
        };
        break;
    }
    
    // Set fish speed from configuration after the difficulty has been applied
    this.fishSpeed = this.cfg.fishBaseSpeed;
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
    if (!this.raf) {
      this.loop(performance.now());
    }
  }

  cancel() {
    if (!this.isRunning) return;
    this.finish();
  }

  finish() {
    this.isComplete = true;
    this.isRunning = false;
    this.releaseGameResources();
  }

  retry() {
    this.isComplete = false; // close modal
    this.isLoading = true;
    this.isRunning = false;
    this.releaseGameResources();
    setTimeout(() => {
      this.resetState();
      // Ensure not running after reset
      this.isRunning = false;
      this.isLoading = false;
      // Do not auto-start; first pole click will start the game
    }, 1000);
  }

  private resetState() {
    // Reset lure state
    this.pos = 0;
    this.vel = 0;
    this.inputFiltered = 0;
    
    // Reset fish state
    this.fishPos = 0;
    
    this.success = false;
    this.isComplete = false;
    this.tension = 0;
    this.catchProgress = 0;
    this.isRunning = false;
  }

  private updateLurePhysics(deltaTime: number): void {
    // Minimal smoothing only (no deadzone or slew) to add a touch of inertia
    const smoothingFactor = 1 - Math.exp(-deltaTime / Math.max(0.001, this.cfg.inputLag));
    this.inputFiltered += (this.input - this.inputFiltered) * smoothingFactor;
    this.inputFiltered = Math.max(-1, Math.min(1, this.inputFiltered));

    // Compute forces
    // Fish movement is discrete (handled in moveFish). No continuous fish force here.
    const fishForce = 0;
    // Simplified: full control (no speed-based reduction)
    const playerForce = -this.inputFiltered * this.cfg.playerForce;
    const waterDragForce = -this.vel * this.cfg.damping; // linear water drag

    const quadraticDragForce = -Math.sign(this.vel) * this.vel * this.vel * this.cfg.quadDrag;
    const totalAcceleration = fishForce + playerForce + waterDragForce + quadraticDragForce;

    // Apply inertia (mass) so acceleration translates slower
    this.vel += (totalAcceleration / Math.max(0.1, this.cfg.inertia)) * deltaTime;
    
    // Cap maximum velocity per difficulty
    const maxVelocity = Math.max(40, this.cfg.maxVel);
    this.vel = Math.max(-maxVelocity, Math.min(maxVelocity, this.vel));
    
    // Update position
    this.pos += this.vel * deltaTime;
    
    // Clamp position to [-100, 100] with bounce
    if (this.pos < -100) { 
      this.pos = -100; 
      this.vel *= -0.2; // Bounce with energy loss
    }
    if (this.pos > 100) { 
      this.pos = 100; 
      this.vel *= -0.2; // Bounce with energy loss
    }
  }

  private updateFishMovement(deltaTime: number): void {
    if (!this.isRunning) return;
    
    const distanceToTarget = this.fishTargetPos - this.fishPos;
    const maxMoveDistance = this.fishSpeed * deltaTime;
    
    if (Math.abs(distanceToTarget) <= maxMoveDistance) {
      // Arrived at target
      this.fishPos = this.fishTargetPos;
      
      // If we arrived at a wall, force next move inward
      if (this.fishPos <= -100 + 1e-6) {
        this.nextForcedDir = 1; // Force movement to the right
      } else if (this.fishPos >= 100 - 1e-6) {
        this.nextForcedDir = -1; // Force movement to the left
      }
    } else {
      // Move toward target
      this.fishPos += Math.sign(distanceToTarget) * maxMoveDistance;
    }
    
    // Update UI indicator for direction based on current motion
    const currentDirection = Math.sign(this.fishTargetPos - this.fishPos);
    if (currentDirection !== 0) this.fishDir = currentDirection as -1 | 1;
  }
  
  private updateCatchAndTension(deltaTime: number): void {
    if (!this.isRunning) return;
    
    const lureToFishDistance = Math.abs(this.pos - this.fishPos);
    const isLureInFishZone = lureToFishDistance <= this.fishHalfUnits();
    
    // Use rates from difficulty configuration
    const catchProgressRate = this.cfg.catchProgressRate;
    const lineStressRate = this.cfg.lineStressRate;
    const tensionReductionRate = this.cfg.tensionReductionRate;
    
    if (isLureInFishZone) {
      // Inside fish zone: increase catch progress and reduce tension
      this.catchProgress = Math.min(100, this.catchProgress + catchProgressRate * deltaTime);
      this.tension = Math.max(0, this.tension - (tensionReductionRate * deltaTime));
    } else {
      // Outside fish zone: increase tension
      this.tension = Math.min(100, this.tension + lineStressRate * deltaTime);
    }
  }
  
  private checkGameEndConditions(): boolean {
    if (!this.isRunning) return false;
    
    // Check if line tension is too high (line snapped)
    if (this.tension >= 100) {
      this.success = false;
      this.isComplete = true;
      this.isRunning = false;
      this.releaseGameResources();
      return true;
    }
    
    // Check if catch progress is complete (fish caught)
    if (this.catchProgress >= 100) {
      this.success = true;
      this.isComplete = true;
      this.isRunning = false;
      this.releaseGameResources();
      return true;
    }

    return false;
  }

  private loop(last: number) {
    const step = (now: number) => {
      const deltaTime = Math.min(0.05, (now - last) / 1000); //Time elapsed since last frame
      last = now;

      this.updateLurePhysics(deltaTime);
      
      this.updateFishMovement(deltaTime);

      this.updateCatchAndTension(deltaTime);

      if (this.checkGameEndConditions()) {
        return;
      }

      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  private moveFish() {
    if (!this.isRunning) return;
    
    const direction = this.determineMovementDirection(); 
    const fishMoveStepSize = this.calculateStepSize();
    
    this.fishTargetPos = Math.max(-100, Math.min(100, this.fishPos + direction * fishMoveStepSize));   
    this.fishSpeed = this.calculateFishSpeed();
    this.scheduleNextMovement();
  }
  
  private determineMovementDirection(): -1 | 1 {
    // Use forced direction if set (e.g., after hitting a wall)
    if (this.nextForcedDir) {
      const direction = this.nextForcedDir;
      this.nextForcedDir = null;
      return direction;
    }
    
    // Use awayProbability from configuration
    const awayProbability = this.cfg.fishMove.awayProbability;
    
    // Determine direction away from lure
    const awayDirection = Math.sign(this.fishPos - this.pos) || (Math.random() < 0.5 ? 1 : -1);
    
    // Either move away from lure or in a random direction
    return Math.random() < awayProbability 
      ? (awayDirection as -1 | 1) 
      : (Math.random() < 0.5 ? -1 : 1);
  }

  private calculateStepSize(): number {
    return this.cfg.fishMove.stepMin + 
           Math.random() * (this.cfg.fishMove.stepMax - this.cfg.fishMove.stepMin);
  }
  
  private calculateFishSpeed(): number {
    // Get base speed from configuration
    const baseSpeed = this.cfg.fishMove.baseSpeed;
    
    // Add jitter for natural movement (0.8..1.4)
    const jitter = 0.8 + Math.random() * 0.6;
    
    return baseSpeed * jitter;
  }
  
  private scheduleNextMovement(): void {
    // Get sporadicity factor from configuration

    const minMs = this.cfg.fishMove.changeMinMs * this.cfg.fishMove.sporadicity;
    const maxMs = this.cfg.fishMove.changeMaxMs * this.cfg.fishMove.sporadicity;
    const nextMs = minMs + Math.random() * (maxMs - minMs);
    
    this.fishTimer = setTimeout(() => this.moveFish(), nextMs);
  }

  getLurePositionAsPercentage(): string {
    const percentageValue = (this.pos + 100) * 0.5; // Convert -100..100 to 0..100
    return percentageValue.toFixed(2) + '%';
  }

  getFishPositionAsPercentage(): string {
    // Convert -100..100 to 0..100
    let percentageValue = (this.fishPos + 100) * 0.5;
    
    // Clamp to avoid exact 0%/100% which can cause visual sticking
    const minPercentage = 1;
    const maxPercentage = 99;
    if (percentageValue < minPercentage) percentageValue = minPercentage;
    if (percentageValue > maxPercentage) percentageValue = maxPercentage;
    
    return percentageValue.toFixed(2) + '%';
  }

  getFishIndicatorWidth(): number {
    return this.cfg.fishWidthPx;
  }

  private releaseGameResources() {
    // Clear fish movement timer
    if (this.fishTimer) clearTimeout(this.fishTimer);
    this.fishTimer = null;
    
    // Cancel animation frame if active
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
    
    // Reset input state
    this.input = 0;
    this.dragging = false;
  }

  onPadDown(ev: PointerEvent) {
    ev.preventDefault();
    (ev.target as HTMLElement).setPointerCapture?.(ev.pointerId);
    
    // Start dragging and measure pad dimensions
    this.dragging = true;
    this.updateDragPadDimensions(ev);
    
    // Calculate initial input value
    this.calculateInputFromPointerPosition(ev);
    
    // Immediate response on tap: prime filtered input too
    this.inputFiltered = this.input;
  }

  onPadMove(ev: PointerEvent) {
    ev.preventDefault();
    if (!this.dragging) return;
    
    // Update input based on pointer position
    this.calculateInputFromPointerPosition(ev);
  }

  onPadUp(ev: PointerEvent) {
    (ev.target as HTMLElement).releasePointerCapture?.(ev.pointerId);
    this.dragging = false;
    this.input = 0; // Reset input when released
  }
  
  private updateDragPadDimensions(pointerEvent: PointerEvent) {
    const dragPadElement = (pointerEvent.currentTarget as HTMLElement);
    const boundingRect = dragPadElement.getBoundingClientRect();
    this.padLeft = boundingRect.left;
    this.padWidth = Math.max(1, boundingRect.width);
  }

  private calculateInputFromPointerPosition(pointerEvent: PointerEvent) {
    // Calculate distance from center as -1..1 ratio
    const centerPosition = this.padLeft + this.padWidth / 2;
    const positionRatio = (pointerEvent.clientX - centerPosition) / (this.padWidth / 2);
    
    // Clamp to valid input range (-1 to 1)
    this.input = Math.max(-1, Math.min(1, positionRatio));
  }

  onPoleDown(ev: PointerEvent) {
    ev.preventDefault();
    (ev.target as HTMLElement).setPointerCapture?.(ev.pointerId);
    
    // Ignore clicks while loading overlay is visible
    if (this.isLoading) return;
    
    // Begin the game on first pole click
    if (!this.isRunning && !this.isComplete) {
      this.start();
    }
    
    // Start pole dragging and measure dimensions
    this.poleDragging = true;
    this.measureFishingPoleTrackDimensions(ev);
    
    // Update position immediately for responsiveness
    this.updateLurePositionFromPointer(ev);
  }

  onPoleMove(ev: PointerEvent) {
    ev.preventDefault();
    if (!this.poleDragging) return;
    this.updateLurePositionFromPointer(ev);
  }

  onPoleUp(ev: PointerEvent) {
    (ev.target as HTMLElement).releasePointerCapture?.(ev.pointerId);
    this.poleDragging = false;
    
    // When not running, keep position; when running, release input
    if (this.isRunning) this.input = 0;
  }

  private measureFishingPoleTrackDimensions(pointerEvent: PointerEvent) {
    // Find the track element regardless of whether the target is the pole or the track
    const currentElement = pointerEvent.currentTarget as HTMLElement;
    const trackElement = (currentElement.closest?.('.pole-track') as HTMLElement) || currentElement.parentElement as HTMLElement;
    const boundingRect = trackElement.getBoundingClientRect();
    
    this.polePadLeft = boundingRect.left;
    this.polePadWidth = Math.max(1, boundingRect.width);
  }

  private updateLurePositionFromPointer(pointerEvent: PointerEvent) {
    const pointerX = pointerEvent.clientX;
    
    // Calculate position percentage (0..1)
    const positionPercentage = (pointerX - this.polePadLeft) / this.polePadWidth;
    const clampedPercentage = Math.max(0, Math.min(1, positionPercentage));
    
    // Map to lure position range [-100..100]
    const newLurePosition = clampedPercentage * 200 - 100;
    
    // Apply smoothing for heavier feel but ensure visible response
    const smoothingFactor = 0.06; // slightly lower for more input lag/inertia feel
    this.pos = this.pos + (newLurePosition - this.pos) * smoothingFactor;
    
    // Calculate input value for physics (-1..1)
    const centerPosition = this.polePadLeft + this.polePadWidth / 2;
    const inputRatio = (pointerX - centerPosition) / (this.polePadWidth / 2);
    this.input = Math.max(-1, Math.min(1, inputRatio));
  }

}
