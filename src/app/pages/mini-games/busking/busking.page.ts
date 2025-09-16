import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

interface Note {
  id: number;
  lane: number;
  y: number;
  hit: boolean;
  perfect: boolean;
}

interface KeyState {
  pressed: boolean;
  element: HTMLElement | null;
}

@Component({
  selector: 'app-busking',
  templateUrl: './busking.page.html',
  styleUrls: ['./busking.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class BuskingPage implements OnInit, OnDestroy {
  @ViewChild('gameCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  
  // Canvas render size in CSS pixels
  private viewWidth = 0;
  private viewHeight = 0;
  
  gameActive = false;
  gameInitialized = false;
  // Rhythm settings
  bpm = 60; // beats per minute
  selectedDifficulty: 'easy' | 'medium' | 'hard' | 'veryHard' = 'medium';
  private nextSpawnAtMs = 0; // next spawn time relative to start (ms)
  private readonly spawnLeadInMs = 800; // initial delay before first notes
  score = 0;
  combo = 0;
  maxCombo = 0;
  multiplier = 1;
  songProgress = 0;
  songDuration = 60000; // 1 minute for now
  startTime = 0;
  lastFrameTime = 0;
  animationFrameId: number | null = null;
  
  // Game settings
  readonly LANE_COUNT = 4;
  readonly LANE_KEYS = ['a', 's', 'd', 'f'];
  readonly LANE_KEYS_ARROWS = ['ArrowLeft', 'ArrowDown', 'ArrowUp', 'ArrowRight'];
  readonly NOTE_SPEED = 5;
  readonly JUDGMENT_LINE_Y = 400; // Legacy default; we now derive from viewport via getJudgmentY()
  readonly PERFECT_RANGE = 20;
  readonly GOOD_RANGE = 50;
  readonly LANE_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f']; // Red, Blue, Green, Yellow
  
  keys: KeyState[] = [];
  notes: Note[] = [];
  nextNoteId = 0;
  lastNoteTime = 0;
  noteInterval = 1000; // ms between notes
  
  // Visual feedback
  hitEffects: {x: number, y: number, type: 'perfect' | 'good' | 'miss', alpha: number}[] = [];
  
  playerId: string | null = null;
  
  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Initialize key states
    for (let i = 0; i < this.LANE_COUNT; i++) {
      this.keys.push({
        pressed: false,
        element: null
      });
    }
  }
  
  // Derive the judgment line from current viewport height
  private getJudgmentY(): number {
    // 85% down the canvas, but keep some padding from the bottom
    if (this.viewHeight <= 0) return this.JUDGMENT_LINE_Y;
    const y = Math.floor(this.viewHeight * 0.85);
    return Math.min(this.viewHeight - 60, Math.max(80, y));
  }

  ngOnInit() {
    // Get player ID from route parameters
    this.route.paramMap.subscribe(params => {
      this.playerId = params.get('id');
      console.log('Player ID:', this.playerId);
      
      // Initialize game after getting player ID
      if (this.canvasRef) {
        this.initializeGame();
      }
    });
    
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    // Set canvas size (safe even if ctx is null)
    this.resizeCanvas();
    // Do NOT start the game automatically; wait for user action (Play button or SPACE)
  }
  
  ngOnDestroy() {
    this.stopGame();
  }
  
  @HostListener('window:resize')
  onResize() {
    this.resizeCanvas();
  }
  
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    // Handle spacebar to start the game
    if (event.code === 'Space' && !this.gameActive) {
      event.preventDefault();
      this.startGame();
      return;
    }

    // Only process game keys if the game is active
    if (!this.gameActive) return;

    const key = event.key.toLowerCase();
    const laneIndex = this.LANE_KEYS.indexOf(key);
    
    if (laneIndex !== -1 && !this.keys[laneIndex].pressed) {
      this.keys[laneIndex].pressed = true;
      this.keys[laneIndex].element?.classList.add('active');
      this.checkNoteHit(laneIndex);
      event.preventDefault();
    }
    
    // Support for arrow keys
    const arrowIndex = this.LANE_KEYS_ARROWS.indexOf(event.key);
    if (arrowIndex !== -1 && !this.keys[arrowIndex].pressed) {
      this.keys[arrowIndex].pressed = true;
      this.keys[arrowIndex].element?.classList.add('active');
      this.checkNoteHit(arrowIndex);
      event.preventDefault();
    }
  }
  
  @HostListener('window:keyup', ['$event'])
  onKeyUp(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    const laneIndex = this.LANE_KEYS.indexOf(key);
    
    if (laneIndex !== -1) {
      this.keys[laneIndex].pressed = false;
      this.keys[laneIndex].element?.classList.remove('active');
    }
    
    // Support for arrow keys
    const arrowIndex = this.LANE_KEYS_ARROWS.indexOf(event.key);
    if (arrowIndex !== -1) {
      this.keys[arrowIndex].pressed = false;
      this.keys[arrowIndex].element?.classList.remove('active');
    }
  }
  
  resizeCanvas() {
    if (!this.canvasRef) return;
    
    const canvas = this.canvasRef.nativeElement;
    const container = canvas.parentElement;
    
    if (container) {
      // CSS pixel size for game rendering
      const cssWidth = container.clientWidth;
      const cssHeight = container.clientHeight || 500; // Use container height (70vh) or fallback
      this.viewWidth = cssWidth;
      this.viewHeight = cssHeight;
      
      // Set display size (CSS)
      canvas.style.width = cssWidth + 'px';
      canvas.style.height = cssHeight + 'px';
      
      // Set actual buffer size in device pixels
      const scale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(cssWidth * scale);
      canvas.height = Math.floor(cssHeight * scale);
      
      // Reset transform then scale so drawing uses CSS pixel coordinates
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.imageSmoothingEnabled = false; // For pixel-perfect rendering
        ctx.scale(scale, scale);
      }
    }
  }
  
  private initializeGame() {
    // Set up canvas and other initialization
    this.resizeCanvas();
    // Don't start the game automatically
    this.gameInitialized = true;
  }
  
  startGame() {
    // Mark game active first so the container becomes visible
    this.gameActive = true;
    if (!this.gameInitialized) {
      this.initializeGame();
    }
    // Ensure layout is up-to-date after visibility change (double RAF for large screens)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.resizeCanvas());
    });
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.multiplier = 1;
    this.notes = [];
    this.hitEffects = [];
    this.nextNoteId = 0;
    this.lastNoteTime = 0;
    // Schedule rhythm-based spawns
    this.nextSpawnAtMs = this.spawnLeadInMs;
    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;
    
    this.gameLoop(this.startTime);
  }
  
  stopGame() {
    this.gameActive = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
  
  gameLoop(timestamp: number) {
    if (!this.gameActive) return;
    
    const deltaTime = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;
    
    this.update(deltaTime);
    this.render();
    
    this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
  }
  
  update(deltaTime: number) {
    // Update song progress
    this.songProgress = performance.now() - this.startTime;
    
    // Check if song is over
    if (this.songProgress >= this.songDuration) {
      this.gameOver();
      return;
    }
    
    // Rhythm-based note generation: spawn at exact musical grid
    const intervalMs = this.getCurrentIntervalMs();
    while (this.songProgress >= this.nextSpawnAtMs) {
      this.generateChord(); // spawn 1 or 2 lanes at the same time
      this.nextSpawnAtMs += intervalMs;
    }
    
    // Update notes
    this.notes.forEach(note => {
      if (!note.hit) {
        note.y += this.NOTE_SPEED;
        
        // Remove notes that go off screen without being hit
        if (note.y > this.getJudgmentY() + 100) {
          this.noteMissed(note);
        }
      }
    });
    
    // Update hit effects
    for (let i = this.hitEffects.length - 1; i >= 0; i--) {
      this.hitEffects[i].alpha -= 0.02;
      if (this.hitEffects[i].alpha <= 0) {
        this.hitEffects.splice(i, 1);
      }
    }
  }
  
  render() {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);
    
    // Draw exactly 4 lanes, one for each key (A,S,D,F)
    const laneWidth = this.viewWidth / 4; // Force 4 lanes
    
    for (let i = 0; i < 4; i++) {
      // Draw lane background with distinct colors
      ctx.fillStyle = this.LANE_COLORS[i] + '33'; // Add some transparency
      ctx.fillRect(i * laneWidth, 0, laneWidth, this.viewHeight);
      
      // Draw lane separator
      if (i < 3) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo((i + 1) * laneWidth, 0);
        ctx.lineTo((i + 1) * laneWidth, this.viewHeight);
        ctx.stroke();
      }
    }
    
    // Draw hit windows (GOOD and PERFECT) as translucent bands
    const judgeY = this.getJudgmentY();
    // GOOD window
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#ffc107'; // Amber for good
    ctx.fillRect(0, Math.max(0, judgeY - this.GOOD_RANGE), this.viewWidth, this.GOOD_RANGE * 2);
    ctx.restore();
    // PERFECT window
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#4caf50'; // Green for perfect
    ctx.fillRect(0, Math.max(0, judgeY - this.PERFECT_RANGE), this.viewWidth, this.PERFECT_RANGE * 2);
    ctx.restore();

    // Draw judgment line on top of the bands
    ctx.strokeStyle = '#e94560';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, judgeY);
    ctx.lineTo(this.viewWidth, judgeY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw notes
    this.notes.forEach(note => {
      if (note.hit) {
        ctx.fillStyle = note.perfect ? '#4caf50' : '#ffc107';
        ctx.globalAlpha = 0.5;
      } else {
        // Use lane color for notes
        ctx.fillStyle = this.LANE_COLORS[note.lane % this.LANE_COLORS.length];
        ctx.globalAlpha = 1;
      }
      
      // Calculate lane width and position
      const totalLanes = 4; // We always have exactly 4 lanes
      const laneWidth = this.viewWidth / totalLanes;
      const noteX = Math.floor(note.lane) * laneWidth;
      const noteHeight = 20;
      
      // Add a small margin to show the lane separator
      const noteMargin = 4; // Slightly larger margin for better visibility
      const noteWidth = laneWidth - (noteMargin * 2);
      
      // Ensure we're drawing in the correct lane
      if (note.lane >= 0 && note.lane < totalLanes) {
        ctx.beginPath();
        ctx.roundRect(
          noteX + noteMargin,
          note.y - noteHeight / 2,
          noteWidth,
          noteHeight,
          4 // Slight border radius for a polished look
        );
        ctx.fill();
      } else {
        console.warn('Note generated in invalid lane:', note.lane);
      }
      
      // Reset global alpha
      ctx.globalAlpha = 1;
    });
    
    // Draw hit effects
    this.hitEffects.forEach(effect => {
      ctx.save();
      ctx.globalAlpha = effect.alpha;
      ctx.font = '24px Arial';
      ctx.fillStyle = effect.type === 'perfect' ? '#4caf50' : 
                     effect.type === 'good' ? '#ffc107' : '#f44336';
      ctx.textAlign = 'center';
      ctx.fillText(
        effect.type.toUpperCase(),
        effect.x,
        effect.y - 20
      );
      ctx.restore();
    });
    
    // Draw UI
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${this.score}`, 20, 30);
    ctx.fillText(`Combo: ${this.combo}x`, 20, 60);
    
    // Draw progress bar
    const progressWidth = canvas.width * 0.8;
    const progressX = (canvas.width - progressWidth) / 2;
    const progressY = canvas.height - 20;
    const progress = this.songProgress / this.songDuration;
    
    // Background of progress bar
    ctx.fillStyle = '#555';
    ctx.fillRect(progressX, progressY, progressWidth, 10);
    
    // Progress fill
    ctx.fillStyle = '#e94560';
    ctx.fillRect(progressX, progressY, progressWidth * progress, 10);
  }
  
  generateNote() {
    if (Math.random() < 0.7) { // 70% chance to generate a note
      // Ensure we only generate notes in valid lanes (0-3)
      const lane = Math.floor(Math.random() * 4);
      
      this.notes.push({
        id: this.nextNoteId++,
        lane: lane,
        y: -20, // Start above the screen
        hit: false,
        perfect: false
      });
      
      console.log('Generated note in lane:', lane); // Debug log
    }
  }

  // Spawn 1 or 2 notes simultaneously (a "chord")
  private generateChord() {
    // 70% chance to spawn something at this beat
    if (Math.random() > 0.7) return;
    const lanes = this.pickUniqueLanes(Math.random() < 0.5 ? 1 : 2);
    for (const lane of lanes) {
      this.notes.push({
        id: this.nextNoteId++,
        lane,
        y: -30,
        hit: false,
        perfect: false
      });
    }
  }

  // Pick k distinct lanes from 0..3
  private pickUniqueLanes(k: number): number[] {
    const indices = [0,1,2,3];
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices.slice(0, k);
  }

  // Compute the interval in ms based on BPM and difficulty
  private getCurrentIntervalMs(): number {
    const beatMs = 60000 / this.bpm; // quarter note duration
    switch (this.selectedDifficulty) {
      case 'easy':
        return beatMs * 2; // half notes
      case 'medium':
        return beatMs; // quarter notes
      case 'hard':
        return beatMs / 2; // eighth notes
      case 'veryHard':
        return beatMs / 4; // sixteenth notes
      default:
        return beatMs; // fallback to quarter notes
    }
  }
  
  checkNoteHit(lane: number) {
    let hitNote = false;
    console.log('Checking hit for lane:', lane); // Debug log
    
    for (const note of this.notes) {
      console.log('Checking note in lane:', note.lane, 'at y:', note.y); // Debug log
      if (note.hit || note.lane !== lane) continue;
      
      const distance = Math.abs(note.y - this.getJudgmentY());
      
      if (distance < this.PERFECT_RANGE) {
        // Perfect hit
        this.noteHit(note, true);
        hitNote = true;
        break;
      } else if (distance < this.GOOD_RANGE) {
        // Good hit
        this.noteHit(note, false);
        hitNote = true;
        break;
      }
    }
    
    if (!hitNote) {
      // Miss - no note in range
      this.combo = 0;
      this.multiplier = 1;
      const laneWidth = this.viewWidth / 4;
      const centerX = lane * laneWidth + laneWidth / 2;
      this.addHitEffect(centerX, this.getJudgmentY(), 'miss');
    }
  }
  
  noteHit(note: Note, perfect: boolean) {
    note.hit = true;
    note.perfect = perfect;
    
    // Calculate score
    const baseScore = perfect ? 100 : 50;
    const comboBonus = this.combo * 10;
    this.score += baseScore * this.multiplier + comboBonus;
    
    // Update combo
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    
    // Update multiplier every 10 combos
    this.multiplier = 1 + Math.floor(this.combo / 10);
    
    // Add hit effect
    const laneWidth = this.viewWidth / 4;
    const centerX = note.lane * laneWidth + laneWidth / 2;
    this.addHitEffect(centerX, note.y, perfect ? 'perfect' : 'good');
  }
  
  noteMissed(note: Note) {
    if (!note.hit) {
      this.combo = 0;
      this.multiplier = 1;
      const laneWidth = this.viewWidth / 4;
      const centerX = note.lane * laneWidth + laneWidth / 2;
      this.addHitEffect(centerX, this.getJudgmentY(), 'miss');
      note.hit = true; // Mark as hit to avoid multiple misses
    }
  }
  
  addHitEffect(x: number, y: number, type: 'perfect' | 'good' | 'miss') {
    this.hitEffects.push({
      x,
      y,
      type,
      alpha: 1
    });
  }
  
  gameOver() {
    this.stopGame();
    // Show results or navigate to a results page
    console.log('Game Over!');
    console.log(`Final Score: ${this.score}`);
    console.log(`Max Combo: ${this.maxCombo}`);
    
    // Here you could show a modal with the results
    // For now, we'll just show an alert
    alert(`Game Over!\nScore: ${this.score}\nMax Combo: ${this.maxCombo}x`);
    
    // Optionally, navigate back to the game menu
    // this.router.navigate(['/mini-games']);
  }
  
  onLaneTouchStart(lane: number, event: TouchEvent) {
    event.preventDefault();
    if (!this.keys[lane].pressed) {
      this.keys[lane].pressed = true;
      this.keys[lane].element?.classList.add('active');
      this.checkNoteHit(lane);
    }
  }
  
  onLaneTouchEnd(lane: number, event: TouchEvent) {
    event.preventDefault();
    this.keys[lane].pressed = false;
    this.keys[lane].element?.classList.remove('active');
  }
  
  onBackClick() {
    this.stopGame();
    if (this.playerId) {
      this.router.navigate(['/game', this.playerId]);
    } else {
      this.router.navigate(['/select-character']);
    }
  }
  
  // Check if the current device is a mobile device
  isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
}
